import { defineBuildConfig } from 'unbuild';
import { copyFileSync } from 'node:fs';

export default defineBuildConfig({
    entries: [{ input: 'src/cli/migrate', name: 'cli/migrate' }],
    // shims.d.mts is copied in build:done hook — suppress the validation
    // warning that fires before the hook completes
    failOnWarn: false,
    hooks: {
        'build:done'() {
            // Copy type-only shims declaration to dist
            copyFileSync('src/shims.d.ts', 'dist/shims.d.mts');
        },
    },
});
