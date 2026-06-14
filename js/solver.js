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

    // Try each technique in order of difficulty
    let result;

    result = this.findNakedSingle(grid, cands);
    if (result.found) return result;

    result = this.findHiddenSingle(grid, cands);
    if (result.found) return result;

    result = this.findNakedPair(grid, cands);
    if (result.found) return result;

    result = this.findHiddenPair(grid, cands);
    if (result.found) return result;

    result = this.findPointingPair(grid, cands);
    if (result.found) return result;

    result = this.findBoxLineReduction(grid, cands);
    if (result.found) return result;

    result = this.findNakedTriple(grid, cands);
    if (result.found) return result;

    result = this.findHiddenTriple(grid, cands);
    if (result.found) return result;

    result = this.findXWing(grid, cands);
    if (result.found) return result;

    result = this.findSwordfish(grid, cands);
    if (result.found) return result;

    result = this.findXYWing(grid, cands);
    if (result.found) return result;

    result = this.findXYZWing(grid, cands);
    if (result.found) return result;

    result = this.findSimpleColoring(grid, cands);
    if (result.found) return result;

    result = this.findEmptyRectangle(grid, cands);
    if (result.found) return result;

    result = this.findWWing(grid, cands);
    if (result.found) return result;

    // Fallback: brute force for remaining
    return this.bruteForceStep(grid);
  },

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
    const cellsWithAny = [];
    for (const cell of unit) {
      if (cell.cands.some(c => numSet.has(c))) {
        cellsWithAny.push(cell);
      }
    }

    if (cellsWithAny.length === size) {
      // These nums only appear in these cells
      // Check if any of these cells have extra candidates to remove
      const removed = [];
      for (const cell of cellsWithAny) {
        for (const c of cell.cands) {
          if (!numSet.has(c)) {
            removed.push({ row: cell.row, col: cell.col, value: c });
          }
        }
      }
      if (removed.length > 0) {
        const cellNames = cellsWithAny.map(c => `R${c.row + 1}C${c.col + 1}`).join(', ');
        const vals = nums.join(', ');
        const name = size === 2 ? '隐式数对 (Hidden Pair)' : '隐式三数组 (Hidden Triple)';
        return {
          found: true,
          cells: removed,
          technique: name,
          explanation: `在${unitName}中，数字(${vals})只能出现在 ${cellNames}，可删除这些单元格中的其他候选数。`,
        };
      }
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
    '简单着色法': 5, 'Simple Coloring': 5,
    '空矩形': 5, 'Empty Rectangle': 5,
    'W翼': 5, 'W-Wing': 5,
    '试错法': 6, 'Brute Force': 6,
  },

  analyzeDifficulty(grid) {
    const working = grid.map(row => [...row]);
    const techniquesUsed = new Set();
    let maxLevel = 0;

    for (let iter = 0; iter < 200; iter++) {
      const result = this.findNextStep(working);
      if (!result.found) break;

      for (const cell of result.cells) {
        working[cell.row][cell.col] = cell.value;
      }

      for (const [key, level] of Object.entries(this.TECHNIQUE_LEVELS)) {
        if (result.technique.includes(key)) {
          techniquesUsed.add(result.technique);
          maxLevel = Math.max(maxLevel, level);
        }
      }
    }

    let diff = 'easy';
    if (maxLevel >= 6) diff = 'insane';
    else if (maxLevel >= 5) diff = 'extreme';
    else if (maxLevel >= 4) diff = 'master';
    else if (maxLevel >= 3) diff = 'expert';
    else if (maxLevel >= 2) diff = 'hard';
    else if (maxLevel >= 1) diff = 'medium';

    return {
      level: maxLevel,
      techniques: [...techniquesUsed],
      maxTechnique: [...techniquesUsed].pop() || 'N/A',
      difficulty: diff,
      solved: this._findEmpty(working) === null,
    };
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
