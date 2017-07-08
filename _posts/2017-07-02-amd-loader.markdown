---
layout: post
title:  实现最基本功能的 AMD 模块加载器
date:   2017-07-02 00:00:00 +0800
categories: [JS, AMD, loader]
permalink: blogs/js/loader
tags: loader
keywords: JS, AMD, loader
---

　　随着前端项目的越来越复杂，如何管理前端代码成为不得不面对的一个问题。模块化开发成为越来越被接受的一种方式。模块化开发中有两种主要的模块加载规范：AMD 和 CommonJS，分别适用于浏览器端和服务器端。RequireJS 是一个被广泛使用的实现 AMD 规范的模块加载器。本文将介绍如何实现一个基本功能的模块加载器。

　　AMD 规范中定义了 define 和 require 两个全局函数。其中 define 函数用于定义一个模块，接受 id、dependencies、factory 三个参数，参数含义如下：

+ id 表示模块名。字符串类型，可选，不推荐手动设置。因为在 AMD 规范中，模块名默认用模块路径标识，如果手动设置后，反而不利于迁移、更名等，丧失了灵活性。但模块名在某些场景下会被设置，如为提高性能，一般会在上线前将多个模块打包在一个文件中，这种场景下必须要设置模块名，否则无法知道当前文件中都定义了哪些模块。但这种场景模块名一般是通过打包工具自动设置，编码阶段还是不要手动设置了。
+ dependencies 表示当前模块依赖的其它模块。数组类型，可选，如果不设置，表示当前模块不依赖其它模块；如果设置，则需要等到依赖的模块都加载完成后，当前模块的定义才能执行并就绪（当然，某些场景下也不一定需要等到依赖的模块就绪，当前模块才能执行。如依赖的模块不是在当前模块初始化时用到，而是在调用某些功能时才用到。对这种场景做处理的话，可以解决某些循环依赖的问题。此类高级话题，暂不讨论）。
+ factory 表示模块的定义函数（也可以是一个对象）。函数或对象，必须。一般会是一个函数，且通常会有一个返回值，代表当前模块的值，该函数只会在初始化时执行一次。但也可以是一个对象，直接作为当前模块的值。

　　所以 define 函数的调用方式会有如下四种形式：

``` javascript
define(factory);
define(id, factory);
define(dependencies, factory);
define(id, dependencies, factory);
```

　　require 函数消费 define 函数定义的模块。它依赖一些模块，待模块加载完成后，执行特定的逻辑。require 函数接受 dependencies、callback 两个参数，参数含义如下：

+ dependencies 表示依赖的模块。数组类型，必须。和 define 中的 dependencies 类似，不重复介绍了。
+ callback 表示依赖模块加载完后执行的函数，可以看成是程序的入口。

　　从 define 和 require 的定义可以看出，抛开 define 中不推荐手动传递的 id 参数，其余两个参数都是一样的，只不过 define 中的回调函数（或对象，也可转化成函数并返回该对象）用于定义当前模块，require 中的回调函数用于消费模块，并作为程序入口，启动程序。为了方便处理，也可以将调用 require 函数看成是在定义一个特殊的模块，只不过此模块不会被其它模块调用（实现时，会给它一个特殊的不会被引用到的 id）。这样就可以将 define 函数和 require 函数统一处理。定义分别如下：

``` javascript
function define(id, deps, factory) {
  // 由于 id 和 deps 参数都是可选的，所以此处需要处理一下参数
  if (!factory) {
    if (!deps) {
      // 如 define(function() {xxxx})
      factory = id;
      id = null;
      deps = [];
    } else {
      factory = deps;

      if (id instanceof Array) {
        // 如 define([deps], function(deps) {xxxx})
        deps = id;
        id = null;
      } else {
        // 如 define(id, function() {xxxx})
        deps = [];
      }
    }
  }

  // 可以定义一个对象作为模块的返回值。为了统一处理，此处将此场景转换成定义模块函数内返回对象
  if (typeof factory === 'object') {
    value = factory;
    factory = function () {
      return value;
    };
  }
 
  // 获取当前模块
  var name = id;
  if (!name) {
    name = getCurrentScript().getAttribute('data-module');
  }

  actualRequire(name, deps, factory);
}
```

``` javascript
function require(deps, callback) {
  // 当我们调用 require(['xxx'], function () {xxx}) 时，本意是引用'xxx'模块，是模块的消费者，并非要定义模块，
  // 和 define(['xxxx'], function () {xxxx}) 是有区别的，后者才是定义模块。但为了提取共性，处理方便，
  // 此处将 require 函数调用，也看成是定义模块，只不过此处的“模块”不会被外部引用到，所以设置了私有的名字。
  var name = '__requireModel__' + requireModuleIndex++;
  initModule({
    name: name,
    parents: null
  });

  actualRequire(name, deps, callback);
}
```

