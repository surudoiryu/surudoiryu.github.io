import assert from "node:assert/strict";
import test from "node:test";
import { canPublishShop, verdiqShopIdentity } from "./shop-identity.mjs";

test("tenants[].id is preserved exactly", () => {
    assert.deepEqual(verdiqShopIdentity({ id: "tenant-ABC-123", businessName: "Shop A" }), { verdiqTenantId: "tenant-ABC-123" });
});

test("name and slug changes do not change identity", () => {
    const before = verdiqShopIdentity({ id: "tenant-1", businessName: "Oude naam", shortcode: "oude-naam" });
    const after = verdiqShopIdentity({ id: "tenant-1", businessName: "Nieuwe naam", shortcode: "nieuwe-naam" });
    assert.equal(before.verdiqTenantId, after.verdiqTenantId);
});

test("different tenant IDs remain different shops", () => {
    assert.notEqual(verdiqShopIdentity({ id: "tenant-1", businessName: "Zelfde naam" }).verdiqTenantId, verdiqShopIdentity({ id: "tenant-2", businessName: "Zelfde naam" }).verdiqTenantId);
});

test("exclusive retailer without tenant ID cannot be published", () => {
    const identity = verdiqShopIdentity({ businessName: "Alleen retailernaam", shortcode: "alleen-retailernaam" });
    assert.deepEqual(identity, {}); assert.equal(canPublishShop(identity), false);
});

