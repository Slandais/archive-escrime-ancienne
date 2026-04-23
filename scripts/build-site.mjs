import { Buffer } from "node:buffer";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "ML escrime_medievale");
const OUT_DIR = path.join(ROOT, "dist");
const OUT_CONVERSATIONS = path.join(OUT_DIR, "conversations");
const TITLE = "Archive Mailing-List Escrime Ancienne - 2003 à 2011";
const AUTHOR = "Simon LANDAIS pour la FFAMHE";
const BUILD_MODES = new Set(["partial", "full"]);
const ARCHIVE_START_DATE = new Date("2003-01-01T00:00:00+01:00");
const ARCHIVE_2004_START_DATE = new Date("2004-01-01T00:00:00+01:00");
const DISPLAY_NAME_REPLACEMENTS = new Map([
  ["Patricia Marain", "Gaëtan Marain"],
]);
const AUTHOR_EMAIL_REPLACEMENTS = new Map([
  ["michael.huber78@free.fr", "Michael Huber"],
]);
const FORCED_CONVERSATION_YEARS = new Map([
  ["annee 2004", 2004],
  ["waster", 2004],
]);
const MOJIBAKE_REPLACEMENTS = new Map([
  ["\u00c3\u20ac", "À"],
  ["\u00c3\u201a", "Â"],
  ["\u00c3\u2021", "Ç"],
  ["\u00c3\u2030", "É"],
  ["\u00c3\u02c6", "È"],
  ["\u00c3\u0160", "Ê"],
  ["\u00c3\u2039", "Ë"],
  ["\u00c3\u017d", "Î"],
  ["\u00c3\u201d", "Ô"],
  ["\u00c3\u2122", "Ù"],
  ["\u00c3\u203a", "Û"],
  ["\u00c3\u0152", "Ü"],
  ["\u00c3\u2019\u00c2\u00a0", "à"],
  ["\u00c3\u2019\u00c2\u00a2", "â"],
  ["\u00c3\u2019\u00c2\u00a7", "ç"],
  ["\u00c3\u2019\u00c2\u00a9", "é"],
  ["\u00c3\u2019\u00c2\u00aa", "ê"],
  ["\u00c3\u2019\u00c2\u00ab", "ë"],
  ["\u00c2\u00a0", " "],
  ["\u00c3\u00a0", "à"],
  ["\u00c3\u00a2", "â"],
  ["\u00c3\u00a7", "ç"],
  ["\u00c3\u00a8", "è"],
  ["\u00c3\u00a9", "é"],
  ["\u00c3\u00aa", "ê"],
  ["\u00c3\u00ab", "ë"],
  ["\u00c3\u00ac", "ì"],
  ["\u00c3\u00ae", "î"],
  ["\u00c3\u00af", "ï"],
  ["\u00c3\u00b4", "ô"],
  ["\u00c3\u00b9", "ù"],
  ["\u00c3\u00bb", "û"],
  ["\u00c3\u00bc", "ü"],
]);
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_PLACEHOLDER_REGEX = /<?\s*\[adresse email anonymis(?:ée|\u00c3\u00a9e|\u00c3\u0192\u00c2\u00a9e)\]\s*>?/gi;
const YAHOO_FOOTER_REGEX = /\n?[>\s]*L'utilisation du service Yahoo![>\s]*Groupes est soumise[\s\S]{0,260}?Conditions d'utilisation et de la Charte sur la vie priv[ée]e[\s\S]{0,260}?http:\/\/fr\.docs\.yahoo\.com\/info\/utos\.html et[\s\S]{0,160}?http:\/\/fr\.docs\.yahoo\.com\/info\/privacy\.html[>\s]*/gi;
const YAHOO_FOOTER_SHORT_REGEX = /\n?[>\s]*L'utilisation du service Yahoo![>\s]*Groupes est soumise[\s\S]{0,260}?Conditions d'utilisation et de la Charte sur la vie priv[ée]e\.[>\s]*/gi;
const YAHOO_FOOTER_LINKED_REGEX = /\n?[>\s]*L'utilisation du service Yahoo![>\s]*Groupes est soumise[\s\S]{0,620}?Charte sur la vie[\s\S]{0,180}?priv[ée]e\.?[>\s]*/gi;

