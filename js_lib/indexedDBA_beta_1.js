/**
 * indexedDB的跨瀏覽器處理
 *
 * 第一階段，只做一次性接收
 *
 * 方便用於將(ajax收到的資料)排序與查詢
 *
 *
 * $.activeDBList => 若開啟過(onupgradeneeded)記錄起來，不要再被啟動
 * $.db => IDBDatabase
 * $.dbName => 現在打開的資料庫是
 */
var $indexedDBA = {
    'dbList': [],
    'db': null,
    'dbName': '',
    'table': ''
};
/* ========================================================================== */
(function(self) {
    self.createOptionsList = [
        'error',
        'success',
        'upgradeneeded',
        'dbName',
        'tableName'
    ];
    /* ====================================================================== */
    self.init = function() {

        self.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
        self.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        self.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
        self.IDBCursor = window.IDBCursor || window.webkitIDBCursor || window.msIDBCursor;

        if (!self.indexedDB) {
            window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
        }
    };

    self.init();
    /* ====================================================================== */
    /**
     * 對外(創建資料庫)
     */
    self.createDatabase = function(options) {
        debugger;

        checkOptions(options);
        /* -------------------------------------------- */
        var dbName = options.dbName;
        var errorFun = options.error || null;

        /* -------------------------------------------- */
        if (typeof options.version == 'number') {
            // 若有指定(version)
            createDatabaseTable(options);
        } else {
            // 若沒有指定版本，從頭創見新的
            // 先刪除已有的資料，才能確定版本從(1)開始
            var delRq = self.indexedDB.deleteDatabase(dbName);
            delRq.onsuccess = event_delSuccess;
            delRq.onerror = event_delError;
            /* -------------------------------------------- */
            function event_delSuccess(e) {
                console.log('delSuccess');

                // 創建(table)
                createDatabaseTable(options);
            };
            /* -------------------------------------------- */
            function event_delError(e) {
                console.log('delError');
                if (typeof errorFun == 'function') {
                    errorFun(e);
                }
            };
        }
    };
    /* ====================================================================== */
    /**
     * 創建資料庫
     */
    var createDatabaseTable = function(options) {
        debugger;

        var successFun = options.success || null;
        var errorFun = options.error || null;
        var upgradeneededFun = options.upgradeneeded || null;

        var dbName = options.dbName;
        var tableName = options.table;
        /* -------------------------------------------- */
        // 連結資料庫(1版)
        // 因為更新資料庫，會啟動(onupgradeneeded)
        var openRq;

        // 是否有指定資料庫版本
        if (options.version == 'number') {
            openRq = self.indexedDB.open(dbName, options.version);
        } else {
            openRq = self.indexedDB.open(dbName, 1);
        }

        openRq.onsuccess = event_openSuccess;
        openRq.onerror = event_openError;
        openRq.onupgradeneeded = event_upgrade; // 創建表
        /* -------------------------------------------- */
        function event_openSuccess(e) {
            // debugger;
            console.log('openSuccess');

            /* ---------------------------------- */
            self.db = e.target.result;
            self.dbName = dbName;
            self.table = tableName;
            self.dbList.push(dbName);
            /* ---------------------------------- */
            if (typeof successFun == 'function') {
                successFun(e);
            }
        }
        /* -------------------------------------------- */
        function event_openError(e) {
            console.log('openError');

            if (typeof errorFun == 'function') {
                errorFun(e);
            }
        }
        /* -------------------------------------------- */
        // 創建表
        function event_upgrade(e) {
            // debugger;

            console.log('upgrade');
            /* ---------------------------------- */
            self.db = e.target.result;

            if (self.db.objectStoreNames.contains(tableName)) {
                self.db.deleteObjectStore(tableName);
            }

            if (typeof upgradeneededFun == 'function') {
                upgradeneededFun(e);
            }
        }
    };
    /* ====================================================================== */
    var checkOptions = function(options) {
        // debugger;

        var errorMsg_array = [];

        if (!/.*object\]$/gi.test(Object.prototype.toString.call(options))) {
            throw new Error('arg must be {}');
        }

        if (options.version != null && typeof options.version != 'number') {
            errorMsg_array.push('db.version must be int');
        }

        if (typeof options.dbName != 'string' || options.dbName.length == 0) {
            errorMsg_array.push('need setting options.dbName');
        }

        if (typeof options.table != 'string' || options.table.length == 0) {
            errorMsg_array.push('need setting options.table');
        }

        // 若(資料庫)經過(onupgradeneeded)則不要再去動
        // 會當掉
        if (self.dbList.indexOf(options.dbName) >= 0) {
            errorMsg_array.push('(' + options.dbName + ') has active');
        }

        if (errorMsg_array.length > 0) {
            throw new Error(errorMsg_array.join(' | '));
        }
    };
    /* ====================================================================== */
})($indexedDBA);

