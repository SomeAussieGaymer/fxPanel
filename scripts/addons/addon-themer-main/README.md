# addon-themer

Rebrand fxPanel with custom colors and logos for both the **web panel** and the **in-game menu**.

## What it changes

- Loads panel and in-game logos from `static/theme.json`
- Loads colors from `static/theme.json`
- Includes a built-in panel page with color pickers and a save button
- Respects the `enabled` toggle in `static/theme.json`
- Uses `panel/index.css` and `nui/index.css` as the styling layer that consumes those variables

## Customize it

1. Put your logo asset in `static/`.
2. Open **Theme Editor** in the panel sidebar to change colors with the built-in UI and save them.
3. Edit `static/theme.json` directly if you want to toggle `enabled`, change logo file names, or fine-tune advanced values.
4. Only edit the CSS files if you want to change the actual styling rules, not just the colors.

## Install

1. Put the addon folder in `fxPanel/addons/addon-themer`
2. Restart fxPanel
3. Approve the addon in the **Addons** page
4. Restart fxPanel again so the panel and NUI assets load cleanly

## Theme Editor

- Page route: `/addon/addon-themer/theme-editor`
- Requires: `all_permissions`
- Saves directly to `static/theme.json`

Set `"enabled": false` in `static/theme.json` if you want to keep your saved theme values but stop applying them.
