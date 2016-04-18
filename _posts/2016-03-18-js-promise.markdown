---
layout: post
title:  JS Promise的实现原理
date:   2016-03-18 21:15:10 +0800
categories: [JS, Promise]
permalink: blogs/js/promise
tags: Promise
keywords: JS,Promise,Promise/A+
---
　　在前端开发过程中，会经常使用到 Promise 模式，可以使异步代码看起来如同步般清新易读，从而从回调地狱中解脱出来。ES6中 已原生支持 Promise，但在未支持的浏览器中还需要通过 polyfill 模拟实现。下面介绍一下自己的实现过程，此实现可通过 [Promise/A+测试集][promise-tests] 的所有测试。

　　Promise 是一个关联了执行任务的承诺，当你的任务完成时，会根据任务的成功与否，执行相应的操作。所以创建 promise 对象时，构造函数中需要传递一个函数类型的参数（Chrome 的实现中，参数名叫`resolver`，我觉得叫`task`或`worker`也许会直观一些。但此处采用它的命名，谁叫我是 Chrome 粉呢），来作为与此 promise 对象关联的任务。因此，现在 Promise 构造函数定义如下：

{% highlight js %}
function Promise(resolver) {}
{% endhighlight %}

　　Promise 对象有三种状态：`pending`、`fullfilled` 和 `rejected`，分别代表了 promise 对象处于等待、执行成功和执行失败状态。创建 promise 对象后处于`pending`状态，`pending`状态可以转化为`fullfilled`或`rejected`状态，但不能逆向转化，且转化过程只能有一次，即`resolve`或`reject`后不能再`resolve`或`reject`。因此需要在 promise 对象中持有状态的引用，通过添加一个名为`_state`（为了说明是内部属性，用户不要直接使用，属性名前加了下划线，后面同理）的属性实现。现在 Promise 构造函数定义如下：

{% highlight js %}
function Promise(resolver) {
    this._status = 'pending';
}
{% endhighlight %}

　　任务（`resolver`）内封装了需要执行的异步操作（当然，也可以是同步操作）。同时`resolver`调用时会被传递两个参数：`resolve`和`reject`函数，来自于 Promise 内部的封装，分别代表任务执行成功或者失败时需要执行的操作。任务成功与否由调用者控制，且需要在成功或失败时调用`resolve`或`reject`函数，以此来标识当前 promise 对象的完成，并会触发后续 promise 的执行。

　　在调用Promise构造函数时，`resolver`会被立即调用。因此，现在Promise构造函数如下：

{% highlight js %}
function Promise(resolver) {
    this._status = 'pending';

    resolver(resolve, reject);
    ...
}
{% endhighlight %}

　　Promise 代表着一个承诺。作为承诺，总需要有一个结果，无论成功与否。如果成功，我们会获得需要的结果；当然也有可能会失败。因此我们需要在这个承诺在未来某个时刻有结果时，分别针对结果的成功或失败做相应的处理。因此 Promise 中提供了`then`方法来完成这个任务。`then`方法接收两个参数：`onResolve`和`onReject`，分别代表当前 promise 对象在成功或失败时，接下来需要做的操作。现实生活中，人们总系喜欢给出各种许诺，同样在代码的世界里，我们也经常会有一连串前后依赖的 promise 需要执行，如下面的调用方式：`promise.then().then()...`。因此为了方便链式调用，`then`方法的实现中，都会返回一个新的 promise 对象，就像 jQuery 的方法中一般都会将自己（this）返回一样（不同的是，jQuery中返回的是自身，但在 Promise 中，返回的是一个新的 promise 对象。如果此处也返回自身的话，则串行操作就变成并行操作了，显然不符合我们的目标）。因此，`then`方法的定义如下：

{% highlight javascript %}
Promise.prototype.then = function(onResolve, onReject) {
    var promise = new Promise(function() {});
    ...
    return promise;
}
{% endhighlight %}

　　此处`then`方法内创建的 promise 对象和暴露给用户直接调用的 Promise 构造函数所创建的 promise 对象有些不同。用户调用 Promise 构造函数时需要传递`resolver`参数代表与此 promise 对象关联的任务，且任务会立即执行。在未来某个时刻，用户根据任务执行的结果来判断任务是成功还是失败，并且需要调用`resolver`中被传入的参数`resolve`或`reject`来结束此 promise，并由此触发下一个 promise（即当前 promise 对象调用`then`方法所创建的 promise 对象）所关联的任务的执行。由此可知以下两点：首先`then`方法中创建的 promise 关联的任务不能在 promise 对象创建时立即执行，所以先传入一个空函数以符合 Promise 构造函数调用格式；其次前一个 promise 对象需要能够知道下一个 promise 对象是谁，其关联的任务是什么，这样才能在自己完成后调用下一个 promise 的任务。因此前一个 promise 需要持有下一个 promise 以及其任务的引用。由于 promise 的执行可能会成功也可能会失败，因此后一个 promise 一般会提供成功或失败后需要执行的任务供前一个 promise 调用。因此前一个 promise 持有下一个 promise 的任务引用时需要区分这一点。promise 的调用不一定都如`promise.then().then()...`这样的串行方式，也可以有如下的并行方式：

