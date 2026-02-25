import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

// Helper: transform and return result
function t(code: string) {
    return forwardTransform(code, 'test.vue');
}

describe('pseudo-elements — emitted as scoped CSS with @apply', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('::before emits @apply instead of adding class to element', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  > div::before { bg-red content-['*'] }
}
</style>`;
        const r = t(code)!;
        // Should NOT add classes to the div element
        expect(r.code).not.toContain('class="bg-red');
        expect(r.code).not.toContain("class=\"content-['*']");
        // Should emit scoped CSS with @apply
        expect(r.code).toContain('<style scoped>');
        expect(r.code).toContain('> div::before {');
        expect(r.code).toContain("@apply bg-red content-['*'];");
    });

    it('::after emits @apply', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  > div::after { absolute inset-0 }
}
</style>`;
        const r = t(code)!;
        expect(r.code).not.toContain('class="absolute');
        expect(r.code).toContain('> div::after {');
        expect(r.code).toContain('@apply absolute inset-0;');
    });

    it('::placeholder emits @apply', () => {
        const code = `<template>
  <input type="text">
</template>

<style lang="f-tailwind">
& {
  > input::placeholder { text-gray-400 italic }
}
</style>`;
        const r = t(code)!;
        expect(r.code).not.toContain('class="text-gray-400');
        expect(r.code).toContain('> input::placeholder {');
        expect(r.code).toContain('@apply text-gray-400 italic;');
    });

    it('preserves raw CSS declarations alongside pseudo-element classes', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  > div::before {
    bg-red
    content: '';
  }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('@apply bg-red;');
        expect(r.code).toContain("content: '';");
    });

    it('element without pseudo-element still gets classes normally', () => {
        const code = `<template>
  <div>
    <span>text</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > span { text-sm }
  &::before { bg-red }
}
</style>`;
        const r = t(code)!;
        // div and span should get their classes
        expect(r.code).toContain('class="p-4"');
        expect(r.code).toContain('class="text-sm"');
        // ::before should be in scoped CSS
        expect(r.code).toContain('::before');
        expect(r.code).toContain('@apply bg-red;');
    });

    it('pseudo-element with combined selector: div.card::after', () => {
        const code = `<template>
  <div class="card">hello</div>
</template>

<style lang="f-tailwind">
& {
  > div.card::after { absolute inset-0 bg-black/50 }
}
</style>`;
        const r = t(code)!;
        expect(r.code).not.toContain('class="card absolute');
        expect(r.code).toContain('> div.card::after {');
        expect(r.code).toContain('@apply absolute inset-0 bg-black/50;');
    });

    it('::selection emits @apply', () => {
        const code = `<template>
  <p>Select me</p>
</template>

<style lang="f-tailwind">
& {
  > p::selection { bg-blue-200 text-blue-900 }
}
</style>`;
        const r = t(code)!;
        expect(r.code).not.toContain('class="bg-blue-200');
        expect(r.code).toContain('::selection {');
        expect(r.code).toContain('@apply bg-blue-200 text-blue-900;');
    });

    it('preserves ancestor nesting in emitted CSS', () => {
        const code = `<template>
  <div>
    <span>text</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > span::before { content-['→'] text-red }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="p-4"');
        // The emitted CSS should preserve the ancestor chain
        expect(r.code).toContain('& {');
        expect(r.code).toContain('> span::before {');
        expect(r.code).toContain("@apply content-['→'] text-red;");
    });
});

describe(':root — only matches elements without a parent', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it(':root matches the top-level element', () => {
        const code = `<template>
  <div>
    <span>child</span>
  </div>
</template>

<style lang="f-tailwind">
:root { bg-red }
</style>`;
        const r = t(code)!;
        // Only the top-level div should match :root, not the span
        expect(r.code).toContain('<div class="bg-red">');
        expect(r.code).not.toContain('<span class="bg-red">');
    });

    it(':root does NOT match nested elements', () => {
        const code = `<template>
  <div>
    <div>
      <p>deep</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
:root { font-sans }
</style>`;
        const r = t(code)!;
        // Only top-level div gets the class
        const matches = (r.code.match(/font-sans/g) || []).length;
        expect(matches).toBe(1);
    });

    it(':root with children rules', () => {
        const code = `<template>
  <div>
    <div>first</div>
    <span>second</span>
  </div>
</template>

<style lang="f-tailwind">
:root {
  bg-gray-900
  > div { text-white }
}
</style>`;
        const r = t(code)!;
        // Root gets bg-gray-900
        expect(r.code).toContain('class="bg-gray-900"');
        // Inner div (child of root) gets text-white
        expect(r.code).toContain('class="text-white"');
        // span should not get text-white
        expect(r.code).not.toContain('<span class=');
    });

    it(':root does not match when element has a parent', () => {
        const code = `<template>
  <div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
p:root { text-red }
</style>`;
        const r = t(code)!;
        // p has a parent (div), so p:root should not match
        expect(r.code).not.toContain('text-red');
    });
});

describe('@rules — warns and skips unsupported at-rules', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('@media warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { p-4 }
@media (min-width: 768px) {
  & { p-8 }
}
</style>`;
        const r = t(code)!;
        // The normal rule should still work
        expect(r.code).toContain('class="p-4"');
        // Should warn about @media
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@media" is not supported'));
    });

    it('@keyframes warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { animate-spin }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="animate-spin"');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@keyframes" is not supported'));
    });

    it('@supports warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
@supports (display: grid) {
  & { > div { grid } }
}
</style>`;
        t(code);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@supports" is not supported'));
    });

    it('@layer warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
@layer components {
  & { > div { p-4 } }
}
</style>`;
        t(code);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@layer" is not supported'));
    });

    it('@container warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
@container (min-width: 400px) {
  & { > div { p-4 } }
}
</style>`;
        t(code);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@container" is not supported'));
    });

    it('@export is NOT warned about (it is supported)', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { p-4 }
@export card {
  rounded-lg shadow-md
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="p-4"');
        // Should not warn about @export
        const atRuleWarnings = warnSpy.mock.calls.filter((c) => String(c[0]).includes('is not supported'));
        expect(atRuleWarnings.length).toBe(0);
    });

    it('rules after @media still work', () => {
        const code = `<template>
  <div>
    <span>hello</span>
  </div>
</template>

<style lang="f-tailwind">
@media (min-width: 768px) {
  & { p-8 }
}
& {
  p-4
  > span { text-sm }
}
</style>`;
        const r = t(code)!;
        // Rules after @media should still work
        expect(r.code).toContain('class="p-4"');
        expect(r.code).toContain('class="text-sm"');
    });

    it('nested @media inside a rule body warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  p-4
  @media (min-width: 768px) {
    > div { p-8 }
  }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="p-4"');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@media" is not supported'));
    });

    it('nested @keyframes inside a rule body warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  animate-bounce
  @keyframes bounce {
    0% { transform: translateY(0); }
    100% { transform: translateY(-10px); }
  }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="animate-bounce"');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@keyframes" is not supported'));
    });

    it('nested @supports inside a rule body warns and is skipped', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  p-4
  @supports (display: grid) {
    grid
  }
}
</style>`;
        t(code);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"@supports" is not supported'));
    });
});

