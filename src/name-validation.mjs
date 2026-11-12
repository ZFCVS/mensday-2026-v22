/** Personal names only: reject email addresses, domains, digits and URL punctuation. */
export const NAME_MAX_LENGTH = 50;
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '’-]+[\p{L}\p{M}]+)*$/u;
export function validatePersonalName(value) {
  const name = String(value ?? '').trim();
  if (!name) return { valid: false, reason: 'Enter a name to continue.' };
  if (name.length > NAME_MAX_LENGTH) return { valid: false, reason: 'Name must contain 50 characters or fewer.' };
  if (!NAME_PATTERN.test(name)) return { valid: false, reason: 'Enter a name only. Email addresses, domains, @, dots, numbers and special symbols are not allowed.' };
  return { valid: true, name };
}