const YAHOO_UNSUBSCRIBE_REGEX = /\n?[>\t ]*Pour vous d(?:\u00e9|\u00c3\u00a9|\u00c3\u0192\u00c2\u00a9|\u00c3\u0192\u00c6\u2019\u00c3\u00e2\u20ac\u0161\u00c3\u201a\u00c2\u00a9)sabonner de ce groupe, envoyez un email [^:\r\n]{0,80}:[ \t]*(?:\r?\n[>\t ]*(?:(?:\[[^\]\r\n]*adresse email[^\]\r\n]*\])|(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}))?[ \t]*)?/gi;
const YAHOO_UNSUBSCRIBE_DUPLICATE_REGEX = /\n?[>\t ]*Pour vous d(?:\u00e9|\u00c3\u00a9)sabonner de ce groupe, envoyez un email .+?:[ \t]*(?:\r?\n[>\t ]*(?:\[[^\]\r\n]*adresse email[^\]\r\n]*\])?[ \t]*)?\r?\n[>\t ]*Pour vous d(?:\u00e9|\u00c3\u00a9)sabonner de ce groupe, envoyez un email .+?:[ \t]*(?:\r?\n[>\t ]*(?:\[[^\]\r\n]*adresse email[^\]\r\n]*\])?[ \t]*)?/gi;
const YAHOO_UNSUBSCRIBE_LINE_DUPLICATE_REGEX = /\n?(?:[>\t ]*Pour vous d(?:\u00e9|\u00c3\u00a9)sabonner de ce groupe, envoyez un email .+?:[ \t]*(?:\r?\n|$)){2,}/gi;

const YAHOO_GROUP_LINKS_REGEX = /\n?[>\t <]*(?:&lt;\*&gt;\s*)?(?:[a-c]\.\.\s*)?Liens Yahoo!\s*Groupes[>\t <]*(?:\r?\n[>\t <]*(?:&lt;\*&gt;\s*)?(?:[a-c]\.\.\s*)?)*[\s\S]{0,80}?Pour consulter votre groupe en ligne, acc(?:e|\u00c3\u00a8)dez [^:\r\n]{0,20}:[ \t]*(?:\r?\n[>\t <]*(?:&lt;\*&gt;\s*)?(?:http:\/\/fr\.groups\.yahoo\.com\/group\/escrime_medievale\/)?[ \t]*)?[\s\S]{0,120}?Pour vous d(?:\u00e9|\u00c3\u00a9|\u00c3\u0192\u00c2\u00a9|\u00c3\u0192\u00c6\u2019\u00c3\u00e2\u20ac\u0161\u00c3\u201a\u00c2\u00a9)sincrire de ce groupe, envoyez un mail [^:\r\n]{0,20}:[ \t]*(?:\r?\n[>\t <]*(?:&lt;\*&gt;\s*)?[ \t]*)?[\s\S]{0,120}?L'utilisation de Yahoo!\s*Groupes est soumise [\s\S]{0,160}?http:\/\/fr\.docs\.yahoo\.com\/info\/utos\.html[>\t <]*/gi;

const YAHOO_TRUE_SWITCH_PROMO_REGEX = /\n?[>\s-]*Ne gardez plus qu'une seule adresse mail ?! Copiez vos mails(?:[\s\S]{0,140}?)vers Yahoo!\s*Mail(?:\s*<\/pre>)?[>\s]*/gi;

const YAHOO_MAIL_PROMO_REGEX = new RegExp(
  String.raw`\n?[>\s]*(?:-{10,}[>\s]*(?:\r?\n[>\s]*)?)?Do You ` +
    String.raw`Yahoo!\? -- Une adresse @yahoo\.fr gratuite et en fran(?:ç|\u00c3\u00a7)ais ![>\s]*(?:\r?\n[>\s]*(?:<[^>\r\n]+>)?)?Testez le nouveau ` +
    String.raw`Yahoo! Mail(?:\s*<[^>\r\n]+>)?[>\s]*`,
  "gi",
);

