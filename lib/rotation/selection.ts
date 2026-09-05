import type { RotatingWordSnapshot } from "@/lib/types";
import { hashString } from "@/lib/utils/random";

export function getRotationSlot(
  date: Date,
  rotationHours: number,
  nowProvider = (value: Date) => value.getTime()
) {
  const rotationMs = rotationHours * 60 * 60 * 1_000;
  return Math.floor(nowProvider(date) / rotationMs);
}

export function selectRotatingWord(
  snapshot: RotatingWordSnapshot,
  date = new Date()
) {
  if (!snapshot.items.length) {
    return null;
  }

  const slot = getRotationSlot(date, snapshot.rotationHours);
  const index = hashString(`${snapshot.seed}:${slot}`) % snapshot.items.length;
  return snapshot.items[index];
}
