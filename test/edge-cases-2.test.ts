import { describe, it, expect } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

// =============================================================================
// Selector features that our matcher SHOULD support
// =============================================================================

describe('selector: * (universal)', () => {
    it('> * matches all direct children', () => {
        const code = `<template>
  <div>
    <h1>Title</h1>
    <p>Body</p>
    <span>Footer</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > * { mb-4 last:mb-0 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<h1 class="mb-4 last:mb-0">');
        expect(result.code).toContain('<p class="mb-4 last:mb-0">');
        expect(result.code).toContain('<span class="mb-4 last:mb-0">');
    });
});

describe('selector: pseudo-classes', () => {
    it('> div:first-child matches only first div child', () => {
        const code = `<template>
  <div>
    <div>first</div>
    <div>second</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > div:first-child { font-bold }
}
</style>`;

        // :first-child is resolved at compile time — only the first div matches
        const result = forwardTransform(code, 'test.vue')!;
        const matches = result.code.match(/class="font-bold"/g);
        expect(matches).toHaveLength(1);
    });

    it('> .item:hover should match all .item elements', () => {
        const code = `<template>
  <ul>
    <li class="item">A</li>
    <li class="item">B</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  list-none
  > .item:hover { bg-gray-100 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        const matches = result.code.match(/class="item bg-gray-100"/g);
        expect(matches).toHaveLength(2);
    });
});

