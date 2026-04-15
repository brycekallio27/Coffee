/**
 * Coffee? LinkedIn Scraper – content.js
 * Runs on https://www.linkedin.com/in/* pages.
 * Responds to GET_PROFILE messages from the popup.
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PROFILE") {
    sendResponse(scrapeProfile());
  }
});

function scrapeProfile() {
  const url = window.location.href.split("?")[0].replace(/\/$/, "");

  /* ── Name ─────────────────────────────────────────────────────── */
  const nameEl =
    document.querySelector("h1.text-heading-xlarge") ||
    document.querySelector("h1");
  const fullName = (nameEl?.innerText || "").trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  /* ── Headline (raw) ───────────────────────────────────────────── */
  // LinkedIn renders headline in a sibling div just after the h1 block
  const headlineEl =
    document.querySelector(".text-body-medium.break-words") ||
    document.querySelector('[data-generated-suggestion-target] ~ div .text-body-medium');
  const headline = (headlineEl?.innerText || "").trim();

  /* ── Parse title & company from headline ─────────────────────── */
  // Common patterns: "Software Engineer at Acme" | "CEO | Acme" | "Engineer, Acme"
  let title = headline;
  let company = "";

  if (headline.includes(" at ")) {
    const idx = headline.indexOf(" at ");
    title = headline.slice(0, idx).trim();
    company = headline.slice(idx + 4).trim();
  } else if (headline.includes(" | ")) {
    const parts = headline.split(" | ");
    title = parts[0].trim();
    company = parts[1]?.trim() || "";
  }

  /* ── Company from experience section (more reliable) ─────────── */
  // Try the first bold company name in the experience section
  const expSection = document.querySelector("#experience");
  if (expSection) {
    // Walk up to the section wrapper, then find the first company span
    const parent = expSection.closest("section") || expSection.parentElement;
    const companySpan = parent?.querySelector(
      ".pvs-list__item--line-separated span[aria-hidden='true']"
    );
    if (companySpan?.innerText?.trim()) {
      company = companySpan.innerText.trim();
    }
  }

  /* ── Email ────────────────────────────────────────────────────── */
  // Only visible if the "Contact info" section is already expanded on the page
  const emailAnchor = document.querySelector('a[href^="mailto:"]');
  const email = emailAnchor
    ? emailAnchor.href.replace("mailto:", "").trim()
    : "";

  /* ── LinkedIn URL ─────────────────────────────────────────────── */
  // Normalise to just the /in/handle path (strip query params & trailing slash)
  const linkedInUrl = url.startsWith("https://www.linkedin.com/in/")
    ? url
    : window.location.origin + window.location.pathname;

  return {
    firstName,
    lastName,
    fullName,
    title,
    company,
    email,
    linkedInUrl,
    headline,
  };
}
