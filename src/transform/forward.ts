import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import MagicString from 'magic-string';
import { parse as parseSFC } from '@vue/compiler-sfc';
import selectorParser from 'postcss-selector-parser';
import { parseStyleBlock } from '../parser/style-tree';
import { buildTemplateTree } from '../parser/template-tree';
import type { StyleRule, TemplateNode, ExportBlock, ParseResult } from '../parser/types';

export interface TransformResult {
    code: string;
    map: ReturnType<MagicString['generateMap']>;
}

/**
 * Per-instance state for caches and dependency tracking.
 * Each Vite plugin instance should create its own state so SSR client/server
 * builds don't share caches in the same Node process.
 */
export interface TransformState {
    exportsCache: Map<string, ExportBlock[]>;
    importDeps: Map<string, Set<string>>;
}

export function createTransformState(): TransformState {
    return {
        exportsCache: new Map(),
        importDeps: new Map(),
    };
}

/**
 * Forward transform: takes a Vue SFC with `<style lang="f-tailwind">`
 * and produces a standard Vue SFC with Tailwind classes on elements.
 *
 * The style block uses CSS-nesting syntax with selectors:
 *   & { bg-gray-900 > div { mx-auto > .stat { flex } } }
 */
export function forwardTransform(code: string, id: string, state: TransformState = defaultState): TransformResult | null {
    const { descriptor } = parseSFC(code, { filename: id });

    // Support multiple <style lang="f-tailwind"> blocks
    const ftStyles = descriptor.styles.filter((s) => s.lang === 'f-tailwind');
    if (ftStyles.length === 0) return null;

    const template = descriptor.template;
    if (!template) return null;

    const s = new MagicString(code);

    // Merge parse results from all f-tailwind blocks
    const allResults = ftStyles.map((ft) => parseStyleBlock(ft.content, id));
    const mergedResult: ParseResult = {
        rules: allResults.flatMap((r) => r.rules),
        exports: allResults.flatMap((r) => r.exports),
        imports: allResults.flatMap((r) => r.imports),
    };

    const rules = resolveDirectives(mergedResult, id, state);

    // Extract :slotted() rules before selector matching — they can't match
    // template elements (slot content lives in the parent's AST)
    const slottedRules = extractSlottedRules(rules);

    // Extract pseudo-element rules (::before, ::after, etc.) — they target
    // virtual elements that don't exist in the template AST
    const pseudoElementRules = extractPseudoElementRules(rules);

    const templateNodes = buildTemplateTree(template.ast);

    // Phase 1: Collect all classes per element (avoids MagicString conflicts
    // when multiple rules target the same element)
    const classMap = new Map<TemplateNode, string[]>();
    const matchedRules = new Set<StyleRule>();
    for (const rule of rules) {
        collectClasses(rule, templateNodes, classMap, matchedRules);
    }

    // Warn about dynamic <component :is> elements
    warnDynamicComponents(templateNodes, id);

    // Warn about selectors that matched no template elements
    const hasDynClass = hasDynamicClassInTree(templateNodes);
    warnUnmatchedRules(rules, matchedRules, id, hasDynClass);

    // Warn if :slotted() rules exist but template has no <slot> elements
    if (slottedRules.length > 0 && !hasSlotElement(template.ast)) {
        console.warn(`[f-tailwind] :slotted() rules found but template has no <slot> element — ` + `the emitted CSS will never apply (${id})`);
    }

    // Phase 2: Apply all collected classes in one shot per element
    for (const [el, classes] of classMap) {
        addClasses(s, code, el, classes);
    }

    // Remove all <style lang="f-tailwind">...</style> blocks
    for (const ftStyle of ftStyles) {
        removeStyleBlock(s, code, ftStyle);
    }

    // Emit <style scoped> for raw CSS declarations and/or :slotted() rules
    const scopedCSS = buildScopedCSS(rules);
    const slottedCSS = buildSlottedCSS(slottedRules);
    const pseudoElementCSS = buildSlottedCSS(pseudoElementRules);
    const combinedCSS = [scopedCSS, slottedCSS, pseudoElementCSS].filter(Boolean).join('\n');
    if (combinedCSS) {
        s.append(`\n<style scoped>\n${combinedCSS}\n</style>\n`);
    }

    if (!s.hasChanged()) return null;

    return {
        code: s.toString(),
        map: s.generateMap({ source: id, hires: true }),
    };
}

/**
 * Collect classes from a style rule into classMap without modifying the source.
 * Multiple rules targeting the same element accumulate their classes.
 */
function collectClasses(rule: StyleRule, scopeElements: TemplateNode[], classMap: Map<TemplateNode, string[]>, matchedRules: Set<StyleRule>, parentMatched?: TemplateNode[]): void {
    const matched = matchSelector(rule.selector, scopeElements, parentMatched);
    if (matched.length > 0) matchedRules.add(rule);

    for (const el of matched) {
        if (rule.classes.length > 0) {
            const existing = classMap.get(el) || [];
            existing.push(...rule.classes);
            classMap.set(el, existing);
        }

        for (const childRule of rule.children) {
            collectClasses(childRule, el.children, classMap, matchedRules, [el]);
        }
    }
}

/**
 * Check if any element in a tree has a dynamic :class binding.
 */
function hasDynamicClassInTree(nodes: TemplateNode[]): boolean {
    for (const node of nodes) {
        if (node.hasDynamicClass) return true;
        if (hasDynamicClassInTree(node.children)) return true;
    }
    return false;
}

/**
 * Walk the rule tree and warn about selectors that matched no template elements.
 * Skips the `&` root selector and doesn't recurse into unmatched parents
 * (their children can't have matched either).
 */
