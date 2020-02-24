'use strict'

// 工具函数

function setElementSize(element, width, height) {
    element.width = width;
    element.height = height;
}

function getElementByKey(key) {
    return document.querySelector(`[key=${key}`);
}

function getElementKeyObj(element) {
    const key = element.getAttribute("key") || "";
    const keyArr = key.match(/(.+)-(.+)$/) || [];
    return { key, name: keyArr[1], type: keyArr[2] };
}

function createDownLoad(link) {
    const a = document.createElement("a");
    a.href = link;
    a.download = "我的作品";
    a.click();
}

function drawLineToContext(context, sx, sy, ex, ey) {
    context.beginPath();
    context.moveTo(sx, sy);
    context.lineTo(ex, ey);
    // context.closePath();
    context.stroke();
}

function drawLineargradientLine(ctx, x, y, width, height, colorStop) {
    const lineargradient = ctx.createLinearGradient(0, 0, 0, height);
    colorStop.forEach(arr => {
        lineargradient.addColorStop(arr[0], arr[1]);
    });
    ctx.fillStyle = lineargradient;
    ctx.fillRect(x, y, width, height);
}

function newTwoDimensionalArray(row, col) {
    const arr = [];
    for (let i = 0; i < row; i++) {
        arr.push(new Array(col));
    }
    return arr;
}

// [,)
function isInRange(num, notLess, lessThen) {
    return num >= notLess && num < lessThen;
}

function isLegalNumber(num) {
    return !isNaN(+num);
}

function isLegalColor(color) {
    if (!color) return false;

    if (color.startsWith("rgb(")) {
        const colorArr = color.replace("rgb(", '').split(",");
        return (colorArr.length == 3
            && isLegalNumber(colorArr[0]) && isInRange(+colorArr[0], 0, 256)
            && isLegalNumber(colorArr[1]) && isInRange(+colorArr[1], 0, 256)
            && isLegalNumber(colorArr[2].slice(0, -1)) && isInRange(+colorArr[2].slice(0, -1), 0, 256));
    }

    if (color.startsWith("#")) {
        color = color.slice(1);
        return /[0-9A-Fa-f]{3,6}/.test(color);
    }

}

function getRandomColor() {
    return `rgb(${[0, 0, 0].map(it => Math.floor(Math.random() * 256)).join(",")})`;
}

function getRandomColorArr(row, col) {
    const colors = newTwoDimensionalArray(row, col);
    for (let i = 0; i < row; ++i) {
        for (let j = 0; j < col; ++j) {
            colors[i][j] = getRandomColor();
        }
    }
    return colors;
}

const __COLOR = {};
__COLOR.initColor = function ({ color, paintBox }) {
    this.colorSelectorContext = getElementByKey("color-selector-pick").getContext("2d");
    const paintBoxElement = getElementByKey("paint-box-pick");
    this.paintBoxContext = paintBoxElement.getContext("2d");
    this.paintBoxGridSize = {
        height: paintBoxElement.height / paintBox.length,
        width: paintBoxElement.width / paintBox[0].length
    }
    this.selectedColorPos = { row: 0, col: 0 };

    this.drawPaintBox(paintBox);
    this.updateCurrentColor(color);
    this.drawSelector(color);

    getElementByKey("color-format-input").onblur = (e) => {
        const { value } = e.currentTarget;
        this.updateCurrentColor(isLegalColor(value) ? value : this.color);
    }
}

__COLOR.updateCurrentColor = function (color) {
    const { paintBoxContext, paintBoxGridSize: { width, height }, selectedColorPos: { row, col } } = this;
    this.color = color;
    getElementByKey("current-color-pick").style.backgroundColor = color;
    getElementByKey("color-format-input").value = color;
    paintBoxContext.fillStyle = color;
    paintBoxContext.fillRect(Math.floor(col * width), Math.floor(row * height), width, height);
    this.drawPaintBoxSelected();
}

__COLOR.toggleColorSelectorDisplay = function () {
    const selector = getElementByKey("color-selector-pick");
    selector.className = selector.className == "hidden" ? "visible" : "hidden";
}

