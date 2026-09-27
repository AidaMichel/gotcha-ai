"use strict";

const path =
  require("node:path");

const {
  GuidedInputError,
  loadConfigAfterPublicApi
} = require("./guided-cli-foundation");

function guidedError(message) {
  return new GuidedInputError(
    message
  );
}

function parseProbeArguments(args) {
  let configPath;

  for (
    let index = 0;
    index < args.length;
    index += 1
  ) {
    const token =
      args[index];

    if (token !== "--config") {
      throw guidedError(
        "Usage: gotcha-ai probe [--config path]"
      );
    }

    if (
      index + 1 >=
      args.length
    ) {
      throw guidedError(
        "--config requires a path."
      );
    }

    const value =
      args[index + 1];

    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.startsWith("--")
    ) {
      throw guidedError(
        "--config requires a path."
      );
    }

    if (configPath !== undefined) {
      throw guidedError(
        "--config may be supplied only once."
      );
    }

    configPath =
      value;
    index += 1;
  }

  return {
    configPath
  };
}

function requireProbeConfigShape(
  config
) {
  if (
    config === null ||
    typeof config !== "object"
  ) {
    throw guidedError(
      "Gotcha config must export an object."
    );
  }

  if (
    typeof config.evaluator !==
      "function"
  ) {
    throw guidedError(
      "Gotcha probe config evaluator must be a function."
    );
  }

  if (
    config.probe === null ||
    typeof config.probe !== "object" ||
    Array.isArray(config.probe)
  ) {
    throw guidedError(
      "Gotcha probe config must include a probe object."
    );
  }

  if (
    !Array.isArray(
      config.probe.cases
    )
  ) {
    throw guidedError(
      "Gotcha probe config probe.cases must be an array."
    );
  }

  return config;
}

function percent(value) {
  return (
    value * 100
  ).toFixed(0) + "%";
}

function formatConfidence(
  interval
) {
  return (
    `${percent(interval.low)}–` +
    percent(interval.high)
  );
}

function writeLine(output, value) {
  output.write(
    `${value}\n`
  );
}

function presentProbeResult(
  result,
  output
) {
  writeLine(
    output,
    ""
  );
  writeLine(
    output,
    "EVALUATOR PROBE"
  );
  writeLine(
    output,
    `Cases: ${result.summary.totalCases} · Trials: ${result.policy.trials}`
  );

  for (
    const item of
      result.cases
  ) {
    writeLine(
      output,
      ""
    );
    writeLine(
      output,
      `CASE ${item.id}`
    );
    writeLine(
      output,
      `Baseline: ${item.baseline.passCount}/${item.baseline.trials} PASS · ${percent(item.baseline.passRate)}`
    );

    if (
      item.state ===
        "baseline-unstable"
    ) {
      writeLine(
        output,
        "BASELINE UNSTABLE — candidate results were not interpreted."
      );
      continue;
    }

    for (
      const candidate of
        item.candidates
    ) {
      const label =
        candidate.state === "survivor"
          ? "SURVIVOR"
          : candidate.state === "flaky"
            ? "FLAKY"
            : "CAUGHT";

      writeLine(
        output,
        `[${label}] ${candidate.id} · ${candidate.evaluation.passCount}/${candidate.evaluation.trials} PASS · ${percent(candidate.evaluation.passRate)} · 95% CI ${formatConfidence(candidate.evaluation.confidence95)}`
      );

      if (
        candidate.description !==
          null
      ) {
        writeLine(
          output,
          `  ${candidate.description}`
        );
      }
    }
  }

  writeLine(
    output,
    ""
  );

  if (
    result.summary.survivors >
    0
  ) {
    writeLine(
      output,
      `GOTCHA — ${result.summary.survivors} stable survivor candidate${result.summary.survivors === 1 ? "" : "s"} found.`
    );
    writeLine(
      output,
      "A survivor means the evaluator accepted the candidate under the configured trial policy. It is not automatically a confirmed semantic failure."
    );
  } else {
    writeLine(
      output,
      "NO STABLE SURVIVOR FOUND"
    );
  }

  if (
    result.summary.flaky >
    0
  ) {
    writeLine(
      output,
      `Flaky candidates: ${result.summary.flaky}. Treat them as evaluator instability, not a clean blind spot.`
    );
  }

  if (
    result.summary
      .baselineUnstableCases >
    0
  ) {
    writeLine(
      output,
      `Unstable baselines: ${result.summary.baselineUnstableCases}. Gotcha intentionally withheld candidate interpretation for those cases.`
    );
  }
}

async function runGuidedProbe(
  options = {}
) {
  const args =
    parseProbeArguments(
      options.args || []
    );
  const output =
    options.output ||
    process.stdout;
  const cwd =
    path.resolve(
      options.cwd ||
      process.cwd()
    );

  const configSelection =
    args.configPath ===
      undefined
      ? path.join(
          cwd,
          "gotcha.config.js"
        )
      : path.resolve(
          cwd,
          args.configPath
        );

  const loaded =
    loadConfigAfterPublicApi(
      configSelection
    );
  const config =
    requireProbeConfigShape(
      loaded.config
    );

  const result =
    await loaded.publicApi
      .probeEvaluator({
        evaluator:
          config.evaluator,
        cases:
          config.probe.cases,
        trials:
          config.probe.trials,
        scoreThreshold:
          config.probe
            .scoreThreshold,
        requiredBaselinePassRate:
          config.probe
            .requiredBaselinePassRate,
        survivorPassRate:
          config.probe
            .survivorPassRate
      });

  presentProbeResult(
    result,
    output
  );

  return result;
}

module.exports = {
  parseProbeArguments,
  requireProbeConfigShape,
  presentProbeResult,
  runGuidedProbe
};
