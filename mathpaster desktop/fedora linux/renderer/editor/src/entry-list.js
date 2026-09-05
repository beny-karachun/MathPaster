import { renderSymbolFace } from './palette.js';

/* ── Shared entry-list renderer ──
 * Both the Insert History and Snippets panels show the same thing: a vertical,
 * scrollable list of saved expressions, each with a rendered math preview, a
 * relative timestamp, and a delete button. Clicking a row loads it back into the
 * editor. This module owns that rendering so the two panels stay in sync.
 */

/* Windows-clipboard-style relative time ("just now", "5m ago", "2h ago"…). */
export function relativeTime(ts) {
  const diff = Date.now() - (ts || 0);
  if (!ts || diff < 0) return "";
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d ago";
  const w = Math.floor(d / 7);
  return w + "w ago";
}

/* Render `entries` into `container`.
 *   entries: [{ latex, mode?, ts, name?, id? }]
 *   opts: { onPick(entry), onDelete(entry), emptyText, showName }
 */
export function renderEntryList(container, entries, opts) {
  container.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "entry-empty";
    empty.textContent = opts.emptyText || "Nothing here yet.";
    container.appendChild(empty);
    return;
  }
  entries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Load ${entry.name || entry.latex}`);
    row.title = entry.latex;

    const main = document.createElement("div");
    main.className = "entry-main";
    if (opts.showName && entry.name) {
      const nameEl = document.createElement("span");
      nameEl.className = "entry-name";
      nameEl.textContent = entry.name;
      main.appendChild(nameEl);
    }
    const face = document.createElement("div");
    face.className = "entry-face";
    face.innerHTML = renderSymbolFace(entry.latex);
    main.appendChild(face);

    const meta = document.createElement("span");
    meta.className = "entry-meta";
    meta.textContent = relativeTime(entry.ts);

    const del = document.createElement("button");
    del.className = "entry-delete";
    del.title = "Delete";
    del.setAttribute("aria-label", `Delete ${entry.name || entry.latex}`);
    del.textContent = "×";
    del.addEventListener("mousedown", e => e.preventDefault());
    del.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      opts.onDelete(entry);
    });

    // Don't steal focus from the math field on click (the editor-wide pattern).
    row.addEventListener("mousedown", e => e.preventDefault());
    row.addEventListener("click", () => opts.onPick(entry));
    row.addEventListener("keydown", event => {
      if (event.target === row && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault(); opts.onPick(entry);
      }
    });

    row.append(main, meta, del);
    container.appendChild(row);
  });
}
