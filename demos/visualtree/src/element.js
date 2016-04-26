define(function () {
    var _ = require('util');

    function Element(type) {
        this.type = type;
        this.children = [];
        this.x = 0;
        this.y = 0;
        this.key = '0.0';
        this.level = 0;
    }

    Element.prototype =  {
        constructor: Element,

        join: function () {
            if (!this.parent) {
                return;
            }

            var context =  this.context;
            context.beginPath();
            context.moveTo(this.x, this.y);
            context.lineTo(parent.x, parent.y);
            context.stroke();
        },

        resetKeys: function () {
            var children = this.children;
            var baseKey = this.key;
            _.each(children, function (item, index) {
                item.key = baseKey + '.' + index;
            });
        },

        addChild: function (child) {
            if (child.parent) {
                var parent = child.parent;
                var children = parent.children;
                _.each(children, function (item, index) {
                    if (child === item) {
                        children.splice(index, 1);
                        return false;
                    }
                });

                parent.resetKeys();
            }

            child.parent = this;
            child.level = this.level + 1;
            child.key = this.key + '.' + this.children.length;

            this.children.push(child);
        },

        removeChild: function (child) {
            if (child instanceof Element) {
                child = child.key;
            }

            var element = this.elements[child];
            if (element && element !== this.root) {
                var parent = element.parent;
                each(parent.children, function (child, index) {
                    if (child === element) {
                        parent.children.splice(index, 1);
                        return false;
                    }
                });
            }
        },

        render: function () {
            var wrapper = document.createElement('div');
            var inner = document.createElement('span');
            var type = document.createElement('span');
            var key = document.createElement('span');

            wrapper.className = 'element';
            inner.className = 'inner';
            type.className = 'type';
            key.className = 'key';

            type.innerHTML = this.type;
            key.innerHTML = this.key;
            inner.appendChild(type);
            inner.appendChild(key);
            wrapper.appendChild(inner);

            wrapper.style.left = this.x + 'px';
            wrapper.style.top = this.y + 'px';
            wrapper.setAttribute('data-key', this.key);

            return wrapper;
        },

        renderAll: function (elements) {
            elements = elements || [];
            elements.push(this.render());
            var children = this.children;
            _.each(children, function (child) {
                child.renderAll(elements);
            });

            return elements;
        }
    };

    return Element;
});