/**
 * Helper utility to remove Vietnamese accents/diacritics from a string.
 * Useful for accent-insensitive search.
 */
export function removeVietnameseTones(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
