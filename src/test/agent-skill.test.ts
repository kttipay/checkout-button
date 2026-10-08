// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SKILL_NAME = 'maytes-checkout-button';
const SKILL_DIR = join(ROOT, 'skills', SKILL_NAME);
const REFERENCES_DIR = join(SKILL_DIR, 'references');

const skillMarkdown = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');
const referenceFiles = readdirSync(REFERENCES_DIR).filter((name) => name.endsWith('.md')).sort();
const skillTexts = [
  { file: 'SKILL.md', text: skillMarkdown },
  ...referenceFiles.map((name) => ({ file: `references/${name}`, text: readFileSync(join(REFERENCES_DIR, name), 'utf8') })),
];

const typesSource = readFileSync(join(ROOT, 'src', 'types.ts'), 'utf8');
const indexSource = readFileSync(join(ROOT, 'src', 'index.ts'), 'utf8');
const sdkSource = readdirSync(join(ROOT, 'src'))
  .filter((name) => name.endsWith('.ts'))
  .map((name) => readFileSync(join(ROOT, 'src', name), 'utf8'))
  .join('\n');

const UNRELEASED = /\bopenCheckout\b|\binstanceId\b|\bMaytesProvider\b|\bMaytesButton\b|\buseMaytes\b|\bonBusyChange\b|\bradius\b|\bheight:/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_PLUGIN_PREFIX = /^(claude|anthropic|anthropics|cc-plugin)-/;

function frontmatter(markdown: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (match === null) return {};
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const separator = line.indexOf(':');
    if (separator > 0) fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function membersOf(interfaceName: string): Set<string> {
  const body = new RegExp(`interface ${interfaceName}(?: extends \\w+)? \\{([\\s\\S]*?)\\n\\}`).exec(typesSource)?.[1] ?? '';
  return new Set([...body.matchAll(/^\s+(\w+)\??[(:]/gm)].map((member) => member[1] ?? ''));
}

const sdkMethods = membersOf('MaytesSDK');
const renderButtonOptions = membersOf('RenderButtonOptions');
const factoryOptions = new Set([...membersOf('MaytesOptions'), ...membersOf('MaytesInternalOptions')]);
const exportedNames = new Set([
  'Maytes',
  ...[...indexSource.matchAll(/\b([A-Z]\w+)\b/g)].map((name) => name[1] ?? ''),
]);

function backtickedSpans(text: string): string[] {
  return [...text.matchAll(/`([^`\n]+)`/g)].map((span) => span[1] ?? '');
}

describe('agent skill', () => {
  it('has valid frontmatter: a kebab-case name matching its folder and a trigger description', () => {
    const fields = frontmatter(skillMarkdown);
    expect(fields.name).toBe(SKILL_NAME);
    expect(fields.name).toMatch(KEBAB);
    expect((fields.name ?? '').length).toBeLessThanOrEqual(64);
    const description = fields.description ?? '';
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).toMatch(/Split with Maytes/);
    expect(description).toMatch(/Stripe/);
  });

  it('links every reference file from SKILL.md, and every link resolves', () => {
    const linked = [...skillMarkdown.matchAll(/\]\((references\/[\w.-]+\.md)\)/g)].map((link) => link[1] ?? '');
    expect(new Set(linked)).toEqual(new Set(referenceFiles.map((name) => `references/${name}`)));
    for (const target of linked) expect(existsSync(join(SKILL_DIR, target)), target).toBe(true);
  });

  it('only calls instance methods that MaytesSDK declares', () => {
    for (const { file, text } of skillTexts) {
      for (const call of text.matchAll(/\bmaytes\??\.(\w+)\(/g)) {
        expect(sdkMethods.has(call[1] ?? ''), `${file}: maytes.${call[1]}()`).toBe(true);
      }
    }
  });

  it('only passes options that RenderButtonOptions and MaytesOptions declare', () => {
    for (const { file, text } of skillTexts) {
      for (const call of text.matchAll(/renderButton\([^,()]+(?:\([^)]*\))?[^,]*,\s*\{([^}]*)\}/g)) {
        for (const key of (call[1] ?? '').split(',').map((part) => part.split(':')[0]?.trim() ?? '').filter(Boolean)) {
          expect(renderButtonOptions.has(key), `${file}: renderButton option ${key}`).toBe(true);
        }
      }
      for (const span of backtickedSpans(text)) {
        const factory = /^Maytes\(([^)]*)\)$/.exec(span);
        if (factory !== null) expect(span, `${file}: ${span}`).toBe('Maytes(options, internal)');
      }
    }
    expect([...factoryOptions].sort()).toEqual(['baseUrl', 'createCheckout', 'cspNonce', 'environment']);
  });

  it('names only released API in its API list', () => {
    const section = /## Released API[^\n]*\n([\s\S]*?)\n## /.exec(skillMarkdown)?.[1] ?? '';
    expect(section.length).toBeGreaterThan(0);
    const allowed = new Set([...sdkMethods, ...renderButtonOptions, ...factoryOptions, ...exportedNames, 'checkoutId', 'replace']);
    const placeholders = new Set(['options', 'internal', 'container', 'popup', 'redirect', 'document']);
    for (const span of backtickedSpans(section)) {
      if (span.startsWith('maytes:checkout-') || span.startsWith("'")) continue;
      for (const identifier of span.matchAll(/[A-Za-z_]\w*/g)) {
        const name = identifier[0];
        if (placeholders.has(name)) continue;
        expect(allowed.has(name), `Released API mentions ${name}`).toBe(true);
      }
    }
  });

  it('only names events the SDK dispatches', () => {
    for (const { file, text } of skillTexts) {
      for (const event of text.matchAll(/maytes:checkout-[a-z]+/g)) {
        expect(sdkSource.includes(`'${event[0]}'`), `${file}: ${event[0]}`).toBe(true);
      }
    }
  });

  it('does not mention unreleased API', () => {
    for (const { file, text } of skillTexts) {
      expect(UNRELEASED.exec(text)?.[0] ?? null, file).toBeNull();
    }
  });

  it('is installable as a Claude Code plugin from this repository', () => {
    const marketplace = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
    const plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
    expect(marketplace.name).toMatch(KEBAB);
    expect(typeof marketplace.owner?.name).toBe('string');
    expect(marketplace.plugins).toEqual([expect.objectContaining({ name: plugin.name, source: './' })]);
    expect(plugin.name).toBe(SKILL_NAME);
    expect(plugin.name).not.toMatch(RESERVED_PLUGIN_PREFIX);
    expect(existsSync(join(ROOT, 'skills', SKILL_NAME, 'SKILL.md'))).toBe(true);
  });
});