__COLOR.drawPaintBoxSelected = function() {
    const { paintBoxContext, paintBoxGridSize: { width, height }, selectedColorPos: { row, col } } = this;
    paintBoxContext.strokeStyle ="#000";
    paintBoxContext.fillText("📌", col * width, row * height + 16);
}

__COLOR.onClickPaintBox = function (x, y, color) {
    const { paintBoxContext, paintBoxGridSize: { width, height }, selectedColorPos: { row, col } } = this;
    paintBoxContext.fillStyle = this.color;
    paintBoxContext.fillRect(Math.floor(col * width), Math.floor(row * height), width, height);
    this.selectedColorPos = { row: Math.floor(y / height), col: Math.floor(x / width) };
    this.drawPaintBoxSelected();
    this.updateCurrentColor(color);
}

__COLOR.drawPaintBox = function (paintBox) {
    const { paintBoxContext, paintBoxGridSize: { width, height } } = this;
    paintBox.forEach((colorArr, row) => {
        colorArr.forEach((color, col) => {
            paintBoxContext.fillStyle = color;
            paintBoxContext.fillRect(Math.floor(col * width), Math.floor(row * height), width, height);
        })
    })
}

__COLOR.drawSelector = function () {
    const selector = getElementByKey("color-selector-pick");
    const { width, height } = selector;
    const colors = [
        "#cf010b", "#eb7012", "#f19914", "#f7c71b",
        "#fdf21c", "#cade1b", "#96c71e", "#65af1c",
        "#019219", "#019678", "#0195a3", "#0197ca",
        "#0198f1", "#007dd1", "#0162b3", "#004593",
        "#000267", "#51005c", "#7b014a", "#a40037", ""
    ];
    const lineWidth = width / (colors.length);
    const drawLine = drawLineargradientLine.bind({}, this.colorSelectorContext);
    colors.forEach((color, idx) => {
        drawLine(Math.floor(idx * lineWidth), 0, Math.floor(lineWidth * 2), height, color ? [[0, "#000"], [0.5, color], [1, "#fff"]]
            : [[0.2, "#000"], [0.8, "#fff"]]);
    });
}

const __TOOL = Object.create(__COLOR);
__TOOL.initTool = function (args) {
    this.initColor(args);
    const { toolBarElement, color, inUse, changeToolCallback } = args;
    this.toolBarElement = toolBarElement;
    this.inUse = inUse;
    this.isDragToolBar = false;
    this.addToolBarListener(changeToolCallback);
}

__TOOL.addToolBarListener = function (changeToolCallback) {

    this.toolBarElement.onmousedown = (e) => {
        if (e.target == e.currentTarget) {
            this.isDragToolBar = true;
        }
    }

    this.toolBarElement.onmousemove = (e) => {
        if (this.isDragToolBar && e.target == e.currentTarget) {
            const { movementX, movementY, currentTarget } = e;
            const { left, top } = currentTarget.style;
            currentTarget.style.left = parseInt(left || 0) + movementX + "px";
            currentTarget.style.top = parseInt(top || 0) + movementY + "px";
        }
    }

    this.toolBarElement.onmouseleave = (e) => {
        this.isDragToolBar = false;

    }

    this.toolBarElement.onmouseup = (e) => {
        this.isDragToolBar = false;
    }

    this.toolBarElement.onclick = (e) => {
        const keyObj = getElementKeyObj(e.target);
        if (!keyObj.key) return;

        if (keyObj.type == "select") {
            this.changeInUse(e.target);
        }

        if (keyObj.name == "color-selector") {
            const imageData = this.colorSelectorContext.getImageData(e.offsetX, e.offsetY, 1, 1);
            if (imageData.data.length > 3) {
                this.updateCurrentColor(`rgb(${imageData.data[0]},${imageData.data[1]}, ${imageData.data[2]})`);
            }
        }

        if (keyObj.name == "paint-box") {
            const imageData = this.paintBoxContext.getImageData(e.offsetX, e.offsetY, 1, 1);
            if (imageData.data.length > 3) {
                this.onClickPaintBox(e.offsetX, e.offsetY, `rgb(${imageData.data[0]},${imageData.data[1]}, ${imageData.data[2]})`);
            }
        }

        if (keyObj.name == "current-color") {
            this.toggleColorSelectorDisplay();
        }

        changeToolCallback(keyObj.name);
    }
}

