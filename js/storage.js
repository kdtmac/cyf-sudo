/**
 * 存储管理 - Save/Load games, statistics, settings
 */
const Storage = {
  KEYS: {
    CURRENT_GAME: 'sudoku_current_game',
    GAME_HISTORY: 'sudoku_game_history',
    STATS: 'sudoku_stats',
    SETTINGS: 'sudoku_settings',
  },

  DEFAULT_STATS: {
    gamesPlayed: 0,
    gamesWon: 0,
    bestTime: null,       // per difficulty: { easy: 120, medium: 300, ... }
    totalTime: 0,
    hintsUsed: 0,
    byDifficulty: {
      easy:    { played: 0, won: 0, bestTime: null, totalTime: 0 },
      medium:  { played: 0, won: 0, bestTime: null, totalTime: 0 },
      hard:    { played: 0, won: 0, bestTime: null, totalTime: 0 },
      expert:  { played: 0, won: 0, bestTime: null, totalTime: 0 },
      master:  { played: 0, won: 0, bestTime: null, totalTime: 0 },
    }
  },

  DEFAULT_SETTINGS: {
    theme: 'light',
    highlightSameNum: true,
    autoCandidates: false,
    showMistakes: true,
    soundEffects: true,
  },

  // === Game State ===
  saveGame(gameState) {
    try {
      localStorage.setItem(this.KEYS.CURRENT_GAME, JSON.stringify(gameState));
    } catch (e) { console.warn('Failed to save game:', e); }
  },

  loadGame() {
    try {
      const data = localStorage.getItem(this.KEYS.CURRENT_GAME);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  },

  clearGame() {
    localStorage.removeItem(this.KEYS.CURRENT_GAME);
  },

  hasSavedGame() {
    return !!localStorage.getItem(this.KEYS.CURRENT_GAME);
  },

  // === Statistics ===
  getStats() {
    try {
      const data = localStorage.getItem(this.KEYS.STATS);
      if (!data) return JSON.parse(JSON.stringify(this.DEFAULT_STATS));
      // Merge with defaults to handle new fields
      const saved = JSON.parse(data);
      return this._mergeDeep(JSON.parse(JSON.stringify(this.DEFAULT_STATS)), saved);
    } catch (e) { return JSON.parse(JSON.stringify(this.DEFAULT_STATS)); }
  },

  saveStats(stats) {
    try {
      localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
    } catch (e) { console.warn('Failed to save stats:', e); }
  },

  resetStats() {
    localStorage.removeItem(this.KEYS.STATS);
  },

  recordGame(difficulty, won, timeSeconds, hintsUsed) {
    const stats = this.getStats();
    stats.gamesPlayed++;
    if (won) stats.gamesWon++;
    stats.hintsUsed += hintsUsed;
    stats.totalTime += timeSeconds;

    const diff = stats.byDifficulty[difficulty];
    if (diff) {
      diff.played++;
      if (won) diff.won++;
      diff.totalTime += timeSeconds;
      if (won && (diff.bestTime === null || timeSeconds < diff.bestTime)) {
        diff.bestTime = timeSeconds;
      }
    }

    if (won && (stats.bestTime === null || timeSeconds < stats.bestTime)) {
      stats.bestTime = timeSeconds;
    }

    this.saveStats(stats);
    return stats;
  },

  // === Settings ===
  getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      if (!data) return { ...this.DEFAULT_SETTINGS };
      return { ...this.DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) { return { ...this.DEFAULT_SETTINGS }; }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) { console.warn('Failed to save settings:', e); }
  },

  // === Helpers ===
  _mergeDeep(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this._mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  },

  formatTime(seconds) {
    if (seconds === null || seconds === undefined) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
};
