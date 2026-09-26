import { createContext } from "react";

export interface CaptureSource {
  file: string;
  line: number;
  column: number;
  element: string;
}

export interface CaptureBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureRecord {
  id: string;
  parentId?: string;
  order: number;
  kind: string;
  source?: CaptureSource;
  bounds: CaptureBounds;
  style: Record<string, unknown>;
  text?: string;
  props?: Record<string, unknown>;
}

interface RegisteredNode {
  record: CaptureRecord;
  measure: () => Promise<CaptureBounds | null>;
}

export const CaptureParentContext = createContext<string | undefined>(undefined);
export const CaptureActiveContext = createContext(true);

const nodes = new Map<string, RegisteredNode>();
let nextOrder = 0;

export function upsertCaptureNode(
  input: Omit<CaptureRecord, "order" | "bounds"> & { bounds?: CaptureBounds },
  measure: RegisteredNode["measure"],
): void {
  const existing = nodes.get(input.id);
  nodes.set(input.id, {
    measure,
    record: {
      ...input,
      order: existing?.record.order ?? nextOrder++,
      bounds: input.bounds ?? existing?.record.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
    },
  });
}

export function removeCaptureNode(id: string): void {
  nodes.delete(id);
}

export async function snapshotCaptureNodes(): Promise<CaptureRecord[]> {
  const entries = [...nodes.values()];
  await Promise.all(entries.map(async (entry) => {
    const measured = await entry.measure();
    if (measured) entry.record.bounds = measured;
  }));
  return entries.map((entry) => entry.record).sort((a, b) => a.order - b.order);
}

export function sanitizeCaptureValue(value: unknown, depth = 0): unknown {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) return value.map((item) => sanitizeCaptureValue(item, depth + 1)).filter((item) => item !== undefined);
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const safe = sanitizeCaptureValue(item, depth + 1);
      if (safe !== undefined) output[key] = safe;
    }
    return output;
  }
  return undefined;
}
