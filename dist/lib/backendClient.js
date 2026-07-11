import { getOrCreateDeviceId } from "./deviceId.js";
const DEFAULT_BACKEND_URL = "https://design-doc-backend.sanskritiagrawal1st.workers.dev";
const REQUEST_TIMEOUT_MS = 4000;
function backendUrl() {
    return process.env.DESIGN_DOC_BACKEND_URL?.replace(/\/$/, "") ?? DEFAULT_BACKEND_URL;
}
async function fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
export async function fetchTemplate(mode, licenseKey) {
    try {
        const deviceId = await getOrCreateDeviceId();
        const headers = { "x-device-id": deviceId };
        if (licenseKey)
            headers["x-license-key"] = licenseKey;
        const res = await fetchWithTimeout(`${backendUrl()}/template?mode=${encodeURIComponent(mode)}`, { headers });
        if (res.status === 429) {
            const data = (await res.json().catch(() => null));
            return {
                status: "limit-reached",
                message: data?.message ?? "You've hit today's free limit. Upgrade to Pro for unlimited.",
            };
        }
        if (!res.ok)
            return { status: "error" };
        const data = (await res.json());
        if (!data || !Array.isArray(data.sections))
            return { status: "error" };
        return { status: "ok", template: data };
    }
    catch {
        return { status: "error" };
    }
}
export function pingDocSaved(wantsHtml) {
    fetchWithTimeout(`${backendUrl()}/event/doc-saved`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wantsHtml }),
    }).catch(() => {
    });
}
export async function verifyLicense(key) {
    try {
        const res = await fetchWithTimeout(`${backendUrl()}/license/verify`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ key }),
        });
        if (res.status === 429) {
            return {
                status: "rate-limited",
                message: "Too many license checks right now - please wait a minute and try again.",
            };
        }
        const data = (await res.json().catch(() => null));
        if (!res.ok || !data) {
            return { status: "network-error", message: "Could not reach the license server. Try again shortly." };
        }
        return {
            status: "ok",
            valid: Boolean(data.valid),
            tier: data.valid ? (data.tier ?? "pro") : "free",
            message: data.message ?? (data.valid ? "License verified." : "That license key isn't valid."),
        };
    }
    catch {
        return { status: "network-error", message: "Could not reach the license server. Try again shortly." };
    }
}
