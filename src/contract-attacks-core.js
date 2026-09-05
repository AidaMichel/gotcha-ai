"use strict";

// Capture Gotcha's frozen runtime authority before this legacy M8 core loads
// VM or other builtin helpers. Preloading the core must not make authority
// bootstrap observe VM as already loaded and fail closed before the package
// root has a chance to bind all consumers to the same generation.
const runtimeAuthority = require("./runtime-authority");
const promiseCaptureGetOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;
const promiseCaptureGetPrototypeOf =
  Object.getPrototypeOf;

const intrinsicPromiseProbe =
  (async function gotchaIntrinsicPromiseProbe() {})();
const intrinsicPromisePrototype =
  promiseCaptureGetPrototypeOf(intrinsicPromiseProbe);
const promiseAuthorityAvailable =
  runtimeAuthority.promiseAuthorityAvailable === true;
const intrinsicPromiseConstructor =
  promiseAuthorityAvailable
    ? runtimeAuthority.promiseConstructor
    : null;
const intrinsicPromiseThen =
  promiseAuthorityAvailable
    ? runtimeAuthority.promiseThen
    : null;
const capturedAmbientPromiseConstructor =
  intrinsicPromiseConstructor;
const capturedAmbientPromisePrototype =
  promiseAuthorityAvailable
    ? runtimeAuthority.promisePrototype
    : intrinsicPromisePrototype;
const capturedAmbientPromiseThen =
  intrinsicPromiseThen;

// The M8 core owns the experiment authority. It is created from the same
// authenticated runtime generation used by the package root and retained on
// the cached core export. No separately mutable builtin authority is invoked
// when this legacy core is loaded lazily.
const experimentFreeze =
  runtimeAuthority.objectFreeze;

const experimentPromiseBrandProbe =
  runtimeAuthority.isPromise;
const experimentForbiddenProbes =
  runtimeAuthority.forbiddenProbes;

const experimentIntrinsics =
  experimentFreeze({
    isProxy: runtimeAuthority.isProxy,
    forbiddenProbes: experimentForbiddenProbes,
    stringConstructor:
      String,
    defineProperty:
      Object.defineProperty,
    jsonStringify:
      JSON.stringify,
    jsonParse:
      JSON.parse,
    ArrayConstructor:
      Array,
    ArrayPrototype:
      Array.prototype,
    ObjectPrototype:
      Object.prototype,
    ObjectPrototypeParent:
      Object.getPrototypeOf(Object.prototype),
    FunctionPrototype:
      runtimeAuthority.localFunctionPrototype,
    PromiseConstructor:
      capturedAmbientPromiseConstructor,
    PromisePrototype:
      capturedAmbientPromisePrototype,
    TypeErrorConstructor:
      TypeError,
    getOwnPropertyDescriptors:
      Object.getOwnPropertyDescriptors,
    getOwnPropertyDescriptor:
      Object.getOwnPropertyDescriptor,
    getPrototypeOf:
      Object.getPrototypeOf,
    isExtensible:
      Object.isExtensible,
    objectIs:
      Object.is,
    ownKeys:
      Reflect.ownKeys,
    reflectApply:
      Reflect.apply,
    deleteProperty:
      Reflect.deleteProperty,
    arrayIsArray:
      runtimeAuthority.arrayIsArray,
    stringTrim:
      String.prototype.trim,
    numberIsFinite:
      Number.isFinite,
    numberIsInteger:
      Number.isInteger,
    SetConstructor:
      Set,
    setHas:
      Set.prototype.has,
    setAdd:
      Set.prototype.add,
    MapConstructor:
      Map,
    mapGet:
      Map.prototype.get,
    mapSet:
      Map.prototype.set,
    PromiseThen:
      capturedAmbientPromiseThen,
    PromiseSpecies:
      runtimeAuthority.promiseSpecies
  });

const utilIsPromise =
  experimentPromiseBrandProbe;

const utilIsProxy =
  runtimeAuthority.isProxy;

const m8DependencyAuthorityAvailable = (
  promiseAuthorityAvailable === true &&
  runtimeAuthority.consumerPrimordialsAvailable === true &&
  typeof runtimeAuthority.arrayIsArray === "function" &&
  typeof runtimeAuthority.isProxy === "function" &&
  typeof runtimeAuthority.isPromise === "function"
);

let attack = null;
let cloneAiData = null;
let snapshotAiData = null;
let m8DependenciesLoadAttempted = false;

function loadM8ExecutionDependencies() {
  if (m8DependenciesLoadAttempted) return;
  m8DependenciesLoadAttempted = true;

  if (!m8DependencyAuthorityAvailable) return;

  try {
    ({ attack } = require("./engine"));
    ({ cloneAiData, snapshotAiData } = require("./ai-data"));
  } catch {
    attack = null;
    cloneAiData = null;
    snapshotAiData = null;
  }
}

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;

const getPrototypeOf =
  Object.getPrototypeOf;

const objectCreate =
  Object.create;

const objectIs =
  Object.is;

const objectPrototype =
  Object.prototype;

const ObjectConstructor =
  Object;

const NumberConstructor =
  Number;

const arrayPrototype =
  Array.prototype;

const arrayPrototypeDescriptors =
  getOwnPropertyDescriptors(
    arrayPrototype
  );

const arrayIsArray =
  runtimeAuthority.arrayIsArray;

const ArrayConstructor =
  Array;

const arrayHasInstanceSymbol =
  Symbol.hasInstance;

const functionPrototype =
  Function.prototype;

const functionHasInstance =
  Function.prototype[
    Symbol.hasInstance
  ];

const arrayHasInstanceDescriptor =
  getOwnPropertyDescriptor(
    ArrayConstructor,
    arrayHasInstanceSymbol
  );

const objectKeys =
  Object.keys;

const functionToString =
  Function.prototype.toString;

const SetConstructor =
  Set;

const MapConstructor =
  Map;

const WeakSetConstructor =
  WeakSet;

const WeakMapConstructor =
  WeakMap;

const defineProperty =
  Object.defineProperty;

const setPrototypeOf =
  Object.setPrototypeOf;

const isExtensible =
  Object.isExtensible;

const ownKeys =
  Reflect.ownKeys;

const deleteProperty =
  Reflect.deleteProperty;

const reflectApply =
  Reflect.apply;

const reflectConstruct =
  Reflect.construct;

const objectConstructorSource =
  reflectApply(
    functionToString,
    ObjectConstructor,
    []
  );

const arrayConstructorSource =
  reflectApply(
    functionToString,
    ArrayConstructor,
    []
  );

const objectFreeze =
  Object.freeze;

const arrayMap =
  Array.prototype.map;

const arrayFind =
  Array.prototype.find;

const arrayPush =
  Array.prototype.push;

const arrayPop =
  Array.prototype.pop;

const stringPrototype =
  String.prototype;

const stringTrim =
  String.prototype.trim;

const numberIsFinite =
  Number.isFinite;

const mapPrototype =
  MapConstructor.prototype;

const mapGet =
  MapConstructor.prototype.get;

const setPrototype =
  SetConstructor.prototype;

const setHas =
  SetConstructor.prototype.has;

const setAdd =
  SetConstructor.prototype.add;

const weakSetPrototype =
  WeakSetConstructor.prototype;

const weakMapPrototype =
  WeakMapConstructor.prototype;

const weakMapGet =
  WeakMapConstructor.prototype.get;

const weakMapSet =
  WeakMapConstructor.prototype.set;

const weakSetHas =
  WeakSetConstructor.prototype.has;

const weakSetAdd =
  WeakSetConstructor.prototype.add;

const arrayValues =
  arrayPrototype.values;

const arrayKeys =
  arrayPrototype.keys;

const arrayEntries =
  arrayPrototype.entries;

const arrayIterator =
  arrayPrototype[Symbol.iterator];

const stringIterator =
  stringPrototype[Symbol.iterator];

const arrayIteratorPrototype =
  getPrototypeOf(
    reflectApply(
      arrayIterator,
      [],
      []
    )
  );

const arrayIteratorNext =
  arrayIteratorPrototype.next;

const stringIteratorPrototype =
  getPrototypeOf(
    reflectApply(
      stringIterator,
      "",
      []
    )
  );

const sharedIteratorPrototype =
  getPrototypeOf(
    arrayIteratorPrototype
  );

const promisePrototype =
  intrinsicPromisePrototype;

const promiseConstructor =
  intrinsicPromiseConstructor;

const promiseThen =
  intrinsicPromiseThen;

const promiseThenDescriptor =
  getOwnPropertyDescriptor(
    promisePrototype,
    "then"
  );

const promiseSpecies =
  runtimeAuthority.promiseSpecies;

const promisePrototypeConstructorDescriptor =
  getOwnPropertyDescriptor(
    promisePrototype,
    "constructor"
  );

const promiseSpeciesDescriptor =
  promiseConstructor !== null
    ? getOwnPropertyDescriptor(
        promiseConstructor,
        promiseSpecies
      )
    : undefined;

const promiseConstructorSource =
  promiseConstructor !== null
    ? reflectApply(
        functionToString,
        promiseConstructor,
        []
      )
    : null;

const promiseSpeciesGetterSource =
  promiseSpeciesDescriptor !== undefined &&
  typeof promiseSpeciesDescriptor.get ===
    "function"
    ? reflectApply(
        functionToString,
        promiseSpeciesDescriptor.get,
        []
      )
    : null;

const safePromiseSpeciesContainer = {};

defineProperty(
  safePromiseSpeciesContainer,
  promiseSpecies,
  {
    value:
      promiseConstructor,
    writable: false,
    enumerable: false,
    configurable: false
  }
);

objectFreeze(
  safePromiseSpeciesContainer
);

const hasOwnProperty =
  Object.prototype.hasOwnProperty;

function detachedIteratorSelf() {
  return this;
}

function createDetachedArrayIterator(
  method,
  receiver
) {
  const iterator =
    reflectApply(
      method,
      receiver,
      []
    );

  const prototype =
    objectCreate(null);

  defineProperty(
    prototype,
    "next",
    {
      value:
        arrayIteratorNext,
      writable: true,
      enumerable: false,
      configurable: true
    }
  );

  defineProperty(
    prototype,
    Symbol.iterator,
    {
      value:
        detachedIteratorSelf,
      writable: true,
      enumerable: false,
      configurable: true
    }
  );

  setPrototypeOf(
    iterator,
    prototype
  );

  return iterator;
}

