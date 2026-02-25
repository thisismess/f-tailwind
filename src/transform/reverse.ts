import MagicString from 'magic-string';
import { parse as parseSFC } from '@vue/compiler-sfc';

const ELEMENT_NODE = 1;
const ATTRIBUTE_NODE = 6;
const DIRECTIVE_NODE = 7;

interface ExtractedNode {
    tag: string;
    classes: string;
    hasDynamicClass: boolean;
    /** Key attribute that disambiguates same-tag siblings (e.g., type="text") */
    disambiguator?: { name: string; value: string };
    children: ExtractedNode[];
    classAttrStart?: number;
    classAttrEnd?: number;
    afterTagNameOffset: number;
}

/**
 * Reverse transform: takes a standard Vue SFC with Tailwind classes
 * and produces the f-tailwind format with CSS-nesting syntax.
 *
 * Repeated sibling patterns become named groups with class selectors.
 * Elements with dynamic :class bindings keep their static classes in the
 * template (both static and f-tailwind classes will merge at runtime).
 */
export function reverseTransform(code: string): string {
    const { descriptor } = parseSFC(code, { filename: 'input.vue' });
    const template = descriptor.template;
    if (!template) return code;

    const s = new MagicString(code);
    const rootElements = extractElementTree(template.ast!.children);

    if (rootElements.length === 0) return code;
    if (!treeHasClasses(rootElements)) return code;

    // Build the CSS-nesting style block for each root
    const ruleBlocks: string[] = [];
    for (const root of rootElements) {
        if (!treeHasClasses([root])) continue;
        const block = buildRuleBlock(s, code, root, true);
        if (block) ruleBlocks.push(block);
    }

    if (ruleBlocks.length === 0) return code;

    const styleBlock = `\n\n<style lang="f-tailwind">\n${ruleBlocks.join('\n')}\n</style>`;

    const templateEnd = code.indexOf('</template>');
    if (templateEnd === -1) return code;
    s.appendRight(templateEnd + '</template>'.length, styleBlock);

    return s.toString();
}

/**
 * Build a CSS-nesting rule block for an element and its subtree.
 */
function buildRuleBlock(s: MagicString, code: string, node: ExtractedNode, isRoot: boolean, depth: number = 0): string | null {
    const indent = '  '.repeat(depth);
    const innerIndent = '  '.repeat(depth + 1);

    // Determine selector for this node
    let selector: string;
    if (isRoot) {
        selector = '&';
        if (!node.hasDynamicClass) {
            removeClassAttr(s, code, node);
        }
    } else {
        selector = buildSelector(node);
    }

    // Detect named groups among children (only among non-dynamic-class nodes)
    const groups = detectGroups(node.children);
    const groupedNodes = new Set<ExtractedNode>();
    for (const members of groups.values()) {
        for (const m of members) groupedNodes.add(m);
    }

    // Collect body lines
    const bodyParts: string[] = [];

    // Classes for this node
    if (node.classes) {
        bodyParts.push(`${innerIndent}${node.classes}`);
    }

    // Emit named groups
    for (const [groupName, members] of groups) {
        const representative = members[0];

        // Replace class attr with just the group class for each member
        for (const member of members) {
            if (!member.hasDynamicClass) {
                replaceClassesWithGroupName(s, code, member, groupName);
            }
        }

        // Build the group's rule block using `.groupName` selector
        const groupBlock = buildGroupRuleBlock(s, code, representative, groupName, depth + 1);
        if (groupBlock) bodyParts.push(groupBlock);

        // Strip classes from non-representative members' children
        for (let i = 1; i < members.length; i++) {
            stripClassesDeep(s, code, members[i].children);
        }
    }

    // Emit non-grouped children
    for (const child of node.children) {
        if (groupedNodes.has(child)) continue;
        const childBlock = buildRuleBlock(s, code, child, false, depth + 1);
        if (childBlock) {
            bodyParts.push(childBlock);
        }
        // Remove classes from the child element in the template (preserve if dynamic :class)
        if (!child.hasDynamicClass) {
            removeClassAttr(s, code, child);
        }
    }

    if (bodyParts.length === 0) return null;

    return `${indent}${selector} {\n${bodyParts.join('\n')}\n${indent}}`;
}

/**
 * Build a selector string for a non-root node.
 * Uses `> tag` by default, adds `[attr=val]` when needed to disambiguate same-tag siblings.
 */
function buildSelector(node: ExtractedNode): string {
    let sel = `> ${node.tag}`;
    if (node.disambiguator) {
        sel += `[${node.disambiguator.name}="${node.disambiguator.value}"]`;
    }
    return sel;
}

/**
 * Build a rule block for a named group (using `.className` selector).
 */
