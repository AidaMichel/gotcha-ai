"use strict";

const {
  AsyncLocalStorage
} = require("node:async_hooks");

const reflectApply = Reflect.apply;
const asyncStorageRun = AsyncLocalStorage.prototype.run;
const asyncStorageGetStore = AsyncLocalStorage.prototype.getStore;
const defineProperty = Object.defineProperty;

const STATE_KEY = Symbol.for(
  "gotcha-ai.contract-experiment-hook.v1"
);

let state = globalThis[STATE_KEY];

if (
  state === undefined ||
  state === null ||
  typeof state !== "object" ||
  !(state.storage instanceof AsyncLocalStorage)
) {
  state = {
    storage: new AsyncLocalStorage()
  };

  defineProperty(
    globalThis,
    STATE_KEY,
    {
      value: state,
      writable: false,
      enumerable: false,
      configurable: false
    }
  );
}

function withSnapshotCaptureListener(
  listener,
  callback
) {
  if (typeof listener !== "function") {
    throw new TypeError(
      "Snapshot capture listener must be a function."
    );
  }

  if (typeof callback !== "function") {
    throw new TypeError(
      "Snapshot capture callback must be a function."
    );
  }

  const scope = {
    listener,
    authorizedGeneratorOutput: undefined,
    generatorOutputAuthorized: false,
    generatorOutputCaptured: false
  };

  return reflectApply(
    asyncStorageRun,
    state.storage,
    [scope, callback]
  );
}

function authorizeGeneratorOutput(value) {
  const scope = reflectApply(
    asyncStorageGetStore,
    state.storage,
    []
  );

  if (scope === undefined) {
    return;
  }

  scope.authorizedGeneratorOutput = value;
  scope.generatorOutputAuthorized = true;
}

function notifySnapshotCapture(
  value,
  label
) {
  const scope = reflectApply(
    asyncStorageGetStore,
    state.storage,
    []
  );

  if (scope === undefined) {
    return;
  }

  if (label === "Generator output") {
    if (
      scope.generatorOutputAuthorized !== true ||
      scope.generatorOutputCaptured === true ||
      value !== scope.authorizedGeneratorOutput
    ) {
      return;
    }

    scope.generatorOutputCaptured = true;
  }

  scope.listener(
    value,
    label
  );
}

module.exports = {
  authorizeGeneratorOutput,
  notifySnapshotCapture,
  withSnapshotCaptureListener
};
