define(function () {
    function each(collection, iterator) {
        if (collection instanceof Array) {
            for (var i = 0, len = collection.length; i < len; i++) {
                var item = collection[i];
                if (iterator(item, i, collection) === false) {
                    return;
                }
            }
        }
        else if (typeof collection === 'object') {
            for (var key in collection) {
                var item = collection[key];
                if (iterator(item, key, collection) === false) {
                    return;
                }
            }
        } 
    }

    return {
        each: each
    };
});