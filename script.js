const canvas = document.getElementById('canvas');
const colorPicker = document.getElementById('colorPicker');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const undoBtn = document.getElementById('undoBtn');
const eraseBtn = document.getElementById('eraseBtn');
const canvasSizeSelect = document.getElementById('canvasSize');
const resetCanvasBtn = document.getElementById('resetCanvasBtn');
const uploadImageInput = document.getElementById('uploadImage');

let ROWS = 50;  // 默认中等大小
let COLS = 50;
let isDrawing = false;

// 撤销功能相关
let history = [];
let currentHistoryIndex = -1;

// 初始化画布
function initCanvas() {
  canvas.innerHTML = '';
  canvas.style.width = `${COLS * 20}px`;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const pixel = document.createElement('div');
      pixel.classList.add('pixel');
      pixel.dataset.row = row;
      pixel.dataset.col = col;
      pixel.title = '右键可提取颜色'; // 提示

      // 左键点击绘画
      pixel.addEventListener('click', () => {
        saveState();
        pixel.style.backgroundColor = colorPicker.value;
      });

      // 鼠标拖动绘画
      pixel.addEventListener('mouseenter', () => {
        if (isDrawing) {
          saveState();
          pixel.style.backgroundColor = colorPicker.value;
        }
      });

      // 右键提取颜色
      pixel.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        const bgColor = window.getComputedStyle(pixel).backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          colorPicker.value = rgbToHexStr(bgColor);
        }
      });

      canvas.appendChild(pixel);
    }
  }

  // 设置网格线状态
  const gridToggle = document.getElementById('gridToggle');
  updateGridLines(gridToggle.checked);
}

// 清除画布
clearBtn.addEventListener('click', () => {
  saveState();
  document.querySelectorAll('.pixel').forEach(p => {
    p.style.backgroundColor = '#ffffff';
  });
});

// 导出为图片
exportBtn.addEventListener('click', () => {
  html2canvas(canvas).then(canvas => {
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = canvas.toDataURL();
    link.click();
  });
});

// 撤销功能
undoBtn.addEventListener('click', () => {
  if (currentHistoryIndex > 0) {
    currentHistoryIndex--;
    restoreState(history[currentHistoryIndex]);
  }
});

function saveState() {
  if (currentHistoryIndex < history.length - 1) {
    history = history.slice(0, currentHistoryIndex + 1);
  }
  const currentState = [];
  document.querySelectorAll('.pixel').forEach(pixel => {
    currentState.push({
      row: pixel.dataset.row,
      col: pixel.dataset.col,
      color: pixel.style.backgroundColor
    });
  });
  history.push(currentState);
  currentHistoryIndex++;
}

function restoreState(state) {
  state.forEach(pixelData => {
    const pixel = canvas.querySelector(`.pixel[data-row="${pixelData.row}"][data-col="${pixelData.col}"]`);
    if (pixel) {
      pixel.style.backgroundColor = pixelData.color;
    }
  });
}

// 橡皮：设置颜色为白色
eraseBtn.addEventListener('click', () => {
  colorPicker.value = '#ffffff';
});

// 重置画布
resetCanvasBtn.addEventListener('click', () => {
  const size = parseInt(canvasSizeSelect.value);
  ROWS = size;
  COLS = size;
  initCanvas();
});

// 滑动绘制功能
canvas.addEventListener('mousedown', () => {
  isDrawing = true;
});

window.addEventListener('mouseup', () => {
  isDrawing = false;
});

canvas.addEventListener('mouseleave', () => {
  isDrawing = false;
});

// ===== 裁剪相关 DOM =====
const cropContainer = document.createElement('div');
cropContainer.id = 'cropContainer';
cropContainer.style.position = 'fixed';
cropContainer.style.top = '50%';
cropContainer.style.left = '50%';
cropContainer.style.transform = 'translate(-50%, -50%)';
cropContainer.style.maxWidth = window.innerWidth * 0.9 + 'px';
cropContainer.style.maxHeight = window.innerHeight * 0.9 + 'px';
cropContainer.style.overflow = 'auto';
cropContainer.style.border = '1px solid #ccc';
cropContainer.style.background = '#eee';
cropContainer.style.zIndex = '9999';
cropContainer.style.display = 'none';

const cropCanvas = document.createElement('canvas');
cropCanvas.id = 'cropCanvas';
cropContainer.appendChild(cropCanvas);

document.body.appendChild(cropContainer);