function warnUnmatchedRules(rules: StyleRule[], matchedRules: Set<StyleRule>, filePath: string, hasDynClass: boolean): void {
    for (const rule of rules) {
        if (rule.selector === '&') {
            warnUnmatchedRules(rule.children, matchedRules, filePath, hasDynClass);
            continue;
        }

        if (!matchedRules.has(rule)) {
            const hasContent = rule.classes.length > 0 || rule.declarations.length > 0 || rule.children.length > 0;
            if (hasContent) {
                let msg = `[f-tailwind] Selector "${rule.selector}" matched no elements in the template (${filePath})`;
                if (hasDynClass && rule.selector.includes('.')) {
                    msg += '. Note: some elements use dynamic :class bindings which cannot be matched at compile time';
                }
                console.warn(msg);
            }
            continue;
        }

        warnUnmatchedRules(rule.children, matchedRules, filePath, hasDynClass);
    }
}

/**
 * Warn about <component :is="..."> elements in the template.
 * Dynamic components render as unknown tags at runtime, so tag-based
 * selectors may not match as expected.
 */
function warnDynamicComponents(nodes: TemplateNode[], filePath: string): void {
    for (const node of nodes) {
        if (node.tag === 'component') {
            console.warn(
                `[f-tailwind] <component :is="..."> renders a dynamic tag — tag-based selectors may not match at runtime (${filePath}). ` +
                    `Use class or attribute selectors instead.`
            );
        }
        warnDynamicComponents(node.children, filePath);
    }
}

/**
 * Check if the raw Vue template AST contains any <slot> elements.
 * Walks the unparsed AST (before buildTemplateTree filters slots out).
 */
function hasSlotElement(ast: any): boolean {
    for (const child of ast.children || []) {
        // tagType 2 = slot in Vue's compiler
        if (child.type === 1 && child.tag === 'slot') return true;
        if (child.children && hasSlotElement(child)) return true;
    }
    return false;
}

// =============================================================================
// @export / @use / @import resolution
// =============================================================================

/** Default module-level state (used by tests and direct callers) */
const defaultState: TransformState = createTransformState();

/**
 * Invalidate cached exports for a specific file, or clear the entire cache.
 * Called by the Vite plugin on HMR updates.
 */
export function clearExportsCache(filePath?: string, state: TransformState = defaultState): void {
    if (filePath) {
        state.exportsCache.delete(resolve(filePath));
    } else {
        state.exportsCache.clear();
    }
}

/**
 * Get all files that depend on (import from) the given provider file.
 * Used by the Vite plugin for HMR propagation.
 */
export function getImportDependents(providerPath: string, state: TransformState = defaultState): string[] {
    const abs = resolve(providerPath);
    const dependents: string[] = [];
    for (const [consumer, providers] of state.importDeps) {
        if (providers.has(abs)) dependents.push(consumer);
    }
    return dependents;
}

/**
 * Read a .vue file and extract its @export blocks.
 */
function extractExportsFromFile(filePath: string, state: TransformState): ExportBlock[] {
    const abs = resolve(filePath);
    const cached = state.exportsCache.get(abs);
    if (cached) return cached;

    let content: string;
    try {
        content = readFileSync(abs, 'utf-8');
    } catch {
        console.warn(`[f-tailwind] Could not read file: ${filePath}`);
        return [];
    }

    if (!content.includes('lang="f-tailwind"') && !content.includes("lang='f-tailwind'")) {
        state.exportsCache.set(abs, []);
        return [];
    }

    const { descriptor } = parseSFC(content, { filename: abs });
    const ftStyle = descriptor.styles.find((s) => s.lang === 'f-tailwind');
    if (!ftStyle) {
        state.exportsCache.set(abs, []);
        return [];
    }

    const result = parseStyleBlock(ftStyle.content, abs);

    // Pre-resolve @use between exports in the same file so that
    // importers get fully resolved exports (e.g., if export "button"
    // does @use "base", both defined in the same file)
    if (result.exports.length > 0) {
        const localRegistry = new Map<string, ExportBlock>();
        for (const exp of result.exports) {
            localRegistry.set(exp.name, exp);
        }
        for (const [, exp] of localRegistry) {
            resolveUsesInExport(exp, localRegistry, dirname(abs), new Set(), new Set(), state);
        }
    }

    state.exportsCache.set(abs, result.exports);
    return result.exports;
}

/**
 * Deep clone a StyleRule so the same export can be inlined multiple times.
 */
function cloneRule(rule: StyleRule): StyleRule {
    return {
        selector: rule.selector,
        classes: [...rule.classes],
        declarations: [...rule.declarations],
        uses: [...rule.uses],
        children: rule.children.map(cloneRule),
    };
}

/**
 * Resolve @import and @use directives, returning a flat rule array
 * with all uses inlined.
 */
function resolveDirectives(result: ParseResult, filePath: string, state: TransformState): StyleRule[] {
    const registry = new Map<string, ExportBlock>();
    const dir = dirname(filePath);
    const absFilePath = resolve(filePath);

    // Track dependencies for HMR propagation
    const deps = new Set<string>();

    // Local @export blocks — warn on duplicates
    for (const exp of result.exports) {
        if (registry.has(exp.name)) {
            console.warn(`[f-tailwind] Duplicate @export name "${exp.name}". The later definition will be used.`);
        }
        registry.set(exp.name, exp);
    }

    // @import directives — load exports from other files
    for (const imp of result.imports) {
        const absPath = resolve(dir, imp.from);
        deps.add(absPath);
        const fileExports = extractExportsFromFile(absPath, state);
        const foundNames = new Set(fileExports.map((e) => e.name));
        for (const name of imp.names) {
            const exp = fileExports.find((e) => e.name === name);
            if (exp) {
                registry.set(name, exp); // last wins
            } else {
                console.warn(`[f-tailwind] @import: name "${name}" not found in ${imp.from} (available: ${[...foundNames].join(', ') || 'none'})`);
            }
        }
    }

    // Resolve @use inside export blocks (allows composing exports from other exports)
    for (const [, exp] of registry) {
        resolveUsesInExport(exp, registry, dir, new Set(), deps, state);
    }

    // Walk rules and resolve @use directives
    resolveUsesInRules(result.rules, registry, dir, new Set(), deps, state);

    // Store dependency graph for HMR propagation
    if (deps.size > 0) {
        state.importDeps.set(absFilePath, deps);
    } else {
        state.importDeps.delete(absFilePath);
    }

    return result.rules;
}

