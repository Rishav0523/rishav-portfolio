// Deterministic A4 paginator for the hand-written documentation sources.
// The browser lays out every block once, then moves blocks into fixed-size
// pages so that the table of contents can carry real page numbers and every
// page can show "Page X of Y" without relying on unsupported CSS paged-media
// features in Chromium's print pipeline.
window.__paginate = async function paginate() {
  const meta = JSON.parse(document.getElementById("doc-meta").textContent);
  const flow = document.getElementById("flow");
  const source = Array.from(flow.children);

  const root = document.createElement("div");
  root.id = "print-root";
  document.body.appendChild(root);

  const pages = [];
  let current = null;

  function addPage(kind) {
    const page = document.createElement("section");
    page.className = "page" + (kind ? " " + kind : "");
    const body = document.createElement("div");
    body.className = "page-body";
    page.appendChild(body);
    root.appendChild(page);
    const entry = { page, body, kind: kind || "content", section: null };
    pages.push(entry);
    return entry;
  }

  function newContentPage() {
    current = addPage("content");
    current.section = activeSection;
    return current;
  }

  // ---------- cover ----------

  const cover = document.createElement("section");
  cover.className = "page cover";
  cover.innerHTML = `
    <div class="cover-inner">
      <div class="cover-brand">
        <span class="mark">Rishav Prasad · Portfolio</span>
        <span>rishavprasad.in</span>
      </div>
      <div class="cover-main">
        <p class="cover-kicker">${meta.kind || "Project documentation"}</p>
        <div class="cover-no">${meta.number}</div>
        <h1>${meta.title}</h1>
        <p class="cover-sub">${meta.subtitle}</p>
      </div>
      <div class="cover-meta">
        <div><span>Prepared for</span>Rishav Prasad<br>Owner and maintainer</div>
        <div><span>Site</span>rishavprasad.in<br>Cloudflare Workers</div>
        <div><span>Version</span>${meta.version}</div>
        <div><span>Date</span>${meta.date}</div>
      </div>
    </div>
    <div class="cover-strip"></div>`;
  root.appendChild(cover);
  pages.push({ page: cover, body: null, kind: "cover", section: null });

  // ---------- contents ----------

  const headings = source.filter(
    (node) => node.tagName === "H2" && node.hasAttribute("data-toc"),
  );
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `section-${index + 1}`;
  });

  const ROWS_PER_PAGE = 27;
  const tocCount = Math.max(1, Math.ceil(headings.length / ROWS_PER_PAGE));
  const tocPages = [];
  for (let pageIndex = 0; pageIndex < tocCount; pageIndex += 1) {
    const entry = addPage("toc-page");
    entry.section = "Contents";
    const title = document.createElement("div");
    title.className = "toc-title";
    title.textContent = "Contents";
    const sub = document.createElement("p");
    sub.className = "toc-sub";
    sub.textContent =
      pageIndex === 0
        ? `${meta.title} · version ${meta.version} · ${headings.length} sections`
        : `${meta.title} · contents continued`;
    entry.body.appendChild(title);
    entry.body.appendChild(sub);

    const slice = headings.slice(pageIndex * ROWS_PER_PAGE, (pageIndex + 1) * ROWS_PER_PAGE);
    slice.forEach((heading, i) => {
      const row = document.createElement("div");
      row.className = "toc-row";
      const number = document.createElement("span");
      number.className = "n";
      number.textContent = String(pageIndex * ROWS_PER_PAGE + i + 1).padStart(2, "0");
      const label = document.createElement("span");
      label.className = "t";
      label.textContent = heading.getAttribute("data-toc") || heading.textContent.trim();
      const dots = document.createElement("span");
      dots.className = "dots";
      const pageNo = document.createElement("span");
      pageNo.className = "p";
      pageNo.dataset.for = heading.id;
      pageNo.textContent = "—";
      row.append(number, label, dots, pageNo);
      entry.body.appendChild(row);
    });
    tocPages.push(entry);
  }

  // ---------- content ----------

  // Keep a heading with the block that follows it so that no section title is
  // stranded at the bottom of a page.
  const units = [];
  for (let i = 0; i < source.length; i += 1) {
    const node = source[i];
    const next = source[i + 1];
    const isHeading = node.tagName === "H2" || node.tagName === "H3";
    if (
      isHeading &&
      next &&
      next.tagName !== "H2" &&
      next.tagName !== "H3" &&
      next.tagName !== "TABLE" &&
      !next.classList.contains("pb")
    ) {
      const group = document.createElement("div");
      group.className = "keep-group";
      group.style.display = "flex";
      group.style.flexDirection = "column";
      group.style.gap = "3.1mm";
      group.appendChild(node);
      group.appendChild(next);
      units.push(group);
      i += 1;
    } else {
      units.push(node);
    }
  }

  const sectionPages = new Map();
  let activeSection = null;

  newContentPage();

  function overflows(entry) {
    return entry.body.scrollHeight > entry.body.clientHeight + 1;
  }

  function remainingSpace() {
    const kids = current.body.children;
    if (kids.length === 0) return current.body.clientHeight;
    const bodyRect = current.body.getBoundingClientRect();
    const lastRect = kids[kids.length - 1].getBoundingClientRect();
    return current.body.clientHeight - (lastRect.bottom - bodyRect.top);
  }

  // Tables may continue on the next page with a repeated header. Rows move to
  // a clone, and the clone is queued as the next unit.
  function placeTable(table, index) {
    current.body.appendChild(table);
    if (!overflows(current)) return true;
    current.body.removeChild(table);

    const minKeepPx = (45 * 96) / 25.4;
    if (current.body.children.length > 0) {
      if (remainingSpace() < minKeepPx) {
        newContentPage();
        current.body.appendChild(table);
        if (!overflows(current)) return true;
        current.body.removeChild(table);
      }
    }

    const tbody = table.tBodies[0];
    if (!tbody || tbody.rows.length < 2) return false;

    current.body.appendChild(table);
    const removed = [];
    while (overflows(current) && tbody.rows.length > 1) {
      removed.unshift(tbody.rows[tbody.rows.length - 1]);
      tbody.deleteRow(tbody.rows.length - 1);
    }
    if (overflows(current)) {
      for (const row of removed) tbody.appendChild(row);
      current.body.removeChild(table);
      return false;
    }
    if (removed.length === 0) return true;

    const rest = table.cloneNode(false);
    if (table.tHead) rest.appendChild(table.tHead.cloneNode(true));
    const body = document.createElement("tbody");
    for (const row of removed) body.appendChild(row);
    rest.appendChild(body);
    units.splice(index + 1, 0, rest);
    return true;
  }

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    const forcedBreak = unit.classList && unit.classList.contains("pb");
    if (forcedBreak) {
      if (current.body.children.length > 0) newContentPage();
      // Skip the marker itself; it must not count as page content, otherwise
      // the heading that follows cannot claim the new page's running head.
      continue;
    }

    const tocHeading =
      (unit.matches && unit.matches("h2[data-toc]") && unit) ||
      (unit.querySelector && unit.querySelector("h2[data-toc]"));

    if (tocHeading) {
      activeSection = tocHeading.getAttribute("data-toc") || tocHeading.textContent.trim();
      sectionPages.set(tocHeading.id, pages.length);
    }

    if (
      (unit.tagName === "H2" || unit.tagName === "H3") &&
      current.body.children.length > 0
    ) {
      const minAfterHeading = (60 * 96) / 25.4;
      if (remainingSpace() < unit.offsetHeight + minAfterHeading) {
        newContentPage();
      }
    }

    const pageWasEmpty = current.body.children.length === 0;
    let placed = false;
    if (unit.tagName === "TABLE") {
      placed = placeTable(unit, index);
    }
    if (!placed) {
      current.body.appendChild(unit);
      if (overflows(current)) {
        current.body.removeChild(unit);
        if (current.body.children.length > 0) {
          newContentPage();
          current.body.appendChild(unit);
        }
        if (tocHeading) {
          sectionPages.set(tocHeading.id, pages.length);
        }
      }
    }
    if (tocHeading && (pageWasEmpty || current.body.children.length === 1)) {
      current.section = activeSection;
    }

    // A heading followed by a block larger than an empty page cannot be kept
    // together; fall back to flowing the pair as separate blocks.
    if (unit.classList.contains("keep-group") && overflows(current)) {
      while (unit.firstChild) current.body.insertBefore(unit.firstChild, unit);
      unit.remove();
      if (overflows(current)) {
        // The trailing block alone does not fit either; let it start over.
        const last = current.body.lastElementChild;
        current.body.removeChild(last);
        newContentPage();
        current.body.appendChild(last);
      }
    }
  }

  flow.remove();

  // ---------- running head, foot and TOC numbers ----------

  const total = pages.length;
  pages.forEach((entry, index) => {
    const number = index + 1;
    entry.page.dataset.page = String(number);
    if (entry.kind === "cover") return;

    const head = document.createElement("div");
    head.className = "run-head";
    const left = document.createElement("span");
    left.className = "rh-left";
    left.textContent = `${meta.number} · ${meta.title}`;
    const right = document.createElement("span");
    right.className = "rh-right";
    right.textContent = entry.section || "Contents";
    head.append(left, right);
    entry.page.appendChild(head);

    const foot = document.createElement("div");
    foot.className = "run-foot";
    const footLeft = document.createElement("span");
    footLeft.textContent = "Rishav Prasad · rishavprasad.in";
    const footRight = document.createElement("span");
    footRight.className = "pg";
    footRight.textContent = `Page ${number} of ${total}`;
    foot.append(footLeft, footRight);
    entry.page.appendChild(foot);
  });

  // Headers on pages without their own h2 inherit the previous section.
  let carried = "Contents";
  pages.forEach((entry) => {
    if (entry.kind === "cover" || entry.kind === "toc-page") {
      carried = "Contents";
      return;
    }
    if (entry.section) carried = entry.section;
    const right = entry.page.querySelector(".rh-right");
    if (right) right.textContent = carried;
  });

  document.querySelectorAll(".toc-row .p").forEach((span) => {
    const target = sectionPages.get(span.dataset.for);
    span.textContent = target ? String(target) : "—";
  });

  document.documentElement.dataset.pages = String(total);
  return { pages: total, sections: headings.length, cover: 1, toc: tocCount };
};
