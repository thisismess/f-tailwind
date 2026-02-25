<template>
    <div>
        <!-- Sidebar -->
        <aside>
            <div class="logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                </svg>
                <span>Admin Panel</span>
            </div>
            <nav>
                <a class="active" href="#">
                    <span class="icon">&#9776;</span>
                    <span>Dashboard</span>
                </a>
                <a href="#">
                    <span class="icon">&#9998;</span>
                    <span>Projects</span>
                </a>
                <a href="#">
                    <span class="icon">&#9733;</span>
                    <span>Favorites</span>
                </a>
                <a href="#">
                    <span class="icon">&#9881;</span>
                    <span>Settings</span>
                </a>
            </nav>
            <div class="user-section">
                <div class="avatar">JS</div>
                <div>
                    <p class="name">Jane Smith</p>
                    <p class="role">Administrator</p>
                </div>
            </div>
        </aside>

        <!-- Main content -->
        <main>
            <header>
                <h1>Dashboard Overview</h1>
                <p>Welcome back, Jane. Here's what's happening today.</p>
            </header>

            <!-- Metric cards -->
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Total Revenue</span>
                        <span class="metric-badge up">+12.5%</span>
                    </div>
                    <p class="metric-value">$48,352</p>
                    <div class="metric-chart">
                        <div style="width: 75%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Active Users</span>
                        <span class="metric-badge up">+4.2%</span>
                    </div>
                    <p class="metric-value">2,847</p>
                    <div class="metric-chart">
                        <div style="width: 60%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Bounce Rate</span>
                        <span class="metric-badge down">-2.1%</span>
                    </div>
                    <p class="metric-value">24.3%</p>
                    <div class="metric-chart">
                        <div style="width: 24%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-header">
                        <span class="metric-label">Avg. Session</span>
                        <span class="metric-badge up">+8.7%</span>
                    </div>
                    <p class="metric-value">4m 32s</p>
                    <div class="metric-chart">
                        <div style="width: 45%"></div>
                    </div>
                </div>
            </div>

            <!-- Recent activity table -->
            <section class="activity">
                <h2>Recent Activity</h2>
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Alice Johnson</td>
                            <td>Created new project</td>
                            <td>2 hours ago</td>
                            <td><span class="status-badge completed">Completed</span></td>
                        </tr>
                        <tr>
                            <td>Bob Williams</td>
                            <td>Updated billing info</td>
                            <td>4 hours ago</td>
                            <td><span class="status-badge pending">Pending</span></td>
                        </tr>
                        <tr>
                            <td>Carol Davis</td>
                            <td>Deployed to production</td>
                            <td>6 hours ago</td>
                            <td><span class="status-badge completed">Completed</span></td>
                        </tr>
                        <tr>
                            <td>Dave Miller</td>
                            <td>Submitted support ticket</td>
                            <td>8 hours ago</td>
                            <td><span class="status-badge in-progress">In Progress</span></td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </main>
    </div>
</template>

<style lang="f-tailwind">
    @export panel {
      bg-white rounded-xl shadow-sm border border-gray-200
    }

    @export status-pill {
      px-2.5 py-1 rounded-full text-xs font-medium
    }

    & {
      /* Root: full-width flex layout */
      flex min-h-screen

      /* ── Sidebar ── */
      > aside {
        w-64 bg-gray-900 text-white flex flex-col shrink-0

        /* descendant: .logo could be at any depth inside aside */
        .logo {
          px-6 py-5 flex items-center gap-3 border-b border-gray-700

          svg { w-8 h-8 text-indigo-400 }
          span { text-lg font-semibold }
        }

        nav {
          flex-1 px-3 py-4 space-y-1

          a {
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors

            .icon { text-lg w-5 text-center }
          }

          .active {
            bg-gray-800 text-white
          }
        }

        .user-section {
          px-4 py-4 border-t border-gray-700 flex items-center gap-3

          .avatar {
            w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold
          }

          .name { text-sm font-medium }
          .role { text-xs text-gray-400 }
        }
      }

      /* ── Main content area ── */
      > main {
        flex-1 p-8 overflow-auto

        header {
          mb-8

          h1 { text-2xl font-bold text-gray-900 }
          h1 + p { mt-1 text-sm text-gray-500 }
        }

        /* ── Metric cards grid ── */
        .metrics {
          grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8

          .metric-card {
            @use panel
            p-6

            .metric-header {
              flex items-center justify-between mb-2

              .metric-label { text-sm font-medium text-gray-500 }
              .metric-badge { text-xs font-semibold px-2 py-0.5 rounded-full }
              .up { bg-green-100 text-green-700 }
              .down { bg-red-100 text-red-700 }
            }

            .metric-value {
              text-2xl font-bold text-gray-900 mb-3
            }

            .metric-chart {
              h-2 bg-gray-100 rounded-full overflow-hidden

              div { h-full bg-indigo-500 rounded-full }
            }
          }
        }

        /* ── Activity section ── */
        .activity {
          @use panel

          h2 { text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200 }

          /* table internals: descendant selectors reach through thead/tbody */
          table {
            w-full text-sm

            th {
              px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50
            }

            tr {
              border-b border-gray-100 hover:bg-gray-50 transition-colors
            }

            td {
              px-6 py-4 text-gray-700
            }

            .status-badge { @use status-pill }
            .completed { bg-green-100 text-green-700 }
            .pending { bg-yellow-100 text-yellow-700 }
            .in-progress { bg-blue-100 text-blue-700 }
          }
        }
      }
    }
</style>
