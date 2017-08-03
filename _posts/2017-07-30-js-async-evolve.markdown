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

　　异步回调嵌套是最常见的多异步操作的处理方式，虽书写时简单，但代码却难以阅读和维护。如如下示例中，三个异步操作先后依赖：
 
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

function runTasks() {
  asyncTask(function() {
    // do something
    asyncTask(function() {
      // do something
      asyncTask(function() {
        // do something
      });
    });
  });
}

runTasks();

// 输出如下内容
Waited: 1001ms
Waited: 1005ms
Waited: 1001ms
```

　　示例中异步回调很简单，还感受不到层层回调嵌套带来的问题，但实际项目中，一般回调中都会有很多业务逻辑，导致嵌套多层后，代码完全不具有可读性。

　　P.S. 上述代码输出时，并没有按设置的 1000ms 准时输出，而是会有一些误差。这是由于，操作系统内同时运行着成百上千的进程和线程，共同分享着 CPU 时间片，轮流运行。当设置的时间点到达时，很难出现正好轮流到 JS 引擎线程在运行的情况，待轮流到时，可能已经超过了预设的时间，所以出现可见的误差是常态（并且理论上实际延迟时间应该大于代码设置的时间，测试下来发现 Chrome 和 Firefox 是这样的，但首富家的 IE 和 Edge 会出现小于设置时间的情况）。虽然操作系统内核都会提供精度更高的定时器，但出于安全性考虑，JS 代码无权使用。所以，当出现有多个定时器循环的场景，需要考虑单个定时器误差的累积造成的更大的误差的问题。

　　异步回调嵌套除了导致代码难以维护外，还存在另外一个问题：主流程代码中无法捕获回调中抛出的异常。这是因为主流程的 try..catch.. 执行时，其内的异步回调还未执行，但当后面某一时刻回调开始执行时， try..catch.. 语句块却早已执行完，已脱离了其执行上下文。如如下例代码中，永远不会输出 `Catch error`。

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

　　异常处理只能放在每个回调函数内单独处理，由于可能存在各种分支判断，可能会造成大量的冗余代码。在 window.onerror 的事件处理函数中可以捕获 JavaScript 的运行时错误，其中包括回调函数内抛出的异常。在 onerror 的处理函数中返回 true，可以阻止执行浏览器默认的事件处理操作，即屏蔽掉此异常；返回 false（默认行为），则继续抛出此异常。虽然 window.onerror 中处理异常看似方便，解决了主流程中无法捕获回调函数内异常的问题，但这货不应该被用来做这事，实践中其主要被用于自动收集错误报告等场景。

#### Promise ####

　　ES6 中引入的 Promise 专门用于处理异步操作。Promise 所做的，其实就是把异步处理对象和处理规则进行规范化，并提供了统一的接口。这样不同的人遵守 Promise 规范写出的代码可以很好的衔接，便于维护。简单说就是提供了封装异步操作的语法糖。上述例子采用 Promise 模式改造如下：

``` javascript
var last = new Date().getTime();

function asyncTask() {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      var now = new Date().getTime();
      console.log('Wait: ' + (now - last) + 'ms');
      last = now;

      resolve();
    }, 1000);
  });
}

function runTasks() {
  asyncTask()
    .then(asyncTask)
    .then(asyncTask)
    .then(function () {
      console.log('Done');
    });
}

runTasks();

// 输出如下：
Wait: 1001ms
Wait: 1004ms
Wait: 1002ms
Done
```

　　可以看到，当多个异步操作嵌套时，通过 Promise 封装后，调用起来会非常方便，且比回调函数看起来直观很多，`then` 方法相对来说也更有语义，阅读上述调用代码，可以很容易的知道，表达的是先调用一个异步任务，然后再调用另一个异步任务，接着再调用一个异步任务（Promise 也可以封装同步操作，将其转化为异步操作）。

　　Promise 也提供了方便的异常处理，可以在每个 `then` 方法内捕获前一个异步操作内抛出的异常，如果不需要关注特定任务的异常处理的话，可以在最后一次性捕获异常并统一处理（Promise 链中有未捕获的异常的话，会向后传递，直到被最后的 `catch` 方法捕获）。如下面的例子中，第二个异步操作有主动捕获前一个异步操作中抛出的异常，而第三个没有主动捕获，如果其中有抛出异常的话，会被最后的 `catch` 方法捕获。

``` javascript
asyncTask()
  .then(asyncTask, function (err) {
    // handle previous promise's error
  })
  .then(asyncTask)
  .catch(function (err) {
    // handle all error
  })
