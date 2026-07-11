export type Mode = "default" | "root-cause" | "comparison";
export type Tier = "free" | "pro";
export interface TemplateSection {
    id: string;
    title: string;
    instructions: string;
    proOnly: boolean;
}
export interface Template {
    mode: Mode;
    version: string;
    sections: TemplateSection[];
    guidance: string;
}
export interface LicenseCacheEntry {
    key: string;
    tier: Tier;
    verifiedAt: number;
}
export interface GitContext {
    isRepo: boolean;
    branch?: string;
    statusPorcelain?: string;
    diffStat?: string;
    recentCommits?: string;
    truncated: boolean;
    error?: string;
}
