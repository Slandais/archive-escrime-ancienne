import { Buffer } from "node:buffer";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "ML escrime_medievale");
const OUT_CONVERSATIONS = path.join(ROOT, "conversations");
const TITLE = "Archive Mailing-List Escrime Ancienne - 2002 à 2011";
const AUTHOR = "Simon LANDAIS pour la FFAMHE";

const decoderCache = new Map();

function decoderFor(charset = "windows-1252") {
  const normalized = charset.toLowerCase().replace(/^["']|["']$/g, "");
  const label = normalized === "iso-8859-1" ? "windows-1252" : normalized;
  if (!decoderCache.has(label)) {
    decoderCache.set(label, new TextDecoder(label, { fatal: false }));
  }
  return decoderCache.get(label);
}

function decodeBuffer(buffer, charset) {
  try {
    return decoderFor(charset).decode(buffer);
  } catch {
    return decoderFor("windows-1252").decode(buffer);
  }
}

function splitHeaderBody(buffer) {
  const asLatin = decoderFor("windows-1252").decode(buffer);
  const crlf = asLatin.indexOf("\r\n\r\n");
  const lf = asLatin.indexOf("\n\n");
  const splitAt = crlf >= 0 && (lf < 0 || crlf <= lf) ? crlf : lf;
  if (splitAt < 0) return { rawHeaders: asLatin, body: Buffer.alloc(0) };
  const gap = asLatin.startsWith("\r\n\r\n", splitAt) ? 4 : 2;
  return {
    rawHeaders: asLatin.slice(0, splitAt),
    body: buffer.subarray(Buffer.byteLength(asLatin.slice(0, splitAt), "latin1") + gap),
  };
}

function parseHeaders(rawHeaders) {
  const headers = new Map();
  let current = "";
  for (const line of rawHeaders.replace(/\r\n/g, "\n").split("\n")) {
    if (/^[ \t]/.test(line) && current) {
      current += ` ${line.trim()}`;
      continue;
    }
    if (current) addHeader(headers, current);
    current = line;
  }
  if (current) addHeader(headers, current);
  return headers;
}

function addHeader(headers, line) {
  const index = line.indexOf(":");
  if (index < 0) return;
  const name = line.slice(0, index).toLowerCase();
  const value = line.slice(index + 1).trim();
  if (!headers.has(name)) headers.set(name, []);
  headers.get(name).push(value);
}

function header(headers, name) {
  return headers.get(name.toLowerCase())?.join(" ") ?? "";
}

function decodeWords(value) {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toLowerCase() === "b") {
        return decodeBuffer(Buffer.from(text, "base64"), charset);
      }
      const q = text.replace(/_/g, " ").replace(/=([0-9a-fA-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
      return decodeBuffer(Buffer.from(q, "binary"), charset);
    } catch {
      return text;
    }
  });
}

function parseParams(value) {
  const parts = value.split(";").map((part) => part.trim());
  const type = parts.shift()?.toLowerCase() || "";
  const params = new Map();
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    params.set(part.slice(0, index).toLowerCase(), part.slice(index + 1).replace(/^"|"$/g, ""));
  }
  return { type, params };
}

function decodeTransfer(buffer, encoding) {
  const label = encoding.toLowerCase();
  if (label === "base64") {
    return Buffer.from(decoderFor("ascii").decode(buffer).replace(/\s+/g, ""), "base64");
  }
  if (label === "quoted-printable") {
    const source = decoderFor("ascii").decode(buffer).replace(/=\r?\n/g, "");
    const bytes = [];
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] === "=" && /^[0-9a-fA-F]{2}$/.test(source.slice(i + 1, i + 3))) {
        bytes.push(parseInt(source.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(source.charCodeAt(i) & 0xff);
      }
    }
    return Buffer.from(bytes);
  }
  return buffer;
}

