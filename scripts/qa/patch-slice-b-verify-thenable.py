from pathlib import Path

path = Path('src/contract-remediation.js')
text = path.read_text()

start = text.index('async function replayPhase(authorityArtifact, callback) {')
end = text.index('\nfunction freshEmptyArray()', start)
new_replay = r'''function replayPhase(authorityArtifact, callback) {
  const failure = { phase: null, reason: null };
  const experiment = authorityArtifact.experiment;
  const projectedAttacks = projectReplayAttacks(experiment);
  const evaluator = makeClassifyingEvaluator(callback, failure);

  return new PromiseConstructor((resolve, reject) => {
    let replayPromise;

    try {
      replayPromise = runContractAttacksCore({
        contract: cloneCapturedValue(experiment.contract, new SetConstructor()),
        input: cloneWireValue(experiment.case.input, new SetConstructor()),
        expectedOutput: cloneWireValue(experiment.case.expectedOutput, new SetConstructor()),
        evaluator,
        generator() {
          return makeRecord([
            ["version", 1],
            ["task", experiment.task],
            ["attacks", projectedAttacks]
          ]);
        }
      });
    } catch (error) {
      reject(error);
      return;
    }

    reflectApply(promiseThen, replayPromise, [
      (result) => {
        try {
          const phaseResult = makeRecord([
            ["replay", normalizedReplay(result, experiment)],
            ["failure", null]
          ]);
          settleArtifact(resolve, phaseResult);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        if (failure.phase === null) {
          reject(error);
          return;
        }

        try {
          const phaseResult = makeRecord([
            ["replay", null],
            ["failure", makeRecord([
              ["phase", failure.phase],
              ["reason", failure.reason]
            ])]
          ]);
          settleArtifact(resolve, phaseResult);
        } catch (settleError) {
          reject(settleError);
        }
      }
    ]);
  });
}
'''
text = text[:start] + new_replay + text[end:]

