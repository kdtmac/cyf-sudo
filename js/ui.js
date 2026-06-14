/**
 * UI 管理 - 面板切换、主题、计时器、提示、模态框、快捷键
 */
const UI = {
  _app: null,
  _theme: 'light',
  _timerInterval: null,
  _timerSeconds: 0,
  _pendingHint: null,

  init(app) {
    this._app = app;
    this._loadTheme();
    this._bindNav();
    this._bindDifficulty();
    this._bindTools();
    this._bindNumberPad();
    this._bindKeyboardShortcuts();
    this._bindThemeBtn();
    this._bindSettingsBtn();
    this._renderTechniqueList();
    this._bindSolverControls();
    this._updateStats();
  },

  /* ========== Theme ========== */
  _loadTheme() {
    const settings = Storage.getSettings();
    this._theme = settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', this._theme);
    document.getElementById('btn-theme').textContent = this._theme === 'dark' ? '☀️' : '🌓';
  },

  _toggleTheme() {
    this._theme = this._theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this._theme);
    document.getElementById('btn-theme').textContent = this._theme === 'dark' ? '☀️' : '🌓';
    const settings = Storage.getSettings();
    settings.theme = this._theme;
    Storage.saveSettings(settings);
  },

  _bindThemeBtn() {
    document.getElementById('btn-theme').addEventListener('click', () => this._toggleTheme());
  },

  _bindSettingsBtn() {
    document.getElementById('btn-settings').addEventListener('click', () => {
      this._showSettings();
    });
  },

  _showSettings() {
    const settings = Storage.getSettings();
    const html = `
      <h2>⚙️ 设置</h2>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;">
        <label style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
          <span>🔢 自动候选数</span>
          <input type="checkbox" id="setting-autocand" ${settings.autoCandidates ? 'checked' : ''}>
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
          <span>🔍 高亮相同数字</span>
          <input type="checkbox" id="setting-highlight" ${settings.highlightSameNum ? 'checked' : ''}>
        </label>
        <label style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
          <span>❌ 显示错误</span>
          <input type="checkbox" id="setting-mistakes" ${settings.showMistakes ? 'checked' : ''}>
        </label>
      </div>
      <div class="modal-buttons">
        <button class="tool-btn" id="btn-settings-cancel">取消</button>
        <button class="tool-btn primary" id="btn-settings-save">保存</button>
      </div>
    `;
    this._showModal(html);

    document.getElementById('btn-settings-cancel').addEventListener('click', () => this._hideModal());
    document.getElementById('btn-settings-save').addEventListener('click', () => {
      const newSettings = {
        autoCandidates: document.getElementById('setting-autocand').checked,
        highlightSameNum: document.getElementById('setting-highlight').checked,
        showMistakes: document.getElementById('setting-mistakes').checked,
      };
      Storage.saveSettings(newSettings);
      if (this._app.board) {
        this._app.board.highlightSameNum = newSettings.highlightSameNum;
        this._app.board.updateHighlights();
      }
      this._hideModal();
    });
  },

  /* ========== Panel Navigation ========== */
  _bindNav() {
    const btns = document.querySelectorAll('.nav-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const panelId = 'panel-' + btn.dataset.panel;
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panelId).classList.add('active');

        if (btn.dataset.panel === 'learn') {
          this._showLearnPanel();
        } else if (btn.dataset.panel === 'stats') {
          this._updateStats();
        } else if (btn.dataset.panel === 'solver') {
          this._initSolverBoard();
        }
      });
    });
  },

  switchPanel(name) {
    const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (btn) btn.click();
  },

  /* ========== Difficulty ========== */
  _bindDifficulty() {
    const btns = document.querySelectorAll('.diff-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const diff = btn.dataset.diff;
        this._updateDiffInfo(diff);
        this._app.startNewGame(diff);
      });
    });
  },

  _updateDiffInfo(diff) {
    const cfg = Generator.DIFFICULTY[diff];
    if (!cfg) return;
    document.getElementById('diff-info').innerHTML = `
      <span class="diff-info-xie">🧩 谢道台: ${cfg.xieRating}</span>
      <span class="diff-info-se">📊 SE: ${cfg.seScore}</span>
      <span class="diff-info-desc">${cfg.desc}</span>
    `;
  },

  /* ========== Timer ========== */
  startTimer(elapsed) {
    this._timerSeconds = elapsed || 0;
    this._updateTimerDisplay();
    this.stopTimer();
    this._timerInterval = setInterval(() => {
      this._timerSeconds++;
      this._updateTimerDisplay();
    }, 1000);
  },

  stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  },

  getTime() {
    return this._timerSeconds;
  },

  _updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (el) el.textContent = Storage.formatTime(this._timerSeconds);
  },

  /* ========== Number Pad ========== */
  _bindNumberPad() {
    const pads = document.querySelectorAll('.number-pad .num-btn, .solver-numpad .num-btn');
    pads.forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.num);
        if (btn.closest('.solver-numpad')) {
          this._onSolverNumClick(num);
        } else {
          this._app.onNumberInput(num);
        }
      });
    });
  },

  updateNumberPad(counts) {
    const pad = document.querySelector('.number-pad');
    if (!pad) return;
    const btns = pad.querySelectorAll('.num-btn');
    btns.forEach(btn => {
      const num = parseInt(btn.dataset.num);
      if (num >= 1 && num <= 9) {
        if (counts[num] >= 9) {
          btn.classList.add('exhausted');
        } else {
          btn.classList.remove('exhausted');
        }
      }
    });
  },

  /* ========== Tool Buttons ========== */
  _bindTools() {
    const app = this._app;

    document.getElementById('btn-new-game').addEventListener('click', () => {
      const activeDiff = document.querySelector('.diff-btn.active');
      const diff = activeDiff ? activeDiff.dataset.diff : 'medium';
      app.startNewGame(diff);
    });

    document.getElementById('btn-restart').addEventListener('click', () => app.restartGame());
    document.getElementById('btn-undo').addEventListener('click', () => app.undo());
    document.getElementById('btn-redo').addEventListener('click', () => app.redo());
    document.getElementById('btn-check').addEventListener('click', () => app.checkErrors());
    document.getElementById('btn-hint').addEventListener('click', () => app.getHint());
    document.getElementById('btn-apply-hint').addEventListener('click', () => app.applyHint());

    const pencilBtn = document.getElementById('btn-pencil');
    pencilBtn.addEventListener('click', () => {
      const active = pencilBtn.dataset.active === 'true';
      pencilBtn.dataset.active = active ? 'false' : 'true';
      app.togglePencilMode(!active);
    });

    const autoCandBtn = document.getElementById('btn-autocand');
    autoCandBtn.addEventListener('click', () => {
      const active = autoCandBtn.dataset.active === 'true';
      autoCandBtn.dataset.active = active ? 'false' : 'true';
      app.toggleAutoCandidates(!active);
    });

    const highlightBtn = document.getElementById('btn-highlight');
    highlightBtn.addEventListener('click', () => {
      const active = highlightBtn.dataset.active === 'true';
      highlightBtn.dataset.active = active ? 'false' : 'true';
      app.toggleHighlight(!active);
    });
  },

  /* ========== Keyboard Shortcuts ========== */
  _bindKeyboardShortcuts() {
    const app = this._app;
    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        app.undo();
        return;
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        app.redo();
        return;
      }
      if (e.ctrlKey && e.key === 'Z') {
        e.preventDefault();
        app.redo();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        app.togglePencilMode();
        return;
      }

      const num = parseInt(e.key);
      if (num >= 0 && num <= 9) {
        e.preventDefault();
        if (e.shiftKey) {
          app.setNote(num);
        } else {
          app.onNumberInput(num);
        }
      }
    });
  },

  /* ========== Stats ========== */
  _updateStats() {
    const stats = Storage.getStats();
    document.getElementById('stat-games-played').textContent = stats.gamesPlayed;
    document.getElementById('stat-games-won').textContent = stats.gamesWon;
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    document.getElementById('stat-win-rate').textContent = winRate + '%';
    document.getElementById('stat-best-time').textContent = Storage.formatTime(stats.bestTime);
    document.getElementById('stat-avg-time').textContent = stats.gamesPlayed > 0
      ? Storage.formatTime(Math.round(stats.totalTime / stats.gamesPlayed)) : '--';
    document.getElementById('stat-hints-total').textContent = stats.hintsUsed;

    const allDiffs = ['easy', 'medium', 'hard', 'expert', 'master', 'extreme', 'insane'];
    const labels = { easy: '简单', medium: '中等', hard: '困难', expert: '专家', master: '大师', extreme: '极限', insane: '地狱' };
    const table = document.getElementById('diff-stats');
    let html = '<div class="diff-row header"><span>难度</span><span>谢道台</span><span>局数</span><span>完成</span><span>最佳</span><span>平均</span></div>';
    for (const d of allDiffs) {
      const ds = stats.byDifficulty[d] || { played: 0, won: 0, bestTime: null, totalTime: 0 };
      const avg = ds.played > 0 ? Storage.formatTime(Math.round(ds.totalTime / ds.played)) : '--';
      const diffCfg = Generator.DIFFICULTY[d] || { xieRating: '-', label: labels[d] };
      html += `<div class="diff-row">
        <span>${diffCfg.emoji || ''} ${labels[d]}</span>
        <span>${diffCfg.xieRating || '-'}</span>
        <span>${ds.played}</span>
        <span>${ds.won}</span>
        <span>${Storage.formatTime(ds.bestTime)}</span>
        <span>${avg}</span>
      </div>`;
    }
    table.innerHTML = html;

    document.getElementById('btn-reset-stats').onclick = () => {
      this._showConfirm('确定要重置所有统计数据吗？此操作不可撤销。', () => {
        Storage.resetStats();
        this._updateStats();
      });
    };
  },

  updateMistakeDisplay(mistakes) {
    document.getElementById('mistakes').textContent = mistakes + '/3';
  },

  updateCellsLeft(count) {
    document.getElementById('cells-left').textContent = count;
  },

  updateHintsUsed(count) {
    document.getElementById('hints-used').textContent = count;
  },

  /* ========== Hint Card ========== */
  showHint(result) {
    const card = document.getElementById('hint-card');
    card.style.display = 'block';
    document.querySelector('#hint-content .hint-technique').textContent = result.technique;
    document.querySelector('#hint-content .hint-explanation').textContent = result.explanation;
    this._pendingHint = result;
  },

  hideHint() {
    document.getElementById('hint-card').style.display = 'none';
    this._pendingHint = null;
  },

  getPendingHint() {
    return this._pendingHint;
  },

  /* ========== Modals ========== */
  _showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
  },

  _hideModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  },

  _showConfirm(msg, onConfirm) {
    const html = `
      <h2>确认</h2>
      <p>${msg}</p>
      <div class="modal-buttons">
        <button class="tool-btn" id="modal-cancel">取消</button>
        <button class="tool-btn primary" id="modal-confirm">确认</button>
      </div>
    `;
    this._showModal(html);
    document.getElementById('modal-cancel').onclick = () => this._hideModal();
    document.getElementById('modal-confirm').onclick = () => {
      this._hideModal();
      if (onConfirm) onConfirm();
    };
  },

  showVictory(timeSeconds, difficulty, mistakes, hints) {
    const label = Generator.DIFFICULTY[difficulty].label;
    const formatted = Storage.formatTime(timeSeconds);
    const html = `
      <h2>🎉 恭喜完成！</h2>
      <p>你成功解开了<strong>${label}</strong>难度的数独！</p>
      <p style="font-size:1.2rem;">⏱ 用时：<strong>${formatted}</strong></p>
      <p>❌ 错误：${mistakes} 次 | 💡 提示：${hints} 次</p>
      <div class="modal-buttons">
        <button class="tool-btn" id="modal-new-game">🆕 新游戏</button>
        <button class="tool-btn primary" id="modal-close">👍 知道了</button>
      </div>
    `;
    this._showModal(html);
    document.getElementById('modal-new-game').onclick = () => {
      this._hideModal();
      const activeDiff = document.querySelector('.diff-btn.active');
      this._app.startNewGame(activeDiff ? activeDiff.dataset.diff : 'medium');
    };
    document.getElementById('modal-close').onclick = () => this._hideModal();
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this._hideModal();
    });
  },

  showGameOver() {
    const html = `
      <h2>😔 游戏结束</h2>
      <p>错误次数已达上限。再接再厉！</p>
      <div class="modal-buttons">
        <button class="tool-btn" id="modal-retry">🔄 重新开始</button>
        <button class="tool-btn primary" id="modal-new-game2">🆕 新游戏</button>
      </div>
    `;
    this._showModal(html);
    document.getElementById('modal-retry').onclick = () => {
      this._hideModal();
      this._app.restartGame();
    };
    document.getElementById('modal-new-game2').onclick = () => {
      this._hideModal();
      const activeDiff = document.querySelector('.diff-btn.active');
      this._app.startNewGame(activeDiff ? activeDiff.dataset.diff : 'medium');
    };
  },

  /* ========== Learn Panel ========== */
  _renderTechniqueList() {
    const container = document.getElementById('technique-list');
    Techniques.list.forEach((tech, idx) => {
      const div = document.createElement('div');
      div.className = 'tech-item';
      div.innerHTML = `
        <span>${tech.icon}</span>
        <span>${tech.name}</span>
        <span class="tech-xie">${tech.xieRating}</span>
        <span class="tech-diff ${tech.difficulty}">${Techniques.getDifficultyLabel(tech.difficulty)}</span>
      `;
      div.addEventListener('click', () => {
        container.querySelectorAll('.tech-item').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
        this._showTechniqueDetail(tech, idx + 1);
      });
      container.appendChild(div);
    });
  },

  _showTechniqueDetail(tech, num) {
    const content = document.getElementById('learn-content');
    const diffLabel = Techniques.getDifficultyLabel(tech.difficulty);

    let exampleHTML = '';
    if (tech.exampleBoard) {
      exampleHTML = this._renderExampleBoard(tech.exampleBoard);
    }

    const numStr = num ? `#${num}` : '';
    content.innerHTML = `
      <div class="tech-detail">
        <h2>${tech.icon} ${tech.name} <small>${tech.en}</small> ${numStr}</h2>
        <div class="tech-ratings">
          <span class="tech-rating-badge xie">🧩 谢道台: ${tech.xieRating}</span>
          <span class="tech-rating-badge se">📊 SE: ${tech.seScore}</span>
        </div>
        <span class="tech-diff-badge ${tech.difficulty}">${diffLabel}</span>
        <p class="tech-description">${tech.description}</p>
        <div class="tech-example">
          <strong>🔍 如何发现：</strong>
          <p>${tech.howTo}</p>
        </div>
        <div class="tech-example">
          <strong>📋 示例演示：</strong>
          ${exampleHTML}
          <p class="example-caption">${tech.exampleBoard ? tech.exampleBoard.explanation : tech.example.description}</p>
        </div>
        <div class="tech-example">
          <strong>📖 详细说明：</strong>
          <p>${tech.detail}</p>
        </div>
      </div>
    `;
  },

  _renderExampleBoard(eb) {
    let html = '<div class="example-board">';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = eb.grid[r][c] || 0;
        const hl = (eb.highlights || []).find(h => h.row === r && h.col === c);
        let cellClass = 'eb-cell';
        let cellContent = val !== 0 ? val : '';
        let cellStyle = '';

        if (hl) {
          switch (hl.type) {
            case 'target': cellClass += ' eb-target'; break;
            case 'pair': cellClass += ' eb-pair'; break;
            case 'elim': cellClass += ' eb-elim'; break;
            default: cellClass += ' eb-target'; break;
          }
        }

        if (val === 0 && hl && hl.note) {
          cellContent = hl.note;
          cellClass += ' eb-note';
        } else if (val === 0 && hl && hl.value) {
          cellContent = hl.value;
          cellClass += ' eb-given';
        } else if (val !== 0) {
          cellClass += hl ? ' eb-highlight' : ' eb-given';
        }

        if (c === 2 || c === 5) cellClass += ' eb-box-right';
        if (r === 2 || r === 5) cellClass += ' eb-box-bottom';

        html += `<div class="${cellClass}">${cellContent}</div>`;
      }
    }
    html += '</div>';
    return html;
  },

  _showLearnPanel() {
    const container = document.getElementById('technique-list');
    if (!container.querySelector('.tech-item.active')) {
      const first = container.querySelector('.tech-item');
      if (first) first.click();
    }
  },

  /* ========== Solver Panel ========== */
  _solverBoard: null,
  _solverRunning: false,
  _solverSteps: null,
  _solverStepIndex: 0,
  _solverGrid: null,

  _initSolverBoard() {
    if (!this._solverBoard) {
      this._solverBoard = new Board('solver-board', {
        cellSize: 44,
        readOnly: false,
        onCellClick: (r, c) => {
          if (this._solverBoard.getValue(r, c) !== 0) {
            this._solverBoard.setValue(r, c, 0, false);
          }
        },
      });
      this._solverGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
    }
  },

  _onSolverNumClick(num) {
    if (!this._solverBoard) return;
    const r = this._solverBoard.selectedRow;
    const c = this._solverBoard.selectedCol;
    if (r === null || c === null) return;
    if (num === 0) {
      this._solverBoard.setValue(r, c, 0, false);
      this._solverGrid[r][c] = 0;
    } else {
      this._solverBoard.setValue(r, c, num, true);
      this._solverGrid[r][c] = num;
    }
  },

  _bindSolverControls() {
    document.getElementById('btn-solver-step').addEventListener('click', () => this._solverStep());
    document.getElementById('btn-solver-auto').addEventListener('click', () => this._solverAuto());
    document.getElementById('btn-solver-reset').addEventListener('click', () => this._solverReset());
    document.getElementById('btn-solver-clear').addEventListener('click', () => this._solverClear());
    document.getElementById('btn-solver-load').addEventListener('click', () => this._solverLoad());
  },

  _solverStep() {
    if (!this._solverBoard) return;
    this._solverGrid = this._solverBoard.getCurrentGrid();
    if (!this._solverSteps) {
      const result = Solver.solveAll(this._solverGrid);
      this._solverSteps = result.steps;
      this._solverStepIndex = 0;
      if (this._solverSteps.length === 0) {
        this._showSolverMessage(result.solved ? '✅ 题目已完成！' : '⚠️ 无法继续，请检查输入。');
        return;
      }
    }
    if (this._solverStepIndex >= this._solverSteps.length) {
      this._showSolverMessage('✅ 求解完成！');
      return;
    }
    const step = this._solverSteps[this._solverStepIndex];
    for (const cell of step.cells) {
      this._solverBoard.setValue(cell.row, cell.col, cell.value, true);
      this._solverBoard.highlightHint([cell]);
    }
    this._addSolverStep(step);
    this._solverStepIndex++;
  },

  _solverAuto() {
    if (this._solverRunning) return;
    this._solverRunning = true;
    const run = () => {
      this._solverStep();
      if (this._solverSteps && this._solverStepIndex < this._solverSteps.length) {
        setTimeout(run, 200);
      } else {
        this._solverRunning = false;
      }
    };
    run();
  },

  _solverReset() {
    this._solverSteps = null;
    this._solverStepIndex = 0;
    this._solverRunning = false;
    document.getElementById('solver-steps').innerHTML = '<p class="placeholder">输入题目后点击"下一步"开始求解</p>';
    if (this._solverBoard) {
      this._solverBoard.loadPuzzle(this._solverGrid, this._solverBoard.getGivenMask());
    }
  },

  _solverClear() {
    this._solverSteps = null;
    this._solverStepIndex = 0;
    this._solverRunning = false;
    this._solverGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
    document.getElementById('solver-steps').innerHTML = '<p class="placeholder">输入题目后点击"下一步"开始求解</p>';
    if (this._solverBoard) {
      this._solverBoard.loadPuzzle(this._solverGrid, this._solverGrid);
    }
  },

  _solverLoad() {
    if (!this._solverBoard) return;
    const gameGrid = this._app.board.getCurrentGrid();
    const givenMask = this._app.board.getGivenMask();
    this._solverSteps = null;
    this._solverStepIndex = 0;
    this._solverGrid = gameGrid.map(row => [...row]);
    document.getElementById('solver-steps').innerHTML = '<p class="placeholder">输入题目后点击"下一步"开始求解</p>';
    this._solverBoard.loadPuzzle(gameGrid, givenMask);
  },

  _addSolverStep(step) {
    const container = document.getElementById('solver-steps');
    if (container.querySelector('.placeholder')) container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'solver-step';
    const cellsStr = step.cells.map(c => `R${c.row + 1}C${c.col + 1} → ${c.value}`).join(', ');
    div.innerHTML = `
      <span class="step-num">#${step.step}</span>
      <span class="step-technique">${step.technique}</span>
      <div>${step.explanation}</div>
      <div class="step-cell">操作: ${cellsStr}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _showSolverMessage(msg) {
    const container = document.getElementById('solver-steps');
    if (container.querySelector('.placeholder')) container.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'solver-step';
    div.innerHTML = `<strong>${msg}</strong>`;
    container.appendChild(div);
  },
};
