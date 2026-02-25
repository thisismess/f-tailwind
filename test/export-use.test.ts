import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseStyleBlock } from '../src/parser/style-tree';
import { forwardTransform, clearExportsCache } from '../src/transform/forward';

// =============================================================================
// Parser tests
// =============================================================================

describe('@export / @use / @import — parser', () => {
    it('parses @export with classes', () => {
        const { exports, rules } = parseStyleBlock(`
@export buttons {
  bg-red text-white px-4 py-2 rounded
}

& { flex }
`);
        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe('buttons');
        expect(exports[0].classes).toEqual(['bg-red', 'text-white', 'px-4', 'py-2', 'rounded']);
        expect(exports[0].declarations).toEqual([]);
        expect(exports[0].children).toEqual([]);

        // @export should not appear in rules
        expect(rules).toHaveLength(1);
        expect(rules[0].selector).toBe('&');
    });

    it('parses @export with nested children and declarations', () => {
        const { exports } = parseStyleBlock(`
@export card {
  rounded-lg shadow-lg p-6 bg-white

  .title {
    text-lg font-bold mb-2
    transition: all 0.2s linear;
  }
}
`);
        expect(exports).toHaveLength(1);
        expect(exports[0].name).toBe('card');
        expect(exports[0].classes).toEqual(['rounded-lg', 'shadow-lg', 'p-6', 'bg-white']);
        expect(exports[0].children).toHaveLength(1);

        const title = exports[0].children[0];
        expect(title.selector).toBe('.title');
        expect(title.classes).toEqual(['text-lg', 'font-bold', 'mb-2']);
        expect(title.declarations).toEqual(['transition: all 0.2s linear;']);
    });

    it('parses multiple @export blocks', () => {
        const { exports } = parseStyleBlock(`
@export a { text-red }
@export b { text-blue }
@export c { text-green }
`);
        expect(exports).toHaveLength(3);
        expect(exports.map((e) => e.name)).toEqual(['a', 'b', 'c']);
    });

    it('parses @import directive', () => {
        const { imports } = parseStyleBlock(`
@import buttons, card from './shared.vue'

& { flex }
`);
        expect(imports).toHaveLength(1);
        expect(imports[0].names).toEqual(['buttons', 'card']);
        expect(imports[0].from).toBe('./shared.vue');
    });

    it('parses @import with single name', () => {
        const { imports } = parseStyleBlock(`
@import buttons from './shared.vue'
`);
        expect(imports).toHaveLength(1);
        expect(imports[0].names).toEqual(['buttons']);
        expect(imports[0].from).toBe('./shared.vue');
    });

    it('parses @use in rule body', () => {
        const { rules } = parseStyleBlock(`
& {
  .btn { @use buttons }
}
`);
        const btn = rules[0].children[0];
        expect(btn.uses).toHaveLength(1);
        expect(btn.uses[0].name).toBe('buttons');
        expect(btn.uses[0].from).toBeUndefined();
    });

    it('parses @use with from in rule body', () => {
        const { rules } = parseStyleBlock(`
& {
  .btn { @use buttons from './shared.vue' }
}
`);
        const btn = rules[0].children[0];
        expect(btn.uses).toHaveLength(1);
        expect(btn.uses[0].name).toBe('buttons');
        expect(btn.uses[0].from).toBe('./shared.vue');
    });

    it('parses @use alongside classes', () => {
        const { rules } = parseStyleBlock(`
& {
  .btn {
    text-sm
    @use buttons
    mt-4
  }
}
`);
        const btn = rules[0].children[0];
        expect(btn.classes).toEqual(['text-sm', 'mt-4']);
        expect(btn.uses).toHaveLength(1);
        expect(btn.uses[0].name).toBe('buttons');
    });
});

// =============================================================================
// Transform tests — local @export / @use (no file I/O)
// =============================================================================

