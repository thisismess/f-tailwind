import { describe, it, expect } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

describe('forwardTransform (CSS-nesting selectors)', () => {
    it('returns null for files without f-tailwind style', () => {
        const code = `<template><div class="foo">hi</div></template>`;
        expect(forwardTransform(code, 'test.vue')).toBeNull();
    });

    it('applies classes to root element via & selector', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { bg-gray-900 py-24 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="bg-gray-900 py-24"');
        expect(result.code).not.toContain('f-tailwind');
    });

    it('applies classes to nested elements by tag selector', () => {
        const code = `<template>
  <div>
    <span>inner</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900
  > span { text-white font-bold }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<div class="bg-gray-900">');
        expect(result.code).toContain('<span class="text-white font-bold">');
    });

    it('matches by class selector', () => {
        const code = `<template>
  <div>
    <ul>
      <li class="item">A</li>
      <li class="item">B</li>
      <li class="item">C</li>
    </ul>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-white
  > ul {
    > .item { px-4 py-2 text-sm }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<div class="bg-white">');
        // All three <li> should get the Tailwind classes appended to existing "item" class
        const matches = result.code.match(/class="item px-4 py-2 text-sm"/g);
        expect(matches).toHaveLength(3);
    });

    it('handles nested selectors with children of class groups', () => {
        const code = `<template>
  <div>
    <div class="card">
      <h2>Title</h2>
      <p>Body</p>
    </div>
    <div class="card">
      <h2>Title 2</h2>
      <p>Body 2</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > .card {
    bg-white rounded
    > h2 { text-xl font-bold }
    > p { text-gray-600 }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<div class="container">');
        // Both cards get the same classes
        const cardMatches = result.code.match(/class="card bg-white rounded"/g);
        expect(cardMatches).toHaveLength(2);
        // All h2s get text-xl font-bold
        const h2Matches = result.code.match(/class="text-xl font-bold"/g);
        expect(h2Matches).toHaveLength(2);
        // All ps get text-gray-600
        const pMatches = result.code.match(/class="text-gray-600"/g);
        expect(pMatches).toHaveLength(2);
    });

    it('merges with existing class attributes', () => {
        const code = `<template>
  <div class="my-component">hello</div>
</template>

<style lang="f-tailwind">
& { bg-gray-900 py-24 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="my-component bg-gray-900 py-24"');
    });

    it('handles the full sample-fixed.vue → sample.vue transform', () => {
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

        const result = forwardTransform(input, 'sample.vue')!;
        expect(result).not.toBeNull();

        const out = result.code;

        // Root div
        expect(out).toContain('class="bg-gray-900 py-24 sm:py-32"');
        // Nested div
        expect(out).toContain('class="mx-auto max-w-7xl px-6 lg:px-8"');
        // dl
        expect(out).toContain('class="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3"');
        // All 3 stat divs (existing "stat" class + Tailwind classes)
        const statMatches = out.match(/class="stat mx-auto flex max-w-xs flex-col gap-y-4"/g);
        expect(statMatches).toHaveLength(3);
        // All 3 dts
        const dtMatches = out.match(/class="text-base\/7 text-gray-400"/g);
        expect(dtMatches).toHaveLength(3);
        // All 3 dds
        const ddMatches = out.match(/class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl"/g);
        expect(ddMatches).toHaveLength(3);

        // No f-tailwind style block should remain
        expect(out).not.toContain('f-tailwind');
        expect(out).not.toContain('<style');
    });

    it('handles sibling selectors at the same level', () => {
        const code = `<template>
  <div>
    <header>H</header>
    <main>M</main>
    <footer>F</footer>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex flex-col
  > header { bg-blue-500 text-white }
  > main { flex-1 }
  > footer { bg-gray-800 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<header class="bg-blue-500 text-white">');
        expect(result.code).toContain('<main class="flex-1">');
        expect(result.code).toContain('<footer class="bg-gray-800">');
    });

    it('matches all elements of the same tag', () => {
        const code = `<template>
  <ul>
    <li>A</li>
    <li>B</li>
    <li>C</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  list-none
  > li { px-4 py-2 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        const liMatches = result.code.match(/class="px-4 py-2"/g);
        expect(liMatches).toHaveLength(3);
    });

    it('handles comma-separated selectors', () => {
        const code = `<template>
  <div>
    <dt>Label</dt>
    <dd>Value</dd>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > dt, > dd { text-sm font-medium }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<dt class="text-sm font-medium">');
        expect(result.code).toContain('<dd class="text-sm font-medium">');
    });

    it('handles CSS comments without breaking', () => {
        const code = `<template>
  <div>
    <span>hi</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  /* container styles */
  bg-gray-900
  > span { text-white }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-gray-900"');
        expect(result.code).toContain('class="text-white"');
    });
});