////////////////////////////////////////////////////////////////////////////////
(function(self) {
    /**
     * 純粹開啟資料庫
     *
     * options.dbName:要開啟的資料庫
     */
    self.openDatabase = function(options) {
        debugger;

        var dbName, success, error;

        if (/.*object\]$/gi.test(Object.prototype.toString.call(options))) {
            dbName = options.dbName || '';
            success = options.success || null;
            error = options.error || null;
        } else {
            dbName = String(options);
        }

        var openRq = self.indexedDB.open(dbName);
        /* -------------------------------------------- */
        openRq.onerror = function(e) {
            console.log('連結資料庫出問題');
            if (typeof error == 'function') {
                error(e);
            }
        };

        openRq.onsuccess = function(e) {
            debugger;

            console.log('連結資料庫ok');
            self.db = e.target.result;
            self.dbName = dbName;

            if (typeof success == 'function') {
                success(e);
            }
        };
    };
})($indexedDBA);


////////////////////////////////////////////////////////////////////////////////
(function() {
    /**
     * 刪除資料庫
     */
    self.deleteDatabase = function(options) {
        var dbName, success, error;

        if (/.*object\]$/gi.test(Object.prototype.toString.call(options))) {
            dbName = options.dbName || '';
            success = options.success || null;
            error = options.error || null;
        } else {
            dbName = String(options);
        }

        var delRq = self.indexedDB.deleteDatabase(dbName);

        delRq.onsuccess = event_delSuccess;
        delRq.onerror = event_delError;
        /* ==================================================================== */

        function event_delSuccess(e) {
            console.log('delSuccess');
        };
        /* -------------------------------------------- */
        function event_delError(e) {
            console.log('delError');
            if (typeof errorFun == 'function') {
                errorFun(e);
            }
        };
    };
})($indexedDBA);


////////////////////////////////////////////////////////////////////////////////
/**
 * 一些次功能
 */
(function(self) {
    /**
     * 連線的資料庫裡面，是否有包含(table)
     */
    self.containTable = function(tableName, db) {
        db = db || self.db;
        return db.objectStoreNames.contains(tableName);
    };
    /* ====================================================================== */
    /**
     * 取得連線裡面的(table)
     */
    self.getStoreList = function(db) {
        db = db || self.db;

        var data_array = (typeof db.objectStoreNames != 'undefined' &&
            typeof db.objectStoreNames.length == 'number') ? [].prototype.slice.call(db.objectStoreNames) : undefined;

        return data_array;
    };
    /* ====================================================================== */
    /**
     * 執行交易，取得(objectStore)
     *
     * @return {transaction:'', objectStore: ''} [返回包含(transaction)(objectStore)物件]
     */
    self.transaction = function(tableName, type) {
        // debugger;
        var table_array = []; // 交易的(table)
        type = type || 'readonly'; // 交易的類型

        Array.isArray(tableName) ? (table_array = tableName) : (table_array.push(tableName));

        /* -------------------------------------------- */
        // check
        if (typeof type != 'string') {
            throw new Error('type must be string');
        }
        // 確定要執行交易的(table)是否存在資料庫中
        for (var i = 0; i < table_array.length; i++) {
            var table = table_array[i];
            if (!self.db.objectStoreNames.contains(table)) {
                throw new Error('沒有指定的(table): ' + table);
            }
        }
        /* -------------------------------------------- */

        // 執行交易
        var ts = self.db.transaction(table_array, type);
        var os = ts.objectStore(table_array[0]);

        var data = {
            'transaction': ts,
            'objectStore': os
        }

        return data;
    };
})($indexedDBA);
////////////////////////////////////////////////////////////////////////////////
/**
 * 查尋功能
 */
