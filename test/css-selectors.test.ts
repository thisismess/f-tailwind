/**
 * Comprehensive CSS Selector test suite for f-tailwind.
 *
 * Organized by CSS Selectors Level 4 spec categories.
 * Tests what our template-time selector engine supports when
 * matching `<style lang="f-tailwind">` rules against the Vue template AST.
 */
import { describe, it, expect } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

function transform(code: string) {
    return forwardTransform(code, 'test.vue');
}

// =============================================================================
// §1 — Universal selector: *
// =============================================================================

describe('CSS Selectors: * (universal)', () => {
    it('> * matches all direct children', () => {
        const r = transform(`<template>
  <div>
    <h1>T</h1>
    <p>B</p>
    <span>F</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > * { mb-4 }
}
</style>`)!;
        expect(r.code.match(/class="mb-4"/g)).toHaveLength(3);
    });

    it('bare * as descendant matches all elements at any depth', () => {
        const r = transform(`<template>
  <div>
    <div>
      <span>deep</span>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  * { text-inherit }
}
</style>`)!;
        // inner div + span = 2 descendants
        expect(r.code.match(/class="text-inherit"/g)).toHaveLength(2);
    });
});

// =============================================================================
// §2 — Type (element) selector: tag
// =============================================================================

describe('CSS Selectors: type (tag)', () => {
    it('> tag matches direct child by tag name', () => {
        const r = transform(`<template>
  <div>
    <p>hi</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p { text-sm }
}
</style>`)!;
        expect(r.code).toContain('class="text-sm"');
    });

    it('tag (descendant) matches at any depth', () => {
        const r = transform(`<template>
  <div>
    <div>
      <p>deep</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  p { text-red-500 }
}
</style>`)!;
        expect(r.code).toContain('class="text-red-500"');
    });

    it('matches Vue component tags (PascalCase)', () => {
        const r = transform(`<template>
  <div>
    <MyBtn>go</MyBtn>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > MyBtn { mt-2 }
}
</style>`)!;
        expect(r.code).toContain('<MyBtn class="mt-2">');
    });

    it('matches kebab-case component tags', () => {
        const r = transform(`<template>
  <div>
    <my-btn>go</my-btn>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > my-btn { mt-2 }
}
</style>`)!;
        expect(r.code).toContain('<my-btn class="mt-2">');
    });
});

// =============================================================================
// §3 — Class selector: .class
// =============================================================================

describe('CSS Selectors: .class', () => {
    it('> .class matches direct child with that class', () => {
        const r = transform(`<template>
  <div>
    <p class="intro">hi</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .intro { text-lg }
}
</style>`)!;
        expect(r.code).toContain('class="intro text-lg"');
    });

    it('.class (descendant) matches at any depth', () => {
        const r = transform(`<template>
  <div>
    <div>
      <p class="target">deep</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  .target { font-bold }
}
</style>`)!;
        expect(r.code).toContain('class="target font-bold"');
    });

    it('.a.b matches elements with BOTH classes', () => {
        const r = transform(`<template>
  <div>
    <div class="card">plain</div>
    <div class="card featured">special</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  grid
  > .card { p-4 }
  > .card.featured { ring-2 }
}
</style>`)!;
        expect(r.code).toContain('class="card p-4"');
        expect(r.code).toContain('class="card featured p-4 ring-2"');
    });

    it('.a.b.c matches elements with ALL three classes', () => {
        const r = transform(`<template>
  <div>
    <div class="a b">two</div>
    <div class="a b c">three</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .a.b.c { font-bold }
}
</style>`)!;
        expect(r.code.match(/class="a b c font-bold"/g)).toHaveLength(1);
        expect(r.code).toContain('class="a b">');
    });
});

// =============================================================================
// §4 — ID selector: #id
// =============================================================================