{% highlight javascript %}
    var promise = new Promise(xxx);
    promise.then();
    promise.then();
    ...
{% endhighlight %}

　　此时当前一个 promise 对象完成后，会同时调用两个`then`方法中创建的 promise 关联的任务。因此，前一个 promise 对象可能需要持有多个 promise 对象以及它们关联的成功和失败任务的引用。因此需要给 promise 对象添加属性用于这些数据的记录。可以有不同的方式实现，如可以添加一个对象数组属性，数组中的每一项是一个对象，里面有下一个 promise 以及成功、失败回调的引用。即如下：

{% highlight javascript %}
    [
        {
            promise: promise1,
            doneCallback: doneCallback1,
            failCallback: failCallback1
        },
        {
            promise: promise2,
            doneCallback: doneCallback2,
            failCallback: failCallback2
        },
        ...
    ]
{% endhighlight %}

　　当然也可以有其它的方式实现。此处我采用了闭包的方式实现：在 promise 对象中增加分别代表成功回调和失败回调的两个数组，数组中的每一项是通过内部封装的闭包函数调用的结果，也是一个函数。只不过这个函数可以访问到内部调用闭包时传递的 promise 对象，因此通过这种方式也可以访问到我们需要的下一个 promise 以及其关联的成功、失败回调的引用。所以现在有两处改动。首先需要在 Promise 构造函数中增加两个属性。现在 Promise 构造函数的定义如下：

{% highlight js %}
function Promise(resolver) {
    this._status = 'pending';

    this._doneCallbacks = [];
    this._failCallbacks = [];

    resolver(resolve, reject);
    ...
}
{% endhighlight %}

　　其次，需要在`then`方法中增加闭包调用以及为前一个 promise 对象保存引用。现在`then`的定义如下：

{% highlight javascript %}
Promise.prototype.then = function(onResolve, onReject) {
    var promise = new Promise(function() {});

    this._doneCallbacks.push(makeCallback(promise, onResolve, 'resolve'));
    this._failCallbacks.push(makeCallback(promise, onReject, 'reject'));

    return promise;
}
{% endhighlight %}

　　`then`方法中调用的`makeCallback`即上面说到的闭包函数。调用时会把 promise 对象以及相应的回调传递进去，且会返回一个新的函数，前一个 promise 对象持有返回函数的引用，这样在调用返回函数时，在函数内部就可以访问到 promise 对象以及回调函数了。由于成功回调`onResolve`和失败回调`onReject`都通过此闭包封装，所以在闭包中增加了第三个参数`action`，以区分是哪种回调。现在`makeCallback`的定义如下：

{% highlight js %}
function makeCallback(promise, callback, action) {
    return function promiseCallback(value) {
        ...
    };
}
{% endhighlight %}

　　前面说过，调用构造函数创建 promise 对象时需要传递作为任务的函数`resolver`，`resolver`会被立即调用，并被传递参数`resolve`和`reject`函数，用于结束当前 promise 并触发接下来的 promise 的调用。下面将介绍`resolve`和`reject`函数的实现。

　　我们使用 promise，是期望在未来的某个时刻能获得一个结果，并且可用于接下来的 promise 调用。所以`resolve`函数需要有一个参数来接收结果（同样，promise 执行失败后，我们也希望在后续 promise 中获得此失败信息，做相应处理。所以`reject`函数也需要有一个参数来接收错误）。前面说过 promise 对象的状态只能由`pending`状态转换为`fullfilled`或`rejected`状态，且只能转换一次。所以`resolve`或`reject`时，需要判断一下状态。所以，现在`resolve`和`reject`函数的定义如下：

{% highlight js %}
    function resolve(promise, data) {
        if (promise._status !== 'pending') {
            return;
        }

        promise._status = 'fullfilled';
        promise._value = data;

        run(promise);
    }
{% endhighlight %}

{% highlight js %}
    function reject(promise, reason) {
        if (promise._status !== 'pending') {
            return;
        }

        promise._status = 'rejected';
        promise._value = reason;

        run(promise);
    }
{% endhighlight %}

　　`resolve`和`reject`函数也可以定义在 Promise 构造函数的 prototype 上，这样可直接通过`promise.resolve(data)`或`promise.reject(reason)`调用，不用传递第一个参数`promise`。但由于此函数是内部调用，为了不暴露不必要的接口给用户，所以定义为内部函数。由于执行时需要知道是 resolve 或 reject 哪一个 promise 对象，所以需要多一个名为`promise`参数。`resolve`和`reject`函数中首先判断了当前 promise 的状态，如果不是`pending`（即已经被 resolve 或 reject 过了，不再重复执行），则直接返回。然后赋予 promise 新的状态，并保存成功或失败的值。最后调用`run`函数。`run`函数用于触发接下来的 promise 的执行。`run`函数中需要注意的一点是，需要异步执行相关的回调函数。`run`函数的定义如下：

