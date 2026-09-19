export const MINIMUM_AGE: number;
export type AgeDecision = { allowed: boolean; reason: null | "invalid_date" | "future_date" | "unrealistic_date" | "underage" };
export function parseBirthDate(value: string): Date | null;
export function evaluateAdultBirthDate(value: string, now?: Date): AgeDecision;
