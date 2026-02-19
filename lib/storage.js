// Simple localStorage wrapper that mimics the window.storage API
// This provides persistent storage for the app

const storage = {
  async get(key) {
    if (typeof window === 'undefined') return null;
    try {
      const value = localStorage.getItem(key);
      return value ? { value } : null;
    } catch (err) {
      console.error('Storage get error:', err);
      return null;
    }
  },

  async set(key, value) {
    if (typeof window === 'undefined') return null;
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch (err) {
      console.error('Storage set error:', err);
      return null;
    }
  },

  async delete(key) {
    if (typeof window === 'undefined') return null;
    try {
      localStorage.removeItem(key);
      return { key, deleted: true };
    } catch (err) {
      console.error('Storage delete error:', err);
      return null;
    }
  },

  async list(prefix = '') {
    if (typeof window === 'undefined') return { keys: [] };
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return { keys, prefix };
    } catch (err) {
      console.error('Storage list error:', err);
      return { keys: [] };
    }
  },
};

export default storage;