__TOOL.changeInUse = function (element) {
    this.inUse.className = this.inUse.className.replace(' use', '');
    this.inUse = element;
    this.inUse.className = this.inUse.className + " use";
}


// 画布对象
const __PIXEL = Object.create(__TOOL);

__PIXEL.initPixel = function (args) {
    this.initTool({ ...args, changeToolCallback: this.changeToolCallback.bind(this) });

    const { canvasElement, gridElement, pasteBarElement, imageResolution, isGridDisplayed } = args;

    this.canvasElement = canvasElement;
    this.gridElement = gridElement;
    this.pasteBarElement = pasteBarElement;
    this.copySelectElement = pasteBarElement.getElementsByTagName("canvas")[0];

    this.canvasContext = canvasElement.getContext("2d");
    this.gridContext = gridElement.getContext("2d");

    // 限制大小 1000
    this.historyStack = [];
    this.undoStack = [];

    //已选中复制区域
    this.copyRect = {};
    this.isStartPaste = false;

    this.setImageResolution(imageResolution);

    if (isGridDisplayed) {
        this.drawGrid();
    }

    this.mousedrag = false;
    this.addMouseListener();

    this.inUse.click();
}

__PIXEL.getGridSize = function () {
    return Math.min(Math.floor(this.canvasElement.width / this.imageResolution.col),
        Math.floor(this.canvasElement.height / this.imageResolution.row));
}

__PIXEL.setImageResolution = function (imageResolution) {
    this.imageResolution = imageResolution;
    this.pixelContext = newTwoDimensionalArray(imageResolution.row, imageResolution.col);
    this.gridSize = this.getGridSize();
    this.canvasWidth = imageResolution.col * this.gridSize;
    this.canvasHeight = imageResolution.row * this.gridSize;
    this.offsetX = Math.floor((this.canvasElement.width - this.canvasWidth) / 2);
    this.offsetY = Math.floor((this.canvasElement.height - this.canvasHeight) / 2);

    this.copySelectElement.width = this.canvasWidth;
    this.copySelectElement.height = this.canvasHeight;
    this.copySelectElement.style.top = this.offsetY + "px";
    this.copySelectElement.style.left = this.offsetX + "px";
    this.copySelectContext = this.copySelectElement.getContext("2d");
}

__PIXEL.drawGrid = function () {
    this.gridContext.fillStyle = "#000";
    this.gridContext.fillRect(0, 0, this.gridElement.width, this.gridElement.height);

    this.gridContext.fillStyle = "#fff";
    this.gridContext.fillRect(this.offsetX, this.offsetY, this.canvasWidth, this.canvasHeight);

    this.gridContext.fillStyle = "#ccc";
    for (let i = 0; i < this.imageResolution.row; i++) {
        for (let j = (i & 1); j < this.imageResolution.col; j += 2) {
            this.gridContext.fillRect(this.offsetX + this.gridSize * j, this.offsetY + this.gridSize * i, this.gridSize, this.gridSize);
        }
    }
}

__PIXEL.removeGrid = function () {
    this.gridContext.clearRect(this.offsetX, this.offsetY, this.canvasWidth, this.canvasHeight);
}

__PIXEL.startCopy = function () {
    this.pasteBarElement.className = 'visible';
    this.toolBarElement.className = 'hidden';
    getElementByKey("color-selector-pick").className = 'hidden';
}

__PIXEL.closeCopy = function () {
    this.inUse.click();
    this.pasteBarElement.className = 'hidden';
    this.toolBarElement.className = 'visible';
    this.copyRect = {};
    this.isStartPaste = false;
}

__PIXEL.changeToolCallback = function (name) {
    switch (name) {
        case 'pen':
            this.canvasElement.style.cursor = "crosshair";
            break;
        case 'erase':
            this.canvasElement.style.cursor = "help";
            break;
        case 'toggle-grid':
            this.toggleGridDisplay();
            break;
        case 'undo':
            this.onUndo();
            break;
        case 'redo':
            this.onRedo();
            break;
        case 'clear':
            this.clearCanvas();
            break;
        case 'fill':
            this.canvasElement.style.cursor = "cell";
            break;
        case 'color-picker':
            this.canvasElement.style.cursor = "unset";
            break;
        case 'copy':
            this.startCopy();
            break;
        case 'download-image':
            createDownLoad(this.canvasElement.toDataURL());
            break;
        default:
            break;
    }
}

