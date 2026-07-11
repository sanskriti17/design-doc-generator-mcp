import { z } from "zod";
import { verifyLicense } from "../lib/backendClient.js";
import { saveCache } from "../lib/license.js";
export function registerActivateLicense(server) {
    server.registerTool("activate_license", {
        title: "Activate Pro License",
        description: "Call this when the user runs `/design-doc --activate KEY`. Verifies the key against the backend and " +
            "caches the result locally (with a 7-day offline grace period) so future runs don't need network access.",
        inputSchema: {
            key: z.string().min(1).describe("The license key the user provided."),
        },
    }, async ({ key }) => {
        const result = await verifyLicense(key);
        if (result.status === "rate-limited" || result.status === "network-error") {
            return { isError: true, content: [{ type: "text", text: result.message }] };
        }
        if (!result.valid) {
            return { isError: true, content: [{ type: "text", text: result.message }] };
        }
        await saveCache({ key, tier: result.tier, verifiedAt: Date.now() });
        return {
            content: [
                {
                    type: "text",
                    text: `✓ Pro license activated (tier: ${result.tier}). This is cached locally for 7 days of offline use.`,
                },
            ],
        };
    });
}
