const example = {
  userInput: "Schedule a meeting with Sara on Tuesday at 3 PM.",
  expectedOutput: "Meeting scheduled with Sara on Tuesday at 3 PM.",
  expected: {
    person: "Sara",
    day: "Tuesday",
    time: "3 PM",
    location: null
  }
};

// ----------------------------------------
// OUTPUT PARSERS
// ----------------------------------------

// Extract the actual scheduled time.
//
// Example:
// "Meeting scheduled ... at 4 PM (requested: 3 PM)."
//
// This returns "4 PM", not "3 PM".
function parseScheduledMeeting(output) {
  const match = output.match(
    /\bMeeting scheduled with (.+?) on ([A-Za-z]+)(?: at (\d{1,2}(?::\d{2})?\s*(?:AM|PM)))?/i
  );

  if (!match) {
    return null;
  }

  return {
    fullMatch: match[0],
    index: match.index,
    person: match[1].trim(),
    day: match[2],
    time: match[3]
      ? match[3]
          .replace(/\s+/g, " ")
          .toUpperCase()
      : null
  };
}

function extractScheduledTime(output) {
  const scheduled =
    parseScheduledMeeting(output);

  return scheduled
    ? scheduled.time
    : null;
}

function extractScheduledPerson(output) {
  const scheduled =
    parseScheduledMeeting(output);

  return scheduled
    ? scheduled.person
    : null;
}

function extractScheduledDay(output) {
  const scheduled =
    parseScheduledMeeting(output);

  return scheduled
    ? scheduled.day
    : null;
}

function mutateScheduledMeeting(
  output,
  changes
) {
  const scheduled =
    parseScheduledMeeting(output);

  if (!scheduled) {
    throw new Error(
      "Could not find the scheduled meeting clause."
    );
  }

  const person =
    changes.person ?? scheduled.person;

  const day =
    changes.day ?? scheduled.day;

  const hasTimeChange =
    Object.prototype.hasOwnProperty.call(
      changes,
      "time"
    );

  const time = hasTimeChange
    ? changes.time
    : scheduled.time;

  let replacement =
    `Meeting scheduled with ${person} on ${day}`;

  if (time !== null) {
    replacement += ` at ${time}`;
  }

  return (
    output.slice(0, scheduled.index) +
    replacement +
    output.slice(
      scheduled.index +
        scheduled.fullMatch.length
    )
  );
}

