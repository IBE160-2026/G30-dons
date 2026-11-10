import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Story 5.1, step 3 and AD-18: the stylesheet is locked to the DESIGN.md tokens. Colors, font
// families, radii and spacing outside :root come only from the custom properties that mirror the
// tokens, and no view styles itself with a style attribute.

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const design = readFileSync(
  new URL('../.docs/planning-artifacts/ux-designs/ux-MasterPlan-2026-11-10/DESIGN.md', import.meta.url),
  'utf8',
);

/** The `colors:` block of the DESIGN.md frontmatter as { name: '#hex' }. */
function designColors(): Record<string, string> {
  const block = /^colors:\n((?: {2}[\w-]+: '#[0-9A-Fa-f]{6}'\n)+)/m.exec(design)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/^ {2}([\w-]+): '(#[0-9A-Fa-f]{6})'$/gm)].map((m) => [m[1], m[2]]));
}

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rootBlock = /:root\s*\{([^}]*)\}/.exec(withoutComments)?.[1] ?? '';
/** Every rule except :root and @font-face, where literal values belong. */
const rules = withoutComments.replace(/:root\s*\{[^}]*\}/, '').replace(/@font-face\s*\{[^}]*\}/g, '');
const declarations = [...rules.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].map((m) => ({
  property: m[1] ?? '',
  value: (m[2] ?? '').trim(),
}));

/** A value is token-only when every part is a var(), a calc() of vars, 0 or auto. */
function tokenOnly(value: string): boolean {
  const rest = value
    .replace(/calc\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (calc) => (/var\(--/.test(calc) ? '' : calc))
    .replace(/var\(--[\w-]+\)/g, '')
    .replace(/\b(0|auto)\b/g, '');
  return rest.trim() === '';
}

describe('AD-18: the stylesheet is locked to the DESIGN.md tokens', () => {
  it('defines every DESIGN.md color as --color-<name> in :root with the same value', () => {
    const colors = designColors();
    expect(Object.keys(colors).length).toBeGreaterThan(15);
    for (const [name, hex] of Object.entries(colors)) {
      const declared = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(rootBlock)?.[1];
      expect(declared?.toLowerCase(), `--color-${name}`).toBe(hex.toLowerCase());
    }
  });

  it('uses no color literal outside :root', () => {
    const literals = rules.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g) ?? [];
    expect(literals).toEqual([]);
  });

  it('takes font families, radii and spacing only from custom properties', () => {
    const locked = /^(font-family|border-radius|margin|margin-[a-z]+|padding|padding-[a-z]+|gap|row-gap|column-gap)$/;
    const offenders = declarations
      .filter(({ property, value }) => locked.test(property) && !tokenOnly(value))
      .map(({ property, value }) => `${property}: ${value}`);
    expect(offenders).toEqual([]);
  });

  it('lets no view style itself with a style attribute', () => {
    const dir = new URL('../src/views/', import.meta.url);
    const files = readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ejs'));
    expect(files.length).toBeGreaterThan(10);
    const styled = files.filter((f) => /\sstyle\s*=/.test(readFileSync(new URL(f.replace(/\\/g, '/'), dir), 'utf8')));
    expect(styled).toEqual([]);
  });
});
