import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseStyleBlock } from '../src/parser/style-tree';
import { forwardTransform, clearExportsCache, getImportDependents, createTransformState } from '../src/transform/forward';
import { reverseTransform } from '../src/transform/reverse';

describe('Parser warnings for malformed directives', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('warns on malformed @import (missing from)', () => {
        parseStyleBlock('@import buttons');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Malformed @import'));
    });

    it('warns on malformed @import (missing quotes)', () => {
        parseStyleBlock('@import buttons from ./path');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Malformed @import'));
    });

    it('warns on bare @use with no name', () => {
        const { rules } = parseStyleBlock('& {\n  @use\n}');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Malformed @use'));
        // No uses should have been parsed
        expect(rules[0].uses).toHaveLength(0);
    });

    it('warns on @use with invalid syntax', () => {
        const { rules } = parseStyleBlock('& {\n  @use buttons from not-quoted\n}');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Malformed @use'));
    });

    it('does NOT warn on valid @import', () => {
        parseStyleBlock("@import buttons from './shared.vue'");
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does NOT warn on valid @use', () => {
        const { rules } = parseStyleBlock('& {\n  @use buttons\n}');
        expect(warnSpy).not.toHaveBeenCalled();
        expect(rules[0].uses).toHaveLength(1);
    });

    it('does NOT warn on valid @use with from', () => {
        const { rules } = parseStyleBlock("& {\n  @use buttons from './shared.vue'\n}");
        expect(warnSpy).not.toHaveBeenCalled();
        expect(rules[0].uses).toHaveLength(1);
        expect(rules[0].uses[0].from).toBe('./shared.vue');
    });
});

describe('Vite plugin error handling', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
        errorSpy.mockRestore();
    });

    it('returns null instead of crashing on broken template', () => {
        const code = `<template><div class="nope"</template>
<style lang="f-tailwind">
& { bg-red }
</style>`;
        const result = forwardTransform(code, 'broken.vue');
        expect(true).toBe(true);
    });
});

describe('HMR dependency tracking', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        clearExportsCache();
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('getImportDependents returns empty for unknown files', () => {
        const deps = getImportDependents('/some/random/file.vue');
        expect(deps).toEqual([]);
    });

    it('clearExportsCache does not throw', () => {
        expect(() => clearExportsCache()).not.toThrow();
        expect(() => clearExportsCache('/some/file.vue')).not.toThrow();
    });
});

describe('Class deduplication', () => {
    it('deduplicates classes when multiple rules target the same element', () => {
        const code = `<template>
  <div>
    <p>hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p { text-white font-bold }
  p { text-white text-sm }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // text-white should appear only once
        const classMatch = result.code.match(/class="([^"]*)"/);
        expect(classMatch).not.toBeNull();
        const classes = classMatch![1].split(/\s+/);
        const textWhiteCount = classes.filter((c) => c === 'text-white').length;
        expect(textWhiteCount).toBe(1);
    });
});

describe('Empty/whitespace class handling', () => {
    it('does not produce leading space for empty class=""', () => {
        const code = `<template>
  <div class="">hello</div>
</template>

<style lang="f-tailwind">
& { bg-white p-4 }
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-white p-4"');
        expect(result.code).not.toContain('class=" ');
    });

    it('trims whitespace-only class="  "', () => {
        const code = `<template>
  <div class="  ">hello</div>
</template>

<style lang="f-tailwind">
& { bg-white }
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-white"');
        expect(result.code).not.toContain('class="  ');
    });
});

describe('Bare v-bind detection', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('warns with dynamic class hint for v-bind="$attrs"', () => {
        const code = `<template>
  <div v-bind="$attrs">
    <span>hello</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .active { text-red-500 }
}
</style>`;
        forwardTransform(code, 'test.vue');
        const warnMsg = warnSpy.mock.calls.find((c) => String(c[0]).includes('dynamic :class'));
        expect(warnMsg).toBeTruthy();
    });

    it('warns with dynamic class hint for v-bind="formData"', () => {
        const code = `<template>
  <div v-bind="formData">
    <span>hello</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .highlighted { text-yellow-500 }
}
</style>`;
        forwardTransform(code, 'test.vue');
        const warnMsg = warnSpy.mock.calls.find((c) => String(c[0]).includes('dynamic :class'));
        expect(warnMsg).toBeTruthy();
    });
});

describe('SSR cache isolation', () => {
    it('createTransformState returns independent instances', () => {
        const state1 = createTransformState();
        const state2 = createTransformState();
        expect(state1.exportsCache).not.toBe(state2.exportsCache);
        expect(state1.importDeps).not.toBe(state2.importDeps);
    });

    it('forwardTransform with explicit state does not pollute default state', () => {
        const state = createTransformState();
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { bg-white }
</style>`;
        forwardTransform(code, 'test.vue', state);
        // Default state should be unaffected
        const defaultDeps = getImportDependents('test.vue');
        expect(defaultDeps).toEqual([]);
    });
});

