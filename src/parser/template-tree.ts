import type { TemplateNode } from './types';

const ELEMENT_NODE = 1;
const ATTRIBUTE_NODE = 6;
const DIRECTIVE_NODE = 7;

// Vue template AST tagType values
const TAG_TYPE_COMPONENT = 1;
const TAG_TYPE_SLOT = 2;
const TAG_TYPE_TEMPLATE = 3;

// Vue built-in components that don't render a wrapper DOM element.
// These are flattened (children hoisted) like <template>.
const VUE_TRANSPARENT_COMPONENTS = new Set(['Transition', 'transition', 'KeepAlive', 'keep-alive', 'Suspense', 'suspense', 'Teleport', 'teleport']);

/**
 * Walk a Vue template AST and extract an element-only tree
 * with source locations for class attributes.
 *
 * Transparent elements (<template>, <slot>) are handled specially:
 * - <template> wrappers are flattened (children hoisted to parent level)
 * - <slot> elements are skipped (not real DOM nodes)
 *
 * v-if/v-else-if/v-else chains are tracked so sibling combinators
 * don't match across mutually exclusive branches.
 */
export function buildTemplateTree(ast: any): TemplateNode[] {
    const chainCounter = { value: 0 };
    return extractElements(ast.children || [], undefined, chainCounter);
}

function extractElements(children: any[], parent: TemplateNode | undefined, chainCounter: { value: number }): TemplateNode[] {
    const result: TemplateNode[] = [];
    let currentChainId: number | undefined;
    let currentBranchIdx = 0;

    for (const child of children) {
        if (child.type !== ELEMENT_NODE) continue;

        // Skip <slot> elements — they're not real DOM nodes
        if (child.tagType === TAG_TYPE_SLOT) continue;

        // Detect v-if/v-else-if/v-else directives for conditional grouping
        const condDirective = getConditionalDirective(child);
        if (condDirective === 'if') {
            currentChainId = chainCounter.value++;
            currentBranchIdx = 0;
        } else if (condDirective === 'else-if' || condDirective === 'else') {
            currentBranchIdx++;
            // currentChainId stays the same
        } else {
            currentChainId = undefined;
        }

        const conditional = currentChainId !== undefined ? { chainId: currentChainId, branchIdx: currentBranchIdx } : undefined;

        // Flatten transparent Vue built-in components (Transition, KeepAlive, etc.)
        // These don't render wrapper DOM elements, so children are hoisted.
        if (child.tagType === TAG_TYPE_COMPONENT && VUE_TRANSPARENT_COMPONENTS.has(child.tag)) {
            const hoisted = extractElements(child.children || [], parent, chainCounter);
            if (conditional) {
                for (const h of hoisted) {
                    if (!h.conditional) h.conditional = conditional;
                }
            }
            result.push(...hoisted);
            continue;
        }

        // Flatten <template> wrapper elements — they're transparent in Vue DOM
        if (child.tagType === TAG_TYPE_TEMPLATE) {
            const hoisted = extractElements(child.children || [], parent, chainCounter);
            // Propagate conditional info to hoisted children that don't have their own
            if (conditional) {
                for (const h of hoisted) {
                    if (!h.conditional) h.conditional = conditional;
                }
            }
            result.push(...hoisted);
            continue;
        }

        const node = buildNode(child, parent, chainCounter);
        if (conditional) node.conditional = conditional;
        result.push(node);
    }

    return result;
}

/**
 * Detect v-if, v-else-if, or v-else directive on a node.
 */
function getConditionalDirective(node: any): 'if' | 'else-if' | 'else' | null {
    for (const prop of node.props || []) {
        if (prop.type === DIRECTIVE_NODE) {
            if (prop.name === 'if') return 'if';
            if (prop.name === 'else-if') return 'else-if';
            if (prop.name === 'else') return 'else';
        }
    }
    return null;
}

function buildNode(node: any, parent: TemplateNode | undefined, chainCounter: { value: number }): TemplateNode {
    const tag: string = node.tag;
    const startOffset: number = node.loc.start.offset;
    const afterTagNameOffset = startOffset + 1 + tag.length;

    let classAttrValue: string | undefined;
    let classAttrStart: number | undefined;
    let classAttrEnd: number | undefined;
    let id: string | undefined;
    let hasDynamicClass = false;
    const attributes: Record<string, string | true> = {};

    for (const prop of node.props || []) {
        if (prop.type === ATTRIBUTE_NODE) {
            if (prop.name === 'class') {
                classAttrStart = prop.loc.start.offset;
                classAttrEnd = prop.loc.end.offset;
                classAttrValue = prop.value ? prop.value.content : '';
            } else if (prop.name === 'id') {
                id = prop.value ? prop.value.content : undefined;
            }
            // Store all static attributes for [attr] selector matching
            attributes[prop.name] = prop.value ? prop.value.content : true;
        } else if (prop.type === DIRECTIVE_NODE) {
            // Detect dynamic :class / v-bind:class
            if (prop.name === 'bind' && prop.arg?.content === 'class') {
                hasDynamicClass = true;
            }
            // Detect bare v-bind="obj" spread (could contain class)
            if (prop.name === 'bind' && !prop.arg) {
                hasDynamicClass = true;
            }
        }
    }

    const classes = classAttrValue ? classAttrValue.split(/\s+/).filter(Boolean) : [];

    const el: TemplateNode = {
        tag,
        id,
        classes,
        attributes,
        parent,
        children: [],
        startOffset,
        afterTagNameOffset,
        classAttrStart,
        classAttrEnd,
        classAttrValue,
        hasDynamicClass: hasDynamicClass || undefined,
    };
    // Skip children if the element has v-html — Vue replaces them at runtime
    // with rendered HTML, so template children are meaningless for styling.
    if (!hasVHtmlDirective(node)) {
        el.children = extractElements(node.children || [], el, chainCounter);
    }
    return el;
}

function hasVHtmlDirective(node: any): boolean {
    for (const prop of node.props || []) {
        if (prop.type === DIRECTIVE_NODE && prop.name === 'html') return true;
    }
    return false;
}
