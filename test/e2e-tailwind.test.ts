import { describe, it, expect } from 'vitest';
import { compile } from 'tailwindcss';
import { forwardTransform } from '../src/transform/forward';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

/**
 * End-to-end tests: run the forward transform, then feed the output
 * through Tailwind CSS v4's `compile().build()` to verify the classes
 * actually produce real CSS rules.
 */

const require = createRequire(import.meta.url);

/** Extract all unique class names from a class="..." attribute string in HTML */
function extractClassNames(html: string): string[] {
    const classAttrRegex = /class="([^"]*)"/g;
    const allClasses = new Set<string>();
    let match;
    while ((match = classAttrRegex.exec(html)) !== null) {
        for (const cls of match[1].split(/\s+/).filter(Boolean)) {
            allClasses.add(cls);
        }
    }
    return [...allClasses];
}

/** Compile Tailwind CSS for a set of candidate class names */
async function buildTailwindCSS(candidates: string[]): Promise<string> {
    // Read the tailwindcss index.css directly to avoid @import resolution issues
    const twPath = dirname(require.resolve('tailwindcss/package.json'));
    const baseCss = readFileSync(resolve(twPath, 'index.css'), 'utf-8');

    const { build } = await compile(baseCss, { base: twPath });
    return build(candidates);
}

