"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SESSION_VERSION = 1;
const SESSION_KIND = "gotcha-guided-session";
const SESSION_KEYS = [
  "version",
  "kind",
  "experiment",
  "sourceAttackId",
  "proposal"
];

function sessionError(message) {
  return new TypeError(message);
}

function primitiveJson(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    !Object.is(value, -0)
  ) {
    return JSON.stringify(value);
  }

  throw sessionError("Session contains unsupported data.");
}

function ordinaryEnumerableDataDescriptor(descriptor) {
  return (
    descriptor !== undefined &&
    Object.prototype.hasOwnProperty.call(descriptor, "value") &&
    !Object.prototype.hasOwnProperty.call(descriptor, "get") &&
    !Object.prototype.hasOwnProperty.call(descriptor, "set") &&
    descriptor.enumerable === true
  );
}

function recordEntries(value) {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  const entries = [];

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string") {
      throw sessionError("Session records must not contain symbol keys.");
    }

    const descriptor = descriptors[key];
    if (!ordinaryEnumerableDataDescriptor(descriptor)) {
      throw sessionError("Session records must contain enumerable data properties only.");
    }

    entries.push({ key, value: descriptor.value });
  }

  return entries;
}

function arrayEntries(value) {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const length = value.length;

  if (ownKeys.length !== length + 1 || ownKeys[length] !== "length") {
    throw sessionError("Session arrays must be dense and contain no extra properties.");
  }

  const entries = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (ownKeys[index] !== key) {
      throw sessionError("Session arrays must preserve ordinary index order.");
    }
    const descriptor = descriptors[key];
    if (!ordinaryEnumerableDataDescriptor(descriptor)) {
      throw sessionError("Session arrays must contain enumerable data elements only.");
    }
    entries[index] = descriptor.value;
  }

  return entries;
}

function encodeJsonIterative(root) {
  const chunks = [];
  const seen = new WeakSet();
  const stack = [{ type: "value", value: root }];

  while (stack.length > 0) {
    const frame = stack.pop();

    if (frame.type === "text") {
      chunks.push(frame.value);
      continue;
    }

    const value = frame.value;

    if (value === null || typeof value !== "object") {
      chunks.push(primitiveJson(value));
      continue;
    }

    if (seen.has(value)) {
      throw sessionError("Session data must be a tree without cycles or shared container identities.");
    }
    seen.add(value);

    if (Array.isArray(value)) {
      const entries = arrayEntries(value);
      stack.push({ type: "text", value: "]" });
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (index < entries.length - 1) {
          stack.push({ type: "text", value: "," });
        }
        stack.push({ type: "value", value: entries[index] });
      }
      stack.push({ type: "text", value: "[" });
      continue;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw sessionError("Session records must use an ordinary or null prototype.");
    }

    const entries = recordEntries(value);
    stack.push({ type: "text", value: "}" });
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (index < entries.length - 1) {
        stack.push({ type: "text", value: "," });
      }
      stack.push({ type: "value", value: entry.value });
      stack.push({ type: "text", value: ":" });
      stack.push({ type: "text", value: JSON.stringify(entry.key) });
    }
    stack.push({ type: "text", value: "{" });
  }

  return chunks.join("");
}

function exactSessionEnvelope(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== SESSION_KEYS.length) return false;

  for (let index = 0; index < keys.length; index += 1) {
    if (typeof keys[index] !== "string") return false;

    let expected = false;
    for (let keyIndex = 0; keyIndex < SESSION_KEYS.length; keyIndex += 1) {
      if (keys[index] === SESSION_KEYS[keyIndex]) {
        expected = true;
        break;
      }
    }
    if (!expected) return false;
  }

  for (let index = 0; index < SESSION_KEYS.length; index += 1) {
    if (!ordinaryEnumerableDataDescriptor(descriptors[SESSION_KEYS[index]])) {
      return false;
    }
  }

  return (
    descriptors.version.value === SESSION_VERSION &&
    descriptors.kind.value === SESSION_KIND
  );
}

function parseSessionText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw sessionError("Session file is not valid JSON.");
  }

  if (!exactSessionEnvelope(parsed)) {
    throw sessionError("Session file has an invalid M14 envelope.");
  }

  return parsed;
}

function readSession(sessionPath) {
  const resolved = path.resolve(sessionPath);
  let text;
  try {
    text = fs.readFileSync(resolved, "utf8");
  } catch {
    throw sessionError(`Unable to read session: ${resolved}`);
  }
  return parseSessionText(text);
}

function targetExists(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

function randomId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString("hex");
}

function chooseDefaultTarget(baseDirectory) {
  const sessionDirectory = path.join(baseDirectory, ".gotcha");
  fs.mkdirSync(sessionDirectory, { recursive: true });

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const candidate = path.join(
      sessionDirectory,
      `session-${randomId()}.json`
    );
    if (!targetExists(candidate)) return candidate;
  }

  throw sessionError("Unable to allocate a unique Gotcha session path.");
}

function publishCompleteFile(targetPath, encoded) {
  const directory = path.dirname(targetPath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(targetPath)}.${randomId()}.tmp`
  );

  let fd = null;
  try {
    fd = fs.openSync(temporaryPath, "wx", 0o600);
    fs.writeFileSync(fd, encoded, "utf8");
    if (typeof fs.fsyncSync === "function") fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    // Hard-linking a complete same-directory temporary file publishes the
    // final name atomically without overwriting an existing target.
    fs.linkSync(temporaryPath, targetPath);
    fs.unlinkSync(temporaryPath);
  } catch (error) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.unlinkSync(temporaryPath); } catch {}

    if (error && error.code === "EEXIST") {
      throw sessionError(`Session already exists: ${targetPath}`);
    }
    throw error;
  }
}

function writeSession(session, options = {}) {
  if (!exactSessionEnvelope(session)) {
    throw sessionError("Session object has an invalid M14 envelope.");
  }

  const encoded = encodeJsonIterative(session);
  const baseDirectory = path.resolve(options.baseDirectory || process.cwd());
  const explicit = options.sessionPath !== undefined;
  const targetPath = explicit
    ? path.resolve(options.sessionPath)
    : chooseDefaultTarget(baseDirectory);

  if (explicit) {
    if (targetExists(targetPath)) {
      throw sessionError(`Session already exists: ${targetPath}`);
    }
    const parent = path.dirname(targetPath);
    if (!targetExists(parent)) {
      throw sessionError(`Session directory does not exist: ${parent}`);
    }
  }

  publishCompleteFile(targetPath, encoded);
  return targetPath;
}

module.exports = {
  SESSION_VERSION,
  SESSION_KIND,
  SESSION_KEYS,
  encodeJsonIterative,
  parseSessionText,
  readSession,
  writeSession
};
