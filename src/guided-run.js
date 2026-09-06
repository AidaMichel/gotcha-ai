"use strict";

const path = require("node:path");

const {
  GuidedInputError,
  loadConfigAfterPublicApi,
  createExplicitPromptSession
} = require("./guided-cli-foundation");
const {
  SESSION_VERSION,
  SESSION_KIND,
  writeSession
} = require("./guided-session");

function guidedError(message) {
  return new GuidedInputError(message);
}

function parseRunArguments(args) {
  let configPath;
  let sessionPath;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token !== "--config" && token !== "--session") {
      throw guidedError("Usage: gotcha-ai run [--config path] [--session path]");
    }
    if (index + 1 >= args.length) {
      throw guidedError(`${token} requires a path.`);
    }

    const value = args[index + 1];
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw guidedError(`${token} requires a path.`);
    }

    if (token === "--config") {
      if (configPath !== undefined) {
        throw guidedError("--config may be supplied only once.");
      }
      configPath = value;
    } else {
      if (sessionPath !== undefined) {
        throw guidedError("--session may be supplied only once.");
      }
      sessionPath = value;
    }
    index += 1;
  }

  return { configPath, sessionPath };
}

function requireRunConfigShape(config) {
  if (config === null || typeof config !== "object") {
    throw guidedError("Gotcha config must export an object.");
  }
  if (!Object.prototype.hasOwnProperty.call(config, "task")) {
    throw guidedError("Gotcha config is missing task.");
  }
  if (!Object.prototype.hasOwnProperty.call(config, "examples")) {
    throw guidedError("Gotcha config is missing examples.");
  }
  if (
    !Object.prototype.hasOwnProperty.call(config, "case") ||
    config.case === null ||
    typeof config.case !== "object"
  ) {
    throw guidedError("Gotcha config is missing case.");
  }
  if (!Object.prototype.hasOwnProperty.call(config.case, "input")) {
    throw guidedError("Gotcha config is missing case.input.");
  }
  if (!Object.prototype.hasOwnProperty.call(config.case, "expectedOutput")) {
    throw guidedError("Gotcha config is missing case.expectedOutput.");
  }
  if (typeof config.evaluator !== "function") {
    throw guidedError("Gotcha config evaluator must be a function.");
  }
  if (
    !Object.prototype.hasOwnProperty.call(config, "provider") ||
    config.provider === null ||
    typeof config.provider !== "object"
  ) {
    throw guidedError("Gotcha config is missing provider.");
  }
  if (!Object.prototype.hasOwnProperty.call(config.provider, "model")) {
    throw guidedError("Gotcha config is missing provider.model.");
  }
  if (typeof config.provider.transport !== "function") {
    throw guidedError("Gotcha config provider.transport must be a function.");
  }
  return config;
}

function createRunAdapters(publicApi, provider) {
  return {
    qualityContract: publicApi.createStructuredProviderAdapter({
      transport: provider.transport,
      model: provider.model,
      mode: "quality-contract"
    }),
    contractAttacks: publicApi.createStructuredProviderAdapter({
      transport: provider.transport,
      model: provider.model,
      mode: "contract-attacks"
    }),
    contractProtection: publicApi.createStructuredProviderAdapter({
      transport: provider.transport,
      model: provider.model,
      mode: "contract-protection"
    })
  };
}

function writeLine(output, value) {
  output.write(`${value}\n`);
}

function normalizeChoice(answer) {
  return String(answer).trim().toLowerCase();
}

async function collectContractDecisions(draft, io) {
  const decisions = [];

  for (let index = 0; index < draft.rules.length; index += 1) {
    const rule = draft.rules[index];
    writeLine(io.output, "");
    writeLine(io.output, `QUALITY CONTRACT RULE ${index + 1}/${draft.rules.length}`);
    writeLine(io.output, `ID: ${rule.id}`);
    writeLine(io.output, `Statement: ${rule.statement}`);
    writeLine(io.output, `Kind: ${rule.kind}`);
    writeLine(io.output, `Severity: ${rule.severity}`);
    writeLine(io.output, `Confidence: ${rule.confidence}`);
    writeLine(io.output, `Rationale: ${rule.rationale}`);

    const decision = await io.prompt({
      message: "Decision [accept/edit/reject]: ",
      invalidMessage: "Choose accept, edit, or reject explicitly.\n",
      parse(answer) {
        const value = normalizeChoice(answer);
        return (
          value === "accept" ||
          value === "edit" ||
          value === "reject"
        ) ? value : null;
      }
    });

    if (decision === "edit") {
      const statement = await io.prompt({
        message: "Edited statement: ",
        invalidMessage: "Enter a non-empty edited statement.\n",
        parse(answer) {
          const value = String(answer).trim();
          return value.length > 0 ? value : null;
        }
      });
      decisions.push({
        ruleId: rule.id,
        decision: "edit",
        statement
      });
    } else {
      decisions.push({
        ruleId: rule.id,
        decision
      });
    }
  }

  return decisions;
}

