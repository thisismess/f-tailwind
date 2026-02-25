import { describe, it, expect } from 'vitest';
import { forwardTransform } from '../src/transform/forward';
import { reverseTransform } from '../src/transform/reverse';

describe('round-trip', () => {
    it('forward(reverse(standard)) produces equivalent output', () => {
        const standard = `<template>
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

        // standard → f-tailwind
        const fTailwindCode = reverseTransform(standard);
        expect(fTailwindCode).toContain('lang="f-tailwind"');
        expect(fTailwindCode).toContain('& {');

        // f-tailwind → back to standard
        const result = forwardTransform(fTailwindCode, 'test.vue');
        expect(result).not.toBeNull();

        const restored = result!.code;
        // Should have all the original Tailwind classes applied
        expect(restored).toContain('class="bg-gray-900 py-24 sm:py-32"');
        expect(restored).toContain('class="mx-auto max-w-7xl px-6 lg:px-8"');
        expect(restored).toContain('class="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3"');

        // dt and dd classes should appear 3 times each
        const dtMatches = restored.match(/text-base\/7 text-gray-400/g);
        expect(dtMatches).toHaveLength(3);

        const ddMatches = restored.match(/order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl/g);
        expect(ddMatches).toHaveLength(3);

        // No f-tailwind remnants
        expect(restored).not.toContain('f-tailwind');
    });

    it('reverse(forward(f-tailwind)) preserves the classes', () => {
        const fTailwindCode = `<template>
  <div>
    <span>hello</span>
    <span>world</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  bg-gray-900
  > span { text-white }
}
</style>`;

        // f-tailwind → standard
        const standard = forwardTransform(fTailwindCode, 'test.vue')!;
        expect(standard).not.toBeNull();
        expect(standard.code).toContain('class="bg-gray-900"');
        expect(standard.code).toContain('class="text-white"');

        // standard → f-tailwind again
        const restored = reverseTransform(standard.code);
        expect(restored).toContain('lang="f-tailwind"');
        expect(restored).toContain('bg-gray-900');
        expect(restored).toContain('text-white');
    });
});
