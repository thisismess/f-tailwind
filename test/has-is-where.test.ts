import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

// Helper: transform and return result
function t(code: string) {
    return forwardTransform(code, 'test.vue');
}

describe(':has() — parent/relational selector', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('matches element with direct child: div:has(> span)', () => {
        const code = `<template>
  <div>
    <div><span>yes</span></div>
    <div><p>no</p></div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(> span) { bg-red }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('<div class="bg-red"><span>yes</span></div>');
        // Second div has no span child — should NOT match
        expect(r.code).toContain('<div><p>no</p></div>');
    });

    it('does NOT match when child is absent', () => {
        const code = `<template>
  <div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(> span) { bg-red }
}
</style>`;
        const r = t(code)!;
        // div has no span child, should not get the class
        expect(r.code).not.toContain('bg-red');
    });

    it('matches element with descendant at any depth: div:has(span)', () => {
        const code = `<template>
  <div>
    <div>
      <p><span>deep</span></p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(span) { bg-blue }
}
</style>`;
        const r = t(code)!;
        // The inner div has a span descendant (nested inside p)
        expect(r.code).toContain('class="bg-blue"');
    });

    it('matches element with adjacent sibling: div:has(+ p)', () => {
        const code = `<template>
  <div>
    <div>first</div>
    <p>second</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(+ p) { bg-green }
}
</style>`;
        const r = t(code)!;
        // The inner div has an adjacent sibling p
        expect(r.code).toContain('class="bg-green"');
    });

    it('matches element with general sibling: div:has(~ p)', () => {
        const code = `<template>
  <div>
    <div>first</div>
    <span>middle</span>
    <p>third</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(~ p) { bg-yellow }
}
</style>`;
        const r = t(code)!;
        expect(r.code).toContain('class="bg-yellow"');
    });

    it('supports comma-separated inner selectors: :has(> .a, > .b)', () => {
        const code = `<template>
  <div>
    <div><span class="a">a</span></div>
    <div><span class="b">b</span></div>
    <div><span class="c">c</span></div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(> .a, > .b) { ring }
}
</style>`;
        const r = t(code)!;
        // First two divs match (have .a or .b child), third doesn't
        const matches = (r.code.match(/class="ring"/g) || []).length;
        expect(matches).toBe(2);
    });

    it('supports chained combinators inside :has(): div:has(> ul > li)', () => {
        const code = `<template>
  <div>
    <div>
      <ul><li>item</li></ul>
    </div>
    <div>
      <ul></ul>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div:has(> ul > li) { border }
}
</style>`;
        const r = t(code)!;
        // First div has ul > li, second div has empty ul
        const matches = (r.code.match(/class="border"/g) || []).length;
        expect(matches).toBe(1);
    });

    it('combines :has() with other compound selectors: div.card:has(> img)', () => {
        const code = `<template>
  <div>
    <div class="card"><img src="x.png"></div>
    <div class="card"><p>no img</p></div>
    <div><img src="y.png"></div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > div.card:has(> img) { shadow-lg }
}
</style>`;
        const r = t(code)!;
        // Only the first div has both .card AND an img child
        const matches = (r.code.match(/shadow-lg/g) || []).length;
        expect(matches).toBe(1);
        expect(r.code).toContain('class="card shadow-lg"');
    });
});

describe(':is() / :where() — complex inner selectors', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it(':is(div > span) matches span that is direct child of div', () => {
        const code = `<template>
  <div>
    <div><span>match</span></div>
    <p><span>no match</span></p>
  </div>
</template>

<style lang="f-tailwind">
& {
  :is(div > span) { text-red }
}
</style>`;
        const r = t(code)!;
        // Only the span inside div should match, not the one inside p
        const matches = (r.code.match(/class="text-red"/g) || []).length;
        expect(matches).toBe(1);
    });

    it(':is(.a .b) matches .b that is descendant of .a', () => {
        const code = `<template>
  <div>
    <div class="a">
      <div>
        <span class="b">deep match</span>
      </div>
    </div>
    <span class="b">no match</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  :is(.a .b) { font-bold }
}
</style>`;
        const r = t(code)!;
        // Only the .b inside .a should match
        const matches = (r.code.match(/font-bold/g) || []).length;
        expect(matches).toBe(1);
    });

    it(':is(h1 + p) matches p adjacent after h1', () => {
        const code = `<template>
  <div>
    <h1>Title</h1>
    <p>intro</p>
    <p>body</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  :is(h1 + p) { text-lg }
}
</style>`;
        const r = t(code)!;
        // Only the first p (immediately after h1) should match
        const matches = (r.code.match(/class="text-lg"/g) || []).length;
        expect(matches).toBe(1);
    });

    it(':is() with comma-separated mix of simple and complex selectors', () => {
        const code = `<template>
  <div>
    <div><span class="a">a</span></div>
    <span class="b">b</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  :is(.b, div > .a) { underline }
}
</style>`;
        const r = t(code)!;
        // .b matches as simple, .a matches as div > .a
        const matches = (r.code.match(/underline/g) || []).length;
        expect(matches).toBe(2);
    });

    it(':where() works identically to :is()', () => {
        const code = `<template>
  <div>
    <div><span>match</span></div>
    <p><span>no match</span></p>
  </div>
</template>

<style lang="f-tailwind">
& {
  :where(div > span) { italic }
}
</style>`;
        const r = t(code)!;
        const matches = (r.code.match(/class="italic"/g) || []).length;
        expect(matches).toBe(1);
    });
});

describe(':not() — complex inner selectors', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        warnSpy.mockRestore();
    });

    it(':not(div > span) excludes span that is direct child of div', () => {
        const code = `<template>
  <div>
    <div><span>excluded</span></div>
    <p><span>included</span></p>
  </div>
</template>

<style lang="f-tailwind">
& {
  span:not(div > span) { text-green }
}
</style>`;
        const r = t(code)!;
        // The span inside p is not a direct child of div → matches :not(div > span)
        // The span inside div IS div > span → excluded
        const matches = (r.code.match(/text-green/g) || []).length;
        expect(matches).toBe(1);
    });

    it(':not(.container .item) excludes .item inside .container', () => {
        const code = `<template>
  <div>
    <div class="container">
      <span class="item">inside</span>
    </div>
    <span class="item">outside</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  .item:not(.container .item) { visible }
}
</style>`;
        const r = t(code)!;
        // Only the .item outside .container should match
        const matches = (r.code.match(/visible/g) || []).length;
        expect(matches).toBe(1);
    });
});
