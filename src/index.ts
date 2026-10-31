/**
 * ferrist
 *
 * Bringing Rust's algebraic type safety, pattern matching, Result, Option,
 * and Try operator (`?`) to TypeScript.
 *
 * @packageDocumentation
 */

// Dedicated ADTs (Result, Option) & Combinators
export * from "./adts/index.js";
// Class-Based Enum Engine
export * from "./enum/index.js";
// Try Runner (`fn`)
export * from "./fn.js";
// Panic Utility & Error
export * from "./panic.js";
