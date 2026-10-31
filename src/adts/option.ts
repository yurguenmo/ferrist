/**
 * ferrist - Option<T> ADT
 *
 * Safe handling of optional values representing presence (`Some<T>`) or absence (`None`).
 */

import { panic } from "../panic.js";

/**
 * Pattern matching arms for Option<T>.
 */
export interface OptionMatchArms<T, R> {
  Some: (val: T) => R;
  None: () => R;
}

export type PartialOptionMatchArms<T, R> =
  | OptionMatchArms<T, R>
  | (Partial<OptionMatchArms<T, R>> & { _(): R });

/**
 * Present variant of Option representing a contained value of type `T`.
 */
export interface ISome<T> {
  readonly $variant: "Some";
  readonly $value: T;

  /** Returns `true` if the option is `Some`. */
  isSome(): this is ISome<T>;
  /** Returns `false` if the option is `Some`. */
  isNone(): false;

  /** Type-guard checking if this instance is of the specified variant. */
  $is<V extends "Some" | "None">(variant: V): this is V extends "Some" ? ISome<T> : never;

  /** Exhaustive pattern matching over `Some` and `None`. */
  $match<R>(arms: PartialOptionMatchArms<T, R>): R;

  /** Unwraps the contained value `T`. Never throws on `Some`. */
  unwrap(): T;

  /** Returns the contained `Some` value, ignoring the fallback. */
  unwrapOr(fallback: T): T;

  /** Returns the contained `Some` value, ignoring the fallback function. */
  unwrapOrElse(fallbackFn: () => T): T;

  /** Maps a `Some<T>` value to `Some<U>` by applying a function. */
  map<U>(fn: (val: T) => U): Some<U>;

  /** Calls `fn` on the contained `Some` value and returns its result. */
  andThen<U>(fn: (val: T) => Option<U>): Option<U>;

  /** Generator iterator protocol for early-return unwrapping (`yield*`). */
  [Symbol.iterator](): Generator<never, T, unknown>;
}

/**
 * Absent variant of Option representing the lack of a value.
 */
export interface INone<T = never> {
  readonly $variant: "None";
  readonly $value: undefined;
  readonly _T?: T;

  /** Returns `false` if the option is `None`. */
  isSome(): false;
  /** Returns `true` if the option is `None`. */
  isNone(): this is INone<T>;

  /** Type-guard checking if this instance is of the specified variant. */
  $is<V extends "Some" | "None">(variant: V): this is V extends "None" ? INone<T> : never;

  /** Exhaustive pattern matching over `Some` and `None`. */
  $match<R>(arms: PartialOptionMatchArms<never, R>): R;

  /** Panics because the option is `None`. */
  unwrap(): never;

  /** Returns the provided fallback value. */
  unwrapOr(fallback: T): T;

  /** Computes and returns the fallback value by calling the function. */
  unwrapOrElse(fallbackFn: () => T): T;

  /** Returns `None` without calling `fn`. */
  map<U>(fn: (val: never) => U): None<U>;

  /** Returns `None` without calling `fn`. */
  andThen<U>(fn: (val: never) => Option<U>): Option<U>;

  /** Generator iterator protocol for early-return unwrapping (`yield*`). */
  [Symbol.iterator](): Generator<INone<T>, never, unknown>;
}

class SomeImpl<T> implements ISome<T> {
  readonly $variant = "Some" as const;
  readonly $value: T;

  constructor(val: T) {
    this.$value = val;
  }

  isSome(): this is ISome<T> {
    return true;
  }

  isNone(): false {
    return false;
  }

  $is<V extends "Some" | "None">(variant: V): this is V extends "Some" ? ISome<T> : never {
    return variant === "Some";
  }

  $match<R>(arms: PartialOptionMatchArms<T, R>): R {
    if ("Some" in arms && typeof arms.Some === "function") {
      return arms.Some(this.$value);
    }
    if ("_" in arms && typeof arms._ === "function") {
      return arms._();
    }
    return panic("Non-exhaustive pattern match on Option.Some");
  }

  unwrap(): T {
    return this.$value;
  }

  unwrapOr(_fallback: T): T {
    return this.$value;
  }

  unwrapOrElse(_fallbackFn: () => T): T {
    return this.$value;
  }

  map<U>(fn: (val: T) => U): Some<U> {
    return new SomeImpl(fn(this.$value));
  }

  andThen<U>(fn: (val: T) => Option<U>): Option<U> {
    return fn(this.$value);
  }

  *[Symbol.iterator](): Generator<never, T, unknown> {
    return this.$value;
  }
}

