/**
 * Coffee? – popup.js
 * Handles auth (email/password → Supabase JWT) and contact import.
 * Uses raw Supabase REST API so no bundler is needed.
 */

const SUPABASE_URL  = "https://ypyvkqysnowgegcjydnd.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweXZrcXlzbm93Z2VnY2p5ZG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTE0MDksImV4cCI6MjA4MTg2NzQwOX0.TO-MCSk6Mby5fx4pGvgVuHcVHpfSDLiZGjbq61pwUAI";

/* ── Storage helpers ──────────────────────────────────────────────── */

function getSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["coffee_access_token", "coffee_user_email"], (r) => {
      resolve({
        token: r.coffee_access_token || null,
        email: r.coffee_user_email  || null,
      });
    });
  });
}

function saveSession(token, email) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { coffee_access_token: token, coffee_user_email: email },
      resolve
    );
  });
}

function clearSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["coffee_access_token", "coffee_user_email"], resolve);
  });
}

/* ── Supabase API helpers ─────────────────────────────────────────── */

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Sign-in failed");
  return { token: data.access_token, email: data.user?.email };
}

async function supabaseInsertContact(token, contact) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${token}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(contact),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Handle duplicate (unique constraint violation)
    if (res.status === 409 || (err.code === "23505")) {
      throw new Error("A contact with this LinkedIn URL already exists.");
    }
    throw new Error(err.message || err.details || `HTTP ${res.status}`);
  }
}

/* ── DOM refs ─────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

function showView(name) {
  ["login", "not-linkedin", "import"].forEach((v) => {
    $(`view-${v}`).classList.toggle("hidden", v !== name);
  });
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `msg msg-${type}`;
  el.classList.remove("hidden");
}

/* ── Init ─────────────────────────────────────────────────────────── */

(async () => {
  const session = await getSession();

  if (!session.token) {
    // Not logged in → show login
    showView("login");
    return;
  }

  // Logged in — check active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedIn = tab?.url?.includes("linkedin.com/in/");

  if (!isLinkedIn) {
    showView("not-linkedin");
    $("footer-auth").classList.remove("hidden");
    $("footer-email").textContent = session.email || "";
    return;
  }

  // On a LinkedIn profile — scrape and prefill form
  let scraped = null;
  try {
    scraped = await chrome.tabs.sendMessage(tab.id, { type: "GET_PROFILE" });
  } catch (_) {
    // Content script might not be injected yet (page still loading)
    scraped = {};
  }

  showView("import");
  $("footer-auth").classList.remove("hidden");
  $("footer-email").textContent = session.email || "";

  $("f-first").value    = scraped?.firstName    || "";
  $("f-last").value     = scraped?.lastName     || "";
  $("f-title").value    = scraped?.title        || "";
  $("f-company").value  = scraped?.company      || "";
  $("f-email").value    = scraped?.email        || "";
  $("f-linkedin").value = scraped?.linkedInUrl  || "";
})();

/* ── Login ────────────────────────────────────────────────────────── */

$("btn-login").addEventListener("click", async () => {
  const email    = $("login-email").value.trim();
  const password = $("login-password").value;
  const errEl    = $("login-error");
  errEl.classList.add("hidden");

  if (!email || !password) {
    showMsg(errEl, "Please enter your email and password.", "error");
    return;
  }

  const btn = $("btn-login");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing in…';

  try {
    const { token, email: userEmail } = await supabaseSignIn(email, password);
    await saveSession(token, userEmail);
    // Re-init to show the correct view
    btn.disabled = false;
    btn.textContent = "Sign in to Coffee?";
    location.reload();
  } catch (e) {
    showMsg(errEl, e.message, "error");
    btn.disabled = false;
    btn.textContent = "Sign in to Coffee?";
  }
});

$("login-password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-login").click();
});

/* ── Save contact ─────────────────────────────────────────────────── */

$("btn-save")?.addEventListener("click", async () => {
  const session = await getSession();
  const saveMsg  = $("save-msg");
  const spinner  = $("save-spinner");
  const btn      = $("btn-save");

  saveMsg.classList.add("hidden");

  const firstName  = $("f-first").value.trim();
  const lastName   = $("f-last").value.trim();
  const title      = $("f-title").value.trim();
  const company    = $("f-company").value.trim();
  const email      = $("f-email").value.trim() || null;
  const linkedInUrl = $("f-linkedin").value.trim() || null;

  if (!firstName && !lastName) {
    showMsg(saveMsg, "Please enter at least a first or last name.", "error");
    return;
  }
  if (!title && !company) {
    showMsg(saveMsg, "Please enter a title or company.", "error");
    return;
  }

  btn.disabled = true;
  spinner.classList.remove("hidden");

  try {
    await supabaseInsertContact(session.token, {
      first_name:   firstName || null,
      last_name:    lastName  || null,
      title:        title     || null,
      company:      company   || null,
      email:        email,
      linkedin_url: linkedInUrl,
      status:       "to_contact",
    });
    showMsg(saveMsg, `✓ ${firstName} ${lastName} added to Coffee!`.trim(), "success");
    btn.innerHTML = "✓ Added";
    // Disable the button so it can't be double-submitted
    setTimeout(() => { btn.textContent = "Add to Coffee?"; btn.disabled = false; }, 2500);
  } catch (e) {
    showMsg(saveMsg, e.message, "error");
    btn.disabled = false;
    spinner.classList.add("hidden");
  } finally {
    spinner.classList.add("hidden");
  }
});

/* ── Cancel ───────────────────────────────────────────────────────── */

$("btn-cancel")?.addEventListener("click", () => window.close());

/* ── Logout ───────────────────────────────────────────────────────── */

$("btn-logout")?.addEventListener("click", async () => {
  await clearSession();
  location.reload();
});
