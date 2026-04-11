/**
 * fxPanel Addon SDK — TypeScript definitions
 */

export interface AddonRequest {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: unknown;
    params: Record<string, string>;
    admin: {
        name: string;
        permissions: string[];
        hasPermission: (perm: string) => boolean;
    };
}

export interface AddonResponse {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
}

export type RouteHandler = (req: AddonRequest) => Promise<AddonResponse> | AddonResponse;

export interface AddonStorage {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
}

export interface AddonPlayers {
    /**
     * Adds a custom tag to an online player. Requires `players.write` permission.
     * The tag must be defined in txAdmin Settings → Player Tags.
     */
    addTag(netid: number, tagId: string): Promise<true>;
    /**
     * Removes a custom tag from an online player. Requires `players.write` permission.
     */
    removeTag(netid: number, tagId: string): Promise<true>;
}

export interface AddonWebSocket {
    push(event: string, data: unknown): void;
    onSubscribe(handler: (sessionId: string) => void): void;
    onUnsubscribe(handler: (sessionId: string) => void): void;
}

export interface AddonLog {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export interface Addon {
    readonly id: string;
    storage: AddonStorage;
    players: AddonPlayers;
    registerRoute(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, handler: RouteHandler): void;
    ws: AddonWebSocket;
    on(event: string, handler: (data: unknown) => void | Promise<void>): void;
    log: AddonLog;
    ready(): void;
}

/**
 * Creates and returns the addon instance that communicates with fxPanel core.
 *
 * @example
 * const addon = createAddon();
 *
 * addon.on('playerJoining', async ({ netid }) => {
 *     await addon.players.addTag(netid, 'vip');
 * });
 *
 * addon.ready();
 */
export function createAddon(): Addon;
