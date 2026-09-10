/* SEO Description Generator - rule-based meta description engine with
   length/keyword scoring, inline editing, and a "final selection" picker.
   Everything runs client-side. */

(function () {
    "use strict";

    /* ---------- reference data ---------- */

    var CONTENT_TYPES = [
        ["blog-post", "Blog Post"], ["product-page", "Product Page"], ["service-page", "Service Page"],
        ["landing-page", "Landing Page"], ["homepage", "Homepage"], ["category-page", "Category Page"],
        ["tool-page", "Tool Page"], ["other", "Other"]
    ];

    var TONES = [
        ["professional", "Professional"], ["friendly", "Friendly"], ["persuasive", "Persuasive"],
        ["informative", "Informative"], ["casual", "Casual"], ["premium", "Premium"]
    ];

    var LENGTH_BUCKETS = {
        short: { min: 120, max: 140, label: "Short" },
        recommended: { min: 140, max: 160, label: "Recommended" },
        long: { min: 160, max: 180, label: "Long" }
    };

    var TONE_VERBS = {
        professional: ["Explore", "Discover", "Learn about"],
        friendly: ["Check out", "Discover", "See how"],
        persuasive: ["Get", "Unlock", "Start using"],
        informative: ["Learn", "Understand", "Find out about"],
        casual: ["Try", "Check out", "Dive into"],
        premium: ["Experience", "Discover", "Elevate your approach to"]
    };

    var TONE_CLOSERS = {
        professional: ["", "Built for reliable, measurable results.", "Designed for clarity and efficiency."],
        friendly: ["It's easier than you think.", "You'll love how simple it is.", ""],
        persuasive: ["Don't wait - get started today.", "Start seeing results now.", "Try it free today."],
        informative: ["Backed by clear, practical guidance.", "Everything explained step by step.", ""],
        casual: ["No hassle, just results.", "Quick, easy, and free.", ""],
        premium: ["Crafted for those who expect more.", "Where quality meets simplicity.", ""]
    };

    var CTA_WORDS = ["discover", "learn", "get", "start", "try", "explore", "shop", "unlock", "save",
        "build", "boost", "create", "browse", "find", "join", "experience", "see how", "dive into"];

    var GENERIC_PATTERNS = [/welcome to (our|the)?\s*(website|site|homepage)?/i, /^our website/i];

    /* Description templates per content type. `need` filters when a template
       is eligible: null = always, or "audience" / "brand" / "kw2". */
    var TEMPLATES = {
        "blog-post": [
            { need: null, text: "{Verb} {Kw} with practical tips and clear explanations. {Closer}" },
            { need: null, text: "A complete look at {Kw} - what it means and how to get it right. {Closer}" },
            { need: null, text: "Everything you need to know about {Kw}, explained simply. {Closer}" },
            { need: "audience", text: "{Verb} {Kw} with tips built for {Audience}. {Closer}" },
            { need: "brand", text: "{Brand} breaks down {Kw} in plain language, step by step. {Closer}" },
            { need: "kw2", text: "{Verb} {Kw} and {Kw2} with practical, easy-to-follow guidance. {Closer}" }
        ],
        "product-page": [
            { need: null, text: "{Verb} {Kw} designed to help you get more done, faster. {Closer}" },
            { need: null, text: "{Kw} built for real results - simple to use, easy to trust. {Closer}" },
            { need: "audience", text: "{Kw} built for {Audience} who want results without the hassle. {Closer}" },
            { need: "brand", text: "{Brand}'s {Kw} helps you get more done, faster. {Closer}" },
            { need: "kw2", text: "{Verb} {Kw} with {Kw2} included - everything you need in one place. {Closer}" }
        ],
        "service-page": [
            { need: null, text: "Professional {Kw} services designed to deliver real results. {Closer}" },
            { need: null, text: "Reliable {Kw} services you can trust, from start to finish. {Closer}" },
            { need: "audience", text: "Professional {Kw} services built for {Audience}. {Closer}" },
            { need: "brand", text: "{Brand} delivers professional {Kw} services you can rely on. {Closer}" },
            { need: "kw2", text: "{Verb} {Kw} and {Kw2} services designed to deliver results. {Closer}" }
        ],
        "landing-page": [
            { need: null, text: "{Verb} {Kw} today - simple to start, built to deliver results. {Closer}" },
            { need: null, text: "{Kw} made simple, with everything you need in one place. {Closer}" },
            { need: "audience", text: "{Kw} made simple for {Audience}. {Closer}" },
            { need: "brand", text: "Ready for {Kw}? {Brand} makes it effortless. {Closer}" },
            { need: "kw2", text: "{Verb} {Kw} and {Kw2} in one simple, streamlined solution. {Closer}" }
        ],
        homepage: [
            { need: null, text: "{Verb} {Kw} with tools and guidance built to help you succeed. {Closer}" },
            { need: null, text: "{Kw} made simple - practical guidance, real results. {Closer}" },
            { need: "audience", text: "{Verb} {Kw} built for {Audience}. {Closer}" },
            { need: "brand", text: "{Brand} helps you with {Kw}, from start to finish. {Closer}" },
            { need: "kw2", text: "{Verb} {Kw} and {Kw2}, all in one place. {Closer}" }
        ],
        "category-page": [
            { need: null, text: "Browse {Kw} picked for quality, value, and reliability. {Closer}" },
            { need: null, text: "{Verb} our full range of {Kw} - carefully selected for you. {Closer}" },
            { need: "audience", text: "Browse {Kw} curated for {Audience}. {Closer}" },
            { need: "brand", text: "Browse {Kw} at {Brand}, picked for quality and value. {Closer}" },
            { need: "kw2", text: "Browse {Kw} and {Kw2} in one convenient collection. {Closer}" }
        ],
        "tool-page": [
            { need: null, text: "Use this free {Kw} tool to save time and get results in seconds. {Closer}" },
            { need: null, text: "A fast, free {Kw} tool built to make the job easier. {Closer}" },
            { need: "audience", text: "A free {Kw} tool built for {Audience}. {Closer}" },
            { need: "brand", text: "{Brand}'s {Kw} tool makes the job fast, free, and simple. {Closer}" },
            { need: "kw2", text: "{Verb} our {Kw} tool with built-in {Kw2} - fast and free. {Closer}" }
        ],
        other: [
            { need: null, text: "{Verb} {Kw} with clear, practical guidance you can use today. {Closer}" },
            { need: null, text: "Everything you need to know about {Kw}, in one place. {Closer}" },
            { need: "audience", text: "{Verb} {Kw} built for {Audience}. {Closer}" },
            { need: "brand", text: "{Brand} covers {Kw} with clear, practical guidance. {Closer}" },
            { need: "kw2", text: "{Verb} {Kw} and {Kw2} with clear, practical guidance. {Closer}" }
        ]
    };

    /* ---------- small utilities ---------- */

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function escRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

    function uid() { return "dg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function classForStatus(score) {
        if (score >= 80) return "high";
        if (score >= 55) return "mid";
        return "low";
    }

    function capFirst(str) {
        str = (str || "").trim();
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

    function downloadBlob(content, filename, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }

    function getList(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }

    function countOccurrences(haystack, needle) {
        if (!needle) return 0;
        var n = 0, pos = 0;
        while ((pos = haystack.indexOf(needle, pos)) !== -1) { n++; pos += needle.length; }
        return n;
    }

    /* ---------- generation engine ---------- */

    function buildContext(settings) {
        return {
            Kw: capFirst(settings.kwPrimary),
            Kw2: capFirst(settings.kwSecondaryList[0] || ""),
            Brand: (settings.brand || "").trim(),
            Audience: (settings.audience || "").trim(),
            Title: (settings.pageTitle || "").trim()
        };
    }

    function pickTemplates(bank, ctx) {
        return (bank || []).filter(function (tpl) {
            if (tpl.need === "audience") return !!ctx.Audience;
            if (tpl.need === "brand") return !!ctx.Brand;
            if (tpl.need === "kw2") return !!ctx.Kw2;
            return true;
        });
    }

    function renderTemplate(tpl, ctx) {
        var text = tpl.replace(/\{(\w+)\}/g, function (_, key) { return ctx[key] !== undefined ? ctx[key] : ""; });
        text = text.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
        return capFirst(text);
    }

    function contextClause(context) {
        var text = (context || "").trim();
        if (!text) return "";
        if (text.length > 70) {
            var cut = text.slice(0, 70);
            var lastSpace = cut.lastIndexOf(" ");
            if (lastSpace > 35) cut = cut.slice(0, lastSpace);
            text = cut.replace(/[\s,.;:\-–-]+$/, "");
        }
        text = capFirst(text);
        if (!/[.!?]$/.test(text)) text += ".";
        return " " + text;
    }

    function fitToLength(text, bucket, padClauses) {
        if (text.length > bucket.max) {
            var cut = text.slice(0, bucket.max);
            var lastSpace = cut.lastIndexOf(" ");
            if (lastSpace > bucket.max * 0.5) cut = cut.slice(0, lastSpace);
            cut = cut.replace(/[\s,;:\-–-]+$/, "").replace(/\.+$/, "");
            return cut + ".";
        }
        if (text.length < bucket.min && padClauses && padClauses.length) {
            for (var i = 0; i < padClauses.length && text.length < bucket.min; i++) {
                var candidate = text.replace(/\.$/, "") + " " + padClauses[i];
                if (candidate.length <= bucket.max) text = candidate;
            }
        }
        return text;
    }

    function generateDescriptions(settings, excludeSet) {
        var bank = TEMPLATES[settings.contentType] || TEMPLATES.other;
        var bucket = LENGTH_BUCKETS[settings.length] || LENGTH_BUCKETS.recommended;
        var ctx = buildContext(settings);
        var pool = pickTemplates(bank, ctx);
        if (!pool.length) pool = pickTemplates(TEMPLATES.other, ctx);

        var results = [];
        var seen = excludeSet || {};
        var attempts = 0;
        var maxAttempts = settings.numSuggestions * 25 + 100;
        var idx = 0;

        while (results.length < settings.numSuggestions && attempts < maxAttempts) {
            attempts++;
            var tpl = pool[idx % pool.length];
            idx++;
            var ctxFull = {
                Kw: ctx.Kw, Kw2: ctx.Kw2, Brand: ctx.Brand, Audience: ctx.Audience, Title: ctx.Title,
                Verb: randomFrom(TONE_VERBS[settings.tone] || TONE_VERBS.professional),
                Closer: randomFrom(TONE_CLOSERS[settings.tone] || TONE_CLOSERS.professional)
            };
            var raw = renderTemplate(tpl.text, ctxFull);
            if (!raw) continue;
            if (settings.additionalContext && Math.random() < 0.7) raw = raw + contextClause(settings.additionalContext);
            raw = fitToLength(raw, bucket, [
                randomFrom(TONE_CLOSERS[settings.tone] || [""]).replace(/^$/, "Get started today."),
                "Learn more and get started today."
            ]);
            var key = raw.toLowerCase();
            if (seen[key]) continue;
            seen[key] = true;
            results.push({ id: uid(), text: raw });
        }
        return results;
    }

    /* ---------- scoring engine ---------- */

    function scoreDescription(item, settings) {
        var text = item.text;
        var lower = text.toLowerCase();
        var bucket = LENGTH_BUCKETS[settings.length] || LENGTH_BUCKETS.recommended;
        var charCount = text.length;
        var wordCount = text.split(/\s+/).filter(Boolean).length;

        var kwLower = (settings.kwPrimary || "").toLowerCase().trim();
        var keywordPresent = !!kwLower && lower.indexOf(kwLower) !== -1;
        var keywordOccurrences = kwLower ? countOccurrences(lower, kwLower) : 0;
        var keywordEarly = keywordPresent && lower.indexOf(kwLower) <= 60;

        var secList = settings.kwSecondaryList || [];
        var secondaryPresent = secList.length ? secList.some(function (k) { return lower.indexOf(k) !== -1; }) : null;

        var hasCTA = CTA_WORDS.some(function (w) { return lower.indexOf(w) !== -1; });

        var tooShort = charCount < bucket.min;
        var tooLong = charCount > bucket.max;
        var lengthOk = !tooShort && !tooLong;
        var stuffing = keywordOccurrences > 2;
        var generic = GENERIC_PATTERNS.some(function (re) { return re.test(text); });
        var incomplete = !/[.!?]$/.test(text.trim()) || wordCount < 6;

        var seoScore = 0;
        seoScore += keywordPresent ? 35 : 0;
        seoScore += keywordEarly ? 15 : 0;
        seoScore += lengthOk ? 20 : 0;
        seoScore += hasCTA ? 10 : 0;
        seoScore += secondaryPresent === false ? 0 : 10;
        seoScore += stuffing ? 0 : 10;
        if (stuffing) seoScore -= 15;
        if (generic) seoScore -= 20;
        if (incomplete) seoScore -= 10;
        seoScore = clamp(Math.round(seoScore), 0, 100);

        var status = seoScore >= 80 ? "Excellent" : seoScore >= 55 ? "Good" : "Needs Improvement";

        var tips = [];
        if (tooLong) tips.push("Description exceeds the " + bucket.label.toLowerCase() + " range (" + bucket.min + "–" + bucket.max + " chars) - trim it down.");
        else if (tooShort) tips.push("Description is shorter than the " + bucket.label.toLowerCase() + " range (" + bucket.min + "–" + bucket.max + " chars) - consider adding more detail.");
        if (!keywordPresent) tips.push("Primary keyword is missing from this description.");
        if (stuffing) tips.push("Keyword appears " + keywordOccurrences + " times - avoid keyword stuffing.");
        if (generic) tips.push("This reads a bit generic - make it more specific to your page.");
        if (incomplete) tips.push("This description looks like an incomplete sentence.");
        if (!hasCTA) tips.push('Consider an action word (e.g. "Discover", "Get", "Learn") to boost clicks.');

        return {
            charCount: charCount, wordCount: wordCount, bucket: bucket,
            keywordPresent: keywordPresent, keywordOccurrences: keywordOccurrences,
            secondaryPresent: secondaryPresent, hasCTA: hasCTA,
            lengthOk: lengthOk, tooShort: tooShort, tooLong: tooLong, stuffing: stuffing,
            seoScore: seoScore, status: status, statusClass: classForStatus(seoScore), tips: tips
        };
    }

    /* ---------- state ---------- */

    var currentResults = []; // [{item, scored}]
    var currentSettings = null;
    var selectedId = null;

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("dgToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
    }

    /* ---------- rendering ---------- */

    function highlightKeywords(escapedText, keywords) {
        var result = escapedText;
        keywords.filter(Boolean).forEach(function (k) {
            var re = new RegExp("(" + escRegex(k) + ")", "ig");
            result = result.replace(re, "<mark>$1</mark>");
        });
        return result;
    }

    function cardHTML(item, scored, isSelected) {
        var kwList = [currentSettings.kwPrimary].concat(currentSettings.kwSecondaryList || []);
        var highlighted = highlightKeywords(esc(item.text), kwList);

        var chips = '<span class="dg-chip ' + (scored.keywordPresent ? "good" : "bad") + '">' +
            (scored.keywordPresent ? "✓ Keyword Included" : "✕ Keyword Missing") + "</span>";
        chips += '<span class="dg-chip ' + (scored.lengthOk ? "good" : "warn") + '">' +
            (scored.lengthOk ? "✓ Length OK" : (scored.tooLong ? "⚠ Too Long" : "⚠ Too Short")) + "</span>";
        if (scored.stuffing) chips += '<span class="dg-chip bad">⚠ Keyword Stuffing</span>';
        if (scored.hasCTA) chips += '<span class="dg-chip good">✓ Action-Oriented</span>';

        var scores =
            '<div class="dg-score"><span>Characters</span><strong>' + scored.charCount + "/" + scored.bucket.max + "</strong></div>" +
            '<div class="dg-score"><span>Words</span><strong>' + scored.wordCount + "</strong></div>" +
            '<div class="dg-score ' + scored.statusClass + '"><span>SEO Status</span><strong>' + scored.status + "</strong></div>";

        var tips = scored.tips.slice(0, 3).map(function (t) {
            return '<div class="dg-desc-tip">⚠ ' + esc(t) + "</div>";
        }).join("");

        return (
            '<div class="dg-desc-card' + (isSelected ? " is-selected" : "") + '" data-id="' + item.id + '">' +
            '<div class="dg-desc-text" data-id="' + item.id + '">' + highlighted + "</div>" +
            '<div class="dg-desc-meta">' + chips + "</div>" +
            '<div class="dg-score-row">' + scores + "</div>" +
            tips +
            '<div class="dg-desc-actions">' +
            '<button type="button" class="dg-btn dg-btn-sm" data-act="copy">Copy</button>' +
            '<button type="button" class="dg-btn dg-btn-sm" data-act="edit">Edit</button>' +
            '<button type="button" class="dg-btn dg-btn-sm" data-act="regen">↻ Regenerate</button>' +
            '<button type="button" class="dg-btn dg-btn-sm dg-select-btn' + (isSelected ? " active" : "") + '" data-act="select">' +
            (isSelected ? "★ Selected" : "☆ Select as Final") + "</button>" +
            '<button type="button" class="dg-btn dg-btn-sm dg-btn-danger" data-act="delete" aria-label="Delete this description">✕</button>' +
            "</div></div>"
        );
    }

    function renderFinal() {
        var section = $("finalSection");
        if (!selectedId) { section.hidden = true; return; }
        var found = null;
        currentResults.forEach(function (r) { if (r.item.id === selectedId) found = r.item; });
        if (!found) { selectedId = null; section.hidden = true; return; }
        $("finalText").textContent = found.text;
        section.hidden = false;
    }

    function renderAll() {
        var grid = $("resultsGrid");
        grid.innerHTML = currentResults.map(function (r) { return cardHTML(r.item, r.scored, r.item.id === selectedId); }).join("");
        $("resultsCount").textContent = currentResults.length ? (currentResults.length + " descriptions generated") : "";
        $("resultsSection").hidden = currentResults.length === 0;
        renderFinal();
    }

    /* ---------- clipboard ---------- */

    function copyText(text, msg) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast(msg || "Copied to clipboard."); }, function () { showToast("Could not copy - please copy manually."); });
        } else {
            window.prompt("Copy this text:", text);
        }
    }

    /* ---------- session persistence ---------- */

    function persistLastSession() {
        try {
            localStorage.setItem("dgLastSession", JSON.stringify({
                settings: currentSettings, results: currentResults.map(function (r) { return r.item; }), selectedId: selectedId
            }));
        } catch (e) { }
    }

    function applySettingsToForm(settings) {
        if (!settings) return;
        $("dgPageTitle").value = settings.pageTitle || "";
        $("dgKwPrimary").value = settings.kwPrimary || "";
        $("dgKwSecondary").value = settings.kwSecondaryRaw || "";
        if (settings.contentType) $("dgContentType").value = settings.contentType;
        $("dgAudience").value = settings.audience || "";
        $("dgBrand").value = settings.brand || "";
        if (settings.tone) $("dgTone").value = settings.tone;
        if (settings.length) $("dgLength").value = settings.length;
        if (settings.numSuggestions) $("dgNumSuggestions").value = String(settings.numSuggestions);
        $("dgContext").value = settings.additionalContext || "";
    }

    function restoreLastSession() {
        try {
            var raw = localStorage.getItem("dgLastSession");
            if (!raw) return;
            var data = JSON.parse(raw);
            if (!data || !data.results || !data.results.length) return;
            currentSettings = data.settings;
            selectedId = data.selectedId || null;
            currentResults = data.results.map(function (item) { return { item: item, scored: scoreDescription(item, data.settings) }; });
            applySettingsToForm(data.settings);
            renderAll();
        } catch (e) { }
    }

    /* ---------- form helpers ---------- */

    function populateSelect(id, list) {
        var sel = $(id);
        list.forEach(function (pair) {
            var opt = document.createElement("option");
            opt.value = pair[0]; opt.textContent = pair[1];
            sel.appendChild(opt);
        });
    }

    function collectSettings() {
        var kwSecondaryRaw = $("dgKwSecondary").value.trim();
        var kwSecondaryList = kwSecondaryRaw ? kwSecondaryRaw.split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean) : [];
        return {
            pageTitle: $("dgPageTitle").value.trim(),
            kwPrimary: $("dgKwPrimary").value.trim(),
            kwSecondaryRaw: kwSecondaryRaw, kwSecondaryList: kwSecondaryList,
            contentType: $("dgContentType").value, audience: $("dgAudience").value.trim(),
            brand: $("dgBrand").value.trim(), tone: $("dgTone").value, length: $("dgLength").value,
            numSuggestions: parseInt($("dgNumSuggestions").value, 10),
            additionalContext: $("dgContext").value.trim()
        };
    }

    /* ---------- init ---------- */

    populateSelect("dgContentType", CONTENT_TYPES);
    $("dgContentType").value = "blog-post";
    populateSelect("dgTone", TONES);
    $("dgTone").value = "professional";

    $("btnHeroCta").addEventListener("click", function () {
        $("dgForm").scrollIntoView({ behavior: "smooth", block: "start" });
        $("dgKwPrimary").focus();
    });

    $("dgForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var kw = $("dgKwPrimary").value.trim();
        var errEl = $("errKwPrimary");
        if (!kw) { errEl.textContent = "Primary keyword is required."; $("dgKwPrimary").focus(); return; }
        errEl.textContent = "";

        var settings = collectSettings();
        currentSettings = settings;
        selectedId = null;
        var fresh = generateDescriptions(settings, {});
        currentResults = fresh.map(function (item) { return { item: item, scored: scoreDescription(item, settings) }; });
        renderAll();
        showToast(currentResults.length < settings.numSuggestions
            ? ("Generated " + currentResults.length + " unique descriptions for this mix - add more context for extra variety.")
            : (currentResults.length + " descriptions generated!"));
        persistLastSession();
        $("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("btnClearForm").addEventListener("click", function () {
        $("dgForm").reset();
        $("dgContentType").value = "blog-post";
        $("dgTone").value = "professional";
        $("dgLength").value = "recommended";
        $("dgNumSuggestions").value = "5";
        $("errKwPrimary").textContent = "";
        $("dgKwPrimary").focus();
    });

    /* result card actions (delegated) */
    $("resultsGrid").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-act]");
        if (!btn) return;
        var card = btn.closest("[data-id]");
        var id = card.getAttribute("data-id");
        var idx = -1;
        currentResults.forEach(function (r, i) { if (r.item.id === id) idx = i; });
        if (idx === -1) return;
        var act = btn.getAttribute("data-act");

        if (act === "copy") {
            copyText(currentResults[idx].item.text, "Description copied to clipboard.");
        } else if (act === "select") {
            selectedId = (selectedId === id) ? null : id;
            renderAll();
            persistLastSession();
            if (selectedId) $("finalSection").scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (act === "delete") {
            currentResults.splice(idx, 1);
            if (selectedId === id) selectedId = null;
            renderAll();
            persistLastSession();
        } else if (act === "regen") {
            var excludeSet = {};
            currentResults.forEach(function (r) { excludeSet[r.item.text.toLowerCase()] = true; });
            var fresh = generateDescriptions(Object.assign({}, currentSettings, { numSuggestions: 1 }), excludeSet);
            if (fresh.length) {
                currentResults[idx] = { item: fresh[0], scored: scoreDescription(fresh[0], currentSettings) };
                if (selectedId === id) selectedId = fresh[0].id;
                renderAll();
                persistLastSession();
                showToast("Description regenerated.");
            } else {
                showToast("Could not generate a new unique description - try different settings.");
            }
        } else if (act === "edit") {
            var textEl = card.querySelector(".dg-desc-text");
            var isEditing = textEl.getAttribute("contenteditable") === "true";
            if (!isEditing) {
                textEl.textContent = currentResults[idx].item.text;
                textEl.setAttribute("contenteditable", "true");
                textEl.focus();
                document.execCommand && document.execCommand("selectAll", false, null);
                btn.textContent = "Save";
            } else {
                var newText = textEl.textContent.replace(/\s+/g, " ").trim();
                if (newText) {
                    currentResults[idx].item.text = newText;
                    currentResults[idx].scored = scoreDescription(currentResults[idx].item, currentSettings);
                }
                renderAll();
                persistLastSession();
                showToast("Description updated.");
            }
        }
    });

    /* live character counter while editing */
    $("resultsGrid").addEventListener("input", function (e) {
        var textEl = e.target.closest(".dg-desc-text[contenteditable='true']");
        if (!textEl) return;
        var card = textEl.closest(".dg-desc-card");
        var charTile = card.querySelector(".dg-score:first-child strong");
        var idx = -1;
        currentResults.forEach(function (r, i) { if (r.item.id === card.getAttribute("data-id")) idx = i; });
        if (charTile && idx !== -1) {
            var len = textEl.textContent.length;
            charTile.textContent = len + "/" + currentResults[idx].scored.bucket.max;
        }
    });

    /* bulk actions */
    $("btnCopyAll").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to copy yet."); return; }
        copyText(currentResults.map(function (r) { return r.item.text; }).join("\n\n"), "All descriptions copied.");
    });
    $("btnDownloadTxt").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to export yet."); return; }
        downloadBlob(currentResults.map(function (r) { return r.item.text; }).join("\n\n"), "seo-descriptions.txt", "text/plain");
    });
    $("btnGenerateMore").addEventListener("click", function () {
        if (!currentSettings) { showToast("Generate descriptions first."); return; }
        var excludeSet = {};
        currentResults.forEach(function (r) { excludeSet[r.item.text.toLowerCase()] = true; });
        var more = generateDescriptions(currentSettings, excludeSet);
        var added = more.map(function (item) { return { item: item, scored: scoreDescription(item, currentSettings) }; });
        currentResults = currentResults.concat(added);
        renderAll();
        persistLastSession();
        showToast(added.length ? (added.length + " more descriptions added.") : "No more unique descriptions available for this mix.");
    });
    $("btnClearResults").addEventListener("click", function () {
        if (!currentResults.length) return;
        if (!window.confirm("Clear all generated descriptions?")) return;
        currentResults = [];
        selectedId = null;
        renderAll();
        persistLastSession();
        showToast("Results cleared.");
    });

    /* final selection */
    $("btnCopyFinal").addEventListener("click", function () {
        copyText($("finalText").textContent, "Final description copied.");
    });
    $("btnClearFinal").addEventListener("click", function () {
        selectedId = null;
        renderAll();
        persistLastSession();
    });

    restoreLastSession();
})();
