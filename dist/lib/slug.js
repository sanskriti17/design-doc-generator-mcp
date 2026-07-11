const MAX_SLUG_LENGTH = 60;
export function slugify(text) {
    const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/, "");
    return slug || "design-doc";
}
export function defaultDesignDocFilename(title) {
    return `docs/${slugify(title)}.md`;
}
