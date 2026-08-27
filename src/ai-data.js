"use strict";

const core = require("./ai-data-core");
const {
  notifySnapshotCapture
} = require("./contract-experiment-hook");

function snapshotAiData(
  value,
  label = "AI data"
) {
  notifySnapshotCapture(
    value,
    label
  );

  return core.snapshotAiData(
    value,
    label
  );
}

module.exports = {
  cloneAiData: core.cloneAiData,
  freezeAiData: core.freezeAiData,
  snapshotAiData
};
