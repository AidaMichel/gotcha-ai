from pathlib import Path

path = Path('src/contract-remediation.js')
text = path.read_text()
text = text.replace('const {\n  experimentIntrinsics: authority\n} = require("./contract-attacks-core");', 'const {\n  runContractAttacks: runContractAttacksCore,\n  experimentIntrinsics: authority\n} = require("./contract-attacks-core");', 1)

anchor = '''function draftContractProtection(options) {'''
insert = r'''function captureVerifyInvocation(options) {
  if (!wireAuthorityAvailable) {
    throw boundaryError();
  }

  if (
    options === null ||
    typeof options !== "object" ||
    isProxy(options) === true ||
    arrayIsArray(options) === true ||
    hasForbiddenBrand(options) ||
    getPrototypeOf(options) !== objectPrototype ||
    isExtensible(options) !== true
  ) {
    throw boundaryError();
  }

  const descriptors = getOwnPropertyDescriptors(options);
  const keys = ownKeys(descriptors);
  const expectedKeys = ["protection", "evaluator", "improvedEvaluator"];

  if (keys.length !== expectedKeys.length) {
    throw boundaryError();
  }

  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (!ordinaryDescriptor(descriptors[expectedKeys[index]])) {
      throw boundaryError();
    }
  }

  for (let index = 0; index < keys.length; index += 1) {
    let found = false;
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      if (keys[index] === expectedKeys[expectedIndex]) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw boundaryError();
    }
  }

  const evaluator = descriptors.evaluator.value;
  const improvedEvaluator = descriptors.improvedEvaluator.value;
  if (
    typeof evaluator !== "function" ||
    isProxy(evaluator) === true ||
    typeof improvedEvaluator !== "function" ||
    isProxy(improvedEvaluator) === true
  ) {
    throw boundaryError();
  }

  const seen = new SetConstructor();
  setAddValue(seen, options);

  return makeRecord([
    ["protection", cloneCapturedValue(descriptors.protection.value, seen)],
    ["evaluator", evaluator],
    ["improvedEvaluator", improvedEvaluator]
  ]);
}

function cloneProtectionCanonical(artifact) {
  return makeRecord([
    ["version", 1],
    ["kind", "contract-protection"],
    ["status", artifact.status],
    ["task", artifact.task],
    ["experiment", cloneExperimentCanonical(artifact.experiment)],
    ["source", makeRecord([
      ["attackId", artifact.source.attackId],
      ["ruleId", artifact.source.ruleId]
    ])],
    ["rule", cloneRuleCanonical(artifact.rule)],
    ["protection", makeRecord([
      ["statement", artifact.protection.statement],
      ["rationale", artifact.protection.rationale]
    ])]
  ]);
}

function probeProtectionArtifact(artifact, status) {
  validateProtectionArtifact(artifact, status);
  assertPrototypeBaseline();
  const encoded = jsonStringify(artifact);
  const parsed = jsonParse(encoded);
  validateProtectionArtifact(parsed, status);
  if (
    parsed.protection.statement !== artifact.protection.statement ||
    parsed.protection.rationale !== artifact.protection.rationale
  ) {
    throw boundaryError();
  }
}

function projectReplayAttacks(experiment) {
  const projected = new ArrayConstructor();
  for (let index = 0; index < experiment.attacks.length; index += 1) {
    const attack = experiment.attacks[index];
    append(projected, makeRecord([
      ["id", attack.id],
      ["ruleId", attack.ruleId],
      ["type", attack.type],
      ["description", attack.description],
      ["rationale", attack.rationale],
      ["mutatedOutput", cloneWireValue(attack.output, new SetConstructor())],
      ["scores", makeRecord([
        ["realism", attack.realism],
        ["subtlety", attack.subtlety],
        ["novelty", attack.novelty],
        ["fixability", attack.fixability]
      ])]
    ]));
  }
  return projected;
}

function makeClassifyingEvaluator(callback, failureState) {
  let callIndex = 0;
  return function classifiedEvaluator(output) {
    const phase = callIndex === 0 ? "positive-control" : "attack-evaluation";
    callIndex += 1;
    let value;
    try {
      value = callback(output);
    } catch (error) {
      failureState.phase = phase;
      failureState.reason = "threw";
      throw error;
    }
    if (typeof value !== "boolean") {
      failureState.phase = phase;
      failureState.reason = "non-boolean";
      return value;
    }
    if (phase === "positive-control" && value === false) {
      failureState.phase = phase;
      failureState.reason = "returned-false";
    }
    return value;
  };
}

function normalizedReplay(result, experiment) {
  const outcomes = new ArrayConstructor();
  for (let index = 0; index < experiment.attacks.length; index += 1) {
    const replayed = result.attack.results[index];
    if (replayed === undefined || replayed.id !== experiment.attacks[index].id) {
      throw boundaryError();
    }
    append(outcomes, makeRecord([
      ["attackId", replayed.id],
      ["evaluatorResult", replayed.evaluatorResult],
      ["survived", replayed.survived]
    ]));
  }

  const survivorOrderIds = new ArrayConstructor();
  for (let index = 0; index < result.attack.survivors.length; index += 1) {
    append(survivorOrderIds, result.attack.survivors[index].id);
  }

  return makeRecord([
    ["outcomes", outcomes],
    ["survivorOrderIds", survivorOrderIds],
    ["topFindingId", survivorOrderIds.length > 0 ? survivorOrderIds[0] : null]
  ]);
}

async function replayPhase(authorityArtifact, callback) {
  const failure = { phase: null, reason: null };
  const experiment = authorityArtifact.experiment;
  const projectedAttacks = projectReplayAttacks(experiment);
  const evaluator = makeClassifyingEvaluator(callback, failure);

  try {
    const result = await runContractAttacksCore({
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
    return { replay: normalizedReplay(result, experiment), failure: null };
  } catch (error) {
    if (failure.phase !== null) {
      return { replay: null, failure };
    }
    throw error;
  }
}

function freshEmptyArray() {
  return new ArrayConstructor();
}

function cloneReplayPayload(payload) {
  if (payload === null) {
    return null;
  }
  const outcomes = new ArrayConstructor();
  for (let index = 0; index < payload.outcomes.length; index += 1) {
    const outcome = payload.outcomes[index];
    append(outcomes, makeRecord([
      ["attackId", outcome.attackId],
      ["evaluatorResult", outcome.evaluatorResult],
      ["survived", outcome.survived]
    ]));
  }
  const survivorOrderIds = new ArrayConstructor();
  for (let index = 0; index < payload.survivorOrderIds.length; index += 1) {
    append(survivorOrderIds, payload.survivorOrderIds[index]);
  }
  return makeRecord([
    ["outcomes", outcomes],
    ["survivorOrderIds", survivorOrderIds],
    ["topFindingId", payload.topFindingId]
  ]);
}

function makeFailureReasons(...reasons) {
  const result = new ArrayConstructor();
  for (let index = 0; index < reasons.length; index += 1) {
    if (reasons[index] !== null) {
      append(result, reasons[index]);
    }
  }
  return result;
}

function assertTreeGraph(root) {
  const seen = new SetConstructor();
  const stack = new ArrayConstructor();
  append(stack, root);
  for (let cursor = 0; cursor < stack.length; cursor += 1) {
    const value = stack[cursor];
    if (value === null || typeof value !== "object") {
      continue;
    }
    if (setHasValue(seen, value)) {
      throw boundaryError();
    }
    setAddValue(seen, value);
    if (arrayIsArray(value)) {
      if (!exactArray(value)) {
        throw boundaryError();
      }
      for (let index = 0; index < value.length; index += 1) {
        if (value[index] !== null && typeof value[index] === "object") {
          append(stack, value[index]);
        }
      }
    } else {
      if (
        isProxy(value) === true ||
        hasForbiddenBrand(value) ||
        getPrototypeOf(value) !== objectPrototype ||
        isExtensible(value) !== true
      ) {
        throw boundaryError();
      }
      const descriptors = getOwnPropertyDescriptors(value);
      const keys = ownKeys(descriptors);
      for (let index = 0; index < keys.length; index += 1) {
        const descriptor = descriptors[keys[index]];
        if (typeof keys[index] !== "string" || !ordinaryDescriptor(descriptor)) {
          throw boundaryError();
        }
        if (descriptor.value !== null && typeof descriptor.value === "object") {
          append(stack, descriptor.value);
        }
      }
    }
  }
}

function makeVerificationResult({
  state,
  verificationPassed,
  authorityArtifact,
  baselinePositiveControlPassed,
  improvedPositiveControlPassed,
  baseline,
  after,
  baselineMismatchAttackIds,
  eliminatedAttackIds,
  regressionAttackIds,
  sourceFindingCaught,
  improvement,
  failureReasons
}) {
  const result = makeRecord([
    ["version", 1],
    ["kind", "contract-protection-verification"],
    ["state", state],
    ["verificationPassed", verificationPassed],
    ["task", authorityArtifact.task],
    ["sourceAttackId", authorityArtifact.source.attackId],
    ["sourceRuleId", authorityArtifact.source.ruleId],
    ["protection", makeRecord([
      ["statement", authorityArtifact.protection.statement],
      ["rationale", authorityArtifact.protection.rationale]
    ])],
    ["baselinePositiveControlPassed", baselinePositiveControlPassed],
    ["improvedPositiveControlPassed", improvedPositiveControlPassed],
    ["baseline", cloneReplayPayload(baseline)],
    ["after", cloneReplayPayload(after)],
    ["baselineMismatchAttackIds", baselineMismatchAttackIds],
    ["eliminatedAttackIds", eliminatedAttackIds],
    ["regressionAttackIds", regressionAttackIds],
    ["sourceFindingCaught", sourceFindingCaught],
    ["improvement", improvement],
    ["failureReasons", failureReasons]
  ]);
  assertTreeGraph(result);
  return result;
}

function baselineMismatchIds(experiment, replay) {
  const ids = new ArrayConstructor();
  for (let index = 0; index < experiment.baseline.outcomes.length; index += 1) {
    const expected = experiment.baseline.outcomes[index];
    const actual = replay.outcomes[index];
    if (
      expected.evaluatorResult !== actual.evaluatorResult ||
      expected.survived !== actual.survived
    ) {
      append(ids, expected.attackId);
    }
  }
  return ids;
}

function sameStringArray(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

async function buildVerification(capture) {
  validateProtectionArtifact(capture.protection, "confirmed");
  probeProtectionArtifact(capture.protection, "confirmed");

  const authorityArtifact = cloneProtectionCanonical(capture.protection);
  validateProtectionArtifact(authorityArtifact, "confirmed");
  const experiment = authorityArtifact.experiment;

  const baselinePhase = await replayPhase(authorityArtifact, capture.evaluator);
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
    return makeVerificationResult({
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
    });
  }

  const baseline = baselinePhase.replay;
  const mismatchIds = baselineMismatchIds(experiment, baseline);
  const rankMatches = sameStringArray(
    experiment.baseline.survivorOrderIds,
    baseline.survivorOrderIds
  );
  const topMatches = experiment.baseline.topFindingId === baseline.topFindingId;

  if (mismatchIds.length > 0 || !rankMatches || !topMatches) {
    return makeVerificationResult({
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
    });
  }

  const improvedPhase = await replayPhase(authorityArtifact, capture.improvedEvaluator);
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
    return makeVerificationResult({
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
    });
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

  return makeVerificationResult({
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
  });
}

function scheduleVerification(capture, resolve, reject) {
  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());
  const then = PromiseConstructor.prototype.then;
  reflectApply(then, kickoff, [
    () => buildVerification(capture),
    () => { throw boundaryError(); }
  ]).then(
    (result) => settleArtifact(resolve, result),
    () => reject(boundaryError())
  );
}

function verifyContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureVerifyInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }
    scheduleVerification(capture, resolve, reject);
  });
}

'''
if anchor not in text:
    raise SystemExit('draft anchor not found')
text = text.replace(anchor, insert + anchor, 1)
text = text.replace('module.exports = {\n  draftContractProtection,\n  confirmContractProtection\n};', 'module.exports = {\n  draftContractProtection,\n  confirmContractProtection,\n  verifyContractProtection\n};', 1)
path.write_text(text)

index = Path('src/index.js')
text = index.read_text()
text = text.replace('  draftContractProtection,\n  confirmContractProtection\n} = require("./contract-remediation");', '  draftContractProtection,\n  confirmContractProtection,\n  verifyContractProtection\n} = require("./contract-remediation");', 1)
text = text.replace('  draftContractProtection,\n  confirmContractProtection\n};', '  draftContractProtection,\n  confirmContractProtection,\n  verifyContractProtection\n};', 1)
index.write_text(text)
