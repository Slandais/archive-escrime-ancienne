const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".overlay");

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

const search = document.querySelector("#conversation-search");
const items = [...document.querySelectorAll("[data-conversation-list] article")];

search?.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  for (const item of items) {
    item.hidden = query && !item.dataset.search.includes(query);
  }
});