function safeArrayValues() {
  return createDetachedArrayIterator(
    arrayValues,
    this
  );
}

function safeArrayKeys() {
  return createDetachedArrayIterator(
    arrayKeys,
    this
  );
}

function safeArrayEntries() {
  return createDetachedArrayIterator(
    arrayEntries,
    this
  );
}

let activeEvaluatorInstanceState = null;

function withActiveEvaluatorInstanceState(
  instanceState,
  callback
) {
  const previous =
    activeEvaluatorInstanceState;

  activeEvaluatorInstanceState =
    instanceState;

  try {
    return callback();
  } finally {
    activeEvaluatorInstanceState =
      previous;
  }
}

function registerDerivedArrayResult(
  resultPrototype,
  result
) {
  if (!arrayIsArray(result)) {
    return result;
  }

  const instanceState =
    activeEvaluatorInstanceState;

  if (instanceState === null) {
    return result;
  }

  setPrototypeOf(
    result,
    resultPrototype
  );

  reflectApply(
    weakSetAdd,
    instanceState.snapshotNodes,
    [result]
  );

  if (
    reflectApply(
      weakSetHas,
      instanceState.localArrayPrototypes,
      [resultPrototype]
    )
  ) {
    reflectApply(
      weakSetAdd,
      instanceState.localArrayInstances,
      [result]
    );
    reflectApply(
      weakSetAdd,
      instanceState.localObjectInstances,
      [result]
    );
  }

  return result;
}

function buildSafeArrayResultMethod(
  method,
  resultPrototype
) {
  return function safeArrayResultMethod(
    ...args
  ) {
    const result =
      reflectApply(
        method,
        this,
        args
      );

    return registerDerivedArrayResult(
      resultPrototype,
      result
    );
  };
}

function arrayMethodReturnsArray(key) {
  return (
    key === "concat" ||
    key === "filter" ||
    key === "flat" ||
    key === "flatMap" ||
    key === "map" ||
    key === "slice" ||
    key === "splice" ||
    key === "toReversed" ||
    key === "toSorted" ||
    key === "toSpliced" ||
    key === "with"
  );
}

function safeArrayPrototypeMethod(
  key,
  fallback,
  resultPrototype
) {
  if (
    key === "values" ||
    key === Symbol.iterator
  ) {
    return safeArrayValues;
  }

  if (key === "keys") {
    return safeArrayKeys;
  }

  if (key === "entries") {
    return safeArrayEntries;
  }

  if (arrayMethodReturnsArray(key)) {
    return buildSafeArrayResultMethod(
      fallback,
      resultPrototype
    );
  }

  return fallback;
}

function buildSafeCallbackPrototype(
  sourcePrototype,
  parentPrototype
) {
  const target =
    objectCreate(parentPrototype);

  const descriptors =
    sourcePrototype === arrayPrototype
      ? arrayPrototypeDescriptors
      : getOwnPropertyDescriptors(
          sourcePrototype
        );

  for (
    const key of ownKeys(descriptors)
  ) {
    if (
      key === "constructor" ||
      key === "__proto__" ||
      key === Symbol.unscopables
    ) {
      continue;
    }

    const descriptor =
      descriptors[key];

    if (
      !("value" in descriptor) ||
      typeof descriptor.value !==
        "function"
    ) {
      continue;
    }

    const method =
      sourcePrototype === arrayPrototype
        ? safeArrayPrototypeMethod(
            key,
            descriptor.value,
            target
          )
        : descriptor.value;

    defineProperty(
      target,
      key,
      {
        value:
          method,
        writable: false,
        enumerable:
          descriptor.enumerable,
        configurable: false
      }
    );
  }

  return objectFreeze(target);
}

const safeCallbackObjectPrototype =
  buildSafeCallbackPrototype(
    objectPrototype,
    null
  );

const safeCallbackArrayPrototype =
  buildSafeCallbackPrototype(
    arrayPrototype,
    safeCallbackObjectPrototype
  );

function createSafeArrayHasInstance(
  instanceState
) {
  return function safeArrayHasInstance(
    value
  ) {
    if (
      value !== null &&
      (typeof value === "object" ||
        typeof value === "function") &&
      reflectApply(
        weakSetHas,
        instanceState.snapshotNodes,
        [value]
      )
    ) {
      return reflectApply(
        weakSetHas,
        instanceState.localArrayInstances,
        [value]
      );
    }

    return reflectApply(
      functionHasInstance,
      ArrayConstructor,
      [value]
    );
  };
}

function createSafeObjectHasInstance(
  instanceState
) {
  return function safeObjectHasInstance(
    value
  ) {
    if (
      value !== null &&
      (typeof value === "object" ||
        typeof value === "function") &&
      reflectApply(
        weakSetHas,
        instanceState.snapshotNodes,
        [value]
      )
    ) {
      return reflectApply(
        weakSetHas,
        instanceState.localObjectInstances,
        [value]
      );
    }

    return reflectApply(
      functionHasInstance,
      ObjectConstructor,
      [value]
    );
  };
}

function restoreOwnDescriptor(
  holder,
  key,
  descriptor
) {
  if (descriptor === undefined) {
    deleteProperty(holder, key);
    return;
  }

  defineProperty(
    holder,
    key,
    descriptor
  );
}

function captureNativeRealmConstructor(
  prototype,
  expectedSource
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilIsProxy(prototype)
  ) {
    return null;
  }

  const descriptor =
    getOwnPropertyDescriptor(
      prototype,
      "constructor"
    );

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    typeof descriptor.value !==
      "function" ||
    utilIsProxy(descriptor.value)
  ) {
    return null;
  }

  const constructor =
    descriptor.value;

  try {
    const source =
      reflectApply(
        functionToString,
        constructor,
        []
      );

    const prototypeDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );

    if (
      source !== expectedSource ||
      prototypeDescriptor === undefined ||
      "get" in prototypeDescriptor ||
      "set" in prototypeDescriptor ||
      prototypeDescriptor.value !==
        prototype
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return constructor;
}

function addEvaluatorInstanceSemantic(
  semantics,
  constructor,
  hasInstance
) {
  if (constructor === null) {
    return;
  }

  for (
    let index = 0;
    index < semantics.length;
    index += 1
  ) {
    if (
      semantics[index].constructor ===
        constructor
    ) {
      return;
    }
  }

  reflectApply(
    arrayPush,
    semantics,
    [{ constructor, hasInstance }]
  );
}

function captureEvaluatorInstanceSemantics(
  instanceState
) {
  const semantics = [];

  addEvaluatorInstanceSemantic(
    semantics,
    ArrayConstructor,
    createSafeArrayHasInstance(
      instanceState
    )
  );

  addEvaluatorInstanceSemantic(
    semantics,
    ObjectConstructor,
    createSafeObjectHasInstance(
      instanceState
    )
  );

  return semantics;
}

function canInstallEvaluatorInstanceSemantic(
  constructor,
  previousDescriptor
) {
  if (previousDescriptor === undefined) {
    return isExtensible(constructor);
  }

  return previousDescriptor.configurable === true;
}

function probeIntrinsicCallable(
  callable,
  receiver,
  args
) {
  try {
    const value =
      reflectApply(
        callable,
        receiver,
        args
      );

    if (value === null) {
      return {
        threw: false,
        kind: "null",
        value: null
      };
    }

    const type = typeof value;

    if (type === "object") {
      return {
        threw: false,
        kind:
          arrayIsArray(value)
            ? "array"
            : "object"
      };
    }

    if (type === "function") {
      return {
        threw: false,
        kind: "function"
      };
    }

    return {
      threw: false,
      kind: type,
      value
    };
  } catch {
    return {
      threw: true,
      kind: "throw"
    };
  }
}

function sameIntrinsicProbeOutcome(
  left,
  right
) {
  if (
    left.threw !== right.threw ||
    left.kind !== right.kind
  ) {
    return false;
  }

  if (left.threw) {
    return true;
  }

  if (
    left.kind === "object" ||
    left.kind === "array" ||
    left.kind === "function" ||
    left.kind === "null"
  ) {
    return true;
  }

  return objectIs(
    left.value,
    right.value
  );
}

function sameIntrinsicCallableProbe(
  left,
  right,
  receiverFactory,
  args
) {
  const leftOutcome =
    probeIntrinsicCallable(
      left,
      receiverFactory(),
      args
    );
  const rightOutcome =
    probeIntrinsicCallable(
      right,
      receiverFactory(),
      args
    );

  return sameIntrinsicProbeOutcome(
    leftOutcome,
    rightOutcome
  );
}

