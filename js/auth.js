/* ==========================================================================
   HISAB — auth.js
   Login / Register / OTP verification.
   Talks to the Flask backend (backend/routes.py) at API_BASE. If the
   backend is unreachable, falls back to a local "demo mode" backed by
   localStorage so the whole flow is still demoable offline / statically.
   ========================================================================== */

const API_BASE = window.HISAB_API_BASE || 'http://localhost:5000/api';
const DEMO_USERS_KEY = 'hisab_demo_users';
const DEMO_OTP_KEY = 'hisab_demo_pending_otp';

let demoModeNotified = false;
function notifyDemoMode() {
  if (demoModeNotified) return;
  demoModeNotified = true;
  Hisab.toast('Backend not reachable — running in demo mode (data stored locally).', 'warning', 5000);
}

/* ---------------- tiny fetch wrapper with demo fallback ---------------- */
async function apiCall(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { handled: true, message: data.message || 'Request failed', status: res.status };
    return data;
  } catch (err) {
    if (err && err.handled) throw err;
    notifyDemoMode();
    return demoBackend(path, options);
  }
}

/* ---------------- Demo / offline backend (localStorage) ---------------- */
function getDemoUsers() {
  try { return JSON.parse(localStorage.getItem(DEMO_USERS_KEY)) || []; } catch { return []; }
}
function saveDemoUsers(users) { localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users)); }
function genOtp() { return String(Math.floor(1000 + Math.random() * 9000)); }
function fakeToken(email) { return btoa(`${email}:${Date.now()}:${Math.random().toString(36).slice(2)}`); }

function demoBackend(path, options) {
  const body = options.body ? JSON.parse(options.body) : {};
  const users = getDemoUsers();

  if (path === '/auth/register') {
    if (users.some(u => u.email === body.email)) {
      throw { handled: true, message: 'This email is already registered.' };
    }
    const otp = genOtp();
    localStorage.setItem(DEMO_OTP_KEY, JSON.stringify({ email: body.email, otp, payload: body, purpose: 'register' }));
    console.info(`%c[HISAB DEMO] OTP for ${body.email}: ${otp}`, 'color:#27AE60;font-weight:bold;');
    Hisab.toast(`Demo OTP for ${body.email}: ${otp}`, 'info', 8000);
    return { message: 'OTP sent', demo: true };
  }

  if (path === '/auth/resend-otp') {
    const pending = JSON.parse(localStorage.getItem(DEMO_OTP_KEY) || 'null');
    const otp = genOtp();
    if (pending) { pending.otp = otp; localStorage.setItem(DEMO_OTP_KEY, JSON.stringify(pending)); }
    console.info(`%c[HISAB DEMO] New OTP: ${otp}`, 'color:#27AE60;font-weight:bold;');
    Hisab.toast(`Demo OTP resent: ${otp}`, 'info', 8000);
    return { message: 'OTP resent', demo: true };
  }

  if (path === '/auth/verify-otp') {
    const pending = JSON.parse(localStorage.getItem(DEMO_OTP_KEY) || 'null');
    if (!pending || pending.otp !== body.otp) {
      throw { handled: true, message: 'Invalid or expired OTP.' };
    }
    const payload = pending.payload;
    const userType = payload.user_type || payload.userType;
    const user = {
      email: payload.email,
      password: payload.password,
      user_type: userType,
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
      business_name: payload.business_name || '',
      pan_number: payload.pan_number || '',
      phone_number: payload.phone_number || '',
      created_at: new Date().toISOString()
    };
    saveDemoUsers([...users, user]);
    localStorage.removeItem(DEMO_OTP_KEY);
    return {
      message: 'Account verified',
      token: fakeToken(user.email),
      user_type: user.user_type,
      first_name: user.first_name,
      business_name: user.business_name,
      email: user.email,
      demo: true
    };
  }

  if (path === '/auth/login') {
    const user = users.find(u => u.email === body.email && u.password === body.password);
    if (!user) throw { handled: true, message: 'Invalid email or password.' };
    return {
      message: 'Login successful',
      token: fakeToken(user.email),
      user_type: user.user_type,
      first_name: user.first_name,
      business_name: user.business_name,
      email: user.email,
      demo: true
    };
  }

  if (path === '/auth/forgot-password') {
    return { message: 'If this email exists, a reset link has been sent.', demo: true };
  }

  throw { handled: true, message: 'Unknown demo endpoint' };
}

