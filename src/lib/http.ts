/** Small HTTP helpers shared by every route handler. */

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = "bad_request", status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { message: error.message, code: error.code, details: error.details } },
      { status: error.status },
    );
  }
  console.error("[dorisio] unhandled error", error);
  return Response.json(
    {
      error: {
        message: "حدث خطأ غير متوقع في الخادم. حاول مرة أخرى.",
        code: "server_error",
      },
    },
    { status: 500 },
  );
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data as unknown as Record<string, unknown>, init);
}

export async function readJson<T extends Record<string, unknown>>(request: Request): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError("الطلب غير صالح: البيانات المرسلة غير صحيحة.", "invalid_json");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiError("الطلب غير صالح: البيانات المرسلة غير صحيحة.", "invalid_shape");
  }
  return raw as T;
}

export function requiredString(value: unknown, field: string, max = 200): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(`الحقل «${field}» مطلوب.`, "invalid_field");
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ApiError(`الحقل «${field}» أطول من الحد المسموح.`, "invalid_field");
  }
  return trimmed;
}

export function optionalString(value: unknown, field: string, max = 500): string | null {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, field, max);
}

export function optionalInt(value: unknown, field: string, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ApiError(`الحقل «${field}» يجب أن يكون رقماً بين ${min} و ${max}.`, "invalid_field");
  }
  return Math.round(n);
}

export function uuidOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

export function requireUuid(value: unknown, field: string): string {
  const id = uuidOrNull(value);
  if (!id) throw new ApiError(`الحقل «${field}» يجب أن يكون معرّفاً صحيحاً.`, "invalid_field");
  return id;
}
