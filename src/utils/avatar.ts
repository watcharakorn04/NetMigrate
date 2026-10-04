/**
 * Dynamic Avatar Initials Generator
 * 
 * Rules:
 * 1. If Full Name is "Watcharakorn Choosriying", outputs "WC".
 * 2. If Full Name is in Thai "วัชรากร ชูศรียิ่ง", outputs "วช".
 * 3. If only a single word name is provided (e.g., "Watcharakorn"), outputs the first two letters in uppercase ("WA").
 * 4. Real-time dynamic updates as the user types in the name field.
 */
export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'AU';
  const trimmed = name.trim();
  if (!trimmed) return 'AU';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AU';

  if (parts.length === 1) {
    const single = parts[0];
    if (single.length === 1) {
      return single.toUpperCase();
    }
    // E.g., "Watcharakorn" -> "WA"
    return single.slice(0, 2).toUpperCase();
  }

  // 2 or more words: e.g. "Watcharakorn Choosriying" -> "WC", "วัชรากร ชูศรียิ่ง" -> "วช"
  const first = parts[0].charAt(0);
  const second = parts[1].charAt(0);
  return (first + second).toUpperCase();
}
