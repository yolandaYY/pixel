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
__TOOL.initTool = function ({ penElement, eraseElement, colorSelector, inUse, color }) {
    this.penElement = penElement;
    this.eraseElement = eraseElement;
    this.colorSelector = colorSelector;

    this.inUse = inUse;
    this.color = color;
    this.updateColorDisplay();

    this.penElement.onclick = this.selected.bind(this);
    this.eraseElement.onclick = this.selected.bind(this);

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
}

__TOOL.selected = function (e) {
    this.inUse.className = "tool";
    this.inUse = e.currentTarget;
    this.inUse.className = "tool use";
}

__TOOL.updateColorDisplay = function () {
    this.colorSelector.colorDisplayElement.style.backgroundColor = this.color;
}



// 画布对象
const __CANVAS = Object.create(__TOOL);

__CANVAS.initCanvas = function (args) {
    this.initTool(args);

    const { canvasElement, gridElement, imageResolution = { x: 50, y: 50 } } = args;

    this.canvasElement = canvasElement;
    this.gridElement = gridElement;

    this.canvasContext = canvasElement.getContext("2d");
    this.gridContext = gridElement.getContext("2d");
    this.pixelContext = newTwoDimensionalArray(imageResolution.x, imageResolution.y);

    // 限制大小 1000
    this.historyStack = [];
    this.undoStack = [];

    this.imageResolution = imageResolution;

    this.gridSize = this.getGridSize();
    this.offsetX = window.innerWidth - canvasElement.width;
    this.offsetY = window.innerHeight - canvasElement.height;
}

__CANVAS.getGridSize = function () {
    return Math.min(Math.floor(this.canvasElement.width / this.imageResolution.x,
        Math.floor(this.canvasElement.height / this.imageResolution.y)));
}

__CANVAS.setImageResolution = function (imageResolution) {
    this.imageResolution = imageResolution;
    this.pixelContext = newTwoDimensionalArray(imageResolution.x, imageResolution.y);
    this.gridSize = this.getGridSize();
}

__CANVAS.drawGrid = function () {
    const endX = this.offsetX + this.imageResolution.x * this.gridSize;
    const endY = this.offsetY + this.imageResolution.y * this.gridSize;
    for (let i = 0; i <= this.imageResolution.x; ++i) {
        drawLineToContext(this.gridContext, this.gridSize * i, 0, this.gridSize * i, endX);
    }
    for (let i = 0; i <= this.imageResolution.y; ++i) {
        drawLineToContext(this.gridContext, 0, this.gridSize * i, endY, this.gridSize * i);
    }
}

__CANVAS.eraseGrid = function () {
    this.gridContext.clearRect(0, 0, this.gridElement.width, this.gridElement.height);
}

__CANVAS.isInCanvas = function (x, y) {
    const endX = this.offsetX + this.imageResolution.x * this.gridSize;
    const endY = this.offsetY + this.imageResolution.y * this.gridSize;
    if (x < this.offsetX || x >= endX || y < this.offsetY || y >= endY) {
        return false;
    }
    return true;
}

__CANVAS.tranformCoordinateToCanvas = function (x, y) {
    var col = Math.floor((x - this.offsetX) / this.gridSize);
    var row = Math.floor((y - this.offsetY) / this.gridSize);
    return { x: col * this.gridSize, y: row * this.gridSize };
}

__CANVAS.setPixelContext = function (pos, color) {
    this.pixelContext[Math.floor(pos.x / this.gridSize)][Math.floor(pos.y / this.gridSize)] = color;
}

__CANVAS.getPixelContext = function (pos) {
    return this.pixelContext[Math.floor(pos.x / this.gridSize)][Math.floor(pos.y / this.gridSize)];
}

__CANVAS.usePen = function (pos, _color) {
    const color = _color || this.color;
    this.setPixelContext(pos, color);

    this.canvasContext.fillStyle = color;
    this.canvasContext.fillRect(pos.x, pos.y, this.gridSize, this.gridSize);
}

__CANVAS.useErase = function (pos) {
    this.setPixelContext(pos, '');
    this.canvasContext.clearRect(pos.x, pos.y, this.gridSize, this.gridSize);
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
        default:
            break;
    }
    return true;
}


// 整体
const __PIXEL = Object.create(__CANVAS);
__PIXEL.init = function (args) {
    this.initCanvas(args);

    const { toggleGridElement, undoElement, redoElement, isGridDisplayed } = args;
    this.toggleGridElement = toggleGridElement;
    this.undoElement = undoElement;
    this.redoElement = redoElement;

    this.undoElement.onclick = this.onUndo.bind(this);
    this.redoElement.onclick = this.onRedo.bind(this);
    this.toggleGridElement.onclick = this.toggleGridDisplay.bind(this);

    this.mouseListener = [];
    this.mousedrag = false;
    this.isGridDisplayed = isGridDisplayed;
    isGridDisplayed && this.drawGrid();

    this.addMouseListener();
}

__PIXEL.onRedo = function (e) {
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

    }
}

__PIXEL.onUndo = function (e) {
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
    }
}

__PIXEL.toggleGridDisplay = function () {
    if (this.isGridDisplayed) {
        this.eraseGrid();
        this.isGridDisplayed = false;
    } else {
        this.drawGrid();
        this.isGridDisplayed = true;
    }
}


// 修改为元素的监听事件
__PIXEL.addMouseListener = function () {
    this.mouseListener.push(window.addEventListener("mousedown", (e) => {
        this.mousedrag = true;
    }));

    this.mouseListener.push(window.addEventListener("mousemove", (e) => {
        if (this.mousedrag) {
            var { clientX, clientY } = e;
            this.paint({ x: clientX, y: clientY });
        }
    }));

    this.mouseListener.push(window.addEventListener("mouseup", (e) => {
        this.mousedrag = false;
    }));
}

__PIXEL.removeMouseListener = function () {
    this.mouseListener.forEach(id => window.removeEventListener(id));
}


// 主函数
function main() {
    const pixel = Object.create(__PIXEL);
    CANVAS.width = GRID.width = Math.floor(window.innerWidth * 0.8);
    CANVAS.height = GRID.height = window.innerHeight;
    pixel.init({
        canvasElement: CANVAS,
        gridElement: GRID,
        toggleGridElement: TOGGLE_GRID,
        penElement: PEN,
        eraseElement: ERASE,
        redoElement: REDO,
        undoElement: UNDO,
        inUse: PEN,
        color: "rgb(0,123,255)",
        colorSelector: {
            sliderR: R, sliderG: G, sliderB: B, colorDisplayElement: COLOR_DISPLAY,
        },
        isGridDisplayed: true,
        imageResolution: { x: 50, y: 50 }
    });
}

main();