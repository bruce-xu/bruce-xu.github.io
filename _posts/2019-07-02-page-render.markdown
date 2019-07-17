---
layout: post
title:  页面加载流程探讨
date:   2019-07-02 00:00:00 +0800
categories: [HTML, CSS, JS, Load, Render]
permalink: blogs/html/load-and-render
tags: load
keywords: HTML, CSS, JS, Load, Render
style: /assets/page-render/style.css
---

　　本文通过几个示例来探讨页面渲染过程中的如下几个注意点，并得出一些结论，希望能给大家带来帮助。测试浏览器为 Chrome（Mac、Windows）、Firefox（Mac、Windows）、Safari、IE、Edge。

### 一、HTML 解析时机 ###

　　如下示例中，HTML 内容并不是一次返回，而是每隔200ms，服务端返回一段`<div>Hello world!</div>`。

``` javascript
const http = require('http');

http.createServer(function (req, res) {
  let count = 100;

  res.write('<html><body><div>');

  const interval = setInterval(() => {
    res.write('<div>Hello world!</div>');

    if (count-- < 0) {
      res.end('</body></html>');
      clearInterval(interval);
    }
  }, 200);
}).listen(8000);
```

　　可以看出，当 Chrome 接收到一部分 HTML 内容后，就开始解析并渲染出来了，每隔200ms输出一句`Hello world!`。在随后不断的接收到新内容后，逐渐的渲染出来。这样做是合理的，试想如果页面内容很多，或者网速较慢，下载HTML需要很久，如果等到全部HTML下载完再解析并渲染的话，页面将有很长时间的空白，体验很差。

　　浏览器解析 HTML 时，尽可能的做到了错误兼容。如上例中，特意在 body 后面多了个 div，没有闭合标签，但并不影响浏览器的逐步渲染。

![Chrome下的表现](/assets/page-render/test1.gif)

　　`P.S.` 其他浏览器与 Chrome 的表现略有不同，它们没有立刻渲染，而是等待了大概3～8s左右（IE：3s、Edge：5s、Firefox：8s、Safari：8s），才开始第一次渲染出内容来，接下来以后每次接收到新内容，都实时的渲染出来。总的来说，也是边接收边解析渲染，只不过初始渲染前会尝试等待加载到更多的内容。


### 二、CSS 对页面渲染的影响 ###

　　如下示例中，head 中引入一个 CSS 文件，CSS 文件被设置了一个3s的延迟。

``` javascript
var http = require('http');

http.createServer(function (req, res) {
  switch (req.url) {
    case '/':
      getHTML(req, res);
      break;
    case '/style.css':
      getStyle(req, res);
      break;
  }
}).listen(8000);

function getStyle(req, res) {
  setTimeout(() => {
    res.end('body {background: pink}');
  }, 3000);
}

function getHTML(req, res) {
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="style.css">
      </head>
      <body>
        <div>Hello world!</div>
      </body>
    </html>
  `);
}
```

　　可以看出，Chrome 下虽然 HTML 立刻加载完了，但在 CSS 被下载并解析完前，页面不会被渲染而只是显示一片空白。

![Chrome下的表现](/assets/page-render/test2.gif)

　　`P.S.` Safari、IE、Edge、Firefox（Windows）与 Chrome 表现一致，但 Firefox（Mac）略有不同。Mac 版的 Firefox 首先将内容`Hello world!`显示出来，然后等待3s左右在 CSS 文件加载完后应用上样式重绘出来。如此看来，Mac 版 Firefox 此处的实现有些不规范。正常情况下，浏览器会获取到 HTML 和 CSS，分别解析成 DOM Tree 与 CSSOM Tree，最终合并成 Render Tree 并渲染出来。如下图所示：

![Render Tree](/assets/page-render/render-tree.jpeg)

　　我们常说的“CSS 放在头部引入”，一个很重要原因就是尽可能早的加载完 CSS，解析成 CSSOM Tree，构造出 Render Tree 并渲染出来，让用户尽早的看到完好的页面。


### 三、CSS 不同放置位置对页面渲染的影响 ###

　　如下示例中，body 中引入一个 CSS 文件，CSS 文件被设置了一个3s的延迟。

``` javascript
var http = require('http');