describe('CSS Selectors: #id', () => {
    it('> #myId matches direct child with that id', () => {
        const r = transform(`<template>
  <div>
    <section id="hero">content</section>
  </div>
</template>

<style lang="f-tailwind">
& {
  min-h-screen
  > #hero { py-24 text-center }
}
</style>`)!;
        expect(r.code).toContain('class="py-24 text-center"');
        expect(r.code).toContain('id="hero"');
    });

    it('#id (descendant) matches at any depth', () => {
        const r = transform(`<template>
  <div>
    <div>
      <p id="target">deep</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  #target { font-bold }
}
</style>`)!;
        expect(r.code).toContain('class="font-bold"');
    });

    it('tag#id matches only if both tag and id match', () => {
        const r = transform(`<template>
  <div>
    <div id="hero">div hero</div>
    <section id="other">section</section>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > div#hero { bg-blue-500 }
}
</style>`)!;
        expect(r.code).toContain('class="bg-blue-500"');
        // section should not match
        expect(r.code.match(/bg-blue-500/g)).toHaveLength(1);
    });

    it('.class#id compound selector', () => {
        const r = transform(`<template>
  <div>
    <div class="panel" id="main">content</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .panel#main { p-8 }
}
</style>`)!;
        expect(r.code).toContain('class="panel p-8"');
    });
});

// =============================================================================
// §5 — Attribute selectors: [attr], [attr=val]
// =============================================================================

describe('CSS Selectors: [attr]', () => {
    it('[attr] matches element with boolean attribute', () => {
        const r = transform(`<template>
  <div>
    <button disabled>no</button>
    <button>yes</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > [disabled] { opacity-50 }
}
</style>`)!;
        expect(r.code).toContain('class="opacity-50"');
        expect(r.code.match(/class="opacity-50"/g)).toHaveLength(1);
    });

    it('[attr="val"] matches element with exact attribute value', () => {
        const r = transform(`<template>
  <div>
    <input type="text" />
    <input type="password" />
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > [type="text"] { border-blue-500 }
}
</style>`)!;
        expect(r.code).toContain('class="border-blue-500"');
        expect(r.code.match(/class="border-blue-500"/g)).toHaveLength(1);
    });

    it('tag[attr="val"] combined selector', () => {
        const r = transform(`<template>
  <form>
    <input type="text" />
    <select>
      <option>A</option>
    </select>
  </form>
</template>

<style lang="f-tailwind">
& {
  space-y-2
  > input[type="text"] { border rounded px-3 }
}
</style>`)!;
        expect(r.code).toContain('class="border rounded px-3"');
    });

    it('.cls[attr] combined selector', () => {
        const r = transform(`<template>
  <div>
    <button class="btn" disabled>disabled</button>
    <button class="btn">enabled</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > .btn[disabled] { cursor-not-allowed }
}
</style>`)!;
        expect(r.code).toContain('cursor-not-allowed');
        expect(r.code.match(/cursor-not-allowed/g)).toHaveLength(1);
    });
});

// =============================================================================
// §6 — Compound selectors (everything combined)
// =============================================================================

describe('CSS Selectors: compound selectors', () => {
    it('tag.class#id matches all constraints', () => {
        const r = transform(`<template>
  <div>
    <div class="panel" id="main">match</div>
    <div class="panel" id="side">wrong id</div>
    <section class="panel" id="main">wrong tag</section>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > div.panel#main { bg-white }
}
</style>`)!;
        expect(r.code.match(/bg-white/g)).toHaveLength(1);
    });
});

// =============================================================================
// §7 — Child combinator: >
// =============================================================================

describe('CSS Selectors: > (child combinator)', () => {
    it('> only matches direct children, not deeper', () => {
        const r = transform(`<template>
  <div>
    <p>direct</p>
    <div>
      <p>nested</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > p { font-bold }
}
</style>`)!;
        expect(r.code.match(/class="font-bold"/g)).toHaveLength(1);
    });
});

// =============================================================================
// §8 — Descendant combinator (space)
// =============================================================================

describe('CSS Selectors: descendant (space)', () => {
    it('matches at any depth', () => {
        const r = transform(`<template>
  <div>
    <p>1</p>
    <div>
      <p>2</p>
      <div>
        <p>3</p>
      </div>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  p { text-sm }
}
</style>`)!;
        expect(r.code.match(/class="text-sm"/g)).toHaveLength(3);
    });
});

// =============================================================================
// §9 — Adjacent sibling combinator: +
// =============================================================================

