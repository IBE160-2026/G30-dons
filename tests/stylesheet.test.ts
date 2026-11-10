import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Story 5.1, step 2: every page uses the Porselen stylesheet. Every class a view uses is styled,
// and the stylesheet no longer carries the aliases or page rules from before the redesign.

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const viewsDir = new URL('../src/views/', import.meta.url);

function viewFiles(dir: URL): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? viewFiles(new URL(`${entry.name}/`, dir)).map((f) => `${entry.name}/${f}`)
      : entry.name.endsWith('.ejs')
        ? [entry.name]
        : [],
  );
}

const views = viewFiles(viewsDir).map((name) => ({
  name,
  source: readFileSync(new URL(name, viewsDir), 'utf8'),
}));

/** Class names a view can produce: static ones, plus words in string literals inside EJS tags. */
function viewClasses(source: string): { classes: Set<string>; prefixes: Set<string> } {
  const classes = new Set<string>();
  const prefixes = new Set<string>();
  for (const [, value = ''] of source.matchAll(/class="((?:[^"<]|<%[\s\S]*?%>)*)"/g)) {
    for (const [, before = '', tag = ''] of value.matchAll(/(\S*)<%[=-]?([\s\S]*?)%>/g)) {
      // "status-<%= task.status %>" makes a family of classes that all start with "status-".
      if (before.endsWith('-')) prefixes.add(before);
      for (const [, literal = ''] of tag.matchAll(/'([^']*)'/g)) {
        for (const word of literal.split(/\s+/)) if (word) classes.add(word);
      }
    }
    for (const word of value.replace(/<%[\s\S]*?%>/g, '\u0000').split(/\s+/)) {
      if (word && !word.includes('\u0000')) classes.add(word);
    }
  }
  return { classes, prefixes };
}

/** Class selectors defined in the stylesheet (strings, urls and comments removed first). */
function cssClasses(): Set<string> {
  const stripped = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"[^"]*"|'[^']*'/g, '""')
    .replace(/url\([^)]*\)/g, '');
  return new Set([...stripped.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1] ?? ''));
}

// Classes that only mark a panel for tests/summaries.test.ts. The panels are replaced in step 4,
// and these hooks go with them.
const TEST_HOOKS = new Set(['panel-done', 'panel-todo', 'panel-timeline', 'panel-messages']);

describe('the Porselen stylesheet on every page', () => {
  it('styles every class that a view uses', () => {
    const defined = cssClasses();
    const missing = views.flatMap(({ name, source }) =>
      [...viewClasses(source).classes]
        .filter((c) => !defined.has(c) && !TEST_HOOKS.has(c))
        .map((c) => `${name}: .${c}`),
    );
    expect(missing).toEqual([]);
  });

  it('styles every class family that a view builds from data', () => {
    const defined = [...cssClasses()];
    const missing = views.flatMap(({ name, source }) =>
      [...viewClasses(source).prefixes]
        .filter((prefix) => !defined.some((c) => c.startsWith(prefix)))
        .map((prefix) => `${name}: .${prefix}*`),
    );
    expect(missing).toEqual([]);
  });

  it('has no aliases from before the redesign, and every custom property it uses is defined', () => {
    const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    for (const alias of ['--bg', '--surface', '--text', '--muted', '--accent', '--error', '--border']) {
      expect(declared.has(alias), alias).toBe(false);
    }
    const undefinedRefs = [...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]).filter((name) => !declared.has(name));
    expect(undefinedRefs).toEqual([]);
  });

  it('links the stylesheet from both page shells', () => {
    for (const shell of ['partials/top.ejs', 'partials/helper-top.ejs']) {
      expect(views.find((v) => v.name === shell)?.source, shell).toContain(
        '<link rel="stylesheet" href="/styles.css">',
      );
    }
  });
});
