// ui.js — renders search results and the template detail panel
// Depends on: search.js (must be loaded first)

const UI = (function () {
  const CHATGPT_URL = 'https://chatgpt.com/';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('search-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }

  // ── Result cards ───────────────────────────────────────────────────────────

  function tagHtml(tag) {
    return `<span class="s-tag">${esc(tag)}</span>`;
  }

  function cardHtml(tpl) {
    const tags = (tpl.tags || []).map(tagHtml).join('');
    const snippet = (tpl.content || '').slice(0, 90).replace(/\n/g, ' ');
    return `
      <article class="s-card" data-id="${esc(tpl.id)}" role="button" tabindex="0"
               aria-label="View template: ${esc(tpl.title)}">
        <div class="s-card-top">
          <span class="s-type s-type--${esc(tpl.type)}">${esc(tpl.type)}</span>
          <h3 class="s-card-title">${esc(tpl.title)}</h3>
        </div>
        <p class="s-card-snippet">${esc(snippet)}…</p>
        <div class="s-tags">${tags}</div>
      </article>`;
  }

  // Render result cards into containerEl; attach click/keyboard handlers.
  function renderResults(templates, containerEl) {
    if (!containerEl) return;

    if (templates.length === 0) {
      containerEl.innerHTML =
        '<p class="s-empty">No results. Try different keywords or browse all below.</p>';
      return;
    }

    containerEl.innerHTML = `<div class="s-grid">${templates.map(cardHtml).join('')}</div>`;

    containerEl.querySelectorAll('.s-card').forEach(function (card) {
      const open = function () {
        const tpl = templates.find(function (t) { return t.id === card.dataset.id; });
        if (tpl) showDetail(tpl);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  // ── Detail panel ───────────────────────────────────────────────────────────

  function variablesHtml(variables) {
    if (!variables || variables.length === 0) return '';
    const chips = variables
      .map(function (v) { return `<code class="s-var">&#123;&#123;${esc(v)}&#125;&#125;</code>`; })
      .join(' ');
    return `<div class="s-detail-vars"><span class="s-detail-vars-label">Variables:</span> ${chips}</div>`;
  }

  function showDetail(tpl) {
    const panel = document.getElementById('s-detail');
    if (!panel) return;

    const subjectRow = tpl.subject
      ? `<div class="s-detail-subject">
           <span class="s-detail-field-label">Subject</span>
           <span>${esc(tpl.subject)}</span>
         </div>`
      : '';

    panel.innerHTML = `
      <div class="s-detail-inner" role="dialog" aria-modal="true"
           aria-label="${esc(tpl.title)}">
        <button class="s-detail-close" id="s-detail-close" aria-label="Close detail">✕</button>

        <div class="s-detail-header">
          <span class="s-type s-type--${esc(tpl.type)}">${esc(tpl.type)}</span>
          <h2 class="s-detail-title">${esc(tpl.title)}</h2>
        </div>

        ${subjectRow}
        ${variablesHtml(tpl.variables)}

        <div class="s-tags s-detail-tags">${(tpl.tags || []).map(tagHtml).join('')}</div>

        <pre class="s-content" id="s-content-pre">${esc(tpl.content)}</pre>

        <div class="s-detail-actions">
          <button class="s-btn s-btn--primary" id="s-btn-copy">
            Copy text
          </button>
          <button class="s-btn s-btn--secondary" id="s-btn-use">
            Use${tpl.type === 'email' ? ' in Email Generator' : ' (copy prompt)'}
          </button>
          <button class="s-btn s-btn--ai" id="s-btn-generate" title="Copies AI prompt and opens ChatGPT">
            ✦ Generate with AI
          </button>
        </div>

        <p class="s-detail-hint">
          <strong>Copy text</strong> — raw template to clipboard &nbsp;·&nbsp;
          ${tpl.type === 'email'
            ? '<strong>Use</strong> — opens Email Generator with this template'
            : '<strong>Use</strong> — copies the prompt, ready to paste'}
          &nbsp;·&nbsp;
          <strong>Generate</strong> — copies AI prompt &amp; opens ChatGPT
        </p>
      </div>`;

    panel.hidden = false;
    // Focus the close button for keyboard users
    panel.querySelector('#s-detail-close').focus();

    // Close button
    document.getElementById('s-detail-close').addEventListener('click', function () {
      panel.hidden = true;
    });

    // Copy raw content
    document.getElementById('s-btn-copy').addEventListener('click', async function () {
      const ok = await copyText(tpl.content || '');
      showToast(ok ? 'Copied to clipboard!' : 'Copy failed — select the text and copy manually.');
    });

    // Use: email → open generator; prompt → copy content
    document.getElementById('s-btn-use').addEventListener('click', async function () {
      if (tpl.type === 'email') {
        // Pass template to email-generator via sessionStorage
        try {
          sessionStorage.setItem('brain-load-template', JSON.stringify({
            subject: tpl.subject || '',
            body: tpl.content || ''
          }));
        } catch (_) { /* sessionStorage blocked */ }
        window.open('tools/email-generator.html', '_blank', 'noopener');
        showToast('Opening Email Generator…');
      } else {
        const ok = await copyText(tpl.content || '');
        showToast(ok ? 'Prompt copied — paste it into your AI tool!' : 'Copy failed.');
      }
    });

    // Generate: copy ai_prompt + open ChatGPT
    document.getElementById('s-btn-generate').addEventListener('click', async function () {
      const prompt = tpl.ai_prompt || tpl.content || '';
      const ok = await copyText(prompt);
      window.open(CHATGPT_URL, '_blank', 'noopener,noreferrer');
      showToast(ok
        ? 'AI prompt copied — paste it into ChatGPT!'
        : 'ChatGPT opened — copy the prompt manually.');
    });
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    // Close detail panel on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const panel = document.getElementById('s-detail');
        if (panel && !panel.hidden) panel.hidden = true;
      }
    });

    // Close detail panel when clicking the backdrop (outside the inner box)
    const panel = document.getElementById('s-detail');
    if (panel) {
      panel.addEventListener('click', function (e) {
        if (e.target === panel) panel.hidden = true;
      });
    }
  }

  return { renderResults, showDetail, showToast, init };
})();

// ── Page wiring ──────────────────────────────────────────────────────────────
// Runs after DOM is ready; connects Search + UI to the page elements.

document.addEventListener('DOMContentLoaded', async function () {
  const searchInput   = document.getElementById('s-input');
  const resultsEl     = document.getElementById('s-results');
  const countEl       = document.getElementById('s-count');

  if (!searchInput || !resultsEl) return; // search section not present

  UI.init();

  // Load all templates
  const all = await Search.init();

  function updateCount(n, total) {
    if (!countEl) return;
    countEl.textContent = n === total
      ? `${total} templates`
      : `${n} of ${total} templates`;
  }

  // Show everything on load
  UI.renderResults(all, resultsEl);
  updateCount(all.length, all.length);

  // Live search on every keystroke
  searchInput.addEventListener('input', function () {
    const raw = searchInput.value;
    const results = raw.trim() ? Search.query(raw) : Search.getAll();
    UI.renderResults(results, resultsEl);
    updateCount(results.length, all.length);
  });

  // Clear on Escape inside the search box
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      UI.renderResults(all, resultsEl);
      updateCount(all.length, all.length);
    }
  });
});
