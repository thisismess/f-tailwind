import { describe, it, expect } from 'vitest';
import { parseStyleBlock } from '../src/parser/style-tree';

describe('parseStyleBlock (CSS-nesting)', () => {
    it('parses a single rule', () => {
        const { rules } = parseStyleBlock('& { bg-gray-900 py-24 }');
        expect(rules).toHaveLength(1);
        expect(rules[0].selector).toBe('&');
        expect(rules[0].classes).toEqual(['bg-gray-900', 'py-24']);
        expect(rules[0].children).toHaveLength(0);
    });

    it('parses nested rules', () => {
        const { rules } = parseStyleBlock(`& {
  bg-gray-900
  > div { mx-auto max-w-7xl }
}`);
        expect(rules).toHaveLength(1);
        expect(rules[0].selector).toBe('&');
        expect(rules[0].classes).toEqual(['bg-gray-900']);
        expect(rules[0].children).toHaveLength(1);

        const child = rules[0].children[0];
        expect(child.selector).toBe('> div');
        expect(child.classes).toEqual(['mx-auto', 'max-w-7xl']);
    });

    it('parses deeply nested rules', () => {
        const { rules } = parseStyleBlock(`& {
  bg-gray-900
  > div {
    mx-auto
    > dl {
      grid grid-cols-3
    }
  }
}`);
        const dl = rules[0].children[0].children[0];
        expect(dl.selector).toBe('> dl');
        expect(dl.classes).toEqual(['grid', 'grid-cols-3']);
    });

    it('parses class selectors', () => {
        const { rules } = parseStyleBlock(`& {
  > .stat { flex gap-4 }
}`);
        expect(rules[0].children[0].selector).toBe('> .stat');
        expect(rules[0].children[0].classes).toEqual(['flex', 'gap-4']);
    });

    it('parses sibling rules at the same level', () => {
        const { rules } = parseStyleBlock(`& {
  > header { bg-blue }
  > main { flex-1 }
  > footer { bg-gray }
}`);
        expect(rules[0].children).toHaveLength(3);
        expect(rules[0].children[0].selector).toBe('> header');
        expect(rules[0].children[1].selector).toBe('> main');
        expect(rules[0].children[2].selector).toBe('> footer');
    });

    it('parses inline single-line rules', () => {
        const { rules } = parseStyleBlock(`& {
  > dt { text-base/7 text-gray-400 }
  > dd { font-bold text-white }
}`);
        expect(rules[0].children).toHaveLength(2);
        expect(rules[0].children[0].classes).toEqual(['text-base/7', 'text-gray-400']);
        expect(rules[0].children[1].classes).toEqual(['font-bold', 'text-white']);
    });

    it('handles classes with special Tailwind characters', () => {
        const { rules } = parseStyleBlock('& { sm:py-32 text-base/7 w-[200px] bg-[#ff0000] }');
        expect(rules[0].classes).toEqual(['sm:py-32', 'text-base/7', 'w-[200px]', 'bg-[#ff0000]']);
    });

    it('parses the full sample-fixed.vue style block', () => {
        const content = `& {
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
}`;
        const { rules } = parseStyleBlock(content);

        expect(rules).toHaveLength(1);
        expect(rules[0].selector).toBe('&');
        expect(rules[0].classes).toEqual(['bg-gray-900', 'py-24', 'sm:py-32']);

        const div = rules[0].children[0];
        expect(div.selector).toBe('> div');
        expect(div.classes).toEqual(['mx-auto', 'max-w-7xl', 'px-6', 'lg:px-8']);

        const dl = div.children[0];
        expect(dl.selector).toBe('> dl');
        expect(dl.classes).toEqual(['grid', 'grid-cols-1', 'gap-x-8', 'gap-y-16', 'text-center', 'lg:grid-cols-3']);

        const stat = dl.children[0];
        expect(stat.selector).toBe('> .stat');
        expect(stat.classes).toEqual(['mx-auto', 'flex', 'max-w-xs', 'flex-col', 'gap-y-4']);
        expect(stat.children).toHaveLength(2);

        expect(stat.children[0].selector).toBe('> dt');
        expect(stat.children[0].classes).toEqual(['text-base/7', 'text-gray-400']);

        expect(stat.children[1].selector).toBe('> dd');
    });

    // --- PostCSS-powered CSS features ---

    it('handles CSS comments', () => {
        const { rules } = parseStyleBlock(`& {
  /* primary background */
  bg-gray-900 py-24
  > div { mx-auto }
}`);
        expect(rules[0].classes).toEqual(['bg-gray-900', 'py-24']);
        expect(rules[0].children).toHaveLength(1);
    });

    it('handles comma-separated selectors', () => {
        const { rules } = parseStyleBlock(`& {
  > dt, > dd { text-sm font-medium }
}`);
        expect(rules[0].children).toHaveLength(1);
        expect(rules[0].children[0].selector).toBe('> dt, > dd');
        expect(rules[0].children[0].classes).toEqual(['text-sm', 'font-medium']);
    });

    it('handles complex CSS selectors', () => {
        const { rules } = parseStyleBlock(`& {
  > div:first-child { font-bold }
  > div:not(.special) { opacity-50 }
  > div + div { mt-4 }
  > [data-active] { bg-blue-500 }
  > *:last-child { mb-0 }
}`);
        expect(rules[0].children).toHaveLength(5);
        expect(rules[0].children[0].selector).toBe('> div:first-child');
        expect(rules[0].children[1].selector).toBe('> div:not(.special)');
        expect(rules[0].children[2].selector).toBe('> div + div');
        expect(rules[0].children[3].selector).toBe('> [data-active]');
        expect(rules[0].children[4].selector).toBe('> *:last-child');
    });

    it('handles multi-line class content', () => {
        const { rules } = parseStyleBlock(`& {
  bg-gray-900
  py-24
  sm:py-32
}`);
        expect(rules[0].classes).toEqual(['bg-gray-900', 'py-24', 'sm:py-32']);
    });

    it('handles multi-line selectors', () => {
        const { rules } = parseStyleBlock(`& {
  > .card,
  > .panel {
    rounded shadow
  }
}`);
        expect(rules[0].children).toHaveLength(1);
        expect(rules[0].children[0].selector).toContain('.card');
        expect(rules[0].children[0].selector).toContain('.panel');
        expect(rules[0].children[0].classes).toEqual(['rounded', 'shadow']);
    });
});
