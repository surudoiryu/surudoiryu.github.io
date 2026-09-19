import { ShopType } from "../types/shop";

function parseTimeToMinutes(value: string | undefined): number | null {
    if (!value) return null;
    const raw = value.trim().toLowerCase().replace(/\s+/g, "");
    if (!raw) return null;

    const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (ampmMatch) {
        let hours = Number.parseInt(ampmMatch[1], 10);
        const minutes = Number.parseInt(ampmMatch[2], 10);
        const marker = ampmMatch[3];
        if (marker === "pm" && hours < 12) hours += 12;
        if (marker === "am" && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
        const hours = Number.parseInt(hhmmMatch[1], 10);
        const minutes = Number.parseInt(hhmmMatch[2], 10);
        if (hours > 23 || minutes > 59) return null;
        return hours * 60 + minutes;
    }

    return null;
}

function normalizeDayName(value: string): string {
    return String(value || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function resolveTodayHours(shop: ShopType): { open?: string; close?: string; closed?: boolean } {
    const days = Array.isArray(shop.openingHours?.days) ? shop.openingHours?.days ?? [] : [];
    if (!days.length) {
        return {
            open: shop.openFrom,
            close: shop.openTill,
            closed: false,
        };
    }

    const today = normalizeDayName(new Intl.DateTimeFormat("nl-NL", { weekday: "long", timeZone: "Europe/Amsterdam" }).format(new Date()));
    const todayEntry = days.find((item) => normalizeDayName(item.day) === today);
    if (!todayEntry) {
        return {
            open: shop.openFrom,
            close: shop.openTill,
            closed: false,
        };
    }

    return {
        open: todayEntry.open || shop.openFrom,
        close: todayEntry.close || shop.openTill,
        closed: Boolean(todayEntry.closed),
    };
}

export function getShopOpenState(shop: ShopType, now = new Date()): { isOpen: boolean | null; label: string } {
    const todayHours = resolveTodayHours(shop);
    if (todayHours.closed) {
        return { isOpen: false, label: "Gesloten" };
    }

    const openMinutes = parseTimeToMinutes(todayHours.open);
    const closeMinutes = parseTimeToMinutes(todayHours.close);
    if (openMinutes === null || closeMinutes === null) {
        return { isOpen: null, label: "Onbekend" };
    }

    const current = now.getHours() * 60 + now.getMinutes();
    const isOpen =
        openMinutes <= closeMinutes
            ? current >= openMinutes && current <= closeMinutes
            : current >= openMinutes || current <= closeMinutes;

    return {
        isOpen,
        label: isOpen ? "Geopend" : "Gesloten",
    };
}
