/* SEO Title Checker - character count, pixel width, word count, SERP preview,
   and rule-based title analysis. Everything runs client-side, no network calls. */

(function () {
    "use strict";

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    /* ---------- pixel width measurement ---------- */
    /* Uses a canvas with a font size close to how Google renders desktop
       SERP titles (~20px Arial). Falls back to a char-width heuristic if
       canvas 2D isn't available. */

    var canvasCtx = null;
    var canvasSupported = true;
    function getCtx() {
        if (canvasCtx || !canvasSupported) return canvasCtx;
        try {
            var canvas = document.createElement("canvas");
            canvasCtx = canvas.getContext("2d");
            if (canvasCtx) canvasCtx.font = "400 20px Arial, Helvetica, sans-serif";
            else canvasSupported = false;
        } catch (e) { canvasSupported = false; }
        return canvasCtx;
    }

    var NARROW_CHARS = "iIl.,:;'|!".split("");
    var WIDE_CHARS = "mMWw@".split("");
    function estimatePixelWidthFallback(text) {
        var w = 0;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (ch === " ") w += 5.5;
            else if (NARROW_CHARS.indexOf(ch) !== -1) w += 5;
            else if (WIDE_CHARS.indexOf(ch) !== -1) w += 15;
            else if (/[A-Z]/.test(ch)) w += 12;
            else if (/[0-9]/.test(ch)) w += 10.5;
            else if (/[a-z]/.test(ch)) w += 9.5;
            else w += 10;
        }
        return Math.round(w);
    }

    function measurePixelWidth(text) {
        var ctx = getCtx();
        if (ctx) return Math.round(ctx.measureText(text).width);
        return estimatePixelWidthFallback(text);
    }

    /* ---------- constants ---------- */

    var CHAR_MIN = 50;
    var CHAR_MAX = 60;
    var PIXEL_GUIDELINE = 600; // approximate desktop SERP guideline
    var METER_SCALE_MAX = 720; // width the meter bar represents at 100%

    var STOPWORDS = ("a an the and or but for nor in on at to of by with as is are was were be been being " +
        "this that these those your you our we it its").split(" ").reduce(function (acc, w) { acc[w] = true; return acc; }, {});

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("tcToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
    }

    /* ---------- normalization helpers ---------- */

    function normalizeForDisplay(raw) {
        // Browsers/search engines collapse runs of whitespace (including
        // newlines) in a <title> to single spaces before rendering.
        return raw.replace(/\s+/g, " ").trim();
    }

    function countWords(raw) {
        var trimmed = raw.trim();
        if (!trimmed) return 0;
        return trimmed.split(/\s+/).filter(Boolean).length;
    }

    /* ---------- analysis ---------- */

    function analyzeTitle(raw, keyword) {
        var display = normalizeForDisplay(raw);
        var charCount = raw.length;
        var charsNoSpaces = raw.replace(/\s/g, "").length;
        var words = countWords(raw);
        var pixelWidth = display ? measurePixelWidth(display) : 0;

        var isEmpty = charCount === 0;
        var tooLong = !isEmpty && (charCount > CHAR_MAX || pixelWidth > PIXEL_GUIDELINE);
        var veryLong = charCount > 70 || pixelWidth > 680;
        var tooShort = !isEmpty && !tooLong && charCount < CHAR_MIN;
        var veryShort = charCount > 0 && charCount < 20;
        var good = !isEmpty && !tooLong && !tooShort;

        var status = isEmpty ? "empty" : (tooLong ? "long" : (tooShort ? "short" : "good"));

        var checks = [];
        if (!isEmpty) {
            checks.push({
                ok: good ? "good" : (charCount >= 40 && charCount <= 70 ? "warn" : "bad"),
                text: good
                    ? "Title length is within the recommended range (" + CHAR_MIN + "-" + CHAR_MAX + " characters)."
                    : (tooLong
                        ? "Title is " + charCount + " characters - consider trimming it closer to " + CHAR_MIN + "-" + CHAR_MAX + "."
                        : "Title is " + charCount + " characters - consider adding a bit more detail (aim for " + CHAR_MIN + "-" + CHAR_MAX + ").")
            });

            checks.push({
                ok: pixelWidth <= PIXEL_GUIDELINE ? "good" : "warn",
                text: pixelWidth <= PIXEL_GUIDELINE
                    ? "Pixel width (" + pixelWidth + "px) fits within the approximate " + PIXEL_GUIDELINE + "px guideline."
                    : "Pixel width (" + pixelWidth + "px) exceeds the approximate " + PIXEL_GUIDELINE + "px guideline and may be truncated."
            });

            if (words > 0) {
                checks.push({
                    ok: (words >= 4 && words <= 12) ? "good" : "warn",
                    text: (words >= 4 && words <= 12)
                        ? "Word count (" + words + ") is easy to scan."
                        : (words < 4 ? "Only " + words + " word(s) - a short title may lack context." : words + " words - consider tightening the title.")
                });
            }

            if (veryShort) {
                checks.push({ ok: "bad", text: "Title is very short (" + charCount + " characters) - it likely doesn't describe the page well." });
            }
            if (veryLong) {
                checks.push({ ok: "bad", text: "Title is very long (" + charCount + " characters) - it will almost certainly be truncated in search results." });
            }

            // duplicate / repeated words
            var wordList = display.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, "").split(/\s+/).filter(Boolean);
            var freq = {};
            var repeated = [];
            wordList.forEach(function (w) {
                if (STOPWORDS[w] || w.length < 3) return;
                freq[w] = (freq[w] || 0) + 1;
                if (freq[w] === 2) repeated.push(w);
            });
            if (repeated.length) {
                checks.push({ ok: "warn", text: "Repeated word(s): \"" + repeated.join('", "') + "\" - avoid unnecessary repetition." });
            } else {
                checks.push({ ok: "good", text: "No repeated keywords found." });
            }

            // excessive capitalization
            var letters = display.replace(/[^A-Za-z]/g, "");
            var upper = display.replace(/[^A-Z]/g, "");
            var isShouting = letters.length >= 6 && upper.length === letters.length;
            var upperRatio = letters.length ? upper.length / letters.length : 0;
            if (isShouting) {
                checks.push({ ok: "bad", text: "Title is in all caps - this can look like shouting to both users and search engines." });
            } else if (upperRatio > 0.4) {
                checks.push({ ok: "warn", text: "Excessive capitalization detected - consider standard title case instead." });
            } else {
                checks.push({ ok: "good", text: "Capitalization looks natural." });
            }

            // excessive special characters
            var specialChars = display.replace(/[\p{L}\p{N}\s'-]/gu, "");
            var specialRatio = display.length ? specialChars.length / display.length : 0;
            if (specialRatio > 0.15) {
                checks.push({ ok: "warn", text: "Contains a lot of special characters - too many symbols can look spammy in search results." });
            } else {
                checks.push({ ok: "good", text: "No excessive special characters." });
            }

            // keyword placement
            var kw = (keyword || "").trim().toLowerCase();
            if (kw) {
                var lowerDisplay = display.toLowerCase();
                var pos = lowerDisplay.indexOf(kw);
                if (pos === -1) {
                    checks.push({ ok: "warn", text: 'Target keyword "' + keyword.trim() + '" was not found in the title.' });
                } else if (pos <= Math.floor(display.length * 0.4)) {
                    checks.push({ ok: "good", text: "Target keyword appears early in the title, which is a strong position." });
                } else {
                    checks.push({ ok: "warn", text: "Target keyword is present but appears later in the title - moving it earlier can help." });
                }
            }
        }

        return {
            display: display, charCount: charCount, charsNoSpaces: charsNoSpaces, words: words,
            pixelWidth: pixelWidth, isEmpty: isEmpty, tooLong: tooLong, tooShort: tooShort,
            veryLong: veryLong, veryShort: veryShort, good: good, status: status, checks: checks
        };
    }

    /* ---------- rendering ---------- */

    function renderCharCount(a) {
        var wrap = $("tcCharCount");
        $("tcCharCountValue").textContent = a.charCount;
        wrap.classList.remove("good", "warn", "bad");
        if (!a.isEmpty) wrap.classList.add(a.good ? "good" : (a.veryShort || a.veryLong ? "bad" : "warn"));
    }

    function renderStats(a) {
        $("tcStatChars").textContent = a.charCount;
        $("tcStatCharsNoSpaces").textContent = a.charsNoSpaces;
        $("tcStatWords").textContent = a.words;
        $("tcStatPixel").textContent = a.pixelWidth + " px";
    }

    function renderMeter(a) {
        var pct = clamp((a.pixelWidth / METER_SCALE_MAX) * 100, 0, 100);
        var fill = $("tcMeterFill");
        fill.style.width = pct + "%";
        fill.classList.remove("warn", "bad");
        if (a.pixelWidth > PIXEL_GUIDELINE) fill.classList.add(a.pixelWidth > 680 ? "bad" : "warn");

        var markerPct = clamp((PIXEL_GUIDELINE / METER_SCALE_MAX) * 100, 0, 100);
        $("tcMeterMarker").style.left = markerPct + "%";

        $("tcPixelStatus").textContent = a.isEmpty
            ? "Approximate desktop guideline: ~" + PIXEL_GUIDELINE + "px"
            : (a.pixelWidth <= PIXEL_GUIDELINE ? "Within the approximate recommended range" : "Exceeds the approximate recommended range");
    }

    function renderStatus(a) {
        var box = $("tcStatus");
        box.classList.remove("good", "warn", "bad");
        var icon = $("tcStatusIcon");
        var text = $("tcStatusText");
        var sub = $("tcStatusSubtext");

        if (a.isEmpty) {
            icon.textContent = "ℹ️";
            text.textContent = "Enter a title to see your SEO analysis.";
            sub.textContent = "";
            return;
        }

        if (a.good) {
            box.classList.add("good");
            icon.textContent = "✓";
            text.textContent = "Good Length";
            sub.textContent = "Title length looks reasonable.";
        } else if (a.tooLong) {
            box.classList.add("warn");
            icon.textContent = "⚠";
            text.textContent = a.veryLong ? "Too Long" : "May Be Truncated";
            sub.textContent = "Your title may be truncated in search results.";
        } else {
            box.classList.add("warn");
            icon.textContent = "⚠";
            text.textContent = "Too Short";
            sub.textContent = "Your title may be too short - consider adding more descriptive detail.";
        }
    }

    function renderSerp(a) {
        var siteName = $("tcSiteName").value.trim();
        var url = $("tcSiteUrl").value.trim();
        var desc = $("tcSiteDesc").value.trim();

        $("tcSerpSitename").textContent = siteName || "Example Website";
        $("tcSerpUrl").textContent = url || "www.example.com";

        var titleEl = $("tcSerpTitle");
        if (a.isEmpty) {
            titleEl.innerHTML = '<span class="tc-serp-placeholder">Your SEO title will appear here</span>';
        } else if (a.pixelWidth > PIXEL_GUIDELINE) {
            // Find the approximate character index where the pixel guideline is exceeded,
            // so the likely-truncated tail can be highlighted.
            var ctx = getCtx();
            var cut = a.display.length;
            if (ctx) {
                for (var i = 1; i <= a.display.length; i++) {
                    if (ctx.measureText(a.display.slice(0, i)).width > PIXEL_GUIDELINE) { cut = i - 1; break; }
                }
            } else {
                cut = Math.max(1, Math.floor(a.display.length * (PIXEL_GUIDELINE / a.pixelWidth)));
            }
            var safePart = a.display.slice(0, cut);
            var riskPart = a.display.slice(cut);
            titleEl.innerHTML = esc(safePart) + (riskPart ? '<span class="tc-truncated-part">' + esc(riskPart) + "</span>" : "");
        } else {
            titleEl.textContent = a.display;
        }

        $("tcSerpDesc").textContent = desc || "Add a description above to preview it here, or search engines may generate one automatically from your page content.";
    }

    function renderAnalysis(a) {
        var list = $("tcAnalysisList");
        var empty = $("tcAnalysisEmpty");
        if (a.isEmpty) {
            list.hidden = true;
            empty.hidden = false;
            return;
        }
        empty.hidden = true;
        list.hidden = false;
        var iconFor = { good: "✓", warn: "⚠", bad: "✕" };
        list.innerHTML = a.checks.map(function (c) {
            return '<li class="tc-analysis-item ' + c.ok + '"><span class="tc-analysis-icon">' + iconFor[c.ok] + '</span><span>' + esc(c.text) + "</span></li>";
        }).join("");
    }

    function renderKeywordResult(a, keyword) {
        var box = $("tcKeywordResult");
        var kw = (keyword || "").trim();
        if (!kw || a.isEmpty) { box.hidden = true; return; }
        var found = a.display.toLowerCase().indexOf(kw.toLowerCase()) !== -1;
        box.hidden = false;
        box.classList.remove("good", "warn");
        box.classList.add(found ? "good" : "warn");
        box.textContent = found ? ("✓ Target keyword found in title.") : ("⚠ Target keyword not found in title.");
    }

    /* ---------- main update ---------- */

    function update() {
        var raw = $("tcTitleInput").value;
        var keyword = $("tcKeyword").value;
        var a = analyzeTitle(raw, keyword);

        renderCharCount(a);
        renderStats(a);
        renderMeter(a);
        renderStatus(a);
        renderSerp(a);
        renderAnalysis(a);
        renderKeywordResult(a, keyword);
    }

    /* ---------- init ---------- */

    ["input", "change"].forEach(function (evt) {
        $("tcTitleInput").addEventListener(evt, update);
        $("tcKeyword").addEventListener(evt, update);
        $("tcSiteName").addEventListener(evt, update);
        $("tcSiteUrl").addEventListener(evt, update);
        $("tcSiteDesc").addEventListener(evt, update);
    });

    $("btnToggleOptional").addEventListener("click", function () {
        var expanded = this.getAttribute("aria-expanded") === "true";
        this.setAttribute("aria-expanded", String(!expanded));
        $("tcOptionalFields").hidden = expanded;
    });

    $("btnCopyTitle").addEventListener("click", function () {
        var text = $("tcTitleInput").value.trim();
        if (!text) { showToast("Nothing to copy yet."); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast("Copied!"); }, function () { showToast("Could not copy - please copy manually."); });
        } else {
            window.prompt("Copy this title:", text);
        }
    });

    $("btnClearTitle").addEventListener("click", function () {
        $("tcTitleInput").value = "";
        $("tcKeyword").value = "";
        $("tcSiteName").value = "";
        $("tcSiteUrl").value = "";
        $("tcSiteDesc").value = "";
        update();
        $("tcTitleInput").focus();
        showToast("Cleared.");
    });

    update();
})();
