(() => {
  const ID = 'osint-page-triage';
  const existing = document.getElementById(ID);
  if (existing) {
    existing.remove();
    return;
  }

  const page = {
    title: document.title || '(untitled)',
    url: location.href,
    origin: location.origin,
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    description: document.querySelector('meta[name="description"]')?.content || '',
    author: document.querySelector('meta[name="author"]')?.content || '',
    published: document.querySelector('meta[property="article:published_time"], meta[name="date"], time[datetime]')?.content || document.querySelector('time[datetime]')?.dateTime || '',
    ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    language: document.documentElement.lang || navigator.language,
    links: [],
    images: [],
    emails: [],
    phones: [],
    social: [],
    jsonLd: [],
    technologies: []
  };

  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const absolute = value => {
    try { return new URL(value, location.href).href; } catch { return value || ''; }
  };
  const unique = values => [...new Set(values.filter(Boolean))];

  page.links = [...document.querySelectorAll('a[href]')].map(a => ({
    text: clean(a.innerText || a.getAttribute('aria-label') || a.title),
    url: absolute(a.getAttribute('href')),
    external: (() => { try { return new URL(a.href, location.href).origin !== location.origin; } catch { return false; } })()
  })).filter(item => item.url && item.url !== '#');

  page.images = [...document.images].map(image => ({
    src: absolute(image.currentSrc || image.src || image.getAttribute('data-src')),
    alt: clean(image.alt),
    width: image.naturalWidth || image.width || '',
    height: image.naturalHeight || image.height || ''
  })).filter(item => item.src);

  const visibleText = document.body?.innerText || '';
  page.emails = unique((visibleText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(clean));
  page.phones = unique((visibleText.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []).map(clean).filter(number => number.replace(/\D/g, '').length >= 8));

  page.social = unique(page.links.map(item => item.url).filter(url => /(?:facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|github|threads|reddit|telegram)\./i.test(url)));
  page.jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => {
    try { return JSON.parse(script.textContent); } catch { return { parseError: true, raw: clean(script.textContent).slice(0, 500) }; }
  });

  const html = document.documentElement.outerHTML;
  const techRules = [
    ['WordPress', /wp-content|wp-includes/i], ['Shopify', /cdn\.shopify\.com|Shopify\.theme/i],
    ['Wix', /static\.wixstatic\.com|wix-dropdown/i], ['Webflow', /webflow\.com|wf-page/i],
    ['Google Analytics', /google-analytics\.com|gtag\(|googletagmanager\.com/i],
    ['Cloudflare', /cdnjs\.cloudflare\.com|cloudflareinsights/i], ['React', /data-reactroot|__NEXT_DATA__/i],
    ['Vue', /data-v-[a-f0-9]{6,}|__NUXT__/i]
  ];
  page.technologies = techRules.filter(([, pattern]) => pattern.test(html)).map(([name]) => name);

  const meta = [...document.querySelectorAll('meta[name], meta[property]')].map(tag => ({
    name: tag.getAttribute('name') || tag.getAttribute('property'),
    content: tag.getAttribute('content') || ''
  })).filter(item => item.content);
  page.meta = meta;

  const host = document.createElement('div');
  host.id = ID;
  host.style.cssText = 'all:initial; position:fixed; inset:0; z-index:2147483647; pointer-events:none;';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .osint-window { pointer-events:auto; position:fixed; top:6vh; right:4vw; width:min(760px,92vw); height:min(700px,86vh); display:flex; flex-direction:column; overflow:hidden; color:#f5f5f7; background:rgba(28,28,32,.96); border:1px solid rgba(255,255,255,.18); border-radius:15px; box-shadow:0 26px 80px rgba(0,0,0,.48), 0 0 0 .5px rgba(255,255,255,.1); font:13px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Segoe UI",sans-serif; backdrop-filter:blur(22px); }
    .titlebar { min-height:52px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:0 16px; border-bottom:1px solid rgba(255,255,255,.1); user-select:none; }
    .traffic { display:flex; gap:8px; }
    .dot { position:relative; width:14px; height:14px; border:0; border-radius:50%; cursor:pointer; padding:0; display:grid; place-items:center; box-shadow:inset 0 0 0 .5px rgba(0,0,0,.2); }
    .dot::after { color:rgba(40,40,42,.72); font:700 10px/1 -apple-system,BlinkMacSystemFont,sans-serif; opacity:0; transform:scale(.85); transition:opacity .12s,transform .12s; }
    .traffic:hover .dot::after { opacity:1; transform:scale(1); }.dot[data-action="close"]::after { content:"×"; }.dot[data-action="minimize"]::after { content:"−"; }.dot[data-action="maximize"]::after { content:"+"; }
    .red { background:#ff5f57; }.yellow { background:#febc2e; }.green { background:#28c840; }
    .window-title { font-weight:700; text-align:center; letter-spacing:.1px; }.window-title span { color:#a1a1a6; font-weight:500; }
    .title-actions { display:flex; justify-content:flex-end; gap:6px; }
    button { border:0; color:inherit; font:inherit; cursor:pointer; }
    .action { display:inline-flex; align-items:center; gap:5px; height:27px; padding:4px 9px; border:1px solid rgba(255,255,255,.14); border-radius:999px; background:rgba(255,255,255,.075); color:#e8e8ed; font-size:11px; font-weight:600; letter-spacing:.01em; box-shadow:0 1px 1px rgba(0,0,0,.12); transition:background .16s,border-color .16s,transform .16s; }.action::before { color:#c4cad4; font-size:12px; line-height:1; font-weight:400; }.action[data-action="theme"]::before { content:"☼"; }.action[data-action="copy"]::before { content:"⧉"; }.action[data-action="download"]::before { content:"↓"; }.action:hover { background:rgba(255,255,255,.14); border-color:rgba(255,255,255,.26); transform:translateY(-1px); }.action:active { transform:translateY(0); }
    .body { display:flex; min-height:0; flex:1; }
    .sidebar { width:154px; flex:none; padding:14px 10px; border-right:1px solid rgba(255,255,255,.1); background:rgba(18,18,21,.28); }
    .side-label { padding:0 9px 8px; color:#8e8e93; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
    .tab { display:block; width:100%; padding:8px 10px; margin:2px 0; text-align:left; border-radius:8px; background:transparent; color:#c7c7cc; }.tab:hover { background:rgba(255,255,255,.08); }.tab.active { background:#0a84ff; color:#fff; font-weight:700; }
    .content { min-width:0; flex:1; display:flex; flex-direction:column; }
    .content-head { padding:18px 20px 12px; border-bottom:1px solid rgba(255,255,255,.08); }.content-head h2 { margin:0 0 4px; font-size:20px; }.subtitle { color:#a1a1a6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .panel { padding:16px 20px 22px; overflow:auto; }.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }.metric { padding:13px; border:1px solid rgba(255,255,255,.1); border-radius:10px; background:rgba(255,255,255,.055); }.metric b { display:block; color:#8e8e93; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }.metric strong { display:block; margin-top:4px; color:#f5f5f7; font-size:20px; }
    .row { padding:11px 0; border-bottom:1px solid rgba(255,255,255,.08); overflow-wrap:anywhere; }.label { color:#8e8e93; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }.value { margin-top:4px; color:#f5f5f7; }.value a { color:#64b5ff; text-decoration:none; }.value a:hover { text-decoration:underline; }
    .list-item { padding:10px 0; border-bottom:1px solid rgba(255,255,255,.08); }.list-item small { display:block; margin-top:3px; color:#a1a1a6; overflow-wrap:anywhere; }.badge { display:inline-block; padding:2px 6px; margin-left:5px; border-radius:999px; background:rgba(48,209,88,.18); color:#64e48b; font-size:10px; }
    .empty { padding:32px 8px; color:#a1a1a6; text-align:center; }.footer { padding:9px 16px; border-top:1px solid rgba(255,255,255,.08); color:#8e8e93; font-size:11px; text-align:right; }
    .titlebar { cursor:grab; }.titlebar:active { cursor:grabbing; }.resize-grip { position:absolute; right:3px; bottom:3px; width:16px; height:16px; cursor:nwse-resize; opacity:.55; }.resize-grip::after { content:""; position:absolute; right:1px; bottom:1px; width:9px; height:9px; border-right:2px solid #8e8e93; border-bottom:2px solid #8e8e93; }
    /* High-contrast dark result text: URLs stay readable on the glass surface. */
    .osint-window:not(.light) .value a, .osint-window:not(.light) .list-item a { color:#fff !important; font-weight:600; text-decoration-color:rgba(255,255,255,.72); background:rgba(255,255,255,.07); padding:2px 5px; border-radius:5px; }
    .osint-window:not(.light) .value a:hover, .osint-window:not(.light) .list-item a:hover { color:#fff !important; background:rgba(255,255,255,.15); text-decoration-color:#fff; }
    .osint-window:not(.light) .empty { color:#d1d1d6; }.osint-window:not(.light) .label { color:#b8b8bf; }.osint-window:not(.light) .list-item small { color:#c4c4ca; }
    .osint-window.light { color:#1d1d1f; background:rgba(248,248,250,.97); border-color:rgba(60,60,67,.2); box-shadow:0 26px 80px rgba(30,30,60,.28), 0 0 0 .5px rgba(0,0,0,.16); }
    .light .titlebar, .light .footer, .light .row, .light .list-item { border-color:rgba(60,60,67,.13); }.light .sidebar { background:rgba(235,235,240,.72); border-color:rgba(60,60,67,.13); }.light .side-label, .light .subtitle, .light .label, .light .footer, .light .metric b, .light .list-item small { color:#6e6e73; }.light .value, .light .metric strong { color:#1d1d1f; }.light .metric { background:rgba(255,255,255,.72); border-color:rgba(60,60,67,.13); }.light .tab { color:#3c3c43; }.light .tab:hover { background:rgba(60,60,67,.1); }.light .action { color:#3c3c43; background:rgba(118,118,128,.14); }.light .window-title span { color:#6e6e73; }.light .value a, .light .list-item a { color:#0066cc; }
    @media (max-width:620px) { .osint-window { top:0; right:0; width:100vw; height:100vh; border-radius:0; }.sidebar { width:126px; }.grid { grid-template-columns:1fr; }.window-title span { display:none; }.title-actions .action { padding:7px; font-size:0; }.title-actions .action::before { font-size:13px; }.title-actions .action[data-action="theme"]::before { content:"◐"; }.title-actions .action[data-action="copy"]::before { content:"⧉"; }.title-actions .action[data-action="download"]::before { content:"↓"; } }
  `;
  shadow.appendChild(style);

  const win = document.createElement('section');
  win.className = 'osint-window';
  win.innerHTML = `
    <header class="titlebar">
      <div class="traffic"><button class="dot red" data-action="close" aria-label="Close" title="Close"></button><button class="dot yellow" data-action="minimize" aria-label="Minimize" title="Minimize"></button><button class="dot green" data-action="maximize" aria-label="Maximize" title="Maximize"></button></div>
      <div class="window-title">OSINT Page Triage <span>· passive page analysis</span></div>
      <div class="title-actions"><button class="action" data-action="theme" aria-label="Switch to light mode" title="Switch appearance">Light</button><button class="action" data-action="copy" title="Copy report as JSON">Copy</button><button class="action" data-action="download" title="Download report as JSON">Export</button></div>
    </header>
    <div class="body">
      <nav class="sidebar"><div class="side-label">Inspector</div><button class="tab active" data-tab="summary">Overview</button><button class="tab" data-tab="metadata">Metadata</button><button class="tab" data-tab="contacts">Contacts</button><button class="tab" data-tab="links">Links</button><button class="tab" data-tab="images">Images</button><button class="tab" data-tab="structured">Structured data</button></nav>
      <main class="content"><div class="content-head"><h2 id="heading">Page overview</h2><div class="subtitle" id="subtitle"></div></div><div class="panel" id="panel"></div></main>
    </div>
    <footer class="footer">Reads visible page data only · no network requests · Drag title bar to move · Drag corner to resize</footer>
    <span class="resize-grip" aria-hidden="true"></span>
  `;
  shadow.appendChild(win);

  const $ = selector => shadow.querySelector(selector);
  const themeButton = win.querySelector('[data-action="theme"]');
  const applyTheme = mode => {
    const light = mode === 'light';
    win.classList.toggle('light', light);
    themeButton.textContent = light ? 'Dark' : 'Light';
    themeButton.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    try { localStorage.setItem('osint-triage-theme', mode); } catch {}
  };
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('osint-triage-theme') || 'dark'; } catch {}
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const link = url => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(url)}</a>`;
  const list = (items, render) => items.length ? items.map(render).join('') : '<div class="empty">Nothing found on this page.</div>';

  function render(tab) {
    const panel = $('#panel');
    const title = { summary:'Page overview', metadata:'Metadata', contacts:'Contacts', links:'Links', images:'Images', structured:'Structured data' }[tab];
    $('#heading').textContent = title;
    $('#subtitle').textContent = page.title;
    if (tab === 'summary') {
      panel.innerHTML = `<div class="grid"><div class="metric"><b>Emails</b><strong>${page.emails.length}</strong></div><div class="metric"><b>Phone numbers</b><strong>${page.phones.length}</strong></div><div class="metric"><b>Links</b><strong>${page.links.length}</strong></div><div class="metric"><b>Images</b><strong>${page.images.length}</strong></div><div class="metric"><b>Social profiles</b><strong>${page.social.length}</strong></div><div class="metric"><b>Technologies</b><strong>${page.technologies.length}</strong></div></div><div class="row"><div class="label">Page URL</div><div class="value">${link(page.url)}</div></div><div class="row"><div class="label">Detected technologies</div><div class="value">${escape(page.technologies.join(', ') || 'None detected')}</div></div>`;
    } else if (tab === 'metadata') {
      const fields = [['Title', page.title], ['Canonical URL', page.canonical], ['Description', page.description], ['Author', page.author], ['Published', page.published], ['Language', page.language], ['Open Graph image', page.ogImage]];
      panel.innerHTML = fields.map(([label, value]) => `<div class="row"><div class="label">${escape(label)}</div><div class="value">${value && /^https?:/i.test(value) ? link(value) : escape(value || 'Not found')}</div></div>`).join('') + '<div class="row"><div class="label">Meta tags</div><div class="value">' + page.meta.length + '</div></div>';
    } else if (tab === 'contacts') {
      panel.innerHTML = `<div class="row"><div class="label">Emails</div>${list(page.emails, email => `<div class="list-item"><a href="mailto:${escape(email)}">${escape(email)}</a></div>`)}</div><div class="row"><div class="label">Phone numbers</div>${list(page.phones, phone => `<div class="list-item"><a href="tel:${escape(phone)}">${escape(phone)}</a></div>`)}</div><div class="row"><div class="label">Social profiles</div>${list(page.social, url => `<div class="list-item">${link(url)}</div>`)}</div>`;
    } else if (tab === 'links') {
      panel.innerHTML = `<div class="row"><div class="label">${page.links.length} links found</div>${list(page.links, item => `<div class="list-item">${escape(item.text || '(no anchor text)')} ${item.external ? '<span class="badge">external</span>' : ''}<small>${link(item.url)}</small></div>`)}</div>`;
    } else if (tab === 'images') {
      panel.innerHTML = `<div class="row"><div class="label">${page.images.length} images found</div>${list(page.images, item => `<div class="list-item">${escape(item.alt || '(no alt text)')}<small>${escape(item.width && item.height ? `${item.width} × ${item.height} · ` : '')}${link(item.src)}</small></div>`)}</div>`;
    } else {
      panel.innerHTML = `<div class="row"><div class="label">JSON-LD blocks</div>${list(page.jsonLd, item => `<pre class="list-item" style="white-space:pre-wrap;color:#d7d7dc">${escape(JSON.stringify(item, null, 2))}</pre>`)}</div>`;
    }
  }

  shadow.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    shadow.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === button));
    render(button.dataset.tab);
  }));

  win.querySelector('[data-action="close"]').addEventListener('click', () => host.remove());
  win.querySelector('[data-action="minimize"]').addEventListener('click', () => { win.style.height = win.style.height ? '' : '52px'; });
  win.querySelector('[data-action="maximize"]').addEventListener('click', () => { win.classList.toggle('maximized'); Object.assign(win.style, win.classList.contains('maximized') ? { top:'0', right:'0', width:'100vw', height:'100vh', borderRadius:'0' } : { top:'6vh', right:'4vw', width:'min(760px,92vw)', height:'min(700px,86vh)', borderRadius:'15px' }); });
  themeButton.addEventListener('click', () => applyTheme(win.classList.contains('light') ? 'dark' : 'light'));
  win.querySelector('[data-action="copy"]').addEventListener('click', async event => { await navigator.clipboard?.writeText(JSON.stringify(page, null, 2)); event.currentTarget.textContent = 'Copied'; setTimeout(() => { event.currentTarget.textContent = 'Copy JSON'; }, 1400); });

  // Drag the title bar to move the window.
  let drag = null;
  win.querySelector('.titlebar').addEventListener('pointerdown', event => {
    if (event.target.closest('button') || win.classList.contains('maximized')) return;
    const rect = win.getBoundingClientRect();
    drag = { pointerId:event.pointerId, x:event.clientX, y:event.clientY, left:rect.left, top:rect.top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    win.style.left = Math.max(8, drag.left + event.clientX - drag.x) + 'px';
    win.style.top = Math.max(8, drag.top + event.clientY - drag.y) + 'px';
    win.style.right = 'auto';
  });
  document.addEventListener('pointerup', event => { if (drag && event.pointerId === drag.pointerId) drag = null; });

  // Drag the bottom-right corner to resize with sensible bounds.
  let resize = null;
  win.querySelector('.resize-grip').addEventListener('pointerdown', event => {
    event.preventDefault();
    const rect = win.getBoundingClientRect();
    resize = { pointerId:event.pointerId, x:event.clientX, y:event.clientY, width:rect.width, height:rect.height };
  });
  document.addEventListener('pointermove', event => {
    if (!resize || event.pointerId !== resize.pointerId) return;
    win.style.width = Math.min(Math.max(480, resize.width + event.clientX - resize.x), innerWidth - 16) + 'px';
    win.style.height = Math.min(Math.max(360, resize.height + event.clientY - resize.y), innerHeight - 16) + 'px';
  });
  document.addEventListener('pointerup', event => { if (resize && event.pointerId === resize.pointerId) resize = null; });

  const tabs = [...shadow.querySelectorAll('[data-tab]')];
  document.addEventListener('keydown', event => {
    if (event.target.matches?.('input, textarea, select')) return;
    const number = Number(event.key);
    if (number >= 1 && number <= tabs.length) tabs[number - 1].click();
    if (event.key === 'Escape') host.remove();
  });
  win.querySelector('[data-action="download"]').addEventListener('click', () => { const blob = new Blob([JSON.stringify(page, null, 2)], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'osint-page-triage.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });

  render('summary');
})();
