<template>
    <div>
        <!-- Hero section -->
        <section id="hero">
            <div class="content">
                <div class="badge">
                    <span>New Release</span>
                    <span class="arrow">&rarr;</span>
                </div>
                <h1>Build beautiful interfaces <br /><span>without the class soup.</span></h1>
                <p>f-tailwind lets you write Tailwind utilities in a CSS-like block that mirrors your DOM. Clean templates, full Tailwind power, zero runtime cost.</p>
                <div class="cta-row">
                    <a href="#features" class="primary">Get Started</a>
                    <a href="#demo" class="secondary">See Demo &rarr;</a>
                </div>
            </div>
            <div class="bg-decoration">
                <div class="blob-1"></div>
                <div class="blob-2"></div>
            </div>
        </section>

        <!-- Logos / social proof -->
        <section class="logos">
            <p>Trusted by developers at</p>
            <div>
                <span>Acme Corp</span>
                <span>Globex</span>
                <span>Initech</span>
                <span>Hooli</span>
                <span>Umbrella</span>
            </div>
        </section>

        <!-- Features grid -->
        <section id="features">
            <div class="section-header">
                <span class="overline">Features</span>
                <h2>Everything you need</h2>
                <p>Write Tailwind the way CSS was meant to be written.</p>
            </div>

            <div class="feature-grid">
                <div class="feature">
                    <div class="icon-wrap blue">
                        <span>&#9881;</span>
                    </div>
                    <h3>Zero Runtime</h3>
                    <p>Compiles away at build time. Your users never download a single extra byte.</p>
                </div>
                <div class="feature">
                    <div class="icon-wrap purple">
                        <span>&#9733;</span>
                    </div>
                    <h3>Full CSS Selectors</h3>
                    <p>Use >, +, ~, .class, #id, [attr], and * selectors. The full CSS spec, not a subset.</p>
                </div>
                <div class="feature">
                    <div class="icon-wrap green">
                        <span>&#9998;</span>
                    </div>
                    <h3>IDE Support</h3>
                    <p>Syntax highlighting, autocomplete, and error checking work out of the box.</p>
                </div>
                <div class="feature">
                    <div class="icon-wrap orange">
                        <span>&#8644;</span>
                    </div>
                    <h3>Migration CLI</h3>
                    <p>One command to convert your existing Tailwind components to the new format.</p>
                </div>
                <div class="feature">
                    <div class="icon-wrap pink">
                        <span>&#9776;</span>
                    </div>
                    <h3>Source Maps</h3>
                    <p>Full source map support means DevTools point to your .vue file, not generated output.</p>
                </div>
                <div class="feature">
                    <div class="icon-wrap teal">
                        <span>&#10003;</span>
                    </div>
                    <h3>Vue 3 + Nuxt 3</h3>
                    <p>First-class support for Vue 3 SFCs and Nuxt 3 modules. Drop in and go.</p>
                </div>
            </div>
        </section>

        <!-- Testimonials -->
        <section class="testimonials">
            <div class="section-header">
                <span class="overline">Testimonials</span>
                <h2>Loved by developers</h2>
            </div>

            <div class="testimonial-grid">
                <blockquote>
                    <p>"My templates went from 200 characters of classes per element to zero. This is how Tailwind should have always worked."</p>
                    <footer>
                        <div class="avatar" style="background: #667eea">AK</div>
                        <div>
                            <cite>Alex Kim</cite>
                            <span>Senior Frontend Engineer</span>
                        </div>
                    </footer>
                </blockquote>
                <blockquote>
                    <p>"The migration CLI converted our entire codebase in under 30 seconds. We haven't looked back since."</p>
                    <footer>
                        <div class="avatar" style="background: #f093fb">MR</div>
                        <div>
                            <cite>Maria Rodriguez</cite>
                            <span>Tech Lead at Globex</span>
                        </div>
                    </footer>
                </blockquote>
                <blockquote>
                    <p>"I can finally read my Vue templates again. The CSS-nesting syntax feels completely natural."</p>
                    <footer>
                        <div class="avatar" style="background: #4facfe">JP</div>
                        <div>
                            <cite>James Park</cite>
                            <span>Indie Developer</span>
                        </div>
                    </footer>
                </blockquote>
            </div>
        </section>

        <!-- CTA section -->
        <section class="cta-section">
            <div>
                <h2>Ready to clean up your templates?</h2>
                <p>Get started in under 5 minutes. No configuration required.</p>
                <div class="cta-buttons">
                    <a href="#" class="cta-primary">Install Now</a>
                    <a href="#" class="cta-secondary">Read the Docs</a>
                </div>
            </div>
        </section>

        <!-- Footer -->
        <footer id="site-footer">
            <div>
                <div class="footer-grid">
                    <div>
                        <h4>f-tailwind</h4>
                        <p>Clean Tailwind for Vue templates.</p>
                    </div>
                    <div>
                        <h4>Resources</h4>
                        <ul>
                            <li><a href="#">Documentation</a></li>
                            <li><a href="#">Examples</a></li>
                            <li><a href="#">Changelog</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4>Community</h4>
                        <ul>
                            <li><a href="#">GitHub</a></li>
                            <li><a href="#">Discord</a></li>
                            <li><a href="#">Twitter</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>MIT License. Made with care.</p>
                </div>
            </div>
        </footer>
    </div>