describe('E2E: forward transform → Tailwind CSS', () => {
    it('produces valid Tailwind CSS for the full stats page', async () => {
        const input = `<template>
  <div>
    <div>
      <dl>
        <div class="stat">
          <dt>Transactions every 24 hours</dt>
          <dd>44 million</dd>
        </div>
        <div class="stat">
          <dt>Assets under holding</dt>
          <dd>$119 trillion</dd>
        </div>
        <div class="stat">
          <dt>New users annually</dt>
          <dd>46,000</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900 py-24 sm:py-32

  > div {
    mx-auto max-w-7xl px-6 lg:px-8

    > dl {
      grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3

      > .stat {
        mx-auto flex max-w-xs flex-col gap-y-4

        > dt { text-base/7 text-gray-400 }
        > dd { order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl }
      }
    }
  }
}
</style>`;

        const result = forwardTransform(input, 'stats.vue')!;
        expect(result).not.toBeNull();

        const candidates = extractClassNames(result.code);
        // "stat" is a custom class, not a Tailwind utility — filter it out for checking
        const tailwindCandidates = candidates.filter((c) => c !== 'stat');

        expect(tailwindCandidates.length).toBeGreaterThan(0);

        const css = await buildTailwindCSS(tailwindCandidates);

        // Sanity: CSS should have real properties
        expect(css).toContain('background-color');
        expect(css).toContain('padding');
        expect(css).toContain('display');
        expect(css).toContain('font-weight');
        expect(css).toContain('color');

        // Check key utilities produce selectors in the CSS
        // Tailwind v4 escapes special chars: .sm\:py-32, .text-base\/7, etc.
        expect(css).toContain('.bg-gray-900');
        expect(css).toContain('.py-24');
        expect(css).toContain('.sm\\:py-32');
        expect(css).toContain('.mx-auto');
        expect(css).toContain('.max-w-7xl');
        expect(css).toContain('.grid');
        expect(css).toContain('.flex');
        expect(css).toContain('.text-base\\/7');
        expect(css).toContain('.text-gray-400');
        expect(css).toContain('.order-first');
        expect(css).toContain('.font-semibold');
        expect(css).toContain('.tracking-tight');
        expect(css).toContain('.text-white');
        expect(css).toContain('.sm\\:text-5xl');
    });

    it('produces valid CSS for a simple layout', async () => {
        const input = `<template>
  <div>
    <header>H</header>
    <main>M</main>
    <footer>F</footer>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex flex-col min-h-screen
  > header { bg-blue-500 text-white p-4 }
  > main { flex-1 p-8 }
  > footer { bg-gray-800 text-gray-300 p-4 }
}
</style>`;

        const result = forwardTransform(input, 'layout.vue')!;
        expect(result).not.toBeNull();

        const candidates = extractClassNames(result.code);
        const css = await buildTailwindCSS(candidates);

        // Check key CSS properties are generated
        expect(css).toContain('display: flex');
        expect(css).toContain('flex-direction: column');
        expect(css).toContain('min-height: 100vh');
        expect(css).toContain('flex: 1');
        expect(css).toContain('background-color');
        expect(css).toContain('color');
        expect(css).toContain('padding');
    });

    it('handles responsive modifiers correctly', async () => {
        const input = `<template>
  <div>
    <div>content</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4 md:p-8 lg:p-12
  > div { grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 }
}
</style>`;

        const result = forwardTransform(input, 'responsive.vue')!;
        const candidates = extractClassNames(result.code);
        const css = await buildTailwindCSS(candidates);

        // Should contain media queries for responsive breakpoints
        // Tailwind v4 uses modern CSS syntax: (width >= Xrem) instead of (min-width: Xrem)
        expect(css).toContain('@media');
        // md breakpoint
        expect(css).toMatch(/width >= 48rem/);
        // lg breakpoint
        expect(css).toMatch(/width >= 64rem/);
        // xl breakpoint
        expect(css).toMatch(/width >= 80rem/);
    });

    it('handles state modifiers (hover, focus, etc)', async () => {
        const input = `<template>
  <button>Click me</button>
</template>

<style lang="f-tailwind">
& {
  bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded
  focus:outline-none focus:ring-2 focus:ring-blue-500
  active:bg-blue-800
}
</style>`;

        const result = forwardTransform(input, 'button.vue')!;
        const candidates = extractClassNames(result.code);
        const css = await buildTailwindCSS(candidates);

        // Should contain hover, focus, and active pseudo-class rules
        expect(css).toContain(':hover');
        expect(css).toContain(':focus');
        expect(css).toContain(':active');
        expect(css).toContain('border-radius');
        expect(css).toContain('outline');
    });

    it('handles arbitrary values', async () => {
        const input = `<template>
  <div>
    <span>text</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  w-[300px] h-[calc(100vh-4rem)] bg-[#1a1a2e]
  > span { text-[14px] leading-[1.6] }
}
</style>`;

        const result = forwardTransform(input, 'arbitrary.vue')!;
        const candidates = extractClassNames(result.code);
        const css = await buildTailwindCSS(candidates);

        // Arbitrary values should produce real CSS
        expect(css).toContain('300px');
        expect(css).toContain('calc(100vh - 4rem)');
        expect(css).toContain('#1a1a2e');
        expect(css).toContain('14px');
    });

    it('every class from the transform is either a valid Tailwind utility or a custom class', async () => {
        // This test ensures there are no "orphan" or corrupted class names
        // coming out of the transform
        const input = `<template>
  <div>
    <nav>
      <a class="active">Home</a>
      <a>About</a>
      <a>Contact</a>
    </nav>
    <main>
      <h1>Title</h1>
      <p>Paragraph with <strong>bold</strong> text</p>
    </main>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex min-h-screen
  > nav {
    w-64 bg-gray-900 p-4
    > a {
      block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded
    }
  }
  > main {
    flex-1 p-8
    > h1 { text-3xl font-bold mb-4 }
    > p {
      text-gray-600 leading-relaxed
      > strong { font-semibold text-gray-900 }
    }
  }
}
</style>`;

        const result = forwardTransform(input, 'sidebar.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).not.toContain('f-tailwind');

        const candidates = extractClassNames(result.code);
        const customClasses = ['active']; // known non-Tailwind classes
        const tailwindCandidates = candidates.filter((c) => !customClasses.includes(c));

        const css = await buildTailwindCSS(tailwindCandidates);

        // Each Tailwind candidate should appear in the CSS output as a selector
        for (const candidate of tailwindCandidates) {
            const escaped = candidate.replace(/\//g, '\\/').replace(/:/g, '\\:').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/#/g, '\\#').replace(/\./g, '\\.');
            // The CSS should contain a selector referencing this class
            expect(css.includes(escaped), `Class "${candidate}" should produce CSS (escaped: "${escaped}")`).toBe(true);
        }
    });
});
