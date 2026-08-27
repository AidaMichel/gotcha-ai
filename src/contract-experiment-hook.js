"use strict";

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

  return callback();
}

function authorizeGeneratorOutput() {
  // Compatibility no-op. Generator evidence is captured directly at the wrapper return seam.
}

function notifySnapshotCapture() {
  // Compatibility no-op. ai-data no longer participates in experiment capture.
}

module.exports = {
  authorizeGeneratorOutput,
  notifySnapshotCapture,
  withSnapshotCaptureListener
};
