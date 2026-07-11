import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
const DIR = path.join(homedir(), ".design-doc");
const FILE = path.join(DIR, "anonymous-id.json");
export async function getOrCreateDeviceId() {
    try {
        const raw = await readFile(FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed?.id)
            return parsed.id;
    }
    catch {
    }
    const id = randomUUID();
    try {
        await mkdir(DIR, { recursive: true });
        await writeFile(FILE, JSON.stringify({ id, createdAt: Date.now() }, null, 2), "utf8");
    }
    catch {
    }
    return id;
}
