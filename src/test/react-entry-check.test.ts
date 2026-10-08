import { describe, it, expect } from 'vitest';
import { findReactEntryProblems } from '../../scripts/lib/react-entry-check.mjs';

const good = {
  iife: 'var MaytesCheckoutButton=(()=>{/* core only */})();',
  reactEsm: '"use client";\nimport { jsx } from "react/jsx-runtime";\nimport { Maytes } from "@maytes/checkout-button";\n',
  reactCjs: '"use client";\nvar import_jsx_runtime = require("react/jsx-runtime");\nvar import_checkout_button = require("@maytes/checkout-button");\n',
  reactDts: "import { MaytesEnvironment } from '@maytes/checkout-button';\n",
};

describe('findReactEntryProblems', () => {
  it('passes a correct build', () => {
    expect(findReactEntryProblems(good)).toEqual([]);
  });

  it('flags React code in the CDN bundle', () => {
    const problems = findReactEntryProblems({ ...good, iife: `${good.iife}Symbol.for("react.transitional.element")` });
    expect(problems).toContain('the CDN bundle (checkout-button.js) contains React code');
  });

  it('flags a React entry that bundles its own copy of the core', () => {
    const problems = findReactEntryProblems({ ...good, reactEsm: `${good.reactEsm}const x = "maytes-checkout-overlay";` });
    expect(problems).toContain('react.mjs bundles a copy of the core instead of importing @maytes/checkout-button');
  });

  it('flags a missing "use client" directive', () => {
    const problems = findReactEntryProblems({ ...good, reactCjs: good.reactCjs.replace('"use client";\n', '') });
    expect(problems).toContain('react.cjs does not start with "use client"');
  });

  it('flags type declarations that inline the core types', () => {
    const problems = findReactEntryProblems({ ...good, reactDts: 'interface MaytesSDK { destroy(): void }' });
    expect(problems).toContain('react.d.ts inlines the core types instead of importing @maytes/checkout-button');
  });
});
