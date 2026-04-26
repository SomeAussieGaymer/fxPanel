(function () {
    var ADDON_ID = 'catpuccin-theme';

    function getLogoUrl() {
        if (typeof txNuiAddonApi !== 'undefined' && txNuiAddonApi.getStaticUrl) {
            return txNuiAddonApi.getStaticUrl(ADDON_ID, 'logo.svg');
        }
        // Fallback: resolve relative to nui/index.html → resource root → addons/
        return '../addons/' + ADDON_ID + '/static/logo.svg';
    }

    function replaceLogos() {
        var logoUrl = getLogoUrl();
        var imgs = document.querySelectorAll('img[alt="fxPanel logo"]');
        imgs.forEach(function (img) {
            if (img.src !== logoUrl) {
                img.src = logoUrl;
                img.alt = 'txAdmin logo';
                img.style.height = '28px';
                img.style.width = 'auto';
            }
        });
    }

    // Run immediately in case elements already exist
    replaceLogos();

    // Watch for dynamically added elements (React renders asynchronously)
    var observer = new MutationObserver(replaceLogos);
    observer.observe(document.body, { childList: true, subtree: true });

    // ── Theme Sync ──
    // Fetch the admin's theme preference from the server and apply it.
    // The web panel persists the preference via POST /addons/txadmin-theme/api/theme,
    // and this script reads it on load so the NUI matches.
    function applyNuiTheme(theme) {
        if (theme === 'light') {
            document.documentElement.classList.add('nui-light');
        } else {
            document.documentElement.classList.remove('nui-light');
        }
    }

    function fetchThemePreference() {
        if (typeof txNuiAddonApi === 'undefined' || !txNuiAddonApi.fetch) return;
        txNuiAddonApi.fetch('/addons/' + ADDON_ID + '/api/theme')
            .then(function (data) {
                if (data && data.theme) {
                    applyNuiTheme(data.theme);
                }
            })
            .catch(function (err) {
                console.warn('[txadmin-theme] Failed to fetch theme preference:', err);
            });
    }

    // Initial fetch — small delay to ensure WebPipe is ready
    setTimeout(fetchThemePreference, 500);

    // Re-check theme when the NUI becomes visible (menu re-opened)
    // NUI messages use { action: 'setVisible', data: boolean }
    window.addEventListener('message', function (event) {
        if (event.data && event.data.action === 'setVisible' && event.data.data === true) {
            fetchThemePreference();
        }
    });
})();