function chooseDifferentTime(time) {
  const match = time.trim().match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
  );

  if (!match) {
    throw new Error(`Unsupported time format: ${time}`);
  }

  let hour = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();

  if (
    hour < 1 ||
    hour > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time: ${time}`);
  }

  let hour24 =
    (hour % 12) + (meridiem === "PM" ? 12 : 0);

  hour24 = (hour24 + 1) % 24;

  const nextMeridiem =
    hour24 >= 12 ? "PM" : "AM";

  hour = hour24 % 12;

  if (hour === 0) {
    hour = 12;
  }

  const minutePart = match[2]
    ? `:${String(minutes).padStart(2, "0")}`
    : "";

  return `${hour}${minutePart} ${nextMeridiem}`;
}

function chooseDifferentPerson(person) {
  const normalizedPerson =
    person.trim().toLowerCase();

  const candidates = [
    "Maya",
    "Omar",
    "Lina",
    "Noah"
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate.toLowerCase() !== normalizedPerson
    ) || "Someone Else"
  );
}

function chooseDifferentDay(day) {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  const index = days.findIndex(
    (candidate) =>
      candidate.toLowerCase() ===
      day.trim().toLowerCase()
  );

  if (index === -1) {
    return "Monday";
  }

  return days[(index + 1) % days.length];
}

function extractScheduledLocation(output) {
  const heldLocation = output.match(
    /\b(?:meeting\s+)?(?:will\s+be\s+held|is\s+held|held)\s+in\s+(.+?)(?=[.,]|$)/i
  );

  if (heldLocation) {
    return heldLocation[1].trim();
  }

  const directLocation = output.match(
    /\bMeeting scheduled with .+? on [A-Za-z]+(?: at \d{1,2}(?::\d{2})?\s*(?:AM|PM)(?:\s*\([^)]*\))?)?\s*,?\s+in\s+(.+?)(?=[.,]|$)/i
  );

  return directLocation
    ? directLocation[1].trim()
    : null;
}

// ----------------------------------------
// MUTATION ENGINE
// ----------------------------------------

function generateMutations(output) {
  const { person, day, time } = example.expected;

  const wrongTime =
    chooseDifferentTime(time);

  const wrongPerson =
    chooseDifferentPerson(person);

  const wrongDay =
    chooseDifferentDay(day);

  return [
    {
      id: "wrong-time",
      type: "value-substitution",
      description: "Changes the requested meeting time.",

      // This deliberately repeats the requested time elsewhere.
      // A naive output.includes("3 PM") check would incorrectly pass it.
      output: mutateScheduledMeeting(
        output,
        {
          time:
            `${wrongTime} (requested: ${time})`
        }
      ),

      severity: 1.0,
      realism: 1.0,
      subtlety: 0.95,
      novelty: 1.0,
      fixability: 1.0,

      protection:
        "The actual scheduled meeting time must exactly match the time requested by the user.",

      protectionCheck(candidateOutput) {
        return (
          extractScheduledTime(candidateOutput) ===
          time.toUpperCase()
        );
      }
    },

    {
      id: "wrong-person",
      type: "entity-substitution",
      description: "Changes the requested person.",

      output: mutateScheduledMeeting(
        output,
        {
          person: wrongPerson
        }
      ),

      severity: 1.0,
      realism: 0.9,
      subtlety: 0.8,
      novelty: 1.0,
      fixability: 1.0,

      protection:
        "The scheduled meeting person must match the person requested by the user.",

      protectionCheck(candidateOutput) {
        return (
          extractScheduledPerson(candidateOutput) === person
        );
      }
    },

    {
      id: "wrong-day",
      type: "date-substitution",
      description: "Changes the requested day.",

      output: mutateScheduledMeeting(
        output,
        {
          day: wrongDay
        }
      ),

      severity: 1.0,
      realism: 0.95,
      subtlety: 0.85,
      novelty: 1.0,
      fixability: 1.0,

      protection:
        "The scheduled meeting day must match the day requested by the user.",

      protectionCheck(candidateOutput) {
        return extractScheduledDay(candidateOutput) === day;
      }
    },

    {
      id: "missing-time",
      type: "missing-information",
      description: "Removes the explicitly requested time.",

      // Remove only the time from the supplied output.
      // Everything else in the output is preserved.
      output: mutateScheduledMeeting(
        output,
        {
          time: null
        }
      ),

      severity: 0.9,
      realism: 0.95,
      subtlety: 0.85,
      novelty: 0.9,
      fixability: 0.95,

      protection:
        "An explicitly requested meeting time must be present in the scheduled result.",

      protectionCheck(candidateOutput) {
        return extractScheduledTime(candidateOutput) !== null;
      }
    },

    {
      id: "unsupported-location",
      type: "unsupported-information",
      description:
        "Invents a meeting location that the user never requested.",

      // Add the unsupported detail to the supplied output
      // rather than rebuilding the whole response.
      output: output.endsWith(".")
        ? `${output.slice(0, -1)}, and will be held in Conference Room B.`
        : `${output}, and will be held in Conference Room B.`,

      severity: 0.65,
      realism: 0.8,
      subtlety: 0.7,
      novelty: 0.85,
      fixability: 0.75,

      protection:
        "The assistant must not invent a meeting location that the user did not provide.",

      protectionCheck(candidateOutput) {
        const actualLocation =
          extractScheduledLocation(candidateOutput);

        if (example.expected.location === null) {
          return actualLocation === null;
        }

        return (
          actualLocation === example.expected.location
        );
      }
    }
  ];
}

// ----------------------------------------
// CURRENT EVALUATOR
// ----------------------------------------

// Deliberately weak.
//
// It checks only whether the expected person and day
// appear somewhere in the output.
function weakEvaluator(output) {
  const hasCorrectPerson =
    output.includes(example.expected.person);

  const hasCorrectDay =
    output.includes(example.expected.day);

  return hasCorrectPerson && hasCorrectDay;
}

// ----------------------------------------
// SURVIVOR RANKER
// ----------------------------------------

function calculateRankScore(mutation) {
  return (
    0.30 * mutation.severity +
    0.25 * mutation.realism +
    0.20 * mutation.subtlety +
    0.15 * mutation.novelty +
    0.10 * mutation.fixability
  );
}

// ----------------------------------------
// ATTACK ENGINE
// ----------------------------------------

function attack(evaluator, mutations) {
  const results = mutations.map((mutation) => {
    const passed = evaluator(mutation.output);

    return {
      ...mutation,
      evaluatorResult: passed ? "PASS" : "FAIL",
      survived: passed
    };
  });

  const caught = results.filter(
    (result) => !result.survived
  );

  const survivors = results
    .filter((result) => result.survived)
    .map((survivor) => ({
      ...survivor,
      rankScore: calculateRankScore(survivor)
    }))
    .sort(
      (a, b) => b.rankScore - a.rankScore
    );

  return {
    results,
    caught,
    survivors
  };
}

// ----------------------------------------
// FIRST ATTACK
// ----------------------------------------

const mutations = generateMutations(
  example.expectedOutput
);

const before = attack(
  weakEvaluator,
  mutations
);

console.log("\n================================");
console.log("GOTCHA — ATTACK");
console.log("================================\n");

console.log("User:");
console.log(example.userInput);

console.log("\nExpected:");
console.log(example.expectedOutput);

console.log(
  `\nAttacks generated: ${mutations.length}`
);

console.log("\n================================");
console.log("ATTACK RESULTS");
console.log("================================");

before.results.forEach((result, index) => {
  console.log(`\n${index + 1}. ${result.id}`);
  console.log(`Type: ${result.type}`);
  console.log(`Mutation: ${result.output}`);

  if (result.survived) {
    console.log("Result: 🚨 SURVIVED");
  } else {
    console.log("Result: ✅ CAUGHT");
  }
});

// ----------------------------------------
// BEFORE FIX
// ----------------------------------------

console.log("\n================================");
console.log("BEFORE FIX");
console.log("================================\n");

console.log(`Caught: ${before.caught.length}`);
console.log(
  `Survived: ${before.survivors.length}`
);

before.survivors.forEach(
  (survivor, index) => {
    console.log(
      `\n#${index + 1} ${survivor.id} — score ${survivor.rankScore.toFixed(2)}`
    );

    console.log(survivor.output);
  }
);

