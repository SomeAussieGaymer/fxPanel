const modulename = 'AddonManager';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import semver from 'semver';

import consoleFactory from '@lib/console';
import { txEnv } from '@core/globalData';
import AddonStorage from './addonStorage';
import AddonProcess from './addonProcess';
import {
    AddonManifestSchema,
    AddonConfigSchema,
    AddonState,
    AddonPanelDescriptor,
    AddonNuiDescriptor,
    AddonListItem,
    type AddonManifest,
    type AddonConfig,
} from '@shared/addonTypes';
const console = consoleFactory(modulename);

/**
 * Internal tracked addon info.
 */
interface AddonDescriptor {
    manifest: AddonManifest;
    dir: string;
    state: AddonState;
    process: AddonProcess | null;
    grantedPermissions: string[];
}

const CONFIG_FILE = 'addon-config.json';
const ADDONS_DIR = 'addons';
const ADDON_DATA_DIR = 'addon-data';

/**
 * AddonManager — Discovers, validates, and manages addons.
 * 
 * Conforms to the GenericTxModule interface. Registered as a module in txAdmin boot.
 */
export default class AddonManager {
    public readonly timers: NodeJS.Timer[] = [];
    private config: AddonConfig;
    private readonly addons = new Map<string, AddonDescriptor>();
    private readonly storage: AddonStorage;
    private readonly addonsDir: string;
    private readonly configPath: string;

    constructor() {
        // Resolve paths
        this.addonsDir = path.join(txEnv.txaPath, ADDONS_DIR);
        this.configPath = txEnv.profileSubPath(CONFIG_FILE);
        const dataDir = txEnv.profileSubPath(ADDON_DATA_DIR);

        // Load config
        this.config = this.loadConfig();

        // Init storage
        this.storage = new AddonStorage(dataDir, this.config.maxStorageMb);

        // Early exit if system is disabled
        if (!this.config.enabled) {
            console.log('Addon system is disabled');
            return;
        }

        // Ensure addons directory exists
        if (!fs.existsSync(this.addonsDir)) {
            fs.mkdirSync(this.addonsDir, { recursive: true });
            console.log(`Created addons directory at ${this.addonsDir}`);
        }

        // Boot sequence (async, non-blocking)
        this.boot().catch((err) => {
            console.error(`Addon boot failed: ${(err as Error).message}`);
        });
    }

