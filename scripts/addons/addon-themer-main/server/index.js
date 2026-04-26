import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAddon } from 'addon-sdk';

const addon = createAddon();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEME_PATH = path.resolve(__dirname, '../static/theme.json');

const DEFAULT_THEME_CONFIG = {
    enabled: true,
    branding: {
        panelLogo: 'snaily.gif',
        nuiLogo: '',
    },
    panel: {
        '--background': '221 40% 10%',
        '--foreground': '210 40% 96%',
        '--card': '220 34% 15%',
        '--card-foreground': '210 40% 96%',
        '--popover': '220 34% 15%',
        '--popover-foreground': '210 40% 96%',
        '--primary': '210 40% 96%',
        '--primary-foreground': '221 40% 10%',
        '--secondary': '218 30% 20%',
        '--secondary-foreground': '210 40% 96%',
        '--muted': '220 28% 18%',
        '--muted-foreground': '218 24% 73%',
        '--accent': '192 95% 50%',
        '--accent-foreground': '222 47% 11%',
        '--border': '218 27% 24%',
        '--input': '218 27% 26%',
        '--ring': '192 95% 50%',
        '--destructive': '0 72% 56%',
        '--destructive-foreground': '0 0% 100%',
        '--destructive-hint': '0 46% 15%',
        '--destructive-inline': '0 72% 56%',
        '--warning': '41 100% 54%',
        '--warning-foreground': '36 100% 10%',
        '--warning-hint': '37 59% 15%',
        '--warning-inline': '41 100% 54%',
        '--success': '157 90% 35%',
        '--success-foreground': '157 80% 95%',
        '--success-hint': '157 65% 13%',
        '--success-inline': '157 90% 35%',
        '--info': '192 84% 46%',
        '--info-foreground': '190 75% 96%',
        '--info-hint': '197 53% 15%',
        '--info-inline': '192 84% 46%',
        '--addon-themer-header-background': 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
        '--addon-themer-header-border': 'hsl(var(--border) / 0.75)',
        '--addon-themer-header-shadow': '0 18px 40px hsl(var(--background) / 0.45)',
        '--addon-themer-panel-logo-shadow': 'drop-shadow(0 10px 22px hsl(var(--accent) / 0.22))',
    },
    nui: {
        '--addon-themer-bg': '#0d1422',
        '--addon-themer-card': '#162033',
        '--addon-themer-card-alt': '#1a2740',
        '--addon-themer-text': '#eef6ff',
        '--addon-themer-muted': '#a7b8d6',
        '--addon-themer-border': 'rgba(133, 164, 214, 0.22)',
        '--addon-themer-accent': '#23b5ff',
        '--addon-themer-accent-soft': 'rgba(35, 181, 255, 0.16)',
        '--addon-themer-accent-strong': 'rgba(35, 181, 255, 0.3)',
        '--addon-themer-menu-shadow': '0 18px 42px rgba(5, 12, 24, 0.45)',
        '--addon-themer-menu-logo-shadow': 'drop-shadow(0 10px 24px rgba(35, 181, 255, 0.24))',
        '--addon-themer-button-text': '#07111e',
    },
};

const PANEL_KEYS = Object.keys(DEFAULT_THEME_CONFIG.panel);
const NUI_KEYS = Object.keys(DEFAULT_THEME_CONFIG.nui);

function cloneDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG));
}

function sanitizeString(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed ? trimmed : fallback;
}

function normalizeThemeConfig(input) {
    const config = cloneDefaultConfig();
    const source = input && typeof input === 'object' ? input : {};

    config.enabled = typeof source.enabled === 'boolean' ? source.enabled : config.enabled;

    const branding = source.branding && typeof source.branding === 'object' ? source.branding : {};
    config.branding.panelLogo = sanitizeString(branding.panelLogo, config.branding.panelLogo);
    config.branding.nuiLogo = typeof branding.nuiLogo === 'string' ? branding.nuiLogo.trim() : '';

    const panel = source.panel && typeof source.panel === 'object' ? source.panel : {};
    for (const key of PANEL_KEYS) {
        config.panel[key] = sanitizeString(panel[key], config.panel[key]);
    }

    const nui = source.nui && typeof source.nui === 'object' ? source.nui : {};
    for (const key of NUI_KEYS) {
        config.nui[key] = sanitizeString(nui[key], config.nui[key]);
    }

    return config;
}

async function readThemeConfig() {
    try {
        const raw = await fs.readFile(THEME_PATH, 'utf8');
        return normalizeThemeConfig(JSON.parse(raw));
    } catch (error) {
        addon.log.warn(`Failed to read theme config, using defaults: ${error.message}`);
        return cloneDefaultConfig();
    }
}

async function writeThemeConfig(config) {
    const normalized = normalizeThemeConfig(config);
    await fs.writeFile(THEME_PATH, `${JSON.stringify(normalized, null, 4)}\n`, 'utf8');
    return normalized;
}

function requireMasterAdmin(req) {
    if (!req.admin.hasPermission('all_permissions')) {
        return { status: 403, body: { error: 'Requires all_permissions' } };
    }
    return null;
}

addon.registerRoute('GET', '/theme-config', async (req) => {
    const denial = requireMasterAdmin(req);
    if (denial) return denial;

    const config = await readThemeConfig();
    return { status: 200, body: { config } };
});

addon.registerRoute('PUT', '/theme-config', async (req) => {
    const denial = requireMasterAdmin(req);
    if (denial) return denial;

    if (!req.body || typeof req.body !== 'object') {
        return { status: 400, body: { error: 'config payload is required' } };
    }

    const config = await writeThemeConfig(req.body.config);
    addon.log.info(`Theme config updated by ${req.admin.name}`);
    return { status: 200, body: { success: true, config } };
});

addon.registerRoute('POST', '/theme-config/reset', async (req) => {
    const denial = requireMasterAdmin(req);
    if (denial) return denial;

    const config = await writeThemeConfig(cloneDefaultConfig());
    addon.log.info(`Theme config reset by ${req.admin.name}`);
    return { status: 200, body: { success: true, config } };
});

addon.log.info('fxPanel Themer server loaded');
addon.ready();
