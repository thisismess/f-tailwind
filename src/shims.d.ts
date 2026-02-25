/**
 * Type augmentation for <style lang="f-tailwind"> blocks.
 *
 * Add to your tsconfig.json:
 *   { "compilerOptions": { "types": ["f-tailwind/shims"] } }
 */
declare module '@vue/compiler-sfc' {
    interface SFCStyleBlock {
        lang?: 'css' | 'scss' | 'sass' | 'less' | 'stylus' | 'postcss' | 'f-tailwind' | (string & {});
    }
}

export {};