```

　　虽然大部分最新的浏览器都已原生支持 Promise，但 PC 上的 IE 依然不支持，所以在项目中想使用 Promise 的话，目前还是需要引入 Promise 的 polyfill。第三方的 Promise 实现有很多，最常用且性能最好的是 bluebird。

#### Generator ####

　　Promise 虽然比使用异步回调嵌套更直观且更有语义，但多个操作写在一条语句中，还是不够直观，当操作一多时，不便阅读。就像是一口气说了几件事情，中间还不带加标点符号的。更直观的方式是一条语句描述一件事，转化为代码即是：

``` javascript
function runTasks() {
  asyncTask1();
  asyncTask2();
  asyncTask3();
}
```

　　如果上述函数中分别封装了三个异步操作的话，直接这样调用肯定不行，三个异步操作会同时开始，而不是相互依赖，前一个完成后再调用后一个。可以通过 ES6 的 Generator 来完成这样的需求。Generator 本意是生成器，调用生成器函数后会返回它的迭代器对象。手动调用迭代器对象的 next 方法后，会执行生成器函数的代码，并在后续第一个 yield 表达式的位置停止，直到接着调用 next 方法，才开始继续执行生成器函数的下一个 yield 之前的代码。通过不停的调用 next 方法，渐进式的执行完生成器函数内的所有代码。生成器函数可以被暂停和唤起的这个特性，正好满足异步操作的依次调用的需求（虽然它的本意不是专门用于解决此问题）。通过 Generator 来改造上述回调嵌套问题的代码如下：

``` javascript
function asyncTask() {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve(parseInt(Math.random() * 10));
    }, 1000);
  });
}

function* runTasks() {
  var v1 = yield asyncTask();
  console.log('v1: ' + v1);
  var v2 = yield asyncTask();
  console.log('v2: ' + v2);
  var v3 = yield asyncTask();
  console.log('v3: ' + v3);
  console.log('Done');
}

function run(generator) {
  var gen = generator();
  function next(data) {
    var ret = gen.next(data);
    if (ret.done) {
      return;
    }
    ret.value.then(function (data) {
      next(data);
    });
  }
  next();
}

run(runTasks);

// 输出如下：
v1: 8
v2: 0
v3: 1
Done
```

　　上面的例子可以看出 Generator 函数的一些特点：

+ 利用 Generator 函数，异步操作可以和同步操作同等看待，后续代码会等到异步操作完成返回结果后再执行。
+ 通过 `function*` 来定义 Generator 函数，通过 yield 关键字来标识 Generator 内的异步操作。
+ 调用 Generator 函数并不会直接执行函数内容，而是返回其迭代器对象，通过不停的调用迭代器对象的 next 方法，来遍历执行 Generator 函数体。
+ 迭代器对象的 next 方法通过返回值向外传递数据。返回值是一个对象，包含 done 和 value 属性（如 {done: false, value: xxx}）。done 为 boolean 类型，表示当前迭代器是否已遍历完，true 代表已遍历完，应停止遍历；value 表示 yield 后面的表达式的返回值。
+ 迭代器对象的 next 方法通过接收参数向 Generator 内传递数据。参数被用于传递给 yield 前面的表达式。

　　用 Generator 函数来封装异步操作，会如同步代码般直接、便于理解。但有一个问题：由于生成器函数内可能会包含多个异步操作调用，每个操作都需要对应手动调用一次迭代器的 next 方法。如果依赖如此手动调用的话，则代码完全不具有灵活及复用性。所以通常会提供一个叫运行器的函数去触发迭代器的自动执行，如上面的 run 函数即可当作简单的运行器。为了能够通过运行器使迭代器自动执行起来，需要对异步操作按统一的规则进行封装。最简单的封装方式是使异步操作函数返回一个 Promise 对象（如上例中的 asyncTask 函数），复杂一点的可以使用 Thunk 函数模式。

　　上面说到主流程中无法捕获异步回调中抛出的异常，Generator 函数在此方面有所改进，稍加处理就可以捕获其调用的回调函数中抛出的异常。方法就是在执行器中将获得到的异常对象通过 Generator 返回的迭代器对象的 throw 方法抛出，这样在 Generator 函数中的 try..catch.. 就可以捕获迭代器对象 throw 的异常了。

``` javascript
function asyncTask(hasErr) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      if (hasErr) {
        reject('Throw error');
      } else {
        resolve(parseInt(Math.random() * 10));
      }
    }, 1000);
  });
}

function* runTasks() {
  try {
    var v1 = yield asyncTask();
    console.log('v1: ' + v1);
    var v2 = yield asyncTask();
    console.log('v2: ' + v2);
    var v3 = yield asyncTask(true);
    console.log('v3: ' + v3);
  } catch (e) {
    console.log('Catch error');
  }
  console.log('Done');
}

function run(generator) {
  var gen = generator();
  function next(data) {
    var ret = gen.next(data);
    if (ret.done) {
      return;
    }
    ret.value.then(function (data) {
      next(data);
    }, function (err) {
      // 迭代器throw的异常可以在生成器函数内被捕获
      gen.throw(err);
    });
  }
  next();
}

