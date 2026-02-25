<template>
    <div>
        <nav>
            <div>
                <span>f-tailwind playground</span>
                <div>
                    <NuxtLink to="/">Stats</NuxtLink>
                    <NuxtLink to="/dashboard">Dashboard</NuxtLink>
                    <NuxtLink to="/cards">Cards</NuxtLink>
                    <NuxtLink to="/form">Form</NuxtLink>
                    <NuxtLink to="/landing">Landing</NuxtLink>
                    <NuxtLink to="/selectors">Selectors</NuxtLink>
                    <NuxtLink to="/exports">Exports</NuxtLink>
                </div>
            </div>
        </nav>
        <NuxtPage />
    </div>
</template>

<style lang="f-tailwind">
    & {
      min-h-screen bg-gray-100

      nav {
        bg-white shadow-sm border-b border-gray-200

        > div {
          mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between

          span { text-sm font-bold text-gray-900 tracking-tight }

          > div { flex items-center gap-4 }

          a {
            text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors
          }
        }
      }
    }
</style>
