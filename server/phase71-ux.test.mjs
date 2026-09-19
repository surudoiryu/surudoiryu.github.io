import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("consumer status bar and status-only traffic are removed", () => {
  const app = read("src/App.tsx");
  assert.doesNotMatch(app, /SyncStatus|syncCoreSummary|liveUsersCount|liveReviewsCount|getCountFromServer/);
  assert.doesNotMatch(app, /Status:.*Producten:.*Winkels:/);
});

test("shared category cards are used on home and catalog", () => {
  assert.match(read("src/Home.tsx"), /<CategoryCards/);
  assert.match(read("src/ProductsOverview.tsx"), /<CategoryCards/);
  const cards = read("src/components/CategoryCards.tsx");
  for (const route of ["/cannabis/wiet", "/cannabis/hasj", "/cannabis/joints", "/cannabis/edibles"]) assert.match(cards, new RegExp(route));
});

test("age gate blocks background and supports verified and denied states", () => {
  const gate = read("src/components/AgeGate.tsx");
  const app = read("src/App.tsx");
  assert.match(gate, /age_verified/);
  assert.match(gate, /age_denied/);
  assert.match(gate, /setAttribute\("inert"/);
  assert.match(gate, /overflow = blocked \? "hidden"/);
  assert.match(app, /blur\(18px\)/);
});

test("registration collects DOB but no profile images", () => {
  const form = read("src/components/RegisterForm.tsx");
  assert.match(form, /type="date"/);
  assert.match(form, /required/);
  assert.doesNotMatch(form, /Thumbnail URL|Header afbeelding URL|name="avatarUrl"|name="headerImageUrl"/);
});

test("header account action has accessible standard icon", () => {
  const header = read("src/components/TopBar.tsx");
  assert.match(header, /AccountCircleOutlinedIcon/);
  assert.match(header, /aria-label=\{user \? "Open profiel" : "Inloggen"\}/);
});

test("login errors do not expose Firebase internals", () => {
  const login = read("src/Login.tsx");
  assert.doesNotMatch(login, /loginError\.message/);
  assert.match(login, /Als dit adres bij ons bekend is/);
});

test("long pages provide an accessible scroll-to-top control", () => {
  const control = read("src/components/ScrollToTopButton.tsx");
  assert.match(control, /aria-label="Terug naar boven"/);
  assert.match(control, /threshold: 500/);
  assert.match(control, /prefers-reduced-motion: reduce/);
  assert.match(read("src/App.tsx"), /<ScrollToTopButton/);
});

test("header dynamically requests products without preloading them", () => {
  const header = read("src/components/TopBar.tsx");
  assert.match(header, /searchInput\.trim\(\)/);
  assert.match(header, /query\.length < 2/);
  assert.match(header, /\/api\/search\/suggest\?q=/);
  assert.match(header, /kind: "product"/);
  assert.match(header, /getDocs\(productCollectionRef\)/);
  assert.match(header, /option\.category, option\.grower/);
  assert.match(header, /option\.image \|\| MEDIA_PLACEHOLDER/);
});

test("health information is a structured standalone editorial page", () => {
  const page = read("src/HealthInfoPage.tsx");
  for (const topic of ["Wat cannabis met lichaam en geest kan doen", "Hoeveelheid, sterkte en frequentie", "Situaties waarin gebruik extra risico geeft", "Wat te doen bij een vervelende ervaring", "Betrouwbare informatie en hulp"]) assert.match(page, new RegExp(topic));
  assert.match(page, /geen persoonlijk medisch advies/);
  assert.match(page, /Trimbos-instituut/);
  assert.match(page, /Bel 112/);
});

test("platform information pages have rich structured content", () => {
  const page = read("src/LegalPage.tsx");
  for (const title of ["Over WeedInfo", "Privacyverklaring", "Cookiebeleid", "Gebruiksvoorwaarden", "Disclaimer"]) assert.match(page, new RegExp(title));
  assert.match(page, /legal-toc/);
  assert.match(page, /Officiële bronnen/);
  assert.match(page, /geen volledige geboortedatum/i);
});
