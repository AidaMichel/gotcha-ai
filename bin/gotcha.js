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
  console.log("  gotcha-ai --help");
}

function fail(message, exitCode) {
  console.error(message);
  process.exitCode = exitCode || 1;
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
    const message =
      error !== null &&
      typeof error === "object" &&
      typeof error.message === "string" &&
      error.message.length > 0
        ? error.message
        : "Unable to initialize Gotcha project.";
    fail(message);
  }
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
  if (args.length !== 1) {
    fail("Usage: gotcha-ai demo");
  } else {
    require("../examples/quickstart");
  }
} else if (command === "init") {
  runInit(args.slice(1));
} else {
  console.error(
    `Unknown command: ${command}`
  );

  console.error(
    "Run `gotcha-ai --help` for usage."
  );

  process.exitCode = 1;
}
