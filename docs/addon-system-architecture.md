# fxPanel Addon System — Architecture Specification

> Version: Draft 1.1  
> Status: Design phase — out of scope for v0.1.x, planned post-launch  
> Last updated: April 10, 2026  
> Open questions: All resolved

---

## Table of Contents

1. [Overview](#1-overview)
2. [Addon Directory Structure](#2-addon-directory-structure)
3. [Addon Manifest (`addon.json`)](#3-addon-manifest-addonjson)
4. [Addon Lifecycle](#4-addon-lifecycle)
5. [Process Isolation Architecture](#5-process-isolation-architecture)
6. [Core API Surface](#6-core-api-surface)
7. [Panel UI Injection](#7-panel-ui-injection)
8. [NUI Injection](#8-nui-injection)
9. [Lua Resource Integration](#9-lua-resource-integration)
10. [Permission System](#10-permission-system)
11. [Addon Storage](#11-addon-storage)
12. [Security Model](#12-security-model)
13. [Error Handling & Fault Tolerance](#13-error-handling--fault-tolerance)
14. [Example Addon](#14-example-addon)
15. [Resolved Design Decisions](#15-resolved-design-decisions)

---

## 1. Overview

### Goals

- Allow users to extend fxPanel without modifying core source files
- Support addons across all layers: **web panel**, **core backend API**, **NUI (in-game menu)**, and **Lua resource scripts**
- Maximum isolation: each addon runs in a **separate child process** with a defined IPC protocol
- Addons are **pre-built bundles** — no compilation at runtime
- Addons declare required permissions; admins must approve before activation
- No hot-reload in v1 — addons are discovered and loaded on boot only

### Non-Goals (v1)

- Hot-reload / live addon updates
- Addon-to-addon dependencies or communication
- Custom theme system (separate feature track)
- Addon auto-updater (manual replacement only)
- Testing harnesses / mock environments for addon authors

### Planned (Post-v1)

- **Addon Marketplace** — A browsable directory of addons with a **verified developer** badge system. Verified authors go through an approval process. Users can discover, review, and manually download addons.
- **Multi-server storage scoping** — if multi-server support is added

---

## 2. Addon Directory Structure

Addons live in an `addons/` directory at the fxPanel root (sibling to `core/`, `panel/`, `resource/`):

```
fxPanel/
├── addons/                          ← Addon root (scanned on boot)
│   ├── my-addon/
│   │   ├── addon.json               ← Manifest (required)
│   │   ├── server/                   ← Backend code (optional)
│   │   │   └── index.js             ← Entry point — runs in child process
│   │   ├── panel/                    ← Panel UI bundle (optional)
│   │   │   ├── index.js             ← UMD/ESM bundle with component exports
│   │   │   └── index.css            ← Styles (optional)
│   │   ├── nui/                      ← NUI bundle (optional)
│   │   │   ├── index.js             ← UMD bundle for in-game menu
│   │   │   └── index.css            ← Styles (optional)
│   │   ├── resource/                 ← Lua scripts (optional)
│   │   │   ├── sv_*.lua             ← Server-side Lua
│   │   │   └── cl_*.lua             ← Client-side Lua
│   │   └── static/                   ← Static assets (optional)
│   │       └── icon.png
│   └── another-addon/
│       └── ...
├── addon-data/                       ← Persistent addon storage (managed by system)
│   ├── my-addon.json
│   └── another-addon.json
├── core/
├── panel/
├── nui/
├── resource/
└── ...
```

### Conventions

- Addon directory name = addon ID (validated: lowercase alphanumeric + hyphens, 3–64 chars)
- `addon.json` manifest is required — directories without it are ignored
- Each subdirectory (`server/`, `panel/`, `nui/`, `resource/`) is optional — addons can target any combination of layers
- `addon-data/` is created automatically by the addon system; addons MUST NOT write to it directly

---

## 3. Addon Manifest (`addon.json`)

Validated at boot with Zod. Invalid manifests cause the addon to be skipped with a warning.

```jsonc
{
  // ── Identity ──────────────────────────────────────────────
  "id": "player-notes",                         // Must match directory name
  "name": "Player Notes",                       // Display name
  "description": "Add notes to player profiles",
  "version": "1.0.0",                           // semver
  "author": "YourName",
  "homepage": "https://github.com/...",          // Optional
  "license": "MIT",                              // Optional

  // ── Compatibility ─────────────────────────────────────────
  "fxpanel": {
    "minVersion": "0.2.0",                       // Minimum fxPanel version
    "maxVersion": "1.x"                          // Optional upper bound (semver range)
  },

  // ── Permissions ───────────────────────────────────────────
  "permissions": {
    "required": [
      "players.read",                            // Read player data
      "players.write",                           // Modify player records
      "storage"                                  // Access addon's own storage
    ],
    "optional": [
      "database.read"                            // Requested but not required
    ]
  },

  // ── Entry Points ──────────────────────────────────────────
  "server": {
    "entry": "server/index.js"                   // Relative to addon root
  },

  "panel": {
    "entry": "panel/index.js",
    "styles": "panel/index.css",                 // Optional
    "pages": [
      {
        "path": "/addons/player-notes",          // Route in the panel
        "title": "Player Notes",
        "icon": "StickyNote",                    // Lucide icon name
        "sidebar": true,                         // Show in sidebar nav
        "sidebarGroup": "Players",               // Which sidebar group
        "permission": "players.read",            // Required admin permission
        "component": "PlayerNotesPage"           // Named export from entry
      }
    ],
    "widgets": [
      {
        "slot": "dashboard.main",                // Widget slot ID
        "component": "NotesWidget",              // Named export from entry
        "title": "Recent Notes",
        "defaultSize": "half",                   // "full" | "half" | "quarter"
        "permission": "players.read"
      },
      {
        "slot": "player-modal.tabs",             // Inject a tab into the player modal
        "component": "PlayerNotesTab",
        "title": "Notes",
        "permission": "players.read"
      }
    ]
  },

  "nui": {
    "entry": "nui/index.js",
    "styles": "nui/index.css",                   // Optional
    "pages": [
      {
        "id": "player-notes",
        "title": "Notes",
        "icon": "StickyNote",
        "component": "NuiNotesPage",
        "permission": "players.read"
      }
    ]
  },

  "resource": {
    "server_scripts": [
      "resource/sv_notes.lua"
    ],
    "client_scripts": [
      "resource/cl_notes.lua"
    ]
  }
}
```

### Zod Schema (excerpt)

```typescript
const AddonManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/),
  name: z.string().min(1).max(64),
  description: z.string().max(256),
  version: z.string().regex(/^\d+\.\d+\.\d+/), // semver
  author: z.string().min(1).max(64),
  homepage: z.string().url().optional(),
  license: z.string().optional(),

  fxpanel: z.object({
    minVersion: z.string(),
    maxVersion: z.string().optional(),
  }),

  permissions: z.object({
    required: z.array(z.string()).default([]),
    optional: z.array(z.string()).default([]),
  }),

  server: z.object({
    entry: z.string(),
  }).optional(),

  panel: z.object({
    entry: z.string(),
    styles: z.string().optional(),
    pages: z.array(AddonPageSchema).default([]),
    widgets: z.array(AddonWidgetSchema).default([]),
  }).optional(),

  nui: z.object({
    entry: z.string(),
    styles: z.string().optional(),
    pages: z.array(AddonNuiPageSchema).default([]),
  }).optional(),

  resource: z.object({
    server_scripts: z.array(z.string()).default([]),
    client_scripts: z.array(z.string()).default([]),
  }).optional(),
});
```

---

## 4. Addon Lifecycle

### Boot Sequence

```
fxPanel boot
  │
  ├─ 1. AddonManager.discover()
  │      Scan addons/ directory
  │      Read & validate each addon.json
  │      Check version compatibility (semver)
  │      Result: list of valid AddonDescriptor objects
  │
  ├─ 2. AddonManager.checkPermissions()
  │      Compare declared permissions against admin-approved list
  │      Skip unapproved addons (log warning)
  │      Load approved list from addon-config.json
  │
  ├─ 3. AddonManager.loadResources()
  │      Register Lua scripts from resource/ into fxmanifest dynamically
  │      Inject addon client/server scripts into the running resource
  │
  ├─ 4. AddonManager.startProcesses()
  │      For each addon with a server/ entry:
  │        Spawn child_process.fork() with restricted env
  │        Establish IPC channel
  │        Wait for ready signal (timeout: 10s)
  │        Register addon's API routes into Koa router
  │
  ├─ 5. AddonManager.registerPanelExtensions()
  │      Collect panel page/widget descriptors
  │      Expose via GET /api/addons/panel-manifest
  │      Serve addon panel bundles at /addons/:addonId/panel/*
  │
  ├─ 6. AddonManager.registerNuiExtensions()
  │      Collect NUI page descriptors
  │      Expose via intercom or NUI callback
  │      Serve NUI bundles at /nui/addons/:addonId/*
  │
  └─ 7. AddonManager.ready()
         All addons initialized
         Emit "addons:ready" event
```

### Shutdown Sequence

```
fxPanel shutdown / restart
  │
  ├─ 1. Send "shutdown" IPC message to all addon processes
  ├─ 2. Wait for graceful exit (timeout: 5s per addon)
  ├─ 3. SIGKILL any remaining addon processes
  └─ 4. Flush addon storage to disk
```

### Addon State Machine

```
DISCOVERED → VALIDATING → APPROVED → STARTING → RUNNING → STOPPING → STOPPED
                 │                       │                      │
                 └→ INVALID              └→ FAILED              └→ CRASHED
```

---

## 5. Process Isolation Architecture

Each addon with a `server/` entry runs in a **separate Node.js child process** spawned via `child_process.fork()`.

### Why Separate Processes?

- **Crash isolation**: A buggy addon cannot crash fxPanel core
- **Memory isolation**: Addons can't read core's in-memory state (tokens, sessions, etc.)
- **Resource limits**: Can enforce memory/CPU limits per addon (future)
- **Clean teardown**: `SIGKILL` as a last resort

### IPC Protocol

Communication between core and addon processes uses Node.js built-in IPC (JSON messages over the fork channel).

```typescript
// Message format
interface AddonIpcMessage {
  type: string;           // Message type
  id: string;             // Correlation ID for request/response
  payload: unknown;       // Type-specific data
}

// ── Core → Addon ────────────────────────────────
type CoreToAddon =
  | { type: 'init'; payload: { addonId: string; config: AddonConfig; permissions: string[] } }
  | { type: 'shutdown'; payload: {} }
  | { type: 'http-request'; id: string; payload: { method: string; path: string; headers: Record<string, string>; body: unknown; adminPermissions: string[] } }
  | { type: 'event'; payload: { event: string; data: unknown } }
  | { type: 'storage-response'; id: string; payload: { data: unknown } }
  | { type: 'ws-subscribe'; payload: { sessionId: string } }   // Panel client joined addon room
  | { type: 'ws-unsubscribe'; payload: { sessionId: string } }; // Panel client left addon room

// ── Addon → Core ────────────────────────────────
type AddonToCore =
  | { type: 'ready'; payload: { routes: AddonRouteDescriptor[] } }
  | { type: 'http-response'; id: string; payload: { status: number; headers: Record<string, string>; body: unknown } }
  | { type: 'storage-request'; id: string; payload: { op: 'get' | 'set' | 'delete' | 'list'; key?: string; value?: unknown } }
  | { type: 'api-call'; id: string; payload: { method: string; args: unknown[] } }
  | { type: 'ws-push'; payload: { event: string; data: unknown } }  // Push to addon's Socket.io room
  | { type: 'log'; payload: { level: 'info' | 'warn' | 'error'; message: string } }
  | { type: 'error'; payload: { message: string; stack?: string } };
```

### Process Spawning

```typescript
// Core side (AddonManager)
const child = fork(addonEntryPath, [], {
  cwd: addonDir,
  env: {
    NODE_ENV: process.env.NODE_ENV,
    ADDON_ID: addon.id,
    // Explicitly NO access to: database paths, tokens, secrets, core env vars
  },
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  serialization: 'json',
  // Future: execArgv for --max-old-space-size limits
});

// Capture stdout/stderr → route to fxPanel logger under addon scope
child.stdout.on('data', (data) => addonLogger.info(data.toString()));
child.stderr.on('data', (data) => addonLogger.error(data.toString()));
```

### HTTP Request Proxying

When a request hits `/api/addons/:addonId/*`, the core:

1. Authenticates the request (same `apiAuthMw` as core routes)
2. Validates the admin has the addon's required permission
3. Serializes the request (method, path, body, admin info) into an IPC message
4. Sends to the addon's child process
5. Awaits the IPC response (timeout: 30s)
6. Writes the response back to the Koa context

```
Browser → Koa → apiAuthMw → addonProxyMw → IPC → Addon Process
                                              ←── IPC response
Browser ← Koa ← response
```

---

## 6. Core API Surface

Addons interact with fxPanel through a constrained API provided via the `@fxpanel/addon-sdk` package (shipped with fxPanel, not npm-published).

### SDK Bootstrap (addon side)

```typescript
// server/index.js — addon entry point
import { createAddon } from '@fxpanel/addon-sdk';

const addon = createAddon();

// Register routes
addon.registerRoute('GET', '/notes/:playerId', async (req) => {
  const notes = await addon.storage.get(`notes:${req.params.playerId}`);
  return { status: 200, body: { notes } };
});

addon.registerRoute('POST', '/notes/:playerId', async (req) => {
  // req.admin contains the authenticated admin's info
  if (!req.admin.hasPermission('players.write')) {
    return { status: 403, body: { error: 'Insufficient permissions' } };
  }
  await addon.storage.set(`notes:${req.params.playerId}`, req.body);
  return { status: 200, body: { success: true } };
});

// Listen for core events
addon.on('playerJoining', (player) => {
  addon.log.info(`Player joining: ${player.name}`);
});

// Signal ready
addon.ready();
```

### Available API Methods (via IPC)

| Category | Method | Permission | Description |
|----------|--------|------------|-------------|
| **Storage** | `addon.storage.get(key)` | `storage` | Read from addon's scoped store |
| **Storage** | `addon.storage.set(key, value)` | `storage` | Write to addon's scoped store |
| **Storage** | `addon.storage.delete(key)` | `storage` | Delete from addon's scoped store |
| **Storage** | `addon.storage.list(prefix?)` | `storage` | List keys in addon's store |
| **Players** | `addon.players.getOnline()` | `players.read` | Get online player list |
| **Players** | `addon.players.getById(id)` | `players.read` | Get player by server ID |
| **Players** | `addon.players.getByLicense(license)` | `players.read` | Get player by license |
| **Players** | `addon.players.search(query)` | `players.read` | Fuzzy search players |
| **Actions** | `addon.actions.kick(playerId, reason)` | `players.kick` | Kick a player |
| **Actions** | `addon.actions.warn(playerId, reason)` | `players.warn` | Warn a player |
| **Actions** | `addon.actions.ban(playerId, reason, duration?)` | `players.ban` | Ban a player |
| **Actions** | `addon.actions.announce(message)` | `server.announce` | Send server announcement |
| **Server** | `addon.server.getStatus()` | `server.read` | Server status (online, players, uptime) |
| **Server** | `addon.server.getResources()` | `server.read` | List server resources |
| **Events** | `addon.on(event, handler)` | per-event | Subscribe to core events |
| **WebSocket** | `addon.ws.push(event, data)` | `ws.push` | Push real-time data to panel clients in addon's room |
| **WebSocket** | `addon.ws.onSubscribe(handler)` | `ws.push` | Called when a panel client joins the addon's room |
| **WebSocket** | `addon.ws.onUnsubscribe(handler)` | `ws.push` | Called when a panel client leaves the addon's room |
| **Logging** | `addon.log.info/warn/error(msg)` | — | Log to fxPanel's addon log scope |

### Real-Time Push (WebSocket)

Addons can push real-time data to their panel components via Socket.io. Each addon gets a dedicated room: `addon:<addonId>`.

**Server side (addon process):**

```typescript
// Push data to all panel clients viewing this addon's components
addon.ws.push('notes:updated', { playerId: '123', count: 5 });

// React to clients joining/leaving
addon.ws.onSubscribe((sessionId) => {
  addon.log.info(`Panel client subscribed: ${sessionId}`);
});
```

**Panel side (addon component):**

```typescript
// Provided via AddonComponentProps
interface AddonComponentProps {
  // ... existing props ...
  ws: {
    useAddonEvent: (event: string, handler: (data: unknown) => void) => void;
    // Automatically joins addon:<addonId> room on mount, leaves on unmount
  };
}

// Usage in a widget
export function NotesWidget({ addonId, api, ws }: AddonComponentProps) {
  const [count, setCount] = React.useState(0);

  ws.useAddonEvent('notes:updated', (data) => {
    setCount(data.count);
  });

  return <Card><Badge>{count} notes</Badge></Card>;
}
```

**How it works internally:**

```
Addon Process → IPC { type: 'ws-push', event, data }
    → Core WebSocket → Socket.io room 'addon:<addonId>'
        → All panel clients subscribed to that room
```

### Events Available to Addons

| Event | Payload | Permission |
|-------|---------|------------|
| `playerJoining` | `{ name, ids, source }` | `players.read` |
| `playerDropped` | `{ name, ids, source, reason }` | `players.read` |
| `playerWarned` | `{ target, admin, reason }` | `players.read` |
| `playerBanned` | `{ target, admin, reason, duration }` | `players.read` |
| `playerKicked` | `{ target, admin, reason }` | `players.read` |
| `serverStarting` | `{}` | `server.read` |
| `serverStarted` | `{}` | `server.read` |
| `serverStopping` | `{}` | `server.read` |
| `chatMessage` | `{ source, author, text }` | `server.read` |
| `announcement` | `{ message, admin }` | `server.read` |

---

## 7. Panel UI Injection

### Architecture

The panel (React + Wouter) currently has a static `allRoutes` array in `MainRouter.tsx`. The addon system extends this dynamically.

#### Loading Flow

```
Panel boot
  │
  ├─ 1. Fetch GET /api/addons/panel-manifest
  │      Returns: { addons: [{ id, pages, widgets, entryUrl, stylesUrl }] }
  │
  ├─ 2. For each addon:
  │      ├─ Load CSS: <link href="/addons/:id/panel/index.css">
  │      └─ Load JS:  dynamic import("/addons/:id/panel/index.js")
  │            Module must export named components matching manifest
  │
  ├─ 3. Register routes
  │      Merge addon pages into the route switch
  │      Addon pages render at /addons/:addonId/* paths
  │
  ├─ 4. Register sidebar entries
  │      Inject into sidebar nav under declared group
  │      "Addons" group auto-created if sidebarGroup not specified
  │
  └─ 5. Register widgets
         Mount into dashboard/player-modal widget slots
         Widgets render inside an error boundary
```

#### Widget Slots

Pre-defined injection points in the panel UI:

| Slot ID | Location | Description |
|---------|----------|-------------|
| `dashboard.main` | Dashboard page | Main content area grid |
| `dashboard.sidebar` | Dashboard page | Right sidebar |
| `player-modal.tabs` | Player modal | Additional tabs |
| `player-modal.actions` | Player modal | Extra action buttons |
| `server.status-cards` | Server page | Status card row |
| `settings.sections` | Settings page | Additional settings sections |

#### Component Contract

Addon panel components receive a standardized props object:

```typescript
interface AddonComponentProps {
  addonId: string;
  // Utilities provided by the host
  api: {
    fetch: (path: string, init?: RequestInit) => Promise<Response>;
    // Pre-configured to hit /api/addons/:addonId/*
  };
  ws: {
    useAddonEvent: (event: string, handler: (data: unknown) => void) => void;
    // Joins addon:<addonId> Socket.io room on mount, leaves on unmount
  };
  permissions: string[];
  // For widgets
  slot?: string;
  size?: 'full' | 'half' | 'quarter';
}
```

#### Isolation

- Addon JS bundles are loaded via dynamic `import()` — they share the React runtime (provided as an external/global)
- Addon components are wrapped in a React `<ErrorBoundary>` — a crash in one addon cannot break the panel
- Addons MUST NOT import from fxPanel internals — they receive everything via props
- Addons can use their own dependencies if bundled (no shared `node_modules`)
- CSP: addon script sources are added to the nonce-based CSP allowlist dynamically

#### Shared Dependencies (externals)

To keep addon bundles small, the following are provided as globals that addons can declare as externals in their bundler config:

| Global | Package |
|--------|---------|
| `React` | `react` |
| `ReactDOM` | `react-dom` |
| `Jotai` | `jotai` (optional) || `FxPanelUI` | `@fxpanel/addon-sdk/ui` |

#### Shared UI Component Library

The `@fxpanel/addon-sdk/ui` package exposes panel UI components matching fxPanel's shadcn/ui + Tailwind design system. Addons **should** use these for visual consistency.

**Available components:**

| Component | Description |
|-----------|-------------|
| `Button` | Primary, secondary, destructive, ghost, outline variants |
| `Card`, `CardHeader`, `CardContent` | Content container with header/content sections |
| `Badge` | Status/label badges |
| `Input`, `Textarea` | Form inputs with validation states |
| `Select`, `SelectItem` | Dropdown select |
| `Dialog`, `DialogHeader`, `DialogContent`, `DialogFooter` | Modal dialogs |
| `Table`, `TableHeader`, `TableRow`, `TableCell` | Data tables |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Tab navigation |
| `Alert`, `AlertTitle`, `AlertDescription` | Alert banners (info, warning, error) |
| `Tooltip` | Hover tooltips |
| `Skeleton` | Loading placeholders |
| `ScrollArea` | Scrollable containers |
| `Separator` | Horizontal/vertical dividers |

**Usage in addon panel components:**

```tsx
import { Button, Card, CardHeader, CardContent, Badge } from '@fxpanel/addon-sdk/ui';

export function NotesWidget({ addonId, api }: AddonComponentProps) {
  return (
    <Card>
      <CardHeader>Recent Notes <Badge>3 new</Badge></CardHeader>
      <CardContent>
        {/* ... */}
        <Button variant="secondary" onClick={handleRefresh}>Refresh</Button>
      </CardContent>
    </Card>
  );
}
```

Components inherit the active panel theme (colors, radii, fonts) automatically — no additional configuration needed.
---

## 8. NUI Injection

The NUI (in-game menu) uses a fixed page enum today. Addons extend this.

### Loading Flow

```
NUI boot (game client)
  │
  ├─ 1. NUI callback: fetchNui('getAddonManifest')
  │      Core returns merged NUI addon descriptors
  │
  ├─ 2. For each addon with NUI pages:
  │      Load JS bundle from cfx-nui://monitor/nui/addons/:id/index.js
  │      Load CSS from cfx-nui://monitor/nui/addons/:id/index.css
  │
  └─ 3. Register pages
         Addon pages appear as additional tabs in the NUI menu
         Rendered conditionally based on the page state atom
```

### Build Requirements for NUI Addons

- Target: `chrome103` (FiveM's embedded Chromium version)
- No `crossorigin` attributes (FiveM's `cfx-nui` protocol doesn't support CORS)
- No filename hashing (consistent paths required)
- Externalize `React` and `ReactDOM` (provided by NUI host)

### NUI Component Contract

```typescript
interface NuiAddonPageProps {
  addonId: string;
  fetchNui: (event: string, data?: unknown) => Promise<unknown>;
  // Routes NUI callbacks through: POST https://monitor/addons/:addonId/:event
  // Which the core proxies to the addon's child process
  theme: 'fivem' | 'redm';
  locale: string;
}
```

---

## 9. Lua Resource Integration

Addons can include Lua scripts that run within the FXServer resource context.

### How It Works

1. On boot, `AddonManager` collects `resource.server_scripts` and `resource.client_scripts` from all approved addons
2. These paths are resolved relative to the addon directory
3. Scripts are **copied** (not symlinked) to `monitor/resource/addons/<addon-id>/` during the build/load phase
4. The generated `fxmanifest.lua` includes these scripts

### Script Sandboxing

Lua scripts run in the same FXServer Lua VM — full process-level isolation is not possible. However, fxPanel applies **best-effort `_ENV` sandboxing** to limit what addon scripts can access.

#### `_ENV` Sandbox

Each addon Lua file is wrapped at load time with a restricted environment table:

```lua
-- Auto-injected by AddonManager before each addon Lua script
local _ADDON_ENV = setmetatable({}, { __index = function(_, k)
    -- Block dangerous globals
    local blocked = {
        loadfile = true, dofile = true, load = true, loadstring = true,
        rawset = true, rawget = true, rawequal = true, rawlen = true,
        debug = true, io = true, os = true, package = true,
        getfenv = true, setfenv = true, newproxy = true,
    }
    if blocked[k] then
        error(('[fxPanel] Addon "%s" attempted to access blocked global: %s'):format(ADDON_ID, k), 2)
    end
    return _G[k]  -- Allow access to safe globals (print, math, string, table, etc.)
end })
_ADDON_ENV.ADDON_ID = '<addon-id>'
_ADDON_ENV._G = _ADDON_ENV  -- Self-referencing
_ENV = _ADDON_ENV
```

This blocks:
- Dynamic code loading (`load`, `loadfile`, `dofile`, `loadstring`)
- Raw table manipulation that could bypass metatables (`rawset`, `rawget`)
- File system access (`io`, `os`)
- Debug library (`debug`) which could inspect/modify other scripts' state
- Module system (`package`, `require` is replaced with a scoped version)

FXServer-specific APIs (`RegisterNetEvent`, `TriggerEvent`, `PerformHttpRequest`, etc.) remain accessible since they are safe to call and necessary for addon functionality.

**Limitations:** A sufficiently motivated attacker could bypass `_ENV` restrictions via the `string` library's `dump`/`load` pattern or by obtaining a reference to `_G` through other means. This sandboxing is a deterrent, not a security guarantee. The primary security gate is the **admin approval system** — only approved addons are loaded.

Additional mitigations:
- Addon Lua scripts are prefixed with a guard that sets `ADDON_ID` and provides scoped net event helpers
- A linting/review step is recommended for addon Lua scripts before distribution
- The permission system controls which addons are loaded at all
- The **verified developer** badge on the marketplace signals that addon code has been reviewed

### Communication: Lua ↔ Addon Server Process

Lua scripts in addons communicate with their server-side Node process through the existing intercom HTTP channel:

```lua
-- Addon Lua → Core → IPC → Addon Process
PerformHttpRequest(
  ("http://%s/intercom/addon/%s/my-event"):format(TX_INTERCOM_URL, ADDON_ID),
  function(status, body) ... end,
  "POST",
  json.encode({ key = "value" }),
  { ["Content-Type"] = "application/json", ["TX-Token"] = TX_LUACOMTOKEN }
)
```

The core intercepts `/intercom/addon/:addonId/*` and routes to the correct child process via IPC.

---

## 10. Permission System

### Permission Tiers

Addons declare permissions in their manifest. These are **not** the same as admin permissions — they define what system capabilities the addon requests.

```
┌──────────────────────────────────────────────────┐
│              Addon Permission Model              │
├──────────────────────────────────────────────────┤
│                                                  │
│  Manifest declares:                              │
│    permissions.required = ["players.read", ...]  │
│    permissions.optional = ["database.read"]      │
│                                                  │
│  Admin approves addon → stored in:               │
│    addon-config.json                             │
│      { "approved": { "my-addon": {               │
│         "granted": ["players.read", "storage"],  │
│         "approvedAt": "2026-...",                 │
│         "approvedBy": "admin-name"               │
│      }}}                                         │
│                                                  │
│  At boot:                                        │
│    If required perms not all granted → SKIP      │
│    Optional perms granted on case-by-case        │
│                                                  │
│  At runtime:                                     │
│    Each API call checks addon's granted perms    │
│    Denied calls return error, not crash          │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Available Addon Permissions

| Permission | Grants |
|------------|--------|
| `storage` | Read/write to addon's own scoped storage |
| `players.read` | Read player data, subscribe to player events |
| `players.write` | Modify player data (tags, notes, etc.) |
| `players.kick` | Kick players |
| `players.warn` | Warn players |
| `players.ban` | Ban players |
| `server.read` | Read server status, resources, subscribe to server events |
| `server.announce` | Send server-wide announcements |
| `server.command` | Execute server console commands (dangerous) |
| `database.read` | Read-only access to player/action DB queries |
| `http.outbound` | Make outbound HTTP requests (for integrations) |
| `ws.push` | Push real-time data to panel clients via WebSocket |

### Approval Flow (Panel UI)

1. Admin navigates to **Settings → Addons**
2. Sees list of discovered addons with status (approved / pending / invalid)
3. Clicks an addon → sees manifest details, requested permissions, description
4. Clicks "Approve" → selects which optional permissions to grant
5. Addon is added to `addon-config.json` → active on next restart

---

## 11. Addon Storage

Each addon gets a **scoped key-value store** backed by a JSON file at `addon-data/<addon-id>.json`.

### Design

- The core manages the file — addons never access it directly
- All storage operations go through IPC (`storage-request` / `storage-response`)
- Keys are strings, values are JSON-serializable
- Writes are debounced (flush to disk every 5s or on shutdown)
- Max storage per addon: **10 MB** (configurable)

### API

```typescript
// In addon process
await addon.storage.get('notes:player123');
// → { text: "Known griefer", addedBy: "admin1", date: "..." }

await addon.storage.set('notes:player123', { ... });

await addon.storage.delete('notes:player123');

await addon.storage.list('notes:');
// → ['notes:player123', 'notes:player456']
```

### Why Not Direct File Access?

- Prevents addons from reading/writing outside their scope
- Enables future migration to a real database without addon changes
- Allows the core to enforce size limits and validate data
- Consistent backup/restore alongside core data

---

## 12. Security Model

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Malicious addon reads core secrets | Process isolation — separate address space, restricted env vars |
| Addon crashes bring down fxPanel | Process isolation — child process crash handled by parent |
| Addon opens backdoor HTTP endpoints | All addon HTTP goes through core's auth middleware |
| Addon performs path traversal | Addon IDs validated, all paths resolved and checked against addon root |
| Addon exhausts system resources | Future: `--max-old-space-size` limits, CPU monitoring |
| Addon reads other addon's storage | Storage scoped by addon ID, enforced at core level |
| Addon Lua script is malicious | Lua runs in shared FXServer VM — mitigated by admin approval + review |
| XSS via addon panel components | React's built-in escaping, CSP nonces, error boundaries |
| Addon impersonates core API | Addon routes are namespaced under `/api/addons/:id/` — cannot collide |
| IPC message spoofing | IPC channel is per-process — only the forked child can send on it |

### Hardening Checklist

- [ ] Addon IDs validated against strict regex (no `..`, `/`, `\`, etc.)
- [ ] All file paths resolved and verified to be within addon directory
- [ ] IPC messages validated with Zod schemas on both sides
- [ ] Addon HTTP responses sanitized (no arbitrary headers like `Set-Cookie`)
- [ ] Addon child processes spawned with minimal environment
- [ ] Storage keys validated (no path-like patterns)
- [ ] Panel addon bundles served with strict CSP (no `eval`, scoped nonces)
- [ ] Rate limiting applied to addon API endpoints (separate from core limits)
- [ ] Max addon count limit (default: 20) to prevent resource exhaustion
- [ ] Addon process stdout/stderr size limits to prevent log flooding

---

## 13. Error Handling & Fault Tolerance

### Addon Process Crashes

```
Addon process exits unexpectedly
  │
  ├─ Log error with exit code + stderr
  ├─ Mark addon as CRASHED in AddonManager
  ├─ Disable addon's routes (return 503 for API calls)
  ├─ Remove addon's widgets from panel manifest (next fetch)
  ├─ DO NOT auto-restart (avoid crash loops)
  └─ Admin can manually restart from Settings → Addons
```

### IPC Timeouts

- API calls: 30s timeout → return 504 to the HTTP caller
- Storage operations: 5s timeout → return error to addon
- Shutdown signal: 5s → SIGKILL

### Startup Failures

- If an addon fails to send `ready` within 10s → mark as FAILED, log error
- Never block core boot — addons are best-effort

### Panel/NUI Load Failures

- Dynamic `import()` wrapped in try/catch → log error, skip addon
- Components wrapped in `<ErrorBoundary>` → render fallback ("Addon error") 
- Missing CSS files are non-fatal

---

## 14. Example Addon

A complete minimal addon — "Player Notes" — that adds a notes tab to the player modal.

### Directory Structure

```
addons/player-notes/
├── addon.json
├── server/
│   └── index.js
└── panel/
    └── index.js
```

### `addon.json`

```json
{
  "id": "player-notes",
  "name": "Player Notes",
  "description": "Add private admin notes to player profiles",
  "version": "1.0.0",
  "author": "fxPanel Community",
  "fxpanel": { "minVersion": "0.2.0" },
  "permissions": {
    "required": ["storage", "players.read"]
  },
  "server": {
    "entry": "server/index.js"
  },
  "panel": {
    "entry": "panel/index.js",
    "widgets": [
      {
        "slot": "player-modal.tabs",
        "component": "PlayerNotesTab",
        "title": "Notes",
        "permission": "players.read"
      }
    ]
  }
}
```

### `server/index.js`

```javascript
import { createAddon } from '@fxpanel/addon-sdk';

const addon = createAddon();

addon.registerRoute('GET', '/notes/:license', async (req) => {
  const notes = await addon.storage.get(`notes:${req.params.license}`) ?? [];
  return { status: 200, body: { notes } };
});

addon.registerRoute('POST', '/notes/:license', async (req) => {
  const existing = await addon.storage.get(`notes:${req.params.license}`) ?? [];
  existing.push({
    text: req.body.text,
    author: req.admin.name,
    date: new Date().toISOString(),
  });
  await addon.storage.set(`notes:${req.params.license}`, existing);
  return { status: 200, body: { success: true } };
});

addon.registerRoute('DELETE', '/notes/:license/:index', async (req) => {
  const notes = await addon.storage.get(`notes:${req.params.license}`) ?? [];
  notes.splice(parseInt(req.params.index), 1);
  await addon.storage.set(`notes:${req.params.license}`, notes);
  return { status: 200, body: { success: true } };
});

addon.ready();
```

### `panel/index.js` (simplified, would normally be built from React/TSX)

```jsx
export function PlayerNotesTab({ addonId, api }) {
  const [notes, setNotes] = React.useState([]);
  const [text, setText] = React.useState('');

  // playerLicense would come from the player modal context
  React.useEffect(() => {
    api.fetch(`/notes/${playerLicense}`)
      .then(r => r.json())
      .then(d => setNotes(d.notes));
  }, []);

  const addNote = async () => {
    await api.fetch(`/notes/${playerLicense}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    setText('');
    // refresh...
  };

  return (
    <div>
      <h3>Admin Notes</h3>
      {notes.map((n, i) => (
        <div key={i}>
          <p>{n.text}</p>
          <small>{n.author} — {n.date}</small>
        </div>
      ))}
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <button onClick={addNote}>Add Note</button>
    </div>
  );
}
```

---

## 15. Resolved Design Decisions

Previously open questions, now resolved:

| # | Question | Decision |
|---|----------|----------|
| 1 | **Addon updates** | Manual file replacement. Users download new versions and overwrite the addon directory. No auto-updater in v1. |
| 2 | **Addon signing / trust** | No cryptographic signing. A **marketplace** will list all addons with a **verified developer** badge system — verified authors go through an approval process so users know their addons can be trusted. |
| 3 | **Lua sandboxing** | Best-effort `_ENV` sandboxing (see [Section 9](#9-lua-resource-integration)). Addon Lua scripts run with a restricted environment table that blocks dangerous globals. If specific FXServer APIs break under `_ENV` restrictions, those APIs are whitelisted. |
| 4 | **Shared UI components** | **Yes.** The `@fxpanel/addon-sdk` exposes a component library (Button, Card, Modal, Input, Badge, Table, etc.) matching the panel's shadcn/ui + Tailwind design system. Addons use these for consistent styling (see [Section 7 — Shared Dependencies](#shared-dependencies-externals)). |
| 5 | **WebSocket access** | **Yes.** Addons can push real-time data to their panel components via scoped Socket.io rooms. Each addon gets a dedicated room `addon:<addonId>` (see [Section 6 — Real-Time Push](#real-time-push-websocket)). |
| 6 | **Multi-server storage** | Deferred. Will be addressed if/when multi-server support is implemented. |
| 7 | **Addon dependencies** | **No.** Too complex for v1. Addons must be fully self-contained. |
| 8 | **Testing utilities** | **No.** Not needed for v1. Addon authors test against a running fxPanel instance. | 

---

## Appendix A: File Ownership

| Path | Owner | Writable By |
|------|-------|-------------|
| `addons/<id>/` | Addon author | Addon author (deploy-time only) |
| `addon-data/<id>.json` | Core (AddonManager) | Core only (via IPC) |
| `addon-config.json` | Core (AdminStore) | Core only (via Settings UI) |
| `monitor/nui/addons/<id>/` | Core (build) | Core only (copied at boot) |
| `monitor/resource/addons/<id>/` | Core (build) | Core only (copied at boot) |

## Appendix B: Configuration (`addon-config.json`)

```jsonc
{
  "enabled": true,                    // Global addon system toggle
  "maxAddons": 20,                    // Max concurrent addons
  "maxStorageMb": 10,                 // Per-addon storage limit
  "processTimeoutMs": 10000,          // Startup timeout per addon
  "approved": {
    "player-notes": {
      "granted": ["storage", "players.read"],
      "approvedAt": "2026-04-10T12:00:00Z",
      "approvedBy": "master"
    }
  },
  "disabled": ["some-addon-id"]       // Explicitly disabled addons
}
```
