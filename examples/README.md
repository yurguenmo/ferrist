# `ferrist` Examples

Practical, runnable examples demonstrating the core patterns and features of `ferrist`.

## Running Examples

You can execute any example directly using `tsx`:

```bash
npx tsx examples/api-error-handling.ts
npx tsx examples/async-pipeline.ts
npx tsx examples/state-machine.ts
```

---

## Example Index

### 1. [`api-error-handling.ts`](./api-error-handling.ts)

Demonstrates domain error modeling with class-based `Enum`, safe exception handling with `Result.try`, and exhaustive pattern matching with `.$match`:
- Class-based `ApiError` enum with HTTP status mapping.
- Safe JSON parsing via `Result.try`.
- Monadic chaining using `.andThen()` and `.map()`.
- Exhaustive HTTP response rendering via `.$match`.

### 2. [`async-pipeline.ts`](./async-pipeline.ts)

Demonstrates composability of multiple `fn` pipelines (sync and async) with early-return generator syntax (`yield*`):
- Composing modular `fn` sub-pipelines (`verifyInventory`, `calculateTotals`, `processPayment`) into a top-level orchestrator (`checkout`).
- Seamlessly calling async `fn` with `yield* await subFn(...)` and sync `fn` with `yield* syncFn(...)`.
- Safe optional discount lookup with `Option.try`.
- Payment gateway calls protected with `Result.try`.
- Automatic early-return short-circuiting on failure without manual `try/catch` boilerplate.

### 3. [`state-machine.ts`](./state-machine.ts)

Demonstrates compile-time lifecycle transitions using `VariantOf` and the Typestate pattern:
- Multi-state lifecycle (`Draft -> PendingPayment -> Paid -> Shipped -> Delivered`).
- Variant-specific methods restricted via `this: VariantOf<OrderState, "Variant">`.
- Compile-time rejection of invalid transitions.
