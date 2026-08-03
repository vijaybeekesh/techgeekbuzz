/* Tools listing page — category/search filtering, favorites, recently used,
   back-to-top, and the FAQ accordion. */

(function () {
    "use strict";

    var FAVORITES_KEY = "toolsFavorites";
    var RECENT_KEY = "toolsRecentlyUsed";
    var MAX_RECENT = 6;

    var searchInput = document.getElementById("toolsSearchInput");
    var allToolItems = Array.prototype.slice.call(document.querySelectorAll(".tool-item-container"));
    var categoryChips = Array.prototype.slice.call(document.querySelectorAll(".tool-category-item"));
    var favoritesChip = document.getElementById("favoritesChip");
    var emptyState = document.getElementById("toolsEmptyState");
    var recentSection = document.getElementById("toolsRecent");
    var recentList = document.getElementById("toolsRecentList");
    var backToTopBtn = document.getElementById("btnBackToTop");
    var toast = document.getElementById("toolsToast");

    var activeCategory = "All";
    var searchQuery = "";

    /* ---------- favorites (localStorage) ---------- */

    function loadFavorites() {
        try {
            return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []);
        } catch (e) {
            return new Set();
        }
    }

    function saveFavorites(favorites) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
    }

    var favorites = loadFavorites();

    function initFavoriteButtons() {
        allToolItems.forEach(function (item) {
            var btn = item.querySelector(".tools-card-favorite");
            var toolId = item.dataset.tool;
            if (!btn || !toolId) return;

            btn.setAttribute("aria-pressed", favorites.has(toolId) ? "true" : "false");

            btn.addEventListener("click", function () {
                if (favorites.has(toolId)) {
                    favorites.delete(toolId);
                    btn.setAttribute("aria-pressed", "false");
                    showToast("Removed from favorites.");
                } else {
                    favorites.add(toolId);
                    btn.setAttribute("aria-pressed", "true");
                    showToast("Added to favorites.");
                }
                saveFavorites(favorites);
                if (activeCategory === "Favorites") applyFilters();
            });
        });
    }

    /* ---------- recently used (localStorage) ---------- */

    function loadRecent() {
        try {
            return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function trackRecentUse(toolId, title, href) {
        var recent = loadRecent().filter(function (r) { return r.tool !== toolId; });
        recent.unshift({ tool: toolId, title: title, href: href, timestamp: new Date().toISOString() });
        if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    }

    function renderRecent() {
        var recent = loadRecent();
        if (!recent.length) {
            recentSection.hidden = true;
            return;
        }
        recentSection.hidden = false;
        recentList.innerHTML = "";
        recent.forEach(function (entry) {
            var a = document.createElement("a");
            a.className = "tools-recent-item";
            a.href = entry.href;
            a.textContent = entry.title;
            recentList.appendChild(a);
        });
    }

    allToolItems.forEach(function (item) {
        var link = item.querySelector(".tool-card");
        if (!link) return;
        link.addEventListener("click", function () {
            var title = item.querySelector(".tool-title");
            trackRecentUse(item.dataset.tool, title ? title.textContent : item.dataset.tool, link.getAttribute("href"));
        });
    });

    /* ---------- filtering (category + search, combined) ---------- */

    function applyFilters() {
        var query = searchQuery.trim().toLowerCase();
        var visibleCount = 0;

        allToolItems.forEach(function (item) {
            var categoryMatch =
                activeCategory === "All" ||
                (activeCategory === "Favorites" ? favorites.has(item.dataset.tool) : item.dataset.parent === activeCategory);

            var titleEl = item.querySelector(".tool-title");
            var searchMatch = !query || (titleEl && titleEl.textContent.toLowerCase().indexOf(query) !== -1);

            var visible = categoryMatch && searchMatch;
            item.hidden = !visible;
            if (visible) visibleCount++;
        });

        emptyState.hidden = visibleCount !== 0;
    }

    searchInput.addEventListener("input", function () {
        searchQuery = searchInput.value;
        applyFilters();
    });

    categoryChips.forEach(function (chip) {
        chip.addEventListener("click", function () {
            categoryChips.forEach(function (c) {
                c.classList.remove("active");
                c.setAttribute("aria-pressed", "false");
            });
            chip.classList.add("active");
            chip.setAttribute("aria-pressed", "true");
            activeCategory = chip === favoritesChip ? "Favorites" : chip.textContent.trim();
            applyFilters();
        });
        chip.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                chip.click();
            }
        });
    });

    /* ---------- keyboard shortcuts ---------- */

    document.addEventListener("keydown", function (e) {
        var tag = document.activeElement ? document.activeElement.tagName : "";
        var isTyping = tag === "INPUT" || tag === "TEXTAREA";

        if (e.key === "/" && !isTyping) {
            e.preventDefault();
            searchInput.focus();
        } else if (e.key === "Escape" && document.activeElement === searchInput) {
            searchInput.value = "";
            searchQuery = "";
            applyFilters();
            searchInput.blur();
        }
    });

    /* ---------- back to top ---------- */

    window.addEventListener("scroll", function () {
        backToTopBtn.classList.toggle("show", window.scrollY > 500);
    });
    backToTopBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* ---------- FAQ accordion ---------- */

    var faqItems = Array.prototype.slice.call(document.querySelectorAll(".tl-faq-item"));
    faqItems.forEach(function (item) {
        var question = item.querySelector(".tl-faq-question");
        question.addEventListener("click", function () {
            var isOpen = item.dataset.open === "true";
            faqItems.forEach(function (other) {
                other.dataset.open = "false";
                other.querySelector(".tl-faq-question").setAttribute("aria-expanded", "false");
            });
            if (!isOpen) {
                item.dataset.open = "true";
                question.setAttribute("aria-expanded", "true");
            }
        });
    });

    /* ---------- toast ---------- */

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2200);
    }

    /* ---------- init ---------- */

    initFavoriteButtons();
    renderRecent();
    applyFilters();
})();
