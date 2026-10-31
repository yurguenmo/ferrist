---
name: ferrist
description: >-
  Idiomatic guide for writing Rust-inspired TypeScript with ferrist.
  Activate when implementing or refactoring Enums, VariantOf typestates, Result,
  Option, or the Try operator runner (fn).
---

# `ferrist` Quick Reference

## 1. Class-Based Enums & Typestate Pattern

```ts
import { Enum, type VariantOf } from "ferrist";

export class Order extends Enum<{
  Draft: { items: string[] };
  Paid: { items: string[]; txId: string };
  Cancelled: string; // Reason
  Empty: never;      // Unit variant: ALWAYS use `never`
}>() {
  // Common method across all variants
  describe(): string {
    return this.$match({
      Draft: ({ items }) => `Draft with ${items.length} items`,
      Paid: ({ txId }) => `Paid: ${txId}`,
      Cancelled: (reason) => `Cancelled: ${reason}`,
      Empty: () => "Empty",
    });
  }

  // Typestate: ONLY callable when in 'Draft' variant
  pay(this: VariantOf<Order, "Draft">, txId: string): Order {
    return Order.Paid({ items: this.$value.items, txId });
  }
}

// Instantiation & Inspection
const o1 = Order.Draft({ items: ["Book"] });
const o2 = Order.Empty(); // or Order.Empty singleton
if (o1.$is("Draft")) {
  console.log(o1.$value.items); // Strictly typed as string[]
}
```

## 2. `Result<T, E>` & Exception Safety (`Result.try`)

```ts
import { Result, Ok, Err, tryCatch } from "ferrist";

// Direct Constructors
const success = Ok(42);
const failure = Err("Network timeout");

// Safe Exception Capture (Sync & Async)
const syncRes = Result.try(
  () => JSON.parse(rawText),
  (err) => new SyntaxError(`Bad JSON: ${err}`)
); // Result<any, SyntaxError>

const asyncRes = await Result.try(
  async () => fetchUser(id),
  (err) => new Error(`Fetch failed: ${err}`)
); // Promise<Result<User, Error>>

// Combinators
const val = syncRes.unwrapOr({ fallback: true });
const chained = success
  .map((n) => n * 2)
  .andThen((n) => (n > 50 ? Ok(n) : Err("Too small")));
```

## 3. `Option<T>` (`Option.try` & `fromNullable`)

```ts
import { Option, Some, None, tryOption, fromNullable } from "ferrist";

// Direct Constructors & Nullable conversions
const opt1 = Some("hello");
const opt2 = None;
const opt3 = Option.fromNullable(possiblyNull); // Some(val) or None

// Safe Execution (Returns Some on success, None on throw/rejection)
const parsed = Option.try(() => JSON.parse(rawText));
const fetched = await Option.try(async () => fetchUser(id));

// Combinators & Pattern Matching
const greeting = opt1.$match({
  Some: (name) => `Hello, ${name}`,
  None: () => "Hello, stranger",
});
const val = opt1.unwrapOr("default");
```

## 4. Try Operator Runner (`fn`)

Use standard generator `yield*` for early return on `Err` or `None`.

### Composing Multiple Pipelines (Sync & Async):

```ts
import { fn, Result, Ok, Err } from "ferrist";

// 1. Sync sub-pipeline
const parseInput = fn(function* (raw: string) {
  const num = yield* Result.try(() => Number(raw));
  if (Number.isNaN(num)) return Err("Not a number");
  return Ok(num);
});

// 2. Async sub-pipeline
const fetchPrice = fn(async function* (sku: string) {
  const price = yield* await Result.try(async () => api.getPrice(sku));
  return Ok(price);
});

// 3. Orchestrator: composing sync & async fn pipelines
export const calculateOrder = fn(async function* (rawQty: string, sku: string) {
  // Compose sync fn: direct yield*
  const qty = yield* parseInput(rawQty);

  // Compose async fn: yield* await
  const price = yield* await fetchPrice(sku);

  return Ok({ qty, total: qty * price });
});
```

## 5. Panics

For unrecoverable bugs (missing critical env vars, corrupted state):

```ts
import { panic, PanicError } from "ferrist";

if (!process.env.DATABASE_URL) {
  panic("DATABASE_URL is required to boot server");
}
```

## 6. Critical Rules for Agents

- **Unit Variants:** Always type unit variants as `never` (e.g. `Loading: never;`), NEVER `void` or `undefined`.
- **Catching Exceptions:** Always prefer `Result.try` / `Option.try` over raw `try/catch`.
- **Typestate Transitions:** Annotate `this: VariantOf<Class, "Variant">` as first parameter in transition methods.
- **Generator Types:** In `fn(async function* ...)`, use `yield* await promiseReturningResult`.
