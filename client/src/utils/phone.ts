/**
 * Client Phone Number Utilities
 */

export function formatDisplayPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return raw;
}
