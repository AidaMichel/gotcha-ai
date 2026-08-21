"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  cloneAiData,
  freezeAiData,
  snapshotAiData
} = require("../src/ai-data");

test(
  "cloneAiData accepts AI-safe primitives",
  () => {
    assert.equal(
      cloneAiData(null),
      null
    );

    assert.equal(
      cloneAiData("hello"),
      "hello"
    );

    assert.equal(
      cloneAiData(true),
      true
    );

    assert.equal(
      cloneAiData(false),
      false
    );

    assert.equal(
      cloneAiData(42),
      42
    );

    assert.equal(
      cloneAiData(0.5),
      0.5
    );
  }
);

test(
  "cloneAiData normalizes negative zero",
  () => {
    const value =
      cloneAiData(-0);

    assert.equal(
      Object.is(
        value,
        -0
      ),
      false
    );

    assert.equal(
      value,
      0
    );
  }
);

test(
  "cloneAiData clones nested AI-safe data",
  () => {
    const source = {
      person: "Sara",
      active: true,
      score: 0.9,
      details: {
        day: "Tuesday",
        time: "3 PM"
      },
      values: [
        1,
        null,
        {
          ok: true
        }
      ]
    };

    const cloned =
      cloneAiData(
        source,
        "Case input"
      );

    assert.deepEqual(
      cloned,
      source
    );

    assert.notStrictEqual(
      cloned,
      source
    );

    assert.notStrictEqual(
      cloned.details,
      source.details
    );

    assert.notStrictEqual(
      cloned.values,
      source.values
    );

    assert.notStrictEqual(
      cloned.values[2],
      source.values[2]
    );
  }
);

test(
  "cloneAiData creates an isolated copy",
  () => {
    const source = {
      nested: {
        value: 1
      }
    };

    const cloned =
      cloneAiData(source);

    cloned.nested.value = 2;

    assert.equal(
      source.nested.value,
      1
    );

    assert.equal(
      cloned.nested.value,
      2
    );
  }
);

test(
  "cloneAiData accepts null-prototype plain objects",
  () => {
    const source =
      Object.create(null);

    source.value = 1;

    const cloned =
      cloneAiData(source);

    assert.equal(
      cloned.value,
      1
    );

    assert.equal(
      Object.getPrototypeOf(
        cloned
      ),
      Object.prototype
    );
  }
);

test(
  "cloneAiData handles shared references as data",
  () => {
    const shared = {
      value: 1
    };

    const source = {
      a: shared,
      b: shared
    };

    const cloned =
      cloneAiData(source);

    assert.deepEqual(
      cloned.a,
      {
        value: 1
      }
    );

    assert.deepEqual(
      cloned.b,
      {
        value: 1
      }
    );

    assert.notStrictEqual(
      cloned.a,
      shared
    );

    assert.notStrictEqual(
      cloned.b,
      shared
    );
  }
);

test(
  "snapshotAiData returns deeply frozen isolated data",
  () => {
    const source = {
      nested: {
        value: 1
      },
      list: [
        {
          value: 2
        }
      ]
    };

    const snapshot =
      snapshotAiData(source);

    assert.notStrictEqual(
      snapshot,
      source
    );

    assert.equal(
      Object.isFrozen(
        snapshot
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        snapshot.nested
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        snapshot.list
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        snapshot.list[0]
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        source
      ),
      false
    );
  }
);

test(
  "cloneAiData rejects undefined",
  () => {
    assert.throws(
      () =>
        cloneAiData({
          value: undefined
        }),
      /must not contain undefined/
    );
  }
);

test(
  "cloneAiData rejects functions",
  () => {
    assert.throws(
      () =>
        cloneAiData({
          value() {}
        }),
      /must not contain functions/
    );
  }
);

test(
  "cloneAiData rejects symbol values",
  () => {
    assert.throws(
      () =>
        cloneAiData({
          value:
            Symbol("unsafe")
        }),
      /must not contain symbols/
    );
  }
);

test(
  "cloneAiData rejects bigint values",
  () => {
    assert.throws(
      () =>
        cloneAiData({
          value: 1n
        }),
      /must not contain bigint/
    );
  }
);

test(
  "cloneAiData rejects non-finite numbers",
  () => {
    for (
      const value of [
        NaN,
        Infinity,
        -Infinity
      ]
    ) {
      assert.throws(
        () =>
          cloneAiData({
            value
          }),
        /finite number/
      );
    }
  }
);

