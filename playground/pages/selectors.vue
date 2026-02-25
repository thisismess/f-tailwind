<template>
    <div>
        <header>
            <h1>Selector Stress Test</h1>
            <p>This page exercises every CSS selector type supported by f-tailwind.</p>
        </header>

        <!-- 1. Universal selector (*) -->
        <section id="universal">
            <h2>1. Universal selector (*)</h2>
            <div class="demo">
                <p>First paragraph</p>
                <span>A span element</span>
                <div>A div element</div>
            </div>
        </section>

        <!-- 2. Tag selectors -->
        <section id="tag">
            <h2>2. Tag selectors</h2>
            <div class="demo">
                <h3>A heading</h3>
                <p>A paragraph</p>
                <span>A span</span>
                <code>Some code</code>
            </div>
        </section>

        <!-- 3. Class selectors (.class, .a.b compound) -->
        <section id="class">
            <h2>3. Class selectors</h2>
            <div class="demo">
                <div class="box">Single class</div>
                <div class="box highlighted">Compound .box.highlighted</div>
                <div class="card premium">Compound .card.premium</div>
                <div class="box">Another single class</div>
            </div>
        </section>

        <!-- 4. ID selector (#id) -->
        <section id="id-sel">
            <h2>4. ID selectors</h2>
            <div class="demo">
                <div id="special-element">I have id="special-element"</div>
                <div>I'm just a regular div</div>
            </div>
        </section>

        <!-- 5. Attribute selectors ([attr], [attr=val]) -->
        <section id="attr">
            <h2>5. Attribute selectors</h2>
            <div class="demo">
                <button data-variant="primary">Primary button</button>
                <button data-variant="secondary">Secondary button</button>
                <button disabled>Disabled button</button>
                <input type="text" placeholder="Text input" />
                <input type="email" placeholder="Email input" />
            </div>
        </section>

        <!-- 6. Child combinator (>) -->
        <section id="child">
            <h2>6. Child combinator (>)</h2>
            <div class="demo">
                <ul>
                    <li>
                        Direct child 1
                        <ul>
                            <li>Nested child A</li>
                            <li>Nested child B</li>
                        </ul>
                    </li>
                    <li>Direct child 2</li>
                    <li>Direct child 3</li>
                </ul>
            </div>
        </section>

        <!-- 7. Descendant combinator (space) -->
        <section id="descendant">
            <h2>7. Descendant combinator (space)</h2>
            <div class="demo">
                <div>
                    <div>
                        <span>Deeply nested span</span>
                    </div>
                    <span>Shallow span</span>
                </div>
            </div>
        </section>

        <!-- 8. Adjacent sibling (+) -->
        <section id="adjacent">
            <h2>8. Adjacent sibling (+)</h2>
            <div class="demo">
                <h3>Heading</h3>
                <p>Paragraph right after heading (should be styled)</p>
                <p>Second paragraph (should NOT be styled by +)</p>
                <h3>Another heading</h3>
                <p>Another first paragraph (should be styled)</p>
            </div>
        </section>

        <!-- 9. General sibling (~) -->
        <section id="general-sib">
            <h2>9. General sibling (~)</h2>
            <div class="demo">
                <h3>Heading</h3>
                <p>First paragraph after heading</p>
                <p>Second paragraph after heading</p>
                <p>Third paragraph after heading</p>
            </div>
        </section>

        <!-- 10. Comma-separated selector lists -->
        <section id="comma">
            <h2>10. Selector lists (comma)</h2>
            <div class="demo">
                <h3>A heading</h3>
                <h4>A sub-heading</h4>
                <p>A paragraph</p>
                <span>A span</span>
            </div>
        </section>

        <!-- 11. Nesting selector (&) with complex children -->
        <section id="nesting">
            <h2>11. Deep nesting</h2>
            <div class="demo">
                <div class="level-1">
                    <div class="level-2">
                        <div class="level-3">
                            <span>Deep content</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 12. Multiple rules targeting same element -->
        <section id="multi-rule">
            <h2>12. Multi-rule accumulation</h2>
            <div class="demo">
                <div class="target special">This element is targeted by multiple rules</div>
            </div>
        </section>

        <!-- 13. Pseudo-class pass-through -->
        <section id="pseudo">
            <h2>13. Pseudo-class pass-through</h2>
            <div class="demo">
                <button class="hover-btn">Hover me</button>
                <button class="focus-btn">Focus me</button>
                <a href="#" class="link">A link with states</a>
            </div>
        </section>

        <!-- 14. Mixed real-world patterns -->
        <section id="mixed">
            <h2>14. Real-world mixed patterns</h2>
            <div class="demo">
                <nav class="breadcrumb">
                    <a href="#">Home</a>
                    <span class="sep">/</span>
                    <a href="#">Products</a>
                    <span class="sep">/</span>
                    <span class="current">Widget Pro</span>
                </nav>

                <div class="pricing-card">
                    <div class="pricing-header">
                        <h3>Professional</h3>
                        <div class="pricing-amount">
                            <span class="currency">$</span>
                            <span class="value">49</span>
                            <span class="period">/mo</span>
                        </div>
                    </div>
                    <ul class="features-list">
                        <li>Unlimited projects</li>
                        <li>Priority support</li>
                        <li>Advanced analytics</li>
                        <li class="disabled">Custom domain</li>
                    </ul>
                    <button>Get Started</button>
                </div>
            </div>
        </section>
    </div>
</template>

<style lang="f-tailwind">
    & {
      max-w-5xl mx-auto px-6 py-12 space-y-16

      > header {
        mb-4

        > h1 { text-3xl font-bold text-gray-900 }
        > p { mt-2 text-gray-500 }
      }

      /* Each section has a heading + demo box */
      > section {
        > h2 { text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2 }

        > .demo {
          p-6 bg-white rounded-xl border border-gray-200 space-y-3
        }
      }

      /* ── 1. Universal (*) — give everything in the demo a baseline ── */
      > #universal > .demo {
        > * { p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-dashed border-gray-300 }
      }

      /* ── 2. Tag selectors ── */
      > #tag > .demo {
        > h3 { text-xl font-bold text-indigo-600 }
        > p { text-base text-gray-700 italic }
        > span { text-sm text-emerald-600 font-medium }
        > code { text-sm font-mono bg-gray-100 px-2 py-1 rounded text-pink-600 }
      }

      /* ── 3. Class selectors (including compound) ── */
      > #class > .demo {
        > .box { p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 }
        > .box.highlighted { bg-yellow-100 border-yellow-400 text-yellow-800 font-bold }
        > .card.premium { p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold }
      }

      /* ── 4. ID selector ── */
      > #id-sel > .demo {
        > #special-element { p-4 bg-amber-100 border-2 border-amber-500 rounded-lg text-amber-800 font-bold }
        > div { p-4 bg-gray-50 rounded-lg text-gray-500 }
      }

      /* ── 5. Attribute selectors ── */
      > #attr > .demo {
        flex flex-wrap gap-3

        > [data-variant="primary"] {
          px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium cursor-pointer
        }

        > [data-variant="secondary"] {
          px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium cursor-pointer
        }

        > [disabled] {
          px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed
        }

        > input[type="text"] {
          px-3 py-2 border border-gray-300 rounded-lg text-sm
        }

        > input[type="email"] {
          px-3 py-2 border border-blue-300 rounded-lg text-sm bg-blue-50
        }
      }

      /* ── 6. Child combinator ── */
      > #child > .demo {
        > ul {
          list-disc pl-5 space-y-2

          > li {
            text-indigo-700 font-medium

            /* Nested ul is NOT a direct child of .demo, so different style */
            > ul {
              list-circle pl-5 mt-1

              > li { text-gray-500 font-normal text-sm }
            }
          }
        }
      }

      /* ── 7. Descendant combinator ── */
      > #descendant > .demo {
        span { text-indigo-600 font-semibold underline }
      }

      /* ── 8. Adjacent sibling (+) ── */
      > #adjacent > .demo {
        > h3 { text-lg font-bold text-gray-900 }
        > h3 + p { text-indigo-600 font-medium pl-4 border-l-4 border-indigo-500 }
        > p { text-gray-500 }
      }

      /* ── 9. General sibling (~) ── */
      > #general-sib > .demo {
        > h3 { text-lg font-bold text-gray-900 }
        > h3 ~ p { text-emerald-600 pl-4 border-l-2 border-emerald-300 }
      }

      /* ── 10. Comma-separated lists ── */
      > #comma > .demo {
        > h3, > h4 { font-bold text-purple-700 }
        > p, > span { text-sm text-gray-600 italic }
      }

      /* ── 11. Deep nesting ── */
      > #nesting > .demo {
        > .level-1 {
          p-4 bg-red-50 rounded-xl border border-red-200

          > .level-2 {
            p-4 bg-orange-50 rounded-lg border border-orange-200

            > .level-3 {
              p-4 bg-yellow-50 rounded-md border border-yellow-200

              > span { text-sm font-bold text-yellow-800 }
            }
          }
        }
      }

      /* ── 12. Multi-rule: same element from two rules ── */
      > #multi-rule > .demo {
        > .target { p-4 rounded-lg text-sm border border-gray-300 }
        > .special { bg-indigo-50 text-indigo-700 font-bold }
      }

      /* ── 13. Pseudo-class pass-through ── */
      > #pseudo > .demo {
        flex gap-4

        > .hover-btn {
          px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer
          hover:bg-indigo-600 hover:text-white transition-colors
        }

        > .focus-btn {
          px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer
          focus:ring-2 focus:ring-indigo-500 focus:outline-none
        }

        > .link {
          text-indigo-600 underline hover:text-indigo-800 visited:text-purple-600
        }
      }

      /* ── 14. Mixed real-world ── */
      > #mixed > .demo {
        space-y-6

        > .breadcrumb {
          flex items-center gap-2 text-sm

          > a { text-indigo-600 hover:underline }
          > .sep { text-gray-300 }
          > .current { text-gray-500 font-medium }
        }

        > .pricing-card {
          max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden

          > .pricing-header {
            bg-indigo-600 text-white p-6

            > h3 { text-lg font-semibold mb-2 }

            > .pricing-amount {
              flex items-baseline

              > .currency { text-2xl font-medium opacity-70 }
              > .value { text-5xl font-extrabold }
              > .period { text-lg opacity-70 ml-1 }
            }
          }

          > .features-list {
            p-6 space-y-3

            > li {
              flex items-center gap-2 text-sm text-gray-700
            }

            > .disabled { text-gray-400 line-through }
          }

          > button {
            w-full py-3 bg-indigo-600 text-white font-semibold
            hover:bg-indigo-700 transition-colors cursor-pointer
          }
        }
      }
    }
</style>
