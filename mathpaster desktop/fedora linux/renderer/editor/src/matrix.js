import { state } from './state.js';
import { mf } from './dom.js';

/* ── Matrix Selector Logic ── */
let currentMatrixType = null;
const matrixSelector = document.getElementById("matrix-selector");

export function buildMatrixSelectorUI() {
  if (!matrixSelector) return;
  matrixSelector.innerHTML = "";
  
  const gridContainer = document.createElement("div");
  gridContainer.style.display = "flex";
  gridContainer.style.flexDirection = "column";
  gridContainer.style.gap = "6px";
  
  for (let r = 1; r <= 5; r++) {
    const row = document.createElement("div");
    row.className = "matrix-row";
    for (let c = 1; c <= 5; c++) {
      const cell = document.createElement("div");
      cell.className = "matrix-cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener("mouseenter", () => highlightGrid(r, c));
      cell.addEventListener("click", () => {
        insertMatrix(currentMatrixType, r, c);
        hideMatrixSelector();
      });
      row.appendChild(cell);
    }
    gridContainer.appendChild(row);
  }
  
  const label = document.createElement("div");
  label.id = "matrix-label";
  label.textContent = "1 x 1";
  
  matrixSelector.appendChild(gridContainer);
  matrixSelector.appendChild(label);
}

function highlightGrid(rows, cols) {
  const cells = document.querySelectorAll(".matrix-cell");
  cells.forEach(cell => {
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);
    if (r <= rows && c <= cols) {
      cell.classList.add("highlight");
    } else {
      cell.classList.remove("highlight");
    }
  });
  const label = document.getElementById("matrix-label");
  if(label) label.textContent = `${rows} x ${cols}`;
}

export function showMatrixSelector(anchorBtn, type) {
  currentMatrixType = type;
  const rect = anchorBtn.getBoundingClientRect();
  
  let leftPos = rect.left;
  if (leftPos + 180 > window.innerWidth) {
    leftPos = window.innerWidth - 180;
  }
  matrixSelector.style.left = `${Math.max(10, leftPos)}px`;
  
  // Try placing it below the button
  let topPos = rect.bottom + 6;
  // If it goes past bottom screen (approx 500px), place it above
  if (topPos + 180 > window.innerHeight) {
    topPos = rect.top - 180 - 6;
  }
  matrixSelector.style.top = `${topPos}px`;
  
  matrixSelector.classList.add("visible");
  highlightGrid(1, 1);
}

function hideMatrixSelector() {
  if(matrixSelector) matrixSelector.classList.remove("visible");
}

function insertMatrix(type, rows, cols) {
  if (!state.mfReady) return;
  // generate latex
  let inner = "";
  for (let r = 0; r < rows; r++) {
    let rowContent = [];
    for (let c = 0; c < cols; c++) {
      rowContent.push("#?");
    }
    inner += rowContent.join(" & ") + (r < rows - 1 ? " \\\\ " : "");
  }
  const latex = `\\begin{${type}}${inner}\\end{${type}}`;
  mf.executeCommand(["insert", latex]);
  window.focus();
  mf.focus();
}

document.addEventListener("click", e => {
  if (matrixSelector && matrixSelector.classList.contains("visible")) {
    if (!matrixSelector.contains(e.target) && !e.target.closest('.pal-btn')) {
      hideMatrixSelector();
    }
  }
});
