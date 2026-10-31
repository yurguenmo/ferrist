/**
 * ferrist - Enum Type System
 *
 * Provides pure type-level definitions for Class-Based Algebraic Data Types (ADTs).
 */

/**
 * Symbol branding for preserving variant definitions on the Enum class instance.
 */
export const ENUM_VARIANTS: unique symbol = Symbol("ferrist.enum.variants");

/**
 * Extracts the declared variant discriminator names of an Enum class.
 */
export type VariantNames<T> = T extends { readonly [ENUM_VARIANTS]?: infer V }
  ? keyof V & string
  : string;

/**
 * Discriminator tag and payload branch of an Enum instance for variant `K`.
 */
export type VariantOf<T, K extends VariantNames<T> = VariantNames<T>> = Omit<
  T,
  "$variant" | "$value"
> & {
  readonly [ENUM_VARIANTS]?: T extends { readonly [ENUM_VARIANTS]?: infer V } ? V : never;
  /** The active variant discriminator name. */
  readonly $variant: K;
  /** The variant's inner payload value. */
  readonly $value: T extends { readonly [ENUM_VARIANTS]?: infer V }
    ? K extends keyof V
      ? V[K]
      : never
    : any;
};

/**
 * Exhaustive pattern matching arms definition.
 * - If `VMap[K]` is `never`, `void`, or `undefined`, the handler takes no arguments: `() => R`.
 * - Otherwise, the handler receives the payload: `(val: VMap[K]) => R`.
 * - Wildcard `_(): R` can be provided for partial matching.
 */
export type MatchArms<VMap extends Record<string, any>, R> =
  | {
      [K in keyof VMap]: [VMap[K]] extends [never]
        ? () => R
        : VMap[K] extends void | undefined
          ? () => R
          : (val: VMap[K]) => R;
    }
  | (Partial<{
      [K in keyof VMap]: [VMap[K]] extends [never]
        ? () => R
        : VMap[K] extends void | undefined
          ? () => R
          : (val: VMap[K]) => R;
    }> & {
      _(): R;
    });

/**
 * Argument tuple for variant constructors based on payload type.
 */
export type VariantArgs<T> = [T] extends [never]
  ? []
  : T extends void | undefined
    ? []
    : [value: T];

/**
 * Factory function for constructing a specific variant `K`.
 */
export type VariantFactory<VMap extends Record<string, any>, K extends keyof VMap & string> = {
  <TThis extends abstract new (...args: any[]) => any>(
    this: TThis,
    ...args: VariantArgs<VMap[K]>
  ): VariantOf<InstanceType<TThis>, K & VariantNames<InstanceType<TThis>>>;
  (
    this: void,
    ...args: VariantArgs<VMap[K]>
  ): VariantOf<BaseEnumInstance<VMap>, K & VariantNames<BaseEnumInstance<VMap>>>;
  /** The variant name when accessed as a unit singleton. */
  readonly $variant: K;
  /** The variant payload when accessed as a unit singleton. */
  readonly $value: VMap[K];
  /** Type-guard checking if this unit instance is of the specified variant. */
  $is<VariantName extends keyof VMap & string>(variant: VariantName): boolean;
  /** Pattern matching on the unit instance. */
  $match<R>(arms: MatchArms<VMap, R>): R;
};

/**
 * Static variant constructors exposed on the Enum class.
 */
export type StaticVariants<VMap extends Record<string, any>> = {
  readonly [K in keyof VMap & string]: VariantFactory<VMap, K>;
};

/**
 * Public interface implemented by all Enum instances.
 */
export interface BaseEnumInstance<VMap extends Record<string, any>> {
  readonly [ENUM_VARIANTS]?: VMap;
  readonly $variant: keyof VMap & string;
  readonly $value: VMap[keyof VMap & string];

  $is<K extends keyof VMap & string>(variant: K): this is VariantOf<this, K & VariantNames<this>>;
  $match<R>(arms: MatchArms<VMap, R>): R;
}

/**
 * Base class constructor returned by `Enum<{ ... }>()`.
 */
export type EnumClass<VMap extends Record<string, any>> = {
  new (): BaseEnumInstance<VMap>;
} & StaticVariants<VMap>;
