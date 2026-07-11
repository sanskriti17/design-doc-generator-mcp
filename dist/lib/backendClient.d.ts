import type { Mode, Template, Tier } from "../types.js";
export type FetchTemplateResult = {
    status: "ok";
    template: Template;
} | {
    status: "limit-reached";
    message: string;
} | {
    status: "error";
};
export declare function fetchTemplate(mode: Mode, licenseKey: string | null): Promise<FetchTemplateResult>;
export type LicenseVerifyResult = {
    status: "ok";
    valid: boolean;
    tier: Tier;
    message: string;
} | {
    status: "rate-limited";
    message: string;
} | {
    status: "network-error";
    message: string;
};
export declare function verifyLicense(key: string): Promise<LicenseVerifyResult>;
