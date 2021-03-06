require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
/**
 * 文字列からルビをパースする。
 * このパーサは、akashic-labelのデフォルトルビ記法のためのパーサである。
 *
 * このパーサを使う場合、ラベルに与える文字列にJSONのオブジェクトを表す文字列を含むことができる。
 * 文字列中のオブジェクトはルビを表す要素として扱われる。
 * オブジェクトのメンバーには、ルビを表す `rt` と、本文を表す `rb` を含む必要がある。
 * これらのメンバー以外に、RubyOptions型が持つメンバーを含むことができる。
 *
 * 入力の例として、
 * 'これは{"rb":"本文","rt":"ルビ", "rubyFontSize": 2}です。'
 * という文字列が与えられた場合、このパーサは
 * ["これは", {rb:"本文", rt: "ルビ", rubyFontSize: 2}, "です。"]
 * という配列を返す。
 * また、 `{` や `}` は `\\` でエスケープする必要がある。
 * 例として、括弧は `\\{` 、 バックスラッシュは `\\` を用いて表現する。
 * 注意すべき点として、オブジェクトのプロパティ名はダブルクォートでくくられている必要がある。
 */
function parse(text) {
    var pattern = /^((?:[^\\{]|\\+.)*?)({(?:[^\\}]|\\+.)*?})([\s\S]*)/;
    // ((?:[^\\{]|\\+.)*?) -> オブジェクトリテラルの直前まで
    // ({(?:[^\\}]|\\+.)*?}) -> 最前のオブジェクトリテラル
    // ([\s\S]*) -> オブジェクトリテラル以降の、改行を含む文字列
    var result = [];
    while (text.length > 0) {
        var parsedText = text.match(pattern);
        if (parsedText !== null) {
            var headStr = parsedText[1];
            var rubyStr = parsedText[2];
            text = parsedText[3];
            if (headStr.length > 0) {
                result.push(headStr.replace(/\\{/g, "{").replace(/\\}/g, "}"));
            }
            var parseResult = JSON.parse(rubyStr.replace(/\\/g, "\\\\"));
            if (parseResult.hasOwnProperty("rt") && parseResult.hasOwnProperty("rb")) {
                parseResult.rt = parseResult.rt.replace(/\\{/g, "{").replace(/\\}/g, "}");
                parseResult.rb = parseResult.rb.replace(/\\{/g, "{").replace(/\\}/g, "}");
                parseResult.text = rubyStr;
                result.push(parseResult);
            }
            else {
                throw g.ExceptionFactory.createTypeMismatchError("parse", "RubyFragment");
            }
        }
        else {
            result.push(text.replace(/\\{/g, "{").replace(/\\}/g, "}"));
            break;
        }
    }
    return result;
}
exports.parse = parse;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RubyFragmentDrawInfo = exports.StringDrawInfo = void 0;
/**
 * 行に含まれる文字列要素。
 */
var StringDrawInfo = /** @class */ (function () {
    function StringDrawInfo(text, width, glyphs) {
        this.text = text;
        this.width = width;
        this.glyphs = glyphs;
    }
    return StringDrawInfo;
}());
exports.StringDrawInfo = StringDrawInfo;
/**
 * 行に含まれるルビ要素。
 */
var RubyFragmentDrawInfo = /** @class */ (function () {
    function RubyFragmentDrawInfo(fragment, width, rbWidth, rtWidth, glyphs, rubyGlyphs) {
        this.text = fragment.text;
        this.fragment = fragment;
        this.width = width;
        this.rbWidth = rbWidth;
        this.rtWidth = rtWidth;
        this.glyphs = glyphs;
        this.rubyGlyphs = rubyGlyphs;
    }
    return RubyFragmentDrawInfo;
}());
exports.RubyFragmentDrawInfo = RubyFragmentDrawInfo;

},{}],3:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var rp = require("./RubyParser");
var fr = require("./FragmentDrawInfo");
var dr = require("./DefaultRubyParser");
/**
 * 複数行のテキストを描画するエンティティ。
 * 文字列内の"\r\n"、"\n"、"\r"を区切りとして改行を行う。
 * また、自動改行が有効な場合はエンティティの幅に合わせて改行を行う。
 * 本クラスの利用にはg.Fontが必要となる。
 */
