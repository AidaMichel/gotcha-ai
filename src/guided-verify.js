"use strict";

const path = require("node:path");

const {
  GuidedInputError,
  loadConfigAfterPublicApi,
  createExplicitPromptSession
} = require("./guided-cli-foundation");
const {
  readSession
} = require("./guided-session");

function guidedError(message) {
  return new GuidedInputError(message);
}

function parseVerifyArguments(args) {
  if (
    args.length === 0 ||
    typeof args[0] !== "string" ||
    args[0].length === 0 ||
    args[0].startsWith("--")
  ) {
    throw guidedError(
      "Usage: gotcha-ai verify <session-path> [--config path]"
    );
  }

  const sessionPath = args[0];
  let configPath;

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index];
    if (token !== "--config") {
      throw guidedError(
        "Usage: gotcha-ai verify <session-path> [--config path]"
      );
    }
    if (configPath !== undefined) {
      throw guidedError("--config may be supplied only once.");
    }
    if (index + 1 >= args.length) {
      throw guidedError("--config requires a path.");
    }

    const value = args[index + 1];
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.startsWith("--")
    ) {
      throw guidedError("--config requires a path.");
    }
    configPath = value;
    index += 1;
  }

  return { sessionPath, configPath };
}

function requireVerifyConfigShape(config) {
  if (config === null || typeof config !== "object") {
    throw guidedError("Gotcha verify config must export an object.");
  }
  if (typeof config.evaluator !== "function") {
    throw guidedError("Gotcha verify config evaluator must be a function.");
  }
  if (typeof config.improvedEvaluator !== "function") {
    throw guidedError(
      "Gotcha verify config improvedEvaluator must be a function."
    );
  }
  return config;
}

function writeLine(output, value) {
  output.write(`${value}\n`);
}

function normalizeChoice(answer) {
  return String(answer).trim().toLowerCase();
}

function presentCurrentDraft(checkpoint, output) {
  if (
    checkpoint === null ||
    typeof checkpoint !== "object" ||
    checkpoint.state !== "awaiting-confirmation" ||
    checkpoint.draft === null ||
    typeof checkpoint.draft !== "object"
  ) {
    throw guidedError("Gotcha did not return an awaiting-confirmation checkpoint.");
  }

  const draft = checkpoint.draft;
  writeLine(output, "CURRENT PROTECTION DRAFT");
  writeLine(output, `Source finding: ${draft.source.attackId}`);
  writeLine(output, `Rule: ${draft.rule.statement}`);
  writeLine(output, `Protection: ${draft.protection.statement}`);
  writeLine(output, `Rationale: ${draft.protection.rationale}`);
  writeLine(
    output,
    "This is the freshly prepared current draft. It is not accepted by default."
  );
}

async function collectProtectionDecision(io) {
  const type = await io.prompt({
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

  if (type !== "edit") {
    return { type };
  }

  const statement = await io.prompt({
    message: "Edited protection statement: ",
    invalidMessage: "Enter a non-empty protection statement.\n",
    parse(answer) {
      const value = String(answer).trim();
      return value.length > 0 ? value : null;
    }
  });

  return { type: "edit", statement };
}

function joinIds(value) {
  return Array.isArray(value) && value.length > 0
    ? value.join(", ")
    : "none";
}

function presentVerificationResult(result, output) {
  writeLine(output, "");

  if (result.state === "rejected") {
    writeLine(output, "PROTECTION REJECTED");
    writeLine(output, "State: rejected");
    writeLine(output, "No verification or re-attack was run.");
    return;
  }

  const verification = result.verification;
  if (verification === null || typeof verification !== "object") {
    throw guidedError("Gotcha returned a verification result without verification data.");
  }

  writeLine(output, "VERIFICATION RESULT");
  writeLine(output, `State: ${verification.state}`);
  writeLine(output, `Verification passed: ${verification.verificationPassed}`);
  writeLine(
    output,
    `Baseline positive control passed: ${verification.baselinePositiveControlPassed}`
  );
  writeLine(
    output,
    `Improved positive control passed: ${verification.improvedPositiveControlPassed}`
  );
  writeLine(output, `Source finding caught: ${verification.sourceFindingCaught}`);
  writeLine(
    output,
    `Before survivors: ${
      verification.baseline === null
        ? "unavailable"
        : joinIds(verification.baseline.survivorOrderIds)
    }`
  );
  writeLine(
    output,
    `After survivors: ${
      verification.after === null
        ? "unavailable"
        : joinIds(verification.after.survivorOrderIds)
    }`
  );
  writeLine(output, `Eliminated attacks: ${joinIds(verification.eliminatedAttackIds)}`);
  writeLine(output, `New regression attacks: ${joinIds(verification.regressionAttackIds)}`);
  writeLine(
    output,
    `Baseline mismatch attacks: ${joinIds(verification.baselineMismatchAttackIds)}`
  );
  writeLine(output, `Failure reasons: ${joinIds(verification.failureReasons)}`);

  if (verification.state === "verified") {
    writeLine(output, "VERIFIED: the selected source finding is caught in this bound replay.");
  } else {
    writeLine(
      output,
      `NOT VERIFIED: Gotcha preserved the semantic state ${verification.state}.`
    );
  }
}

async function runGuidedVerify(options = {}) {
  const args = parseVerifyArguments(options.args || []);
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const cwd = path.resolve(options.cwd || process.cwd());
  const configSelection =
    args.configPath === undefined
      ? path.join(cwd, "gotcha.config.js")
      : path.resolve(cwd, args.configPath);
  const sessionPath = path.resolve(cwd, args.sessionPath);

  // Required architecture order: capture public semantic authority, then run
  // trusted config code, then parse the untrusted mutable session artifact.
  const loaded = loadConfigAfterPublicApi(configSelection);
  const config = requireVerifyConfigShape(loaded.config);
  const publicApi = loaded.publicApi;
  const session = readSession(sessionPath);
  const promptSession =
    typeof options.prompt === "function"
      ? null
      : createExplicitPromptSession({ input, output });
  const prompt =
    typeof options.prompt === "function"
      ? options.prompt
      : promptSession.prompt;

  try {
    writeLine(output, "PREPARING CURRENT PROTECTION CHECKPOINT");
    const checkpoint = await publicApi.prepareContractQualityLoop({
      experiment: session.experiment,
      sourceAttackId: session.sourceAttackId,
      proposal: session.proposal
    });

    presentCurrentDraft(checkpoint, output);
    const decision = await collectProtectionDecision({ output, prompt });

    const result = await publicApi.completeContractQualityLoop({
      checkpoint,
      decision,
      evaluator: config.evaluator,
      improvedEvaluator: config.improvedEvaluator
    });

    presentVerificationResult(result, output);
    return result;
  } finally {
    if (promptSession !== null) {
      promptSession.close();
    }
  }
}

module.exports = {
  parseVerifyArguments,
  requireVerifyConfigShape,
  presentCurrentDraft,
  collectProtectionDecision,
  presentVerificationResult,
  runGuidedVerify
};
