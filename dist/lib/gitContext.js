import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const MAX_FIELD_CHARS = 4000;
const GIT_TIMEOUT_MS = 5000;
function cap(text) {
    const trimmed = text.trim();
    if (trimmed.length <= MAX_FIELD_CHARS) {
        return { value: trimmed, truncated: false };
    }
    return { value: `${trimmed.slice(0, MAX_FIELD_CHARS)}\n...(truncated)`, truncated: true };
}
async function runGit(cwd, args) {
    const { stdout } = await execFileAsync("git", args, {
        cwd,
        timeout: GIT_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
    });
    return stdout;
}
export async function gatherGitContext(projectRoot) {
    try {
        await runGit(projectRoot, ["rev-parse", "--is-inside-work-tree"]);
    }
    catch {
        return { isRepo: false, truncated: false };
    }
    let truncated = false;
    const result = { isRepo: true, truncated: false };
    try {
        const branch = await runGit(projectRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
        result.branch = branch.trim();
    }
    catch {
    }
    try {
        const status = cap(await runGit(projectRoot, ["status", "--porcelain"]));
        result.statusPorcelain = status.value;
        truncated ||= status.truncated;
    }
    catch {
    }
    try {
        const diffStat = cap(await runGit(projectRoot, ["diff", "--stat", "HEAD"]));
        result.diffStat = diffStat.value;
        truncated ||= diffStat.truncated;
    }
    catch {
    }
    try {
        const log = cap(await runGit(projectRoot, ["log", "-15", "--pretty=format:%h %s"]));
        result.recentCommits = log.value;
        truncated ||= log.truncated;
    }
    catch {
    }
    result.truncated = truncated;
    return result;
}
