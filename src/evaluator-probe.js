"use strict";

const RESULT_VERSION = 1;
const RESULT_KIND = "evaluator-probe-result";
const REQUEST_KIND = "gotcha-evaluator-request";
const MAX_CASES = 100;
const MAX_CANDIDATES_PER_CASE = 100;
const MAX_TRIALS = 100;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_STDOUT_BYTES = 1024 * 1024;

function inputError(message) {
  return new TypeError(message);
}

function requireRate(value, label, fallback) {
  const resolved =
    value === undefined
      ? fallback
      : value;

  if (
    typeof resolved !== "number" ||
    !Number.isFinite(resolved) ||
    resolved < 0 ||
    resolved > 1
  ) {
    throw inputError(
      `${label} must be a finite number between 0 and 1.`
    );
  }

  return resolved;
}

function requireTrials(value) {
  const trials =
    value === undefined
      ? 1
      : value;

  if (
    !Number.isInteger(trials) ||
    trials < 1 ||
    trials > MAX_TRIALS
  ) {
    throw inputError(
      `trials must be an integer between 1 and ${MAX_TRIALS}.`
    );
  }

  return trials;
}

function normalizeEvaluatorResult(
  value,
  scoreThreshold
) {
  if (typeof value === "boolean") {
    return {
      type: "boolean",
      passed: value,
      score: null
    };
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  ) {
    return {
      type: "score",
      passed:
        value >= scoreThreshold,
      score: value
    };
  }

  throw inputError(
    "Evaluator must resolve to a boolean or a finite score between 0 and 1."
  );
}

function wilsonInterval(
  passCount,
  total
) {
  if (total === 0) {
    return {
      low: 0,
      high: 0
    };
  }

  const z = 1.959963984540054;
  const proportion =
    passCount / total;
  const zSquared =
    z * z;
  const denominator =
    1 + (zSquared / total);
  const center =
    proportion +
    (zSquared / (2 * total));
  const margin =
    z * Math.sqrt(
      (
        proportion * (1 - proportion) +
        (zSquared / (4 * total))
      ) / total
    );

  return {
    low:
      Math.max(
        0,
        (center - margin) /
          denominator
      ),
    high:
      Math.min(
        1,
        (center + margin) /
          denominator
      )
  };
}

async function runTrials({
  evaluator,
  output,
  context,
  trials,
  scoreThreshold
}) {
  let passCount = 0;
  let scoreCount = 0;
  let scoreTotal = 0;
  let sawBoolean = false;
  let sawScore = false;

  for (
    let trial = 1;
    trial <= trials;
    trial += 1
  ) {
    const raw =
      await evaluator(
        output,
        {
          ...context,
          trial,
          trials
        }
      );

    const normalized =
      normalizeEvaluatorResult(
        raw,
        scoreThreshold
      );

    if (normalized.type === "boolean") {
      sawBoolean = true;
    } else {
      sawScore = true;
      scoreCount += 1;
      scoreTotal +=
        normalized.score;
    }

    if (normalized.passed) {
      passCount += 1;
    }
  }

  const passRate =
    passCount / trials;
  const confidence95 =
    wilsonInterval(
      passCount,
      trials
    );

  return {
    trials,
    passCount,
    failCount:
      trials - passCount,
    passRate,
    confidence95,
    resultType:
      sawBoolean && sawScore
        ? "mixed"
        : sawScore
          ? "score"
          : "boolean",
    meanScore:
      scoreCount > 0
        ? scoreTotal / scoreCount
        : null
  };
}

