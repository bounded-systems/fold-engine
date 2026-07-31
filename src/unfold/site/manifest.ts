import { DOMParser, type HTMLDocument } from "deno-dom-wasm";
import { normalizeSiteUrl } from "./site_url.ts";
import type { VaultNode } from "../inputs/jsonld/types.ts";
import { loadVault } from "../inputs/jsonld/loader.ts";

type ManifestPage = {
  path: string;
  title: string;
  h1: string;
  links: string[];
  hasJsonLd: boolean;
  jsonLdErrors: string[];
  canonical: string;
  cid: string;
  hasCharset: boolean;
  hasViewport: boolean;
  forbiddenMarkersFound: string[];
};

export type SiteManifest = {
  site: {
    url: string;
    buildMode: string;
  };
  pages: ManifestPage[];
};

type ManifestOptions = {
  siteDir?: string;
  siteUrl?: string;
  buildMode?: string;
  vaultPath?: string;
  source?: "siteDir" | "vaultGraph";
};

const defaultSiteUrl = () =>
  normalizeSiteUrl(Deno.env.get("SITE_URL") ?? "https://fold.example");

const requireBuildMode = (value?: string): string => {
  const raw = value?.trim() ?? Deno.env.get("LUME_ENV") ??
    Deno.env.get("BUILD_MODE");
  if (!raw) {
    throw new Error("BUILD_MODE or LUME_ENV is required.");
  }
  return raw;
};

const normalizePathname = (pathname: string): string => {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  if (pathname === "/") {
    return pathname;
  }

  if (pathname.endsWith("/index.html")) {
    const trimmed = pathname.slice(0, -"/index.html".length);
    return trimmed === "" ? "/" : `${trimmed}/`;
  }

  if (pathname.endsWith(".html")) {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
};

const pathFromHtmlFile = (siteDir: string, filePath: string): string => {
  const normalizedDir = siteDir.replace(/\/$/, "");
  const relative = filePath.slice(normalizedDir.length).replaceAll("\\", "/");
  const pathname = relative.startsWith("/") ? relative : `/${relative}`;
  return normalizePathname(pathname);
};

const collectHtmlFiles = async (dir: string): Promise<string[]> => {
  const htmlFiles: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const entryPath = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      htmlFiles.push(...await collectHtmlFiles(entryPath));
      continue;
    }
    if (entry.isFile && entry.name.endsWith(".html")) {
      htmlFiles.push(entryPath);
    }
  }
  return htmlFiles;
};

const getCanonicalUrl = (doc: HTMLDocument, siteUrl: string): string => {
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute(
    "href",
  ) ?? "";

  if (!canonical) {
    return "";
  }

  try {
    return new URL(canonical, siteUrl).toString();
  } catch {
    return canonical;
  }
};

const extractLinks = (
  doc: HTMLDocument,
  pageUrl: string,
  siteUrl: string,
): string[] => {
  const links = new Set<string>();
  const anchors = Array.from(doc.querySelectorAll("a[href]"));

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) {
      continue;
    }

    if (
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      continue;
    }

    try {
      const url = new URL(href, pageUrl);
      if (url.origin !== new URL(siteUrl).origin) {
        continue;
      }
      links.add(normalizePathname(url.pathname));
    } catch {
      continue;
    }
  }

  return Array.from(links).sort();
};

const extractJsonLd = (doc: HTMLDocument): {
  hasJsonLd: boolean;
  jsonLdErrors: string[];
} => {
  const scripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );
  if (scripts.length === 0) {
    return { hasJsonLd: false, jsonLdErrors: [] };
  }

  const errors: string[] = [];
  for (const script of scripts) {
    const text = script.textContent?.trim() ?? "";
    if (!text) {
      continue;
    }
    try {
      JSON.parse(text);
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Invalid JSON-LD payload",
      );
    }
  }

  return { hasJsonLd: true, jsonLdErrors: errors };
};