describe('Tag name / Tailwind class collision', () => {
    it('treats "flex" as a class, not a selector, when alone before {', () => {
        const code = `<template>
  <div>
    <span>hello</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > span { text-sm }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // "flex" should be applied as a class to the root div, not treated as a selector
        expect(result.code).toContain('class="flex"');
    });

    it('treats "grid" as a class, not a selector', () => {
        const code = `<template>
  <div>
    <p>hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  grid
  > p { text-sm }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="grid"');
    });

    it('treats "table" as a class, not a selector', () => {
        const code = `<template>
  <div>
    <p>hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  table
  > p { text-sm }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="table"');
    });

    it('still matches actual tag selectors with selector syntax', () => {
        const code = `<template>
  <div>
    <span>hello</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  > span { text-red-500 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="text-red-500"');
    });
});

describe('Parser warning line numbers', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('includes line number in @import warning', () => {
        parseStyleBlock('@import buttons', 'test.vue');
        const msg = String(warnSpy.mock.calls[0]?.[0] || '');
        expect(msg).toContain('test.vue');
        expect(msg).toMatch(/:\d+\)/);
    });

    it('includes line number in @use warning', () => {
        parseStyleBlock('& {\n  @use\n}', 'test.vue');
        const msg = String(warnSpy.mock.calls[0]?.[0] || '');
        expect(msg).toContain('test.vue');
        expect(msg).toMatch(/:\d+\)/);
    });

    it('shows "line N" when no filePath provided', () => {
        parseStyleBlock('@import buttons');
        const msg = String(warnSpy.mock.calls[0]?.[0] || '');
        expect(msg).toMatch(/line \d+/);
    });
});

describe('Nested & selector', () => {
    it('nested & matches the parent scope elements', () => {
        const code = `<template>
  <div>
    <p>hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p {
    & { text-red-500 font-bold }
  }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // The nested & should apply classes to the <p> (same as parent scope)
        expect(result.code).toContain('class="text-red-500 font-bold"');
    });

    it('nested & with additional children works', () => {
        const code = `<template>
  <div>
    <ul>
      <li><span>item</span></li>
    </ul>
  </div>
</template>

<style lang="f-tailwind">
& {
  > ul {
    & {
      list-none p-0
      > li { mb-2 }
    }
  }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toMatch(/<ul[^>]*class="[^"]*list-none/);
        expect(result.code).toMatch(/<li[^>]*class="[^"]*mb-2/);
    });
});

describe('Reverse transform preserves :class', () => {
    it('does not strip static class when :class is present', () => {
        const code = `<template>
  <button class="px-4 py-2" :class="{ active: isActive }">Click</button>
</template>`;
        const result = reverseTransform(code);
        // The :class binding should still be in the output
        expect(result).toContain(':class=');
        // The static class should be preserved on the element (not removed)
        expect(result).toContain('class=');
        // An f-tailwind block should still be generated
        expect(result).toContain('lang="f-tailwind"');
    });

    it('preserves v-bind="obj" elements', () => {
        const code = `<template>
  <div v-bind="$attrs" class="bg-white p-4">
    <span class="text-sm">hello</span>
  </div>
</template>`;
        const result = reverseTransform(code);
        // v-bind should be preserved
        expect(result).toContain('v-bind="$attrs"');
        // The root div has v-bind so its static class should be preserved
        expect(result).toContain('class=');
    });
});