__PIXEL.isInCanvas = function (x, y) {
    if (x < this.offsetX || x >= this.canvasWidth + this.offsetX || y < this.offsetY || y >= this.canvasHeight + this.offsetY) {
        return false;
    }
    return true;
}

__PIXEL.tranformCoordinateToCanvas = function (x, y) {
    var col = Math.floor((x - this.offsetX) / this.gridSize);
    var row = Math.floor((y - this.offsetY) / this.gridSize);
    return { row, col };
}

__PIXEL.setPixelContext = function ({ row, col }, color) {
    this.pixelContext[row][col] = color;
}

__PIXEL.getPixelContext = function ({ row, col }) {
    return this.pixelContext[row][col];
}

__PIXEL.usePen = function (pos, _color) {
    const color = _color || this.color;
    this.setPixelContext(pos, color);
    this.canvasContext.fillStyle = color;
    this.canvasContext.fillRect(this.offsetX + pos.col * this.gridSize, this.offsetY + pos.row * this.gridSize, this.gridSize, this.gridSize);
}

__PIXEL.useErase = function (pos) {
    this.setPixelContext(pos, undefined);
    this.canvasContext.clearRect(this.offsetX + pos.col * this.gridSize, this.offsetY + pos.row * this.gridSize, this.gridSize, this.gridSize);
}

__PIXEL.useFill = function (pos) {
    const willReplaceColor = this.getPixelContext(pos);
    if (willReplaceColor == this.color) return;

    const queue = [pos];
    const visit = newTwoDimensionalArray(this.imageResolution.row, this.imageResolution.col);

    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];

    while (queue.length) {
        const pos = queue[0];
        queue.shift();

        if (this.getPixelContext(pos) != willReplaceColor) continue;

        this.usePen(pos);
        visit[pos.row][pos.col] = true;

        directions.forEach(dir => {
            const _row = pos.row + dir[0];
            const _col = pos.col + dir[1];
            if (isInRange(_row, 0, this.imageResolution.row)
                && isInRange(_col, 0, this.imageResolution.col)
                && !visit[_row][_col]
                && this.getPixelContext({ row: _row, col: _col }) == willReplaceColor) {
                queue.push({ row: _row, col: _col });
            }
        })
    }
    return visit;
}

__PIXEL.clearCanvas = function () {
    this.historyStack.push({ pixelContext: this.pixelContext, action: "clearCanvas" });
    this.pixelContext = newTwoDimensionalArray(this.imageResolution.row, this.imageResolution.col);
    this.canvasContext.clearRect(this.offsetX, this.offsetY, this.canvasWidth, this.canvasHeight);
}

__PIXEL.drawByPixelContext = function () {
    this.pixelContext.forEach((rowColor, row) => {
        rowColor.forEach((color, col) => {
            this.canvasContext.fillStyle = color;
            this.canvasContext.fillRect(this.offsetX + col * this.gridSize, this.offsetY + row * this.gridSize, this.gridSize, this.gridSize);
        })
    });
}

__PIXEL.paint = function (action) {
    const { x, y } = action;
    if (!this.isInCanvas(x, y)) return;
    const pos = this.tranformCoordinateToCanvas(x, y);
    const color = this.getPixelContext(pos);
    const keyObj = getElementKeyObj(this.inUse);

    switch (keyObj.name) {
        case "pen":
            if (this.color != color) {
                this.usePen(pos);
                this.historyStack.push({ willReplaceColor: color, paintColor: this.color, pos, action: "usePen" });
                this.undoStack.length = 0;
            }
            break;
        case "erase":
            if (color) {
                this.useErase(pos);
                this.historyStack.push({ willReplaceColor: color, pos, action: "useErase" });
                this.undoStack.length = 0;
            }
            break;
        case 'fill':
            if (this.color != color) {
                this.historyStack.push({ willReplaceColor: color, paintColor: this.color, fillPixelContent: this.useFill(pos), action: "useFill" });
                this.undoStack.length = 0;
            }
            break;
        case 'color-picker':
            if (color && this.color != color) {
                this.updateCurrentColor(color);
            }
            break;
        default:
            break;
    }
    return true;
}

