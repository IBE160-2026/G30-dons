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
  markDone: (eventId: number | string, taskId: number | string) => `/events/${eventId}/tasks/${taskId}/done`,
  helperPage: (token: string) => `/h/${token}`,
  /** The helper page with one of its fixed notices (the query only picks a text). */
  helperNotice: (token: string, notice: 'lagret' | 'feil' | 'lang') =>
    `/h/${token}?${notice === 'lagret' ? 'lagret=1' : notice === 'feil' ? 'feil=1' : 'feil=lang'}`,
  helperTask: (token: string, taskId: number | string) => `/h/${token}/tasks/${taskId}`,
} as const;

export function absoluteUrl(appBaseUrl: string, path: string): string {
  return `${appBaseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
