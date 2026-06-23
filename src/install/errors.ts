import { redactSecrets } from "./redact.js";

export type InstallErrorCode =
  | "backup_failed"
  | "invalid_config"
  | "missing_home"
  | "rollback_failed"
  | "secret_required"
  | "unsupported_model"
  | "unexpected_error"
  | "write_failed";

export interface InstallFailureResult {
  readonly errorCode: InstallErrorCode;
  readonly message: string;
  readonly ok: false;
  readonly status: "failed";
}

export class InstallError extends Error {
  constructor(
    readonly errorCode: InstallErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export function toFailureResult(error: unknown): InstallFailureResult {
  if (error instanceof InstallError) {
    return {
      errorCode: error.errorCode,
      message: redactSecrets(error.message),
      ok: false,
      status: "failed",
    };
  }

  if (isMissingHomeError(error)) {
    return {
      errorCode: "missing_home",
      message: redactSecrets(error.message),
      ok: false,
      status: "failed",
    };
  }

  return {
    errorCode: "unexpected_error",
    message: redactSecrets(
      error instanceof Error ? error.message : "Unknown failure.",
    ),
    ok: false,
    status: "failed",
  };
}

function isMissingHomeError(error: unknown): error is Error {
  return (
    error instanceof Error && /home directory|user's home/i.test(error.message)
  );
}
