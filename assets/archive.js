const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".overlay");
const siteHeader = document.querySelector(".site-header");
const backToTopButton = document.querySelector("[data-sidebar-back-to-top]");
const mainBackToTopButton = document.querySelector("[data-main-back-to-top]");

function syncHeaderHeight() {
  if (!siteHeader) return;
  document.body.style.setProperty("--site-header-height", `${siteHeader.offsetHeight}px`);
}

syncHeaderHeight();

if (siteHeader && "ResizeObserver" in window) {
  new ResizeObserver(syncHeaderHeight).observe(siteHeader);
} else {
  window.addEventListener("resize", syncHeaderHeight);
}

function setMenu(open) {
  sidebar?.classList.toggle("open", open);
  overlay?.classList.toggle("open", open);
  document.body.classList.toggle("sidebar-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
}

toggle?.addEventListener("click", () => {
  setMenu(!sidebar?.classList.contains("open"));
});

overlay?.addEventListener("click", () => setMenu(false));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

const activeSidebarLink = document.querySelector(".sidebar nav a.active");

if (activeSidebarLink && window.matchMedia("(min-width: 70rem)").matches) {
  activeSidebarLink.scrollIntoView({ block: "center" });
}

backToTopButton?.addEventListener("click", () => {
  sidebar?.scrollTo({ top: 0, behavior: "smooth" });
});

mainBackToTopButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const searchForm = document.querySelector("[data-search-form]");
const searchInput = searchForm?.querySelector('input[name="q"]') ?? null;
const searchViewInputs = searchForm ? [...searchForm.querySelectorAll('input[name="view"]')] : [];
const searchResults = searchForm?.querySelector("[data-search-results]") ?? null;
const searchIndex = Array.isArray(window.archiveSearchIndex) ? window.archiveSearchIndex : [];

function normalizeForSearch(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findSearchMatches(query) {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return searchIndex
    .map((entry) => {
      let score = 0;
      for (const term of terms) {
        if (!entry.searchText.includes(term)) {
          return null;
        }

        if (normalizeForSearch(entry.subject).includes(term)) score += 5;
        if (normalizeForSearch(entry.conversationTitle).includes(term)) score += 3;
        if (normalizeForSearch(entry.from).includes(term)) score += 2;
        score += 1;
      }

      return { ...entry, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);
}

function findAuthorSearchMatches(query) {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return [];

  return searchIndex
    .filter((entry) => normalizeForSearch(entry.from).includes(normalizedQuery))
    .map((entry) => ({ ...entry, score: 0 }));
}

function getSelectedSearchView() {
  return searchViewInputs.find((input) => input.checked)?.value ?? "conversations";
}

function syncSearchViewStyles() {
  for (const input of searchViewInputs) {
    input.parentElement?.classList.toggle("is-active", input.checked);
  }
}

function groupSearchMatchesByConversation(matches) {
  const grouped = new Map();

  for (const entry of matches) {
    const key = entry.conversationUrl ?? entry.messageUrl;
    if (!grouped.has(key)) {
      grouped.set(key, {
        conversationTitle: entry.conversationTitle,
        conversationUrl: entry.conversationUrl ?? entry.messageUrl,
        dateLabel: entry.dateLabel,
        from: entry.from,
        preview: entry.preview,
        messages: [entry],
      });
      continue;
    }

    const item = grouped.get(key);
    item.messages.push(entry);
    if (entry.dateLabel < item.dateLabel) item.dateLabel = entry.dateLabel;
  }

  return [...grouped.values()];
}

function renderSearchResults(query) {
  if (!searchResults) return [];

  const view = getSelectedSearchView();
  const matches = view === "author" ? findAuthorSearchMatches(query) : findSearchMatches(query);

  if (!query.trim()) {
    searchResults.hidden = true;
    searchResults.innerHTML = "";
    return [];
  }

  if (matches.length === 0) {
    searchResults.hidden = false;
    searchResults.innerHTML = "<p class=\"search-empty\">Aucun message ne correspond a cette recherche.</p>";
    return [];
  }

  if (view === "conversations") {
    const groupedMatches = groupSearchMatchesByConversation(matches);
    searchResults.hidden = false;
    searchResults.innerHTML = groupedMatches.map((entry) => `
    <a class="search-result" href="${entry.conversationUrl}">
      <strong>${escapeHtml(entry.conversationTitle)}</strong>
      <span>${entry.messages.length} message${entry.messages.length > 1 ? "s" : ""}</span>
      <small>${escapeHtml(entry.dateLabel)} · ${escapeHtml(entry.from)}</small>
      <p>${escapeHtml(entry.preview)}</p>
    </a>
  `).join("");
    return groupedMatches;
  }

  searchResults.hidden = false;
  searchResults.innerHTML = matches.map((entry) => `
    <a class="search-result" href="${entry.messageUrl}">
      <strong>${escapeHtml(entry.subject)}</strong>
      <span>${escapeHtml(entry.conversationTitle)}</span>
      <small>${escapeHtml(entry.dateLabel)} · ${escapeHtml(entry.from)}</small>
      <p>${escapeHtml(entry.preview)}</p>
    </a>
  `).join("");

  return matches;
}

function syncSearchPageFromUrl() {
  if (!searchForm || searchIndex.length === 0) return;

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") ?? "";
  const rawView = params.get("view");
  const view = rawView === "messages" || rawView === "author" ? rawView : "conversations";
  if (searchInput) searchInput.value = query;
  for (const input of searchViewInputs) {
    input.checked = input.value === view;
  }
  syncSearchViewStyles();
  renderSearchResults(query);
}

searchInput?.addEventListener("input", () => {
  if (searchIndex.length === 0) return;
  renderSearchResults(searchInput.value);
});

searchForm?.addEventListener("submit", (event) => {
  if (searchIndex.length === 0) return;

  event.preventDefault();
  const query = searchInput?.value ?? "";
  const params = new URLSearchParams(window.location.search);
  if (query.trim()) {
    params.set("q", query);
  } else {
    params.delete("q");
  }
  const view = getSelectedSearchView();
  if (view !== "conversations") {
    params.set("view", view);
  } else {
    params.delete("view");
  }

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
  syncSearchViewStyles();
  renderSearchResults(query);
});

for (const input of searchViewInputs) {
  input.addEventListener("change", () => {
    if (searchIndex.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const query = searchInput?.value ?? "";
    if (query.trim()) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    const view = getSelectedSearchView();
    if (view !== "conversations") {
      params.set("view", view);
    } else {
      params.delete("view");
    }
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
    syncSearchViewStyles();
    renderSearchResults(query);
  });
}

syncSearchPageFromUrl();

const yahooUnsubscribe =
  /\n?[>\t ]*Pour vous d(?:\u00e9|\u00c3\u00a9|\u00c3\u0192\u00c2\u00a9|\u00c3\u0192\u00c6\u2019\u00c3\u00e2\u20ac\u0161\u00c3\u201a\u00c2\u00a9)sabonner de ce groupe, envoyez un email [^:\r\n]{0,80}:[ \t]*(?:\r?\n[>\t ]*)?/gi;

const yahooAudioPromo =
  /\n?[>\t -]*(?:-{10,}[ \t]*(?:\r?\n[>\t ]*)?)?Appel audio GRATUIT partout dans le monde avec le nouveau Yahoo!\s*Messenger[>\t ]*(?:\r?\n[>\t ]*)?T(?:é|\u00c3\u00a9)l(?:é|\u00c3\u00a9)chargez le ici ![>\t ]*/gi;

for (const messageBody of document.querySelectorAll(".message-panel pre")) {
  messageBody.textContent = messageBody.textContent
    .replace(yahooUnsubscribe, "\n")
    .replace(yahooAudioPromo, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

for (const copyLinkButton of document.querySelectorAll("[data-copy-message-link]")) {
  copyLinkButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const url = new URL(copyLinkButton.getAttribute("href") ?? window.location.hash, window.location.href).toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copyLinkButton.setAttribute("aria-label", "Lien copié dans le presse-papiers");
        copyLinkButton.setAttribute("title", "Lien copié dans le presse-papiers");
        return;
      }
    } catch (error) {
      // On garde le comportement de secours ci-dessous.
    }

    window.location.hash = copyLinkButton.getAttribute("href")?.slice(1) ?? "";
  });
}

for (const shareButton of document.querySelectorAll("[data-share-message]")) {
  shareButton.addEventListener("click", async () => {
    const title = shareButton.getAttribute("data-share-title") ?? document.title;
    const relativeUrl = shareButton.getAttribute("data-share-url") ?? window.location.pathname;
    const url = new URL(relativeUrl, window.location.href).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: title,
          url,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    window.location.href = url;
  });
}
