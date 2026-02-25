import { describe, it, expect } from 'vitest';
import { forwardTransform } from '../src/transform/forward';

describe('edge cases: v-if / v-else-if / v-else', () => {
    it('applies classes to an element with v-if', () => {
        const code = `<template>
  <div>
    <p v-if="show">visible</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > p { text-red-500 font-bold }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result).not.toBeNull();
        expect(result.code).toContain('class="text-red-500 font-bold"');
        expect(result.code).toContain('v-if="show"');
    });

    it('applies classes to v-if / v-else siblings of the same tag', () => {
        const code = `<template>
  <div>
    <span v-if="active">on</span>
    <span v-else>off</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > span { text-sm px-2 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // class is inserted right after the tag name, before directives — order doesn't matter
        const spanMatches = result.code.match(/class="text-sm px-2"/g);
        expect(spanMatches).toHaveLength(2);
        expect(result.code).toContain('v-if="active"');
        expect(result.code).toContain('v-else');
    });

    it('applies different classes via class selectors on v-if/v-else', () => {
        const code = `<template>
  <div>
    <div v-if="loggedIn" class="authed">welcome</div>
    <div v-else class="guest">please log in</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  container
  > .authed { bg-green-100 text-green-800 }
  > .guest { bg-gray-100 text-gray-600 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="authed bg-green-100 text-green-800"');
        expect(result.code).toContain('class="guest bg-gray-100 text-gray-600"');
    });

    it('handles v-if / v-else-if / v-else chain', () => {
        const code = `<template>
  <div>
    <p v-if="status === 'success'" class="success">ok</p>
    <p v-else-if="status === 'warning'" class="warning">hmm</p>
    <p v-else class="error">bad</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > .success { text-green-500 }
  > .warning { text-yellow-500 }
  > .error { text-red-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="success text-green-500"');
        expect(result.code).toContain('class="warning text-yellow-500"');
        expect(result.code).toContain('class="error text-red-500"');
    });
});

describe('edge cases: v-for', () => {
    it('applies classes to a v-for element', () => {
        const code = `<template>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  list-none
  > li { px-4 py-2 border-b }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="px-4 py-2 border-b"');
        expect(result.code).toContain('v-for="item in items"');
        expect(result.code).toContain(':key="item.id"');
    });

    it('applies nested classes inside a v-for element', () => {
        const code = `<template>
  <div>
    <div v-for="card in cards" :key="card.id" class="card">
      <h3>{{ card.title }}</h3>
      <p>{{ card.body }}</p>
    </div>
  </div>
</template>

<style lang="f-tailwind">
& {
  grid grid-cols-3 gap-4
  > .card {
    rounded shadow p-4
    > h3 { text-lg font-bold }
    > p { text-gray-600 mt-2 }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="card rounded shadow p-4"');
        expect(result.code).toContain('<h3 class="text-lg font-bold">');
        expect(result.code).toContain('<p class="text-gray-600 mt-2">');
    });

    it('applies classes to v-for with destructured loop variable', () => {
        const code = `<template>
  <ul>
    <li v-for="({ name, id }, index) in items" :key="id">{{ name }}</li>
  </ul>
</template>

<style lang="f-tailwind">
& {
  space-y-2
  > li { flex items-center gap-2 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="flex items-center gap-2"');
    });
});

describe('edge cases: v-show', () => {
    it('applies classes to a v-show element', () => {
        const code = `<template>
  <div>
    <p v-show="visible">now you see me</p>
  </div>
</template>

<style lang="f-tailwind">
& {
  relative
  > p { absolute top-0 left-0 bg-white }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="absolute top-0 left-0 bg-white"');
        expect(result.code).toContain('v-show="visible"');
    });
});

describe('edge cases: dynamic :class binding', () => {
    it('adds static class alongside :class binding', () => {
        const code = `<template>
  <div>
    <button :class="{ active: isActive }">click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > button { px-4 py-2 rounded }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // Should add static class; Vue merges static class + :class at runtime
        expect(result.code).toContain('class="px-4 py-2 rounded"');
        expect(result.code).toContain(':class="{ active: isActive }"');
    });

    it('merges with existing static class when :class is also present', () => {
        const code = `<template>
  <div>
    <button class="btn" :class="{ active: isActive }">click</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > .btn { px-4 py-2 rounded }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="btn px-4 py-2 rounded"');
        expect(result.code).toContain(':class="{ active: isActive }"');
    });

    it('preserves v-bind:class (long form) alongside added class', () => {
        const code = `<template>
  <div>
    <span v-bind:class="cls">text</span>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex
  > span { text-lg }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="text-lg"');
        expect(result.code).toContain('v-bind:class="cls"');
    });
});

describe('edge cases: self-closing tags', () => {
    it('adds classes to a self-closing <img />', () => {
        const code = `<template>
  <div>
    <img src="/logo.png" />
  </div>
</template>

<style lang="f-tailwind">
& {
  flex items-center
  > img { w-12 h-12 rounded-full }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="w-12 h-12 rounded-full"');
        expect(result.code).toContain('src="/logo.png"');
    });

    it('adds classes to <input /> with many attributes', () => {
        const code = `<template>
  <form>
    <input type="text" v-model="name" placeholder="Name" />
  </form>
</template>

<style lang="f-tailwind">
& {
  space-y-4
  > input { border rounded px-3 py-2 w-full }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="border rounded px-3 py-2 w-full"');
        expect(result.code).toContain('v-model="name"');
        expect(result.code).toContain('type="text"');
    });

    it('adds classes to <hr /> and <br />', () => {
        const code = `<template>
  <div>
    <hr />
    <br />
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > hr { border-gray-200 my-4 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<hr class="border-gray-200 my-4"');
    });
});

describe('edge cases: <template> wrapper elements (flattened)', () => {
    it('handles <template v-if> — children are hoisted to parent level', () => {
        const code = `<template>
  <div>
    <template v-if="showDetails">
      <p>detail 1</p>
      <p>detail 2</p>
    </template>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > p { text-sm text-gray-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        const pMatches = result.code.match(/class="text-sm text-gray-500"/g);
        expect(pMatches).toHaveLength(2);
    });

    it('handles <template v-for>', () => {
        const code = `<template>
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
  > dt { font-bold text-sm }
  > dd { text-gray-600 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<dt class="font-bold text-sm">');
        expect(result.code).toContain('<dd class="text-gray-600">');
    });
});

describe('edge cases: Vue components', () => {
    it('applies classes to a PascalCase component', () => {
        const code = `<template>
  <div>
    <MyButton>Click me</MyButton>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > MyButton { mt-4 w-full }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<MyButton class="mt-4 w-full">');
    });

    it('applies classes to a kebab-case component', () => {
        const code = `<template>
  <div>
    <my-button>Click me</my-button>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-4
  > my-button { mt-4 w-full }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<my-button class="mt-4 w-full">');
    });

    it('applies nested classes inside a component with children', () => {
        const code = `<template>
  <Card>
    <h2>Title</h2>
    <p>Description</p>
  </Card>
</template>

<style lang="f-tailwind">
& {
  shadow rounded
  > h2 { text-xl font-bold }
  > p { text-gray-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<Card class="shadow rounded">');
        expect(result.code).toContain('<h2 class="text-xl font-bold">');
        expect(result.code).toContain('<p class="text-gray-500">');
    });
});

describe('edge cases: multiple root elements (fragments)', () => {
    it('applies & to all root elements', () => {
        const code = `<template>
  <header>H</header>
  <main>M</main>
  <footer>F</footer>
</template>

<style lang="f-tailwind">
& { text-sm font-sans }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<header class="text-sm font-sans">');
        expect(result.code).toContain('<main class="text-sm font-sans">');
        expect(result.code).toContain('<footer class="text-sm font-sans">');
    });

    it('targets specific roots by tag selector', () => {
        const code = `<template>
  <header>H</header>
  <main>M</main>
  <footer>F</footer>
</template>

<style lang="f-tailwind">
header { bg-blue-500 }
main { flex-1 }
footer { bg-gray-800 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<header class="bg-blue-500">');
        expect(result.code).toContain('<main class="flex-1">');
        expect(result.code).toContain('<footer class="bg-gray-800">');
    });
});

describe('edge cases: elements with many attributes', () => {
    it('inserts class among other attributes', () => {
        const code = `<template>
  <div>
    <a href="/about" target="_blank" rel="noopener" @click="track">About</a>
  </div>
</template>

<style lang="f-tailwind">
& {
  nav
  > a { text-blue-500 underline hover:text-blue-700 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="text-blue-500 underline hover:text-blue-700"');
        expect(result.code).toContain('href="/about"');
        expect(result.code).toContain('@click="track"');
    });

    it('preserves v-model, @events, and refs', () => {
        const code = `<template>
  <div>
    <input
      ref="nameInput"
      v-model="name"
      type="text"
      @focus="onFocus"
      @blur="onBlur"
    />
  </div>
</template>

<style lang="f-tailwind">
& {
  space-y-2
  > input { border-2 rounded-lg px-4 py-2 focus:border-blue-500 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="border-2 rounded-lg px-4 py-2 focus:border-blue-500"');
        expect(result.code).toContain('v-model="name"');
        expect(result.code).toContain('@focus="onFocus"');
        expect(result.code).toContain('ref="nameInput"');
    });
});

describe('edge cases: slots', () => {
    it('<slot> elements are skipped (not real DOM nodes)', () => {
        const code = `<template>
  <div>
    <slot name="header"></slot>
    <slot></slot>
  </div>
</template>

<style lang="f-tailwind">
& {
  flex flex-col
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // Slots are skipped in the template tree — they're not real DOM elements
        expect(result.code).toContain('class="flex flex-col"');
        // Slot tags should be untouched in the output
        expect(result.code).toContain('<slot name="header"></slot>');
        expect(result.code).toContain('<slot></slot>');
    });
});

describe('edge cases: mixed directives and nesting', () => {
    it('handles a realistic form with v-model, v-if, v-for, classes', () => {
        const code = `<template>
  <form @submit.prevent="onSubmit">
    <div v-for="field in fields" :key="field.name" class="field">
      <label>{{ field.label }}</label>
      <input v-model="form[field.name]" :type="field.type" :placeholder="field.placeholder" />
      <span v-if="errors[field.name]" class="error">{{ errors[field.name] }}</span>
    </div>
    <button type="submit" :disabled="!valid">Submit</button>
  </form>
</template>

<style lang="f-tailwind">
& {
  max-w-md mx-auto space-y-6
  > .field {
    flex flex-col gap-1
    > label { text-sm font-medium text-gray-700 }
    > input { border rounded-md px-3 py-2 }
    > .error { text-xs text-red-500 }
  }
  > button { bg-blue-600 text-white rounded-md px-4 py-2 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="field flex flex-col gap-1"');
        expect(result.code).toContain('<label class="text-sm font-medium text-gray-700">');
        expect(result.code).toContain('class="border rounded-md px-3 py-2"');
        expect(result.code).toContain('class="error text-xs text-red-500"');
        expect(result.code).toContain('class="bg-blue-600 text-white rounded-md px-4 py-2"');
        // Directives preserved
        expect(result.code).toContain('@submit.prevent="onSubmit"');
        expect(result.code).toContain('v-for="field in fields"');
        expect(result.code).toContain('v-model="form[field.name]"');
        expect(result.code).toContain('v-if="errors[field.name]"');
        expect(result.code).toContain(':disabled="!valid"');
    });

    it('handles v-if on a styled element with styled children', () => {
        const code = `<template>
  <div>
    <section v-if="loaded">
      <h1>Title</h1>
      <p>Content</p>
    </section>
    <div v-else>Loading...</div>
  </div>
</template>

<style lang="f-tailwind">
& {
  min-h-screen
  > section {
    p-8
    > h1 { text-3xl font-bold }
    > p { mt-4 text-gray-600 }
  }
  > div { flex items-center justify-center }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // class appears before v-if since it's inserted at afterTagNameOffset
        expect(result.code).toContain('class="p-8"');
        expect(result.code).toContain('v-if="loaded"');
        expect(result.code).toContain('<h1 class="text-3xl font-bold">');
        expect(result.code).toContain('<p class="mt-4 text-gray-600">');
        // the v-else div should also match > div
        expect(result.code).toContain('v-else');
        expect(result.code).toContain('class="flex items-center justify-center"');
    });
});

describe('edge cases: Tailwind class syntax', () => {
    it('handles arbitrary value classes with brackets', () => {
        const code = `<template>
  <div>hello</div>
</template>

<style lang="f-tailwind">
& { w-[calc(100%-2rem)] h-[200px] bg-[#1a1a2e] text-[length:16px] }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('w-[calc(100%-2rem)]');
        expect(result.code).toContain('h-[200px]');
        expect(result.code).toContain('bg-[#1a1a2e]');
        expect(result.code).toContain('text-[length:16px]');
    });

    it('handles important modifier (!)', () => {
        const code = `<template>
  <div>important</div>
</template>

<style lang="f-tailwind">
& { !mt-0 !p-4 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('!mt-0');
        expect(result.code).toContain('!p-4');
    });

    it('handles negative values', () => {
        const code = `<template>
  <div>negative</div>
</template>

<style lang="f-tailwind">
& { -mt-4 -translate-x-1/2 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('-mt-4');
        expect(result.code).toContain('-translate-x-1/2');
    });

    it('handles responsive and state prefixes', () => {
        const code = `<template>
  <div>responsive</div>
</template>

<style lang="f-tailwind">
& {
  p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 2xl:p-20
  hover:bg-gray-100 focus:ring-2 focus:ring-blue-500
  dark:bg-gray-900 dark:text-white
  group-hover:visible peer-checked:bg-blue-500
  first:mt-0 last:mb-0 odd:bg-gray-50
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('sm:p-6');
        expect(result.code).toContain('2xl:p-20');
        expect(result.code).toContain('hover:bg-gray-100');
        expect(result.code).toContain('dark:bg-gray-900');
        expect(result.code).toContain('group-hover:visible');
        expect(result.code).toContain('first:mt-0');
    });

    it('handles stacked modifiers', () => {
        const code = `<template>
  <div>stacked</div>
</template>

<style lang="f-tailwind">
& { sm:hover:bg-gray-200 dark:md:text-lg lg:focus:ring-4 }
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('sm:hover:bg-gray-200');
        expect(result.code).toContain('dark:md:text-lg');
        expect(result.code).toContain('lg:focus:ring-4');
    });
});

describe('edge cases: whitespace and formatting', () => {
    it('handles extra blank lines in the style block', () => {
        const code = `<template>
  <div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
& {

  bg-white p-4

  > p {

    text-gray-800

  }

}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-white p-4"');
        expect(result.code).toContain('class="text-gray-800"');
    });

    it('handles tab indentation in style block', () => {
        const code = `<template>
  <div>
    <p>text</p>
  </div>
</template>

<style lang="f-tailwind">
& {
\tbg-white
\t> p { text-sm }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('class="bg-white"');
        expect(result.code).toContain('class="text-sm"');
    });
});

describe('edge cases: script block interactions', () => {
    it('preserves <script setup> content', () => {
        const code = `<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>
    <button @click="count++">{{ count }}</button>
  </div>
</template>

<style lang="f-tailwind">
& {
  p-8
  > button { bg-blue-500 text-white px-4 py-2 rounded }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<script setup lang="ts">');
        expect(result.code).toContain('const count = ref(0)');
        expect(result.code).toContain('class="bg-blue-500 text-white px-4 py-2 rounded"');
        expect(result.code).not.toContain('f-tailwind');
    });

    it('preserves other <style> blocks alongside f-tailwind', () => {
        const code = `<template>
  <div>
    <p>hello</p>
  </div>
</template>

<style scoped>
.custom { color: red; }
</style>

<style lang="f-tailwind">
& {
  p-4
  > p { text-lg }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        expect(result.code).toContain('<style scoped>');
        expect(result.code).toContain('.custom { color: red; }');
        expect(result.code).toContain('class="text-lg"');
        expect(result.code).not.toContain('f-tailwind');
    });
});

describe('edge cases: Transition and KeepAlive (flattened)', () => {
    it('applies classes through <Transition> (flattened)', () => {
        const code = `<template>
  <div>
    <Transition name="fade">
      <p v-if="show">fading</p>
    </Transition>
  </div>
</template>

<style lang="f-tailwind">
& {
  relative
  > p { absolute inset-0 }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // <p> is hoisted through flattened <Transition>
        expect(result.code).toContain('class="absolute inset-0"');
    });
});

describe('edge cases: deep nesting with mixed directives', () => {
    it('handles a complex real-world navigation pattern', () => {
        const code = `<template>
  <nav>
    <div>
      <a href="/">Logo</a>
      <ul>
        <li v-for="link in links" :key="link.href">
          <a :href="link.href" :class="{ active: link.active }">{{ link.label }}</a>
        </li>
      </ul>
      <button v-if="!user" @click="login">Login</button>
      <div v-else class="user-menu">
        <img :src="user.avatar" />
        <span>{{ user.name }}</span>
      </div>
    </div>
  </nav>
</template>

<style lang="f-tailwind">
& {
  bg-white shadow-sm border-b
  > div {
    max-w-7xl mx-auto px-4 flex items-center justify-between h-16
    > a { text-xl font-bold }
    > ul {
      flex space-x-4
      > li {
        > a { text-gray-600 hover:text-gray-900 px-3 py-2 }
      }
    }
    > button { bg-blue-600 text-white px-4 py-2 rounded }
    > .user-menu {
      flex items-center gap-2
      > img { w-8 h-8 rounded-full }
      > span { text-sm font-medium }
    }
  }
}
</style>`;

        const result = forwardTransform(code, 'test.vue')!;
        // Nav root
        expect(result.code).toContain('class="bg-white shadow-sm border-b"');
        // Container div
        expect(result.code).toContain('class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16"');
        // Logo link (first > a)
        // Note: the first <a> is a direct child of the inner div
        expect(result.code).toContain('class="text-xl font-bold"');
        expect(result.code).toContain('href="/"');
        // List
        expect(result.code).toContain('class="flex space-x-4"');
        // Login button
        expect(result.code).toContain('class="bg-blue-600 text-white px-4 py-2 rounded"');
        // User menu
        expect(result.code).toContain('class="user-menu flex items-center gap-2"');
        // Directives preserved
        expect(result.code).toContain('v-for="link in links"');
        expect(result.code).toContain('v-if="!user"');
        expect(result.code).toContain('v-else');
    });
});