/**
 * Resolve @use directives inside an @export block body.
 * This allows exports to compose other exports.
 */
function resolveUsesInExport(exp: ExportBlock, registry: Map<string, ExportBlock>, dir: string, resolving: Set<string>, deps: Set<string>, state: TransformState): void {
    for (const use of exp.uses) {
        const cycleKey = use.from ? `${resolve(dir, use.from)}#${use.name}` : use.name;

        if (resolving.has(cycleKey)) {
            console.warn(`[f-tailwind] Circular @use detected in @export "${exp.name}": "${use.name}" is already being resolved.`);
            continue;
        }

        let block: ExportBlock | undefined;
        if (use.from) {
            const absPath = resolve(dir, use.from);
            deps.add(absPath);
            const fileExports = extractExportsFromFile(absPath, state);
            block = fileExports.find((e) => e.name === use.name);
            if (!block) {
                console.warn(`[f-tailwind] @use in @export "${exp.name}": name "${use.name}" not found in ${use.from}`);
            }
        } else {
            block = registry.get(use.name);
            if (!block) {
                console.warn(`[f-tailwind] @use in @export "${exp.name}": name "${use.name}" is not defined.`);
            }
        }

        if (!block) continue;

        resolving.add(cycleKey);
        exp.classes.push(...block.classes);
        exp.declarations.push(...block.declarations);
        for (const child of block.children) {
            exp.children.push(cloneRule(child));
        }
        resolving.delete(cycleKey);
    }
    exp.uses = [];

    // Also resolve @use in nested children
    resolveUsesInRules(exp.children, registry, dir, resolving, deps, state);
}

/**
 * Recursively resolve @use directives in a rule array.
 * The `resolving` set tracks names currently being inlined to detect cycles.
 */
function resolveUsesInRules(rules: StyleRule[], registry: Map<string, ExportBlock>, dir: string, resolving: Set<string>, deps: Set<string>, state: TransformState): void {
    for (const rule of rules) {
        for (const use of rule.uses) {
            // Build a key that uniquely identifies this @use to detect cycles
            const cycleKey = use.from ? `${resolve(dir, use.from)}#${use.name}` : use.name;

            if (resolving.has(cycleKey)) {
                console.warn(`[f-tailwind] Circular @use detected: "${use.name}" is already being resolved. Skipping to prevent infinite loop.`);
                continue;
            }

            let block: ExportBlock | undefined;

            if (use.from) {
                // Inline @use name from 'path' — resolve from file
                const absPath = resolve(dir, use.from);
                deps.add(absPath);
                const fileExports = extractExportsFromFile(absPath, state);
                block = fileExports.find((e) => e.name === use.name);
                if (!block) {
                    console.warn(`[f-tailwind] @use: name "${use.name}" not found in ${use.from}`);
                }
            } else {
                block = registry.get(use.name);
                if (!block) {
                    console.warn(`[f-tailwind] @use: name "${use.name}" is not defined. Did you forget an @export or @import?`);
                }
            }

            if (!block) continue;

            // Track this name as being resolved
            resolving.add(cycleKey);

            // Inline: append classes, declarations, and deep-cloned children
            rule.classes.push(...block.classes);
            rule.declarations.push(...block.declarations);
            for (const child of block.children) {
                rule.children.push(cloneRule(child));
            }

            resolving.delete(cycleKey);
        }
        rule.uses = [];

        // Recurse into children
        resolveUsesInRules(rule.children, registry, dir, resolving, deps, state);
    }
}

// =============================================================================
// Selector matching — powered by postcss-selector-parser
// =============================================================================

/**
 * Match a CSS selector against template elements.
 *
 * Uses postcss-selector-parser for a proper CSS selector AST, giving us
 * full support for: *, tag, .class, #id, [attr], [attr=val], pseudo-classes,
 * and combinators (>, +, ~, descendant space), plus comma-separated lists.
 */
function matchSelector(selectorStr: string, scopeElements: TemplateNode[], parentMatched?: TemplateNode[]): TemplateNode[] {
    const ast = selectorParser().astSync(selectorStr);
    const seen = new Set<TemplateNode>();
    const results: TemplateNode[] = [];

    // Each top-level node is a comma-separated selector part
    for (const selector of ast.nodes) {
        if (selector.type !== 'selector') continue;
        for (const el of matchSelectorPart(selector, scopeElements, parentMatched)) {
            if (!seen.has(el)) {
                seen.add(el);
                results.push(el);
            }
        }
    }

    return results;
}

type SelectorNode = selectorParser.Node;
type Selector = selectorParser.Selector;

/**
 * Match a single (non-comma-separated) selector against elements.
 *
 * Splits the selector into segments separated by combinators, then
 * walks the segments left-to-right, narrowing the matching set.
 */
