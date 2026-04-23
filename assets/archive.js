const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".overlay");
const siteHeader = document.querySelector(".site-header");

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

const search = document.querySelector("#conversation-search");
const items = [...document.querySelectorAll("[data-conversation-list] article")];

search?.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  for (const item of items) {
    item.hidden = query && !item.dataset.search.includes(query);
  }
});

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