test(
  "cloneAiData rejects top-level Proxy without invoking traps",
  () => {
    let trapCalls = 0;

    const proxy =
      new Proxy(
        {},
        {
          getPrototypeOf() {
            trapCalls += 1;

            return Object.prototype;
          },

          ownKeys() {
            trapCalls += 1;

            return [];
          }
        }
      );

    assert.throws(
      () =>
        cloneAiData(
          proxy,
          "Case input"
        ),
      /must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "cloneAiData rejects nested Proxy without invoking traps",
  () => {
    let trapCalls = 0;

    const proxy =
      new Proxy(
        {
          value: 1
        },
        {
          getPrototypeOf() {
            trapCalls += 1;

            return Object.prototype;
          },

          ownKeys() {
            trapCalls += 1;

            return [
              "value"
            ];
          }
        }
      );

    assert.throws(
      () =>
        cloneAiData({
          nested: proxy
        }),
      /must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "cloneAiData rejects accessor properties without invoking getters",
  () => {
    let getterCalls = 0;

    const source = {};

    Object.defineProperty(
      source,
      "danger",
      {
        enumerable: true,

        get() {
          getterCalls += 1;

          return 42;
        }
      }
    );

    assert.throws(
      () =>
        cloneAiData(source),
      /accessor properties/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "cloneAiData rejects nested accessor properties without invoking getters",
  () => {
    let getterCalls = 0;

    const nested = {};

    Object.defineProperty(
      nested,
      "danger",
      {
        enumerable: true,

        get() {
          getterCalls += 1;

          return "boom";
        }
      }
    );

    assert.throws(
      () =>
        cloneAiData({
          nested
        }),
      /accessor properties/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "cloneAiData rejects sparse arrays",
  () => {
    const sparse =
      new Array(3);

    sparse[0] = "a";
    sparse[2] = "c";

    assert.throws(
      () =>
        cloneAiData(sparse),
      /must not be sparse/
    );
  }
);

test(
  "cloneAiData rejects accessor-backed array elements without invoking getters",
  () => {
    let getterCalls = 0;

    const value = [
      "safe"
    ];

    Object.defineProperty(
      value,
      "0",
      {
        enumerable: true,
        configurable: true,

        get() {
          getterCalls += 1;

          return "unsafe";
        }
      }
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /accessor properties/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "cloneAiData rejects extra named array properties",
  () => {
    const value = [
      "a"
    ];

    value.extra =
      "not array data";

    assert.throws(
      () =>
        cloneAiData(value),
      /indexed elements only/
    );
  }
);

test(
  "cloneAiData rejects non-enumerable object properties",
  () => {
    const value = {
      visible: 1
    };

    Object.defineProperty(
      value,
      "hidden",
      {
        value: 2,
        enumerable: false
      }
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /non-enumerable own properties/
    );
  }
);

test(
  "cloneAiData rejects non-enumerable array elements",
  () => {
    const value = [
      "a"
    ];

    Object.defineProperty(
      value,
      "0",
      {
        value: "a",
        enumerable: false,
        configurable: true,
        writable: true
      }
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /non-enumerable array elements/
    );
  }
);

test(
  "cloneAiData rejects symbol-keyed object properties",
  () => {
    const value = {
      visible: 1
    };

    value[
      Symbol("hidden")
    ] = 2;

    assert.throws(
      () =>
        cloneAiData(value),
      /symbol-keyed properties/
    );
  }
);

test(
  "cloneAiData rejects symbol-keyed array properties",
  () => {
    const value = [
      "a"
    ];

    value[
      Symbol("hidden")
    ] = 2;

    assert.throws(
      () =>
        cloneAiData(value),
      /symbol-keyed properties/
    );
  }
);

test(
  "cloneAiData rejects custom class instances",
  () => {
    class Example {
      constructor() {
        this.value = 1;
      }
    }

    assert.throws(
      () =>
        cloneAiData(
          new Example()
        ),
      /plain object/
    );
  }
);

test(
  "cloneAiData rejects Date",
  () => {
    assert.throws(
      () =>
        cloneAiData(
          new Date()
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects Map",
  () => {
    assert.throws(
      () =>
        cloneAiData(
          new Map([
            [
              "a",
              1
            ]
          ])
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects Set",
  () => {
    assert.throws(
      () =>
        cloneAiData(
          new Set([
            1
          ])
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects RegExp",
  () => {
    assert.throws(
      () =>
        cloneAiData(
          /unsafe/
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects Promise",
  () => {
    assert.throws(
      () =>
        cloneAiData(
          Promise.resolve(1)
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects Buffer",
  () => {
    assert.throws(
      () =>
        cloneAiData(
          Buffer.from("unsafe")
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects objects with custom prototypes",
  () => {
    const prototype = {
      inherited: true
    };

    const value =
      Object.create(
        prototype
      );

    value.own = 1;

    assert.throws(
      () =>
        cloneAiData(value),
      /plain object/
    );
  }
);

test(
  "cloneAiData rejects Array subclasses",
  () => {
    class CustomArray
      extends Array {}

    const value =
      new CustomArray(
        "a",
        "b"
      );

    assert.throws(
      () =>
        cloneAiData(value),
      /ordinary array/
    );
  }
);

test(
  "cloneAiData rejects direct cycles",
  () => {
    const value = {};

    value.self =
      value;

    assert.throws(
      () =>
        cloneAiData(value),
      /cyclic references/
    );
  }
);

test(
  "cloneAiData rejects deep cycles",
  () => {
    const first = {};
    const second = {};
    const third = {};

    first.second =
      second;

    second.third =
      third;

    third.first =
      first;

    assert.throws(
      () =>
        cloneAiData(first),
      /cyclic references/
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered Date objects",
  () => {
    const value =
      new Date();

    Object.setPrototypeOf(
      value,
      Object.prototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /plain object|unsupported/
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered Map objects",
  () => {
    const value =
      new Map();

    Object.setPrototypeOf(
      value,
      Object.prototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /plain object|unsupported/
    );
  }
);


test(
  "cloneAiData rejects prototype-tampered Set objects",
  () => {
    const value =
      new Set([1]);

    Object.setPrototypeOf(
      value,
      Object.prototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered RegExp objects",
  () => {
    const value =
      /unsafe/;

    Object.setPrototypeOf(
      value,
      Object.prototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered Promise objects",
  () => {
    const value =
      Promise.resolve(1);

    Object.setPrototypeOf(
      value,
      Object.prototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered Buffer objects",
  () => {
    const value =
      Buffer.from("unsafe");

    Object.setPrototypeOf(
      value,
      Object.prototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /unsupported runtime object/
    );
  }
);

test(
  "cloneAiData preserves shared aliases without amplification",
  () => {
    let source = {
      leaf: true
    };

    const levels = 12;

    for (
      let level = 0;
      level < levels;
      level += 1
    ) {
      source = {
        left: source,
        right: source
      };
    }

    const cloned =
      cloneAiData(source);

    assert.notStrictEqual(
      cloned,
      source
    );

    let current =
      cloned;

    for (
      let level = 0;
      level < levels;
      level += 1
    ) {
      assert.strictEqual(
        current.left,
        current.right
      );

      current =
        current.left;
    }

    const seen =
      new WeakSet();

    let uniqueObjects = 0;

    const stack = [
      cloned
    ];

    while (
      stack.length > 0
    ) {
      const value =
        stack.pop();

      if (
        value === null ||
        typeof value !== "object" ||
        seen.has(value)
      ) {
        continue;
      }

      seen.add(value);
      uniqueObjects += 1;

      for (
        const child of
          Object.values(value)
      ) {
        stack.push(child);
      }
    }

    assert.equal(
      uniqueObjects,
      levels + 1
    );

    assert.notStrictEqual(
      cloned.left,
      source.left
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered host runtime objects",
  () => {
    const candidates = [];

    if (
      typeof AbortController ===
        "function"
    ) {
      candidates.push([
        "AbortController",
        new AbortController()
      ]);
    }

    if (
      typeof CountQueuingStrategy ===
        "function"
    ) {
      candidates.push([
        "CountQueuingStrategy",
        new CountQueuingStrategy({
          highWaterMark: 1
        })
      ]);
    }

    if (
      typeof ByteLengthQueuingStrategy ===
        "function"
    ) {
      candidates.push([
        "ByteLengthQueuingStrategy",
        new ByteLengthQueuingStrategy({
          highWaterMark: 1
        })
      ]);
    }

    try {
      const {
        PerformanceObserver
      } = require(
        "node:perf_hooks"
      );

      candidates.push([
        "PerformanceObserver",
        new PerformanceObserver(
          () => {}
        )
      ]);
    } catch {}

    if (
      globalThis.crypto
    ) {
      candidates.push([
        "Crypto",
        globalThis.crypto
      ]);
    }

    if (
      globalThis.navigator
    ) {
      candidates.push([
        "Navigator",
        globalThis.navigator
      ]);
    }

    for (
      const [
        name,
        value
      ] of candidates
    ) {
      const originalPrototype =
        Object.getPrototypeOf(
          value
        );

      try {
        Object.setPrototypeOf(
          value,
          Object.prototype
        );

        assert.throws(
          () =>
            cloneAiData(
              value,
              name
            ),
          /unsupported runtime object/
        );
      } finally {
        Object.setPrototypeOf(
          value,
          originalPrototype
        );
      }
    }
  }
);


test(
  "freezeAiData rejects Proxy without invoking traps",
  () => {
    let trapCalls = 0;

    const value =
      new Proxy(
        {
          safe: true
        },
        {
          ownKeys() {
            trapCalls += 1;

            return [
              "safe"
            ];
          },

          get(
            target,
            key,
            receiver
          ) {
            trapCalls += 1;

            return Reflect.get(
              target,
              key,
              receiver
            );
          }
        }
      );

    assert.throws(
      () =>
        freezeAiData(
          value
        ),
      /Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "freezeAiData rejects accessors without invoking getters",
  () => {
    let getterCalls = 0;

    const value = {};

    Object.defineProperty(
      value,
      "danger",
      {
        enumerable: true,

        get() {
          getterCalls += 1;

          return {
            unsafe: true
          };
        }
      }
    );

    assert.throws(
      () =>
        freezeAiData(
          value
        ),
      /accessor/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);