function buildGroupRuleBlock(s: MagicString, code: string, representative: ExtractedNode, groupName: string, depth: number): string | null {
    const indent = '  '.repeat(depth);
    const innerIndent = '  '.repeat(depth + 1);

    const bodyParts: string[] = [];

    if (representative.classes) {
        bodyParts.push(`${innerIndent}${representative.classes}`);
    }

    // Recurse into representative's children
    for (const child of representative.children) {
        const childBlock = buildRuleBlock(s, code, child, false, depth + 1);
        if (childBlock) bodyParts.push(childBlock);
        if (!child.hasDynamicClass) {
            removeClassAttr(s, code, child);
        }
    }

    if (bodyParts.length === 0) return null;

    return `${indent}> .${groupName} {\n${bodyParts.join('\n')}\n${indent}}`;
}

// --- Helpers ---

function extractElementTree(children: any[]): ExtractedNode[] {
    const result: ExtractedNode[] = [];
    for (const child of children) {
        if (child.type !== ELEMENT_NODE) continue;
        result.push(extractNode(child));
    }
    return result;
}

function extractNode(node: any): ExtractedNode {
    const tag: string = node.tag;
    const startOffset: number = node.loc.start.offset;
    const afterTagNameOffset = startOffset + 1 + tag.length;

    let classes = '';
    let classAttrStart: number | undefined;
    let classAttrEnd: number | undefined;
    let hasDynamicClass = false;
    let disambiguator: { name: string; value: string } | undefined;

    for (const prop of node.props || []) {
        if (prop.type === ATTRIBUTE_NODE) {
            if (prop.name === 'class' && prop.value) {
                classes = prop.value.content;
                classAttrStart = prop.loc.start.offset;
                classAttrEnd = prop.loc.end.offset;
            }
            // Track disambiguating attributes (type, name, role, etc.)
            if (['type', 'name', 'role', 'data-testid'].includes(prop.name) && prop.value) {
                disambiguator = { name: prop.name, value: prop.value.content };
            }
        } else if (prop.type === DIRECTIVE_NODE) {
            // Detect :class or v-bind:class
            if (prop.name === 'bind' && prop.arg?.content === 'class') {
                hasDynamicClass = true;
            }
            // Detect bare v-bind="obj" spread
            if (prop.name === 'bind' && !prop.arg) {
                hasDynamicClass = true;
            }
        }
    }

    return {
        tag,
        classes,
        hasDynamicClass,
        disambiguator,
        children: extractElementTree(node.children || []),
        classAttrStart,
        classAttrEnd,
        afterTagNameOffset,
    };
}

function treeHasClasses(nodes: ExtractedNode[]): boolean {
    for (const node of nodes) {
        if (node.classes) return true;
        if (treeHasClasses(node.children)) return true;
    }
    return false;
}

function computeSignature(node: ExtractedNode): string {
    const childSigs = node.children.map(computeSignature).join('|');
    return `${node.tag}:${node.classes}:[${childSigs}]`;
}

/**
 * Detect groups of same-signature siblings (2+ siblings with identical structure).
 * These get a shared class name and a single rule in the style block.
 * Nodes with dynamic :class are excluded from grouping.
 */
function detectGroups(siblings: ExtractedNode[]): Map<string, ExtractedNode[]> {
    const sigMap = new Map<string, ExtractedNode[]>();

    for (const sib of siblings) {
        // Don't group nodes with dynamic :class — their classes can't be fully extracted
        if (sib.hasDynamicClass) continue;
        if (!sib.classes && !treeHasClasses(sib.children)) continue;
        const sig = computeSignature(sib);
        if (!sigMap.has(sig)) sigMap.set(sig, []);
        sigMap.get(sig)!.push(sib);
    }

    const groups = new Map<string, ExtractedNode[]>();
    let counter = 0;

    for (const [, members] of sigMap) {
        if (members.length < 2) continue;
        const name = generateGroupName(members[0], counter);
        groups.set(name, members);
        counter++;
    }

    return groups;
}

function generateGroupName(node: ExtractedNode, index: number): string {
    const base = node.tag;
    return index === 0 ? base : `${base}${index + 1}`;
}

/**
 * Replace an element's class attribute with just the group name.
 */
function replaceClassesWithGroupName(s: MagicString, code: string, node: ExtractedNode, groupName: string): void {
    if (node.classAttrStart !== undefined && node.classAttrEnd !== undefined) {
        let start = node.classAttrStart;
        while (start > 0 && (code[start - 1] === ' ' || code[start - 1] === '\n' || code[start - 1] === '\r')) {
            start--;
        }
        s.overwrite(start, node.classAttrEnd, ` class="${groupName}"`);
    } else {
        s.appendLeft(node.afterTagNameOffset, ` class="${groupName}"`);
    }
}

function removeClassAttr(s: MagicString, code: string, node: ExtractedNode): void {
    if (node.classAttrStart === undefined || node.classAttrEnd === undefined) return;
    try {
        let start = node.classAttrStart;
        if (start > 0 && code[start - 1] === ' ') start--;
        s.remove(start, node.classAttrEnd);
    } catch {
        // Already modified
    }
}

function stripClassesDeep(s: MagicString, code: string, nodes: ExtractedNode[]): void {
    for (const node of nodes) {
        if (!node.hasDynamicClass) {
            removeClassAttr(s, code, node);
        }
        stripClassesDeep(s, code, node.children);
    }
}
