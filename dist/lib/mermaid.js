const MERMAID_FENCE = /```mermaid\n([\s\S]*?)```/g;
const NODE_ID = /([A-Za-z0-9_]+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*(?:-{1,3}>|--o|--x|==>)/g;
const EDGE_LINE = /^\s*[A-Za-z0-9_]+.*(?:-{1,3}>|--o|--x|==>).*$/;
function uniqueNodeIds(body) {
    const ids = new Set();
    for (const match of body.matchAll(NODE_ID)) {
        ids.add(match[1]);
    }
    const targetPattern = /(?:-{1,3}>|--o|--x|==>)\s*([A-Za-z0-9_]+)/g;
    for (const match of body.matchAll(targetPattern)) {
        ids.add(match[1]);
    }
    return ids;
}
function header(body) {
    const match = body.match(/^\s*(graph|flowchart)\s+\S+/);
    return match ? match[0].trim() : "graph TD";
}
function splitDiagramBody(body, maxNodes) {
    const lines = body.split("\n");
    const diagramHeader = header(body);
    const chunks = [];
    let current = [];
    let currentNodes = new Set();
    for (const line of lines) {
        if (!EDGE_LINE.test(line)) {
            current.push(line);
            continue;
        }
        const lineNodes = uniqueNodeIds(line);
        const merged = new Set([...currentNodes, ...lineNodes]);
        if (current.length > 0 && merged.size > maxNodes) {
            chunks.push(current);
            current = [line];
            currentNodes = new Set(lineNodes);
        }
        else {
            current.push(line);
            currentNodes = merged;
        }
    }
    if (current.length > 0)
        chunks.push(current);
    return chunks.map((chunkLines) => `${diagramHeader}\n${chunkLines.join("\n")}`);
}
export function splitLargeMermaidDiagrams(markdown, maxNodes = 15) {
    return markdown.replace(MERMAID_FENCE, (fullMatch, body) => {
        const nodeCount = uniqueNodeIds(body).size;
        if (nodeCount <= maxNodes) {
            return fullMatch;
        }
        const parts = splitDiagramBody(body, maxNodes);
        if (parts.length <= 1) {
            return fullMatch;
        }
        const rendered = parts
            .map((part, i) => `**Architecture (part ${i + 1} of ${parts.length})**\n\n\`\`\`mermaid\n${part}\n\`\`\``)
            .join("\n\n");
        return `> Diagram split into ${parts.length} parts for readability (originally ${nodeCount} nodes).\n\n${rendered}`;
    });
}
export function countMermaidNodes(body) {
    return uniqueNodeIds(body).size;
}
const MERMAID_INIT_DIRECTIVE = "%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}, " +
    "'flowchart': {'htmlLabels': true, 'useMaxWidth': true, 'nodeSpacing': 40, 'rankSpacing': 60, 'curve': 'basis'}, " +
    "'sequence': {'useMaxWidth': true, 'actorFontSize': 14, 'messageFontSize': 14, 'wrap': true}, " +
    "'er': {'useMaxWidth': true}}}%%";
export function ensureMermaidInit(markdown) {
    return markdown.replace(MERMAID_FENCE, (fullMatch, body) => {
        if (/^\s*%%\{\s*init\b/.test(body))
            return fullMatch;
        return fullMatch.replace(body, `${MERMAID_INIT_DIRECTIVE}\n${body}`);
    });
}
