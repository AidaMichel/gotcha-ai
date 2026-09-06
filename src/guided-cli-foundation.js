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

function createExplicitPromptSession(options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const rl = readline.createInterface({ input, output, terminal: false });
  const queuedLines = [];
  let pending = null;
  let ended = false;
  let terminalError = null;
  let explicitlyClosed = false;

  function rejectPending(error) {
    if (pending === null) return;
    const current = pending;
    pending = null;
    current.reject(error);
  }

  function write(value) {
    try {
      output.write(value);
      return true;
    } catch (error) {
      terminalError = error;
      rejectPending(error);
      try { rl.close(); } catch {}
      return false;
    }
  }

  function drain() {
    if (pending === null) return;

    if (terminalError !== null) {
      rejectPending(terminalError);
      return;
    }

    while (pending !== null && queuedLines.length > 0) {
      const answer = queuedLines.shift();
      let parsed;
      try {
        parsed = pending.parse(answer);
      } catch (error) {
        rejectPending(error);
        return;
      }

      if (parsed !== undefined && parsed !== null && parsed !== false) {
        const current = pending;
        pending = null;
        current.resolve(parsed === true ? answer : parsed);
        return;
      }

      if (!write(pending.invalidMessage)) return;
      if (!write(pending.message)) return;
    }

    if (pending !== null && ended) {
      rejectPending(
        guidedError("Input ended before a required decision was provided.")
      );
    }
  }

  rl.on("line", (line) => {
    queuedLines.push(line);
    drain();
  });

  rl.on("SIGINT", () => {
    terminalError = new GuidedCancelledError();
    rejectPending(terminalError);
    try { rl.close(); } catch {}
  });

  rl.on("close", () => {
    ended = true;
    drain();
  });

  function prompt(promptOptions) {
    if (pending !== null) {
      return Promise.reject(
        guidedError("Only one guided prompt may be active at a time.")
      );
    }

    if (terminalError !== null) {
      return Promise.reject(terminalError);
    }

    const parse = promptOptions.parse;
    if (typeof parse !== "function") {
      return Promise.reject(guidedError("Prompt parser must be a function."));
    }

    const message = String(promptOptions.message || "");
    const invalidMessage =
      promptOptions.invalidMessage ||
      "Please enter an explicit valid choice.\n";

    return new Promise((resolve, reject) => {
      pending = {
        parse,
        message,
        invalidMessage,
        resolve,
        reject
      };

      if (!write(message)) return;
      drain();
    });
  }

  function close() {
    if (explicitlyClosed) return;
    explicitlyClosed = true;
    if (pending !== null) {
      rejectPending(
        guidedError("Guided prompt session closed before a required decision was provided.")
      );
    }
    try { rl.close(); } catch {}
  }

  return {
    prompt,
    close
  };
}

function promptExplicit(options) {
  const session = createExplicitPromptSession({
    input: options.input || process.stdin,
    output: options.output || process.stdout
  });

  return session.prompt(options).then(
    (value) => {
      session.close();
      return value;
    },
    (error) => {
      session.close();
      throw error;
    }
  );
}

module.exports = {
  GuidedInputError,
  GuidedCancelledError,
  STARTER_CONFIG,
  GOTCHA_GITIGNORE,
  initProject,
  capturePublicApi,
  loadConfigAfterPublicApi,
  createExplicitPromptSession,
  promptExplicit,
  resolveConfigPath
};
