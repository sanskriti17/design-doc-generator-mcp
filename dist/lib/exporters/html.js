import { makeHeadingSlugger, TOC_HEADING_TITLE } from "../toc.js";
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function renderInline(text) {
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_DELIM_CELL = /^:?-{1,}:?$/;
const UL_ITEM = /^\s*[-*+]\s+/;
const OL_ITEM = /^\s*\d+\.\s+/;
const BLOCKQUOTE_LINE = /^\s*>\s?/;
function splitTableRow(line) {
    const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map((cell) => cell.trim());
}
function isTableDelimiterRow(line) {
    if (!TABLE_ROW.test(line))
        return false;
    return splitTableRow(line).every((cell) => TABLE_DELIM_CELL.test(cell));
}
function parseBlocks(markdown) {
    const lines = markdown.split("\n");
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        const fenceMatch = line.match(/^```(\w*)\s*$/);
        if (headingMatch) {
            blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() });
            i++;
            continue;
        }
        if (fenceMatch) {
            const lang = fenceMatch[1];
            const body = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) {
                body.push(lines[i]);
                i++;
            }
            i++;
            blocks.push({ type: lang === "mermaid" ? "mermaid" : "code", lang, text: body.join("\n") });
            continue;
        }
        if (line.trim() === "") {
            i++;
            continue;
        }
        if (TABLE_ROW.test(line) && i + 1 < lines.length && isTableDelimiterRow(lines[i + 1])) {
            const header = splitTableRow(line);
            i += 2;
            const rows = [];
            while (i < lines.length && TABLE_ROW.test(lines[i])) {
                rows.push(splitTableRow(lines[i]));
                i++;
            }
            blocks.push({ type: "table", text: "", header, rows });
            continue;
        }
        if (BLOCKQUOTE_LINE.test(line)) {
            const quoteLines = [];
            while (i < lines.length && BLOCKQUOTE_LINE.test(lines[i])) {
                quoteLines.push(lines[i].replace(BLOCKQUOTE_LINE, ""));
                i++;
            }
            blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
            continue;
        }
        if (UL_ITEM.test(line)) {
            const items = [];
            while (i < lines.length && UL_ITEM.test(lines[i])) {
                items.push(lines[i].replace(UL_ITEM, ""));
                i++;
            }
            blocks.push({ type: "ul", text: "", items });
            continue;
        }
        if (OL_ITEM.test(line)) {
            const items = [];
            while (i < lines.length && OL_ITEM.test(lines[i])) {
                items.push(lines[i].replace(OL_ITEM, ""));
                i++;
            }
            blocks.push({ type: "ol", text: "", items });
            continue;
        }
        const para = [line];
        i++;
        while (i < lines.length &&
            lines[i].trim() !== "" &&
            !lines[i].match(/^```/) &&
            !lines[i].match(/^#{1,6}\s/) &&
            !UL_ITEM.test(lines[i]) &&
            !OL_ITEM.test(lines[i]) &&
            !BLOCKQUOTE_LINE.test(lines[i]) &&
            !TABLE_ROW.test(lines[i])) {
            para.push(lines[i]);
            i++;
        }
        blocks.push({ type: "paragraph", text: para.join("\n") });
    }
    return blocks;
}
function renderTable(header, rows) {
    const thead = `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows
        .map((row) => `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
    return `<table>${thead}${tbody}</table>`;
}
function renderBlock(block) {
    switch (block.type) {
        case "mermaid":
            return `<div class="mermaid">${escapeHtml(block.text)}</div>`;
        case "code":
            return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
        case "heading":
            return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
        case "ul":
            return `<ul>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`;
        case "ol":
            return `<ol>${block.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`;
        case "blockquote":
            return `<blockquote>${block.text
                .split("\n")
                .map((l) => `<p>${renderInline(l)}</p>`)
                .join("")}</blockquote>`;
        case "table":
            return renderTable(block.header, block.rows);
        default:
            return `<p>${renderInline(block.text)}</p>`;
    }
}
export function renderInteractiveHtml(markdown, title) {
    const blocks = parseBlocks(markdown);
    const slugger = makeHeadingSlugger();
    const slugs = blocks.map((b) => (b.type === "heading" ? slugger(b.text) : undefined));
    const navEntries = [];
    blocks.forEach((b, i) => {
        if (b.type === "heading" && b.level === 2 && b.text.trim().toLowerCase() !== TOC_HEADING_TITLE.toLowerCase()) {
            navEntries.push({ title: b.text, slug: slugs[i] });
        }
    });
    const sections = [];
    let current = [];
    let currentTitle = "";
    let currentSlug = "";
    let intro = [];
    let sawSection = false;
    let skippingTocSection = false;
    const flush = () => {
        if (!sawSection)
            return;
        sections.push(`<details open id="${currentSlug}"><summary>${escapeHtml(currentTitle)}</summary><div class="section-body">${current.join("\n")}</div></details>`);
        current = [];
    };
    blocks.forEach((block, i) => {
        if (block.type === "heading" && block.level === 1)
            return;
        const isTopLevelHeading = block.type === "heading" && block.level === 2;
        if (isTopLevelHeading && block.text.trim().toLowerCase() === TOC_HEADING_TITLE.toLowerCase()) {
            flush();
            skippingTocSection = true;
            return;
        }
        if (isTopLevelHeading) {
            skippingTocSection = false;
            flush();
            currentTitle = block.text;
            currentSlug = slugs[i];
            sawSection = true;
            return;
        }
        if (skippingTocSection)
            return;
        const html = renderBlock(block);
        if (sawSection) {
            current.push(html);
        }
        else {
            intro.push(html);
        }
    });
    flush();
    const nav = navEntries.length >= 2
        ? `<nav class="toc" aria-label="Table of contents">
  <div class="toc-label">On this page</div>
  <ol>${navEntries.map((e) => `<li><a href="#${e.slug}">${escapeHtml(e.title)}</a></li>`).join("")}</ol>
</nav>`
        : "";
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({
    startOnLoad: true,
    theme: "neutral",
    themeVariables: { fontSize: "16px" },
    flowchart: { htmlLabels: true, useMaxWidth: true, nodeSpacing: 40, rankSpacing: 60, curve: "basis" },
    sequence: { useMaxWidth: true, actorFontSize: 14, messageFontSize: 14, wrap: true },
    er: { useMaxWidth: true },
  });
</script>
<style>
${STYLE_SHEET}
</style>
</head>
<body>
<div class="page">
  <header class="doc-header">
    <h1>${escapeHtml(title)}</h1>
  </header>
  ${nav}
  <main>
    ${intro.join("\n")}
    ${sections.join("\n")}
  </main>
</div>
</body>
</html>
`;
}
const STYLE_SHEET = `
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --bg-raised: #f8fafc;
    --text: #0f172a;
    --text-muted: #475569;
    --border: #e2e8f0;
    --accent: #4f46e5;
    --accent-strong: #4338ca;
    --accent-soft: #eef2ff;
    --note-text: #92400e;
    --note-bg: #fffbeb;
    --note-border: #f59e0b;
    --shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 12px rgba(15, 23, 42, 0.04);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0b1120;
      --bg-raised: #111827;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.09);
      --accent: #818cf8;
      --accent-strong: #a5b4fc;
      --accent-soft: rgba(99, 102, 241, 0.16);
      --note-text: #fcd34d;
      --note-bg: rgba(217, 119, 6, 0.12);
      --note-border: #d97706;
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 16px rgba(0, 0, 0, 0.35);
    }
  }
  :root[data-theme="dark"] {
    --bg: #0b1120; --bg-raised: #111827; --text: #e2e8f0; --text-muted: #94a3b8;
    --border: rgba(255, 255, 255, 0.09); --accent: #818cf8; --accent-strong: #a5b4fc;
    --accent-soft: rgba(99, 102, 241, 0.16); --note-text: #fcd34d; --note-bg: rgba(217, 119, 6, 0.12);
    --note-border: #d97706; --shadow: 0 1px 2px rgba(0,0,0,.3), 0 1px 16px rgba(0,0,0,.35);
  }
  :root[data-theme="light"] {
    --bg: #ffffff; --bg-raised: #f8fafc; --text: #0f172a; --text-muted: #475569;
    --border: #e2e8f0; --accent: #4f46e5; --accent-strong: #4338ca; --accent-soft: #eef2ff;
    --note-text: #92400e; --note-bg: #fffbeb; --note-border: #f59e0b;
    --shadow: 0 1px 2px rgba(15,23,42,.04), 0 1px 12px rgba(15,23,42,.04);
  }

  * { box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, Roboto, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    margin: 0;
    padding: 2.5rem 1.5rem 5rem;
  }
  .page {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    grid-template-areas: "header header" "sidebar main";
    column-gap: 3rem;
    row-gap: 1.5rem;
  }
  .doc-header { grid-area: header; border-bottom: 1px solid var(--border); padding-bottom: 1.25rem; }
  main { grid-area: main; min-width: 0; }
  h1 {
    font-size: clamp(1.6rem, 3vw, 2.35rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin: 0;
  }
  h2, h3, h4 { line-height: 1.35; font-weight: 700; }
  p { margin: 0.75rem 0; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  nav.toc {
    grid-area: sidebar;
    align-self: start;
    position: sticky;
    top: 1.5rem;
    max-height: calc(100vh - 3rem);
    overflow-y: auto;
    font-size: 0.9rem;
  }
  nav.toc .toc-label {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }
  nav.toc ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.15rem; counter-reset: none; }
  nav.toc a {
    display: block;
    color: var(--text-muted);
    padding: 0.35rem 0.6rem;
    border-radius: 6px;
    border-left: 2px solid transparent;
  }
  nav.toc a:hover { color: var(--text); background: var(--accent-soft); text-decoration: none; }

  details {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 12px;
    margin-bottom: 1rem;
    padding: 0.9rem 1.25rem;
    box-shadow: var(--shadow);
  }
  summary {
    font-weight: 700;
    font-size: 1.15rem;
    cursor: pointer;
    padding: 0.15rem 0;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before {
    content: "\\25B8";
    display: inline-block;
    color: var(--accent);
    transition: transform 0.15s ease;
    font-size: 0.8em;
  }
  details[open] summary::before { transform: rotate(90deg); }
  .section-body { padding-top: 0.5rem; }

  pre { background: var(--bg); border: 1px solid var(--border); padding: 0.85rem 1rem; border-radius: 8px; overflow-x: auto; }
  code { background: var(--accent-soft); color: var(--accent-strong); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
  pre code { background: none; color: inherit; padding: 0; border-radius: 0; }
  .mermaid { text-align: center; overflow-x: auto; padding: 0.75rem 0; background: var(--bg); border-radius: 8px; }

  blockquote {
    margin: 1rem 0;
    padding: 0.6rem 1rem;
    background: var(--note-bg);
    border-left: 3px solid var(--note-border);
    border-radius: 0 8px 8px 0;
    color: var(--note-text);
  }
  blockquote p { margin: 0.3rem 0; }

  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.95rem; }
  th, td { border: 1px solid var(--border); padding: 0.55rem 0.8rem; text-align: left; }
  th { background: var(--accent-soft); color: var(--accent-strong); font-weight: 700; }
  tbody tr:nth-child(even) { background: var(--bg-raised); }

  ul, ol { padding-left: 1.4rem; }
  li { margin: 0.3rem 0; }

  @media (max-width: 860px) {
    .page { grid-template-columns: 1fr; grid-template-areas: "header" "sidebar" "main"; }
    nav.toc { position: static; max-height: none; border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem 1rem; background: var(--bg-raised); }
  }
`;
