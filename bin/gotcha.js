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

function runGuidedCommand(args) {
  let runGuided;
  try {
    ({ runGuided } = require("../src/guided-run"));
  } catch (error) {
    fail(errorMessage(error, "Unable to load guided Gotcha run."));
    return;
  }

  Promise.resolve()
    .then(() => runGuided({ args }))
    .catch((error) => {
      fail(
        errorMessage(error, "Guided Gotcha run failed."),
        error && typeof error.exitCode === "number"
          ? error.exitCode
          : 1
      );
    });
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
} else {
  console.error(
    `Unknown command: ${command}`
  );

  console.error(
    "Run `gotcha-ai --help` for usage."
  );

  process.exitCode = 1;
}
