/**
 * Vue template language interaction tests.
 *
 * Tests for how f-tailwind handles Vue-specific template features:
 * - <template> wrapper flattening (transparent in Vue DOM)
 * - <slot> element skipping (not real DOM nodes)
 * - v-if/v-else sibling combinator correctness
 * - Dynamic :class binding awareness
 */
import { describe, it, expect, vi } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

function transform(code: string) {
    return forwardTransform(code, 'test.vue');
}

// =============================================================================
// §1 — <template> wrapper flattening
// =============================================================================

describe('Vue: <template> flattening', () => {
    it('<template v-if> children are hoisted to parent level', () => {
        const r = transform(`<template>
  <div>
    <template v-if="show">
      <p>A</p>
      <span>B</span>
    </template>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > p { text-red-500 }
  > span { text-blue-500 }
}
</style>`)!;
        expect(r.code).toContain('<p class="text-red-500">');
        expect(r.code).toContain('<span class="text-blue-500">');
    });

    it('<template v-for> children are hoisted to parent level', () => {
        const r = transform(`<template>
  <dl>
    <template v-for="item in items" :key="item.id">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
    </template>
  </dl>
</template>

<style lang="f-tailwind">
& {
  divide-y
  > dt { font-bold }
  > dd { text-gray-600 }
}
</style>`)!;
        expect(r.code).toContain('<dt class="font-bold">');
        expect(r.code).toContain('<dd class="text-gray-600">');
    });

    it('<template #slot> children are hoisted to component level', () => {
        const r = transform(`<template>
  <Layout>
    <template #header>
      <h1>Title</h1>
    </template>
    <template #default>
      <p>Body</p>
    </template>
  </Layout>
</template>

<style lang="f-tailwind">
& {
  > h1 { text-3xl }
  > p { text-base }
}
</style>`)!;
        expect(r.code).toContain('<h1 class="text-3xl">');
        expect(r.code).toContain('<p class="text-base">');
    });

    it('flattened children have correct parent for descendant selectors', () => {
        const r = transform(`<template>
  <div>
    <template v-if="expanded">
      <section>
        <p>deep</p>
      </section>
    </template>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > section {
    border
    > p { text-sm }
  }
}
</style>`)!;
        expect(r.code).toContain('class="border"');
        expect(r.code).toContain('class="text-sm"');
    });

    it('nested <template> wrappers are fully flattened', () => {
        const r = transform(`<template>
  <div>
    <template v-if="a">
      <template v-for="item in items" :key="item.id">
        <p>{{ item.text }}</p>
      </template>
    </template>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p { text-sm }
}
</style>`)!;
        expect(r.code).toContain('<p class="text-sm">');
    });
});

// =============================================================================
// §2 — <slot> element skipping
// =============================================================================

describe('Vue: <slot> skipping', () => {
    it('<slot> elements are not included in the template tree', () => {
        const r = transform(`<template>
  <div>
    <slot></slot>
    <p>content</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p { text-sm }
}
</style>`)!;
        // p should still match as a direct child
        expect(r.code).toContain('<p class="text-sm">');
        // slot should not have any class added
        expect(r.code).toContain('<slot></slot>');
    });

    it('named <slot> elements are skipped', () => {
        const r = transform(`<template>
  <div>
    <slot name="header"></slot>
    <slot name="footer"></slot>
  </div>
</template>

<style lang="f-tailwind">
& { flex flex-col }
</style>`)!;
        expect(r.code).toContain('class="flex flex-col"');
        expect(r.code).toContain('<slot name="header"></slot>');
        expect(r.code).toContain('<slot name="footer"></slot>');
    });
});

// =============================================================================
// §3 — v-if/v-else sibling combinator correctness
// =============================================================================

