import type { LicenseCacheEntry, Tier } from "../types.js";
export declare const GRACE_MS: number;
export declare function getCachedLicenseKey(): Promise<string | null>;
export declare function loadCache(): Promise<LicenseCacheEntry | null>;
export declare function saveCache(entry: LicenseCacheEntry): Promise<void>;
export interface TierResolution {
    tier: Tier;
    stale: boolean;
    graceExpired: boolean;
}
export declare function resolveTierFromCache(cache: LicenseCacheEntry | null, now: number): TierResolution;
export declare function getEffectiveTier(now?: number): Promise<Tier>;