function extractTextPart(buffer, fallbackCharset = "windows-1252") {
  const { rawHeaders, body } = splitHeaderBody(buffer);
  const headers = parseHeaders(rawHeaders);
  const contentType = parseParams(header(headers, "content-type") || "text/plain");
  const transferEncoding = header(headers, "content-transfer-encoding");

  if (contentType.type.startsWith("multipart/")) {
    const boundary = contentType.params.get("boundary");
    if (!boundary) return "";
    const boundaryText = `--${boundary}`;
    const raw = decoderFor("windows-1252").decode(body);
    const parts = raw.split(boundaryText).slice(1, -1);
    const buffers = parts.map((part) => {
      const trimmed = part.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
      return Buffer.from(trimmed, "latin1");
    });
    for (const part of buffers) {
      const text = extractTextPart(part, fallbackCharset);
      if (text.trim()) return text;
    }
    return "";
  }

  const decoded = decodeTransfer(body, transferEncoding);
  const charset = contentType.params.get("charset") || fallbackCharset;
  const text = decodeBuffer(decoded, charset);
  if (contentType.type === "text/html") {
    return htmlToText(text);
  }
  if (contentType.type && contentType.type !== "text/plain") {
    return "";
  }
  return text;
}

function htmlToText(html) {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function cleanSubject(subject) {
  return decodeWords(subject)
    .replace(/\[escrime_medievale\]/gi, "")
    .replace(/^\s*((re|rép|fw|fwd)\s*[:_]\s*)+/gi, "")
    .replace(/\s+/g, " ")
    .trim() || "Sans sujet";
}

function conversationKey(subject) {
  return cleanSubject(subject)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() || "sans sujet";
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "conversation";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date) {
  if (!Number.isFinite(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

async function listEmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listEmlFiles(full));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".eml")) files.push(full);
  }
  return files;
}

async function readMessage(file) {
  const buffer = await readFile(file);
  const { rawHeaders } = splitHeaderBody(buffer);
  const headers = parseHeaders(rawHeaders);
  const subject = decodeWords(header(headers, "subject"));
  const date = new Date(header(headers, "date"));
  const from = decodeWords(header(headers, "from")).replace(/\s+/g, " ").trim() || "Auteur inconnu";
  const text = extractTextPart(buffer).replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();

  return {
    file,
    subject: cleanSubject(subject),
    originalSubject: subject || "Sans sujet",
    date,
    from,
    text: text || "(Message vide ou pièce jointe non textuelle.)",
    key: conversationKey(subject),
  };
}

function renderNav(conversations, currentSlug = "") {
  return conversations.map((conversation) => `
    <a class="${conversation.slug === currentSlug ? "active" : ""}" href="${currentSlug ? "" : "conversations/"}${conversation.slug}.html">
      <span>${escapeHtml(conversation.title)}</span>
      <small>${conversation.messages.length} message${conversation.messages.length > 1 ? "s" : ""} · ${formatDate(conversation.firstDate)}</small>
    </a>`).join("");
}

function pageShell({ title, description, body, nav, relative = "." }) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="${AUTHOR}">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
  <link rel="stylesheet" href="${relative}/assets/archive.css">
</head>
<body>
  <button class="menu-toggle" type="button" aria-controls="conversation-nav" aria-expanded="false">☰</button>
  <aside class="sidebar" id="conversation-nav">
    <a class="brand" href="${relative}/index.html">${TITLE}</a>
    <nav>${nav}</nav>
  </aside>
  <div class="overlay" data-close-menu></div>
  <main class="archive-main">
${body}
  </main>
  <script src="${relative}/assets/archive.js"></script>
</body>
</html>`;
}

function renderMessage(message, index) {
  return `<article class="message-panel" id="message-${index + 1}">
  <header>
    <h2>${escapeHtml(message.originalSubject)}</h2>
    <dl>
      <div><dt>Auteur</dt><dd>${escapeHtml(message.from)}</dd></div>
      <div><dt>Date</dt><dd>${escapeHtml(formatDate(message.date))}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(path.relative(ROOT, message.file))}</dd></div>
    </dl>
  </header>
  <pre>${escapeHtml(message.text)}</pre>
