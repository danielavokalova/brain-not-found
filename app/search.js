// search.js — loads the template index and filters it
// All templates live in /data/index.json so only one fetch is needed.

const Search = (function () {
  let allTemplates = [];

  // Fetch index.json once; call this on page load.
  async function init() {
    try {
      const res = await fetch('data/index.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allTemplates = Array.isArray(data.templates) ? data.templates : [];
    } catch (err) {
      console.error('[Search] Failed to load data/index.json:', err);
      allTemplates = [];
    }
    return allTemplates;
  }

  // Multi-word AND search across title, tags, and type.
  // "follow up client" → every word must appear somewhere in the haystack.
  function query(raw) {
    const words = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    return allTemplates.filter(function (tpl) {
      const haystack = [
        tpl.title || '',
        (tpl.tags || []).join(' '),
        tpl.type || ''
      ].join(' ').toLowerCase();

      return words.every(function (word) {
        return haystack.includes(word);
      });
    });
  }

  function getAll() {
    return allTemplates;
  }

  return { init, query, getAll };
})();