function matchSelectorPart(selector: Selector, scopeElements: TemplateNode[], parentMatched?: TemplateNode[]): TemplateNode[] {
    const nodes = selector.nodes;

    // Check for `&` nesting selector — matches the parent's matched elements.
    // In CSS nesting, `&` refers to the element matched by the enclosing rule.
    // At top level (no parentMatched), scopeElements IS the root elements.
    if (nodes.length === 1 && nodes[0].type === 'nesting') {
        return parentMatched || scopeElements;
    }

    // Split into segments: [combinator, compound-selector-parts]
    const segments = splitIntoCombinatorSegments(nodes);
    if (segments.length === 0) return [];

    // Process first segment
    const first = segments[0];
    let current: TemplateNode[];

    if (first.combinator === '>') {
        current = scopeElements.filter((el) => matchesCompound(el, first.parts));
    } else if (first.combinator === '+') {
        current = matchAdjacentSibling(scopeElements, [], first.parts);
    } else if (first.combinator === '~') {
        current = matchGeneralSibling(scopeElements, [], first.parts);
    } else {
        // Descendant (space or no combinator)
        current = findDescendantsMatching(scopeElements, first.parts);
    }

    // Process remaining segments (chained combinators)
    for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.combinator === '>') {
            const next: TemplateNode[] = [];
            for (const el of current) {
                next.push(...el.children.filter((ch) => matchesCompound(ch, seg.parts)));
            }
            current = next;
        } else if (seg.combinator === '+') {
            current = matchAdjacentSiblingViaParent(current, seg.parts);
        } else if (seg.combinator === '~') {
            current = matchGeneralSiblingViaParent(current, seg.parts);
        } else {
            const next: TemplateNode[] = [];
            for (const el of current) {
                next.push(...findDescendantsMatching(el.children, seg.parts));
            }
            current = next;
        }
    }

    return current;
}

interface CombinatorSegment {
    combinator: string; // '>' | '+' | '~' | ' ' (descendant)
    parts: SelectorNode[]; // compound selector nodes (tag, class, id, attr, etc.)
}

/**
 * Split a selector's nodes into segments separated by combinators.
 *
 * Input:  [Combinator(>), Tag(h2), Combinator(+), Tag(p)]
 * Output: [{ combinator: '>', parts: [Tag(h2)] }, { combinator: '+', parts: [Tag(p)] }]
 */
function splitIntoCombinatorSegments(nodes: SelectorNode[]): CombinatorSegment[] {
    const segments: CombinatorSegment[] = [];
    let currentCombinator = ' '; // default: descendant
    let currentParts: SelectorNode[] = [];

    for (const node of nodes) {
        if (node.type === 'combinator') {
            if (currentParts.length > 0) {
                segments.push({ combinator: currentCombinator, parts: currentParts });
                currentParts = [];
            }
            currentCombinator = (node.value || '').trim();
        } else if (node.type === 'nesting') {
            // `&` at start — skip, it's handled by the caller
            continue;
        } else {
            currentParts.push(node);
        }
    }

    if (currentParts.length > 0) {
        segments.push({ combinator: currentCombinator, parts: currentParts });
    }

    return segments;
}

/**
 * Check if an element matches a compound selector (list of simple selectors).
 * ALL parts must match (compound = AND logic).
 * Pseudo-classes/pseudo-elements are ignored (runtime CSS concepts).
 */
function matchesCompound(el: TemplateNode, parts: SelectorNode[]): boolean {
    for (const part of parts) {
        switch (part.type) {
            case 'universal':
                // * matches everything
                break;
            case 'tag':
                if (el.tag !== part.value) return false;
                break;
            case 'class':
                if (!el.classes.includes(part.value)) return false;
                break;
            case 'id':
                if (el.id !== part.value) return false;
                break;
            case 'attribute': {
                const attrName = (part as selectorParser.Attribute).attribute;
                const attrOp = (part as selectorParser.Attribute).operator;
                const attrVal = (part as selectorParser.Attribute).value;

                if (!(attrName in el.attributes)) return false;

                if (attrOp && attrVal !== undefined) {
                    const elVal = el.attributes[attrName];
                    if (elVal === true) return false; // boolean attr can't match a value
                    switch (attrOp) {
                        case '=':
                            if (elVal !== attrVal) return false;
                            break;
                        case '^=':
                            if (!elVal.startsWith(attrVal)) return false;
                            break;
                        case '$=':
                            if (!elVal.endsWith(attrVal)) return false;
                            break;
                        case '*=':
                            if (!elVal.includes(attrVal)) return false;
                            break;
                        case '~=':
                            if (!elVal.split(/\s+/).includes(attrVal)) return false;
                            break;
                        case '|=':
                            if (elVal !== attrVal && !elVal.startsWith(attrVal + '-')) return false;
                            break;
                        default:
                            break;
                    }
                }
                break;
            }
            case 'pseudo': {
                const pseudo = part as selectorParser.Pseudo;

                if (pseudo.value === ':has' && pseudo.nodes) {
                    // :has() — element must have descendants/siblings matching inner selector
                    let anyMatch = false;
                    for (const inner of pseudo.nodes) {
                        if (inner.type === 'selector') {
                            if (matchesHasSelector(el, inner.nodes as SelectorNode[])) {
                                anyMatch = true;
                                break;
                            }
                        }
                    }
                    if (!anyMatch) return false;
                } else if (pseudo.value === ':not' && pseudo.nodes) {
                    // :not() — element must NOT match any inner selector (supports complex selectors)
                    for (const inner of pseudo.nodes) {
                        if (inner.type === 'selector') {
                            if (elementMatchesComplexSelector(el, inner.nodes as SelectorNode[])) {
                                return false;
                            }
                        }
                    }
                } else if ((pseudo.value === ':is' || pseudo.value === ':where') && pseudo.nodes) {
                    // :is() / :where() — element must match at least one inner selector (supports complex selectors)
                    let anyMatch = false;
                    for (const inner of pseudo.nodes) {
                        if (inner.type === 'selector') {
                            if (elementMatchesComplexSelector(el, inner.nodes as SelectorNode[])) {
                                anyMatch = true;
                                break;
                            }
                        }
                    }
                    if (!anyMatch) return false;
                } else if (!matchStructuralPseudo(el, pseudo)) {
                    return false;
                }
                break;
            }
            default:
                // Unknown node type — skip
                break;
        }
    }
    return true;
}

// =============================================================================
// Structural pseudo-class matching
// =============================================================================

/**
 * Structural pseudo-classes that can be resolved at compile time.
 * Runtime pseudo-classes (:hover, :focus, :active, etc.) are silently skipped.
 */
