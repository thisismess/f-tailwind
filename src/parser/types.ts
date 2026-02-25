/** A @use directive referencing an exported block */
export interface UseDirective {
    name: string;
    /** Present for `@use name from './path'` */
    from?: string;
}

/** A rule in the CSS-nesting-style f-tailwind block */
export interface StyleRule {
    /** CSS selector (e.g., "&", "> div", "> .stat", "dt") */
    selector: string;
    /** Tailwind utility classes in this rule's body */
    classes: string[];
    /** Raw CSS declarations (lines ending with `;`) */
    declarations: string[];
    /** @use directives in this rule's body */
    uses: UseDirective[];
    /** Nested child rules */
    children: StyleRule[];
}

/** A named, reusable block defined with @export */
export interface ExportBlock {
    name: string;
    classes: string[];
    declarations: string[];
    /** @use directives in this export's body */
    uses: UseDirective[];
    children: StyleRule[];
}

/** An @import directive that loads exports from another file */
export interface ImportDirective {
    names: string[];
    from: string;
}

/** Result of parsing a <style lang="f-tailwind"> block */
export interface ParseResult {
    rules: StyleRule[];
    exports: ExportBlock[];
    imports: ImportDirective[];
}

/** A node in the template element tree */
export interface TemplateNode {
    /** Tag name (e.g. "div", "dt", "MyComponent") */
    tag: string;
    /** Static id attribute value */
    id?: string;
    /** Static classes on the element (parsed from class="...") */
    classes: string[];
    /** Static attributes (name → value, or name → true for boolean attrs) */
    attributes: Record<string, string | true>;
    /** Parent node (undefined for root-level elements) */
    parent?: TemplateNode;
    /** Element children (only elements, no text/comment nodes) */
    children: TemplateNode[];
    /** Source offset of the opening tag's `<` character */
    startOffset: number;
    /** Offset right after the tag name where attrs can be inserted */
    afterTagNameOffset: number;
    /** Location of the class="..." attribute for replacement */
    classAttrStart?: number;
    classAttrEnd?: number;
    /** Raw class attribute value string */
    classAttrValue?: string;
    /** Conditional chain info for v-if/v-else-if/v-else sibling tracking */
    conditional?: { chainId: number; branchIdx: number };
    /** Whether this element has a dynamic :class binding */
    hasDynamicClass?: boolean;
}