function sameIntrinsicCallable(
  left,
  right
) {
  if (
    typeof left !== "function" ||
    typeof right !== "function" ||
    utilIsProxy(left) ||
    utilIsProxy(right)
  ) {
    return false;
  }

  let sameSource = false;

  try {
    sameSource =
      reflectApply(
        functionToString,
        left,
        []
      ) === reflectApply(
        functionToString,
        right,
        []
      );
  } catch {
    return false;
  }

  if (!sameSource) {
    return false;
  }

  const receiverFactories = [
    () => objectCreate(null),
    () => objectCreate(objectPrototype),
    () => reflectConstruct(
      ArrayConstructor,
      []
    ),
    () => function intrinsicProbeFunction() {}
  ];

  const intrinsicProbeCallback =
    function intrinsicProbeCallback() {
      return undefined;
    };

  const argumentSets = [
    [],
    [undefined],
    [intrinsicProbeCallback],
    [intrinsicProbeCallback, 0]
  ];

  for (
    let receiverIndex = 0;
    receiverIndex < receiverFactories.length;
    receiverIndex += 1
  ) {
    for (
      let argsIndex = 0;
      argsIndex < argumentSets.length;
      argsIndex += 1
    ) {
      if (
        !sameIntrinsicCallableProbe(
          left,
          right,
          receiverFactories[receiverIndex],
          argumentSets[argsIndex]
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function sameIntrinsicObjectValue(
  left,
  right,
  depth
) {
  if (left === right) {
    return true;
  }

  if (
    depth > 2 ||
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    utilIsProxy(left) ||
    utilIsProxy(right)
  ) {
    return false;
  }

  let leftDescriptors;
  let rightDescriptors;
  let leftPrototype;
  let rightPrototype;

  try {
    leftPrototype =
      getPrototypeOf(left);
    rightPrototype =
      getPrototypeOf(right);
    leftDescriptors =
      getOwnPropertyDescriptors(left);
    rightDescriptors =
      getOwnPropertyDescriptors(right);
  } catch {
    return false;
  }

  if (
    (leftPrototype === null) !==
      (rightPrototype === null)
  ) {
    return false;
  }

  const leftKeys = ownKeys(leftDescriptors);
  const rightKeys = ownKeys(rightDescriptors);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (
    let index = 0;
    index < leftKeys.length;
    index += 1
  ) {
    const key = leftKeys[index];

    if (!hasOwn(rightDescriptors, key)) {
      return false;
    }

    if (
      !sameIntrinsicDescriptorShape(
        leftDescriptors[key],
        rightDescriptors[key],
        depth + 1
      )
    ) {
      return false;
    }
  }

  return true;
}

function sameIntrinsicDescriptorShape(
  left,
  right,
  depth = 0
) {
  if (
    left === undefined ||
    right === undefined ||
    left.enumerable !== right.enumerable ||
    left.configurable !== right.configurable ||
    ("writable" in left) !==
      ("writable" in right)
  ) {
    return false;
  }

  if ("writable" in left) {
    if (left.writable !== right.writable) {
      return false;
    }

    const leftValue = left.value;
    const rightValue = right.value;

    if (
      typeof leftValue === "function" ||
      typeof rightValue === "function"
    ) {
      return sameIntrinsicCallable(
        leftValue,
        rightValue
      );
    }

    if (
      leftValue !== null &&
      rightValue !== null &&
      typeof leftValue === "object" &&
      typeof rightValue === "object"
    ) {
      return sameIntrinsicObjectValue(
        leftValue,
        rightValue,
        depth
      );
    }

    return objectIs(
      leftValue,
      rightValue
    );
  }

  const leftGet = left.get;
  const rightGet = right.get;
  const leftSet = left.set;
  const rightSet = right.set;

  if (
    (leftGet === undefined) !==
      (rightGet === undefined) ||
    (leftSet === undefined) !==
      (rightSet === undefined)
  ) {
    return false;
  }

  if (
    leftGet !== undefined &&
    !sameIntrinsicCallable(
      leftGet,
      rightGet
    )
  ) {
    return false;
  }

  if (
    leftSet !== undefined &&
    !sameIntrinsicCallable(
      leftSet,
      rightSet
    )
  ) {
    return false;
  }

  return true;
}

function isPristineIntrinsicPrototype(
  candidate,
  reference
) {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    utilIsProxy(candidate)
  ) {
    return false;
  }

  let candidateDescriptors;
  let referenceDescriptors;

  try {
    candidateDescriptors =
      getOwnPropertyDescriptors(
        candidate
      );
    referenceDescriptors =
      getOwnPropertyDescriptors(
        reference
      );
  } catch {
    return false;
  }

  const candidateKeys =
    ownKeys(candidateDescriptors);
  const referenceKeys =
    ownKeys(referenceDescriptors);

  if (
    candidateKeys.length !==
      referenceKeys.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index < referenceKeys.length;
    index += 1
  ) {
    const key = referenceKeys[index];

    if (
      !hasOwn(candidateDescriptors, key) ||
      !sameIntrinsicDescriptorShape(
        candidateDescriptors[key],
        referenceDescriptors[key]
      )
    ) {
      return false;
    }
  }

  return true;
}

function addForeignPrototypeSurface(
  fallback,
  prototype,
  reference
) {
  if (
    !isPristineIntrinsicPrototype(
      prototype,
      reference
    )
  ) {
    throw new Error(
      "Hardened cross-realm evaluator prototypes must retain native intrinsic surfaces."
    );
  }

  for (
    let index = 0;
    index < fallback.foreignSurfaces.length;
    index += 1
  ) {
    if (
      fallback.foreignSurfaces[index].holder ===
        prototype
    ) {
      return;
    }
  }

  reflectApply(
    arrayPush,
    fallback.foreignSurfaces,
    [captureIntrinsicSurface(prototype)]
  );
}

function captureEvaluatorFallbackPrototypes(
  value
) {
  const fallback = {
    bySource:
      new WeakMapConstructor(),
    foreignSurfaces: []
  };

  if (
    value === null ||
    typeof value !== "object" ||
    utilIsProxy(value)
  ) {
    return fallback;
  }

  const seen =
    new WeakSetConstructor();
  const stack = [value];

  while (stack.length > 0) {
    const current =
      reflectApply(
        arrayPop,
        stack,
        []
      );

    if (
      current === null ||
      typeof current !== "object" ||
      reflectApply(
        weakSetHas,
        seen,
        [current]
      ) ||
      utilIsProxy(current)
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      seen,
      [current]
    );

    let prototype;
    let descriptors;

    try {
      prototype =
        getPrototypeOf(current);
      descriptors =
        getOwnPropertyDescriptors(
          current
        );
    } catch {
      continue;
    }

    if (
      prototype !== null &&
      utilIsProxy(prototype)
    ) {
      continue;
    }

    if (arrayIsArray(current)) {
      const arrayConstructor =
        captureNativeRealmConstructor(
          prototype,
          arrayConstructorSource
        );

      const parentPrototype =
        prototype === null
          ? null
          : getPrototypeOf(prototype);

      const objectConstructor =
        parentPrototype === null ||
        utilIsProxy(parentPrototype)
          ? null
          : captureNativeRealmConstructor(
              parentPrototype,
              objectConstructorSource
            );

      if (
        arrayConstructor !== null &&
        arrayConstructor !== ArrayConstructor
      ) {
        addForeignPrototypeSurface(
          fallback,
          prototype,
          arrayPrototype
        );

        if (
          objectConstructor !== null &&
          objectConstructor !== ObjectConstructor
        ) {
          addForeignPrototypeSurface(
            fallback,
            parentPrototype,
            objectPrototype
          );
        }

        reflectApply(
          weakMapSet,
          fallback.bySource,
          [current, prototype]
        );
      }
    } else {
      const objectConstructor =
        captureNativeRealmConstructor(
          prototype,
          objectConstructorSource
        );

      if (
        objectConstructor !== null &&
        objectConstructor !== ObjectConstructor
      ) {
        addForeignPrototypeSurface(
          fallback,
          prototype,
          objectPrototype
        );

        reflectApply(
          weakMapSet,
          fallback.bySource,
          [current, prototype]
        );
      }
    }

    const keys = ownKeys(descriptors);
    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const descriptor =
        descriptors[keys[index]];

      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value === "object"
      ) {
        reflectApply(
          arrayPush,
          stack,
          [descriptor.value]
        );
      }
    }
  }

  return fallback;
}

function defineSafeShadowMembers(
  target,
  safePrototype,
  arrayResultPrototype
) {
  const descriptors =
    getOwnPropertyDescriptors(
      safePrototype
    );
  const keys = ownKeys(descriptors);

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];

    if (hasOwn(target, key)) {
      continue;
    }

    let descriptor =
      descriptors[key];

    if (
      arrayResultPrototype !== undefined &&
      arrayMethodReturnsArray(key)
    ) {
      const nativeDescriptor =
        arrayPrototypeDescriptors[key];

      if (
        nativeDescriptor === undefined ||
        !("value" in nativeDescriptor) ||
        typeof nativeDescriptor.value !==
          "function"
      ) {
        throw new Error(
          "Missing captured Array result method"
        );
      }

      descriptor = {
        value:
          buildSafeArrayResultMethod(
            nativeDescriptor.value,
            arrayResultPrototype
          ),
        writable:
          descriptor.writable,
        enumerable:
          descriptor.enumerable,
        configurable:
          descriptor.configurable
      };
    }

    defineProperty(
      target,
      key,
      descriptor
    );
  }
}

function defineInertReferenceMembers(
  target,
  referencePrototype
) {
  const descriptors =
    getOwnPropertyDescriptors(
      referencePrototype
    );
  const keys = ownKeys(descriptors);

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];

    if (hasOwn(target, key)) {
      continue;
    }

    const descriptor =
      descriptors[key];
    let value;

    if (
      "value" in descriptor &&
      (
        descriptor.value === null ||
        (
          typeof descriptor.value !== "object" &&
          typeof descriptor.value !== "function" &&
          typeof descriptor.value !== "symbol"
        )
      )
    ) {
      value = descriptor.value;
    } else {
      value = undefined;
    }

    defineProperty(
      target,
      key,
      {
        value,
        writable: false,
        enumerable:
          descriptor.enumerable,
        configurable: false
      }
    );
  }
}

function buildForeignIdentityShadow(
  foreignPrototype,
  isArray
) {
  const shadow =
    objectCreate(
      foreignPrototype
    );

  if (isArray) {
    defineSafeShadowMembers(
      shadow,
      safeCallbackArrayPrototype,
      shadow
    );
  }

  defineSafeShadowMembers(
    shadow,
    safeCallbackObjectPrototype
  );

  if (isArray) {
    defineInertReferenceMembers(
      shadow,
      arrayPrototype
    );
  }

  defineInertReferenceMembers(
    shadow,
    objectPrototype
  );

  return shadow;
}

function getForeignIdentityShadow(
  cache,
  foreignPrototype,
  isArray
) {
  const existing =
    reflectApply(
      weakMapGet,
      cache,
      [foreignPrototype]
    );

  if (existing !== undefined) {
    return existing;
  }

  const shadow =
    buildForeignIdentityShadow(
      foreignPrototype,
      isArray
    );

  reflectApply(
    weakMapSet,
    cache,
    [foreignPrototype, shadow]
  );

  return shadow;
}