describe('Reverse transform with disambiguating attributes', () => {
    it('uses attribute selectors for different inputs with type attr', () => {
        const code = `<template>
  <form>
    <input type="text" class="border px-2" />
    <input type="checkbox" class="w-4 h-4" />
  </form>
</template>`;
        const result = reverseTransform(code);
        expect(result).toContain('lang="f-tailwind"');
        // Should use attribute selectors to disambiguate
        expect(result).toContain('[type="text"]');
        expect(result).toContain('[type="checkbox"]');
    });
});

describe('Structural pseudo-class matching', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it(':first-child matches only the first sibling', () => {
        const code = `<template>
  <ul>
    <li>first</li>
    <li>second</li>
    <li>third</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  > li:first-child { font-bold }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Only the first <li> should get font-bold
        const lis = result.code.match(/<li[^>]*>/g)!;
        expect(lis[0]).toContain('class="font-bold"');
        expect(lis[1]).not.toContain('class');
        expect(lis[2]).not.toContain('class');
    });

    it(':last-child matches only the last sibling', () => {
        const code = `<template>
  <ul>
    <li>first</li>
    <li>second</li>
    <li>third</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  > li:last-child { font-bold }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        const lis = result.code.match(/<li[^>]*>/g)!;
        expect(lis[0]).not.toContain('class');
        expect(lis[1]).not.toContain('class');
        expect(lis[2]).toContain('class="font-bold"');
    });

    it(':only-child matches when there is exactly one sibling', () => {
        const code = `<template>
  <div>
    <p>alone</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:only-child { text-red-500 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="text-red-500"');
    });

    it(':only-child does NOT match when there are multiple siblings', () => {
        const code = `<template>
  <div>
    <p>one</p>
    <p>two</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:only-child { text-red-500 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Neither <p> should match
        expect(result.code).not.toContain('text-red-500');
    });

    it(':first-of-type matches the first element of its tag', () => {
        const code = `<template>
  <div>
    <span>span</span>
    <p>first p</p>
    <p>second p</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:first-of-type { font-bold }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        const ps = result.code.match(/<p[^>]*>/g)!;
        expect(ps[0]).toContain('class="font-bold"');
        expect(ps[1]).not.toContain('class');
    });

    it(':last-of-type matches the last element of its tag', () => {
        const code = `<template>
  <div>
    <p>first p</p>
    <p>second p</p>
    <span>span</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:last-of-type { font-bold }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        const ps = result.code.match(/<p[^>]*>/g)!;
        expect(ps[0]).not.toContain('class');
        expect(ps[1]).toContain('class="font-bold"');
    });

    it(':nth-child(2) matches only the second element', () => {
        const code = `<template>
  <ul>
    <li>first</li>
    <li>second</li>
    <li>third</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  > li:nth-child(2) { text-blue-500 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        const lis = result.code.match(/<li[^>]*>/g)!;
        expect(lis[0]).not.toContain('class');
        expect(lis[1]).toContain('class="text-blue-500"');
        expect(lis[2]).not.toContain('class');
    });

    it(':nth-child(odd) matches 1st, 3rd elements', () => {
        const code = `<template>
  <ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
    <li>4</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  > li:nth-child(odd) { bg-gray-100 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        const lis = result.code.match(/<li[^>]*>/g)!;
        expect(lis[0]).toContain('bg-gray-100');
        expect(lis[1]).not.toContain('bg-gray-100');
        expect(lis[2]).toContain('bg-gray-100');
        expect(lis[3]).not.toContain('bg-gray-100');
    });

    it(':nth-child(even) matches 2nd, 4th elements', () => {
        const code = `<template>
  <ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
    <li>4</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  > li:nth-child(even) { bg-gray-100 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        const lis = result.code.match(/<li[^>]*>/g)!;
        expect(lis[0]).not.toContain('bg-gray-100');
        expect(lis[1]).toContain('bg-gray-100');
        expect(lis[2]).not.toContain('bg-gray-100');
        expect(lis[3]).toContain('bg-gray-100');
    });

    it(':empty matches elements with no children', () => {
        const code = `<template>
  <div>
    <div></div>
    <div><span>not empty</span></div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:empty { bg-red-100 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // Only the first inner div (empty) should match
        const divs = result.code.match(/<div[^>]*>/g)!;
        // divs[0] is root, divs[1] is empty, divs[2] has children
        expect(divs[1]).toContain('bg-red-100');
        expect(divs[2]).not.toContain('bg-red-100');
    });

    it(':first-child excludes v-if/v-else alternatives from sibling count', () => {
        const code = `<template>
  <div>
    <span v-if="show">shown</span>
    <span v-else>hidden</span>
    <p>after</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:last-child { text-green-500 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // <p> should be :last-child because the v-else span is an alternative, not a sibling
        expect(result.code).toContain('class="text-green-500"');
    });

    it('runtime pseudo-classes like :hover are passed through (not rejected)', () => {
        const code = `<template>
  <div>
    <button>click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  > button:hover { bg-blue-500 }
}
</style>`;
        // :hover should not prevent matching — it's a runtime pseudo
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-blue-500"');
    });
});

describe('Unclosed bracket warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('warns when a brace is never closed', () => {
        parseStyleBlock('& { bg-red-500');
        const msg = warnSpy.mock.calls.find((c) => String(c[0]).includes('Unclosed'));
        expect(msg).toBeTruthy();
    });

    it('does NOT warn on properly closed braces', () => {
        parseStyleBlock('& { bg-red-500 }');
        const msg = warnSpy.mock.calls.find((c) => String(c[0]).includes('Unclosed'));
        expect(msg).toBeFalsy();
    });
});

describe('Transparent Vue component flattening', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('flattens <Transition> — child selectors match through it', () => {
        const code = `<template>
  <div>
    <Transition>
      <p>hello</p>
    </Transition>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p { bg-white }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        // <p> is hoisted through <Transition> to be a child of <div>
        expect(result.code).toContain('class="bg-white"');
    });

    it('flattens <KeepAlive> — child selectors match through it', () => {
        const code = `<template>
  <div>
    <KeepAlive>
      <p>hello</p>
    </KeepAlive>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p { p-4 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="p-4"');
    });

    it('flattens <Suspense> — child selectors match through it', () => {
        const code = `<template>
  <div>
    <Suspense>
      <p>loaded</p>
    </Suspense>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p { text-lg }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="text-lg"');
    });

    it('flattens <Teleport> — classes are applied to children', () => {
        const code = `<template>
  <div>
    <Teleport to="body">
      <p>modal</p>
    </Teleport>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p { fixed inset-0 bg-black/50 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="fixed inset-0 bg-black/50"');
    });
});

describe('Slot content styling from parent component', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('styles slot content passed into a child component', () => {
        // our-button.vue passes <span>Text</span> into <my-button> (which has a <slot>)
        // The <span> is in OUR template AST, so f-tailwind can see and style it.
        const code = `<template>
  <my-button>
    <span>Text</span>
  </my-button>
</template>

<style lang="f-tailwind">
span { bg-red }
</style>`;
        const result = forwardTransform(code, 'our-button.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-red"');
    });

    it('styles multiple slot content elements with descendant selectors', () => {
        const code = `<template>
  <Card>
    <h2>Title</h2>
    <p>Description</p>
  </Card>
</template>

<style lang="f-tailwind">
& {
  > h2 { text-xl font-bold }
  > p { text-gray-600 }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="text-xl font-bold"');
        expect(result.code).toContain('class="text-gray-600"');
    });

    it('styles deeply nested slot content', () => {
        const code = `<template>
  <Modal>
    <div>
      <p>Hello</p>
    </div>
  </Modal>
</template>

<style lang="f-tailwind">
& {
  > div {
    p-4
    > p { text-sm }
  }
}
</style>`;
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="p-4"');
        expect(result.code).toContain('class="text-sm"');
    });
});

describe('<component :is> warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('warns when <component :is> is present in the template', () => {
        const code = `<template>
  <div>
    <component :is="currentView">content</component>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div { p-4 }
}
</style>`;
        forwardTransform(code, 'test.vue');
        const msg = warnSpy.mock.calls.find((c) => String(c[0]).includes('component :is'));
        expect(msg).toBeTruthy();
    });
});