class NoneImpl implements INone<never> {
  readonly $variant = "None" as const;
  readonly $value: undefined = undefined;

  isSome(): false {
    return false;
  }

  isNone(): this is INone<never> {
    return true;
  }

  $is<V extends "Some" | "None">(variant: V): this is V extends "None" ? INone<never> : never {
    return variant === "None";
  }

  $match<R>(arms: PartialOptionMatchArms<never, R>): R {
    if ("None" in arms && typeof arms.None === "function") {
      return arms.None();
    }
    if ("_" in arms && typeof arms._ === "function") {
      return arms._();
    }
    return panic("Called Option.unwrap() on a None value");
  }

  unwrap(): never {
    return panic("Called Option.unwrap() on a None value");
  }

  unwrapOr<A>(fallback: A): A {
    return fallback;
  }

  unwrapOrElse<A>(fallbackFn: () => A): A {
    return fallbackFn();
  }

  map<U>(_fn: (val: never) => U): None<U> {
    return this as any;
  }

  andThen<U>(_fn: (val: never) => Option<U>): Option<U> {
    return this as any;
  }

  *[Symbol.iterator](): Generator<INone<never>, never, unknown> {
    yield this;
    return panic("Unreachable");
  }
}

/** Some variant type representing presence of a value. */
export type Some<T> = ISome<T>;

/** None variant type representing absence of a value. */
export type None<T = never> = INone<T>;

/**
 * Option represents either presence (`Some<T>`) or absence (`None`).
 */
export type Option<T> = Some<T> | None<T>;

/**
 * Constructs a `Some` option variant wrapping a present value.
 *
 * @example
 * ```ts
 * const opt = Some("hello");
 * if (opt.isSome()) {
 *   console.log(opt.$value); // "hello"
 * }
 * ```
 */
export function Some<T>(val: T): Some<T> {
  return new SomeImpl(val);
}

/**
 * Immutable singleton instance representing absence of a value.
 *
 * @example
 * ```ts
 * const opt: Option<number> = None;
 * console.log(opt.isNone()); // true
 * ```
 */
export const None: None<never> = Object.freeze(new NoneImpl());

/**
 * Converts a nullable value (`null` or `undefined`) into an `Option<T>`.
 * Returns `Some(val)` if `val != null`, or `None` otherwise.
 *
 * @example
 * ```ts
 * const opt1 = Option.fromNullable("text"); // Some("text")
 * const opt2 = Option.fromNullable(null);   // None
 * ```
 */
export function fromNullable<T>(val: T | null | undefined): Option<NonNullable<T>> {
  return val !== null && val !== undefined ? Some(val as NonNullable<T>) : None;
}

/**
 * Inferred return type for unified exception handling in `Option.try` / `tryOption`.
 *
 * - When `fn` returns a `PromiseLike<U>`, evaluates to `Promise<Option<U>>`.
 * - For all synchronous functions (including those returning `any` or `never`), evaluates to `Option<T>`.
 */
export type TryOptionResult<T> = 0 extends 1 & T
  ? Option<T>
  : [T] extends [never]
    ? Option<T>
    : [T] extends [PromiseLike<infer U>]
      ? Promise<Option<U>>
      : Option<T>;

/**
 * Safely executes a synchronous or asynchronous function that may throw exceptions or reject,
 * wrapping the successful value in a `Some<T>` or returning `None` if an exception was thrown or the promise rejected.
 *
 * - When `fn` returns a `Promise`, `tryOption` returns a `Promise<Option<T>>`.
 * - When `fn` returns a synchronous value, `tryOption` returns `Option<T>`.
 *
 * @example Synchronous execution
 * ```ts
 * const opt = Option.try(() => JSON.parse(str));
 * // Option<any> (Some on valid JSON, None on SyntaxError)
 * ```
 *
 * @example Asynchronous execution
 * ```ts
 * const opt = await Option.try(async () => fetch("/api/data"));
 * // Option<Response> (Some on success, None on rejection)
 * ```
 */
export function tryOption<T>(fn: () => T): TryOptionResult<T> {
  try {
    const value = fn();
    if (value instanceof Promise || (value != null && typeof (value as any).then === "function")) {
      return (value as unknown as Promise<any>).then(
        (resolved) => Some(resolved),
        () => None,
      ) as TryOptionResult<T>;
    }
    return Some(value) as TryOptionResult<T>;
  } catch {
    return None as TryOptionResult<T>;
  }
}

/**
 * Companion namespace exposing Option constructors and utilities.
 */
export const Option = {
  Some,
  None,
  fromNullable,
  try: tryOption,
};
