(function () {
    var ADDON_ID = 'addon-themer';
    var LOGO_SELECTOR = 'img[alt="fxPanel logo"]';

    var api = window.txNuiAddonApi;

    var menuLogoUrl = null;
    var appliedNuiVarNames = [];
    var nuiThemeEnabled = false;

    function setEnabled(enabled) {
        nuiThemeEnabled = Boolean(enabled);
        document.documentElement.dataset.addonThemerEnabled = nuiThemeEnabled ? 'true' : undefined;
        if (!nuiThemeEnabled) {
            delete document.documentElement.dataset.addonThemerEnabled;
        }
    }

    function clearAppliedVars() {
        appliedNuiVarNames.forEach(function (name) {
            document.documentElement.style.removeProperty(name);
        });
        appliedNuiVarNames = [];
    }

    function applyNuiTheme(config) {
        var branding = (config && config.branding) || {};
        var nuiLogo = typeof branding.nuiLogo === 'string' ? branding.nuiLogo.trim() : '';
        var panelLogo = typeof branding.panelLogo === 'string' ? branding.panelLogo.trim() : '';
        menuLogoUrl = api.getStaticUrl(ADDON_ID, nuiLogo || panelLogo || 'snaily.gif');

        clearAppliedVars();
        setEnabled(Boolean(config && config.enabled));

        if (!nuiThemeEnabled) {
            restoreMenuLogos(document);
            return;
        }

        var nuiTheme = (config && typeof config.nui === 'object' && config.nui) || {};
        Object.keys(nuiTheme).forEach(function (name) {
            var value = nuiTheme[name];
            if (typeof value === 'string') {
                document.documentElement.style.setProperty(name, value);
                appliedNuiVarNames.push(name);
            }
        });
    }

    function markMenuShell(img) {
        var shell = img.parentElement;
        while (shell && !shell.querySelector('.MuiTabs-root')) {
            shell = shell.parentElement;
        }
        if (shell) {
            shell.dataset.addonThemerShell = 'menu-shell';
        }
    }

    function tagLogo(img) {
        if (!img.dataset.addonThemerOriginalSrc) {
            img.dataset.addonThemerOriginalSrc = img.getAttribute('src') || '';
        }
        if (img.getAttribute('src') !== menuLogoUrl) {
            img.setAttribute('src', menuLogoUrl);
        }
        img.dataset.addonThemer = 'menu-logo';
        markMenuShell(img);
    }

    function replaceMenuLogos(root) {
        if (!nuiThemeEnabled || !menuLogoUrl) return;
        (root || document).querySelectorAll(LOGO_SELECTOR).forEach(tagLogo);
    }

    function restoreMenuLogos(root) {
        (root || document).querySelectorAll('img[data-addon-themer="menu-logo"]').forEach(function (img) {
            var original = img.dataset.addonThemerOriginalSrc;
            if (original) img.setAttribute('src', original);
            delete img.dataset.addonThemer;
        });
    }

    function loadThemeConfig() {
        return api.fetch('/addons/' + ADDON_ID + '/static/theme.json')
            .catch(function (error) {
                console.warn('[addon-themer] Failed to load NUI theme config:', error);
                return null;
            });
    }

    function onMutation(mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes') {
                var target = mutation.target;
                if (nuiThemeEnabled && target instanceof Element && target.matches(LOGO_SELECTOR)) {
                    tagLogo(target);
                }
                return;
            }
            mutation.addedNodes.forEach(function (node) {
                if (!(node instanceof Element) || !nuiThemeEnabled) return;
                if (node.matches(LOGO_SELECTOR)) {
                    replaceMenuLogos(document);
                } else if (node.querySelector(LOGO_SELECTOR)) {
                    replaceMenuLogos(node);
                }
            });
        });
    }

    function startBranding() {
        loadThemeConfig().then(function (config) {
            if (config) applyNuiTheme(config);
            replaceMenuLogos(document);

            new MutationObserver(onMutation).observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src'],
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBranding, { once: true });
    } else {
        startBranding();
    }
})();
