// @vitest-environment node
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as ts from 'typescript';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SDK_ENTRY = join(ROOT, 'src', 'index.ts');
const GUIDES_DIR = join(ROOT, 'docs', 'guides');

const SKIP_MARKER = /<!--\s*typecheck:\s*skip\s*-->\s*$/;
const FENCE = /```([a-z]+)\n([\s\S]*?)\n```/g;
const USES_SDK = /@maytes\/checkout-button|\bMaytes\(/;
const USES_REACT_BINDINGS = /@maytes\/checkout-button\/react/;
const REACT_ENTRY = join(ROOT, 'src', 'react', 'index.ts');
const REACT_GLOBALS = `
declare function showMessage(text: string): void;
declare function createMaytesCheckout(cartId: string): Promise<{ checkoutId: string; checkoutUrl?: string }>;
declare function payWithStripe(): void;
`;
const CHECKED_LANGUAGES: Record<string, 'ts' | 'tsx' | 'js'> = {
  ts: 'ts',
  typescript: 'ts',
  tsx: 'tsx',
  js: 'js',
  javascript: 'js',
  vue: 'ts',
  svelte: 'ts',
};

const FRAMEWORK_STUBS = `
declare function showMessage(text: string): void;
declare function onFailed(event: Event): void;
declare const paymentElement: { on(event: 'change', handler: (event: { value: { type: string } }) => void): void };
declare const payButton: HTMLButtonElement;
declare const MAYTES_CPM_ID: string;
declare const createCheckout: () => Promise<{ checkoutId: string; checkoutUrl?: string }>;
declare const process: { env: Record<string, string | undefined> };
declare function defineProps<T>(): T;
declare function $props(): any;

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements { div: { ref?: unknown }; 'maytes-checkout-button': Record<string, unknown> }
}

declare module 'react' {
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useRef<T>(initialValue: T | null): { current: T | null };
}

declare module 'vue' {
  export interface Ref<T> { value: T }
  export function ref<T>(value: T): Ref<T>;
  export function onMounted(hook: () => void): void;
  export function onBeforeUnmount(hook: () => void): void;
}

declare module 'svelte' {
  export function onMount(fn: () => void | (() => void) | Promise<void>): void;
}

declare module 'solid-js' {
  export function onMount(fn: () => void): void;
  export function onCleanup(fn: () => void): void;
}

declare module '@angular/core' {
  export function Component(metadata: { selector: string; standalone?: boolean; schemas?: unknown[]; template: string }): any;
  export const CUSTOM_ELEMENTS_SCHEMA: unique symbol;
  export function Input(options?: { required?: boolean }): any;
  export function ViewChild(selector: string, options?: { static?: boolean }): any;
  export interface AfterViewInit { ngAfterViewInit(): void }
  export interface OnDestroy { ngOnDestroy(): void }
  export class ElementRef<T> { nativeElement: T }
  export const PLATFORM_ID: unique symbol;
  export function inject<T>(token: T): unknown;
}

declare module '@angular/common' {
  export function isPlatformBrowser(platformId: unknown): boolean;
}
`;

interface Snippet {
  id: string;
  source: string;
  language: 'ts' | 'tsx' | 'js';
  code: string;
}

function scriptOf(language: string, block: string): string {
  if (language !== 'vue' && language !== 'svelte') return block;
  return /<script[^>]*>([\s\S]*?)<\/script>/.exec(block)?.[1] ?? '';
}

function snippetsIn(path: string, label: string): Snippet[] {
  const markdown = readFileSync(path, 'utf8');
  const snippets: Snippet[] = [];
  for (const match of markdown.matchAll(FENCE)) {
    const fenceLanguage = match[1] ?? '';
    const language = CHECKED_LANGUAGES[fenceLanguage];
    if (language === undefined) continue;
    const code = scriptOf(fenceLanguage, match[2] ?? '');
    if (!USES_SDK.test(code)) continue;
    const before = markdown.slice(0, match.index).trimEnd();
    if (SKIP_MARKER.test(before)) continue;
    snippets.push({ id: `${label}#${snippets.length + 1}`, source: label, language, code });
  }
  return snippets;
}

function collectSnippets(): Snippet[] {
  const guides = readdirSync(GUIDES_DIR)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .flatMap((name) => snippetsIn(join(GUIDES_DIR, name), `docs/guides/${name}`));
  return [...snippetsIn(join(ROOT, 'README.md'), 'README.md'), ...guides];
}

const snippets = collectSnippets();
const diagnosticsBySnippet = new Map<string, string[]>();
let workDir = '';
let reactWorkDir = '';

function recordDiagnostics(program: ts.Program, files: Map<string, string>, preludeFile: string, preludeOwner: string): void {
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const fileName = diagnostic.file?.fileName ?? '';
    const owner = files.get(fileName) ?? (fileName === preludeFile ? preludeOwner : `SDK source ${fileName}`);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const position = diagnostic.file !== undefined && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : undefined;
    const where = position === undefined ? '' : ` (line ${position.line + 1})`;
    diagnosticsBySnippet.set(owner, [...(diagnosticsBySnippet.get(owner) ?? []), `${message}${where}`]);
  }
}

