/**
 * ferrist - Enum Engine
 *
 * Implements class-based Algebraic Data Types (ADTs) with proxy-synthesized
 * variant constructors, pattern matching, and native prototype inheritance.
 */

import { panic } from "../panic.js";
import type { BaseEnumInstance, EnumClass, MatchArms, VariantNames, VariantOf } from "./types.js";
import { ENUM_VARIANTS } from "./types.js";

/**
 * Base abstract class for all Enum instances.
 */
export abstract class BaseEnum<VMap extends Record<string, any>> implements BaseEnumInstance<VMap> {
  declare readonly [ENUM_VARIANTS]?: VMap;
  readonly $variant!: keyof VMap & string;
  readonly $value!: VMap[keyof VMap & string];

  constructor() {
    panic(
      "Enums cannot be directly instantiated with 'new'. Use a variant constructor instead (e.g. MyEnum.Variant(...)).",
    );
  }

  /**
   * Type-guard checking if this instance is of the specified variant.
   */
  $is<K extends keyof VMap & string>(variant: K): this is VariantOf<this, K & VariantNames<this>> {
    return (this.$variant as any) === variant;
  }

  /**
   * Exhaustive pattern matching over all declared variants.
   */
  $match<R>(arms: MatchArms<VMap, R>): R {
    const handler = (arms as any)[this.$variant];
    if (typeof handler === "function") {
      return this.$value === undefined ? (handler as any)() : (handler as any)(this.$value);
    }
    const wildcard = (arms as any)._;
    if (typeof wildcard === "function") {
      return wildcard();
    }
    return panic(`Non-exhaustive pattern match on variant '${String(this.$variant)}'`);
  }
}

/**
 * WeakMap cache mapping each derived class to its synthesized variant constructors.
 */
const variantCache = new WeakMap<object, Map<string, any>>();

/**
 * Declares a Class-Based Algebraic Data Type (Enum).
 *
 * Subclass the returned base class to define your Enum:
 *
 * @example
 * ```ts
 * export class WebEvent extends Enum<{
 *   PageLoad: never;
 *   Click: [number, number];
 *   KeyPress: string;
 *   Paste: { text: string; source: string };
 * }>() {
 *   describe(): string {
 *     return this.$match({
 *       PageLoad: () => "Page loaded",
 *       Click: ([x, y]) => `Clicked at (${x}, ${y})`,
 *       KeyPress: (key) => `Key: ${key}`,
 *       Paste: ({ text }) => `Pasted: ${text}`,
 *     });
 *   }
 * }
 * ```
 */
export function Enum<VMap extends Record<string, any>>(): EnumClass<VMap> {
  class BaseEnumImpl extends BaseEnum<VMap> {}

  return new Proxy(BaseEnumImpl, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      if (typeof prop === "string") {
        const cacheKey = receiver ?? target;

        let classCache = variantCache.get(cacheKey);
        if (!classCache) {
          classCache = new Map<string, any>();
          variantCache.set(cacheKey, classCache);
        }

        let variant = classCache.get(prop);
        if (!variant) {
          const fn: any = function (this: any, val?: any) {
            const cls = this && this.prototype ? this : receiver;
            const instance = Object.create(cls.prototype);
            instance.$variant = prop;
            instance.$value = val;
            return Object.freeze(instance);
          };

          fn.$variant = prop;
          fn.$value = undefined;
          fn.$is = (v: string): boolean => v === prop;
          fn.$match = (arms: any) => {
            const handler = arms[prop];
            if (typeof handler === "function") {
              return handler();
            }
            if (typeof arms._ === "function") {
              return arms._();
            }
            return panic(`Non-exhaustive pattern match on variant '${prop}'`);
          };

          if (receiver?.prototype) {
            Object.setPrototypeOf(fn, receiver.prototype);
          }

          variant = Object.freeze(fn);
          classCache.set(prop, variant);
        }

        return variant;
      }

      return Reflect.get(target, prop, receiver);
    },
  }) as unknown as EnumClass<VMap>;
}
