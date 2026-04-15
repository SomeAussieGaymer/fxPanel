import fsp from 'node:fs/promises';
import path from 'node:path';
import type { AuthedCtx } from '@modules/WebServer/ctxTypes';

/**
 * GET /fileManager/read?file=path/to/file.lua
 * Reads the content of a specific file inside the resources folder.
 */
export default async function FileManagerRead(ctx: AuthedCtx) {
    // Check permissions
    if (!ctx.admin.hasPermission('server.code.editor')) {
        return ctx.send({ error: "You don't have permission to view this page." });
    }

    const requestedFile = ctx.query.file as string;
    if (!requestedFile) {
        return ctx.send({ error: 'No file specified.' });
    }

    const dataPath = txConfig.server.dataPath;
    if (!dataPath) {
        return ctx.send({ error: 'Server data path not configured.' });
    }

    const resourcesPath = path.resolve(dataPath, 'resources');
    const absolutePath = path.resolve(resourcesPath, requestedFile);

    // Security: Ensure the resolved path is inside the resources directory
    if (!absolutePath.startsWith(resourcesPath + path.sep) && absolutePath !== resourcesPath) {
        return ctx.send({ error: 'Invalid file path.' });
    }

    try {
        const content = await fsp.readFile(absolutePath, 'utf8');
        return ctx.send({ content });
    } catch (error) {
        return ctx.send({ error: `Failed to read file: ${(error as Error).message}` });
    }
}
