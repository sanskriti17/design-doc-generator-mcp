import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { verifyLicense } from "./backendClient.js";
const CACHE_DIR = path.join(homedir(), ".design-doc");
const CACHE_FILE = path.join(CACHE_DIR, "license.json");
const REVALIDATE_MS = 24 * 60 * 60 * 1000;
export const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export async function getCachedLicenseKey() {
    const cache = await loadCache();
    return cache?.key ?? null;
}
export async function loadCache() {
    try {
        const raw = await readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.verifiedAt !== "number" || !parsed.tier || !parsed.key) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
export async function saveCache(entry) {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(entry, null, 2), "utf8");
}
export function resolveTierFromCache(cache, now) {
    if (!cache)
        return { tier: "free", stale: false, graceExpired: false };
    const age = now - cache.verifiedAt;
    if (age <= REVALIDATE_MS) {
        return { tier: cache.tier, stale: false, graceExpired: false };
    }
    if (age <= GRACE_MS) {
        return { tier: cache.tier, stale: true, graceExpired: false };
    }
    return { tier: "free", stale: true, graceExpired: true };
}
export async function getEffectiveTier(now = Date.now()) {
    const cache = await loadCache();
    const resolution = resolveTierFromCache(cache, now);
    if (!resolution.stale || !cache) {
        return resolution.tier;
    }
    try {
        const result = await verifyLicense(cache.key);
        if (result.status === "ok") {
            const tier = result.valid ? result.tier : "free";
            await saveCache({ key: cache.key, tier, verifiedAt: now });
            return tier;
        }
    }
    catch {
    }
    return resolution.tier;
}
