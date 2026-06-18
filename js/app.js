/**
 * 主程序 - 游戏状态管理、输入处理、胜利检测
 */
const App = {
  board: null,
  puzzle: null,
  solution: null,
  difficulty: 'medium',
  pencilMode: false,
  mistakes: 0,
  hintsUsed: 0,
  undoStack: [],
  redoStack: [],
  gameStarted: false,
  gameCompleted: false,
  _saveTimeout: null,

  init() {
    this.board = new Board('sudoku-board', {
      onCellClick: (r, c) => this._onCellSelect(r, c),
      onNoteClick: (r, c, num) => this._onNoteClick(r, c, num),
      onCellDoubleClick: (r, c, hlVal) => this._onCellDoubleClick(r, c, hlVal),
    });

    UI.init(this);

    const saved = Storage.loadGame();
    if (saved) {
      this._loadGame(saved);
    } else {
      this.startNewGame('medium');
    }
  },

  /* ========== Game Lifecycle ========== */
  async startNewGame(difficulty) {
    this.difficulty = difficulty;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.pencilMode = false;
    this.gameCompleted = false;
    this.gameStarted = false;

    UI.showLoading(difficulty);
    try {
      const result = await Generator.generate(difficulty, {
        onProgress: (a, max) => UI.updateLoadingProgress(a, max),
      });
      this.puzzle = result.puzzle.map(row => [...row]);
      this.solution = result.solution;
    } finally {
      UI.hideLoading();
    }

    this.board.loadPuzzle(this.puzzle, this._getGivenMask());

    document.getElementById('btn-pencil').dataset.active = 'false';
    document.getElementById('btn-autocand').dataset.active = 'false';

    UI.updateMistakeDisplay(0);
    UI.updateCellsLeft(this._countEmpty());
    UI.updateHintsUsed(0);
    UI.stopTimer();
    UI._updateTimerDisplay();
    UI.hideHint();
    this._updateNumPad();

    this._saveGame();
  },

  restartGame() {
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.pencilMode = false;
    this.gameCompleted = false;
    this.gameStarted = false;

    this.board.loadPuzzle(this.puzzle, this._getGivenMask());
    document.getElementById('btn-pencil').dataset.active = 'false';
    document.getElementById('btn-autocand').dataset.active = 'false';

    UI.updateMistakeDisplay(0);
    UI.updateCellsLeft(this._countEmpty());
    UI.updateHintsUsed(0);
    UI.stopTimer();
    UI._updateTimerDisplay();
    UI.hideHint();
    this._updateNumPad();

    this._saveGame();
  },

  /* ========== Input Handling ========== */
  onNumberInput(num) {
    if (this.gameCompleted) return;
    if (this.pencilMode && num !== 0) {
      this.setNote(num);
      return;
    }
    const r = this.board.selectedRow;
    const c = this.board.selectedCol;
    if (r === null || c === null) return;
    if (this.board.given[r][c]) return;

    const oldVal = this.board.getValue(r, c);

    if (!this.gameStarted && num !== 0) {
      this.gameStarted = true;
      UI.startTimer();
    }

    if (num === 0) {
      if (oldVal === 0) return;
      this.undoStack.push({ row: r, col: c, oldValue: oldVal, newValue: 0, oldNotes: this.board.getNotes(r, c) });
      this.redoStack = [];
      this.board.setValue(r, c, 0, false);
      this.board.clearErrors();
    } else {
      if (oldVal === num) return;
      const isCorrect = this.solution[r][c] === num;
      if (!isCorrect) {
        this.mistakes++;
        UI.updateMistakeDisplay(this.mistakes);
        if (this.mistakes >= 3) {
          UI.showGameOver();
          this.gameCompleted = true;
          UI.stopTimer();
          this._recordGame(false);
          return;
        }
      } else {
        this.board.clearErrors();
      }

      const oldNotes = this.board.getNotes(r, c);
      this.undoStack.push({ row: r, col: c, oldValue: oldVal, newValue: num, oldNotes });
      this.redoStack = [];

      this.board.setValue(r, c, num, this.board.given[r][c]);
      this.board.clearNotes(r, c);

      if (!isCorrect) {
        this.board.highlightErrors([{ row: r, col: c }]);
      }
    }

    this._updateNumPad();
    this._checkVictory();
    this._saveGame();

    if (this.board.showAutoCandidates) {
      this.board.setAutoCandidates(this.board.getCurrentGrid());
    }

    UI.updateCellsLeft(this._countEmpty());
  },

  setNote(num) {
    if (this.gameCompleted) return;
    const r = this.board.selectedRow;
    const c = this.board.selectedCol;
    if (r === null || c === null) return;
    if (this.board.given[r][c]) return;
    if (this.board.getValue(r, c) !== 0) return;
    if (num === 0) {
      this.board.clearNotes(r, c);
    } else {
      this.board.setNote(r, c, num);
    }
    this._saveGame();
  },

  _onCellSelect(r, c) {
    if (this.gameCompleted) return;
    this.board.selectCell(r, c);
  },

  _onNoteClick(r, c, num) {
    if (this.gameCompleted) return;
    if (this.board.given[r][c]) return;
    if (this.board.getValue(r, c) !== 0) return;
    // Clicking a note number removes that candidate
    this.board.notes[r][c].delete(num);
    this.board._paintCell(r, c);
    this._saveGame();
  },

  /**
   * 双击空格：若当前有高亮的数字，且该数字在此格所在行/列/宫中
   * 只此一格有候选（隐式唯一），则直接填入。
   */
  _onCellDoubleClick(r, c, hlVal) {
    if (this.gameCompleted) return;
    if (this.board.given[r][c]) return;
    if (this.board.getValue(r, c) !== 0) return;
    if (hlVal === null || hlVal === 0) return; // 双击前没有高亮的数字

    // 检查 hlVal 是否在 (r,c) 的候选里
    const notes = this.board.notes[r][c];
    if (!notes.has(hlVal)) return;

    // 检查是否在某单元中是隐式唯一
    const grid = this.board.getCurrentGrid();
    const cands = Solver.getCandidates(grid);

    // 同行
    let rowPos = [];
    for (let cc = 0; cc < 9; cc++) if (cands[r][cc].includes(hlVal)) rowPos.push(cc);
    if (rowPos.length === 1 && rowPos[0] === c) {
      this.onNumberInput(hlVal);
      return;
    }
    // 同列
    let colPos = [];
    for (let rr = 0; rr < 9; rr++) if (cands[rr][c].includes(hlVal)) colPos.push(rr);
    if (colPos.length === 1 && colPos[0] === r) {
      this.onNumberInput(hlVal);
      return;
    }
    // 同宫
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    let boxPos = [];
    for (let rr = br; rr < br + 3; rr++)
      for (let cc = bc; cc < bc + 3; cc++)
        if (cands[rr][cc].includes(hlVal)) boxPos.push([rr, cc]);
    if (boxPos.length === 1 && boxPos[0][0] === r && boxPos[0][1] === c) {
      this.onNumberInput(hlVal);
    }
  },

  /* ========== Tools ========== */
  undo() {
    if (this.gameCompleted) return;
    if (this.undoStack.length === 0) return;
    const action = this.undoStack.pop();
    this.redoStack.push({
      row: action.row,
      col: action.col,
      oldValue: action.newValue,
      newValue: action.oldValue,
      oldNotes: this.board.getNotes(action.row, action.col),
    });
    this.board.setValue(action.row, action.col, action.oldValue, this.board.given[action.row][action.col]);
    if (action.oldValue === 0 && action.oldNotes) {
      this.board.notes[action.row][action.col] = new Set(action.oldNotes);
      this.board._paintCell(action.row, action.col);
    }
    this.board.clearErrors();
    this._updateNumPad();
    UI.updateCellsLeft(this._countEmpty());
    this._saveGame();
  },

  redo() {
    if (this.gameCompleted) return;
    if (this.redoStack.length === 0) return;
    const action = this.redoStack.pop();
    this.undoStack.push({
      row: action.row,
      col: action.col,
      oldValue: action.oldValue,
      newValue: action.newValue,
      oldNotes: this.board.getNotes(action.row, action.col),
    });
    this.board.setValue(action.row, action.col, action.newValue, this.board.given[action.row][action.col]);
    this.board.clearErrors();
    this._updateNumPad();
    UI.updateCellsLeft(this._countEmpty());
    this._saveGame();
  },

  togglePencilMode(active) {
    this.pencilMode = active;
    document.getElementById('btn-pencil').dataset.active = active ? 'true' : 'false';
  },

  toggleAutoCandidates(active) {
    this.board.showAutoCandidates = active;
    const btn = document.getElementById('btn-autocand');
    btn.dataset.active = active ? 'true' : 'false';
    if (active) {
      this.board.setAutoCandidates(this.board.getCurrentGrid());
    } else {
      this.board.clearAutoCandidates();
    }
  },

  toggleHighlight(active) {
    this.board.highlightSameNum = active;
    document.getElementById('btn-highlight').dataset.active = active ? 'true' : 'false';
    this.board.updateHighlights();
  },

  checkErrors() {
    const grid = this.board.getCurrentGrid();
    const errors = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val === 0 || this.board.given[r][c]) continue;
        if (this.solution[r][c] !== val) {
          errors.push({ row: r, col: c });
        }
      }
    }
    this.board.clearErrors();
    if (errors.length > 0) {
      this.board.highlightErrors(errors);
    }
    return errors;
  },

  getHint() {
    if (this.gameCompleted) return;
    const grid = this.board.getCurrentGrid();
    const result = Solver.findHumanHint(grid);
    if (!result.found) {
      alert(result.message || '当前无法找到更多逻辑步骤。');
      return;
    }
    this.hintsUsed++;
    UI.updateHintsUsed(this.hintsUsed);
    UI.showHint(result);
    this.board.highlightHint(result.cells);
    this._saveGame();
  },

  applyHint() {
    const hint = UI.getPendingHint();
    if (!hint) return;
    for (const cell of hint.cells) {
      this.board.setValue(cell.row, cell.col, cell.value, this.board.given[cell.row][cell.col]);
      this.board.clearNotes(cell.row, cell.col);
    }
    UI.hideHint();
    this._updateNumPad();
    this._checkVictory();
    if (this.board.showAutoCandidates) {
      this.board.setAutoCandidates(this.board.getCurrentGrid());
    }
    UI.updateCellsLeft(this._countEmpty());
    this._saveGame();
  },

  /**
   * 傻瓜完成：循环扫描——有且仅有一个候选的格子就填，直到没有为止。
   * 适合解题收尾阶段，省心省力。
   * @returns {number} 填充的格子数
   */
  lazyComplete() {
    if (this.gameCompleted) return 0;
    if (!this.gameStarted) { this.gameStarted = true; UI.startTimer(); }
    let filled = 0;
    let changed = true;

    while (changed) {
      changed = false;
      const grid = this.board.getCurrentGrid();
      const cands = Solver.getCandidates(grid);

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid[r][c] !== 0 || this.board.given[r][c]) continue;
          if (cands[r][c].length === 1) {
            const val = cands[r][c][0];
            this.board.setValue(r, c, val, false);
            this.board.clearNotes(r, c);
            grid[r][c] = val; // 同步本地 grid
            filled++;
            changed = true;
          }
        }
      }
    }

    if (filled > 0) {
      if (this.board.showAutoCandidates) {
        this.board.setAutoCandidates(this.board.getCurrentGrid());
      }
      this._updateNumPad();
      this._checkVictory();
      this._saveGame(true);
      UI.updateCellsLeft(this._countEmpty());
    }

    return filled;
  },

  /* ========== Victory / Game Over ========== */
  _checkVictory() {
    const grid = this.board.getCurrentGrid();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return;
        if (grid[r][c] !== this.solution[r][c]) return;
      }
    }
    this.gameCompleted = true;
    UI.stopTimer();
    const time = UI.getTime();
    this._recordGame(true);
    UI.showVictory(time, this.difficulty, this.mistakes, this.hintsUsed);
    this._animateBoard();
    Storage.clearGame();
  },

  _animateBoard() {
    const board = document.getElementById('sudoku-board');
    board.classList.add('victory');
    setTimeout(() => board.classList.remove('victory'), 800);
  },

  _recordGame(won) {
    Storage.recordGame(this.difficulty, won, UI.getTime(), this.hintsUsed);
  },

  /* ========== State Persistence ========== */
  _saveGame(immediate) {
    if (this.gameCompleted) return;
    if (immediate) {
      this._doSave();
      return;
    }
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this._doSave(), 500);
  },

  _doSave() {
    if (this.gameCompleted) return;
    const state = {
      puzzle: this.puzzle,
      solution: this.solution,
      difficulty: this.difficulty,
      values: this.board.getCurrentGrid(),
      given: this.board.getGivenMask(),
      notes: Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => [...this.board.notes[r][c]])
      ),
      mistakes: this.mistakes,
      hintsUsed: this.hintsUsed,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      gameStarted: this.gameStarted,
      timerSeconds: this.gameStarted ? UI.getTime() : 0,
      pencilMode: this.pencilMode,
      showAutoCandidates: this.board.showAutoCandidates,
    };
    Storage.saveGame(state);
  },

  _loadGame(state) {
    this.puzzle = state.puzzle;
    this.solution = state.solution;
    this.difficulty = state.difficulty;
    this.mistakes = state.mistakes;
    this.hintsUsed = state.hintsUsed;
    this.undoStack = state.undoStack || [];
    this.redoStack = state.redoStack || [];
    this.gameStarted = state.gameStarted;
    this.pencilMode = state.pencilMode || false;
    this.board.showAutoCandidates = state.showAutoCandidates || false;

    this.board.loadPuzzle(state.values, state.given);

    if (state.notes) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          this.board.notes[r][c] = new Set(state.notes[r][c]);
          this.board._paintCell(r, c);
        }
      }
    }

    if (this.gameStarted) {
      UI.startTimer(state.timerSeconds || 0);
    }

    UI.updateMistakeDisplay(this.mistakes);
    UI.updateHintsUsed(this.hintsUsed);
    UI.updateCellsLeft(this._countEmpty());
    document.getElementById('btn-pencil').dataset.active = this.pencilMode ? 'true' : 'false';
    document.getElementById('btn-autocand').dataset.active = this.board.showAutoCandidates ? 'true' : 'false';

    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(b => {
      b.classList.remove('active');
      if (b.dataset.diff === this.difficulty) b.classList.add('active');
    });

    UI._updateDiffInfo(this.difficulty);

    this._updateNumPad();
  },

  /* ========== Helpers ========== */
  _getGivenMask() {
    const mask = Array.from({ length: 9 }, () => Array(9).fill(false));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.puzzle[r][c] !== 0) mask[r][c] = true;
      }
    }
    return mask;
  },

  _countEmpty() {
    const grid = this.board.getCurrentGrid();
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) count++;
      }
    }
    return count;
  },

  _updateNumPad() {
    const counts = this.board.updateNumberExhaustion();
    UI.updateNumberPad(counts);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
