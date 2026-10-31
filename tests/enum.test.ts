import { describe, expect, expectTypeOf, it } from "vitest";
import { ENUM_VARIANTS, Enum, PanicError, type VariantOf } from "../src/index.js";

describe("Enum - Unit Enum (C-Like)", () => {
  class OrderStatus extends Enum<{
    Pending: never;
    Processing: never;
    Completed: never;
    Cancelled: never;
  }>() {
    isTerminal(): boolean {
      return this.$match({
        Pending: () => false,
        Processing: () => false,
        Completed: () => true,
        Cancelled: () => true,
      });
    }

    canCancel(): boolean {
      return this.$match({
        Pending: () => true,
        Processing: () => true,
        Completed: () => false,
        Cancelled: () => false,
      });
    }

    static default(): OrderStatus {
      return OrderStatus.Pending();
    }
  }

  it("constructs Unit variants as callable functions and singletons", () => {
    const status1 = OrderStatus.Pending;
    const status2 = OrderStatus.Pending();

    expect(status1.$variant).toBe("Pending");
    expect(status1.$value).toBeUndefined();
    expect(status1.$is("Pending")).toBe(true);
    expect(status1.$is("Processing")).toBe(false);

    expect(status2.$variant).toBe("Pending");
    expect(status2.isTerminal()).toBe(false);
    expect(status2.canCancel()).toBe(true);

    const completed = OrderStatus.Completed();
    expect(completed.isTerminal()).toBe(true);
    expect(completed.canCancel()).toBe(false);

    expect(status2.$match({ Pending: () => "unit_called", _: () => "other" })).toBe("unit_called");
    expect(status1.$match({ Pending: () => "unit_val", _: () => "other" })).toBe("unit_val");
    expect(status1.$match({ _: () => "wildcard_on_unit" })).toBe("wildcard_on_unit");
  });

  it("ensures variant instances inherit from the Enum subclass", () => {
    const status1 = OrderStatus.Pending;
    const status2 = OrderStatus.Pending();
    const completed = OrderStatus.Completed();

    expect(status1 instanceof OrderStatus).toBe(true);
    expect(status2 instanceof OrderStatus).toBe(true);
    expect(completed instanceof OrderStatus).toBe(true);
  });

  it("disallows direct instantiation via 'new'", () => {
    expect(() => new OrderStatus()).toThrowError(PanicError);
    expect(() => new OrderStatus()).toThrowError(
      "Enums cannot be directly instantiated with 'new'. Use a variant constructor instead",
    );
  });

  it("rejects arguments passed to Unit variant constructors", () => {
    // @ts-expect-error Unit variants expect 0 arguments
    OrderStatus.Pending("extra_arg");
  });

  it("executes static helper methods defined on the Enum class", () => {
    const def = OrderStatus.default();
    expect(def.$variant).toBe("Pending");
    expect(def instanceof OrderStatus).toBe(true);
  });

  it("performs exhaustive pattern matching via $match with verified return type", () => {
    const status: OrderStatus = OrderStatus.Processing();
    const msg = status.$match({
      Pending: () => "order_pending",
      Processing: () => "order_processing",
      Completed: () => "order_completed",
      Cancelled: () => "order_cancelled",
    });

    expectTypeOf(msg).toEqualTypeOf<string>();
    expect(msg).toBe("order_processing");
  });

  it("supports wildcard fallback in $match", () => {
    const status: OrderStatus = OrderStatus.Cancelled();
    const msg = status.$match({
      Completed: () => "success",
      _() {
        return "not_success";
      },
    });

    expectTypeOf(msg).toEqualTypeOf<string>();
    expect(msg).toBe("not_success");
  });

  it("throws PanicError on unit variant when matched non-exhaustively", () => {
    expect(() =>
      // @ts-expect-error Missing Pending branch in exhaustive match
      OrderStatus.Pending.$match({ Completed: () => "ok" }),
    ).toThrowError(PanicError);

    const pendingInstance = OrderStatus.Pending();
    expect(() =>
      // @ts-expect-error Missing Pending branch in exhaustive match
      pendingInstance.$match({ Completed: () => "ok" }),
    ).toThrowError(PanicError);
  });

  it("handles Symbol property access on Enum class proxy", () => {
    expect(Reflect.get(OrderStatus, "Pending", null).$variant).toBe("Pending");
    // @ts-expect-error Non-existent symbol access on Enum proxy
    expect(OrderStatus[Symbol.for("custom")]).toBeUndefined();
    // @ts-expect-error Non-existent symbol access on Enum proxy
    expect(OrderStatus[Symbol.toStringTag]).toBeUndefined();
    // @ts-expect-error Non-existent symbol access on Enum proxy
    expect(OrderStatus[ENUM_VARIANTS]).toBeUndefined();
  });
});

