/**
 * 五子棋
 *
 * @file 实现五子棋功能
 * @author brucexyj@gmail.com
 */

(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    }
    else {
        global.Gobang = factory();
    }
})(this, function () {
    // 水平棋格数
    var H_SIZE = 15;
    // 垂直棋格数
    var V_SIZE = 15;
    // 棋盘默认宽度
    var CHESSBOARD_WIDTH = 750;
    // 棋盘默认高度
    var CHESSBOARD_HEIGHT = 750;
    // 棋子宽度与棋格宽度比
    var CHESS_RATIO = 0.4;
    // 5个棋子连排时赢得比赛
    var WIN_COUNT = 5;
    // 下棋双方（白子还是黑子）
    var Side = {
        WHITE: 1,
        BLACK: 2
    };
    // 获胜方
    var Winner = {
        WHITE: 1,
        BLACK: 2,
        DRAW: 3
    };

    /**
     * 五子棋构造函数
     *
     * @param {HTMLCanvasElement} canvas HTML canvas元素
     */
    function Gobang(canvas) {
        if (!(this instanceof Gobang)) {
            return new Gobang(canvas);
        }

        init(canvas, this);
    }

    /**
     * 开始
     *
     * @param {boolean} auto 是否为自动模式（自动模式时黑白方自动轮流落子，无需人工干预。主要是为了看测试效果）
     */
    Gobang.prototype.start = function (auto) {
        this.done = false;

        // 黑棋先落子
        this.side = Side.BLACK;

        this.auto = !!auto;

        // 存放着每一个棋格的状态，标志某个棋格是否已被落子，落子了的话是白子还是黑子
        var states = [];
        for (var i = 0; i < H_SIZE; i++) {
            states[i] = [];
            for (var j = 0; j < V_SIZE; j++) {
                states[i][j] = 0;
            }
        }
        this.states = states;

        // 开局黑子先落子时默认先落到棋盘中间
        var startCoord = {x: Math.floor(H_SIZE / 2), y: Math.floor(V_SIZE / 2)};
        moveInChess(startCoord, this);
    };

    /**
     * 初始化
     *
     * @param {HTMLCanvasElement} canvas HTML canvas元素
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function init(canvas, thisObj) {
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Please pass a `Canvas` element.');
        }

        // 棋盘宽度（包括左右的空白）
        thisObj.width = canvas.width || CHESSBOARD_WIDTH;
        // 棋盘高度（包括上下的空白）
        thisObj.height = canvas.height || CHESSBOARD_HEIGHT;
        // 棋格的宽度
        thisObj.cellWidth = thisObj.width / H_SIZE;
        // 棋格的高度
        thisObj.cellHeight = thisObj.height / V_SIZE;
        // 棋子的半径
        thisObj.chessRadius = thisObj.cellWidth * CHESS_RATIO;
        // Canvas画图上下文对象
        thisObj.context = canvas.getContext('2d');

        bindEvent(canvas, thisObj);

        drawChessboard(thisObj);
    }

    /**
     * 绑定事件
     *
     * @param {HTMLCanvasElement} canvas HTML canvas元素
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function bindEvent(canvas, thisObj) {
        canvas.addEventListener('click', function (e) {
            if (thisObj.done) {
                return;
            }

            var offsetX = e.offsetX;
            var offsetY = e.offsetY;
            if (offsetX < 0 || offsetX > thisObj.width || offsetY < 0 || offsetY > thisObj.height) {
                return;
            }

            var x = Math.floor(offsetX / thisObj.cellWidth);
            var y = Math.floor(offsetY / thisObj.cellHeight);
            var coord = {x: x, y: y};

            moveInChess(coord, thisObj);
        });
    }

    /**
     * 绘制棋盘
     *
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function drawChessboard(thisObj) {
        var width = thisObj.width;
        var height = thisObj.height;
        var cellWidth = thisObj.cellWidth;
        var cellHeight = thisObj.cellHeight;
        var context = thisObj.context;
        context.clearRect(0, 0, width, height);
        context.strokeStyle = 'red';

        context.beginPath();
        context.strokeText(0, 12, 25);

        for (var i = 1; i < V_SIZE; i++) {
            context.beginPath();
            context.strokeText(i, i * cellWidth + cellWidth / 2 - 5, 20);
        }

        for (var i = 1; i < V_SIZE; i++) {
            context.beginPath();
            context.strokeText(i, 7, i * cellHeight + cellHeight / 2);
        }

        for (var i = 0; i < V_SIZE; i++) {
            var vOffset = i * cellHeight + cellHeight / 2;
            context.beginPath();
            context.moveTo(cellWidth / 2, vOffset);
            context.lineTo(width - cellWidth / 2, vOffset);
            context.stroke();
        }

        for (var i = 0; i < H_SIZE; i++) {
            var hOffset = i * cellWidth + cellWidth / 2;
            context.beginPath();
            context.moveTo(hOffset, cellHeight / 2);
            context.lineTo(hOffset, height - cellHeight / 2);
            context.stroke();
        }
    }

    /**
     * 落子
     *
     * @param {Object} coord 落子位置
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function moveInChess(coord, thisObj) {
        if (!coord) {
            coord = getMaxScoreCoord(thisObj);
        }

        thisObj.states[coord.x][coord.y] = thisObj.side;
        drawChess(coord, thisObj);

        var result = check(coord, thisObj);
        if (result) {
            finish(result, thisObj);
        }
        else {
            // 交换下次落子方
            thisObj.side = thisObj.side === Side.WHITE ? Side.BLACK : Side.WHITE;
            if (thisObj.side === Side.BLACK || thisObj.auto) {
                moveInChess(null, thisObj);
            }
        }
    }

    /**
     * 绘制棋子
     *
     * @param {Object} coord 落子位置
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function drawChess(coord, thisObj) {
        var context = thisObj.context;
        var point = getCoordPoint(coord, thisObj);
        context.fillStyle = thisObj.side === Side.WHITE ? 'white' : 'black';
        context.beginPath();
        context.arc(point.x, point.y, thisObj.chessRadius, 0, 2 * Math.PI);
        context.fill();
    }

    /**
     * 根据落子位置计算对应的棋盘坐标点
     *
     * @param {Object} coord 落子位置
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     * @return {Object} 最大得分棋格位置对应的棋盘坐标点
     */
    function getCoordPoint(coord, thisObj) {
        var cellWidth = thisObj.cellWidth;
        var cellHeight = thisObj.cellHeight;
        var x = coord.x * cellWidth + cellWidth / 2;
        var y = coord.y * cellHeight + cellHeight / 2;

        return {x: x, y: y};
    }

    /**
     * 计算未落子的棋格中得分最高的棋格
     *
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     * @return {Object} 最大得分棋格的位置
     */
    function getMaxScoreCoord(thisObj) {
        var maxScore = 0;
        var maxScoreCoords = [];
        var states = thisObj.states;
        for (var x = 0; x < H_SIZE; x++) {
            for (var y = 0; y < V_SIZE; y++) {
                // 当前点已经放置过棋子了，就略过它，不用计算它的得分了
                if (states[x][y]) {
                    continue;
                }

                var coord = {x: x, y: y};
                var score = calculateCoordScore(coord, thisObj);
                if (score >= maxScore) {
                    if (score > maxScore) {
                        maxScore = score;
                        maxScoreCoords.length = 0;
                    }
                    maxScoreCoords.push(coord);
                }
            }
        }

        if (maxScoreCoords.length) {
            // 有多个点的得分一样的话，随机取一个点
            var index = Math.floor(Math.random() * maxScoreCoords.length);

            return maxScoreCoords[index];
        }
    }

    /**
     * 计算某一个棋格当前的得分（得分包括当前棋格向外延伸的8个方向的得分总和）
     *
     * @param {Object} coord 落子位置
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     * @return {number} 某一个棋格在所有8个方向上的得分总和
     */
    function calculateCoordScore(coord, thisObj) {
        var score = 0;
        for (var direction = 0; direction < 4; direction++) {
            score += calculatePreDirectionScore(coord, direction, thisObj);
        }

        return score;
    }

    /**
     * 计算某一个棋格在某一方向上的得分
     *
     * @param {Object} coord 落子位置
     * @param {number} direction 方向
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     * @return {number} 某一个棋格在某一方向上的得分
     */
    function calculatePreDirectionScore(coord, direction, thisObj) {
        var x = coord.x;
        var y = coord.y;
        var states = thisObj.states;
        var side = thisObj.side;
        var maxScore = 0;
        var step = getStep(direction);
        for (var i = 0; i < WIN_COUNT; i++) {
            var startX = x - (4 - i) * step.x;
            var startY = y - (4 - i) * step.y;
            // 已经到达棋盘边界
            if (!checkBoundary(startX, startY)) {
                continue;
            }

            var preState = 0;
            var score = 0;
            var sameCount = 0;
            var spaceCount = 0;
            var meetCurrent = false;
            var calculateSpace = true;
            for (var j = 0; j < WIN_COUNT; j++) {
                var targetX = startX + j * step.x;
                var targetY = startY + j * step.y;
                var currentState;

                // 已经到达棋盘边界
                if (!checkBoundary(targetX, targetY)) {
                    break;
                }

                if (targetX === x && targetY === y) {
                    meetCurrent = true;
                    continue;
                }

                currentState = states[targetX][targetY];
                if (calculateSpace) {
                    if (!currentState) {
                        spaceCount++;
                    }
                    else if (!meetCurrent) {
                        spaceCount = 0;
                    }
                    else {
                        calculateSpace = false;
                    }
                }

                if (j) {
                    if (!preState) {
                        if (currentState) {
                            preState = currentState;
                            sameCount++;
                            spaceCount = 0;
                        }

                        continue;
                    }

                    if (!currentState) {
                        continue;
                    }
                    else if (currentState !== preState) {
                        sameCount = 0;
                        break;
                    }
                    else {
                        sameCount++;
                    }
                }
                else if (currentState) {
                    sameCount++;
                }

                preState = currentState;
            }

            if (sameCount) {
                score = Math.pow(10, sameCount)
                    + (preState === side ? 5 : 0)
                    - (1 * spaceCount);
            }

            // maxScore = Math.max(score, maxScore);
            maxScore += score;
        }

        return maxScore;
    }

    /**
     * 计算当前落完子后的棋局状态
     *
     * @param {Object} coord 落子位置
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     * @return {number} 当前棋局状态
     */
    function check(coord, thisObj) {
        var x = coord.x;
        var y = coord.y;
        var states = thisObj.states;
        // 判断是否已赢得比赛
        for (var direction = 0; direction < 4; direction++) {
            var step = getStep(direction);
            for (var i = 0; i < WIN_COUNT; i++) {
                var startX = x - (4 - i) * step.x;
                var startY = y - (4 - i) * step.y;
                // 已经到达棋盘边界
                if (!checkBoundary(startX, startY)) {
                    continue;
                }

                var preState = states[startX][startY];
                for (var count = 0; count < WIN_COUNT; count++) {
                    var targetX = startX + count * step.x;
                    var targetY = startY + count * step.y;
                    // 已经到达棋盘边界
                    if (!checkBoundary(targetX, targetY)) {
                        break;
                    }

                    var currentState = states[targetX][targetY];
                    if (!currentState || currentState !== preState) {
                        break;
                    }

                    preState = currentState;
                }

                if (count === WIN_COUNT) {
                    return preState === Side.WHITE ? Winner.WHITE : Winner.BLACK;
                }
            }
        }

        // 若到目前为止没有哪一方赢得比赛，则接着判断棋盘是否还有空间，有的话则继续比赛
        for (var x = 0; x < H_SIZE; x++) {
            for (var y = 0; y < V_SIZE; y++) {
                if (!states[x][y]) {
                    return 0;
                }
            }
        }

        // 若棋格已被下满，则平局
        return Winner.DRAW;
    }

    /**
     * 技术沿某个方向延伸的x和y轴的步伐
     *
     * @param {Object} coord 落子位置
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     * @return {Object} x和y轴上的步伐
     */
    function getStep(direction) {
        var stepX = 0;
        var stepY = 1;
        switch (direction) {
            case 0:
                stepX = 1;
                stepY = 0;
                break;
            case 1:
                stepX = 1;
                stepY = 1;
                break;
            case 2:
                stepX = 0;
                stepY = 1;
                break;
            case 3:
                stepX = -1;
                stepY = 1;
                break;
        }

        return {x: stepX, y: stepY};
    }

    /**
     * 检查坐标点是否在棋盘边界内
     *
     * @param {number} x x轴坐标
     * @param {number} y y轴坐标
     * @return {boolean} 标识是否在边界内
     */
    function checkBoundary(x, y) {
        if (x < 0 || x >= H_SIZE || y < 0 || y >= V_SIZE) {
            return false;
        }

        return true;
    }

    /**
     * 一局棋下完后的动作
     *
     * @param {number} winner 获胜方
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function finish(winner, thisObj) {
        var text = '';
        switch (winner) {
            case Winner.WHITE:
                text = '白方获胜';
                break;
            case Winner.BLACK:
                text = '黑方获胜';
                break;
            case Winner.DRAW:
                text = '平局';
                break;
        }
        text += '！\n\n是否开始下一局？'
        var feedback = confirm(text);
        if (feedback) {
            gameAgain(thisObj);
        }
        else {
            gameOver(thisObj);
        }
    }

    /**
     * 继续一局
     *
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function gameAgain(thisObj) {
        var context = thisObj.context;
        context.clearRect(0, 0, thisObj.width, thisObj.height);
        drawChessboard(thisObj);
        thisObj.start();
    }

    /**
     * 结束
     *
     * @param {Object} thisObj 运行时this对象，即Gobang对象
     */
    function gameOver (thisObj) {
        thisObj.done = true;
    }

    return Gobang;
});
