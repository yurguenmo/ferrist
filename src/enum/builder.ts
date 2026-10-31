/**
 * ferrist - Enum Builder Engine
 *
 * Implements pure type-level Enums with proxy-based constructor synthesis,
 * pattern matching, and optional instance/static behavior attachment.
 */

import { panic } from "../panic.js";
import { ENUM_INSTANCE, type EnumType } from "./types.js";

/**
 * Creates an immutable enum variant instance.
 */
function createInstance(
  variant: string,
  value: any,
  instanceMethods: Record<string, any>,
  self: any,
) {
  const instance = Object.create(instanceMethods);
  instance.$variant = variant;
  instance.$value = value;
  instance.$Self = self;

  instance.$is = function (v: string): boolean {
    return this.$variant === v;
  };

  instance.$match = function (arms: any) {
    const handler = arms[this.$variant];
    if (typeof handler === "function") {
      return this.$value === undefined ? handler() : handler(this.$value);
    }
    if (typeof arms._ === "function") {
      return arms._();
    }
    return panic(`Non-exhaustive pattern match on variant '${this.$variant}'`);
  };

  return Object.freeze(instance);
}

/**
 * Declares an Algebraic Data Type (Enum).
 *
 * Variants are declared as a type dictionary mapping variant names to their payload types:
 * - `never`: Unit variant with no payload (accessible as property or zero-arg call).
 * - Primitive / Object / Tuple: Data variant taking a single payload argument.
 *
 * Methods and static helpers can be optionally attached via `.instance({...})` and `.static({...})`.
 *
 * @example
 * ```ts
 * export const WebEvent = Enum<{
 *   PageLoad: never;
 *   Click: [number, number];
 *   KeyPress: string;
 *   Paste: { text: string; source: string };
 * }>()
 *   .instance({
 *     describe(): string {
 *       return this.$match({
 *         PageLoad: () => "Page loaded",
 *         Click: ([x, y]) => `Clicked at (${x}, ${y})`,
 *         KeyPress: (k) => `Key: ${k}`,
 *         Paste: ({ text }) => `Pasted: ${text}`,
 *       });
 *     },
 *   });
 *
 * export type WebEvent = Infer<typeof WebEvent>;
 * ```
 */
export function Enum<VMap extends Record<string, any>>(): EnumType<VMap> {
  const staticMethods: Record<string, any> = {};
  const instanceMethods: Record<string, any> = {};

  const builder: any = {
    static(methods: Record<string, any>) {
      Object.assign(staticMethods, methods);
      return proxy;
    },
    instance(methods: Record<string, any>) {
      Object.assign(instanceMethods, methods);
      return proxy;
    },
  };

  const variantCache = new Map<string, any>();

  function getVariant(name: string) {
    let variant = variantCache.get(name);
    if (!variant) {
      // The variant is callable: e.g. WebEvent.Click([10, 20])
      const fn: any = (val?: any) => createInstance(name, val, instanceMethods, proxy);

      // Also directly usable as an instance for Unit variants: e.g. WebEvent.PageLoad
      fn.$variant = name;
      fn.$value = undefined;
      fn.$Self = proxy;
      fn.$is = (v: string): boolean => v === name;
      fn.$match = (arms: any) => {
        if (typeof arms[name] === "function") {
          return arms[name]();
        }
        if (typeof arms._ === "function") {
          return arms._();
        }
        return panic(`Non-exhaustive pattern match on variant '${name}'`);
      };

      // Inherit instance methods on the unit instance
      Object.setPrototypeOf(fn, instanceMethods);
      variant = Object.freeze(fn);
      variantCache.set(name, variant);
    }
    return variant;
  }

  const proxy: any = new Proxy(builder, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        if (prop === ENUM_INSTANCE) {
          return undefined;
        }
        return Reflect.get(target, prop, receiver);
      }
      if (prop === "static" || prop === "instance") {
        return target[prop];
      }
      if (prop in staticMethods) {
        return staticMethods[prop];
      }
      // Any other property access synthesizes the variant constructor
      return getVariant(prop);
    },
  });

  return proxy;
}
