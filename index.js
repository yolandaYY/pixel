'use strict'

// 工具函数

function drawLineToContext(context, sx, sy, ex, ey) {
    context.beginPath();
    context.moveTo(sx, sy);
    context.lineTo(ex, ey);
    // context.closePath();
    context.stroke();
}

function drawLineargradientLine(ctx, width, height, col, color) {
    const lineargradient = ctx.createLinearGradient(0, 0, 0, height);
    lineargradient.addColorStop(0, "#000");
    lineargradient.addColorStop(0.5, color);
    lineargradient.addColorStop(1, "#fff");
    ctx.fillStyle = lineargradient;
    ctx.fillRect(col * width, 0, width * 2, height);
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

function createDownLoad(link) {
    const a = document.createElement("a");
    a.href = link;
    a.download = "我的作品";
    a.click();
}


// 工具对象
const __TOOL = {};
__TOOL.initTool = function ({ toolBarElement, paletteElement,
    color, inUse, changeToolCallback }) {

    this.toolBarElement = toolBarElement;
    this.paletteElement = paletteElement;

    this.colorFormatElement = this.paletteElement.getElementsByTagName("input")[0]
    this.colorSelectorElement = this.paletteElement.getElementsByTagName("canvas")[0];
    this.colorSelectorContext = this.colorSelectorElement.getContext("2d");


    this.inUse = inUse;
    this.displayColorSelector = false;
    this.updateCurrentColor(color);
    this.drawLineargradientSelector(color);

    this.isDragToolBar = false;
    this.addToolBarListener(changeToolCallback);
}

__TOOL.addToolBarListener = function (changeToolCallback) {

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

        if (typeArr[0] == "COLOR_SELECTOR") {
            const imageData = this.colorSelectorContext.getImageData(e.offsetX, e.offsetY, 1, 1);
            if (imageData.data.length > 3) {
                this.updateCurrentColor(`rgb(${imageData.data[0]},${imageData.data[1]}, ${imageData.data[2]})`);
            }
        }

        if (typeArr[0] == "CURRENT_COLOR") {
            this.displayColorSelector = !this.displayColorSelector;
            this.colorSelectorElement.className = this.displayColorSelector ? "visible" : "hidden";
        }

        changeToolCallback(typeArr[0]);
    }

    this.colorFormatElement.onblur = (e) => {
        const { value } = e.currentTarget;
        this.updateCurrentColor(isLegalColor(value) ? value : this.color);
    }
}

__TOOL.changeInUse = function (element) {
    this.inUse.className = this.inUse.className.replace(' use', '');
    this.inUse = element;
    this.inUse.className = this.inUse.className + " use";
}

__TOOL.updateCurrentColor = function (color) {
    this.color = color;
    this.paletteElement.firstElementChild.style.backgroundColor = color;
    this.colorFormatElement.value = color;
}

// TODO: refactor
__TOOL.drawLineargradientSelector = function () {
    const { width, height } = this.colorSelectorElement;
    const colors = [
        "#cf010b", "#eb7012", "#f19914", "#f7c71b",
        "#fdf21c", "#cade1b", "#96c71e", "#65af1c",
        "#019219", "#019678", "#0195a3", "#0197ca",
        "#0198f1", "#007dd1", "#0162b3", "#004593",
        "#000267", "#51005c", "#7b014a", "#a40037",
    ];
    const lineWidth = width / (colors.length + 1);
    const drawLine = drawLineargradientLine.bind(this, this.colorSelectorContext, lineWidth, height);
    colors.forEach((color, idx) => {
        drawLine(idx, color);
    });
    const lineargradient = this.colorSelectorContext.createLinearGradient(0, 0, 0, height);
    lineargradient.addColorStop(0.1, "#000");
    lineargradient.addColorStop(0.9, "#fff");
    this.colorSelectorContext.fillStyle = lineargradient;
    this.colorSelectorContext.fillRect(colors.length * lineWidth, 0, lineWidth * 2, height);
}


// 画布对象
const __CANVAS = Object.create(__TOOL);

