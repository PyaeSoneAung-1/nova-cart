import { Prisma } from "@prisma/client";

/**
 * Deep-serializes Prisma result objects so they are JSON-safe:
 * - Prisma.Decimal  → number (money as cents-safe float for display)
 * - Date            → ISO string
 * - JsonValue       → left as-is (already JSON-safe)
 */
export function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) return data.toISOString() as T;
  if (typeof data === "bigint") return Number(data) as T;
  if (data instanceof Prisma.Decimal) return data.toNumber() as T;
  if (Array.isArray(data)) return data.map((item) => serializeData(item)) as T;
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = serializeData(value);
    }
    return result as T;
  }
  return data;
}

/** Standard success envelope: { success, message, data }. */
export function successResponse(message: string, data: unknown) {
  return { success: true, message, data };
}

/** Standard error envelope: { success, message, errors }. */
export function errorBody(message: string, errors: unknown[] = []) {
  return { success: false, message, errors };
}