start = text.index('async function buildVerification(capture) {')
end = text.index('\nfunction scheduleVerification(capture, resolve, reject) {', start)
new_build = r'''function buildVerification(capture) {
  return new PromiseConstructor((resolve, reject) => {
    let authorityArtifact;
    let experiment;

    try {
      validateProtectionArtifact(capture.protection, "confirmed");
      probeProtectionArtifact(capture.protection, "confirmed");
      authorityArtifact = cloneProtectionCanonical(capture.protection);
      validateProtectionArtifact(authorityArtifact, "confirmed");
      experiment = authorityArtifact.experiment;
    } catch (error) {
      reject(error);
      return;
    }

    const finish = (result) => {
      try {
        settleArtifact(resolve, result);
      } catch (error) {
        reject(error);
      }
    };

    const baselinePromise = replayPhase(authorityArtifact, capture.evaluator);
    reflectApply(promiseThen, baselinePromise, [
      (baselinePhase) => {
        try {
          if (baselinePhase.failure !== null) {
            const failure = baselinePhase.failure;
            const positiveReturnedFalse =
              failure.phase === "positive-control" && failure.reason === "returned-false";
            const state = positiveReturnedFalse
              ? "baseline-positive-control-failed"
              : "baseline-execution-failed";
            const baselinePc = positiveReturnedFalse
              ? false
              : failure.phase === "attack-evaluation" ? true : null;
            finish(makeVerificationResult({
              state,
              verificationPassed: false,
              authorityArtifact,
              baselinePositiveControlPassed: baselinePc,
              improvedPositiveControlPassed: null,
              baseline: null,
              after: null,
              baselineMismatchAttackIds: freshEmptyArray(),
              eliminatedAttackIds: freshEmptyArray(),
              regressionAttackIds: freshEmptyArray(),
              sourceFindingCaught: false,
              improvement: null,
              failureReasons: makeFailureReasons(state)
            }));
            return;
          }

          const baseline = baselinePhase.replay;
          const mismatchIds = baselineMismatchIds(experiment, baseline);
          const rankMatches = sameStringArray(
            experiment.baseline.survivorOrderIds,
            baseline.survivorOrderIds
          );
          const topMatches = experiment.baseline.topFindingId === baseline.topFindingId;

          if (mismatchIds.length > 0 || !rankMatches || !topMatches) {
            finish(makeVerificationResult({
              state: "baseline-mismatch",
              verificationPassed: false,
              authorityArtifact,
              baselinePositiveControlPassed: true,
              improvedPositiveControlPassed: null,
              baseline,
              after: null,
              baselineMismatchAttackIds: mismatchIds,
              eliminatedAttackIds: freshEmptyArray(),
              regressionAttackIds: freshEmptyArray(),
              sourceFindingCaught: false,
              improvement: null,
              failureReasons: makeFailureReasons("baseline-mismatch")
            }));
            return;
          }

          const improvedPromise = replayPhase(authorityArtifact, capture.improvedEvaluator);
          reflectApply(promiseThen, improvedPromise, [
            (improvedPhase) => {
              try {
                if (improvedPhase.failure !== null) {
                  const failure = improvedPhase.failure;
                  const positiveReturnedFalse =
                    failure.phase === "positive-control" && failure.reason === "returned-false";
                  const state = positiveReturnedFalse
                    ? "improved-positive-control-failed"
                    : "improved-execution-failed";
                  const improvedPc = positiveReturnedFalse
                    ? false
                    : failure.phase === "attack-evaluation" ? true : null;
                  finish(makeVerificationResult({
                    state,
                    verificationPassed: false,
                    authorityArtifact,
                    baselinePositiveControlPassed: true,
                    improvedPositiveControlPassed: improvedPc,
                    baseline,
                    after: null,
                    baselineMismatchAttackIds: freshEmptyArray(),
                    eliminatedAttackIds: freshEmptyArray(),
                    regressionAttackIds: freshEmptyArray(),
                    sourceFindingCaught: false,
                    improvement: null,
                    failureReasons: makeFailureReasons(state)
                  }));
                  return;
                }

                const after = improvedPhase.replay;
                const eliminated = new ArrayConstructor();
                const regressions = new ArrayConstructor();
                let sourceFindingCaught = false;

                for (let index = 0; index < experiment.attacks.length; index += 1) {
                  const attackId = experiment.attacks[index].id;
                  const beforeSurvived = baseline.outcomes[index].survived;
                  const afterSurvived = after.outcomes[index].survived;
                  if (beforeSurvived && !afterSurvived) {
                    append(eliminated, attackId);
                  }
                  if (!beforeSurvived && afterSurvived) {
                    append(regressions, attackId);
                  }
                  if (attackId === authorityArtifact.source.attackId) {
                    sourceFindingCaught = afterSurvived === false;
                  }
                }

                const improvement =
                  baseline.survivorOrderIds.length - after.survivorOrderIds.length;
                const hasRegression = regressions.length > 0;
                const sourceSurvives = !sourceFindingCaught;
                const state = hasRegression
                  ? "regression-detected"
                  : sourceSurvives
                    ? "source-finding-still-survives"
                    : "verified";
                const reasons = makeFailureReasons(
                  hasRegression ? "regression-detected" : null,
                  sourceSurvives ? "source-finding-still-survives" : null
                );

                finish(makeVerificationResult({
                  state,
                  verificationPassed: state === "verified",
                  authorityArtifact,
                  baselinePositiveControlPassed: true,
                  improvedPositiveControlPassed: true,
                  baseline,
                  after,
                  baselineMismatchAttackIds: freshEmptyArray(),
                  eliminatedAttackIds: eliminated,
                  regressionAttackIds: regressions,
                  sourceFindingCaught,
                  improvement,
                  failureReasons: reasons
                }));
              } catch (error) {
                reject(error);
              }
            },
            reject
          ]);
        } catch (error) {
          reject(error);
        }
      },
      reject
    ]);
  });
}
'''
text = text[:start] + new_build + text[end:]

path.write_text(text)

# Append focused regression.
test_path = Path('test/contract-remediation-verify.test.js')
test_text = test_path.read_text()
regression = r'''

test("verification ignores inherited Object.prototype thenables across internal replay boundaries", async () => {
  const protection = await confirmedProtection();
  let thenCalls = 0;

  Object.defineProperty(Object.prototype, "then", {
    value(resolve) {
      thenCalls += 1;
      resolve("hijacked");
    },
    writable: true,
    enumerable: false,
    configurable: true
  });

  try {
    const result = await verifyContractProtection({
      protection,
      evaluator: historicalEvaluator,
      improvedEvaluator(output) {
        return output.time === "3 PM";
      }
    });

    assertCanonicalResult(result);
    assert.equal(result.state, "verified");
    assert.equal(result.verificationPassed, true);
    assert.equal(thenCalls, 0);
  } finally {
    delete Object.prototype.then;
  }
});
'''
if 'verification ignores inherited Object.prototype thenables across internal replay boundaries' not in test_text:
    test_path.write_text(test_text + regression)
