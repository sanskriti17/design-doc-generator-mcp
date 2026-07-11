export declare const TOC_HEADING_TITLE = "Table of Contents";
export declare function slugifyHeading(text: string): string;
export declare function makeHeadingSlugger(): (text: string) => string;
export interface HeadingEntry {
    level: number;
    title: string;
    slug: string;
}
export declare function collectHeadings(markdown: string): HeadingEntry[];
export declare function insertTableOfContents(markdown: string): string;