__PIXEL.onRedo = function () {
    const { length } = this.undoStack;
    if (length == 0) return;

    const record = this.undoStack[length - 1];
    const { action, pos, paintColor } = record;
    this.historyStack.push(record);
    this.undoStack.pop();

    switch (action) {
        case "usePen":
            this.usePen(pos, paintColor);
            break;
        case "useErase":
            this.useErase(pos);
            break;
        case "clearCanvas":
            this.clearCanvas();
            break;
        case "useFill":
            record.fillPixelContent.forEach((fillContent, row) => {
                fillContent.forEach((isPaint, col) => {
                    isPaint && this.usePen({ row, col }, paintColor);
                });
            });
            break;
    }
}

__PIXEL.onUndo = function () {
    const { length } = this.historyStack;
    if (length == 0) return;

    const record = this.historyStack[length - 1];
    this.undoStack.push(record);
    this.historyStack.pop();

    const { action, pos, willReplaceColor } = record;
    switch (action) {
        case "usePen":
            willReplaceColor ? this.usePen(pos, willReplaceColor) : this.useErase(pos);
            break;
        case "useErase":
            this.usePen(pos, willReplaceColor);
            break;
        case "clearCanvas":
            this.pixelContext = record.pixelContext;
            this.drawByPixelContext();
            break;
        case "useFill":
            record.fillPixelContent.forEach((fillContent, row) => {
                fillContent.forEach((isPaint, col) => {
                    isPaint && (
                        willReplaceColor ? this.usePen({ row, col }, willReplaceColor) : this.useErase({ row, col })
                    );
                });
            });
            break;
    }
}

__PIXEL.usePaste = function (e) {
    const { offsetX, offsetY } = e;
    const { sx, sy, ex, ey } = this.copyRect;
    if (!(sx && sy && ex && ey)) return;
    const beginCopyRow = Math.floor(Math.min(sy, ey) / this.gridSize);
    const beginCopyCol = Math.floor(Math.min(sx, ex) / this.gridSize);
    const endCopyRow = Math.floor(Math.max(sy, ey) / this.gridSize);
    const endCopyCol = Math.floor(Math.max(sx, ex) / this.gridSize);

    const startPasteRow = Math.floor(offsetY / this.gridSize);
    const startPasteCol = Math.floor(offsetX / this.gridSize);

    const fillPixelContent = newTwoDimensionalArray(this.imageResolution.row, this.imageResolution.col);

    for (let row = beginCopyRow, i = 0; row <= endCopyRow; ++row, i++) {
        for (let col = beginCopyCol, j = 0; col <= endCopyCol; ++col, j++) {
            const color = this.getPixelContext({ row, col });
            const _row = startPasteRow + i;
            const _col = startPasteCol + j;
            if (color && isInRange(_row, 0, this.imageResolution.row) && isInRange(_col, 0, this.imageResolution.col)) {
                this.usePen({ row: _row, col: _col }, color);
                fillPixelContent[_row][_col] = color;
            }
        }
    }
    this.isStartPaste = false;
    this.copySelectElement.style.cursor = "crosshair";

    return fillPixelContent;
}

__PIXEL.toggleGridDisplay = function () {
    this.isGridDisplayed ? this.drawGrid() : this.removeGrid();
    this.isGridDisplayed = !this.isGridDisplayed;
}

