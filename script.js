/* =====================================================================
   Portfolio · Lenggo Genni
   - sticky nav + scroll spy
   - reveal on scroll
   - case-study panel (deep-linkable via #p-<project>)
   - lightbox for diagrams
   To add a project: add a <template id="tpl-..."> in index.html, a card
   linking to #p-<id>, and an entry in PROJECTS below.
   ===================================================================== */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE_TITLE = document.title;

  /* ---------- config ---------- */
  const PROJECTS = {
    'lakehouse': { template: 'tpl-lakehouse', title: 'AdventureWorks Data Lakehouse' },
    'sql-dwh':   { template: 'tpl-sqldwh',    title: 'SQL Server Data Warehouse' },
    'landslide': { template: 'tpl-landslide', title: 'Landslide Susceptibility Classification' },
    'dishup':    { template: 'tpl-dishup',    title: 'DishUp!: Food Pre-order App' }
  };
  const ORDER = Object.keys(PROJECTS);

  /* ---------- footer year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const navToggle = $('#nav-toggle');
  const navLinks = $$('#nav-links a');

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));

  // scroll spy for the main page
  const spyTargets = ['about', 'projects', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => {
        a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + entry.target.id));
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  spyTargets.forEach(el => spy.observe(el));

  /* ---------- reveal on scroll (main page) ---------- */
  // Plays a one-off entrance animation, then strips the reveal classes so
  // normal hover transitions take over.
  function playReveal(el) {
    const clear = () => {
      el.classList.remove('reveal', 'is-visible');
      el.style.removeProperty('--reveal-delay');
    };
    if (reduceMotion) { clear(); return; }
    if (el.dataset.delay) el.style.setProperty('--reveal-delay', el.dataset.delay + 'ms');
    el.classList.add('is-visible');
    el.addEventListener('animationend', function onEnd(e) {
      if (e.target !== el || e.animationName !== 'reveal-in') return;
      el.removeEventListener('animationend', onEnd);
      clear();
    });
  }

  const reveal = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      playReveal(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  $$('.reveal').forEach(el => reveal.observe(el));

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (reduceMotion) { el.textContent = target.toLocaleString('en-US'); return; }
    const duration = 900;
    const start = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- case-study panel ---------- */
  const panel     = $('#panel');
  const scroller  = $('#panel-scroll');
  const content   = $('#panel-content');
  const crumb     = $('#panel-crumb');
  const progress  = $('#panel-progress');
  const backBtn   = $('#panel-back');
  const closeBtn  = $('#panel-close');

  let current = null;       // id of the open project
  let lastFocus = null;     // element to return focus to
  let openedViaNav = false; // true when the panel was opened by clicking a link (history entry exists)
  let closeTimer = null;
  let observers = [];

  const idFromHash = () => {
    const m = location.hash.match(/^#p-(.+)$/);
    return m && PROJECTS[m[1]] ? m[1] : null;
  };

  function render(id) {
    const def = PROJECTS[id];
    const tpl = document.getElementById(def.template);
    content.replaceChildren(tpl.content.cloneNode(true));

    // table of contents
    const sections = $$('[data-section]', content);
    const toc = $('.cs__toc', content);
    if (toc) {
      toc.replaceChildren(...sections.map(sec => {
        const a = document.createElement('a');
        a.href = '#';
        a.dataset.goto = sec.dataset.section;
        a.textContent = sec.dataset.title;
        return a;
      }));
    }

    // "next project" footer
    const nextId = ORDER[(ORDER.indexOf(id) + 1) % ORDER.length];
    if (nextId !== id) {
      const wrap = document.createElement('div');
      wrap.className = 'cs-next';
      wrap.innerHTML =
        '<p class="cs-next__label">Next project</p>' +
        '<a class="cs-next__link" href="#p-' + nextId + '" data-next="' + nextId + '">' +
        '<span></span><i class="bi bi-arrow-right"></i></a>';
      $('span', wrap).textContent = PROJECTS[nextId].title;
      const main = $('.cs__main', content);
      (main || content).appendChild(wrap);
    }
  }

  function setupObservers() {
    cleanupObservers();

    // reveal + count-up + diagram animation inside the panel
    const inPanel = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        $$('.dg', el).forEach(svg => svg.parentElement.classList.add('in-view'));
        playReveal(el);
        obs.unobserve(el);
      });
    }, { root: scroller, threshold: 0.1 });
    $$('.reveal', content).forEach(el => inPanel.observe(el));
    observers.push(inPanel);

    // count-up when the stats come into view
    const statsEl = $('.cs__stats', content);
    if (statsEl) {
      const nums = $$('.stat__num[data-count]', statsEl);
      if (!reduceMotion) nums.forEach(n => { n.textContent = '0'; });
      const statObs = new IntersectionObserver((entries, obs) => {
        if (!entries.some(e => e.isIntersecting)) return;
        nums.forEach(countUp);
        obs.disconnect();
      }, { root: scroller, threshold: 0.4 });
      statObs.observe(statsEl);
      observers.push(statObs);
    }

    // table-of-contents scroll spy
    const links = $$('.cs__toc a', content);
    if (links.length) {
      const tocObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          links.forEach(a => a.classList.toggle('is-active', a.dataset.goto === entry.target.dataset.section));
        });
      }, { root: scroller, rootMargin: '-15% 0px -70% 0px' });
      $$('[data-section]', content).forEach(sec => tocObs.observe(sec));
      observers.push(tocObs);
    }
  }

  function cleanupObservers() {
    observers.forEach(o => o.disconnect());
    observers = [];
  }

  function updateProgress() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const ratio = max > 0 ? scroller.scrollTop / max : 0;
    progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
  }

  function openPanel(id) {
    const first = !current;
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (first) lastFocus = document.activeElement;

    panel.hidden = false;
    render(id);
    current = id;
    scroller.scrollTop = 0;
    crumb.textContent = PROJECTS[id].title;
    document.title = PROJECTS[id].title + ' · Lenggo Genni';
    document.body.classList.add('no-scroll');
    nav.classList.remove('is-open');

    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));
    setupObservers();
    updateProgress();
    if (first) backBtn.focus({ preventScroll: true });
  }

  function closePanel() {
    if (!current) return;
    current = null;
    panel.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    document.title = BASE_TITLE;
    cleanupObservers();

    closeTimer = setTimeout(() => {
      panel.hidden = true;
      content.replaceChildren();
      closeTimer = null;
    }, reduceMotion ? 0 : 400);

    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }

  // Close from the UI: go back in history if the panel was opened by a link,
  // otherwise just clear the hash without adding history entries.
  function requestClose() {
    if (!current) return;
    if (openedViaNav) {
      history.back(); // hashchange handler closes the panel
    } else {
      history.replaceState(null, '', location.pathname + location.search + '#projects');
      closePanel();
    }
  }

  window.addEventListener('hashchange', () => {
    const id = idFromHash();
    if (id) {
      openedViaNav = true;
      if (id !== current) openPanel(id);
    } else if (current) {
      closePanel();
    }
  });

  backBtn.addEventListener('click', requestClose);
  closeBtn.addEventListener('click', requestClose);
  scroller.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  // clicks inside the panel: table of contents + next project
  content.addEventListener('click', e => {
    const goto = e.target.closest('[data-goto]');
    if (goto) {
      e.preventDefault();
      const sec = $('[data-section="' + goto.dataset.goto + '"]', content);
      if (sec) sec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const next = e.target.closest('[data-next]');
    if (next) {
      e.preventDefault();
      const id = next.dataset.next;
      history.replaceState(null, '', '#p-' + id); // keep a single history entry
      openPanel(id);
      return;
    }
    const img = e.target.closest('.zoomable img');
    if (img) openLightbox(img);
  });

  /* ---------- lightbox ---------- */
  const lightbox = $('#lightbox');
  const lbImg = $('#lightbox-img');
  const lbClose = $('#lightbox-close');
  let lbReturn = null;

  function openLightbox(img) {
    lbReturn = document.activeElement;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    lbClose.focus({ preventScroll: true });
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    setTimeout(() => { lightbox.hidden = true; lbImg.removeAttribute('src'); }, reduceMotion ? 0 : 250);
    if (lbReturn && typeof lbReturn.focus === 'function') lbReturn.focus({ preventScroll: true });
  }
  lightbox.addEventListener('click', closeLightbox);
  lbClose.addEventListener('click', e => { e.stopPropagation(); closeLightbox(); });

  /* ---------- keyboard: Esc + focus trap ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!lightbox.hidden) { closeLightbox(); return; }
      if (current) requestClose();
      return;
    }
    if (e.key !== 'Tab' || !current) return;

    const scope = lightbox.hidden ? panel : lightbox;
    const focusable = $$('a[href], button:not([disabled])', scope)
      .filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- open directly from a shared link ---------- */
  const initial = idFromHash();
  if (initial) {
    openedViaNav = false;
    openPanel(initial);
  }
})();
