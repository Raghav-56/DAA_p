const form = document.getElementById("query-form");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("query-summary");
const template = document.getElementById("card-template");
const modeSwitch = document.querySelector(".view-modes");
const densitySwitch = document.querySelector(".density-switch");
const searchInput = document.getElementById("search-input");
const chipsEl = document.getElementById("category-chips");
const compareToggleBtn = document.getElementById("compare-toggle");
const clearSelectionBtn = document.getElementById("clear-selection");
const comparePanel = document.getElementById("compare-panel");
const compareSummaryEl = document.getElementById("compare-summary");
const compareResultsEl = document.getElementById("compare-results");

const VIEW_MODES = ["grid", "list", "table"];
const DENSITY_MODES = ["comfortable", "compact"];
const MAX_COMPARE_ITEMS = 4;

const state = {
  products: [],
  elapsedMs: 0,
  lastPayload: null,
  viewMode: localStorage.getItem("rankViewMode") || "grid",
  densityMode: localStorage.getItem("rankDensityMode") || "comfortable",
  searchText: "",
  activeCategory: "all",
  selectedKeys: new Set(),
  compareOpen: false,
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function toCurrency(value) {
  return Number.isFinite(Number(value)) ? money.format(Number(value)) : "N/A";
}

function textOr(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function renderSkeleton(count = 8) {
  resultsEl.innerHTML = "";
  comparePanel.classList.add("is-hidden");
  for (let i = 0; i < count; i += 1) {
    const block = document.createElement("div");
    block.className = "skeleton";
    resultsEl.appendChild(block);
  }
}

function applyViewModeClass(mode) {
  const validMode = VIEW_MODES.includes(mode) ? mode : "grid";
  state.viewMode = validMode;

  resultsEl.className = `results results-${validMode}`;
  const modeButtons = document.querySelectorAll(".mode-btn");
  modeButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === validMode);
  });

  localStorage.setItem("rankViewMode", validMode);
}

function applyDensityMode(mode) {
  const validMode = DENSITY_MODES.includes(mode) ? mode : "comfortable";
  state.densityMode = validMode;

  document.body.classList.toggle("density-compact", validMode === "compact");
  const buttons = document.querySelectorAll(".density-btn");
  buttons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.density === validMode);
  });

  localStorage.setItem("rankDensityMode", validMode);
}

function createBadge(text) {
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = text;
  return span;
}

function badgesForProduct(item) {
  const badges = [];
  if (item.is_best_seller && item.is_best_seller !== "No Badge") {
    badges.push(item.is_best_seller);
  }
  if (item.is_sponsored) {
    badges.push(item.is_sponsored);
  }
  if (item.has_coupon && item.has_coupon !== "No Coupon") {
    badges.push(item.has_coupon);
  }
  if (Number(item.discount_percentage) > 0) {
    badges.push(`${Number(item.discount_percentage).toFixed(1)}% off`);
  }
  return badges;
}

function productMeta(item) {
  const rating = textOr(item.product_rating, "-");
  const reviews = Number.isFinite(Number(item.total_reviews))
    ? `${Number(item.total_reviews).toLocaleString()} reviews`
    : "No reviews";
  return `Rating: ${rating} | ${reviews} | ${textOr(item.product_category, "Uncategorized")}`;
}

function openLinkFromItem(item) {
  return item.product_page_url || "#";
}

