import { describe, it, expect } from 'vitest';
import { reverseTransform } from '../src/transform/reverse';

describe('reverseTransform (CSS-nesting output)', () => {
    it('returns original code for files without class attributes', () => {
        const code = `<template><div>hello</div></template>`;
        expect(reverseTransform(code)).toBe(code);
    });

    it('extracts classes into CSS-nesting syntax', () => {
        const code = `<template>
  <div class="bg-gray-900 py-24">hello</div>
</template>`;

        const result = reverseTransform(code);
        expect(result).toContain('lang="f-tailwind"');
        expect(result).toContain('& {');
        expect(result).toContain('bg-gray-900 py-24');
        // class attr should be removed from template
        const templateSection = result.substring(0, result.indexOf('<style'));
        expect(templateSection).not.toContain('class=');
    });

    it('handles nested elements with > selectors', () => {
        const code = `<template>
  <div class="bg-gray-900">
    <span class="text-white font-bold">inner</span>
  </div>
</template>`;

        const result = reverseTransform(code);
        expect(result).toContain('& {');
        expect(result).toContain('bg-gray-900');
        expect(result).toContain('> span {');
        expect(result).toContain('text-white font-bold');
    });

    it('detects named groups for repeated siblings', () => {
        const code = `<template>
  <div class="container">
    <div class="mx-auto flex">
      <dt class="text-gray-400">A</dt>
      <dd class="font-bold">1</dd>
    </div>
    <div class="mx-auto flex">
      <dt class="text-gray-400">B</dt>
      <dd class="font-bold">2</dd>
    </div>
    <div class="mx-auto flex">
      <dt class="text-gray-400">C</dt>
      <dd class="font-bold">3</dd>
    </div>
  </div>
</template>`;

        const result = reverseTransform(code);
        // Should use a class selector for the repeated pattern
        expect(result).toContain('> .');
        // Template should have the group class name on the elements
        const templateSection = result.substring(0, result.indexOf('<style'));
        expect(templateSection).toMatch(/class="[a-z]+"/);
    });

    it('handles the sample.vue to f-tailwind conversion', () => {
        const input = `<template>
  <div class="bg-gray-900 py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <dl class="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
        <div class="mx-auto flex max-w-xs flex-col gap-y-4">
          <dt class="text-base/7 text-gray-400">Transactions every 24 hours</dt>
          <dd class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">44 million</dd>
        </div>
        <div class="mx-auto flex max-w-xs flex-col gap-y-4">
          <dt class="text-base/7 text-gray-400">Assets under holding</dt>
          <dd class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">$119 trillion</dd>
        </div>
        <div class="mx-auto flex max-w-xs flex-col gap-y-4">
          <dt class="text-base/7 text-gray-400">New users annually</dt>
          <dd class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">46,000</dd>
        </div>
      </dl>
    </div>
  </div>
</template>`;

        const result = reverseTransform(input);

        // Should have & { } for root
        expect(result).toContain('& {');
        expect(result).toContain('lang="f-tailwind"');

        // Style block should contain all the Tailwind classes
        const styleSection = result.substring(result.indexOf('<style'));
        expect(styleSection).toContain('bg-gray-900 py-24 sm:py-32');
        expect(styleSection).toContain('mx-auto max-w-7xl px-6 lg:px-8');
        expect(styleSection).toContain('grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3');
        expect(styleSection).toContain('mx-auto flex max-w-xs flex-col gap-y-4');
        expect(styleSection).toContain('text-base/7 text-gray-400');
        expect(styleSection).toContain('order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl');

        // Repeated divs should be detected as a group
        expect(styleSection).toMatch(/> \.\w+/);

        // Template should not have the original Tailwind class attrs
        const templateSection = result.substring(0, result.indexOf('<style'));
        // Only the group class name should remain
        expect(templateSection).not.toContain('bg-gray-900');
        expect(templateSection).not.toContain('mx-auto max-w-7xl');
        expect(templateSection).not.toContain('text-base/7');
    });
});
