'use strict'

// 工具函数

function drawLineToContext(context, sx, sy, ex, ey) {
    context.beginPath();
    context.moveTo(sx, sy);
    context.lineTo(ex, ey);
    // context.closePath();
    context.stroke();
}

function newTwoDimensionalArray(x, y) {
    const arr = [];
    for (let i = 0; i < x; i++) {
        arr.push(new Array(y));
    }
    return arr;
}

// [,)
function isInRange(num, notLess, lessThen) {
    return num >= notLess && num < lessThen;
}

function getRGBArray(rgbStr) {
    return rgbStr.slice(4, rgbStr.length - 1).split(',');
}

function modifyRGB(rgbStr, replaceArray) {
    const rgb = getRGBArray(rgbStr);
    return `rgb(${rgb.map((it, idx) => ~replaceArray[idx] ? replaceArray[idx] : it).join(',')})`;
}

// 滑动条

const __SLIDER = {};
__SLIDER.initSlider = function (sliderElement, precent, onChange) {
    this.sliderElement = sliderElement;
    this.precent = precent;
    this.isSliding = false;
    this.onChange = onChange;
    this.addSliderListener();
    this.updatePointPosition();
}

__SLIDER.updatePointPosition = function () {
    const bar = this.sliderElement;
    const point = this.sliderElement.firstElementChild;
    const barSize = bar.getBoundingClientRect();
    const pointSize = point.getBoundingClientRect();
    point.style.left = this.precent * barSize.width - (pointSize.width / 2) + "px";
}

__SLIDER.addSliderListener = function () {
    this.sliderElement.onmousedown = (e) => {
        this.isSliding = true;
    }
    this.sliderElement.onmouseup = (e) => {
        this.isSliding = false;
    }
    this.sliderElement.onmousemove = (e) => {
        if (this.isSliding) {
            const bar = this.sliderElement;
            const point = this.sliderElement.firstElementChild;
            const barSize = bar.getBoundingClientRect();
            const pointSize = point.getBoundingClientRect();
            const halfWidthOfPoint = pointSize.width / 2;
            if ((e.movementX < 0 && pointSize.left + halfWidthOfPoint < barSize.left)
                || (e.movementX > 0 && pointSize.left + halfWidthOfPoint > barSize.right)) {
                this.isSliding = false;
                return;
            }
            const left = parseInt(point.style.left || 0) + e.movementX;
            point.style.left = left + "px";
            this.precent = (left + halfWidthOfPoint) / barSize.width;
            this.onChange(this.precent);
        }
    }
}


// 工具对象
const __TOOL = {};
__TOOL.initTool = function ({ toolBarElement, toggleGridElement, colorSelector, inUse, color, changeToolCallback }) {

    this.toolBarElement = toolBarElement;
    this.toggleGridElement = toggleGridElement;
    this.colorSelector = colorSelector;

    this.inUse = inUse;
    this.color = color;
    this.updateColorDisplay();

    const colors = getRGBArray(color);
    this.sliderR = Object.create(__SLIDER);
    this.sliderG = Object.create(__SLIDER);
    this.sliderB = Object.create(__SLIDER);

    ["sliderR", "sliderG", "sliderB"].map((key, idx) => {
        this[key].initSlider(this.colorSelector[key], colors[idx] / 255, (precent) => {
            const colorArray = getRGBArray(this.color);
            colorArray[idx] = Math.floor(precent * 255);
            this.color = modifyRGB(this.color, colorArray);
            this.updateColorDisplay();
        });
    });

    this.isDragToolBar = false;
    this.addMoveToolBarListener(changeToolCallback);
}

__TOOL.addMoveToolBarListener = function (changeToolCallback) {

    this.toolBarElement.onmousedown = (e) => {
        this.isDragToolBar = true;
    }

    this.toolBarElement.onmousemove = (e) => {
        if (this.isDragToolBar && e.target == this.toolBarElement) {
            const { movementX, movementY } = e;
            const { left, top } = this.toolBarElement.style;
            this.toolBarElement.style.left = parseInt(left || 0) + movementX + "px";
            this.toolBarElement.style.top = parseInt(top || 0) + movementY + "px";
        }
    }

    this.toolBarElement.onmouseleave = (e) => {
        this.isDragToolBar = false;

    }

    this.toolBarElement.onmouseup = (e) => {
        this.isDragToolBar = false;
    }

    this.toolBarElement.onclick = (e) => {
        const { target } = e;
        const { toolType } = target.dataset;
        if (!toolType) return;
        const typeArr = toolType.split("-");

        if (typeArr[1] == "SELECT") {
            this.changeInUse(target);
        }
        changeToolCallback(typeArr[0]);
    }
}