describe("Enum - Data Variants (Array, Primitive, and Object)", () => {
  class WebEvent extends Enum<{
    PageLoad: never;
    Click: [number, number];
    KeyPress: string;
    Paste: { text: string; source: string };
  }>() {
    describe(): string {
      return this.$match({
        PageLoad: () => "Page loaded",
        Click: ([x, y]) => `Clicked at (${x}, ${y})`,
        KeyPress: (key) => `Key pressed: ${key}`,
        Paste: ({ text, source }) => `Pasted "${text}" from ${source}`,
      });
    }
  }

  it("rejects invalid payloads passed to variant constructors", () => {
    // @ts-expect-error Click expects [number, number], not a string
    WebEvent.Click("invalid");

    // @ts-expect-error KeyPress expects string, not a number
    WebEvent.KeyPress(123);

    // @ts-expect-error Paste expects { text: string; source: string }
    WebEvent.Paste({ text: "only_text" });
  });

  it("constructs and matches array / tuple variants with array destructuring", () => {
    const ev = WebEvent.Click([100, 250]);

    expect(ev.$variant).toBe("Click");
    expect(ev.$value).toEqual([100, 250]);
    expect(ev.describe()).toBe("Clicked at (100, 250)");
    expect(ev instanceof WebEvent).toBe(true);

    if (ev.$is("Click")) {
      expectTypeOf(ev.$value).toEqualTypeOf<[number, number]>();
      const [x, y] = ev.$value;
      expect(x).toBe(100);
      expect(y).toBe(250);
    }
  });

  it("constructs and matches primitive variants", () => {
    const ev = WebEvent.KeyPress("Enter");

    expect(ev.$variant).toBe("KeyPress");
    expect(ev.$value).toBe("Enter");
    expect(ev.describe()).toBe("Key pressed: Enter");
    expect(ev instanceof WebEvent).toBe(true);

    if (ev.$is("KeyPress")) {
      expectTypeOf(ev.$value).toEqualTypeOf<string>();
      expect(ev.$value).toBe("Enter");
    }
  });

  it("constructs and matches object / struct variants", () => {
    const ev = WebEvent.Paste({ text: "Hello, Ferris!", source: "clipboard" });

    expect(ev.$variant).toBe("Paste");
    expect(ev.$value).toEqual({ text: "Hello, Ferris!", source: "clipboard" });
    expect(ev.describe()).toBe('Pasted "Hello, Ferris!" from clipboard');
    expect(ev instanceof WebEvent).toBe(true);

    if (ev.$is("Paste")) {
      expectTypeOf(ev.$value).toEqualTypeOf<{ text: string; source: string }>();
      expect(ev.$value.text).toBe("Hello, Ferris!");
    }
  });

  it("narrows types using $is type guard", () => {
    const ev: WebEvent = WebEvent.Click([50, 60]);

    if (ev.$is("Click")) {
      expectTypeOf(ev.$value).toEqualTypeOf<[number, number]>();
      expect(ev.$value[0]).toBe(50);
    } else {
      expectTypeOf(ev).not.toEqualTypeOf<typeof WebEvent.Click>();
    }
  });

  it("fails type check and throws PanicError on non-exhaustive match without wildcard", () => {
    const ev: WebEvent = WebEvent.KeyPress("A");

    expect(() =>
      // @ts-expect-error Missing Click, PageLoad, Paste branches in exhaustive match
      ev.$match({ PageLoad: () => "ok" }),
    ).toThrowError(PanicError);

    expect(ev.$match({ _: () => "fallback" })).toBe("fallback");
  });

  it("supports destructuring constructor functions without losing subclass prototype", () => {
    const { Click } = WebEvent;
    const detachedClick = Click([12, 34]);
    expect(detachedClick instanceof WebEvent).toBe(true);
    expect((detachedClick as WebEvent).describe()).toBe("Clicked at (12, 34)");
  });

  it("supports pattern matching with distinct return types per variant", () => {
    const click = WebEvent.Click([10, 20]);
    const res1 = click.$match({
      PageLoad: () => null,
      Click: ([x, y]) => x + y,
      KeyPress: (key) => key,
      Paste: ({ text }) => text.length > 0,
    });
    expectTypeOf(res1).toEqualTypeOf<null | number | string | boolean>();
    expect(res1).toBe(30);

    const paste = WebEvent.Paste({ text: "ferrist", source: "clipboard" });
    const res2 = paste.$match({
      PageLoad: () => null,
      Click: ([x, y]) => x + y,
      KeyPress: (key) => key,
      Paste: ({ text }) => text.length > 0,
    });
    expectTypeOf(res2).toEqualTypeOf<null | number | string | boolean>();
    expect(res2).toBe(true);

    // Partial with wildcard returning distinct type
    const wildcardVal = click.$match({
      Click: ([x, y]) => x * y,
      _: () => "other",
    });
    expectTypeOf(wildcardVal).toEqualTypeOf<number | string>();
    expect(wildcardVal).toBe(200);

    // Unit singleton pattern matching with distinct return types
    const pageLoadVal = WebEvent.PageLoad.$match({
      PageLoad: () => 100,
      Click: () => "click",
      KeyPress: () => false,
      Paste: () => null,
    });
    expectTypeOf(pageLoadVal).toEqualTypeOf<number | string | boolean | null>();
    expect(pageLoadVal).toBe(100);

    // Explicit single generic argument for backward compatibility
    const explicitVal = click.$match<string>({
      PageLoad: () => "load",
      Click: ([x, y]) => `${x}:${y}`,
      KeyPress: (k) => k,
      Paste: (p) => p.text,
    });
    expectTypeOf(explicitVal).toEqualTypeOf<string>();
    expect(explicitVal).toBe("10:20");
  });
});