const RUNTIME_PSEUDOS = new Set([
    ':hover',
    ':focus',
    ':active',
    ':visited',
    ':link',
    ':focus-within',
    ':focus-visible',
    ':checked',
    ':disabled',
    ':enabled',
    ':required',
    ':optional',
    ':valid',
    ':invalid',
    ':in-range',
    ':out-of-range',
    ':placeholder-shown',
    ':autofill',
    ':read-only',
    ':read-write',
    ':target',
    ':scope',
    ':defined',
    ':fullscreen',
    ':modal',
    ':picture-in-picture',
    ':any-link',
    ':local-link',
    ':default',
    ':indeterminate',
]);

/**
 * Get the siblings array for an element, filtering out conditional
 * alternatives that don't coexist at runtime.
 */
function getRuntimeSiblings(el: TemplateNode): TemplateNode[] {
    if (!el.parent) return [el];
    return el.parent.children.filter((sib) => {
        // Keep siblings in the same conditional branch or non-conditional siblings
        if (!el.conditional || !sib.conditional) return true;
        return el.conditional.chainId !== sib.conditional.chainId || el.conditional.branchIdx === sib.conditional.branchIdx;
    });
}

/**
 * Match a structural pseudo-class against an element.
 * Returns true if the pseudo-class matches (or is a runtime pseudo that's skipped).
 * Returns false if the pseudo-class doesn't match.
 */
function matchStructuralPseudo(el: TemplateNode, pseudo: selectorParser.Pseudo): boolean {
    const value = pseudo.value;

    // Runtime pseudo-classes/elements — skip (always match)
    if (RUNTIME_PSEUDOS.has(value)) return true;

    const siblings = getRuntimeSiblings(el);
    const index = siblings.indexOf(el);

    switch (value) {
        case ':first-child':
            return index === 0;

        case ':last-child':
            return index === siblings.length - 1;

        case ':only-child':
            return siblings.length === 1;

        case ':first-of-type': {
            const firstOfType = siblings.find((s) => s.tag === el.tag);
            return firstOfType === el;
        }

        case ':last-of-type': {
            for (let i = siblings.length - 1; i >= 0; i--) {
                if (siblings[i].tag === el.tag) return siblings[i] === el;
            }
            return false;
        }

        case ':only-of-type':
            return siblings.filter((s) => s.tag === el.tag).length === 1;

        case ':root':
            return !el.parent;

        case ':empty':
            return el.children.length === 0;

        case ':nth-child':
        case ':nth-last-child':
        case ':nth-of-type':
        case ':nth-last-of-type': {
            const arg = extractPseudoArg(pseudo);
            if (!arg) return true; // Can't parse → skip (don't break matching)

            let pool: TemplateNode[];
            let pos: number;

            if (value === ':nth-of-type' || value === ':nth-last-of-type') {
                pool = siblings.filter((s) => s.tag === el.tag);
            } else {
                pool = siblings;
            }

            if (value === ':nth-last-child' || value === ':nth-last-of-type') {
                pos = pool.length - pool.indexOf(el); // 1-based from end
            } else {
                pos = pool.indexOf(el) + 1; // 1-based from start
            }

            return matchesAnPlusB(arg, pos);
        }

        default:
            // Unknown pseudo — skip (don't prevent matching)
            return true;
    }
}

/**
 * Extract the text argument from a pseudo-class like :nth-child(2n+1).
 */
function extractPseudoArg(pseudo: selectorParser.Pseudo): string | null {
    if (!pseudo.nodes || pseudo.nodes.length === 0) return null;
    // The argument is the text content of the inner selector
    const inner = pseudo.nodes[0];
    if (inner && inner.type === 'selector') {
        return inner.toString().trim();
    }
    return null;
}

/**
 * Match An+B syntax against a 1-based position.
 * Supports: odd, even, N, An, An+B, An-B, -n+B
 */
function matchesAnPlusB(expr: string, pos: number): boolean {
    const s = expr.trim().toLowerCase();

    if (s === 'odd') return pos % 2 === 1;
    if (s === 'even') return pos % 2 === 0;

    // Pure number: "3" → matches position 3
    if (/^-?\d+$/.test(s)) return pos === parseInt(s, 10);

    // An+B pattern: parse into a and b
    const match = s.match(/^(-?\d*)n\s*([+-]\s*\d+)?$/);
    if (!match) return true; // Unparsable → skip

    const a = match[1] === '' || match[1] === '+' ? 1 : match[1] === '-' ? -1 : parseInt(match[1], 10);
    const b = match[2] ? parseInt(match[2].replace(/\s/g, ''), 10) : 0;

    if (a === 0) return pos === b;
    // pos = a*k + b where k >= 0 (or k >= 1 for negative a)
    const remainder = pos - b;
    if (remainder === 0) return true;
    if (a > 0) return remainder > 0 && remainder % a === 0;
    // a < 0: pos <= b and (pos - b) divisible by |a|
    return remainder <= 0 && remainder % a === 0;
}

// =============================================================================
// :has() — forward matching from subject element
// =============================================================================

/**
 * Check if an element satisfies a :has() inner selector.
 * :has() inner selectors are relative — evaluated FROM the subject element.
 *
 * - :has(> .child)  → search el.children
 * - :has(.desc)     → search el's subtree
 * - :has(+ .next)   → check adjacent sibling after el
 * - :has(~ .later)  → check following siblings
 */
