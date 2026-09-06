#!/usr/bin/env node

"use strict";

const path = require("node:path");

function printHelp() {
  console.log("Gotcha");
  console.log("Catch what your AI evals miss.");
  console.log("");
  console.log("Usage:");
  console.log("  gotcha-ai demo");
  console.log("  gotcha-ai init [directory]");
  console.log("  gotcha-ai run [--config path] [--session path]");
  console.log("  gotcha-ai verify <session-path> [--config path]");
  console.log("  gotcha-ai --help");
}

function fail(message, exitCode) {
  console.error(message);
  process.exitCode = exitCode || 1;
}

function errorMessage(error, fallback) {
  return (
    error !== null &&
    typeof error === "object" &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) ? error.message : fallback;
}

function runInit(args) {
  if (args.length > 1) {
    fail("Usage: gotcha-ai init [directory]");
    return;
  }

  const {
    initProject
  } = require("../src/guided-cli-foundation");

  try {
    const result = initProject(args[0]);
    console.log("Gotcha project initialized.");
    console.log(`Config: ${path.relative(process.cwd(), result.configPath) || "gotcha.config.js"}`);
    console.log(`Sessions: ${path.relative(process.cwd(), path.dirname(result.ignorePath)) || ".gotcha"}`);
  } catch (error) {
    fail(errorMessage(error, "Unable to initialize Gotcha project."));
  }
}

function runAsyncGuided(load, args, loadFallback, runFallback) {
  let commandFunction;
  try {
    commandFunction = load();
  } catch (error) {
    fail(errorMessage(error, loadFallback));
    return;
  }

  Promise.resolve()
    .then(() => commandFunction({ args }))
    .catch((error) => {
      fail(
        errorMessage(error, runFallback),
        error && typeof error.exitCode === "number"
          ? error.exitCode
          : 1
      );
    });
}

function runGuidedCommand(args) {
  runAsyncGuided(
    () => require("../src/guided-run").runGuided,
    args,
    "Unable to load guided Gotcha run.",
    "Guided Gotcha run failed."
  );
}

function runVerifyCommand(args) {
  runAsyncGuided(
    () => require("../src/guided-verify").runGuidedVerify,
    args,
    "Unable to load guided Gotcha verification.",
    "Guided Gotcha verification failed."
  );
}

const args = process.argv.slice(2);
const command = args[0];

if (
  command === undefined ||
  command === "--help" ||
  command === "-h"
) {
  printHelp();
} else if (command === "demo") {
  // Preserve the pre-M14 behavior: the legacy demo command keys only on the
  // first CLI token and ignores trailing arguments.
  require("../examples/quickstart");
} else if (command === "init") {
  runInit(args.slice(1));
} else if (command === "run") {
  runGuidedCommand(args.slice(1));
} else if (command === "verify") {
  runVerifyCommand(args.slice(1));
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Run `gotcha-ai --help` for usage.");
  process.exitCode = 1;
}