function truncateText(value, maxChars) {
  const text = textOr(value, "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "Untitled product";
  }
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(8, maxChars - 1)).trimEnd()}...`;
}

function isCompactDensity() {
  return state.densityMode === "compact";
}

function compactTitle(item, maxChars) {
  if (!isCompactDensity()) {
    return textOr(item.product_title, "Untitled product");
  }
  return truncateText(item.product_title, maxChars);
}

function metaTextForDensity(item) {
  const rating = textOr(item.product_rating, "-");

  if (isCompactDensity()) {
    return `Rating: ${rating}`;
  }

  return productMeta(item);
}

function badgesForDensity(item) {
  const badges = badgesForProduct(item);
  if (!isCompactDensity()) {
    return badges;
  }
  return badges.slice(0, 1);
}

function productKey(item, idx) {
  return textOr(item.__key, `row-${idx}`);
}

function isSelected(item, idx) {
  return state.selectedKeys.has(productKey(item, idx));
}

function categoriesFromProducts() {
  return [...new Set(
    state.products
      .map((item) => textOr(item.product_category, "Uncategorized"))
      .filter((name) => name && name.trim().length > 0),
  )].sort((a, b) => a.localeCompare(b));
}

function ensureActiveCategory() {
  if (state.activeCategory === "all") {
    return;
  }

  const categories = categoriesFromProducts();
  if (!categories.includes(state.activeCategory)) {
    state.activeCategory = "all";
  }
}

function renderCategoryChips() {
  chipsEl.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "chip-btn";
  allChip.dataset.category = "all";
  allChip.textContent = "All categories";
  allChip.classList.toggle("is-active", state.activeCategory === "all");
  chipsEl.appendChild(allChip);

  categoriesFromProducts().forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip-btn";
    chip.dataset.category = category;
    chip.textContent = category;
    chip.classList.toggle("is-active", state.activeCategory === category);
    chipsEl.appendChild(chip);
  });
}

function filteredProducts() {
  const needle = state.searchText.trim().toLowerCase();

  return state.products.filter((item) => {
    const itemCategory = textOr(item.product_category, "Uncategorized");
    const categoryMatch = state.activeCategory === "all" || itemCategory === state.activeCategory;

    if (!categoryMatch) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const haystack = `${textOr(item.product_title, "")}
      ${itemCategory}
      ${textOr(item.is_best_seller, "")}
      ${textOr(item.is_sponsored, "")}`.toLowerCase();

    return haystack.includes(needle);
  });
}

function selectedProducts() {
  return state.products.filter((item, idx) => state.selectedKeys.has(productKey(item, idx)));
}

function renderComparePanel() {
  const selected = selectedProducts();

  if (selected.length < 2) {
    state.compareOpen = false;
  }

  const compareActionLabel = state.compareOpen ? "Hide Compare" : "Compare Selected";
  compareToggleBtn.textContent = `${compareActionLabel} (${selected.length})`;
  clearSelectionBtn.disabled = selected.length === 0;
  compareToggleBtn.disabled = selected.length < 2;

  if (!state.compareOpen || selected.length < 2) {
    comparePanel.classList.add("is-hidden");
    compareSummaryEl.textContent = "Select 2 to 4 products from results to compare.";
    compareResultsEl.innerHTML = "";
    return;
  }

  comparePanel.classList.remove("is-hidden");
  compareSummaryEl.textContent = `Comparing ${selected.length} selected products.`;

  const table = document.createElement("table");
  table.className = "compare-table";

  const rows = [
    {
      name: "Product",
      values: selected.map((item) => textOr(item.product_title, "Untitled product")),
      className: "compare-title",
    },
    {
      name: "Price",
      values: selected.map((item) => toCurrency(item.discounted_price)),
      className: "table-price",
    },
    {
      name: "Rating",
      values: selected.map((item) => textOr(item.product_rating, "-")),
    },
    {
      name: "Reviews",
      values: selected.map((item) => (
        Number.isFinite(Number(item.total_reviews))
          ? Number(item.total_reviews).toLocaleString()
          : "-"
      )),
    },
    {
      name: "Category",
      values: selected.map((item) => textOr(item.product_category, "-")),
    },
    {
      name: "Badges",
      values: selected.map((item) => {
        const badges = badgesForProduct(item);
        return badges.length ? badges.join(" | ") : "-";
      }),
    },
    {
      name: "Link",
      values: selected.map((item) => openLinkFromItem(item)),
      isLinkRow: true,
    },
  ];

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.textContent = row.name;
    tr.appendChild(th);

    row.values.forEach((value) => {
      const td = document.createElement("td");

      if (row.className) {
        td.classList.add(row.className);
      }

      if (row.isLinkRow) {
        const link = document.createElement("a");
        link.className = "link";
        link.href = value;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open product";
        td.appendChild(link);
      } else {
        td.textContent = value;
      }

      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  compareResultsEl.innerHTML = "";
  compareResultsEl.appendChild(table);
}

function updateSelectionState(key, shouldSelect) {
  if (!key) {
    return true;
  }

  if (shouldSelect) {
    if (state.selectedKeys.size >= MAX_COMPARE_ITEMS && !state.selectedKeys.has(key)) {
      statusEl.textContent = `Select up to ${MAX_COMPARE_ITEMS} products for compare.`;
      return false;
    }
    state.selectedKeys.add(key);
  } else {
    state.selectedKeys.delete(key);
  }

  renderComparePanel();
  return true;
}

function renderGrid(products) {
  products.forEach((item, idx) => {
    const node = template.content.cloneNode(true);
    const key = productKey(item, idx);

    const img = node.querySelector(".thumb");
    img.src = item.product_image_url || "";
    img.onerror = () => {
      img.src = "https://via.placeholder.com/320x240?text=No+Image";
    };

    const compareCheck = node.querySelector(".compare-check");
    compareCheck.dataset.productKey = key;
    compareCheck.checked = isSelected(item, idx);

    node.querySelector(".rank-chip").textContent = `#${idx + 1}`;
    node.querySelector(".title").textContent = compactTitle(item, 56);
    node.querySelector(".price").textContent = toCurrency(item.discounted_price);

    const original = node.querySelector(".original");
    if (Number(item.original_price) > Number(item.discounted_price)) {
      original.textContent = toCurrency(item.original_price);
    } else {
      original.textContent = "";
    }

    node.querySelector(".meta").textContent = metaTextForDensity(item);

    const badgeWrap = node.querySelector(".badges");
    badgesForDensity(item).forEach((badge) => {
      badgeWrap.appendChild(createBadge(badge));
    });

    const link = node.querySelector(".link");
    link.href = openLinkFromItem(item);

    const card = node.querySelector(".card");
    card.classList.toggle("is-selected", isSelected(item, idx));

    resultsEl.appendChild(node);
  });
}

