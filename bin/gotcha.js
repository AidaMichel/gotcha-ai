#!/usr/bin/env node

"use strict";

function printHelp() {
  console.log("Gotcha");
  console.log("Catch what your AI evals miss.");
  console.log("");
  console.log("Usage:");
  console.log("  gotcha-ai demo");
  console.log("  gotcha-ai --help");
}

const command =
  process.argv[2];

if (
  command === undefined ||
  command === "--help" ||
  command === "-h"
) {
  printHelp();
} else if (command === "demo") {
  require("../examples/quickstart");
} else {
  console.error(
    `Unknown command: ${command}`
  );

  console.error(
    "Run `gotcha-ai --help` for usage."
  );

  process.exitCode = 1;
}
