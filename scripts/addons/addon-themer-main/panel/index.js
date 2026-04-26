const { createElement: h, useEffect, useMemo, useState } = React;

const ADDON_ID = 'addon-themer';
const ADDON_API = `/addons/${ADDON_ID}/api`;
const THEME_CONFIG_URL = `/addons/${ADDON_ID}/static/theme.json`;
const DEFAULT_PANEL_LOGO = `/addons/${ADDON_ID}/static/snaily.gif`;

const PANEL_COLOR_FIELDS = [
    ['--background', 'Background'],
    ['--foreground', 'Foreground'],
    ['--card', 'Card'],
    ['--card-foreground', 'Card Foreground'],
    ['--popover', 'Popover'],
    ['--popover-foreground', 'Popover Foreground'],
    ['--primary', 'Primary'],
    ['--primary-foreground', 'Primary Foreground'],
    ['--secondary', 'Secondary'],
    ['--secondary-foreground', 'Secondary Foreground'],
    ['--muted', 'Muted'],
    ['--muted-foreground', 'Muted Foreground'],
    ['--accent', 'Accent'],
    ['--accent-foreground', 'Accent Foreground'],
    ['--border', 'Border'],
    ['--input', 'Input'],
    ['--ring', 'Ring'],
    ['--destructive', 'Destructive'],
    ['--warning', 'Warning'],
    ['--success', 'Success'],
    ['--info', 'Info'],
];

const PANEL_ADVANCED_FIELDS = [
    ['--destructive-hint', 'Destructive Hint'],
    ['--destructive-inline', 'Destructive Inline'],
    ['--warning-foreground', 'Warning Foreground'],
    ['--warning-hint', 'Warning Hint'],
    ['--warning-inline', 'Warning Inline'],
    ['--success-foreground', 'Success Foreground'],
    ['--success-hint', 'Success Hint'],
    ['--success-inline', 'Success Inline'],
    ['--info-foreground', 'Info Foreground'],
    ['--info-hint', 'Info Hint'],
    ['--info-inline', 'Info Inline'],
    ['--addon-themer-header-background', 'Header Background'],
    ['--addon-themer-header-border', 'Header Border'],
    ['--addon-themer-header-shadow', 'Header Shadow'],
    ['--addon-themer-panel-logo-shadow', 'Panel Logo Shadow'],
];

const NUI_COLOR_FIELDS = [
    ['--addon-themer-bg', 'Menu Background'],
    ['--addon-themer-card', 'Menu Card'],
    ['--addon-themer-card-alt', 'Menu Card Alt'],
    ['--addon-themer-text', 'Menu Text'],
    ['--addon-themer-muted', 'Menu Muted'],
    ['--addon-themer-accent', 'Menu Accent'],
    ['--addon-themer-button-text', 'Button Text'],
];

const NUI_ADVANCED_FIELDS = [
    ['--addon-themer-border', 'Menu Border'],
    ['--addon-themer-accent-soft', 'Accent Soft'],
    ['--addon-themer-accent-strong', 'Accent Strong'],
    ['--addon-themer-menu-shadow', 'Menu Shadow'],
    ['--addon-themer-menu-logo-shadow', 'Menu Logo Shadow'],
];

let panelThemeEnabled = false;
let panelLogoUrl = DEFAULT_PANEL_LOGO;
let appliedPanelVarNames = new Set();

