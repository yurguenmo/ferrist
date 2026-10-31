/**
 * ferrist - Try Runner (`fn`)
 *
 * Executes generator functions implementing the Try operator (`?`) pattern via `yield*`.
 */

/**
 * Wraps a generator function to enable early-return error handling via `yield*`.
 *
 * Evaluates `yield*` on `Result` and `Option` instances:
 * - If the instance is `Ok(val)` or `Some(val)`, unwraps and assigns `val` directly.
 * - If the instance is `Err(err)` or `None`, short-circuits execution and returns
 *   that failure instance directly to the caller.
 *
 * Supports both synchronous (`function*`) and asynchronous (`async function*`) generators.
 *
 * @example
 * ```ts
 * import { fn, Ok, Err, Result } from "ferrist";
 *
 * export const divideInputs = fn(function* (aStr: string, bStr: string) {
 *   const a = yield* parsePositive(aStr);
 *   const b = yield* parsePositive(bStr);
 *   return Ok(a / b);
 * });
 * ```
 */

// Overload 1: Async Generator (async function*)
export function fn<Args extends any[], Y, R>(
  generatorFn: (...args: Args) => AsyncGenerator<Y, R, any>,
): (...args: Args) => Promise<Y | R>;

// Overload 2: Sync Generator (function*)
export function fn<Args extends any[], Y, R>(
  generatorFn: (...args: Args) => Generator<Y, R, any>,
): (...args: Args) => Y | R;

// Implementation
export function fn(generatorFn: (...args: any[]) => any): (...args: any[]) => any {
  return function (this: any, ...args: any[]) {
    const gen = generatorFn.apply(this, args);

    // Asynchronous Generator
    if (gen && typeof gen[Symbol.asyncIterator] === "function") {
      return (async () => {
        const step = await gen.next();
        if (step.done) {
          return step.value;
        }
        if (typeof gen.return === "function") {
          await gen.return(step.value);
        }
        return step.value;
      })();
    }

    // Synchronous Generator
    if (gen && typeof gen[Symbol.iterator] === "function") {
      const step = gen.next();
      if (step.done) {
        return step.value;
      }
      if (typeof gen.return === "function") {
        gen.return(step.value);
      }
      return step.value;
    }

    return gen;
  };
}
