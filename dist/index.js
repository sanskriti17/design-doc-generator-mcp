#!/usr/bin/env node
import { runInit } from "./setup/init.js";
import { runStdioServer } from "./server.js";
const [, , command] = process.argv;
if (command === "init") {
    runInit(process.cwd()).catch((err) => {
        console.error("design-doc-generator-mcp init failed:", err instanceof Error ? err.message : err);
        process.exitCode = 1;
    });
}
else if (process.stdin.isTTY) {
    console.log("design-doc-generator-mcp is an MCP server - it's meant to be launched by Claude Code, not run directly.\n\n" +
        "To set it up in the current project, run:\n  npx design-doc-generator-mcp init\n\n" +
        "That registers this server with Claude Code and installs the /design-doc skill. Restart Claude Code " +
        "afterward and run /design-doc.");
}
else {
    runStdioServer().catch((err) => {
        console.error("design-doc-generator-mcp server crashed:", err instanceof Error ? err.message : err);
        process.exitCode = 1;
    });
}
