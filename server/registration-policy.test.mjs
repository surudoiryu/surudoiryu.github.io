import test from "node:test";
import assert from "node:assert/strict";
import { authorizeRegistration } from "./registration-policy.mjs";

const now = new Date("2026-09-18T12:00:00Z");
test("calendar-accurate registration age policy", () => {
  assert.equal(authorizeRegistration({ birthDate: "2008-09-18" }, now).authorized, true);
  assert.equal(authorizeRegistration({ birthDate: "2008-09-19" }, now).reason, "underage");
  assert.equal(authorizeRegistration({ birthDate: "2008-09-17" }, now).authorized, true);
  assert.equal(authorizeRegistration({ birthDate: "not-a-date" }, now).reason, "invalid_date");
  assert.equal(authorizeRegistration({ birthDate: "2027-01-01" }, now).reason, "future_date");
  assert.equal(authorizeRegistration({ birthDate: "1800-01-01" }, now).reason, "unrealistic_date");
});
test("successful policy minimizes DOB", () => {
  const result = authorizeRegistration({ birthDate: "2000-01-01" }, now);
  assert.deepEqual(result.profile, { ageVerified: true });
  assert.equal("birthDate" in result.profile, false);
});