http.createServer(function (req, res) {
  switch (req.url) {
    case '/':
      getHTML(req, res);
      break;
    case '/style.css':
      getStyle(req, res);
      break;
  }
}).listen(8000);

function getStyle(req, res) {
  setTimeout(() => {
    res.end('body {background: pink; text-align: center;}');
  }, 3000);
}

function getHTML(req, res) {
  res.end(`
    <html>
      <body>
        <div>Hello world!</div>
    　  <link rel="stylesheet" href="style.css" >
        <div>Hello world!</div>
      </body>
    </html>
  `);
}
```

　　可以看出，Chrome 下 CSS 文件之前的内容立刻被渲染出来了，但在 CSS 被下载并解析完前，其后的内容不会被渲染。

![Chrome下的表现](/assets/page-render/test3.gif)

　　`P.S.` Safari、IE 与 Chrome 表现一致，但 Firefox、Edge 略有不同。Firefox 和 Edge 首先将 CSS 文件前后的内容`Hello world!`都显示出来了，然后等待3s左右在 CSS 文件加载完后应用上样式重绘出来。

　　由此可见，CSS 文件的放置位置可能会影响到页面的渲染时机。当放置在 head 中时，浏览器会等到 CSS 加载完生成 CSSOM Tree 后，与 DOM Tree 合并成 Render Tree 并渲染（Mac 版 Firefox 除外）；当放置在 body 中时，都不会影响 CSS 文件之前内容的立即呈现，但之后的内容呈现，各浏览器的表现不一致。

　　本例中，在 CSS 文件中除了设置背景色外，还设置了文字居中。可以发现文字`Hello world!`开始时居左显示，CSS 下载完后，立刻跳跃到居中，且背景色也变了。我们常说的“CSS 放在头部引入”，另一个重要原因就是，CSS 还没有被加载完之前，如果页面内容就被渲染出来了的话，由于没有样式，页面呈现多半会很乱。而在 CSS 加载完起效果时，内容会出现跳跃，突然的视觉变化使得体验不友好。这种现象有个专有名字--FOUC（flash of unstyled content，无样式内容闪烁）。所以还是尽量将 CSS 放在头部引入，尽可能早、并且一次性起效果，避免重绘时的跳跃过程。


### 四、JS 对页面渲染的影响 ###

　　我们知道，由于 JS 可以操作 DOM，所以会阻塞其后 HTML 的解析和渲染（在 JS 执行完之前，不能确定其后的 HTML 内容是否会被改变），这点无异议，就不验证了。接下来从脚本加载和执行两方面来验证 JS 对引用位置之前的页面内容渲染的影响。

　　1、如下示例中，body 中引入一个 JS 文件，JS 文件被设置了一个3s的延迟。

``` javascript
var http = require('http');

http.createServer(function (req, res) {
  switch (req.url) {
    case '/':
      getHTML(req, res);
      break;
    case '/script.js':
      getScript(req, res);
      break;
  }
}).listen(8000);

function getScript(req, res) {
  setTimeout(() => {
    res.end('console.log(\'Hello world!\')');
  }, 3000);
}

function getHTML(req, res) {
  res.end(`
    <html>
      <body>
        <div>Hello world!</div>
        <script src="script.js"></script>
        <div>Hello world!</div>
      </body>
    </html>
  `);
}
```

　　可以看到，JS 文件之前的内容立刻被渲染出来了。我们常说的“JS 文件要放在页面底部引入”，就是基于这个原因，使其不阻塞页面内容的渲染，让用户尽快看到页面。

![Chrome下的表现](/assets/page-render/test4.gif)

　　`P.S.` 其他浏览器的表现均一致。


　　2、如下示例中，body 有一段行内脚本，逻辑为执行3s的延迟。

``` javascript
var http = require('http');

