/* ==========================================================================
   HISAB — main.js
   Shared behaviour for every page: theme toggle, language toggle,
   mobile nav, toast notifications, session-aware header, auto-logout timer.
   ========================================================================== */

const Hisab = (() => {
  const THEME_KEY = 'hisab_theme';
  const LANG_KEY = 'hisab_lang';
  const SESSION_KEY = 'hisab_session';
  const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes auto-logout

  /* ---------------- Theme ---------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  }

  /* ---------------- Language (English / Nepali) ---------------- */
  const DICTIONARY = {
    en: {
      nav_about: 'About', nav_features: 'Features', nav_contact: 'Contact',
      get_started: 'Get Started', login: 'Log In',
      hero_title: 'Your Smart Finance Companion',
      hero_tagline: 'Empowering Green Business & Personal Finance',
      cta_start: 'Get Started Free',
      cta_demo: 'See How It Works'
    },
    ne: {
      nav_about: 'हाम्रोबारे', nav_features: 'विशेषताहरू', nav_contact: 'सम्पर्क',
      get_started: 'सुरु गर्नुहोस्', login: 'लगइन',
      hero_title: 'तपाईंको स्मार्ट फाइनान्स साथी',
      hero_tagline: 'हरित व्यवसाय र व्यक्तिगत फाइनान्सलाई सशक्त बनाउँदै',
      cta_start: 'नि:शुल्क सुरु गर्नुहोस्',
      cta_demo: 'यो कसरी काम गर्छ हेर्नुहोस्'
    }
  };

  function initLanguage() {
    const saved = localStorage.getItem(LANG_KEY) || 'en';
    applyLanguage(saved);
    document.querySelectorAll('[data-lang-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyLanguage(btn.getAttribute('data-lang-option'));
        document.querySelectorAll('.lang-menu').forEach(m => m.classList.remove('open'));
      });
    });
    const langToggle = document.querySelector('[data-action="toggle-lang-menu"]');
    if (langToggle) {
      langToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelector('.lang-menu')?.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        document.querySelector('.lang-menu')?.classList.remove('open');
      });
    }
  }

  function applyLanguage(lang) {
    localStorage.setItem(LANG_KEY, lang);
    const dict = DICTIONARY[lang] || DICTIONARY.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.documentElement.setAttribute('lang', lang);
    const label = document.querySelector('[data-lang-label]');
    if (label) label.textContent = lang === 'ne' ? 'ने' : 'EN';
  }

  /* ---------------- Mobile nav ---------------- */
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  function initSidebarToggle() {
    const toggle = document.querySelector('[data-action="toggle-sidebar"]');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  /* ---------------- Toasts ---------------- */
  function toast(message, type = 'info', duration = 3800) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  /* ---------------- Session helpers (demo/local, mirrors backend contract) --- */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function requireAuth(expectedType) {
    const session = getSession();
    if (!session || !session.token) {
      window.location.href = 'login.html';
      return null;
    }
    if (expectedType && session.userType !== expectedType) {
      window.location.href = session.userType === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
      return null;
    }
    return session;
  }

  function redirectIfAuthenticated() {
    const session = getSession();
    if (session && session.token) {
      window.location.href = session.userType === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
    }
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  /* ---------------- Auto-logout on inactivity ---------------- */
  function initInactivityLogout() {
    if (!document.body.hasAttribute('data-protected')) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast('Session expired due to inactivity. Please log in again.', 'warning');
        setTimeout(logout, 1200);
      }, INACTIVITY_LIMIT_MS);
    };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, reset, { passive: true })
    );
    reset();
  }

  /* ---------------- Populate header user info if logged in ---------------- */
  function initAuthAwareHeader() {
    const session = getSession();
    const cta = document.querySelector('[data-header-cta]');
    if (session && session.token && cta) {
      cta.textContent = 'Dashboard';
      cta.href = session.userType === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
    }
  }

  function currency(amount) {
    const n = Number(amount) || 0;
    return 'NRs ' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function init() {
    initTheme();
    initLanguage();
    initMobileNav();
    initSidebarToggle();
    initAuthAwareHeader();
    initInactivityLogout();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    toast, getSession, setSession, clearSession, requireAuth,
    redirectIfAuthenticated, logout, currency, applyLanguage
  };
})();
