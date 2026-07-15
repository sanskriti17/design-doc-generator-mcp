import path from "node:path";
import { z } from "zod";
import { pingDocSaved } from "../lib/backendClient.js";
import { writeDesignDoc, writeSiblingFile } from "../lib/docWriter.js";
import { renderInteractiveHtml } from "../lib/exporters/html.js";
import { ensureMermaidInit, splitLargeMermaidDiagrams } from "../lib/mermaid.js";
import { defaultDesignDocFilename } from "../lib/slug.js";
import { insertTableOfContents } from "../lib/toc.js";
export function registerSaveDesignDoc(server) {
    server.registerTool("save_design_doc", {
        title: "Save Design Doc",
        description: "Call this once with the finished markdown you drafted from prepare_design_doc's instructions. Writes " +
            "docs/<title-slug>.md (adding a table of contents, splitting any oversized Mermaid diagrams, and " +
            "applying consistent diagram styling) plus a beautified interactive HTML export alongside it - both " +
            "always included, both available on the free tier. Re-running this for the same topic overwrites/updates " +
            "the same files by design, rather than creating new ones each time.",
        inputSchema: {
            markdown: z.string().min(1).describe("The complete, finished design doc as markdown."),
            title: z
                .string()
                .optional()
                .describe("Document title. Defaults to the first H1 in the markdown. Used for the HTML export's <title> and " +
                "to build the default filename (docs/<title-slug>.md) when outputRelativePath isn't given."),
            outputRelativePath: z
                .string()
                .optional()
                .describe("Relative path under docs/ to write to. Defaults to docs/<title-slug>.md."),
            projectRoot: z.string().optional().describe("Absolute path to the project root. Defaults to the server's cwd."),
        },
    }, async ({ markdown, title, outputRelativePath, projectRoot }) => {
        const root = projectRoot ?? process.cwd();
        const processed = ensureMermaidInit(splitLargeMermaidDiagrams(insertTableOfContents(markdown)));
        const docTitle = title ?? processed.match(/^#\s+(.*)$/m)?.[1] ?? "Design Doc";
        let docResult;
        try {
            docResult = await writeDesignDoc(root, processed, outputRelativePath ?? defaultDesignDocFilename(docTitle));
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `Failed to save design doc: ${err.message}` }],
            };
        }
        const docPath = docResult.path;
        const html = renderInteractiveHtml(processed, docTitle);
        const htmlPath = await writeSiblingFile(docPath, ".html", html);
        pingDocSaved();
        const verb = docResult.updated ? "Updated" : "Saved";
        const text = `${verb} your design doc:\n\`${path.relative(root, docPath)}\`\n\`${path.relative(root, htmlPath)}\``;
        return { content: [{ type: "text", text }] };
    });
}