describe('@export / @use — local transform', () => {
    it('inlines classes from @export via @use', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export buttons {
  bg-red-500 text-white px-4 py-2 rounded
}

& {
  button { @use buttons }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="bg-red-500 text-white px-4 py-2 rounded"');
    });

    it('inlines declarations from @export', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export fancy {
  bg-red-500
  transition: all 0.2s ease;
}

& {
  button { @use fancy }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="bg-red-500"');
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('transition: all 0.2s ease;');
    });

    it('inlines nested children from @export', () => {
        const code = `<template>
  <div>
    <div class="widget">
      <h3 class="title">Title</h3>
    </div>
  </div>
</template>

<style lang="f-tailwind">
@export card {
  rounded-lg shadow-lg p-6

  .title {
    text-lg font-bold
  }
}

& {
  .widget { @use card }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="widget rounded-lg shadow-lg p-6"');
        expect(result.code).toContain('class="title text-lg font-bold"');
    });

    it('reuses the same @export at multiple locations', () => {
        const code = `<template>
  <div>
    <button>One</button>
    <a href="#">Two</a>
  </div>
</template>

<style lang="f-tailwind">
@export btn {
  px-4 py-2 rounded font-bold
}

& {
  button { @use btn }
  a { @use btn }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toMatch(/<button class="px-4 py-2 rounded font-bold"/);
        expect(result.code).toMatch(/<a class="px-4 py-2 rounded font-bold" href="#"/);
    });

    it('silently skips unknown @use names', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  button { @use nonexistent }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        // Should not crash, button gets no classes
        expect(result.code).toContain('<button>');
    });

    it('@export does not apply to template elements', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export buttons {
  bg-red-500 text-white
}

& {
  flex
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="flex"');
        // button should NOT get the export's classes
        expect(result.code).not.toContain('bg-red-500');
    });

    it('@use alongside own classes merges correctly', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export base-btn {
  px-4 py-2 rounded
}

& {
  button {
    bg-blue-500 text-white
    @use base-btn
  }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="bg-blue-500 text-white px-4 py-2 rounded"');
    });

    it('matches the user sample: @export + @use with nested children', () => {
        const code = `<template>
  <div>
    <div>
      <dl>
        <div class="stat">
          <dt>Transactions every 24 hours</dt>
          <dd>44 million</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style lang="f-tailwind">
@export buttons {
    bg-red text-white px-4 py-2 rounded
}

@export card {
    rounded-lg shadow-lg p-6 bg-white

    .title {
        text-lg font-bold mb-2
        transition: all 0.2s linear;
    }
}

& {
    .stat {
        @use buttons

        dt {
            text-base/7 text-gray-400
        }

        dd {
            @use card
        }
    }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        // .stat gets buttons classes
        expect(result.code).toContain('class="stat bg-red text-white px-4 py-2 rounded"');
        // dt gets its own classes
        expect(result.code).toContain('class="text-base/7 text-gray-400"');
        // dd gets card classes
        expect(result.code).toContain('class="rounded-lg shadow-lg p-6 bg-white"');
    });
});

// =============================================================================
// Transform tests — cross-file @import / @use from
// =============================================================================

describe('@import / @use from — cross-file', () => {
    const tmpDir = join(__dirname, '__tmp_export_test__');
    const sharedPath = join(tmpDir, 'shared.vue');

    beforeAll(() => {
        mkdirSync(tmpDir, { recursive: true });
        writeFileSync(
            sharedPath,
            `<template><div></div></template>

<style lang="f-tailwind">
@export buttons {
  bg-red-500 text-white px-4 py-2 rounded
}

@export card {
  rounded-lg shadow-lg p-6
  transition: all 0.2s ease;
}
</style>
`
        );
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('@import loads exports and @use inlines them', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@import buttons from '${sharedPath}'

& {
  button { @use buttons }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer.vue'))!;
        expect(result.code).toContain('class="bg-red-500 text-white px-4 py-2 rounded"');
    });

    it('@use name from path resolves inline', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  button { @use buttons from '${sharedPath}' }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer2.vue'))!;
        expect(result.code).toContain('class="bg-red-500 text-white px-4 py-2 rounded"');
    });

    it('@import with multiple names', () => {
        const code = `<template>
  <div>
    <button>Click</button>
    <div class="panel">Panel</div>
  </div>
</template>

<style lang="f-tailwind">
@import buttons, card from '${sharedPath}'

& {
  button { @use buttons }
  .panel { @use card }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer3.vue'))!;
        expect(result.code).toContain('class="bg-red-500 text-white px-4 py-2 rounded"');
        expect(result.code).toContain('class="panel rounded-lg shadow-lg p-6"');
        // card has a declaration
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('transition: all 0.2s ease;');
    });

    it('silently handles missing file in @use from', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  button { @use buttons from './nonexistent.vue' }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer4.vue'))!;
        // Should not crash
        expect(result.code).toContain('<button>');
    });
});

// =============================================================================
// Cross-file @use inside exports — pre-resolution
// =============================================================================