(function(self) {

    var range = null;
    var store = null;
    var index = null;

    /**
     * 查詢用的選項
     *
     * index: 排序依據的(key)
     * direct: 排序(升序/降序)
     * range: 查詢條件
     * start: 從第幾筆開始提取
     * rows: 要提出幾筆資料
     *
     * table: 要調出表的名稱
     * dbName: 資料庫名稱
     *
     */
    var optionsList = {
        'index': '',
        'direct': 'next',
        'range': {},
        'start': null,
        'rows': null,
        'table': '',
        'success': null,
        'error': null,
        'final': null,
        'dbName': ''
    };
    /* ---------------------------------------------------------------------- */
    /**
     * 取得(store)(index)(range)
     */
    function setRangeIndex(options, type) {
        // debugger;

        var data = self.transaction(options.table, type);
        store = data.objectStore;

        // 若有設定(options.index)
        if (typeof options.index == 'string' && options.index.length > 0) {
            index = store.index(options.index);
        };

        // 若有設定(options.range)
        options.range &&
            Object.keys(options.range).length > 0 &&
            (range = getRange(options.range));
    };
    /* ---------------------------------------------------------------------- */
    /**
     * 取得(range)
     */
    function getRange(rangeOption) {
        // debugger;
        var range = null;

        // 取出(key)
        for (var rangeType in rangeOption) {
            if (rangeOption.hasOwnProperty(rangeType)) {
                break;
            }
        }

        var rangeValue = rangeOption[rangeType];

        switch (rangeType) {
            case 'only':
                if (!(typeof rangeValue == 'string' ||
                        typeof rangeValue == 'number')) {
                    throw new Error('range(only): must be string or number');
                }

                range = self.IDBKeyRange.only(rangeValue);
                break;
            case 'bound':
                if (!Array.isArray(rangeValue)) {
                    throw new Error('range(bound): must be array');
                }

                var arg1 = typeof rangeValue[0] != 'undefined' ? rangeValue[0] : null;
                var arg2 = typeof rangeValue[1] != 'undefined' ? rangeValue[1] : null;
                var arg3 = typeof rangeValue[2] != 'undefined' ? rangeValue[2] : false;
                var arg4 = typeof rangeValue[3] != 'undefined' ? rangeValue[3] : false;

                range = self.IDBKeyRange.bound(arg1, arg2);
                break;
            case 'lowerBound':
                if (!Array.isArray(rangeValue)) {
                    throw new Error('range(lowerBound): must be array');
                }

                range = self.IDBKeyRange.lowerBound(rangeValue);
                break;
            case 'upperBound':
                if (!Array.isArray(rangeValue)) {
                    throw new Error('range(upperBound): must be array');
                }
                range = self.IDBKeyRange.upperBound(rangeValue);
                break;
            default:
                throw new Error('no this range setting');
                break;
        }

        return range;
    };
    /* ====================================================================== */
    /**
     * 查詢的結果以(map)返回
     */
    self.queryMap = function(options) {
        debugger;
        index = range = store = null;
        var map = new Map();

        checkOptions(options);

        setRangeIndex(options, 'readonly');

        var rq;

        if (index) {
            rq = index.openCursor(range, options.direct);
        } else {
            rq = store.openCursor(range, options.direct);
        }
        /* -------------------------------------------- */
        var id = 0;
        var start = options.start || 0;
        var end = (options.rows != null) ? (start + options.rows - 1) : null;

        rq.onerror = function(e) {
            console.log('調資料過程有誤');
            if (typeof options.error == 'function') {
                options.error(e);
            }
        };

        rq.onsuccess = function(e) {
            // debugger;

            var cursor = e.target.result;

            if (cursor && (end != null) && (id <= end)) {
                // 若有資料且有設定(end)
                if (id >= start) {
                    map.set(cursor.key, cursor.value);
                }

                ++id;
                cursor.continue();
            } else if (end == null && cursor) {
                // 若有資料
                if (id >= start) {
                    map.set(cursor.key, cursor.value);
                }

                ++id;
                cursor.continue();
            } else {
                // 若沒有資料，或超過(end)
                if (typeof options.final == 'function') {
                    options.final(map, e);
                }
            }
        };
    };
    /* ====================================================================== */
    /**
     * 查詢的結果用(array)返回
     */
    self.queryArray = function(options) {
        debugger;
        var result = [];
        index = range = store = null;

        // 檢查輸入選項
        checkOptions(options);

        // var ts = self.db.transaction([options.table], 'readonly');
        // var store = ts.objectStore(options.table);
        // var index = store.index(options.index);

        // 設定(index)(range)
        setRangeIndex(options, 'readonly');

        var rq;

        // 依照(pk)還是(index)查詢
        if (index) {
            rq = index.openCursor(range, options.direct);
        } else {
            rq = store.openCursor(range, options.direct);
        }
        /* -------------------------------------------- */
        var id = 0;
        var start = options.start || 0;
        var end = (options.rows != null) ? (start + options.rows - 1) : null;
        /* -------------------------------------------- */
        rq.onerror = function(e) {
            console.log('調資料過程有誤');
            if (typeof options.error == 'function') {
                options.error(e);
            }
        };

        rq.onsuccess = function(e) {
            // debugger;

            var cursor = e.target.result;

            if (cursor && (end != null) && (id <= end)) {
                // 若有資料且有設定(end)

                if (id >= start) {
                    result.push(cursor.value);
                }

                ++id;
                cursor.continue();
            } else if (end == null && cursor) {
                // 若有資料但沒有設定讀取的量
                if (id >= start) {
                    result.push(cursor.value);
                }

                ++id;
                cursor.continue();
            } else {
                // 若沒有資料，或超過(end)
                if (typeof options.final == 'function') {
                    options.final(result, e);
                }
            }
        };
    };
    /* ====================================================================== */
    /**
     * 查詢(指定欄位)的結果用(array)返回
     */
    self.queryOneColumnArray = function(column, options) {
        var column_array = [],
            result = [];
        index = range = store = null;

        Array.isArray(column) ? (column_array = column) : column_array.push(column);

        // 檢查輸入選項
        checkOptions(options);

        // 設定(index)(range)
        setRangeIndex(options, 'readonly');

        var rq;

        // 依照(pk)還是(index)查詢
        if (index) {
            rq = index.openCursor(range, options.direct);
        } else {
            rq = store.openCursor(range, options.direct);
        }
        /* -------------------------------------------- */
        var id = 0;
        var start = options.start || 0;
        var end = (options.rows != null) ? (start + options.rows - 1) : null;
        /* -------------------------------------------- */
        rq.onerror = function(e) {
            console.log('調資料過程有誤');
            if (typeof options.error == 'function') {
                options.error(e);
            }
        };

        rq.onsuccess = function(e) {
            // debugger;

            var data, cursor = e.target.result;

            if (cursor && (end != null) && (id <= end)) {
                // 若有資料且有設定(end)

                if (id >= start) {
                    // 調出專屬欄位
                    data = cursor.value[column] || undefined;
                    result.push(data);
                }

                ++id;
                cursor.continue();
            } else if (end == null && cursor) {
                // 若有資料但沒有設定讀取的量

                if (id >= start) {
                    // 調出專屬欄位
                    data = cursor.value[column] || undefined;
                    result.push(data);
                }
                ++id;
                cursor.continue();
            } else {
                // 若沒有資料，或超過(end)

                if (typeof options.final == 'function') {
                    options.final(result, e);
                }
            }
        };

    };
    /* ====================================================================== */
    self.queryFun = function(options) {
        debugger;

        if (typeof options.success != 'function') {
            return;
        }
        index = range = store = null;

        checkOptions(options);

        setRangeIndex(options, 'readonly');

        var rq;

        if (index) {
            rq = index.openCursor(range, options.direct);
        } else {
            rq = store.openCursor(range, options.direct);
        }
        /* -------------------------------------------- */
        var id = 0;
        var start = options.start || 0;
        var end = (options.rows != null) ? (start + options.rows - 1) : null;
        var data = null;

        var arg = {
            'cursor': null,
            'event': null,
            'data': data,
            'index': null
        };

        rq.onerror = function(e) {
            console.log('調資料過程有誤');
            if (typeof options.error == 'function') {
                options.error(e);
            }
        };

        rq.onsuccess = function(e) {
            // debugger;
            var cursor = e.target.result;

            arg.event = e;
            arg.index = id;
            arg.cursor = cursor;

            if (cursor && (end != null) && (id <= end)) {
                // 若有指定讀取的數量
                var result = true;

                if (id >= start) {
                    result = options.success(arg);
                }

                if (result !== false) {
                    ++id;
                    cursor.continue();
                }
            } else if ((end == null) && cursor) {
                // 沒有指定讀取的數量
                var result = true;

                if (id >= start) {
                    result = options.success(arg);
                }

                if (result !== false) {
                    ++id;
                    cursor.continue();
                }
            } else {
                // 沒有資料了
                if (typeof options.final == 'function') {
                    options.final(arg);
                }
            }
        };
    };
    /* ====================================================================== */
    /**
     * [返回key]
     *
     * @param {object} options [選項]
     * @return {{key:count}}
     */
    self.queryKey = function(options) {
        var keyData = {};
        index = range = store = null;

        checkOptions(options);

        setRangeIndex(options, 'readonly');

        var rq;

        if (index) {
            rq = index.openCursor(range, options.direct);
        } else {
            rq = store.openCursor(range, options.direct);
        }
        /* -------------------------------------------- */
        rq.onerror = function(e) {
            console.log('調資料過程有誤');
            if (typeof options.error == 'function') {
                options.error(e);
            }
        };

        rq.onsuccess = function(e) {
            debugger;
            var cursor = e.target.result;

            if (cursor) {
                // 若有資料且有設定(end)

                if (typeof keyData[cursor.key] == 'number') {
                    ++keyData[cursor.key];
                } else {
                    keyData[cursor.key] = 1;
                }
                cursor.continue();
            } else {
                if (typeof options.final == 'function') {
                    options.final(keyData, e);
                }
            }
        };
    };

    /* ====================================================================== */
    /**
     * [返回有幾筆資料]
     *
     * @param {[object]} options [選項]
     * @return {number}
     */
    self.numOfAllRows = function(options) {
        debugger;
        var result = [];
        index = range = store = null;

        checkOptions(options);

        setRangeIndex(options, 'readonly');

        var rq = (index) ? index.count() : store.count();
        /* -------------------------------------------- */
        rq.onsuccess = function(e) {
            debugger;

            var cursor = e.target.result;
            if (typeof options.final == 'function') {
                options.final(cursor);
            }
        }
    };
    /* ====================================================================== */
    /**
     * 檢查(options)
     */
    function checkOptions(options) {
        // debugger;

        var errorMsg_array = [];

        if (self.db == null) {
            errorMsg_array.push('db no connect');
        }
        console.log('資料庫: ', self.db.name, options.dbName);
        if (self.db.name !== options.dbName) {
            errorMsg_array.push(self.db.name + ' 連錯資料庫 ' + options.dbName);
        }

        options.direct = (typeof options.direct != 'string') ? 'next' : options.direct;
        options.start = (options.start) ? Number(options.start) : 0;

        if ((typeof options.rows == 'string' && options.rows.length == 0) ||
            isNaN(options.rows)) {
            options.rows = null;
        } else {
            options.rows = Number(options.rows);
        }

        if (typeof options.table != 'string' || options.table.length == 0) {
            errorMsg_array.push('must set options.table tableName');
        }

        if (options.index != null &&
            typeof options.index != 'string') {
            errorMsg_array.push('options.index must be string');
        }

        if (options.range != null &&
            !/.*object\]\s*$/gi.test(Object.prototype.toString.call(options.range))) {
            errorMsg_array.push('options.range must be {}')
        }

        if (options.success != null &&
            typeof options.success != 'function') {
            errorMsg_array.push('options.success must be function');
        }

        if (options.error != null &&
            typeof options.error != 'function') {
            errorMsg_array.push('options.error must be function');
        }

        if (options.final != null &&
            typeof options.final != 'function') {
            errorMsg_array.push('options.final must be function');
        }

        if (errorMsg_array.length > 0) {
            throw new Error(errorMsg_array.join(' | '));
        }
    };

    /* ====================================================================== */
})($indexedDBA);
////////////////////////////////////////////////////////////////////////////////

/**
 * 測試瀏覽器的(indexedDB)能否正確執行
 */
(function() {
    var dbName = 'db_' + (new Date()).getTime();
    var option = {
        dbName: dbName,
        error: function(e) {
            alert('現在使用的瀏覽器，無法正確執行(IndexedDB)，請換其他瀏覽器');
        }
    };
    try {
        $indexedDBA.openDatabase(option);
    } catch (e) {
        alert('現在使用的瀏覽器，無法正確執行(IndexedDB)，請換其他瀏覽器');
    }

})();