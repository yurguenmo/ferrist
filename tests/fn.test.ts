import { describe, it, expect, expectTypeOf } from "vitest";
import {
  fn,
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
} from "../src/index.js";

describe("Try Runner - fn", () => {
  describe("Synchronous Result Pipelines", () => {
    function parsePositive(input: string): Result<number, string> {
      const n = Number(input);
      if (isNaN(n)) return Err("Not a number");
      if (n <= 0) return Err("Must be positive");
      return Ok(n);
    }

    const divideInputs = fn(function* (aStr: string, bStr: string) {
      const a = yield* parsePositive(aStr);
      const b = yield* parsePositive(bStr);
      return Ok(a / b);
    });

    it("unwraps values and returns success when all operations succeed", () => {
      expectTypeOf(divideInputs).toEqualTypeOf<(aStr: string, bStr: string) => Result<number, string>>();
      const res = divideInputs("20", "4");

      expect(res.$variant).toBe("Ok");
      expect(res.$value).toBe(5);
      expect(res.isOk()).toBe(true);
      expect(res.unwrap()).toBe(5);
    });

    it("short-circuits immediately on first Err failure", () => {
      const res1 = divideInputs("invalid", "4");
      expect(res1.$variant).toBe("Err");
      expect(res1.$value).toBe("Not a number");
      expect(res1.isErr()).toBe(true);

      const res2 = divideInputs("20", "-2");
      expect(res2.$variant).toBe("Err");
      expect(res2.$value).toBe("Must be positive");
      expect(res2.isErr()).toBe(true);
    });

    it("preserves union of distinct error types", () => {
      function checkStock(id: string): Result<number, "OUT_OF_STOCK"> {
        return id === "item1" ? Ok(10) : Err("OUT_OF_STOCK" as const);
      }

      function chargeCard(amount: number): Result<string, "INSUFFICIENT_FUNDS"> {
        return amount <= 100 ? Ok("tx_123") : Err("INSUFFICIENT_FUNDS" as const);
      }

      const checkout = fn(function* (itemId: string, amount: number) {
        const stock = yield* checkStock(itemId);
        const tx = yield* chargeCard(amount);
        return Ok({ stock, tx });
      });

      const success = checkout("item1", 50);
      expect(success.isOk()).toBe(true);
      if (success.isOk()) {
        expect(success.$value).toEqual({ stock: 10, tx: "tx_123" });
      }

      const failedStock = checkout("unknown", 50);
      expect(failedStock.$variant).toBe("Err");
      expect(failedStock.$value).toBe("OUT_OF_STOCK");

      const failedFunds = checkout("item1", 500);
      expect(failedFunds.$variant).toBe("Err");
      expect(failedFunds.$value).toBe("INSUFFICIENT_FUNDS");
    });
  });

  describe("Synchronous Option Pipelines", () => {
    const findUser = (id: string): Option<string> => (id === "42" ? Some("Alice") : None);
    const getRank = (user: string): Option<number> => (user === "Alice" ? Some(1) : None);

    const getUserRank = fn(function* (id: string) {
      const user = yield* findUser(id);
      const rank = yield* getRank(user);
      return Some({ user, rank });
    });

    it("unwraps Some and returns the mapped Some value", () => {
      const res = getUserRank("42");
      expectTypeOf(res.unwrap()).toEqualTypeOf<{ user: string; rank: number }>();
      expect(res.$variant).toBe("Some");
      expect(res.isSome()).toBe(true);
      expect(res.unwrap()).toEqual({ user: "Alice", rank: 1 });
    });

    it("short-circuits immediately on None", () => {
      const res = getUserRank("unknown");
      expect(res.$variant).toBe("None");
      expect(res.isNone()).toBe(true);
      expect(res).toBe(None);
    });
  });

  describe("Asynchronous Generators (async function*)", () => {
    async function fetchUser(id: string): Promise<Result<{ id: string; name: string }, "NOT_FOUND">> {
      if (id === "1") return Ok({ id: "1", name: "Bob" });
      return Err("NOT_FOUND" as const);
    }

    async function fetchPermissions(user: { id: string }): Promise<Result<string[], "DENIED">> {
      if (user.id === "1") return Ok(["read", "write"]);
      return Err("DENIED" as const);
    }

    const loadProfile = fn(async function* (userId: string) {
      const userResult = await fetchUser(userId);
      const user = yield* userResult;

      const permResult = await fetchPermissions(user);
      const permissions = yield* permResult;

      return Ok({ user, permissions });
    });

    it("handles async generator workflows successfully", async () => {
      const res = await loadProfile("1");
      expectTypeOf(res.unwrap()).toEqualTypeOf<{ user: { id: string; name: string }; permissions: string[] }>();

      expect(res.isOk()).toBe(true);
      expect(res.unwrap()).toEqual({
        user: { id: "1", name: "Bob" },
        permissions: ["read", "write"],
      });
    });

    it("short-circuits asynchronously on failure", async () => {
      const res = await loadProfile("99");

      expect(res.isErr()).toBe(true);
      expect(res.$value).toBe("NOT_FOUND");
    });
  });

  describe("RAII Generator Cleanup (finally block)", () => {
    it("executes finally blocks when short-circuiting on failure in sync generators", () => {
      let cleanedUp = false;

      function fail(): Result<number, string> {
        return Err("aborted");
      }

      const workflow = fn(function* () {
        try {
          yield* fail();
          return Ok(100);
        } finally {
          cleanedUp = true;
        }
      });

      const res = workflow();
      expect(res.$variant).toBe("Err");
      expect(res.$value).toBe("aborted");
      expect(cleanedUp).toBe(true);
    });

    it("executes finally blocks when short-circuiting on failure in async generators", async () => {
      let cleanedUp = false;

      const asyncWorkflow = fn(async function* () {
        try {
          yield* Err("async_error");
          return Ok("done");
        } finally {
          cleanedUp = true;
        }
      });

      const res = await asyncWorkflow();
      expect(res.$variant).toBe("Err");
      expect(cleanedUp).toBe(true);
    });
  });

  describe("Composition & Context Preservation", () => {
    it("preserves this context when used as a method", () => {
      class Calculator {
        multiplier = 2;

        compute = fn(function* (this: Calculator, a: number, b: number) {
          const res = yield* Ok(a + b);
          return Ok(res * this.multiplier);
        });
      }

      const calc = new Calculator();
      const res = calc.compute(10, 5);
      expect(res.unwrap()).toBe(30);
    });

    it("supports composition of multiple fn runners", () => {
      const step1 = fn(function* (x: number) {
        if (x < 0) return Err("negative");
        return Ok(x * 2);
      });

      const step2 = fn(function* (x: number) {
        const s1 = yield* step1(x);
        return Ok(s1 + 10);
      });

      expect(step2(5).unwrap()).toBe(20);
      expect(step2(-5).isErr()).toBe(true);
    });
  });
});
