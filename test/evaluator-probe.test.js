"use strict";

const test =
  require("node:test");
const assert =
  require("node:assert/strict");

const {
  probeEvaluator,
  createCommandEvaluator
} = require("../src");

test(
  "probeEvaluator supports async boolean evaluators across multiple cases",
  async () => {
    const result =
      await probeEvaluator({
        trials: 2,
        evaluator:
          async (output) =>
            output.allowed === true,
        cases: [
          {
            id: "case-a",
            expectedOutput: {
              allowed: true,
              value: 1
            },
            candidates: [
              {
                id: "missed-a",
                output: {
                  allowed: true,
                  value: 2
                }
              }
            ]
          },
          {
            id: "case-b",
            expectedOutput: {
              allowed: true,
              value: 3
            },
            candidates: [
              {
                id: "caught-b",
                output: {
                  allowed: false,
                  value: 3
                }
              }
            ]
          }
        ]
      });

    assert.equal(
      result.kind,
      "evaluator-probe-result"
    );
    assert.equal(
      result.summary.totalCases,
      2
    );
    assert.equal(
      result.summary.survivors,
      1
    );
    assert.equal(
      result.summary.caught,
      1
    );
    assert.equal(
      result.cases[0]
        .candidates[0].state,
      "survivor"
    );
    assert.equal(
      result.cases[1]
        .candidates[0].state,
      "caught"
    );
  }
);

test(
  "probeEvaluator supports score evaluators with an explicit threshold",
  async () => {
    const result =
      await probeEvaluator({
        scoreThreshold: 0.8,
        evaluator(output) {
          return output.score;
        },
        cases: [
          {
            id: "scored",
            expectedOutput: {
              score: 0.95
            },
            candidates: [
              {
                id: "low",
                output: {
                  score: 0.7
                }
              },
              {
                id: "high",
                output: {
                  score: 0.85
                }
              }
            ]
          }
        ]
      });

    const candidates =
      result.cases[0].candidates;

    assert.equal(
      candidates[0].state,
      "caught"
    );
    assert.equal(
      candidates[0]
        .evaluation.meanScore,
      0.7
    );
    assert.equal(
      candidates[1].state,
      "survivor"
    );
  }
);

test(
  "repeated trials expose flaky evaluator behavior and confidence bounds",
  async () => {
    const result =
      await probeEvaluator({
        trials: 4,
        survivorPassRate: 1,
        evaluator(
          output,
          context
        ) {
          if (context.phase === "baseline") {
            return true;
          }

          return context.trial <= 2;
        },
        cases: [
          {
            id: "flaky-case",
            expectedOutput: {
              value: "good"
            },
            candidates: [
              {
                id: "sometimes-passes",
                output: {
                  value: "bad"
                }
              }
            ]
          }
        ]
      });

    const evaluation =
      result.cases[0]
        .candidates[0]
        .evaluation;

    assert.equal(
      result.summary.flaky,
      1
    );
    assert.equal(
      evaluation.passRate,
      0.5
    );
    assert.equal(
      evaluation.passCount,
      2
    );
    assert.equal(
      evaluation.confidence95.low < 0.5,
      true
    );
    assert.equal(
      evaluation.confidence95.high > 0.5,
      true
    );
  }
);

test(
  "unstable known-good baselines stop candidate interpretation for that case",
  async () => {
    let candidateCalls = 0;

    const result =
      await probeEvaluator({
        trials: 2,
        evaluator(
          output,
          context
        ) {
          if (context.phase === "baseline") {
            return context.trial === 1;
          }

          candidateCalls += 1;
          return true;
        },
        cases: [
          {
            id: "unstable",
            expectedOutput: {
              value: "good"
            },
            candidates: [
              {
                id: "candidate",
                output: {
                  value: "bad"
                }
              }
            ]
          }
        ]
      });

    assert.equal(
      result.cases[0].state,
      "baseline-unstable"
    );
    assert.equal(
      result.cases[0]
        .candidates.length,
      0
    );
    assert.equal(
      candidateCalls,
      0
    );
    assert.equal(
      result.summary
        .baselineUnstableCases,
      1
    );
  }
);

test(
  "createCommandEvaluator provides a language-neutral JSON process boundary",
  async () => {
    const source = [
      "let data='';",
      "process.stdin.setEncoding('utf8');",
      "process.stdin.on('data', c => data += c);",
      "process.stdin.on('end', () => {",
      "  const request = JSON.parse(data);",
      "  process.stdout.write(JSON.stringify(request.output.pass === true));",
      "});"
    ].join("");

    const evaluator =
      createCommandEvaluator({
        command:
          process.execPath,
        args: [
          "-e",
          source
        ]
      });

    const result =
      await probeEvaluator({
        evaluator,
        cases: [
          {
            id: "external",
            expectedOutput: {
              pass: true
            },
            candidates: [
              {
                id: "external-survivor",
                output: {
                  pass: true,
                  wrong: true
                }
              },
              {
                id: "external-caught",
                output: {
                  pass: false,
                  wrong: true
                }
              }
            ]
          }
        ]
      });

    assert.deepEqual(
      result.cases[0]
        .candidates
        .map(
          (candidate) =>
            candidate.state
        ),
      [
        "survivor",
        "caught"
      ]
    );
  }
);

test(
  "invalid evaluator result types fail explicitly",
  async () => {
    await assert.rejects(
      () =>
        probeEvaluator({
          evaluator() {
            return 2;
          },
          cases: [
            {
              id: "invalid",
              expectedOutput: {},
              candidates: []
            }
          ]
        }),
      /boolean or a finite score/
    );
  }
);
