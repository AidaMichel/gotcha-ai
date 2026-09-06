"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

class GuidedInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "GuidedInputError";
  }
}

class GuidedCancelledError extends Error {
  constructor() {
    super("Guided interaction cancelled.");
    this.name = "GuidedCancelledError";
    this.exitCode = 130;
  }
}

const STARTER_CONFIG = `"use strict";

module.exports = {
  task: "Describe what your AI should do.",

  examples: [
    // Add M7 teaching examples here.
  ],

  case: {
    input: "Add one concrete eval input.",
    expectedOutput: "Add the known-good output for that input."
  },

  evaluator(output) {
    // Keep this BASELINE behavior available for later verification.
    // Return true when the current evaluator accepts output.
    return true;
  },

  provider: {
    model: "your-model",

    async transport(request) {
      // Trusted caller-owned provider integration.
      // Read credentials here (for example from process.env), not in Gotcha.
      // Translate request to your provider and return the M11 response envelope.
      throw new Error("Configure provider.transport before running Gotcha.");
    }
  }

  // After you apply a human-approved protection, ADD a separate function:
  // improvedEvaluator(output) {
  //   return true;
  // }
};
`;

const GOTCHA_GITIGNORE = `*
!.gitignore
`;

function guidedError(message) {
  return new GuidedInputError(message);
}

function pathExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

function initProject(directory) {
  const target = path.resolve(directory || process.cwd());
  const configPath = path.join(target, "gotcha.config.js");
  const gotchaDirectory = path.join(target, ".gotcha");
  const ignorePath = path.join(gotchaDirectory, ".gitignore");

  if (pathExists(configPath)) {
    throw guidedError(`Refusing to overwrite existing file: ${configPath}`);
  }
  if (pathExists(ignorePath)) {
    throw guidedError(`Refusing to overwrite existing file: ${ignorePath}`);
  }

  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(gotchaDirectory, { recursive: true });

  let configCreated = false;
  let ignoreCreated = false;
  try {
    fs.writeFileSync(configPath, STARTER_CONFIG, {
      encoding: "utf8",
      flag: "wx"
    });
    configCreated = true;

    fs.writeFileSync(ignorePath, GOTCHA_GITIGNORE, {
      encoding: "utf8",
      flag: "wx"
    });
    ignoreCreated = true;
  } catch (error) {
    if (ignoreCreated) {
      try { fs.unlinkSync(ignorePath); } catch {}
    }
    if (configCreated) {
      try { fs.unlinkSync(configPath); } catch {}
    }
    throw error;
  }

  return {
    directory: target,
    configPath,
    ignorePath
  };
}

function capturePublicApi() {
  // This require must happen before any trusted user config is executed.
  const api = require("./index");

  return Object.freeze({
    draftQualityContract: api.draftQualityContract,
    confirmQualityContract: api.confirmQualityContract,
    runContractAttacks: api.runContractAttacks,
    createStructuredProviderAdapter: api.createStructuredProviderAdapter,
    generateContractProtectionProposal: api.generateContractProtectionProposal,
    prepareContractQualityLoop: api.prepareContractQualityLoop,
    completeContractQualityLoop: api.completeContractQualityLoop
  });
}

function resolveConfigPath(configPath) {
  return path.resolve(configPath || "gotcha.config.js");
}

function loadConfigAfterPublicApi(configPath) {
  const publicApi = capturePublicApi();
  const resolved = resolveConfigPath(configPath);

  let config;
  try {
    config = require(resolved);
  } catch (error) {
    const wrapped = guidedError(`Unable to load Gotcha config: ${resolved}`);
    wrapped.cause = error;
    throw wrapped;
  }

  return {
    publicApi,
    config,
    configPath: resolved
  };
}

function promptExplicit(options) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const message = String(options.message || "");
  const parse = options.parse;
  const invalidMessage = options.invalidMessage || "Please enter an explicit valid choice.\n";

  if (typeof parse !== "function") {
    return Promise.reject(guidedError("Prompt parser must be a function."));
  }

  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input, output, terminal: false });
    let settled = false;
    let questionPending = false;

    function finishError(error) {
      if (settled) return;
      settled = true;
      try { rl.close(); } catch {}
      reject(error);
    }

    function ask() {
      if (settled) return;
      questionPending = true;
      rl.question(message, (answer) => {
        questionPending = false;
        if (settled) return;

        let parsed;
        try {
          parsed = parse(answer);
        } catch (error) {
          finishError(error);
          return;
        }

        if (parsed !== undefined && parsed !== null && parsed !== false) {
          settled = true;
          try { rl.close(); } catch {}
          resolve(parsed === true ? answer : parsed);
          return;
        }

        output.write(invalidMessage);
        ask();
      });
    }

    rl.on("SIGINT", () => {
      finishError(new GuidedCancelledError());
    });

    rl.on("close", () => {
      if (!settled && questionPending) {
        settled = true;
        reject(guidedError("Input ended before a required decision was provided."));
      }
    });

    ask();
  });
}

module.exports = {
  GuidedInputError,
  GuidedCancelledError,
  STARTER_CONFIG,
  GOTCHA_GITIGNORE,
  initProject,
  capturePublicApi,
  loadConfigAfterPublicApi,
  promptExplicit,
  resolveConfigPath
};
