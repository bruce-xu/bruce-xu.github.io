---
layout: post
title:  Hybrid App 开发中遇到的一些问题
date:   2017-07-12 00:00:00 +0800
categories: [Hybrid, JS, Tips]
permalink: blogs/hybrid/tips
tags: hybrid
keywords: Hybrid,JS,Tips
---

　　最近开发 Hybrid App 的过程中，遇到一些细节问题，此处记录下来，方便以后查阅。

#### 1、iOS 下 webview 中，局部滚动很卡 ####

　　当页面内容超过窗口区域时，可滚动展示页面内容，滚动时也很顺畅，此为全局滚动。当页面内部，如某个 div 的内容超过其大小时，如有设置 CSS `overflow: auto（或 scroll）`，此 div 的内容也应该可以滚动，PC 上浏览器即如此，此为局部滚动。但在移动端，早期浏览器是不支持局部滚动的，所以出现了 iScroll 等解决方案，但同时也引入了性能等问题。好在 iOS 5.0、Android 4.0 以后系统原生支持了局部滚动。Android 下直接正常设置 CSS `overflow: auto（或 scroll）`即可，但 iOS 下滚动起来依旧不流畅，且手指移开屏幕后，滚动立刻停止，没有全局滚动时的惯性滚动效果。iOS 上还需要增加一个私有的 CSS 属性，以达到流畅滚动。所以，想让局部滚动流畅，需给滚动元素上添加如下的 CSS：

``` css
overflow: auto;
-webkit-overflow-scrolling: touch; /* iOS 需要 */
```

#### 2、iOS 下 webview 中，滚动时 JS 不执行 ####

　　由于苹果的限制，iOS 上的第三方应用（包括 Chrome 等第三方浏览器）内部有加载网页需求时，只能使用与 Safari 相同的内核。在 iOS 8 以前，苹果提供了名叫 UIWebView 的网络组件给第三方应用使用，iOS 8 开始，提供了新的叫 WKWebView 的网络组件。UIWebView 中，由于性能问题，页面滚动时限制了 JS 的执行，滚动结束后才会执行。这就导致了 scroll 事件只会在滚动结束后执行一次，包括 setTimeout、setInterval 等操作在滚动时都不会执行。这是底层限制，无法绕过，所以最好不要在 scroll 事件中做操作。如果确实有此类需求的话，某些情况下可以在 touchmove 中处理，但手指离开屏幕后就不再触发 touchmove 事件，而正常滚动时，由于有惯性滚动，手指离开后，还会滚动一段距离，逐渐停止。手指离开后的这一段滚动，并不能响应任何操作。所以用 touchmove 来解决 scroll 不触发的问题，并不完全可行。最可行的方案是在应用中使用 WKWebView 取代 UIWebView，不仅可以支持滚动时执行 JS 代码，而且还有其它诸多好处，如使用了和 Safari 相同的 JS 引擎 Nitro（此处吐槽一下苹果，iOS 4.3 的 Safari 中就使用了新的 JS 引擎 Nitro，但 UIWebView 中一直使用的还是性能差的 JavascriptCore 引擎，致使 iOS 上早期的第三方浏览器的性能较 Safari 有很大的差距。此种情况随着 iOS 8 中开放的 WKWebView 而改善），带来了更好的性能等。当然，使用 WKWebView，意味着不再兼容 iOS 7 及之前的系统，除非花很大的代价做兼容。不过，是时候可以抛弃 iOS 7 了，毕竟目前占比量已经非常低了。

　　测试下来发现 Android 下滚动时可以实时触发 scroll 事件，JS 也会被执行。网上说 Android 4.1 之前，滚动时 scroll 事件不会实时触发。不过现在 Android 4.0 及之前的系统占有率已经非常低了。

　　顺便提一下，针对 scroll、resize 等会被频繁触发的事件，最好不要在事件处理函数中处理需要大量计算或渲染的操作，否则会引起浏览器卡顿甚至假死。同时，为了性能考虑，可以针对事件处理函数做截流处理，即设置某一时间间隔内只执行一次回调函数。如下代码即为简单的截流处理函数：

``` javascript
function throttle(method, delay) {
  var isThrottling = false;
  return function() {
    var context = this;
    var args = arguments;
    if (!isThrottling) {
      isThrottling = true;
      setTimeout(function () {
        isThrottling = false;
        method.apply(context, args);
      }, delay || 100);
    }
  }
}
```

#### 3、粘性定位 ####

　　经常会有这种需求：页面头部或底部有一块内容固定，不随页面滚动。此需求很好实现，通过 `position: fixed` 定位即可。还有此需求的一个变种：某块内容起初在页面的中部，但随着页面的滚动，到达顶端时，吸附在顶部，不继续滚动。此类需求也很常见，如长列表的表头经常会做成这种效果。此需求在 PC 上实现很简单：待吸附元素初始使用相对布局，同时监听滚动事件，待滚动到顶端时，修改待吸附元素的布局为固定布局。