/* ---------------- UI helpers ---------------- */
function setFieldError(inputEl, hasError) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.toggle('has-error', hasError);
}

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isStrongEnough(v) { return v.length >= 8 && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v); }

function bindPasswordToggle() {
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-toggle-for'));
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = `<i class="fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    });
  });
}

function bindPasswordStrength() {
  document.querySelectorAll('input[type="password"][id$="-password"]').forEach(input => {
    if (input.id.includes('confirm')) return;
    const bar = input.closest('.form-group')?.querySelector('.password-strength span');
    if (!bar) return;
    input.addEventListener('input', () => {
      const v = input.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      const pct = (score / 4) * 100;
      bar.style.width = pct + '%';
      bar.style.background = score <= 1 ? '#e74c3c' : score === 2 ? '#F39C12' : '#27AE60';
    });
  });
}

function bindTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.getAttribute('data-tab')}`).classList.add('active');
    });
  });
}

/* ---------------- OTP modal ---------------- */
let otpContext = null; // { email, mode: 'login' | 'register' }

function openOtpModal(email) {
  const modal = document.getElementById('otp-modal');
  if (!modal) return;
  document.getElementById('otp-email-display').textContent = email;
  modal.classList.remove('hidden');
  const boxes = modal.querySelectorAll('.otp-box');
  boxes.forEach(b => (b.value = ''));
  boxes[0]?.focus();
  startOtpCountdown();
}

function closeOtpModal() {
  document.getElementById('otp-modal')?.classList.add('hidden');
}

function bindOtpBoxes() {
  const boxes = document.querySelectorAll('.otp-box');
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '');
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
    });
  });
}

let otpTimer = null;
function startOtpCountdown() {
  clearInterval(otpTimer);
  let seconds = 60;
  const countEl = document.getElementById('otp-countdown');
  const resendBtn = document.getElementById('resend-otp-btn');
  resendBtn.disabled = true;
  countEl.textContent = seconds;
  otpTimer = setInterval(() => {
    seconds--;
    countEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(otpTimer);
      resendBtn.disabled = false;
      countEl.parentElement.firstChild.textContent = 'You can now ';
    }
  }, 1000);
}

function handleAuthSuccess(data) {
  Hisab.setSession({
    token: data.token,
    userType: data.user_type,
    firstName: data.first_name || '',
    businessName: data.business_name || '',
    email: data.email
  });
  Hisab.toast('Welcome to HISAB!', 'success', 2000);
  setTimeout(() => {
    window.location.href = data.user_type === 'business' ? 'business-dashboard.html' : 'personal-dashboard.html';
  }, 700);
}

