/**
 * Example: Asynchronous Pipelines with the Try Operator (`fn`)
 *
 * Demonstrates early-return syntax (`yield*`) for asynchronous workflows,
 * eliminating pyramid-of-doom callbacks, nested ifs, and try/catch noise.
 */

import { Err, fn, None, Ok, type Option, type Result, Some } from "../src/index.js";

// Domain Types
interface CartItem {
  sku: string;
  quantity: number;
}

interface OrderConfirmation {
  orderId: string;
  totalUsd: number;
}

// Simulated external async services returning Result or Option
async function validateInventory(item: CartItem): Promise<Result<number, string>> {
  if (item.quantity <= 0) {
    return Err(`Invalid quantity for SKU: ${item.sku}`);
  }
  if (item.sku === "OUT_OF_STOCK") {
    return Err(`Item ${item.sku} is temporarily out of stock.`);
  }
  return Ok(item.quantity * 25.0); // $25 per unit
}

async function fetchUserDiscount(couponCode: string): Promise<Option<number>> {
  if (couponCode === "SAVE10") {
    return Some(0.1); // 10% discount
  }
  return None;
}

async function chargePayment(amount: number): Promise<Result<string, string>> {
  if (amount > 1000) {
    return Err("Charge exceeds daily transaction limit.");
  }
  return Ok("tx_secure_987654321");
}

/**
 * Clean linear workflow using the `fn` runner:
 * If any step returns `Err` or `None`, execution stops immediately
 * and returns the error value without executing subsequent steps.
 */
export const checkout = fn(async function* (
  item: CartItem,
  couponCode: string,
): AsyncGenerator<any, Result<OrderConfirmation, string>, any> {
  // Step 1: Validate stock & compute subtotal (early returns if Err)
  const subtotal = yield* await validateInventory(item);

  // Step 2: Apply optional discount (unwraps with fallback)
  const discount = (await fetchUserDiscount(couponCode)).unwrapOr(0);
  const finalPrice = subtotal * (1 - discount);

  // Step 3: Process transaction (early returns if Err)
  const transactionId = yield* await chargePayment(finalPrice);

  return Ok({
    orderId: `order_${transactionId.slice(3, 10)}`,
    totalUsd: finalPrice,
  });
});