　　define 和 require 经过抽象处理后，最终都统一调用 actualRequire 函数，即加载依赖模块，并等到依赖模块就绪后，执行相应的回调函数。

``` javascript
function actualRequire(name, deps, factory) {
  // 更新模块状态
  updateModule(name, {
    status: 'loaded',
    deps: deps,
    factory: factory
  });

  // 当前模块依赖其他模块，需要一一加载它们，并等到依赖的其他模块都就绪后，当前模块才能就绪
  if (deps.length) {
    for (var i = 0, len = deps.length; i < len; i++) {
      var depName = deps[i];
      if (!modules[depName]) {
        // 还未有其他模块引用过此依赖模块，此场景可以直接加载此依赖模块
        initModule({
          name: depName,
          parents: [name]
        });
        createScript(depName);
      } else {
        // 此依赖模块已被其他模块依赖并加载（可能当前已就绪，也可能当前正在加载中），此场景需更新模块间的父子关系
        modules[depName].parents.push(name);
      }
    }
  }

  // 当前模块的依赖模块都开始加载后，需要检查其是否就绪。一般情况下，由于加载依赖模块需要时间，
  // 当前模块此时是不会就绪的，但以下两种情况下其会就绪：
  // 一是当前模块无依赖；
  // 二是其引用的所有依赖之前都被其它模块引用并加载过，且都已就绪
  checkModuleReady(name);
}
```

　　正如 C、JAVA 等语言中都会有一个 main 入口函数一样，模块加载器的常规使用中也会有一个入口，即 require 函数（这里特意提了“常规”两字，因为不排除有奇葩用法，即在最外层调用多次 require 函数。这里不讨论这种非主流用法）。形如如下的方式：

![Dependence Tree](/assets/loader/dep_tree.png)

　　通过上图，可以发现如下几点：

+ 模块之间逐层依赖，形成一个树形结构。当前模块需要等到其所依赖的所有模块都加载完就绪后，才能准备就绪。
+ 入口即 require 函数，需要等到所有的模块都就绪后，才能执行其回调函数，而不仅仅是等到其直接依赖的模块就绪。
+ 依赖树的最底层即叶子节点模块由于不依赖其它模块，所以其加载完就可以直接就绪，而其它非叶子节点模块，需要依赖其子模块的就绪。
+ 一个模块可以依赖多个子模块，一个子模块也可以被多个父模块依赖，所以模块间是多对多的关系。
+ 模块间的依赖加载，很像是递归调用，可以简化为处理常见的递归问题的方式来处理。

　　如下的 checkModuleReady 函数即为递归调用判断模块是否就绪。当某模块就绪后，需要依次通知所有的父模块，去检查各自是否都已就绪。只有当所有的模块都已就绪后，才会调用 require 的回调函数，启动程序。

``` javascript
function checkModuleReady(name) {
  var deps = modules[name].deps;

  for (var i = 0, len = deps.length; i < len; i++) {
    var dep = modules[deps[i]];
    // 如果有依赖的模块没有就绪，则当前模块肯定不会就绪
    if (dep.status !== 'ready') {
      return;
    }
  }

  // 执行到此处说明依赖的模块都已经就绪，则当前模块也可以就绪了
  setModuleReady(name);
}

function setModuleReady(name) {
  var mod = modules[name];
  var deps = mod.deps;
  var depValues = [];

  for (var i = 0, len = deps.length; i < len; i++) {
    depValues.push(modules[deps[i]].value);
  }

  // 依赖的模块都已就绪，则当前模块可以就绪了（执行当前模块的定义函数，得到当前模块的返回值。
  // 执行模块函数时，需要将依赖的模块作为实参传入）
  updateModule(name, {
    status: 'ready',
    value: mod.factory.apply(null, depValues)
  });

  // 当前模块就绪后，需要依次检查当前模块的父模块（即依赖当前模块的模块）是否就绪
  // 可以将模块依赖看成是一个树形结构，只有当处于叶子节点的模块就绪后，其父节点才能就绪，所以是一个自下而上的过程
  var parents = mod.parents;
  if (parents) {
    for (var i = 0, len = parents.length; i < len; i++) {
      checkModuleReady(parents[i]);
    }
  }
}
```

　　至此，一个最基本功能的模块加载器就可以实现出来了。当然，像 RequireJS 等加载器要复杂得多得多，包括一些配置功能（baseUrl、paths、packages、map、config、shim等），插件机制（将css、html等资源当成模块加载），支持 CommonJS 方式，异常处理等等功能。有机会慢慢实现。

　　代码：[loader](https://github.com/bruce-xu/loader)