</template>

<style lang="f-tailwind">
    & {
      bg-white
      --brand-primary: #667eea;
      --brand-secondary: #764ba2;

      /* ── Hero — use #id selector, descendant selectors inside ── */
      #hero {
        relative overflow-hidden bg-gray-950 text-white

        .content {
          relative z-10 max-w-4xl mx-auto px-6 py-24 sm:py-32 lg:py-40 text-center

          .badge {
            inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6

            .arrow { text-indigo-400 }
          }

          h1 {
            text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight
            text-shadow: 0 2px 20px rgba(99, 102, 241, 0.3);

            span { text-indigo-400 }
          }

          p {
            mt-6 text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed
          }

          .cta-row {
            mt-10 flex flex-col sm:flex-row items-center justify-center gap-4

            .primary {
              px-8 py-3.5 text-white font-semibold rounded-xl text-base
              background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .secondary {
              px-8 py-3.5 text-gray-300 font-semibold
              hover:text-white transition-colors text-base
            }
          }
        }

        .bg-decoration {
          absolute inset-0 overflow-hidden pointer-events-none

          .blob-1 {
            absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl
            animation: float 8s ease-in-out infinite;
          }

          .blob-2 {
            absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl
            animation: float 10s ease-in-out infinite reverse;
          }
        }
      }

      /* ── Logos ── */
      .logos {
        py-12 bg-gray-50 border-y border-gray-200

        p { text-center text-sm text-gray-500 mb-6 }

        span {
          text-xl font-bold text-gray-300 tracking-tight
        }
      }

      /* ── Features — #id + descendant selectors ── */
      #features {
        max-w-7xl mx-auto px-6 py-24

        .section-header {
          text-center mb-16

          .overline { text-sm font-semibold text-indigo-600 uppercase tracking-wider }
          h2 { mt-2 text-3xl sm:text-4xl font-bold text-gray-900 }
          p { mt-4 text-lg text-gray-500 }
        }

        .feature-grid {
          grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8

          .feature {
            p-6 rounded-2xl border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all

            .icon-wrap {
              w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4

              span { text-2xl }
            }

            .blue { bg-blue-100 text-blue-600 }
            .purple { bg-purple-100 text-purple-600 }
            .green { bg-green-100 text-green-600 }
            .orange { bg-orange-100 text-orange-600 }
            .pink { bg-pink-100 text-pink-600 }
            .teal { bg-teal-100 text-teal-600 }

            h3 { text-lg font-semibold text-gray-900 mb-2 }
            p { text-sm text-gray-500 leading-relaxed }
          }
        }
      }

      /* ── Testimonials ── */
      .testimonials {
        bg-gray-50 py-24 px-6

        .section-header {
          text-center mb-16

          .overline { text-sm font-semibold text-indigo-600 uppercase tracking-wider }
          h2 { mt-2 text-3xl sm:text-4xl font-bold text-gray-900 }
        }

        .testimonial-grid {
          max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8

          blockquote {
            bg-white rounded-2xl p-8 shadow-sm border border-gray-200

            > p { text-gray-600 leading-relaxed italic mb-6 }

            footer {
              flex items-center gap-3

              .avatar {
                w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0
              }

              cite { text-sm font-semibold text-gray-900 not-italic }
              span { text-xs text-gray-500 }
            }
          }
        }
      }

      /* ── CTA ── */
      .cta-section {
        py-24 px-6

        h2 { text-3xl sm:text-4xl font-bold text-gray-900 }
        p { mt-4 text-lg text-gray-500 }

        > div {
          max-w-3xl mx-auto text-center

          .cta-buttons {
            mt-8 flex flex-col sm:flex-row items-center justify-center gap-4

            .cta-primary {
              px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl
              hover:bg-indigo-700 transition-colors
            }

            .cta-secondary {
              px-8 py-3.5 text-indigo-600 font-semibold border border-indigo-200 rounded-xl
              hover:bg-indigo-50 transition-colors
            }
          }
        }
      }

      /* ── Footer — #id selector ── */
      #site-footer {
        bg-gray-900 text-gray-300

        > div {
          max-w-7xl mx-auto px-6 py-12

          .footer-grid {
            grid grid-cols-1 md:grid-cols-3 gap-8 mb-8

            h4 { text-white font-semibold mb-3 }
            p { text-sm text-gray-400 }

            ul {
              space-y-2

              a { text-sm text-gray-400 hover:text-white transition-colors }
            }
          }

          .footer-bottom {
            pt-8 border-t border-gray-700

            p { text-sm text-gray-500 }
          }
        }
      }
    }
</style>