describe("Enum - Variant-Specific Methods (Typestate Pattern)", () => {
  class PaymentState extends Enum<{
    Draft: { amount: number; customerId: string };
    Authorized: { amount: number; authCode: string };
    Captured: { amount: number; transactionId: string };
  }>() {
    isTerminal(): boolean {
      return this.$is("Captured");
    }

    // Only callable on Draft
    authorize(this: VariantOf<PaymentState, "Draft">, authCode: string): PaymentState {
      return PaymentState.Authorized({
        amount: this.$value.amount,
        authCode,
      });
    }

    // Only callable on Authorized
    capture(this: VariantOf<PaymentState, "Authorized">, transactionId: string): PaymentState {
      return PaymentState.Captured({
        amount: this.$value.amount,
        transactionId,
      });
    }
  }

  it("allows calling variant-specific methods directly on narrowed instances", () => {
    const draft = PaymentState.Draft({ amount: 100, customerId: "cust_1" });
    expect(draft.isTerminal()).toBe(false);

    // Draft can be authorized:
    const authorized = draft.authorize("AUTH_999");
    expect(authorized.$variant).toBe("Authorized");
    expect(authorized instanceof PaymentState).toBe(true);

    if (authorized.$is("Authorized")) {
      expect(authorized.$value.authCode).toBe("AUTH_999");
      const captured = authorized.capture("TX_123");
      expect(captured.$variant).toBe("Captured");
      expect(captured.isTerminal()).toBe(true);
      if (captured.$is("Captured")) {
        expect(captured.$value.transactionId).toBe("TX_123");
      }
    }
  });

  it("prevents calling variant-specific methods on incorrect variants at compile time", () => {
    const draft = PaymentState.Draft({ amount: 50, customerId: "c1" });
    const auth = PaymentState.Authorized({ amount: 50, authCode: "A1" });

    // @ts-expect-error Cannot capture() on Draft
    draft.capture("TX_0");

    // @ts-expect-error Cannot authorize() on Authorized
    auth.authorize("A2");
  });

  it("rejects non-existent variant names in VariantOf at compile time", () => {
    // @ts-expect-error 'NonExistent' is not assignable to 'Draft' | 'Authorized' | 'Captured'
    type InvalidVariant = VariantOf<PaymentState, "NonExistent">;
    const test: InvalidVariant = undefined as never;
    expect(test).toBeUndefined();
  });

  it("allows unlocking variant-specific methods on a generic union via $is", () => {
    function processState(state: PaymentState): string {
      // @ts-expect-error Cannot call authorize on generic PaymentState without narrowing
      state.authorize("AUTH_X");

      if (state.$is("Draft")) {
        const next = state.authorize("AUTH_X");
        return next.$variant;
      }
      return "skipped";
    }

    const res = processState(PaymentState.Draft({ amount: 10, customerId: "c" }));
    expect(res).toBe("Authorized");
  });
});

describe("Enum - Compatibility with void Unit Variants", () => {
  class VoidEnum extends Enum<{
    Start: void;
    End: void;
  }>() {}

  it("supports void payload definitions for unit variants", () => {
    const start = VoidEnum.Start();
    expect(start.$variant).toBe("Start");
    expect(start.$is("Start")).toBe(true);
    expect(start.$match({ Start: () => "started", End: () => "ended" })).toBe("started");
  });
});