function deriveForeignArrayPrototype(
  fallback,
  foreignObjectPrototype
) {
  const foreignObjectConstructor =
    captureNativeRealmConstructor(
      foreignObjectPrototype,
      objectConstructorSource
    );

  if (foreignObjectConstructor === null) {
    return null;
  }

  const keysDescriptor =
    getOwnPropertyDescriptor(
      foreignObjectConstructor,
      "keys"
    );

  if (
    keysDescriptor === undefined ||
    "get" in keysDescriptor ||
    "set" in keysDescriptor ||
    typeof keysDescriptor.value !== "function" ||
    utilIsProxy(keysDescriptor.value) ||
    !sameIntrinsicCallable(
      keysDescriptor.value,
      objectKeys
    )
  ) {
    return null;
  }

  let sampleArray;

  try {
    sampleArray =
      reflectApply(
        keysDescriptor.value,
        foreignObjectConstructor,
        [objectCreate(null)]
      );
  } catch {
    return null;
  }

  if (!arrayIsArray(sampleArray)) {
    return null;
  }

  const foreignArrayPrototype =
    getPrototypeOf(sampleArray);

  if (
    foreignArrayPrototype === null ||
    utilIsProxy(foreignArrayPrototype) ||
    getPrototypeOf(foreignArrayPrototype) !==
      foreignObjectPrototype ||
    captureNativeRealmConstructor(
      foreignArrayPrototype,
      arrayConstructorSource
    ) === null
  ) {
    return null;
  }

  addForeignPrototypeSurface(
    fallback,
    foreignArrayPrototype,
    arrayPrototype
  );

  return foreignArrayPrototype;
}

function buildEvaluatorPrototypePlan(
  fallback,
  sourceRoot,
  canonicalRoot
) {
  const byNode =
    new WeakMapConstructor();
  const expectedNodes =
    new WeakSetConstructor();
  const localIdentityNodes =
    new WeakSetConstructor();
  const identityShadows =
    new WeakMapConstructor();

  const localArrayCanBridge =
    canInstallEvaluatorInstanceSemantic(
      ArrayConstructor,
      getOwnPropertyDescriptor(
        ArrayConstructor,
        arrayHasInstanceSymbol
      )
    );
  const localObjectCanBridge =
    canInstallEvaluatorInstanceSemantic(
      ObjectConstructor,
      getOwnPropertyDescriptor(
        ObjectConstructor,
        arrayHasInstanceSymbol
      )
    );

  const localObjectIdentityShadow =
    localObjectCanBridge
      ? undefined
      : getForeignIdentityShadow(
          identityShadows,
          objectPrototype,
          false
        );
  const localArrayIdentityShadow =
    localArrayCanBridge &&
    localObjectCanBridge
      ? undefined
      : getForeignIdentityShadow(
          identityShadows,
          arrayPrototype,
          true
        );

  let candidateObjectPrototype =
    localObjectIdentityShadow !== undefined
      ? localObjectIdentityShadow
      : safeCallbackObjectPrototype;
  let candidateArrayPrototype =
    localArrayIdentityShadow !== undefined
      ? localArrayIdentityShadow
      : safeCallbackArrayPrototype;
  let candidateObjectIsLocal = true;
  let candidateArrayIsLocal = true;
  let candidateForeignObjectPrototype = null;

  if (
    sourceRoot !== null &&
    canonicalRoot !== null &&
    typeof sourceRoot === "object" &&
    typeof canonicalRoot === "object"
  ) {
    const seen =
      new WeakSetConstructor();
    const stack = [{
      source: sourceRoot,
      canonical: canonicalRoot
    }];

    while (stack.length > 0) {
      const pair =
        reflectApply(
          arrayPop,
          stack,
          []
        );

      if (
        pair.source === null ||
        pair.canonical === null ||
        typeof pair.source !== "object" ||
        typeof pair.canonical !== "object" ||
        reflectApply(
          weakSetHas,
          seen,
          [pair.source]
        )
      ) {
        continue;
      }

      reflectApply(
        weakSetAdd,
        seen,
        [pair.source]
      );
      reflectApply(
        weakSetAdd,
        expectedNodes,
        [pair.canonical]
      );

      const foreignPrototype =
        reflectApply(
          weakMapGet,
          fallback.bySource,
          [pair.source]
        );

      if (foreignPrototype !== undefined) {
        const sourceIsArray =
          arrayIsArray(pair.source);
        const identityShadow =
          getForeignIdentityShadow(
            identityShadows,
            foreignPrototype,
            sourceIsArray
          );

        reflectApply(
          weakMapSet,
          byNode,
          [
            pair.canonical,
            identityShadow
          ]
        );

        if (pair.source === sourceRoot) {
          if (sourceIsArray) {
            candidateArrayPrototype =
              identityShadow;
            candidateArrayIsLocal = false;

            const parentForeignObjectPrototype =
              getPrototypeOf(
                foreignPrototype
              );

            if (
              parentForeignObjectPrototype !== null &&
              !utilIsProxy(
                parentForeignObjectPrototype
              ) &&
              captureNativeRealmConstructor(
                parentForeignObjectPrototype,
                objectConstructorSource
              ) !== null &&
              isPristineIntrinsicPrototype(
                parentForeignObjectPrototype,
                objectPrototype
              )
            ) {
              candidateForeignObjectPrototype =
                parentForeignObjectPrototype;
              candidateObjectPrototype =
                getForeignIdentityShadow(
                  identityShadows,
                  parentForeignObjectPrototype,
                  false
                );
              candidateObjectIsLocal = false;
            }
          } else {
            candidateForeignObjectPrototype =
              foreignPrototype;
            candidateObjectPrototype =
              identityShadow;
            candidateObjectIsLocal = false;

            const siblingForeignArrayPrototype =
              deriveForeignArrayPrototype(
                fallback,
                foreignPrototype
              );

            if (
              siblingForeignArrayPrototype !== null
            ) {
              candidateArrayPrototype =
                getForeignIdentityShadow(
                  identityShadows,
                  siblingForeignArrayPrototype,
                  true
                );
              candidateArrayIsLocal = false;
            }
          }
        } else if (
          sourceIsArray &&
          candidateForeignObjectPrototype !== null &&
          getPrototypeOf(foreignPrototype) ===
            candidateForeignObjectPrototype
        ) {
          candidateArrayPrototype =
            identityShadow;
          candidateArrayIsLocal = false;
        }
      } else {
        const sourcePrototype =
          getPrototypeOf(pair.source);
        const sourceIsArray =
          arrayIsArray(pair.source);
        let localIdentityShadow;

        if (
          sourceIsArray &&
          sourcePrototype === arrayPrototype
        ) {
          localIdentityShadow =
            localArrayIdentityShadow;
        } else if (
          !sourceIsArray &&
          sourcePrototype === objectPrototype
        ) {
          localIdentityShadow =
            localObjectIdentityShadow;
        }

        if (localIdentityShadow !== undefined) {
          reflectApply(
            weakMapSet,
            byNode,
            [
              pair.canonical,
              localIdentityShadow
            ]
          );
          reflectApply(
            weakSetAdd,
            localIdentityNodes,
            [pair.canonical]
          );
        }
      }

      const sourceDescriptors =
        getOwnPropertyDescriptors(
          pair.source
        );
      const canonicalDescriptors =
        getOwnPropertyDescriptors(
          pair.canonical
        );
      const keys = ownKeys(sourceDescriptors);

      for (
        let index = 0;
        index < keys.length;
        index += 1
      ) {
        const key = keys[index];
        const sourceDescriptor =
          sourceDescriptors[key];
        const canonicalDescriptor =
          canonicalDescriptors[key];

        if (
          sourceDescriptor !== undefined &&
          canonicalDescriptor !== undefined &&
          "value" in sourceDescriptor &&
          "value" in canonicalDescriptor &&
          sourceDescriptor.value !== null &&
          canonicalDescriptor.value !== null &&
          typeof sourceDescriptor.value === "object" &&
          typeof canonicalDescriptor.value === "object"
        ) {
          reflectApply(
            arrayPush,
            stack,
            [{
              source:
                sourceDescriptor.value,
              canonical:
                canonicalDescriptor.value
            }]
          );
        }
      }
    }
  }

  return {
    byNode,
    expectedNodes,
    localIdentityNodes,
    objectPrototype:
      safeCallbackObjectPrototype,
    arrayPrototype:
      safeCallbackArrayPrototype,
    candidateObjectPrototype,
    candidateArrayPrototype,
    candidateObjectIsLocal,
    candidateArrayIsLocal,
    foreignSurfaces:
      fallback.foreignSurfaces
  };
}

function withSafeEvaluatorInstanceSemantics(
  semantics,
  callback
) {
  const installed = [];

  try {
    for (
      let index = 0;
      index < semantics.length;
      index += 1
    ) {
      const semantic =
        semantics[index];
      const constructor =
        semantic.constructor;
      const previousDescriptor =
        getOwnPropertyDescriptor(
          constructor,
          arrayHasInstanceSymbol
        );

      if (
        !canInstallEvaluatorInstanceSemantic(
          constructor,
          previousDescriptor
        )
      ) {
        continue;
      }

      defineProperty(
        constructor,
        arrayHasInstanceSymbol,
        {
          value:
            semantic.hasInstance,
          writable: false,
          enumerable: false,
          configurable: true
        }
      );

      reflectApply(
        arrayPush,
        installed,
        [{
          constructor,
          previousDescriptor
        }]
      );
    }

    return callback();
  } finally {
    while (installed.length > 0) {
      const entry =
        reflectApply(
          arrayPop,
          installed,
          []
        );

      restoreOwnDescriptor(
        entry.constructor,
        arrayHasInstanceSymbol,
        entry.previousDescriptor
      );
    }
  }
}

const MAX_RULES = 7;
const MAX_ATTACKS = 20;
const CONTRACT_VERSION = 1;
const GENERATOR_VERSION = 1;

const RULE_KINDS =
  new Set([
    "required",
    "forbidden",
    "conditional"
  ]);

const SEVERITIES =
  new Set([
    "critical",
    "major",
    "minor"
  ]);

const SEVERITY_SCORES =
  objectFreeze({
    critical: 1.0,
    major: 0.7,
    minor: 0.4
  });

const SCORE_KEYS =
  objectFreeze([
    "realism",
    "subtlety",
    "novelty",
    "fixability"
  ]);

