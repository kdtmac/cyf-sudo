/**
 * 数独生成器 - Generates valid Sudoku puzzles with unique solutions
 *
 * 性能优化：
 * - MRV（最少候选数优先）回溯启发式，大幅减少回溯次数
 * - 异步生成（await yield），不阻塞 UI 主线程
 * - 配合 Solver.analyzeDifficulty 修复后的达标率，减少重试次数
 */
const Generator = {

  // Difficulty presets with dual rating systems
  // 谢道台等级 (Xie Daotai): ★1-10+ stars
  // SE分数 (Sukaku Explainer): 1.0-10.0+
  DIFFICULTY: {
    easy:   { remove: 40, minClues: 36, label: '简单', emoji: '🌟', xieRating: '★1-2', seScore: '1.0-2.6', desc: '唯余数、隐式唯一', minLevel: 0, maxLevel: 2, maxAttempts: 1 },
    medium: { remove: 46, minClues: 30, label: '中等', emoji: '⭐', xieRating: '★2-3', seScore: '2.0-3.4', desc: '数对、指向数对', minLevel: 0, maxLevel: 3, maxAttempts: 1 },
    hard:   { remove: 51, minClues: 26, label: '困难', emoji: '🔥', xieRating: '★3-5', seScore: '3.0-4.6', desc: '三数组、X-Wing', minLevel: 2, maxLevel: 5, maxAttempts: 6 },
    expert: { remove: 55, minClues: 22, label: '专家', emoji: '💀', xieRating: '★5-7', seScore: '4.0-6.0', desc: 'SWORDFISH、XY-Wing', minLevel: 2, maxLevel: 7, maxAttempts: 8 },
    master: { remove: 58, minClues: 19, label: '大师', emoji: '👑', xieRating: '★7-8', seScore: '5.5-7.5', desc: '空矩形、W-Wing、唯一矩形', minLevel: 3, maxLevel: 8, maxAttempts: 8 },
    extreme:{ remove: 61, minClues: 17, label: '极限', emoji: '💎', xieRating: '★8-9', seScore: '7.0-9.0', desc: '强制链、AIC、Sue De Coq', minLevel: 4, maxLevel: 8, maxAttempts: 10 },
    insane: { remove: 64, minClues: 15, label: '地狱', emoji: '☠️', xieRating: '★9-10+', seScore: '8.5-10.0+', desc: '动态强制链、复合技巧', minLevel: 4, maxLevel: 8, maxAttempts: 12 },
  },

  /**
   * Generate a complete puzzle (异步)
   * @param {string} difficulty - 'easy'|'medium'|...|'insane'
   * @param {object} [opts] - { onProgress(attempt, maxAttempts) }
   * @returns {Promise<{puzzle, solution, difficulty, analysis?}>}
   */
  async generate(difficulty = 'medium', opts = {}) {
    const cfg = this.DIFFICULTY[difficulty];
    const needCheck = cfg.minLevel >= 2;
    const maxAttempts = cfg.maxAttempts;
    let bestPuzzle = null, bestSolution = null, bestLevel = -1, bestAnalysis = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 让出主线程，UI 可绘制加载提示
      await this._yield();
      if (opts.onProgress) opts.onProgress(attempt + 1, maxAttempts);

      const solution = this._generateSolution();
      let puzzle = this._createPuzzle(solution, difficulty);

      if (needCheck) {
        let analysis = Solver.analyzeDifficulty(puzzle);

        // 局部搜索：如果 puzzle 不够难，试试交换格子提升难度
        if (analysis.level < cfg.minLevel && cfg.minLevel >= 4) {
          const boosted = this._boostDifficulty(solution, puzzle, cfg);
          if (boosted) {
            puzzle = boosted.puzzle;
            analysis = boosted.analysis;
          }
        }

        if (analysis.level >= cfg.minLevel) {
          return { puzzle, solution, difficulty, analysis };
        }
        if (analysis.level > bestLevel) {
          bestLevel = analysis.level;
          bestPuzzle = puzzle;
          bestSolution = solution;
          bestAnalysis = analysis;
        }
      } else {
        return { puzzle, solution, difficulty };
      }
    }

    if (bestPuzzle) {
      return { puzzle: bestPuzzle, solution: bestSolution, difficulty, analysis: bestAnalysis };
    }
    // 兜底
    const solution = this._generateSolution();
    const puzzle = this._createPuzzle(solution, difficulty);
    return { puzzle, solution, difficulty };
  },

  /**
   * 让出主线程一帧（约 4ms），避免阻塞 UI
   */
  _yield() {
    return new Promise(resolve => setTimeout(resolve, 0));
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
    // Solve the rest with MRV backtracking
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

  /**
   * MRV-based backtracking solve.
   * 每步选候选数最少的空格填入，极大减少分支数。
   */
  _solveGrid(grid) {
    const cell = this._findMRV(grid);
    if (!cell) return true; // 全填满

    const [row, col] = cell;
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

  /**
   * 找候选数最少的空格（MRV）。返回 [r,c] 或 null。
   * 候选数为 0 的空格直接返回（无解短路）。
   */
  _findMRV(grid) {
    let best = null, bestCount = 10;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        let count = 0;
        for (let n = 1; n <= 9; n++) {
          if (this._isValid(grid, r, c, n)) count++;
        }
        if (count === 0) return [r, c]; // 死路，立即返回让上层回溯
        if (count < bestCount) {
          bestCount = count;
          best = [r, c];
          if (count === 1) return best; // 唯一候选，最优
        }
      }
    }
    return best;
  },

  _isValid(grid, row, col, num) {
    for (let c = 0; c < 9; c++) if (grid[row][c] === num) return false;
    for (let r = 0; r < 9; r++) if (grid[r][col] === num) return false;
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
   * Create puzzle by removing cells from solved grid.
   * 采用「对称的随机顺序」逐格移除，每步用 MRV 解数计数验证唯一性。
   */
  _createPuzzle(solution, difficulty) {
    const config = this.DIFFICULTY[difficulty];
    const puzzle = solution.map(row => [...row]);

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
      const remaining = 81 - removed - 1;
      if (remaining < config.minClues) continue;

      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      if (this._countSolutions(puzzle) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }

    return puzzle;
  },

  /**
   * Count solutions (up to 2 — we only need to know if unique)
   * 使用 MRV 回溯，比原顺序回溯快数倍。
   */
  _countSolutions(grid) {
    const copy = grid.map(row => [...row]);
    let count = 0;

    const solve = (g) => {
      if (count >= 2) return;
      const cell = this._findMRV(g);
      if (!cell) {
        count++;
        return;
      }
      const [row, col] = cell;
      for (let num = 1; num <= 9; num++) {
        if (count >= 2) return;
        if (this._isValid(g, row, col, num)) {
          g[row][col] = num;
          solve(g);
          g[row][col] = 0;
        }
      }
    };

    solve(copy);
    return count;
  },

  /**
   * 局部搜索优化：对不够难的 puzzle，尝试进一步移除格子来提升难度。
   * 遍历 puzzle 中所有已填格，每移除一格检查唯一性+难度。
   * @returns {{puzzle, analysis}|null}
   */
  _boostDifficulty(solution, puzzle, cfg) {
    let bestPuzzle = puzzle.map(row => [...row]);
    let bestAnalysis = Solver.analyzeDifficulty(bestPuzzle);
    let bestLevel = bestAnalysis.level;

    // 收集 puzzle 中已填充的非空单元格
    const filledCells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (bestPuzzle[r][c] !== 0) filledCells.push([r, c]);
    this._shuffle(filledCells);

    let improved = false;
    for (const [r, c] of filledCells) {
      if (bestLevel >= cfg.minLevel) break;
      if (81 - this._countClues(bestPuzzle) >= cfg.remove + 4) break; // 不再过度移除

      const backup = bestPuzzle[r][c];
      bestPuzzle[r][c] = 0;
      if (this._countSolutions(bestPuzzle) !== 1) {
        bestPuzzle[r][c] = backup;
        continue;
      }
      const a = Solver.analyzeDifficulty(bestPuzzle);
      if (a.level >= bestLevel) {
        // 同水平或更好的保留；更新 best 指标
        if (a.level > bestLevel) { bestLevel = a.level; bestAnalysis = a; improved = true; }
      } else {
        bestPuzzle[r][c] = backup; // 回退
      }
    }
    return improved ? { puzzle: bestPuzzle, analysis: bestAnalysis } : null;
  },

  _countClues(puzzle) {
    let c = 0;
    for (let r = 0; r < 9; r++) for (let cc = 0; cc < 9; cc++) if (puzzle[r][cc] !== 0) c++;
    return c;
  },

  // 保留旧接口；推荐使用 Solver.analyzeDifficulty
  rateDifficulty(puzzle) {
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