const YAHOO_MARKER_LINE_REGEX = /(?:http:\/\/fr\.docs\.yahoo\.com\/info\/utos\.html|http:\/\/fr\.docs\.yahoo\.com\/info\/privacy\.html|Yahoo!\s*Mail|escrime_medievale-unsubscribe@e|^\s*(?:&gt;|>|\s)*,\s*disponibles\s*$)/i;

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

function headerValues(headers, name) {
  return headers.get(name.toLowerCase()) ?? [];
}

function parseDateHeader(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseReceivedDate(value) {
  const dateText = value.slice(value.lastIndexOf(";") + 1).trim();
  return parseDateHeader(dateText);
}

function messageDate(headers) {
  const declaredDate = parseDateHeader(header(headers, "date"));
  const receivedDates = headerValues(headers, "received")
    .map(parseReceivedDate)
    .filter(Boolean)
    .sort((a, b) => a - b);

  return declaredDate ?? receivedDates[0] ?? new Date(NaN);
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
    .replace(/^\s*((re|rép|\u00c3\u00a9p|fw|fwd)\s*[:_]\s*)+/gi, "")
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

function repairMojibakeAccents(value) {
  let result = value;
  for (const [search, replacement] of MOJIBAKE_REPLACEMENTS) {
    result = result.replaceAll(search, replacement);
  }
  return result;
}

function anonymizeEmails(value) {
  return value.replace(EMAIL_REGEX, "");
}

function removeEmailPlaceholders(value) {
  return value
    .replace(EMAIL_PLACEHOLDER_REGEX, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+(\r?\n)/g, "$1")
    .trim();
}

function removeYahooUnsubscribe(value) {
  return value
    .replace(YAHOO_UNSUBSCRIBE_REGEX, "\n")
    .replace(YAHOO_UNSUBSCRIBE_DUPLICATE_REGEX, "\n")
    .replace(YAHOO_UNSUBSCRIBE_LINE_DUPLICATE_REGEX, "\n")
    .replace(YAHOO_GROUP_LINKS_REGEX, "\n");
}

function removeYahooGroupLinksLines(value) {
  const lines = value.split(/\r?\n/);
  const kept = [];
  let skipping = false;
  let skippedLines = 0;

  for (const line of lines) {
    const normalized = line.trim();
    const isYahooLinksMarker =
      /Liens Yahoo!\s*Groupes/i.test(normalized) ||
      /Pour consulter votre groupe en ligne/i.test(normalized) ||
      /Pour vous d(?:\u00e9|\u00c3\u00a9|\u00c3\u0192\u00c2\u00a9|\u00c3\u0192\u00c6\u2019\u00c3\u00e2\u20ac\u0161\u00c3\u201a\u00c2\u00a9)sincrire de ce groupe/i.test(normalized) ||
      /L'utilisation de Yahoo!\s*Groupes est soumise/i.test(normalized);

    if (!skipping && isYahooLinksMarker) {
      skipping = true;
      skippedLines = 0;
      continue;
    }

    if (skipping) {
      skippedLines += 1;
      if (
        /fr\.docs\.yahoo\.com\/info\/utos\.html/i.test(normalized) ||
        /L'utilisation de Yahoo!\s*Groupes est soumise/i.test(normalized) ||
        /Conditions d'utilisation/i.test(normalized) ||
        skippedLines >= 18
      ) {
        skipping = false;
      }
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
}

function removeYahooMarkerLines(value) {
  return value
    .split(/\r?\n/)
    .filter((line) => !YAHOO_MARKER_LINE_REGEX.test(line))
    .join("\n");
}

function replaceDisplayNames(value) {
  let result = value;
  for (const [search, replacement] of DISPLAY_NAME_REPLACEMENTS) {
    result = result.replaceAll(search, replacement);
  }
  return result;
}

function cleanAuthor(value) {
  return replaceDisplayNames(removeEmailPlaceholders(anonymizeEmails(value))
    .replace(/\s*<>\s*/g, "")
    .replace(/^"([^"]+)"$/g, "$1")
    .replace(/"([^"]+)"/g, "$1")
    .replace(/^"+$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim());
}

function authorNameFromEmail(email) {
  const normalized = email.toLowerCase();
  return AUTHOR_EMAIL_REPLACEMENTS.get(normalized) ?? normalized.split("@")[0] ?? "";
}

function fallbackAuthorFromHeader(value) {
  const email = value.match(EMAIL_REGEX)?.[0];
  return email ? authorNameFromEmail(email) : "";
}

function cleanMessageText(value) {
  const repairedValue = repairMojibakeAccents(value);
  const cleaned = replaceDisplayNames(removeEmailPlaceholders(anonymizeEmails(removeYahooMarkerLines(removeYahooGroupLinksLines(removeYahooUnsubscribe(repairedValue))))
    .replace(YAHOO_UNSUBSCRIBE_REGEX, "\n")
    .replace(YAHOO_GROUP_LINKS_REGEX, "\n")
    .replace(YAHOO_TRUE_SWITCH_PROMO_REGEX, "\n")
    .replace(YAHOO_FOOTER_REGEX, "\n")
    .replace(YAHOO_FOOTER_SHORT_REGEX, "\n")
    .replace(YAHOO_FOOTER_LINKED_REGEX, "\n")
    .replace(YAHOO_MAIL_PROMO_REGEX, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()));

  return removeYahooMarkerLines(removeYahooGroupLinksLines(cleaned))
    .replace(YAHOO_UNSUBSCRIBE_REGEX, "\n")
    .replace(YAHOO_TRUE_SWITCH_PROMO_REGEX, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function findBodyEmails(value) {
  return [...new Set(value.match(EMAIL_REGEX) ?? [])];
}

function formatDate(date) {
  if (!Number.isFinite(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function normalizeConversationDate(date, key) {
  const forcedYear = FORCED_CONVERSATION_YEARS.get(key);
  if (!forcedYear || !Number.isFinite(date.getTime()) || date.getUTCFullYear() === forcedYear) {
    return date;
  }

  const normalizedDate = new Date(date);
  normalizedDate.setUTCFullYear(forcedYear);
  return normalizedDate;
}

function parseBuildMode(argv) {
  let mode = "partial";
  for (const arg of argv) {
    if (arg === "--full" || arg === "--total" || arg === "--mode=full" || arg === "--mode=total") {
      mode = "full";
      continue;
    }
    if (arg === "--partial" || arg === "--partiel" || arg === "--mode=partial" || arg === "--mode=partiel") {
      mode = "partial";
      continue;
    }
    if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length);
      throw new Error(`Mode de build inconnu : ${value}. Utiliser "partial" ou "full".`);
    }
  }
  if (!BUILD_MODES.has(mode)) {
    throw new Error(`Mode de build inconnu : ${mode}.`);
  }
  return mode;
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
  const subject = repairMojibakeAccents(decodeWords(header(headers, "subject")));
  const key = conversationKey(subject);
  const date = normalizeConversationDate(messageDate(headers), key);
  const fromHeader = repairMojibakeAccents(decodeWords(header(headers, "from"))).replace(/\s+/g, " ").trim();
  const from = cleanAuthor(fromHeader) || fallbackAuthorFromHeader(fromHeader) || "Auteur inconnu";
  const rawText = extractTextPart(buffer).replace(/\r\n/g, "\n");
  const bodyEmails = findBodyEmails(rawText);
  const text = cleanMessageText(rawText);

  return {
    file,
    subject: cleanSubject(subject),
    originalSubject: subject || "Sans sujet",
    date,
    from,
    text: text || "(Message vide ou pièce jointe non textuelle.)",
    bodyEmails,
    key,
  };
}

function renderBodyEmailReport(messages) {
  const withEmails = messages.filter((message) => message.bodyEmails.length > 0);
  return `# Adresses email repérées dans les corps de messages

Ce rapport liste les messages dont le corps contenait au moins une adresse email avant anonymisation. Les adresses ne sont pas reproduites en clair.

Total : ${withEmails.length} messages concernés.

${withEmails.map((message) => `- ${formatDate(message.date)} · ${message.subject} · ${message.bodyEmails.length} adresse${message.bodyEmails.length > 1 ? "s" : ""} · ${path.relative(ROOT, message.file)}`).join("\n")}
`;
}

function renderNav(conversations, currentSlug = "") {
  return conversations.map((conversation) => `
    <a class="${(conversation.outputSlug ?? conversation.slug) === currentSlug ? "active" : ""}" href="${currentSlug ? "" : "conversations/"}${conversation.outputSlug ?? conversation.slug}.html">
      <span>${escapeHtml(conversation.title)}</span>
      <small>${conversation.messages.length} message${conversation.messages.length > 1 ? "s" : ""} · ${formatDate(conversation.firstDate)}</small>
    </a>`).join("");
}

function slugWithoutIndex(slug) {
  return slug.replace(/^\d{4}-/, "");
}

async function existingConversationSlugs() {
  try {
    const entries = await readdir(OUT_CONVERSATIONS, { withFileTypes: true });
    return new Set(entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".html"))
      .map((entry) => entry.name.slice(0, -".html".length)));
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

function pageShell({ title, description, body, nav, relative = ".", mainClass = "" }) {
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
  <header class="site-header">
    <a class="site-title" href="${relative}/index.html">${TITLE}</a>
  </header>
  <aside class="sidebar" id="conversation-nav">
    <nav>${nav}</nav>
  </aside>
  <div class="overlay" data-close-menu></div>
  <main class="archive-main${mainClass ? ` ${mainClass}` : ""}">
${body}
  </main>
  <script src="${relative}/assets/archive.js"></script>
</body>
</html>`;
}

function renderMessage(message, index, conversationTitle) {
  const messageTitle = message.subject === conversationTitle
    ? ""
    : `    <h2>${escapeHtml(message.subject)}</h2>\n`;

  return `<article class="message-panel" id="message-${index + 1}">
  <header>
${messageTitle}    <dl>
      <div><dd>${escapeHtml(message.from)}</dd></div>
      <div><dd>${escapeHtml(formatDate(message.date))}</dd></div>
    </dl>
  </header>
  <pre>${escapeHtml(message.text)}</pre>
</article>`;
}

async function main() {
  const buildMode = parseBuildMode(process.argv.slice(2));
  const isFullBuild = buildMode === "full";

  if (isFullBuild) {
    await rm(OUT_DIR, { recursive: true, force: true });
  }
  await mkdir(OUT_CONVERSATIONS, { recursive: true });
  await cp(path.join(ROOT, "assets"), path.join(OUT_DIR, "assets"), { recursive: true, force: true });

  const files = await listEmlFiles(SOURCE_DIR);
  const messages = (await Promise.all(files.map(readMessage)))
    .filter((message) => message.date >= ARCHIVE_START_DATE)
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

  const existingSlugs = isFullBuild ? new Set() : await existingConversationSlugs();
  const existingSlugsBySuffix = new Map([...existingSlugs].map((slug) => [slugWithoutIndex(slug), slug]));
  const conversationsWithOutputSlugs = isFullBuild
    ? conversations
    : conversations.map((conversation, index) => ({
      ...conversation,
      outputSlug: index === 0
        ? conversation.slug
        : existingSlugsBySuffix.get(slugWithoutIndex(conversation.slug)) ?? conversation.slug,
    }));
  const conversationsToBuild = isFullBuild
    ? conversationsWithOutputSlugs
    : conversationsWithOutputSlugs.filter((conversation, index) =>
      index === 0
      || conversation.firstDate < ARCHIVE_2004_START_DATE
      || FORCED_CONVERSATION_YEARS.has(conversation.messages[0]?.key ?? "")
    );
  const builtSlugs = new Set(conversationsToBuild.map((conversation) => conversation.outputSlug ?? conversation.slug));
  const conversationsToList = isFullBuild
    ? conversationsWithOutputSlugs
    : conversationsWithOutputSlugs
      .filter((conversation, index) =>
        index === 0
        || builtSlugs.has(conversation.outputSlug ?? conversation.slug)
        || existingSlugs.has(conversation.outputSlug ?? conversation.slug));
  const generatedMessages = conversationsToBuild.reduce((total, conversation) => total + conversation.messages.length, 0);
  const listedMessages = conversationsToList.reduce((total, conversation) => total + conversation.messages.length, 0);
  const nav = renderNav(conversationsToList);
  const indexBody = `    <header class="hero">
      <p>Archives consultables en HTML statique</p>
      <h1>${TITLE}</h1>
      <form class="search" role="search">
        <label for="conversation-search">Rechercher une conversation</label>
        <input id="conversation-search" type="search" placeholder="Sujet, date, nombre de messages">
      </form>
      <p>${listedMessages} messages regroupés en ${conversationsToList.length} conversations.</p>
    </header>
    <section class="conversation-list" data-conversation-list>
${conversationsToList.map((conversation) => `      <article data-search="${escapeHtml(`${conversation.title} ${formatDate(conversation.firstDate)} ${conversation.messages.length}`.toLowerCase())}">
        <h2><a href="conversations/${conversation.outputSlug ?? conversation.slug}.html">${escapeHtml(conversation.title)}</a></h2>
        <p>${formatDate(conversation.firstDate)} · ${conversation.messages.length} message${conversation.messages.length > 1 ? "s" : ""}</p>
      </article>`).join("\n")}
    </section>`;

  await writeFile(path.join(OUT_DIR, "index.html"), pageShell({
    title: TITLE,
    description: "Archives HTML de la mailing-list Escrime Ancienne de 2003 à 2011.",
    body: indexBody,
    nav,
    relative: ".",
  }), "utf8");

  for (const conversation of conversationsToBuild) {
    const previous = isFullBuild ? conversations[conversation.index - 1] : null;
    const next = isFullBuild ? conversations[conversation.index + 1] : null;
    const body = `    <header class="conversation-header">
      <p>${formatDate(conversation.firstDate)} · ${conversation.messages.length} message${conversation.messages.length > 1 ? "s" : ""}</p>
      <h1>${escapeHtml(conversation.title)}</h1>
      <div class="pager">
        ${previous ? `<a href="${previous.slug}.html">Conversation précédente</a>` : "<span></span>"}
        ${next ? `<a href="${next.slug}.html">Conversation suivante</a>` : "<span></span>"}
      </div>
    </header>
${conversation.messages.map((message, index) => renderMessage(message, index, conversation.title)).join("\n")}`;
    await writeFile(path.join(OUT_CONVERSATIONS, `${conversation.outputSlug ?? conversation.slug}.html`), pageShell({
      title: `${conversation.title} · ${TITLE}`,
      description: `Conversation "${conversation.title}" de la mailing-list Escrime Ancienne.`,
      body,
      nav: renderNav(conversationsToList, conversation.outputSlug ?? conversation.slug),
      relative: "..",
      mainClass: "conversation-main",
    }), "utf8");
  }

  await writeFile(path.join(OUT_DIR, "site-data.json"), `${JSON.stringify({
    title: TITLE,
    author: AUTHOR,
    generatedAt: new Date().toISOString(),
    buildMode,
    sourceMessages: messages.length,
    conversations: conversations.length,
    generatedMessages,
    generatedConversations: conversationsToBuild.length,
    listedMessages,
    listedConversations: conversationsToList.length,
  }, null, 2)}\n`, "utf8");

  if (isFullBuild) {
    await writeFile(path.join(OUT_DIR, "body-email-occurrences.md"), renderBodyEmailReport(messages), "utf8");
  }
  await writeFile(path.join(OUT_DIR, "vercel.json"), `${JSON.stringify({
    buildCommand: null,
    outputDirectory: ".",
  }, null, 2)}\n`, "utf8");

  console.log(`Site généré en mode ${buildMode} : ${messages.length} messages, ${conversationsToBuild.length}/${conversations.length} conversations.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
