/**
 * Example: State Machine with Typestate Pattern using Class-Based Enum
 *
 * Demonstrates compile-time state transitions and variant-specific methods
 * (Typestate Pattern) without circular references, runtime exceptions, or boilerplate.
 */

import { Enum, type VariantOf } from "../src/index.js";

export class OrderState extends Enum<{
  Draft: { items: string[]; total: number };
  PendingPayment: { items: string[]; total: number; shippingAddress: string };
  Paid: { items: string[]; total: number; shippingAddress: string; txId: string };
  Shipped: { items: string[]; total: number; trackingNumber: string };
  Delivered: { items: string[]; deliveredAt: string };
  Cancelled: { items: string[]; reason: string };
}>() {
  // Common getter across all variants
  get isTerminal(): boolean {
    return this.$is("Delivered") || this.$is("Cancelled");
  }

  // Common pattern matching method across all variants
  describe(): string {
    return this.$match({
      Draft: ({ items, total }) => `Draft (${items.length} items, $${total})`,
      PendingPayment: ({ total, shippingAddress }) =>
        `Awaiting payment of $${total} to ${shippingAddress}`,
      Paid: ({ txId }) => `Paid (Transaction: ${txId})`,
      Shipped: ({ trackingNumber }) => `Shipped (Tracking: ${trackingNumber})`,
      Delivered: ({ deliveredAt }) => `Delivered at ${deliveredAt}`,
      Cancelled: ({ reason }) => `Cancelled: ${reason}`,
    });
  }

  // --- Variant-Specific Transitions (Typestate Pattern) ---

  // 1. Only callable when in 'Draft' state
  addItem(this: VariantOf<OrderState, "Draft">, item: string, price: number): OrderState {
    return OrderState.Draft({
      items: [...this.$value.items, item],
      total: this.$value.total + price,
    });
  }

  checkout(this: VariantOf<OrderState, "Draft">, shippingAddress: string): OrderState {
    return OrderState.PendingPayment({
      items: this.$value.items,
      total: this.$value.total,
      shippingAddress,
    });
  }

  // 2. Only callable when in 'PendingPayment' state
  pay(this: VariantOf<OrderState, "PendingPayment">, txId: string): OrderState {
    return OrderState.Paid({
      items: this.$value.items,
      total: this.$value.total,
      shippingAddress: this.$value.shippingAddress,
      txId,
    });
  }

  cancel(this: VariantOf<OrderState, "PendingPayment">, reason: string): OrderState {
    return OrderState.Cancelled({
      items: this.$value.items,
      reason,
    });
  }

  // 3. Only callable when in 'Paid' state
  ship(this: VariantOf<OrderState, "Paid">, trackingNumber: string): OrderState {
    return OrderState.Shipped({
      items: this.$value.items,
      total: this.$value.total,
      trackingNumber,
    });
  }

  // 4. Only callable when in 'Shipped' state
  deliver(
    this: VariantOf<OrderState, "Shipped">,
    deliveredAt = new Date().toISOString(),
  ): OrderState {
    return OrderState.Delivered({
      items: this.$value.items,
      deliveredAt,
    });
  }
}

// ============================================================================
// Execution & Demonstration
// ============================================================================

export function runDemo() {
  console.log("=== State Machine Lifecycle Demo ===");

  // Step 1: Start with Draft
  let order: OrderState = OrderState.Draft({ items: ["Mechanical Keyboard"], total: 120 });
  console.log(`[1] ${order.describe()}`);

  // Step 2: Add item (only valid on Draft)
  if (order.$is("Draft")) {
    order = order.addItem("Keycap Set", 30);
    console.log(`[2] Added item -> ${order.describe()}`);
  }

  // Step 3: Checkout (Draft -> PendingPayment)
  if (order.$is("Draft")) {
    order = order.checkout("123 Rust Street, Silicon Valley");
    console.log(`[3] Checked out -> ${order.describe()}`);
  }

  // Step 4: Pay (PendingPayment -> Paid)
  if (order.$is("PendingPayment")) {
    order = order.pay("TX_SECURE_554433");
    console.log(`[4] Paid -> ${order.describe()}`);
  }

  // Step 5: Ship (Paid -> Shipped)
  if (order.$is("Paid")) {
    order = order.ship("FEDEX-998877");
    console.log(`[5] Shipped -> ${order.describe()}`);
  }

  // Step 6: Deliver (Shipped -> Delivered)
  if (order.$is("Shipped")) {
    order = order.deliver("2026-10-31 12:00:00");
    console.log(`[6] Delivered -> ${order.describe()}`);
  }

  console.log(`Order finished? ${order.isTerminal}`);
}

// Execute if run directly
if (process.argv[1]?.endsWith("state-machine.ts")) {
  runDemo();
}
