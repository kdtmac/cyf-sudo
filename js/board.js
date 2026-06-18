/**
 * 数独棋盘 - 渲染、交互、高亮
 */
class Board {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.readOnly = options.readOnly || false;
    this.cellSize = options.cellSize || 56;

    this.values = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.given = Array.from({ length: 9 }, () => Array(9).fill(false));
    this.notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    this.selectedRow = null;
    this.selectedCol = null;
    this.highlightSameNum = true;
    this.showAutoCandidates = false;
    this.cells = [];

    this._onCellClick = options.onCellClick || null;
    this._onCellChange = options.onCellChange || null;
    this._onNoteClick = options.onNoteClick || null;
    this._onCellDoubleClick = options.onCellDoubleClick || null;

    this._render();
    this._bindKeyboard();
  }

  _render() {
    this.container.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      this.cells[r] = [];
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        if (c === 2 || c === 5) cell.classList.add('box-right');
        if (r === 2 || r === 5) cell.classList.add('box-bottom');

        cell.addEventListener('click', () => this._handleClick(r, c));
        cell.addEventListener('dblclick', () => this._handleDoubleClick(r, c));

        this.container.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }
  }

  _bindKeyboard() {
    this._keyHandler = (e) => {
      if (this.selectedRow === null || this.selectedCol === null) return;
      let nr = this.selectedRow;
      let nc = this.selectedCol;

      switch (e.key) {
        case 'ArrowUp': nr = Math.max(0, nr - 1); e.preventDefault(); break;
        case 'ArrowDown': nr = Math.min(8, nr + 1); e.preventDefault(); break;
        case 'ArrowLeft': nc = Math.max(0, nc - 1); e.preventDefault(); break;
        case 'ArrowRight': nc = Math.min(8, nc + 1); e.preventDefault(); break;
        default: return;
      }
      this.selectCell(nr, nc);
      if (this._onCellClick) this._onCellClick(nr, nc);
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    this.container.innerHTML = '';
  }

  _handleClick(r, c) {
    this.selectCell(r, c);
    if (this._onCellClick) this._onCellClick(r, c);
  }

  _handleDoubleClick(r, c) {
    if (this._onCellDoubleClick) this._onCellDoubleClick(r, c);
  }

  selectCell(r, c) {
    this.selectedRow = r;
    this.selectedCol = c;
    this.updateHighlights();
  }

  loadPuzzle(puzzle, givenMask) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this.values[r][c] = puzzle[r][c];
        this.given[r][c] = givenMask ? givenMask[r][c] : (puzzle[r][c] !== 0);
        this.notes[r][c] = new Set();
      }
    }
    this.selectedRow = null;
    this.selectedCol = null;
    this._paintAll();
  }

  setValue(r, c, value, isGiven) {
    this.values[r][c] = value;
    if (value !== 0 && isGiven !== undefined) this.given[r][c] = isGiven;
    this.notes[r][c] = new Set();
    this._paintCell(r, c);
  }

  getValue(r, c) {
    return this.values[r][c];
  }

  setNote(r, c, num) {
    if (this.given[r][c] || this.values[r][c] !== 0) return;
    if (this.notes[r][c].has(num)) {
      this.notes[r][c].delete(num);
    } else {
      this.notes[r][c].add(num);
    }
    this._paintCell(r, c);
  }

  clearNotes(r, c) {
    if (this.given[r][c]) return;
    this.notes[r][c] = new Set();
    this._paintCell(r, c);
  }

  getNotes(r, c) {
    return new Set(this.notes[r][c]);
  }

  setAutoCandidates(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.values[r][c] === 0 && !this.given[r][c]) {
          const used = new Set();
          for (let cc = 0; cc < 9; cc++) if (grid[r][cc] !== 0) used.add(grid[r][cc]);
          for (let rr = 0; rr < 9; rr++) if (grid[rr][c] !== 0) used.add(grid[rr][c]);
          const br = Math.floor(r / 3) * 3;
          const bc = Math.floor(c / 3) * 3;
          for (let rr = br; rr < br + 3; rr++) {
            for (let cc = bc; cc < bc + 3; cc++) {
              if (grid[rr][cc] !== 0) used.add(grid[rr][cc]);
            }
          }
          this.notes[r][c] = new Set();
          for (let n = 1; n <= 9; n++) {
            if (!used.has(n)) this.notes[r][c].add(n);
          }
        }
      }
    }
    this._paintAll();
  }

  clearAutoCandidates() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this.notes[r][c] = new Set();
      }
    }
    this._paintAll();
  }

  getCurrentGrid() {
    return this.values.map(row => [...row]);
  }

  getGivenMask() {
    return this.given.map(row => [...row]);
  }

  updateHighlights() {
    const selR = this.selectedRow;
    const selC = this.selectedCol;
    const selVal = (selR !== null && selC !== null && this.values[selR][selC] !== 0)
      ? this.values[selR][selC] : null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = this.cells[r][c];
        cell.classList.remove('selected', 'related', 'same-num');

        if (selR === r && selC === c) {
          cell.classList.add('selected');
          continue;
        }

        const sameRow = selR === r;
        const sameCol = selC === c;
        const sameBox = Math.floor(r / 3) === Math.floor(selR / 3) &&
                        Math.floor(c / 3) === Math.floor(selC / 3);

        if (selR !== null && (sameRow || sameCol || sameBox)) {
          cell.classList.add('related');
        }

        if (this.highlightSameNum && selVal !== null && this.values[r][c] === selVal && this.values[r][c] !== 0) {
          cell.classList.add('same-num');
        }
      }
    }
    this._updateNoteHighlights();
  }

  /**
   * 高亮所有笔记（小字）中与当前选中数字相同的候选数
   */
  _updateNoteHighlights() {
    // 先清除所有已有的笔记高亮
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = this.cells[r][c];
        const spans = cell.querySelectorAll('.notes span.hl-note');
        spans.forEach(s => s.classList.remove('hl-note'));
      }
    }

    if (!this.highlightSameNum) return;
    const selVal = (this.selectedRow !== null && this.selectedCol !== null && this.values[this.selectedRow][this.selectedCol] !== 0)
      ? this.values[this.selectedRow][this.selectedCol] : null;
    if (selVal === null) return;

    // 给所有笔记中与 selVal 相同的数字加高亮
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.values[r][c] !== 0) continue; // 只处理有笔记的格子
        const cell = this.cells[r][c];
        const notesGrid = cell.querySelector('.notes');
        if (!notesGrid) continue;
        const spans = notesGrid.querySelectorAll('span');
        spans.forEach(span => {
          if (span.textContent === String(selVal)) {
            span.classList.add('hl-note');
          }
        });
      }
    }
  }

  highlightErrors(errors) {
    for (const { row, col } of errors) {
      if (row >= 0 && row < 9 && col >= 0 && col < 9) {
        this.cells[row][col].classList.add('error');
      }
    }
  }

  clearErrors() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this.cells[r][c].classList.remove('error');
      }
    }
  }

  highlightHint(cells) {
    for (const { row, col } of cells) {
      if (row >= 0 && row < 9 && col >= 0 && col < 9) {
        this.cells[row][col].classList.add('hint-cell');
        setTimeout(() => this.cells[row][col].classList.remove('hint-cell'), 1200);
      }
    }
  }

  clearAllHighlights() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = this.cells[r][c];
        cell.classList.remove('selected', 'related', 'same-num', 'error', 'hint-cell');
      }
    }
  }

  updateNumberExhaustion() {
    const counts = {};
    for (let n = 1; n <= 9; n++) counts[n] = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.values[r][c] !== 0) counts[this.values[r][c]]++;
      }
    }
    return counts;
  }

  _paintAll() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        this._paintCell(r, c);
      }
    }
    this.updateHighlights();
  }

  _paintCell(r, c) {
    const cell = this.cells[r][c];
    const val = this.values[r][c];
    const notes = this.notes[r][c];

    cell.classList.remove('given', 'user');
    cell.innerHTML = '';

    if (val !== 0) {
      cell.textContent = val;
      cell.classList.add(this.given[r][c] ? 'given' : 'user');
    } else if (notes.size > 0) {
      const notesGrid = document.createElement('div');
      notesGrid.className = 'notes';
      for (let n = 1; n <= 9; n++) {
        const span = document.createElement('span');
        if (notes.has(n)) {
          span.textContent = n;
          span.style.cursor = 'pointer';
          span.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发 cell 的 click
            if (this._onNoteClick) this._onNoteClick(r, c, n);
          });
        } else {
          span.textContent = '';
        }
        notesGrid.appendChild(span);
      }
      cell.appendChild(notesGrid);
    }
  }

  focus() {
    this.container.focus();
  }
}
