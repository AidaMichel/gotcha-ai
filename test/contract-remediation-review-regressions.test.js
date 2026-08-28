"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const {
  runContractAttacks,
  draftContractProtection
} = require("../src");

function makeContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [
      {
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "major"
      }
    ]
  };
}

function makeProposal(sourceAttackId = "attack-a") {
  return {
    version: 1,
    task: "Return the approved time.",
    sourceAttackId,
    ruleId: "time-rule",
    protection: {
      statement: "Reject any unapproved time.",
      rationale: "The retained attack changed the approved time."
    }
  };
}

async function makeExperiment({
  two = false,
  mixed = false,
  input = { request: "Schedule it." }
} = {}) {
  const contract = makeContract();
  const attacks = [
    {
      id: "attack-a",
      ruleId: "time-rule",
      type: "wrong-time",
      description: "Changes the approved time.",
      rationale: "Violates the rule.",
      mutatedOutput: { time: "4 PM" },
      scores: {
        realism: 0.9,
        subtlety: 0.9,
        novelty: 0.9,
        fixability: 0.9
      }
    }
  ];

  if (two) {
    attacks.push({
      id: "attack-b",
      ruleId: "time-rule",
      type: "other-time",
      description: "Changes the approved time again.",
      rationale: "Violates the rule differently.",
      mutatedOutput: { time: "5 PM" },
      scores: {
        realism: 0.1,
        subtlety: 0.1,
        novelty: 0.1,
        fixability: 0.1
      }
    });
  }

  const result = await runContractAttacks({
    contract,
    input,
    expectedOutput: { time: "3 PM" },
    evaluator(output) {
      if (mixed && output.time === "5 PM") {
        return false;
      }
      return true;
    },
    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks
      };
    }
  });

  assert.equal(result.experiment.replayable, true);
  return result.experiment;
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runChild(source) {
  const result = spawnSync(
    process.execPath,
    ["-e", source],
    {
      cwd: process.cwd(),
      encoding: "utf8"
    }
  );

  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout
  );
}

test("captured Proxy authority prevents synchronous traps after util.types tampering", () => {
  runChild(`
    const core = require('./src/contract-attacks-core');
    const util = require('node:util');
    const original = util.types.isProxy;
    util.types.isProxy = () => false;
    const { draftContractProtection } = require('./src/contract-remediation');
    util.types.isProxy = original;
    let traps = 0;
    const options = new Proxy({}, {
      getPrototypeOf() { traps += 1; return Object.prototype; },
      ownKeys() { traps += 1; return []; },
      getOwnPropertyDescriptor() { traps += 1; return undefined; }
    });
    const promise = draftContractProtection(options);
    if (!(promise instanceof Promise)) process.exit(2);
    if (traps !== 0) process.exit(3);
    promise.then(() => process.exit(4), () => {
      if (traps !== 0) process.exit(5);
    });
  `);
});

test("core-owned Promise authority survives preloaded-core global Promise replacement", () => {
  runChild(`
    require('./src/contract-attacks-core');
    const OriginalPromise = Promise;
    globalThis.Promise = function FakePromise() { throw new Error('fake'); };
    const { draftContractProtection } = require('./src/contract-remediation');
    globalThis.Promise = OriginalPromise;
    let promise;
    try { promise = draftContractProtection(null); } catch { process.exit(2); }
    if (Object.getPrototypeOf(promise) !== OriginalPromise.prototype) process.exit(3);
    promise.then(() => process.exit(4), () => {});
  `);
});

