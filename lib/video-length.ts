export const videoLengthCategories = [
  { id: '0-15', label: '0–15s', min: 0, max: 15 },
  { id: '15-30', label: '15–30s', min: 15, max: 30 },
  { id: '30-60', label: '30–60s', min: 30, max: 60 },
  { id: '60+', label: '60s+', min: 60, max: Infinity },
] as const;

export function matchesVideoLength(duration: number | null, category: string): boolean {
  if (category === 'all') return true;
  if (category === 'unknown') return duration === null;
  if (duration === null) return false;
  const range = videoLengthCategories.find(r => r.id === category);
  return Boolean(range && duration >= range.min && duration < range.max);
}
