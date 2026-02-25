<template>
    <div>
        <div>
            <dl>
                <div class="stat">
                    <dt>Transactions every 24 hours</dt>
                    <dd>44 million</dd>
                </div>
                <div class="stat">
                    <dt>Assets under holding</dt>
                    <dd>$119 trillion</dd>
                </div>
                <div class="stat">
                    <dt>New users annually</dt>
                    <dd>46,000</dd>
                </div>
            </dl>
        </div>
    </div>
</template>

<style lang="f-tailwind">
    & {
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
    }
</style>
