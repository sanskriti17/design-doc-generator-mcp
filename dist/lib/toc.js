export const TOC_HEADING_TITLE = "Table of Contents";
const HEADING_LINE = /^(#{1,6})\s+(.*)$/;
export function slugifyHeading(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s/g, "-");
}
export function makeHeadingSlugger() {
    const seen = new Map();
    return (text) => {
        const base = slugifyHeading(text);
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return count === 0 ? base : `${base}-${count}`;
    };
}
export function collectHeadings(markdown) {
    const slugger = makeHeadingSlugger();
    const entries = [];
    for (const line of markdown.split("\n")) {
        const match = line.match(HEADING_LINE);
        if (!match)
            continue;
        const title = match[2].trim();
        entries.push({ level: match[1].length, title, slug: slugger(title) });
    }
    return entries;
}
export function insertTableOfContents(markdown) {
    const lines = markdown.split("\n");
    const slugger = makeHeadingSlugger();
    const h2Entries = [];
    let firstH2Index = -1;
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(HEADING_LINE);
        if (!match)
            continue;
        const level = match[1].length;
        const title = match[2].trim();
        const slug = slugger(title);
        if (level === 2) {
            h2Entries.push({ title, slug });
            if (firstH2Index === -1)
                firstH2Index = i;
        }
    }
    if (h2Entries.length < 2 || firstH2Index === -1)
        return markdown;
    const toc = [
        `## ${TOC_HEADING_TITLE}`,
        "",
        ...h2Entries.map((e) => `- [${e.title}](#${e.slug})`),
        "",
    ].join("\n");
    const before = lines.slice(0, firstH2Index).join("\n");
    const after = lines.slice(firstH2Index).join("\n");
    return `${before}\n${toc}\n${after}`;
}
