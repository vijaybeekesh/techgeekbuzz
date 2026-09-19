/* Username Generator - combines a name/keyword, interests, and style into
   creative username suggestions. Everything runs client-side, no network
   calls, nothing typed here is sent to or stored on a server. Suggestions
   are validated against the chosen formatting rules only - this tool never
   checks or claims real-time availability on any platform. */

(function () {
    "use strict";

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    var COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
        '<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>' +
        '<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>' +
        "</svg>";

    /* ---------- word banks ---------- */

    var STYLE_BANK = {
        creative: { label: "Creative", prefixes: ["Nova", "Echo", "Lumen", "Cascade", "Aurora", "Mystic", "Nebula", "Wander"], suffixes: ["Verse", "Nova", "Muse", "Spark", "Bloom", "Drift", "Craft", "Vision"] },
        cool: { label: "Cool", prefixes: ["Chill", "Frost", "Blaze", "Neon", "Vibe", "Storm"], suffixes: ["Vibes", "Cool", "Zone", "Wave", "Flex"] },
        professional: { label: "Professional", prefixes: ["Pro", "The", "Official"], suffixes: ["Official", "Pro", "Hub", "Group", "Consulting", "Digital"] },
        minimal: { label: "Minimal", prefixes: [], suffixes: ["X", "Dev", "Co", "Hq"] },
        funny: { label: "Funny", prefixes: ["Lol", "Haha", "Silly", "Wacky", "Goofy"], suffixes: ["Lol", "Meme", "Giggles", "Jokes", "Vibes"] },
        gaming: { label: "Gaming", prefixes: ["Shadow", "Ghost", "Phantom", "Reaper", "Rogue", "Dark", "Storm", "Venom"], suffixes: ["Gaming", "Gamer", "Storm", "Slayer", "Pro", "Zero"] },
        aesthetic: { label: "Aesthetic", prefixes: ["Soft", "Dreamy", "Velvet", "Pastel", "Moon", "Cloud"], suffixes: ["Aesthetic", "Dreams", "Moon", "Petals", "Haze"] },
        tech: { label: "Tech", prefixes: ["Code", "Dev", "Byte", "Cyber", "Data", "Tech"], suffixes: ["Dev", "Codes", "Tech", "Lab", "Byte", "Hub"] },
        business: { label: "Business", prefixes: ["The", "Official"], suffixes: ["Official", "Group", "Co", "Ventures", "Enterprises", "Solutions"] },
        cute: { label: "Cute", prefixes: ["Baby", "Sweet", "Honey", "Cuddly", "Lil"], suffixes: ["Bear", "Cutie", "Bunny", "Sweetie", "Pie"] },
        bold: { label: "Bold", prefixes: ["Alpha", "Prime", "Titan", "Apex", "Rebel"], suffixes: ["X", "Prime", "Alpha", "Force", "Storm"] }
    };
    var STYLE_KEYS = Object.keys(STYLE_BANK);

    var INTEREST_ALIASES = {
        coding: "Code", programming: "Code", developer: "Dev", development: "Dev", code: "Code",
        ai: "AI", "artificial intelligence": "AI",
        technology: "Tech", tech: "Tech",
        gaming: "Gamer", games: "Gamer", game: "Gamer",
        travel: "Wander", traveling: "Wander", travelling: "Wander",
        photography: "Photo", photo: "Photo",
        music: "Music", art: "Art", design: "Design",
        fitness: "Fit", gym: "Fit", yoga: "Zen",
        food: "Foodie", cooking: "Chef", writing: "Writer", books: "Bookish", reading: "Bookish",
        fashion: "Style", crypto: "Crypto", finance: "Finance", business: "Biz",
        science: "Sci", nature: "Wild", anime: "Anime", movies: "Cine", film: "Cine", sports: "Sport"
    };

    var COMMON_PATTERNS = ["user", "username", "guest", "admin", "test", "official", "realuser", "newuser"];

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("ugToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
    }

    /* ---------- helpers ---------- */

    function niceWord(raw) {
        var trimmed = raw.trim();
        if (!trimmed) return "";
        var alias = INTEREST_ALIASES[trimmed.toLowerCase()];
        if (alias) return alias;
        var cleaned = trimmed.replace(/[^A-Za-z0-9]/g, "");
        if (!cleaned) return "";
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    }

    function parseInterests(raw) {
        return raw.split(",").map(niceWord).filter(Boolean).slice(0, 6);
    }

    function normalizeName(raw) {
        return raw.trim().replace(/[^A-Za-z0-9]/g, "");
    }

    function normKey(username) {
        return username.toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    /* ---------- length presets ---------- */

    function getLengthRange(opts) {
        switch (opts.lengthPreset) {
            case "short": return { min: 3, max: 8 };
            case "long": return { min: 14, max: 20 };
            case "custom": return { min: opts.customMin, max: opts.customMax };
            default: return { min: 8, max: 14 };
        }
    }

    /* ---------- building blocks ---------- */

    function buildCandidateParts(name, interests, bank) {
        var interest = interests.length ? pick(interests) : "";
        var prefix = bank.prefixes.length ? pick(bank.prefixes) : "";
        var suffix = bank.suffixes.length ? pick(bank.suffixes) : "";
        var templates = [];

        if (name) {
            if (prefix) templates.push([prefix, name]);
            if (suffix) templates.push([name, suffix]);
            templates.push(["Real", name]);
            templates.push([name, "Official"]);
            if (interest) {
                templates.push([name, interest]);
                templates.push([interest, name]);
                templates.push([interest, "By", name]);
                templates.push([name, "The", interest]);
                if (suffix) templates.push([name, interest, suffix]);
                if (prefix) templates.push([prefix, interest, name]);
            }
        } else if (interest) {
            if (prefix) templates.push([prefix, interest]);
            if (suffix) templates.push([interest, suffix]);
            templates.push([interest, "Official"]);
        } else if (prefix && suffix) {
            templates.push([prefix, suffix]);
        }

        if (!templates.length) return null;
        return pick(templates).filter(Boolean);
    }

    function applyCase(parts, mode) {
        var m = mode === "random" ? pick(["lowercase", "capitalized", "mixed"]) : mode;
        return parts.map(function (p) {
            if (!p) return p;
            if (m === "lowercase") return p.toLowerCase();
            if (m === "mixed") return Math.random() < 0.5 ? (p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()) : p.toLowerCase();
            return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); // capitalized
        });
    }

    function pickSeparator(opts) {
        var seps = [""];
        if (opts.allowUnderscore) seps.push("_");
        if (opts.allowPeriod) seps.push(".");
        if (seps.length === 1) return "";
        // favour no separator most of the time
        return Math.random() < 0.55 ? "" : pick(seps.slice(1));
    }

    function numberSuffix(style) {
        switch (style) {
            case "year": return String(1990 + Math.floor(Math.random() * 41));
            case "two": return String(10 + Math.floor(Math.random() * 90));
            case "three": return String(100 + Math.floor(Math.random() * 900));
            default: return String(Math.floor(Math.random() * 999) + 1);
        }
    }

    /* ---------- validation ---------- */

    function isValidUsername(name, opts, range) {
        if (!name || name.length < range.min || name.length > range.max) return false;
        if (!/^[A-Za-z0-9._]+$/.test(name)) return false;
        if (!opts.allowUnderscore && name.indexOf("_") !== -1) return false;
        if (!opts.allowPeriod && name.indexOf(".") !== -1) return false;
        if (/^[._]|[._]$/.test(name)) return false;
        if (/[._]{2,}/.test(name)) return false;

        var lower = name.toLowerCase();
        if (opts.startWith && lower.indexOf(opts.startWith.toLowerCase()) !== 0) return false;
        if (opts.endWith && lower.slice(-opts.endWith.length) !== opts.endWith.toLowerCase()) return false;
        if (opts.mustInclude && lower.indexOf(opts.mustInclude.toLowerCase()) === -1) return false;
        if (opts.mustNotInclude && lower.indexOf(opts.mustNotInclude.toLowerCase()) !== -1) return false;

        var specialCount = (name.match(/[._]/g) || []).length;
        if (specialCount > opts.maxSpecial) return false;

        if (opts.avoidCommon) {
            var bareLower = lower.replace(/[0-9._]/g, "");
            if (COMMON_PATTERNS.indexOf(bareLower) !== -1) return false;
        }
        return true;
    }

    /* ---------- quality score ---------- */

    function computeQuality(username, keyword) {
        var score = 3;
        var lower = username.toLowerCase();
        if (username.length >= 5 && username.length <= 14) score += 1;
        if (username.length > 20) score -= 1;
        var specials = (username.match(/[._]/g) || []).length;
        if (specials > 2) score -= 1;
        if (keyword && lower.indexOf(keyword.toLowerCase()) !== -1) score += 1;
        if (/[^aeiou0-9._]{5,}/i.test(username)) score -= 1;
        return clamp(score, 1, 5);
    }

    function qualityStars(score) {
        return "★".repeat(score) + '<span class="empty">' + "★".repeat(5 - score) + "</span>";
    }

    /* ---------- generation ---------- */

    function readOptions() {
        return {
            name: normalizeName($("ugName").value),
            interests: parseInterests($("ugInterests").value),
            keyword: $("ugName").value.trim() || $("ugInterests").value.trim(),
            style: $("ugStyle").value,
            platform: $("ugPlatform").value,
            lengthPreset: $("ugLength").value,
            customMin: clamp(parseInt($("ugMinLen").value, 10) || 6, 3, 30),
            customMax: clamp(parseInt($("ugMaxLen").value, 10) || 16, 3, 30),
            count: clamp(parseInt($("ugCount").value, 10) || 24, 10, 30),
            includeNumbers: $("ugIncludeNumbers").checked,
            numberStyle: $("ugNumberStyle").value,
            allowUnderscore: $("ugAllowUnderscore").checked,
            allowPeriod: $("ugAllowPeriod").checked,
            capitalization: $("ugCapitalization").value,
            avoidCommon: $("ugAvoidCommon").checked,
            startWith: $("ugStartWith").value.trim(),
            endWith: $("ugEndWith").value.trim(),
            mustInclude: $("ugMustInclude").value.trim(),
            mustNotInclude: $("ugMustNotInclude").value.trim(),
            maxSpecial: clamp(parseInt($("ugMaxSpecial").value, 10) || 2, 0, 5)
        };
    }

    function categoryOrder(opts) {
        if (opts.style !== "random" && STYLE_BANK[opts.style]) {
            var rest = STYLE_KEYS.filter(function (k) { return k !== opts.style; });
            // shuffle rest, keep selected style weighted heavily first
            for (var i = rest.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
            }
            return [opts.style, opts.style, opts.style].concat(rest.slice(0, 3));
        }
        return STYLE_KEYS.slice();
    }

    function generateBatch(opts, existingKeys) {
        var range = getLengthRange(opts);
        var pool = categoryOrder(opts);
        var results = [];
        var seen = {};
        Object.keys(existingKeys || {}).forEach(function (k) { seen[k] = true; });

        var maxAttempts = opts.count * 40;
        var attempts = 0;
        while (results.length < opts.count && attempts < maxAttempts) {
            attempts++;
            var styleKey = pick(pool);
            var bank = STYLE_BANK[styleKey];
            var parts = buildCandidateParts(opts.name, opts.interests, bank);
            if (!parts || !parts.length) continue;

            parts = applyCase(parts, opts.capitalization);
            var sep = pickSeparator(opts);
            var username = parts.join(sep);

            if (opts.includeNumbers && Math.random() < 0.3) {
                username += numberSuffix(opts.numberStyle);
            }

            if (!isValidUsername(username, opts, range)) continue;

            var key = normKey(username);
            if (seen[key]) continue;
            seen[key] = true;

            results.push({
                username: username,
                category: bank.label,
                quality: computeQuality(username, opts.keyword)
            });
        }
        return results;
    }

    /* ---------- state ---------- */

    var state = {
        results: [],       // {username, category, quality}
        favorites: [],      // {username, category}
        lastOpts: null
    };

    function favoriteKeys() {
        var map = {};
        state.favorites.forEach(function (f) { map[normKey(f.username)] = true; });
        return map;
    }

    /* ---------- rendering ---------- */

    function renderResults() {
        var wrap = $("ugResultsWrap");
        var search = $("ugSearch").value.trim().toLowerCase();
        var sort = $("ugSort").value;
        var favKeys = favoriteKeys();

        var list = state.results.slice();
        if (search) {
            list = list.filter(function (r) { return r.username.toLowerCase().indexOf(search) !== -1; });
        }

        $("ugResultCount").hidden = state.results.length === 0;
        $("ugResultCount").textContent = state.results.length + " suggestions";

        if (!state.results.length) {
            wrap.innerHTML = "";
            $("ugNoMatch").hidden = true;
            return;
        }

        if (!list.length) {
            wrap.innerHTML = "";
            $("ugNoMatch").hidden = false;
            return;
        }
        $("ugNoMatch").hidden = true;

        if (sort === "favorites") {
            list = list.filter(function (r) { return favKeys[normKey(r.username)]; });
        }
        if (sort === "shortest") list.sort(function (a, b) { return a.username.length - b.username.length; });
        else if (sort === "longest") list.sort(function (a, b) { return b.username.length - a.username.length; });
        else if (sort === "alphabetical") list.sort(function (a, b) { return a.username.localeCompare(b.username); });

        if (sort === "recommended") {
            var groups = {};
            var order = [];
            list.forEach(function (r) {
                if (!groups[r.category]) { groups[r.category] = []; order.push(r.category); }
                groups[r.category].push(r);
            });
            wrap.innerHTML = order.map(function (cat) {
                return renderCategory(cat, groups[cat], favKeys);
            }).join("");
        } else {
            wrap.innerHTML = list.length
                ? '<div class="ug-grid">' + list.map(function (r) { return renderCard(r, favKeys); }).join("") + "</div>"
                : "";
            if (sort === "favorites" && !list.length) {
                wrap.innerHTML = '<div class="ug-empty">No favorites in this result set yet.</div>';
            }
        }

        wireCardEvents();
    }

    function renderCategory(cat, items, favKeys) {
        return '<div class="ug-category">' +
            '<div class="ug-category-title"><span class="ug-cat-dot"></span>' + esc(cat) + ' <span class="ug-category-count">' + items.length + '</span></div>' +
            '<div class="ug-grid">' + items.map(function (r) { return renderCard(r, favKeys); }).join("") + "</div>" +
            "</div>";
    }

    function renderCard(r, favKeys) {
        var isFav = !!favKeys[normKey(r.username)];
        return '<div class="ug-username-card" data-username="' + esc(r.username) + '">' +
            '<div class="ug-username-head">' +
            '<span class="ug-username-avatar">' + esc(r.username.charAt(0).toUpperCase()) + "</span>" +
            '<div class="ug-username-text">' + esc(r.username) + "</div>" +
            "</div>" +
            '<div class="ug-username-quality">' + qualityStars(r.quality) + "</div>" +
            '<div class="ug-card-actions">' +
            '<button type="button" class="ug-icon-btn ug-copy-btn" aria-label="Copy ' + esc(r.username) + '" title="Copy">' + COPY_ICON + "</button>" +
            '<button type="button" class="ug-favorite-btn' + (isFav ? " is-favorited" : "") + '" aria-pressed="' + isFav + '" aria-label="Favorite ' + esc(r.username) + '">' + (isFav ? "♥" : "♡") + "</button>" +
            "</div>" +
            "</div>";
    }

    function renderFavorites() {
        var list = $("ugFavoritesList");
        var empty = $("ugFavoritesEmpty");
        var copyAllBtn = $("ugFavoritesCopyAllBtn");

        if (!state.favorites.length) {
            list.hidden = true;
            empty.hidden = false;
            copyAllBtn.hidden = true;
            list.innerHTML = "";
            return;
        }
        empty.hidden = true;
        list.hidden = false;
        copyAllBtn.hidden = false;
        list.innerHTML = state.favorites.map(function (f) {
            return '<li data-username="' + esc(f.username) + '">' +
                "<span>" + esc(f.username) + "</span>" +
                '<span class="ug-fav-actions">' +
                '<button type="button" class="ug-icon-btn ug-fav-copy-btn" aria-label="Copy ' + esc(f.username) + '" title="Copy">' + COPY_ICON + "</button>" +
                '<button type="button" class="ug-favorite-btn is-favorited ug-fav-remove-btn" aria-label="Remove ' + esc(f.username) + ' from favorites">♥</button>' +
                "</span></li>";
        }).join("");

        wireFavoriteListEvents();
    }

    /* ---------- copy ---------- */

    function legacyCopy(text) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.left = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }

    function copyText(text, successMsg) {
        if (!text) { showToast("Nothing to copy yet."); return; }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(
                function () { showToast(successMsg || "Copied!"); },
                function () {
                    showToast(legacyCopy(text) ? (successMsg || "Copied!") : "Could not copy - please copy manually.");
                }
            );
            return;
        }

        showToast(legacyCopy(text) ? (successMsg || "Copied!") : "Could not copy - please copy manually.");
    }

    /* ---------- card event wiring ---------- */

    function toggleFavorite(username, category) {
        var key = normKey(username);
        var idx = state.favorites.findIndex(function (f) { return normKey(f.username) === key; });
        if (idx !== -1) {
            state.favorites.splice(idx, 1);
        } else {
            state.favorites.push({ username: username, category: category || "" });
        }
        renderResults();
        renderFavorites();
    }

    function wireCardEvents() {
        document.querySelectorAll("#ugResultsWrap .ug-username-card").forEach(function (card) {
            var username = card.getAttribute("data-username");

            var copyBtn = card.querySelector(".ug-copy-btn");
            if (copyBtn) copyBtn.addEventListener("click", function () {
                copyText(username, "Copied!");
            });

            var favBtn = card.querySelector(".ug-favorite-btn");
            if (favBtn) favBtn.addEventListener("click", function () {
                var result = state.results.find(function (r) { return r.username === username; });
                toggleFavorite(username, result ? result.category : "");
            });
        });
    }

    function wireFavoriteListEvents() {
        document.querySelectorAll("#ugFavoritesList li").forEach(function (li) {
            var username = li.getAttribute("data-username");

            var copyBtn = li.querySelector(".ug-fav-copy-btn");
            if (copyBtn) copyBtn.addEventListener("click", function () { copyText(username, "Copied!"); });

            var removeBtn = li.querySelector(".ug-fav-remove-btn");
            if (removeBtn) removeBtn.addEventListener("click", function () { toggleFavorite(username); });
        });
    }

    /* ---------- generate flow ---------- */

    function validateForm(opts) {
        var errorBox = $("ugFormError");
        errorBox.hidden = true;
        errorBox.textContent = "";

        if (!opts.name && !opts.interests.length) {
            errorBox.textContent = "Please enter a name or keyword to generate username ideas.";
            errorBox.hidden = false;
            $("ugName").focus();
            return false;
        }
        if (opts.lengthPreset === "custom" && opts.customMin > opts.customMax) {
            errorBox.textContent = "Please enter a valid custom length range (minimum must not exceed maximum).";
            errorBox.hidden = false;
            return false;
        }
        return true;
    }

    var isGenerating = false;

    function runGenerate(mode) {
        if (isGenerating) return;
        var opts = readOptions();
        if (!validateForm(opts)) return;

        isGenerating = true;
        var btn = $("ugGenerateBtn");
        btn.classList.add("is-loading");
        btn.disabled = true;
        $("ugEmptyState").hidden = true;
        $("ugLoadingNote").hidden = false;
        $("ugToolbar").hidden = true;
        $("ugDisclaimer").hidden = true;

        setTimeout(function () {
            try {
                var existingKeys = {};
                if (mode === "more") {
                    state.results.forEach(function (r) { existingKeys[normKey(r.username)] = true; });
                }

                var batch = generateBatch(opts, existingKeys);

                if (mode === "more") {
                    state.results = state.results.concat(batch);
                } else {
                    state.results = batch;
                }
                state.lastOpts = opts;

                if (!batch.length && !state.results.length) {
                    showToast("We couldn't generate usernames with these settings - try relaxing your filters.");
                } else if (mode === "more" && !batch.length) {
                    showToast("No new unique suggestions right now - try adjusting your settings.");
                }

                $("ugToolbar").hidden = state.results.length === 0;
                $("ugDisclaimer").hidden = state.results.length === 0;
                renderResults();
            } finally {
                isGenerating = false;
                btn.classList.remove("is-loading");
                btn.disabled = false;
                $("ugLoadingNote").hidden = true;
            }
        }, 350);
    }

    /* ---------- init / wiring ---------- */

    $("ugForm").addEventListener("submit", function (e) {
        e.preventDefault();
        runGenerate("new");
    });

    $("ugGenerateMoreBtn").addEventListener("click", function () { runGenerate("more"); });
    $("ugRegenerateBtn").addEventListener("click", function () { runGenerate("new"); });

    $("ugLength").addEventListener("change", function () {
        $("ugCustomLengthWrap").hidden = this.value !== "custom";
    });

    $("ugIncludeNumbers").addEventListener("change", function () {
        $("ugNumberStyleWrap").style.display = this.checked ? "" : "none";
    });

    $("ugToggleAdvanced").addEventListener("click", function () {
        var expanded = this.getAttribute("aria-expanded") === "true";
        this.setAttribute("aria-expanded", String(!expanded));
        $("ugAdvancedFields").hidden = expanded;
    });

    $("ugSearch").addEventListener("input", renderResults);
    $("ugSort").addEventListener("change", renderResults);

    $("ugCopyAllBtn").addEventListener("click", function () {
        if (!state.results.length) { showToast("Nothing to copy yet."); return; }
        copyText(state.results.map(function (r) { return r.username; }).join("\n"), "Copied " + state.results.length + " usernames!");
    });

    $("ugFavoritesCopyAllBtn").addEventListener("click", function () {
        if (!state.favorites.length) { showToast("No favorites to copy yet."); return; }
        copyText(state.favorites.map(function (f) { return f.username; }).join("\n"), "Copied " + state.favorites.length + " favorites!");
    });

    $("ugResetBtn").addEventListener("click", function () {
        var substantial = state.results.length >= 10 || state.favorites.length > 0;
        if (substantial && !window.confirm("This will clear your generated usernames and favorites. Continue?")) return;

        $("ugForm").reset();
        $("ugCustomLengthWrap").hidden = true;
        $("ugAdvancedFields").hidden = true;
        $("ugToggleAdvanced").setAttribute("aria-expanded", "false");
        $("ugNumberStyleWrap").style.display = "";
        $("ugFormError").hidden = true;

        state.results = [];
        state.favorites = [];
        $("ugToolbar").hidden = true;
        $("ugDisclaimer").hidden = true;
        $("ugResultCount").hidden = true;
        $("ugResultsWrap").innerHTML = "";
        $("ugNoMatch").hidden = true;
        $("ugEmptyState").hidden = false;
        renderFavorites();
        showToast("Reset.");
    });

    renderFavorites();
})();
