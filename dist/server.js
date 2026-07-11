import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerActivateLicense } from "./tools/activateLicense.js";
import { registerPrepareDesignDoc } from "./tools/prepareDesignDoc.js";
import { registerSaveDesignDoc } from "./tools/saveDesignDoc.js";
export function createServer() {
    const server = new McpServer({
        name: "design-doc-generator-mcp",
        version: "0.1.0",
    });
    registerPrepareDesignDoc(server);
    registerSaveDesignDoc(server);
    registerActivateLicense(server);
    return server;
}
export async function runStdioServer() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
