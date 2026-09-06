const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  PassThrough
} = require("node:stream");

const {
  STARTER_CONFIG,
  GOTCHA_GITIGNORE,
  initProject,
  loadConfigAfterPublicApi,
  promptExplicit
} = require("../src/guided-cli-foundation");

const {
  SESSION_VERSION,
  SESSION_KIND,
  encodeJsonIterative,
  parseSessionText,
  readSession,
  writeSession
} = require("../src/guided-session");

function withTempDirectory(prefix, callback) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), prefix)
  );

  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function makeSession(experiment) {
  return {
    version: SESSION_VERSION,
    kind: SESSION_KIND,
    experiment,
    sourceAttackId: "attack-1",
    proposal: {
      version: 1,
      task: "test task",
      sourceAttackId: "attack-1",
      ruleId: "rule-1",
      protection: {
        statement: "Preserve the requested value.",
        rationale: "The selected survivor changed it."
      }
    }
  };
}

test(
  "init creates the exact starter paths without an active improved evaluator",
  () => withTempDirectory("gotcha-m14-init-", (directory) => {
    const target = path.join(directory, "project");
    const result = initProject(target);

    assert.equal(result.directory, target);
    assert.equal(
      fs.readFileSync(result.configPath, "utf8"),
      STARTER_CONFIG
    );
    assert.equal(
      fs.readFileSync(result.ignorePath, "utf8"),
      GOTCHA_GITIGNORE
    );

    const config = require(result.configPath);
    assert.equal(
      Object.prototype.hasOwnProperty.call(config, "improvedEvaluator"),
      false
    );
    assert.equal(typeof config.evaluator, "function");
    assert.equal(typeof config.provider.transport, "function");
  })
);

test(
  "init performs no partial overwrite when either starter path already exists",
  () => withTempDirectory("gotcha-m14-conflict-", (directory) => {
    const gotchaDirectory = path.join(directory, ".gotcha");
    fs.mkdirSync(gotchaDirectory);
    const ignorePath = path.join(gotchaDirectory, ".gitignore");
    fs.writeFileSync(ignorePath, "sentinel\n");

    assert.throws(
      () => initProject(directory),
      /Refusing to overwrite existing file:/
    );
    assert.equal(
      fs.existsSync(path.join(directory, "gotcha.config.js")),
      false
    );
    assert.equal(fs.readFileSync(ignorePath, "utf8"), "sentinel\n");
  })
);

test(
  "trusted public Gotcha root is loaded before trusted user config executes",
  () => withTempDirectory("gotcha-m14-load-order-", (directory) => {
    const packageIndex = path.join(__dirname, "..", "src", "index.js");
    const configPath = path.join(directory, "gotcha.config.js");

    fs.writeFileSync(
      configPath,
      [
        "module.exports = {",
        `  rootWasLoaded: Boolean(require.cache[require.resolve(${JSON.stringify(packageIndex)})])`,
        "};",
        ""
      ].join("\n")
    );

    const loaded = loadConfigAfterPublicApi(configPath);
    assert.equal(loaded.config.rootWasLoaded, true);
    assert.equal(typeof loaded.publicApi.draftQualityContract, "function");
    assert.equal(typeof loaded.publicApi.runContractAttacks, "function");
    assert.equal(
      typeof loaded.publicApi.generateContractProtectionProposal,
      "function"
    );
  })
);

test(
  "explicit prompt never turns blank input into acceptance",
  async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let printed = "";
    output.on("data", (chunk) => {
      printed += chunk.toString("utf8");
    });

    const answerPromise = promptExplicit({
      input,
      output,
      message: "Decision: ",
      invalidMessage: "Explicit choice required.\n",
      parse(answer) {
        return answer === "accept" ? "accept" : null;
      }
    });

    input.end("\naccept\n");

    assert.equal(await answerPromise, "accept");
    assert.equal(
      printed.includes("Explicit choice required."),
      true
    );
  }
);

test(
  "session encoder is stack-safe at 12000 levels and preserves nested key order",
  () => {
    const experiment = {
      beta: 1,
      alpha: {
        second: "two",
        first: "one"
      }
    };

    let cursor = experiment.alpha;
    for (let index = 0; index < 12000; index += 1) {
      cursor.next = {};
      cursor = cursor.next;
    }
    cursor.done = true;

    const session = makeSession(experiment);
    const encoded = encodeJsonIterative(session);
    const parsed = parseSessionText(encoded);

    assert.deepEqual(
      Object.keys(parsed.experiment),
      ["beta", "alpha"]
    );
    assert.deepEqual(
      Object.keys(parsed.experiment.alpha).slice(0, 3),
      ["second", "first", "next"]
    );

    let parsedCursor = parsed.experiment.alpha;
    for (let index = 0; index < 12000; index += 1) {
      parsedCursor = parsedCursor.next;
    }
    assert.equal(parsedCursor.done, true);
  }
);

test(
  "session encoder rejects lossy minus-zero and shared container identity",
  () => {
    assert.throws(
      () => encodeJsonIterative(makeSession({ value: -0 })),
      /unsupported data/
    );

    const shared = { value: 1 };
    assert.throws(
      () => encodeJsonIterative(makeSession({ a: shared, b: shared })),
      /tree without cycles or shared container identities/
    );
  }
);

test(
  "session writer never overwrites explicit targets and default targets are unique",
  () => withTempDirectory("gotcha-m14-session-", (directory) => {
    fs.mkdirSync(path.join(directory, ".gotcha"));
    const explicitPath = path.join(directory, ".gotcha", "chosen.json");
    const session = makeSession({ ordered: [1, 2, 3] });

    const written = writeSession(session, { sessionPath: explicitPath });
    assert.equal(written, explicitPath);
    const original = fs.readFileSync(explicitPath, "utf8");

    assert.throws(
      () => writeSession(session, { sessionPath: explicitPath }),
      /Session already exists:/
    );
    assert.equal(fs.readFileSync(explicitPath, "utf8"), original);

    const first = writeSession(session, { baseDirectory: directory });
    const second = writeSession(session, { baseDirectory: directory });
    assert.notEqual(first, second);
    assert.equal(path.dirname(first), path.join(directory, ".gotcha"));
    assert.deepEqual(readSession(first).experiment.ordered, [1, 2, 3]);
  })
);

test(
  "session parser rejects malformed or expanded envelopes before semantic use",
  () => {
    assert.throws(
      () => parseSessionText("not-json"),
      /not valid JSON/
    );

    const expanded = makeSession({ ok: true });
    expanded.extra = true;
    assert.throws(
      () => parseSessionText(JSON.stringify(expanded)),
      /invalid M14 envelope/
    );
  }
);
