const stripTrailingSlash = (value: string): string => value.replace(/\/$/, "");

const stripFoldEnginePrefix = (pathname: string): string =>
  pathname.replace(/^\/fold-engine(?=\/|$)/, "");

export const normalizeSiteUrl = (value: string): string => {
  const trimmed = stripTrailingSlash(value.trim());
  try {
    const url = new URL(trimmed);
    const normalizedPath = stripFoldEnginePrefix(
      stripTrailingSlash(url.pathname),
    );
    url.pathname = normalizedPath || "/";
    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(stripFoldEnginePrefix(trimmed));
  }
};