{% highlight js %}
    function run(promise) {
        // `then`方法中也会调用，所以此处仍需做一次判断
        if (promise._status === 'pending') {
            return;
        }

        var value = promise._value;
        var callbacks = promise._status === 'fullfilled'
            ? promise._doneCallbacks
            : promise._failCallbacks;

        // Promise需要异步操作
        setTimeout(function () {
            for (var i = 0, len = callbacks.length; i < len; i++) {
                callbacks[i](value);
            }
        });

        // 每个promise只能被执行一次。虽然`_doneCallbacks`和`_failCallbacks`用户不应该直接访问，
        // 但还是可以访问到，保险起见，做清空处理。
        promise._doneCallbacks = [];
        promise._failCallbacks = [];
    }
{% endhighlight %}

　　`run`函数中调用的 callback，就是前面闭包函数`makeCallback`返回的函数。`makeCallback`函数是整个代码中较复杂的部分。其实现过程基本是按照 [Promises/A+规范（中文）]（英文参见 [Promises/A+规范（英文）]）中的`[Promise 解决过程]`部分来完成的。可参照规范部分，此处就不具体介绍了。

{% highlight js %}
    function makeCallback(promise, callback, action) {
        return function promiseCallback(value) {
            // 如果传递了callback，则使用前一个promise传递过来的值作为参数调用callback，
            // 并根据callback的调用结果来处理当前promise
            if (typeof callback === 'function') {
                var x;
                try {
                    x = callback(value);
                }
                catch (e) {
                    // 如果调用callback时抛出异常，则直接用此异常对象reject当前promise
                    reject(promise, e);
                }

                // 如果callback的返回值是当前promise，为避免造成死循环，需要抛出异常
                // 根据Promise+规范，此处应抛出TypeError异常
                if (x === promise) {
                    var reason = new TypeError('TypeError: The return value could not be same with the promise');
                    reject(promise, reason);
                }
                // 如果返回值是一个Promise对象，则当返回的Promise对象被resolve/reject后，再resolve/reject当前Promise
                else if (x instanceof Promise) {
                    x.then(
                        function (data) {
                            resolve(promise, data);
                        },
                        function (reason) {
                            reject(promise, reason);
                        }
                    );
                }
                else {
                    var then;
                    (function resolveThenable(x) {
                        // 如果返回的是一个Thenable对象（此处逻辑有点坑，参照Promise+的规范实现）
                        if (x && (typeof x === 'object'|| typeof x === 'function')) {
                            try {
                                then = x.then;
                            }
                            catch (e) {
                                reject(promise, e);
                                return;
                            }

                            if (typeof then === 'function') {
                                // 调用Thenable对象的`then`方法时，传递进去的`resolvePromise`和`rejectPromise`方法（及下面的两个匿名方法）
                                // 可能会被重复调用。但Promise+规范规定这两个方法有且只能有其中的一个被调用一次，多次调用将被忽略。
                                // 此处通过`invoked`来处理重复调用
                                var invoked = false;
                                try {
                                    then.call(
                                        x,
                                        function (y) {
                                            if (invoked) {
                                                return;
                                            }
                                            invoked = true;

                                            // 避免死循环
                                            if (y === x) {
                                                throw new TypeError('TypeError: The return value could not be same with the previous thenable object');
                                            }

                                            // y仍有可能是thenable对象，递归调用
                                            resolveThenable(y);
                                        },
                                        function (e) {
                                            if (invoked) {
                                                return;
                                            }
                                            invoked = true;

                                            reject(promise, e);
                                        }
                                    );
                                }
                                catch (e) {
                                    // 如果`resolvePromise`和`rejectPromise`方法被调用后，再抛出异常，则忽略异常
                                    // 否则用异常对象reject此Promise对象
                                    if (!invoked) {
                                        reject(promise, e);
                                    }
                                }
                            }
                            else {
                                resolve(promise, x);
                            }
                        }
                        else {
                            resolve(promise, x);
                        }
                    }(x));
                }
            }
            // 如果未传递callback，直接用前一个promise传递过来的值resolve/reject当前Promise对象
            else {
                action === 'resolve'
                    ? resolve(promise, value)
                    : reject(promise, value);
            }
        };
    }
{% endhighlight %}

　　至此，Promise 的实现过程大致就介绍完了，当然还有一些细节，如 Promise 中一般会提供`done`和`fail`方法（可能是其它命名，不要在意这些细节），用于在不需要考虑成功或失败处理时调用，其实就是`then`方法的简略形式；还有一般还会提供 Promise 构造函数上的静态方法`resolve`和`reject`用于直接返回一个被 resolved 或 rejected 的 promise 对象；另外，还会提供`race`和`all`静态方法，用于处理当一组 promise 中任意一个完成和全部都完成情况时的情况。具体代码可参考 [我的Promise实现]。

　　之前比较懒，第一次开始写 blog。虽然花了不少时间，但依然觉得写得和狗屎一样烂，再接再厉吧。

[promise-tests]: https://github.com/promises-aplus/promises-tests
[Promises/A+规范（中文）]: http://www.ituring.com.cn/article/66566
[Promises/A+规范（英文）]: https://promisesaplus.com/
[我的Promise实现]: https://github.com/bruce-xu/Promise
