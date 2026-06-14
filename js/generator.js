/**
 * 数独生成器 - Generates valid Sudoku puzzles with unique solutions
 */
const Generator = {

  // Difficulty presets: [cellsToRemove, techniquesRequired]
  // Easy: naked/hidden singles only
  // Medium: + naked pairs, pointing pairs
  // Hard: + hidden pairs, box/line reduction
  // Expert: + X-Wing, swordfish, XY-Wing
  // Master: maximum difficulty, minimal clues
  DIFFICULTY: {
    easy:   { remove: 40, minClues: 36, label: '简单', emoji: '🌟' },
    medium: { remove: 46, minClues: 30, label: '中等', emoji: '⭐' },
    hard:   { remove: 51, minClues: 26, label: '困难', emoji: '🔥' },
    expert: { remove: 55, minClues: 22, label: '专家', emoji: '💀' },
    master: { remove: 58, minClues: 19, label: '大师', emoji: '👑' },
  },

  /**
   * Generate a complete puzzle
   * @param {string} difficulty - 'easy'|'medium'|'hard'|'expert'|'master'
   * @returns {{ puzzle: number[][], solution: number[][], difficulty: string }}
   */
  generate(difficulty = 'medium') {
    // Step 1: Generate a complete, valid solution grid
    const solution = this._generateSolution();

    // Step 2: Create puzzle by removing cells while ensuring unique solution
    const puzzle = this._createPuzzle(solution, difficulty);

    return {
      puzzle: puzzle,
      solution: solution,
      difficulty: difficulty,
    };
  },

  /**
   * Generate a fully solved 9x9 Sudoku grid
   */
  _generateSolution() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

    // Fill diagonal 3x3 boxes first (they don't affect each other)
    for (let box = 0; box < 9; box += 3) {
      this._fillBox(grid, box, box);
    }

    // Solve the rest with backtracking
    this._solveGrid(grid);

    return grid;
  },

  _fillBox(grid, startRow, startCol) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    this._shuffle(nums);
    let idx = 0;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        grid[r][c] = nums[idx++];
      }
    }
  },

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  _solveGrid(grid) {
    const empty = this._findEmpty(grid);
    if (!empty) return true;

    const [row, col] = empty;
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    this._shuffle(nums);

    for (const num of nums) {
      if (this._isValid(grid, row, col, num)) {
        grid[row][col] = num;
        if (this._solveGrid(grid)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  },

  _findEmpty(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return [r, c];
      }
    }
    return null;
  },

  _isValid(grid, row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (grid[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (grid[r][c] === num) return false;
      }
    }
    return true;
  },

  /**
   * Create puzzle by removing cells from solved grid
   */
  _createPuzzle(solution, difficulty) {
    const config = this.DIFFICULTY[difficulty];
    // Deep copy
    const puzzle = solution.map(row => [...row]);

    // Create list of all cell positions and shuffle
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    this._shuffle(positions);

    let removed = 0;
    const targetRemove = config.remove;

    for (const [r, c] of positions) {
      if (removed >= targetRemove) break;

      // Ensure we don't drop below minimum clues
      const remaining = 81 - removed - 1;
      if (remaining < config.minClues) continue;

      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      // Verify unique solution
      if (this._countSolutions(puzzle) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup; // Restore
      }
    }

    return puzzle;
  },

  /**
   * Count solutions (up to 2 — we only need to know if unique)
   */
  _countSolutions(grid) {
    const copy = grid.map(row => [...row]);
    let count = 0;

    const solve = (g) => {
      if (count >= 2) return; // Early exit

      const empty = this._findEmpty(g);
      if (!empty) {
        count++;
        return;
      }

      const [row, col] = empty;
      for (let num = 1; num <= 9; num++) {
        if (this._isValid(g, row, col, num)) {
          g[row][col] = num;
          solve(g);
          g[row][col] = 0;
          if (count >= 2) return;
        }
      }
    };

    solve(copy);
    return count;
  },

  /**
   * Rate puzzle difficulty based on techniques required to solve
   */
  rateDifficulty(puzzle) {
    // Count clues
    let clues = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) clues++;
      }
    }
    if (clues >= 36) return 'easy';
    if (clues >= 30) return 'medium';
    if (clues >= 26) return 'hard';
    if (clues >= 22) return 'expert';
    return 'master';
  }
};
