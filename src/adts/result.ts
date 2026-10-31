/**
 * ferrist - Result<T, E> ADT
 *
 * Type-safe error handling ADT representing success (`Ok<T>`) or failure (`Err<E>`).
 */

import { panic } from "../panic.js";

/**
 * Pattern matching arms for Result<T, E>.
 */
export interface ResultMatchArms<T, E, R> {
  Ok: (val: T) => R;
  Err: (err: E) => R;
}

export type PartialResultMatchArms<T, E, R> =
  | ResultMatchArms<T, E, R>
  | (Partial<ResultMatchArms<T, E, R>> & { _(): R });

/**
 * Successful variant of Result representing a contained value of type `T`.
 */
export interface IOk<T> {
  readonly $variant: "Ok";
  readonly $value: T;

  /** Returns `true` if the result is `Ok`. */
  isOk(): this is IOk<T>;
  /** Returns `false` if the result is `Ok`. */
  isErr(): false;

  /** Type-guard checking if this instance is of the specified variant. */
  $is<V extends "Ok" | "Err">(variant: V): this is (V extends "Ok" ? IOk<T> : never);

  /** Exhaustive pattern matching over `Ok` and `Err`. */
  $match<R>(arms: PartialResultMatchArms<T, never, R>): R;

  /** Unwraps the success value `T`. Never throws on `Ok`. */
  unwrap(): T;

  /** Panics because the result is not `Err`. */
  unwrapErr(): never;

  /** Returns the contained `Ok` value, ignoring the fallback. */
  unwrapOr(fallback: T): T;

  /** Returns the contained `Ok` value, ignoring the fallback function. */
  unwrapOrElse(fallbackFn: (err: any) => T): T;

  /** Maps an `Ok` value to a new value by applying a function. */
  map<U>(fn: (val: T) => U): Ok<U>;

  /** Returns `this` without calling `fn` since the result is `Ok`. */
  mapErr<F>(fn: (err: never) => F): Ok<T>;

  /** Calls `fn` on the contained `Ok` value and returns its result. */
  andThen<U, F = never>(fn: (val: T) => Result<U, F>): Result<U, F>;

  /** Generator iterator protocol for early-return unwrapping (`yield*`). */
  [Symbol.iterator](): Generator<never, T, unknown>;
}

/**
 * Error variant of Result representing a contained error of type `E`.
 */
export interface IErr<E> {
  readonly $variant: "Err";
  readonly $value: E;

  /** Returns `false` if the result is `Err`. */
  isOk(): false;
  /** Returns `true` if the result is `Err`. */
  isErr(): this is IErr<E>;

  /** Type-guard checking if this instance is of the specified variant. */
  $is<V extends "Ok" | "Err">(variant: V): this is (V extends "Err" ? IErr<E> : never);

  /** Exhaustive pattern matching over `Ok` and `Err`. */
  $match<R>(arms: PartialResultMatchArms<never, E, R>): R;

  /** Panics with the error message because the result is `Err`. */
  unwrap(): never;

  /** Unwraps the error value `E`. Never throws on `Err`. */
  unwrapErr(): E;

  /** Returns the provided fallback value. */
  unwrapOr<A>(fallback: A): A;

  /** Computes and returns the fallback value by calling the function with the contained error. */
  unwrapOrElse<A>(fallbackFn: (err: E) => A): A;

  /** Returns `this` without calling `fn` since the result is `Err`. */
  map<U>(fn: (val: never) => U): Err<E>;

  /** Maps an `Err` value to a new error by applying a function. */
  mapErr<F>(fn: (err: E) => F): Err<F>;

  /** Returns `this` without calling `fn` since the result is `Err`. */
  andThen<U, F = never>(fn: (val: never) => Result<U, F>): Result<U, E | F>;

  /** Generator iterator protocol for early-return unwrapping (`yield*`). */
  [Symbol.iterator](): Generator<IErr<E>, never, unknown>;
}

class OkImpl<T> implements IOk<T> {
  readonly $variant = "Ok" as const;
  readonly $value: T;

