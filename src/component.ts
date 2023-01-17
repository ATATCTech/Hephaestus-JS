import {Style} from "./style.js";
import {BadFormat, MissingFieldException} from "./exception.js";
import {parseExpr} from "./hephaestus.js";
import {extractAttributes} from "./attribute.js";
import {Config} from "./config.js";

class ComponentConfigRecord {
    protected readonly _tagName: string;

    constructor(tagName: string = "undefined") {
        this._tagName = tagName;
    }

    public tagName(): string {
        return this._tagName;
    }
}

export function ComponentConfig(tagName: string): Function {
    return function (constructor: Function) {
        constructor.prototype.config = new ComponentConfigRecord(tagName);
        if (constructor.prototype.PARSER == null) throw new MissingFieldException(constructor.prototype, "PARSER");
        Config.getInstance().putParser(tagName, constructor.prototype.PARSER);
    };
}

// todo: missing forEach()
export abstract class Component {
    protected style: Style = new Style();

    protected constructor() {
    }

    public getConfig(): ComponentConfigRecord {
        return Object.getPrototypeOf(this).config;
    }

    public getTagName(): string {
        const config = this.getConfig();
        if (config == null) return "undefined";
        return config.tagName();
    }

    public setStyle(style: Style): void {
        this.style = style;
    }

    public getStyle(): Style {
        return this.style;
    }

    public forEach(action: (component: Component, depth: number) => boolean, depth: number = 0): void {
        action(this, depth);
    }

    public abstract expr(): string;
}

export class Text extends Component {
    public static PARSER: (expr) => Text = expr => new Text(Text.decompile(expr));

    protected text: string;

    constructor(text: string) {
        super();
        this.setText(text);
    }

    public setText(text: string): void {
        this.text = text;
    }

    public getText(): string {
        return this.text;
    }

    public expr(): string {
        return "{" + Text.compile(this.getText()) + "}";
    }

    public static COMPILER_CHARACTER: string = '^';

    public static RESERVED_KEYWORDS: string[] = [
        '^',
        ':',
        '{',
        '}',
        '[',
        ']',
        '(',
        ')',
        '<',
        '>',
        '=',
        ';',
    ];

    public static quote(c: string): string {
        return Text.COMPILER_CHARACTER + c;
    }

    public static compile(s: string, c: string = null): string | null {
        if (s == null) return null;
        if (c == null) for (let i in Text.RESERVED_KEYWORDS) s = Text.compile(s, Text.RESERVED_KEYWORDS[i]);
        return s.replace(c, Text.quote(c));
    }

    public static decompile(s: string, c: string = null): string | null {
        if (s == null) return null;
        if (c == null) for (let i in Text.RESERVED_KEYWORDS) s = Text.decompile(s, Text.RESERVED_KEYWORDS[i]);
        return s.replace(Text.quote(s), c);
    }

    public static indexOf(s: string, c: string, fromIndex: number = 0): number {
        for (let i = fromIndex; i < s.length; i++) if (Text.charAtEquals(s, i, c)) return i;
        return -1;
    }

    public static lastIndexOf(s: string, c: string, fromIndex: number = s.length - 1): number {
        for (let i = fromIndex; i > 0; i--) if (Text.charAtEquals(s, i, c)) return i;
        return -1;
    }

    public static charAtEquals(s: string, i: number, c: string): boolean {
        const e = s.charAt(i) == c;
        if (i > 0) return e && s.charAt(i - 1) != Text.COMPILER_CHARACTER;
        if (c == Text.COMPILER_CHARACTER && s.length > 1) return e && s.charAt(1) != Text.COMPILER_CHARACTER;
        return e;
    }

    public static startsWith(s: string, c: string): boolean {
        return Text.charAtEquals(s, 0, c);
    }

    public static endsWith(s: string, c: string): boolean {
        return Text.charAtEquals(s, s.length - 1, c);
    }

    public static wrappedBy(s: string, start: string, end: string = start): boolean {
        return Text.startsWith(s, start) && Text.endsWith(s, end);
    }

    public static pairBrackets(s: string, open: string, close: string, requiredDepth: number = 0): [number, number] {
        let depth = 0;
        let startIndex = -1;
        for (let i = 0; i < s.length; i++) {
            const bit = s.charAt(i);
            if (bit == open && depth++ == requiredDepth) startIndex = i;
            else if (bit == close && --depth == requiredDepth) return [startIndex, i];
        }
        return [startIndex, -1];
    }
}

