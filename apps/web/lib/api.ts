/**
 * Error subclass thrown when the API base URL is missing or misconfigured.
 * Callers can `instanceof` check to show a targeted message instead of a
 * generic "network error".
 */
export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigError';
  }
}

let _cachedBaseUrl: string | null = null;

export function getApiBaseUrl(): string {
  if (_cachedBaseUrl) return _cachedBaseUrl;

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    throw new ApiConfigError(
      'Verification service is temporarily unavailable. Please try again later.'
    );
  }

  // Strip trailing slashes for consistent URL building.
  _cachedBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  return _cachedBaseUrl;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export async function request(path: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(path);
  return fetch(url, options);
}
