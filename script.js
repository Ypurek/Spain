(() => {
  'use strict';

  const SUPPORTED_LANGS = ['en', 'uk', 'es'];
  const LANG_STORAGE_KEY = 'map-gpt.uiLang';

  // SVG має path з id: ES-AN, ES-AR, ... + ES-CE, ES-ML
  const ID_TO_NAME = {
    'ES-AN': 'Andalucía',
    'ES-AR': 'Aragón',
    'ES-AS': 'Asturias',
    'ES-CB': 'Cantabria',
    'ES-CL': 'Castilla y León',
    'ES-CM': 'Castilla-La Mancha',
    'ES-CN': 'Canarias',
    'ES-CT': 'Cataluña',
    'ES-EX': 'Extremadura',
    'ES-GA': 'Galicia',
    'ES-IB': 'Illes Balears',
    'ES-MC': 'Región de Murcia',
    'ES-MD': 'Comunidad de Madrid',
    'ES-NC': 'Navarra',
    'ES-PV': 'País Vasco',
    'ES-RI': 'La Rioja',
    'ES-VC': 'Comunidad Valenciana',

    // Автономні міста (Іспанія в Північній Африці)
    'ES-CE': 'Ceuta',
    'ES-ML': 'Melilla',
  };

  const REGIONS = Object.values(ID_TO_NAME);
  const TOTAL = REGIONS.length;
  const QUIZ_TARGET_IDS = Object.keys(ID_TO_NAME).filter((id) => id !== 'ES-CE' && id !== 'ES-ML');

  const mapHost = document.getElementById('mapHost');
  const tilesEl = document.getElementById('tiles');
  const statusFillEl = document.getElementById('statusFill');
  const winEl = document.getElementById('win');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const resetBtn = document.getElementById('resetBtn');

  const pageTitleEl = document.getElementById('pageTitle');
  const pageSubtitleEl = document.getElementById('pageSubtitle');
  const modeMenuEl = document.querySelector('.modeMenu');
  const modeMenuToggleBtn = document.getElementById('modeMenuToggle');
  const modeButtonsEl = document.getElementById('modeButtons');
  const modeFillBtn = document.getElementById('modeFillBtn');
  const modeQuizBtn = document.getElementById('modeQuizBtn');
  const modeHuntBtn = document.getElementById('modeHuntBtn');
  const fillPanel = document.getElementById('fillPanel');
  const quizPanel = document.getElementById('quizPanel');
  const huntPanel = document.getElementById('huntPanel');

  const langSelectEl = document.getElementById('langSelect');
  const langLabelEl = document.getElementById('langLabel');
  const fillHeadingEl = document.getElementById('fillHeading');
  const winTitleEl = document.getElementById('winTitle');
  const winNoteEl = document.getElementById('winNote');
  const quizHeadingEl = document.getElementById('quizHeading');
  const quizPromptEl = document.getElementById('quizPrompt');
  const huntHeadingEl = document.getElementById('huntHeading');
  const huntTargetLabelEl = document.getElementById('huntTargetLabel');

  const quizOptionsEl = document.getElementById('quizOptions');
  const quizBarFillEl = document.getElementById('quizBarFill');
  const quizScoreBarFillEl = document.getElementById('quizScoreBarFill');
  const quizFeedbackEl = document.getElementById('quizFeedback');
  const quizNextBtn = document.getElementById('quizNextBtn');
  const quizPlayAgainBtn = document.getElementById('quizPlayAgainBtn');
  const quizResetBtn = document.getElementById('quizResetBtn');

  const huntTargetNameEl = document.getElementById('huntTargetName');
  const huntBarFillEl = document.getElementById('huntBarFill');
  const huntScoreBarFillEl = document.getElementById('huntScoreBarFill');
  const huntFeedbackEl = document.getElementById('huntFeedback');
  const huntStartBtn = document.getElementById('huntStartBtn');
  const huntPlayAgainBtn = document.getElementById('huntPlayAgainBtn');
  const huntResetBtn = document.getElementById('huntResetBtn');

  const QUIZ_SCORE_TARGET = 10;
  const QUIZ_NEXT_DELAY_MS = 2000;

  const isCoarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  let selectedName = null;
  let mode = 'fill'; // 'fill' | 'quiz' | 'hunt'
  let done = new Set();

  let currentLang = 'es';
  let mapLoadErrorKind = null; // null | 'file' | 'other'

  const I18N = {
    en: {
      'doc.title': 'Interactive game: Spain regions + Ceuta and Melilla',
      'lang.label': 'Language',
      'lang.en': 'English',
      'lang.uk': 'Українська',
      'lang.es': 'Español',
      'mode.aria': 'Game selection',
      'mode.toggle': ({ n }) => `Game: ${n}`,
      'mode.fill': 'Game 1: Fill in',
      'mode.quiz': 'Game 2: Guess the region',
      'mode.hunt': 'Game 3: Find on map',
      'status.done': ({ doneCount, totalCount }) => `Done: ${doneCount} / ${totalCount}`,
      'fill.heading': 'Region and city names (in Spanish)',
      'btn.shuffle': 'Shuffle',
      'btn.reset': 'Reset',
      'win.title': '🎉 Congratulations!',
      'win.note': 'Everything placed correctly',
      'quiz.heading': 'Guess the region',
      'quiz.prompt': 'A region is highlighted on the map. Choose the correct name in 10 seconds.',
      'hunt.heading': 'Find on the map',
      'hunt.targetLabel': 'Click on the map:',
      'btn.start': 'Start',
      'btn.tryAgain': 'Try again',
      'btn.playAgain': 'Play again',
      'pageTitle.fill': 'Spain: 17 regions + 2 autonomous cities — drag a name onto the map',
      'pageTitle.quiz': 'Spain — game 2: guess the region',
      'pageTitle.hunt': 'Spain — game 3: find it on the map',
      'subtitle.fill': 'Correct: the region/city is filled and labeled. The game ends when you get them all.',
      'subtitle.quiz': 'A region is highlighted: pick the correct name (4 options) in 10 seconds.',
      'subtitle.hunt': 'A region name is shown: click it on the map before time runs out.',
      'quiz.pickFail': "Couldn't pick a region for the question.",
      'hunt.pickFail': "Couldn't pick a region for the question.",
      'goal.reached': ({ points }) => `🎉 Goal reached: ${points} points`,
      'load.loading': 'Loading map…',
      'load.fetchFail': ({ status }) => `Failed to load ./spain.svg (HTTP ${status})`,
      'load.svgMissing': 'spain.svg loaded, but no <svg> tag found (invalid XML?)',
      'load.error.file':
        'Failed to load spain.svg. You opened the page as a file (file://), and fetch for SVG is often blocked. Run via Live Server / a local server (e.g., VS Code Live Server) and open index.html.',
      'load.error.other':
        'Failed to load spain.svg. Make sure index.html and spain.svg are in the same folder.',
      'common.dash': '—',
    },
    uk: {
      'doc.title': 'Інтерактивна гра: регіони Іспанії + Сеута і Мелілья',
      'lang.label': 'Мова',
      'lang.en': 'Англійська',
      'lang.uk': 'Українська',
      'lang.es': 'Іспанська',
      'mode.aria': 'Вибір гри',
      'mode.toggle': ({ n }) => `Гра: ${n}`,
      'mode.fill': 'Гра 1: Заповнення',
      'mode.quiz': 'Гра 2: Вгадай регіон',
      'mode.hunt': 'Гра 3: Знайди на мапі',
      'status.done': ({ doneCount, totalCount }) => `Готово: ${doneCount} / ${totalCount}`,
      'fill.heading': 'Назви регіонів і міст (іспанською)',
      'btn.shuffle': 'Перемішати',
      'btn.reset': 'Скинути',
      'win.title': '🎉 Вітаю!',
      'win.note': 'Усе розміщено правильно',
      'quiz.heading': 'Вгадай регіон',
      'quiz.prompt': 'На мапі підсвічено регіон. Обери правильну назву за 10 секунд.',
      'hunt.heading': 'Знайди на мапі',
      'hunt.targetLabel': 'Натисни на мапі:',
      'btn.start': 'Почати',
      'btn.tryAgain': 'Спробувати ще',
      'btn.playAgain': 'Грати ще',
      'pageTitle.fill': 'Іспанія: 17 регіонів + 2 автономні міста — перетягни назву на мапу',
      'pageTitle.quiz': 'Іспанія — гра 2: вгадай регіон',
      'pageTitle.hunt': 'Іспанія — гра 3: знайди на мапі',
      'subtitle.fill': 'Правильно: область/місто зафарбується і з’явиться підпис. Гра закінчується, коли збереш усі',
      'subtitle.quiz': 'Регіон підсвічено на мапі: обери правильну назву серед 4 варіантів за 10 секунд',
      'subtitle.hunt': 'Показано назву регіону: натисни його на мапі, поки не закінчиться шкала часу',
      'quiz.pickFail': 'Не вдалося вибрати регіон для загадки.',
      'hunt.pickFail': 'Не вдалося вибрати регіон для питання.',
      'goal.reached': ({ points }) => `🎉 Мета досягнута: ${points} балів`,
      'load.loading': 'Завантажую мапу…',
      'load.fetchFail': ({ status }) => `Не вдалося завантажити ./spain.svg (HTTP ${status})`,
      'load.svgMissing': 'Файл spain.svg завантажився, але SVG-тег не знайдено (пошкоджений XML?)',
      'load.error.file':
        'Не вдалося завантажити spain.svg. Ти відкрив сторінку як файл (file://), а fetch для SVG часто блокується. Запусти через Live Server / локальний сервер (наприклад, VS Code Live Server) і відкрий index.html.',
      'load.error.other':
        'Не вдалося завантажити spain.svg. Переконайся, що index.html і spain.svg лежать в одній теці.',
      'common.dash': '—',
    },
    es: {
      'doc.title': 'Juego interactivo: regiones de España + Ceuta y Melilla',
      'lang.label': 'Idioma',
      'lang.en': 'Inglés',
      'lang.uk': 'Ucraniano',
      'lang.es': 'Español',
      'mode.aria': 'Selección de juego',
      'mode.toggle': ({ n }) => `Juego: ${n}`,
      'mode.fill': 'Juego 1: Rellenar',
      'mode.quiz': 'Juego 2: Adivina la región',
      'mode.hunt': 'Juego 3: Encuentra en el mapa',
      'status.done': ({ doneCount, totalCount }) => `Completado: ${doneCount} / ${totalCount}`,
      'fill.heading': 'Nombres de regiones y ciudades (en español)',
      'btn.shuffle': 'Mezclar',
      'btn.reset': 'Reiniciar',
      'win.title': '🎉 ¡Enhorabuena!',
      'win.note': 'Todo está colocado correctamente',
      'quiz.heading': 'Adivina la región',
      'quiz.prompt': 'En el mapa se resalta una región. Elige el nombre correcto en 10 segundos.',
      'hunt.heading': 'Encuentra en el mapa',
      'hunt.targetLabel': 'Haz clic en el mapa:',
      'btn.start': 'Empezar',
      'btn.tryAgain': 'Intentar de nuevo',
      'btn.playAgain': 'Jugar otra vez',
      'pageTitle.fill': 'España: 17 regiones + 2 ciudades autónomas — arrastra el nombre al mapa',
      'pageTitle.quiz': 'España — juego 2: adivina la región',
      'pageTitle.hunt': 'España — juego 3: encuéntrala en el mapa',
      'subtitle.fill': 'Correcto: la región/ciudad se colorea y aparece la etiqueta. Termina cuando las completes todas.',
      'subtitle.quiz': 'La región está resaltada: elige el nombre correcto (4 opciones) en 10 segundos.',
      'subtitle.hunt': 'Se muestra el nombre de la región: haz clic en el mapa antes de que se acabe el tiempo.',
      'quiz.pickFail': 'No se pudo elegir una región para la pregunta.',
      'hunt.pickFail': 'No se pudo elegir una región para la pregunta.',
      'goal.reached': ({ points }) => `🎉 Meta alcanzada: ${points} puntos`,
      'load.loading': 'Cargando mapa…',
      'load.fetchFail': ({ status }) => `No se pudo cargar ./spain.svg (HTTP ${status})`,
      'load.svgMissing': 'spain.svg se cargó, pero no se encontró la etiqueta <svg> (¿XML inválido?)',
      'load.error.file':
        'No se pudo cargar spain.svg. Abriste la página como archivo (file://) y a menudo fetch para SVG está bloqueado. Ejecuta con Live Server / un servidor local (p. ej., VS Code Live Server) y abre index.html.',
      'load.error.other':
        'No se pudo cargar spain.svg. Asegúrate de que index.html y spain.svg estén en la misma carpeta.',
      'common.dash': '—',
    },
  };

  function normalizeToSupportedLang(tag) {
    if (!tag) return null;
    const base = String(tag).toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED_LANGS.includes(base)) return base;
    return null;
  }

  function t(key, vars) {
    const entry = (I18N[currentLang] && I18N[currentLang][key]) ?? I18N.en[key];
    if (typeof entry === 'function') return entry(vars || {});
    return entry ?? key;
  }

  function applyStaticTranslations() {
    document.title = t('doc.title');
    document.documentElement.lang = currentLang;

    if (langLabelEl) langLabelEl.textContent = t('lang.label');
    if (modeButtonsEl) modeButtonsEl.setAttribute('aria-label', t('mode.aria'));

    if (modeFillBtn) modeFillBtn.textContent = t('mode.fill');
    if (modeQuizBtn) modeQuizBtn.textContent = t('mode.quiz');
    if (modeHuntBtn) modeHuntBtn.textContent = t('mode.hunt');

    if (fillHeadingEl) fillHeadingEl.textContent = t('fill.heading');
    if (shuffleBtn) shuffleBtn.textContent = t('btn.shuffle');
    if (resetBtn) resetBtn.textContent = t('btn.reset');
    if (winTitleEl) winTitleEl.textContent = t('win.title');
    if (winNoteEl) winNoteEl.textContent = t('win.note');

    if (quizHeadingEl) quizHeadingEl.textContent = t('quiz.heading');
    if (quizPromptEl) quizPromptEl.textContent = t('quiz.prompt');
    if (quizNextBtn && !quizState.started) quizNextBtn.textContent = t('btn.start');
    if (quizPlayAgainBtn) quizPlayAgainBtn.textContent = t('btn.playAgain');
    if (quizResetBtn) quizResetBtn.textContent = t('btn.reset');

    if (huntHeadingEl) huntHeadingEl.textContent = t('hunt.heading');
    if (huntTargetLabelEl) huntTargetLabelEl.textContent = t('hunt.targetLabel');
    if (huntStartBtn && !huntState.started) huntStartBtn.textContent = t('btn.start');
    if (huntPlayAgainBtn) huntPlayAgainBtn.textContent = t('btn.playAgain');
    if (huntResetBtn) huntResetBtn.textContent = t('btn.reset');

    // Keep the selector labels in sync with the current UI language.
    if (langSelectEl) {
      const optEn = langSelectEl.querySelector('option[value="en"]');
      const optUk = langSelectEl.querySelector('option[value="uk"]');
      const optEs = langSelectEl.querySelector('option[value="es"]');
      if (optEn) optEn.textContent = t('lang.en');
      if (optUk) optUk.textContent = t('lang.uk');
      if (optEs) optEs.textContent = t('lang.es');
    }

    // If the map isn't loaded yet (or failed), translate the placeholder/error text.
    const hasSvg = !!mapHost.querySelector('svg');
    if (!hasSvg) {
      if (mapLoadErrorKind === 'file') mapHost.textContent = t('load.error.file');
      else if (mapLoadErrorKind === 'other') mapHost.textContent = t('load.error.other');
      else mapHost.textContent = t('load.loading');
    }
  }

  function setLanguage(nextLang, { persist = true } = {}) {
    const normalized = normalizeToSupportedLang(nextLang) ?? 'en';
    currentLang = normalized;
    if (persist) {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, normalized);
      } catch {
        // ignore
      }
    }

    if (langSelectEl) langSelectEl.value = normalized;

    applyStaticTranslations();
    updateModeUI();
    setStatus();

    // Ensure mode buttons reflect the language (start/try again).
    if (mode === 'quiz' && !quizState.started) quizNextBtn.textContent = t('btn.start');
    if (mode === 'hunt' && !huntState.started) huntStartBtn.textContent = t('btn.start');
  }

  function pickInitialLanguage() {
    // 1) Stored preference
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      const normalized = normalizeToSupportedLang(stored);
      if (normalized) return { lang: normalized, persist: true };
    } catch {
      // ignore
    }

    // 2) Browser locale(s)
    const candidates = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (const c of candidates) {
      const normalized = normalizeToSupportedLang(c);
      if (normalized) return { lang: normalized, persist: false };
    }
    return { lang: 'es', persist: false };
  }

  const quizState = {
    started: false,
    completed: false,
    running: false,
    locked: false,
    targetId: null,
    correctName: null,
    rafId: null,
    nextTimeoutId: null,
    progressStart: 0,
    progressDuration: 0,
    score: 0,
    highlightPrev: null,
  };

  const huntState = {
    started: false,
    completed: false,
    running: false,
    locked: false,
    targetId: null,
    correctName: null,
    rafId: null,
    nextTimeoutId: null,
    progressStart: 0,
    progressDuration: 0,
    score: 0,
    highlightPrevById: new Map(),
  };

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
  }

  function pickRandomId(ids, svg) {
    for (let tries = 0; tries < 50; tries++) {
      const candidate = ids[randInt(ids.length)];
      if (!candidate) continue;
      if (svg.querySelector(`#${CSS.escape(candidate)}`)) return candidate;
    }
    return null;
  }

  function setStatus() {
    statusFillEl.textContent = t('status.done', { doneCount: done.size, totalCount: TOTAL });
    winEl.style.display = done.size === TOTAL ? 'block' : 'none';
  }

  function stableColor(name) {
    // Детермінований колір з назви (щоб кожен регіон мав свій)
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const hue = h % 360;
    return `hsla(${hue}, 70%, 55%, 0.55)`;
  }

  function setSelectedTile(name) {
    selectedName = name;
    tilesEl.querySelectorAll('.tile').forEach((t) => {
      t.classList.toggle('selected', t.dataset.regionName === name);
    });
  }

  function clearSelectedTile() {
    selectedName = null;
    tilesEl.querySelectorAll('.tile.selected').forEach((t) => t.classList.remove('selected'));
  }

  function makeTile(name) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.textContent = name;
    el.draggable = true;
    el.dataset.regionName = name;

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', name);
      e.dataTransfer.effectAllowed = 'move';
    });

    // На телефонах/планшетах drag&drop часто не працює: робимо режим "тапни назву → тапни область"
    el.addEventListener('click', () => {
      if (!isCoarsePointer) return;
      setSelectedTile(selectedName === name ? null : name);
      if (selectedName === null) clearSelectedTile();
    });

    return el;
  }

  function renderTiles(list) {
    tilesEl.innerHTML = '';
    list.forEach((n) => tilesEl.appendChild(makeTile(n)));
  }

  function clearLabels(svg) {
    svg.querySelectorAll('text.label').forEach((t) => t.remove());
  }

  function addLabel(svg, targetPath, name) {
    let x = 0;
    let y = 0;

    // SVG зі Sketch має вкладені transform'и; getBBox/getCTM іноді дає координати,
    // які не збігаються з поточним viewBox. Надійніше: взяти центр елемента
    // у screen-space і перевести назад у координати SVG.
    const svgCTM = svg.getScreenCTM?.();
    const r = targetPath.getBoundingClientRect?.();
    if (svgCTM && r && r.width > 0 && r.height > 0) {
      const inv = svgCTM.inverse();
      const pt = svg.createSVGPoint();
      pt.x = r.left + r.width / 2;
      pt.y = r.top + r.height / 2;
      const p2 = pt.matrixTransform(inv);
      x = p2.x;
      y = p2.y;
    } else {
      const bb = targetPath.getBBox();
      x = bb.x + bb.width / 2;
      y = bb.y + bb.height / 2;

      // getBBox() повертає координати в локальній системі елемента.
      // Оскільки текст додаємо в корінь SVG, переводимо точку в систему координат SVG
      // через getCTM(), яка включає трансформації самого елемента і всіх батьківських <g>.
      const ctm = targetPath.getCTM?.();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const p2 = pt.matrixTransform(ctm);
        x = p2.x;
        y = p2.y;
      }
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'label');
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.textContent = name;

    svg.appendChild(text);
  }

  function applyCorrectDrop(svg, pathEl, id, correctName) {
    done.add(id);
    pathEl.classList.add('done');
    pathEl.style.fill = stableColor(correctName);
    addLabel(svg, pathEl, correctName);

    const tile = tilesEl.querySelector(`.tile[data-region-name="${CSS.escape(correctName)}"]`);
    if (tile) tile.remove();

    if (selectedName === correctName) clearSelectedTile();
    setStatus();
  }

  function animateWrong(pathEl) {
    pathEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], {
      duration: 180,
    });
  }

  function tryPlaceOnRegion(svg, pathEl, id, candidateName) {
    if (done.has(id)) return;
    const correctName = ID_TO_NAME[id];
    if (!correctName) return;

    if (candidateName === correctName) {
      applyCorrectDrop(svg, pathEl, id, correctName);
    } else {
      animateWrong(pathEl);
    }
  }

  function wireDrop(svg) {
    const paths = Array.from(svg.querySelectorAll('path'));

    paths.forEach((p) => {
      const id = p.getAttribute('id');
      if (!ID_TO_NAME[id]) return;

      p.classList.add('region');

      p.addEventListener('click', () => {
        if (mode === 'fill') {
          // Tap-to-place mode for touch devices
          if (!isCoarsePointer) return;
          if (!selectedName) return;
          tryPlaceOnRegion(svg, p, id, selectedName);
          return;
        }

        if (mode === 'hunt') {
          handleHuntMapClick(id);
        }
      });

      p.addEventListener('dragover', (e) => {
        if (done.has(id)) return;
        e.preventDefault();
        p.classList.add('drop-hover');
        e.dataTransfer.dropEffect = 'move';
      });

      p.addEventListener('dragleave', () => {
        p.classList.remove('drop-hover');
      });

      p.addEventListener('drop', (e) => {
        e.preventDefault();
        p.classList.remove('drop-hover');
        if (done.has(id)) return;

        const droppedName = e.dataTransfer.getData('text/plain');
        tryPlaceOnRegion(svg, p, id, droppedName);
      });
    });
  }

  // Підганяє viewBox під реальні контури регіонів.
  // Використовує getBoundingClientRect(), щоб коректно врахувати transform'и зі Sketch.
  function fitViewBoxToRegions(svg, paddingPx = 8) {
    const regionEls = Object.keys(ID_TO_NAME)
      .map((id) => svg.querySelector(`#${CSS.escape(id)}`))
      .filter(Boolean);

    if (!regionEls.length) return;

    const svgCTM = svg.getScreenCTM?.();
    if (!svgCTM) return;
    const inv = svgCTM.inverse();
    const pt = svg.createSVGPoint();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    function expandWithRect(rect) {
      const corners = [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
        { x: rect.right, y: rect.bottom },
        { x: rect.left, y: rect.bottom },
      ];
      for (const c of corners) {
        pt.x = c.x;
        pt.y = c.y;
        const p2 = pt.matrixTransform(inv);
        minX = Math.min(minX, p2.x);
        minY = Math.min(minY, p2.y);
        maxX = Math.max(maxX, p2.x);
        maxY = Math.max(maxY, p2.y);
      }
    }

    for (const el of regionEls) {
      const r = el.getBoundingClientRect();
      if (!r || !(r.width > 0) || !(r.height > 0)) continue;
      expandWithRect({
        left: r.left - paddingPx,
        top: r.top - paddingPx,
        right: r.right + paddingPx,
        bottom: r.bottom + paddingPx,
      });
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;

    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return;

    svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
  }

  // --- Quiz game ---

  function setQuizProgress01(t) {
    const clamped = Math.max(0, Math.min(1, t));
    quizBarFillEl.style.width = `${(clamped * 100).toFixed(2)}%`;
  }

  function setQuizScoreProgress(score) {
    const s = Math.max(0, Math.min(QUIZ_SCORE_TARGET, score));
    const t = QUIZ_SCORE_TARGET > 0 ? (s / QUIZ_SCORE_TARGET) : 0;
    quizScoreBarFillEl.style.width = `${(t * 100).toFixed(2)}%`;
  }

  function stopQuizProgress() {
    if (quizState.rafId != null) {
      cancelAnimationFrame(quizState.rafId);
      quizState.rafId = null;
    }
  }

  function stopQuizNextTimeout() {
    if (quizState.nextTimeoutId != null) {
      clearTimeout(quizState.nextTimeoutId);
      quizState.nextTimeoutId = null;
    }
  }

  function clearQuizOptionMarks() {
    quizOptionsEl.querySelectorAll('button').forEach((b) => {
      b.classList.remove('optionCorrect', 'optionWrong');
    });
  }

  function clearQuizHighlight() {
    const svg = mapHost.querySelector('svg');
    if (!svg) return;
    if (!quizState.highlightPrev?.id) return;

    const p = svg.querySelector(`#${CSS.escape(quizState.highlightPrev.id)}`);
    if (p) {
      p.classList.remove('quiz-target');
      p.style.fill = quizState.highlightPrev.fill;
      p.style.stroke = quizState.highlightPrev.stroke;
      p.style.strokeWidth = quizState.highlightPrev.strokeWidth;
      p.style.strokeOpacity = quizState.highlightPrev.strokeOpacity;
    }
    quizState.highlightPrev = null;
  }

  function applyQuizHighlight(targetId) {
    const svg = mapHost.querySelector('svg');
    if (!svg) return false;

    clearQuizHighlight();

    const p = svg.querySelector(`#${CSS.escape(targetId)}`);
    if (!p) return false;

    quizState.highlightPrev = {
      id: targetId,
      fill: p.style.fill,
      stroke: p.style.stroke,
      strokeWidth: p.style.strokeWidth,
      strokeOpacity: p.style.strokeOpacity,
    };

    p.classList.add('quiz-target');
    p.style.fill = 'rgba(43, 108, 255, 0.35)';
    p.style.stroke = '#2b6cff';
    p.style.strokeOpacity = '0.95';
    p.style.strokeWidth = '2';
    return true;
  }

  function renderQuizOptions(options) {
    quizOptionsEl.innerHTML = '';
    options.forEach((name) => {
      const btn = document.createElement('button');
      btn.className = 'secondary';
      btn.type = 'button';
      btn.textContent = name;
      btn.dataset.optionName = name;
      btn.addEventListener('click', () => lockQuizAnswer(name));
      quizOptionsEl.appendChild(btn);
    });
  }

  function setQuizFeedback(text) {
    quizFeedbackEl.textContent = text;
  }

  function setQuizLocked(locked) {
    quizState.locked = locked;
    quizOptionsEl.querySelectorAll('button').forEach((b) => (b.disabled = locked));
  }

  function markAnswerButtons(selected) {
    const correctName = quizState.correctName;
    if (!correctName) return;

    const correctBtn = quizOptionsEl.querySelector(`button[data-option-name="${CSS.escape(correctName)}"]`);
    const selectedBtn = selected
      ? quizOptionsEl.querySelector(`button[data-option-name="${CSS.escape(selected)}"]`)
      : null;

    clearQuizOptionMarks();

    if (selected && selected === correctName) {
      if (selectedBtn) selectedBtn.classList.add('optionCorrect');
      return;
    }

    if (selectedBtn) selectedBtn.classList.add('optionWrong');
    if (correctBtn) correctBtn.classList.add('optionCorrect');
  }

  function finishQuizQuestion(selected) {
    stopQuizProgress();
    setQuizLocked(true);
    quizState.running = false;

    // show right/wrong via button colors
    markAnswerButtons(selected);

    // scoring
    const isCorrect = selected != null && selected === quizState.correctName;
    const delta = isCorrect ? 1 : -1;
    quizState.score = Math.max(0, quizState.score + delta);
    setQuizScoreProgress(quizState.score);

    if (quizState.score >= QUIZ_SCORE_TARGET) {
      quizState.completed = true;
      setQuizFeedback(t('goal.reached', { points: QUIZ_SCORE_TARGET }));
      quizPlayAgainBtn.classList.remove('hidden');
      stopQuizNextTimeout();
      return;
    }

    // auto-next after 3 seconds
    stopQuizNextTimeout();
    quizState.nextTimeoutId = setTimeout(() => {
      if (mode !== 'quiz') return;
      if (!quizState.started) return;
      if (quizState.completed) return;
      startQuizQuestion();
    }, QUIZ_NEXT_DELAY_MS);
  }

  function lockQuizAnswer(selected) {
    if (mode !== 'quiz') return;
    if (!quizState.running) return;
    if (quizState.locked) return;

    finishQuizQuestion(selected);
  }

  function startQuizProgress(durationMs) {
    quizState.progressStart = performance.now();
    quizState.progressDuration = durationMs;
    setQuizProgress01(1);

    stopQuizProgress();
    const tick = (now) => {
      if (!quizState.running) return;
      const elapsed = now - quizState.progressStart;
      const t = 1 - (elapsed / quizState.progressDuration);
      setQuizProgress01(t);
      if (elapsed >= quizState.progressDuration) {
        setQuizProgress01(0);
        // timeout
        finishQuizQuestion(null);
        return;
      }
      quizState.rafId = requestAnimationFrame(tick);
    };
    quizState.rafId = requestAnimationFrame(tick);
  }

  function startQuizQuestion() {
    const svg = mapHost.querySelector('svg');
    if (!svg) return;

    if (quizState.completed) return;

    stopQuizNextTimeout();
    stopQuizProgress();
    clearQuizOptionMarks();
    setQuizFeedback('');

    // вибираємо загадку (без Ceuta/Melilla)
    const pickedId = pickRandomId(QUIZ_TARGET_IDS, svg);

    if (!pickedId) {
      setQuizFeedback(t('quiz.pickFail'));
      quizNextBtn.disabled = false;
      quizNextBtn.textContent = t('btn.tryAgain');
      return;
    }

    const correctName = ID_TO_NAME[pickedId];
    quizState.targetId = pickedId;
    quizState.correctName = correctName;

    applyQuizHighlight(pickedId);

    const distractors = shuffle(REGIONS.filter((n) => n !== correctName)).slice(0, 3);
    const options = shuffle([correctName, ...distractors]);
    renderQuizOptions(options);

    quizState.running = true;
    setQuizLocked(false);

    startQuizProgress(10_000);
  }

  function resetQuiz() {
    stopQuizNextTimeout();
    stopQuizProgress();
    clearQuizHighlight();
    clearQuizOptionMarks();
    quizState.running = false;
    quizState.locked = false;
    quizState.started = false;
    quizState.completed = false;
    quizState.targetId = null;
    quizState.correctName = null;
    quizState.score = 0;
    quizOptionsEl.innerHTML = '';
    setQuizFeedback('');
    setQuizProgress01(1);
    setQuizScoreProgress(0);
    quizNextBtn.disabled = false;
    quizNextBtn.textContent = t('btn.start');
    quizNextBtn.classList.remove('hidden');
    quizPlayAgainBtn.classList.add('hidden');
  }

  // --- Game 3: Hunt on map ---

  function setHuntProgress01(t) {
    const clamped = Math.max(0, Math.min(1, t));
    huntBarFillEl.style.width = `${(clamped * 100).toFixed(2)}%`;
  }

  function setHuntScoreProgress(score) {
    const s = Math.max(0, Math.min(QUIZ_SCORE_TARGET, score));
    const t = QUIZ_SCORE_TARGET > 0 ? (s / QUIZ_SCORE_TARGET) : 0;
    huntScoreBarFillEl.style.width = `${(t * 100).toFixed(2)}%`;
  }

  function setHuntLocked(locked) {
    huntState.locked = locked;
  }

  function stopHuntProgress() {
    if (huntState.rafId != null) {
      cancelAnimationFrame(huntState.rafId);
      huntState.rafId = null;
    }
  }

  function stopHuntNextTimeout() {
    if (huntState.nextTimeoutId != null) {
      clearTimeout(huntState.nextTimeoutId);
      huntState.nextTimeoutId = null;
    }
  }

  function setHuntFeedback(text) {
    huntFeedbackEl.textContent = text;
  }

  function clearHuntHighlights() {
    const svg = mapHost.querySelector('svg');
    if (!svg) return;
    for (const [id, prev] of huntState.highlightPrevById.entries()) {
      const p = svg.querySelector(`#${CSS.escape(id)}`);
      if (!p) continue;
      p.style.fill = prev.fill;
      p.style.stroke = prev.stroke;
      p.style.strokeWidth = prev.strokeWidth;
      p.style.strokeOpacity = prev.strokeOpacity;
    }
    huntState.highlightPrevById.clear();
  }

  function rememberPrevStyle(id, p) {
    if (huntState.highlightPrevById.has(id)) return;
    huntState.highlightPrevById.set(id, {
      fill: p.style.fill,
      stroke: p.style.stroke,
      strokeWidth: p.style.strokeWidth,
      strokeOpacity: p.style.strokeOpacity,
    });
  }

  function colorRegion(id, kind) {
    const svg = mapHost.querySelector('svg');
    if (!svg) return;
    const p = svg.querySelector(`#${CSS.escape(id)}`);
    if (!p) return;

    rememberPrevStyle(id, p);
    if (kind === 'correct') {
      p.style.fill = 'rgba(31, 191, 117, 0.30)';
      p.style.stroke = 'rgba(31, 191, 117, 0.95)';
      p.style.strokeOpacity = '0.95';
      p.style.strokeWidth = '2';
    } else if (kind === 'wrong') {
      p.style.fill = 'rgba(255, 77, 77, 0.22)';
      p.style.stroke = 'rgba(255, 77, 77, 0.95)';
      p.style.strokeOpacity = '0.95';
      p.style.strokeWidth = '2';
    }
  }

  function startHuntProgress(durationMs) {
    huntState.progressStart = performance.now();
    huntState.progressDuration = durationMs;
    setHuntProgress01(1);

    stopHuntProgress();
    const tick = (now) => {
      if (!huntState.running) return;
      const elapsed = now - huntState.progressStart;
      const t = 1 - (elapsed / huntState.progressDuration);
      setHuntProgress01(t);
      if (elapsed >= huntState.progressDuration) {
        setHuntProgress01(0);
        finishHuntQuestion(null);
        return;
      }
      huntState.rafId = requestAnimationFrame(tick);
    };
    huntState.rafId = requestAnimationFrame(tick);
  }

  function finishHuntQuestion(clickedId) {
    stopHuntProgress();
    setHuntLocked(true);
    huntState.running = false;

    const correctId = huntState.targetId;
    if (!correctId) return;

    const isCorrect = clickedId != null && clickedId === correctId;
    if (clickedId != null) {
      colorRegion(clickedId, isCorrect ? 'correct' : 'wrong');
    }
    // always show correct region
    colorRegion(correctId, 'correct');

    const delta = isCorrect ? 1 : -1;
    huntState.score = Math.max(0, huntState.score + delta);
    setHuntScoreProgress(huntState.score);

    if (huntState.score >= QUIZ_SCORE_TARGET) {
      huntState.completed = true;
      setHuntFeedback(t('goal.reached', { points: QUIZ_SCORE_TARGET }));
      huntPlayAgainBtn.classList.remove('hidden');
      stopHuntNextTimeout();
      return;
    }

    stopHuntNextTimeout();
    huntState.nextTimeoutId = setTimeout(() => {
      if (mode !== 'hunt') return;
      if (!huntState.started) return;
      if (huntState.completed) return;
      startHuntQuestion();
    }, QUIZ_NEXT_DELAY_MS);
  }

  function startHuntQuestion() {
    const svg = mapHost.querySelector('svg');
    if (!svg) return;
    if (huntState.completed) return;

    stopHuntNextTimeout();
    stopHuntProgress();
    clearHuntHighlights();
    setHuntFeedback('');

    // Ceuta/Melilla не беруть участі як загадка (але можуть бути “неправильним кліком”)
    const pickedId = pickRandomId(QUIZ_TARGET_IDS, svg);
    if (!pickedId) {
      setHuntFeedback(t('hunt.pickFail'));
      huntStartBtn.classList.remove('hidden');
      huntStartBtn.disabled = false;
      huntStartBtn.textContent = t('btn.tryAgain');
      return;
    }

    huntState.targetId = pickedId;
    huntState.correctName = ID_TO_NAME[pickedId];
    huntTargetNameEl.textContent = huntState.correctName;

    huntState.running = true;
    setHuntLocked(false);
    startHuntProgress(10_000);
  }

  function handleHuntMapClick(clickedId) {
    if (mode !== 'hunt') return;
    if (!huntState.running) return;
    if (huntState.locked) return;
    finishHuntQuestion(clickedId);
  }

  function resetHunt() {
    stopHuntNextTimeout();
    stopHuntProgress();
    clearHuntHighlights();

    huntState.started = false;
    huntState.completed = false;
    huntState.running = false;
    huntState.locked = false;
    huntState.targetId = null;
    huntState.correctName = null;
    huntState.score = 0;

    huntTargetNameEl.textContent = t('common.dash');
    setHuntFeedback('');
    setHuntProgress01(1);
    setHuntScoreProgress(0);

    huntStartBtn.classList.remove('hidden');
    huntStartBtn.disabled = false;
    huntStartBtn.textContent = t('btn.start');
    huntPlayAgainBtn.classList.add('hidden');
  }

  function updateModeUI() {
    const isFill = mode === 'fill';
    const isQuiz = mode === 'quiz';
    const isHunt = mode === 'hunt';

    document.body.dataset.mode = mode;

    fillPanel.classList.toggle('hidden', !isFill);
    quizPanel.classList.toggle('hidden', !isQuiz);
    huntPanel.classList.toggle('hidden', !isHunt);
    statusFillEl.classList.toggle('hidden', !isFill);

    modeFillBtn.classList.toggle('active', isFill);
    modeQuizBtn.classList.toggle('active', isQuiz);
    modeHuntBtn.classList.toggle('active', isHunt);

    if (modeMenuToggleBtn) {
      modeMenuToggleBtn.textContent = isFill
        ? t('mode.toggle', { n: 1 })
        : isQuiz
          ? t('mode.toggle', { n: 2 })
          : t('mode.toggle', { n: 3 });
      modeMenuToggleBtn.setAttribute('aria-expanded', modeMenuEl?.classList.contains('open') ? 'true' : 'false');
    }

    if (isFill) {
      pageTitleEl.textContent = t('pageTitle.fill');
      if (pageSubtitleEl) {
        pageSubtitleEl.textContent = t('subtitle.fill');
      }
    } else if (isQuiz) {
      pageTitleEl.textContent = t('pageTitle.quiz');
      if (pageSubtitleEl) {
        pageSubtitleEl.textContent = t('subtitle.quiz');
      }
    } else {
      pageTitleEl.textContent = t('pageTitle.hunt');
      if (pageSubtitleEl) {
        pageSubtitleEl.textContent = t('subtitle.hunt');
      }
    }
  }

  function closeModeMenu() {
    if (!modeMenuEl) return;
    modeMenuEl.classList.remove('open');
    if (modeMenuToggleBtn) modeMenuToggleBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleModeMenu() {
    if (!modeMenuEl) return;
    const next = !modeMenuEl.classList.contains('open');
    modeMenuEl.classList.toggle('open', next);
    if (modeMenuToggleBtn) modeMenuToggleBtn.setAttribute('aria-expanded', next ? 'true' : 'false');
  }

  function setMode(next) {
    if (mode === next) return;

    if (mode === 'quiz') resetQuiz();
    if (mode === 'hunt') resetHunt();

    mode = next;

    // При зміні режиму завжди очищаємо мапу (заливки/підписи/прогрес заповнення),
    // щоб стани ігор не змішувались.
    resetGame();

    if (mode === 'quiz') resetQuiz();
    if (mode === 'hunt') resetHunt();

    updateModeUI();
    closeModeMenu();
  }

  function fillMapCompletely() {
    const svg = mapHost.querySelector('svg');
    if (!svg) return;

    clearSelectedTile();
    clearLabels(svg);

    const allIds = Object.keys(ID_TO_NAME);
    done = new Set(allIds);

    allIds.forEach((id) => {
      const p = svg.querySelector(`#${CSS.escape(id)}`);
      if (!p) return;
      p.classList.remove('drop-hover');
      p.classList.add('region', 'done');
      p.style.fill = stableColor(ID_TO_NAME[id]);
    });

    // Показуємо підписи так само, як при правильному заповненні в грі 1.
    allIds.forEach((id) => {
      const p = svg.querySelector(`#${CSS.escape(id)}`);
      if (!p) return;
      addLabel(svg, p, ID_TO_NAME[id]);
    });

    // Якщо карта вже повністю заповнена, плитки не потрібні.
    tilesEl.innerHTML = '';
    setStatus();
  }

  // --- Load / reset ---

  async function loadSvg() {
    const res = await fetch('./spain.svg');
    if (!res.ok) throw new Error(t('load.fetchFail', { status: res.status }));
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) throw new Error(t('load.svgMissing'));

    // У spain.svg немає viewBox, тому при видаленні width/height браузер може
    // некоректно масштабувати й «обрізати» низ. Додаємо viewBox з оригінальних розмірів.
    if (svg && !svg.hasAttribute('viewBox')) {
      const w = parseFloat(svg.getAttribute('width') || '0');
      const h = parseFloat(svg.getAttribute('height') || '0');
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    // зробимо SVG адаптивним
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    mapHost.innerHTML = '';
    mapHost.appendChild(svg);

    // Після вставки в DOM можемо точно “піджати” viewBox до реальних контурів.
    // Даємо 1px запас, щоб не підрізати краї через округлення/обводку.
    fitViewBoxToRegions(svg, 1);

    wireDrop(svg);
    resetGame();
    resetQuiz();
    resetHunt();
    updateModeUI();

    // За замовчуванням: відкривається гра 1 з повністю заповненою картою.
    // (Якщо хочеш грати з нуля — натисни "Скинути".)
    if (mode !== 'fill') {
      mode = 'fill';
      updateModeUI();
    }
    fillMapCompletely();
  }

  function resetGame() {
    done = new Set();
    clearSelectedTile();
    setStatus();

    const svg = mapHost.querySelector('svg');
    if (svg) {
      clearLabels(svg);
      Object.keys(ID_TO_NAME).forEach((id) => {
        const p = svg.querySelector(`#${CSS.escape(id)}`);
        if (p) {
          p.classList.remove('done', 'drop-hover');
          p.style.fill = '';
          p.classList.add('region');
        }
      });
    }

    renderTiles(shuffle(REGIONS));
  }

  shuffleBtn.addEventListener('click', () =>
    renderTiles(shuffle([...tilesEl.querySelectorAll('.tile')].map((t) => t.dataset.regionName)))
  );
  resetBtn.addEventListener('click', resetGame);

  if (modeMenuToggleBtn) {
    modeMenuToggleBtn.addEventListener('click', () => toggleModeMenu());
  }

  document.addEventListener('click', (e) => {
    if (!modeMenuEl) return;
    if (!modeMenuEl.classList.contains('open')) return;
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (modeMenuEl.contains(target)) return;
    closeModeMenu();
  });

  if (modeButtonsEl) {
    modeButtonsEl.addEventListener('click', () => {
      // Click on any menu item should collapse the dropdown on mobile.
      closeModeMenu();
    });
  }

  modeFillBtn.addEventListener('click', () => setMode('fill'));
  modeQuizBtn.addEventListener('click', () => setMode('quiz'));
  modeHuntBtn.addEventListener('click', () => setMode('hunt'));

  quizNextBtn.addEventListener('click', () => {
    if (mode !== 'quiz') return;
    if (!quizState.started) {
      quizState.started = true;
      quizNextBtn.classList.add('hidden');
      quizPlayAgainBtn.classList.add('hidden');
      startQuizQuestion();
    }
  });

  quizPlayAgainBtn.addEventListener('click', () => {
    if (mode !== 'quiz') return;
    resetQuiz();
    quizState.started = true;
    quizNextBtn.classList.add('hidden');
    quizPlayAgainBtn.classList.add('hidden');
    startQuizQuestion();
  });

  quizResetBtn.addEventListener('click', () => {
    if (mode !== 'quiz') return;
    resetQuiz();
  });

  huntStartBtn.addEventListener('click', () => {
    if (mode !== 'hunt') return;
    if (!huntState.started) {
      huntState.started = true;
      huntStartBtn.classList.add('hidden');
      huntPlayAgainBtn.classList.add('hidden');
      startHuntQuestion();
    }
  });

  huntPlayAgainBtn.addEventListener('click', () => {
    if (mode !== 'hunt') return;
    resetHunt();
    huntState.started = true;
    huntStartBtn.classList.add('hidden');
    huntPlayAgainBtn.classList.add('hidden');
    startHuntQuestion();
  });

  huntResetBtn.addEventListener('click', () => {
    if (mode !== 'hunt') return;
    resetHunt();
  });

  // --- Language init / selector wiring ---

  const initial = pickInitialLanguage();
  setLanguage(initial.lang, { persist: initial.persist });

  if (langSelectEl) {
    langSelectEl.addEventListener('change', () => {
      setLanguage(langSelectEl.value, { persist: true });
    });
  }

  loadSvg().catch((err) => {
    if (location.protocol === 'file:') {
      mapLoadErrorKind = 'file';
      mapHost.textContent = t('load.error.file');
    } else {
      mapLoadErrorKind = 'other';
      mapHost.textContent = t('load.error.other');
    }
    console.error(err);
  });
})();
