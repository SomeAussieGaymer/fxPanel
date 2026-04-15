import fsp from 'node:fs/promises';
import path from 'node:path';
import type { AuthedCtx } from '@modules/WebServer/ctxTypes';

/**
 * POST /fileManager/save
 * Saves content to a specific file inside the resources folder.
 */
export default async function FileManagerSave(ctx: AuthedCtx) {
    // Check permissions
    if (!ctx.admin.hasPermission('server.code.editor')) {
        return ctx.send({ error: "You don't have permission to perform this action." });
    }

    const { file, content } = ctx.request.body as { file: string; content: string };
    if (!file || typeof content !== 'string') {
        return ctx.send({ error: 'Invalid request body.' });
    }

    const dataPath = txConfig.server.dataPath;
    if (!dataPath) {
        return ctx.send({ error: 'Server data path not configured.' });
    }

    const resourcesPath = path.resolve(dataPath, 'resources');
    const absolutePath = path.resolve(resourcesPath, file);

    // Security: Ensure the resolved path is inside the resources directory
    if (!absolutePath.startsWith(resourcesPath + path.sep) && absolutePath !== resourcesPath) {
        return ctx.send({ error: 'Invalid file path.' });
    }

    try {
        // Create backup if file exists
        try {
            await fsp.access(absolutePath);
            await fsp.copyFile(absolutePath, `${absolutePath}.bkp`);
        } catch (e) {
            // New file or unreadable, skip backup
        }

        await fsp.writeFile(absolutePath, content, 'utf8');
        return ctx.send({ success: true });
    } catch (error) {
        return ctx.send({ error: `Failed to save file: ${(error as Error).message}` });
    }
}
