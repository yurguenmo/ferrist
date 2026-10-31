/**
 * ferrist
 *
 * Bringing Rust's algebraic type safety, pattern matching, Result, Option,
 * and Try operator (`?`) to TypeScript.
 *
 * @packageDocumentation
 */

// Enum Engine & Infer
export * from "./enum/index.js";

// Panic Utility & Error
export * from "./panic.js";

// Dedicated ADTs (Result, Option) & Combinators
export * from "./adts/index.js";

// Try Runner (`fn`)
export * from "./fn.js";