function normalizeCase(
  value,
  index
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw inputError(
      `cases[${index}] must be an object.`
    );
  }

  const id =
    value.id;

  if (
    typeof id !== "string" ||
    id.trim() === ""
  ) {
    throw inputError(
      `cases[${index}].id must be a non-empty string.`
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      value,
      "expectedOutput"
    )
  ) {
    throw inputError(
      `cases[${index}] must include expectedOutput.`
    );
  }

  if (!Array.isArray(value.candidates)) {
    throw inputError(
      `cases[${index}].candidates must be an array.`
    );
  }

  if (
    value.candidates.length >
    MAX_CANDIDATES_PER_CASE
  ) {
    throw inputError(
      `cases[${index}] has too many candidates.`
    );
  }

  const candidateIds =
    new Set();

  const candidates =
    value.candidates.map(
      (candidate, candidateIndex) => {
        if (
          candidate === null ||
          typeof candidate !== "object" ||
          Array.isArray(candidate)
        ) {
          throw inputError(
            `cases[${index}].candidates[${candidateIndex}] must be an object.`
          );
        }

        if (
          typeof candidate.id !==
            "string" ||
          candidate.id.trim() === ""
        ) {
          throw inputError(
            `cases[${index}].candidates[${candidateIndex}].id must be a non-empty string.`
          );
        }

        if (
          candidateIds.has(
            candidate.id
          )
        ) {
          throw inputError(
            `Duplicate candidate id in case ${id}: ${candidate.id}`
          );
        }

        candidateIds.add(
          candidate.id
        );

        if (
          !Object.prototype.hasOwnProperty.call(
            candidate,
            "output"
          )
        ) {
          throw inputError(
            `Candidate ${candidate.id} must include output.`
          );
        }

        return {
          id:
            candidate.id,
          output:
            candidate.output,
          ruleId:
            typeof candidate.ruleId ===
              "string"
              ? candidate.ruleId
              : null,
          description:
            typeof candidate.description ===
              "string"
              ? candidate.description
              : null
        };
      }
    );

  return {
    id,
    input:
      Object.prototype.hasOwnProperty.call(
        value,
        "input"
      )
        ? value.input
        : null,
    expectedOutput:
      value.expectedOutput,
    candidates
  };
}

async function probeEvaluator(
  options = {}
) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw inputError(
      "probeEvaluator options must be an object."
    );
  }

  const evaluator =
    options.evaluator;

  if (typeof evaluator !== "function") {
    throw inputError(
      "evaluator must be a function."
    );
  }

  if (!Array.isArray(options.cases)) {
    throw inputError(
      "cases must be an array."
    );
  }

  if (
    options.cases.length < 1 ||
    options.cases.length > MAX_CASES
  ) {
    throw inputError(
      `cases must contain between 1 and ${MAX_CASES} entries.`
    );
  }

  const trials =
    requireTrials(
      options.trials
    );
  const scoreThreshold =
    requireRate(
      options.scoreThreshold,
      "scoreThreshold",
      0.5
    );
  const baselinePassRate =
    requireRate(
      options.requiredBaselinePassRate,
      "requiredBaselinePassRate",
      1
    );
  const survivorPassRate =
    requireRate(
      options.survivorPassRate,
      "survivorPassRate",
      1
    );

  const cases =
    options.cases.map(
      normalizeCase
    );

  const caseIds =
    new Set();

  for (const item of cases) {
    if (caseIds.has(item.id)) {
      throw inputError(
        `Duplicate case id: ${item.id}`
      );
    }
    caseIds.add(item.id);
  }

  const results = [];
  let baselineStableCases = 0;
  let baselineUnstableCases = 0;
  let totalCandidates = 0;
  let survivors = 0;
  let caught = 0;
  let flaky = 0;

  for (const item of cases) {
    const baseline =
      await runTrials({
        evaluator,
        output:
          item.expectedOutput,
        context: {
          phase: "baseline",
          caseId: item.id,
          candidateId: null,
          input: item.input,
          expectedOutput:
            item.expectedOutput
        },
        trials,
        scoreThreshold
      });

    const baselineStable =
      baseline.passRate >=
        baselinePassRate;

    if (!baselineStable) {
      baselineUnstableCases += 1;
      results.push({
        id: item.id,
        state: "baseline-unstable",
        baseline,
        candidates: []
      });
      continue;
    }

    baselineStableCases += 1;
    const candidateResults = [];

    for (const candidate of item.candidates) {
      totalCandidates += 1;

      const evaluation =
        await runTrials({
          evaluator,
          output:
            candidate.output,
          context: {
            phase: "candidate",
            caseId: item.id,
            candidateId:
              candidate.id,
            input: item.input,
            expectedOutput:
              item.expectedOutput,
            ruleId:
              candidate.ruleId
          },
          trials,
          scoreThreshold
        });

      let state;

      if (
        evaluation.passRate >=
        survivorPassRate
      ) {
        state = "survivor";
        survivors += 1;
      } else if (
        evaluation.passCount === 0
      ) {
        state = "caught";
        caught += 1;
      } else {
        state = "flaky";
        flaky += 1;
      }

      candidateResults.push({
        id:
          candidate.id,
        ruleId:
          candidate.ruleId,
        description:
          candidate.description,
        output:
          candidate.output,
        state,
        evaluation
      });
    }

    results.push({
      id: item.id,
      state: "evaluated",
      baseline,
      candidates:
        candidateResults
    });
  }

  return {
    version: RESULT_VERSION,
    kind: RESULT_KIND,
    policy: {
      trials,
      scoreThreshold,
      requiredBaselinePassRate:
        baselinePassRate,
      survivorPassRate
    },
    cases: results,
    summary: {
      totalCases:
        cases.length,
      baselineStableCases,
      baselineUnstableCases,
      totalCandidates,
      survivors,
      caught,
      flaky
    }
  };
}

