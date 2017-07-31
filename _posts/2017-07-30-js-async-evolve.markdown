---
layout: post
title:  JS 异步操作处理演化
date:   2017-07-30 00:00:00 +0800
categories: [JS, Async, Evolve]
permalink: blogs/js/async-evolve
tags: async
keywords: JS, Async, Evolve
---

　　前端开发中不可避免的会遇到异步操作，如 ajax 请求、定时器、事件处理等。处理异步操作问题的方式有多种，从最古老也是最初常见的异步回调，到 ES6 中的 Promise 和 Generator，再到 ES7 中的 async 函数，本文将一一简单介绍。

#### 异步回调 ####

　　异步回调是最常用的异步操作的处理方式，简单方便。但如果回调函数内还需要进行其它异步操作时，就会出现异步回调的嵌套，一些复杂情况下会出现多层嵌套，使代码难以阅读。如如下示例中，有三个异步操作，假设每个异步操作都依赖前一个的结果，则需要层层嵌套调用才行。如下示例所示：
 
``` javascript
var last = new Date().getTime();

function asyncTask(callback) {
  setTimeout(function() {
    var current = new Date().getTime();
    console.log('Waited: ' + (current - last) + 'ms');
    last = current;
    callback && callback();
  }, 1000);
}

asyncTask(function() {
  asyncTask(function() {
    asyncTask();
  });
});

// 输出如下内容（由于受 JS 是单线程的语言特性影响，定时器操作每次执行时或多或少会有误差，
// 具体误差大小，也与当前的代码结构有关。所以需要精确时间操作时，需要考虑到此影响）
// Waited: 1001ms
// Waited: 1005ms
// Waited: 1001ms
```

　　示例中异步回调很简单，但实际项目中，一般都会有很多业务逻辑，导致嵌套多层后，代码完全不具有可读性。同时，异步回调还存在另一个问题：主流程代码中无法捕获回调中抛出的异常。这是因为主流程的 try..catch.. 执行时，其内的异步回调还未执行，但当回调开始执行时， try..catch.. 语句块早已执行完，已脱离了其执行上下文。如下例代码中，永远不会输出 `Catch error`。

``` javascript
function asyncTask() {
  setTimeout(function() {
    throw Error('Throw error');
  }, 1000);
}

try {
  asyncTask();
} catch(e) {
  console.log('Catch error');
}
```

#### Promise ####

#### Generator ####

#### async/await ####