__TOOL.changeInUse = function (element) {
    this.inUse.className = "tool";
    this.inUse = element;
    this.inUse.className = "tool use";
}

__TOOL.updateColorDisplay = function () {
    this.colorSelector.colorDisplayElement.style.backgroundColor = this.color;
}


// 画布对象
const __CANVAS = Object.create(__TOOL);

__CANVAS.initCanvas = function (args) {
    this.initTool({ ...args, changeToolCallback: this.changeToolCallback.bind(this) });

    const { canvasElement, gridElement, imageResolution, isGridDisplayed } = args;

    this.canvasElement = canvasElement;
    this.gridElement = gridElement;

    this.canvasContext = canvasElement.getContext("2d");
    this.gridContext = gridElement.getContext("2d");

    // 限制大小 1000
    this.historyStack = [];
    this.undoStack = [];

    this.setImageResolution(imageResolution);

    if (isGridDisplayed) {
        this.toggleGridElement.getElementsByTagName("input")[0].checked = true;
        this.drawGrid();
    }

    this.mousedrag = false;
    this.addMouseListener();

    this.inUse.click();
}

__CANVAS.getGridSize = function () {
    return Math.min(Math.floor(this.canvasElement.width / this.imageResolution.col),
        Math.floor(this.canvasElement.height / this.imageResolution.row));
}

__CANVAS.setImageResolution = function (imageResolution) {
    this.imageResolution = imageResolution;
    this.pixelContext = newTwoDimensionalArray(imageResolution.row, imageResolution.col);
    this.gridSize = this.getGridSize();
    this.canvasWidth = imageResolution.col * this.gridSize;
    this.canvasHeight = imageResolution.row * this.gridSize;
    this.offsetX = Math.floor((this.canvasElement.width - this.canvasWidth) / 2);
    this.offsetY = Math.floor((this.canvasElement.height - this.canvasHeight) / 2);
}

