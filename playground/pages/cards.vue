<template>
    <div>
        <header>
            <h1>Product Catalog</h1>
            <p>Browse our latest collection of premium products.</p>
            <div class="filters">
                <button class="active">All</button>
                <button>Electronics</button>
                <button>Clothing</button>
                <button>Home</button>
            </div>
        </header>

        <div class="grid">
            <article class="card">
                <div class="image-wrap">
                    <div class="placeholder" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                        <span>NEW</span>
                    </div>
                </div>
                <div class="body">
                    <div class="meta">
                        <span class="category">Electronics</span>
                        <span class="rating">4.8 &#9733;</span>
                    </div>
                    <h3>Wireless Headphones Pro</h3>
                    <p>Premium noise-cancelling headphones with 40-hour battery life and spatial audio support.</p>
                    <div class="footer">
                        <div class="price">
                            <span class="current">$299</span>
                            <span class="original">$399</span>
                        </div>
                        <button>Add to Cart</button>
                    </div>
                </div>
            </article>

            <article class="card">
                <div class="image-wrap">
                    <div class="placeholder" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                        <span>SALE</span>
                    </div>
                </div>
                <div class="body">
                    <div class="meta">
                        <span class="category">Clothing</span>
                        <span class="rating">4.5 &#9733;</span>
                    </div>
                    <h3>Merino Wool Sweater</h3>
                    <p>Ultra-soft merino wool blend, perfect for layering. Available in 6 colors.</p>
                    <div class="footer">
                        <div class="price">
                            <span class="current">$89</span>
                            <span class="original">$120</span>
                        </div>
                        <button>Add to Cart</button>
                    </div>
                </div>
            </article>

            <article class="card">
                <div class="image-wrap">
                    <div class="placeholder" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"></div>
                </div>
                <div class="body">
                    <div class="meta">
                        <span class="category">Home</span>
                        <span class="rating">4.9 &#9733;</span>
                    </div>
                    <h3>Smart LED Desk Lamp</h3>
                    <p>App-controlled lighting with 16M colors, timer, and circadian rhythm mode.</p>
                    <div class="footer">
                        <div class="price">
                            <span class="current">$79</span>
                        </div>
                        <button>Add to Cart</button>
                    </div>
                </div>
            </article>

            <article class="card featured">
                <div class="image-wrap">
                    <div class="placeholder" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
                        <span>BEST SELLER</span>
                    </div>
                </div>
                <div class="body">
                    <div class="meta">
                        <span class="category">Electronics</span>
                        <span class="rating">4.9 &#9733;</span>
                    </div>
                    <h3>Mechanical Keyboard</h3>
                    <p>Hot-swappable switches, per-key RGB, gasket mount, and PBT keycaps included.</p>
                    <div class="footer">
                        <div class="price">
                            <span class="current">$189</span>
                        </div>
                        <button>Add to Cart</button>
                    </div>
                </div>
            </article>

            <article class="card">
                <div class="image-wrap">
                    <div class="placeholder" style="background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"></div>
                </div>
                <div class="body">
                    <div class="meta">
                        <span class="category">Clothing</span>
                        <span class="rating">4.3 &#9733;</span>
                    </div>
                    <h3>Canvas Backpack</h3>
                    <p>Durable waxed canvas with leather accents. Fits 15" laptops with room to spare.</p>
                    <div class="footer">
                        <div class="price">
                            <span class="current">$129</span>
                            <span class="original">$159</span>
                        </div>
                        <button>Add to Cart</button>
                    </div>
                </div>
            </article>

            <article class="card">
                <div class="image-wrap">
                    <div class="placeholder" style="background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)"></div>
                </div>
                <div class="body">
                    <div class="meta">
                        <span class="category">Home</span>
                        <span class="rating">4.6 &#9733;</span>
                    </div>
                    <h3>Ceramic Pour-Over Set</h3>
                    <p>Handmade ceramic dripper with double-wall glass server. Makes 2-4 cups.</p>
                    <div class="footer">
                        <div class="price">
                            <span class="current">$64</span>
                        </div>
                        <button>Add to Cart</button>
                    </div>
                </div>
            </article>
        </div>
    </div>
</template>

<style lang="f-tailwind">
    @export product-card {
      bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden
      hover:shadow-lg hover:-translate-y-1 transition-all duration-300
    }

    @export cta-button {
      px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg
      hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer
    }

    & {
      max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12

      header {
        mb-10 text-center

        h1 { text-3xl sm:text-4xl font-bold text-gray-900 }
        h1 + p { mt-3 text-lg text-gray-500 max-w-2xl mx-auto }

        .filters {
          mt-8 flex flex-wrap justify-center gap-2

          button {
            px-4 py-2 rounded-full text-sm font-medium border border-gray-300 text-gray-600
            hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer
          }

          .active {
            bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700 hover:text-white
          }
        }
      }

      .grid {
        grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8

        .card {
          @use product-card

          .image-wrap {
            aspect-video overflow-hidden

            .placeholder {
              w-full h-full flex items-center justify-center

              span {
                bg-white/90 text-xs font-bold px-3 py-1 rounded-full text-gray-800 uppercase tracking-wider
              }
            }
          }

          .body {
            p-6

            .meta {
              flex items-center justify-between mb-3

              .category { text-xs font-semibold uppercase tracking-wider text-indigo-600 }
              .rating { text-sm text-yellow-500 font-medium }
            }

            h3 { text-lg font-bold text-gray-900 mb-2 }

            > p { text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 }

            .footer {
              flex items-center justify-between pt-4 border-t border-gray-100

              .price {
                flex items-baseline gap-2

                .current { text-xl font-bold text-gray-900 }
                .original { text-sm text-gray-400 line-through }
              }

              button { @use cta-button }
            }
          }
        }

        /* Featured card gets a ring highlight */
        .featured {
          ring-2 ring-indigo-500 ring-offset-2
        }
      }
    }
</style>