// ===== 确认裁剪按钮（右上角固定） =====
const confirmBtn = document.createElement('button');
confirmBtn.id = 'confirmBtn';
confirmBtn.textContent = '确认裁剪';
confirmBtn.style.position = 'fixed';
confirmBtn.style.top = '20px';
confirmBtn.style.right = '20px';
confirmBtn.style.zIndex = '10000';
confirmBtn.style.padding = '10px 15px';
confirmBtn.style.fontSize = '16px';
confirmBtn.style.display = 'none';
document.body.appendChild(confirmBtn);

// 添加遮罩层
const overlay = document.createElement('div');
overlay.id = 'overlay';
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.background = 'rgba(0,0,0,0.5)';
overlay.style.zIndex = '9998';
overlay.style.display = 'none';
document.body.appendChild(overlay);

let isSelecting = false;
let startX = 0, startY = 0;
let currentRect = { x: 0, y: 0, size: 0 };
let imgElement = null;

// ===== 图片上传功能 =====
uploadImageInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      imgElement = img;

      // 设置裁剪 canvas 的尺寸为图片原始尺寸
      cropCanvas.width = img.width;
      cropCanvas.height = img.height;

      // 清空之前的绘制
      const ctx = cropCanvas.getContext('2d');
      ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
      ctx.drawImage(img, 0, 0); // 按照原始尺寸绘制

      // 设置裁剪容器自适应图片大小
      cropContainer.style.width = 'auto';
      cropContainer.style.height = 'auto';

      // 显示裁剪界面
      overlay.style.display = 'block';
      cropContainer.style.display = 'block';
      confirmBtn.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// 遮罩层点击事件：关闭裁剪框
overlay.addEventListener('click', () => {
  overlay.style.display = 'none';
  cropContainer.style.display = 'none';
  confirmBtn.style.display = 'none';
});

// ===== 鼠标事件：裁剪框交互 =====
cropCanvas.addEventListener('mousedown', (e) => {
  const rect = cropCanvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  isSelecting = true;
});

cropCanvas.addEventListener('mousemove', (e) => {
  if (!isSelecting || !imgElement) return;

  const rect = cropCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let width = Math.abs(x - startX);
  let height = Math.abs(y - startY);
  let size = Math.min(width, height);

  let minX = Math.min(startX, x);
  let minY = Math.min(startY, y);

  let maxX = Math.min(minX + size, cropCanvas.width);
  let maxY = Math.min(minY + size, cropCanvas.height);

  let finalX = minX;
  let finalY = minY;
  let finalSize = maxX - minX;

  currentRect = {
    x: finalX,
    y: finalY,
    size: finalSize,
  };

  const ctx = cropCanvas.getContext('2d');
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(imgElement, 0, 0); // 不缩放

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(finalX, finalY, finalSize, finalSize);
});

cropCanvas.addEventListener('mouseup', () => {
  isSelecting = false;
});

// ===== 确认裁剪按钮 =====
confirmBtn.addEventListener('click', () => {
  if (!imgElement || currentRect.size <= 0) return;

  const sourceX = currentRect.x;
  const sourceY = currentRect.y;
  const sourceSize = currentRect.size;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = sourceSize;
  tempCanvas.height = sourceSize;
  tempCtx.drawImage(
    imgElement,
    sourceX, sourceY,
    sourceSize, sourceSize,
    0, 0,
    sourceSize, sourceSize
  );

  processAndDrawPixelImage(tempCanvas);
  cropContainer.style.display = 'none';
  confirmBtn.style.display = 'none';
  overlay.style.display = 'none';
});

// 处理图片并绘制到像素格子上
function processAndDrawPixelImage(img) {
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');

  const size = parseInt(canvasSizeSelect.value);
  tempCanvas.width = size;
  tempCanvas.height = size;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size).data;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const index = (row * size + col) * 4;
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const a = imageData[index + 3];

      const hex = rgbToHex(r, g, b, a);
      const pixel = canvas.querySelector(`.pixel[data-row="${row}"][data-col="${col}"]`);
      if (pixel) {
        pixel.style.backgroundColor = hex;
      }
    }
  }
}

// RGB 转 HEX（用于绘制）
function rgbToHex(r, g, b, a = 255) {
  if (a < 128) return '#ffffff00';
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// RGB字符串转 HEX（用于右键取色）
function rgbToHexStr(rgb) {
  let parts = rgb.match(/\d+/g).map(Number);
  return "#" + parts.slice(0, 3).map(x => x.toString(16).padStart(2, '0')).join('');
}

// 网格线开关
document.getElementById('gridToggle').addEventListener('change', function(e) {
  updateGridLines(e.target.checked);
});

function updateGridLines(showGrid) {
  const pixels = document.querySelectorAll('.pixel');
  pixels.forEach(p => {
    p.style.boxShadow = showGrid ? 'inset 0 0 0 1px #ccc' : 'none';
  });
}

// 初始化
initCanvas();