__CANVAS.drawGrid = function () {
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

__CANVAS.removeGrid = function () {
    this.gridContext.clearRect(this.offsetX, this.offsetY, this.canvasWidth, this.canvasHeight);
}


__CANVAS.changeToolCallback = function (id) {

    switch (id) {
        case 'PEN':
            this.canvasElement.style.cursor = "crosshair";
            break;
        case 'ERASE':
            this.canvasElement.style.cursor = "help";
            break;
        case 'TOGGLE_GRID':
            this.toggleGridDisplay();
            break;
        case 'UNDO':
            this.onUndo();
            break;
        case 'REDO':
            this.onRedo();
            break;
        case 'CLEAR':
            this.clearCanvas();
        case 'FILL':
            this.canvasElement.style.cursor = "cell";
    }
}

__CANVAS.isInCanvas = function (x, y) {
    if (x < this.offsetX || x >= this.canvasWidth + this.offsetX || y < this.offsetY || y >= this.canvasHeight + this.offsetY) {
        return false;
    }
    return true;
}

__CANVAS.tranformCoordinateToCanvas = function (x, y) {
    var col = Math.floor((x - this.offsetX) / this.gridSize);
    var row = Math.floor((y - this.offsetY) / this.gridSize);
    return { row, col };
}

__CANVAS.setPixelContext = function ({ row, col }, color) {
    this.pixelContext[row][col] = color;
}

__CANVAS.getPixelContext = function ({ row, col }) {
    return this.pixelContext[row][col];
}

__CANVAS.usePen = function (pos, _color) {
    const color = _color || this.color;
    this.setPixelContext(pos, color);
    this.canvasContext.fillStyle = color;
    this.canvasContext.fillRect(this.offsetX + pos.col * this.gridSize, this.offsetY + pos.row * this.gridSize, this.gridSize, this.gridSize);
}

__CANVAS.useErase = function (pos) {
    this.setPixelContext(pos, '');
    this.canvasContext.clearRect(this.offsetX + pos.col * this.gridSize, this.offsetY + pos.row * this.gridSize, this.gridSize, this.gridSize);
}

__CANVAS.useFill = function (pos) {
    const willReplaceColor = this.getPixelContext(pos);
    if (willReplaceColor == this.color) return;

    const queue = [pos];
    const visit = newTwoDimensionalArray(this.imageResolution.row, this.imageResolution.col);
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    while (queue.length) {
        const pos = queue[0];
        queue.shift();

        visit[pos.row][pos.col] = true;
        if (this.getPixelContext(pos) != willReplaceColor) continue;

        this.usePen(pos);

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
}

__CANVAS.clearCanvas = function () {
    this.historyStack.push({ pixelContext: this.pixelContext, action: "clearCanvas" });
    this.pixelContext = newTwoDimensionalArray(this.imageResolution.row, this.imageResolution.col);
    this.canvasContext.clearRect(this.offsetX, this.offsetY, this.canvasWidth, this.canvasHeight);
}

__CANVAS.drawByPixelContext = function () {
    this.pixelContext.forEach((rowColor, row) => {
        rowColor.forEach((color, col) => {
            this.canvasContext.fillStyle = color;
            this.canvasContext.fillRect(this.offsetX + col * this.gridSize, this.offsetY + row * this.gridSize, this.gridSize, this.gridSize);
        })
    });
}

__CANVAS.paint = function paint(action) {
    const { x, y } = action;
    if (!this.isInCanvas(x, y)) return;
    const pos = this.tranformCoordinateToCanvas(x, y);
    const color = this.getPixelContext(pos);

    this.undoStack.length = 0;

    switch (this.inUse.id) {
        case "PEN":
            if (this.color != color) {
                this.usePen(pos);
                this.historyStack.push({ color: this.color, pos, action: "usePen" });
            }
            break;
        case "ERASE":
            if (color) {
                this.useErase(pos);
                this.historyStack.push({ color, pos, action: "useErase" });
            }
            break;
        case 'FILL':
            if (this.color != color) {
                this.useFill(pos);
            }
        default:
            break;
    }
    return true;
}

__CANVAS.onRedo = function () {
    const { length } = this.undoStack;
    if (length == 0) return;

    const record = this.undoStack[length - 1];
    const { action, pos, color } = record;
    this.historyStack.push(record);
    this.undoStack.pop();

    switch (action) {
        case "usePen":
            this.usePen(pos, color);
            break;
        case "useErase":
            this.useErase(pos);
            break;
        case "clearCanvas":
            this.clearCanvas();
            break;
    }
}

__CANVAS.onUndo = function () {
    const { length } = this.historyStack;
    if (length == 0) return;

    const record = this.historyStack[length - 1];
    this.undoStack.push(record);
    this.historyStack.pop();

    const { action, pos, color } = record;
    switch (action) {
        case "usePen":
            this.useErase(pos);
            break;
        case "useErase":
            this.usePen(pos, color);
            break;
        case "clearCanvas":
            this.pixelContext = record.pixelContext;
            this.drawByPixelContext();
            break;
    }
}

__CANVAS.toggleGridDisplay = function () {
    const checkBox = this.toggleGridElement.getElementsByTagName("input")[0];
    if (checkBox.checked) {
        this.drawGrid();
    } else {
        this.removeGrid();
    }
}

__CANVAS.addMouseListener = function () {
    this.canvasElement.onmousedown = (e) => {
        this.mousedrag = true;
    };

    this.canvasElement.onclick = (e) => {
        var { clientX, clientY } = e;
        this.paint({ x: clientX, y: clientY });
    }

    this.canvasElement.onmousemove = (e) => {
        if (this.mousedrag) {
            var { clientX, clientY } = e;
            this.paint({ x: clientX, y: clientY });
        }
    };

    this.canvasElement.onmouseleave = (e) => {
        this.mousedrag = false;
    }

    this.canvasElement.onmouseup = (e) => {
        this.mousedrag = false;
    };
}


// 主函数
function main() {
    const pixel = Object.create(__CANVAS);
    CANVAS.width = GRID.width = window.innerWidth;
    CANVAS.height = GRID.height = window.innerHeight;
    pixel.initCanvas({
        canvasElement: CANVAS,
        gridElement: GRID,
        toolBarElement: TOOL_BAR,
        toggleGridElement: TOGGLE_GRID,
        inUse: PEN,
        color: "rgb(0,123,255)",
        colorSelector: {
            sliderR: R, sliderG: G, sliderB: B, colorDisplayElement: COLOR_DISPLAY,
        },
        isGridDisplayed: true,
        imageResolution: { row: 40, col: 60 }
    });
}

main();

// 实现填充(todo: undo、redo)
// 修改颜色
// 修改颜色转换
// resize??
// 按钮防抖
