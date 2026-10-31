import { describe, expect, expectTypeOf, it } from "vitest";
import { Err, Ok, PanicError, type Result } from "../src/index.js";

describe("Result ADT", () => {
  it("constructs Ok variant with correct properties and guards", () => {
    const res = Ok(42);

    expect(res.$variant).toBe("Ok");
    expect(res.$value).toBe(42);
    expect(res.isOk()).toBe(true);
    expect(res.isErr()).toBe(false);
    expect(res.$is("Ok")).toBe(true);
    expect(res.$is("Err")).toBe(false);

    if (res.$is("Ok")) {
      expectTypeOf(res.$value).toEqualTypeOf<number>();
      expect(res.$value).toBe(42);
    }
  });

  it("constructs Err variant with correct properties and guards", () => {
    const res = Err("network failure");

    expect(res.$variant).toBe("Err");
    expect(res.$value).toBe("network failure");
    expect(res.isOk()).toBe(false);
    expect(res.isErr()).toBe(true);
    expect(res.$is("Err")).toBe(true);
    expect(res.$is("Ok")).toBe(false);

    if (res.$is("Err")) {
      expectTypeOf(res.$value).toEqualTypeOf<string>();
      expect(res.$value).toBe("network failure");
    }
  });

  it("unwraps Ok successfully and panics on Err", () => {
    const ok = Ok(100);
    expect(ok.unwrap()).toBe(100);

    const err = Err("boom");
    expect(() => err.unwrap()).toThrowError(PanicError);
    expect(() => err.unwrap()).toThrowError(/Called Result\.unwrap\(\) on an Err: boom/);
  });

  it("unwraps Err successfully and panics on Ok", () => {
    const err = Err("bad_request");
    expect(err.unwrapErr()).toBe("bad_request");

    const ok = Ok("success_payload");
    expect(() => ok.unwrapErr()).toThrowError(PanicError);
    expect(() => ok.unwrapErr()).toThrowError(
      /Called Result\.unwrapErr\(\) on an Ok: success_payload/,
    );
  });

  it("handles unwrapOr and unwrapOrElse with type safety", () => {
    const ok = Ok(10);
    expect(ok.unwrapOr(50)).toBe(10);
    expect(ok.unwrapOrElse((_err) => 50)).toBe(10);

    const err = Err("not_found");
    expect(err.unwrapOr(50)).toBe(50);
    expect(err.unwrapOrElse((e) => e.length)).toBe(9);

    // @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'number'
    ok.unwrapOr("invalid");
  });

  it("maps over Ok with map and Err with mapErr", () => {
    const ok = Ok(20);
    const mappedOk = ok.map((n) => n * 2);
    expect(mappedOk.unwrap()).toBe(40);
    expectTypeOf(mappedOk.unwrap()).toEqualTypeOf<number>();

    const err = Err("error_msg");
    const mappedErrFromOk = ok.mapErr((e) => `wrapped: ${e}`);
    expect(mappedErrFromOk.unwrap()).toBe(20);

    const mappedErr = err.mapErr((e) => `wrapped: ${e}`);
    expect(mappedErr.unwrapErr()).toBe("wrapped: error_msg");

    const mappedOkFromErr = err.map((n: number) => n * 2);
    expect(mappedOkFromErr.unwrapErr()).toBe("error_msg");
  });

  it("chains results with andThen", () => {
    const divide = (num: number, denom: number): Result<number, string> =>
      denom === 0 ? Err("division by zero") : Ok(num / denom);

    const r1 = Ok(10).andThen((n) => divide(n, 2));
    expect(r1.unwrap()).toBe(5);

    const r2 = Ok(10).andThen((n) => divide(n, 0));
    expect(r2.isErr()).toBe(true);
    expect(r2.unwrapErr()).toBe("division by zero");

    const initialErr: Result<number, string> = Err("initial error");
    const r3 = initialErr.andThen((n) => divide(n, 2));
    expect(r3.isErr()).toBe(true);
    expect(r3.unwrapErr()).toBe("initial error");
  });

  it("supports fluent method chaining", () => {
    const double = (n: number) => n * 2;
    const divide = (num: number, denom: number): Result<number, string> =>
      denom === 0 ? Err("division by zero") : Ok(num / denom);

    const result = Ok(10)
      .map(double)
      .andThen((n) => divide(n, 4))
      .map((n) => `Final: ${n}`);

    expect(result.unwrap()).toBe("Final: 5");
  });

  it("verifies compile-time types for map, mapErr, andThen, and match", () => {
    const res: Result<number, string> = Ok(10);

    const mapped = res.map((n) => `num_${n}`);
    expectTypeOf(mapped.unwrap()).toEqualTypeOf<string>();

    const errRes: Result<number, string> = Err("network");
    const mappedErr = errRes.mapErr((e) => e.length);
    expectTypeOf(mappedErr.unwrapErr()).toEqualTypeOf<number>();
    expect(mappedErr.unwrapErr()).toBe(7);

    const chained = res.andThen((n) => Ok(n > 0));
    expectTypeOf(chained.unwrap()).toEqualTypeOf<boolean>();

    const matchVal = res.$match({
      Ok: (v) => v > 5,
      Err: () => false,
    });
    expectTypeOf(matchVal).toEqualTypeOf<boolean>();
  });

  it("supports pattern matching via $match", () => {
    const ok = Ok("data");
    const okStr = ok.$match({
      Ok: (val) => `Success: ${val}`,
      Err: (err) => `Failed: ${err}`,
    });
    expect(okStr).toBe("Success: data");

    const err = Err(500);
    const errStr = err.$match({
      Ok: (val) => `Success: ${val}`,
      Err: (code) => `Error code: ${code}`,
    });
    expect(errStr).toBe("Error code: 500");

    expect(ok.$match({ _: () => "fallback" })).toBe("fallback");
    expect(err.$match({ _: () => "fallback" })).toBe("fallback");
  });

  it("fails type check and throws PanicError on non-exhaustive match", () => {
    const okRes: Result<number, string> = Ok(10);
    expect(() =>
      // @ts-expect-error Missing 'Ok' branch in exhaustive match
      okRes.$match({ Err: (e) => e }),
    ).toThrowError(PanicError);

    const errRes: Result<number, string> = Err("bad");
    expect(() =>
      // @ts-expect-error Missing 'Err' branch in exhaustive match
      errRes.$match({ Ok: (v) => v }),
    ).toThrowError(PanicError);
  });

  it("implements iterator protocol for yield* support", () => {
    function* runOk() {
      const val = yield* Ok(70);
      return val + 5;
    }

    const gen1 = runOk();
    const result1 = gen1.next();
    // Ok should return immediately with payload
    expect(result1.done).toBe(true);
    expect(result1.value).toBe(75);

    function* runErr() {
      yield* Err("fatal");
    }

    const gen2 = runErr();
    const result2 = gen2.next();
    // Err should yield itself for the Try runner
    expect(result2.done).toBe(false);
    if (!result2.done) {
      expect(result2.value.$variant).toBe("Err");
      expect(result2.value.$value).toBe("fatal");
    }

    const errIter = Err("fatal")[Symbol.iterator]();
    expect(errIter.next().value.$value).toBe("fatal");
    expect(() => errIter.next()).toThrowError(PanicError);
  });

  it("widens Ok and Err seamlessly without type casting", () => {
    function parseNumber(input: string): Result<number, string> {
      const parsed = Number(input);
      if (Number.isNaN(parsed)) {
        return Err(`Invalid number: ${input}`); // Result<never, string> widens to Result<number, string>
      }
      return Ok(parsed); // Result<number, never> widens to Result<number, string>
    }

    const res1 = parseNumber("42");
    expect(res1.unwrap()).toBe(42);

    const res2 = parseNumber("abc");
    expect(res2.unwrapErr()).toBe("Invalid number: abc");
  });
});
