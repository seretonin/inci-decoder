// Keep track of extension state
const state = {
  active: true,
  loading: true,
  productFound: false,
  isDecodedFallback: false,
  brand: "",
  productName: "",
  rawIngredients: "",
  parsedData: null,
  theme: "light", // 'light' or 'dark'
  originalUrl: "https://incidecoder.com"
};

// SVG Icons
const icons = {
  leaf: `<svg viewBox="0 0 24 24"><path d="M17,8C8,8,4,16,4,16C4,16,8,9,17,9C20,9,21,11,21,11C21,11,21,8,17,8M16,11C9,11,6,17,6,17C6,17,10,12,16,12C18.5,12,19.5,13.5,19.5,13.5C19.5,13.5,19.5,11,16,11M15,14C10.3,14,8,18,8,18C8,18,11.3,15,15,15C17,15,18,16,18,16C18,16,18,14,15,14M2,22C2,22,3,18,7,15C5,13,4,10,4,7C4,3,7.5,2,7.5,2C7.5,2,8,5.5,6,8.5C9,7,12,7.5,14.5,9C16.8,7.3,19.5,7,19.5,7C19.5,7,19,9.5,17,11.5C19,13.5,20,17.5,20,17.5C20,17.5,16,17.5,13,15.5C11,18,7,21.5,2,22Z" /></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>`,
  themeLight: `<svg viewBox="0 0 24 24"><path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" /></svg>`,
  themeDark: `<svg viewBox="0 0 24 24"><path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" /></svg>`,
  search: `<svg viewBox="0 0 24 24"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1  3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>`,
  externalLink: `<svg viewBox="0 0 24 24"><path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" /></svg>`
};

// Unescape HTML entities (e.g. &amp; -> &)
function unescapeHTML(str) {
  if (!str) return "";
  const temp = document.createElement("div");
  temp.innerHTML = str;
  return temp.textContent || temp.innerText || "";
}

// Check if page contains Shopify metadata or matches product URL
function isProductPage() {
  return window.location.pathname.includes("/products/") || !!document.querySelector('meta[property="og:type"][content="product"]');
}

