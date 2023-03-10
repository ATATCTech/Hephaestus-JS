var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Ref_1, HTMLBlock_1, MDBlock_1;
import { Style } from "../style.js";
import { BadFormat, MissingFieldException } from "../exception.js";
import { parseExpr } from "../hephaestus.js";
import { Attribute, extractAttributes, injectAttributes, searchAttributesInExpr } from "../attribute.js";
import { Config } from "../config.js";
class ComponentConfigRecord {
    _tagName;
    constructor(tagName = "undefined") {
        this._tagName = tagName;
    }
    tagName() {
        return this._tagName;
    }
}
export function ComponentConfig(tagName) {
    return function (constructor) {
        constructor.prototype.config = new ComponentConfigRecord(tagName);
        if (!Reflect.has(constructor, "PARSER"))
            throw new MissingFieldException(constructor, "PARSER");
        Config.getInstance().putParser(tagName, Reflect.get(constructor, "PARSER"));
    };
}
export class Component {
    id;
    style = new Style();
    constructor() {
    }
    getConfig() {
        return Object.getPrototypeOf(this).config;
    }
    getTagName() {
        const config = this.getConfig();
        return config == null ? "undefined" : config.tagName();
    }
    setId(id) {
        this.id = id;
    }
    getId() {
        return this.id;
    }
    setStyle(style) {
        this.style = style;
    }
    getStyle() {
        return this.style;
    }
    forEach(action, depth = 0) {
        action(this, depth);
    }
    parallelTraversal(action, depth = 0) {
        action(this, depth);
    }
    generateExpr(inner) {
        return "{" + this.getTagName() + ":" + extractAttributes(this) + inner + "}";
    }
}
__decorate([
    Attribute(),
    __metadata("design:type", String)
], Component.prototype, "id", void 0);
Component.prototype.toString = function () {
    return this.expr();
};
export class UnsupportedComponent extends Component {
    tagName = "undefined";
    fullExpr = "";
    inner = "";
    constructor() {
        super();
    }
    expr() {
        return this.fullExpr;
    }
}
export class Text extends Component {
    static PARSER = expr => new Text(Text.decompile(expr));
    text;
    constructor(text) {
        super();
        this.setText(text);
    }
    setText(text) {
        this.text = text;
    }
    getText() {
        return this.text;
    }
    expr() {
        return "{" + Text.compile(this.getText()) + "}";
    }
    static COMPILER_CHARACTER = '^';
    static RESERVED_KEYWORDS = [
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
    static quote(c) {
        return Text.COMPILER_CHARACTER + c;
    }
    static compile(s, c = null) {
        if (s == null)
            return null;
        if (c == null)
            for (let k of Text.RESERVED_KEYWORDS)
                s = Text.compile(s, k);
        return s.replace(c, Text.quote(c));
    }
    static decompile(s, c = null) {
        if (s == null)
            return null;
        if (c == null)
            for (let k of Text.RESERVED_KEYWORDS)
                s = Text.decompile(s, k);
        return s.replace(Text.quote(c), c);
    }
    static indexOf(s, c, fromIndex = 0) {
        for (let i = fromIndex; i < s.length; i++)
            if (Text.charAtEquals(s, i, c))
                return i;
        return -1;
    }
    static lastIndexOf(s, c, fromIndex = s.length - 1) {
        for (let i = fromIndex; i > 0; i--)
            if (Text.charAtEquals(s, i, c))
                return i;
        return -1;
    }
    static charAtEquals(s, i, c) {
        const e = s.charAt(i) == c;
        if (i > 0)
            return e && s.charAt(i - 1) != Text.COMPILER_CHARACTER;
        if (c == Text.COMPILER_CHARACTER && s.length > 1)
            return e && s.charAt(1) != Text.COMPILER_CHARACTER;
        return e;
    }
    static charAtEqualsAny(s, i, ...cs) {
        const bit = s.charAt(i);
        for (let c of cs) {
            if (bit != c)
                continue;
            if (i > 0)
                return s.charAt(i - 1) != Text.COMPILER_CHARACTER;
            if (c == Text.COMPILER_CHARACTER && s.length > 1)
                return s.charAt(1) != Text.COMPILER_CHARACTER;
            return true;
        }
        return false;
    }
    static startsWith(s, c) {
        return Text.charAtEquals(s, 0, c);
    }
    static endsWith(s, c) {
        return Text.charAtEquals(s, s.length - 1, c);
    }
    static wrappedBy(s, start, end = start) {
        return Text.startsWith(s, start) && Text.endsWith(s, end);
    }
    static pairBrackets(s, open, close, requiredDepth = 0) {
        let depth = 0;
        let startIndex = -1;
        for (let i = 0; i < s.length; i++) {
            if (Text.charAtEquals(s, i, open) && depth++ == requiredDepth)
                startIndex = i;
            else if (Text.charAtEquals(s, i, close) && --depth == requiredDepth)
                return [startIndex, i];
        }
        return [startIndex, -1];
    }
}
let Ref = Ref_1 = class Ref extends Component {
    static PARSER = expr => new Ref_1(expr);
    to;
    constructor(id) {
        super();
        this.setId(id);
    }
    referTo(real) {
        this.to = real;
    }
    expr() {
        return this.to == null ? "{" + this.getTagName() + ":" + this.getId() + "}" : this.to.expr();
    }
};
Ref = Ref_1 = __decorate([
    ComponentConfig("ref"),
    __metadata("design:paramtypes", [String])
], Ref);
export { Ref };
export class MultiComponent extends Component {
    static PARSER = expr => {
        let open, close;
        if (Text.wrappedBy(expr, "{", "}")) {
            open = "{";
            close = "}";
        }
        else if (Text.wrappedBy(expr, "<", ">")) {
            open = "<";
            close = ">";
        }
        else
            throw new BadFormat("Unrecognized format.", expr);
        let [start, end] = Text.pairBrackets(expr, open, close);
        const components = [];
        while (start >= 0 && end++ >= 0) {
            components.push(parseExpr(expr.substring(start, end)));
            expr = expr.substring(end);
            [start, end] = Text.pairBrackets(expr, open, close);
        }
        return new MultiComponent(...components);
    };
    components = [];
    constructor(...components) {
        super();
        this.setComponents(...components);
    }
    setComponents(...components) {
        this.components = components;
    }
    forEach(action, depth = 0) {
        for (let component of this.components)
            component.forEach(action, depth);
    }
    parallelTraversal(action, depth = 0, components = this.components) {
        const next = [];
        for (let component of components) {
            if (component instanceof WrapperComponent)
                next.push(...component.getChildren().components);
            action(component, depth);
        }
        if (next.length > 0)
            this.parallelTraversal(action, depth + 1, next);
    }
    expr() {
        if (this.components.length == 0)
            return "";
        if (this.components.length == 1)
            return this.components.at(0).expr();
        let expr = "[";
        this.components.forEach(component => expr += component.expr());
        return expr + "]";
    }
    size() {
        return this.components.length;
    }
    isEmpty() {
        return this.components.length == 0;
    }
    contains(component) {
        return this.components.includes(component);
    }
    [Symbol.iterator]() {
        return this.components[Symbol.iterator]();
    }
    add(component) {
        this.components.push(component);
    }
    remove(index) {
        this.components.splice(index, 1);
    }
    containsAll(c) {
        for (let component of c)
            if (!this.components.includes(component))
                return false;
        return true;
    }
    addAll(c) {
        this.components.push(...c);
    }
    clear() {
        this.components = [];
    }
    get(index) {
        return this.components[index];
    }
    /**
     * Not original.
     * @param callbackfn callback function
     */
    map(callbackfn) {
        const arr = [];
        for (let i in this.components)
            arr.push(callbackfn(this.components[i], Number(i), this));
        return arr;
    }
}
export class WrapperComponent extends Component {
    children;
    constructor(children = new MultiComponent()) {
        super();
        this.setChildren(children);
    }
    setChildren(children) {
        this.children = children;
    }
    getChildren() {
        return this.children;
    }
    appendChild(child) {
        this.children.add(child);
    }
    child(index) {
        return this.getChildren().get(index);
    }
    removeChild(index) {
        this.children.remove(index);
    }
    forEach(action, depth = 0) {
        super.forEach(action, depth);
        this.getChildren().forEach(action, depth + 1);
    }
    parallelTraversal(action, depth = 0) {
        super.parallelTraversal(action, depth);
        this.getChildren().parallelTraversal(action, depth + 1);
    }
    expr() {
        return this.generateExpr(this.getChildren().expr());
    }
    static makeParser(constructor) {
        return expr => {
            const component = Object.create(constructor.prototype);
            const attributesAndBody = searchAttributesInExpr(expr);
            let attributesExpr, bodyExpr;
            if (attributesAndBody == null)
                bodyExpr = expr;
            else {
                [attributesExpr, bodyExpr] = attributesAndBody;
                injectAttributes(component, attributesExpr);
            }
            const bodyComponent = parseExpr(bodyExpr);
            if (bodyComponent != null)
                component.setChildren(bodyComponent instanceof MultiComponent ? bodyComponent : new MultiComponent(bodyComponent));
            else
                component.setChildren(new MultiComponent());
            return component;
        };
    }
}
export class Skeleton extends WrapperComponent {
    static PARSER = WrapperComponent.makeParser(Skeleton);
    name;
    component;
    parent;
    constructor(name = null) {
        super();
        this.setName(name);
    }
    setName(name) {
        this.name = name;
    }
    getName() {
        return this.name;
    }
    setComponent(component) {
        this.component = component;
    }
    getComponent() {
        return this.component;
    }
    setParent(parent) {
        this.parent = parent;
    }
    getParent() {
        return this.parent;
    }
    appendChild(child) {
        if (child instanceof Skeleton) {
            super.appendChild(child);
            child.setParent(this);
        }
        else
            throw new Error("UnsupportedOperationException");
    }
    expr() {
        const expr = "<" + Text.compile(this.getName()) + ":" + extractAttributes(this) + this.getChildren().expr();
        return (expr.endsWith(":") ? expr.substring(0, expr.length - 1) : expr) + ">";
    }
    compile(compiler) {
        if (this.getComponent() instanceof Ref)
            compiler(this.getComponent());
    }
}
__decorate([
    Attribute(),
    __metadata("design:type", Component)
], Skeleton.prototype, "component", void 0);
let HTMLBlock = HTMLBlock_1 = class HTMLBlock extends Component {
    static PARSER = expr => new HTMLBlock_1(parseExpr(expr));
    html;
    constructor(html = null) {
        super();
        this.setHTML(html);
    }
    setHTML(html) {
        this.html = html;
    }
    getHTML() {
        return this.html;
    }
    expr() {
        return this.generateExpr(this.getHTML().expr());
    }
};
HTMLBlock = HTMLBlock_1 = __decorate([
    ComponentConfig("html"),
    __metadata("design:paramtypes", [Text])
], HTMLBlock);
export { HTMLBlock };
let MDBlock = MDBlock_1 = class MDBlock extends Component {
    static PARSER = expr => new MDBlock_1(parseExpr(expr));
    markdown;
    constructor(markdown = null) {
        super();
        this.setMarkdown(markdown);
    }
    setMarkdown(markdown) {
        this.markdown = markdown;
    }
    getMarkdown() {
        return this.markdown;
    }
    expr() {
        return this.generateExpr(this.getMarkdown().expr());
    }
};
MDBlock = MDBlock_1 = __decorate([
    ComponentConfig("md"),
    __metadata("design:paramtypes", [Text])
], MDBlock);
export { MDBlock };
//# sourceMappingURL=component.js.map