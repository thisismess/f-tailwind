import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

// Helper: transform and return result
function t(code: string) {
    return forwardTransform(code, 'test.vue');
}

describe('HTML escaping in class attributes', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('escapes double quotes in arbitrary Tailwind values', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { content-['"'] }
</style>`;
        const r = t(code)!;
        // The double quote should be escaped as &quot;
        expect(r.code).toContain('&quot;');
        // The class attr should be well-formed: class="content-['&quot;']"
        expect(r.code).toContain(`class="content-['&quot;']"`);
    });

    it('does not escape when no special chars present', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { bg-red text-white }
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="bg-red text-white"');
        // No escaping needed
        expect(r.code).not.toContain('&quot;');
        expect(r.code).not.toContain('&amp;');
    });

    it('escapes ampersands in class values', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { content-['a&b'] }
</style>`;
        const r = t(code)!;
        // Ampersand should be escaped
        expect(r.code).toContain('&amp;');
    });

    it('escapes when merging with existing class attribute', () => {
        const code = `<template>
  <div class="existing">hello</div>
</template>

<style lang="f-tailwind">
& { content-['"x"'] }
</style>`;
        const r = t(code)!;
        // Should still produce valid HTML
        expect(r.code).toContain('&quot;');
        expect(r.code).toContain('existing');
    });
});

describe('removeStyleBlock — robust search', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('removes style block even with very long style tag attributes', () => {
        // Create a style tag with attributes longer than 200 chars
        const longAttr = 'x'.repeat(300);
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind" data-test="${longAttr}">
& { bg-red }
</style>`;
        const r = t(code)!;
        // The f-tailwind block should be completely removed
        expect(r.code).not.toContain('f-tailwind');
        expect(r.code).not.toContain('</style>');
        expect(r.code).toContain('class="bg-red"');
    });

    it('removes style block with multiple preceding style blocks', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style>
.other { color: red; }
</style>

<style lang="f-tailwind">
& { bg-blue }
</style>`;
        const r = t(code)!;
        // f-tailwind block removed
        expect(r.code).not.toContain('f-tailwind');
        // Regular style block preserved
        expect(r.code).toContain('.other { color: red; }');
        expect(r.code).toContain('class="bg-blue"');
    });
});

describe(':slotted() without <slot> — warns', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('warns when :slotted() rules exist but no <slot> in template', () => {
        const code = `<template>
  <div>
    <p>no slot here</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  :slotted(span) { font-bold }
}
</style>`;
        t(code);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(':slotted() rules found but template has no <slot>'));
    });

    it('does NOT warn when :slotted() rules exist and <slot> is present', () => {
        const code = `<template>
  <div>
    <slot></slot>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  :slotted(span) { font-bold }
}
</style>`;
        t(code);
        const slottedWarns = warnSpy.mock.calls.filter((c) => String(c[0]).includes(':slotted() rules found'));
        expect(slottedWarns.length).toBe(0);
    });

    it('does NOT warn when no :slotted() rules exist', () => {
        const code = `<template>
  <div>
    <p>hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > p { text-sm }
}
</style>`;
        t(code);
        const slottedWarns = warnSpy.mock.calls.filter((c) => String(c[0]).includes(':slotted() rules found'));
        expect(slottedWarns.length).toBe(0);
    });

    it('detects nested <slot> inside template wrappers', () => {
        const code = `<template>
  <div>
    <template v-if="show">
      <slot></slot>
    </template>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  :slotted(span) { font-bold }
}
</style>`;
        t(code);
        const slottedWarns = warnSpy.mock.calls.filter((c) => String(c[0]).includes(':slotted() rules found'));
        expect(slottedWarns.length).toBe(0);
    });
});

describe('@apply bug — sibling and compound selectors work correctly', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('adjacent sibling selector applies to second .parent only', () => {
        const code = `<template>
  <div>
    <div class="parent">first</div>
    <div class="parent">second</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .parent { p-3 bg-green-600 }
  > .parent + .parent { border-t-2 border-yellow-400 }
}
</style>`;
        const r = t(code)!;
        // Both parents get base classes
        const matches = (r.code.match(/bg-green-600/g) || []).length;
        expect(matches).toBe(2);
        // Only the second parent gets the border
        const borderMatches = (r.code.match(/border-t-2/g) || []).length;
        expect(borderMatches).toBe(1);
        // The second div should have both base + border classes
        expect(r.code).toContain('class="parent p-3 bg-green-600 border-t-2 border-yellow-400"');
    });

    it('compound class selector .parent.is-current targets correctly', () => {
        const code = `<template>
  <div>
    <div class="parent">plain</div>
    <div class="parent is-current">current</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .parent { p-3 bg-green-600 }
  > .parent.is-current { bg-orange-500 }
}
</style>`;
        const r = t(code)!;
        // First parent: green only
        expect(r.code).toContain('class="parent p-3 bg-green-600"');
        // Second parent: green + orange (both rules match)
        expect(r.code).toContain('class="parent is-current p-3 bg-green-600 bg-orange-500"');
    });

    it('child selector inside parent targets nested element', () => {
        const code = `<template>
  <div>
    <div class="parent">
      <div class="child">nested</div>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .parent {
    p-3 bg-green-600
    > .child { bg-red-600 p-2 }
  }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="parent p-3 bg-green-600"');
        expect(r.code).toContain('class="child bg-red-600 p-2"');
    });

    it('all three combined — the full @apply bug scenario', () => {
        const code = `<template>
  <div>
    <div class="parent">
      <div class="child">red</div>
    </div>
    <div class="parent is-current">
      <div class="child">red</div>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .parent {
    p-3 bg-green-600
    > .child { bg-red-600 p-2 }
  }
  > .parent + .parent { border-t-2 border-yellow-400 }
  > .parent.is-current { bg-orange-500 }
}
</style>`;
        const r = t(code)!;
        // First parent: base classes only
        expect(r.code).toContain('class="parent p-3 bg-green-600"');
        // Second parent: base + sibling border + compound orange
        expect(r.code).toContain('border-t-2');
        expect(r.code).toContain('border-yellow-400');
        expect(r.code).toContain('bg-orange-500');
        // Both children get red
        const redMatches = (r.code.match(/bg-red-600/g) || []).length;
        expect(redMatches).toBe(2);
    });
});