describe('Vue: v-if/v-else sibling combinators', () => {
    it('sibling combinator does NOT match across v-if/v-else branches', () => {
        const r = transform(`<template>
  <div>
    <span v-if="mode === 'a'">A</span>
    <span v-else>B</span>
    <p>Always here</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > span + span { text-red-500 }
}
</style>`)!;
        // The two spans are v-if/v-else alternatives — they never coexist.
        // span + span should NOT match.
        expect(r.code).not.toContain('text-red-500');
    });

    it('sibling combinator works correctly AFTER a v-if/v-else chain', () => {
        const r = transform(`<template>
  <div>
    <span v-if="a">A</span>
    <span v-else>B</span>
    <p>After</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > span + p { font-bold }
}
</style>`)!;
        // The p is always after whichever span renders — it's a real adjacent sibling
        expect(r.code).toContain('<p class="font-bold">');
    });

    it('general sibling combinator skips v-else alternatives', () => {
        const r = transform(`<template>
  <div>
    <h2>Title</h2>
    <p v-if="a">A</p>
    <p v-else>B</p>
    <span>Footer</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > h2 ~ span { italic }
}
</style>`)!;
        // h2 ~ span should match — span is a general sibling after h2
        expect(r.code).toContain('<span class="italic">');
    });

    it('v-if/v-else-if/v-else chain: none match sibling combinators with each other', () => {
        const r = transform(`<template>
  <div>
    <div v-if="s === 'a'" class="a">A</div>
    <div v-else-if="s === 'b'" class="b">B</div>
    <div v-else class="c">C</div>
    <footer>end</footer>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .a + .b { text-red-500 }
  > .b + .c { text-red-500 }
  > .a + footer { mt-4 }
  > .b + footer { mt-4 }
  > .c + footer { mt-4 }
}
</style>`)!;
        // Cross-branch: .a + .b and .b + .c should NOT match
        expect(r.code).not.toContain('text-red-500');
        // Each branch + footer matches (footer is always present after the chain).
        // All three rules add mt-4, so it accumulates.
        expect(r.code).toContain('mt-4');
    });

    it('flattened <template v-if> children inherit conditional grouping', () => {
        const r = transform(`<template>
  <div>
    <template v-if="mode === 'grid'">
      <div class="grid-item">A</div>
      <div class="grid-item">B</div>
    </template>
    <template v-else>
      <ul>
        <li>A</li>
        <li>B</li>
      </ul>
    </template>
    <footer>end</footer>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > .grid-item { p-2 }
  > ul { list-none }
  > .grid-item + ul { text-red-500 }
  > .grid-item + footer { mt-4 }
}
</style>`)!;
        // .grid-item + ul should NOT match (different conditional branches)
        expect(r.code).not.toContain('text-red-500');
        // .grid-item + footer should NOT match either:
        // After flattening, the grid-items are in the v-if branch and
        // the next non-alternative sibling after .grid-item B is footer
        // Actually .grid-item(B) + footer SHOULD match since footer is not conditional
        expect(r.code).toContain('<footer class="mt-4">');
    });

    it('elements within same v-if branch ARE real siblings', () => {
        const r = transform(`<template>
  <div>
    <template v-if="show">
      <h2>Title</h2>
      <p>Body</p>
    </template>
    <template v-else>
      <span>Fallback</span>
    </template>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > h2 + p { mt-0 }
}
</style>`)!;
        // h2 and p are in the same v-if branch — they're real siblings
        expect(r.code).toContain('<p class="mt-0">');
    });
});

// =============================================================================
// §4 — Dynamic :class binding awareness
// =============================================================================

describe('Vue: dynamic :class warnings', () => {
    it('warns with dynamic class hint when class selector is unmatched and :class exists', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        transform(`<template>
  <div>
    <button :class="{ active: isActive }">Click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .active { bg-blue-500 }
}
</style>`);

        const warnings = warnSpy.mock.calls.map((c) => c[0] as string);
        const dynamicHint = warnings.find((w) => w.includes('.active') && w.includes('dynamic :class'));
        expect(dynamicHint).toBeDefined();

        warnSpy.mockRestore();
    });

    it('does not add dynamic class hint when no :class bindings exist', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        transform(`<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .nonexistent { bg-blue-500 }
}
</style>`);

        const warnings = warnSpy.mock.calls.map((c) => c[0] as string);
        const dynamicHint = warnings.find((w) => w.includes('dynamic :class'));
        expect(dynamicHint).toBeUndefined();
        // Should still warn about unmatched selector
        const unmatchedWarn = warnings.find((w) => w.includes('.nonexistent'));
        expect(unmatchedWarn).toBeDefined();

        warnSpy.mockRestore();
    });

    it('static class still works alongside dynamic :class', () => {
        const r = transform(`<template>
  <div>
    <button class="btn" :class="{ active: isActive }">Click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .btn { px-4 py-2 }
}
</style>`)!;
        // Static .btn class should match fine
        expect(r.code).toContain('class="btn px-4 py-2"');
        // Dynamic :class should be preserved
        expect(r.code).toContain(':class="{ active: isActive }"');
    });
});

// =============================================================================
// §5 — Vue built-in components (Transition, Teleport, etc.)
// =============================================================================

describe('Vue: transparent built-in components are flattened', () => {
    it('<Transition> is flattened — children hoisted to parent level', () => {
        const r = transform(`<template>
  <div>
    <Transition name="fade">
      <p v-if="show">content</p>
    </Transition>
  </div>
</template>

<style lang="f-tailwind">
& {
  relative
  > p { absolute inset-0 }
}
</style>`)!;
        // <p> is hoisted through <Transition> and matches > p
        expect(r.code).toContain('class="absolute inset-0"');
    });

    it('<Teleport> is flattened — children hoisted to parent level', () => {
        const r = transform(`<template>
  <div>
    <Teleport to="body">
      <div class="modal">content</div>
    </Teleport>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > .modal { fixed inset-0 }
}
</style>`)!;
        // <div class="modal"> is hoisted through <Teleport>
        expect(r.code).toContain('class="modal fixed inset-0"');
    });

    it('<KeepAlive> is flattened — children hoisted to parent level', () => {
        const r = transform(`<template>
  <div>
    <KeepAlive>
      <component :is="currentView"></component>
    </KeepAlive>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > component { flex-1 }
}
</style>`)!;
        // <component> is hoisted through <KeepAlive>
        expect(r.code).toContain('class="flex-1"');
    });
});
