/**
 * EN | PL LANGUAGE SWITCH
 * ----------------------------------------------------
 * All interface texts in one place. Elements in index.html carry
 *   data-i18n="key"                  -> textContent
 *   data-i18n-attr="attr:key;attr:key" -> attributes (placeholder, aria-label, title, content)
 * app.js uses I18N.t(key, vars) for texts it builds itself and re-renders on the "langchange" event.
 * Work names and descriptions (data/works.js) stay in English.
 *
 * Language choice: ?lang=pl / ?lang=en in the URL, then the saved choice, then the browser language.
 */
(function () {
  'use strict';

  const STRINGS = {
    en: {
      'meta.title': 'Egor Baklykov | Technical 3D Animation & Product Visualization for Industry',
      'meta.description': 'Technical 3D animation and product visualization for industrial, robotics and tech companies. From CAD to final film. 15+ years, 250+ projects, clients including ABB and AMD. Based in Poznań, Poland.',
      'lang.group': 'Language',
      'lang.en': 'English',
      'lang.pl': 'Polski',
      'skip': 'Skip to work',
      'brand.subtitle': 'Technical 3D Animation & Product Visualization',
      'nav.label': 'Main navigation',
      'nav.work': 'Work',
      'nav.about': 'About',
      'nav.contact': 'Contact',
      'nav.ai': 'AI Production',
      'nav.aiTitle': 'Open my AI production portfolio',
      'hero.kicker.role': 'Technical 3D Artist',
      'hero.kicker.place': 'Poznań, PL',
      'hero.title': 'Show how your product works.',
      'hero.text': 'Technical 3D animation and product visualization for industrial, robotics and tech companies. From your CAD files to a film your customers understand in seconds.',
      'hero.proof': '15+ years · 250+ projects · ABB, AMD, Rockwool',
      'hero.viewWork': 'View work',
      'hero.sendCad': 'Send your CAD file',
      'search.placeholder': 'Search projects, tools...',
      'search.label': 'Search portfolio',
      'search.clear': 'Clear search',
      'sort.label': 'Sort works',
      'sort.default': 'Default Order',
      'sort.nameAsc': 'Name (A → Z)',
      'sort.nameDesc': 'Name (Z → A)',
      'sort.category': 'Category',
      'sort.newest': 'Newest Year',
      'sort.oldest': 'Oldest Year',
      'filters': 'Filters',
      'filters.count': 'Filters · {n}',
      'filters.reset': 'Reset',
      'filters.show': { one: 'Show {n} work', other: 'Show {n} works' },
      'filters.remove': 'Remove filter {label}',
      'filters.close': 'Close filters',
      'filters.industry': 'Industry:',
      'filters.category': 'Category:',
      'filters.dcc': 'DCC:',
      'filters.renderer': 'Renderer:',
      'filters.more': 'Software & renderer',
      'filters.moreCount': 'Software & renderer · {n}',
      'filters.all': 'All',
      'filters.projects': 'Projects',
      'works.count': { one: '{n} work', other: '{n} works' },
      'works.countOf': '{n} / {total} works',
      'works.heading': 'Selected work',
      'industry.Industrial machinery': 'Industrial machinery',
      'industry.Consumer products': 'Consumer products',
      'industry.Exploded views & internals': 'Exploded views & internals',
      'industry.Architecture': 'Architecture',
      'industry.Personal': 'Personal',
      'category.Archviz': 'Archviz',
      'category.Product': 'Product',
      'category.Hard Surface': 'Hard Surface',
      'category.Concept Art': 'Concept Art',
      'category.Automotive': 'Automotive',
      'card.project': ', project with {n} items',
      'card.video': ', video',
      'badge.project': 'Project · {n}',
      'project.badge': 'Project',
      'project.items': { one: '{n} item', other: '{n} items' },
      'project.back': 'All works',
      'project.backTitle': 'Back to all works (Esc)',
      'empty.title': 'No matching works found',
      'empty.text': 'Try other search words, pick another industry, or reset the filters.',
      'empty.reset': 'Reset filters',
      'personal.title': 'Personal & concept',
      'personal.lede': 'Concept art, R&D and experiments.',
      'services.kicker': 'Services',
      'services.title': 'What I make',
      'services.1.title': 'Product & technical animation',
      'services.1.text': 'Assembly, disassembly, mechanisms in motion, camera flythroughs. From CAD to final edit.',
      'services.2.title': 'Exploded views & internals',
      'services.2.text': 'Show what is inside a machine or device, part by part, with engineering accuracy.',
      'services.3.title': 'Product stills for web, print and trade shows',
      'services.3.text': 'Studio and in-context renders that match your brand.',
      'services.4.title': 'Training & workshops',
      'services.4.text': 'Blender and 3D visualization workshops for marketing and engineering teams, in English, Polish or Russian.',
      'about.kicker': 'About',
      'about.p1': "I'm Egor, a 3D artist with a background in radio electronics. I read CAD files and technical drawings the way engineers do, so I can show complex machinery accurately, not just attractively.",
      'about.p2': 'For 15+ years I have created product and technical animations for clients such as ABB (200+ animations of industrial robots and electrification systems), AMD and Rockwool. I handle the full pipeline myself, from storyboard and CAD cleanup to animation, VFX and final edit, and I write Python tools that automate the repetitive parts.',
      'about.p3': 'Based in Poznań, Poland. Working in English, Polish and Russian. Open to full-time roles and freelance projects.',
      'contact.kicker': 'Contact',
      'ba.before': 'Before',
      'ba.after': 'After',
      'ba.label': 'Before and after: move the pointer, drag, or use the arrow keys',
      'ba.caption': 'Mayekawa compressor turntable: clay model (before) and final render (after)',
      'contact.title': 'Have a product to show?',
      'contact.copied': 'Email address copied to clipboard',
      'contact.copyManual': 'Email address: {email}',
      'contact.text': "Send me your CAD files, drawings or even photos, and a few words about where the visuals will be used. I'll reply within 2 business days with questions and a rough estimate.",
      'footer.title': 'Egor Baklykov · Technical 3D Animation & Product Visualization · Poznań, Poland',
      'lightbox.close': 'Close',
      'lightbox.prev': 'Previous work',
      'lightbox.next': 'Next work',
      'lightbox.zoomHint': 'Scroll wheel to zoom, drag to pan',
      'lightbox.zoomIn': 'Zoom in (+)',
      'lightbox.zoomOut': 'Zoom out (-)',
      'lightbox.zoomReset': 'Reset zoom (0)',
      'lightbox.dcc': 'DCC Tools',
      'lightbox.renderer': 'Render Engine',
      'lightbox.category': 'Category',
      'lightbox.year': 'Year',
      'lightbox.noDesc': 'No description provided.',
      'lightbox.projectSuffix': ' (Project · {n})',
      'lightbox.seeProject': { one: 'See the whole project ({n} item)', other: 'See the whole project ({n} items)' },
      'lightbox.backToAll': 'Back to all works',
      'lightbox.inProject': 'Project: {name}',
      'backToTop': 'Back to top'
    },

    pl: {
      'meta.title': 'Egor Baklykov | Animacje techniczne 3D i wizualizacje produktów dla przemysłu',
      'meta.description': 'Animacje techniczne 3D i wizualizacje produktów dla firm przemysłowych, robotycznych i technologicznych. Od plików CAD do gotowego filmu. Ponad 15 lat doświadczenia, ponad 250 projektów, klienci m.in. ABB i AMD. Poznań.',
      'lang.group': 'Język',
      'lang.en': 'English',
      'lang.pl': 'Polski',
      'skip': 'Przejdź do realizacji',
      'brand.subtitle': 'Animacje techniczne 3D i wizualizacje produktów',
      'nav.label': 'Główna nawigacja',
      'nav.work': 'Realizacje',
      'nav.about': 'O mnie',
      'nav.contact': 'Kontakt',
      'nav.ai': 'Produkcja AI',
      'nav.aiTitle': 'Otwórz moje portfolio produkcji AI',
      'hero.kicker.role': 'Grafik 3D, wizualizacje techniczne',
      'hero.kicker.place': 'Poznań',
      'hero.title': 'Pokaż, jak działa Twój produkt.',
      'hero.text': 'Animacje techniczne 3D i wizualizacje produktów dla firm przemysłowych, robotycznych i technologicznych. Od Twoich plików CAD do filmu, który klienci zrozumieją w kilka sekund.',
      'hero.proof': '15+ lat · 250+ projektów · ABB, AMD, Rockwool',
      'hero.viewWork': 'Zobacz realizacje',
      'hero.sendCad': 'Wyślij plik CAD',
      'search.placeholder': 'Szukaj projektów, programów...',
      'search.label': 'Szukaj w portfolio',
      'search.clear': 'Wyczyść wyszukiwanie',
      'sort.label': 'Sortuj prace',
      'sort.default': 'Domyślna kolejność',
      'sort.nameAsc': 'Nazwa (A → Z)',
      'sort.nameDesc': 'Nazwa (Z → A)',
      'sort.category': 'Kategoria',
      'sort.newest': 'Od najnowszych',
      'sort.oldest': 'Od najstarszych',
      'filters': 'Filtry',
      'filters.count': 'Filtry · {n}',
      'filters.reset': 'Wyczyść',
      'filters.show': { one: 'Pokaż {n} pracę', few: 'Pokaż {n} prace', many: 'Pokaż {n} prac' },
      'filters.remove': 'Usuń filtr {label}',
      'filters.close': 'Zamknij filtry',
      'filters.industry': 'Branża:',
      'filters.category': 'Kategoria:',
      'filters.dcc': 'Program:',
      'filters.renderer': 'Renderer:',
      'filters.more': 'Programy i renderery',
      'filters.moreCount': 'Programy i renderery · {n}',
      'filters.all': 'Wszystkie',
      'filters.projects': 'Projekty',
      'works.count': { one: '{n} praca', few: '{n} prace', many: '{n} prac' },
      'works.countOf': '{n} / {total} prac',
      'works.heading': 'Wybrane realizacje',
      'industry.Industrial machinery': 'Maszyny przemysłowe',
      'industry.Consumer products': 'Produkty konsumenckie',
      'industry.Exploded views & internals': 'Widoki rozstrzelone i wnętrza',
      'industry.Architecture': 'Architektura',
      'industry.Personal': 'Projekty własne',
      'category.Archviz': 'Architektura',
      'category.Product': 'Produkt',
      'category.Hard Surface': 'Hard surface',
      'category.Concept Art': 'Concept art',
      'category.Automotive': 'Motoryzacja',
      'card.project': ', projekt, elementy: {n}',
      'card.video': ', wideo',
      'badge.project': 'Projekt · {n}',
      'project.badge': 'Projekt',
      'project.items': { one: '{n} element', few: '{n} elementy', many: '{n} elementów' },
      'project.back': 'Wszystkie prace',
      'project.backTitle': 'Wróć do wszystkich prac (Esc)',
      'empty.title': 'Nie znaleziono pasujących prac',
      'empty.text': 'Spróbuj innych słów, wybierz inną branżę albo wyczyść filtry.',
      'empty.reset': 'Wyczyść filtry',
      'personal.title': 'Projekty własne i koncepcyjne',
      'personal.lede': 'Concept art, prace badawczo-rozwojowe i eksperymenty.',
      'services.kicker': 'Usługi',
      'services.title': 'Co robię',
      'services.1.title': 'Animacje produktowe i techniczne',
      'services.1.text': 'Montaż i demontaż, mechanizmy w ruchu, przeloty kamery. Od pliku CAD do finalnego montażu.',
      'services.2.title': 'Widoki rozstrzelone i wnętrza urządzeń',
      'services.2.text': 'Pokazuję, co kryje się w maszynie lub urządzeniu, część po części, z inżynierską dokładnością.',
      'services.3.title': 'Wizualizacje produktów na stronę, do druku i na targi',
      'services.3.text': 'Rendery studyjne i w otoczeniu, dopasowane do Twojej marki.',
      'services.4.title': 'Szkolenia i warsztaty',
      'services.4.text': 'Warsztaty z Blendera i wizualizacji 3D dla zespołów marketingu i inżynierii, po angielsku, polsku lub rosyjsku.',
      'about.kicker': 'O mnie',
      'about.p1': 'Jestem Egor, grafik 3D z wykształceniem w zakresie radioelektroniki. Czytam pliki CAD i rysunki techniczne tak jak inżynierowie, dlatego pokazuję złożone maszyny wiernie, a nie tylko efektownie.',
      'about.p2': 'Od ponad 15 lat tworzę animacje produktowe i techniczne dla klientów takich jak ABB (ponad 200 animacji robotów przemysłowych i systemów elektroenergetycznych), AMD i Rockwool. Cały proces prowadzę samodzielnie: od storyboardu i przygotowania modeli CAD po animację, VFX i finalny montaż. Powtarzalne etapy automatyzuję własnymi narzędziami w Pythonie.',
      'about.p3': 'Mieszkam w Poznaniu. Pracuję po angielsku, polsku i rosyjsku. Jestem otwarty na pracę na etacie i projekty freelance.',
      'contact.kicker': 'Kontakt',
      'ba.before': 'Przed',
      'ba.after': 'Po',
      'ba.label': 'Przed i po: przesuń kursor, przeciągnij albo użyj strzałek',
      'ba.caption': 'Sprężarka Mayekawa na obrotnicy: model roboczy (przed) i finalny render (po)',
      'contact.title': 'Masz produkt do pokazania?',
      'contact.copied': 'Adres e-mail skopiowany do schowka',
      'contact.copyManual': 'Adres e-mail: {email}',
      'contact.text': 'Wyślij mi pliki CAD, rysunki, a nawet zdjęcia, i napisz kilka słów o tym, gdzie wizualizacje będą używane. Odpowiem w ciągu 2 dni roboczych z pytaniami i wstępną wyceną.',
      'footer.title': 'Egor Baklykov · Animacje techniczne 3D i wizualizacje produktów · Poznań',
      'lightbox.close': 'Zamknij',
      'lightbox.prev': 'Poprzednia praca',
      'lightbox.next': 'Następna praca',
      'lightbox.zoomHint': 'Kółko myszy: powiększenie, przeciąganie: przesuwanie',
      'lightbox.zoomIn': 'Powiększ (+)',
      'lightbox.zoomOut': 'Pomniejsz (-)',
      'lightbox.zoomReset': 'Resetuj powiększenie (0)',
      'lightbox.dcc': 'Program',
      'lightbox.renderer': 'Silnik renderujący',
      'lightbox.category': 'Kategoria',
      'lightbox.year': 'Rok',
      'lightbox.noDesc': 'Brak opisu.',
      'lightbox.projectSuffix': ' (Projekt · {n})',
      'lightbox.seeProject': 'Zobacz cały projekt ({n})',
      'lightbox.backToAll': 'Wróć do wszystkich prac',
      'lightbox.inProject': 'Projekt: {name}',
      'backToTop': 'Do góry'
    }
  };

  const LANGS = ['en', 'pl'];
  const STORE_KEY = 'portfolio_lang';

  function initialLang() {
    try {
      const fromUrl = new URLSearchParams(location.search).get('lang');
      if (LANGS.includes(fromUrl)) return fromUrl;
    } catch (e) {}
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (LANGS.includes(saved)) return saved;
    } catch (e) {}
    const browser = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^pl\b/i.test(browser) ? 'pl' : 'en';
  }

  let lang = initialLang();

  // Plural category: English one/other; Polish one / few (2-4, not 12-14) / many
  function pluralKey(n) {
    if (lang === 'pl') {
      if (n === 1) return 'one';
      const d = n % 10, h = n % 100;
      return d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'few' : 'many';
    }
    return n === 1 ? 'one' : 'other';
  }

  function t(key, vars) {
    let value = (STRINGS[lang] && STRINGS[lang][key]);
    if (value === undefined) value = STRINGS.en[key];
    if (value === undefined) return key;
    if (typeof value === 'object') {
      const n = vars && typeof vars.n === 'number' ? vars.n : 0;
      value = value[pluralKey(n)] || value.other || value.many || Object.values(value)[0];
    }
    return vars ? value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : value;
  }

  // Data values shown in the UI (industries, categories): translated label, falling back to the value itself
  function label(prefix, value) {
    const key = `${prefix}.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    scope.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
    if (!root) {
      document.documentElement.classList.remove('i18n-pending');
      document.documentElement.lang = lang;
      document.title = t('meta.title');
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', t('meta.description'));
      document.querySelectorAll('[data-lang]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
    }
  }

  function setLang(next, remember = true) {
    if (!LANGS.includes(next)) return;
    lang = next;
    if (remember) {
      try { localStorage.setItem(STORE_KEY, next); } catch (e) {}
    }
    // Keep the address shareable: ?lang=pl for Polish, nothing for English (hash such as #project=... is kept)
    try {
      const url = new URL(location.href);
      if (next === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', next);
      history.replaceState(history.state, '', url);
    } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
  }

  window.I18N = {
    t: t,
    label: label,
    apply: apply,
    setLang: setLang,
    get lang() { return lang; }
  };

  // This script sits at the end of <body>: translate right away, before the first paint,
  // so Polish visitors never see the English text jump (layout shift)
  function start() {
    document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
    apply();
  }
  if (document.readyState === 'loading' && !document.querySelector('[data-lang]')) {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