describe('v-html — descendants are skipped', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('does not style descendants of v-html elements', () => {
        const code = `<template>
  <div v-html="content">
    <p>template fallback</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > p { text-red }
}
</style>`;
        const r = t(code)!;
        // Root div should get p-4
        expect(r.code).toContain('class="p-4"');
        // The <p> inside v-html should NOT get classes (it's replaced at runtime)
        expect(r.code).not.toContain('class="text-red"');
    });

    it('still styles the v-html element itself', () => {
        const code = `<template>
  <div>
    <article v-html="body"></article>
  </div>
</template>

<style lang="f-tailwind">
& {
  > article { prose max-w-none }
}
</style>`;
        const r = t(code)!;
        // The article itself should get classes
        expect(r.code).toContain('class="prose max-w-none"');
    });

    it('elements without v-html still have their children styled', () => {
        const code = `<template>
  <div>
    <div>
      <p>normal child</p>
    </div>
    <div v-html="html">
      <p>replaced</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div {
    p-4
    > p { text-sm }
  }
}
</style>`;
        const r = t(code)!;
        // First div's p should get text-sm
        expect(r.code).toContain('class="text-sm"');
        // Only one occurrence (the normal div's child, not the v-html div's child)
        const matches = (r.code.match(/text-sm/g) || []).length;
        expect(matches).toBe(1);
    });
});
