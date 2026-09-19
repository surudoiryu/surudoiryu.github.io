export const MINIMUM_AGE = 18;

export function parseBirthDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function evaluateAdultBirthDate(value, now = new Date()) {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return { allowed: false, reason: "invalid_date" };
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (birthDate > today) return { allowed: false, reason: "future_date" };
  if (birthDate.getUTCFullYear() < today.getUTCFullYear() - 120) return { allowed: false, reason: "unrealistic_date" };
  const eighteenth = new Date(Date.UTC(birthDate.getUTCFullYear() + MINIMUM_AGE, birthDate.getUTCMonth(), birthDate.getUTCDate()));
  return eighteenth <= today ? { allowed: true, reason: null } : { allowed: false, reason: "underage" };
}
