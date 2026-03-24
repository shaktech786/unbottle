import type { Section } from "./types";

/**
 * Reorder sections by moving the section at `fromIndex` to `toIndex`.
 * Returns a new array with recalculated `startBar` and `sortOrder` values.
 * The original array is not mutated.
 */
export function reorderSections(
  sections: Section[],
  fromIndex: number,
  toIndex: number,
): Section[] {
  const copy = [...sections];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);

  // Recalculate startBar and sortOrder sequentially
  let currentBar = 0;
  return copy.map((section, index) => {
    const updated = {
      ...section,
      startBar: currentBar,
      sortOrder: index,
    };
    currentBar += section.lengthBars;
    return updated;
  });
}