/* ---------------- Page wiring ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  Hisab.redirectIfAuthenticated();
  bindPasswordToggle();
  bindPasswordStrength();
  bindTabs();
  bindOtpBoxes();

  document.querySelector('[data-action="close-otp"]')?.addEventListener('click', closeOtpModal);

  /* ---- Login form ---- */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email');
      const password = document.getElementById('login-password');
      let valid = true;
      if (!isValidEmail(email.value)) { setFieldError(email, true); valid = false; } else setFieldError(email, false);
      if (!password.value) { setFieldError(password, true); valid = false; } else setFieldError(password, false);
      if (!valid) return;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const data = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.value, password: password.value }) });
        handleAuthSuccess(data);
      } catch (err) {
        Hisab.toast(err.message || 'Login failed. Please check your credentials.', 'error');
        submitBtn.disabled = false;
      }
    });
  }

  document.getElementById('forgot-password-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter your account email to receive a password reset link:');
    if (!email) return;
    try {
      await apiCall('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      Hisab.toast('If that email exists, a reset link has been sent.', 'success');
    } catch (err) {
      Hisab.toast(err.message || 'Something went wrong.', 'error');
    }
  });

  document.getElementById('google-login-btn')?.addEventListener('click', () => {
    Hisab.toast('Google Sign-In requires backend OAuth credentials (see .env.example). Redirecting to registration…', 'info', 4000);
    setTimeout(() => (window.location.href = 'register.html'), 1500);
  });

  /* ---- Personal registration ---- */
  const personalForm = document.getElementById('personal-register-form');
  if (personalForm) {
    personalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const first = document.getElementById('p-first-name');
      const last = document.getElementById('p-last-name');
      const email = document.getElementById('p-email');
      const pass = document.getElementById('p-password');
      const confirm = document.getElementById('p-confirm-password');
      const consent = document.getElementById('p-consent');

      let valid = true;
      if (!isValidEmail(email.value)) { setFieldError(email, true); valid = false; } else setFieldError(email, false);
      if (!isStrongEnough(pass.value)) { Hisab.toast('Password must be 8+ chars with a number and special character.', 'error'); valid = false; }
      if (pass.value !== confirm.value) { setFieldError(confirm, true); valid = false; } else setFieldError(confirm, false);
      if (!consent.checked) { Hisab.toast('Please accept the privacy policy to continue.', 'error'); valid = false; }
      if (!valid) return;

      try {
        await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            user_type: 'personal',
            first_name: first.value, last_name: last.value,
            email: email.value, password: pass.value
          })
        });
        otpContext = { email: email.value, mode: 'register' };
        openOtpModal(email.value);
      } catch (err) {
        setFieldError(email, true);
        Hisab.toast(err.message || 'Registration failed.', 'error');
      }
    });
  }

  /* ---- Business registration ---- */
  const businessForm = document.getElementById('business-register-form');
  if (businessForm) {
    businessForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('b-business-name');
      const pan = document.getElementById('b-pan');
      const phone = document.getElementById('b-phone');
      const email = document.getElementById('b-email');
      const pass = document.getElementById('b-password');
      const confirm = document.getElementById('b-confirm-password');
      const consent = document.getElementById('b-consent');

      let valid = true;
      if (!isValidEmail(email.value)) { setFieldError(email, true); valid = false; } else setFieldError(email, false);
      if (!isStrongEnough(pass.value)) { Hisab.toast('Password must be 8+ chars with a number and special character.', 'error'); valid = false; }
      if (pass.value !== confirm.value) { setFieldError(confirm, true); valid = false; } else setFieldError(confirm, false);
      if (!consent.checked) { Hisab.toast('Please accept the privacy policy to continue.', 'error'); valid = false; }
      if (!valid) return;

      try {
        await apiCall('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            user_type: 'business',
            business_name: name.value, pan_number: pan.value, phone_number: phone.value,
            email: email.value, password: pass.value
          })
        });
        otpContext = { email: email.value, mode: 'register' };
        openOtpModal(email.value);
      } catch (err) {
        setFieldError(email, true);
        Hisab.toast(err.message || 'Registration failed.', 'error');
      }
    });
  }

  /* ---- OTP verify / resend ---- */
  const otpForm = document.getElementById('otp-form');
  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const boxes = document.querySelectorAll('.otp-box');
      const otp = Array.from(boxes).map(b => b.value).join('');
      if (otp.length !== 4) { Hisab.toast('Enter the full 4-digit code.', 'error'); return; }
      try {
        const data = await apiCall('/auth/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ email: otpContext?.email, otp })
        });
        clearInterval(otpTimer);
        closeOtpModal();
        handleAuthSuccess(data);
      } catch (err) {
        Hisab.toast(err.message || 'Invalid OTP. Please try again.', 'error');
      }
    });
  }

  document.getElementById('resend-otp-btn')?.addEventListener('click', async () => {
    try {
      await apiCall('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email: otpContext?.email }) });
      Hisab.toast('A new code has been sent.', 'success');
      startOtpCountdown();
    } catch (err) {
      Hisab.toast(err.message || 'Could not resend OTP.', 'error');
    }
  });
});
