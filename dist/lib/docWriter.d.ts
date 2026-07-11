export declare function resolveSafeOutputPath(projectRoot: string, requestedRelativePath?: string): string;
export interface WriteDesignDocResult {
    path: string;
    updated: boolean;
}
export declare function writeDesignDoc(projectRoot: string, markdown: string, requestedRelativePath?: string): Promise<WriteDesignDocResult>;
export declare function writeSiblingFile(designDocPath: string, extension: string, contents: string | Buffer): Promise<string>;