function matchesHasSelector(el: TemplateNode, nodes: SelectorNode[]): boolean {
    const segments = splitIntoCombinatorSegments(nodes);
    if (segments.length === 0) return false;

    const first = segments[0];
    let current: TemplateNode[];

    if (first.combinator === '>') {
        current = el.children.filter((ch) => matchesCompound(ch, first.parts));
    } else if (first.combinator === '+') {
        const siblings = getRuntimeSiblings(el);
        const idx = siblings.indexOf(el);
        if (idx >= 0 && idx < siblings.length - 1) {
            const next = siblings[idx + 1];
            current = matchesCompound(next, first.parts) ? [next] : [];
        } else {
            current = [];
        }
    } else if (first.combinator === '~') {
        const siblings = getRuntimeSiblings(el);
        const idx = siblings.indexOf(el);
        current = idx >= 0 ? siblings.slice(idx + 1).filter((s) => matchesCompound(s, first.parts)) : [];
    } else {
        // Descendant (default)
        current = findDescendantsMatching(el.children, first.parts);
    }

    // Chain remaining segments (same logic as matchSelectorPart)
    for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.combinator === '>') {
            const next: TemplateNode[] = [];
            for (const matched of current) {
                next.push(...matched.children.filter((ch) => matchesCompound(ch, seg.parts)));
            }
            current = next;
        } else if (seg.combinator === '+') {
            current = matchAdjacentSiblingViaParent(current, seg.parts);
        } else if (seg.combinator === '~') {
            current = matchGeneralSiblingViaParent(current, seg.parts);
        } else {
            const next: TemplateNode[] = [];
            for (const matched of current) {
                next.push(...findDescendantsMatching(matched.children, seg.parts));
            }
            current = next;
        }
    }

    return current.length > 0;
}

// =============================================================================
// Complex selector matching for :is() / :where() / :not()
// =============================================================================

/**
 * Check if an element matches a complex selector (may contain combinators).
 * Walks backwards from the element through ancestors/siblings.
 *
 * For simple selectors (no combinators), this is equivalent to matchesCompound().
 * For complex selectors like `div > span`, checks that el matches `span`
 * and el.parent matches `div`.
 */
function elementMatchesComplexSelector(el: TemplateNode, nodes: SelectorNode[]): boolean {
    const segments = splitIntoCombinatorSegments(nodes);
    if (segments.length === 0) return false;

    // Element must match the LAST segment's compound parts
    const last = segments[segments.length - 1];
    if (!matchesCompound(el, last.parts)) return false;
    if (segments.length === 1) return true;

    return matchBackwards(el, segments, segments.length - 1);
}

/**
 * Walk backwards through combinator segments, verifying each ancestor/sibling
 * relationship. `el` has already been verified to match `segments[segIdx].parts`.
 */
function matchBackwards(el: TemplateNode, segments: CombinatorSegment[], segIdx: number): boolean {
    if (segIdx === 0) return true; // All segments matched

    const combinator = segments[segIdx].combinator;
    const prevParts = segments[segIdx - 1].parts;

    switch (combinator) {
        case '>': {
            // el is a direct child of the previous match
            if (!el.parent || !matchesCompound(el.parent, prevParts)) return false;
            return matchBackwards(el.parent, segments, segIdx - 1);
        }
        case ' ':
        case '': {
            // el is a descendant of the previous match — walk ancestors
            let ancestor = el.parent;
            while (ancestor) {
                if (matchesCompound(ancestor, prevParts)) {
                    if (matchBackwards(ancestor, segments, segIdx - 1)) return true;
                }
                ancestor = ancestor.parent;
            }
            return false;
        }
        case '+': {
            // el is adjacent sibling after the previous match
            const siblings = getRuntimeSiblings(el);
            const idx = siblings.indexOf(el);
            if (idx <= 0) return false;
            const prev = siblings[idx - 1];
            if (!matchesCompound(prev, prevParts)) return false;
            return matchBackwards(prev, segments, segIdx - 1);
        }
        case '~': {
            // el is general sibling after the previous match
            const siblings = getRuntimeSiblings(el);
            const idx = siblings.indexOf(el);
            for (let i = idx - 1; i >= 0; i--) {
                if (matchesCompound(siblings[i], prevParts)) {
                    if (matchBackwards(siblings[i], segments, segIdx - 1)) return true;
                }
            }
            return false;
        }
        default:
            return false;
    }
}

/**
 * Find all descendants (any depth) matching a compound selector.
 */
function findDescendantsMatching(nodes: TemplateNode[], parts: SelectorNode[]): TemplateNode[] {
    const result: TemplateNode[] = [];
    for (const node of nodes) {
        if (matchesCompound(node, parts)) result.push(node);
        result.push(...findDescendantsMatching(node.children, parts));
    }
    return result;
}

/**
 * Adjacent sibling combinator (+).
 *
 * If `anchors` is empty, we scan `siblings` for pairs where element[i] matches
 * the PREVIOUS segment and element[i+1] matches `parts`.
 * If `anchors` is provided, we find siblings immediately after each anchor.
 */
function matchAdjacentSibling(siblings: TemplateNode[], anchors: TemplateNode[], parts: SelectorNode[]): TemplateNode[] {
    const results: TemplateNode[] = [];

    if (anchors.length > 0) {
        // Find the sibling immediately after each anchor
        for (const anchor of anchors) {
            const idx = siblings.indexOf(anchor);
            if (idx >= 0 && idx + 1 < siblings.length) {
                const next = siblings[idx + 1];
                if (matchesCompound(next, parts)) results.push(next);
            }
        }
    }

    return results;
}

/**
 * General sibling combinator (~).
 *
 * Find all siblings AFTER each anchor that match `parts`.
 */
function matchGeneralSibling(siblings: TemplateNode[], anchors: TemplateNode[], parts: SelectorNode[]): TemplateNode[] {
    const results: TemplateNode[] = [];
    const seen = new Set<TemplateNode>();

    for (const anchor of anchors) {
        const idx = siblings.indexOf(anchor);
        if (idx >= 0) {
            for (let i = idx + 1; i < siblings.length; i++) {
                if (matchesCompound(siblings[i], parts) && !seen.has(siblings[i])) {
                    seen.add(siblings[i]);
                    results.push(siblings[i]);
                }
            }
        }
    }

    return results;
}

/**
 * Check if two elements are in different branches of the same v-if/v-else chain.
 * Elements that are conditional alternatives never coexist at runtime,
 * so sibling combinators should not match across them.
 */
