<template>
    <div>
        <h1>@apply Bug Reproduction</h1>
        <p>
            This page recreates the
            <a href="https://play.tailwindcss.com/umP5RqgsuW?file=css">@apply bug</a>
            Adam Wathan demonstrated. With @apply, sibling selectors and compound class selectors break because @apply only copies declarations, not selector relationships.
            f-tailwind doesn't have this problem because it applies classes directly to elements.
        </p>

        <h2>f-tailwind version (works correctly)</h2>

        <div class="parent">
            Green background
            <div class="child">Red background</div>
        </div>
        <div class="parent is-current">
            Orange background with a yellow top border
            <div class="child">Red background</div>
        </div>
    </div>
</template>

<style lang="f-tailwind">
    & {
        p-8

        > h1 { text-2xl font-bold mb-4 }
        > h2 { text-lg font-semibold mb-2 }
        > p { mb-6 text-gray-600 }
        > a { text-blue-500 underline }

        /* Parent sections — green background */
        > .parent {
            p-3 bg-green-600 text-white mb-0

            /* Direct child gets red */
            > .child { bg-red-600 p-2 }
        }

        /* Adjacent sibling parent gets yellow top border */
        > .parent + .parent {
            border-t-2 border-yellow-400
        }

        /* Compound: parent AND is-current gets orange */
        > .parent.is-current {
            bg-orange-500
        }
    }
</style>
