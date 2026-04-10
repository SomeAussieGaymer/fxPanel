# fxPanel Addon Development Guide

> For addon system internals, see [addon-system-architecture.md](./addon-system-architecture.md).

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Addon Manifest](#3-addon-manifest)
4. [Server-Side Development](#4-server-side-development)
5. [Panel UI Development](#5-panel-ui-development)
6. [Permissions](#6-permissions)
7. [Storage](#7-storage)
8. [Real-Time WebSocket Push](#8-real-time-websocket-push)
9. [Events](#9-events)
10. [Addon Admin Management](#10-addon-admin-management)
11. [File Structure Reference](#11-file-structure-reference)
12. [Security Notes](#12-security-notes)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Introduction

The fxPanel addon system lets you extend fxPanel's functionality without modifying core source files. Addons can add:

- **Backend API routes** — Custom HTTP endpoints proxied through fxPanel's auth layer
- **Panel pages** — Full pages accessible from the web panel via their own route
- **Panel widgets** — Components injected into existing pages (dashboard, player modal, etc.)
- **Real-time push** — WebSocket events pushed to panel clients
- **Event listeners** — React to game events like player joins/drops

Each addon's server code runs in an **isolated child process** — it cannot crash fxPanel, and it cannot access core secrets or other addons' data.

### What addons cannot do (v1)

- Hot-reload (requires a restart after install/update/removal)
- Communicate with other addons directly
- Access fxPanel internals or the database directly
- Auto-update

---

## 2. Getting Started

### Directory layout

Place your addon folder inside `addons/` at the fxPanel root:

```
fxPanel/
├── addons/
│   └── my-addon/           ← Your addon
│       ├── addon.json       ← Manifest (required)
│       ├── package.json     ← Must include "type": "module"
│       ├── server/
│       │   └── index.js     ← Server entry point
│       ├── panel/
│       │   ├── index.js     ← Panel entry (exports React components)
│       │   └── index.css    ← Styles (optional)
│       └── static/          ← Static assets (optional)
├── addon-sdk/               ← SDK (shipped with fxPanel, do not modify)
├── core/
├── panel/
└── ...
```

### Minimum viable addon

**1. Create the directory:**

```
addons/hello-world/
```

**2. Create `addon.json`:**

```json
{
    "id": "hello-world",
    "name": "Hello World",
    "description": "A minimal addon example",
    "version": "1.0.0",
    "author": "YourName",
    "fxpanel": {
        "minVersion": "0.1.0"
    },
    "permissions": {
        "required": ["storage"],
        "optional": []
    },
    "server": {
        "entry": "server/index.js"
    }
}
```

**3. Create `package.json`:**

```json
{
    "private": true,
    "type": "module"
}
```

**4. Create `server/index.js`:**

```js
import { createAddon } from 'addon-sdk';

const addon = createAddon();

addon.registerRoute('GET', '/hello', async (req) => {
    return { status: 200, body: { message: `Hello, ${req.admin.name}!` } };
});

addon.log.info('Hello World addon loaded');
addon.ready();
```

**5. Restart fxPanel**, then approve the addon in the **Addons** page (requires `all_permissions`).

**6. Test it:**

```
GET /api/addons/hello-world/api/hello
```

Returns: `{ "message": "Hello, admin!" }`

---

## 3. Addon Manifest

The `addon.json` file is required in every addon's root directory. It is validated at boot using Zod. Invalid manifests cause the addon to be skipped with a warning.

### Full schema

```jsonc
{
    // ── Identity (all required) ──
    "id": "my-addon",              // Must match directory name. Lowercase a-z, 0-9, hyphens. 3-64 chars.
    "name": "My Addon",            // Display name (max 64 chars)
    "description": "What it does", // Max 256 chars
    "version": "1.0.0",            // Semver
    "author": "YourName",          // Max 64 chars
    "homepage": "https://...",     // Optional URL
    "license": "MIT",              // Optional

    // ── Compatibility ──
    "fxpanel": {
        "minVersion": "0.1.0",     // Minimum fxPanel version required
        "maxVersion": "1.0.0"      // Optional upper bound
    },

    // ── Permissions ──
    "permissions": {
        "required": ["storage"],   // Must all be granted or addon won't start
        "optional": ["ws.push"]    // Admin can choose to grant these
    },

    // ── Server entry (optional) ──
    "server": {
        "entry": "server/index.js" // Relative to addon root
    },

    // ── Panel entry (optional) ──
    "panel": {
        "entry": "panel/index.js",
        "styles": "panel/index.css",           // Optional
        "pages": [
            {
                "path": "/notes",              // Route path (prefixed with /addon/<id>)
                "title": "Player Notes",       // Page title
                "icon": "StickyNote",          // Lucide icon name (optional)
                "sidebar": true,               // Show in sidebar nav (optional)
                "sidebarGroup": "Players",     // Sidebar grouping (optional)
                "permission": "players.read",  // Required admin permission (optional)
                "component": "PlayerNotesPage" // Named export from panel entry
            }
        ],
        "widgets": [
            {
                "slot": "dashboard.main",      // Where to inject
                "component": "MyWidget",       // Named export from panel entry
                "title": "Widget Title",
                "defaultSize": "half",         // "full" | "half" | "quarter"
                "permission": "players.read"   // Optional
            }
        ]
    },

    // ── NUI entry (optional) ──
    "nui": {
        "entry": "nui/index.js",
        "styles": "nui/index.css",
        "pages": [
            {
                "id": "my-page",
                "title": "My Page",
                "icon": "StickyNote",
                "component": "MyNuiPage",
                "permission": "players.read"
            }
        ]
    },

    // ── Lua resource scripts (optional) ──
    "resource": {
        "server_scripts": ["resource/sv_main.lua"],
        "client_scripts": ["resource/cl_main.lua"]
    }
}
```

### Widget slots

| Slot ID | Location | Description |
|---------|----------|-------------|
| `dashboard.main` | Dashboard page | Main content area grid |
| `dashboard.sidebar` | Dashboard page | Right sidebar |
| `player-modal.tabs` | Player modal | Additional tabs |
| `player-modal.actions` | Player modal | Extra action buttons |
| `server.status-cards` | Server page | Status card row |
| `settings.sections` | Settings page | Additional settings sections |

---

## 4. Server-Side Development

### The SDK

Every addon's server entry imports from `addon-sdk` (shipped with fxPanel at `<fxPanel>/addon-sdk/`). The SDK is automatically resolved via `NODE_PATH` — no `npm install` needed.

```js
import { createAddon } from 'addon-sdk';

const addon = createAddon();
```

### Registering routes

Routes are registered with `addon.registerRoute(method, path, handler)`. The path supports Express-style parameters:

```js
addon.registerRoute('GET', '/players/:license/notes', async (req) => {
    // req.method    — 'GET'
    // req.path      — '/players/abc123/notes'
    // req.params    — { license: 'abc123' }
    // req.headers   — incoming HTTP headers
    // req.body      — parsed JSON body (POST/PUT/PATCH)
    // req.admin     — { name: string, permissions: string[], hasPermission(p) }

    return {
        status: 200,                    // HTTP status code
        headers: { 'X-Custom': 'hi' }, // Optional response headers
        body: { notes: [] },           // JSON response body
    };
});

addon.registerRoute('POST', '/players/:license/notes', async (req) => {
    const { text } = req.body;
    if (!text) return { status: 400, body: { error: 'text is required' } };

    // Only admins with players.write can add notes
    if (!req.admin.hasPermission('players.write')) {
        return { status: 403, body: { error: 'Insufficient permissions' } };
    }

    // ... save note ...

    return { status: 200, body: { success: true } };
});
```

**How routing works:** When a request hits `GET /api/addons/my-addon/api/players/abc123/notes`, fxPanel:

1. Authenticates the request (same auth as all core routes)
2. Extracts the addon ID (`my-addon`) and the remaining path (`/players/abc123/notes`)
3. Forwards method, path, body, headers, and admin info to the addon's child process via IPC
4. The SDK matches the path against registered routes
5. The handler's return value is sent back via IPC → HTTP response

### Signaling ready

You **must** call `addon.ready()` after registering all routes. The core waits for this signal (default timeout: 10 seconds). If not received, the addon is marked as `failed`.

```js
// Always call this last
addon.ready();
```

### Logging

```js
addon.log.info('Something happened');
addon.log.warn('Something suspicious');
addon.log.error('Something broke');
```

Logs are routed to fxPanel's console under the `[addon:my-addon]` prefix. Messages are truncated at 2000 characters.

### Error handling

Unhandled exceptions and promise rejections are caught automatically and reported to the core. They won't crash fxPanel, but they will be logged as errors.

If a route handler throws, the SDK returns a `500` response:

```json
{ "error": "Internal addon error" }
```

---

## 5. Panel UI Development

### Entry file

Your `panel/index.js` must export named React components matching the `component` values declared in the manifest:

```js
// panel/index.js

// For a page declared as { "component": "MyPage" }
export function MyPage() {
    return React.createElement('div', null, 'Hello from addon page!');
}

// For a widget declared as { "component": "MyWidget" }
export function MyWidget() {
    return React.createElement('div', null, 'Widget content');
}
```

### Shared dependencies

React is provided globally — do **not** bundle it. If using a bundler, mark `react` and `react-dom` as externals.

### API calls from the panel

Panel components can call your addon's server routes using the standard `fetch` API. Addon API routes are at:

```
/api/addons/<your-addon-id>/api/<your-route-path>
```

For authenticated requests, include the CSRF token header. The panel's `useAuthedFetcher()` hook handles this automatically if you're extending core panel components.

### Styles

If your manifest declares `panel.styles`, the CSS file is automatically loaded via a `<link>` tag when the addon is initialized.

Use Tailwind utility classes (available in the host panel) or scope your styles with a unique prefix to avoid conflicts.

### Building panel bundles

For anything beyond trivial components, you'll want a build step:

```bash
# Example with esbuild
esbuild src/panel.tsx --bundle --format=esm \
  --outfile=panel/index.js \
  --external:react --external:react-dom \
  --target=es2020
```

Key requirements:
- Output format: **ESM** (`export function ...`)
- Externalize React (it's provided by the host)
- No filename hashing (the manifest references a fixed path)
- Target: `es2020` or later

---

## 6. Permissions

Addons request permissions in their manifest. Permissions control what the addon can do at runtime.

### Available permissions

| Permission | Grants |
|------------|--------|
| `storage` | Read/write to addon's own scoped key-value store |
| `players.read` | Read player data, receive player events |
| `players.write` | Modify player data |
| `players.kick` | Kick players |
| `players.warn` | Warn players |
| `players.ban` | Ban players |
| `server.read` | Read server status, resource list, server events |
| `server.announce` | Send server-wide announcements |
| `server.command` | Execute server console commands (**dangerous**) |
| `database.read` | Read-only access to player/action database |
| `http.outbound` | Make outbound HTTP requests |
| `ws.push` | Push real-time data to panel clients via WebSocket |

### Required vs optional

- **Required** — All must be granted by an admin or the addon will not start. If you add a new required permission in an update, the admin must re-approve.
- **Optional** — The admin can choose to grant these. Check at runtime:

```js
// The permissions array reflects what was actually granted
addon.registerRoute('GET', '/data', async (req) => {
    // req.admin.hasPermission checks the calling admin's panel permissions
    // addon-level permissions are checked by the core before relay
});
```

### How approval works

1. Place the addon in `addons/`
2. Restart fxPanel — the addon is discovered and appears as "discovered" (pending)
3. An admin with `all_permissions` navigates to the **Addons** page
4. Reviews the addon's requested permissions
5. Clicks **Approve** — selects which optional permissions to grant
6. The approval is stored in `addon-config.json`
7. On next restart, the addon starts with the granted permissions

---

## 7. Storage

Each addon gets a scoped key-value store. Data is persisted to `addon-data/<addon-id>.json` by the core — your addon never reads/writes this file directly.

### API

```js
// Get a value (returns undefined if not found)
const notes = await addon.storage.get('notes:player123');

// Set a value (JSON-serializable)
await addon.storage.set('notes:player123', [
    { text: 'Known griefer', author: 'admin1', date: '2026-04-10' }
]);

// Delete a key
await addon.storage.delete('notes:player123');

// List keys by prefix
const keys = await addon.storage.list('notes:');
// → ['notes:player123', 'notes:player456']
```

### Limits

- **10 MB** max storage per addon (configurable by the server admin)
- Writes are debounced — flushed to disk every 5 seconds or on shutdown
- Keys are strings, values must be JSON-serializable
- Storage operations timeout after 5 seconds

### Scoping

Addons can only access their own storage. `addon.storage.get('somekey')` operates on the `my-addon` scope only — there is no way to read another addon's data.

---

## 8. Real-Time WebSocket Push

Addons with the `ws.push` permission can push real-time events to panel clients.

### Server side

```js
// Push an event to all panel clients subscribed to this addon's room
addon.ws.push('notes:updated', { license: 'abc123', count: 5 });

// React to panel clients subscribing/unsubscribing
addon.ws.onSubscribe((sessionId) => {
    addon.log.info(`Client subscribed: ${sessionId}`);
});

addon.ws.onUnsubscribe((sessionId) => {
    addon.log.info(`Client left: ${sessionId}`);
});
```

### Panel side

Panel clients join the `addon:<addonId>` Socket.io room. The panel addon loader handles this automatically when addon components mount.

Events are emitted as `addon:<addonId>:<eventName>` on the socket.

### How it works

```
Addon Process  →  IPC { type: 'ws-push', event, data }
    →  Core WebSocket  →  Socket.io room 'addon:<addonId>'
        →  All panel clients subscribed to that room
```

---

## 9. Events

Addons can listen for game events broadcast by fxPanel core.

### Subscribing to events

```js
addon.on('playerJoining', (data) => {
    addon.log.info(`Player joining: ${data.displayName} (${data.license})`);
});

addon.on('playerDropped', (data) => {
    addon.log.info(`Player dropped: netid=${data.netid}, reason=${data.reason}`);
});
```

### Available events

| Event | Payload | Notes |
|-------|---------|-------|
| `playerJoining` | `{ netid, displayName, license, ids }` | Fired when a player connects |
| `playerDropped` | `{ netid, reason }` | Fired when a player disconnects |

More events will be added in future versions (player warned/banned/kicked, server start/stop, etc.).

---

## 10. Addon Admin Management

### The Addons page

Admins with `all_permissions` can access the **Addons** page from the global menu. This page shows:

- All discovered addons with their current state
- State badges: `running`, `discovered` (pending approval), `failed`, `crashed`, `stopped`
- Addon metadata: name, version, author, description
- Requested and granted permissions
- **Approve** / **Revoke** actions

### Addon states

| State | Meaning |
|-------|---------|
| `discovered` | Found on disk, pending admin approval |
| `approved` | Permissions granted, will start on next boot |
| `starting` | Process is spawning |
| `running` | Active and serving requests |
| `stopping` | Graceful shutdown in progress |
| `stopped` | Explicitly disabled by admin |
| `failed` | Could not start (entry file missing, timeout, error) |
| `crashed` | Process exited unexpectedly at runtime |
| `invalid` | Manifest validation failed |

### Configuration

The addon system's global config is stored in `addon-config.json` (per profile):

```json
{
    "enabled": true,
    "maxAddons": 20,
    "maxStorageMb": 10,
    "processTimeoutMs": 10000,
    "approved": {
        "my-addon": {
            "granted": ["storage", "players.read"],
            "approvedAt": "2026-04-10T16:00:00.000Z",
            "approvedBy": "admin"
        }
    },
    "disabled": []
}
```

---

## 11. File Structure Reference

### What fxPanel ships

```
fxPanel/
├── addon-sdk/                 ← SDK package (do not modify)
│   ├── package.json
│   └── src/
│       ├── index.js           ← createAddon() and runtime
│       ├── index.d.ts         ← TypeScript types
│       ├── ui.js              ← Shared UI component re-exports
│       └── ui.d.ts
├── addons/                    ← Your addons go here
│   └── player-notes/         ← Example addon (shipped as reference)
├── core/
│   └── modules/
│       └── AddonManager/      ← Core addon management
│           ├── index.ts       ← Discovery, lifecycle, approval
│           ├── addonProcess.ts ← Child process + IPC handling
│           └── addonStorage.ts ← Scoped KV storage
└── shared/
    └── addonTypes.ts          ← Zod schemas, IPC types, shared interfaces
```

### What an addon provides

```
addons/my-addon/
├── addon.json                 ← Required manifest
├── package.json               ← Must have "type": "module"
├── server/
│   └── index.js               ← Server entry (runs in child process)
├── panel/
│   ├── index.js               ← Panel bundle (exports React components)
│   └── index.css              ← Optional styles
├── nui/
│   ├── index.js               ← NUI bundle
│   └── index.css              ← Optional styles
├── resource/
│   ├── sv_main.lua            ← Server-side Lua
│   └── cl_main.lua            ← Client-side Lua
└── static/
    └── icon.png               ← Served at /addons/my-addon/static/icon.png
```

All directories except `addon.json` and `package.json` are optional — include only the layers you need.

### What fxPanel generates

```
addon-data/                    ← Managed by core, per-profile
├── my-addon.json              ← Storage data for my-addon
└── another-addon.json

addon-config.json              ← Per-profile approval + settings
```

---

## 12. Security Notes

### Process isolation

Your addon's server code runs in a separate Node.js process with a minimal environment. It has **no access** to:

- fxPanel's database connections
- Admin sessions or tokens
- Environment variables (except `NODE_ENV` and `ADDON_ID`)
- Other addons' processes or storage

### HTTP safety

- All addon API requests pass through fxPanel's auth middleware — anonymous access is impossible
- Response headers are sanitized: `Set-Cookie` and `Content-Security-Policy` headers are stripped
- Addon routes are namespaced under `/api/addons/<id>/api/` — they cannot collide with core routes

### Storage safety

- Key names are validated — path traversal patterns are rejected
- Each addon can only access its own scoped store
- Size limits are enforced per addon

### Panel safety

- Addon panel bundles are loaded via `import()` and wrapped in React `<ErrorBoundary>` — a crash in your component won't break the panel
- Use Tailwind classes or scoped CSS to avoid style conflicts

### What to avoid

- Do not shell out / spawn child processes from your addon
- Do not attempt to read files outside your addon directory
- Do not store sensitive data (tokens, passwords) in addon storage — it's a plain JSON file on disk

---

## 13. Troubleshooting

### Addon isn't discovered

- Verify the directory name matches the `id` field in `addon.json`
- Check the console for Zod validation errors on the manifest
- Ensure `addon.json` exists in the addon root (not in a subdirectory)
- The `addons/` directory must exist at the fxPanel root

### Addon stays in "discovered" state

- It needs to be approved by an admin with `all_permissions` in the Addons page
- After approval, fxPanel must be restarted

### Addon fails to start

- Check the fxPanel console for `[addon:my-addon]` error messages
- Common causes:
  - Missing `"type": "module"` in `package.json`
  - Syntax error in `server/index.js`
  - `addon.ready()` never called (10-second timeout)
  - Import errors (the SDK import must be `from 'addon-sdk'`, not `@fxpanel/addon-sdk`)

### API routes return 503

- The addon process is not running (check state in Addons page)
- The addon crashed — check console logs for the error

### Storage operations fail

- Ensure `storage` is listed in `permissions.required` and was approved
- Storage operations timeout after 5 seconds

### Panel component doesn't render

- Verify your entry file exports a function matching the `component` name in the manifest
- Check the browser console for import or render errors
- Ensure React is not bundled in your panel entry (use externals)

### WebSocket push not working

- Ensure `ws.push` is in your granted permissions
- Panel clients must be subscribed to the addon's room (automatic for addon components)

---

## Example: player-notes addon

A complete working example is shipped at `addons/player-notes/`. It demonstrates:

- Manifest with server + panel entry
- CRUD routes for player notes (GET, POST, DELETE)
- Scoped storage usage
- WebSocket push on note updates
- Panel widget injected into the player modal
- Admin permission checking in routes

Study this addon as a starting point for your own.
