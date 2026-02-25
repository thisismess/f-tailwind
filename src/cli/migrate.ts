#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { glob } from 'node:fs/promises';
import { reverseTransform } from '../transform/reverse';

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`Usage: f-tailwind-migrate [options] [patterns...]

Converts Vue files with inline Tailwind classes to f-tailwind format.

Options:
  --dry-run    Show what would change without writing files
  --help, -h   Show this help message

Examples:
  f-tailwind-migrate                          # All .vue files in cwd
  f-tailwind-migrate "src/**/*.vue"           # Specific glob pattern
  f-tailwind-migrate src/components/Foo.vue   # Specific file
  f-tailwind-migrate --dry-run "src/**/*.vue" # Preview changes`);
        process.exit(0);
    }

    const dryRun = args.includes('--dry-run');
    const patterns = args.filter((a) => !a.startsWith('--'));
    if (patterns.length === 0) patterns.push('**/*.vue');
    const cwd = process.cwd();

    const files: string[] = [];
    for (const pattern of patterns) {
        // If it's a direct file path (no glob chars), use it directly
        if (!pattern.includes('*') && !pattern.includes('{')) {
            files.push(pattern);
        } else {
            for await (const entry of glob(pattern, { cwd, exclude: ['node_modules/**', '.nuxt/**', 'dist/**'] })) {
                files.push(entry);
            }
        }
    }

    let transformed = 0;
    let skippedDynamic = 0;
    for (const file of files) {
        const fullPath = resolve(cwd, file);
        let code: string;
        try {
            code = readFileSync(fullPath, 'utf-8');
        } catch {
            console.warn(`Skipping ${file}: could not read`);
            continue;
        }

        // Skip files that already use f-tailwind
        if (code.includes('lang="f-tailwind"') || code.includes("lang='f-tailwind'")) {
            continue;
        }
        // Skip files with no class attributes in template
        if (!code.includes('class="')) continue;

        // Warn about files with dynamic :class bindings
        const hasDynamic = code.includes(':class=') || code.includes('v-bind:class=');
        if (hasDynamic) {
            skippedDynamic++;
            console.warn(`Warning: ${file} has dynamic :class bindings. Static classes will be migrated but dynamic bindings are preserved.`);
        }

        // Warn about files that already have <style> blocks
        const hasExistingStyle = /<style[\s>]/i.test(code);
        if (hasExistingStyle) {
            console.warn(`Warning: ${file} already has a <style> block. The new <style lang="f-tailwind"> block will be added alongside it.`);
        }

        const result = reverseTransform(code);
        if (result !== code) {
            if (dryRun) {
                console.log(`Would migrate: ${file}`);
            } else {
                writeFileSync(fullPath, result, 'utf-8');
                console.log(`Migrated: ${file}`);
            }
            transformed++;
        }
    }

    if (dryRun) {
        console.log(`\nDry run complete. ${transformed} file(s) would be transformed.`);
    } else {
        console.log(`\nDone. Transformed ${transformed} file(s).`);
    }
    if (skippedDynamic > 0) {
        console.log(`Note: ${skippedDynamic} file(s) had dynamic :class bindings — review these manually.`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
