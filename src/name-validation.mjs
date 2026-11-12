/** Names only. This is a usability/PII guard, not an email-address security boundary. */
export const NAME_MAX_LENGTH = 50;
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '’-]+[\p{L}\p{M}]+)*$/u;
const TLD = '(?:com|net|org|edu|gov|mil|info|biz|co|in|io|ai|uk|us|de|eu|app|online)';
const DOMAIN_WORD = `(?:dot|period|point)`;
// Collapse spaces, punctuation, zero-width separators and compatibility Unicode.
// Examples: "at z f dot com", "a-t-z-f-d-o-t-c-o-m", "john AT company DOT com".
function compactForDetection(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}
const DOMAIN_PATTERNS = [
  // Domain written in full, optionally obscured by spaces or punctuation.
  new RegExp(`[a-z0-9]{2,}${DOMAIN_WORD}${TLD}`),
  // Email spoken out loud: "john at zf dot com", "johnatzfcom".
  new RegExp(`at[a-z0-9]{2,}(?:${DOMAIN_WORD})?${TLD}`),
  // Organization-specific elisions (including "at zf com" and "zf com").
  /(?:at)?zf(?:dot|period|point)?(?:com|co|in|net|org)/,
  // Common web/mail forms even if "dot" has been omitted.
  /(?:gmail|outlook|hotmail|yahoo|icloud|protonmail)(?:dot|period|point)?(?:com|in|co|net|org)/
];
export function validatePersonalName(value) {
  const name = String(value ?? '').trim();
  if (!name) return { valid: false, reason: 'Enter a name to continue.' };
  if (name.length > NAME_MAX_LENGTH) return { valid: false, reason: 'Name must contain 50 characters or fewer.' };
  const compact = compactForDetection(name);
  if (DOMAIN_PATTERNS.some(pattern => pattern.test(compact))) {
    return { valid: false, reason: 'Enter a person’s name only. Email addresses and disguised domains such as “at zf dot com” are not allowed.' };
  }
  if (!NAME_PATTERN.test(name)) {
    return { valid: false, reason: 'Enter a name only. Email addresses, domains, @, dots, numbers and special symbols are not allowed.' };
  }
  return { valid: true, name };
}
