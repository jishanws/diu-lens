/**
 * Validates that the provided email belongs to the official DIU domain
 * (diu.edu.bd or s.diu.edu.bd) case-insensitively, rejects malformed emails,
 * fake suffixes, and normalizes by trimming.
 */
export function validateDiuEmail(rawEmail: string): { valid: boolean; email: string } {
  const email = (rawEmail || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, email };
  }
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, email };
  }
  const domain = parts[1].toLowerCase();
  if (domain !== 'diu.edu.bd' && domain !== 's.diu.edu.bd') {
    return { valid: false, email };
  }
  return { valid: true, email: parts[0] + '@' + domain };
}