test("core-owned JSON authority survives preloaded-core JSON replacement", () => {
  runChild(`
    require('./src/contract-attacks-core');
    const stringify = JSON.stringify;
    const parse = JSON.parse;
    JSON.stringify = () => { throw new Error('poisoned stringify'); };
    JSON.parse = () => { throw new Error('poisoned parse'); };
    const remediation = require('./src/contract-remediation');
    JSON.stringify = stringify;
    JSON.parse = parse;
    const { runContractAttacks } = require('./src/contract-attacks');
    const contract = {version:1,status:'confirmed',task:'T',rules:[{id:'r',statement:'S',kind:'required',severity:'major'}]};
    runContractAttacks({
      contract,input:{x:1},expectedOutput:{x:1},evaluator:()=>true,
      generator:()=>({version:1,task:'T',attacks:[{id:'a',ruleId:'r',type:'t',description:'d',rationale:'q',mutatedOutput:{x:2},scores:{realism:.8,subtlety:.7,novelty:.6,fixability:.5}}]})
    }).then(result => remediation.draftContractProtection({
      experiment: result.experiment,
      sourceAttackId:'a',
      proposal:{version:1,task:'T',sourceAttackId:'a',ruleId:'r',protection:{statement:'P',rationale:'R'}}
    })).then(draft => {
      if (draft.status !== 'draft') process.exit(2);
    }, () => process.exit(3));
  `);
});

test("survivor binding ignores poisoned Array.prototype.includes", async () => {
  const experiment = await makeExperiment({ two: true, mixed: true });
  const original = Array.prototype.includes;
  Array.prototype.includes = () => true;
  try {
    await assert.rejects(
      draftContractProtection({
        experiment,
        sourceAttackId: "attack-b",
        proposal: makeProposal("attack-b")
      }),
      TypeError
    );
  } finally {
    Array.prototype.includes = original;
  }
});

test("captured Set operations preserve whole-options alias rejection", async () => {
  const shared = {
    statement: "Reject any unapproved time.",
    rationale: "The retained attack changed the approved time."
  };
  const experiment = await makeExperiment({ input: shared });
  const proposal = makeProposal();
  proposal.protection = experiment.case.input;
  const original = Set.prototype.has;
  Set.prototype.has = () => false;
  try {
    await assert.rejects(
      draftContractProtection({ experiment, sourceAttackId: "attack-a", proposal }),
      TypeError
    );
  } finally {
    Set.prototype.has = original;
  }
});

test("array capture does not invoke inherited numeric setters", () => {
  runChild(`
    const { runContractAttacks, draftContractProtection } = require('./src');
    const contract={version:1,status:'confirmed',task:'T',rules:[{id:'r',statement:'S',kind:'required',severity:'major'}]};
    runContractAttacks({contract,input:{x:1},expectedOutput:{x:1},evaluator:()=>true,generator:()=>({version:1,task:'T',attacks:[{id:'a',ruleId:'r',type:'t',description:'d',rationale:'q',mutatedOutput:{x:2},scores:{realism:.8,subtlety:.7,novelty:.6,fixability:.5}}]})}).then(result => {
      let calls=0;
      Object.defineProperty(Array.prototype,'0',{configurable:true,set(){calls+=1;}});
      const p=draftContractProtection({experiment:result.experiment,sourceAttackId:'a',proposal:{version:1,task:'T',sourceAttackId:'a',ruleId:'r',protection:{statement:'P',rationale:'R'}}});
      delete Array.prototype['0'];
      p.then(draft=>{ if(calls!==0 || draft.status!=='draft') process.exit(2); },()=>process.exit(3));
    });
  `);
});

test("inherited then cannot hijack draft Promise resolution", () => {
  runChild(`
    const { runContractAttacks, draftContractProtection } = require('./src');
    const contract={version:1,status:'confirmed',task:'T',rules:[{id:'r',statement:'S',kind:'required',severity:'major'}]};
    runContractAttacks({contract,input:{x:1},expectedOutput:{x:1},evaluator:()=>true,generator:()=>({version:1,task:'T',attacks:[{id:'a',ruleId:'r',type:'t',description:'d',rationale:'q',mutatedOutput:{x:2},scores:{realism:.8,subtlety:.7,novelty:.6,fixability:.5}}]})}).then(result => {
      Object.defineProperty(Object.prototype,'then',{configurable:true,value(resolve){resolve('hijacked');}});
      const p=draftContractProtection({experiment:result.experiment,sourceAttackId:'a',proposal:{version:1,task:'T',sourceAttackId:'a',ruleId:'r',protection:{statement:'P',rationale:'R'}}});
      p.then(value=>{
        delete Object.prototype.then;
        if (!value || value.status!=='draft') process.exit(2);
      },()=>{ delete Object.prototype.then; process.exit(3); });
    });
  `);
});

