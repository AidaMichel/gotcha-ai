"use strict";

let snapshotCaptureListener = null;

function setSnapshotCaptureListener(listener) {
  if (
    listener !== null &&
    typeof listener !== "function"
  ) {
    throw new TypeError(
      "Snapshot capture listener must be a function or null."
    );
  }

  snapshotCaptureListener = listener;
}

function notifySnapshotCapture(
  value,
  label
) {
  const listener = snapshotCaptureListener;

  if (listener !== null) {
    listener(
      value,
      label
    );
  }
}

module.exports = {
  notifySnapshotCapture,
  setSnapshotCaptureListener
};