const hashSha256Hex = async (value: string): Promise<string> => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const buildCid = async (value: string): Promise<string> =>
  `sha256:${await hashSha256Hex(value)}`;

const detectForbiddenMarkers = (html: string): string[] => {
  const markers: Array<{ id: string; pattern: RegExp }> = [
    { id: "lume-live-reload", pattern: /lume-live-reload/i },
    { id: "lume-bar", pattern: /<lume-bar/i },
    { id: "data-lume-live-reload", pattern: /data-lume-live-reload/i },
    { id: "ws://", pattern: /ws:\/\//i },
    { id: "wss://", pattern: /wss:\/\//i },
    { id: "data-cursor-", pattern: /data-cursor-/i },
  ];

  return markers
    .filter((marker) => marker.pattern.test(html))
    .map((marker) => marker.id);
};

const requireSiteDir = (value?: string): string => {
  const raw = value?.trim() ?? Deno.env.get("SITE_OUTPUT_DIR")?.trim();
  if (!raw) {
    throw new Error("SITE_OUTPUT_DIR is required.");
  }
  return raw;
};

const requireVaultPath = (value?: string): string => {
  const raw = value?.trim() ?? Deno.env.get("VAULT_PATH")?.trim();
  if (!raw) {
    throw new Error("VAULT_PATH is required for vault JSON-LD loading.");
  }
  return raw;
};

/// Unlike its siblings above, this does not throw: `defaultSiteUrl` already
/// supplies a normalized SITE_URL-or-placeholder, so an absent site URL has a
/// sensible answer. The fallback argument carries the WebSite node's url when
/// building from the vault graph.
const requireSiteUrl = (value?: string, fallback?: string): string => {
  const raw = value?.trim() || fallback?.trim();
  return raw ? normalizeSiteUrl(raw) : defaultSiteUrl();
};

const hasJsonLdType = (node: VaultNode, type: string): boolean => {
  const value = node["@type"];
  if (!value) return false;
  const types = Array.isArray(value) ? value : [value];
  return types.some((entry) => entry === type || entry === `schema:${type}`);
};

const readNodeString = (
  node: VaultNode,
  key: string,
): string | undefined => {
  const value = node[key];
  return typeof value === "string" ? value.trim() : undefined;
};

const getNodeUrl = (node: VaultNode): string | undefined =>
  readNodeString(node, "url") ?? readNodeString(node, "@id");

const getNodeTitle = (node: VaultNode, fallback: string): string =>
  readNodeString(node, "name") ?? readNodeString(node, "headline") ??
    readNodeString(node, "title") ?? fallback;

const extractNodeLinks = (node: VaultNode, siteUrl: string): string[] => {
  const raw = node["hasPart"];
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const origin = new URL(siteUrl).origin;
  const links = new Set<string>();

  for (const part of parts) {
    if (typeof part === "string") {
      try {
        const url = new URL(part, siteUrl);
        if (url.origin === origin) {
          links.add(normalizePathname(url.pathname));
        }
      } catch {
        continue;
      }
      continue;
    }

    if (part && typeof part === "object") {
      const record = part as Record<string, unknown>;
      const id = typeof record["@id"] === "string" ? record["@id"] : undefined;
      const url = typeof record["url"] === "string" ? record["url"] : undefined;
      const target = id ?? url;
      if (!target) continue;
      try {
        const parsed = new URL(target, siteUrl);
        if (parsed.origin === origin) {
          links.add(normalizePathname(parsed.pathname));
        }
      } catch {
        continue;
      }
    }
  }

  return Array.from(links).sort();
};

const buildPageFromNode = async (
  node: VaultNode,
  siteUrl: string,
  linkOverrides?: string[],
): Promise<ManifestPage> => {
  const nodeUrl = getNodeUrl(node);
  if (!nodeUrl) {
    throw new Error("JSON-LD node is missing url or @id.");
  }
  const path = normalizePathname(new URL(nodeUrl, siteUrl).pathname);
  const title = getNodeTitle(node, path);
  const links = linkOverrides ?? extractNodeLinks(node, siteUrl);
  const cid = await buildCid(JSON.stringify(node));

  return {
    path,
    title,
    h1: title,
    links,
    hasJsonLd: true,
    jsonLdErrors: [],
    canonical: `${siteUrl}${path}`,
    cid,
    hasCharset: true,
    hasViewport: true,
    forbiddenMarkersFound: [],
  };
};

const buildPagesFromVaultGraph = async (
  nodes: VaultNode[],
  siteUrl: string,
): Promise<ManifestPage[]> => {
  const pageByPath = new Map<string, ManifestPage>();
  const siteNode = nodes.find((node) => hasJsonLdType(node, "WebSite"));

  if (siteNode) {
    const siteLinks = extractNodeLinks(siteNode, siteUrl);
    const sitePage = await buildPageFromNode(siteNode, siteUrl, siteLinks);
    pageByPath.set(sitePage.path, sitePage);
  }

  for (const node of nodes) {
    if (!hasJsonLdType(node, "WebPage")) {
      continue;
    }
    const page = await buildPageFromNode(node, siteUrl);
    if (!pageByPath.has(page.path)) {
      pageByPath.set(page.path, page);
    }
  }

  return Array.from(pageByPath.values()).sort((a, b) =>
    a.path.localeCompare(b.path)
  );
};

export const generateSiteManifest = async (
  options: ManifestOptions = {},
): Promise<SiteManifest> => {
  const buildMode = requireBuildMode(options.buildMode);
  const useVaultGraph = options.source === "vaultGraph" ||
    typeof options.vaultPath === "string";

  if (useVaultGraph) {
    const vaultPath = requireVaultPath(options.vaultPath);
    const { nodes, errors } = await loadVault(vaultPath);
    if (errors.length > 0) {
      const detail = errors.map((error) => error.message).join("; ");
      throw new Error(`Vault JSON-LD load failed: ${detail}`);
    }
    const siteNode = nodes.find((node) => hasJsonLdType(node, "WebSite"));
    const siteUrl = requireSiteUrl(
      options.siteUrl,
      siteNode ? getNodeUrl(siteNode) : undefined,
    );
    const pages = await buildPagesFromVaultGraph(nodes, siteUrl);
    return {
      site: { url: siteUrl, buildMode },
      pages,
    };
  }

  const siteDir = requireSiteDir(options.siteDir);
  const siteUrl = requireSiteUrl(options.siteUrl);
  const htmlFiles = await collectHtmlFiles(siteDir);

  const pages = await Promise.all(
    htmlFiles.map(async (filePath) => {
      const html = await Deno.readTextFile(filePath);
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (!doc) {
        throw new Error(`Failed to parse HTML for ${filePath}`);
      }

      const path = pathFromHtmlFile(siteDir, filePath);
      const pageUrl = new URL(path, siteUrl).toString();
      const title = doc.querySelector("title")?.textContent?.trim() ?? "";
      const h1 = doc.querySelector("h1")?.textContent?.trim() ?? "";
      const hasCharset = Boolean(doc.querySelector("meta[charset]"));
      const hasViewport = Boolean(
        doc.querySelector('meta[name="viewport"]'),
      );
      const canonical = getCanonicalUrl(doc, siteUrl);
      const { hasJsonLd, jsonLdErrors } = extractJsonLd(doc);
      const cid = await buildCid(html);

      return {
        path,
        title,
        h1,
        links: extractLinks(doc, pageUrl, siteUrl),
        hasJsonLd,
        jsonLdErrors,
        canonical,
        cid,
        hasCharset,
        hasViewport,
        forbiddenMarkersFound: detectForbiddenMarkers(html),
      };
    }),
  );

  pages.sort((a, b) => a.path.localeCompare(b.path));

  return {
    site: {
      url: siteUrl,
      buildMode,
    },
    pages,
  };
};
