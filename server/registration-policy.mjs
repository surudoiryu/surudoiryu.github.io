import { evaluateAdultBirthDate } from "../src/utils/age-rule.mjs";

export function authorizeRegistration(input, now = new Date()) {
  const decision = evaluateAdultBirthDate(input?.birthDate, now);
  if (!decision.allowed) return { authorized: false, reason: decision.reason };
  return { authorized: true, claims: { ageVerified: true }, profile: { ageVerified: true } };
}