test("duplicate survivor IDs reject", async () => {
  const experiment = jsonClone(await makeExperiment({ two: true }));
  experiment.baseline.survivorOrderIds = ["attack-a", "attack-a"];
  experiment.baseline.topFindingId = "attack-a";
  await assert.rejects(
    draftContractProtection({ experiment, sourceAttackId: "attack-a", proposal: makeProposal() }),
    TypeError
  );
});

test("FAIL outcomes require survived to be exactly false", async () => {
  const experiment = jsonClone(await makeExperiment({ two: true, mixed: true }));
  experiment.baseline.outcomes[1].survived = "no";
  await assert.rejects(
    draftContractProtection({ experiment, sourceAttackId: "attack-a", proposal: makeProposal() }),
    TypeError
  );
});

test("more than 20 attacks reject before drafting", async () => {
  const experiment = jsonClone(await makeExperiment());
  const template = experiment.attacks[0];
  experiment.attacks = [];
  experiment.baseline.outcomes = [];
  experiment.baseline.survivorOrderIds = [];
  for (let index = 0; index < 21; index += 1) {
    const attack = jsonClone(template);
    attack.id = `attack-${index}`;
    attack.output = { time: `${index + 4} PM` };
    experiment.attacks.push(attack);
    experiment.baseline.outcomes.push({attackId:attack.id,evaluatorResult:"PASS",survived:true});
    experiment.baseline.survivorOrderIds.push(attack.id);
  }
  experiment.baseline.topFindingId = experiment.baseline.survivorOrderIds[0];
  await assert.rejects(
    draftContractProtection({ experiment, sourceAttackId: "attack-0", proposal: {...makeProposal("attack-0"), sourceAttackId:"attack-0"} }),
    TypeError
  );
});

test("returned draft canonicalizes embedded schema-record key order", async () => {
  const original = jsonClone(await makeExperiment());
  const reordered = {
    task: original.task,
    replayable: original.replayable,
    version: original.version,
    baseline: original.baseline,
    attacks: original.attacks,
    case: original.case,
    contract: original.contract,
    kind: original.kind
  };
  const draft = await draftContractProtection({
    experiment: reordered,
    sourceAttackId: "attack-a",
    proposal: makeProposal()
  });
  assert.deepEqual(Object.keys(draft.experiment), [
    "version", "kind", "replayable", "task", "contract", "case", "attacks", "baseline"
  ]);
});

test("unchanged and same-rule duplicate retained attacks reject", async () => {
  const unchanged = jsonClone(await makeExperiment());
  unchanged.attacks[0].output = jsonClone(unchanged.case.expectedOutput);
  await assert.rejects(
    draftContractProtection({ experiment: unchanged, sourceAttackId: "attack-a", proposal: makeProposal() }),
    TypeError
  );

  const duplicate = jsonClone(await makeExperiment({ two: true }));
  duplicate.attacks[1].output = jsonClone(duplicate.attacks[0].output);
  await assert.rejects(
    draftContractProtection({ experiment: duplicate, sourceAttackId: "attack-a", proposal: makeProposal() }),
    TypeError
  );
});

test("forbidden branded top-level option records reject after prototype rewriting", async () => {
  const experiment = await makeExperiment();
  const options = new Date();
  Object.setPrototypeOf(options, Object.prototype);
  options.experiment = experiment;
  options.sourceAttackId = "attack-a";
  options.proposal = makeProposal();
  await assert.rejects(draftContractProtection(options), TypeError);
});

test("survivor rank order must match deterministic M8 ranking", async () => {
  const experiment = jsonClone(await makeExperiment({ two: true }));
  experiment.baseline.survivorOrderIds = ["attack-b", "attack-a"];
  experiment.baseline.topFindingId = "attack-b";
  await assert.rejects(
    draftContractProtection({ experiment, sourceAttackId: "attack-a", proposal: makeProposal() }),
    TypeError
  );
});
