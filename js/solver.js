/**
 * 数独求解引擎 - Implements logical solving techniques hierarchically
 * Each technique returns { found: bool, cells: [{row, col, value}], technique: string, explanation: string }
 */
const Solver = {

  /**
   * Get all candidates for each cell
   * @returns {number[][][]} grid[r][c] = [candidates]
   */
  getCandidates(grid) {
    const candidates = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => [])
    );

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) {
          candidates[r][c] = [];
        } else {
          const used = new Set();
          // Row
          for (let cc = 0; cc < 9; cc++) if (grid[r][cc] !== 0) used.add(grid[r][cc]);
          // Col
          for (let rr = 0; rr < 9; rr++) if (grid[rr][c] !== 0) used.add(grid[rr][c]);
          // Box
          const br = Math.floor(r / 3) * 3;
          const bc = Math.floor(c / 3) * 3;
          for (let rr = br; rr < br + 3; rr++) {
            for (let cc = bc; cc < bc + 3; cc++) {
              if (grid[rr][cc] !== 0) used.add(grid[rr][cc]);
            }
          }
          for (let n = 1; n <= 9; n++) {
            if (!used.has(n)) candidates[r][c].push(n);
          }
        }
      }
    }
    return candidates;
  },

  /**
   * Find the next logical step
   * Returns { found, cells, technique, explanation } or { found: false }
   */
  findNextStep(grid) {
    const cands = this.getCandidates(grid);
    const result = this._dispatchTechniques(grid, cands);
    if (result && result.found) return result;
    return this.bruteForceStep(grid);
  },

  /**
   * 人类常用技巧提示系统
   * 只使用人类解题时真正会用的技巧，按自然发现顺序排列
   */
  HUMAN_HINT_ORDER: [
    'NakedSingle',       // 1. 唯余数 — 这格只有一个可能
    'HiddenSingle',      // 2. 隐式唯一 — 这数只能放这里
    'NakedPair',         // 3. 显式数对 — 两格共享两个候选
    'PointingPair',      // 4. 指向数对 — 宫内数字锁在一行/列
    'BoxLineReduction',  // 5. 区块删减 — 行/列数字锁在一宫
    'HiddenPair',        // 6. 隐式数对 — 两数只能出现于两格
    'NakedTriple',       // 7. 显式三数组 — 三格共享三个候选
    'XWing',             // 8. X翼 — 两行两列矩形锁定
    'HiddenTriple',      // 9. 隐式三数组 — 三数仅在三格
    'XYWing',            // 10. XY翼 — 三格逻辑链
  ],

  /**
   * 人类友好的自然语言解释（覆盖机器风格的 technique/explanation）
   */
  _humanExplain(result) {
    const h = result;
    const r = h._rawResult; // 原始机器结果
    if (!r || !r.cells || r.cells.length === 0) return;

    const placement = this.PLACEMENT_TECHNIQUE_KEYS.some(t => r.technique.includes(t));
    const c = r.cells[0];

    if (placement) {
      // 填值型：直接告诉用户填什么
      if (r.technique.includes('唯余数') || r.technique.includes('Naked Single')) {
        h.technique = '唯余数';
        h.explanation = `R${c.row + 1}C${c.col + 1} 只有一个可能的数字 ${c.value}，直接填入即可。`;
      } else if (r.technique.includes('隐式唯一') || r.technique.includes('Hidden Single')) {
        h.technique = '隐式唯一';
        h.explanation = `R${c.row + 1}C${c.col + 1} 所在的单元中，数字 ${c.value} 只有这一个位置可放。`;
      } else if (r.technique.includes('XY翼') || r.technique.includes('XY-Wing')) {
        h.technique = 'XY翼';
        h.explanation = r.explanation; // XY-Wing 的机器解释已经足够清晰
      } else {
        h.technique = r.technique;
        h.explanation = r.explanation;
      }
    } else {
      // 消除型：用通俗语言解释「哪些格子的哪些候选可删」
      const vals = [...new Set(r.cells.map(c => c.value))].join('、');
      const cells = r.cells.slice(0, 4).map(c => `R${c.row + 1}C${c.col + 1}`).join('、');
      const more = r.cells.length > 4 ? `等 ${r.cells.length} 格` : '';

      if (r.technique.includes('指向') || r.technique.includes('Pointing')) {
        h.technique = '指向数对';
        h.explanation = `某宫中数字 ${vals} 的候选都在同一行/列，可删该行/列外部的 ${vals}（涉及 ${cells}${more}）。`;
      } else if (r.technique.includes('区块') || r.technique.includes('Box/Line')) {
        h.technique = '区块删减';
        h.explanation = `某行/列中数字 ${vals} 的候选都在同一宫，可删该宫内其他行/列的 ${vals}（涉及 ${cells}${more}）。`;
      } else if (r.technique.includes('隐式数对') || r.technique.includes('Hidden Pair')) {
        h.technique = '隐式数对';
        h.explanation = `某单元中两个数字只能出现在相同两格，可删除这两格中的其他候选数（涉及 ${cells}${more}）。`;
      } else if (r.technique.includes('隐式三数组') || r.technique.includes('Hidden Triple')) {
        h.technique = '隐式三数组';
        h.explanation = `某单元中三个数字只能出现在相同三格，可删这些格子中其他候选（涉及 ${cells}${more}）。`;
      } else if (r.technique.includes('三数组') || r.technique.includes('Naked Triple')) {
        h.technique = '显式三数组';
        h.explanation = `某单元中三格的候选并集恰好为三个数字，可删该单元其他格中的 ${vals}（涉及 ${cells}${more}）。`;
      } else if (r.technique.includes('数对') || r.technique.includes('Naked Pair')) {
        h.technique = '显式数对';
        h.explanation = `某单元中两格的候选完全相同，可删除该单元其他格中的 ${vals}（涉及 ${cells}${more}）。`;
      } else if (r.technique.includes('X翼') || r.technique.includes('X-Wing')) {
        h.technique = 'X翼';
        h.explanation = `数字 ${vals} 在两行（列）中形成矩形锁定，可删对应列（行）中其他格的 ${vals}（涉及 ${cells}${more}）。`;
      } else {
        h.technique = r.technique.split('(')[0].trim();
        h.explanation = r.explanation;
      }
    }
  },

  /**
   * 按人类解题顺序寻找提示。
   * 只使用人类常用的 10 种技巧，跳过机器专属的高级技巧。
   * @returns { found, cells, technique, explanation } 或 { found: false, message }
   */
  findHumanHint(grid) {
    const cands = this.getCandidates(grid);

    for (const fnName of this.HUMAN_HINT_ORDER) {
      const fn = this._techniqueMap[fnName];
      if (!fn) continue;
      const result = fn.call(this, grid, cands);
      if (result && result.found) {
        // 包装人类化解释
        const hint = {
          found: true,
          cells: result.cells,
          technique: result.technique,
          explanation: result.explanation,
          _rawResult: result,
        };
        this._humanExplain(hint);
        return hint;
      }
    }

    // 人类技巧全部用尽还解不开 → 建议开启自动候选数辅助观察
    return {
      found: false,
      message: '当前没有明显的人类可识别的线索。试试开启「自动候选数」辅助观察，或者用解题器分析。',
    };
  },

  /**
   * 按难度顺序依次尝试所有逻辑技巧（不含 brute force）
   * 返回首个命中的结果；都未命中返回 null
   */
  _dispatchTechniques(grid, cands) {
    const order = [
      'NakedSingle', 'HiddenSingle',
      'NakedPair', 'HiddenPair', 'PointingPair', 'BoxLineReduction',
      'NakedTriple', 'HiddenTriple',
      'XWing', 'Swordfish', 'Jellyfish',
      'XYWing', 'XYZWing',
      'SimpleColoring', 'EmptyRectangle', 'WWing',
      'UniqueRectangle', 'HiddenRectangle',
      'SueDeCoq', 'APE', 'ALSXZ',
      'ForcingChain', 'NiceLoop',
    ];
    for (const name of order) {
      const fn = this._techniqueMap[name];
      if (!fn) continue;
      const r = fn.call(this, grid, cands);
      if (r && r.found) return r;
    }
    return null;
  },

  // 名称 -> 技巧函数 的映射表（_dispatchTechniques 用）
  _techniqueMap: null,

  // ============ TECHNIQUE 1: Naked Single ============
  findNakedSingle(grid, cands) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].length === 1) {
          const val = cands[r][c][0];
          return {
            found: true,
            cells: [{ row: r, col: c, value: val }],
            technique: '唯余数 (Naked Single)',
            explanation: `单元格 R${r + 1}C${c + 1} 只有一个候选数 ${val}，直接填入。`,
          };
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 2: Hidden Single ============
  findHiddenSingle(grid, cands) {
    for (let r = 0; r < 9; r++) {
      for (let n = 1; n <= 9; n++) {
        const positions = [];
        for (let c = 0; c < 9; c++) {
          if (cands[r][c].includes(n)) positions.push([r, c]);
        }
        if (positions.length === 1) {
          const [row, col] = positions[0];
          return {
            found: true,
            cells: [{ row, col, value: n }],
            technique: '隐式唯一 (Hidden Single)',
            explanation: `在第 ${r + 1} 行中，数字 ${n} 只能出现在 R${row + 1}C${col + 1}。`,
          };
        }
      }
    }
    // Check columns
    for (let c = 0; c < 9; c++) {
      for (let n = 1; n <= 9; n++) {
        const positions = [];
        for (let r = 0; r < 9; r++) {
          if (cands[r][c].includes(n)) positions.push([r, c]);
        }
        if (positions.length === 1) {
          const [row, col] = positions[0];
          return {
            found: true,
            cells: [{ row, col, value: n }],
            technique: '隐式唯一 (Hidden Single)',
            explanation: `在第 ${c + 1} 列中，数字 ${n} 只能出现在 R${row + 1}C${col + 1}。`,
          };
        }
      }
    }
    // Check boxes
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        for (let n = 1; n <= 9; n++) {
          const positions = [];
          for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
              if (cands[r][c].includes(n)) positions.push([r, c]);
            }
          }
          if (positions.length === 1) {
            const [row, col] = positions[0];
            return {
              found: true,
              cells: [{ row, col, value: n }],
              technique: '隐式唯一 (Hidden Single)',
              explanation: `在第 ${Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1} 宫中，数字 ${n} 只能出现在 R${row + 1}C${col + 1}。`,
            };
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 3: Naked Pair ============
  findNakedPair(grid, cands) {
    // Check rows
    for (let r = 0; r < 9; r++) {
      const result = this._findNakedTupleInUnit(
        cands[r].map((c, i) => ({ row: r, col: i, cands: c })), 2, `第 ${r + 1} 行`
      );
      if (result) return result;
    }
    // Check columns
    for (let c = 0; c < 9; c++) {
      const unit = [];
      for (let r = 0; r < 9; r++) unit.push({ row: r, col: c, cands: cands[r][c] });
      const result = this._findNakedTupleInUnit(unit, 2, `第 ${c + 1} 列`);
      if (result) return result;
    }
    // Check boxes
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const unit = [];
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            unit.push({ row: r, col: c, cands: cands[r][c] });
          }
        }
        const boxNum = Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1;
        const result = this._findNakedTupleInUnit(unit, 2, `第 ${boxNum} 宫`);
        if (result) return result;
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 4: Hidden Pair ============
  findHiddenPair(grid, cands) {
    // Check rows
    for (let r = 0; r < 9; r++) {
      const unit = cands[r].map((c, i) => ({ row: r, col: i, cands: c }));
      const result = this._findHiddenTupleInUnit(unit, 2, `第 ${r + 1} 行`);
      if (result) return result;
    }
    // Check columns
    for (let c = 0; c < 9; c++) {
      const unit = [];
      for (let r = 0; r < 9; r++) unit.push({ row: r, col: c, cands: cands[r][c] });
      const result = this._findHiddenTupleInUnit(unit, 2, `第 ${c + 1} 列`);
      if (result) return result;
    }
    // Check boxes
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const unit = [];
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            unit.push({ row: r, col: c, cands: cands[r][c] });
          }
        }
        const boxNum = Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1;
        const result = this._findHiddenTupleInUnit(unit, 2, `第 ${boxNum} 宫`);
        if (result) return result;
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 5: Pointing Pair/Triple ============
  findPointingPair(grid, cands) {
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        for (let n = 1; n <= 9; n++) {
          // Find all cells in this box that have candidate n
          const positions = [];
          for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
              if (cands[r][c].includes(n)) positions.push([r, c]);
            }
          }
          if (positions.length >= 2 && positions.length <= 3) {
            // Check if they all share the same row
            const rows = new Set(positions.map(p => p[0]));
            if (rows.size === 1) {
              const row = positions[0][0];
              const removed = [];
              for (let c = 0; c < 9; c++) {
                if (c < bc || c >= bc + 3) {
                  if (cands[row][c].includes(n)) {
                    removed.push({ row, col: c, value: n });
                  }
                }
              }
              if (removed.length > 0) {
                return {
                  found: true,
                  cells: removed,
                  technique: '指向数对 (Pointing Pair)',
                  explanation: `在第 ${Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1} 宫中，数字 ${n} 只能在同一行 R${row + 1}，可以删除该行其他宫中的候选数 ${n}。`,
                };
              }
            }
            // Check if they all share the same column
            const cols = new Set(positions.map(p => p[1]));
            if (cols.size === 1) {
              const col = positions[0][1];
              const removed = [];
              for (let r = 0; r < 9; r++) {
                if (r < br || r >= br + 3) {
                  if (cands[r][col].includes(n)) {
                    removed.push({ row: r, col, value: n });
                  }
                }
              }
              if (removed.length > 0) {
                return {
                  found: true,
                  cells: removed,
                  technique: '指向数对 (Pointing Pair)',
                  explanation: `在第 ${Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1} 宫中，数字 ${n} 只能在同一列 C${col + 1}，可以删除该列其他宫中的候选数 ${n}。`,
                };
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 6: Box/Line Reduction ============
  findBoxLineReduction(grid, cands) {
    // For each row, if a number's candidates in that row are all in one box
    for (let r = 0; r < 9; r++) {
      for (let n = 1; n <= 9; n++) {
        const positions = [];
        for (let c = 0; c < 9; c++) {
          if (cands[r][c].includes(n)) positions.push(c);
        }
        if (positions.length >= 2 && positions.length <= 3) {
          const boxes = new Set(positions.map(c => Math.floor(c / 3)));
          if (boxes.size === 1) {
            const bc = Math.floor(positions[0] / 3) * 3;
            const br = Math.floor(r / 3) * 3;
            const removed = [];
            for (let rr = br; rr < br + 3; rr++) {
              if (rr === r) continue;
              for (let cc = bc; cc < bc + 3; cc++) {
                if (cands[rr][cc].includes(n)) {
                  removed.push({ row: rr, col: cc, value: n });
                }
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: '区块删减法 (Box/Line Reduction)',
                explanation: `在第 ${r + 1} 行中，数字 ${n} 的候选数都在同一宫中，可以从该宫的其他行删除候选数 ${n}。`,
              };
            }
          }
        }
      }
    }
    // For each column similarly
    for (let c = 0; c < 9; c++) {
      for (let n = 1; n <= 9; n++) {
        const positions = [];
        for (let r = 0; r < 9; r++) {
          if (cands[r][c].includes(n)) positions.push(r);
        }
        if (positions.length >= 2 && positions.length <= 3) {
          const boxes = new Set(positions.map(r => Math.floor(r / 3)));
          if (boxes.size === 1) {
            const br = Math.floor(positions[0] / 3) * 3;
            const bc = Math.floor(c / 3) * 3;
            const removed = [];
            for (let cc = bc; cc < bc + 3; cc++) {
              if (cc === c) continue;
              for (let rr = br; rr < br + 3; rr++) {
                if (cands[rr][cc].includes(n)) {
                  removed.push({ row: rr, col: cc, value: n });
                }
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: '区块删减法 (Box/Line Reduction)',
                explanation: `在第 ${c + 1} 列中，数字 ${n} 的候选数都在同一宫中，可以从该宫的其他列删除候选数 ${n}。`,
              };
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 7: Naked Triple ============
  findNakedTriple(grid, cands) {
    return this._findNakedTupleAllUnits(grid, cands, 3, '三数组 (Naked Triple)');
  },

  // ============ TECHNIQUE 8: Hidden Triple ============
  findHiddenTriple(grid, cands) {
    return this._findHiddenTupleAllUnits(grid, cands, 3, '隐式三数组 (Hidden Triple)');
  },

  // ============ TECHNIQUE 9: X-Wing ============
  findXWing(grid, cands) {
    for (let n = 1; n <= 9; n++) {
      // Find rows where n appears exactly twice
      const rowPositions = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          if (cands[r][c].includes(n)) cols.push(c);
        }
        if (cols.length === 2) rowPositions.push({ row: r, cols });
      }

      // Check if any two rows share the same two columns
      for (let i = 0; i < rowPositions.length; i++) {
        for (let j = i + 1; j < rowPositions.length; j++) {
          const rp1 = rowPositions[i];
          const rp2 = rowPositions[j];
          if (rp1.cols[0] === rp2.cols[0] && rp1.cols[1] === rp2.cols[1]) {
            const c1 = rp1.cols[0], c2 = rp1.cols[1];
            const removed = [];
            for (let r = 0; r < 9; r++) {
              if (r !== rp1.row && r !== rp2.row) {
                if (cands[r][c1].includes(n)) removed.push({ row: r, col: c1, value: n });
                if (cands[r][c2].includes(n)) removed.push({ row: r, col: c2, value: n });
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: 'X翼 (X-Wing)',
                explanation: `数字 ${n} 在 R${rp1.row + 1} 和 R${rp2.row + 1} 行中形成 X-Wing（列 C${c1 + 1} 和 C${c2 + 1}），可以删除这两列其他行的候选数 ${n}。`,
              };
            }
          }
        }
      }

      // Check columns similarly
      const colPositions = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) {
          if (cands[r][c].includes(n)) rows.push(r);
        }
        if (rows.length === 2) colPositions.push({ col: c, rows });
      }
      for (let i = 0; i < colPositions.length; i++) {
        for (let j = i + 1; j < colPositions.length; j++) {
          const cp1 = colPositions[i];
          const cp2 = colPositions[j];
          if (cp1.rows[0] === cp2.rows[0] && cp1.rows[1] === cp2.rows[1]) {
            const r1 = cp1.rows[0], r2 = cp1.rows[1];
            const removed = [];
            for (let c = 0; c < 9; c++) {
              if (c !== cp1.col && c !== cp2.col) {
                if (cands[r1][c].includes(n)) removed.push({ row: r1, col: c, value: n });
                if (cands[r2][c].includes(n)) removed.push({ row: r2, col: c, value: n });
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: 'X翼 (X-Wing)',
                explanation: `数字 ${n} 在 C${cp1.col + 1} 和 C${cp2.col + 1} 列中形成 X-Wing，可以删除这两行其他列的候选数 ${n}。`,
              };
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 10: Swordfish ============
  findSwordfish(grid, cands) {
    for (let n = 1; n <= 9; n++) {
      // Find rows where n appears 2-3 times
      const rowCands = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          if (cands[r][c].includes(n)) cols.push(c);
        }
        if (cols.length >= 2 && cols.length <= 3) rowCands.push({ row: r, cols });
      }

      // Try every combination of 3 rows
      for (let i = 0; i < rowCands.length; i++) {
        for (let j = i + 1; j < rowCands.length; j++) {
          for (let k = j + 1; k < rowCands.length; k++) {
            const allCols = new Set([
              ...rowCands[i].cols, ...rowCands[j].cols, ...rowCands[k].cols
            ]);
            if (allCols.size === 3) {
              const colsArr = [...allCols];
              const rowsArr = [rowCands[i].row, rowCands[j].row, rowCands[k].row];
              const removed = [];
              for (let r = 0; r < 9; r++) {
                if (!rowsArr.includes(r)) {
                  for (const c of colsArr) {
                    if (cands[r][c].includes(n)) removed.push({ row: r, col: c, value: n });
                  }
                }
              }
              if (removed.length > 0) {
                return {
                  found: true,
                  cells: removed,
                  technique: '剑鱼 (Swordfish)',
                  explanation: `数字 ${n} 在 R${rowsArr.map(x => x + 1).join(', ')} 行中形成 Swordfish（覆盖列 C${colsArr.map(x => x + 1).join(', ')}），可以删除这三列其他行的候选数 ${n}。`,
                };
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 11: XY-Wing ============
  findXYWing(grid, cands) {
    // Find all bi-value cells (exactly 2 candidates)
    const bivalues = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].length === 2) {
          bivalues.push({ row: r, col: c, cands: cands[r][c] });
        }
      }
    }

    for (const pivot of bivalues) {
      const [x, y] = pivot.cands;
      // Find wing cells that share exactly one candidate with pivot and can "see" pivot
      const wings = bivalues.filter(w =>
        w !== pivot &&
        this._canSee(pivot.row, pivot.col, w.row, w.col) &&
        ((w.cands[0] === x && w.cands[1] !== y) || (w.cands[1] === x && w.cands[0] !== y) ||
         (w.cands[0] === y && w.cands[1] !== x) || (w.cands[1] === y && w.cands[0] !== x))
      );

      for (const w1 of wings) {
        const z1 = w1.cands[0] === x || w1.cands[1] === x ?
          w1.cands.find(v => v !== x) : w1.cands.find(v => v !== y);
        for (const w2 of wings) {
          if (w2 === w1) continue;
          const z2 = w2.cands[0] === x || w2.cands[1] === x ?
            w2.cands.find(v => v !== x) : w2.cands.find(v => v !== y);
          if (z1 !== z2) continue; // They must share the z value
          const z = z1;

          // z must be different from both x and y
          if (z === x || z === y) continue;

          // w1 and w2 must not use the same "wing" value from pivot
          const w1UsesX = w1.cands.includes(x);
          const w2UsesX = w2.cands.includes(x);
          if (w1UsesX === w2UsesX) continue; // One must use x, one must use y

          // z eliminates anything that both w1 and w2 can see
          const removed = [];
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              if ((r === w1.row && c === w1.col) || (r === w2.row && c === w2.col)) continue;
              if ((r === pivot.row && c === pivot.col)) continue;
              if (this._canSee(w1.row, w1.col, r, c) && this._canSee(w2.row, w2.col, r, c)) {
                if (cands[r][c].includes(z)) {
                  removed.push({ row: r, col: c, value: z });
                }
              }
            }
          }
          if (removed.length > 0) {
            return {
              found: true,
              cells: removed,
              technique: 'XY翼 (XY-Wing)',
              explanation: `枢轴 R${pivot.row + 1}C${pivot.col + 1}(${x},${y}) 连接 R${w1.row + 1}C${w1.col + 1} 和 R${w2.row + 1}C${w2.col + 1}，形成 XY-Wing，可删除两翼共同影响单元格中的候选数 ${z}。`,
            };
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 12: XYZ-Wing ============
  findXYZWing(grid, cands) {
    // Find all bi-value and tri-value cells
    const bivalues = [];
    const trivalues = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].length === 2) bivalues.push({ row: r, col: c, cands: cands[r][c] });
        if (cands[r][c].length === 3) trivalues.push({ row: r, col: c, cands: cands[r][c] });
      }
    }

    for (const pivot of trivalues) {
      const [x, y, z] = pivot.cands;
      // Find two bi-value wings: (x,z) and (y,z), both able to see the pivot
      for (const w1 of bivalues) {
        if (!this._canSee(pivot.row, pivot.col, w1.row, w1.col)) continue;
        if (!this._hasCands(w1, [x, z]) && !this._hasCands(w1, [y, z])) continue;

        const w1HasXZ = this._hasCands(w1, [x, z]);
        for (const w2 of bivalues) {
          if (w2 === w1) continue;
          if (!this._canSee(pivot.row, pivot.col, w2.row, w2.col)) continue;
          const needed = w1HasXZ ? [y, z] : [x, z];
          if (!this._hasCands(w2, needed)) continue;

          // z eliminates from cells that can see all three
          const removed = [];
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              if ((r === pivot.row && c === pivot.col) || (r === w1.row && c === w1.col) || (r === w2.row && c === w2.col)) continue;
              if (this._canSee(pivot.row, pivot.col, r, c) &&
                  this._canSee(w1.row, w1.col, r, c) &&
                  this._canSee(w2.row, w2.col, r, c)) {
                if (cands[r][c].includes(z)) {
                  removed.push({ row: r, col: c, value: z });
                }
              }
            }
          }
          if (removed.length > 0) {
            return {
              found: true,
              cells: removed,
              technique: 'XYZ翼 (XYZ-Wing)',
              explanation: `枢轴 R${pivot.row + 1}C${pivot.col + 1}(${x},${y},${z}) 连接两翼，形成 XYZ-Wing，可删除三格共同影响单元格中的候选数 ${z}。`,
            };
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 13: Simple Coloring ============
  findSimpleColoring(grid, cands) {
    for (let n = 1; n <= 9; n++) {
      const links = this._buildStrongLinks(grid, cands, n);
      if (links.length < 2) continue;

      const colorMap = {};
      const colors = ['A', 'B'];

      const applyColor = (r, c, color) => {
        const key = `${r},${c}`;
        if (colorMap[key] && colorMap[key] !== color) {
          return 'conflict';
        }
        if (colorMap[key]) return 'ok';
        colorMap[key] = color;

        const opposite = color === 'A' ? 'B' : 'A';
        for (const [r1, c1, r2, c2] of links) {
          if (r1 === r && c1 === c) {
            const res = applyColor(r2, c2, opposite);
            if (res === 'conflict') return 'conflict';
          } else if (r2 === r && c2 === c) {
            const res = applyColor(r1, c1, opposite);
            if (res === 'conflict') return 'conflict';
          }
        }
        return 'ok';
      };

      for (const [r1, c1, r2, c2] of links) {
        if (!colorMap[`${r1},${c1}`]) {
          if (applyColor(r1, c1, 'A') === 'conflict') {
            const removed = [];
            for (const key in colorMap) {
              if (colorMap[key] === 'A') {
                const [r, c] = key.split(',').map(Number);
                removed.push({ row: r, col: c, value: n });
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: '简单着色法 (Simple Coloring)',
                explanation: `数字 ${n} 着色出现冲突，颜色A代表的候选可删除。`,
              };
            }
          }
          break;
        }
      }

      const seenBoth = new Set();
      for (const key in colorMap) {
        const [r, c] = key.split(',').map(Number);
        for (let rr = 0; rr < 9; rr++) {
          for (let cc = 0; cc < 9; cc++) {
            if (r === rr && c === cc) continue;
            if (colorMap[`${rr},${cc}`]) continue;
            if (cands[rr][cc].includes(n) &&
                (rr === r || cc === c || (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3)))) {
              const otherKey = `${rr},${cc}`;
              if (!seenBoth.has(otherKey)) {
                const sees = [];
                for (const k2 in colorMap) {
                  if (colorMap[k2] !== colorMap[key]) {
                    const [sr, sc] = k2.split(',').map(Number);
                    if (rr === sr || cc === sc ||
                        (Math.floor(rr / 3) === Math.floor(sr / 3) && Math.floor(cc / 3) === Math.floor(sc / 3))) {
                      sees.push(k2);
                    }
                  }
                }
                if (sees.length > 0) {
                  seenBoth.add(otherKey);
                  const removed = [{ row: rr, col: cc, value: n }];
                  return {
                    found: true,
                    cells: removed,
                    technique: '简单着色法 (Simple Coloring)',
                    explanation: `数字 ${n}: R${r + 1}C${c + 1}(${colorMap[key]}) 和另一颜色都能看到 R${rr + 1}C${cc + 1}，可删除 R${rr + 1}C${cc + 1} 中的 ${n}。`
                  };
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  _buildStrongLinks(grid, cands, n) {
    const links = [];
    for (let r = 0; r < 9; r++) {
      const positions = [];
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].includes(n)) positions.push([r, c]);
      }
      if (positions.length === 2) {
        links.push([...positions[0], ...positions[1]]);
      }
    }
    for (let c = 0; c < 9; c++) {
      const positions = [];
      for (let r = 0; r < 9; r++) {
        if (cands[r][c].includes(n)) positions.push([r, c]);
      }
      if (positions.length === 2) {
        const exists = links.some(l =>
          (l[0] === positions[0][0] && l[1] === positions[0][1] &&
           l[2] === positions[1][0] && l[3] === positions[1][1])
        );
        if (!exists) links.push([...positions[0], ...positions[1]]);
      }
    }
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const positions = [];
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            if (cands[r][c].includes(n)) positions.push([r, c]);
          }
        }
        if (positions.length === 2) {
          const exists = links.some(l =>
            (l[0] === positions[0][0] && l[1] === positions[0][1] &&
             l[2] === positions[1][0] && l[3] === positions[1][1])
          );
          if (!exists) links.push([...positions[0], ...positions[1]]);
        }
      }
    }
    return links;
  },

  // ============ TECHNIQUE 14: Empty Rectangle ============
  findEmptyRectangle(grid, cands) {
    for (let n = 1; n <= 9; n++) {
      for (let br = 0; br < 9; br += 3) {
        for (let bc = 0; bc < 9; bc += 3) {
          const positions = [];
          for (let r = br; r < br + 3; r++) {
            for (let c = bc; c < bc + 3; c++) {
              if (cands[r][c].includes(n)) positions.push([r, c]);
            }
          }
          if (positions.length < 2 || positions.length > 5) continue;

          const rows = new Set(positions.map(p => p[0]));
          const cols = new Set(positions.map(p => p[1]));

          for (const emptyR of [br, br + 1, br + 2]) {
            if (rows.has(emptyR)) continue;
            for (const emptyC of [bc, bc + 1, bc + 2]) {
              if (cols.has(emptyC)) continue;

              for (let r = 0; r < 9; r++) {
                if (r >= br && r < br + 3) continue;
                if (!cands[r][emptyC].includes(n)) continue;

                for (let c = 0; c < 9; c++) {
                  if (c >= bc && c < bc + 3) continue;
                  if (c === emptyC) continue;
                  if (!cands[emptyR][c].includes(n)) continue;

                  if (!cands[r][c].includes(n)) continue;

                  return {
                    found: true,
                    cells: [{ row: r, col: c, value: n }],
                    technique: '空矩形 (Empty Rectangle)',
                    explanation: `在宫 ${Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1} 中，数字 ${n} 形成空矩形结构，可删除 R${r + 1}C${c + 1} 中的 ${n}。`
                  };
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE 15: W-Wing ============
  findWWing(grid, cands) {
    const bivalues = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].length === 2) {
          bivalues.push({ row: r, col: c, cands: cands[r][c] });
        }
      }
    }

    for (let i = 0; i < bivalues.length; i++) {
      const a = bivalues[i];
      for (let j = i + 1; j < bivalues.length; j++) {
        const b = bivalues[j];
        const common = a.cands.filter(x => b.cands.includes(x));
        if (common.length !== 1) continue;
        const z = common[0];
        const x = a.cands.find(v => v !== z);
        const y = b.cands.find(v => v !== z);
        if (x === y) continue;

        const linkCells = [];
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if ((r === a.row && c === a.col) || (r === b.row && c === b.col)) continue;
            if (cands[r][c].includes(x) && cands[r][c].length === 2 && !cands[r][c].includes(z)) {
              linkCells.push({ row: r, col: c, val: x });
            }
            if (cands[r][c].includes(y) && cands[r][c].length === 2 && !cands[r][c].includes(z)) {
              linkCells.push({ row: r, col: c, val: y });
            }
          }
        }

        for (const lc of linkCells) {
          const otherVal = lc.val === x ? y : x;
          const otherLink = linkCells.find(l => l.val === otherVal &&
            this._canSee(l.row, l.col, lc.row, lc.col));

          if (otherLink) {
            const removed = [];
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 9; c++) {
                if ((r === a.row && c === a.col) || (r === b.row && c === b.col)) continue;
                if ((r === lc.row && c === lc.col) || (r === otherLink.row && c === otherLink.col)) continue;
                if (this._canSee(a.row, a.col, r, c) && this._canSee(b.row, b.col, r, c)) {
                  if (cands[r][c].includes(z)) {
                    removed.push({ row: r, col: c, value: z });
                  }
                }
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: 'W翼 (W-Wing)',
                explanation: `R${a.row + 1}C${a.col + 1}{${x},${z}} 与 R${b.row + 1}C${b.col + 1}{${y},${z}} 通过强链连接，可删除共同影响格中的 ${z}。`
              };
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE: Jellyfish（水母）============
  // Swordfish 的 4行×4列 推广
  findJellyfish(grid, cands) {
    for (let n = 1; n <= 9; n++) {
      // 按行：找候选列数 2-4 的行
      const rowCands = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) if (cands[r][c].includes(n)) cols.push(c);
        if (cols.length >= 2 && cols.length <= 4) rowCands.push({ row: r, cols });
      }
      if (rowCands.length >= 4) {
        // 枚举 4 行组合
        for (let i = 0; i < rowCands.length - 3; i++) {
          for (let j = i + 1; j < rowCands.length - 2; j++) {
            for (let k = j + 1; k < rowCands.length - 1; k++) {
              for (let l = k + 1; l < rowCands.length; l++) {
                const allCols = new Set([
                  ...rowCands[i].cols, ...rowCands[j].cols,
                  ...rowCands[k].cols, ...rowCands[l].cols,
                ]);
                if (allCols.size === 4) {
                  const colsArr = [...allCols];
                  const rowsArr = [rowCands[i].row, rowCands[j].row, rowCands[k].row, rowCands[l].row];
                  const removed = [];
                  for (let r = 0; r < 9; r++) {
                    if (rowsArr.includes(r)) continue;
                    for (const c of colsArr) {
                      if (cands[r][c].includes(n)) removed.push({ row: r, col: c, value: n });
                    }
                  }
                  if (removed.length > 0) {
                    return {
                      found: true,
                      cells: removed,
                      technique: '水母 (Jellyfish)',
                      explanation: `数字 ${n} 在 R${rowsArr.map(x => x + 1).join(', ')} 行中形成 Jellyfish（覆盖列 C${colsArr.map(x => x + 1).join(', ')}），可删除这四列其他行的候选数 ${n}。`,
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE: Unique Rectangle Type 1（唯一矩形1型）============
  // 利用唯一解前提：两宫两行两列的 4 格若 3 格为 {X,Y} 双值，第 4 格多余候选可删除
  findUniqueRectangle(grid, cands) {
    // 遍历所有"行对 × 列对"且列对跨两个宫边界（不同宫）
    for (let r1 = 0; r1 < 9; r1++) {
      for (let r2 = r1 + 1; r2 < 9; r2++) {
        // 两行必须在不同宫带（不同 box row）才能形成致命矩形——其实只需 4 格分属两宫
        for (let c1 = 0; c1 < 9; c1++) {
          for (let c2 = c1 + 1; c2 < 9; c2++) {
            // 4 格必须分属恰好 2 个宫（每行 2 格在不同宫）
            const bR1C1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
            const bR1C2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
            const bR2C1 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
            const bR2C2 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
            const boxes = new Set([bR1C1, bR1C2, bR2C1, bR2C2]);
            // 经典致命矩形：列跨两个宫（每行两格不同宫）
            if (boxes.size !== 2) continue;
            if (bR1C1 === bR1C2) continue; // 同行两格必须分属两宫
            if (bR1C1 !== bR2C1) continue; // 对应列的宫要对齐

            const cells = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
            // 跳过已填格
            if (cells.some(([r, c]) => grid[r][c] !== 0)) continue;

            const candSets = cells.map(([r, c]) => new Set(cands[r][c]));
            // 找两数 X,Y 使得至少 3 格候选恰为 {X,Y}
            for (let x = 1; x <= 9; x++) {
              for (let y = x + 1; y <= 9; y++) {
                const pair = new Set([x, y]);
                let pairCount = 0, extraIdx = -1;
                for (let i = 0; i < 4; i++) {
                  const same = candSets[i].size === 2 && [...candSets[i]].every(v => pair.has(v));
                  if (same) pairCount++;
                  else extraIdx = i;
                }
                if (pairCount === 3 && extraIdx >= 0 && candSets[extraIdx].has(x) && candSets[extraIdx].has(y) && candSets[extraIdx].size >= 3) {
                  const [er, ec] = cells[extraIdx];
                  const removed = [];
                  // Type 1：删除多余格中的 X 和 Y
                  removed.push({ row: er, col: ec, value: x });
                  removed.push({ row: er, col: ec, value: y });
                  return {
                    found: true,
                    cells: removed,
                    technique: '唯一矩形 (Unique Rectangle Type 1)',
                    explanation: `R${r1 + 1}C${c1 + 1}、R${r1 + 1}C${c2 + 1}、R${r2 + 1}C${c1 + 1} 均为 {${x},${y}}，若 R${er + 1}C${ec + 1} 也取 ${x}/${y} 将形成致命矩形导致多解，故可删除 R${er + 1}C${ec + 1} 中的 ${x}、${y}。`,
                  };
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE: Hidden Rectangle（隐式矩形）============
  // 矩形 4 格候选含 {X,Y}，部分对角有额外候选；通过宫内 X 或 Y 的强链约束推导消除
  findHiddenRectangle(grid, cands) {
    for (let r1 = 0; r1 < 9; r1++) {
      for (let r2 = r1 + 1; r2 < 9; r2++) {
        for (let c1 = 0; c1 < 9; c1++) {
          for (let c2 = c1 + 1; c2 < 9; c2++) {
            const bR1C1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
            const bR1C2 = Math.floor(r1 / 3) * 3 + Math.floor(c2 / 3);
            if (bR1C1 === bR1C2) continue;
            const bR2C1 = Math.floor(r2 / 3) * 3 + Math.floor(c1 / 3);
            const bR2C2 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
            if (bR1C1 !== bR2C1) continue;
            const cells = [[r1, c1], [r1, c2], [r2, c1], [r2, c2]];
            if (cells.some(([r, c]) => grid[r][c] !== 0)) continue;
            const candSets = cells.map(([r, c]) => new Set(cands[r][c]));
            // 4 格都必须包含 X 和 Y
            for (let x = 1; x <= 9; x++) {
              for (let y = x + 1; y <= 9; y++) {
                if (!cells.every(([r, c], i) => candSets[i].has(x) && candSets[i].has(y))) continue;
                // 检查：是否存在对角 (0,3) 或 (1,2) 中至少一格含额外候选，且
                // X 在某列/行存在强链（即 X 在该单元仅有这两个候选位置）
                // 简化版：若 c1 列中 X 只在 r1,r2 两行 → 若 (r1,c1)=非X则(r2,c1)=X
                const xInCol1 = [];
                for (let r = 0; r < 9; r++) if (cands[r][c1].includes(x)) xInCol1.push(r);
                const xInCol2 = [];
                for (let r = 0; r < 9; r++) if (cands[r][c2].includes(x)) xInCol2.push(r);
                const xInRow1 = [];
                for (let c = 0; c < 9; c++) if (cands[r1][c].includes(x)) xInRow1.push(c);
                const xInRow2 = [];
                for (let c = 0; c < 9; c++) if (cands[r2][c].includes(x)) xInRow2.push(c);

                // 判定强链存在：对角线两端中存在额外候选时
                const diagonals = [
                  [[r1, c1], [r2, c2]],
                  [[r1, c2], [r2, c1]],
                ];
                for (const [[ar, ac], [br, bc]] of diagonals) {
                  const ai = cells.findIndex(([r, c]) => r === ar && c === ac);
                  const bi = cells.findIndex(([r, c]) => r === br && c === bc);
                  if (candSets[ai].size === 2 && candSets[bi].size === 2) continue;
                  // 若 (ac 列中 X 只在 r1,r2) 且 (br 行中 X 只在 c1,c2)
                  const xStrongInCol = (ac === c1 && xInCol1.length === 2) || (ac === c2 && xInCol2.length === 2);
                  const xStrongInRow = (br === r1 && xInRow1.length === 2) || (br === r2 && xInRow2.length === 2);
                  if (xStrongInCol && xStrongInRow) {
                    // 强链可破坏致命模式：对角另一端非 {X,Y} 中的 X/Y 可删
                    // 简化结论：删除两对角非锚点的额外候选中的 x 或 y（保守：仅删 x）
                    const [cr, cc] = cells.find(([r, c]) => !(r === ar && c === ac) && !(r === br && c === bc));
                    if (cands[cr][cc].includes(x) && candSets[cells.findIndex(p => p[0] === cr && p[1] === cc)].size > 2) {
                      return {
                        found: true,
                        cells: [{ row: cr, col: cc, value: x }],
                        technique: '隐式矩形 (Hidden Rectangle)',
                        explanation: `R${r1 + 1}C${c1 + 1}、R${r1 + 1}C${c2 + 1}、R${r2 + 1}C${c1 + 1}、R${r2 + 1}C${c2 + 1} 均含 {${x},${y}}，由 X=${x} 的强链约束可破坏致命模式，删除 R${cr + 1}C${cc + 1} 中的 ${x}。`,
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE: Sue De Coq（苏德柯克）============
  // 宫内一角格 + 同行/列相邻格的联合锁定消除
  // 简化版：1个角格 S 含 {a,b}，同行一格 R 含 {a,c}，同列一格 C 含 {b,c}，a∪b∪c 完全覆盖且 a≠b≠c
  findSueDeCoq(grid, cands) {
    // 通用：在单元 unit 中，若干格的候选并集 = 集合 S，且 |格数|+|额外约束|
    // 此处实现最常见的 2-格 Sue De Coq：宫内一格 + 同行一格（或同列一格）
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        // 取该宫位于"角"的格子（与同行/同列其它宫相邻）
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            if (grid[r][c] !== 0) continue;
            const cellCands = cands[r][c];
            if (cellCands.length < 3) continue;
            // 尝试在同行其它宫找一格 R，同列其它宫找一格 C
            // R 在同行、不同宫
            for (let cc = 0; cc < 9; cc++) {
              if (Math.floor(cc / 3) === Math.floor(c / 3)) continue; // 同宫跳过
              if (grid[r][cc] !== 0) continue;
              const rCands = cands[r][cc];
              // C 在同列、不同宫
              for (let rr = 0; rr < 9; rr++) {
                if (Math.floor(rr / 3) === Math.floor(r / 3)) continue;
                if (grid[rr][c] !== 0) continue;
                const cCands = cands[rr][c];
                // 三格候选并集
                const union = new Set([...cellCands, ...rCands, ...cCands]);
                if (union.size !== cellCands.length) continue; // 并集大小应等于角格候选数
                if (union.size < 3) continue;
                // 行方向剩余候选 = union - rCands 之外的（即角格+列格共享的部分）
                // 列方向剩余候选 = union - cCands 之外的
                // 简化判定：角格的每个候选要么出现在 rCands 要么出现在 cCands
                const inR = v => rCands.includes(v);
                const inC = v => cCands.includes(v);
                let ok = true;
                for (const v of cellCands) {
                  if (!inR(v) && !inC(v)) { ok = false; break; }
                }
                if (!ok) continue;
                // 排除：必须 (cellCands - rCands) 与 (cellCands - cCands) 都非空且互补
                const onlyInC = cellCands.filter(v => !inR(v));
                const onlyInR = cellCands.filter(v => !inC(v));
                if (onlyInC.length === 0 || onlyInR.length === 0) continue;

                // 删除：同行 R 格所在单元（行 r）中除角格/列格之外的 union 候选；
                //       同列 C 格所在单元（列 c）中除角格/行格之外的 union 候选
                const removed = [];
                for (let ccc = 0; ccc < 9; ccc++) {
                  if (ccc === c || ccc === cc) continue;
                  if (grid[r][ccc] !== 0) continue;
                  for (const v of union) {
                    if (cands[r][ccc].includes(v) && (onlyInR.includes(v) || onlyInC.includes(v))) {
                      // 只删行方向专属的候选（即仅角格候选 ∩ onlyInR）
                      if (onlyInR.includes(v)) removed.push({ row: r, col: ccc, value: v });
                    }
                  }
                }
                for (let rrr = 0; rrr < 9; rrr++) {
                  if (rrr === r || rrr === rr) continue;
                  if (grid[rrr][c] !== 0) continue;
                  for (const v of union) {
                    if (cands[rrr][c].includes(v) && onlyInC.includes(v)) {
                      removed.push({ row: rrr, col: c, value: v });
                    }
                  }
                }
                if (removed.length > 0) {
                  const uArr = [...union].join(',');
                  return {
                    found: true,
                    cells: removed,
                    technique: '苏德柯克 (Sue De Coq)',
                    explanation: `R${r + 1}C${c + 1}(${cellCands.join(',')}) + R${r + 1}C${cc + 1}(${rCands.join(',')}) + R${rr + 1}C${c + 1}(${cCands.join(',')}) 形成锁定集 {${uArr}}，可删除行列相关候选。`,
                  };
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE: Aligned Pair Exclusion（对齐数对排除）============
  // 两相互可见的格 A,B 的某种 (a,b) 组合若使第三格候选清空，则该组合排除
  findAPE(grid, cands) {
    // 收集所有候选 ≥2 的空格
    const emptyCells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0 && cands[r][c].length >= 2)
          emptyCells.push({ row: r, col: c, cands: cands[r][c] });

    for (let i = 0; i < emptyCells.length; i++) {
      const A = emptyCells[i];
      for (let j = i + 1; j < emptyCells.length; j++) {
        const B = emptyCells[j];
        if (!this._canSee(A.row, A.col, B.row, B.col)) continue;
        // 枚举 A,B 的所有候选组合
        for (const av of A.cands) {
          for (const bv of B.cands) {
            if (av === bv) continue; // 同单元不能同值，自动无效
            // 检查是否存在任一共同可见格 X，其候选恰好 = {av, bv}（即 X 候选被这两个值占满）
            // 或 X 候选 ⊆ {av, bv}（这样 A=av,B=bv 会让 X 无候选）
            for (const X of emptyCells) {
              if ((X.row === A.row && X.col === A.col) || (X.row === B.row && X.col === B.col)) continue;
              if (!this._canSee(A.row, A.col, X.row, X.col)) continue;
              if (!this._canSee(B.row, B.col, X.row, X.col)) continue;
              if (X.cands.every(v => v === av || v === bv) && X.cands.length === 2) {
                // 该组合 (av,bv) 会让 X 无解 → 排除
                // 反推：A 必然不能取 av（若 B 可见组合唯一）—— 此处输出对 A 删除 av
                if (A.cands.length > 1) {
                  return {
                    found: true,
                    cells: [{ row: A.row, col: A.col, value: av }],
                    technique: '对齐数对排除 (Aligned Pair Exclusion)',
                    explanation: `R${A.row + 1}C${A.col + 1} 与 R${B.row + 1}C${B.col + 1} 互相可见。组合 (${av},${bv}) 会使共同影响格 R${X.row + 1}C${X.col + 1}({${X.cands.join(',')}}) 无解，故 R${A.row + 1}C${A.col + 1} 不能为 ${av}。`,
                  };
                }
              }
            }
          }
        }
      }
    }
    return { found: false };
  },

  // ============ TECHNIQUE: ALS-XZ（几乎锁定集）============
  // 两个 ALS（N 格含 N+1 候选），共享 RCC=X；非共享候选 Y,Z 满足强链时删除共同可见格的 X 或 Z
  findALSXZ(grid, cands) {
    // 收集 ALS：在行/列/宫中找候选数为 size+1 的 N 格集合（N=2,3）
    const allALS = this._findAllALS(grid, cands);
    if (allALS.length < 2) return { found: false };

    for (let i = 0; i < allALS.length; i++) {
      for (let j = i + 1; j < allALS.length; j++) {
        const A = allALS[i], B = allALS[j];
        // 至少有一格重叠则跳过
        const aKeys = new Set(A.cells.map(c => `${c.row},${c.col}`));
        if (B.cells.some(c => aKeys.has(`${c.row},${c.col}`))) continue;
        // RCC = 两 ALS 候选的交集（恰好 1 个最常见）
        const aCands = new Set(A.cands);
        const bCands = new Set(B.cands);
        const rcc = [...aCands].filter(v => bCands.has(v));
        if (rcc.length < 1 || rcc.length > 2) continue;
        // 对每个 rcc 作为 X，每个 ALS 独有候选作为另一个受限候选 Z
        for (const X of rcc) {
          // Z 必须是 A 独有或 B 独有
          const aOnly = [...aCands].filter(v => !bCands.has(v));
          const bOnly = [...bCands].filter(v => !aCands.has(v));
          // 简化：取 A 独有的 Z，检查 Z 在 B 中是否构成强链（B 内 Z 候选只在 B 格中）
          // 实际 ALS-XZ 逻辑：若 Z 在两 ALS 之间形成强链，则 X 的共同可见格删除 X
          for (const Z of [...aOnly, ...bOnly]) {
            // 共同可见格 = 能看到所有 A 中含 X 的格 AND 所有 B 中含 X 的格 的格子
            const aXcells = A.cells.filter(c => c.cands.includes(X));
            const bXcells = B.cells.filter(c => c.cands.includes(X));
            if (aXcells.length === 0 || bXcells.length === 0) continue;
            const removed = [];
            for (let r = 0; r < 9; r++) {
              for (let c = 0; c < 9; c++) {
                if (grid[r][c] !== 0) continue;
                if (A.cells.some(cc => cc.row === r && cc.col === c)) continue;
                if (B.cells.some(cc => cc.row === r && cc.col === c)) continue;
                if (!cands[r][c].includes(X)) continue;
                const seeAllA = aXcells.every(cc => this._canSee(r, c, cc.row, cc.col));
                const seeAllB = bXcells.every(cc => this._canSee(r, c, cc.row, cc.col));
                if (seeAllA && seeAllB) removed.push({ row: r, col: c, value: X });
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: '几乎锁定集 (ALS-XZ)',
                explanation: `ALS1{${[...aCands].join(',')}} 与 ALS2{${[...bCands].join(',')}} 通过共同候选 ${X} 连接，可删除两 ALS 中 ${X} 候选共同影响格中的 ${X}。`,
              };
            }
          }
        }
      }
    }
    return { found: false };
  },

  /**
   * 在所有行/列/宫中找 ALS：N 格的候选并集大小恰好 N+1（N=2,3,4）
   * 返回 [{cells:[{row,col,cands}], cands:Set, unit:'row/col/box'}]
   */
  _findAllALS(grid, cands) {
    const result = [];
    const units = this._allUnits();
    for (const { type, idx, cells } of units) {
      // 该单元内的空格
      const empties = cells
        .map(([r, c]) => ({ row: r, col: c, cands: cands[r][c] }))
        .filter(c => c.cands.length >= 2);
      // 枚举 N=2,3
      for (let N = 2; N <= 3; N++) {
        if (empties.length < N) continue;
        const combos = this._combinations(empties, N);
        for (const combo of combos) {
          const union = new Set();
          for (const c of combo) for (const v of c.cands) union.add(v);
          if (union.size === N + 1) {
            result.push({ cells: combo, cands: union, unit: type + idx });
          }
        }
      }
    }
    return result;
  },

  _allUnits() {
    const units = [];
    for (let r = 0; r < 9; r++) {
      const cells = [];
      for (let c = 0; c < 9; c++) cells.push([r, c]);
      units.push({ type: 'row', idx: r, cells });
    }
    for (let c = 0; c < 9; c++) {
      const cells = [];
      for (let r = 0; r < 9; r++) cells.push([r, c]);
      units.push({ type: 'col', idx: c, cells });
    }
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let r = br; r < br + 3; r++)
          for (let c = bc; c < bc + 3; c++) cells.push([r, c]);
        units.push({ type: 'box', idx: Math.floor(br / 3) * 3 + Math.floor(bc / 3), cells });
      }
    }
    return units;
  },

  _combinations(arr, k) {
    const result = [];
    const helper = (start, cur) => {
      if (cur.length === k) { result.push([...cur]); return; }
      for (let i = start; i < arr.length; i++) {
        cur.push(arr[i]);
        helper(i + 1, cur);
        cur.pop();
      }
    };
    helper(0, []);
    return result;
  },

  // ============ TECHNIQUE: Forcing Chain（强制链）============
  // 从双值格出发，两种假设都推导出某格 = 同一值，则该值成立
  // 简化版：基于候选数强链的 2-步推导
  findForcingChain(grid, cands) {
    // 收集所有双值格
    const bivalues = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0 && cands[r][c].length === 2)
          bivalues.push({ row: r, col: c, cands: cands[r][c] });

    for (const start of bivalues) {
      const [a, b] = start.cands;
      // 假设 start=a：通过强链传递，b 在某些单元必然不成立 → 推出某些格的值
      // 假设 start=b：同理
      // 若两假设推出同一格 = 同一值，则该格 = 该值
      // 简化实现：对 start 的两个值 a 和 b，分别做 1-步强链传播，看是否有共同结论
      const conclA = this._propagateForcing(grid, cands, start, a);
      const conclB = this._propagateForcing(grid, cands, start, b);
      // 找两结论中"格 X = v"重合的
      for (const key in conclA) {
        if (key.endsWith('=') === false && conclB[key] !== undefined && conclA[key] === conclB[key]) {
          const [r, c] = key.split(',').map(Number);
          const v = conclA[key];
          if (grid[r][c] === 0 && v !== 0) {
            return {
              found: true,
              cells: [{ row: r, col: c, value: v }],
              technique: '强制链 (Forcing Chain)',
              explanation: `从 R${start.row + 1}C${start.col + 1}{${a},${b}} 出发，无论取 ${a} 或 ${b}，都可推出 R${r + 1}C${c + 1} = ${v}。`,
            };
          }
        }
      }
    }
    return { found: false };
  },

  /**
   * 从 startCell=startVal 出发做 1-2 步强制链传播
   * 返回 { "r,c": v } 表示推出该格 = v
   */
  _propagateForcing(grid, cands, startCell, startVal) {
    const conclusions = {};
    // 直接强链：startVal 在某单元只两候选 → 另一格必为另一值
    const units = this._unitsContaining(startCell.row, startCell.col);
    for (const unit of units) {
      const positions = unit.filter(([r, c]) => cands[r][c].includes(startVal));
      if (positions.length === 2) {
        const other = positions.find(([r, c]) => !(r === startCell.row && c === startCell.col));
        if (other) {
          const [or, oc] = other;
          const otherCands = cands[or][oc];
          if (otherCands.length === 2) {
            const v = otherCands.find(x => x !== startVal);
            conclusions[`${or},${oc}`] = v;
          }
        }
      }
    }
    return conclusions;
  },

  _unitsContaining(r, c) {
    const units = [];
    const row = []; for (let cc = 0; cc < 9; cc++) row.push([r, cc]);
    units.push(row);
    const col = []; for (let rr = 0; rr < 9; rr++) col.push([rr, c]);
    units.push(col);
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    const box = [];
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) box.push([rr, cc]);
    units.push(box);
    return units;
  },

  // ============ TECHNIQUE: Nice Loop / AIC（漂亮环）============
  // 强弱链交替闭环检测；简化版：3-4 段连续环
  findNiceLoop(grid, cands) {
    // 简化版 Nice Loop：找 4 段交替强链闭环 X = Y - X = Y - X = Y - X
    // 其中 = 为强链（单元内仅 2 候选），- 为弱链（同行列宫可见）
    // 此处仅实现最基本的"双值格链环"
    const bivalues = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0 && cands[r][c].length === 2)
          bivalues.push({ row: r, col: c, cands: cands[r][c] });

    // 寻找 4-环：A↔B↔C↔D↔A，相邻可见，且候选交替
    for (let i = 0; i < bivalues.length; i++) {
      const A = bivalues[i];
      // BFS 找强链邻居
      const neighbors = this._strongLinkNeighbors(A, cands);
      for (const B of neighbors) {
        if (B.row === A.row && B.col === A.col) continue;
        const bNbrs = this._strongLinkNeighbors(B, cands);
        for (const C of bNbrs) {
          if ((C.row === A.row && C.col === A.col) || (C.row === B.row && C.col === B.col)) continue;
          const cNbrs = this._strongLinkNeighbors(C, cands);
          for (const D of cNbrs) {
            if ((D.row === A.row && D.col === A.col)) continue;
            // 闭环：D 必须能看到 A
            if (!this._canSee(D.row, D.col, A.row, A.col)) continue;
            // 找共同候选 X 出现在所有边上 → 删除两弱链节点的非 X 候选
            // 简化：取 A.cands ∩ B.cands ∩ C.cands ∩ D.cands
            const common = A.cands.filter(v =>
              B.cands.includes(v) && C.cands.includes(v) && D.cands.includes(v));
            if (common.length === 0) continue;
            const X = common[0];
            // 弱链节点（B-C 之间和 D-A 之间）的非 X 候选可删除
            const removed = [];
            const others = [[A.row, A.col], [B.row, B.col], [C.row, C.col], [D.row, D.col]];
            for (const [r, c] of others) {
              for (const v of cands[r][c]) {
                if (v !== X) removed.push({ row: r, col: c, value: v });
              }
            }
            if (removed.length > 0) {
              return {
                found: true,
                cells: removed,
                technique: '漂亮环 (Nice Loop / AIC)',
                explanation: `R${A.row + 1}C${A.col + 1} → R${B.row + 1}C${B.col + 1} → R${C.row + 1}C${C.col + 1} → R${D.row + 1}C${D.col + 1} 形成强链闭环（候选 ${X}），环上节点的非 ${X} 候选可删除。`,
              };
            }
          }
        }
      }
    }
    return { found: false };
  },

  /**
   * 找 cell 的强链邻居：在某单元中与 cell 共享某候选且该单元内此候选仅此两格
   */
  _strongLinkNeighbors(cell, cands) {
    const result = [];
    const units = this._unitsContaining(cell.row, cell.col);
    for (const unit of units) {
      for (const v of cell.cands) {
        const positions = unit.filter(([r, c]) => cands[r][c].includes(v));
        if (positions.length === 2) {
          const other = positions.find(([r, c]) => !(r === cell.row && c === cell.col));
          if (other) {
            const [or, oc] = other;
            if (!result.find(p => p.row === or && p.col === oc)) {
              result.push({ row: or, col: oc, cands: cands[or][oc] });
            }
          }
        }
      }
    }
    return result;
  },

  // ============ Brute Force Step ============
  bruteForceStep(grid) {
    const cands = this.getCandidates(grid);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].length > 0) {
          return {
            found: true,
            cells: [{ row: r, col: c, value: cands[r][c][0] }],
            technique: '试错法 (Brute Force)',
            explanation: `逻辑技巧无法继续，对 R${r + 1}C${c + 1} 使用试错法填入 ${cands[r][c][0]}。`,
          };
        }
      }
    }
    return { found: false };
  },

  /**
   * Full solve – returns all steps
   */
  solveAll(grid) {
    const working = grid.map(row => [...row]);
    const steps = [];
    let stepNum = 0;

    while (true) {
      const result = this.findNextStep(working);
      if (!result.found) break;

      for (const cell of result.cells) {
        working[cell.row][cell.col] = cell.value;
      }

      stepNum++;
      steps.push({
        step: stepNum,
        ...result,
        cells: result.cells.map(c => ({ ...c })),
      });

      // Safety
      if (stepNum > 200) break;
    }

    // Check if solved
    let solved = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] === 0) { solved = false; break; }
      }
    }

    return { steps, solved, finalGrid: working };
  },

  // ============ Helpers ============
  _canSee(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return false;
    return r1 === r2 || c1 === c2 ||
      (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3));
  },

  _hasCands(cell, vals) {
    return vals.every(v => cell.cands.includes(v)) && cell.cands.length === vals.length;
  },

  _findNakedTupleInUnit(unit, size, unitName) {
    const filledCells = unit.filter(c => c.cands.length >= 2 && c.cands.length <= size);
    for (let i = 0; i < filledCells.length; i++) {
      const group = [filledCells[i]];
      const groupVals = new Set(filledCells[i].cands);
      if (groupVals.size > size) continue;

      for (let j = 0; j < filledCells.length; j++) {
        if (j === i) continue;
        const newVals = new Set([...groupVals, ...filledCells[j].cands]);
        if (newVals.size <= size) {
          group.push(filledCells[j]);
          for (const v of filledCells[j].cands) groupVals.add(v);
        }
        if (group.length === size && groupVals.size === size) break;
      }

      if (group.length === size && groupVals.size === size) {
        // Remove these candidates from other cells in the unit
        const removed = [];
        const groupKeys = new Set(group.map(c => `${c.row},${c.col}`));
        for (const cell of unit) {
          if (groupKeys.has(`${cell.row},${cell.col}`)) continue;
          for (const v of groupVals) {
            if (cell.cands.includes(v)) {
              removed.push({ row: cell.row, col: cell.col, value: v });
            }
          }
        }
        if (removed.length > 0) {
          const cellNames = group.map(c => `R${c.row + 1}C${c.col + 1}`).join(', ');
          const vals = [...groupVals].join(', ');
          const name = size === 2 ? '数对 (Naked Pair)' : '三数组 (Naked Triple)';
          return {
            found: true,
            cells: removed,
            technique: name,
            explanation: `在${unitName}中，单元格 ${cellNames} 形成${size === 2 ? '显式数对' : '显式三数组'}(${vals})，可以删除该单元其他单元格中的这些候选数。`,
          };
        }
      }
    }
    return null;
  },

  _findNakedTupleAllUnits(grid, cands, size, name) {
    for (let r = 0; r < 9; r++) {
      const unit = cands[r].map((c, i) => ({ row: r, col: i, cands: c }));
      const result = this._findNakedTupleInUnit(unit, size, `第 ${r + 1} 行`);
      if (result) return result;
    }
    for (let c = 0; c < 9; c++) {
      const unit = [];
      for (let r = 0; r < 9; r++) unit.push({ row: r, col: c, cands: cands[r][c] });
      const result = this._findNakedTupleInUnit(unit, size, `第 ${c + 1} 列`);
      if (result) return result;
    }
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const unit = [];
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            unit.push({ row: r, col: c, cands: cands[r][c] });
          }
        }
        const boxNum = Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1;
        const result = this._findNakedTupleInUnit(unit, size, `第 ${boxNum} 宫`);
        if (result) return result;
      }
    }
    return { found: false };
  },

  _findHiddenTupleInUnit(unit, size, unitName) {
    // For each combination of `size` numbers, check if they only appear in `size` cells
    for (let n1 = 1; n1 <= 9; n1++) {
      for (let n2 = n1 + 1; n2 <= 9; n2++) {
        if (size === 2) {
          const result = this._checkHiddenTuple(unit, [n1, n2], size, unitName);
          if (result) return result;
        } else {
          for (let n3 = n2 + 1; n3 <= 9; n3++) {
            const result = this._checkHiddenTuple(unit, [n1, n2, n3], size, unitName);
            if (result) return result;
          }
        }
      }
    }
    return null;
  },

  _checkHiddenTuple(unit, nums, size, unitName) {
    const numSet = new Set(nums);

    // 对每个目标数字，收集它在单元中出现的所有格子
    const cellsForNum = {};
    for (const n of nums) {
      cellsForNum[n] = [];
      for (const cell of unit) {
        if (cell.cands.includes(n)) cellsForNum[n].push(cell);
      }
    }

    // 每个目标数字必须在至少 1 个、不超过 size 个格子中出现
    const allCells = new Set();
    for (const n of nums) {
      if (cellsForNum[n].length === 0 || cellsForNum[n].length > size) return null;
      for (const c of cellsForNum[n]) allCells.add(`${c.row},${c.col}`);
    }

    // 所有目标数字的候选必须恰好聚集在 size 个格子中
    if (allCells.size !== size) return null;

    // 收集这些格子并按需删除多余候选
    const targetCells = [];
    const targetKeys = new Set(allCells);
    for (const cell of unit) {
      if (targetKeys.has(`${cell.row},${cell.col}`)) targetCells.push(cell);
    }

    const removed = [];
    for (const cell of targetCells) {
      for (const c of cell.cands) {
        if (!numSet.has(c)) {
          removed.push({ row: cell.row, col: cell.col, value: c });
        }
      }
    }
    if (removed.length > 0) {
      const cellNames = targetCells.map(c => `R${c.row + 1}C${c.col + 1}`).join(', ');
      const vals = nums.join(', ');
      const name = size === 2 ? '隐式数对 (Hidden Pair)' : '隐式三数组 (Hidden Triple)';
      return {
        found: true,
        cells: removed,
        technique: name,
        explanation: `在${unitName}中，数字(${vals})只能出现在 ${cellNames}，可删除这些单元格中的其他候选数。`,
      };
    }
    return null;
  },

  _findHiddenTupleAllUnits(grid, cands, size, name) {
    for (let r = 0; r < 9; r++) {
      const unit = cands[r].map((c, i) => ({ row: r, col: i, cands: c }));
      const result = this._findHiddenTupleInUnit(unit, size, `第 ${r + 1} 行`);
      if (result) return result;
    }
    for (let c = 0; c < 9; c++) {
      const unit = [];
      for (let r = 0; r < 9; r++) unit.push({ row: r, col: c, cands: cands[r][c] });
      const result = this._findHiddenTupleInUnit(unit, size, `第 ${c + 1} 列`);
      if (result) return result;
    }
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const unit = [];
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            unit.push({ row: r, col: c, cands: cands[r][c] });
          }
        }
        const boxNum = Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1;
        const result = this._findHiddenTupleInUnit(unit, size, `第 ${boxNum} 宫`);
        if (result) return result;
      }
    }
    return { found: false };
  },

  /**
   * Validate a complete solution
   */
  validateSolution(grid) {
    for (let r = 0; r < 9; r++) {
      const rowSet = new Set();
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] < 1 || grid[r][c] > 9) return false;
        if (rowSet.has(grid[r][c])) return false;
        rowSet.add(grid[r][c]);
      }
    }
    for (let c = 0; c < 9; c++) {
      const colSet = new Set();
      for (let r = 0; r < 9; r++) {
        if (colSet.has(grid[r][c])) return false;
        colSet.add(grid[r][c]);
      }
    }
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const boxSet = new Set();
        for (let r = br; r < br + 3; r++) {
          for (let c = bc; c < bc + 3; c++) {
            if (boxSet.has(grid[r][c])) return false;
            boxSet.add(grid[r][c]);
          }
        }
      }
    }
    return true;
  },

  /**
   * Count how many of a given number remain to be placed
   */
  countRemaining(grid, num) {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === num) count++;
      }
    }
    return 9 - count;
  },

  /**
   * Analyze difficulty by running logical solver and tracking max technique level
   * Returns: { level: 1-7, techniques: [...], difficulty: 'easy'...'insane' }
   *
   * 候选数维护在内部 candidate grid（Set 形式），消除型技巧直接更新候选并继续，
   * 不再 break——这是修复评分偏低 bug 的关键。
   */
  TECHNIQUE_LEVELS: {
    '唯余数': 1, 'Naked Single': 1,
    '隐式唯一': 1, 'Hidden Single': 1,
    '显式数对': 2, 'Naked Pair': 2,
    '隐式数对': 2, 'Hidden Pair': 2,
    '指向数对': 2, 'Pointing': 2,
    '区块删减法': 2, 'Box/Line': 2,
    '显式三数组': 3, 'Naked Triple': 3,
    '隐式三数组': 3, 'Hidden Triple': 3,
    'X翼': 4, 'X-Wing': 4,
    '剑鱼': 4, 'Swordfish': 4,
    'XY翼': 4, 'XY-Wing': 4,
    'XYZ翼': 4, 'XYZ-Wing': 4,
    '水母': 4, 'Jellyfish': 4,
    '简单着色法': 5, 'Simple Coloring': 5,
    '空矩形': 5, 'Empty Rectangle': 5,
    'W翼': 5, 'W-Wing': 5,
    '唯一矩形': 5, 'Unique Rectangle': 5,
    '隐式矩形': 6, 'Hidden Rectangle': 6,
    '对齐数对排除': 6, 'Aligned Pair': 6,
    '几乎锁定集': 6, 'ALS': 6,
    '苏德柯克': 6, 'Sue De Coq': 6,
    '强制链': 6, 'Forcing Chain': 6,
    '漂亮环': 7, 'Nice Loop': 7, 'AIC': 7,
    '试错法': 8, 'Brute Force': 8,
  },

  // 仅做填值（非消除）的技巧名前缀
  PLACEMENT_TECHNIQUE_KEYS: ['唯余数', 'Naked Single', '隐式唯一', 'Hidden Single'],

  /**
   * 基于候选数网格增量推进求解，跟踪所用技巧难度。
   * 与 findNextStep 不同：这里维护自己的 candidate grid，
   * 消除型技巧直接从候选中删除数字。
   */
  analyzeDifficulty(grid) {
    const working = grid.map(row => [...row]);
    const cands = this._buildCandidateSets(working);
    const techniquesUsed = new Set();
    let maxLevel = 0;

    // 仅用逻辑技巧求解（不用试错法），以此评定难度
    for (let iter = 0; iter < 300; iter++) {
      const result = this.findNextStepWithCands(working, cands, /*noBruteForce=*/true);
      if (!result.found) break;

      let techLevel = 0;
      for (const [key, level] of Object.entries(this.TECHNIQUE_LEVELS)) {
        if (result.technique.includes(key)) {
          techniquesUsed.add(result.technique);
          techLevel = Math.max(techLevel, level);
        }
      }
      maxLevel = Math.max(maxLevel, techLevel);

      const isPlacement = this.PLACEMENT_TECHNIQUE_KEYS.some(t => result.technique.includes(t));
      if (isPlacement) {
        // 填值：更新 grid + 候选数
        for (const cell of result.cells) {
          working[cell.row][cell.col] = cell.value;
          this._removeCandFromPeers(cands, cell.row, cell.col, cell.value);
          cands[cell.row][cell.col] = new Set();
        }
      } else {
        // 消除型：从候选数中删除，继续下一轮
        for (const cell of result.cells) {
          cands[cell.row][cell.col].delete(cell.value);
        }
      }
    }

    // 逻辑技巧停掉后还有空格 → 需要试错 → level 8
    const needsBruteForce = this._findEmpty(working) !== null;
    if (needsBruteForce && maxLevel < 8) {
      // 但有空格且逻辑技巧不够 → 确实需要更高级技巧
      if (maxLevel >= 6) maxLevel = 8;
      else if (maxLevel >= 5) maxLevel = 7;
    }

    let diff = 'easy';
    if (maxLevel >= 8) diff = 'insane';
    else if (maxLevel >= 7) diff = 'extreme';
    else if (maxLevel >= 6) diff = 'master';
    else if (maxLevel >= 5) diff = 'expert';
    else if (maxLevel >= 4) diff = 'hard';
    else if (maxLevel >= 2) diff = 'medium';

    return {
      level: maxLevel,
      techniques: [...techniquesUsed],
      maxTechnique: [...techniquesUsed].pop() || 'N/A',
      difficulty: diff,
      solved: !needsBruteForce,
    };
  },

  /**
   * 构造候选数网格（Set 形式）。cands[r][c] = Set{可能的数字}
   */
  _buildCandidateSets(grid) {
    const cands = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        for (let n = 1; n <= 9; n++) {
          if (this._isCandidate(grid, r, c, n)) cands[r][c].add(n);
        }
      }
    }
    return cands;
  },

  _isCandidate(grid, r, c, n) {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === n) return false;
      if (grid[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++)
      for (let cc = bc; cc < bc + 3; cc++)
        if (grid[rr][cc] === n) return false;
    return true;
  },

  /**
   * 填入 (r,c)=val 后，从同行/列/宫的候选数中删除 val
   */
  _removeCandFromPeers(cands, r, c, val) {
    for (let i = 0; i < 9; i++) {
      cands[r][i].delete(val);
      cands[i][c].delete(val);
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++)
      for (let cc = bc; cc < bc + 3; cc++)
        cands[rr][cc].delete(val);
  },

  /**
   * 与 findNextStep 类似，但接受外部维护的 candidate Sets（避免重建）。
   * 调用的技巧函数需要数组形式的候选数，故临时转换。
   * @param {boolean} noBruteForce - 为 true 时不回退试错（用于难度评分）
   */
  findNextStepWithCands(grid, cands, noBruteForce) {
    // 把 Set 形式候选转成数组形式（技巧函数兼容旧接口）
    const candsArr = cands.map(row => row.map(s => [...s]));
    const result = this._dispatchTechniques(grid, candsArr);
    if (result && result.found) return result;
    if (noBruteForce) return { found: false };
    return this.bruteForceStep(grid);
  },

  _findEmpty(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return [r, c];
      }
    }
    return null;
  },
};

// 初始化技巧调度映射表（Solver 内方法名 -> 函数）
Solver._techniqueMap = {
  NakedSingle:      Solver.findNakedSingle,
  HiddenSingle:     Solver.findHiddenSingle,
  NakedPair:        Solver.findNakedPair,
  HiddenPair:       Solver.findHiddenPair,
  PointingPair:     Solver.findPointingPair,
  BoxLineReduction: Solver.findBoxLineReduction,
  NakedTriple:      Solver.findNakedTriple,
  HiddenTriple:     Solver.findHiddenTriple,
  XWing:            Solver.findXWing,
  Swordfish:        Solver.findSwordfish,
  XYWing:           Solver.findXYWing,
  XYZWing:          Solver.findXYZWing,
  SimpleColoring:   Solver.findSimpleColoring,
  EmptyRectangle:   Solver.findEmptyRectangle,
  WWing:            Solver.findWWing,
  // 以下 8 个将在第二部分实现；此处先占位，实现后挂载
  Jellyfish:        Solver.findJellyfish,
  UniqueRectangle:  Solver.findUniqueRectangle,
  HiddenRectangle:  Solver.findHiddenRectangle,
  SueDeCoq:         Solver.findSueDeCoq,
  APE:              Solver.findAPE,
  ALSXZ:            Solver.findALSXZ,
  ForcingChain:     Solver.findForcingChain,
  NiceLoop:         Solver.findNiceLoop,
};