http.createServer(function (req, res) {
  res.end(`
    <html>
      <body>
        <div>Hello world!</div>
        <script>
          var start = Date.now();
          while (Date.now() - start < 3000) {}
        </script>
        <div>Hello world!</div>
      </body>
    </html>
  `);
}).listen(8000);
```

　　可以看到，脚本的执行会阻塞整个页面内容的渲染（更准确的说是影响从上个已渲染点开始后的页面内容，如上一个 Script 外部文件之后的内容）。基于此原因，关于内联脚本，有如下一些建议：页面中尽量减少不必要的内联脚步嵌入，尤其是耗时的操作；内联脚本尽可能的在页面底部嵌入；耗时或大量的内联脚本，可以通过外联脚本方式引入（如考虑缓存等因素，则更有必要如此）。

![Chrome下的表现](/assets/page-render/test5.gif)

　　`P.S.` 其他浏览器的表现均一致。


### 五、CSS 与 JS 间的相互影响 ###

　　1、CSS 文件如果在 JS 之前引入，则 JS 的执行时机会受 CSS 的影响。

　　如下示例中，页面中先后引入一个 CSS 和 JS 文件，其中 CSS 文件有3s的加载延迟。

``` javascript
var http = require('http');

http.createServer(function (req, res) {
  switch (req.url) {
    case '/':
      getHTML(req, res);
      break;
    case '/style.css':
      getStyle(req, res);
      break;
    case '/script.js':
      getScript(req, res);
      break;
  }
}).listen(8000);

function getStyle(req, res) {
  setTimeout(() => {
    res.end('body {background: pink}');
  }, 3000);
}

function getScript(req, res) {
  res.end('alert(\'Script executed\')');
}

function getHTML(req, res) {
  res.end(`
    <html>
      <head>
        <link rel="stylesheet" href="style.css">
        <script src="script.js"></script>
      </head>
      <body>
        <div>Hello world!</div>
      </body>
    </html>
  `);
}
```

　　可以看到，虽然 JS 文件立刻就加载完成，但却被 CSS 阻塞，直到 CSS 文件加载完成并应用上样式后才执行。这是由于 JS 除了可以操作 DOM 外，还可以操作 CSSOM，如读取某一元素的宽高。在 CSS 被加载并应用上之前，是无法知道某一元素的真实样式的。所以由于这个可能的对 CSSOM 的操作，导致 JS 的执行会被位于其前面的 CSS 阻塞。

![Chrome下的表现](/assets/page-render/test6.gif)

　　`P.S.` 其他浏览器的表现均一致。


### 六、JS 对页面其他资源的影响 ###

　　虽然原则上 JS 会阻塞其后内容的解析，但实际上浏览器基于性能考虑会做些优化，比如预加载。在 JS 阻塞页面解析时，浏览器会启动一个预扫描器来扫描其后的 HTML 内容，发现有引用特定资源（大多浏览器都会预加载外部的 JS、CSS、IMG）时，触发预先下载。虽然 JS 有可能会修改 HTML 的内容从而导致预加载的内容不再需要，造成浪费，但这种情况毕竟是特例，而绝大多数情况下预加载的资源都是有效的，可以加快页面呈现。

　　如下示例中，页面中先后引入一个 JS 文件，有3s的加载延迟。其后引入一张图片。

``` javascript
var http = require('http');

http.createServer(function (req, res) {
  switch (req.url) {
    case '/':
      getHTML(req, res);
      break;
    case '/script.js':
      getScript(req, res);
      break;
  }
}).listen(8000);

function getScript(req, res) {
  setTimeout(() => {
    res.end('console.log(\'Hello world!\')');
  }, 3000);
}

function getHTML(req, res) {
  res.end(`
    <!DOCTYPE html>
    <html>
      <body>
        <div>Hello world!</div>
        <script src="script.js"></script>
        <img src="https://www.baidu.com/img/bd_logo1.png" />
      </body>
    </html>
  `);
}
```

　　可以看到，在 JS 文件加载完之前，图片就开始加载并完成。只不过由于 JS 会阻塞其后 DOM 的解析，导致其前面的内容`Hello world!`可以立刻渲染出来，而其后的图片需要等到 JS 加载并执行完才呈现（虽然已提前下载完了）。

![浏览器下的表现](/assets/page-render/test7.gif)

　　`P.S.` 其他浏览器的表现均一致（现代浏览器都有预扫描机制）。