    /**
     * Load addon-config.json or create defaults.
     */
    private loadConfig(): AddonConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                return AddonConfigSchema.parse(raw);
            }
        } catch (error) {
            console.warn(`Failed to load addon config, using defaults: ${(error as Error).message}`);
        }

        const defaults = AddonConfigSchema.parse({});
        this.saveConfig(defaults);
        return defaults;
    }

    /**
     * Persist addon-config.json to disk.
     */
    private saveConfig(config: AddonConfig): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
        } catch (error) {
            console.error(`Failed to save addon config: ${(error as Error).message}`);
        }
    }

    /**
     * Full boot sequence.
     */
    private async boot(): Promise<void> {
        // 1. Discover and validate
        this.discover();

        // 2. Check permissions (approval)
        this.checkPermissions();

        // 3. Start addon processes
        await this.startProcesses();

        // 4. Register panel/NUI extensions (done passively via getters)
        const running = [...this.addons.values()].filter(a => a.state === 'running').length;
        const total = this.addons.size;
        console.log(`Addon system ready: ${running}/${total} addons running`);
    }

    /**
     * Step 1: Scan addons/ directory, read & validate each addon.json
     */
    private discover(): void {
        if (!fs.existsSync(this.addonsDir)) return;

        let entries: string[];
        try {
            entries = fs.readdirSync(this.addonsDir);
        } catch (error) {
            console.error(`Failed to scan addons directory: ${(error as Error).message}`);
            return;
        }

        for (const entry of entries) {
            const addonDir = path.join(this.addonsDir, entry);

            // Must be a directory
            if (!fs.statSync(addonDir).isDirectory()) continue;

            // Must have addon.json
            const manifestPath = path.join(addonDir, 'addon.json');
            if (!fs.existsSync(manifestPath)) {
                console.verbose.warn(`Skipping ${entry}: no addon.json`);
                continue;
            }

            // Enforce max addons limit
            if (this.addons.size >= this.config.maxAddons) {
                console.warn(`Max addon limit reached (${this.config.maxAddons}), skipping ${entry}`);
                break;
            }

            // Parse and validate manifest
            try {
                const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                const manifest = AddonManifestSchema.parse(raw);

                // Verify ID matches directory name
                if (manifest.id !== entry) {
                    console.warn(`Addon ${entry}: manifest id "${manifest.id}" does not match directory name, skipping`);
                    continue;
                }

                // Check version compatibility
                if (!this.checkVersionCompat(manifest)) {
                    continue;
                }

                // Check if explicitly disabled
                if (this.config.disabled.includes(manifest.id)) {
                    console.log(`Addon ${manifest.id} is explicitly disabled`);
                    this.addons.set(manifest.id, {
                        manifest,
                        dir: addonDir,
                        state: 'stopped',
                        process: null,
                        grantedPermissions: [],
                    });
                    continue;
                }

                // Validated paths within addon dir — prevent path traversal
                if (manifest.server?.entry) {
                    const resolved = path.resolve(addonDir, manifest.server.entry);
                    if (!resolved.startsWith(path.resolve(addonDir))) {
                        console.warn(`Addon ${manifest.id}: server entry path escapes addon directory, skipping`);
                        continue;
                    }
                }

                this.addons.set(manifest.id, {
                    manifest,
                    dir: addonDir,
                    state: 'discovered',
                    process: null,
                    grantedPermissions: [],
                });

                console.log(`Discovered addon: ${manifest.name} v${manifest.version} by ${manifest.author}`);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    const issues = error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
                    console.warn(`Addon ${entry}: invalid manifest:\n${issues}`);
                } else {
                    console.warn(`Addon ${entry}: failed to parse addon.json: ${(error as Error).message}`);
                }
            }
        }

        console.log(`Discovered ${this.addons.size} addon(s)`);
    }

    /**
     * Check if the addon is compatible with the current fxPanel version.
     */
    private checkVersionCompat(manifest: AddonManifest): boolean {
        const currentVersion = txEnv.txaVersion;

        // Check minVersion
        if (manifest.fxpanel.minVersion) {
            try {
                if (semver.valid(currentVersion) && semver.valid(manifest.fxpanel.minVersion)) {
                    if (semver.lt(currentVersion, manifest.fxpanel.minVersion)) {
                        console.warn(
                            `Addon ${manifest.id}: requires fxPanel >= ${manifest.fxpanel.minVersion}, ` +
                            `current is ${currentVersion}, skipping`
                        );
                        return false;
                    }
                }
            } catch {
                // If semver parsing fails, skip compatibility check
                console.verbose.warn(`Addon ${manifest.id}: could not parse version for compatibility check`);
            }
        }

        // Check maxVersion
        if (manifest.fxpanel.maxVersion) {
            try {
                if (semver.valid(currentVersion) && semver.validRange(manifest.fxpanel.maxVersion)) {
                    if (!semver.satisfies(currentVersion, `<=${manifest.fxpanel.maxVersion}`)) {
                        console.warn(
                            `Addon ${manifest.id}: max version ${manifest.fxpanel.maxVersion}, ` +
                            `current is ${currentVersion}, skipping`
                        );
                        return false;
                    }
                }
            } catch {
                console.verbose.warn(`Addon ${manifest.id}: could not parse maxVersion`);
            }
        }

        return true;
    }

    /**
     * Step 2: Check permissions against approved list.
     */
    private checkPermissions(): void {
        for (const [id, addon] of this.addons) {
            if (addon.state !== 'discovered') continue;

            const approval = this.config.approved[id];
            if (!approval) {
                console.warn(`Addon ${id}: not approved, skipping (approve via Settings → Addons tab)`);
                addon.state = 'discovered'; // stays as discovered, pending approval
                continue;
            }

            // Check that all required permissions are granted
            const missingRequired = addon.manifest.permissions.required.filter(
                p => !approval.granted.includes(p)
            );
            if (missingRequired.length > 0) {
                console.warn(
                    `Addon ${id}: missing required permissions: ${missingRequired.join(', ')}. ` +
                    `Re-approve addon to grant them.`
                );
                addon.state = 'discovered';
                continue;
            }

            // Set granted permissions (required + approved optional)
            addon.grantedPermissions = approval.granted;
            addon.state = 'approved';
            console.log(`Addon ${id}: approved with permissions [${approval.granted.join(', ')}]`);
        }
    }

    /**
     * Step 3: Start all approved addons that have server entries.
     */
    private async startProcesses(): Promise<void> {
        const approvedAddons = [...this.addons.values()].filter(a => a.state === 'approved');

        for (const addon of approvedAddons) {
            if (!addon.manifest.server) {
                // No server process needed — just mark as running
                addon.state = 'running';
                continue;
            }

            addon.process = new AddonProcess({
                addonId: addon.manifest.id,
                entryPath: addon.manifest.server.entry,
                addonDir: addon.dir,
                permissions: addon.grantedPermissions,
                storage: this.storage.getScope(addon.manifest.id),
                onWsPush: this.handleWsPush.bind(this),
            });

            const result = await addon.process.start(this.config.processTimeoutMs);
            if (result.success) {
                addon.state = 'running';
                console.log(`Addon ${addon.manifest.id}: process started successfully`);
            } else {
                addon.state = 'failed';
                addon.process = null;
                console.error(`Addon ${addon.manifest.id}: failed to start — ${result.error}`);
            }
        }
    }

    /**
     * Handle WebSocket push from an addon process (routed through Socket.io).
     */
    private handleWsPush(addonId: string, event: string, data: unknown): void {
        try {
            const roomName = `addon:${addonId}`;
            txCore.webServer.webSocket.pushToRoom(roomName, `addon:${addonId}:${event}`, data);
        } catch (error) {
            console.error(`Failed to push WS event for addon ${addonId}: ${(error as Error).message}`);
        }
    }

    //============================================
    // Public API
    //============================================

    /**
     * Get addon descriptor by ID.
     */
    getAddon(addonId: string): AddonDescriptor | undefined {
        return this.addons.get(addonId);
    }

    /**
     * Get all addon descriptors.
     */
    getAllAddons(): AddonDescriptor[] {
        return [...this.addons.values()];
    }

    /**
     * Get the list of addons for the settings UI.
     */
    getAddonList(): AddonListItem[] {
        return [...this.addons.values()].map(addon => ({
            id: addon.manifest.id,
            name: addon.manifest.name,
            description: addon.manifest.description,
            version: addon.manifest.version,
            author: addon.manifest.author,
            state: addon.state,
            permissions: {
                required: addon.manifest.permissions.required,
                optional: addon.manifest.permissions.optional,
                granted: addon.grantedPermissions,
            },
        }));
    }

    /**
     * Get panel manifest for the frontend loader.
     */
    getPanelManifest(): AddonPanelDescriptor[] {
        const result: AddonPanelDescriptor[] = [];
        for (const addon of this.addons.values()) {
            if (addon.state !== 'running' || !addon.manifest.panel) continue;

            result.push({
                id: addon.manifest.id,
                name: addon.manifest.name,
                version: addon.manifest.version,
                entryUrl: `/addons/${addon.manifest.id}/panel/${path.basename(addon.manifest.panel.entry)}`,
                stylesUrl: addon.manifest.panel.styles
                    ? `/addons/${addon.manifest.id}/panel/${path.basename(addon.manifest.panel.styles)}`
                    : null,
                pages: addon.manifest.panel.pages,
                widgets: addon.manifest.panel.widgets,
            });
        }
        return result;
    }

    /**
     * Get NUI manifest.
     */
    getNuiManifest(): AddonNuiDescriptor[] {
        const result: AddonNuiDescriptor[] = [];
        for (const addon of this.addons.values()) {
            if (addon.state !== 'running' || !addon.manifest.nui) continue;

            result.push({
                id: addon.manifest.id,
                name: addon.manifest.name,
                version: addon.manifest.version,
                entryUrl: `/nui/addons/${addon.manifest.id}/${path.basename(addon.manifest.nui.entry)}`,
                stylesUrl: addon.manifest.nui.styles
                    ? `/nui/addons/${addon.manifest.id}/${path.basename(addon.manifest.nui.styles)}`
                    : null,
                pages: addon.manifest.nui.pages,
            });
        }
        return result;
    }

    /**
     * Get the addon process for HTTP request proxying.
     */
    getProcess(addonId: string): AddonProcess | null {
        return this.addons.get(addonId)?.process ?? null;
    }

    /**
     * Check if an addon is running.
     */
    isRunning(addonId: string): boolean {
        return this.addons.get(addonId)?.state === 'running';
    }

    /**
     * Approve an addon with specific permissions.
     */
    approveAddon(addonId: string, grantedPermissions: string[], approvedBy: string): { success: boolean; error?: string } {
        const addon = this.addons.get(addonId);
        if (!addon) return { success: false, error: 'Addon not found' };

        // Verify all required permissions are granted
        const missingRequired = addon.manifest.permissions.required.filter(
            p => !grantedPermissions.includes(p)
        );
        if (missingRequired.length > 0) {
            return {
                success: false,
                error: `Missing required permissions: ${missingRequired.join(', ')}`,
            };
        }

        // Update config
        this.config.approved[addonId] = {
            granted: grantedPermissions,
            approvedAt: new Date().toISOString(),
            approvedBy,
        };

        // Remove from disabled list if present
        this.config.disabled = this.config.disabled.filter(id => id !== addonId);

        this.saveConfig(this.config);
        return { success: true };
    }

    /**
     * Revoke addon approval.
     */
    revokeAddon(addonId: string): { success: boolean; error?: string } {
        const addon = this.addons.get(addonId);
        if (!addon) return { success: false, error: 'Addon not found' };

        delete this.config.approved[addonId];
        this.saveConfig(this.config);
        return { success: true };
    }

    /**
     * Disable/enable an addon.
     */
    setAddonDisabled(addonId: string, disabled: boolean): { success: boolean; error?: string } {
        const addon = this.addons.get(addonId);
        if (!addon) return { success: false, error: 'Addon not found' };

        if (disabled && !this.config.disabled.includes(addonId)) {
            this.config.disabled.push(addonId);
        } else if (!disabled) {
            this.config.disabled = this.config.disabled.filter(id => id !== addonId);
        }

        this.saveConfig(this.config);
        return { success: true };
    }

    /**
     * Resolve a panel static file path for serving.
     * Returns the absolute path if valid, or null if invalid.
     */
    resolveAddonStaticPath(addonId: string, layer: 'panel' | 'nui' | 'static', filePath: string): string | null {
        const addon = this.addons.get(addonId);
        if (!addon) return null;

        // Resolve and validate path is within addon's layer directory
        const layerDir = path.join(addon.dir, layer);
        const resolved = path.resolve(layerDir, filePath);

        if (!resolved.startsWith(path.resolve(layerDir))) {
            return null; // Path traversal attempt
        }

        if (!fs.existsSync(resolved)) {
            return null;
        }

        return resolved;
    }

    /**
     * Broadcast an event to all running addon processes.
     */
    broadcastEvent(event: string, data: unknown): void {
        for (const addon of this.addons.values()) {
            if (addon.state === 'running' && addon.process) {
                addon.process.sendEvent(event, data);
            }
        }
    }

    /**
     * Get addon system config.
     */
    getConfig(): AddonConfig {
        return { ...this.config };
    }

    /**
     * Update global addon config settings.
     */
    updateConfig(updates: Partial<Pick<AddonConfig, 'enabled' | 'maxAddons' | 'maxStorageMb' | 'processTimeoutMs'>>): void {
        Object.assign(this.config, updates);
        this.saveConfig(this.config);
    }

    //============================================
    // Shutdown
    //============================================

    /**
     * Graceful shutdown — stop all addon processes and flush storage.
     */
    async handleShutdown(): Promise<void> {
        console.log('Shutting down addon system...');

        // Stop all addon processes
        const stopPromises: Promise<void>[] = [];
        for (const addon of this.addons.values()) {
            if (addon.process && addon.state === 'running') {
                stopPromises.push(addon.process.stop());
            }
        }

        await Promise.allSettled(stopPromises);

        // Flush storage
        this.storage.shutdown();

        console.log('Addon system shutdown complete');
    }
}