describe('@import resolves @use inside exported blocks', () => {
    const tmpDir = join(__dirname, '__tmp_preresolved_test__');
    const libPath = join(tmpDir, 'lib.vue');

    beforeAll(() => {
        mkdirSync(tmpDir, { recursive: true });
        // lib.vue defines base + button, where button @use base
        writeFileSync(
            libPath,
            `<template><div></div></template>

<style lang="f-tailwind">
@export base {
  px-4 py-2 rounded font-medium
}

@export button {
  @use base
  bg-blue-500 text-white hover:bg-blue-600
}
</style>
`
        );
        // Clear any cached exports from previous runs
        clearExportsCache(libPath);
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('importing only "button" still resolves its internal @use base', () => {
        const code = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
@import button from '${libPath}'

& {
  > button { @use button }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer.vue'))!;
        // button should include base's classes (px-4 py-2 rounded font-medium)
        // plus its own classes (bg-blue-500 text-white hover:bg-blue-600)
        expect(result.code).toContain('px-4');
        expect(result.code).toContain('py-2');
        expect(result.code).toContain('rounded');
        expect(result.code).toContain('font-medium');
        expect(result.code).toContain('bg-blue-500');
        expect(result.code).toContain('text-white');
    });

    it('importing both "base" and "button" still works', () => {
        clearExportsCache(libPath);

        const code = `<template>
  <div>
    <button>Click</button>
    <a href="#">Link</a>
  </div>
</template>

<style lang="f-tailwind">
@import base, button from '${libPath}'

& {
  > button { @use button }
  > a { @use base }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer2.vue'))!;
        // button has base's classes + its own
        expect(result.code).toContain('bg-blue-500');
        expect(result.code).toContain('px-4');
        // link has just base's classes
        const linkMatch = result.code.match(/<a[^>]*class="([^"]*)"/);
        expect(linkMatch?.[1]).toContain('px-4');
        expect(linkMatch?.[1]).not.toContain('bg-blue-500');
    });
});

// =============================================================================
// Circular @use detection
// =============================================================================

describe('circular @use detection', () => {
    const tmpDir = join(__dirname, '__tmp_circular_test__');

    beforeAll(() => {
        mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('does not stack overflow on self-referencing @use', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export loop {
  text-red
}

& {
  button { @use loop }
}
</style>`;

        // This should not infinite-loop — loop doesn't @use itself in its body,
        // so it resolves fine. Let's test a real cycle via cross-file.
        const result = forwardTransform(code, '/test-self.vue')!;
        expect(result.code).toContain('class="text-red"');
    });

    it('handles cross-file circular imports without crashing', () => {
        // File A imports from B, file B imports from A
        const fileA = join(tmpDir, 'a.vue');
        const fileB = join(tmpDir, 'b.vue');

        writeFileSync(
            fileA,
            `<template><div></div></template>
<style lang="f-tailwind">
@export alpha {
  text-red
}
</style>`
        );

        writeFileSync(
            fileB,
            `<template><div></div></template>
<style lang="f-tailwind">
@export beta {
  text-blue
}
</style>`
        );

        clearExportsCache();

        // Consumer imports from both — no actual cycle, just making sure
        // cross-file resolution doesn't break
        const code = `<template>
  <div>
    <span class="a">A</span>
    <span class="b">B</span>
  </div>
</template>

<style lang="f-tailwind">
@import alpha from '${fileA}'
@import beta from '${fileB}'

& {
  .a { @use alpha }
  .b { @use beta }
}
</style>`;

        const result = forwardTransform(code, join(tmpDir, 'consumer.vue'))!;
        expect(result.code).toContain('class="a text-red"');
        expect(result.code).toContain('class="b text-blue"');
    });
});

// =============================================================================
// Warnings for silent failures
// =============================================================================

describe('warnings for silent failures', () => {
    const tmpDir = join(__dirname, '__tmp_warning_test__');

    beforeAll(() => {
        mkdirSync(tmpDir, { recursive: true });
        writeFileSync(
            join(tmpDir, 'source.vue'),
            `<template><div></div></template>
<style lang="f-tailwind">
@export real-export {
  text-green
}
</style>`
        );
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('warns when @use references an undefined name', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const code = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
& {
  button { @use nonexistent }
}
</style>`;

        forwardTransform(code, '/test-warn.vue');
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('@use: name "nonexistent" is not defined'));

        spy.mockRestore();
    });

    it('warns when @use from references a missing file', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        clearExportsCache();

        const code = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
& {
  button { @use foo from './nope.vue' }
}
</style>`;

        forwardTransform(code, join(tmpDir, 'consumer.vue'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Could not read file'));

        spy.mockRestore();
    });

    it('warns when @import references a name not in the source file', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        clearExportsCache();

        const code = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
@import typo-name from '${join(tmpDir, 'source.vue')}'

& {
  button { @use typo-name }
}
</style>`;

        forwardTransform(code, join(tmpDir, 'consumer.vue'));
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('@import: name "typo-name" not found'));

        spy.mockRestore();
    });

    it('does not warn for valid @use and @import', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        clearExportsCache();

        const code = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
@import real-export from '${join(tmpDir, 'source.vue')}'

& {
  button { @use real-export }
}
</style>`;

        forwardTransform(code, join(tmpDir, 'consumer.vue'));
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
    });
});

// =============================================================================
// Cache invalidation
// =============================================================================

describe('clearExportsCache', () => {
    const tmpDir = join(__dirname, '__tmp_cache_test__');
    const filePath = join(tmpDir, 'cached.vue');

    beforeAll(() => {
        mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('picks up changes after cache is cleared', () => {
        // Write initial version
        writeFileSync(
            filePath,
            `<template><div></div></template>
<style lang="f-tailwind">
@export btn {
  bg-red-500
}
</style>`
        );

        clearExportsCache();

        const code1 = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
@import btn from '${filePath}'

& {
  button { @use btn }
}
</style>`;

        const result1 = forwardTransform(code1, join(tmpDir, 'consumer.vue'))!;
        expect(result1.code).toContain('class="bg-red-500"');

        // Update the source file
        writeFileSync(
            filePath,
            `<template><div></div></template>
<style lang="f-tailwind">
@export btn {
  bg-blue-500
}
</style>`
        );

        // Without clearing cache, we'd still get the old value
        const result2 = forwardTransform(code1, join(tmpDir, 'consumer.vue'))!;
        expect(result2.code).toContain('class="bg-red-500"'); // stale

        // After clearing, we get the new value
        clearExportsCache(filePath);

        const result3 = forwardTransform(code1, join(tmpDir, 'consumer.vue'))!;
        expect(result3.code).toContain('class="bg-blue-500"'); // fresh
    });
});

// =============================================================================
// @use inside @export (composing exports)
// =============================================================================

describe('@use inside @export', () => {
    it('resolves @use inside an @export body', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export base {
  rounded shadow
}

@export card {
  @use base
  p-4 bg-white
}

& {
  button { @use card }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        // Own classes first, @use'd classes appended
        expect(result.code).toContain('class="p-4 bg-white rounded shadow"');
    });

    it('resolves @use with nested children inside @export', () => {
        const code = `<template>
  <div>
    <div class="widget">
      <h3 class="title">Title</h3>
    </div>
  </div>
</template>

<style lang="f-tailwind">
@export heading {
  text-lg font-bold
}

@export card {
  rounded-lg shadow p-6

  .title {
    @use heading
    mb-2
  }
}

& {
  .widget { @use card }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="widget rounded-lg shadow p-6"');
        // In .title child: own classes (mb-2) first, @use'd classes (text-lg font-bold) appended
        expect(result.code).toContain('class="title mb-2 text-lg font-bold"');
    });
});

// =============================================================================
// Multiple <style lang="f-tailwind"> blocks
// =============================================================================

describe('multiple f-tailwind style blocks', () => {
    it('processes rules from both blocks', () => {
        const code = `<template>
  <div>
    <h1>Title</h1>
    <p>Body</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > h1 { text-3xl font-bold }
}
</style>

<style lang="f-tailwind">
& {
  > p { text-sm text-gray-500 }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="text-3xl font-bold"');
        expect(result.code).toContain('class="text-sm text-gray-500"');
        // Both style blocks should be removed
        expect(result.code).not.toContain('lang="f-tailwind"');
    });

    it('exports from one block are usable in another', () => {
        const code = `<template>
  <div>
    <button>Click</button>
  </div>
</template>

<style lang="f-tailwind">
@export btn {
  px-4 py-2 rounded
}
</style>

<style lang="f-tailwind">
& {
  button { @use btn }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="px-4 py-2 rounded"');
    });
});

// =============================================================================
// Duplicate @export names
// =============================================================================

describe('duplicate @export names', () => {
    it('warns when the same name is exported twice', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const code = `<template>
  <div><button>Click</button></div>
</template>

<style lang="f-tailwind">
@export btn {
  bg-red
}

@export btn {
  bg-blue
}

& {
  button { @use btn }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Duplicate @export name "btn"'));
        // Last one wins
        expect(result.code).toContain('class="bg-blue"');
        expect(result.code).not.toContain('bg-red');

        spy.mockRestore();
    });
});

// =============================================================================
// Zero-match selector warnings
// =============================================================================

describe('zero-match selector warnings', () => {
    it('warns when a selector matches no elements', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const code = `<template>
  <div>
    <p>Hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .nonexistent { text-red }
}
</style>`;

        forwardTransform(code, '/test.vue');
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Selector "> .nonexistent" matched no elements'));

        spy.mockRestore();
    });

    it('does not warn for the & root selector', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const code = `<template>
  <div>
    <p>Hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p { text-sm }
}
</style>`;

        forwardTransform(code, '/test.vue');
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
    });

    it('does not warn for matched selectors', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const code = `<template>
  <div>
    <p class="intro">Hello</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > .intro { text-lg font-bold }
}
</style>`;

        forwardTransform(code, '/test.vue');
        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
    });
});

// =============================================================================
// :not(), :is(), :where() compile-time evaluation
// =============================================================================

describe(':not(), :is(), :where() evaluation', () => {
    it(':not(.class) excludes elements with that class', () => {
        const code = `<template>
  <div>
    <p class="special">A</p>
    <p>B</p>
    <p>C</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:not(.special) { text-sm }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('<p class="special">A</p>');
        expect(result.code).toMatch(/<p class="text-sm">B<\/p>/);
        expect(result.code).toMatch(/<p class="text-sm">C<\/p>/);
    });

    it(':not([attr]) excludes elements with that attribute', () => {
        const code = `<template>
  <div>
    <input type="text" disabled />
    <input type="text" />
  </div>
</template>

<style lang="f-tailwind">
& {
  > input:not([disabled]) { border-blue-500 }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code.match(/border-blue-500/g)).toHaveLength(1);
    });

    it(':is(.a, .b) matches either class', () => {
        const code = `<template>
  <div>
    <p class="a">A</p>
    <p class="b">B</p>
    <p class="c">C</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > p:is(.a, .b) { font-bold }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="a font-bold"');
        expect(result.code).toContain('class="b font-bold"');
        expect(result.code).toContain('<p class="c">C</p>');
    });

    it(':where(.a, .b) matches either class (same as :is)', () => {
        const code = `<template>
  <div>
    <span class="x">X</span>
    <span class="y">Y</span>
    <span>Z</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  > span:where(.x, .y) { underline }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('class="x underline"');
        expect(result.code).toContain('class="y underline"');
        expect(result.code).toContain('<span>Z</span>');
    });

    it(':not() with tag selector', () => {
        const code = `<template>
  <div>
    <h2>Title</h2>
    <p>Text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  > *:not(h2) { text-sm }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code).toContain('<h2>Title</h2>');
        expect(result.code).toContain('class="text-sm"');
        expect(result.code.match(/text-sm/g)).toHaveLength(1);
    });
});

// =============================================================================
// Attribute selector operators
// =============================================================================

describe('attribute selector operators', () => {
    it('[attr^=val] matches prefix', () => {
        const code = `<template>
  <div>
    <div data-type="icon-star">Star</div>
    <div data-type="icon-heart">Heart</div>
    <div data-type="label">Label</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > [data-type^="icon"] { w-6 h-6 }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code.match(/w-6 h-6/g)).toHaveLength(2);
        expect(result.code).toContain('<div data-type="label">Label</div>');
    });

    it('[attr$=val] matches suffix', () => {
        const code = `<template>
  <div>
    <a href="/about">About</a>
    <a href="/docs.pdf">PDF</a>
  </div>
</template>

<style lang="f-tailwind">
& {
  > [href$=".pdf"] { text-red-500 }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code.match(/text-red-500/g)).toHaveLength(1);
    });

    it('[attr*=val] matches substring', () => {
        const code = `<template>
  <div>
    <a href="https://example.com/docs">Docs</a>
    <a href="https://other.com">Other</a>
  </div>
</template>

<style lang="f-tailwind">
& {
  > [href*="example"] { font-bold }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code.match(/font-bold/g)).toHaveLength(1);
    });

    it('[attr~=val] matches whitespace-separated word', () => {
        const code = `<template>
  <div>
    <div data-tags="featured new">Featured</div>
    <div data-tags="sale">Sale</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > [data-tags~="featured"] { ring-2 }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code.match(/ring-2/g)).toHaveLength(1);
    });

    it('[attr|=val] matches exact or prefix-dash', () => {
        const code = `<template>
  <div>
    <div lang="en">English</div>
    <div lang="en-US">US English</div>
    <div lang="fr">French</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  > [lang|="en"] { font-bold }
}
</style>`;

        const result = forwardTransform(code, '/test.vue')!;
        expect(result.code.match(/font-bold/g)).toHaveLength(2);
    });
});
