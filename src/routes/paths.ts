// AD-1: every URL in the app is built here. Absolute links use the configured APP_BASE_URL.

export const paths = {
  health: () => '/health',
  overview: () => '/',
  register: () => '/registrer',
  login: () => '/logg-inn',
  logout: () => '/logg-ut',
  newEvent: () => '/events/new',
  events: () => '/events',
  event: (eventId: number | string) => `/events/${eventId}`,
  tasks: (eventId: number | string) => `/events/${eventId}/tasks`,
  task: (eventId: number | string, taskId: number | string) => `/events/${eventId}/tasks/${taskId}`,
  deleteTask: (eventId: number | string, taskId: number | string) => `/events/${eventId}/tasks/${taskId}/delete`,
  assignTask: (eventId: number | string, taskId: number | string) => `/events/${eventId}/tasks/${taskId}/assign`,
  helpers: (eventId: number | string) => `/events/${eventId}/helpers`,
  helperPage: (token: string) => `/h/${token}`,
} as const;

export function absoluteUrl(appBaseUrl: string, path: string): string {
  return `${appBaseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
