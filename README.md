# `ferrist`

> Bringing Rust's algebraic type safety, pattern matching, Result, Option, and Try operator (`?`) to TypeScript.

[![npm version](https://img.shields.io/npm/v/ferrist.svg)](https://www.npmjs.com/package/ferrist)
[![CI](https://github.com/yurguenmo/ferrist/actions/workflows/ci.yml/badge.svg)](https://github.com/yurguenmo/ferrist/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/yurguenmo/ferrist/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ferrist)](https://bundlephobia.com/package/ferrist)

---

## 1. Overview

`ferrist` brings Rust's algebraic data model, error handling, and Try operator ergonomics to TypeScript:

* ⚡ **Enums (Algebraic Data Types):** Declare variants using standard TypeScript types (`never`, primitives, tuples, objects) with compile-time exhaustive pattern matching (`.$match`).
* 🦀 **Result & Option:** Dedicated types for error handling and optional values with `.unwrap()`, `.map()`, `.mapErr()`, and `.andThen()`.
* 🔄 **Try Operator (`?`):** Early return syntax via JavaScript generators (`yield*`) wrapped with `fn`.
* 📦 **Zero Dependencies:** Ultralight package with zero runtime dependencies.

---

## 2. Installation

```bash
npm install ferrist
# or
pnpm add ferrist
# or
yarn add ferrist
```

---

## 3. Core Guide

### 3.1. Enums (Algebraic Data Types)

Enums are declared by specifying a type dictionary in the generic parameter `Enum<{ ... }>()`:

```ts
import { Enum, Infer } from "ferrist";

export const WebEvent = Enum<{
  // 1. Unit variant (no payload): use `never`
  PageLoad: never;

  // 2. Tuple / Array payload
  Click: [number, number];

  // 3. Primitive payload
  KeyPress: string;

  // 4. Struct / Object payload
  Paste: { text: string; source: string };
}>()
  // Optional: attach instance methods
  .instance({
    describe(): string {
      return this.$match({
        PageLoad: () => "Page loaded",
        Click: ([x, y]) => `Clicked at (${x}, ${y})`,
        KeyPress: (key) => `Key pressed: ${key}`,
        Paste: ({ text, source }) => `Pasted "${text}" from ${source}`,
      });
    },
  })
  // Optional: attach static helper methods
  .static({
    originClick() {
      return this.Click([0, 0]);
    },
  });

export type WebEvent = Infer<typeof WebEvent>;
```

#### Instantiation & Pattern Matching

Every variant with data accepts **exactly 1 payload argument**, and its `.$match` handler receives that exact payload, allowing native destructuring:

```ts
// 1. Unit variants: accessible as properties or zero-argument calls
const e1 = WebEvent.PageLoad;
const e1Callable = WebEvent.PageLoad();

// 2. Data variants: pass array, primitive, or object directly
const e2 = WebEvent.Click([100, 250]);
const e3 = WebEvent.KeyPress("Enter");
const e4 = WebEvent.Paste({ text: "Hello", source: "clipboard" });

// 3. Type-safe, exhaustive pattern matching:
const message = e2.$match({
  PageLoad: () => "Initial load",
  Click: ([x, y]) => `Mouse click at (${x}, ${y})`,
  KeyPress: (key) => `Keyboard input: ${key}`,
  Paste: ({ text }) => `Pasted content: ${text}`,
});

// 4. Wildcard matching with `_()`:
const isMouseAction = e2.$match({
  Click: () => true,
  _() {
    return false;
  },
});

// 5. Variant inspection & narrowing:
console.log(e2.$variant); // "Click"
console.log(e2.$value);   // [100, 250]

if (e2.$is("Click")) {
  const [x, y] = e2.$value; // Strictly typed as [number, number]
}
```

---

### 3.2. Result<T, E> (Error Handling)

`Result<T, E>` provides type-safe error handling without throwing exceptions. It is a discriminated union of `Ok<T>` and `Err<E>`.

```ts
import { Result, Ok, Err } from "ferrist";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err("Cannot divide by zero");
  }
  return Ok(a / b);
}

const res = divide(10, 2);

// Type narrowing:
if (res.isOk()) {
  console.log("Success:", res.$value); // Inferred strictly as `number`
} else {
  console.error("Error:", res.$value); // Inferred strictly as `string`
}

// Direct unwrapping & fallbacks:
const val1 = res.unwrap();                            // 5 (panics on Err)
const val2 = divide(10, 0).unwrapOr(0);               // 0
const val3 = divide(10, 0).unwrapOrElse((err) => -1); // -1

// Pattern Matching:
res.$match({
  Ok: (val) => console.log(`Result: ${val}`),
  Err: (err) => console.error(`Error: ${err}`),
});

// Transformations & Chaining:
const calculation = divide(20, 2)
  .map((n) => n * 3)
  .andThen((n) => divide(n, 2));

console.log(calculation.unwrap()); // 15
```

---

### 3.3. Option<T> (Nullability Safety)

`Option<T>` safely models optional values without `null` or `undefined`. It is a discriminated union of `Some<T>` and `None`.

```ts
import { Option, Some, None } from "ferrist";

function findUser(id: number): Option<{ name: string }> {
  if (id === 1) return Some({ name: "Ferris" });
  return None;
}

const user = findUser(1);

// Type narrowing:
if (user.isSome()) {
  console.log(user.$value.name); // "Ferris" (inferred strictly as `{ name: string }`)
}

// Direct unwrapping & fallbacks:
const directName = user.unwrap().name;                        // "Ferris" (panics on None)
const defaultUser = findUser(99).unwrapOr({ name: "Guest" }); // Fallback on None

// Converting nullables:
const fromNull = Option.fromNullable(null);         // None
const fromText = Option.fromNullable("Hello World");// Some("Hello World")

// Pattern matching:
const greeting = user.$match({
  Some: ({ name }) => `Hello, ${name}!`,
  None: () => "Hello, anonymous visitor!",
});

// Transformations & Chaining:
const upperName = user
  .map((u) => u.name)
  .andThen((name) => (name.length > 0 ? Some(name.toUpperCase()) : None));

console.log(upperName.unwrapOr("ANONYMOUS")); // "FERRIS"
```

---

### 3.4. The Try Operator (`?`) via `fn`

The Try operator (`?`) enables early returns on failure. In `ferrist`, this pattern is executed using standard JavaScript generator functions (`yield*`) wrapped with `fn`:

* Evaluating `const val = yield* expr`:
  * If `expr` is `Ok(val)` or `Some(val)`, unwraps and assigns `val` directly without suspending execution.
  * If `expr` is `Err(err)` or `None`, execution halts immediately, short-circuiting and returning that failure instance to the caller.

#### Synchronous Pipeline (`function*`):

```ts
import { fn, Result, Ok, Err } from "ferrist";

function validateAge(age: number): Result<number, string> {
  return age >= 18 ? Ok(age) : Err("User must be 18+");
}

function checkBalance(balance: number, cost: number): Result<number, string> {
  return balance >= cost ? Ok(balance - cost) : Err("Insufficient funds");
}

export const purchaseTicket = fn(function* (age: number, balance: number, cost: number) {
  const verifiedAge = yield* validateAge(age);
  const remaining = yield* checkBalance(balance, cost);

  return Ok({ verifiedAge, remaining });
});

// Calling purchaseTicket returns a standard Result:
const purchase = purchaseTicket(20, 100, 30);
// Inferred as: Result<{ verifiedAge: number; remaining: number }, string>
```

#### Asynchronous Pipeline (`async function*`):

```ts
import { fn, Result, Ok, Err } from "ferrist";

export const processCheckout = fn(async function* (userId: string, cartId: string) {
  const user = yield* await fetchUser(userId);      // Short-circuits on Err
  const cart = yield* await fetchCart(cartId);      // Short-circuits on Err
  const receipt = yield* await chargeAccount(user, cart.total);

  return Ok(receipt);
});
// Inferred as: Promise<Result<Receipt, CheckoutError>>
```

---

## 4. Panics

When unwrapping a failure value (`Err.unwrap()` or `None.unwrap()`), `ferrist` throws a `PanicError`:

```ts
import { PanicError } from "ferrist";

try {
  None.unwrap();
} catch (e) {
  if (e instanceof PanicError) {
    console.error("Panic error:", e.message);
  }
}
```

---

## 5. TypeScript Configuration

To take full advantage of `ferrist`'s compile-time guarantees, ensure strict mode is enabled in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```
