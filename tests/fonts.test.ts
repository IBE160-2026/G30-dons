import { existsSync, readFileSync } from 'node:fs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupTestApp, type TestContext } from './helpers.ts';

// Story 5.1, step 1: the three font families from DESIGN.md are self-hosted (OFL), so the
// examiner's Docker run works offline and helper pages never call a third party (AD-16, AD-17).

const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const publicFile = (path: string) => new URL(`../public${path}`, import.meta.url);

/** Each @font-face rule as { family, weight, src }. */
function fontFaces() {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body = '']) => ({
    family: /font-family:\s*["']([^"']+)["']/.exec(body)?.[1],
    weight: /font-weight:\s*(\d+)/.exec(body)?.[1],
    src: [...body.matchAll(/url\(([^)]+)\)/g)].map((m) => (m[1] ?? '').replace(/['"]/g, '')),
  }));
}

let ctx: TestContext;

beforeEach(async () => {
  ctx = await setupTestApp();
});

afterEach(() => {
  ctx.close();
});

describe('self-hosted fonts', () => {
  it('declares every family and weight that DESIGN.md uses', () => {
    const declared = fontFaces().map((f) => `${f.family} ${f.weight}`);
    expect(declared.sort()).toEqual(['Dancing Script 500', 'Lora 400', 'Source Sans 3 400', 'Source Sans 3 600']);
  });

  it('serves every font file from /fonts as woff2', async () => {
    const sources = fontFaces().flatMap((f) => f.src);
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      expect(src, src).toMatch(/^\/fonts\/[a-z0-9-]+\/[a-z0-9-]+\.woff2$/);
      const res = await request(ctx.app).get(src);
      expect(res.status, src).toBe(200);
      expect(res.headers['content-type'], src).toBe('font/woff2');
    }
  });

  it('ships the OFL licence next to each family', () => {
    for (const family of ['lora', 'source-sans-3', 'dancing-script']) {
      const licence = publicFile(`/fonts/${family}/OFL.txt`);
      expect(existsSync(licence), family).toBe(true);
      expect(readFileSync(licence, 'utf8')).toContain('SIL Open Font License');
    }
  });

  it('loads nothing from another origin', () => {
    expect(css).not.toMatch(/url\(\s*['"]?(https?:)?\/\//);
    expect(css).not.toMatch(/@import/);
  });
});
