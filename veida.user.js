// ==UserScript==
// @name         Veida AI Image Generator: turn selected text into an image
// @namespace    https://veida.ai
// @version      0.1.0
// @description  Select any text on a page and turn it into an AI image in place. Free, no API key, no account.
// @author       Veida AI
// @homepageURL  https://veida.ai/?utm_source=greasyfork&utm_medium=userscript
// @supportURL   https://github.com/hanshs474/veida-userscript/issues
// @license      MIT
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      veida.ai
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const BASE = 'https://veida.ai';
  const SITE = BASE + '/?utm_source=greasyfork&utm_medium=userscript';
  const GPT25 = BASE + '/image/gpt-image-2-5?utm_source=greasyfork&utm_medium=userscript';

  // Veida AI's free tier meters an anonymous client id that the caller invents.
  function anonId() {
    const b = new Uint8Array(8);
    crypto.getRandomValues(b);
    return 'us-' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }

  function call(method, path, headers, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: BASE + path,
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        data: body ? JSON.stringify(body) : undefined,
        timeout: 60000,
        onload: (r) => {
          try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(new Error('unexpected response')); }
        },
        onerror: () => reject(new Error('network error')),
        ontimeout: () => reject(new Error('timed out')),
      });
    });
  }

  async function generate(prompt, onStatus) {
    const auth = { 'x-anon-id': anonId() };
    const env = await call('POST', '/api/ai/generate', auth, {
      provider: 'kie', mediaType: 'image', model: 'veida-image-v1',
      scene: 'text-to-image', prompt, options: { aspect_ratio: '1:1' },
    });
    // Refusals answer 200 with code -1; the quota wall answers 200 with wall: true.
    if (env.code !== 0) throw new Error(env.message || 'request refused');
    const d = env.data || {};
    if (d.wall) {
      throw new Error(d.reason === 'ip_daily'
        ? 'The free allowance for this machine is spent for today.'
        : 'Your free run is used. Sign in on Veida AI to keep going with no limit.');
    }
    if (!d.id) throw new Error('no task id');
    onStatus('Queued…');
    const deadline = Date.now() + 6 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      let p;
      try {
        p = await call('GET', '/api/ai/anon-query?taskId=' + encodeURIComponent(d.id) + '&provider=kie&mediaType=image', auth);
      } catch (e) { continue; } // a dropped poll is not a failed job
      if (p.code !== 0) continue;
      const q = p.data || {};
      if (q.cleanImages && q.cleanImages.length) return q.cleanImages[0];
      if (q.images && q.images.length) return q.images[0];
      if (q.status === 'failed' || q.status === 'error') throw new Error('The prompt was refused. Try rewording it.');
      onStatus('Generating…');
    }
    throw new Error('No image before the deadline.');
  }

  // --- UI: a small panel, styled inline so page CSS cannot break it. ---
  let panel;
  function showPanel(prompt) {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:300px;padding:12px;' +
      'background:#111;color:#eee;font:13px/1.4 system-ui,sans-serif;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.4)';
    const status = document.createElement('div');
    status.textContent = 'Sending to Veida AI…';
    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText = 'float:right;background:none;border:0;color:#aaa;font-size:18px;cursor:pointer';
    close.onclick = () => panel.remove();
    panel.append(close, status);
    document.body.appendChild(panel);

    generate(prompt, (s) => { status.textContent = s; })
      .then((url) => {
        status.textContent = '';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'display:block;width:100%;border-radius:6px;margin:6px 0';
        const links = document.createElement('div');
        const open = document.createElement('a');
        open.href = url; open.target = '_blank'; open.textContent = 'Open image';
        const more = document.createElement('a');
        more.href = GPT25; more.target = '_blank'; more.textContent = 'Make it with GPT Image 2.5';
        [open, more].forEach((a) => { a.style.cssText = 'color:#8ab4ff;margin-right:12px'; });
        links.append(open, more);
        panel.append(img, links);
      })
      .catch((e) => {
        status.textContent = e.message + ' ';
        const more = document.createElement('a');
        more.href = SITE; more.target = '_blank'; more.textContent = 'Open Veida AI';
        more.style.color = '#8ab4ff';
        status.append(more);
      });
  }

  function selected() {
    return String(window.getSelection() || '').trim().slice(0, 1000);
  }

  // A floating button appears next to a text selection.
  let button;
  document.addEventListener('mouseup', (e) => {
    if (button && e.target === button) return;
    if (button) { button.remove(); button = null; }
    const text = selected();
    if (text.length < 3) return;
    button = document.createElement('button');
    button.textContent = '🎨 Image';
    button.title = 'Turn the selected text into an image with Veida AI';
    button.style.cssText = 'position:fixed;z-index:2147483647;padding:4px 8px;border:0;border-radius:6px;' +
      'background:#111;color:#fff;font:12px system-ui,sans-serif;cursor:pointer;' +
      'left:' + Math.min(e.clientX + 8, window.innerWidth - 90) + 'px;top:' + Math.max(e.clientY - 34, 4) + 'px';
    button.addEventListener('mousedown', (ev) => ev.preventDefault());
    button.addEventListener('click', () => { const t = selected(); button.remove(); button = null; if (t) showPanel(t); });
    document.body.appendChild(button);
  });

  GM_registerMenuCommand('Generate an image from a prompt…', () => {
    const t = prompt('Describe the image:', selected());
    if (t && t.trim()) showPanel(t.trim());
  });
})();
