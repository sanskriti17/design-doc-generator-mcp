import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
const ALLOWED_ROOT = "docs";
const DEFAULT_RELATIVE_PATH = path.join("docs", "DESIGN.md");
export function resolveSafeOutputPath(projectRoot, requestedRelativePath) {
    const relative = requestedRelativePath?.trim() || DEFAULT_RELATIVE_PATH;
    const sanitizedRelative = relative.replace(/^[a-zA-Z]:/, "").replace(/^[/\\]+/, "");
    const docsRoot = path.resolve(projectRoot, ALLOWED_ROOT);
    const resolved = path.resolve(projectRoot, sanitizedRelative);
    const rel = path.relative(docsRoot, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error(`Refusing to write outside ${ALLOWED_ROOT}/: resolved path was ${resolved}`);
    }
    return resolved;
}
export async function writeDesignDoc(projectRoot, markdown, requestedRelativePath) {
    const target = resolveSafeOutputPath(projectRoot, requestedRelativePath);
    const updated = await access(target)
        .then(() => true)
        .catch(() => false);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, markdown, "utf8");
    return { path: target, updated };
}
export async function writeSiblingFile(designDocPath, extension, contents) {
    const target = designDocPath.replace(/\.md$/i, extension);
    await writeFile(target, contents);
    return target;
}