function isConditionalAlternative(a: TemplateNode, b: TemplateNode): boolean {
    if (!a.conditional || !b.conditional) return false;
    return a.conditional.chainId === b.conditional.chainId && a.conditional.branchIdx !== b.conditional.branchIdx;
}

/**
 * Adjacent sibling via parent reference (+).
 *
 * Uses each anchor's parent to find the correct sibling context,
 * so this works even when anchors were found via descendant search.
 * Skips over v-if/v-else alternatives that don't coexist at runtime.
 */
function matchAdjacentSiblingViaParent(anchors: TemplateNode[], parts: SelectorNode[]): TemplateNode[] {
    const results: TemplateNode[] = [];
    const seen = new Set<TemplateNode>();

    for (const anchor of anchors) {
        const siblings = anchor.parent ? anchor.parent.children : [];
        const idx = siblings.indexOf(anchor);
        if (idx < 0) continue;

        // Find next sibling, skipping conditional alternatives
        for (let i = idx + 1; i < siblings.length; i++) {
            if (isConditionalAlternative(anchor, siblings[i])) continue;
            // This is the true adjacent sibling
            if (matchesCompound(siblings[i], parts) && !seen.has(siblings[i])) {
                seen.add(siblings[i]);
                results.push(siblings[i]);
            }
            break;
        }
    }

    return results;
}

/**
 * General sibling via parent reference (~).
 *
 * Uses each anchor's parent to find the correct sibling context.
 * Skips over v-if/v-else alternatives that don't coexist at runtime.
 */
function matchGeneralSiblingViaParent(anchors: TemplateNode[], parts: SelectorNode[]): TemplateNode[] {
    const results: TemplateNode[] = [];
    const seen = new Set<TemplateNode>();

    for (const anchor of anchors) {
        const siblings = anchor.parent ? anchor.parent.children : [];
        const idx = siblings.indexOf(anchor);
        if (idx < 0) continue;

        for (let i = idx + 1; i < siblings.length; i++) {
            if (isConditionalAlternative(anchor, siblings[i])) continue;
            if (matchesCompound(siblings[i], parts) && !seen.has(siblings[i])) {
                seen.add(siblings[i]);
                results.push(siblings[i]);
            }
        }
    }

    return results;
}

// =============================================================================
// Scoped CSS generation from raw declarations
// =============================================================================

/**
 * Check if a rule tree has any declarations at any depth.
 */
function hasDeclarations(rules: StyleRule[]): boolean {
    for (const rule of rules) {
        if (rule.declarations.length > 0) return true;
        if (hasDeclarations(rule.children)) return true;
    }
    return false;
}

/**
 * Build a scoped CSS string from raw declarations in the rule tree.
 *
 * Mirrors the nesting structure of the original f-tailwind block, but only
 * includes rules that have declarations (or descendants with declarations).
 * Returns `null` if no declarations exist anywhere.
 */
function buildScopedCSS(rules: StyleRule[]): string | null {
    if (!hasDeclarations(rules)) return null;

    const lines: string[] = [];
    for (const rule of rules) {
        emitRule(rule, lines, 0);
    }
    return lines.join('\n');
}

function emitRule(rule: StyleRule, lines: string[], depth: number): void {
    const hasDeclsHere = rule.declarations.length > 0;
    const hasDeclsBelow = hasDeclarations(rule.children);

    if (!hasDeclsHere && !hasDeclsBelow) return;

    const indent = '  '.repeat(depth);
    const innerIndent = '  '.repeat(depth + 1);

    lines.push(`${indent}${rule.selector} {`);
    for (const decl of rule.declarations) {
        lines.push(`${innerIndent}${decl}`);
    }
    for (const child of rule.children) {
        emitRule(child, lines, depth + 1);
    }
    lines.push(`${indent}}`);
}

// =============================================================================
// :slotted() extraction and CSS generation
// =============================================================================

interface SlottedRule {
    /** Ancestor selector segments, e.g. ['&', '> .wrapper'] */
    selectorPath: string[];
    /** The :slotted() rule itself (selector contains :slotted) */
    rule: StyleRule;
}

function isSlottedSelector(selector: string): boolean {
    return selector.includes(':slotted(');
}

/**
 * Extract :slotted() rules from the rule tree before selector matching.
 * These rules can't match template elements (slot content is in the parent's AST),
 * so they're emitted as `<style scoped>` with `@apply` directives instead.
 *
 * Mutates the rule tree: slotted children are removed from their parents.
 */
function extractSlottedRules(rules: StyleRule[]): SlottedRule[] {
    const result: SlottedRule[] = [];
    // Remove top-level slotted rules from the array so they don't
    // reach collectClasses (which can't match them)
    for (let i = rules.length - 1; i >= 0; i--) {
        if (isSlottedSelector(rules[i].selector)) {
            result.push({ selectorPath: [], rule: rules[i] });
            rules.splice(i, 1);
        }
    }
    extractSlottedFromLevel(rules, [], result);
    return result;
}

function extractSlottedFromLevel(rules: StyleRule[], ancestorPath: string[], result: SlottedRule[]): void {
    for (const rule of rules) {
        if (isSlottedSelector(rule.selector)) {
            // Top-level slotted rule — already handled by the caller's partition
            // (This branch is for rules array passed directly, not children)
            result.push({ selectorPath: [...ancestorPath], rule });
            continue;
        }

        const newPath = [...ancestorPath, rule.selector];

        // Partition children into slotted and non-slotted
        const normalChildren: StyleRule[] = [];
        for (const child of rule.children) {
            if (isSlottedSelector(child.selector)) {
                result.push({ selectorPath: [...newPath], rule: child });
            } else {
                normalChildren.push(child);
            }
        }

        // Replace children with only non-slotted ones
        rule.children = normalChildren;

        // Recurse into remaining children
        extractSlottedFromLevel(normalChildren, newPath, result);
    }
}