</article>`;
}

async function main() {
  await mkdir(OUT_CONVERSATIONS, { recursive: true });
  const files = await listEmlFiles(SOURCE_DIR);
  const messages = (await Promise.all(files.map(readMessage)))
    .sort((a, b) => (a.date - b.date) || a.subject.localeCompare(b.subject, "fr"));

  const byConversation = new Map();
  for (const message of messages) {
    if (!byConversation.has(message.key)) byConversation.set(message.key, []);
    byConversation.get(message.key).push(message);
  }

  const conversations = [...byConversation.values()].map((items, index) => {
    items.sort((a, b) => (a.date - b.date) || a.file.localeCompare(b.file));
    const title = items[0].subject;
    return {
      index,
      title,
      slug: `${String(index + 1).padStart(4, "0")}-${slugify(title)}`,
      firstDate: items[0].date,
      lastDate: items.at(-1).date,
      messages: items,
    };
  }).sort((a, b) => (a.firstDate - b.firstDate) || a.title.localeCompare(b.title, "fr"));

  conversations.forEach((conversation, index) => {
    conversation.index = index;
    conversation.slug = `${String(index + 1).padStart(4, "0")}-${slugify(conversation.title)}`;
  });

  const nav = renderNav(conversations);
  const indexBody = `    <header class="hero">
      <p>Archives consultables en HTML statique</p>
      <h1>${TITLE}</h1>
      <form class="search" role="search">
        <label for="conversation-search">Rechercher une conversation</label>
        <input id="conversation-search" type="search" placeholder="Sujet, date, nombre de messages">
      </form>
      <p>${messages.length} messages regroupés en ${conversations.length} conversations.</p>
    </header>
    <section class="conversation-list" data-conversation-list>
${conversations.map((conversation) => `      <article data-search="${escapeHtml(`${conversation.title} ${formatDate(conversation.firstDate)} ${conversation.messages.length}`.toLowerCase())}">
        <h2><a href="conversations/${conversation.slug}.html">${escapeHtml(conversation.title)}</a></h2>
        <p>${formatDate(conversation.firstDate)} · ${conversation.messages.length} message${conversation.messages.length > 1 ? "s" : ""}</p>
      </article>`).join("\n")}
    </section>`;

  await writeFile(path.join(ROOT, "index.html"), pageShell({
    title: TITLE,
    description: "Archives HTML de la mailing-list Escrime Ancienne de 2002 à 2011.",
    body: indexBody,
    nav,
    relative: ".",
  }), "utf8");

  for (const conversation of conversations) {
    const previous = conversations[conversation.index - 1];
    const next = conversations[conversation.index + 1];
    const body = `    <header class="conversation-header">
      <p>${formatDate(conversation.firstDate)} · ${conversation.messages.length} message${conversation.messages.length > 1 ? "s" : ""}</p>
      <h1>${escapeHtml(conversation.title)}</h1>
      <div class="pager">
        ${previous ? `<a href="${previous.slug}.html">Conversation précédente</a>` : "<span></span>"}
        ${next ? `<a href="${next.slug}.html">Conversation suivante</a>` : "<span></span>"}
      </div>
    </header>
${conversation.messages.map(renderMessage).join("\n")}`;
    await writeFile(path.join(OUT_CONVERSATIONS, `${conversation.slug}.html`), pageShell({
      title: `${conversation.title} · ${TITLE}`,
      description: `Conversation "${conversation.title}" de la mailing-list Escrime Ancienne.`,
      body,
      nav: renderNav(conversations, conversation.slug),
      relative: "..",
    }), "utf8");
  }

  await writeFile(path.join(ROOT, "site-data.json"), `${JSON.stringify({
    title: TITLE,
    author: AUTHOR,
    generatedAt: new Date().toISOString(),
    sourceMessages: messages.length,
    conversations: conversations.length,
  }, null, 2)}\n`, "utf8");

  console.log(`Site généré : ${messages.length} messages, ${conversations.length} conversations.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
