import type { StyleRule, UseDirective, ExportBlock, ImportDirective, ParseResult } from './types';

/**
 * Parse a `<style lang="f-tailwind">` block into a tree of style rules.
 *
 * Uses a custom brace-matching parser — no need to pretend Tailwind classes
 * are CSS declarations. The block uses CSS nesting syntax:
 *
 *   & {
 *     bg-gray-900 py-24 sm:py-32
 *     > div {
 *       mx-auto max-w-7xl
 *     }
 *   }
 *
 * Lines that are Tailwind class names live directly in rule bodies.
 * The parser tracks `{ }` depth to build the nesting tree, extracts
 * selectors (text before `{`), and collects everything else as classes.
 */
export function parseStyleBlock(content: string, filePath?: string): ParseResult {
    const ctx: Ctx = { src: content, pos: 0, filePath };
    return parseRules(ctx, content.length);
}

interface Ctx {
    src: string;
    pos: number;
    filePath?: string;
}

/**
 * Compute a 1-based line number for a character offset in the source.
 */
function lineAt(src: string, offset: number): number {
    let line = 1;
    for (let i = 0; i < offset && i < src.length; i++) {
        if (src[i] === '\n') line++;
    }
    return line;
}

/**
 * Format a location string like " (line 5)" or " (shared.vue:5)" for warnings.
 */
function formatLoc(ctx: Ctx, offset: number): string {
    const line = lineAt(ctx.src, offset);
    if (ctx.filePath) return ` (${ctx.filePath}:${line})`;
    return ` (line ${line})`;
}

/**
 * Parse rules at the current level until `end`.
 */
function parseRules(ctx: Ctx, end: number): ParseResult {
    const rules: StyleRule[] = [];
    const exports: ExportBlock[] = [];
    const imports: ImportDirective[] = [];

    while (ctx.pos < end) {
        skipWhitespaceAndComments(ctx, end);
        if (ctx.pos >= end) break;

        // Check for @import (line directive, no braces)
        if (ctx.src.startsWith('@import ', ctx.pos)) {
            const lineEnd = ctx.src.indexOf('\n', ctx.pos);
            const actualEnd = lineEnd === -1 ? end : Math.min(lineEnd, end);
            const line = ctx.src.substring(ctx.pos, actualEnd).trim();
            const directive = parseImportDirective(line);
            if (directive) {
                imports.push(directive);
            } else {
                const loc = formatLoc(ctx, ctx.pos);
                console.warn(`[f-tailwind]${loc} Malformed @import directive: "${line}". Expected: @import name1, name2 from './path'`);
            }
            ctx.pos = actualEnd + 1;
            continue;
        }

        // Look for the next `{` at this level
        const bracePos = findTopLevelChar(ctx.src, ctx.pos, end, '{');
        if (bracePos === -1) break;

        const textBefore = ctx.src.substring(ctx.pos, bracePos).trim();
        const closePos = findMatchingBrace(ctx.src, bracePos);

        if (closePos >= ctx.src.length) {
            const loc = formatLoc(ctx, bracePos);
            console.warn(`[f-tailwind]${loc} Unclosed "{" — missing closing "}". Rules after this point may be lost.`);
        }

        // Warn about unsupported @rules (@media, @keyframes, etc.)
        if (/^@(media|keyframes|supports|layer|container|font-face|property|page|counter-style)\b/.test(textBefore)) {
            const atRule = (textBefore.match(/^@[\w-]+/) || [textBefore])[0];
            const loc = formatLoc(ctx, ctx.pos);
            console.warn(`[f-tailwind]${loc} "${atRule}" is not supported inside f-tailwind blocks. Move it to a regular <style> block.`);
            ctx.pos = closePos + 1;
            continue;
        }

        // Parse the body between { }
        const body = parseBody(ctx.src, bracePos + 1, closePos, ctx);

        // Check for @export
        if (textBefore.startsWith('@export ')) {
            const name = textBefore.substring('@export '.length).trim();
            exports.push({
                name,
                classes: body.classes,
                declarations: body.declarations,
                uses: body.uses,
                children: body.children,
            });
        } else {
            rules.push({
                selector: textBefore,
                classes: body.classes,
                declarations: body.declarations,
                uses: body.uses,
                children: body.children,
            });
        }

        ctx.pos = closePos + 1;
    }

    return { rules, exports, imports };
}

/**
 * Parse a rule body (content between `{ }`) into classes and child rules.
 *
 * Within a body:
 *   - Nested `selector { ... }` blocks become child rules (recursive)
 *   - Everything else is space-separated Tailwind class names
 *   - CSS comments are stripped
 */
