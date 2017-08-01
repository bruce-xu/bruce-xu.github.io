---
layout: post
title:  JS 异步操作处理演化
date:   2017-07-30 00:00:00 +0800
categories: [JS, Async, Evolve]
permalink: blogs/js/async-evolve
tags: async
keywords: JS, Async, Evolve
---

　　前端开发中不可避免的会遇到异步操作，如 ajax 请求、定时器、事件处理等。处理异步操作问题时，一般会注册回调函数，待特定时机，回调函数会被系统自动调用。假设有这样的场景：需要进行多个异步操作，且各个操作间前后相互依赖。这种问题就比较复杂了，逐渐演化出了多种解决方案，从最古老最常见的异步回调嵌套，到 ES6 中的 Promise 和 Generator，再到 ES7 中的 async 函数，本文将一一简单介绍。

#### 异步回调嵌套 ####

　　异步回调嵌套是最常见的多异步操作的处理方式，虽书写时简单，但代码却难以阅读、维护。如如下示例中，三个异步操作相互依赖：
 
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
  // xxx
  asyncTask(function() {
    // xxx
    asyncTask();
  });
});

// 输出如下内容（由于受 JS 是单线程的语言特性影响，定时器操作每次执行时或多或少会有误差，
// 具体误差大小，也与当前的代码结构有关。所以需要精确时间操作时，需要考虑到此影响）
// Waited: 1001ms
// Waited: 1005ms
// Waited: 1001ms
```

　　示例中异步回调很简单，还感受不到回调嵌套的问题，但实际项目中，一般回调中都会有很多业务逻辑，导致嵌套多层后，代码完全不具有可读性。（P.S. 上述代码输出时，并没有按设置的 1000ms 准时输出，而是会有一些误差。这是由于，操作系统内同时运行着成百上千的进程和线程，共同分享着 CPU 时间，轮流运行。当设置的时间点到达时，很难出现轮流到 JS 引擎正在运行的情况，所以出现可见的误差是常态。虽然操作系统内核都会提供精度更高的定时器，但出于安全性考虑，JS 代码无法使用。所以，当出现有多个定时器循环的场景，需要考虑单个定时器误差的累积造成的更大的误差。）

　　同时，异步回调还存在另一个问题：主流程代码中无法捕获回调中抛出的异常。这是因为主流程的 try..catch.. 执行时，其内的异步回调还未执行，但当回调开始执行时， try..catch.. 语句块早已执行完，已脱离了其执行上下文。如如下例代码中，永远不会输出 `Catch error`。

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

　　异常处理只能放在每个回调函数内处理，可能会造成大量的冗余代码。虽然 window.onerror 事件处理上可以捕获回调函数内抛出的异常，但这货不应该被用来做这事。

#### Promise ####

　　ES6 中引入的 Promise 专门用于处理异步操作。Promise 所做的，其实就是把异步处理对象和处理规则进行规范化，并提供了统一的接口。这样不同的人遵守 Promise 规范写出的代码可以很好的衔接，便于维护。简单说就是提供了封装异步操作的语法糖。上述例子采用 Promise 模式改造如下：

``` javascript
var last = new Date().getTime();

function asyncTask() {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      var now = new Date().getTime();
      console.log('Wait: ' + (now - last));
      last = now;

      resolve();
    }, 1000);
  });
}

function executeTasks() {
  asyncTask()
    .then(asyncTask)
    .then(asyncTask)
}

executeTasks();


```

　　可以看到，当多个异步操作嵌套时，通过 Promise 封装后，调用起来会非常方便，且比回调函数看起来直观很多，`then` 方法也更有语义，阅读上述调用代码，可以很容易的知道，表达的是先调用一个异步任务，然后再调用另一个异步任务，接着再调用一个异步任务（Promise 也可以封装同步操作，将其转化为异步操作）。

　　Promise 也提供了方便的异常处理，可以在每个 `then` 方法内捕获当前异步操作的异常，如果不需要关注特定任务的异常处理的话，可以在最后一次性捕获异常并统一处理（Promise 链中有未捕获的异常的话，会向后传递，直到被最后的 `catch` 方法捕获）。如下面的例子中，第二个异步操作有主动捕获异常，而第三个没有主动捕获，如果其中有抛出异常的话，会被最后的 `catch` 方法捕获。

``` javascript
asyncTask()
  .then(asyncTask, function (e) {})
  .then(asyncTask)
  .catch(function (e) {})
```

　　虽然大部分最新的浏览器都已原生支持 Promise，但 PC 上的 IE 依然不支持，所以在项目中想使用 Promise 的话，还是需要引入 Promise 的 polyfill。

#### Generator ####

　　Promise 虽然比使用异步回调嵌套更直观且更有语义，但多个操作写在一条语句中，还是不够直观，当操作一多时，不便阅读。就像是一口气说了几件事，还不带标点符号。更直观的方式是一条语句描述一件事，转化为代码即是：

``` javascript
asyncTask1();
asyncTask2();
asyncTask3();
```

　　如果上述函数中分别封装了三个异步操作的话，直接这样调用肯定不行，三个异步操作会同时开始，而不是相互依赖，前一个完成后再调用后一个。可以通过 ES6 的 Generator 来完成这样的需求。Generator 本意是生成器，调用生成器函数后会返回它的迭代器对象。手动调用迭代器对象的 next 方法后，会执行生成器函数的代码，并在后续第一个 yield 表达式的位置停止，直到接着调用 next 方法，才开始继续执行生成器函数的下一个 yield 之前的代码。通过不停的调用 next 方法，渐进式的执行完生成器函数内的所有代码。生成器函数的这个特性，正好满足异步操作的依次调用的需求（虽然它的本意不是专门用于解决此问题）。通过 Generator 来改造上述的回调嵌套

#### async/await ####