function displayedSurvivors(result) {
  const experiment = result.experiment;
  if (
    experiment === null ||
    typeof experiment !== "object" ||
    experiment.replayable !== true ||
    experiment.baseline === null ||
    typeof experiment.baseline !== "object" ||
    !Array.isArray(experiment.baseline.survivorOrderIds) ||
    !Array.isArray(experiment.attacks)
  ) {
    throw guidedError(
      "Gotcha produced a non-replayable attack experiment; guided remediation cannot continue."
    );
  }

  const ids = experiment.baseline.survivorOrderIds;
  const attacksById = new Map();
  for (let index = 0; index < experiment.attacks.length; index += 1) {
    attacksById.set(experiment.attacks[index].id, experiment.attacks[index]);
  }

  const displayed = [];
  const limit = Math.min(ids.length, 5);
  for (let index = 0; index < limit; index += 1) {
    const id = ids[index];
    const attack = attacksById.get(id);
    if (attack === undefined) {
      throw guidedError("Gotcha replayable survivor evidence is incomplete.");
    }
    displayed.push({ rank: index + 1, id, attack });
  }

  return { displayed, total: ids.length, experiment };
}

function resultHasNoSurvivors(result) {
  return (
    result !== null &&
    typeof result === "object" &&
    result.attack !== null &&
    typeof result.attack === "object" &&
    Array.isArray(result.attack.survivors) &&
    result.attack.survivors.length === 0
  );
}

function presentNoSurvivor(output) {
  writeLine(output, "");
  writeLine(output, "NO SURVIVING BLIND SPOT FOUND");
  writeLine(
    output,
    "Gotcha found no generated attack that survived this evaluator run."
  );
  writeLine(output, "This does not prove the evaluator is globally correct.");
}

function presentSurvivors(survivors, output) {
  writeLine(output, "");
  writeLine(output, "GOTCHA FINDINGS");

  for (let index = 0; index < survivors.displayed.length; index += 1) {
    const item = survivors.displayed[index];
    const attack = item.attack;
    writeLine(output, "");
    writeLine(output, `[${item.rank}] ${item.id}`);
    writeLine(output, `Rule: ${attack.rule.statement}`);
    writeLine(output, `Severity: ${attack.rule.severity}`);
    writeLine(output, `Why: ${attack.description}`);
    writeLine(output, `Rationale: ${attack.rationale}`);
    writeLine(output, "Current evaluator: PASS");
  }

  if (survivors.total > survivors.displayed.length) {
    writeLine(
      output,
      `Additional ranked survivors not shown: ${survivors.total - survivors.displayed.length}`
    );
  }
}

async function selectSurvivor(survivors, io) {
  return io.prompt({
    message: "Select a finding by displayed rank or exact attack ID: ",
    invalidMessage: "Select one displayed finding explicitly.\n",
    parse(answer) {
      const value = String(answer).trim();
      if (value.length === 0) return null;

      if (/^[1-9][0-9]*$/.test(value)) {
        const rank = Number(value);
        if (rank >= 1 && rank <= survivors.displayed.length) {
          return survivors.displayed[rank - 1].id;
        }
      }

      for (let index = 0; index < survivors.displayed.length; index += 1) {
        if (value === survivors.displayed[index].id) {
          return value;
        }
      }
      return null;
    }
  });
}

function findDisplayedAttack(survivors, sourceAttackId) {
  for (let index = 0; index < survivors.displayed.length; index += 1) {
    if (survivors.displayed[index].id === sourceAttackId) {
      return survivors.displayed[index].attack;
    }
  }
  return null;
}