function renderList(products) {
  products.forEach((item, idx) => {
    const key = productKey(item, idx);
    const row = document.createElement("article");
    row.className = "list-item";
    row.classList.toggle("is-selected", isSelected(item, idx));

    const rank = document.createElement("span");
    rank.className = "list-rank";
    rank.textContent = `#${idx + 1}`;

    const listSelect = document.createElement("label");
    listSelect.className = "list-select";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "compare-check";
    check.dataset.productKey = key;
    check.checked = isSelected(item, idx);

    const checkLabel = document.createElement("span");
    checkLabel.textContent = "Select";

    listSelect.append(check, checkLabel);

    const thumb = document.createElement("img");
    thumb.className = "list-thumb";
    thumb.loading = "lazy";
    thumb.alt = "Product image";
    thumb.src = item.product_image_url || "";
    thumb.onerror = () => {
      thumb.src = "https://via.placeholder.com/320x240?text=No+Image";
    };

    const main = document.createElement("div");
    main.className = "list-main";

    const title = document.createElement("h3");
    title.className = "list-title";
    title.textContent = compactTitle(item, 64);

    const meta = document.createElement("p");
    meta.className = "list-meta";
    meta.textContent = metaTextForDensity(item);

    const badges = document.createElement("div");
    badges.className = "badges";
    badgesForDensity(item).forEach((badge) => {
      badges.appendChild(createBadge(badge));
    });

    main.append(title, meta, badges);

    const side = document.createElement("div");
    side.className = "list-side";

    const price = document.createElement("p");
    price.className = "list-price";
    price.textContent = toCurrency(item.discounted_price);

    const original = document.createElement("p");
    original.className = "list-original";
    original.textContent = Number(item.original_price) > Number(item.discounted_price)
      ? toCurrency(item.original_price)
      : "";

    const link = document.createElement("a");
    link.className = "link";
    link.href = openLinkFromItem(item);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open product";

    side.append(price, original, link);

    row.append(rank, listSelect, thumb, main, side);
    resultsEl.appendChild(row);
  });
}