const GENERATOR_INSTRUCTIONS = [
  "You are generating candidate bad outputs for one eval case.",
  "",
  "Use only the confirmed Quality Contract rules.",
  "Only target rules that are applicable to the current input.",
  "Prefer one primary quality failure per candidate.",
  "Preserve unrelated correct information.",
  "Make the smallest plausible change needed to violate the rule.",
  "Prefer realistic, subtle failures over absurd failures.",
  "Do not invent new quality rules.",
  "Do not change the task.",
  "Do not produce JavaScript functions or executable mutation code.",
  "Return declarative candidate outputs only.",
  "Every attack must cite one confirmed rule ID.",
  "Explain why the candidate is intended to violate that rule.",
  "Use zero attacks when no strong attack is supported.",
  "Prefer fewer strong attacks over many speculative attacks."
].join("\n");

function requireNonEmptyString(
  value,
  label
) {
  if (
    typeof value !== "string" ||
    reflectApply(
      stringTrim,
      value,
      []
    ) === ""
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }
}

function requireScore(
  value,
  label
) {
  if (
    typeof value !== "number" ||
    !numberIsFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} must be a finite number between 0 and 1.`
    );
  }
}

function hasOwn(
  value,
  key
) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
  );
}

function requireOwnDataProperty(
  value,
  key,
  label
) {
  const descriptor =
    getOwnPropertyDescriptor(
      value,
      key
    );

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor
  ) {
    throw new Error(
      `${label} must include own data property ${key}.`
    );
  }
}

const PROPERTY_DESCRIPTOR_KEYS =
  objectFreeze([
    "value",
    "get",
    "set",
    "writable",
    "enumerable",
    "configurable"
  ]);

function samePropertyDescriptor(
  left,
  right
) {
  if (
    left === undefined ||
    right === undefined
  ) {
    return left === right;
  }

  for (
    let index = 0;
    index < PROPERTY_DESCRIPTOR_KEYS.length;
    index += 1
  ) {
    const key =
      PROPERTY_DESCRIPTOR_KEYS[index];

    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

function captureIntrinsicSurface(
  holder,
  seen = null
) {
  const activeSeen =
    seen === null
      ? new WeakSetConstructor()
      : seen;

  if (
    holder === null ||
    (
      typeof holder !== "object" &&
      typeof holder !== "function"
    ) ||
    utilIsProxy(holder) ||
    reflectApply(
      weakSetHas,
      activeSeen,
      [holder]
    )
  ) {
    return null;
  }

  reflectApply(
    weakSetAdd,
    activeSeen,
    [holder]
  );

  const descriptors =
    getOwnPropertyDescriptors(holder);
  const nested = [];
  const keys = ownKeys(descriptors);

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];
    const descriptor =
      descriptors[key];
    const candidates = [];

    if (
      "value" in descriptor &&
      key !== "constructor" &&
      descriptor.value !== null &&
      (
        typeof descriptor.value === "object" ||
        typeof descriptor.value === "function"
      )
    ) {
      reflectApply(
        arrayPush,
        candidates,
        [descriptor.value]
      );
    }

    if (typeof descriptor.get === "function") {
      reflectApply(
        arrayPush,
        candidates,
        [descriptor.get]
      );
    }

    if (typeof descriptor.set === "function") {
      reflectApply(
        arrayPush,
        candidates,
        [descriptor.set]
      );
    }

    for (
      let candidateIndex = 0;
      candidateIndex < candidates.length;
      candidateIndex += 1
    ) {
      const nestedSurface =
        captureIntrinsicSurface(
          candidates[candidateIndex],
          activeSeen
        );

      if (nestedSurface !== null) {
        reflectApply(
          arrayPush,
          nested,
          [nestedSurface]
        );
      }
    }
  }

  return {
    holder,
    prototype:
      getPrototypeOf(holder),
    descriptors,
    nested
  };
}

function captureCallbackIntrinsicSurfaces() {
  return [
    captureIntrinsicSurface(
      functionPrototype
    ),
    captureIntrinsicSurface(
      objectPrototype
    ),
    captureIntrinsicSurface(
      arrayPrototype
    ),
    captureIntrinsicSurface(
      stringPrototype
    ),
    captureIntrinsicSurface(
      mapPrototype
    ),
    captureIntrinsicSurface(
      setPrototype
    ),
    captureIntrinsicSurface(
      weakMapPrototype
    ),
    captureIntrinsicSurface(
      weakSetPrototype
    ),
    captureIntrinsicSurface(
      arrayIteratorPrototype
    ),
    captureIntrinsicSurface(
      stringIteratorPrototype
    ),
    captureIntrinsicSurface(
      sharedIteratorPrototype
    ),
    captureIntrinsicSurface(
      promisePrototype
    ),
    captureIntrinsicSurface(
      NumberConstructor
    )
  ];
}

function restoreIntrinsicSurface(
  surface
) {
  if (surface === null) {
    return;
  }

  const holder =
    surface.holder;
  const expected =
    surface.descriptors;

  if (
    getPrototypeOf(holder) !==
      surface.prototype
  ) {
    try {
      setPrototypeOf(
        holder,
        surface.prototype
      );
    } catch {
      throw new Error(
        "Callback intrinsic surface could not be restored."
      );
    }
  }

  const current =
    getOwnPropertyDescriptors(holder);

  const currentKeys = ownKeys(current);
  for (
    let index = 0;
    index < currentKeys.length;
    index += 1
  ) {
    const key = currentKeys[index];

    if (!hasOwn(expected, key)) {
      if (!deleteProperty(holder, key)) {
        throw new Error(
          "Callback intrinsic surface could not be restored."
        );
      }
    }
  }

  const expectedKeys = ownKeys(expected);
  for (
    let index = 0;
    index < expectedKeys.length;
    index += 1
  ) {
    const key = expectedKeys[index];
    const currentDescriptor =
      getOwnPropertyDescriptor(
        holder,
        key
      );
    const expectedDescriptor =
      expected[key];

    if (
      !samePropertyDescriptor(
        currentDescriptor,
        expectedDescriptor
      )
    ) {
      try {
        defineProperty(
          holder,
          key,
          expectedDescriptor
        );
      } catch {
        throw new Error(
          "Callback intrinsic surface could not be restored."
        );
      }
    }
  }

  for (
    let index = 0;
    index < surface.nested.length;
    index += 1
  ) {
    restoreIntrinsicSurface(
      surface.nested[index]
    );
  }
}

function restoreCallbackIntrinsicSurfaces(
  surfaces
) {
  for (
    let index = 0;
    index < surfaces.length;
    index += 1
  ) {
    restoreIntrinsicSurface(
      surfaces[index]
    );
  }
}

let callbackIntrinsicScopeBaseline = null;
let callbackIntrinsicScopeCount = 0;

function enterCallbackIntrinsicScope() {
  if (callbackIntrinsicScopeCount === 0) {
    callbackIntrinsicScopeBaseline =
      captureCallbackIntrinsicSurfaces();
  } else {
    restoreCallbackIntrinsicSurfaces(
      callbackIntrinsicScopeBaseline
    );
  }

  callbackIntrinsicScopeCount += 1;

  return {
    closed: false
  };
}

function closeCallbackIntrinsicScope(
  scope
) {
  if (
    scope === null ||
    typeof scope !== "object" ||
    scope.closed === true
  ) {
    return;
  }

  const baseline =
    callbackIntrinsicScopeBaseline;

  if (
    baseline === null ||
    callbackIntrinsicScopeCount <= 0
  ) {
    scope.closed = true;
    throw new Error(
      "Callback intrinsic scope is not active."
    );
  }

  let restoreError = null;

  try {
    restoreCallbackIntrinsicSurfaces(
      baseline
    );
  } catch (error) {
    restoreError = error;
  }

  scope.closed = true;
  callbackIntrinsicScopeCount -= 1;

  if (callbackIntrinsicScopeCount === 0) {
    callbackIntrinsicScopeBaseline = null;
  }

  if (restoreError !== null) {
    throw restoreError;
  }
}

function withRestoredCallbackIntrinsicSurfaces(
  callback,
  thisArg,
  args
) {
  const scope =
    enterCallbackIntrinsicScope();

  try {
    return reflectApply(
      callback,
      thisArg,
      args
    );
  } finally {
    closeCallbackIntrinsicScope(
      scope
    );
  }
}

function requirePromiseIntrinsicIntegrity() {
  if (
    !m8DependencyAuthorityAvailable ||
    typeof attack !== "function" ||
    typeof cloneAiData !== "function" ||
    typeof snapshotAiData !== "function" ||
    !promiseAuthorityAvailable ||
    typeof promiseConstructor !== "function" ||
    typeof promiseThen !== "function" ||
    promisePrototype === null ||
    !runtimeAuthority.hasTrustedLocalPromiseSpecies(
      promiseConstructor,
      promiseSpecies
    )
  ) {
    throw new Error(
      "Promise intrinsic integrity check failed."
    );
  }

  const currentPrototypeConstructor =
    getOwnPropertyDescriptor(
      promisePrototype,
      "constructor"
    );

  const currentThen =
    getOwnPropertyDescriptor(
      promisePrototype,
      "then"
    );

  const currentSpecies =
    getOwnPropertyDescriptor(
      promiseConstructor,
      promiseSpecies
    );

  if (
    !samePropertyDescriptor(
      currentPrototypeConstructor,
      promisePrototypeConstructorDescriptor
    ) ||
    !samePropertyDescriptor(
      currentThen,
      promiseThenDescriptor
    ) ||
    !samePropertyDescriptor(
      currentSpecies,
      promiseSpeciesDescriptor
    )
  ) {
    throw new Error(
      "Promise intrinsic integrity check failed."
    );
  }
}

function captureOptions(
  value
) {
  const label =
    "Contract attack options";

  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }

  if (utilIsProxy(value)) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  const prototype =
    getPrototypeOf(value);

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new Error(
      `${label} must be a plain object.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(value);

  for (const key of ownKeys(descriptors)) {
    if (typeof key === "symbol") {
      throw new Error(
        `${label} must not contain symbol-keyed properties.`
      );
    }

    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must use data properties only.`
      );
    }

    if (!descriptor.enumerable) {
      throw new Error(
        `${label} must not contain non-enumerable own properties.`
      );
    }
  }

  return descriptors;
}

function readCapturedValue(
  descriptors,
  key
) {
  const descriptor =
    descriptors[key];

  return (
    descriptor === undefined
      ? undefined
      : descriptor.value
  );
}

function requirePlainSnapshotObject(
  value,
  label
) {
  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }
}

function normalizeRule(
  rule,
  index,
  ids
) {
  const label =
    `Quality Contract rule at index ${index}`;

  requirePlainSnapshotObject(
    rule,
    label
  );

  for (
    const key of [
      "id",
      "statement",
      "kind",
      "severity"
    ]
  ) {
    requireOwnDataProperty(
      rule,
      key,
      label
    );
  }

  const id = rule.id;
  const statement = rule.statement;
  const kind = rule.kind;
  const severity = rule.severity;

  requireNonEmptyString(
    id,
    `${label} id`
  );

  if (
    reflectApply(
      setHas,
      ids,
      [id]
    )
  ) {
    throw new Error(
      `Duplicate Quality Contract rule id: ${id}`
    );
  }

  reflectApply(
    setAdd,
    ids,
    [id]
  );

  requireNonEmptyString(
    statement,
    `${label} statement`
  );

  if (
    typeof kind !== "string" ||
    !RULE_KINDS.has(kind)
  ) {
    throw new Error(
      `${label} kind must be one of: required, forbidden, conditional.`
    );
  }

  if (
    typeof severity !== "string" ||
    !SEVERITIES.has(severity)
  ) {
    throw new Error(
      `${label} severity must be one of: critical, major, minor.`
    );
  }

  return objectFreeze({
    id,
    statement,
    kind,
    severity
  });
}

function validateConfirmedContract(
  contract
) {
  const snapshot =
    snapshotAiData(
      contract,
      "Quality Contract"
    );

  requirePlainSnapshotObject(
    snapshot,
    "Quality Contract"
  );

  for (
    const key of [
      "version",
      "status",
      "task",
      "rules"
    ]
  ) {
    requireOwnDataProperty(
      snapshot,
      key,
      "Quality Contract"
    );
  }

  if (
    snapshot.version !==
      CONTRACT_VERSION
  ) {
    throw new Error(
      `Quality Contract version must be ${CONTRACT_VERSION}.`
    );
  }

  if (snapshot.status !== "confirmed") {
    if (
      snapshot.status ===
        "no-active-rules"
    ) {
      throw new Error(
        "Quality Contract must contain active confirmed rules before contract attacks can run."
      );
    }

    throw new Error(
      'Quality Contract status must be "confirmed".'
    );
  }

  requireNonEmptyString(
    snapshot.task,
    "Quality Contract task"
  );

  if (!arrayIsArray(snapshot.rules)) {
    throw new Error(
      "Quality Contract rules must be an array."
    );
  }

  if (snapshot.rules.length === 0) {
    throw new Error(
      "A confirmed Quality Contract must contain at least one active rule."
    );
  }

  if (
    snapshot.rules.length >
      MAX_RULES
  ) {
    throw new Error(
      `Quality Contract must not contain more than ${MAX_RULES} active rules.`
    );
  }

  const ids = new SetConstructor();

  const rules =
    reflectApply(
      arrayMap,
      snapshot.rules,
      [
        (rule, index) =>
          normalizeRule(
            rule,
            index,
            ids
          )
      ]
    );

  return objectFreeze({
    version:
      CONTRACT_VERSION,
    status:
      "confirmed",
    task:
      snapshot.task,
    rules:
      objectFreeze(rules)
  });
}

function requireTrustedCallbacks(
  evaluator,
  generator
) {
  if (typeof evaluator !== "function") {
    throw new Error(
      "Evaluator must be a function."
    );
  }

  if (typeof generator !== "function") {
    throw new Error(
      "Generator must be a function."
    );
  }
}

function isAuthenticatedStandardPromisePrototype(
  prototype,
  constructorDescriptor
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilIsProxy(prototype) ||
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    typeof constructorDescriptor.value !==
      "function" ||
    utilIsProxy(
      constructorDescriptor.value
    ) ||
    promiseSpeciesGetterSource === null
  ) {
    return false;
  }

  const constructor =
    constructorDescriptor.value;

  let constructorSource;
  let prototypeDescriptor;
  let speciesDescriptor;
  let speciesGetterSource;

  try {
    constructorSource =
      reflectApply(
        functionToString,
        constructor,
        []
      );

    prototypeDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );

    speciesDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        promiseSpecies
      );

    speciesGetterSource =
      speciesDescriptor !== undefined &&
      typeof speciesDescriptor.get ===
        "function" &&
      !utilIsProxy(
        speciesDescriptor.get
      )
        ? reflectApply(
            functionToString,
            speciesDescriptor.get,
            []
          )
        : null;
  } catch {
    return false;
  }

  return (
    constructorSource ===
      promiseConstructorSource &&
    prototypeDescriptor !==
      undefined &&
    !("get" in prototypeDescriptor) &&
    !("set" in prototypeDescriptor) &&
    prototypeDescriptor.value ===
      prototype &&
    speciesDescriptor !== undefined &&
    !("value" in speciesDescriptor) &&
    speciesDescriptor.set === undefined &&
    speciesGetterSource ===
      promiseSpeciesGetterSource
  );
}

function restorePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    deleteProperty(
      holder,
      "constructor"
    );

    return;
  }

  defineProperty(
    holder,
    "constructor",
    descriptor
  );
}

function canInstallSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    return isExtensible(holder);
  }

  if (descriptor.configurable) {
    return true;
  }

  return (
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.writable
  );
}

function installSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable: false,
        configurable: true
      }
    );

    return;
  }

  if (descriptor.configurable) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable:
          descriptor.enumerable,
        configurable: true
      }
    );

    return;
  }

  defineProperty(
    holder,
    "constructor",
    {
      value:
        safePromiseSpeciesContainer
    }
  );
}

function withTemporarySafePromiseConstructor(
  holder,
  descriptor,
  callback
) {
  installSafePromiseConstructor(
    holder,
    descriptor
  );

  try {
    return callback();
  } finally {
    restorePromiseConstructor(
      holder,
      descriptor
    );
  }
}

function withSafePromiseConstructor(
  value,
  callback
) {
  if (
    !utilIsPromise(value) ||
    utilIsProxy(value)
  ) {
    throw new Error(
      "Generator native Promise must be a genuine Promise object."
    );
  }

  const ownConstructor =
    getOwnPropertyDescriptor(
      value,
      "constructor"
    );

  const prototype =
    getPrototypeOf(value);

  if (
    canInstallSafePromiseConstructor(
      value,
      ownConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      value,
      ownConstructor,
      callback
    );
  }

  if (ownConstructor !== undefined) {
    if (
      !("get" in ownConstructor) &&
      !("set" in ownConstructor) &&
      (
        ownConstructor.value ===
          promiseConstructor ||
        ownConstructor.value ===
          undefined ||
        isAuthenticatedStandardPromisePrototype(
          prototype,
          ownConstructor
        )
      )
    ) {
      requirePromiseIntrinsicIntegrity();
      return callback();
    }

    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilIsProxy(prototype)
  ) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototypeConstructor =
    getOwnPropertyDescriptor(
      prototype,
      "constructor"
    );

  if (
    canInstallSafePromiseConstructor(
      prototype,
      prototypeConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      prototype,
      prototypeConstructor,
      callback
    );
  }

  if (
    isAuthenticatedStandardPromisePrototype(
      prototype,
      prototypeConstructor
    )
  ) {
    return callback();
  }

  throw new Error(
    "Native Promise cannot be observed safely."
  );
}

function prepareAsyncRecordReturn(value) {
  defineProperty(value, "then", {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: true
  });

  const cleanup = new promiseConstructor((resolve) => resolve());
  reflectApply(promiseThen, cleanup, [
    () => {
      deleteProperty(value, "then");
    }
  ]);

  return value;
}

function passPromiseValue(
  value
) {
  return value;
}

function rethrowPromiseReason(
  reason
) {
  throw reason;
}

function ignoreRejectedPromise() {
  return undefined;
}

function bridgeNativePromise(
  value
) {
  return new promiseConstructor(
    (resolve, reject) => {
      withSafePromiseConstructor(
        value,
        () =>
          reflectApply(
            promiseThen,
            value,
            [
              resolve,
              reject
            ]
          )
      );
    }
  );
}

function observeNativePromise(
  value
) {
  return withSafePromiseConstructor(
    value,
    () =>
      reflectApply(
        promiseThen,
        value,
        [
          undefined,
          ignoreRejectedPromise
        ]
      )
  );
}

function createEvaluatorSnapshot(
  value,
  prototypePlan
) {
  const instanceState = {
    snapshotNodes:
      new WeakSetConstructor(),
    localArrayInstances:
      new WeakSetConstructor(),
    localObjectInstances:
      new WeakSetConstructor(),
    localArrayPrototypes:
      new WeakSetConstructor()
  };

  reflectApply(
    weakSetAdd,
    instanceState.localArrayPrototypes,
    [safeCallbackArrayPrototype]
  );

  const cloned =
    cloneAiData(
      value,
      "Evaluator output"
    );

  if (
    cloned === null ||
    typeof cloned !== "object"
  ) {
    return {
      output: cloned,
      instanceState
    };
  }

  const seen =
    new WeakSetConstructor();

  const stack = [{
    source: value,
    target: cloned
  }];

  while (stack.length > 0) {
    const pair =
      reflectApply(
        arrayPop,
        stack,
        []
      );
    const current = pair.target;
    const source = pair.source;

    if (
      current === null ||
      source === null ||
      typeof current !== "object" ||
      typeof source !== "object" ||
      reflectApply(
        weakSetHas,
        seen,
        [current]
      )
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      seen,
      [current]
    );
    reflectApply(
      weakSetAdd,
      instanceState.snapshotNodes,
      [current]
    );

    const descriptors =
      getOwnPropertyDescriptors(
        current
      );
    const sourceDescriptors =
      getOwnPropertyDescriptors(
        source
      );
    const keys = ownKeys(descriptors);

    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const key = keys[index];
      const descriptor =
        descriptors[key];
      const sourceDescriptor =
        sourceDescriptors[key];

      if (
        descriptor !== undefined &&
        sourceDescriptor !== undefined &&
        "value" in descriptor &&
        "value" in sourceDescriptor &&
        descriptor.value !== null &&
        sourceDescriptor.value !== null &&
        typeof descriptor.value === "object" &&
        typeof sourceDescriptor.value === "object"
      ) {
        reflectApply(
          arrayPush,
          stack,
          [{
            source:
              sourceDescriptor.value,
            target:
              descriptor.value
          }]
        );
      }
    }

    const sourcePrototype =
      getPrototypeOf(source);
    const plannedPrototype =
      reflectApply(
        weakMapGet,
        prototypePlan.byNode,
        [source]
      );
    const currentIsArray =
      arrayIsArray(current);
    const isExpectedNode =
      reflectApply(
        weakSetHas,
        prototypePlan.expectedNodes,
        [source]
      );
    const usesLocalIdentity =
      isExpectedNode &&
      reflectApply(
        weakSetHas,
        prototypePlan.localIdentityNodes,
        [source]
      );

    let effectivePrototype =
      plannedPrototype;
    let treatAsLocal = false;

    if (isExpectedNode) {
      treatAsLocal =
        plannedPrototype === undefined ||
        usesLocalIdentity;
    } else if (sourcePrototype !== null) {
      if (currentIsArray) {
        effectivePrototype =
          prototypePlan.candidateArrayPrototype;
        treatAsLocal =
          prototypePlan.candidateArrayIsLocal;
      } else {
        effectivePrototype =
          prototypePlan.candidateObjectPrototype;
        treatAsLocal =
          prototypePlan.candidateObjectIsLocal;
      }
    }

    if (treatAsLocal) {
      if (currentIsArray) {
        reflectApply(
          weakSetAdd,
          instanceState.localArrayInstances,
          [current]
        );
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
        reflectApply(
          weakSetAdd,
          instanceState.localArrayPrototypes,
          [
            effectivePrototype !== undefined
              ? effectivePrototype
              : prototypePlan.arrayPrototype
          ]
        );
      } else if (sourcePrototype !== null) {
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      }
    }

    setPrototypeOf(
      current,
      effectivePrototype !== undefined
        ? effectivePrototype
        : currentIsArray
          ? prototypePlan.arrayPrototype
          : sourcePrototype === null
            ? null
            : prototypePlan.objectPrototype
    );

    objectFreeze(current);
  }

  return {
    output: cloned,
    instanceState
  };
}

function restoreEvaluatorForeignSurfaces(
  prototypePlan
) {
  if (
    prototypePlan.foreignSurfaces.length > 0
  ) {
    restoreCallbackIntrinsicSurfaces(
      prototypePlan.foreignSurfaces
    );
  }
}

function createSafeEvaluator(
  evaluator,
  prototypePlan
) {
  return function safeEvaluator(
    output
  ) {
    const evaluatorSnapshot =
      createEvaluatorSnapshot(
        output,
        prototypePlan
      );
    const evaluatorOutput =
      evaluatorSnapshot.output;
    const instanceSemantics =
      captureEvaluatorInstanceSemantics(
        evaluatorSnapshot.instanceState
      );

    restoreEvaluatorForeignSurfaces(
      prototypePlan
    );

    let result;

    try {
      result =
        withRestoredCallbackIntrinsicSurfaces(
          () =>
            withSafeEvaluatorInstanceSemantics(
              instanceSemantics,
              () =>
                withActiveEvaluatorInstanceState(
                  evaluatorSnapshot.instanceState,
                  () =>
                    reflectApply(
                      evaluator,
                      undefined,
                      [evaluatorOutput]
                    )
                )
            ),
          undefined,
          []
        );
    } finally {
      restoreEvaluatorForeignSurfaces(
        prototypePlan
      );
    }

    if (utilIsPromise(result)) {
      observeNativePromise(result);
      requirePromiseIntrinsicIntegrity();

      throw new Error(
        "Async checks are not supported by this deterministic engine."
      );
    }

    requirePromiseIntrinsicIntegrity();

    if (typeof result !== "boolean") {
      throw new Error(
        "Evaluator must return a boolean."
      );
    }

    return result;
  };
}

function runPositiveControl(
  evaluator,
  expectedOutput
) {
  const baselineOutput =
    expectedOutput;

  const baselineMutation = {
    id:
      "__gotcha_contract_attack_baseline__",
    type:
      "positive-control",
    description:
      "Known-good expected output.",
    output:
      baselineOutput,
    severity: 0,
    realism: 0,
    subtlety: 0,
    novelty: 0,
    fixability: 0
  };

  const baseline =
    attack(
      evaluator,
      [baselineMutation]
    );

  const result =
    baseline.results[0];

  if (
    result === undefined ||
    result.survived !== true
  ) {
    throw new Error(
      "Evaluator must pass expectedOutput before contract attacks can run."
    );
  }

  return true;
}

function isolateGeneratorData(
  value
) {
  const seen =
    new WeakSetConstructor();

  const stack = [value];

  while (stack.length > 0) {
    const current =
      stack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      seen.has(current)
    ) {
      continue;
    }

    seen.add(current);

    const descriptors =
      getOwnPropertyDescriptors(
        current
      );

    for (
      const key of ownKeys(descriptors)
    ) {
      const descriptor =
        descriptors[key];

      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value ===
          "object"
      ) {
        stack.push(
          descriptor.value
        );
      }
    }

    setPrototypeOf(
      current,
      arrayIsArray(current)
        ? safeCallbackArrayPrototype
        : safeCallbackObjectPrototype
    );
  }

  return value;
}

function buildGeneratorArguments(
  contract,
  input,
  expectedOutput
) {
  return isolateGeneratorData({
    contract:
      cloneAiData(
        contract,
        "Generator contract"
      ),
    input:
      cloneAiData(
        input,
        "Generator input"
      ),
    expectedOutput:
      cloneAiData(
        expectedOutput,
        "Generator expected output"
      ),
    instructions:
      GENERATOR_INSTRUCTIONS
  });
}

function invokeGenerator(
  generator,
  argumentsObject
) {
  const scope =
    enterCallbackIntrinsicScope();

  let returned;

  try {
    returned =
      reflectApply(
        generator,
        undefined,
        [argumentsObject]
      );
  } catch (error) {
    closeCallbackIntrinsicScope(
      scope
    );
    throw error;
  }

  const isNativePromise =
    utilIsPromise(returned);

  if (!isNativePromise) {
    closeCallbackIntrinsicScope(
      scope
    );
    requirePromiseIntrinsicIntegrity();

    return {
      isNativePromise: false,
      returned
    };
  }

  let bridged;

  try {
    bridged =
      bridgeNativePromise(
        returned
      );
  } catch (error) {
    closeCallbackIntrinsicScope(
      scope
    );
    throw error;
  }

  let integrityError = null;

  try {
    requirePromiseIntrinsicIntegrity();
  } catch (error) {
    integrityError = error;
  }

  return {
    isNativePromise: true,
    returned: bridged,
    scope,
    integrityError
  };
}

function normalizeGeneratorAttack(
  attackCandidate,
  index,
  attackIds,
  ruleById
) {
  const label =
    `Generated attack at index ${index}`;

  requirePlainSnapshotObject(
    attackCandidate,
    label
  );

  for (
    const key of [
      "id",
      "ruleId",
      "type",
      "description",
      "rationale",
      "mutatedOutput",
      "scores"
    ]
  ) {
    requireOwnDataProperty(
      attackCandidate,
      key,
      label
    );
  }

  const id = attackCandidate.id;
  const ruleId = attackCandidate.ruleId;
  const type = attackCandidate.type;
  const description =
    attackCandidate.description;
  const rationale =
    attackCandidate.rationale;
  const scores =
    attackCandidate.scores;

  requireNonEmptyString(
    id,
    `${label} id`
  );

  if (
    reflectApply(
      setHas,
      attackIds,
      [id]
    )
  ) {
    throw new Error(
      `Duplicate generated attack id: ${id}`
    );
  }

  reflectApply(
    setAdd,
    attackIds,
    [id]
  );

  requireNonEmptyString(
    ruleId,
    `${label} ruleId`
  );

  const rule =
    reflectApply(
      mapGet,
      ruleById,
      [ruleId]
    );

  if (rule === undefined) {
    throw new Error(
      `${label} references unknown Quality Contract rule id: ${ruleId}`
    );
  }

  requireNonEmptyString(
    type,
    `${label} type`
  );

  requireNonEmptyString(
    description,
    `${label} description`
  );

  requireNonEmptyString(
    rationale,
    `${label} rationale`
  );

  if (
    !hasOwn(
      attackCandidate,
      "mutatedOutput"
    )
  ) {
    throw new Error(
      `${label} must include mutatedOutput.`
    );
  }

  requirePlainSnapshotObject(
    scores,
    `${label} scores`
  );

  const normalizedScores =
    objectCreate(null);

  for (const scoreKey of SCORE_KEYS) {
    requireOwnDataProperty(
      scores,
      scoreKey,
      `${label} scores`
    );

    const score =
      scores[scoreKey];

    requireScore(
      score,
      `${label} ${scoreKey}`
    );

    normalizedScores[scoreKey] =
      score;
  }

  const mutatedOutput =
    snapshotAiData(
      attackCandidate.mutatedOutput,
      `${label} mutatedOutput`
    );

  return {
    index,
    id,
    ruleId,
    rule,
    type,
    description,
    rationale,
    mutatedOutput,
    scores:
      objectFreeze(
        normalizedScores
      )
  };
}

function validateGeneratorOutput(
  rawOutput,
  contract
) {
  const snapshot =
    snapshotAiData(
      rawOutput,
      "Generator output"
    );

  requirePlainSnapshotObject(
    snapshot,
    "Generator output"
  );

  for (
    const key of [
      "version",
      "task",
      "attacks"
    ]
  ) {
    requireOwnDataProperty(
      snapshot,
      key,
      "Generator output"
    );
  }

  if (
    snapshot.version !==
      GENERATOR_VERSION
  ) {
    throw new Error(
      `Generator output version must be ${GENERATOR_VERSION}.`
    );
  }

  requireNonEmptyString(
    snapshot.task,
    "Generator output task"
  );

  if (snapshot.task !== contract.task) {
    throw new Error(
      "Generator output task must exactly match the confirmed Quality Contract task."
    );
  }

  if (!arrayIsArray(snapshot.attacks)) {
    throw new Error(
      "Generator output attacks must be an array."
    );
  }

  if (
    snapshot.attacks.length >
      MAX_ATTACKS
  ) {
    throw new Error(
      `Generator output must not contain more than ${MAX_ATTACKS} attacks.`
    );
  }

  const ruleById =
    new MapConstructor(
      reflectApply(
        arrayMap,
        contract.rules,
        [
          (rule) => [
            rule.id,
            rule
          ]
        ]
      )
    );

  const attackIds =
    new SetConstructor();

  const attacks =
    reflectApply(
      arrayMap,
      snapshot.attacks,
      [
        (attackCandidate, index) =>
          normalizeGeneratorAttack(
            attackCandidate,
            index,
            attackIds,
            ruleById
          )
      ]
    );

  return objectFreeze({
    version:
      GENERATOR_VERSION,
    task:
      snapshot.task,
    attacks:
      objectFreeze(attacks)
  });
}

function compileGeneratedAttack(
  candidate
) {
  const rule =
    candidate.rule;

  const severity =
    SEVERITY_SCORES[
      rule.severity
    ];

  const trustedRule =
    objectFreeze({
      id:
        rule.id,
      statement:
        rule.statement,
      kind:
        rule.kind,
      severity:
        rule.severity
    });

  return {
    id:
      candidate.id,
    ruleId:
      candidate.ruleId,
    rule:
      trustedRule,
    type:
      candidate.type,
    description:
      candidate.description,
    rationale:
      candidate.rationale,
    output:
      snapshotAiData(
        candidate.mutatedOutput,
        `Generated attack ${candidate.id} output`
      ),
    severity,
    realism:
      candidate.scores.realism,
    subtlety:
      candidate.scores.subtlety,
    novelty:
      candidate.scores.novelty,
    fixability:
      candidate.scores.fixability
  };
}

function isAiDataEqual(
  left,
  right
) {
  const stack = [[left, right]];
  const compared =
    new WeakMapConstructor();

  while (stack.length > 0) {
    const pair = stack.pop();
    const leftValue = pair[0];
    const rightValue = pair[1];

    if (leftValue === rightValue) {
      continue;
    }

    if (
      leftValue === null ||
      rightValue === null ||
      typeof leftValue !==
        typeof rightValue
    ) {
      return false;
    }

    if (
      typeof leftValue !== "object"
    ) {
      return false;
    }

    if (
      arrayIsArray(leftValue) !==
        arrayIsArray(rightValue)
    ) {
      return false;
    }

    let comparedRights =
      reflectApply(
        weakMapGet,
        compared,
        [leftValue]
      );

    if (comparedRights === undefined) {
      comparedRights =
        new WeakSetConstructor();
      reflectApply(
        weakMapSet,
        compared,
        [
          leftValue,
          comparedRights
        ]
      );
    } else if (
      reflectApply(
        weakSetHas,
        comparedRights,
        [rightValue]
      )
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      comparedRights,
      [rightValue]
    );

    const leftKeys =
      reflectApply(
        objectKeys,
        Object,
        [leftValue]
      );

    const rightKeys =
      reflectApply(
        objectKeys,
        Object,
        [rightValue]
      );

    if (
      leftKeys.length !==
        rightKeys.length
    ) {
      return false;
    }

    for (const key of leftKeys) {
      if (!hasOwn(rightValue, key)) {
        return false;
      }

      const leftDescriptor =
        getOwnPropertyDescriptor(
          leftValue,
          key
        );

      const rightDescriptor =
        getOwnPropertyDescriptor(
          rightValue,
          key
        );

      if (
        leftDescriptor === undefined ||
        rightDescriptor === undefined ||
        !("value" in leftDescriptor) ||
        !("value" in rightDescriptor)
      ) {
        return false;
      }

      stack.push([
        leftDescriptor.value,
        rightDescriptor.value
      ]);
    }
  }

  return true;
}

function findDuplicateAttack(
  retained,
  candidate
) {
  return reflectApply(
    arrayFind,
    retained,
    [
      (existing) =>
        existing.ruleId ===
          candidate.ruleId &&
        isAiDataEqual(
          existing.mutatedOutput,
          candidate.mutatedOutput
        )
    ]
  );
}

function filterGeneratedAttacks(
  validatedAttacks,
  expectedOutput
) {
  const retained = [];
  const discarded = [];

  for (const candidate of validatedAttacks) {
    if (
      isAiDataEqual(
        candidate.mutatedOutput,
        expectedOutput
      )
    ) {
      discarded.push(
        objectFreeze({
          id:
            candidate.id,
          ruleId:
            candidate.ruleId,
          reason:
            "unchanged-output"
        })
      );

      continue;
    }

    const duplicate =
      findDuplicateAttack(
        retained,
        candidate
      );

    if (duplicate !== undefined) {
      discarded.push(
        objectFreeze({
          id:
            candidate.id,
          ruleId:
            candidate.ruleId,
          reason:
            "duplicate-attack",
          duplicateOf:
            duplicate.id
        })
      );

      continue;
    }

    retained.push(candidate);
  }

  return {
    retained:
      objectFreeze(retained),
    discarded:
      objectFreeze(discarded)
  };
}

function compileAllGeneratedAttacks(
  retained
) {
  return reflectApply(
    arrayMap,
    retained,
    [
      (candidate) =>
        compileGeneratedAttack(
          candidate
        )
    ]
  );
}

function buildEmptyAttackResult() {
  return {
    results: [],
    caught: [],
    survivors: []
  };
}

async function runContractAttacks(
  options = {},
  experimentEvidenceRecorder = null
) {
  loadM8ExecutionDependencies();

  const runScope =
    enterCallbackIntrinsicScope();

  try {
  const optionDescriptors =
    captureOptions(options);

  const contractInput =
    readCapturedValue(
      optionDescriptors,
      "contract"
    );

  const input =
    readCapturedValue(
      optionDescriptors,
      "input"
    );

  const expectedOutputInput =
    readCapturedValue(
      optionDescriptors,
      "expectedOutput"
    );

  const evaluator =
    readCapturedValue(
      optionDescriptors,
      "evaluator"
    );

  const generator =
    readCapturedValue(
      optionDescriptors,
      "generator"
    );

  requirePromiseIntrinsicIntegrity();

  requireTrustedCallbacks(
    evaluator,
    generator
  );

  if (!hasOwn(optionDescriptors, "input")) {
    throw new Error(
      "Contract attack options must include input."
    );
  }

  if (
    !hasOwn(
      optionDescriptors,
      "expectedOutput"
    )
  ) {
    throw new Error(
      "Contract attack options must include expectedOutput."
    );
  }

  if (
    !hasOwn(
      optionDescriptors,
      "contract"
    )
  ) {
    throw new Error(
      "Contract attack options must include contract."
    );
  }

  const evaluatorFallbackPrototypes =
    captureEvaluatorFallbackPrototypes(
      expectedOutputInput
    );

  const contract =
    validateConfirmedContract(
      contractInput
    );

  const validatedInput =
    snapshotAiData(
      input,
      "Contract attack input"
    );

  const expectedOutput =
    snapshotAiData(
      expectedOutputInput,
      "Contract attack expectedOutput"
    );

  const evaluatorPrototypePlan =
    buildEvaluatorPrototypePlan(
      evaluatorFallbackPrototypes,
      expectedOutputInput,
      expectedOutput
    );

  const safeEvaluator =
    createSafeEvaluator(
      evaluator,
      evaluatorPrototypePlan
    );

  runPositiveControl(
    safeEvaluator,
    expectedOutput
  );

  const generatorArguments =
    buildGeneratorArguments(
      contract,
      validatedInput,
      expectedOutput
    );

  const generatorInvocation =
    invokeGenerator(
      generator,
      generatorArguments
    );

  let rawGeneratorOutput;

  if (generatorInvocation.isNativePromise) {
    let settledValue;
    let settlementError;
    let rejected = false;

    try {
      settledValue =
        await generatorInvocation.returned;
    } catch (error) {
      rejected = true;
      settlementError = error;
    }

    closeCallbackIntrinsicScope(
      generatorInvocation.scope
    );

    if (
      generatorInvocation.integrityError !==
        null
    ) {
      throw generatorInvocation.integrityError;
    }

    requirePromiseIntrinsicIntegrity();

    if (rejected) {
      throw settlementError;
    }

    rawGeneratorOutput =
      settledValue;
  } else {
    rawGeneratorOutput =
      generatorInvocation.returned;
  }

  if (
    typeof experimentEvidenceRecorder ===
      "function"
  ) {
    try {
      experimentEvidenceRecorder(
        rawGeneratorOutput
      );
    } catch {
      // Experiment evidence is observational only.
      // It must never change legacy M8 behavior.
    }
  }

  const generated =
    validateGeneratorOutput(
      rawGeneratorOutput,
      contract
    );

  const filtered =
    filterGeneratedAttacks(
      generated.attacks,
      expectedOutput
    );

  const generatedAttacks =
    compileAllGeneratedAttacks(
      filtered.retained
    );

  const attackResult =
    generatedAttacks.length === 0
      ? buildEmptyAttackResult()
      : attack(
          safeEvaluator,
          generatedAttacks
        );

  const topFinding =
    attackResult.survivors[0] ||
    null;

  return prepareAsyncRecordReturn({
    version: 1,
    task:
      contract.task,
    baselinePassed:
      true,
    generatedAttacks,
    discardedAttacks:
      filtered.discarded,
    attack:
      attackResult,
    topFinding
  });
  } finally {
    closeCallbackIntrinsicScope(
      runScope
    );
  }
}

module.exports = {
  runContractAttacks
};

experimentIntrinsics.defineProperty(
  module.exports,
  "experimentIntrinsics",
  {
    value: experimentIntrinsics,
    enumerable: true,
    writable: false,
    configurable: false
  }
);
