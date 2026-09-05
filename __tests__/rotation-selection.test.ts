import {
  getRotationSlot,
  selectRotatingWord,
} from "@/lib/rotation/selection";

describe("rotating word selection", () => {
  it("calculates slots based on rotation hours", () => {
    expect(getRotationSlot(new Date("2026-01-01T02:00:00.000Z"), 1)).toBe(490898);
  });

  it("deterministically selects a word for a slot", () => {
    const snapshot = {
      rotationHours: 1,
      seed: "abc",
      items: [
        { id: 1, sourceText: "word-1", targetText: "meaning-1" },
        { id: 2, sourceText: "word-2", targetText: "meaning-2" },
      ],
    };

    const itemA = selectRotatingWord(snapshot, new Date("2026-01-01T02:00:00.000Z"));
    const itemB = selectRotatingWord(snapshot, new Date("2026-01-01T02:30:00.000Z"));
    expect(itemA).toEqual(itemB);
  });

  it("returns null when there are no words", () => {
    expect(
      selectRotatingWord({ rotationHours: 1, seed: "abc", items: [] })
    ).toBeNull();
  });
});