var Label = /** @class */ (function (_super) {
    __extends(Label, _super);
    /**
     * 各種パラメータを指定して `Label` のインスタンスを生成する。
     * @param param このエンティティに対するパラメータ
     */
    function Label(param) {
        var _this = _super.call(this, param) || this;
        _this.text = param.text;
        _this.font = param.font;
        _this.fontSize = param.fontSize || param.font.size;
        _this._lineBreakWidth = param.width;
        _this.lineBreak = "lineBreak" in param ? param.lineBreak : true;
        _this.lineGap = param.lineGap || 0;
        _this.textAlign = "textAlign" in param ? param.textAlign : "left";
        _this.textColor = param.textColor;
        _this.trimMarginTop = "trimMarginTop" in param ? param.trimMarginTop : false;
        _this.widthAutoAdjust = "widthAutoAdjust" in param ? param.widthAutoAdjust : false;
        _this.rubyEnabled = "rubyEnabled" in param ? param.rubyEnabled : true;
        _this.fixLineGap = "fixLineGap" in param ? param.fixLineGap : false;
        _this.rubyParser = "rubyParser" in param ? param.rubyParser : dr.parse;
        _this.lineBreakRule = "lineBreakRule" in param ? param.lineBreakRule : undefined;
        if (!param.rubyOptions) {
            param.rubyOptions = {};
        }
        _this.rubyOptions = param.rubyOptions;
        _this.rubyOptions.rubyFontSize = "rubyFontSize" in param.rubyOptions ? param.rubyOptions.rubyFontSize : param.fontSize / 2;
        _this.rubyOptions.rubyFont = "rubyFont" in param.rubyOptions ? param.rubyOptions.rubyFont : _this.font;
        _this.rubyOptions.rubyGap = "rubyGap" in param.rubyOptions ? param.rubyOptions.rubyGap : 0;
        _this.rubyOptions.rubyAlign = "rubyAlign" in param.rubyOptions ? param.rubyOptions.rubyAlign : rp.RubyAlign.SpaceAround;
        _this._lines = [];
        _this._beforeText = undefined;
        _this._beforeTextAlign = undefined;
        _this._beforeFontSize = undefined;
        _this._beforeLineBreak = undefined;
        _this._beforeFont = undefined;
        _this._beforeWidth = undefined;
        _this._beforeRubyEnabled = undefined;
        _this._beforeFixLineGap = undefined;
        _this._beforeTrimMarginTop = undefined;
        _this._beforeWidthAutoAdjust = undefined;
        _this._beforeRubyOptions = {};
        _this._invalidateSelf();
        return _this;
    }
    /**
     * このエンティティの描画キャッシュ無効化をエンジンに通知する。
     * このメソッドを呼び出し後、描画キャッシュの再構築が行われ、各 `g.Renderer` に描画内容の変更が反映される。
     */
    Label.prototype.invalidate = function () {
        this._invalidateSelf();
        _super.prototype.invalidate.call(this);
    };
    Label.prototype.renderCache = function (renderer) {
        if (!this.rubyEnabled && this.fontSize === 0)
            return;
        renderer.save();
        var currentLineHeight = 0;
        for (var i = 0; i < this._lines.length; ++i) {
            if (this._lines[i].width > 0 && this._lines[i].height > 0) {
                renderer.drawImage(this._lines[i].surface, 0, 0, this._lines[i].width, this._lines[i].height, this._offsetX(this._lines[i].width), currentLineHeight);
            }
            currentLineHeight += this._lines[i].height + this.lineGap;
        }
        if (this.textColor) {
            renderer.setCompositeOperation("source-atop");
            renderer.fillRect(0, 0, this._lineBreakWidth, this.height, this.textColor);
        }
        renderer.restore();
    };
    /**
     * 利用している `g.Surface` を破棄した上で、このエンティティを破棄する。
     * 利用している `g.Font` の破棄は行わないため、 `g.Font` の破棄はコンテンツ製作者が明示的に行う必要がある。
     */
    Label.prototype.destroy = function () {
        this._destroyLines();
        _super.prototype.destroy.call(this);
    };
    /**
     * 禁則処理によって行幅が this.width を超える場合があるため、 `g.CacheableE` のメソッドをオーバーライドする
     */
    Label.prototype.calculateCacheSize = function () {
        // TODO: 最大値の候補に this.width を使用するのは textAlign が "center" か "right" の場合に描画に必要なキャッシュサイズを確保するためであり、
        // 最大行幅に対して this.width が大きい場合、余分なキャッシュ領域を確保することになる。
        // これは g.CacheableE にキャッシュ描画位置を調整する cacheOffsetX を導入することで解決される。
        var maxWidth = Math.ceil(this._lines.reduce(function (width, line) { return Math.max(width, line.width); }, this.width));
        return {
            width: maxWidth,
            height: this.height
        };
    };
    Object.defineProperty(Label.prototype, "lineCount", {
        /**
         * 描画内容の行数を返す
         */
        get: function () {
            return this._lines.length;
        },
        enumerable: false,
        configurable: true
    });
    Label.prototype._offsetX = function (width) {
        switch (this.textAlign) {
            case "left":
            case g.TextAlign.Left:
                return 0;
            case "right":
            case g.TextAlign.Right:
                return (this._lineBreakWidth - width);
            case "center":
            case g.TextAlign.Center:
                return ((this._lineBreakWidth - width) / 2);
            default:
                return 0;
        }
    };
    Label.prototype._destroyLines = function () {
        for (var i = 0; i < this._lines.length; i++) {
            if (this._lines[i].surface && !this._lines[i].surface.destroyed()) {
                this._lines[i].surface.destroy();
            }
        }
        this._lines = undefined;
    };
    Label.prototype._invalidateSelf = function () {
        if (this.fontSize < 0)
            throw g.ExceptionFactory.createAssertionError("Label#_invalidateSelf: fontSize must not be negative.");
        if (this.lineGap < -1 * this.fontSize)
            throw g.ExceptionFactory.createAssertionError("Label#_invalidateSelf: lineGap must be greater than -1 * fontSize.");
        // this.width がユーザから変更された場合、this._lineBreakWidth は this.width に追従する。
        if (this._beforeWidth !== this.width)
            this._lineBreakWidth = this.width;
        if (this._beforeText !== this.text
            || this._beforeFontSize !== this.fontSize
            || this._beforeFont !== this.font
            || this._beforeLineBreak !== this.lineBreak
            || (this._beforeWidth !== this.width && this._beforeLineBreak === true)
            || this._beforeTextAlign !== this.textAlign
            || this._beforeRubyEnabled !== this.rubyEnabled
            || this._beforeFixLineGap !== this.fixLineGap
            || this._beforeTrimMarginTop !== this.trimMarginTop
            || this._beforeWidthAutoAdjust !== this.widthAutoAdjust
            || this._isDifferentRubyOptions(this._beforeRubyOptions, this.rubyOptions)) {
            this._updateLines();
        }
        if (this.widthAutoAdjust) {
            // this.widthAutoAdjust が真の場合、 this.width は描画幅に応じてトリミングされる。
            this.width = Math.ceil(this._lines.reduce(function (width, line) { return Math.max(width, line.width); }, 0));
        }
        var height = this.lineGap * (this._lines.length - 1);
        for (var i = 0; i < this._lines.length; i++) {
            height += this._lines[i].height;
        }
        this.height = height;
        this._beforeText = this.text;
        this._beforeTextAlign = this.textAlign;
        this._beforeFontSize = this.fontSize;
        this._beforeLineBreak = this.lineBreak;
        this._beforeFont = this.font;
        this._beforeWidth = this.width;
        this._beforeRubyEnabled = this.rubyEnabled;
        this._beforeFixLineGap = this.fixLineGap;
        this._beforeTrimMarginTop = this.trimMarginTop;
        this._beforeWidthAutoAdjust = this.widthAutoAdjust;
        this._beforeRubyOptions.rubyFontSize = this.rubyOptions.rubyFontSize;
        this._beforeRubyOptions.rubyFont = this.rubyOptions.rubyFont;
        this._beforeRubyOptions.rubyGap = this.rubyOptions.rubyGap;
        this._beforeRubyOptions.rubyAlign = this.rubyOptions.rubyAlign;
    };
    Label.prototype._updateLines = function () {
        // ユーザのパーサを適用した後にも揃えるが、渡す前に改行記号を replace して統一する
        var fragments = this.rubyEnabled ? this.rubyParser(this.text.replace(/\r\n|\n/g, "\r")) : [this.text];
        // Fragment のうち文字列のものを一文字ずつに分解する
        fragments =
            rp.flatmap(fragments, function (f) {
                if (typeof f !== "string")
                    return f;
                // サロゲートペア文字を正しく分割する
                return f.replace(/\r\n|\n/g, "\r").match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
            });
        var undrawnLineInfos = this._divideToLines(fragments);
        var lines = [];
        var hasNotChanged = this._beforeFontSize === this.fontSize
            && this._beforeFont === this.font
            && !this._isDifferentRubyOptions(this._beforeRubyOptions, this.rubyOptions);
        for (var i = 0; i < undrawnLineInfos.length; i++) {
            var undrawnLineInfo = undrawnLineInfos[i];
            var line = this._lines[i];
            if (hasNotChanged && line !== undefined
                && undrawnLineInfo.sourceText === line.sourceText
                && undrawnLineInfo.width === line.width
                && undrawnLineInfo.height === line.height) {
                lines.push(line);
            }
            else {
                if (line && line.surface && !line.surface.destroyed()) {
                    line.surface.destroy();
                }
                this._drawLineInfoSurface(undrawnLineInfo);
                lines.push(undrawnLineInfo);
            }
        }
        // 行数が減った場合、使われない行のSurfaceをdestroyする。
        for (var i = lines.length; i < this._lines.length; i++) {
            var line = this._lines[i];
            if (line.surface && !line.surface.destroyed()) {
                line.surface.destroy();
            }
        }
        this._lines = lines;
    };
    Label.prototype._drawLineInfoSurface = function (lineInfo) {
        var lineDrawInfo = lineInfo.fragmentDrawInfoArray;
        var rhi = this._calcRubyHeightInfo(lineDrawInfo);
        var lineSurface = this.scene.game.resourceFactory.createSurface(Math.ceil(lineInfo.width), Math.ceil(lineInfo.height));
        var lineRenderer = lineSurface.renderer();
        lineRenderer.begin();
        lineRenderer.save();
        var rbOffsetY = (rhi.hasRubyFragmentDrawInfo || this.fixLineGap) ? this.rubyOptions.rubyGap + rhi.maxRubyGlyphHeightWithOffsetY : 0;
        var minMinusOffsetY = lineInfo.minMinusOffsetY;
        for (var i = 0; i < lineDrawInfo.length; i++) {
            var drawInfo = lineDrawInfo[i];
            if (drawInfo instanceof fr.RubyFragmentDrawInfo) {
                this._drawRubyFragmentDrawInfo(lineRenderer, drawInfo, rbOffsetY - minMinusOffsetY, -rhi.minRubyMinusOffsetY);
            }
            else if (drawInfo instanceof fr.StringDrawInfo) {
                this._drawStringGlyphs(lineRenderer, this.font, drawInfo.glyphs, this.fontSize, 0, rbOffsetY - minMinusOffsetY, 0);
            }
            lineRenderer.translate(drawInfo.width, 0);
        }
        lineRenderer.restore();
        lineRenderer.end();
        lineInfo.surface = lineSurface;
    };
    // 文字列の等幅描画
    Label.prototype._drawStringGlyphs = function (renderer, font, glyphs, fontSize, offsetX, offsetY, margin) {
        if (margin === void 0) { margin = 0; }
        renderer.save();
        renderer.translate(offsetX, offsetY);
        for (var i = 0; i < glyphs.length; i++) {
            var glyph = glyphs[i];
            var glyphScale = fontSize / font.size;
            var glyphWidth = glyph.advanceWidth * glyphScale;
            if (!glyph.isSurfaceValid) {
                glyph = this._createGlyph(glyph.code, font);
                if (!glyph)
                    continue;
            }
            renderer.save();
            renderer.transform([glyphScale, 0, 0, glyphScale, 0, 0]);
            if (glyph.width > 0 && glyph.height > 0) {
                renderer.drawImage(glyph.surface, glyph.x, glyph.y, glyph.width, glyph.height, glyph.offsetX, glyph.offsetY);
            }
            renderer.restore();
            renderer.translate(glyphWidth + margin, 0);
        }
        renderer.restore();
    };
    // ルビベースとルビテキストの描画
    Label.prototype._drawRubyFragmentDrawInfo = function (renderer, rubyDrawInfo, rbOffsetY, rtOffsetY) {
        var f = rubyDrawInfo.fragment;
        var rubyFontSize = "rubyFontSize" in f ? f.rubyFontSize : this.rubyOptions.rubyFontSize;
        var rubyAlign = "rubyAlign" in f ? f.rubyAlign : this.rubyOptions.rubyAlign;
        var rubyFont = "rubyFont" in f ? f.rubyFont : this.rubyOptions.rubyFont;
        var isRtWideThanRb = rubyDrawInfo.rtWidth > rubyDrawInfo.rbWidth;
        var width = rubyDrawInfo.width;
        var rtWidth = rubyDrawInfo.rtWidth;
        var rbWidth = rubyDrawInfo.rbWidth;
        var rtStartPositionX;
        var rbStartPositionX;
        var rtUnitMargin;
        var rbUnitMargin;
        switch (rubyAlign) {
            case rp.RubyAlign.Center:
                rtUnitMargin = 0;
                rbUnitMargin = 0;
                rtStartPositionX = isRtWideThanRb ? 0 : (width - rtWidth) / 2;
                rbStartPositionX = isRtWideThanRb ? (width - rbWidth) / 2 : 0;
                break;
            case rp.RubyAlign.SpaceAround:
                rtUnitMargin = (rubyDrawInfo.rubyGlyphs.length > 0) ? (width - rtWidth) / rubyDrawInfo.rubyGlyphs.length : 0;
                rbUnitMargin = 0;
                rtStartPositionX = isRtWideThanRb ? 0 : rtUnitMargin / 2;
                rbStartPositionX = isRtWideThanRb ? (width - rbWidth) / 2 : 0;
                break;
            default:
                throw g.ExceptionFactory.createAssertionError("Label#_drawRubyFragmentDrawInfo: unknown rubyAlign.");
        }
        this._drawStringGlyphs(renderer, this.font, rubyDrawInfo.glyphs, this.fontSize, rbStartPositionX, rbOffsetY, rbUnitMargin);
        this._drawStringGlyphs(renderer, rubyFont, rubyDrawInfo.rubyGlyphs, rubyFontSize, rtStartPositionX, rtOffsetY, rtUnitMargin);
    };
    Label.prototype._calcRubyHeightInfo = function (drawInfoArray) {
        var maxRubyFontSize = this.rubyOptions.rubyFontSize;
        var maxRubyGlyphHeightWithOffsetY = 0;
        var maxRubyGap = this.rubyOptions.rubyGap;
        var hasRubyFragmentDrawInfo = false;
        var maxRealDrawHeight = 0;
        var realOffsetY;
        for (var i = 0; i < drawInfoArray.length; i++) {
            var ri = drawInfoArray[i];
            if (ri instanceof fr.RubyFragmentDrawInfo) {
                var f = ri.fragment;
                if (f.rubyFontSize > maxRubyFontSize) {
                    maxRubyFontSize = f.rubyFontSize;
                }
                if (f.rubyGap > maxRubyGap) {
                    maxRubyGap = f.rubyGap;
                }
                var rubyGlyphScale = (f.rubyFontSize ? f.rubyFontSize : this.rubyOptions.rubyFontSize) / (f.rubyFont ? f.rubyFont.size : this.rubyOptions.rubyFont.size);
                var currentMaxRubyGlyphHeightWithOffsetY = Math.max.apply(Math, ri.rubyGlyphs.map(function (glyph) { return (glyph.offsetY > 0) ? glyph.height + glyph.offsetY : glyph.height; }));
                var currentMinRubyOffsetY = Math.min.apply(Math, ri.rubyGlyphs.map(function (glyph) { return (glyph.offsetY > 0) ? glyph.offsetY : 0; }));
                if (maxRubyGlyphHeightWithOffsetY < currentMaxRubyGlyphHeightWithOffsetY * rubyGlyphScale) {
                    maxRubyGlyphHeightWithOffsetY = currentMaxRubyGlyphHeightWithOffsetY * rubyGlyphScale;
                }
                var rubyFont = (f.rubyFont ? f.rubyFont : this.rubyOptions.rubyFont);
                var currentRubyStandardOffsetY = this._calcStandardOffsetY(rubyFont);
                var currentFragmentRealDrawHeight = (currentMaxRubyGlyphHeightWithOffsetY - Math.min(currentMinRubyOffsetY, currentRubyStandardOffsetY)) * rubyGlyphScale;
                if (maxRealDrawHeight < currentFragmentRealDrawHeight) {
                    maxRealDrawHeight = currentFragmentRealDrawHeight;
                    // その行で描画されるルビのうち、もっとも実描画高さが高い文字が持つoffsetYを求める
                    realOffsetY = Math.min(currentMinRubyOffsetY, currentRubyStandardOffsetY) * rubyGlyphScale;
                }
                hasRubyFragmentDrawInfo = true;
            }
        }
        // ルビが無い行でもfixLineGapが真の場合ルビの高さを使う
        if (maxRubyGlyphHeightWithOffsetY === 0) {
            maxRubyGlyphHeightWithOffsetY = this.rubyOptions.rubyFontSize;
        }
        var minRubyMinusOffsetY = this.trimMarginTop ? realOffsetY : 0;
        return {
            maxRubyFontSize: maxRubyFontSize,
            maxRubyGlyphHeightWithOffsetY: maxRubyGlyphHeightWithOffsetY,
            minRubyMinusOffsetY: minRubyMinusOffsetY,
            maxRubyGap: maxRubyGap,
            hasRubyFragmentDrawInfo: hasRubyFragmentDrawInfo
        };
    };
    Label.prototype._divideToLines = function (fragmentArray) {
        var state = {
            resultLines: [],
            currentStringDrawInfo: new fr.StringDrawInfo("", 0, []),
            currentLineInfo: {
                sourceText: "",
                fragmentDrawInfoArray: [],
                width: 0,
                height: 0,
                minMinusOffsetY: 0,
                surface: undefined
            },
            reservedLineBreakPosition: null
        };
        for (var i = 0; i < fragmentArray.length; i++) {
            this._addFragmentToState(state, fragmentArray, i);
        }
        this._flushCurrentStringDrawInfo(state);
        this._feedLine(state); // 行末ではないが、状態をflushするため改行処理を呼ぶ
        return state.resultLines;
    };
    Label.prototype._addFragmentToState = function (state, fragments, index) {
        var fragment = fragments[index];
        if (state.reservedLineBreakPosition !== null) {
            state.reservedLineBreakPosition--;
        }
        if (state.reservedLineBreakPosition === 0) {
            this._flushCurrentStringDrawInfo(state);
            this._feedLine(state);
            state.reservedLineBreakPosition = null;
        }
        if (typeof fragment === "string" && fragment === "\r") {
            /*
            // 行末に改行記号が来た場合、禁則処理によって改行すべきかは判断を保留し、一旦禁則処理による改行はしないことにする
            if (this._needFixLineBreakByRule(state)) {
                this._applyLineBreakRule(index, state);
            }
            */
            this._flushCurrentStringDrawInfo(state);
            this._feedLine(state);
        }
        else if (typeof fragment === "string") {
            var code = g.Util.charCodeAt(fragment, 0);
            if (!code)
                return;
            var glyph = this._createGlyph(code, this.font);
            if (!glyph)
                return;
            var glyphScale = this.fontSize / this.font.size;
            var glyphWidth = glyph.advanceWidth * glyphScale;
            if (this._needBreakLine(state, glyphWidth)) {
                this._breakLine(state, fragments, index);
            }
            state.currentStringDrawInfo.width += glyphWidth;
            state.currentStringDrawInfo.glyphs.push(glyph);
            state.currentStringDrawInfo.text += fragment;
        }
        else {
            var ri = this._createRubyFragmentDrawInfo(fragment);
            if (ri.width <= 0)
                return;
            this._flushCurrentStringDrawInfo(state);
            if (this._needBreakLine(state, ri.width)) {
                this._breakLine(state, fragments, index);
            }
            state.currentLineInfo.width += ri.width;
            state.currentLineInfo.fragmentDrawInfoArray.push(ri);
            state.currentLineInfo.sourceText += fragment.text;
        }
    };
    Label.prototype._createStringGlyph = function (text, font) {
        var glyphs = [];
        for (var i = 0; i < text.length; i++) {
            var code = g.Util.charCodeAt(text, i);
            if (!code)
                continue;
            var glyph = this._createGlyph(code, font);
            if (!glyph)
                continue;
            glyphs.push(glyph);
        }
        return glyphs;
    };
    Label.prototype._createGlyph = function (code, font) {
        var glyph = font.glyphForCharacter(code);
        if (!glyph) {
            var str = (code & 0xFFFF0000) ? String.fromCharCode((code & 0xFFFF0000) >>> 16, code & 0xFFFF) : String.fromCharCode(code);
            console.warn("Label#_invalidateSelf(): failed to get a glyph for '" + str + "' " +
                "(BitmapFont might not have the glyph or DynamicFont might create a glyph larger than its atlas).");
        }
        return glyph;
    };
    Label.prototype._createRubyFragmentDrawInfo = function (fragment) {
        var glyphs = this._createStringGlyph(fragment.rb, this.font);
        var rubyGlyphs = this._createStringGlyph(fragment.rt, this.rubyOptions.rubyFont);
        var rubyFont = "rubyFont" in fragment ? fragment.rubyFont : this.rubyOptions.rubyFont;
        var rubyFontSize = "rubyFontSize" in fragment ? fragment.rubyFontSize : this.rubyOptions.rubyFontSize;
        var glyphScale = this.fontSize / this.font.size;
        var rubyGlyphScale = rubyFontSize / rubyFont.size;
        var rbWidth = glyphs.length > 0 ?
            glyphs.map(function (glyph) { return glyph.advanceWidth; }).reduce(function (pre, cu) { return pre + cu; }) * glyphScale :
            0;
        var rtWidth = rubyGlyphs.length > 0 ?
            rubyGlyphs.map(function (glyph) { return glyph.advanceWidth; }).reduce(function (pre, cu) { return pre + cu; }) * rubyGlyphScale :
            0;
        var width = rbWidth > rtWidth ? rbWidth : rtWidth;
        return new fr.RubyFragmentDrawInfo(fragment, width, rbWidth, rtWidth, glyphs, rubyGlyphs);
    };
    Label.prototype._flushCurrentStringDrawInfo = function (state) {
        if (state.currentStringDrawInfo.width > 0) {
            state.currentLineInfo.fragmentDrawInfoArray.push(state.currentStringDrawInfo);
            state.currentLineInfo.width += state.currentStringDrawInfo.width;
            state.currentLineInfo.sourceText += state.currentStringDrawInfo.text;
        }
        state.currentStringDrawInfo = new fr.StringDrawInfo("", 0, []);
    };
    Label.prototype._feedLine = function (state) {
        var glyphScale = this.fontSize / this.font.size;
        var minOffsetY = Infinity;
        var minMinusOffsetY = 0;
        var maxGlyphHeightWithOffsetY = 0;
        state.currentLineInfo.fragmentDrawInfoArray.forEach(function (fragmentDrawInfo) {
            fragmentDrawInfo.glyphs.forEach(function (glyph) {
                if (minMinusOffsetY > glyph.offsetY) {
                    minMinusOffsetY = glyph.offsetY;
                }
                // offsetYの一番小さな値を探す
                if (minOffsetY > glyph.offsetY)
                    minOffsetY = glyph.offsetY;
                var heightWithOffsetY = (glyph.offsetY > 0) ? glyph.height + glyph.offsetY : glyph.height;
                if (maxGlyphHeightWithOffsetY < heightWithOffsetY) {
                    maxGlyphHeightWithOffsetY = heightWithOffsetY;
                }
            });
        });
        minMinusOffsetY = minMinusOffsetY * glyphScale;
        maxGlyphHeightWithOffsetY =
            (state.currentLineInfo.fragmentDrawInfoArray.length > 0) ?
                maxGlyphHeightWithOffsetY * glyphScale - minMinusOffsetY :
                this.fontSize;
        maxGlyphHeightWithOffsetY = Math.ceil(maxGlyphHeightWithOffsetY);
        var rhi = this._calcRubyHeightInfo(state.currentLineInfo.fragmentDrawInfoArray);
        state.currentLineInfo.height =
            rhi.hasRubyFragmentDrawInfo || this.fixLineGap ?
                maxGlyphHeightWithOffsetY + rhi.maxRubyGlyphHeightWithOffsetY + rhi.maxRubyGap :
                maxGlyphHeightWithOffsetY;
        state.currentLineInfo.minMinusOffsetY = minMinusOffsetY;
        if (this.trimMarginTop) {
            var minOffsetYInRange = Math.min(minOffsetY, this._calcStandardOffsetY(this.font)) * glyphScale;
            state.currentLineInfo.height -= minOffsetYInRange;
            state.currentLineInfo.minMinusOffsetY += minOffsetYInRange;
        }
        state.resultLines.push(state.currentLineInfo);
        state.currentLineInfo = {
            sourceText: "",
            fragmentDrawInfoArray: [],
            width: 0,
            height: 0,
            minMinusOffsetY: 0,
            surface: undefined
        };
    };
    Label.prototype._needBreakLine = function (state, width) {
        return (this.lineBreak && width > 0 && state.reservedLineBreakPosition === null &&
            state.currentLineInfo.width + state.currentStringDrawInfo.width + width > this._lineBreakWidth &&
            state.currentLineInfo.width + state.currentStringDrawInfo.width > 0); // 行頭文字の場合は改行しない
    };
    Label.prototype._isDifferentRubyOptions = function (ro0, ro1) {
        return (ro0.rubyFontSize !== ro1.rubyFontSize
            || ro0.rubyFont !== ro1.rubyFont
            || ro0.rubyGap !== ro1.rubyGap
            || ro0.rubyAlign !== ro1.rubyAlign);
    };
    Label.prototype._calcStandardOffsetY = function (font) {
        // 標準的な高さを持つグリフとして `M` を利用するが明確な根拠は無い
        var text = "M";
        var glyphM = font.glyphForCharacter(text.charCodeAt(0));
        return glyphM.offsetY;
    };
    /** stateのcurrent系プロパティを禁則処理的に正しい構造に再構築する */
    Label.prototype._breakLine = function (state, fragments, index) {
        if (!this.lineBreakRule) {
            this._flushCurrentStringDrawInfo(state);
            this._feedLine(state);
            return;
        }
        var correctLineBreakPosition = this.lineBreakRule(fragments, index); // 外部ルールが期待する改行位置
        var diff = correctLineBreakPosition - index;
        if (diff === 0) {
            this._flushCurrentStringDrawInfo(state);
            this._feedLine(state);
        }
        else if (diff > 0) {
            // 先送り改行
            state.reservedLineBreakPosition = diff;
        }
        else {
            // 巻き戻し改行
            this._flushCurrentStringDrawInfo(state);
            var droppedFragmentDrawInfoArray = [];
            // currentLineInfoのfragmentDrawInfoArrayを巻き戻す
            while (diff < 0) {
                var fragmentDrawInfoArray = state.currentLineInfo.fragmentDrawInfoArray;
                var lastDrawInfo = fragmentDrawInfoArray[fragmentDrawInfoArray.length - 1];
                if (lastDrawInfo instanceof fr.RubyFragmentDrawInfo) {
                    diff++;
                    droppedFragmentDrawInfoArray.push(lastDrawInfo);
                    fragmentDrawInfoArray.pop();
                }
                else {
                    if (-diff >= lastDrawInfo.text.length) {
                        diff += lastDrawInfo.text.length;
                        droppedFragmentDrawInfoArray.push(lastDrawInfo);
                        fragmentDrawInfoArray.pop();
                    }
                    else {
                        var droppedGlyphs = lastDrawInfo.glyphs.splice(diff);
                        var glyphScale = this.fontSize / this.font.size;
                        var droppedDrawInfoWidth = droppedGlyphs.reduce(function (acc, glyph) { return (glyph.advanceWidth * glyphScale + acc); }, 0);
                        lastDrawInfo.width -= droppedDrawInfoWidth;
                        var droppedDrawInfoText = lastDrawInfo.text.substring(lastDrawInfo.text.length + diff);
                        lastDrawInfo.text = lastDrawInfo.text.substring(0, lastDrawInfo.text.length + diff);
                        droppedFragmentDrawInfoArray.push(new fr.StringDrawInfo(droppedDrawInfoText, droppedDrawInfoWidth, droppedGlyphs));
                        diff = 0;
                    }
                }
            }
            // currentLineInfoのその他を更新する
            var droppedWidth = 0;
            var droppedSourceText = "";
            droppedFragmentDrawInfoArray.forEach(function (fragment) {
                droppedWidth += fragment.width;
                droppedSourceText += fragment.text;
            });
            state.currentLineInfo.width -= droppedWidth;
            var sourceText = state.currentLineInfo.sourceText;
            state.currentLineInfo.sourceText = sourceText.substr(0, sourceText.length - droppedSourceText.length);
            this._feedLine(state);
            state.currentLineInfo.fragmentDrawInfoArray = droppedFragmentDrawInfoArray;
            state.currentLineInfo.width = droppedWidth;
            state.currentLineInfo.sourceText = droppedSourceText;
        }
    };
    return Label;
}(g.CacheableE));
module.exports = Label;

},{"./DefaultRubyParser":1,"./FragmentDrawInfo":2,"./RubyParser":4}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatmap = exports.RubyAlign = void 0;
var RubyAlign;
(function (RubyAlign) {
    /**
     * rtの字間は固定で中央に揃える。
     */
    RubyAlign[RubyAlign["Center"] = 0] = "Center";
    /**
     * rb幅に合わせてrtの字間を揃える。
     */
    RubyAlign[RubyAlign["SpaceAround"] = 1] = "SpaceAround";
})(RubyAlign = exports.RubyAlign || (exports.RubyAlign = {}));
function flatmap(arr, func) {
    return Array.prototype.concat.apply([], arr.map(func));
}
exports.flatmap = flatmap;

},{}],"@akashic-extension/akashic-label":[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRubyParser = exports.RubyAlign = void 0;
exports.Label = require("./Label");
exports.FragmentDrawInfo = require("./FragmentDrawInfo");
exports.RubyParser = require("./RubyParser");
exports.RubyAlign = exports.RubyParser.RubyAlign;
// tslintが誤動作するので一時的に無効化する
/* tslint:disable: no-unused-variable */
var DRP = require("./DefaultRubyParser");
exports.defaultRubyParser = DRP.parse;
/* tslint:enable: no-unused-variable */

},{"./DefaultRubyParser":1,"./FragmentDrawInfo":2,"./Label":3,"./RubyParser":4}]},{},["@akashic-extension/akashic-label"]);