// ----------------------------------------
// TOP GOTCHA
// ----------------------------------------

const topFinding = before.survivors[0];

// The evaluator may already catch every mutation.
// In that case, there is nothing to rank or fix.
if (!topFinding) {
  console.log("\n================================");
  console.log("RESULT");
  console.log("================================\n");

  console.log(
    "✅ No current mutations survived."
  );

  console.log(
    "There is no Top Gotcha to fix or re-attack."
  );

  process.exit(0);
}

console.log("\n================================");
console.log("🚨 TOP GOTCHA");
console.log("================================\n");

console.log(`Finding: ${topFinding.id}`);
console.log(topFinding.output);

console.log("\nWhy it matters:");
console.log(topFinding.description);

// ----------------------------------------
// CATCH THIS
// ----------------------------------------

console.log("\n================================");
console.log("CATCH THIS");
console.log("================================\n");

// The protection now comes from the actual
// finding selected by the Survivor Ranker.
const proposedProtection =
  topFinding.protection;

console.log("Proposed protection:");
console.log(proposedProtection);

// ----------------------------------------
// IMPROVED EVALUATOR
// ----------------------------------------

// Keep everything the original evaluator already
// checked, then add the protection that belongs
// specifically to the selected Top Gotcha.
function improvedEvaluator(output) {
  const passesExistingChecks =
    weakEvaluator(output);

  const passesNewProtection =
    topFinding.protectionCheck(output);

  return (
    passesExistingChecks &&
    passesNewProtection
  );
}

// ----------------------------------------
// POSITIVE CONTROL
// ----------------------------------------

const expectedOutputStillPasses =
  improvedEvaluator(example.expectedOutput);

console.log("\n================================");
console.log("POSITIVE CONTROL");
console.log("================================\n");

if (!expectedOutputStillPasses) {
  console.log(
    "❌ The new protection rejects the known-good output."
  );

  console.log(
    "Gotcha will not claim an improvement."
  );

  process.exit(1);
}

console.log(
  "✅ Known-good output still passes the improved evaluator."
);

// ----------------------------------------
// RE-ATTACK EVERYTHING
// ----------------------------------------

const after = attack(
  improvedEvaluator,
  mutations
);

console.log("\n================================");
console.log("GOTCHA — RE-ATTACK");
console.log("================================\n");

after.results.forEach((result, index) => {
  console.log(`\n${index + 1}. ${result.id}`);

  if (result.survived) {
    console.log(
      "Result: 🚨 STILL SURVIVED"
    );
  } else {
    console.log("Result: ✅ CAUGHT");
  }
});

// ----------------------------------------
// FINAL RESULT
// ----------------------------------------

console.log("\n================================");
console.log("RESULT");
console.log("================================\n");

console.log("Before protection:");
console.log(`Caught: ${before.caught.length}`);
console.log(
  `Survived: ${before.survivors.length}`
);

console.log("\nAfter protection:");
console.log(`Caught: ${after.caught.length}`);
console.log(
  `Survived: ${after.survivors.length}`
);

const improvement =
  before.survivors.length -
  after.survivors.length;

console.log(
  `\n✅ ${improvement} additional bad behavior(s) are now caught.`
);

if (after.survivors.length > 0) {
  console.log(
    "\n⚠️ Gotcha is not claiming the system is perfect."
  );

  console.log(
    `${after.survivors.length} blind spot(s) still remain:`
  );

  after.survivors.forEach((survivor) => {
    console.log(`- ${survivor.id}`);
  });
} else {
  console.log(
    "\n✅ No current mutations survived."
  );
}