function parseBody(src: string, start: number, end: number, ctx?: Ctx): { classes: string[]; declarations: string[]; uses: UseDirective[]; children: StyleRule[] } {
    const classes: string[] = [];
    const declarations: string[] = [];
    const uses: UseDirective[] = [];
    const children: StyleRule[] = [];
    let pos = start;

    while (pos < end) {
        // Find next `{` at this body's top level
        const bracePos = findTopLevelChar(src, pos, end, '{');

        if (bracePos === -1) {
            // No more nested blocks — rest is class/declaration content
            extractContent(src.substring(pos, end), classes, declarations, uses, ctx, pos);
            break;
        }

        // Text before this `{`: may contain class content and/or a selector
        const textBefore = src.substring(pos, bracePos);
        const { classText, selector } = splitClassesAndSelector(textBefore);
        extractContent(classText, classes, declarations, uses, ctx, pos);

        // Find matching `}`
        const closePos = findMatchingBrace(src, bracePos);

        // Warn about unsupported @rules nested inside rule bodies
        const trimmedSel = selector.trim();
        if (/^@(media|keyframes|supports|layer|container|font-face|property|page|counter-style)\b/.test(trimmedSel)) {
            if (ctx) {
                const atRule = (trimmedSel.match(/^@[\w-]+/) || [trimmedSel])[0];
                const loc = formatLoc(ctx, pos);
                console.warn(`[f-tailwind]${loc} "${atRule}" is not supported inside f-tailwind blocks. Move it to a regular <style> block.`);
            }
            pos = closePos + 1;
            continue;
        }

        // Recurse for nested body
        const inner = parseBody(src, bracePos + 1, closePos, ctx);
        children.push({
            selector: trimmedSel,
            classes: inner.classes,
            declarations: inner.declarations,
            uses: inner.uses,
            children: inner.children,
        });

        pos = closePos + 1;
    }

    return { classes, declarations, uses, children };
}

/**
 * HTML tags that are also common Tailwind utility class names.
 * When one of these appears alone on the last line before `{`,
 * it's ambiguous — could be a CSS selector or a Tailwind class.
 *
 * We treat it as a **class** if it appears alone with no selector syntax
 * (no combinators, dots, hashes, brackets, colons, or commas).
 */
const AMBIGUOUS_TAG_CLASSES = new Set([
    'flex',
    'grid',
    'table',
    'hidden',
    'block',
    'inline',
    'contents',
    'fixed',
    'absolute',
    'relative',
    'sticky',
    'static',
    'visible',
    'invisible',
    'collapse',
]);

/**
 * Check if a string looks like a CSS selector (has selector syntax).
 * Returns false for bare words that could be Tailwind classes.
 */
