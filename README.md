# f-tailwind

[![npm version](https://img.shields.io/npm/v/f-tailwind?color=blue)](https://www.npmjs.com/package/f-tailwind)
[![CI](https://img.shields.io/github/actions/workflow/status/jshedd/f-tailwind/ci.yml?label=CI)](https://github.com/jshedd/f-tailwind/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/f-tailwind)](https://github.com/jshedd/f-tailwind/blob/main/LICENSE)

f-tailwind is a Nuxt module that lets you write Tailwind utility classes in a `<style>` block using CSS-nesting syntax instead of cramming them into `class=""` attributes.

## Why

CSS was invented in 1996 so we could stop putting `<font color="red">` in our HTML. It took the entire web development industry a **decade** to agree that separating structure from
presentation was a good idea.

We wrote a lot of blog posts about it. So very, very many blog posts.

Conference talks were given. Guys in beanies got famous and Microsoft got yelled at a lot.

And eventually, we seperated concerns. We had semantic HTML and maintainable stylesheets and JavaScript in seperate files.

But then in 2017, some guy said "what if we put all the styles back in the HTML?" and a mass of people said "yes, absolutely, this is the way." We reinvented inline styles, but
worse and weirder and slower to write — because `style="color: red"` is readable and
`class="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"`
requires several round-trips to a documentation website.

And tooling! An entire ecosystem of editor plugins, integrations, sorters, liters and other words just to manage this mess.

We had to write software to organize the chaos of another piece of software because other software was too hard for us to write while we were writing software.

But ... sigh ... Tailwind isn't bad. It does solve some problems. The utility classes are well-designed. The design system is thoughtful. The responsive modifiers are clever. The
fact the classes are just strings means you can generate them dynamically, and components are more self-contained, and self-documenting. Components are easier to share between
codebases. Appearance issues are easier to debug because you can see all the styles right there in the markup instead of having to reference the 18 stylesheets with overlapping
rules that are causing your A tags to be bolded because some intern somewhere needed to close a JIRA ticket before end-of-day and doesn't really "get" selectors.

And if I were using any framework other than Vue, that'd all be super-useful stuff. Game-changing stuff. Stuff that makes this entire rant seem like the weirdest of weird hills for
a grumpy-old front-end dev to immolate himself on.

But I use Vue. Vue is the most perfect front-end framework. Vue has single-file components. Those single-file compontents have a powerful `<style>` system with scoped styles and
CSS nesting. They're self-contained and self-documenting. They're (mostly) easy to share between code-bases.

Vue components are a gift, granted from up on high by our lord and savior Evan You, and I want to use them as intended because as intended they are perfect and y'all are just weird
for not doing that.

But everyone uses Tailwind, and Tailwind is good enough, and agents are really good at coding Tailwind, and every junior developer out there is learning Tailwind and has apparently
never learned actual CSS and I'm over 40 and I'm sick of fighting the future.

I need a way to use Tailwind without using Tailwind. I want the advantages of Tailwind, and the ecosystem, and the millions of code-examples out there that I can just grab and move
on with my day.

But I also want to write CSS. I want my markup to be easy to read and write. I don't want to worry about styling when I'm writing HTML and I don't want to worry about HTML when I'm
writing styles, and honestly the fact this doesn't bother more of you keeps me up at night.

So here's f-tailwind.

You keep every Tailwind class, every modifier, every utility.

You just write them in a `<style>` block instead of on your markup. Like goddamn heathens.

You use CSS selectors to specify the elements you want to style, and you write the Tailwind classes you want applied to those elements and you can cram in regular old CSS
properties whenever you need to do something Tailwind can't handle or is just weirdly confusing to do with Tailwind.

You can re-use styles and classes and rules in between components, so you don't have to repeat yourself over and over and over and over again.

If you find Tailwind heavy markup, you can use it in your project. You can use our migration tool to make that nonsense use f-tailwind.

And then f-tailwind compiles it all away at build time, applying the Tailwind classes directly to your elements as `class=""` attributes, and emitting any raw CSS declarations in a
normal `<style scoped>` block that Vite processes like usual. By the time Vue and Tailwind see your component, it's just a normal SFC with class attributes — no runtime, no extra
bytes. All those handy Tailwind optimizations that give you a lower LCP and FCP score? Those still work just fine.

And you can absolutely still use Tailwind and toss in a bunch of class names on top of other class names if you really want.

And no, this isn't `@apply`. `@apply` injects Tailwind's generated CSS into your stylesheet — so now you've got real CSS that the browser has to parse and apply at runtime, which
defeats the entire point of utility CSS. You lose the deduplication, you lose the tiny bundle, you lose the performance wins. Even
[the creator of Tailwind says](https://xcancel.com/adamwathan/status/1559250403547652097) if he started over, `@apply` wouldn't exist. f-tailwind compiles away completely — no
generated CSS, no runtime cost. The output is just utility classes on elements, exactly like hand-written Tailwind.

Sure, it's kinda "Tailwind, but with a lot of extra steps".

But it's also "Tailwind for people who hate Tailwind".

And it's also super-useful, and a good time for good people.

I will not be taking questions at this time.

## Before & After

**Before** — class soup:

```html
<template>
    <div class="flex min-h-screen">
        <aside class="w-64 bg-gray-900 text-white flex flex-col shrink-0">
            <nav class="flex-1 px-3 py-4 space-y-1">
                <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-gray-800 text-white">
                    <span>Dashboard</span>
                </a>
                <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                    <span>Settings</span>
                </a>
            </nav>
        </aside>
        <main class="flex-1 p-8 overflow-auto">
            <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p class="mt-1 text-sm text-gray-500">Welcome back.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <span class="text-sm font-medium text-gray-500">Revenue</span>
                    <p class="text-2xl font-bold text-gray-900 mb-3">$48,352</p>
                </div>
            </div>
        </main>
    </div>
</template>
```

**After** — with f-tailwind:

```html
<template>
    <div>
        <aside>
            <nav>
                <a href="#" class="active"><span>Dashboard</span></a>
                <a href="#"><span>Settings</span></a>
            </nav>
        </aside>
        <main>
            <h1>Dashboard</h1>
            <p>Welcome back.</p>
            <div class="metrics">
                <div class="card">
                    <span>Revenue</span>
                    <p>$48,352</p>
                </div>
            </div>
        </main>
    </div>
</template>

<style lang="f-tailwind">
    & {
      flex min-h-screen

      /* child combinator — aside is a direct child of root */
      > aside {
        w-64 bg-gray-900 text-white flex flex-col shrink-0

        /* descendant — nav anywhere inside aside */
        nav {
          flex-1 px-3 py-4 space-y-1

          a {
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-gray-300 hover:bg-gray-800 hover:text-white transition-colors
          }

          /* class selector */
          .active { bg-gray-800 text-white }
        }
      }

      > main {
        flex-1 p-8 overflow-auto

        h1 { text-2xl font-bold text-gray-900 }

        /* adjacent sibling — p right after h1 */
        h1 + p { mt-1 text-sm text-gray-500 }

        .metrics {
          grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8

          .card {
            bg-white rounded-xl shadow-sm border border-gray-200 p-6

            span { text-sm font-medium text-gray-500 }
            p { text-2xl font-bold text-gray-900 mb-3 }
          }
        }
      }
    }
</style>
```

Same output. Same Tailwind classes. Your template just isn't drowning in them anymore.

### Mixing in raw CSS

Need custom properties, animations, or anything Tailwind can't express? Lines ending with `;` are raw CSS — freely interleaved with Tailwind classes:

```html
<style lang="f-tailwind">
    & {
      bg-gray-950 text-white
      --brand: #667eea;
      --radius: 12px;

      .hero {
        relative overflow-hidden py-24 text-center

        h1 {
          text-5xl font-extrabold tracking-tight
          text-shadow: 0 2px 20px rgba(99, 102, 241, 0.3);
        }

        .cta {
          px-8 py-3.5 font-semibold rounded-xl text-white
          background: linear-gradient(135deg, var(--brand), #764ba2);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
      }
    }
</style>
```

Tailwind classes become `class=""` attributes. Raw CSS declarations emit a `<style scoped>` block that Vite processes normally. Both in one block, zero fuss.

## How It Works

f-tailwind is a **compile-time transform**. A Vite plugin (running with `enforce: 'pre'`) reads your `<style lang="f-tailwind">` block, matches selectors against the `<template>`
AST, and applies the Tailwind classes directly to elements. The style block is removed entirely. By the time Vue and Tailwind see your component, it's a normal SFC with class
attributes — no runtime, no extra bytes.

## Installation

```bash
npm install f-tailwind
```

Add it to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
    modules: ['f-tailwind'],
});
```

To disable without removing from your config:

```ts
export default defineNuxtConfig({
    modules: ['f-tailwind'],
    fTailwind: { enabled: false },
});
```

That's it. Start writing `<style lang="f-tailwind">` blocks.

## Selectors

f-tailwind supports the full CSS selector spec:

| Selector          | Example                           | Matches                          |
| ----------------- | --------------------------------- | -------------------------------- |
| `&`               | `& { ... }`                       | Root element(s) of the template  |
| Tag               | `div { ... }`                     | All `<div>` descendants          |
| Class             | `.card { ... }`                   | Elements with `class="card"`     |
| ID                | `#hero { ... }`                   | Element with `id="hero"`         |
| Universal         | `* { ... }`                       | All elements                     |
| Attribute         | `[data-active]`                   | Elements with that attribute     |
| Attribute value   | `input[type="text"]`              | Exact attribute match            |
| Child             | `> div { ... }`                   | Direct children only             |
| Descendant        | `div { ... }`                     | Any depth (like CSS)             |
| Adjacent sibling  | `h1 + p { ... }`                  | Immediately after `h1`           |
| General sibling   | `h1 ~ p { ... }`                  | Any sibling after `h1`           |
| Compound          | `.card.featured { ... }`          | Elements matching all parts      |
| Comma list        | `input, select, textarea { ... }` | Any of the listed selectors      |
| Structural pseudo | `:first-child`, `:nth-child(2n)`  | Resolved at compile time         |
| Runtime pseudo    | `hover:bg-red-500`                | Passed through to Tailwind as-is |

Selectors nest naturally, just like CSS nesting:

```html
<style lang="f-tailwind">
    & {
      bg-white

      nav {
        bg-gray-900

        > a {
          text-white hover:text-indigo-300
        }
      }

      .sidebar {
        w-64 shrink-0

        .nav-item { px-4 py-2 rounded-lg }
        .active { bg-gray-800 text-white }
      }
    }
</style>
```

## Raw CSS Declarations

Need something Tailwind can't express? Custom properties, complex shadows, animations — just write CSS. Lines ending with `;` are treated as raw CSS declarations. Everything else
is Tailwind classes:

```html
<style lang="f-tailwind">
    & {
      bg-gray-900 py-24
      --brand-primary: #667eea;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);

      > .card {
        rounded-xl p-6
        transition: transform 0.2s ease;
        color: var(--brand-primary);
      }
    }
</style>
```

Tailwind classes get applied to elements as `class=""` attributes. Raw CSS declarations are emitted as a `<style scoped>` block that Vite processes normally.

## Reusable Styles: @export / @use / @import

Define reusable blocks of classes with `@export`, then pull them in wherever you need them with `@use`. Share across files with `@import`.

### Local reuse

```html
<style lang="f-tailwind">
    @export buttons {
      bg-red-500 text-white px-4 py-2 rounded
    }

    @export card {
      rounded-lg shadow-lg p-6 bg-white
      .title { text-lg font-bold mb-2 }
    }

    & {
      > button { @use buttons }
      .sidebar { @use card }
    }
</style>
```

`@export` blocks are definition-only — they don't apply to anything unless `@use`d. `@use` inlines the export's classes, declarations, and nested children into the rule where it
appears.

### Cross-file reuse

Define exports in one file and import them in another:

```html
<!-- components/shared.vue -->
<style lang="f-tailwind">
    @export buttons {
      bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600
    }
</style>
```

```html
<!-- pages/index.vue -->
<style lang="f-tailwind">
    @import buttons from './components/shared.vue'

    & {
      > button { @use buttons }
    }
</style>
```

Or skip the `@import` and use inline resolution:

```html
& {
  > button { @use buttons from './components/shared.vue' }
}
</style>
```

Both syntaxes work. `@import` is better when you use the same export in multiple places within a file.

### Composing exports

Exports can `@use` other exports:

```html
@export base-button { px-4 py-2 rounded font-medium } @export primary-button { @use base-button bg-blue-500 text-white hover:bg-blue-600 }
```

Circular references are detected and warned about.

## Vue Template Behavior

f-tailwind understands Vue's template semantics:

- **`<template>` wrappers are transparent.** `<template v-if>`, `<template v-for>`, and `<template #slot>` elements are not real DOM nodes. Their children are hoisted to the parent
  level for selector matching. `> div` will match a `<div>` inside a `<template v-if>` just as if the wrapper wasn't there.

- **`<slot>` elements are skipped.** Slots are replaced at runtime by the parent component's content, so selectors cannot target them.

- **v-if/v-else branches don't interfere with sibling combinators.** `h1 + p` will not match a `<p v-else>` that follows an `<h1 v-if>`, because they never coexist in the DOM at
  runtime.

- **Structural pseudo-classes work at compile time.** `:first-child`, `:last-child`, `:nth-child()`, `:only-child`, `:first-of-type`, `:last-of-type`, `:nth-of-type()`,
  `:only-of-type`, and `:empty` are resolved statically against the template AST. v-if/v-else alternatives are excluded from sibling counts since they don't coexist at runtime.
  Runtime pseudo-classes (`:hover`, `:focus`, etc.) are passed through to Tailwind as-is.

- **Dynamic `:class` bindings.** If a class selector doesn't match and the template has dynamic `:class` bindings, f-tailwind will include a note in the warning since the class may
  be added at runtime.

- **Transparent Vue built-ins are flattened.** `<Transition>`, `<KeepAlive>`, `<Suspense>`, and `<Teleport>` don't render wrapper DOM elements. f-tailwind flattens them just like
  `<template>` — their children are hoisted to the parent level for selector matching. `> div` will match a `<div>` inside a `<Transition>` directly.

- **`<component :is>` is opaque.** Dynamic components render as unknown tags at runtime. f-tailwind warns when it encounters `<component :is="...">` since tag-based selectors can't
  match reliably. Use class or attribute selectors for dynamic components.

- **Slot content lives in your template.** When you pass children into a component's `<slot>`, those elements are part of _your_ template AST — so your f-tailwind styles apply to
  them naturally. For example, if `<MyButton>` has a `<slot>`, you can style the content you pass into it:

    ```html
    <!-- our-page.vue -->
    <template>
        <MyButton><span>Click me</span></MyButton>
    </template>

    <style lang="f-tailwind">
        & { > span { bg-red text-white px-4 py-2 } }
    </style>
    ```

    The `<span>` gets `bg-red text-white px-4 py-2` because it's in your template.

- **`:slotted()` styles slot content from the child component.** If you're the component _defining_ a `<slot>` and want to style whatever gets passed in, use `:slotted()`. Since
  f-tailwind can't add class attributes to elements it doesn't own, `:slotted()` rules are emitted as `<style scoped>` with `@apply`:

    ```html
    <!-- my-button.vue -->
    <template>
        <button><slot></slot></button>
    </template>

    <style lang="f-tailwind">
        & {
          bg-blue-500 text-white px-4 py-2
          :slotted(span) { font-bold text-lg }
        }
    </style>
    ```

    The `<button>` gets `bg-blue-500 text-white px-4 py-2` as class attributes. The `:slotted(span)` rule is emitted as `<style scoped>` with `@apply font-bold text-lg;`, which
    Tailwind expands at build time.

- **Pseudo-elements are emitted as scoped CSS.** `::before`, `::after`, `::placeholder`, `::selection`, and other pseudo-elements don't exist as template nodes, so f-tailwind can't
  add class attributes to them. Instead, pseudo-element rules are emitted as `<style scoped>` with `@apply`, just like `:slotted()`:

    ```html
    <style lang="f-tailwind">
        & {
          relative p-4
          &::before { absolute inset-0 bg-black/10 }
          > input::placeholder { text-gray-400 italic }
        }
    </style>
    ```

    The root element gets `relative p-4` as class attributes. The `::before` and `::placeholder` rules are emitted as scoped CSS with `@apply`.

- **`:root` matches only root-level elements.** The `:root` pseudo-class matches elements without a parent in the template tree — equivalent to `&` but as a pseudo-class. Nested
  elements never match `:root`.

## Advanced Selectors

Beyond the basics, f-tailwind handles:

| Selector             | Example                 | Matches                              |
| -------------------- | ----------------------- | ------------------------------------ |
| `:has()`             | `div:has(> img)`        | Divs containing a direct child `img` |
| `:not()`             | `div:not(.hidden)`      | Divs without class `hidden`          |
| `:is()` / `:where()` | `div:is(.card, .panel)` | Divs with class `card` or `panel`    |
| `[attr^=val]`        | `[href^="https"]`       | Attribute starts with value          |
| `[attr$=val]`        | `[src$=".png"]`         | Attribute ends with value            |
| `[attr*=val]`        | `[class*="btn"]`        | Attribute contains value             |
| `[attr~=val]`        | `[class~="active"]`     | Space-separated word match           |
| `[attr\|=val]`       | `[lang\|="en"]`         | Exact or prefix match with `-`       |

`:has()`, `:is()`, `:where()`, and `:not()` all support complex inner selectors with combinators. For example, `:has(> ul > li)` checks for a direct `ul` child containing an `li`,
and `:is(div > span)` matches a `span` that is a direct child of a `div`.

### :has() examples

`:has()` is the "parent selector" — it lets you style an element based on what it contains:

```html
<style lang="f-tailwind">
    & {
      /* Style cards that contain an image */
      > .card:has(> img) { overflow-hidden rounded-xl }

      /* Style form groups that contain an invalid input */
      > .form-group:has(> input:invalid) { border-red-500 }

      /* Style divs that have a sibling after them */
      > div:has(+ div) { mb-4 }
    }
</style>
```

All `:has()` relationships are resolved at compile time against your template AST — no runtime cost.

## Warnings & Diagnostics

f-tailwind warns at build time when something looks off:

- **Unmatched selectors.** If a selector doesn't match any element in the template, you'll see: `Selector ".foo" matched no elements in the template`. If the template has dynamic
  `:class` bindings, the warning notes that the class might be added at runtime.

- **Unclosed braces.** Missing `}` in your f-tailwind block: `Unclosed "{" — missing closing "}". Rules after this point may be lost.`

- **Dynamic components.** When `<component :is="...">` is found:
  `<component :is="..."> renders a dynamic tag — tag-based selectors may not match at runtime. Use class or attribute selectors instead.`

- **Malformed directives.** Syntax errors in `@import` or `@use` are reported with line numbers.

- **Circular @use references.** Detected and warned about to prevent infinite loops.

- **Unsupported @rules.** CSS at-rules like `@media`, `@keyframes`, `@supports`, `@layer`, `@container`, and `@font-face` are not supported inside f-tailwind blocks. f-tailwind
  warns and skips them — put these in a regular `<style>` block instead. (Tailwind's responsive modifiers like `sm:`, `md:`, `lg:` work fine — they're class prefixes, not @rules.)

All warnings include file paths and line numbers when available.

## Editor Setup

### Tailwind CSS IntelliSense

The [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) VS Code extension doesn't recognize `lang="f-tailwind"` out of the
box. Add this to your VS Code settings (`.vscode/settings.json`):

```json
{
    "tailwindCSS.includeLanguages": {
        "f-tailwind": "css"
    }
}
```

This gives you autocomplete, color swatches, and hover documentation inside `<style lang="f-tailwind">` blocks.

### TypeScript

If your editor shows red squiggles on `lang="f-tailwind"`, add f-tailwind's type shim to your `tsconfig.json`:

```json
{
    "compilerOptions": {
        "types": ["f-tailwind/shims"]
    }
}
```

## How Class Ordering Works

When multiple rules target the same element, classes are applied in **tree-walk order** — the order rules appear in your style block, depth-first:

```html
<style lang="f-tailwind">
    & {
      > p { text-white font-bold }  /* applied first */
      p { text-sm }                  /* applied second */
    }
</style>
<!-- Result: <p class="text-white font-bold text-sm"> -->
```

Duplicate classes are automatically deduplicated (only the first occurrence is kept). This ordering matches CSS source order intuition — rules that appear later in the style block
have their classes appended after earlier ones.

## Migration

Convert an existing codebase from inline Tailwind classes to f-tailwind format:

```bash
# All .vue files in the current directory
npx f-tailwind-migrate

# Specific glob pattern
npx f-tailwind-migrate "src/**/*.vue"

# Specific file
npx f-tailwind-migrate src/components/Foo.vue

# Preview changes without writing files
npx f-tailwind-migrate --dry-run "src/**/*.vue"
```

The migrate tool reads each file's `<template>`, extracts `class=""` attributes, groups them by CSS selector, and writes a `<style lang="f-tailwind">` block. It automatically
excludes `node_modules/`, `.nuxt/`, and `dist/` directories.

Files that already use f-tailwind are skipped. Files with dynamic `:class` bindings are warned about — static classes are still migrated, but the dynamic bindings are preserved in
the template. Files with existing `<style>` blocks get the new f-tailwind block added alongside them.

## Development

```bash
# Install dependencies
npm install

# Run the playground
npm run dev

# Run tests
npm test

# Run tests once
npm run test:run
```

The playground at `playground/` contains several demo pages exercising different features:

- **Stats** — basic nested selectors
- **Dashboard** — sidebar layout, metric cards, data table
- **Cards** — product catalog grid, hover effects, compound selectors
- **Form** — all input types, radio cards, error states, attribute selectors
- **Landing** — full marketing page with hero, features, testimonials, raw CSS
- **Exports** — @export / @use / @import reusable styles
- **Selectors** — stress test covering every selector type

## License

MIT
