const form = document.getElementById("query-form");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const template = document.getElementById("card-template");

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
  for (let i = 0; i < count; i += 1) {
    const block = document.createElement("div");
    block.className = "skeleton";
    resultsEl.appendChild(block);
  }
}

function createBadge(text) {
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = text;
  return span;
}

function renderCards(products = [], elapsedMs = 0) {
  resultsEl.innerHTML = "";

  if (!products.length) {
    statusEl.textContent = "No products found for this query.";
    return;
  }

  statusEl.textContent = `Showing ${products.length} products. Response time: ${elapsedMs.toFixed(2)} ms.`;

  products.forEach((item, idx) => {
    const node = template.content.cloneNode(true);

    const img = node.querySelector(".thumb");
    img.src = item.product_image_url || "";
    img.onerror = () => {
      img.src = "https://via.placeholder.com/320x240?text=No+Image";
    };

    node.querySelector(".rank-chip").textContent = `#${idx + 1}`;
    node.querySelector(".title").textContent = textOr(item.product_title, "Untitled product");
    node.querySelector(".price").textContent = toCurrency(item.discounted_price);

    const original = node.querySelector(".original");
    if (Number(item.original_price) > Number(item.discounted_price)) {
      original.textContent = toCurrency(item.original_price);
    } else {
      original.textContent = "";
    }

    const rating = textOr(item.product_rating, "-");
    const reviews = Number.isFinite(Number(item.total_reviews))
      ? `${Number(item.total_reviews).toLocaleString()} reviews`
      : "No reviews";

    node.querySelector(".meta").textContent = `Rating: ${rating} | ${reviews} | ${textOr(item.product_category, "Uncategorized")}`;

    const badgeWrap = node.querySelector(".badges");
    if (item.is_best_seller && item.is_best_seller !== "No Badge") {
      badgeWrap.appendChild(createBadge(item.is_best_seller));
    }
    if (item.is_sponsored) {
      badgeWrap.appendChild(createBadge(item.is_sponsored));
    }
    if (item.has_coupon && item.has_coupon !== "No Coupon") {
      badgeWrap.appendChild(createBadge(item.has_coupon));
    }
    if (Number(item.discount_percentage) > 0) {
      badgeWrap.appendChild(createBadge(`${Number(item.discount_percentage).toFixed(1)}% off`));
    }

    const link = node.querySelector(".link");
    link.href = item.product_page_url || "#";

    resultsEl.appendChild(node);
  });
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    strategy: document.getElementById("strategy").value,
    algorithm: document.getElementById("algorithm").value,
    k: Number(document.getElementById("k").value),
  };

  statusEl.textContent = "Loading ranked products...";
  renderSkeleton(Math.min(payload.k, 10));

  try {
    const data = await fetchRankedProducts(payload);
    renderCards(data.ranked_products, Number(data.elapsed_time_ms || 0));
  } catch (error) {
    resultsEl.innerHTML = "";
    statusEl.textContent = `Error: ${error.message}`;
  }
});

form.dispatchEvent(new Event("submit"));