function looksLikeSelector(text: string): boolean {
    const trimmed = text.trim();
    // Starts with a combinator
    if (trimmed.startsWith('>') || trimmed.startsWith('+') || trimmed.startsWith('~')) return true;
    // Starts with selector sigils
    if (trimmed.startsWith('.') || trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed.startsWith('*') || trimmed.startsWith('&') || trimmed.startsWith(':')) return true;
    // Contains selector syntax anywhere
    if (/[>+~.#\[\]:,]/.test(trimmed)) return true;
    // A bare word that's an ambiguous tag/class — NOT a selector
    if (AMBIGUOUS_TAG_CLASSES.has(trimmed)) return false;
    // Any other bare word — treat as selector (tag name)
    return true;
}

/**
 * Split text that appears before a `{` into class content and the selector.
 *
 * The selector is the last non-empty line(s), including multi-line selectors
 * joined by trailing commas. Everything before it is Tailwind class content.
 */
function splitClassesAndSelector(text: string): {
    classText: string;
    selector: string;
} {
    const lines = text.split('\n');

    // Find last non-empty line (selector or end of it)
    let selectorEnd = lines.length - 1;
    while (selectorEnd >= 0 && !lines[selectorEnd].trim()) selectorEnd--;
    if (selectorEnd < 0) return { classText: '', selector: '' };

    // Walk backwards to include multi-line selectors (previous line ends with `,`)
    let selectorStart = selectorEnd;
    while (selectorStart > 0) {
        const prevLine = lines[selectorStart - 1].trim();
        if (prevLine.endsWith(',')) {
            selectorStart--;
        } else {
            break;
        }
    }

    const selector = lines
        .slice(selectorStart, selectorEnd + 1)
        .join('\n')
        .trim();

    // If the "selector" is just an ambiguous tag/class name with no selector
    // syntax, treat the whole thing as class content
    if (!looksLikeSelector(selector)) {
        return { classText: text, selector: '' };
    }

    const classText = lines.slice(0, selectorStart).join('\n');

    return { classText, selector };
}

/**
 * Extract classes and raw CSS declarations from text, stripping CSS comments.
 *
 * Lines ending with `;` are raw CSS declarations; everything else is
 * space-separated Tailwind class names. This allows free interleaving:
 *
 *   bg-gray-900 py-24
 *   box-shadow: 0 4px 6px rgba(0,0,0,0.1);
 *   px-24
 */
function extractContent(text: string, intoClasses: string[], intoDeclarations: string[], intoUses: UseDirective[], ctx?: Ctx, baseOffset?: number): void {
    const cleaned = text.replace(/\/\*[\s\S]*?\*\//g, '');
    let lineOffset = 0;
    for (const line of cleaned.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) {
            lineOffset += line.length + 1;
            continue;
        }
        if (trimmed.startsWith('@use ') || trimmed === '@use') {
            const directive = parseUseDirective(trimmed);
            if (directive) {
                intoUses.push(directive);
            } else {
                const loc = ctx && baseOffset !== undefined ? formatLoc(ctx, baseOffset + lineOffset) : '';
                console.warn(`[f-tailwind]${loc} Malformed @use directive: "${trimmed}". Expected: @use name or @use name from './path'`);
            }
        } else if (trimmed.endsWith(';')) {
            intoDeclarations.push(trimmed);
        } else {
            intoClasses.push(...trimmed.split(/\s+/).filter(Boolean));
        }
        lineOffset += line.length + 1;
    }
}

/**
 * Find `char` at depth 0 between `start` and `end`.
 * Respects nested `{ }`, `[ ]`, strings, and comments.
 */
function findTopLevelChar(src: string, start: number, end: number, char: string): number {
    let depth = 0;
    let inBracket = 0;
    let inString: string | false = false;
    let inComment = false;

    for (let i = start; i < end; i++) {
        if (inString) {
            if (src[i] === inString && src[i - 1] !== '\\') inString = false;
        } else if (inComment) {
            if (src[i] === '*' && src[i + 1] === '/') {
                inComment = false;
                i++;
            }
        } else if (src[i] === '/' && src[i + 1] === '*') {
            inComment = true;
            i++;
        } else if (src[i] === '"' || src[i] === "'") {
            inString = src[i];
        } else if (src[i] === '[') {
            inBracket++;
        } else if (src[i] === ']') {
            inBracket--;
        } else if (inBracket === 0) {
            if (src[i] === '{') {
                if (depth === 0 && char === '{') return i;
                depth++;
            } else if (src[i] === '}') {
                if (depth === 0 && char === '}') return i;
                depth--;
            } else if (depth === 0 && src[i] === char) {
                return i;
            }
        }
    }

    return -1;
}

/**
 * Find the `}` matching the `{` at `openPos`.
 */
function findMatchingBrace(src: string, openPos: number): number {
    let depth = 1;
    let inBracket = 0;
    let inString: string | false = false;
    let inComment = false;

    for (let i = openPos + 1; i < src.length; i++) {
        if (inString) {
            if (src[i] === inString && src[i - 1] !== '\\') inString = false;
        } else if (inComment) {
            if (src[i] === '*' && src[i + 1] === '/') {
                inComment = false;
                i++;
            }
        } else if (src[i] === '/' && src[i + 1] === '*') {
            inComment = true;
            i++;
        } else if (src[i] === '"' || src[i] === "'") {
            inString = src[i];
        } else if (src[i] === '[') {
            inBracket++;
        } else if (src[i] === ']') {
            inBracket--;
        } else if (inBracket === 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') {
                depth--;
                if (depth === 0) return i;
            }
        }
    }

    return src.length;
}

/**
 * Parse a `@use` directive line.
 * Supports: `@use name` and `@use name from './path'`
 */
function parseUseDirective(text: string): UseDirective | null {
    const match = text.match(/^@use\s+([\w][\w-]*)(?:\s+from\s+['"]([^'"]+)['"])?\s*;?\s*$/);
    if (!match) return null;
    return { name: match[1], from: match[2] || undefined };
}

/**
 * Parse an `@import` directive line.
 * Supports: `@import name1, name2 from './path'`
 */
function parseImportDirective(text: string): ImportDirective | null {
    const match = text.match(/^@import\s+([\w][\w\s,-]*)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/);
    if (!match) return null;
    const names = match[1]
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
    return { names, from: match[2] };
}

function skipWhitespaceAndComments(ctx: Ctx, end: number): void {
    while (ctx.pos < end) {
        if (/\s/.test(ctx.src[ctx.pos])) {
            ctx.pos++;
        } else if (ctx.src[ctx.pos] === '/' && ctx.src[ctx.pos + 1] === '*') {
            const close = ctx.src.indexOf('*/', ctx.pos + 2);
            ctx.pos = close === -1 ? end : close + 2;
        } else {
            break;
        }
    }
}
