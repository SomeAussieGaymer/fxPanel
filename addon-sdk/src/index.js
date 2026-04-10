/**
 * fxPanel Addon SDK
 *
 * Runtime SDK for fxPanel addon server processes.
 * Each addon runs in a child process spawned by fxPanel core.
 * Communication happens entirely via Node.js IPC (process.send/process.on).
 */

/**
 * Creates and returns an addon instance that communicates with fxPanel core.
 */
export function createAddon() {
    const addonId = process.env.ADDON_ID;
    if (!addonId) {
        throw new Error('@fxpanel/addon-sdk: ADDON_ID environment variable not set. Is this running inside fxPanel?');
    }

    let permissions = [];
    let isReady = false;
    const routes = [];
    const eventHandlers = new Map();
    const pendingStorage = new Map();
    let correlationCounter = 0;

    /**
     * Generate a unique correlation ID.
     */
    function nextId() {
        return `sdk-${++correlationCounter}-${Date.now()}`;
    }

    /**
     * Send an IPC message to the core.
     */
    function send(message) {
        if (process.send) {
            process.send(message);
        }
    }

    // ============================================
    // Storage API
    // ============================================
    const storage = {
        get(key) {
            return storageRequest('get', key);
        },
        set(key, value) {
            return storageRequest('set', key, value);
        },
        delete(key) {
            return storageRequest('delete', key);
        },
        list(prefix) {
            return storageRequest('list', prefix);
        },
    };

    function storageRequest(op, key, value) {
        return new Promise((resolve, reject) => {
            const id = nextId();
            const timer = setTimeout(() => {
                pendingStorage.delete(id);
                reject(new Error(`Storage ${op} timed out after 5000ms`));
            }, 5000);

            pendingStorage.set(id, { resolve, reject, timer });

            send({
                type: 'storage-request',
                id,
                payload: { op, key, value },
            });
        });
    }

    // ============================================
    // Route Registration
    // ============================================
    const routeHandlers = new Map();

    function registerRoute(method, path, handler) {
        const key = `${method.toUpperCase()}:${path}`;
        routeHandlers.set(key, { method: method.toUpperCase(), path, handler });
        routes.push({ method: method.toUpperCase(), path });
    }

    // ============================================
    // WebSocket API
    // ============================================
    const wsHandlers = {
        onSubscribeFn: null,
        onUnsubscribeFn: null,
    };

    const ws = {
        push(event, data) {
            send({ type: 'ws-push', payload: { event, data } });
        },
        onSubscribe(handler) {
            wsHandlers.onSubscribeFn = handler;
        },
        onUnsubscribe(handler) {
            wsHandlers.onUnsubscribeFn = handler;
        },
    };

    // ============================================
    // Event System
    // ============================================
    function on(event, handler) {
        if (!eventHandlers.has(event)) {
            eventHandlers.set(event, []);
        }
        eventHandlers.get(event).push(handler);
    }

    // ============================================
    // Logging
    // ============================================
    const log = {
        info(message) {
            send({ type: 'log', payload: { level: 'info', message: String(message) } });
        },
        warn(message) {
            send({ type: 'log', payload: { level: 'warn', message: String(message) } });
        },
        error(message) {
            send({ type: 'log', payload: { level: 'error', message: String(message) } });
        },
    };

    // ============================================
    // Signal Ready
    // ============================================
    function ready() {
        if (isReady) return;
        isReady = true;
        send({
            type: 'ready',
            payload: { routes },
        });
    }

    // ============================================
    // IPC Message Handler
    // ============================================
    process.on('message', async (msg) => {
        if (!msg || typeof msg !== 'object' || !msg.type) return;

        switch (msg.type) {
            case 'init': {
                permissions = msg.payload.permissions || [];
                break;
            }

            case 'shutdown': {
                // Give addon a chance to clean up
                process.exit(0);
                break;
            }

            case 'http-request': {
                const { method, path: reqPath, headers, body, admin } = msg.payload;

                // Find matching route handler
                let matchedHandler = null;
                let params = {};

                for (const [key, route] of routeHandlers) {
                    if (route.method !== method.toUpperCase()) continue;

                    // Simple path matching with params
                    const match = matchPath(route.path, reqPath);
                    if (match) {
                        matchedHandler = route.handler;
                        params = match.params;
                        break;
                    }
                }

                if (!matchedHandler) {
                    send({
                        type: 'http-response',
                        id: msg.id,
                        payload: { status: 404, body: { error: 'Route not found' } },
                    });
                    return;
                }

                try {
                    const req = {
                        method,
                        path: reqPath,
                        headers,
                        body: body || {},
                        params,
                        admin: {
                            name: admin.name,
                            permissions: admin.permissions,
                            hasPermission: (perm) => admin.permissions.includes(perm),
                        },
                    };

                    const result = await matchedHandler(req);

                    send({
                        type: 'http-response',
                        id: msg.id,
                        payload: {
                            status: result.status || 200,
                            headers: result.headers || {},
                            body: result.body ?? null,
                        },
                    });
                } catch (error) {
                    send({
                        type: 'http-response',
                        id: msg.id,
                        payload: {
                            status: 500,
                            body: { error: 'Internal addon error' },
                        },
                    });
                    send({
                        type: 'error',
                        payload: {
                            message: error.message || 'Unknown error',
                            stack: error.stack,
                        },
                    });
                }
                break;
            }

            case 'event': {
                const { event, data } = msg.payload;
                const handlers = eventHandlers.get(event);
                if (handlers) {
                    for (const handler of handlers) {
                        try {
                            await handler(data);
                        } catch (error) {
                            log.error(`Event handler error for "${event}": ${error.message}`);
                        }
                    }
                }
                break;
            }

            case 'storage-response': {
                const pending = pendingStorage.get(msg.id);
                if (pending) {
                    pendingStorage.delete(msg.id);
                    clearTimeout(pending.timer);
                    if (msg.payload.error) {
                        pending.reject(new Error(msg.payload.error));
                    } else {
                        pending.resolve(msg.payload.data);
                    }
                }
                break;
            }

            case 'ws-subscribe': {
                if (wsHandlers.onSubscribeFn) {
                    wsHandlers.onSubscribeFn(msg.payload.sessionId);
                }
                break;
            }

            case 'ws-unsubscribe': {
                if (wsHandlers.onUnsubscribeFn) {
                    wsHandlers.onUnsubscribeFn(msg.payload.sessionId);
                }
                break;
            }
        }
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        send({
            type: 'error',
            payload: {
                message: `Uncaught exception: ${error.message}`,
                stack: error.stack,
            },
        });
    });

    process.on('unhandledRejection', (reason) => {
        send({
            type: 'error',
            payload: {
                message: `Unhandled rejection: ${reason}`,
                stack: reason instanceof Error ? reason.stack : undefined,
            },
        });
    });

    return {
        id: addonId,
        storage,
        registerRoute,
        ws,
        on,
        log,
        ready,
    };
}

/**
 * Simple path matching with express-like params.
 * Matches "/notes/:playerId" against "/notes/abc123".
 */
function matchPath(pattern, actual) {
    const patternParts = pattern.split('/').filter(Boolean);
    const actualParts = actual.split('/').filter(Boolean);

    if (patternParts.length !== actualParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            params[patternParts[i].slice(1)] = decodeURIComponent(actualParts[i]);
        } else if (patternParts[i] !== actualParts[i]) {
            return null;
        }
    }

    return { params };
}