describe('selector: attribute selectors', () => {
    it('> [data-active] matches elements with that attribute', () => {
        const code = `<template>
  <div>
    <span data-active>active</span>
    <span>inactive</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > [data-active] { text-green-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="text-green-500"');
        expect(result.code.match(/class="text-green-500"/g)).toHaveLength(1);
    });
});

describe('selector: multiple classes (.foo.bar)', () => {
    it('> .card.featured matches elements with both classes', () => {
        const code = `<template>
  <div>
    <div class="card">normal</div>
    <div class="card featured">special</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  grid
  > .card { p-4 rounded }
  > .card.featured { ring-2 ring-blue-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // First card: only matches > .card
        expect(result.code).toContain('class="card p-4 rounded"');
        // Second card: matches both rules, should get both sets of classes
        expect(result.code).toContain('featured');
        expect(result.code).toContain('ring-2 ring-blue-500');
    });
});

// =============================================================================
// MagicString conflicts: same element targeted by multiple rules
// =============================================================================

describe('same element targeted by multiple rules', () => {
    it('element matched by both tag and class selector gets all classes', () => {
        const code = `<template>
  <div>
    <p class="intro">hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > p { text-base leading-relaxed }
  > .intro { text-lg font-medium }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // The <p class="intro"> matches both > p and > .intro
        // Both rules should contribute classes
        expect(result.code).toContain('text-base');
        expect(result.code).toContain('text-lg');
    });
});

// =============================================================================
// Descendant selectors (without >) — match at any depth
// =============================================================================

describe('descendant selectors (no >)', () => {
    it('matches elements at any depth', () => {
        const code = `<template>
  <div>
    <div>
      <div>
        <span>deep</span>
      </div>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  span { text-red-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<span class="text-red-500">');
    });

    it('matches multiple elements at different depths', () => {
        const code = `<template>
  <div>
    <p>shallow</p>
    <div>
      <p>deep</p>
      <div>
        <p>deeper</p>
      </div>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  p { text-gray-700 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        const matches = result.code.match(/class="text-gray-700"/g);
        expect(matches).toHaveLength(3);
    });

    it('descendant .class matches at any depth', () => {
        const code = `<template>
  <div>
    <div>
      <div class="target">found</div>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  relative
  .target { absolute inset-0 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="target absolute inset-0"');
    });
});

// =============================================================================
// Multiline opening tags
// =============================================================================

describe('multiline opening tags', () => {
    it('adds class to element whose opening tag spans multiple lines', () => {
        const code = `<template>
  <div>
    <button
      type="submit"
      @click="save"
    >
      Save
    </button>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > button { bg-blue-500 text-white px-4 py-2 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-blue-500 text-white px-4 py-2"');
        expect(result.code).toContain('type="submit"');
        expect(result.code).toContain('@click="save"');
    });

    it('merges with class on multiline opening tag', () => {
        const code = `<template>
  <div>
    <div
      class="card"
      v-for="item in items"
      :key="item.id"
    >
      {{ item.name }}
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  grid
  > .card { p-4 rounded shadow }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="card p-4 rounded shadow"');
    });
});

// =============================================================================
// Text nodes between elements (should be skipped correctly)
// =============================================================================

describe('text nodes between elements', () => {
    it('skips text nodes and still matches element children', () => {
        const code = `<template>
  <div>
    Some text before
    <span>element</span>
    Some text after
    <p>another</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > span { text-blue-500 }
  > p { text-green-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<span class="text-blue-500">');
        expect(result.code).toContain('<p class="text-green-500">');
        expect(result.code).toContain('Some text before');
        expect(result.code).toContain('Some text after');
    });
});

// =============================================================================
// Edge cases in the style block itself
// =============================================================================

describe('empty and degenerate style blocks', () => {
    it('handles empty style block gracefully', () => {
        const code = `<template>
  <div>hi</div>
</template>

<style lang="f-tailwind">
</style>`;

        const result = forwardTransform(code, 'test.vue');
        // Either null (no changes) or removes the empty style block
        if (result) {
            expect(result.code).not.toContain('f-tailwind');
        }
    });

    it('handles style block with only comments', () => {
        const code = `<template>
  <div>hi</div>
</template>

<style lang="f-tailwind">
/* TODO: add styles later */
</style>`;

        const result = forwardTransform(code, 'test.vue');
        if (result) {
            expect(result.code).not.toContain('f-tailwind');
        }
    });

    it('handles rule with empty body', () => {
        const code = `<template>
  <div>
    <span>hi</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  > span { }
}
</style>`;

        // Should not crash; span gets no classes
        const result = forwardTransform(code, 'test.vue');
        if (result) {
            expect(result.code).not.toContain('f-tailwind');
        }
    });
});

// =============================================================================
// Multiple <style lang="f-tailwind"> blocks
// =============================================================================

describe('multiple f-tailwind style blocks', () => {
    it('processes the first f-tailwind block (current behavior)', () => {
        const code = `<template>
  <div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
& { bg-white }
</style>

<style lang="f-tailwind">
& { > p { text-black } }
</style>`;

        // Current implementation finds first style block only
        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-white"');
    });
});

// =============================================================================
// <component :is>, <Teleport>, <Suspense>, <KeepAlive>
// =============================================================================

describe('Vue built-in special elements', () => {
    it('handles <component :is="..."> as an element', () => {
        const code = `<template>
  <div>
    <component :is="currentTab">content</component>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > component { mt-4 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="mt-4"');
        expect(result.code).toContain(':is="currentTab"');
    });

    it('handles <Teleport> children (Teleport is flattened)', () => {
        const code = `<template>
  <div>
    <Teleport to="body">
      <div class="modal">
        <p>Modal content</p>
      </div>
    </Teleport>
  </div>
</template>

<style lang="f-tailwind">
& {
  relative
  > .modal {
    fixed inset-0 bg-black/50
    > p { text-white text-center }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // Teleport is flattened, so .modal is a direct child of root div
        expect(result.code).toContain('class="modal fixed inset-0 bg-black/50"');
        expect(result.code).toContain('class="text-white text-center"');
    });
});

// =============================================================================
// v-html / v-text — element's runtime children differ from template
// =============================================================================

describe('v-html and v-text', () => {
    it('applies classes to element with v-html', () => {
        const code = `<template>
  <div>
    <div v-html="rawHtml"></div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > div { prose prose-lg max-w-none }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="prose prose-lg max-w-none"');
        expect(result.code).toContain('v-html="rawHtml"');
    });
});

// =============================================================================
// Boolean attributes and special HTML attrs
// =============================================================================

describe('boolean and special attributes', () => {
    it('handles elements with boolean attrs (disabled, open, etc.)', () => {
        const code = `<template>
  <div>
    <button disabled>Nope</button>
    <details open>
      <summary>Info</summary>
      <p>Details here</p>
    </details>
  </div>
</template>

<style lang="f-tailwind">
& {
  space-y-4
  > button { opacity-50 cursor-not-allowed px-4 py-2 }
  > details {
    border rounded
    > summary { font-bold cursor-pointer }
    > p { mt-2 text-sm }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="opacity-50 cursor-not-allowed px-4 py-2"');
        expect(result.code).toContain('disabled');
        expect(result.code).toContain('class="border rounded"');
        expect(result.code).toContain('open');
        expect(result.code).toContain('class="font-bold cursor-pointer"');
        expect(result.code).toContain('class="mt-2 text-sm"');
    });
});

// =============================================================================
// Class attribute edge cases
// =============================================================================

describe('class attribute edge cases', () => {
    it('handles empty class attribute', () => {
        const code = `<template>
  <div class="">hi</div>
</template>

<style lang="f-tailwind">
& { bg-white p-4 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-white p-4"');
    });

    it('handles class attribute with extra whitespace', () => {
        const code = `<template>
  <div class="  foo   bar  ">hi</div>
</template>

<style lang="f-tailwind">
& { bg-white p-4 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // Merges Tailwind classes with existing (preserves existing raw value)
        expect(result.code).toContain('bg-white');
        expect(result.code).toContain('p-4');
        expect(result.code).toContain('foo');
    });
});

// =============================================================================
// SFC ordering variations
// =============================================================================

describe('SFC block ordering', () => {
    it('handles style before template', () => {
        const code = `<style lang="f-tailwind">
& { bg-white p-8 }
</style>

<template>
  <div>content</div>
</template>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-white p-8"');
        expect(result.code).not.toContain('f-tailwind');
    });

    it('handles script, then style, then template', () => {
        const code = `<script setup>
const msg = 'hi'
</script>

<style lang="f-tailwind">
& { bg-gray-900 text-white }
</style>

<template>
  <div>{{ msg }}</div>
</template>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-gray-900 text-white"');
        expect(result.code).toContain('const msg =');
        expect(result.code).not.toContain('f-tailwind');
    });
});

// =============================================================================
// v-slot / #default / named slots on components
// =============================================================================

describe('v-slot and scoped slots', () => {
    it('applies classes to component using v-slot', () => {
        const code = `<template>
  <MyList v-slot="{ item }">
    <span>{{ item.name }}</span>
  </MyList>
</template>

<style lang="f-tailwind">
& {
  border rounded
  > span { text-sm }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="border rounded"');
        expect(result.code).toContain('class="text-sm"');
        expect(result.code).toContain('v-slot="{ item }"');
    });

    it('applies classes inside named slot template (flattened)', () => {
        const code = `<template>
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
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="text-3xl"');
        expect(result.code).toContain('class="text-base"');
    });
});

// =============================================================================
// Tailwind classes that look like CSS (potential parser confusion)
// =============================================================================

describe('Tailwind classes that resemble CSS syntax', () => {
    it('handles classes with slashes (aspect ratios, line-heights)', () => {
        const code = `<template>
  <div>
    <div>video</div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > div { aspect-w-16 aspect-h-9 }
  > p { text-base/7 leading-6/8 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('text-base/7');
        expect(result.code).toContain('leading-6/8');
    });

    it('handles classes with dots in arbitrary values', () => {
        const code = `<template>
  <div>hi</div>
</template>

<style lang="f-tailwind">
& { opacity-[0.5] w-[3.5rem] }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('opacity-[0.5]');
        expect(result.code).toContain('w-[3.5rem]');
    });

    it('handles classes with colons in arbitrary values', () => {
        const code = `<template>
  <div>hi</div>
</template>

<style lang="f-tailwind">
& { grid-cols-[1fr:2fr:1fr] supports-[display:grid]:grid }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('grid-cols-[1fr:2fr:1fr]');
        expect(result.code).toContain('supports-[display:grid]:grid');
    });
});

// =============================================================================
// @media / @supports / @layer in style block (PostCSS @rules)
// =============================================================================

describe('@rules in style block', () => {
    it('does not crash on @rules (they are skipped)', () => {
        const code = `<template>
  <div>hi</div>
</template>

<style lang="f-tailwind">
@layer components {
  & { bg-white }
}
</style>`;

        // @layer is an at-rule; our walkContainer skips non-rule nodes
        // The & rule is nested inside @layer, so it won't be found at the top level
        // This shouldn't crash
        const result = forwardTransform(code, 'test.vue');
        expect(result).not.toBeNull();
    });
});

// =============================================================================
// Interaction: v-for with nested v-if
// =============================================================================

describe('combined v-for + v-if', () => {
    it('applies classes to v-if inside v-for', () => {
        const code = `<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <span v-if="item.active" class="active">{{ item.name }}</span>
      <span v-else class="inactive">{{ item.name }}</span>
    </li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  list-none space-y-2
  > li {
    flex items-center
    > .active { text-green-600 font-bold }
    > .inactive { text-gray-400 line-through }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="active text-green-600 font-bold"');
        expect(result.code).toContain('class="inactive text-gray-400 line-through"');
        expect(result.code).toContain('class="flex items-center"');
    });
});

// =============================================================================
// Very deeply nested structure
// =============================================================================

describe('very deep nesting', () => {
    it('handles 6+ levels of nesting', () => {
        const code = `<template>
  <div>
    <section>
      <article>
        <div>
          <ul>
            <li>deep</li>
          </ul>
        </div>
      </article>
    </section>
  </div>
</template>

<style lang="f-tailwind">
& {
  min-h-screen
  > section {
    max-w-4xl mx-auto
    > article {
      prose
      > div {
        mt-8
        > ul {
          list-disc pl-6
          > li { text-sm }
        }
      }
    }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="min-h-screen"');
        expect(result.code).toContain('class="max-w-4xl mx-auto"');
        expect(result.code).toContain('class="prose"');
        expect(result.code).toContain('class="mt-8"');
        expect(result.code).toContain('class="list-disc pl-6"');
        expect(result.code).toContain('class="text-sm"');
    });
});
