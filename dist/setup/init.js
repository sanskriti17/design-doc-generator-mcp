import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
const PACKAGE_NAME = "design-doc-generator-mcp";
const SERVER_KEY = "design-doc";
function packageRoot() {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(here, "..", "..");
}
async function upsertMcpConfig(targetRoot) {
    const configPath = path.join(targetRoot, ".mcp.json");
    let config = {};
    try {
        const raw = await readFile(configPath, "utf8");
        config = JSON.parse(raw);
    }
    catch (err) {
        const nodeErr = err;
        if (nodeErr.code !== "ENOENT") {
            throw new Error(`${configPath} exists but isn't valid JSON. Fix or remove it, then re-run 'design-doc-generator-mcp init'.`);
        }
    }
    config.mcpServers = {
        ...config.mcpServers,
        [SERVER_KEY]: {
            command: "npx",
            args: ["-y", PACKAGE_NAME],
        },
    };
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    return configPath;
}
async function installSkill(targetRoot) {
    const source = path.join(packageRoot(), "skill", "SKILL.md");
    const destDir = path.join(targetRoot, ".claude", "skills", "design-doc");
    const dest = path.join(destDir, "SKILL.md");
    await mkdir(destDir, { recursive: true });
    await copyFile(source, dest);
    return dest;
}
export async function runInit(targetRoot) {
    const skillPath = await installSkill(targetRoot);
    const configPath = await upsertMcpConfig(targetRoot);
    console.log(`design-doc-generator-mcp: installed skill -> ${path.relative(targetRoot, skillPath)}`);
    console.log(`design-doc-generator-mcp: registered MCP server in -> ${path.relative(targetRoot, configPath)}`);
    console.log("\nRestart Claude Code (or run /mcp reconnect) in this project, then try: /design-doc");
}
