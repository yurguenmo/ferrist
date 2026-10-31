/**
 * ferrist - Panic error and runtime panic handler.
 */

export class PanicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PanicError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PanicError);
    }
  }
}

export function panic(message: string): never {
  const err = new PanicError(message);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, panic);
  }
  throw err;
}