describe('CSS Selectors: + (adjacent sibling)', () => {
    it('> h2 + p matches a p immediately after an h2', () => {
        const r = transform(`<template>
  <div>
    <h2>Title</h2>
    <p>First para</p>
    <p>Second para</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > h2 + p { mt-0 text-lg }
}
</style>`)!;
        // only the first <p> (immediately after h2) should match
        expect(r.code.match(/text-lg/g)).toHaveLength(1);
    });

    it('> label + input matches each input right after a label', () => {
        const r = transform(`<template>
  <form>
    <label>Name</label>
    <input type="text" />
    <label>Email</label>
    <input type="email" />
  </form>
</template>

<style lang="f-tailwind">
& {
  space-y-2
  > label + input { ml-2 border }
}
</style>`)!;
        expect(r.code.match(/class="ml-2 border"/g)).toHaveLength(2);
    });

    it('+ does NOT match when there is a different element in between', () => {
        const r = transform(`<template>
  <div>
    <h2>Title</h2>
    <hr />
    <p>Not adjacent to h2</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > h2 + p { text-lg }
}
</style>`)!;
        // hr is between h2 and p, so p is NOT adjacent to h2
        expect(r.code).not.toContain('text-lg');
    });

    it('+ with class selectors: > .label + .field', () => {
        const r = transform(`<template>
  <div>
    <span class="label">Name</span>
    <span class="field">John</span>
    <span class="label">Age</span>
    <span class="field">30</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  grid
  > .label + .field { font-bold }
}
</style>`)!;
        expect(r.code.match(/font-bold/g)).toHaveLength(2);
    });

    it('descendant + sibling: .a + .b inside a nested container', () => {
        const r = transform(`<template>
  <div>
    <section>
      <span class="a">A</span>
      <span class="b">B</span>
    </section>
  </div>
</template>

<style lang="f-tailwind">
& {
  .a + .b { font-bold }
}
</style>`)!;
        expect(r.code).toContain('class="b font-bold"');
    });

    it('descendant + sibling: .item + .item for margin-top pattern', () => {
        const r = transform(`<template>
  <div>
    <ul>
      <li class="item">One</li>
      <li class="item">Two</li>
      <li class="item">Three</li>
    </ul>
  </div>
</template>

<style lang="f-tailwind">
& {
  .item + .item { mt-4 }
}
</style>`)!;
        // First .item has no preceding .item sibling — should NOT match
        // Second and third .item follow another .item — should match
        expect(r.code.match(/mt-4/g)).toHaveLength(2);
    });
});

// =============================================================================
// §10 — General sibling combinator: ~
// =============================================================================

describe('CSS Selectors: ~ (general sibling)', () => {
    it('> h2 ~ p matches all p siblings AFTER the h2', () => {
        const r = transform(`<template>
  <div>
    <p>Before</p>
    <h2>Title</h2>
    <p>After 1</p>
    <p>After 2</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > h2 ~ p { text-gray-600 }
}
</style>`)!;
        // only the two <p>s AFTER <h2>, not the one before
        expect(r.code.match(/class="text-gray-600"/g)).toHaveLength(2);
    });

    it('~ skips non-matching siblings in between', () => {
        const r = transform(`<template>
  <div>
    <h2>Title</h2>
    <hr />
    <p>After hr</p>
    <span>Span</span>
    <p>Later</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > h2 ~ p { italic }
}
</style>`)!;
        expect(r.code.match(/class="italic"/g)).toHaveLength(2);
    });

    it('~ does not match siblings BEFORE the anchor', () => {
        const r = transform(`<template>
  <div>
    <p>Before 1</p>
    <p>Before 2</p>
    <h2>Anchor</h2>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > h2 ~ p { underline }
}
</style>`)!;
        // no <p> after <h2>, so nothing matches
        expect(r.code).not.toContain('underline');
    });

    it('descendant ~ sibling: h2 ~ p inside a nested container', () => {
        const r = transform(`<template>
  <div>
    <article>
      <h2>Title</h2>
      <p>First</p>
      <p>Second</p>
    </article>
  </div>
</template>

<style lang="f-tailwind">
& {
  h2 ~ p { text-gray-500 }
}
</style>`)!;
        expect(r.code.match(/text-gray-500/g)).toHaveLength(2);
    });
});

// =============================================================================
// §11 — Pseudo-classes (stripped at template-match time)
// =============================================================================

