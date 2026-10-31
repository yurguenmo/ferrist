import { describe, it, expect, expectTypeOf } from "vitest";
import { Enum, Infer, PanicError, Err, Ok } from "../src/index.js";

describe("Enum - Unit Enum (C-Like)", () => {
  const OrderStatus = Enum<{
    Pending: never;
    Processing: never;
    Completed: never;
    Cancelled: never;
  }>()
    .instance({
      isTerminal(): boolean {
        return this.$match({
          Pending: () => false,
          Processing: () => false,
          Completed: () => true,
          Cancelled: () => true,
        });
      },
      canCancel(): boolean {
        return this.$match({
          Pending: () => true,
          Processing: () => true,
          Completed: () => false,
          Cancelled: () => false,
        });
      },
    })
    .static({
      default() {
        return this.Pending;
      },
    });

  type OrderStatus = Infer<typeof OrderStatus>;

  it("constructs Unit variants as immutable singletons and callable functions", () => {
    const status1 = OrderStatus.Pending;
    const status2 = OrderStatus.Pending();

    expect(status1.$variant).toBe("Pending");
    expect(status1.$value).toBeUndefined();
    expect(status1.$is("Pending")).toBe(true);
    expect(status1.$is("Processing")).toBe(false);

    expect(status2.$variant).toBe("Pending");
    expect(status1.isTerminal()).toBe(false);
    expect(status1.canCancel()).toBe(true);

    const completed = OrderStatus.Completed;
    expect(completed.isTerminal()).toBe(true);
    expect(completed.canCancel()).toBe(false);
  });

  it("rejects arguments passed to Unit variant constructors", () => {
    // @ts-expect-error Unit variants expect 0 arguments
    OrderStatus.Pending("extra_arg");
  });

  it("executes static helper methods attached to Enum constructor", () => {
    const def = OrderStatus.default();
    expect(def.$variant).toBe("Pending");
    const status: OrderStatus = def;
    expect(status.$variant).toBe("Pending");
  });

  it("performs exhaustive pattern matching via $match with verified return type", () => {
    const status: OrderStatus = OrderStatus.Processing;
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
    const status: OrderStatus = OrderStatus.Cancelled;
    const msg = status.$match({
      Completed: () => "success",
      _() {
        return "not_success";
      },
    });

    expectTypeOf(msg).toEqualTypeOf<string>();
    expect(msg).toBe("not_success");
  });
});

describe("Enum - Data Variants (Array, Primitive, and Object)", () => {
  const WebEvent = Enum<{
    PageLoad: never;
    Click: [number, number];
    KeyPress: string;
    Paste: { text: string; source: string };
  }>()
    .instance({
      describe(): string {
        return this.$match({
          PageLoad: () => "Page loaded",
          Click: ([x, y]) => `Clicked at (${x}, ${y})`,
          KeyPress: (key) => `Key pressed: ${key}`,
          Paste: ({ text, source }) => `Pasted "${text}" from ${source}`,
        });
      },
    });

  type WebEvent = Infer<typeof WebEvent>;

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
      ev.$match({ PageLoad: () => "ok" })
    ).toThrowError(PanicError);
  });
});

describe("Enum - Type Safety", () => {
  it("infers un-annotated function returns with exact types", () => {
    function divide(a: number, b: number) {
      if (b === 0) return Err("zero");
      return Ok(a / b);
    }

    const res = divide(10, 2);
    const val = res.unwrap();

    expectTypeOf(val).toEqualTypeOf<number>();
    expect(val).toBe(5);

    const fallback = divide(10, 0).unwrapOr(999);
    expectTypeOf(fallback).toEqualTypeOf<number>();
    expect(fallback).toBe(999);
  });
});
