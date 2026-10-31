/**
 * Example: Structured API Error Handling with Enum and Result
 *
 * Demonstrates how to model domain errors as an Enum and chain operations
 * safely without runtime exceptions or untyped try/catch blocks.
 */

import { Enum, Err, type Infer, Ok, type Result } from "../src/index.js";

// 1. Model all possible failure modes cleanly with an Enum
export const ApiError = Enum<{
  NotFound: { resource: string; id: string };
  Unauthorized: string;
  RateLimited: { retryAfterSeconds: number };
  Network: string;
}>().instance({
  toHttpStatus(): number {
    return this.$match({
      NotFound: () => 404,
      Unauthorized: () => 401,
      RateLimited: () => 429,
      Network: () => 503,
    });
  },
});

export type ApiError = Infer<typeof ApiError>;

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

// 4. Safe composition using fluent chaining: .andThen() and .map()
export function getAdminDashboard(userId: string): Result<string, ApiError> {
  return findUserById(userId)
    .andThen(verifyAdminPermission)
    .map((admin) => `Welcome to the Admin Portal, ${admin.name}!`);
}

// 5. Exhaustive pattern matching to handle both outcomes
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
