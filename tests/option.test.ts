import { describe, expect, expectTypeOf, it } from "vitest";
import { fromNullable, None, Option, PanicError, Some, tryOption } from "../src/index.js";

describe("Option ADT", () => {
  it("constructs Some variant with correct properties and guards", () => {
    const opt = Some(42);

    expect(opt.$variant).toBe("Some");
    expect(opt.$value).toBe(42);
    expect(opt.isSome()).toBe(true);
    expect(opt.isNone()).toBe(false);
    expect(opt.$is("Some")).toBe(true);
    expect(opt.$is("None")).toBe(false);

    if (opt.$is("Some")) {
      expectTypeOf(opt.$value).toEqualTypeOf<number>();
      expect(opt.$value).toBe(42);
    }
  });

  it("constructs None variant as an immutable singleton", () => {
    const opt: Option<number> = None;

    expect(opt.$variant).toBe("None");
    expect(opt.$value).toBeUndefined();
    expect(opt.isSome()).toBe(false);
    expect(opt.isNone()).toBe(true);
    expect(opt.$is("None")).toBe(true);
    expect(opt.$is("Some")).toBe(false);

    // Singleton identity
    expect(None).toBe(Option.None);
  });

  it("unwraps Some successfully and panics on None", () => {
    const some = Some("hello");
    expect(some.unwrap()).toBe("hello");

    const none: Option<string> = None;
    expect(() => none.unwrap()).toThrowError(PanicError);
    expect(() => none.unwrap()).toThrowError(/Called Option\.unwrap\(\) on a None value/);
  });

  it("handles unwrapOr and unwrapOrElse with type safety", () => {
    const some = Some(10);
    expect(some.unwrapOr(99)).toBe(10);
    expect(some.unwrapOrElse(() => 99)).toBe(10);

    const none: Option<number> = None;
    expect(none.unwrapOr(99)).toBe(99);
    expect(none.unwrapOrElse(() => 100 + 20)).toBe(120);

    // @ts-expect-error Argument of type 'string' is not assignable to parameter of type 'number'
    none.unwrapOr("invalid");
  });

  it("maps over Some and preserves None", () => {
    const some = Some(5);
    const mapped = some.map((x) => x * 2);
    expect(mapped.unwrap()).toBe(10);
    expectTypeOf(mapped).toEqualTypeOf<Some<number>>();

    const opt: Option<number> = Some(5);
    const mappedOpt = opt.map((x) => x * 2);
    expect(mappedOpt.unwrap()).toBe(10);
    expectTypeOf(mappedOpt.unwrap()).toEqualTypeOf<number>();

    const none: Option<number> = None;
    const mappedNone = none.map((x: number) => x * 2);
    expect(mappedNone.isNone()).toBe(true);
  });

  it("chains options with andThen", () => {
    const square = (x: number): Option<number> => (x > 0 ? Some(x * x) : None);

    const somePos = Some(4).andThen(square);
    expect(somePos.unwrap()).toBe(16);

    const someNeg = Some(-2).andThen(square);
    expect(someNeg.isNone()).toBe(true);

    const none: Option<number> = None;
    expect(none.andThen(square).isNone()).toBe(true);
  });

  it("supports fluent method chaining", () => {
    const res = Some(4)
      .map((x) => x * 2)
      .andThen((x) => (x > 5 ? Some(`Count: ${x}`) : None));

    expect(res.unwrap()).toBe("Count: 8");
  });

  it("verifies compile-time types for map, andThen, and match", () => {
    const opt: Option<number> = Some(10);

    const mapped = opt.map((n) => `num_${n}`);
    expectTypeOf(mapped.unwrap()).toEqualTypeOf<string>();

    const chained = opt.andThen((n) => (n > 0 ? Some(true) : None));
    expectTypeOf(chained.unwrap()).toEqualTypeOf<boolean>();

    const matched = opt.$match({
      Some: (v) => v > 0,
      None: () => false,
    });
    expectTypeOf(matched).toEqualTypeOf<boolean>();
  });

  it("creates Option from nullable values using Option.fromNullable", () => {
    const o1 = Option.fromNullable("present");
    expect(o1.isSome()).toBe(true);
    expect(o1.unwrap()).toBe("present");

    const o2 = Option.fromNullable(null);
    expect(o2.isNone()).toBe(true);

    const o3 = Option.fromNullable(undefined);
    expect(o3.isNone()).toBe(true);
  });

  it("supports pattern matching via $match", () => {
    const some = Some(100);
    const sStr = some.$match({
      Some: (v) => `Value: ${v}`,
      None: () => "Empty",
    });
    expect(sStr).toBe("Value: 100");

    const none: Option<number> = None;
    const nStr = none.$match({
      Some: (v) => `Value: ${v}`,
      None: () => "Empty",
    });
    expect(nStr).toBe("Empty");

    expect(some.$match({ _: () => "fallback" })).toBe("fallback");
    expect(none.$match({ _: () => "fallback" })).toBe("fallback");
  });

  it("fails type check and throws PanicError on non-exhaustive match", () => {
    const someOpt: Option<number> = Some(10);
    expect(() =>
      // @ts-expect-error Missing 'Some' branch in exhaustive match
      someOpt.$match({ None: () => 0 }),
    ).toThrowError(PanicError);

    const noneOpt: Option<number> = None;
    expect(() =>
      // @ts-expect-error Missing 'None' branch in exhaustive match
      noneOpt.$match({ Some: (v) => v }),
    ).toThrowError(PanicError);
  });

  it("implements iterator protocol for yield* support", () => {
    function* runSome() {
      const val = yield* Some(50);
      return val + 10;
    }

    const gen1 = runSome();
    const result1 = gen1.next();
    // Some should not yield early; it immediately returns the value
    expect(result1.done).toBe(true);
    expect(result1.value).toBe(60);

    function* runNone() {
      yield* None;
    }

    const gen2 = runNone();
    const result2 = gen2.next();
    // None yields this (None singleton) for the Try runner to intercept
    expect(result2.done).toBe(false);
    expect(result2.value).toBe(None);

    const noneIter = None[Symbol.iterator]();
    expect(noneIter.next().value).toBe(None);
    expect(() => noneIter.next()).toThrowError(PanicError);
  });

  it("widens None seamlessly to Option<T> without explicit casting", () => {
    function getOption(condition: boolean): Option<string> {
      if (condition) {
        return Some("ok");
      }
      return None; // None: Option<never> automatically widens to Option<string>
    }

    expect(getOption(true).unwrap()).toBe("ok");
    expect(getOption(false).isNone()).toBe(true);
  });

  it("works identically with standalone fromNullable function", () => {
    expect(fromNullable("val").unwrap()).toBe("val");
    expect(fromNullable(null).isNone()).toBe(true);
    expect(fromNullable(undefined).isNone()).toBe(true);
  });
});