  constructor(val: T) {
    this.$value = val;
  }

  isOk(): this is IOk<T> {
    return true;
  }

  isErr(): false {
    return false;
  }

  $is<V extends "Ok" | "Err">(variant: V): this is (V extends "Ok" ? IOk<T> : never) {
    return variant === "Ok";
  }

  $match<R>(arms: PartialResultMatchArms<T, never, R>): R {
    if ("Ok" in arms && typeof arms.Ok === "function") {
      return arms.Ok(this.$value);
    }
    if ("_" in arms && typeof arms._ === "function") {
      return arms._();
    }
    return panic("Non-exhaustive pattern match on Result.Ok");
  }

  unwrap(): T {
    return this.$value;
  }

  unwrapErr(): never {
    return panic(`Called Result.unwrapErr() on an Ok: ${this.$value}`);
  }

  unwrapOr(_fallback: T): T {
    return this.$value;
  }

  unwrapOrElse(_fallbackFn: (err: any) => T): T {
    return this.$value;
  }

  map<U>(fn: (val: T) => U): Ok<U> {
    return new OkImpl(fn(this.$value));
  }

  mapErr<F>(_fn: (err: never) => F): Ok<T> {
    return this;
  }

  andThen<U, F = never>(fn: (val: T) => Result<U, F>): Result<U, F> {
    return fn(this.$value);
  }

  *[Symbol.iterator](): Generator<never, T, unknown> {
    return this.$value;
  }
}

class ErrImpl<E> implements IErr<E> {
  readonly $variant = "Err" as const;
  readonly $value: E;

  constructor(err: E) {
    this.$value = err;
  }

  isOk(): false {
    return false;
  }

  isErr(): this is IErr<E> {
    return true;
  }

  $is<V extends "Ok" | "Err">(variant: V): this is (V extends "Err" ? IErr<E> : never) {
    return variant === "Err";
  }

  $match<R>(arms: PartialResultMatchArms<never, E, R>): R {
    if ("Err" in arms && typeof arms.Err === "function") {
      return arms.Err(this.$value);
    }
    if ("_" in arms && typeof arms._ === "function") {
      return arms._();
    }
    return panic(`Called Result.unwrap() on an Err: ${this.$value}`);
  }

  unwrap(): never {
    return panic(`Called Result.unwrap() on an Err: ${this.$value}`);
  }

  unwrapErr(): E {
    return this.$value;
  }

  unwrapOr<A>(fallback: A): A {
    return fallback;
  }

  unwrapOrElse<A>(fallbackFn: (err: E) => A): A {
    return fallbackFn(this.$value);
  }

  map<U>(_fn: (val: never) => U): Err<E> {
    return this;
  }

  mapErr<F>(fn: (err: E) => F): Err<F> {
    return new ErrImpl(fn(this.$value));
  }

  andThen<U, F = never>(_fn: (val: never) => Result<U, F>): Result<U, E | F> {
    return this as any;
  }

  *[Symbol.iterator](): Generator<IErr<E>, never, unknown> {
    yield this;
    return panic("Unreachable");
  }
}

/** Ok variant type representing success. */
export type Ok<T> = IOk<T>;

/** Err variant type representing failure. */
export type Err<E> = IErr<E>;

/**
 * Result represents either success (`Ok<T>`) or failure (`Err<E>`).
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Constructs an `Ok` result variant wrapping a success value.
 *
 * @example
 * ```ts
 * const res = Ok(42);
 * if (res.isOk()) {
 *   console.log(res.$value); // 42
 * }
 * ```
 */
export function Ok<T>(val: T): Ok<T> {
  return new OkImpl(val);
}

/**
 * Constructs an `Err` result variant wrapping an error value.
 *
 * @example
 * ```ts
 * const res = Err("network failure");
 * if (res.isErr()) {
 *   console.log(res.$value); // "network failure"
 * }
 * ```
 */
export function Err<E>(err: E): Err<E> {
  return new ErrImpl(err);
}

/**
 * Companion namespace exposing Result constructors.
 */
export const Result = {
  Ok,
  Err,
};
