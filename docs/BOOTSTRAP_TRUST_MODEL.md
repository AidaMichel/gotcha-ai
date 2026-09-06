# Bootstrap Trust Model

Status: Normative runtime-authority supplement for the M8–M13 security boundary.

## Purpose

Gotcha hardens public boundaries against poisoned or replaced JavaScript and Node runtime authority, but it is not a same-process sandbox. Arbitrary code that runs in the same Node process before Gotcha's first package load can mutate JavaScript intrinsics, module exports, globals, the module cache, and process state. A pure-JavaScript package therefore needs a smallest initial reflection root from which every other retained primitive can be authenticated.

This document pins that root explicitly so the implementation and tests do not imply an impossible guarantee.

## Bootstrap trust root

Before the first `require("gotcha-ai")`, the following are the bootstrap trust root:

- the CommonJS module-local `require` capability supplied by Node;
- the global `Reflect` binding and its `Reflect.getOwnPropertyDescriptor` and `Reflect.apply` data functions;
- the global `Function` binding, its original `Function.prototype`, and `Function.prototype.toString` data function.

These roots are captured once at package-authority initialization. Code that can replace or accessor-wrap these roots before Gotcha first loads already has process-equivalent authority and is outside Gotcha's supported JavaScript boundary. Supporting that adversary would require an external hardened realm, native embedding boundary, worker/process isolation established before hostile code, or equivalent host-enforced capability separation.

This exception is intentionally narrow. It does **not** make other globals, prototypes, builtin exports, or process metadata trusted.

## Required behavior outside the root

Every other callable primordial retained as authority must be obtained without executing an accessor and authenticated before invocation. For native JavaScript intrinsics this means descriptor capture through the bootstrap reflection root plus an exact expected native source identity check. A callable Proxy, bound function, ordinary replacement, accessor-backed slot, missing primitive, or unexpected source must fail closed and must not be invoked as authority.

In particular, the following are not bootstrap roots and must remain poison-safe:

- `Object` methods such as `getPrototypeOf`, `defineProperty`, and `freeze`;
- `Array.isArray`;
- `Promise`, `Promise.prototype.then`, and the `Symbol.species` getter;
- `String`, numeric/boxed-primitive, `WeakMap`, `WeakSet`, `ArrayBuffer`, and `DataView` brand primitives;
- `node:util`, `node:util/types`, `node:vm`, `node:buffer`, Inspector-facing exports, and other mutable builtin module exports;
- `process.moduleLoadList`, `process.getBuiltinModule`, `process.binding`, and other caller-mutable process metadata/capabilities unless separately authenticated for a narrowly documented use.

If mandatory non-root authority cannot be authenticated, package load must remain safe and public protected surfaces must fail closed before executing caller callbacks or rejected authority.

## Lazy-load rule

Authentication is a package-generation decision, not a lazy-module opportunity to recapture mutable ambient state. Once the package root has established runtime authority, lazy M8/M10/M11/M12/M13 modules must consume that captured authority for security-sensitive classification and invocation primitives. Loading a lazy public export must not widen the trust root or turn a later ambient replacement into authority.

## Human authority

This bootstrap clarification does not alter product authority. M13 remains proposal-only: it does not select a survivor, confirm or edit a protection, generate executable evaluator changes, complete the M12 human checkpoint, or verify remediation on the user's behalf.
