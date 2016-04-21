/**
 * @file JS Promise实现
 * @author bruxexu20@gmail.com
 */
(function(global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
    else {
        global.AdaptText = factory();
    }
})(this, function() {
    // 默认输入框的最小高度
    var MIN_HEIGHT = 50;
    // 默认输入框的最大高度，超过则出现滚动条
    var MAX_HEIGHT = 500;
    // 获取元素内文本使用的属性名，IE9以下为innerText，其它浏览器为textContent
    var TEXT_NAME = typeof document.body.textContent === 'undefined' ? 'innerText' : 'textContent';

    /**
     * 使文本输入框 textarea 随着用户输入自适应高度
     *
     * 默认情况下 textarea 的高度是固定的，不会随着内容变化而变化。内容过多时会出现滚动条。有时候会希望随着内容的增多，
     * textarea 自动增加高度，从而不出现滚动条。本脚本用于实现此功能。思路来源于网上。大致过程如下：在 textarea 的外
     * 面包裹一个 div 元素，同时在 textarea 的同一级增加一个 pre 元素。利用 pre 的特性：内容会保留格式，且高度会随
     * 着内容高度的变化而变化。先通过 `visibility: hidden` 将其隐藏，但其仍然占据页面空间。通过 pre 来影响外层 div
     * 的大小。同时设置 textarea 基于 外层 div 绝对定位，其 width、height 都设置为 100%。最后，设置 textarea 的
     * input 事件，使其输入内容时，动态将 textarea 的内容赋予 pre，使 pre 的文本内容和 textarea 的输入值保持同步。
     * 于是，pre 的大小决定了外层 div 的大小，div 的大小决定了 textarea 的大小，而 textarea 的内容变化时又会动态
     * 改变 pre 的内容，从而改变它的大小。因此形成了一个环，从而实现了 textarea 的高度随输入变化而变化的需求。
     */
    function AdaptText(options) {
        if (typeof options !== 'object') {
            return;
        }

        if (!options.textarea) {
            options = {textarea: options};
        }

        if (!checkTextarea(options.textarea)) {
            return;
        }

        var textarea = options.textarea;
        var minHeight = options.minHeight || MIN_HEIGHT;
        var maxHeight = options.maxHeight || MAX_HEIGHT;

        var wrapper = document.createElement('div');
        var pre = document.createElement('pre');
        textarea.parentElement.insertBefore(wrapper, textarea);
        wrapper.appendChild(textarea);
        wrapper.appendChild(pre);
        pre[TEXT_NAME] = textarea.value;

        var styles = getStyles(textarea);
        // textarea 默认会有 padding、border，因此设置 width、height 为外层 div 的 100% 时，实际会大于 div 的
        // 大小。因此此处给 div 设置 margin，其实是为了去除 textarea 的 padding、border 的影响。之所以只设置
        // right、bottom 的 margin，而不是 4 个方向的，是为了不导致 textarea 的偏移，从而产生副作用。
        var marginRight = textarea.offsetWidth - parseInt(styles.width, 10) + 'px';
        var marginBottom = textarea.offsetHeight - parseInt(styles.height, 10) + 'px';
        setStyles(wrapper, {
            'position': 'relative',
            'margin-right': marginRight,
            'margin-bottom': marginBottom
        });

        setStyles(pre, {
            'padding': 0,
            'margin': 0,
            'width': '100%',
            'visibility': 'hidden',
            'word-break': 'break-all',
            'white-space': 'pre-wrap',
            'font-family': styles.fontFamily,
            'font-size': styles.fontSize,
            'color': styles.color,
            'line-height': styles.lineHeight,
            'min-height': minHeight + 'px',
            'max-height': maxHeight + 'px'
        });

        setStyles(textarea, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%'
        });

        addEvent(textarea, 'input', function () {
            var height = parseInt(getStyles(textarea).height, 10);
            if (isNaN(height) || height < minHeight || height > maxHeight) {
                return;
            }

            pre[TEXT_NAME] = textarea.value + ' ';
        });
    }

    function checkTextarea(node) {
        if ('HTMLTextAreaElement' in window) {
            return node instanceof HTMLTextAreaElement;
        }

        return node
            && typeof node === 'object'
            && node.nodeType === 1
            && node.tagName.toLowerCase() === 'textarea';
    }

    function getStyles(element) {
        if (window.getComputedStyle) {
            return window.getComputedStyle(element, null);
        }
        else if (element.currentStyle) {
            return element.currentStyle;
        }
        else {
            return {};
        }
    }

    function setStyles(element, styles) {
        var cssText = '';
        for (var key in styles) {
            cssText += '; ' + key + ': ' + styles[key];
        }
        cssText = cssText.slice(2);
        if (typeof element.style.cssText !== 'undefined') {
            element.style.cssText += cssText;
        }
        else {
            var style = element.getAttribute('style') || '';
            element.setAttribute('style', style + (style ? ';' : '') + cssText);
        }
    }

    function addEvent(element, type, callback) {
        if (element.addEventListener) {
            element.addEventListener(type, callback, false);
        }
        else if (element.attachEvent) {
            element.attachEvent('on' + type, callback);
        }
        else {
            element[on + type] = callback;
        }
    }

    return AdaptText;
});