describe("Option.try & tryOption (Unified Exception Handling)", () => {
  describe("synchronous execution", () => {
    it("captures successful synchronous execution in Some", () => {
      const opt = Option.try(() => JSON.parse('{"status": "ok"}'));
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toEqual({ status: "ok" });
      expectTypeOf(opt).toEqualTypeOf<Option<any>>();
    });

    it("captures thrown exception returning None", () => {
      const opt = Option.try(() => JSON.parse("invalid json"));
      expect(opt.isNone()).toBe(true);
      expectTypeOf(opt).toEqualTypeOf<Option<any>>();
    });

    it("works identically with standalone tryOption function", () => {
      const some = tryOption(() => 42);
      expect(some.unwrap()).toBe(42);
      expectTypeOf(some).toEqualTypeOf<Option<number>>();

      const none = tryOption(() => {
        throw new Error("fail");
      });
      expect(none.isNone()).toBe(true);
      expectTypeOf(none).toEqualTypeOf<Option<never>>();
    });
  });

  describe("asynchronous execution", () => {
    it("captures resolved async function in Some", async () => {
      const opt = await Option.try(async () => "async_value");
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe("async_value");
      expectTypeOf(opt).toEqualTypeOf<Option<string>>();
    });

    it("captures rejected async function in None", async () => {
      const opt = await Option.try(async () => {
        throw new Error("async_rejection");
      });
      expect(opt.isNone()).toBe(true);
      expectTypeOf(opt).toEqualTypeOf<Option<never>>();
    });

    it("captures non-async function returning a rejected Promise", async () => {
      const opt = await Option.try(() => Promise.reject("raw_rejection"));
      expect(opt.isNone()).toBe(true);
    });

    it("captures truly asynchronous delayed execution (setTimeout resolved)", async () => {
      const delayedSuccess = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("delayed_ok"), 500);
        });

      const opt = await Option.try(delayedSuccess);
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe("delayed_ok");
      expectTypeOf(opt).toEqualTypeOf<Option<string>>();
    });

    it("captures truly asynchronous delayed execution (setTimeout rejected)", async () => {
      const delayedFailure = () =>
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("delayed_error")), 500);
        });

      const opt = await Option.try(delayedFailure);
      expect(opt.isNone()).toBe(true);
      expectTypeOf(opt).toEqualTypeOf<Option<string>>();
    });

    it("works identically with standalone tryOption function for async", async () => {
      const some = await tryOption(async () => 99);
      expect(some.unwrap()).toBe(99);
      expectTypeOf(some).toEqualTypeOf<Option<number>>();

      const none = await tryOption(async () => {
        throw "raw_error";
      });
      expect(none.isNone()).toBe(true);
      expectTypeOf(none).toEqualTypeOf<Option<never>>();
    });
  });
});