run(runTasks);

// 输出如下：
v1: 8
v2: 0
Catch error
Done
```

　　知名的 node.js web 框架 Koa 的早期版本就是使用了 Generator 特性，提供了名叫 co 的库，用于自动执行异步操作，co 其实就对应于上面说的运行器。Koa 2.0 中已改为使用下面将介绍的 async 函数。

#### async 函数 ####

　　虽然利用 Generator 函数处理异步操作比直接使用 Promise 更直观，但还是有些问题，如：

+ 定义 Generator 的方式 `function*` 很难与异步操作容器相联系，标识异步操作中断点的 yield 关键字语义上也不够直观。
+ 调用时较麻烦，需要先执行生成器函数返回其迭代器对象，生成器内定义了多少个 yield 语句，就要调用迭代器对象的 next 方法多少次。虽然可以通过封装运行器函数来自动遍历迭代器，但会带来代码的复杂度。

　　使用 Generator 来处理异步操作嵌套问题，只是利用了其能力的副产品，而 ES7 中的 async 函数才是此问题的终极解决方案。 async 函数可以看作是 Generator 函数的语法糖，它们的使用方式很相似，只需将 `function*` 换成 `async function`，同时将 `yield` 换成 `await` 即可。相比于 Generator 的如上缺点，async 函数具有如下优点：

+ 更具有语义。使用 async 关键字标识的函数，可以很直接的说明这是一个封装了异步操作的函数；await 关键字标识的语句，也可以很容易让人联想到这是一个异步调用，需要等待其完成并返回结果。
+ 具有自执行特性。Generator 函数需要先被调用返回其迭代器，然后依次调用迭代器的 next 方法，才能渐进的执行完所有代码，所以出现了 co 等执行器函数，但调用起来依然较麻烦。async 函数内调用的异步操作，可以被自动执行，只需如调用最普通函数般调用 async 函数即可，真正做到了同步方式书写异步代码。
+ 通用性更强。Generator 为了能自动执行，执行器会限制异步操作函数的返回格式，如只能返回 Promise 对象或具有特定定义规则的函数（如 Thunk 函数）。而 async 函数内的 await 语句，既可以支持异步操作（返回 Promise 对象），也可以支持同步操作（如返回原始类型数值），更具有通用性。
+ 统一的接口。async 函数会统一返回 Promise 对象，有统一的接口，方便不同代码的衔接，便于维护。

　　使用 async 函数改造上述示例的代码如下：

``` javascript
function asyncTask(hasErr) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve(parseInt(Math.random() * 10));
    }, 1000);
  });
}

async function runTasks() {
  var v1 = await asyncTask();
  console.log('v1: ' + v1);
  var v2 = await asyncTask();
  console.log('v2: ' + v2);
  var v3 = await asyncTask();
  console.log('v3: ' + v3);
  var v4 = await 100;
  console.log('v4: ' + v4);
}

var result = runTasks();
console.log(result);
result.then(function () {
  console.log('Done');
});

// 输出如下：
Promise {[[PromiseStatus]]: "pending", [[PromiseValue]]: undefined}
v1: 2
v2: 6
v3: 3
v4: 100
Done
```

　　上面的例子可以看出 async 函数的一些特点：

+ 异步操作（await 关键字标识的语句）可以同步操作同等看待，后续代码会等到异步操作完成返回结果后再执行
+ await 关键字虽然用于标识后面的语句是异步操作，但其后同样也可以跟随同步操作，如上例中的原始类型数值（100）。这样使 async 函数更具有通用性
+ async 函数会返回 Promise 对象，有统一的接口，方便调用，便于集成

　　async 函数的另一个优点是可以直接捕获异步操作中抛出的异常，示例如下：

``` javascript
function asyncTask(hasErr) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      if (hasErr) {
        reject('Throw error');
      } else {
        resolve(parseInt(Math.random() * 10));
      }
    }, 1000);
  });
}

async function runTasks() {
  try {
    var v1 = await asyncTask();
    console.log('v1: ' + v1);
    var v2 = await asyncTask();
    console.log('v2: ' + v2);
    var v3 = await asyncTask(true);
    console.log('v3: ' + v3);
  } catch (e) {
    console.log('Capture error');
  }
}

runTasks();

// 输出如下：
v1: 1
v2: 3
Capture error
```

　　上面分别介绍了处理异步操作的几种方式。其中异步回调函数嵌套不存在兼容性问题，但最不具有可用性；Promise 会存在兼容性问题，可以引入 Promise polyfill 来解决；Generator 以及 async 函数也存在兼容性问题，同时由于在不兼容的浏览器上不支持 `function*` 和 `async/await` 语法，会导致解析时就会报错，无法使用 polyfill 来模拟。所以如果要使用 Generator 或 async 函数，只能使用 babel 等转码器来转码。期待着所有浏览器都支持的时刻早点到来。