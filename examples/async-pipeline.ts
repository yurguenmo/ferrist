/**
 * Example: Asynchronous Pipelines with the Try Operator (`fn`)
 *
 * Demonstrates:
 * 1. Early-return syntax (`yield*`) for asynchronous and synchronous workflows.
 * 2. Composing multiple `fn` pipelines seamlessly into a top-level orchestrator.
 * 3. Safe exception handling via `Result.try` and `Option.try`.
 */

import { Err, fn, Ok, Option, Result } from "../src/index.js";

// Domain Types
interface CartItem {
  sku: string;
  quantity: number;
}

interface OrderTotals {
  subtotal: number;
  discount: number;
  tax: number;
  totalUsd: number;
}

interface OrderConfirmation {
  orderId: string;
  totals: OrderTotals;
}

// ============================================================================
// 1. Sub-pipeline: Inventory verification (Async `fn`)
// ============================================================================
export const verifyInventory = fn(async function* (item: CartItem) {
  if (item.quantity <= 0) {
    return Err(`Invalid quantity (${item.quantity}) for SKU: ${item.sku}`);
  }
  if (item.sku === "OUT_OF_STOCK") {
    return Err(`Item ${item.sku} is temporarily out of stock.`);
  }

  // Simulate external stock check
  const unitPrice = 25.0;
  return Ok({ item, unitPrice });
});

// ============================================================================
// 2. Sub-pipeline: Financial calculations (Synchronous `fn`)
// ============================================================================
export const calculateTotals = fn(function* (
  item: CartItem,
  unitPrice: number,
  discountRate: number,
) {
  if (discountRate < 0 || discountRate > 1) {
    return Err("Discount rate must be between 0.0 and 1.0");
  }

  const subtotal = item.quantity * unitPrice;
  const discount = subtotal * discountRate;
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * 0.08 * 100) / 100; // 8% sales tax
  const totalUsd = taxableAmount + tax;

  return Ok({ subtotal, discount, tax, totalUsd });
});

// ============================================================================
// 3. Sub-pipeline: Payment processing (Async `fn` with `Result.try`)
// ============================================================================
export const processPayment = fn(async function* (amount: number) {
  const transactionId = yield* await Result.try(
    async () => {
      if (amount > 1000) {
        throw new Error("Charge exceeds daily transaction limit ($1000).");
      }
      return "tx_secure_987654321";
    },
    (err) => (err instanceof Error ? err.message : String(err)),
  );

  return Ok(transactionId);
});

// ============================================================================
// 4. Top-level Orchestrator: Composing multiple `fn` functions together
// ============================================================================
export const checkout = fn(async function* (
  item: CartItem,
  couponCode: string,
): AsyncGenerator<any, Result<OrderConfirmation, string>, any> {
  // Step A: Compose with async fn (verifyInventory)
  const { unitPrice } = yield* await verifyInventory(item);

  // Step B: Query optional discount safely with Option.try
  const discountRate = (
    await Option.try(async (): Promise<number> => {
      if (couponCode === "SAVE10") return 0.1; // 10% discount
      if (couponCode === "SAVE20") return 0.2; // 20% discount
      throw new Error("Invalid or expired coupon");
    })
  ).unwrapOr(0);

  // Step C: Compose with sync fn (calculateTotals)
  const totals = yield* calculateTotals(item, unitPrice, discountRate);

  // Step D: Compose with async fn (processPayment)
  const txId = yield* await processPayment(totals.totalUsd);

  return Ok({
    orderId: `order_${txId.slice(3, 10)}`,
    totals,
  });
});

// --- Runnable Demo ---
async function runDemo() {
  console.log("=== Composable Asynchronous Pipeline Demo ===");

  // 1. Successful composition with coupon:
  const res1 = await checkout({ sku: "RUST-BOOK", quantity: 2 }, "SAVE10");
  console.log("[1] Success with coupon:", res1.unwrap());

  // 2. Successful composition without coupon (Option.try None fallback):
  const res2 = await checkout({ sku: "RUST-BOOK", quantity: 1 }, "INVALID_COUPON");
  console.log("[2] Success without coupon:", res2.unwrap());

  // 3. Early return from sub-pipeline 1 (verifyInventory):
  const res3 = await checkout({ sku: "OUT_OF_STOCK", quantity: 1 }, "SAVE10");
  console.log("[3] Inventory early-return:", res3.unwrapErr());

  // 4. Early return from sub-pipeline 3 (processPayment):
  const res4 = await checkout({ sku: "LUXURY-ITEM", quantity: 50 }, "SAVE10");
  console.log("[4] Payment early-return:", res4.unwrapErr());
}

runDemo();
