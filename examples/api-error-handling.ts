/**
 * Example: Structured API Error Handling with Enum and Result
 *
 * Demonstrates how to model domain errors as a class-based Enum and chain operations
 * safely without runtime exceptions or untyped try/catch blocks.
 */

import { Enum, Err, Ok, Result } from "../src/index.js";

// 1. Model all possible failure modes cleanly with a class-based Enum
export class ApiError extends Enum<{
  NotFound: { resource: string; id: string };
  Unauthorized: string;
  RateLimited: { retryAfterSeconds: number };
  Network: string;
}>() {
  toHttpStatus(): number {
    return this.$match({
      NotFound: () => 404,
      Unauthorized: () => 401,
      RateLimited: () => 429,
      Network: () => 503,
    });
  }
}

// 2. Mock database records
interface User {
  id: string;
  name: string;
  role: "admin" | "member";
}

const database: Record<string, User> = {
  "user-1": { id: "user-1", name: "Alice", role: "admin" },
  "user-2": { id: "user-2", name: "Bob", role: "member" },
};

// 3. Domain functions returning Result<T, ApiError>
function findUserById(id: string): Result<User, ApiError> {
  const user = database[id];
  if (!user) {
    return Err(ApiError.NotFound({ resource: "User", id }));
  }
  return Ok(user);
}

function verifyAdminPermission(user: User): Result<User, ApiError> {
  if (user.role !== "admin") {
    return Err(ApiError.Unauthorized(`User '${user.name}' is not an admin.`));
  }
  return Ok(user);
}

// 4. Safe exception capturing using Result.try
export function parseRequestBody(rawJson: string): Result<{ userId: string }, ApiError> {
  return Result.try(
    () => JSON.parse(rawJson) as { userId: string },
    (err) => ApiError.Network(`Invalid JSON payload: ${err}`),
  );
}

// 5. Safe composition using fluent chaining: .andThen() and .map()
export function getAdminDashboard(userId: string): Result<string, ApiError> {
  return findUserById(userId)
    .andThen(verifyAdminPermission)
    .map((admin) => `Welcome to the Admin Portal, ${admin.name}!`);
}

// 6. Exhaustive pattern matching to handle both outcomes
export function renderResponse(userId: string): { status: number; body: string } {
  return getAdminDashboard(userId).$match({
    Ok: (message) => ({
      status: 200,
      body: JSON.stringify({ success: true, message }),
    }),
    Err: (error) => ({
      status: error.toHttpStatus(),
      body: JSON.stringify({
        success: false,
        error: error.$variant,
        details: error.$value,
      }),
    }),
  });
}

// --- Runnable Demo ---
console.log("=== API Error Handling Demo ===");
console.log("[1] Admin access:", renderResponse("user-1"));
console.log("[2] Member access:", renderResponse("user-2"));
console.log("[3] Unknown user:", renderResponse("user-999"));

const validBody = parseRequestBody('{"userId": "user-1"}');
console.log("[4] Valid JSON body parse:", validBody.unwrap());

const invalidBody = parseRequestBody("invalid json");
console.log("[5] Invalid JSON body parse:", invalidBody.unwrapErr().$value);
