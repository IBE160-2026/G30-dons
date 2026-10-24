// AD-1: one registry of error codes and their Norwegian texts.

export const ERROR_TEXTS = {
  invalid_credentials: 'Feil e-post eller passord.',
  email_in_use: 'E-postadressen er allerede i bruk.',
  not_found: 'Siden finnes ikke.',
  unknown_template: 'Velg en mal.',
  event_date_invalid: 'Skriv inn en gyldig dato.',
  event_date_in_past: 'Datoen kan ikke være tilbake i tid.',
  deadline_invalid: 'Skriv inn en gyldig frist.',
  deadline_in_past: 'Fristen kan ikke være tilbake i tid.',
} as const;

export type ErrorCode = keyof typeof ERROR_TEXTS;

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(ERROR_TEXTS[code]);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function errorText(code: ErrorCode): string {
  return ERROR_TEXTS[code];
}
