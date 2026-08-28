from pathlib import Path

path = Path('src/contract-remediation.js')
text = path.read_text()

insert_after = '''function captureDraftInvocation(options) {
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
  const expectedKeys = [
    "experiment",
    "sourceAttackId",
    "proposal"
  ];

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

  const seen = new SetConstructor();
  setAddValue(seen, options);

  return makeRecord([
    ["experiment", cloneCapturedValue(descriptors.experiment.value, seen)],
    ["sourceAttackId", descriptors.sourceAttackId.value],
    ["proposal", cloneCapturedValue(descriptors.proposal.value, seen)]
  ]);
}
'''

confirm_capture = '''
function captureConfirmInvocation(options) {
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
  const expectedKeys = ["draft", "decision"];

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

  const seen = new SetConstructor();
  setAddValue(seen, options);

  return makeRecord([
    ["draft", cloneCapturedValue(descriptors.draft.value, seen)],
    ["decision", cloneCapturedValue(descriptors.decision.value, seen)]
  ]);
}
'''

if insert_after not in text:
    raise SystemExit('captureDraftInvocation block not found')
text = text.replace(insert_after, insert_after + confirm_capture, 1)

marker = '''function sourceIsSurvivor(experiment, sourceAttackId) {'''
addition = '''function validateProtectionArtifact(artifact, expectedStatus) {
  if (
    !exactRecord(artifact, [
      "version", "kind", "status", "task",
      "experiment", "source", "rule", "protection"
    ]) ||
    artifact.version !== 1 ||
    artifact.kind !== "contract-protection" ||
    artifact.status !== expectedStatus ||
    artifact.task !== artifact.experiment.task ||
    !isNonEmptyString(artifact.task) ||
    !exactRecord(artifact.source, ["attackId", "ruleId"]) ||
    !isNonEmptyString(artifact.source.attackId) ||
    !isNonEmptyString(artifact.source.ruleId) ||
    !validateRule(artifact.rule) ||
    !exactRecord(artifact.protection, ["statement", "rationale"]) ||
    !isNonEmptyString(artifact.protection.statement) ||
    !isNonEmptyString(artifact.protection.rationale)
  ) {
    throw boundaryError();
  }

  const attacksById = validateExperiment(artifact.experiment);
  const selectedAttack = mapGetValue(attacksById, artifact.source.attackId);

  if (
    selectedAttack === undefined ||
    !sourceIsSurvivor(artifact.experiment, artifact.source.attackId) ||
    artifact.source.ruleId !== selectedAttack.ruleId ||
    artifact.rule.id !== artifact.source.ruleId ||
    artifact.rule.id !== selectedAttack.rule.id ||
    artifact.rule.statement !== selectedAttack.rule.statement ||
    artifact.rule.kind !== selectedAttack.rule.kind ||
    artifact.rule.severity !== selectedAttack.rule.severity
  ) {
    throw boundaryError();
  }
}

function validateDecision(decision) {
  if (!exactRecord(decision, ["type"])) {
    if (
      exactRecord(decision, ["type", "statement"]) &&
      decision.type === "edit" &&
      isNonEmptyString(decision.statement)
    ) {
      return;
    }
    throw boundaryError();
  }

  if (decision.type !== "accept" && decision.type !== "reject") {
    throw boundaryError();
  }
}

function buildConfirmation(capture) {
  assertPrototypeBaseline();
  validateDraftArtifact(capture.draft);
  validateDecision(capture.decision);

  const decision = capture.decision;
  const status = decision.type === "reject" ? "rejected" : "confirmed";
  const statement = decision.type === "edit"
    ? decision.statement
    : capture.draft.protection.statement;

  const artifact = makeRecord([
    ["version", 1],
    ["kind", "contract-protection"],
    ["status", status],
    ["task", capture.draft.task],
    ["experiment", cloneExperimentCanonical(capture.draft.experiment)],
    ["source", makeRecord([
      ["attackId", capture.draft.source.attackId],
      ["ruleId", capture.draft.source.ruleId]
    ])],
    ["rule", cloneRuleCanonical(capture.draft.rule)],
    ["protection", makeRecord([
      ["statement", statement],
      ["rationale", capture.draft.protection.rationale]
    ])]
  ]);

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

  return artifact;
}

'''

if marker not in text:
    raise SystemExit('sourceIsSurvivor marker not found')
text = text.replace(marker, addition + marker, 1)

old_end = '''function draftContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureDraftInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    try {
      settleArtifact(resolve, buildDraft(capture));
    } catch {
      reject(boundaryError());
    }
  });
}

module.exports = {
  draftContractProtection
};
'''

new_end = '''function draftContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureDraftInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    try {
      settleArtifact(resolve, buildDraft(capture));
    } catch {
      reject(boundaryError());
    }
  });
}

function confirmContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureConfirmInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    try {
      settleArtifact(resolve, buildConfirmation(capture));
    } catch {
      reject(boundaryError());
    }
  });
}

module.exports = {
  draftContractProtection,
  confirmContractProtection
};
'''

if old_end not in text:
    raise SystemExit('module tail not found')
path.write_text(text.replace(old_end, new_end, 1))

index_path = Path('src/index.js')
index = index_path.read_text()
index = index.replace(
    '''const {\n  draftContractProtection\n} = require("./contract-remediation");''',
    '''const {\n  draftContractProtection,\n  confirmContractProtection\n} = require("./contract-remediation");'''
)
index = index.replace(
    '''  runContractAttacks,\n  draftContractProtection\n};''',
    '''  runContractAttacks,\n  draftContractProtection,\n  confirmContractProtection\n};'''
)
index_path.write_text(index)