function getHeaders() {
    const api = globalThis.txAddonApi;
    return api ? api.getHeaders() : { 'Content-Type': 'application/json' };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function serializeConfig(config) {
    return JSON.stringify(ensureSections(config || {}));
}

function setPanelEnabled(enabled) {
    panelThemeEnabled = Boolean(enabled);
    if (panelThemeEnabled) {
        document.documentElement.dataset.addonThemerEnabled = 'true';
    } else {
        delete document.documentElement.dataset.addonThemerEnabled;
    }
}

function clearAppliedPanelVars() {
    appliedPanelVarNames.forEach((name) => {
        document.documentElement.style.removeProperty(name);
    });
    appliedPanelVarNames = new Set();
}

function getPanelLogoUrl(config) {
    const configuredLogo = config?.branding?.panelLogo;
    if (typeof configuredLogo !== 'string' || !configuredLogo.trim()) {
        return DEFAULT_PANEL_LOGO;
    }
    return `/addons/${ADDON_ID}/static/${configuredLogo.trim()}`;
}

function restorePanelLogos(root = document) {
    root.querySelectorAll('img[data-addon-themer="panel-logo"]').forEach((img) => {
        const original = img.dataset.addonThemerOriginalSrc;
        if (original) {
            img.setAttribute('src', original);
        }
        delete img.dataset.addonThemer;
    });
}

function replacePanelLogos(root) {
    if (!panelThemeEnabled) return;
    root.querySelectorAll('img[alt="fxPanel"]').forEach((img) => {
        if (!img.dataset.addonThemerOriginalSrc) {
            img.dataset.addonThemerOriginalSrc = img.getAttribute('src') || '';
        }
        if (img.getAttribute('src') !== panelLogoUrl) {
            img.setAttribute('src', panelLogoUrl);
        }
        img.dataset.addonThemer = 'panel-logo';
    });
}

function applyPanelConfig(config) {
    const panelTheme = config?.panel && typeof config.panel === 'object' ? config.panel : {};
    const enabled = Boolean(config?.enabled);

    panelLogoUrl = getPanelLogoUrl(config);
    clearAppliedPanelVars();
    setPanelEnabled(enabled);

    if (!enabled) {
        restorePanelLogos();
        return;
    }

    Object.entries(panelTheme).forEach(([name, value]) => {
        if (typeof value === 'string') {
            document.documentElement.style.setProperty(name, value);
            appliedPanelVarNames.add(name);
        }
    });

    replacePanelLogos(document);
}

async function loadStaticThemeConfig() {
    const response = await fetch(THEME_CONFIG_URL, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function fetchThemeConfig() {
    const response = await fetch(`${ADDON_API}/theme-config`, {
        credentials: 'same-origin',
        headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data.config;
}

async function saveThemeConfig(config) {
    const response = await fetch(`${ADDON_API}/theme-config`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: getHeaders(),
        body: JSON.stringify({ config }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data.config;
}

async function resetThemeConfig() {
    const response = await fetch(`${ADDON_API}/theme-config/reset`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data.config;
}

async function startPanelBranding() {
    try {
        const config = await loadStaticThemeConfig();
        applyPanelConfig(config);
    } catch (error) {
        console.warn('[addon-themer] Failed to load panel theme config:', error);
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                if (panelThemeEnabled) {
                    if (node.matches?.('img[alt="fxPanel"]')) {
                        replacePanelLogos(document);
                        return;
                    }
                    if (node.querySelector?.('img[alt="fxPanel"]')) {
                        replacePanelLogos(node);
                    }
                }
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPanelBranding, { once: true });
    } else {
        startPanelBranding();
    }
}

function ensureSections(config) {
    const next = clone(config);
    next.branding ||= {};
    next.panel ||= {};
    next.nui ||= {};
    next.enabled = Boolean(next.enabled);
    return next;
}

function hslToHex(h, s, l) {
    const saturation = s / 100;
    const lightness = l / 100;
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lightness - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else[r, g, b] = [c, 0, x];

    const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslTripletToHex(value) {
    if (typeof value !== 'string') return '#000000';
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
    if (!match) return '#000000';
    return hslToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}

function hexToHslTriplet(hex) {
    const normalized = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '0 0% 0%';

    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hValue = 0;
    const lValue = (max + min) / 2;
    const sValue = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lValue - 1));

    if (delta !== 0) {
        if (max === r) hValue = 60 * (((g - b) / delta) % 6);
        else if (max === g) hValue = 60 * ((b - r) / delta + 2);
        else hValue = 60 * ((r - g) / delta + 4);
    }

    if (hValue < 0) hValue += 360;

    return `${Math.round(hValue)} ${Math.round(sValue * 100)}% ${Math.round(lValue * 100)}%`;
}

function SectionCard({ eyebrow, title, description, children, aside }) {
    return h('section', { className: 'rounded-xl bg-card shadow-xs ring-1 ring-border/60' },
        h('div', { className: 'flex flex-col gap-2 px-4 pt-3 sm:flex-row sm:items-start sm:justify-between' },
            h('div', { className: 'space-y-1' },
                eyebrow && h('p', { className: 'text-muted-foreground text-[11px] font-semibold tracking-[0.22em] uppercase' }, eyebrow),
                h('h2', { className: 'text-base font-semibold text-foreground' }, title),
                description && h('p', { className: 'text-xs text-muted-foreground' }, description),
            ),
            aside && h('div', { className: 'shrink-0' }, aside),
        ),
        h('div', { className: 'px-4 pb-3 pt-2.5' }, children),
    );
}

function ColorPickerField({ label, value, onChange, mode = 'hex' }) {
    const colorValue = useMemo(() => (
        mode === 'hsl' ? hslTripletToHex(value) : value
    ), [mode, value]);

    return h('label', { className: 'grid gap-1.5' },
        h('span', { className: 'text-sm font-medium text-foreground' }, label),
        h('div', { className: 'grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2' },
            h('input', {
                type: 'color',
                value: colorValue,
                onChange: (event) => onChange(mode === 'hsl' ? hexToHslTriplet(event.target.value) : event.target.value),
                className: 'h-9 w-11 cursor-pointer rounded-md border border-input bg-background p-1',
            }),
            h('input', {
                type: 'text',
                value,
                onChange: (event) => onChange(event.target.value),
                className: 'min-w-0 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent',
            }),
        ),
    );
}

function TextField({ label, value, onChange, placeholder }) {
    return h('label', { className: 'grid gap-1.5' },
        h('span', { className: 'text-sm font-medium text-foreground' }, label),
        h('input', {
            type: 'text',
            value,
            placeholder,
            onChange: (event) => onChange(event.target.value),
            className: 'rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-accent',
        }),
    );
}

function ThemeEditorPage() {
    const [config, setConfig] = useState(null);
    const [savedConfig, setSavedConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        let mounted = true;
        fetchThemeConfig()
            .then((nextConfig) => {
                if (!mounted) return;
                const normalized = ensureSections(nextConfig);
                setConfig(normalized);
                setSavedConfig(normalized);
                setLoading(false);
            })
            .catch((error) => {
                if (!mounted) return;
                setMessage({ type: 'error', text: error.message });
                setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!config) return;
        applyPanelConfig(config);
    }, [config]);

    const updateConfig = (updater) => {
        setConfig((current) => {
            const next = ensureSections(current || {});
            updater(next);
            return clone(next);
        });
    };

    const unsavedChanges = useMemo(() => {
        if (!config || !savedConfig) return false;
        return serializeConfig(config) !== serializeConfig(savedConfig);
    }, [config, savedConfig]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        setMessage(null);
        try {
            const savedConfig = await saveThemeConfig(config);
            const normalized = ensureSections(savedConfig);
            setConfig(normalized);
            setSavedConfig(normalized);
            setMessage({ type: 'success', text: 'Theme saved. Reopen the in-game menu to refresh its styling.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setResetting(true);
        setMessage(null);
        try {
            const resetConfig = await resetThemeConfig();
            const normalized = ensureSections(resetConfig);
            setConfig(normalized);
            setSavedConfig(normalized);
            setResetModalOpen(false);
            setMessage({ type: 'success', text: 'Theme reset to addon defaults.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setResetting(false);
        }
    };

    if (loading) {
        return h('div', { className: 'flex w-full flex-col gap-6 px-2 pb-10 md:px-0' },
            h('p', { className: 'text-sm text-muted-foreground' }, 'Loading theme editor...'),
        );
    }

    if (!config) {
        return h('div', { className: 'flex w-full flex-col gap-6 px-2 pb-10 md:px-0' },
            h('p', { className: 'text-sm text-destructive' }, message?.text || 'Unable to load theme config.'),
        );
    }

    return h('div', { className: 'flex w-full flex-col gap-4 px-2 pb-10 md:px-0' },
        h('div', { className: 'flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between' },
            h('div', { className: 'space-y-0.5' },
                h('div', { className: 'flex flex-wrap items-center gap-2' },
                    h('h1', { className: 'text-2xl font-semibold tracking-tight text-foreground' }, 'Theme Editor'),
                    h('span', {
                        className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${unsavedChanges
                            ? 'bg-warning/15 text-warning'
                            : 'bg-success/15 text-success-foreground'}`,
                    }, unsavedChanges ? 'Unsaved changes' : 'Saved'),
                ),
                h('p', { className: 'text-sm text-muted-foreground' }, 'Live preview on panel while editing.'),
            ),
            h('div', { className: 'flex flex-col items-start gap-2 xl:min-w-80 xl:items-end' },
                h('div', { className: 'flex items-center gap-2' },
                    h('button', {
                        type: 'button',
                        onClick: () => setResetModalOpen(true),
                        disabled: saving || resetting,
                        className: 'rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60',
                    }, 'Reset'),
                    h('button', {
                        type: 'button',
                        onClick: handleSave,
                        disabled: saving || resetting || !unsavedChanges,
                        className: 'rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60',
                    }, saving ? 'Saving...' : 'Save Theme'),
                ),
            ),
        ),
        message && h('div', {
            className: `rounded-lg px-4 py-3 text-sm ${message.type === 'success'
                ? 'bg-green-500/10 text-green-300'
                : 'bg-red-500/10 text-red-300'}`,
        }, message.text),
        h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_340px]' },
            h('div', { className: 'space-y-4' },
                h(SectionCard, {
                    eyebrow: 'Control',
                    title: 'Theme State',
                    description: 'Turn the theme on or off.',
                    aside: h('label', { className: 'inline-flex items-center gap-3 rounded-full bg-muted/60 px-4 py-2 text-sm font-medium text-foreground' },
                        h('input', {
                            type: 'checkbox',
                            checked: config.enabled,
                            onChange: (event) => updateConfig((next) => {
                                next.enabled = event.target.checked;
                            }),
                            className: 'h-4 w-4 rounded border-border accent-cyan-400',
                        }),
                        config.enabled ? 'Enabled' : 'Disabled',
                    ),
                    children: h('p', { className: 'text-xs text-muted-foreground' },
                        'Panel changes apply immediately. Reopen the in-game menu after saving to refresh its styling.'),
                }),
                h(SectionCard, {
                    eyebrow: 'Branding',
                    title: 'Branding Assets',
                    description: 'File names relative to the addon static folder.',
                    children: h('div', { className: 'grid gap-2.5 md:grid-cols-2' },
                        h(TextField, {
                            label: 'Panel Logo File',
                            value: config.branding.panelLogo || '',
                            placeholder: 'snaily.gif',
                            onChange: (value) => updateConfig((next) => {
                                next.branding.panelLogo = value;
                            }),
                        }),
                        h(TextField, {
                            label: 'NUI Logo File',
                            value: config.branding.nuiLogo || '',
                            placeholder: 'Leave empty to match Panel Logo',
                            onChange: (value) => updateConfig((next) => {
                                next.branding.nuiLogo = value;
                            }),
                        }),
                    ),
                }),
                h(SectionCard, {
                    eyebrow: 'Panel',
                    title: 'Panel Colors',
                    description: 'Saved as HSL triplets.',
                    children: h('div', { className: 'grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3' },
                        ...PANEL_COLOR_FIELDS.map(([key, label]) => h(ColorPickerField, {
                            key,
                            label,
                            value: config.panel[key] || '',
                            mode: 'hsl',
                            onChange: (value) => updateConfig((next) => {
                                next.panel[key] = value;
                            }),
                        })),
                    ),
                }),
            ),
            h('div', { className: 'space-y-4' },
                h(SectionCard, {
                    eyebrow: 'NUI',
                    title: 'Menu Colors',
                    description: 'Saved as CSS color values.',
                    children: h('div', { className: 'grid gap-2.5 md:grid-cols-2' },
                        ...NUI_COLOR_FIELDS.map(([key, label]) => h(ColorPickerField, {
                            key,
                            label,
                            value: config.nui[key] || '#000000',
                            mode: 'hex',
                            onChange: (value) => updateConfig((next) => {
                                next.nui[key] = value;
                            }),
                        })),
                    ),
                }),
                h(SectionCard, {
                    eyebrow: 'Advanced',
                    title: 'Advanced Panel Values',
                    description: 'Optional panel overrides.',
                    children: h('div', { className: 'grid gap-2.5 md:grid-cols-2' },
                        ...PANEL_ADVANCED_FIELDS.map(([key, label]) => h(TextField, {
                            key,
                            label,
                            value: config.panel[key] || '',
                            onChange: (value) => updateConfig((next) => {
                                next.panel[key] = value;
                            }),
                        })),
                    ),
                }),
                h(SectionCard, {
                    eyebrow: 'Advanced',
                    title: 'Advanced NUI Values',
                    description: 'Optional menu overrides.',
                    children: h('div', { className: 'grid gap-2.5' },
                        ...NUI_ADVANCED_FIELDS.map(([key, label]) => h(TextField, {
                            key,
                            label,
                            value: config.nui[key] || '',
                            onChange: (value) => updateConfig((next) => {
                                next.nui[key] = value;
                            }),
                        })),
                    ),
                }),
            ),
        ),
        resetModalOpen && h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' },
            h('div', { className: 'w-full max-w-md rounded-xl bg-card p-5 shadow-xl ring-1 ring-border/60' },
                h('div', { className: 'space-y-2' },
                    h('h2', { className: 'text-lg font-semibold text-foreground' }, 'Reset theme?'),
                    h('p', { className: 'text-sm text-muted-foreground' },
                        'This will restore the saved theme to the addon defaults for both the panel and the in-game menu.'),
                ),
                h('div', { className: 'mt-5 flex items-center justify-end gap-2' },
                    h('button', {
                        type: 'button',
                        onClick: () => setResetModalOpen(false),
                        disabled: resetting,
                        className: 'rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60',
                    }, 'Cancel'),
                    h('button', {
                        type: 'button',
                        onClick: handleReset,
                        disabled: resetting,
                        className: 'rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60',
                    }, resetting ? 'Resetting...' : 'Reset Theme'),
                ),
            ),
        ),
    );
}


export const pages = { ThemeEditorPage };

export const widgets = {};