async function runGuided(options = {}) {
  const args = parseRunArguments(options.args || []);
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const cwd = path.resolve(options.cwd || process.cwd());
  const configSelection =
    args.configPath === undefined
      ? path.join(cwd, "gotcha.config.js")
      : path.resolve(cwd, args.configPath);

  // This helper captures the public Gotcha root before it executes the config.
  const loaded = loadConfigAfterPublicApi(configSelection);
  const config = requireRunConfigShape(loaded.config);
  const publicApi = loaded.publicApi;
  const promptSession =
    typeof options.prompt === "function"
      ? null
      : createExplicitPromptSession({ input, output });
  const prompt =
    typeof options.prompt === "function"
      ? options.prompt
      : promptSession.prompt;
  const io = { output, prompt };

  try {
    const adapters = createRunAdapters(publicApi, config.provider);

    writeLine(output, "DRAFTING QUALITY CONTRACT");
    const draft = await publicApi.draftQualityContract({
      task: config.task,
      examples: config.examples,
      generator: adapters.qualityContract
    });

    const decisions = await collectContractDecisions(draft, io);
    const confirmed = publicApi.confirmQualityContract({ draft, decisions });

    if (confirmed.status === "no-active-rules") {
      writeLine(output, "");
      writeLine(output, "NO ACTIVE RULES");
      writeLine(
        output,
        "No confirmed quality rules remain, so Gotcha will not attack this case."
      );
      return { state: "no-active-rules", sessionPath: null };
    }

    writeLine(output, "");
    writeLine(output, "ATTACKING CURRENT EVALUATOR");
    const attackResult = await publicApi.runContractAttacks({
      contract: confirmed,
      input: config.case.input,
      expectedOutput: config.case.expectedOutput,
      evaluator: config.evaluator,
      generator: adapters.contractAttacks
    });

    // A no-survivor result needs no replay/session authority. Preserve M8's
    // successful product outcome before requiring replayability for remediation.
    if (resultHasNoSurvivors(attackResult)) {
      presentNoSurvivor(output);
      return { state: "no-survivor", sessionPath: null };
    }

    const survivors = displayedSurvivors(attackResult);
    if (survivors.total === 0) {
      presentNoSurvivor(output);
      return { state: "no-survivor", sessionPath: null };
    }

    presentSurvivors(survivors, output);
    const sourceAttackId = await selectSurvivor(survivors, io);
    const selectedAttack = findDisplayedAttack(survivors, sourceAttackId);

    writeLine(output, "");
    writeLine(output, `SELECTED FINDING: ${sourceAttackId}`);
    writeLine(output, "GENERATING PROPOSED PROTECTION");

    const generated = await publicApi.generateContractProtectionProposal({
      experiment: survivors.experiment,
      sourceAttackId,
      generator: adapters.contractProtection
    });

    if (
      generated === null ||
      typeof generated !== "object" ||
      generated.state !== "proposal-ready" ||
      generated.proposal === null ||
      typeof generated.proposal !== "object"
    ) {
      throw guidedError("Gotcha did not return a proposal-ready protection result.");
    }

    const proposal = generated.proposal;
    writeLine(output, "");
    writeLine(output, "PROPOSED PROTECTION");
    writeLine(output, `Statement: ${proposal.protection.statement}`);
    writeLine(output, `Rationale: ${proposal.protection.rationale}`);
    writeLine(output, "This proposal has not been applied or verified.");

    const session = {
      version: SESSION_VERSION,
      kind: SESSION_KIND,
      experiment: survivors.experiment,
      sourceAttackId,
      proposal
    };

    const sessionPath = writeSession(session, {
      baseDirectory: cwd,
      sessionPath:
        args.sessionPath === undefined
          ? undefined
          : path.resolve(cwd, args.sessionPath)
    });

    writeLine(output, "");
    writeLine(output, `SESSION SAVED: ${sessionPath}`);
    writeLine(
      output,
      "Session data contains local evaluation evidence and may be sensitive project data."
    );
    writeLine(
      output,
      "Keep the baseline evaluator unchanged and add stronger behavior separately as improvedEvaluator."
    );
    writeLine(
      output,
      `Command: gotcha-ai verify ${JSON.stringify(sessionPath)} --config ${JSON.stringify(loaded.configPath)}`
    );

    return {
      state: "session-written",
      sourceAttackId,
      selectedAttack,
      proposal,
      sessionPath
    };
  } finally {
    if (promptSession !== null) {
      promptSession.close();
    }
  }
}

module.exports = {
  parseRunArguments,
  requireRunConfigShape,
  createRunAdapters,
  collectContractDecisions,
  displayedSurvivors,
  resultHasNoSurvivors,
  selectSurvivor,
  runGuided
};