function createCommandEvaluator(
  options = {}
) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw inputError(
      "createCommandEvaluator options must be an object."
    );
  }

  if (
    typeof options.command !==
      "string" ||
    options.command.trim() === ""
  ) {
    throw inputError(
      "command must be a non-empty string."
    );
  }

  const args =
    options.args === undefined
      ? []
      : options.args;

  if (
    !Array.isArray(args) ||
    args.some(
      (value) =>
        typeof value !== "string"
    )
  ) {
    throw inputError(
      "args must be an array of strings."
    );
  }

  const timeoutMs =
    options.timeoutMs === undefined
      ? DEFAULT_TIMEOUT_MS
      : options.timeoutMs;

  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 120000
  ) {
    throw inputError(
      "timeoutMs must be an integer between 1 and 120000."
    );
  }

  const {
    spawn
  } = require("node:child_process");

  const command =
    options.command;
  const cwd =
    options.cwd;
  const env =
    options.env === undefined
      ? process.env
      : {
          ...process.env,
          ...options.env
        };

  return async function commandEvaluator(
    output,
    context
  ) {
    const request = {
      version: 1,
      kind: REQUEST_KIND,
      output,
      context
    };

    return new Promise(
      (resolve, reject) => {
        const child =
          spawn(
            command,
            args,
            {
              cwd,
              env,
              shell: false,
              stdio: [
                "pipe",
                "pipe",
                "pipe"
              ]
            }
          );

        let stdout = "";
        let stderr = "";
        let settled = false;

        const timer =
          setTimeout(
            () => {
              if (settled) return;
              settled = true;
              child.kill();
              reject(
                new Error(
                  `Evaluator command timed out after ${timeoutMs} ms.`
                )
              );
            },
            timeoutMs
          );

        child.stdout.setEncoding(
          "utf8"
        );
        child.stderr.setEncoding(
          "utf8"
        );

        child.stdout.on(
          "data",
          (chunk) => {
            stdout += chunk;
            if (
              Buffer.byteLength(
                stdout,
                "utf8"
              ) >
              MAX_STDOUT_BYTES
            ) {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                child.kill();
                reject(
                  new Error(
                    "Evaluator command stdout exceeded 1 MiB."
                  )
                );
              }
            }
          }
        );

        child.stderr.on(
          "data",
          (chunk) => {
            stderr += chunk;
          }
        );

        child.on(
          "error",
          (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(error);
          }
        );

        child.on(
          "close",
          (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (code !== 0) {
              reject(
                new Error(
                  `Evaluator command exited with code ${code}: ${stderr.trim()}`
                )
              );
              return;
            }

            const trimmed =
              stdout.trim();

            if (trimmed === "") {
              reject(
                new Error(
                  "Evaluator command returned empty stdout."
                )
              );
              return;
            }

            try {
              resolve(
                JSON.parse(
                  trimmed
                )
              );
            } catch {
              reject(
                new Error(
                  "Evaluator command stdout must be one JSON boolean or number."
                )
              );
            }
          }
        );

        child.stdin.end(
          JSON.stringify(
            request
          ) + "\n"
        );
      }
    );
  };
}

module.exports = {
  probeEvaluator,
  createCommandEvaluator
};
