<template>
    <div>
        <div class="form-container">
            <header>
                <h1>Create Account</h1>
                <p>Fill out the form below to get started with your free account.</p>
            </header>

            <form @submit.prevent>
                <!-- Name row: first + last -->
                <div class="row">
                    <div class="field">
                        <label for="first-name">First name</label>
                        <input id="first-name" type="text" placeholder="Jane" />
                    </div>
                    <div class="field">
                        <label for="last-name">Last name</label>
                        <input id="last-name" type="text" placeholder="Smith" />
                    </div>
                </div>

                <!-- Email -->
                <div class="field">
                    <label for="email">Email address</label>
                    <div class="input-with-icon">
                        <span class="icon">@</span>
                        <input id="email" type="email" placeholder="jane@example.com" />
                    </div>
                    <p class="hint">We'll never share your email with anyone else.</p>
                </div>

                <!-- Password -->
                <div class="field">
                    <label for="password">Password</label>
                    <input id="password" type="password" placeholder="At least 8 characters" />
                    <div class="strength-meter">
                        <div class="bar strong"></div>
                        <div class="bar strong"></div>
                        <div class="bar strong"></div>
                        <div class="bar"></div>
                    </div>
                    <p class="hint">Strong password - good job!</p>
                </div>

                <!-- Role select -->
                <div class="field">
                    <label for="role">Account type</label>
                    <select id="role">
                        <option value="">Choose a role...</option>
                        <option value="developer">Developer</option>
                        <option value="designer">Designer</option>
                        <option value="manager">Product Manager</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <!-- Bio textarea -->
                <div class="field">
                    <label for="bio">Short bio</label>
                    <textarea id="bio" rows="3" placeholder="Tell us a bit about yourself..."></textarea>
                    <p class="char-count">0 / 200 characters</p>
                </div>

                <!-- Checkbox group -->
                <fieldset>
                    <legend>Notifications</legend>
                    <div class="checkbox-group">
                        <label class="checkbox">
                            <input type="checkbox" checked />
                            <span class="checkmark"></span>
                            <span>Email notifications for new features</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" checked />
                            <span class="checkmark"></span>
                            <span>Weekly digest summary</span>
                        </label>
                        <label class="checkbox">
                            <input type="checkbox" />
                            <span class="checkmark"></span>
                            <span>Marketing communications</span>
                        </label>
                    </div>
                </fieldset>

                <!-- Radio group -->
                <fieldset>
                    <legend>Plan</legend>
                    <div class="radio-group">
                        <label class="radio-card">
                            <input type="radio" name="plan" value="free" checked />
                            <div>
                                <span class="plan-name">Free</span>
                                <span class="plan-price">$0/mo</span>
                                <span class="plan-desc">Up to 3 projects</span>
                            </div>
                        </label>
                        <label class="radio-card">
                            <input type="radio" name="plan" value="pro" />
                            <div>
                                <span class="plan-name">Pro</span>
                                <span class="plan-price">$19/mo</span>
                                <span class="plan-desc">Unlimited projects</span>
                            </div>
                        </label>
                        <label class="radio-card">
                            <input type="radio" name="plan" value="team" />
                            <div>
                                <span class="plan-name">Team</span>
                                <span class="plan-price">$49/mo</span>
                                <span class="plan-desc">Up to 10 members</span>
                            </div>
                        </label>
                    </div>
                </fieldset>

                <!-- Error example -->
                <div class="field error">
                    <label for="company">Company (required)</label>
                    <input id="company" type="text" aria-invalid="true" />
                    <p class="error-message">Company name is required.</p>
                </div>

                <!-- Actions -->
                <div class="actions">
                    <button type="button" class="secondary">Cancel</button>
                    <button type="submit" class="primary">Create Account</button>
                </div>
            </form>
        </div>
    </div>
</template>

<style lang="f-tailwind">
    & {
      min-h-screen bg-gray-50 py-12 px-4

      /* descendant: .form-container is nested inside a wrapper div */
      .form-container {
        max-w-2xl mx-auto

        header {
          mb-8

          h1 { text-2xl font-bold text-gray-900 }
          p { mt-2 text-gray-500 }
        }

        form {
          bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6

          /* descendant: .field anywhere inside the form */
          .field { flex flex-col gap-1.5 }

          /* > child: .row is a direct child of form */
          > .row {
            grid grid-cols-1 sm:grid-cols-2 gap-4
          }

          /* descendant: all labels, inputs, etc. at any depth */
          label {
            text-sm font-medium text-gray-700
          }

          /* comma-separated selector list + attribute selectors */
          input[type="text"],
          input[type="email"],
          input[type="password"],
          select,
          textarea {
            w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            transition-shadow
          }

          /* descendant selectors for form helpers */
          .input-with-icon {
            relative flex items-center

            .icon {
              absolute left-3 text-gray-400 text-sm pointer-events-none
            }

            input { pl-8 }
          }

          .hint { text-xs text-gray-400 }

          .strength-meter {
            flex gap-1 mt-1

            .bar { h-1.5 flex-1 rounded-full bg-gray-200 }
            .strong { bg-green-500 }
          }

          .char-count { text-xs text-gray-400 text-right }

          /* fieldsets — mix of > and descendant */
          fieldset {
            border-0 p-0

            legend { text-sm font-medium text-gray-700 mb-3 }

            .checkbox-group {
              space-y-3

              .checkbox {
                flex items-center gap-3 cursor-pointer

                input[type="checkbox"] {
                  w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500
                }

                span { text-sm text-gray-600 }
              }
            }

            .radio-group {
              grid grid-cols-1 sm:grid-cols-3 gap-3

              .radio-card {
                relative flex cursor-pointer rounded-xl border border-gray-200 p-4
                hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors
                has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50

                input[type="radio"] { sr-only }

                .plan-name { text-sm font-semibold text-gray-900 }
                .plan-price { text-lg font-bold text-indigo-600 }
                .plan-desc { text-xs text-gray-500 mt-1 }
              }
            }
          }

          /* error state — descendant */
          .error {
            input {
              border-red-500 focus:ring-red-500 focus:border-red-500
            }

            .error-message { text-sm text-red-600 }
          }

          /* > child: .actions is direct child of form */
          > .actions {
            flex justify-end gap-3 pt-4 border-t border-gray-200

            .secondary {
              px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors cursor-pointer
            }

            .primary {
              px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg
              hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer
              }
            }
          }
        }
      }
    }
</style>