/**
 * Check if a slotted rule (or any of its children) has content to emit.
 */
function hasSlottedContent(rule: StyleRule): boolean {
    if (rule.classes.length > 0 || rule.declarations.length > 0) return true;
    return rule.children.some(hasSlottedContent);
}

/**
 * Build scoped CSS for :slotted() rules using @apply for Tailwind classes.
 */
function buildSlottedCSS(slottedRules: SlottedRule[]): string | null {
    if (slottedRules.length === 0) return null;

    const lines: string[] = [];
    for (const { selectorPath, rule } of slottedRules) {
        if (!hasSlottedContent(rule)) continue;
        emitSlottedWithAncestors(selectorPath, rule, lines, 0);
    }
    return lines.length > 0 ? lines.join('\n') : null;
}

function emitSlottedWithAncestors(ancestors: string[], rule: StyleRule, lines: string[], depth: number): void {
    if (ancestors.length === 0) {
        emitSlottedRule(rule, lines, depth);
        return;
    }

    const indent = '  '.repeat(depth);
    lines.push(`${indent}${ancestors[0]} {`);
    emitSlottedWithAncestors(ancestors.slice(1), rule, lines, depth + 1);
    lines.push(`${indent}}`);
}

function emitSlottedRule(rule: StyleRule, lines: string[], depth: number): void {
    if (!hasSlottedContent(rule)) return;

    const indent = '  '.repeat(depth);
    const innerIndent = '  '.repeat(depth + 1);

    lines.push(`${indent}${rule.selector} {`);

    if (rule.classes.length > 0) {
        lines.push(`${innerIndent}@apply ${rule.classes.join(' ')};`);
    }
    for (const decl of rule.declarations) {
        lines.push(`${innerIndent}${decl}`);
    }
    for (const child of rule.children) {
        emitSlottedRule(child, lines, depth + 1);
    }

    lines.push(`${indent}}`);
}

// =============================================================================
// Pseudo-element extraction
// =============================================================================

/**
 * Check if a selector targets a pseudo-element (::before, ::after, etc.).
 * Pseudo-elements can't be matched against template elements — they must
 * be emitted as <style scoped> with @apply.
 */
function hasPseudoElement(selector: string): boolean {
    return selector.includes('::');
}

/**
 * Extract pseudo-element rules from the rule tree before selector matching.
 * Pseudo-elements don't exist as template nodes, so they're emitted as
 * `<style scoped>` with `@apply` directives.
 *
 * Mutates the rule tree: pseudo-element rules are removed from their parents.
 */
function extractPseudoElementRules(rules: StyleRule[]): SlottedRule[] {
    const result: SlottedRule[] = [];
    // Remove top-level pseudo-element rules
    for (let i = rules.length - 1; i >= 0; i--) {
        if (hasPseudoElement(rules[i].selector)) {
            result.push({ selectorPath: [], rule: rules[i] });
            rules.splice(i, 1);
        }
    }
    // Extract from children
    for (const rule of rules) {
        extractPseudoElementFromChildren(rule, [rule.selector], result);
    }
    return result;
}

function extractPseudoElementFromChildren(rule: StyleRule, ancestorPath: string[], result: SlottedRule[]): void {
    const normalChildren: StyleRule[] = [];
    for (const child of rule.children) {
        if (hasPseudoElement(child.selector)) {
            result.push({ selectorPath: [...ancestorPath], rule: child });
        } else {
            normalChildren.push(child);
        }
    }
    rule.children = normalChildren;
    for (const child of normalChildren) {
        extractPseudoElementFromChildren(child, [...ancestorPath, child.selector], result);
    }
}

// =============================================================================
// Class application and style block removal
// =============================================================================

/**
 * Add Tailwind classes to an element. Merges with existing classes.
 * Called once per element after all rules have been collected.
 */
function addClasses(s: MagicString, code: string, el: TemplateNode, classes: string[]): void {
    // Deduplicate classes while preserving order
    const dedupedClasses = [...new Set(classes)];
    const classStr = dedupedClasses.join(' ');

    if (el.classAttrStart !== undefined && el.classAttrEnd !== undefined) {
        // Element has an existing class="..." — append Tailwind classes after existing
        const existing = (el.classAttrValue || '').trim();
        const merged = existing ? `${existing} ${classStr}` : classStr;
        // Escape double quotes to prevent breaking the class="..." attribute
        s.overwrite(el.classAttrStart, el.classAttrEnd, `class="${escapeAttrValue(merged)}"`);
    } else {
        // No existing class attr — insert one after the tag name
        s.appendLeft(el.afterTagNameOffset, ` class="${escapeAttrValue(classStr)}"`);
    }
}

/**
 * Escape characters that would break a double-quoted HTML attribute value.
 */
function escapeAttrValue(value: string): string {
    if (!value.includes('"') && !value.includes('&')) return value;
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Remove the <style lang="f-tailwind">...</style> block from the SFC.
 */
function removeStyleBlock(s: MagicString, code: string, ftStyle: { loc: { start: { offset: number }; end: { offset: number } } }): void {
    // Search backward from the content start to find the <style tag
    const before = code.substring(0, ftStyle.loc.start.offset);
    let styleTagStart = before.lastIndexOf('<style');

    const after = code.substring(ftStyle.loc.end.offset);
    const closeIdx = after.indexOf('</style>');
    const styleTagEnd = ftStyle.loc.end.offset + closeIdx + '</style>'.length;

    let removeStart = styleTagStart;
    let removeEnd = styleTagEnd;
    while (removeStart > 0 && (code[removeStart - 1] === '\n' || code[removeStart - 1] === '\r')) {
        removeStart--;
    }
    while (removeEnd < code.length && (code[removeEnd] === '\n' || code[removeEnd] === '\r')) {
        removeEnd++;
    }

    s.remove(removeStart, removeEnd);
}
