<template>
    <div>
        <header>
            <h1>Team Directory</h1>
            <p>Built by importing styles from the Cards and Dashboard pages.</p>
        </header>

        <div class="team-grid">
            <div class="member-card">
                <div class="avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                    <span>AJ</span>
                </div>
                <div class="info">
                    <h3>Alice Johnson</h3>
                    <p>Engineering Lead</p>
                    <div class="tags">
                        <span class="tag active">Active</span>
                        <span class="tag role">Admin</span>
                    </div>
                </div>
                <button class="invite">View Profile</button>
            </div>

            <div class="member-card">
                <div class="avatar" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
                    <span>BW</span>
                </div>
                <div class="info">
                    <h3>Bob Williams</h3>
                    <p>Senior Designer</p>
                    <div class="tags">
                        <span class="tag active">Active</span>
                        <span class="tag role">Member</span>
                    </div>
                </div>
                <button class="invite">View Profile</button>
            </div>

            <div class="member-card">
                <div class="avatar" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
                    <span>CD</span>
                </div>
                <div class="info">
                    <h3>Carol Davis</h3>
                    <p>DevOps Engineer</p>
                    <div class="tags">
                        <span class="tag away">Away</span>
                        <span class="tag role">Member</span>
                    </div>
                </div>
                <button class="invite">View Profile</button>
            </div>

            <div class="member-card">
                <div class="avatar" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
                    <span>DM</span>
                </div>
                <div class="info">
                    <h3>Dave Miller</h3>
                    <p>Product Manager</p>
                    <div class="tags">
                        <span class="tag offline">Offline</span>
                        <span class="tag role">Admin</span>
                    </div>
                </div>
                <button class="invite">View Profile</button>
            </div>
        </div>

        <section class="activity-feed">
            <h2>Recent Updates</h2>
            <div class="feed-list">
                <div class="feed-item">
                    <div class="dot completed"></div>
                    <div>
                        <p><strong>Alice Johnson</strong> merged PR #142</p>
                        <span>2 hours ago</span>
                    </div>
                </div>
                <div class="feed-item">
                    <div class="dot pending"></div>
                    <div>
                        <p><strong>Bob Williams</strong> requested review on #145</p>
                        <span>4 hours ago</span>
                    </div>
                </div>
                <div class="feed-item">
                    <div class="dot in-progress"></div>
                    <div>
                        <p><strong>Carol Davis</strong> deployed staging-v2.3</p>
                        <span>6 hours ago</span>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style lang="f-tailwind">
    @import product-card, cta-button from './cards.vue'
    @import panel, status-pill from './dashboard.vue'

    & {
      max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12

      header {
        mb-10

        h1 { text-3xl font-bold text-gray-900 }
        h1 + p { mt-2 text-gray-500 }
      }

      /* Cards page gave us product-card — we extend it for team members */
      .team-grid {
        grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12

        .member-card {
          @use product-card
          flex items-center gap-4 p-5

          .avatar {
            w-14 h-14 rounded-full flex items-center justify-center shrink-0

            span { text-lg font-bold text-white }
          }

          .info {
            flex-1 min-w-0

            h3 { text-sm font-semibold text-gray-900 }
            h3 + p { text-sm text-gray-500 }

            .tags {
              mt-2 flex gap-1.5

              /* Dashboard's status-pill, reused for tags */
              .tag {
                @use status-pill
              }

              .active { bg-green-100 text-green-700 }
              .away { bg-yellow-100 text-yellow-700 }
              .offline { bg-gray-100 text-gray-500 }
              .role { bg-indigo-100 text-indigo-700 }
            }
          }

          /* Cards page gave us cta-button — we tone it down for this context */
          .invite {
            @use cta-button
            shrink-0 text-xs px-3 py-1.5
          }
        }
      }

      /* Dashboard's panel, reused for the activity feed container */
      .activity-feed {
        @use panel
        overflow-hidden

        h2 { text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200 }

        .feed-list {
          divide-y divide-gray-100

          .feed-item {
            px-6 py-4 flex items-start gap-3

            .dot {
              w-2.5 h-2.5 rounded-full mt-1.5 shrink-0
            }

            .completed { bg-green-500 }
            .pending { bg-yellow-500 }
            .in-progress { bg-blue-500 }

            p { text-sm text-gray-700 }
            span { text-xs text-gray-400 mt-0.5 block }
          }
        }
      }
    }
</style>
