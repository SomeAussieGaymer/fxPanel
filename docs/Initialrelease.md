# Initial Release Notes

## Addon System — Foundation Implementation

**Date:** April 10, 2026

Implemented the foundational addon system architecture as specified in `docs/addon-system-architecture.md`. This establishes the core infrastructure for extensibility, planned for activation post-v0.1.x.

### What was built

- **Addon manifest schema** (`shared/addonTypes.ts`) — Zod-validated `addon.json` schema with support for identity, compatibility, permissions, and entry points across all layers (server, panel, NUI, resource).

- **AddonManager module** (`core/modules/AddonManager/`) — Full lifecycle management:
  - Discovery: scans `addons/` directory, validates manifests, checks version compatibility
  - Permission system: approval/revoke flow with `addon-config.json` persistence
  - Process spawning: `child_process.fork()` with restricted env for crash/memory isolation
  - Storage: scoped key-value JSON store per addon with debounced writes
  - IPC protocol: request/response with correlation IDs, timeouts, and error handling
  - WebSocket push: addon processes can push real-time data to scoped Socket.io rooms

- **Addon SDK** (`addon-sdk/`) — `@fxpanel/addon-sdk` package with:
  - `createAddon()` — bootstraps IPC, route registration, storage, events, logging
  - `@fxpanel/addon-sdk/ui` — shared UI component re-exports (Button, Card, Badge, etc.)
  - Full TypeScript definitions

- **API routes** (`core/routes/addons.ts`) — Registered in the Koa router:
  - `GET /addons/list` — admin addon management
  - `GET /addons/panel-manifest` — dynamic panel loading
  - `GET /addons/nui-manifest` — NUI loading
  - `POST /addons/:id/approve` / `revoke` — permission management
  - `ALL /addons/:id/api/*` — authenticated proxy to addon child processes
  - `GET /addons/:id/panel/*` / `static/*` — static file serving

- **Core integration** — AddonManager registered in `txAdmin.ts` boot sequence and `TxCoreType`

- **Example addon** (`addons/player-notes/`) — Complete working example with server routes, panel component, addon.json manifest

### Security measures
- Process isolation via `child_process.fork()` with minimal env
- Path traversal prevention on all file operations
- IPC response sanitization (strips Set-Cookie headers)
- Addon ID validation (strict regex)
- Storage scoping per addon with size limits
- API proxy through core auth middleware

### Gap fixes (v2)
- **SDK module resolution** — SDK uses NODE_PATH env in forked child processes pointing to txaPath so addons can `import { createAddon } from 'addon-sdk'`
- **WebSocket addon rooms** — Added `joinAddonRoom`/`leaveAddonRoom` socket events for dynamic `addon:<id>` rooms (follows spectate room pattern)
- **Panel addon loader** (`panel/src/hooks/addons.ts`) — Fetches `/addons/panel-manifest`, dynamically imports addon entry scripts, resolves page routes and widget components
- **Addon pages in router** (`panel/src/layout/MainRouter.tsx`) — Addon pages injected into MainRouterInner via `useAddonLoader()` hook with permission checking
- **Addons management page** (`panel/src/pages/AddonsPage.tsx`) — Full admin UI with addon list, state badges, permission review dialog, approve/revoke actions
- **Global menu link** — Addons link added to sidebar global menu sheet
- **Example addon package.json** — Added `"type": "module"` for ESM imports
- **Event broadcasting** — FxPlayerlist now broadcasts `playerJoining`/`playerDropped` events to all running addon processes via `addonManager.broadcastEvent()`

### Documentation
- **Addon development guide** (`docs/addon-development-guide.md`) — Full developer-facing documentation covering getting started, manifest schema, server-side SDK, panel UI development, permissions, storage, WebSocket push, events, admin management, file structure, security notes, and troubleshooting
