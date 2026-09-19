export function verdiqShopIdentity(source) {
    const id = typeof source?.id === "string" && source.id.trim()
        ? source.id.trim()
        : typeof source?.tenantId === "string" && source.tenantId.trim()
            ? source.tenantId.trim()
            : "";
    return id ? { verdiqTenantId: id } : {};
}

export function canPublishShop(shop) {
    return typeof shop?.verdiqTenantId === "string" && shop.verdiqTenantId.trim().length > 0;
}

