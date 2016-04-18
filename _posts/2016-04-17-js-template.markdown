---
layout: post
title:  逐步实现简单的JS模板引擎
date:   2016-04-17 21:15:10 +0800
categories: [JS, Template]
permalink: blogs/js/template
tags: Template
keywords: JS,Template
---

　　前端开发中经常会用到JS模板引擎。当然，项目中一般都会引用第三方开源的模板引擎库。这些库功能较多，实现起来也相当复杂。此文主要介绍一个最基本的JS模板引擎是如何实现的。

　　开发中经常有拼接文本的需求。如从接口中获取到用户名 `Li Lei` 后，将其连同一串欢迎文本 `，欢迎来到这里，祝你早日找到女盆友！` 显示在页面上。最直接的方式是把变量和固定文本拼接成一个新的字符串 `Li Lei，欢迎来到这里，祝你早日找到女盆友！`。当然，对于这种需求，直接拼字符串已经够用了。但这完全不符合今天的主题，所以下面演示如何用模板来实现。

　　最直接的想法是定义一个匹配变量的正则表达式，然后直接把变量名包裹成符合正则表达式的形式，直接放入到整个文本中，最后解析正在表达式，找出匹配的变量名，替换成变量的实际值。例如用＂<% variable %>＂来表示变量，则可用正则＂/<%\s*(\w*?)\s*%>/g＂来匹配变量。实现如下：

{% highlight js %}
var name = 'Li Lei';
var tpl = '<% name %>，欢迎来到这里，祝你早日找到女盆友！';
var html = tpl.replace(/<%\s*(\w*?)\s*%>/, function (match, variable) {
    if (variable === 'name') {
        return name;
    }
});
{% endhighlight %}

　　结果 `html` 的值就为 `Li Lei，欢迎来到这里，祝你早日找到女盆友！`。

　　针对此例，如果是用户是女生，则不适用了。所以模板中需要增加一个变量，同时正则中需要增加 `g` 标识来表示全局搜索，不然的话只会匹配到第一个变量就会停止搜索。如下：

{% highlight js %}
var name = 'Han Meimei';
var gender = '男';
var tpl = '<% name %>，欢迎来到这里，祝你早日找到<% gender %>盆友！';
var html = tpl.replace(/<%\s*(\w*?)\s*%>/g, function (match, variable) {
    if (variable === 'name') {
        return name;
    }
    else if (variable === 'gender') {
        return gender;
    }
});
{% endhighlight %}

　　结果 `html` 的值就为 `Han Meimei，欢迎来到这里，祝你早日找到男盆友！`。

　　如果页面中还有一处需要显示用户的其它信息，如 `年龄、电话` 等，那么上述代码我们还需要写一次，只不过把模板换成其它的文本。为了能够复用代码，我们把这块逻辑封装成一个函数，如起名叫 `render`。这个函数中模板文本和模板中需要替换的变量是变的，替换逻辑是固定的，所以需要把可变部分作为参数传入。考虑到变量个数是不固定的，如果一个个传入，不方便接收，而且不方便匹配，所以将所有变量作为一个对象传入会方便许多。如下：

{% highlight js %}
function render(tpl, data) {
    return tpl.replace(/<%\s*(\w*?)\s*%>/g, function (match, variable) {
        if (data.hasOwnProperty(variable)) {
            return data[variable];
        }
    });
}

var tpl = '<% name %>，欢迎来到这里，祝你早日找到<% gender %>盆友！';
var data = {
    name: 'Han Meimei',
    gender: '男'
};
render(tpl, data);
// output: Han Meimei，欢迎来到这里，祝你早日找到男盆友！

var tpl = '姓名：<% name %>，年龄：<% age %>，电话：<% phone %>';
var data = {
    name: 'Li Lei',
    age: 28,
    phone: '123456789'
};
render(tpl, data);
// output: 姓名：Li Lei，年龄：28，电话：123456789
{% endhighlight %}

　　上述 `render` 函数虽然可以实现变量替换，但是功能太弱了点。经常会有些需求，并不是直接输出变量，而是有些逻辑。如页面中需要根据当前日期输出一段文本。如果不用模板的话，可能会这么做：

{% highlight js %}
var date = 3;
if (date >= 1 && date < 6) {
    return '今天是工作日，好沮丧啊！';
}
else {
    return '今天是周末，好开心啊！';
}
{% endhighlight %}

　　这么做又和今天的主题不相符了。那用模板该如何实现呢？首先直接沿用上述方法，把控制逻辑也放入模板中。显然字符串的 `replace` 方法只能替换模板字符串中的变量标识符为实际的变量值，但没法处理控制逻辑。

{% highlight js %}
var tpl = '<% if (date >= 1 && date < 6) { %>今天是工作日，好沮丧啊！<% } else'
    + '{ %>今天是周末，好开心啊！<% } %>';
var data = {
    date: 3
};
render(tpl, data);
{% endhighlight %}

　　其实模板文本就是普通的字符串，只不过里面包含了固定文本、代表变量的标识文本以及代表处理逻辑的标识文本。模板文本字符串经过解析，转换成可输出的字符串。所以解析模板的过程，可以分为如下几种情况：

- 当遇到固定文本时，直接输出；
- 当遇到变量标识时，替换成具体变量值输出；
- 当遇到代码逻辑标识时，执行代码逻辑

　　那么现在的问题就变成了要把字符串变成可执行的代码。JS 的语言特性可以很方便的做到，如使用 `eval` 或 `new Function()`。由于 `new Function()` 比 `eval` 容易定义参数，且传说大多数浏览器中效率更高，外加不同方式下调用 `eval` 的作用域有些诡异，所以选择使用 `new Function()`。

