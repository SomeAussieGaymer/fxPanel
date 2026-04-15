import fsp from 'node:fs/promises';
import path from 'node:path';
import type { AuthedCtx } from '@modules/WebServer/ctxTypes';

type FileEntry = {
    name: string;
    path: string;
    isDir: boolean;
    children?: FileEntry[];
};

/**
 * GET /fileManager/list
 * Recursively lists all files and directories inside the resources folder.
 */
export default async function FileManagerList(ctx: AuthedCtx) {
    // Check permissions
    if (!ctx.admin.hasPermission('server.code.editor')) {
        return ctx.send({ error: "You don't have permission to view this page." });
    }

    const dataPath = txConfig.server.dataPath;
    if (!dataPath) {
        return ctx.send({ error: 'Server data path not configured.' });
    }

    const resourcesPath = path.resolve(dataPath, 'resources');

    try {
        const tree = await getFileTree(resourcesPath, '');
        return ctx.send({ tree });
    } catch (error) {
        return ctx.send({ error: `Failed to list resources: ${(error as Error).message}` });
    }
}

async function getFileTree(fullPath: string, relativePath: string): Promise<FileEntry[]> {
    const entries = await fsp.readdir(fullPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    for (const entry of entries) {
        const entryRelPath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        const entryFullPath = path.join(fullPath, entry.name);

        const fileEntry: FileEntry = {
            name: entry.name,
            path: entryRelPath,
            isDir: entry.isDirectory(),
        };

        if (entry.isDirectory()) {
            fileEntry.children = await getFileTree(entryFullPath, entryRelPath);
        }

        result.push(fileEntry);
    }

    // Sort: directories first, then alphabetically
    return result.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}
