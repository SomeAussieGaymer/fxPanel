import { useEffect } from 'react';
import { fetchWebPipe } from '../utils/fetchWebPipe';
import { useIsMenuVisibleValue } from '../state/visibility.state';

interface AddonNuiDescriptor {
    id: string;
    name: string;
    version: string;
    entryUrl: string;
    stylesUrl: string | null;
    pages: unknown[];
}

// Singleton guard — load once per NUI lifecycle
let loaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Convert a manifest HTTP path (/nui/addons/:id/:file)
 * to the cfx-nui resource-relative path (addons/:id/nui/:file).
 * This resolves correctly against the nui/index.html base via "../".
 */
function toResourceUrl(addonId: string, httpPath: string): string {
    const filename = httpPath.split('/').pop();
    // From nui/index.html, go up one level to reach resource root
    return `../addons/${addonId}/nui/${filename}`;
}

async function loadNuiAddons(): Promise<void> {
    try {
        const resp = await fetchWebPipe<{ addons: AddonNuiDescriptor[] }>('/addons/nui-manifest');
        if (!resp?.addons?.length) return;

        // Expose a minimal API for NUI addon scripts
        (window as any).txNuiAddonApi = {
            /** Get a URL to an addon's static asset (e.g. images, SVGs) */
            getStaticUrl: (addonId: string, filePath: string) =>
                `../addons/${addonId}/static/${filePath}`,
            /** Make an authenticated request to an addon API route via WebPipe */
            fetch: async (path: string, opts?: { method?: string; data?: unknown }) => {
                return fetchWebPipe(path as any, {
                    method: opts?.method as any,
                    data: opts?.data,
                });
            },
        };

        for (const addon of resp.addons) {
            try {
                // Inject stylesheet
                if (addon.stylesUrl) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = toResourceUrl(addon.id, addon.stylesUrl);
                    link.dataset.addonId = addon.id;
                    document.head.appendChild(link);
                }

                // Inject entry script
                if (addon.entryUrl) {
                    const script = document.createElement('script');
                    script.src = toResourceUrl(addon.id, addon.entryUrl);
                    script.dataset.addonId = addon.id;
                    document.head.appendChild(script);
                }
            } catch (err) {
                console.error(`[NuiAddonLoader] Failed to load addon ${addon.id}:`, err);
            }
        }
    } catch (err) {
        console.error('[NuiAddonLoader] Failed to fetch NUI addon manifest:', err);
    }
}

/**
 * Hook that loads NUI addons when the menu first becomes visible.
 * The WebPipe rejects requests while the menu is hidden, so we
 * wait for the first visibility event before fetching the manifest.
 */
export function useNuiAddonLoader() {
    const isMenuVisible = useIsMenuVisibleValue();

    useEffect(() => {
        if (!isMenuVisible || loaded) return;
        if (!loadPromise) {
            loadPromise = loadNuiAddons().then(() => {
                loaded = true;
            });
        }
    }, [isMenuVisible]);
}
