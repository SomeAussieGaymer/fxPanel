/**
 * txAdmin Classic Theme — Server
 *
 * Persists per-admin theme preference (light/dark) in addon storage.
 * Both the web panel and the NUI can GET/POST the preference so they stay in sync.
 */
import { createAddon } from 'addon-sdk';

const addon = createAddon();

/**
 * GET /theme — Return the calling admin's stored theme preference.
 */
addon.registerRoute('GET', '/theme', async (req) => {
    const key = `theme:${req.admin.name}`;
    const stored = await addon.storage.get(key);
    return {
        status: 200,
        body: { theme: stored?.theme || 'dark' },
    };
});

/**
 * POST /theme — Save the calling admin's theme preference.
 * Body: { theme: "dark" | "light" }
 */
addon.registerRoute('POST', '/theme', async (req) => {
    const { theme } = req.body || {};
    if (theme !== 'dark' && theme !== 'light') {
        return { status: 400, body: { error: 'Invalid theme. Must be "dark" or "light".' } };
    }

    const key = `theme:${req.admin.name}`;
    await addon.storage.set(key, { theme });
    return { status: 200, body: { theme } };
});

addon.ready();