function writeSnippets(dir: string, group: Snippet[], offset: number): Map<string, string> {
  const files = new Map<string, string>();
  group.forEach((snippet, index) => {
    const file = join(dir, `snippet-${offset + index}.${snippet.language}`);
    writeFileSync(file, `${snippet.code}\nexport {};\n`);
    files.set(file, snippet.id);
  });
  return files;
}

function repositoryCompilerOptions(): ts.CompilerOptions {
  const config = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile).config;
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);
  const checkOnly: ts.CompilerOptions = {
    ...options,
    noEmit: true,
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    paths: { '@maytes/checkout-button': [SDK_ENTRY], '@maytes/checkout-button/react': [REACT_ENTRY] },
  };
  delete checkOnly.rootDir;
  delete checkOnly.outDir;
  return checkOnly;
}

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'maytes-doc-snippets-'));
  const stubbedSnippets = snippets.filter((snippet) => !USES_REACT_BINDINGS.test(snippet.code));
  const reactSnippets = snippets.filter((snippet) => USES_REACT_BINDINGS.test(snippet.code));

  const stubs = join(workDir, 'framework-stubs.d.ts');
  writeFileSync(stubs, FRAMEWORK_STUBS);
  const stubbedFiles = writeSnippets(workDir, stubbedSnippets, 0);
  const stubbedProgram = ts.createProgram([stubs, ...stubbedFiles.keys()], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    jsx: ts.JsxEmit.Preserve,
    allowJs: true,
    checkJs: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    types: [],
    paths: { '@maytes/checkout-button': [SDK_ENTRY], '@maytes/checkout-button/element': [join(ROOT, 'src', 'element.ts')] },
  });
  recordDiagnostics(stubbedProgram, stubbedFiles, stubs, 'framework stubs');

  if (reactSnippets.length === 0) return;
  const cacheDir = join(ROOT, 'node_modules', '.cache');
  mkdirSync(cacheDir, { recursive: true });
  reactWorkDir = mkdtempSync(join(cacheDir, 'maytes-doc-react-snippets-'));
  const reactGlobals = join(reactWorkDir, 'react-globals.d.ts');
  writeFileSync(reactGlobals, REACT_GLOBALS);
  const reactFiles = writeSnippets(reactWorkDir, reactSnippets, stubbedSnippets.length);
  const reactProgram = ts.createProgram([reactGlobals, ...reactFiles.keys()], repositoryCompilerOptions());
  recordDiagnostics(reactProgram, reactFiles, reactGlobals, 'React globals');
}, 60_000);

afterAll(() => {
  if (workDir !== '') rmSync(workDir, { recursive: true, force: true });
  if (reactWorkDir !== '') rmSync(reactWorkDir, { recursive: true, force: true });
});

describe('documentation examples', () => {
  it('finds the SDK examples in the README and every guide that has one', () => {
    const sources = new Set(snippets.map((snippet) => snippet.source));
    expect(snippets.length).toBeGreaterThanOrEqual(11);
    for (const guide of ['quickstart-npm.md', 'react.md', 'nextjs.md', 'vue-nuxt.md', 'angular.md', 'svelte.md', 'solid.md', 'api.md', 'events.md', 'security-csp.md', 'own-button.md', 'web-component.md']) {
      expect(sources.has(`docs/guides/${guide}`), `${guide} has a type-checked example`).toBe(true);
    }
    expect(sources.has('README.md')).toBe(true);
  });

  it('compiles the framework stubs and the SDK source cleanly', () => {
    const unrelated = [...diagnosticsBySnippet.entries()].filter(([owner]) => !snippets.some((s) => s.id === owner));
    expect(unrelated).toEqual([]);
  });

  it.each(snippets.map((snippet) => [snippet.id, snippet] as const))('%s type-checks against src/index.ts', (_id, snippet) => {
    expect(diagnosticsBySnippet.get(snippet.id) ?? []).toEqual([]);
  });
});
