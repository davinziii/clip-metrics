export const MAX_COMPARISON_VIDEOS = 10;

export function toggleComparison(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter(value => value !== id);
  return selected.length < MAX_COMPARISON_VIDEOS ? [...selected, id] : selected;
}
