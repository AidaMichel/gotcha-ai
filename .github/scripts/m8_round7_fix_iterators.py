from pathlib import Path

path = Path("src/contract-attacks.js")
text = path.read_text()

capture_anchor = '''const arrayIterator =
  arrayPrototype[Symbol.iterator];
'''

capture_block = '''const arrayValues =
  arrayPrototype.values;

const arrayKeys =
  arrayPrototype.keys;

const arrayEntries =
  arrayPrototype.entries;

'''

if capture_block not in text:
    if capture_anchor not in text:
        raise SystemExit("array iterator capture anchor missing")
    text = text.replace(capture_anchor, capture_block + capture_anchor, 1)

next_anchor = '''const arrayIteratorPrototype =
  getPrototypeOf(
    reflectApply(
      arrayIterator,
      [],
      []
    )
  );
'''
next_block = next_anchor + '''
const arrayIteratorNext =
  arrayIteratorPrototype.next;
'''
if "const arrayIteratorNext =" not in text:
    if next_anchor not in text:
        raise SystemExit("array iterator prototype anchor missing")
    text = text.replace(next_anchor, next_block, 1)

helper_anchor = '''const hasOwnProperty =
  Object.prototype.hasOwnProperty;

'''
helper_block = r'''const hasOwnProperty =
  Object.prototype.hasOwnProperty;

function detachedIteratorSelf() {
  return this;
}

function createDetachedArrayIterator(
  method,
  receiver
) {
  const iterator =
    reflectApply(
      method,
      receiver,
      []
    );

  const prototype =
    objectCreate(null);

  defineProperty(
    prototype,
    "next",
    {
      value:
        arrayIteratorNext,
      writable: true,
      enumerable: false,
      configurable: true
    }
  );

  defineProperty(
    prototype,
    Symbol.iterator,
    {
      value:
        detachedIteratorSelf,
      writable: true,
      enumerable: false,
      configurable: true
    }
  );

  setPrototypeOf(
    iterator,
    prototype
  );

  return iterator;
}

function safeArrayValues() {
  return createDetachedArrayIterator(
    arrayValues,
    this
  );
}

function safeArrayKeys() {
  return createDetachedArrayIterator(
    arrayKeys,
    this
  );
}

function safeArrayEntries() {
  return createDetachedArrayIterator(
    arrayEntries,
    this
  );
}

function safeArrayPrototypeMethod(
  key,
  fallback
) {
  if (
    key === "values" ||
    key === Symbol.iterator
  ) {
    return safeArrayValues;
  }

  if (key === "keys") {
    return safeArrayKeys;
  }

  if (key === "entries") {
    return safeArrayEntries;
  }

  return fallback;
}

'''
if "function createDetachedArrayIterator(" not in text:
    if helper_anchor not in text:
        raise SystemExit("hasOwnProperty anchor missing")
    text = text.replace(helper_anchor, helper_block, 1)

old = '''    defineProperty(
      target,
      key,
      {
        value:
          descriptor.value,
        writable: false,
        enumerable:
          descriptor.enumerable,
        configurable: false
      }
    );'''
new = '''    const method =
      sourcePrototype === arrayPrototype
        ? safeArrayPrototypeMethod(
            key,
            descriptor.value
          )
        : descriptor.value;

    defineProperty(
      target,
      key,
      {
        value:
          method,
        writable: false,
        enumerable:
          descriptor.enumerable,
        configurable: false
      }
    );'''
if new not in text:
    if text.count(old) != 1:
        raise SystemExit(f"builder method block count {text.count(old)}")
    text = text.replace(old, new, 1)

path.write_text(text)
print("Round 7 evaluator iterators detached")