　　上面说到针对模板中的变量和逻辑代码需要做不同的处理，但上面的模板文本中，它们都是包裹在 `<% %>`里面的，该如何区分识别它们呢？一种方法是罗列出所有的控制逻辑关键字，如 `if、else、for、while、switch` 等，判断如果是这种关键字开头的，就当做是控制语句处理，其它的作为变量输出。另一种更简单的方式是使用不同的包裹字符。如有些模板引擎分别使用 `<% %>` 和 `<%= %>` 来代表控制语句和变量，此处也选择这种方式（当然，其它方式都可以，如用 `${}` 来代表变量）。

　　所以现在需要做的就是用正则解析模板文本，按上面说到的三种情况处理，最终拼成一个字符串文本，作为函数体，并调用 `new Function()` 来生成一个可执行的函数。如下：

{% highlight js %}
var tpl = 'Hi <%= name %>，你好！<% if (date >= 1 && date < 6) { %>今天是工作日'
    + '，好沮丧啊！<% } else { %>今天是周末，好开心啊！<% } %> 再见！';
var data = {
    name: 'Li Lei',
    date: '3'
};
function render(tpl, data) {
    var regExp = /<%(=?)\s*(.*?)\s*%>/g;
    var match;
    var lastIndex = 0;
    var codes = [];
    codes.push('var r = "";');
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            var value = typeof data[key] === 'string'
                ? '"' + data[key] + '"'
                : data[key];
            codes.push('var ' + key + ' = ' + value + ';');
        }
    }
    while (match = regExp.exec(tpl)) {
        // 固定文本
        codes.push('r += "' + tpl.slice(lastIndex, match.index) + '";');
        // 变量
        if (match[1]) {
            codes.push('r += "' + data[match[2]] + '";');
        }
        // 代码逻辑
        else {
            codes.push(match[2]);
        }
        lastIndex = match.index + match[0].length;
    }
    codes.push('r += "' + tpl.slice(lastIndex) + '";');
    codes.push('return r;');
    return new Function(codes.join(''))();
}
render(tpl, data);
// output: Hi Li Lei，你好！今天是工作日，好沮丧啊！ 再见！
{% endhighlight %}

　　上述代码有一点需要注意，`if` 条件中有用到 `date` 变量，而 `date` 变量在通过 `new Function` 动态创建的函数作用域中是不存在的。所以使用下面的代码在函数作用域中定义了参数 `data` 下的所有的变量（由于字符串变量需要加引号，而其它类型变量不需要，所以判断了一下类型）。当然使用 JS 中的 `with` 关键字也可以到达同样的目的，下面将会使用这种方式。

{% highlight js %}
for (var key in data) {
    if (data.hasOwnProperty(key)) {
        var value = typeof data[key] === 'string'
            ? '"' + data[key] + '"'
            : data[key];
        codes.push('var ' + key + ' = ' + value + ';');
    }
}
{% endhighlight %}

　　虽然现在实现了模板的功能，不同的模板调用上述 `render` 方法并传递相应的数据就可以得到不同的内容了。但如果同一个模板内容需要根据不同的数据显示在页面的多个地方，或同一个地方的数据变化后，需要重新渲染，则每一次调用 `render` 方法，都需要正则解析一遍模板文本，会有额外的性能开销。此处可以优化一下。

　　通过上面介绍可以知道， `render` 方法就是正则解析模板文本，组装成函数体，通过 `new Function` 生成函数对象并调用。调用完成后，函数就废弃了。此处可以通过返回函数的引用来优化，这样就可以重复调用函数而不用每次都解析模板了。针对特定的模板文本，对模板的解析是固定的，但模板内使用的数据是可变的。所以返回的这个函数，需要接收一个参数来获取数据。同时，解析模板时，就不应该直接读取数据了，数据的读取应该在返回的函数调用时处理。所以上面绑定函数内变量作用域的方式，就成了反面的例子，因为它在解析模板时就绑定了特定的数据，而不再适用其它的数据了。

　　此处增加一个 `compile` 函数，用于编译模板，返回一个函数，函数需要一个 `data` 参数用于接收数据。

{% highlight js %}
var tpl = 'Hi <%= name %>，你好！<% if (date >= 1 && date < 6) { %>今天是工作日'
    + '，好沮丧啊！<% } else { %>今天是周末，好开心啊！<% } %> 再见！';
var data = {
    name: 'Li Lei',
    date: '3'
};
function compile(tpl) {
    var regExp = /<%(=?)\s*(.*?)\s*%>/g;
    var match;
    var lastIndex = 0;
    var codes = [];
    codes.push('var r = "";');
    codes.push('with (data) {');
    while (match = regExp.exec(tpl)) {
        // 固定文本
        codes.push('r += "' + tpl.slice(lastIndex, match.index) + '";');
        // 变量
        if (match[1]) {
            codes.push('r += ' + match[2] + ';');
        }
        // 代码逻辑
        else {
            codes.push(match[2]);
        }
        lastIndex = match.index + match[0].length;
    }
    codes.push('r += "' + tpl.slice(lastIndex) + '";');
    codes.push('}');
    codes.push('return r;');
    return new Function('data', codes.join(''));
}
var renderer = compile(tpl);
renderer(data);

// output: Hi Li Lei，你好！今天是工作日，好沮丧啊！ 再见！
{% endhighlight %}

　　然后 `render` 函数就可以变成如下：

{% highlight js %}
function render(tpl, data) {
    var renderer = compile(tpl);
    return renderer(data);
}
{% endhighlight %}

　　至此，一个基本的JS 模板引擎就完成了。当然，只实现了最基本的功能，很多模板引擎会实现复杂的功能，如模板继承、可覆写的模板区块、自定义的模板语法、过滤器等等。当然，实现一个复杂功能的模板引擎将是一个大工程。
