define(function () {
    var _ = require('util');
    var Element = require('element');

    var WIDTH = 800;
    var HEIGHT = 800;
    var NODE_WIDTH = 50;
    var NODE_HEIGHT = 50;
    var OUTTER_WIDTH = 80;
    var OUTTER_HEIGHT = 80;

    function Context(root) {
        this.root = root;
        this.elements = {};
        this.levelMapping = [];

        this.init();
    }

    Context.prototype = {
        constructor: Context,

        index: 0,

        init: function () {
            var canvas = document.getElementById('canvas');
            var container = document.getElementById('container');
            var addBtn = document.getElementById('add-wrapper');
            this.container = container;
            this.addBtn = addBtn;
            this.context = canvas.getContext('2d');

            this.index++;

            this.bindEvent();
        },

        bindEvent: function () {
            var self = this;
            this.container.addEventListener('mouseover', function (e) {
                if (e.target.className === 'element') {
                    self.showAdd.call(self, e.target);
                }
                else {
                    self.addBtn.style.display = 'none';
                    self.addBtn.classList.remove('for-select');
                }
            });

            this.addBtn.querySelector('.add').addEventListener('click', function (e) {
                self.addBtn.classList.add('for-select');
            });

            this.addBtn.querySelector('select').addEventListener('change', function (e) {
                self.addChild(e.target.value);
                e.target.value = '';
            });
        },

        getElements: function (element) {
            this.elements[element.key] = element;
            if (!this.levelMapping[element.level]) {
                this.levelMapping[element.level] = [];
            }
            this.levelMapping[element.level].push(element);

            var children = element.children || [];
            for (var i = 0, len = children.length; i < len; i++) {
                var child = children[i];
                this.getElements(child);
            }
        },

        clear: function () {
            this.elements = {};
            this.levelMapping = [];
            this.container.innerHTML = '';
            this.context.clearRect(0, 0, WIDTH, HEIGHT);
        },

        render: function () {
            this.clear();
            this.getElements(this.root);
            this.calculatePosition();
            var docFragment = document.createDocumentFragment();
            var elements = this.root.renderAll();
            _.each(elements, function (element) {
                docFragment.appendChild(element);
            });

            this.container.appendChild(docFragment);
            this.lineElements();
        },

        calculatePosition: function () {
            this.root.x = (WIDTH - OUTTER_WIDTH) / 2;
            this.root.y = 0;

            var middle = WIDTH / 2;
            var levelMapping = this.levelMapping;
            for (var i = 1; i < levelMapping.length; i++) {
                var elements = levelMapping[i];
                var minOffset = 0;
                var minIndex = 0;
                for (var j = 0; j < elements.length; j++) {
                    var element = elements[j];
                    var offsetToMiddle = Math.abs(element.parent.x - middle);
                    if (offsetToMiddle < minOffset) {
                        minOffset = offsetToMiddle;
                        minIndex = j;
                    }
                }

                var parent = elements[minIndex].parent;
                var upLevelElements = levelMapping[i - 1];
                var parentIndex = 0;
                _.each(upLevelElements, function (item, index) {
                    if (item === parent) {
                        parentIndex = index;
                        return false;
                    }
                });

                var bound = this.calculateChildrenPosition(parent);
                for (var l = parentIndex - 1; l >= 0; l--) {
                    bound = this.calculateChildrenPosition(upLevelElements[l], 1, bound.left);
                }
                for (var r = parentIndex + 1; r < upLevelElements.length; r++) {
                    bound = this.calculateChildrenPosition(upLevelElements[r], 2, bound.right);
                }
            }
        },

        calculateChildrenPosition: function (parent, orientation, bound) {
            var children = parent.children;
            var len = children.length;
            var totalWidth = len * OUTTER_WIDTH;
            var middle = parent.x + OUTTER_WIDTH / 2;
            var start = middle - totalWidth / 2;
            var end = start + totalWidth;
            if (orientation === 1) {
                if (end > bound) {
                    var offset = end - bound;
                    start -= offset;
                    end -= offset;
                    parent.x -= offset;
                }
            }
            else if (orientation === 2) {
                if (start < bound) {
                    var offset = bound - start;
                    start = bound;
                    end = bound + totalWidth;
                    parent.x += offset;
                }

            }
            bound = {left: start, right: end};

            for (var i = 0; i < len; i++) {
                var child = children[i];
                child.x = start + OUTTER_WIDTH * i;
                child.y = OUTTER_WIDTH * child.level;
            }

            return bound;
        },

        lineElements: function () {
            var context = this.context;
            _.each(this.elements, function (element) {
                var parent = element.parent;
                if (parent) {
                    var startX = element.x + NODE_WIDTH / 2;
                    var startY = element.y + NODE_HEIGHT / 2;
                    var endX = parent.x + NODE_WIDTH / 2;
                    var endY = parent.y + NODE_HEIGHT / 2;

                    context.beginPath();
                    context.moveTo(startX, startY);
                    context.lineTo(endX, endY);
                    context.stroke();
                }
            });
        },

        showAdd: function (element) {
            var key = element.getAttribute('data-key');
            if (!key || !(element = this.elements[key])) {
                return;
            }

            this.addBtn.style.display = 'block';
            this.addBtn.style.left = element.x + 'px';
            this.addBtn.style.top = element.y + 'px';

            this.current = element;
        },

        addChild: function (type) {
            if (this.current) {
                var element = new Element(type);
                this.current.addChild(element);

                this.render();
            }
        }
    };

    return Context;
});