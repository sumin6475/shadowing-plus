// Small strict-schema helpers, independent of Deno/Supabase for regression tests.
export type Schema = {
  type?: string | string[];
  enum?: readonly unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: false;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
};
export const str: Schema = { type: "string" };
export const nullable: Schema = { type: ["string", "null"] };
export const enumeration = (values: readonly unknown[]): Schema => ({
  type: "string",
  enum: values,
});
export const array = (
  items: Schema,
  maxItems: number,
  minItems = 0,
): Schema => ({ type: "array", items, minItems, maxItems });
export const object = (properties: Record<string, Schema>): Schema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
export function conforms(schema: Schema, value: unknown): boolean {
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (Array.isArray(schema.type)) {
    return schema.type.some((type) => conforms({ ...schema, type }, value));
  }
  switch (schema.type) {
    case "null":
      return value === null;
    case "string":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "array":
      return Array.isArray(value) && value.length >= (schema.minItems ?? 0) &&
        value.length <= (schema.maxItems ?? Infinity) &&
        value.every((item) => conforms(schema.items!, item));
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }
      const row = value as Record<string, unknown>;
      return Object.keys(row).every((key) => Object.hasOwn(schema.properties!, key)) &&
        schema.required!.every((key) =>
          Object.hasOwn(row, key) && conforms(schema.properties![key], row[key])
        );
    }
    default:
      return false;
  }
}
export const codePoints = (text: string) => [...text].length;
export function bounded(value: string | null, max: number, required = true) {
  return value === null
    ? !required
    : codePoints(value) <= max && (!required || value.trim().length > 0);
}
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LANGUAGES = ["en", "ko", "zh-Hant", "ja", "es", "ru"] as const;
export const LEVELS = ["a2", "b1", "b2", "c1"] as const;
export const CATEGORIES = [
  "reference_clarity",
  "sentence_boundaries",
  "connections",
  "verb_patterns",
  "lexical_choice",
  "grammar",
  "fluency",
  "other",
] as const;
export async function hash(value: unknown) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(
    new Uint8Array(bytes),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
