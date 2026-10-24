// AD-1: every URL in the app is built here. Absolute links use the configured APP_BASE_URL.

export const paths = {
  health: () => '/health',
  overview: () => '/',
  register: () => '/registrer',
  login: () => '/logg-inn',
  logout: () => '/logg-ut',
} as const;

export function absoluteUrl(appBaseUrl: string, path: string): string {
  return `${appBaseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