__PIXEL.addMouseListener = function () {
    this.canvasElement.onpointerdown = (e) => {
        this.mousedrag = true;
    };

    this.canvasElement.onclick = (e) => {
        var { clientX, clientY } = e;
        this.paint({ x: clientX, y: clientY });
    }

    this.canvasElement.onpointermove = (e) => {
        if (this.mousedrag) {
            var { clientX, clientY } = e;
            this.paint({ x: clientX, y: clientY });
        }
    };

    this.canvasElement.onpointerleave = (e) => {
        this.mousedrag = false;
    }

    this.canvasElement.onpointerup = (e) => {
        this.mousedrag = false;
    };

    // 复制粘贴
    this.pasteBarElement.onclick = (e) => {
        const keyObj = getElementKeyObj(e.target);

        if (!keyObj.key) return;
        switch (keyObj.name) {
            case "paste-close":
                this.closeCopy();
                break;
            case "paste":
                if (this.copyRect.ex) {
                    this.isStartPaste = true;
                    this.copySelectElement.style.cursor = "unset";
                }
                break;
        }
    }

    this.copySelectElement.onpointerdown = (e) => {
        const { currentTarget, button } = e;
        if ((button == 2 && this.copyRect.ex) || this.isStartPaste) {
            this.usePaste(e);
        } else {
            this.mousedrag = true;
            this.copyRect.sx = e.offsetX;
            this.copyRect.sy = e.offsetY;
        }
        this.copySelectContext.clearRect(0, 0, currentTarget.width, currentTarget.height);
    };

    this.copySelectElement.onpointermove = (e) => {
        const { currentTarget } = e;
        if (this.mousedrag) {
            this.copyRect.ex = e.offsetX;
            this.copyRect.ey = e.offsetY;
            const { sx, sy, ex, ey } = this.copyRect;
            this.copySelectContext.clearRect(0, 0, currentTarget.width, currentTarget.height);
            this.copySelectContext.strokeRect(Math.min(sx, ex), Math.min(sy, ey),
                Math.abs(ex - sx), Math.abs(ey - sy));
        }
    };

    this.copySelectElement.onpointerleave = (e) => {
        this.mousedrag = false;
    }

    this.copySelectElement.onpointerup = (e) => {
        this.mousedrag = false;
    };

    //取消所有右键默认事件
    document.oncontextmenu = function (e) {
        return false;
    }
}


// 主函数
function main() {
    const CANVAS = document.getElementById("canvas");
    const GRID = document.getElementById("grid");
    const TOOL_BAR = document.getElementById("tool-bar");
    const COLOR_SELECTOR = document.getElementById("color-selector");
    const PASTE_BAR = document.getElementById("paste-bar");

    const pixel = Object.create(__PIXEL);
    CANVAS.width = GRID.width = window.innerWidth;
    CANVAS.height = GRID.height = window.innerHeight;

    const toolBarSize = TOOL_BAR.getBoundingClientRect();
    COLOR_SELECTOR.width = toolBarSize.width * 1.5;
    COLOR_SELECTOR.height = toolBarSize.width * 1.5;
    COLOR_SELECTOR.style.top = toolBarSize.bottom - COLOR_SELECTOR.width + "px";
    COLOR_SELECTOR.style.left = toolBarSize.right + "px";

    setElementSize(getElementByKey("paint-box-pick"), toolBarSize.width * 0.8, toolBarSize.width * 0.5);
    const paintBox = getRandomColorArr(3, 8);

    pixel.initPixel({
        canvasElement: CANVAS,
        gridElement: GRID,
        toolBarElement: TOOL_BAR,
        inUse: getElementByKey("pen-select"),
        color: paintBox[0][0],
        paintBox,
        pasteBarElement: PASTE_BAR,
        isGridDisplayed: true,
        imageResolution: { row: 60, col: 100 }
    });
}

document.body.onload = function () {
    main();
}

// 重构一下边界判断
// 颜色盘
// 新增监听器类
// 包装一个拖拽控件
// 重构复制粘贴(粘贴加个轮廓提示)
// 修改tool bar的拖拽、边界、缩小
// 历史记录变成基于一个操作（路径）（增加历史记录面板）
// 按钮防抖
// 重构样式（指针样式）
// 镜像复制(TODO: undo、redo)
// resize?? 兼容触摸屏？
// 放大缩小
// 画布调整大小（数值边界）
// 画布左移右移
// 橡皮擦调整大小
// 画笔调整大小
// 调色盘调整大小
// 图标下添加小字
// 实时本地存储
// 文件导入（添加背景图）、导出（制定存储格式）
// 添加加载动画(导引动画)
// 预览
// 添加新画布
// 制作简单动画
// 重写复制粘贴（勾勒轮廓）
// 图层
