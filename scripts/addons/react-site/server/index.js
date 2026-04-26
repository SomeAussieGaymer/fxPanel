import { createAddon } from "addon-sdk";
import { readFileSync, existsSync } from "fs";
import { join, extname, resolve } from "path";

const addon = createAddon();

// ── Resolve dist directory (pre-built React output) ──
const dist = resolve(import.meta.dirname, "..", "dist");
const indexHtml = readFileSync(join(dist, "index.html"), "utf-8");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

// ── Serve static assets from dist/assets/ ──
addon.registerPublicRoute("GET", "/assets/:file", async (req) => {
  const assetsDir = resolve(dist, "assets");
  const filePath = resolve(assetsDir, req.params.file);

  // Prevent directory traversal
  if (!filePath.startsWith(assetsDir)) {
    return { status: 403, body: { error: "Forbidden" } };
  }

  if (!existsSync(filePath)) {
    return { status: 404, body: { error: "Not found" } };
  }

  const ext = extname(filePath);
  return {
    status: 200,
    headers: {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: readFileSync(filePath, "utf-8"),
  };
});

// ── Serve favicon ──
addon.registerPublicRoute("GET", "/favicon.svg", async () => {
  const faviconPath = join(dist, "favicon.svg");
  if (!existsSync(faviconPath)) {
    return { status: 404, body: { error: "Not found" } };
  }
  return {
    status: 200,
    headers: { "Content-Type": "image/svg+xml" },
    body: readFileSync(faviconPath, "utf-8"),
  };
});

// ── SPA catch-all — serve index.html for all other routes ──
// "/" handles the root, "/:page" handles any single-segment path
addon.registerPublicRoute("GET", "/", async () => ({
  status: 200,
  headers: { "Content-Type": "text/html; charset=utf-8" },
  body: indexHtml,
}));
addon.registerPublicRoute("GET", "/:page", async () => ({
  status: 200,
  headers: { "Content-Type": "text/html; charset=utf-8" },
  body: indexHtml,
}));

addon.ready();
