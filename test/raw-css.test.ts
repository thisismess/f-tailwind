import { describe, it, expect } from 'vitest';
import { parseStyleBlock } from '../src/parser/style-tree';
import { forwardTransform } from '../src/transform/forward';

describe('raw CSS declarations — parser', () => {
    it('separates declarations (;) from classes', () => {
        const { rules } = parseStyleBlock(`& {
  bg-gray-900 py-24
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  px-24
}`);
        expect(rules[0].classes).toEqual(['bg-gray-900', 'py-24', 'px-24']);
        expect(rules[0].declarations).toEqual(['box-shadow: 0 4px 6px rgba(0,0,0,0.1);']);
    });

    it('handles declaration-only rule body', () => {
        const { rules } = parseStyleBlock(`& {
  color: var(--brand-text);
  font-size: calc(1rem + 2vw);
}`);
        expect(rules[0].classes).toEqual([]);
        expect(rules[0].declarations).toEqual(['color: var(--brand-text);', 'font-size: calc(1rem + 2vw);']);
    });

    it('handles classes-only rule body (unchanged behavior)', () => {
        const { rules } = parseStyleBlock('& { bg-gray-900 py-24 }');
        expect(rules[0].classes).toEqual(['bg-gray-900', 'py-24']);
        expect(rules[0].declarations).toEqual([]);
    });

    it('handles declarations in nested rules', () => {
        const { rules } = parseStyleBlock(`& {
  bg-gray-900
  > .card {
    rounded-xl
    transition: transform 0.2s ease;
    color: var(--brand-text);
  }
}`);
        expect(rules[0].classes).toEqual(['bg-gray-900']);
        expect(rules[0].declarations).toEqual([]);

        const child = rules[0].children[0];
        expect(child.selector).toBe('> .card');
        expect(child.classes).toEqual(['rounded-xl']);
        expect(child.declarations).toEqual(['transition: transform 0.2s ease;', 'color: var(--brand-text);']);
    });

    it('handles multiple declarations per rule', () => {
        const { rules } = parseStyleBlock(`& {
  --primary: #667eea;
  --radius: 8px;
  background: var(--primary);
  border-radius: var(--radius);
}`);
        expect(rules[0].declarations).toEqual(['--primary: #667eea;', '--radius: 8px;', 'background: var(--primary);', 'border-radius: var(--radius);']);
    });

    it('handles declarations with complex values', () => {
        const { rules } = parseStyleBlock(`& {
  background: url("data:image/svg+xml,...") no-repeat center;
  grid-template: "header" auto "main" 1fr "footer" auto / 1fr;
  content: "hello; world";
}`);
        expect(rules[0].declarations).toHaveLength(3);
        expect(rules[0].declarations[0]).toContain('url(');
        expect(rules[0].declarations[1]).toContain('grid-template');
        expect(rules[0].declarations[2]).toContain('content');
    });
});

describe('raw CSS declarations — forward transform', () => {
    it('emits <style scoped> when declarations exist', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900 py-24
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-gray-900 py-24"');
        expect(result.code).not.toContain('f-tailwind');
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('box-shadow: 0 4px 6px rgba(0,0,0,0.1);');
    });

    it('does not emit <style scoped> when no declarations exist', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { bg-gray-900 py-24 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).not.toContain('<style scoped>');
    });

    it('preserves correct selector nesting in scoped CSS', () => {
        const code = `<template>
  <div>
    <div class="card">
      <span>text</span>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900
  --bg: #1a1a2e;

  .card {
    rounded-xl
    transition: transform 0.2s ease;

    span {
      color: var(--brand-text);
    }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;

        // Classes applied to markup
        expect(result.code).toContain('class="bg-gray-900"');
        expect(result.code).toContain('class="card rounded-xl"');
        // span has no classes, only a declaration — should NOT get class attr with declaration text
        expect(result.code).not.toMatch(/<span class="color/);

        // Scoped CSS has nested structure
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('--bg: #1a1a2e;');
        expect(result.code).toContain('transition: transform 0.2s ease;');
        expect(result.code).toContain('color: var(--brand-text);');

        // Verify nesting structure
        const styleMatch = result.code.match(/<style scoped>\n([\s\S]*?)\n<\/style>/);
        expect(styleMatch).not.toBeNull();
        const css = styleMatch![1];
        expect(css).toContain('& {');
        expect(css).toContain('.card {');
        expect(css).toContain('span {');
    });

    it('handles interleaved classes/declarations/classes', () => {
        const code = `<template>
  <div>
    <div class="card"><p>content</p></div>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900 py-24
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  px-24

  > .card {
    rounded-xl
    transition: transform 0.2s ease;
    color: var(--brand-text);
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;

        // All classes applied (including px-24 after the declaration)
        expect(result.code).toContain('class="bg-gray-900 py-24 px-24"');
        expect(result.code).toContain('class="card rounded-xl"');

        // Declarations in scoped CSS
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('box-shadow: 0 4px 6px rgba(0,0,0,0.1);');
        expect(result.code).toContain('transition: transform 0.2s ease;');
        expect(result.code).toContain('color: var(--brand-text);');
    });

    it('handles declarations at root & level only', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& {
  --primary: #667eea;
  --radius: 8px;
  bg-gray-900
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-gray-900"');
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('--primary: #667eea;');
        expect(result.code).toContain('--radius: 8px;');
    });

    it('skips rules with no declarations in scoped CSS output', () => {
        const code = `<template>
  <div>
    <span>text</span>
    <p>more</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900

  span { text-white font-bold }

  p {
    text-sm
    color: var(--muted);
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        const styleMatch = result.code.match(/<style scoped>\n([\s\S]*?)\n<\/style>/);
        expect(styleMatch).not.toBeNull();
        const css = styleMatch![1];

        // span has no declarations, should not appear in scoped CSS
        expect(css).not.toContain('span');
        // p has a declaration, should appear
        expect(css).toContain('p {');
        expect(css).toContain('color: var(--muted);');
    });

    it('handles declarations with var(), calc(), rgba(), url()', () => {
        const code = `<template>
  <div>content</div>
</template>

<style lang="f-tailwind">
& {
  bg-white
  color: var(--text-primary);
  width: calc(100% - 2rem);
  background: rgba(0, 0, 0, 0.5);
  background-image: url("https://example.com/bg.png");
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-white"');
        expect(result.code).toContain('color: var(--text-primary);');
        expect(result.code).toContain('width: calc(100% - 2rem);');
        expect(result.code).toContain('background: rgba(0, 0, 0, 0.5);');
        expect(result.code).toContain('url("https://example.com/bg.png")');
    });
});