　　如果是 H5，照搬上述 PC 的实现，大部分情况是可以的。如上一条所述，从 iOS 8 开始，系统提供了 WKWebView 给第三方应用使用，系统自带的 Safari 以及其它第三方浏览器中也都可以支持滚动时实时触发 scroll 事件。Hybrid App 中如果引用了 WKWebView 作为 web 组件，也没问题。Android 4.1 开始也基本支持。但是此问题用监听 scroll 事件的方式做，在移动端或多或少会有性能问题，能避免就避免。

　　解决此问题更好的方案是使用 CSS3 中新增的定位属性 `position: sticky`，专门用于解决此类问题。但测试下来发现，iOS 下支持的很好（网上说 iOS 6 开始支持），但 Android 下，低版本的 webview 不支持，所以需要做兼容处理，方案如下：

``` javascript
// 给待粘性定位的元素添加如下样式：
position: -webkit-sticky;
position: sticky;

// 同时提供特性检测代码，检查是否支持粘性布局：
function isSupportSticky() {
  var prefixList = ['', '-webkit-'];
  var stickyText = '';
  for (var i = 0; i < prefixList.length; i++) {
      stickyText += 'position:' + prefixList[i] + 'sticky;';
  }
  var div = document.createElement('div');
  div.style.cssText = 'display:none;' + stickyText;
  document.body.appendChild(div);
  var isSupport = /sticky/i.test(window.getComputedStyle(div).position);
  document.body.removeChild(div);
  div = null;
  return isSupport;
}

// 针对不支持的场景，注册滚动事件处理
element.addEventListener('scroll', callback);
```

#### 4、输入框元素无法自动获得焦点并唤起软键盘 ####

　　开发中遇到一个需求：在打开一个金额输入页面后，自动触发输入框焦点，并唤起软键盘，方便用户输入（先不评价这样的交互是否合理，有 PK 不了的需求，只能接受了/(ㄒoㄒ)/~~）。这种场景在 PC 浏览器上很好实现，直接 `input.focus()` 即可（PC 上不存在唤起键盘一说，自动触发焦点即可），甚至有新的属性 autofocus 可以做到（但有兼容性问题）。但在移动端浏览器上，无论如何也无法通过代码自动唤起软键盘，只能通过手动点击后才能唤起（或点击其它元素后，在其他元素的点击事件中间接触发输入框的触焦事件，但总归要通过用户的操作才能触发）。估计是觉得自动唤起软键盘会影响用户体验吧，所以才禁止此行为。

　　H5 中如果遇到此需求，直接怼回去吧，手机端浏览器上根本无法实现。Hybrid App 开发的话，如果实在需要此需求，可以借助 Native 来实现，实现方式如下：

```
// iOS 中，通过设置 webview 的如下属性实现：
webview.KeyboardDisplayRequiresUserAction = "NO";

// Android 中要复杂得多，具体实现参见如下：
// https://stackoverflow.com/questions/5662828/android-webview-setting-html-field-focus-using-javascript
```

#### 5、iOS 下 webview 中，自动将一串数字文本转换成可拨号链接 ####

　　IOS 下 webview 中，当显示一段数字时，默认会将数字转换成可拨号链接。如页面中有如下的元素：

``` html
<span>1234567</span>
```

　　则解析后被转换成了如下：

``` html
<span><a href="tel:1234567">1234567</a></span>
```

　　本意只想输出纯文本，结果变成了可点击的链接，点击后触发系统拨号程序。我觉得此处 iOS 完全是优化过度了，如果有想让用户拨号的地方，直接使用 `<a href="tel:1234567">1234567</a>` 就好了，其它情况说明只是想输出文本。但 iOS 却不分三七二十一的将一串看似电话号码的数字文本直接转换成拨号链接（试了下，貌似7位、以及10~17位数字会被转换）。

　　用如下方式可全局禁用自动转换拨号：

``` html
<meta name="format-detection" content="telephone=no">

// 类似的，email、address、date 默认也会被识别转换，如果不需要的话，可以用如下方式关闭
<meta name="format-detection" content="email=no">
<meta name="format-detection" content="address=no">
<meta name="format-detection" content="date=no">

// 也可以写在一起
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"/>
```

#### 6、页面中元素内容可以通过长按屏幕选择 ####

　　默认情况下，移动端页面内容可以通过长按屏幕选择。H5 中还好，可选择也没什么问题，但 Hybrid 中，一般会禁用掉，否则，这交互也太不 Native 了，与 Native 部分的交互不一致。可以通过如下方式禁用：

``` css
body {
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
}
```

#### 7、可点击元素点击时有突兀的背景色 ####

　　PC 端的网页中，链接、按钮等元素被点击时，默认都会被浏览器加上高亮颜色/背景色。移动端也照搬了这种设计，可点击元素被点击时，有高亮的背景色。有时候会觉得默认的点击背景色很突兀，如果需要禁用或重写的话，可以用如下的方式：

``` css
body {
  -webkit-tap-highlight-color: rgba(0,0,0,0);
}
```

#### 8、babel-polyfill 对 Promise 的封装有 bug ####
