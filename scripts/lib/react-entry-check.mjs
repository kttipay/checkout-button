const REACT_ELEMENT = /Symbol\.for\(["']react\.(transitional\.)?element["']\)|["']react\/jsx-runtime["']/;
const IMPORTS_CORE = /["']@maytes\/checkout-button["']/;
const CORE_MARKER = 'maytes-checkout-overlay';
const USE_CLIENT = /^["']use client["'];/;

export function findReactEntryProblems({ iife, reactEsm, reactCjs, reactDts }) {
  const problems = [];
  if (REACT_ELEMENT.test(iife)) problems.push('the CDN bundle (checkout-button.js) contains React code');
  for (const [name, content] of [['react.mjs', reactEsm], ['react.cjs', reactCjs]]) {
    if (!USE_CLIENT.test(content)) problems.push(`${name} does not start with "use client"`);
    if (!IMPORTS_CORE.test(content) || content.includes(CORE_MARKER)) {
      problems.push(`${name} bundles a copy of the core instead of importing @maytes/checkout-button`);
    }
  }
  if (!IMPORTS_CORE.test(reactDts) || /interface MaytesSDK\b/.test(reactDts)) {
    problems.push('react.d.ts inlines the core types instead of importing @maytes/checkout-button');
  }
  return problems;
}
