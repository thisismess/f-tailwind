import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

describe(':slotted() — basic usage', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('emits <style scoped> with @apply for :slotted() classes', () => {
        const code = `<template>
  <button><slot></slot></button>
</template>

<style lang="f-tailwind">
& {
  bg-blue-500 text-white
  :slotted(span) { font-bold text-lg }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Normal classes applied to template
        expect(result.code).toContain('class="bg-blue-500 text-white"');
        // f-tailwind block removed
        expect(result.code).not.toContain('lang="f-tailwind"');
        // Scoped CSS emitted with @apply
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain(':slotted(span)');
        expect(result.code).toContain('@apply font-bold text-lg;');
    });

    it('emits raw CSS declarations inside :slotted() directly', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
& {
  p-4
  :slotted(p) {
    color: red;
    font-size: 1.25rem;
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="p-4"');
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain(':slotted(p)');
        expect(result.code).toContain('color: red;');
        expect(result.code).toContain('font-size: 1.25rem;');
        // No @apply since there are no Tailwind classes
        expect(result.code).not.toContain('@apply');
    });

    it('emits both @apply and raw declarations when mixed', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
& {
  :slotted(span) {
    font-bold text-lg
    transition: all 0.2s ease;
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('@apply font-bold text-lg;');
        expect(result.code).toContain('transition: all 0.2s ease;');
    });
});

describe(':slotted() — nesting and ancestors', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('preserves ancestor selector chain in scoped CSS', () => {
        const code = `<template>
  <div>
    <div class="wrapper">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .wrapper {
    :slotted(p) { font-bold }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('<style scoped>');
        // The ancestor chain should be preserved as CSS nesting
        expect(result.code).toContain('& {');
        expect(result.code).toContain('> .wrapper {');
        expect(result.code).toContain(':slotted(p) {');
        expect(result.code).toContain('@apply font-bold;');
    });

    it('applies normal classes alongside :slotted() in same rule', () => {
        const code = `<template>
  <div>
    <div class="wrapper">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .wrapper {
    bg-white p-4
    :slotted(span) { text-red-500 }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Normal classes applied to .wrapper in template
        expect(result.code).toContain('class="wrapper bg-white p-4"');
        // Slotted CSS emitted
        expect(result.code).toContain(':slotted(span)');
        expect(result.code).toContain('@apply text-red-500;');
    });

    it('handles :slotted() with nested children', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
& {
  :slotted(.card) {
    bg-white rounded-lg
    > h2 { text-xl font-bold }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain(':slotted(.card) {');
        expect(result.code).toContain('@apply bg-white rounded-lg;');
        expect(result.code).toContain('> h2 {');
        expect(result.code).toContain('@apply text-xl font-bold;');
    });

    it('handles top-level :slotted() without & wrapper', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
:slotted(span) { font-bold text-lg }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain(':slotted(span) {');
        expect(result.code).toContain('@apply font-bold text-lg;');
    });

    it('handles multiple :slotted() rules at different levels', () => {
        const code = `<template>
  <div>
    <header><slot name="header"></slot></header>
    <main><slot></slot></main>
  </div>
</template>

<style lang="f-tailwind">
& {
  > header {
    border-b
    :slotted(h1) { text-3xl }
  }
  > main {
    p-4
    :slotted(p) { text-base }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Normal classes applied
        expect(result.code).toContain('class="border-b"');
        expect(result.code).toContain('class="p-4"');
        // Both slotted rules emitted
        expect(result.code).toContain(':slotted(h1)');
        expect(result.code).toContain('@apply text-3xl;');
        expect(result.code).toContain(':slotted(p)');
        expect(result.code).toContain('@apply text-base;');
    });
});

describe(':slotted() — warnings and edge cases', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('does not trigger "matched no elements" warning', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
& {
  :slotted(span) { font-bold }
}
</style>`;

        forwardTransform(code, 'test.vue');
        const unmatchedWarning = warnSpy.mock.calls.find((c) => String(c[0]).includes('matched no elements'));
        expect(unmatchedWarning).toBeFalsy();
    });

    it('merges :slotted() CSS with raw declaration CSS in single <style scoped>', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
& {
  --bg: #1a1a2e;
  :slotted(p) { text-white }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Only one <style scoped> block
        const matches = result.code.match(/<style scoped>/g);
        expect(matches).toHaveLength(1);
        // Both raw declarations and slotted @apply present
        expect(result.code).toContain('--bg: #1a1a2e;');
        expect(result.code).toContain(':slotted(p)');
        expect(result.code).toContain('@apply text-white;');
    });

    it('empty :slotted() rule does not emit scoped block', () => {
        const code = `<template>
  <div><slot></slot></div>
</template>

<style lang="f-tailwind">
& {
  bg-white
  :slotted(span) { }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-white"');
        // No scoped block since the slotted rule is empty
        expect(result.code).not.toContain('<style scoped>');
    });
});