// Extract product details from Lila Beauty DOM
function getProductDetails() {
  let brand = "";
  let name = "";
  
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const scriptText = script.innerText.trim();
      if (!scriptText) continue;
      
      const json = JSON.parse(scriptText);
      const findProduct = (obj) => {
        if (!obj) return null;
        if (obj['@type'] === 'Product') return obj;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const res = findProduct(item);
            if (res) return res;
          }
        }
        if (typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            const res = findProduct(obj[key]);
            if (res) return res;
          }
        }
        return null;
      };
      
      const product = findProduct(json);
      if (product) {
        if (product.brand) {
          brand = typeof product.brand === 'object' ? product.brand.name : product.brand;
        }
        name = product.name;
        break;
      }
    }
  } catch (e) {
    console.warn("Ld+json parsing failed, falling back to document metadata.", e);
  }

  // Fallbacks
  if (!brand) {
    const vendorEl = document.querySelector('.ProductMeta__Vendor, a[href*="/collections/vendors"], [class*="vendor"], [class*="brand"]');
    brand = vendorEl ? vendorEl.innerText.trim() : "";
  }
  
  if (!brand) {
    const siteMeta = document.querySelector('meta[property="og:site_name"]');
    if (siteMeta && siteMeta.content !== "Lila Beauty") {
      brand = siteMeta.content;
    }
  }

  if (!name) {
    const titleMeta = document.querySelector('meta[property="og:title"]');
    name = titleMeta ? titleMeta.content : document.title;
  }

  // Unescape brand and name first (e.g. "Geek &amp; Gorgeous" -> "Geek & Gorgeous")
  brand = unescapeHTML(brand);
  name = unescapeHTML(name);

  // Clean name format if it contains shop descriptions
  if (name) {
    name = name.replace(/^Buy\s+/i, '')
               .replace(/\s+Australia\s*-\s*Korean\s+Skin\s+Care$/i, '')
               .replace(/\s+Australia$/i, '')
               .trim();
  }

  // Clean volume tags and special characters from cleanName
  let cleanName = name;
  if (cleanName) {
    cleanName = cleanName.replace(/\b\d+(g|ml|oz|pcs|pack|pieces)\b/gi, '').trim();
    if (brand && cleanName.toLowerCase().startsWith(brand.toLowerCase())) {
      cleanName = cleanName.substring(brand.length).trim();
    }
    // Clean brackets and hashtags, but keep & symbol
    cleanName = cleanName.replace(/[#|\\/|(|)|[|\]]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return {
    brand: brand || "Unknown Brand",
    productName: name || "Unknown Product",
    cleanQuery: cleanName ? `${brand} ${cleanName}`.trim() : name
  };
}

// Extract ingredients list from metadata description
function getRawIngredients() {
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  if (twitterDesc) {
    const desc = twitterDesc.content;
    const match = desc.match(/INGREDIENTS:?\s*([^]+?)(?=\s+(HOW TO USE|DESCRIPTION|Cautions|Directions|HOW TO|Directions|Caution|$))/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    const desc = ogDesc.content;
    const match = desc.match(/INGREDIENTS:?\s*([^]+?)(?=\s+(HOW TO USE|DESCRIPTION|Cautions|Directions|HOW TO|Directions|Caution|$))/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const descEl = document.querySelector('.ProductMeta__Description, .Product__Description, .product-description, [class*="description"]');
  if (descEl) {
    const text = descEl.innerText;
    const match = text.match(/INGREDIENTS:?\s*[\r\n]+([\s\S]+?)(?=HOW TO USE|DIRECTIONS|CAUTION|CAUTIONS|HOW|$)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

// Injects base structural CSS + elements
function injectSidebarMarkup() {
  if (document.getElementById("inci-decoder-sidebar")) return;

  // Sidebar container (active by default)
  const sidebar = document.createElement("div");
  sidebar.id = "inci-decoder-sidebar";
  sidebar.className = `theme-${state.theme} active`;
  
  // Base shell
  sidebar.innerHTML = `
    <div class="inci-header">
      <div class="inci-header-title">
        <span class="inci-brand" id="inci-header-brand">SCANNING</span>
        <span class="inci-title" id="inci-header-name">Initializing decoder...</span>
      </div>
      <div class="inci-header-actions">
        <button class="inci-btn-icon" id="inci-btn-theme" title="Toggle Light/Dark Theme">
          ${state.theme === 'light' ? icons.themeLight : icons.themeDark}
        </button>
        <button class="inci-btn-icon" id="inci-btn-close" title="Close Panel">
          ${icons.close}
        </button>
      </div>
    </div>
    <div class="inci-content" id="inci-sidebar-content">
      <div class="inci-loading-container">
        <div class="inci-spinner"></div>
        <div class="inci-loading-text" id="inci-loading-status">Scanning product details...</div>
      </div>
    </div>
    <div class="inci-footer">
      <a href="https://incidecoder.com" target="_blank" class="inci-original-link" id="inci-outlink-btn">
        View on INCIDecoder
        ${icons.externalLink}
      </a>
      <div class="inci-search-box">
        <input type="text" class="inci-search-input" id="inci-manual-query" placeholder="Search another product...">
        <button class="inci-search-btn" id="inci-manual-search" title="Search">
          ${icons.search}
        </button>
      </div>
      <div class="inci-source-indicator" id="inci-source-text">Data source: INCIDecoder.com</div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Event Listeners
  document.getElementById("inci-btn-close").addEventListener("click", toggleSidebar);
  
  document.getElementById("inci-btn-theme").addEventListener("click", () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    chrome.storage.local.set({ theme: state.theme });
    
    sidebar.className = `theme-${state.theme} active`;
    document.getElementById("inci-btn-theme").innerHTML = state.theme === 'light' ? icons.themeLight : icons.themeDark;
  });

  // Manual search handlers
  const handleManualSearch = () => {
    const input = document.getElementById("inci-manual-query");
    const query = input.value.trim();
    if (query) {
      input.value = "";
      triggerSearch(query);
    }
  };

  document.getElementById("inci-manual-search").addEventListener("click", handleManualSearch);
  document.getElementById("inci-manual-query").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleManualSearch();
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById("inci-decoder-sidebar");
  const trigger = document.getElementById("inci-decoder-trigger");
  
  state.active = !state.active;
  
  if (state.active) {
    sidebar.classList.add("active");
    if (trigger) {
      trigger.classList.add("active");
      trigger.classList.remove("pulse");
    }
  } else {
    sidebar.classList.remove("active");
    if (trigger) {
      trigger.classList.remove("active");
    }
  }
}

// Update header text in sidebar
function updateSidebarHeader(brand, name) {
  document.getElementById("inci-header-brand").innerText = brand || "SCANNING";
  document.getElementById("inci-header-name").innerText = name || "Loading...";
  document.getElementById("inci-header-name").title = name || "";
}

// Update loading text
function updateLoadingStatus(text) {
  const statusEl = document.getElementById("inci-loading-status");
  if (statusEl) statusEl.innerText = text;
}

// Parse ingredients page HTML
function parseIngredientsHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // 1. Extract hashtags (highlights)
  const hashtags = [];
  doc.querySelectorAll(".hashtags .hashtag").forEach(el => {
    hashtags.push(el.innerText.trim());
  });

  // 2. Extract key ingredients by function
  const keyIngredients = [];
  doc.querySelectorAll(".ingredlist-by-function-block").forEach(block => {
    const titleEl = block.querySelector("h3");
    const category = titleEl ? titleEl.innerText.trim() : "Highlights";
    const items = [];
    
    block.querySelectorAll("div").forEach(div => {
      const funcEl = div.querySelector(".func-link");
      const func = funcEl ? funcEl.innerText.trim() : "";
      
      const ingLinks = div.querySelectorAll("a.ingred-link");
      const ingNames = Array.from(ingLinks).map(a => a.innerText.trim());
      
      if (func && ingNames.length > 0) {
        items.push({ function: func, names: ingNames });
      }
    });

    if (items.length > 0) {
      keyIngredients.push({ category, items });
    }
  });

  // 3. Extract tooltips from templates
  const tooltips = {};
  const tooltipSpans = doc.querySelectorAll(".tooltip_templates [id^='tt-']");
  tooltipSpans.forEach(span => {
    const id = span.id.substring(3); // Remove 'tt-' prefix
    const textEl = span.querySelector(".ingred-tooltip-text");
    let text = textEl ? textEl.innerHTML : "";
    // Clean relative URLs in links to absolute INCIDecoder URLs
    text = text.replace(/href="\//g, 'href="https://incidecoder.com/');
    tooltips[id] = text;
  });

  // 4. Extract table rows
  const ingredients = [];
  const rows = doc.querySelectorAll("table.product-skim tbody tr");
  
  rows.forEach(row => {
    const tds = row.querySelectorAll("td");
    if (tds.length >= 2) {
      const nameLink = tds[0].querySelector("a.ingred-detail-link");
      const name = nameLink ? nameLink.innerText.trim() : tds[0].innerText.trim();
      
      let slug = "";
      if (nameLink) {
        const href = nameLink.getAttribute("href");
        slug = href.split("/").pop();
      } else {
        slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      }

      // Functions
      const functions = [];
      tds[1].querySelectorAll("a.ingred-function-link").forEach(a => {
        functions.push(a.innerText.trim());
      });
      const functionText = functions.length > 0 ? functions.join(", ") : tds[1].innerText.trim();

      // Irritancy & Comedogenicity
      let irritancy = "-";
      let comedogenicity = "-";
      if (tds.length >= 3) {
        const irrncomEl = tds[2].querySelector(".irrncom");
        if (irrncomEl) {
          const titleText = irrncomEl.innerText.trim();
          const parts = titleText.split(",");
          if (parts.length >= 1) irritancy = parts[0].trim();
          if (parts.length >= 2) comedogenicity = parts[1].trim();
        }
      }

      // Rating
      let rating = "";
      if (tds.length >= 4) {
        const ratingEl = tds[3].querySelector(".our-take");
        if (ratingEl) {
          if (ratingEl.classList.contains("our-take-superstar")) rating = "superstar";
          else if (ratingEl.classList.contains("our-take-goodie")) rating = "goodie";
          else if (ratingEl.classList.contains("our-take-icky")) rating = "icky";
          else rating = ratingEl.innerText.trim().toLowerCase();
        }
      }

      const description = tooltips[slug] || "No detailed description available.";

      ingredients.push({
        name,
        slug,
        function: functionText,
        irritancy,
        comedogenicity,
        rating,
        description
      });
    }
  });

  return { hashtags, keyIngredients, ingredients };
}

// Render data onto sidebar
function renderSidebarData() {
  const container = document.getElementById("inci-sidebar-content");
  if (!container || !state.parsedData) return;

  const data = state.parsedData;

  // Compute stats
  let superstarCount = 0;
  let goodieCount = 0;
  let ickyCount = 0;
  let warningsCount = 0; // count comedogenicity > 2 or irritancy > 1 or icky rating

  data.ingredients.forEach(ing => {
    if (ing.rating === "superstar") superstarCount++;
    else if (ing.rating === "goodie") goodieCount++;
    else if (ing.rating === "icky") ickyCount++;

    const irrVal = parseInt(ing.irritancy);
    const comVal = parseInt(ing.comedogenicity);
    if ((!isNaN(irrVal) && irrVal > 1) || (!isNaN(comVal) && comVal >= 2) || ing.rating === "icky") {
      warningsCount++;
    }
  });

  // Update Badge trigger counter if ickies exist
  const trigger = document.getElementById("inci-decoder-trigger");
  if (trigger) {
    // Remove old badge
    const oldBadge = trigger.querySelector(".badge-count");
    if (oldBadge) oldBadge.remove();

    if (ickyCount > 0 || warningsCount > 0) {
      const badge = document.createElement("span");
      badge.className = "badge-count warn";
      badge.innerText = ickyCount > 0 ? ickyCount : warningsCount;
      trigger.appendChild(badge);
    } else if (superstarCount > 0) {
      const badge = document.createElement("span");
      badge.className = "badge-count";
      badge.innerText = superstarCount;
      trigger.appendChild(badge);
    }
  }

  // Set up button link
  const linkBtn = document.getElementById("inci-outlink-btn");
  linkBtn.href = state.originalUrl;
  linkBtn.style.display = "flex";

  let htmlMarkup = "";

  // 1. Stats Grid (acting as filters)
  htmlMarkup += `
    <div class="inci-summary-grid">
      <div class="inci-summary-card superstar" data-filter="superstar" title="Superstar Ingredients (Highly rated, science backed benefits)">
        <span class="inci-summary-val">${superstarCount}</span>
        <span class="inci-summary-label">Superstars ⭐</span>
      </div>
      <div class="inci-summary-card goodie" data-filter="goodie" title="Goodie Ingredients (Healthy, nourishing elements)">
        <span class="inci-summary-val">${goodieCount}</span>
        <span class="inci-summary-label">Goodies 🍃</span>
      </div>
      <div class="inci-summary-card icky" data-filter="icky" title="Icky Ingredients (Potentially irritating or undesirable ingredients)">
        <span class="inci-summary-val">${ickyCount}</span>
        <span class="inci-summary-label">Ickies ⚠️</span>
      </div>
      <div class="inci-summary-card warn" data-filter="warning" title="Ingredients with comedogenicity >= 2 or irritancy >= 2">
        <span class="inci-summary-val">${warningsCount}</span>
        <span class="inci-summary-label">Warnings 🚨</span>
      </div>
    </div>
  `;

  // 2. Hashtags
  if (data.hashtags && data.hashtags.length > 0) {
    htmlMarkup += `<div class="inci-hashtags">`;
    data.hashtags.forEach(tag => {
      htmlMarkup += `<span class="inci-hashtag">${tag}</span>`;
    });
    htmlMarkup += `</div>`;
  }

  // 3. Highlights Category Accordion
  if (data.keyIngredients && data.keyIngredients.length > 0) {
    htmlMarkup += `
      <div class="inci-section-title">Highlights Summary</div>
      <div class="inci-highlight-accordion">
    `;

    data.keyIngredients.forEach((group, index) => {
      const isFirst = index === 0;
      htmlMarkup += `
        <div class="inci-accordion-item ${isFirst ? 'active' : ''}">
          <div class="inci-accordion-header">
            <span>${group.category}</span>
            <svg class="inci-accordion-icon" viewBox="0 0 24 24"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></svg>
          </div>
          <div class="inci-accordion-content">
      `;

      group.items.forEach(row => {
        htmlMarkup += `
          <div class="inci-highlight-row">
            <div class="inci-highlight-func">${row.function}</div>
            <div class="inci-highlight-names">${row.names.join(", ")}</div>
          </div>
        `;
      });

      htmlMarkup += `
          </div>
        </div>
      `;
    });

    htmlMarkup += `</div>`;
  }

  // 4. Detailed Ingredient List
  htmlMarkup += `<div class="inci-section-title">Ingredients Skim-through</div>`;
  htmlMarkup += `<div class="inci-list">`;

  data.ingredients.forEach(ing => {
    // Determine rating badge
    let ratingSymbol = "";
    if (ing.rating === "superstar") ratingSymbol = "⭐";
    else if (ing.rating === "goodie") ratingSymbol = "🍃";
    else if (ing.rating === "icky") ratingSymbol = "⚠️";

    // Irritancy & Comedogenicity labels
    let statsLabels = "";
    const irrVal = parseInt(ing.irritancy);
    const comVal = parseInt(ing.comedogenicity);
    
    if (!isNaN(irrVal) && irrVal > 0) {
      statsLabels += `<span class="inci-stat-dot irr" title="Irritancy score: ${ing.irritancy}">Irr: ${ing.irritancy}</span>`;
    }
    if (!isNaN(comVal) && comVal > 0) {
      statsLabels += `<span class="inci-stat-dot com" title="Comedogenicity score: ${ing.comedogenicity}">Com: ${ing.comedogenicity}</span>`;
    }

    const isWarning = (!isNaN(irrVal) && irrVal > 1) || (!isNaN(comVal) && comVal >= 2) || ing.rating === "icky";

    htmlMarkup += `
      <div class="inci-list-item" id="ingred-card-${ing.slug}" data-rating="${ing.rating || ''}" data-warning="${isWarning}">
        <div class="inci-list-item-main">
          <div class="inci-ingred-info">
            <div class="inci-badge-rating ${ing.rating || 'none'}">${ratingSymbol}</div>
            <div class="inci-ingred-text">
              <span class="inci-ingred-name">${ing.name}</span>
              <span class="inci-ingred-func" title="${ing.function}">${ing.function || 'no function specified'}</span>
            </div>
          </div>
          <div class="inci-ingred-stats">
            ${statsLabels}
          </div>
        </div>
        <div class="inci-list-item-details">
          ${ing.description}
        </div>
      </div>
    `;
  });

  htmlMarkup += `</div>`;

  container.innerHTML = htmlMarkup;

  // Add click event listeners for filtering
  const summaryGrid = container.querySelector(".inci-summary-grid");
  const summaryCards = container.querySelectorAll(".inci-summary-card");
  const listItems = container.querySelectorAll(".inci-list-item");

  summaryCards.forEach(card => {
    card.addEventListener("click", () => {
      const filterType = card.getAttribute("data-filter");
      
      if (card.classList.contains("active-filter")) {
        // If clicked active card, disable filter
        card.classList.remove("active-filter");
        summaryGrid.classList.remove("filtering");
        
        listItems.forEach(item => item.classList.remove("filtered-out"));
      } else {
        // Activate filter
        summaryCards.forEach(c => c.classList.remove("active-filter"));
        card.classList.add("active-filter");
        summaryGrid.classList.add("filtering");
        
        listItems.forEach(item => {
          const rating = item.getAttribute("data-rating");
          const isWarning = item.getAttribute("data-warning") === "true";
          
          let matches = false;
          if (filterType === "superstar" && rating === "superstar") matches = true;
          else if (filterType === "goodie" && rating === "goodie") matches = true;
          else if (filterType === "icky" && rating === "icky") matches = true;
          else if (filterType === "warning" && isWarning) matches = true;
          
          if (matches) {
            item.classList.remove("filtered-out");
          } else {
            item.classList.add("filtered-out");
          }
        });
      }
    });
  });

  // Add click event listeners programmatically (CSP safe, avoids inline script blocks)
  container.querySelectorAll(".inci-accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      header.parentNode.classList.toggle("active");
    });
  });

  container.querySelectorAll(".inci-list-item-main").forEach(itemMain => {
    itemMain.addEventListener("click", () => {
      itemMain.parentNode.classList.toggle("expanded");
    });
  });

  // Update source text if it's fallback
  if (state.isDecodedFallback) {
    document.getElementById("inci-source-text").innerText = "Parsed fallback via INCIDecoder direct text scan";
    document.getElementById("inci-outlink-btn").style.display = "none";
  } else {
    document.getElementById("inci-source-text").innerText = "Data fetched directly from INCIDecoder database";
  }
}

// Display error message
function renderSidebarError(message) {
  const container = document.getElementById("inci-sidebar-content");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 10px; color: var(--text-secondary);">
      <div style="font-size: 40px; margin-bottom: 16px;">🔍</div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">Product Not Found</h3>
      <p style="font-size: 13px; margin: 0 0 20px; line-height: 1.4;">${message}</p>
      <button id="inci-btn-retry" style="background-color: var(--accent-color); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 13px;">
        Retry Scan
      </button>
    </div>
  `;

  document.getElementById("inci-btn-retry").addEventListener("click", startAnalysis);
}

// Fallback ingredients decoding
function startFallbackDecoding(ingredientsText) {
  updateLoadingStatus("Product not in database. Decoding raw ingredients list...");
  
  chrome.runtime.sendMessage({
    action: "decodeIngredients",
    ingredients: ingredientsText
  }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      console.error("Decoder failed:", chrome.runtime.lastError || response?.error);
      renderSidebarError("We couldn't search the product and the ingredients list could not be decoded. Please type manually in search bar below.");
      return;
    }

    try {
      const decodedHtml = response.data.result_html;
      state.parsedData = parseIngredientsHTML(decodedHtml);
      state.isDecodedFallback = true;
      renderSidebarData();
    } catch (e) {
      console.error("Error parsing decoded HTML:", e);
      renderSidebarError("Failed to parse the decoded ingredients data. Please try another product search.");
    }
  });
}

// Trigger Search for product query
function triggerSearch(query) {
  state.loading = true;
  state.isDecodedFallback = false;
  
  const container = document.getElementById("inci-sidebar-content");
  if (container) {
    container.innerHTML = `
      <div class="inci-loading-container">
        <div class="inci-spinner"></div>
        <div class="inci-loading-text" id="inci-loading-status">Searching INCIDecoder for "${query}"...</div>
      </div>
    `;
  }

  updateSidebarHeader("SEARCHING", query);

  chrome.runtime.sendMessage({
    action: "searchProduct",
    query: query
  }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      console.warn("Search failed:", chrome.runtime.lastError || response?.error);
      
      // Fallback directly to text decoding if we have ingredients
      if (state.rawIngredients) {
        startFallbackDecoding(state.rawIngredients);
      } else {
        renderSidebarError("Search query failed and no raw ingredients list was found on this page.");
      }
      return;
    }

    processSearchResponse(response);
  });
}

// Process search response
function processSearchResponse(response) {
  if (response.redirected) {
    // Exact match redirect
    try {
      state.originalUrl = response.url;
      state.parsedData = parseIngredientsHTML(response.html);
      state.productFound = true;
      
      // Update header with exact matched product name
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.html, "text/html");
      const titleEl = doc.querySelector("h1 div.klavikab, span#product-title");
      const brandEl = doc.querySelector("span#product-brand-title a");
      
      const parsedBrand = unescapeHTML(brandEl ? brandEl.innerText.trim() : state.brand);
      const parsedName = unescapeHTML(titleEl ? titleEl.innerText.trim() : state.productName);
      
      updateSidebarHeader(parsedBrand, parsedName);
      renderSidebarData();
    } catch (e) {
      console.error("Error parsing exact redirect page:", e);
      fallbackOrError();
    }
  } else {
    // Check if we have search results link
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.html, "text/html");
    
    // Find the first valid product link, avoiding system links like /products/create
    let firstResultLink = null;
    const links = doc.querySelectorAll("a.simpletextlistitem, a[href^='/products/']");
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && href !== "/products/create" && href !== "/products/new" && !link.classList.contains("topmenu")) {
        firstResultLink = link;
        break;
      }
    }
    
    if (firstResultLink) {
      const productHref = firstResultLink.getAttribute("href");
      const fullUrl = `https://incidecoder.com${productHref}`;
      
      updateLoadingStatus("Product matched. Loading details...");
      state.originalUrl = fullUrl;
      
      chrome.runtime.sendMessage({
        action: "fetchUrl",
        url: fullUrl
      }, (fetchRes) => {
        if (chrome.runtime.lastError || !fetchRes || !fetchRes.success) {
          fallbackOrError();
          return;
        }
        
        try {
          state.parsedData = parseIngredientsHTML(fetchRes.html);
          state.productFound = true;
          
          const innerDoc = parser.parseFromString(fetchRes.html, "text/html");
          const titleEl = innerDoc.querySelector("h1 div.klavikab, span#product-title");
          const brandEl = innerDoc.querySelector("span#product-brand-title a");
          
          const parsedBrand = unescapeHTML(brandEl ? brandEl.innerText.trim() : state.brand);
          const parsedName = unescapeHTML(titleEl ? titleEl.innerText.trim() : state.productName);
          
          updateSidebarHeader(parsedBrand, parsedName);
          renderSidebarData();
        } catch (e) {
          console.error("Error parsing matched product details:", e);
          fallbackOrError();
        }
      });
    } else {
      // No search result found
      fallbackOrError();
    }
  }

  function fallbackOrError() {
    if (state.rawIngredients) {
      startFallbackDecoding(state.rawIngredients);
    } else {
      renderSidebarError(`We couldn't find "${state.brand} ${state.productName}" in the database and no ingredients text was detected on the page.`);
    }
  }
}

// Start analyzing product
function startAnalysis() {
  injectSidebarMarkup();
  
  const details = getProductDetails();
  state.brand = details.brand;
  state.productName = details.productName;
  state.rawIngredients = getRawIngredients();

  updateSidebarHeader(state.brand, state.productName);
  
  // Highlight trigger button so user knows scanner is active
  const trigger = document.getElementById("inci-decoder-trigger");
  if (trigger) trigger.classList.add("pulse");

  triggerSearch(details.cleanQuery);
}

// Initialization routine
function main() {
  if (!isProductPage()) return;
  
  // Load saved theme preference
  chrome.storage.local.get(["theme"], (result) => {
    if (result.theme) {
      state.theme = result.theme;
    } else {
      // Fallback to system preference
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      state.theme = isDarkMode ? 'dark' : 'light';
    }
    
    // Start scan
    startAnalysis();
  });
}

// Delay startup slightly to allow Shopify elements to fully populate
setTimeout(main, 1000);