export class MultiComponent extends Component implements Iterable<Component> {
    public static PARSER: (expr) => MultiComponent = expr => {
        let open, close;
        if (Text.wrappedBy(expr, "{", "}")) {
            open = "{";
            close = "}";
        } else if (Text.wrappedBy(expr, "<", ">")) {
            open = "<";
            close = ">";
        } else throw new BadFormat("Unrecognized format.", expr);
        let [start, end] = Text.pairBrackets(expr, open, close);
        const components = [];
        while (start >= 0 && end++ >= 0) {
            components.push(parseExpr(expr.substring(start, end)));
            expr = expr.substring(end);
            [start, end] = Text.pairBrackets(expr, open, close);
        }
        return new MultiComponent(...components);
    };

    protected components: Component[] = [];

    public constructor(...components: Component[]) {
        super();
        this.setComponents(...components);
    }

    public setComponents(...components: Component[]): void {
        this.components = components;
    }

    public forEach(action: (component: Component, depth: number) => boolean, depth: number = 0) {
        for (let i in this.components) if (!action(this.components[i], depth)) break;
    }

    public expr(): string {
        if (this.components.length == 0) return "";
        if (this.components.length == 1) return this.components.at(0).expr();
        let expr = "[";
        this.components.forEach(component => expr += component.expr());
        return expr + "]";
    }

    public size(): number {
        return this.components.length;
    }

    public isEmpty(): boolean {
        return this.components.length == 0;
    }

    public contains(component: Component): boolean {
        return this.components.includes(component);
    }

    [Symbol.iterator](): Iterator<Component> {
        return this.components[Symbol.iterator]();
    }

    public add(component: Component): void {
        this.components.push(component);
    }

    public remove(index: number): void {
        this.components.splice(index, 1);
    }

    public containsAll(c: Component[]): boolean {
        for (let i in c) if (!this.components.includes(c[i])) return false;
        return true;
    }

    public addAll(c: Component[]): void {
        this.components.push(...c);
    }

    public clear(): void {
        this.components = [];
    }

    public get(index: number): Component {
        return this.components[index];
    }
}

export abstract class WrapperComponent extends Component {
    protected children: MultiComponent;

    protected constructor(children: MultiComponent = new MultiComponent()) {
        super();
        this.setChildren(children);
    }

    public setChildren(children: MultiComponent): void {
        this.children = children;
    }

    public getChildren(): MultiComponent {
        return this.children;
    }

    public appendChild(child: Component): void {
        this.children.add(child);
    }

    public child(index: number): Component {
        return this.getChildren().get(index);
    }

    public removeChild(index: number): void {
        this.children.remove(index);
    }

    public forEach(action: (component: Component, depth: number) => boolean, depth: number = 0) {
        super.forEach(action, depth);
        this.getChildren().forEach(action, depth + 1);
    }

    public expr(): string {
        return "{" + this.getTagName() + ":" + extractAttributes(this) + this.getChildren().expr() + "}";
    }
}

export class Skeleton extends WrapperComponent {
    protected name: string;

    protected attrComponent: Component;

    protected parent: Skeleton;

    public constructor(name: string = null) {
        super();
        this.setName(name);
    }

    public setName(name: string): void {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    public setComponent(component: Component): void {
        this.attrComponent = component;
    }

    public getComponent(): Component {
        return this.attrComponent;
    }

    public setParent(parent: Skeleton): void {
        this.parent = parent;
    }

    public getParent(): Skeleton {
        return this.parent;
    }

    public appendChild(child: Component) {
        if (child instanceof Skeleton) {
            super.appendChild(child);
            child.setParent(this);
        } else throw new Error("UnsupportedOperationException");
    }

    public expr(): string {
        const expr = "<" + Text.compile(this.getName()) + ":" + extractAttributes(this) + this.getChildren().expr();
        return (expr.endsWith(":") ? expr.substring(0, expr.length - 1) : expr) + ">";
    }
}

@ComponentConfig("md")
export class MDBlock extends Component {
    protected markdown: string;

    public constructor(markdown: string = null) {
        super();
        this.setMarkdown(markdown);
    }

    public setMarkdown(markdown: string): void {
        this.markdown = markdown;
    }

    public getMarkdown(): string {
        return this.markdown;
    }

    public expr(): string {
        return "{" + this.getTagName() + ":" + this.getMarkdown() + "}";
    }
}