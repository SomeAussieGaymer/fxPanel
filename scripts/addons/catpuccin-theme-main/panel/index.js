const { createElement: h, useState, useEffect, useCallback } = React;

// ── Logo injection ──
// Replace all <img alt="fxPanel"> with the addon-served txAdmin logo
// The logo is served at /addons/txadmin-theme/static/logo.svg
const TXADMIN_LOGO_URL = '/addons/catpuccin-theme/static/logo.svg';

function replaceFxPanelLogos() {
    const imgs = document.querySelectorAll('img[alt="fxPanel"]');
    imgs.forEach((img) => {
        if (img.src !== TXADMIN_LOGO_URL && !img.src.endsWith(TXADMIN_LOGO_URL)) {
            img.src = TXADMIN_LOGO_URL;
            img.alt = 'txAdmin';
        }
    });
}

// Run on load and observe DOM changes for dynamically rendered logos
replaceFxPanelLogos();
const observer = new MutationObserver(replaceFxPanelLogos);
observer.observe(document.body, { childList: true, subtree: true });

// Also update the page title
if (document.title === 'fxPanel' || document.title.includes('fxPanel')) {
    document.title = document.title.replace(/fxPanel/g, 'txAdmin');
}

// ── Theme helpers ──
function getStoredTheme() {
    const match = document.cookie.match(/(?:^|;\s*)txAdmin-theme=([^;]*)/);
    return match ? match[1] : null;
}

function setStoredTheme(theme) {
    document.cookie = `txAdmin-theme=${theme};path=/;SameSite=Lax;max-age=31536000;`;
}

function getCurrentTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    setStoredTheme(theme);
}

// Persist theme preference to the server so NUI can read it
function saveThemeToServer(theme) {
    fetch('/addons/catpuccin-theme/api/theme', {
        method: 'POST',
        credentials: 'same-origin',
        headers: txAddonApi.getHeaders(),
        body: JSON.stringify({ theme }),
    }).catch(() => {}); // Best-effort — cookie is the primary store
}

// On initial load, fetch server-stored preference if no local cookie
(function syncInitialTheme() {
    if (getStoredTheme()) return; // Local cookie already set — trust it
    fetch('/addons/catpuccin-theme/api/theme', {
        credentials: 'same-origin',
        headers: txAddonApi.getHeaders(),
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data.theme && data.theme !== getCurrentTheme()) {
                applyTheme(data.theme);
            }
        })
        .catch(function () {}); // Noop on failure
})();

// ── Header Dropdown Item ──

const MoonIconSvg = h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'mr-2 h-4 w-4' },
    h('path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }),
);

const SunIconSvg = h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'mr-2 h-4 w-4' },
    h('circle', { cx: 12, cy: 12, r: 4 }),
    h('path', { d: 'M12 2v2' }),
    h('path', { d: 'M12 20v2' }),
    h('path', { d: 'm4.93 4.93 1.41 1.41' }),
    h('path', { d: 'm17.66 17.66 1.41 1.41' }),
    h('path', { d: 'M2 12h2' }),
    h('path', { d: 'M20 12h2' }),
    h('path', { d: 'm6.34 17.66-1.41 1.41' }),
    h('path', { d: 'm19.07 4.93-1.41 1.41' }),
);

function ThemeToggleDropdownItem() {
    const { DropdownMenuItem } = txAddonApi.ui;
    const [theme, setTheme] = useState(getCurrentTheme);

    // Sync if changed externally (e.g. hotkey Alt+L)
    useEffect(() => {
        const obs = new MutationObserver(() => {
            setTheme(getCurrentTheme());
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const toggle = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        saveThemeToServer(next);
        setTheme(next);
    }, [theme]);

    return h(DropdownMenuItem, { className: 'cursor-pointer', onClick: toggle },
        theme === 'dark' ? MoonIconSvg : SunIconSvg,
        theme === 'dark' ? 'Light Mode' : 'Dark Mode',
    );
}

// ── Exports ──

export const widgets = { ThemeToggleDropdownItem };