describe('CSS Selectors: pseudo-classes (stripped)', () => {
    it(':hover is stripped — matches base selector', () => {
        const r = transform(`<template>
  <div>
    <a>link</a>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > a:hover { underline }
}
</style>`)!;
        expect(r.code).toContain('class="underline"');
    });

    it(':first-child is resolved — matches only first element', () => {
        const r = transform(`<template>
  <ul>
    <li>A</li>
    <li>B</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  list-none
  > li:first-child { font-bold }
}
</style>`)!;
        // :first-child is resolved at compile time — only first li matches
        expect(r.code.match(/class="font-bold"/g)).toHaveLength(1);
    });

    it(':not(.class) is evaluated — excludes matching elements', () => {
        const r = transform(`<template>
  <div>
    <p class="special">A</p>
    <p>B</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p:not(.special) { text-sm }
}
</style>`)!;
        // :not(.special) is evaluated at compile time — only the second <p> matches
        expect(r.code.match(/text-sm/g)).toHaveLength(1);
        expect(r.code).toContain('<p class="special">A</p>');
        expect(r.code).toContain('<p class="text-sm">B</p>');
    });

    it('::before pseudo-element is stripped', () => {
        const r = transform(`<template>
  <div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p::before { content-none }
}
</style>`)!;
        expect(r.code).toContain('content-none');
    });

    it('chained pseudos: tag:first-child:not(.x) matches only first non-.x', () => {
        const r = transform(`<template>
  <div>
    <li>A</li>
    <li>B</li>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > li:first-child:not(.disabled) { opacity-100 }
}
</style>`)!;
        // :first-child resolved + :not(.disabled) evaluated — only first li matches
        expect(r.code.match(/class="opacity-100"/g)).toHaveLength(1);
    });
});

// =============================================================================
// §12 — Selector lists (comma-separated)
// =============================================================================

describe('CSS Selectors: selector lists (comma)', () => {
    it('> dt, > dd matches both', () => {
        const r = transform(`<template>
  <dl>
    <dt>K</dt>
    <dd>V</dd>
  </dl>
</template>

<style lang="f-tailwind">
& {
  grid
  > dt, > dd { text-sm }
}
</style>`)!;
        expect(r.code.match(/class="text-sm"/g)).toHaveLength(2);
    });

    it('mixed selector types in comma list', () => {
        const r = transform(`<template>
  <div>
    <h1>Title</h1>
    <p class="lead">Intro</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > h1, > .lead { font-bold }
}
</style>`)!;
        expect(r.code).toContain('<h1 class="font-bold">');
        expect(r.code).toContain('class="lead font-bold"');
    });
});

// =============================================================================
// §13 — Nesting context (CSS Nesting spec / &)
// =============================================================================

describe('CSS Selectors: nesting (&)', () => {
    it('& matches template root(s)', () => {
        const r = transform(`<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { bg-white }
</style>`)!;
        expect(r.code).toContain('class="bg-white"');
    });

    it('& with fragments matches ALL roots', () => {
        const r = transform(`<template>
  <header>H</header>
  <main>M</main>
  <footer>F</footer>
</template>

<style lang="f-tailwind">
& { text-sm }
</style>`)!;
        expect(r.code.match(/class="text-sm"/g)).toHaveLength(3);
    });

    it('deeply nested & > ... > ... > ...', () => {
        const r = transform(`<template>
  <div>
    <section>
      <article>
        <p>deep</p>
      </article>
    </section>
  </div>
</template>

<style lang="f-tailwind">
& {
  min-h-screen
  > section {
    max-w-4xl
    > article {
      prose
      > p { text-sm }
    }
  }
}
</style>`)!;
        expect(r.code).toContain('class="min-h-screen"');
        expect(r.code).toContain('class="max-w-4xl"');
        expect(r.code).toContain('class="prose"');
        expect(r.code).toContain('class="text-sm"');
    });
});

// =============================================================================
// §14 — Multi-rule accumulation (same element, multiple rules)
// =============================================================================

describe('CSS Selectors: multi-rule accumulation', () => {
    it('element matching > p AND > .intro gets both rule sets', () => {
        const r = transform(`<template>
  <div>
    <p class="intro">text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > p { text-base leading-relaxed }
  > .intro { text-lg italic }
}
</style>`)!;
        expect(r.code).toContain('text-base');
        expect(r.code).toContain('leading-relaxed');
        expect(r.code).toContain('text-lg');
        expect(r.code).toContain('italic');
    });

    it('element matching *, tag, and .class gets all three', () => {
        const r = transform(`<template>
  <div>
    <p class="intro">text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > * { mb-4 }
  > p { text-base }
  > .intro { italic }
}
</style>`)!;
        expect(r.code).toContain('mb-4');
        expect(r.code).toContain('text-base');
        expect(r.code).toContain('italic');
    });
});
