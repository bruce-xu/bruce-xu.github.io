---
layout: post
title:  图片瀑布流展现的实现
date:   2016-04-02 12:15:10 +0800
categories: [JS, Waterfall]
permalink: blogs/js/waterfall
tags: Waterfall
keywords: JS,Waterfall,瀑布流
---

　　上一篇结尾处说再接再厉，希望能多写点东西。半个多月过去了，还没有动静。果然男人的话是不可信的😓 。为了挽回一点仅有的信用，还是赶快写点东西吧。

　　现在有些有较多图片展示的网站会选择使用瀑布流的方式实现。上周随手写了一个JS脚本来实现此功能，下面介绍实现过程。

　　首先说明一下瀑布流展示的特点：图片定宽不定高（当然个别情况宽高都不定，不过这种情况不在我们讨论的范围内）；下一张图片会被放置到当前高度最小的一列。基于上述的两个特点，该如何布局呢？首先想到的是浮动布局，但无论是向左浮动还是向右浮动，都会如下面截图中的布局一样，无法满足要求：

> 向左浮动
![float: left](/assets/waterfall/float-left.jpg)

> 向右浮动
![float: left](/assets/waterfall/float-right.jpg)

　　既然 `float` 无法满足，只能换其它思路了。正常的文档流实现不了这种跳跃式的布局，看来只能跳出文档流之外了。由此可以想到使用 `position: absolute` 来布局。布局某张图片时，动态计算当前高度最低的列，然后通过设置图片容器的 `left` 值来放置图片到那一列，再通过设置 `top` 值来设置图片的垂直位置，最后更新这一列的高度。

具体实现上，定义了一个叫 `Waterfall` 的构造函数，需要传递如下的配置参数：

{% highlight js %}
container: null  //（required）包含瀑布流图片的DOM容器元素
itemWidth: 0     //（optional）每一张图片外层DOM元素的盒模型宽度
itemClass: ''    //（optional）每一张图片外层DOM元素的class名，不传的话会取`container`的直接子节点
middle: true     //（optional）是否居中显示瀑布流内容
animation: true  //（optional）图片加载完展现时是否有动画效果
duration: 1      //（optional）动画时长（单位：秒）
{% endhighlight %}

　　其中 `container` 参数是瀑布流的父容器节点，为必须参数，其它参数可选。将传递的参数 extend （内部有实现 `extend` 方法。由于是原生JS实现，未使用jQuery等工具库，所以一些工具函数需要手动实现）到运行时的 `this` 对象（即 `Waterfall` 对象）上后，调用 `init` （内部私有函数，对于不需要用户调用的方法，我一般习惯封装成私有函数）方法进行初始化。最后调用 `render` （此瀑布流实现中只需暴露了一个 `render` 方法给用户）方法渲染出瀑布流布局。

　　上面提到的 `init` 初始化函数做了三件事：获取图片容器（这里假定每张图片的外层都会有容器元素包裹，而不是光秃秃的图片并排排列，且每个图片容器的宽度相同。如果没有包裹或宽度不等，只能呵呵了）的盒模型的大小；计算总共有多少列；由于用到 `position: absolute` 布局，所以需要给瀑布流容器 `container` 设置 `position: relative` CSS 属性。

　　上面说到的计算图片容器盒模型的大小需要展开说明一下。构造函数 `Waterfall` 的参数中有一个 `itemWidth` 的参数，代表了图片容器元素的宽度（此处的宽度，我把它当做是元素盒模型的总宽度，即 `width + padding + border`，而非元素内容的宽度 `width` ，此处，我觉得这样更合理，也方便调用者处理），如果有就使用此值，如果没有，则获取第一个图片容器的 `width + padding + border` 作为 `itemWidth`。还有一点需要说明，如果图片容器有设置 CSS 属性 `box-sizing: border-box`，则其 `width` 就已经是内容宽度、`padding` 以及 `margin` 之和了，所以就不用再相加了。

　　在调用 `render` 方法渲染瀑布流布局时，有一点需要特别注意：图片是需要通过网络加载的，因此正常情况下，当运行 `render` 方法时，图片应该还没有加载完（如果是读缓存的话，可能此时已经加载完了。当然如果是在 `window.onload` 事件处理中调用的 `Waterfall` 构造函数，则此时图片都已经加载完成了。但这样的话，一是如果有大量图片的话，会等很久才会渲染出瀑布流效果，二是如果有分页异步加载的情况，依然会有此问题。），所以需要针对图片的加载做处理。此处首先查找出所有的图片，然后遍历每张图片，判断图片是否加载完成（img 元素会有一个 `complete` 属性，如果已经加载完成，则此属性为 true，否则为 false）。如果已加载完成，则直接计算布局渲染出来，否则的话，给图片添加 `onload` 事件，`onload` 事件触发后再计算布局渲染。

　　还有几个细节需要提一下。渲染图片时，由于需要设置几个样式属性，为了减少可能的 `reflow/repaint` ，将多个样式属性组合起来，一次赋值给 `style.cssText` ；图片渲染时默认添加了动画效果，开始是准备先 `display: none` 隐藏图片，并设置 `transition: display 1s` 的 CSS 属性来设置动画效果，待加载完成后通过 `display: block` 动画效果显示出来。但是最后发现 `display` 属性不支持动画效果，包括使用其它属性和它组合动画也不行。于是改用 `visibility` 。但直接使用 `visibility` 也是无法实现动画效果，结合 `opacity` 后才实现。

　　好了，大致实现过程介绍完了，做了一个 demo ，链接如下：

> [图片瀑布流 DEMO]

　　代码在 Github 地址如下：

> [Waterfall]

[图片瀑布流 demo]: /demos/waterfall
[Waterfall]: https://github.com/bruce-xu/waterfall