__CANVAS.initCanvas = function (args) {
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

    this.copySelectElement.width = this.canvasWidth;
    this.copySelectElement.height = this.canvasHeight;
    this.copySelectElement.style.top = this.offsetY + "px";
    this.copySelectElement.style.left = this.offsetX + "px";
    this.copySelectContext = this.copySelectElement.getContext("2d");
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

__CANVAS.startCopy = function () {
    this.pasteBarElement.className = 'visible';
    this.toolBarElement.className = 'hidden';
    this.colorSelectorElement.className = 'hidden';
}

__CANVAS.closeCopy = function () {
    this.inUse.click();
    this.pasteBarElement.className = 'hidden';
    this.toolBarElement.className = 'visible';
    this.copyRect = {};
    this.isStartPaste = false;
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
            break;
        case 'FILL':
            this.canvasElement.style.cursor = "cell";
            break;
        case 'COLOR_PICKER':
            this.canvasElement.style.cursor = "unset";
            break;
        case 'COPY':
            this.startCopy();
            break;
        case 'DOWNLOAD_IMAGE':
            createDownLoad(this.canvasElement.toDataURL());
            break;
        default:
            break;
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
    this.setPixelContext(pos, undefined);
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

__CANVAS.paint = function (action) {
    const { x, y } = action;
    if (!this.isInCanvas(x, y)) return;
    const pos = this.tranformCoordinateToCanvas(x, y);
    const color = this.getPixelContext(pos);
    const { toolType } = this.inUse.dataset;
    const typeArr = toolType.split('-');

    switch (typeArr[0]) {
        case "PEN":
            if (this.color != color) {
                this.usePen(pos);
                this.historyStack.push({ willReplaceColor: color, paintColor: this.color, pos, action: "usePen" });
                this.undoStack.length = 0;
            }
            break;
        case "ERASE":
            if (color) {
                this.useErase(pos);
                this.historyStack.push({ willReplaceColor: color, pos, action: "useErase" });
                this.undoStack.length = 0;
            }
            break;
        case 'FILL':
            if (this.color != color) {
                this.historyStack.push({ willReplaceColor: color, paintColor: this.color, fillPixelContent: this.useFill(pos), action: "useFill" });
                this.undoStack.length = 0;
            }
            break;
        case 'COLOR_PICKER':
            if (color && this.color != color) {
                this.updateCurrentColor(color);
            }
            break;
        default:
            break;
    }
    return true;
}

__CANVAS.onRedo = function () {
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

__CANVAS.onUndo = function () {
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

__CANVAS.usePaste = function (e) {
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

__CANVAS.toggleGridDisplay = function () {
    this.isGridDisplayed = !this.isGridDisplayed;
    if (this.isGridDisplayed) {
        this.drawGrid();
    } else {
        this.removeGrid();
    }
}

__CANVAS.addMouseListener = function () {
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
        switch (e.target.dataset.toolType) {
            case "PASTE_CLOSE-CLICK":
                this.closeCopy();
                break;
            case "PASTE-CLICK":
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
    const pixel = Object.create(__CANVAS);
    CANVAS.width = GRID.width = window.innerWidth;
    CANVAS.height = GRID.height = window.innerHeight;

    const toolBarSize = TOOL_BAR.getBoundingClientRect();
    COLOR_SELECTOR.width = toolBarSize.width * 1.5;
    COLOR_SELECTOR.height = toolBarSize.width * 1.5;
    COLOR_SELECTOR.style.top = toolBarSize.bottom - COLOR_SELECTOR.width + "px";
    COLOR_SELECTOR.style.left = toolBarSize.right + "px";

    pixel.initCanvas({
        canvasElement: CANVAS,
        gridElement: GRID,
        toolBarElement: TOOL_BAR,
        inUse: PEN.firstElementChild,
        color: "rgb(0,123,255)",
        paletteElement: PALETTE,
        pasteBarElement: PASTE_BAR,
        isGridDisplayed: true,
        imageResolution: { row: 60, col: 100 }
    });
}

document.body.onload = function () {
    main();
}

// 镜像复制(TODO: undo、redo)
// 颜色盘
// 包装一个拖拽控件
// resize?? 兼容触摸屏？
// 按钮防抖
