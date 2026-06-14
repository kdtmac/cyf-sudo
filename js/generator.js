/**
 * 数独生成器 - Generates valid Sudoku puzzles with unique solutions
 */
const Generator = {

  // Difficulty presets with dual rating systems
  // 谢道台等级 (Xie Daotai): ★1-10+ stars
  // SE分数 (Sukaku Explainer): 1.0-10.0+
  DIFFICULTY: {
    easy:   { remove: 40, minClues: 36, label: '简单', emoji: '🌟', xieRating: '★1-2', seScore: '1.0-2.6', desc: '唯余数、隐式唯一', minLevel: 0, maxLevel: 1 },
    medium: { remove: 46, minClues: 30, label: '中等', emoji: '⭐', xieRating: '★2-3', seScore: '2.0-3.4', desc: '数对、指向数对', minLevel: 0, maxLevel: 2 },
    hard:   { remove: 51, minClues: 26, label: '困难', emoji: '🔥', xieRating: '★3-5', seScore: '3.0-4.6', desc: '三数组、X-Wing', minLevel: 2, maxLevel: 3 },
    expert: { remove: 55, minClues: 22, label: '专家', emoji: '💀', xieRating: '★5-7', seScore: '4.0-6.0', desc: 'SWORDFISH、XY-Wing', minLevel: 3, maxLevel: 4 },
    master: { remove: 58, minClues: 19, label: '大师', emoji: '👑', xieRating: '★7-8', seScore: '5.5-7.5', desc: '空矩形、W-Wing、唯一矩形', minLevel: 4, maxLevel: 5 },
    extreme:{ remove: 61, minClues: 17, label: '极限', emoji: '💎', xieRating: '★8-9', seScore: '7.0-9.0', desc: '强制链、AIC、Sue De Coq', minLevel: 5, maxLevel: 6 },
    insane: { remove: 64, minClues: 15, label: '地狱', emoji: '☠️', xieRating: '★9-10+', seScore: '8.5-10.0+', desc: '动态强制链、复合技巧', minLevel: 5, maxLevel: 6 },
  },

  /**
   * Generate a complete puzzle
   * @param {string} difficulty - 'easy'|'medium'|'hard'|'expert'|'master'
   * @returns {{ puzzle: number[][], solution: number[][], difficulty: string }}
   */
  generate(difficulty = 'medium') {
    const cfg = this.DIFFICULTY[difficulty];
    const maxAttempts = cfg.minLevel >= 5 ? 40 : (cfg.minLevel >= 3 ? 20 : 1);
    let bestPuzzle = null, bestSolution = null, bestLevel = -1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const solution = this._generateSolution();
      const puzzle = this._createPuzzle(solution, difficulty);

      if (cfg.minLevel > 0) {
        const analysis = Solver.analyzeDifficulty(puzzle);
        if (analysis.level >= cfg.minLevel) {
          return { puzzle, solution, difficulty, analysis };
        }
        if (analysis.level > bestLevel) {
          bestLevel = analysis.level;
          bestPuzzle = puzzle;
          bestSolution = solution;
        }
      } else {
        return { puzzle, solution, difficulty, analysis: Solver.analyzeDifficulty(puzzle) };
      }
    }

    if (bestPuzzle) {
      return { puzzle: bestPuzzle, solution: bestSolution, difficulty, analysis: Solver.analyzeDifficulty(bestPuzzle) };
    }
    const solution = this._generateSolution();
    const puzzle = this._createPuzzle(solution, difficulty);
    return { puzzle, solution, difficulty, analysis: Solver.analyzeDifficulty(puzzle) };
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
      if (count >= 2) return;

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
    if (clues >= 19) return 'master';
    if (clues >= 17) return 'extreme';
    return 'insane';
  }
};
