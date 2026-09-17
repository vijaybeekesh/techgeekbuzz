/* SEO Description Checker - character count, pixel width, word count, SERP
   preview, keyword/readability/CTA analysis, and a transparent SEO score.
   Everything runs client-side, no network calls. */

(function () {
    "use strict";

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    /* ---------- configurable thresholds - adjust here as guidance evolves ---------- */

    var CHAR_MIN = 120;          // recommended lower bound
    var CHAR_MAX = 160;          // recommended upper bound (also shown as "x / 160")
    var CHAR_VERY_SHORT = 50;    // below this: flagged more strongly
    var CHAR_VERY_LONG = 200;    // above this: flagged more strongly
    var PIXEL_GUIDELINE = 920;   // approximate desktop SERP description guideline
    var METER_SCALE_MAX = 1100;  // width the meter bar represents at 100%
    var DESC_FONT = "400 14px Arial, Helvetica, sans-serif"; // approximates Google's snippet body text

    var CTA_PHRASES = [
        "learn more", "get started", "shop now", "compare", "try it free", "try for free",
        "discover", "sign up", "download", "book now", "contact us", "subscribe", "explore",
        "buy now", "order now", "get a quote", "start your free trial", "start free trial",
        "join now", "read more", "find out", "call now", "request a demo", "get offer",
        "claim your", "apply now", "enroll now", "get free", "start now", "see how"
    ];

    var STOPWORDS = ("a an the and or but for nor in on at to of by with as is are was were be been being " +
        "this that these those your you our we it its for from into onto up down out over under").split(" ")
        .reduce(function (acc, w) { acc[w] = true; return acc; }, {});

    /* ---------- pixel width measurement ---------- */

    var canvasCtx = null;
    var canvasSupported = true;
    function getCtx() {
        if (canvasCtx || !canvasSupported) return canvasCtx;
        try {
            var canvas = document.createElement("canvas");
            canvasCtx = canvas.getContext("2d");
            if (canvasCtx) canvasCtx.font = DESC_FONT;
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
            if (ch === " ") w += 3.8;
            else if (NARROW_CHARS.indexOf(ch) !== -1) w += 3.6;
            else if (WIDE_CHARS.indexOf(ch) !== -1) w += 10.5;
            else if (/[A-Z]/.test(ch)) w += 8.4;
            else if (/[0-9]/.test(ch)) w += 7.3;
            else if (/[a-z]/.test(ch)) w += 6.6;
            else w += 7;
        }
        return Math.round(w);
    }

    function measurePixelWidth(text) {
        var ctx = getCtx();
        if (ctx) return Math.round(ctx.measureText(text).width);
        return estimatePixelWidthFallback(text);
    }

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("dcToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
    }

    /* ---------- normalization helpers ---------- */

    function normalizeForDisplay(raw) {
        return raw.replace(/\s+/g, " ").trim();
    }

    function countWords(raw) {
        var trimmed = raw.trim();
        if (!trimmed) return 0;
        return trimmed.split(/\s+/).filter(Boolean).length;
    }

    function splitSentences(display) {
        return display.split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    }

    /* ---------- analysis ---------- */

    function analyzeDescription(raw, keyword) {
        var display = normalizeForDisplay(raw);
        var charCount = raw.length;
        var charsNoSpaces = raw.replace(/\s/g, "").length;
        var words = countWords(raw);
        var pixelWidth = display ? measurePixelWidth(display) : 0;

        var isEmpty = charCount === 0;
        var tooLong = !isEmpty && (charCount > CHAR_MAX || pixelWidth > PIXEL_GUIDELINE);
        var veryLong = charCount > CHAR_VERY_LONG || pixelWidth > 1080;
        var tooShort = !isEmpty && !tooLong && charCount < CHAR_MIN;
        var veryShort = charCount > 0 && charCount < CHAR_VERY_SHORT;
        var good = !isEmpty && !tooLong && !tooShort;
        var status = isEmpty ? "empty" : (tooLong ? "long" : (tooShort ? "short" : "good"));

        var checks = [];
        var score = { length: 0, pixel: 0, keyword: null, readability: 0, cta: 0 };

        if (isEmpty) {
            return {
                display: display, charCount: 0, charsNoSpaces: 0, words: 0, pixelWidth: 0,
                isEmpty: true, tooLong: false, tooShort: false, veryLong: false, veryShort: false,
                good: false, status: "empty", checks: [], score: 0, scoreBreakdown: [],
                keywordFound: false, keywordCount: 0, keywordPosition: ""
            };
        }

        /* length */
        checks.push({
            ok: good ? "good" : (charCount >= 80 && charCount <= 200 ? "warn" : "bad"),
            text: good
                ? "Description length is within the recommended range (" + CHAR_MIN + "-" + CHAR_MAX + " characters)."
                : (tooLong
                    ? "Description is " + charCount + " characters - consider trimming it closer to " + CHAR_MIN + "-" + CHAR_MAX + "."
                    : "Description is " + charCount + " characters - consider adding more detail (aim for " + CHAR_MIN + "-" + CHAR_MAX + ").")
        });
        if (charCount === 0) score.length = 0;
        else if (charCount < CHAR_VERY_SHORT) score.length = Math.round((charCount / CHAR_VERY_SHORT) * 10);
        else if (charCount < CHAR_MIN) score.length = 20;
        else if (charCount <= CHAR_MAX) score.length = 30;
        else if (charCount <= CHAR_VERY_LONG) score.length = 18;
        else score.length = 8;

        /* pixel width */
        checks.push({
            ok: pixelWidth <= PIXEL_GUIDELINE ? "good" : "warn",
            text: pixelWidth <= PIXEL_GUIDELINE
                ? "Pixel width (" + pixelWidth + "px) fits within the approximate " + PIXEL_GUIDELINE + "px guideline."
                : "Pixel width (" + pixelWidth + "px) exceeds the approximate " + PIXEL_GUIDELINE + "px guideline and may be truncated."
        });
        score.pixel = pixelWidth <= PIXEL_GUIDELINE ? 20 : (pixelWidth <= 1050 ? 10 : 4);

        if (veryShort) checks.push({ ok: "bad", text: "Description is very short (" + charCount + " characters) - it likely doesn't give enough context." });
        if (veryLong) checks.push({ ok: "bad", text: "Description is very long (" + charCount + " characters) - it will almost certainly be truncated in search results." });

        /* word count */
        checks.push({
            ok: (words >= 12 && words <= 30) ? "good" : "warn",
            text: (words >= 12 && words <= 30)
                ? "Word count (" + words + ") reads naturally."
                : (words < 12 ? "Only " + words + " word(s) - consider expanding for more context." : words + " words - consider tightening the description.")
        });

        /* readability: long sentences */
        var sentences = splitSentences(display);
        var longSentence = sentences.some(function (s) { return s.split(/\s+/).filter(Boolean).length > 25; });
        if (longSentence) {
            checks.push({ ok: "warn", text: "One or more sentences are quite long - consider shortening them to make the description easier to scan." });
        }

        /* readability: excessive punctuation */
        var bangCount = (display.match(/!/g) || []).length;
        var qCount = (display.match(/\?/g) || []).length;
        var excessivePunct = bangCount > 1 || qCount > 1 || /!!|\?\?|\.\.\.\./.test(display);
        if (excessivePunct) {
            checks.push({ ok: "warn", text: "Excessive punctuation detected - too many \"!\" or \"?\" can look unnatural or spammy." });
        }

        /* readability: repeated words (excluding stopwords) */
        var wordList = display.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, "").split(/\s+/).filter(Boolean);
        var freq = {};
        var repeated = [];
        wordList.forEach(function (w) {
            if (STOPWORDS[w] || w.length < 3) return;
            freq[w] = (freq[w] || 0) + 1;
            if (freq[w] === 3) repeated.push(w);
        });
        if (repeated.length) {
            checks.push({ ok: "warn", text: "Word(s) repeated several times: \"" + repeated.join('", "') + "\" - vary your language where possible." });
        }

        var readabilityScore = 20;
        if (longSentence) readabilityScore -= 6;
        if (excessivePunct) readabilityScore -= 5;
        if (repeated.length) readabilityScore -= 5;
        score.readability = clamp(readabilityScore, 0, 20);

        /* keyword */
        var kw = (keyword || "").trim();
        var keywordFound = false, keywordCount = 0, keywordPosition = "";
        if (kw) {
            var lowerDisplay = display.toLowerCase();
            var lowerKw = kw.toLowerCase();
            var idx = lowerDisplay.indexOf(lowerKw);
            keywordFound = idx !== -1;

            if (keywordFound) {
                var re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
                keywordCount = (display.match(re) || []).length;
                var relPos = idx / display.length;
                keywordPosition = relPos <= 0.4 ? "Early in description" : (relPos <= 0.75 ? "Middle of description" : "Late in description");

                checks.push({
                    ok: relPos <= 0.4 ? "good" : "warn",
                    text: relPos <= 0.4
                        ? 'Primary keyword "' + kw + '" appears early in the description, which is a strong position.'
                        : 'Primary keyword "' + kw + '" is present but appears later - moving it earlier can help.'
                });
                if (keywordCount >= 3) {
                    checks.push({ ok: "warn", text: 'Primary keyword "' + kw + '" appears ' + keywordCount + ' times - this may look like keyword stuffing.' });
                }

                if (keywordCount >= 3) score.keyword = 6;
                else if (keywordCount === 2) score.keyword = 12;
                else score.keyword = relPos <= 0.4 ? 20 : 14;
            } else {
                keywordPosition = "Not found";
                checks.push({ ok: "warn", text: 'Primary keyword "' + kw + '" was not found in the description.' });
                score.keyword = 0;
            }
        }

        /* CTA */
        var lowerDisplayForCta = display.toLowerCase();
        var foundCta = CTA_PHRASES.find(function (p) { return lowerDisplayForCta.indexOf(p) !== -1; });
        if (foundCta) {
            checks.push({ ok: "good", text: 'Contains a call to action ("' + foundCta + '"), which can encourage clicks.' });
            score.cta = 10;
        } else {
            checks.push({ ok: "warn", text: "No clear call to action detected - consider adding one (e.g. \"Learn more\") where appropriate." });
            score.cta = 5;
        }

        /* excessive special characters */
        var specialChars = display.replace(/[\p{L}\p{N}\s'".,!?;:()-]/gu, "");
        var specialRatio = display.length ? specialChars.length / display.length : 0;
        if (specialRatio > 0.12) {
            checks.push({ ok: "warn", text: "Contains a lot of special characters - too many symbols can look spammy in search results." });
        }

        /* total score */
        var earned = score.length + score.pixel + score.readability + score.cta + (score.keyword || 0);
        var possible = 30 + 20 + 20 + 10 + (kw ? 20 : 0);
        var total = Math.round((earned / possible) * 100);

        var breakdown = [
            { label: "Length", earned: score.length, possible: 30 },
            { label: "Pixel Width", earned: score.pixel, possible: 20 },
            { label: "Readability", earned: score.readability, possible: 20 },
            { label: "Call to Action", earned: score.cta, possible: 10 }
        ];
        if (kw) breakdown.push({ label: "Keyword Usage", earned: score.keyword, possible: 20 });

        return {
            display: display, charCount: charCount, charsNoSpaces: charsNoSpaces, words: words,
            pixelWidth: pixelWidth, isEmpty: isEmpty, tooLong: tooLong, tooShort: tooShort,
            veryLong: veryLong, veryShort: veryShort, good: good, status: status, checks: checks,
            score: clamp(total, 0, 100), scoreBreakdown: breakdown,
            keywordFound: keywordFound, keywordCount: keywordCount, keywordPosition: keywordPosition
        };
    }

    /* ---------- rendering ---------- */

    function renderCharCount(a) {
        var wrap = $("dcCharCount");
        $("dcCharCountValue").textContent = a.charCount;
        wrap.classList.remove("good", "warn", "bad");
        if (!a.isEmpty) wrap.classList.add(a.good ? "good" : (a.veryShort || a.veryLong ? "bad" : "warn"));
    }

    function renderStats(a) {
        $("dcStatChars").textContent = a.charCount;
        $("dcStatCharsNoSpaces").textContent = a.charsNoSpaces;
        $("dcStatWords").textContent = a.words;
        $("dcStatPixel").textContent = a.pixelWidth + " px";
    }

    function renderMeter(a) {
        var pct = clamp((a.pixelWidth / METER_SCALE_MAX) * 100, 0, 100);
        var fill = $("dcMeterFill");
        fill.style.width = pct + "%";
        fill.classList.remove("warn", "bad");
        if (a.pixelWidth > PIXEL_GUIDELINE) fill.classList.add(a.pixelWidth > 1080 ? "bad" : "warn");

        var markerPct = clamp((PIXEL_GUIDELINE / METER_SCALE_MAX) * 100, 0, 100);
        $("dcMeterMarker").style.left = markerPct + "%";

        $("dcPixelStatus").textContent = a.isEmpty
            ? "Approximate desktop guideline: ~" + PIXEL_GUIDELINE + "px"
            : (a.pixelWidth <= PIXEL_GUIDELINE ? "Within the approximate recommended range" : "Exceeds the approximate recommended range");
    }

    function renderStatus(a) {
        var box = $("dcStatus");
        box.classList.remove("good", "warn", "bad");
        var icon = $("dcStatusIcon");
        var text = $("dcStatusText");
        var sub = $("dcStatusSubtext");

        if (a.isEmpty) {
            icon.textContent = "ℹ️";
            text.textContent = "Enter a description to see your SEO analysis.";
            sub.textContent = "";
            return;
        }

        if (a.good) {
            box.classList.add("good");
            icon.textContent = "✓";
            text.textContent = "Good Length";
            sub.textContent = "The description is within the recommended range.";
        } else if (a.tooLong) {
            box.classList.add("warn");
            icon.textContent = "⚠";
            text.textContent = a.veryLong ? "Too Long" : "May Be Truncated";
            sub.textContent = "Your description may be too long and could be truncated.";
        } else {
            box.classList.add("warn");
            icon.textContent = "⚠";
            text.textContent = "Too Short";
            sub.textContent = "The description may not provide enough context.";
        }
    }

    function renderSerp(a) {
        var siteName = $("dcSiteName").value.trim();
        var url = $("dcSiteUrl").value.trim();
        var pageTitle = $("dcPageTitle").value.trim();

        $("dcSerpSitename").textContent = siteName || "Example Website";
        $("dcSerpUrl").textContent = url || "example.com › products › invoice-generator";
        $("dcSerpTitle").textContent = pageTitle || "Your page title will appear here";

        var descEl = $("dcSerpDesc");
        if (a.isEmpty) {
            descEl.innerHTML = '<span class="dc-serp-placeholder">Your meta description will appear here</span>';
            return;
        }

        if (a.pixelWidth > PIXEL_GUIDELINE) {
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
            descEl.innerHTML = esc(safePart) + (riskPart ? '<span class="dc-truncated-part">' + esc(riskPart) + "</span>" : "");
        } else {
            descEl.textContent = a.display;
        }
    }

    function renderScore(a) {
        var ring = $("dcScoreRing");
        var value = a.isEmpty ? 0 : a.score;
        $("dcScoreValue").textContent = value;
        ring.style.setProperty("--dc-score", value);
        ring.classList.remove("good", "warn", "bad");
        if (!a.isEmpty) ring.classList.add(value >= 75 ? "good" : (value >= 45 ? "warn" : "bad"));

        var list = $("dcScoreBreakdown");
        if (a.isEmpty) {
            list.innerHTML = '<li><span>Enter a description to calculate a score.</span></li>';
            return;
        }
        list.innerHTML = a.scoreBreakdown.map(function (row) {
            return "<li><span>" + esc(row.label) + "</span><span>" + row.earned + " / " + row.possible + "</span></li>";
        }).join("");
    }

    function renderAnalysis(a) {
        var list = $("dcAnalysisList");
        var empty = $("dcAnalysisEmpty");
        if (a.isEmpty) {
            list.hidden = true;
            empty.hidden = false;
            return;
        }
        empty.hidden = true;
        list.hidden = false;
        var iconFor = { good: "✓", warn: "⚠", bad: "✕" };
        list.innerHTML = a.checks.map(function (c) {
            return '<li class="dc-analysis-item ' + c.ok + '"><span class="dc-analysis-icon">' + iconFor[c.ok] + '</span><span>' + esc(c.text) + "</span></li>";
        }).join("");
    }

    function renderKeywordResult(a, keyword) {
        var box = $("dcKeywordResult");
        var kw = (keyword || "").trim();
        if (!kw || a.isEmpty) { box.hidden = true; return; }
        box.hidden = false;

        var statusEl = $("dcKwStatus");
        statusEl.textContent = a.keywordFound ? "✓ Keyword found" : "⚠ Not found";
        statusEl.className = a.keywordFound ? "good" : "warn";

        $("dcKwOccurrences").textContent = String(a.keywordCount);
        $("dcKwPosition").textContent = a.keywordPosition;
    }

    /* ---------- main update ---------- */

    function update() {
        var raw = $("dcDescInput").value;
        var keyword = $("dcKeyword").value;
        var a = analyzeDescription(raw, keyword);

        renderCharCount(a);
        renderStats(a);
        renderMeter(a);
        renderStatus(a);
        renderSerp(a);
        renderScore(a);
        renderAnalysis(a);
        renderKeywordResult(a, keyword);
    }

    /* ---------- init ---------- */

    ["input", "change"].forEach(function (evt) {
        $("dcDescInput").addEventListener(evt, update);
        $("dcKeyword").addEventListener(evt, update);
        $("dcPageTitle").addEventListener(evt, update);
        $("dcSiteName").addEventListener(evt, update);
        $("dcSiteUrl").addEventListener(evt, update);
    });

    $("btnToggleOptional").addEventListener("click", function () {
        var expanded = this.getAttribute("aria-expanded") === "true";
        this.setAttribute("aria-expanded", String(!expanded));
        $("dcOptionalFields").hidden = expanded;
    });

    $("btnCopyDesc").addEventListener("click", function () {
        var text = $("dcDescInput").value.trim();
        if (!text) { showToast("Nothing to copy yet."); return; }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast("Copied!"); }, function () { showToast("Could not copy - please copy manually."); });
        } else {
            window.prompt("Copy this description:", text);
        }
    });

    $("btnClearDesc").addEventListener("click", function () {
        $("dcDescInput").value = "";
        $("dcKeyword").value = "";
        $("dcPageTitle").value = "";
        $("dcSiteName").value = "";
        $("dcSiteUrl").value = "";
        update();
        $("dcDescInput").focus();
        showToast("Cleared.");
    });

    update();
})();