function renderTable(products) {
  const wrapper = document.createElement("div");
  wrapper.className = "results-table";

  const table = document.createElement("table");
  table.className = "result-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Select</th>
      <th>Product</th>
      <th>Category</th>
      <th>Price</th>
      <th>Rating</th>
      <th>Reviews</th>
      <th>Badges</th>
      <th>Link</th>
    </tr>
  `;

  const tbody = document.createElement("tbody");
  products.forEach((item, idx) => {
    const key = productKey(item, idx);
    const tr = document.createElement("tr");
    tr.classList.toggle("is-selected", isSelected(item, idx));

    const reviews = Number.isFinite(Number(item.total_reviews))
      ? Number(item.total_reviews).toLocaleString()
      : "-";

    const badges = badgesForProduct(item);
    const badgeText = badges.length ? badges.join(" | ") : "-";

    const titleCell = document.createElement("td");
    titleCell.className = "table-product";
    const titleLink = document.createElement("a");
    titleLink.href = openLinkFromItem(item);
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.textContent = compactTitle(item, 72);
    titleCell.appendChild(titleLink);

    const selectCell = document.createElement("td");
    selectCell.className = "table-select";
    const selectLabel = document.createElement("label");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "compare-check";
    check.dataset.productKey = key;
    check.checked = isSelected(item, idx);
    const selectText = document.createElement("span");
    selectText.textContent = "Select";
    selectLabel.append(check, selectText);
    selectCell.appendChild(selectLabel);

    const cells = [
      `#${idx + 1}`,
      null,
      null,
      textOr(item.product_category, "-"),
      toCurrency(item.discounted_price),
      textOr(item.product_rating, "-"),
      reviews,
      badgeText,
      "Open",
    ];

    cells.forEach((cellValue, cellIndex) => {
      if (cellIndex === 1) {
        tr.appendChild(selectCell);
        return;
      }

      if (cellIndex === 2) {
        tr.appendChild(titleCell);
        return;
      }

      const td = document.createElement("td");
      if (cellIndex === 3) {
        td.className = "table-price";
      }

      if (cellIndex === 7) {
        const link = document.createElement("a");
        link.className = "link";
        link.href = openLinkFromItem(item);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open product";
        td.appendChild(link);
      } else {
        td.textContent = cellValue;
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.append(thead, tbody);
  wrapper.appendChild(table);
  resultsEl.appendChild(wrapper);
}

function updateSummary(payload) {
  if (!payload) {
    summaryEl.textContent = "Query: not run yet";
    return;
  }

  summaryEl.textContent = `Query: ${payload.strategy} | ${payload.algorithm} | top ${payload.k}`;
}

function renderResults() {
  resultsEl.innerHTML = "";
  applyViewModeClass(state.viewMode);
  applyDensityMode(state.densityMode);
  ensureActiveCategory();
  renderCategoryChips();

  if (!state.products.length) {
    statusEl.textContent = "No products found for this query.";
    renderComparePanel();
    return;
  }

  const visibleProducts = filteredProducts();
  if (!visibleProducts.length) {
    statusEl.textContent = `No products match your filters. Loaded ${state.products.length} products.`;
    renderComparePanel();
    return;
  }

  statusEl.textContent = `Showing ${visibleProducts.length} of ${state.products.length} products. Response time: ${state.elapsedMs.toFixed(2)} ms.`;

  if (state.viewMode === "list") {
    renderList(visibleProducts);
    renderComparePanel();
    return;
  }

  if (state.viewMode === "table") {
    renderTable(visibleProducts);
    renderComparePanel();
    return;
  }

  renderGrid(visibleProducts);
  renderComparePanel();
}

async function fetchRankedProducts(payload) {
  const response = await fetch("/rank/rows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

if (modeSwitch) {
  modeSwitch.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const btn = target.closest(".mode-btn");
    if (!(btn instanceof HTMLElement)) {
      return;
    }

    applyViewModeClass(btn.dataset.view || "grid");
    if (state.products.length) {
      renderResults();
    }
  });
}

if (densitySwitch) {
  densitySwitch.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const btn = target.closest(".density-btn");
    if (!(btn instanceof HTMLElement)) {
      return;
    }

    applyDensityMode(btn.dataset.density || "comfortable");
    if (state.products.length) {
      renderResults();
    }
  });
}

if (chipsEl) {
  chipsEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const chip = target.closest(".chip-btn");
    if (!(chip instanceof HTMLElement)) {
      return;
    }

    state.activeCategory = chip.dataset.category || "all";
    renderResults();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    state.searchText = searchInput.value || "";
    renderResults();
  });
}

if (resultsEl) {
  resultsEl.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (!target.classList.contains("compare-check")) {
      return;
    }

    const ok = updateSelectionState(target.dataset.productKey, target.checked);
    if (!ok) {
      target.checked = false;
      return;
    }

    renderResults();
  });
}

if (compareToggleBtn) {
  compareToggleBtn.addEventListener("click", () => {
    if (selectedProducts().length < 2) {
      return;
    }

    state.compareOpen = !state.compareOpen;
    renderComparePanel();

    if (state.compareOpen) {
      comparePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (clearSelectionBtn) {
  clearSelectionBtn.addEventListener("click", () => {
    state.selectedKeys.clear();
    state.compareOpen = false;
    renderResults();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    strategy: document.getElementById("strategy").value,
    algorithm: document.getElementById("algorithm").value,
    k: Number(document.getElementById("k").value),
  };

  state.lastPayload = payload;
  updateSummary(payload);

  statusEl.textContent = "Loading ranked products...";
  applyViewModeClass(state.viewMode);
  applyDensityMode(state.densityMode);
  renderSkeleton(Math.min(payload.k, 10));

  try {
    const data = await fetchRankedProducts(payload);
    state.products = (data.ranked_products || []).map((item, idx) => ({
      ...item,
      __key: `${textOr(item.product_id, "prod")}-${idx}`,
    }));
    state.elapsedMs = Number(data.elapsed_time_ms || 0);
    state.selectedKeys.clear();
    state.compareOpen = false;
    renderResults();
  } catch (error) {
    resultsEl.innerHTML = "";
    state.products = [];
    statusEl.textContent = `Error: ${error.message}`;
  }
});

applyViewModeClass(state.viewMode);
applyDensityMode(state.densityMode);
renderCategoryChips();
renderComparePanel();
updateSummary(state.lastPayload);
form.dispatchEvent(new Event("submit"));
