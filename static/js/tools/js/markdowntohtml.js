/* Markdown to HTML Converter — parses with marked.js, sanitizes with DOMPurify,
   renders a live preview, and produces a downloadable/copyable HTML output. */

(function () {
    "use strict";

    var HISTORY_KEY = "mdConverterHistory";
    var MAX_HISTORY = 10;
    var DEBOUNCE_MS = 250;
    var WPM = 200;

    var app = document.getElementById("mdApp");
    var input = document.getElementById("mdInput");
    var lineNumbers = document.getElementById("mdLineNumbers");
    var countEl = document.getElementById("mdCount");
    var errorEl = document.getElementById("mdError");
    var preview = document.getElementById("mdPreview");
    var tocBox = document.getElementById("mdToc");
    var htmlOutput = document.getElementById("mdHtmlOutput");
    var toast = document.getElementById("mdToast");
    var editorWrap = document.getElementById("mdEditorWrap");

    var fileInput = document.getElementById("fileInput");
    var historyList = document.getElementById("mdHistoryList");
    var historyEmpty = document.getElementById("mdHistoryEmpty");

    var lastCleanHtml = "";
    var lastFormat = "beautify"; // "beautify" | "minify"
    var isSyncingScroll = false;

    /* ---------- emoji shortcodes (optional GFM-style :shortcode: support) ---------- */

    var EMOJI_MAP = {
        smile: "😄", laughing: "😆", blush: "😊", wink: "😉", heart: "❤️",
        broken_heart: "💔", thumbsup: "👍", thumbsdown: "👎", tada: "🎉",
        rocket: "🚀", fire: "🔥", star: "⭐", warning: "⚠️", bulb: "💡",
        bug: "🐛", sparkles: "✨", check_mark: "✅", x: "❌", eyes: "👀",
        clap: "👏", pray: "🙏",100: "💯", zap: "⚡", tada2: "🎊",
        rocket2: "🛸", memo: "📝", books: "📚", gear: "⚙️", lock: "🔒",
        unlock: "🔓", email: "📧", calendar: "📅", pushpin: "📌",
        hourglass: "⏳", question: "❓", exclamation: "❗", smiley: "😃",
        cry: "😢", joy: "😂", thinking: "🤔", wave: "👋", muscle: "💪"
    };

    function replaceEmojis(text) {
        // Skip fenced code blocks and inline code so shortcodes inside code are left alone.
        return text.replace(/```[\s\S]*?```|`[^`\n]*`|:([a-z0-9_+-]+):/gi, function (match, code) {
            if (code && EMOJI_MAP[code.toLowerCase()]) return EMOJI_MAP[code.toLowerCase()];
            return match;
        });
    }

    /* ---------- slugify for heading anchors / TOC ---------- */

    function slugify(text, used) {
        var base = String(text)
            .toLowerCase()
            .replace(/<[^>]+>/g, "")
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/(^-|-$)/g, "") || "section";
        var slug = base;
        var i = 2;
        while (used[slug]) {
            slug = base + "-" + i;
            i++;
        }
        used[slug] = true;
        return slug;
    }

    /* ---------- marked configuration ---------- */

    function buildRenderer(headingsOut) {
        var renderer = new marked.Renderer();
        var used = {};

        renderer.heading = function (text, level, raw) {
            var slug = slugify(raw, used);
            headingsOut.push({ level: level, text: raw, slug: slug });
            return '<h' + level + ' id="' + slug + '">' + text + '</h' + level + '>\n';
        };

        renderer.listitem = function (text, task) {
            if (task) return '<li class="task-list-item">' + text + '</li>\n';
            return '<li>' + text + '</li>\n';
        };

        return renderer;
    }

    /* ---------- conversion pipeline ---------- */

    function convert(markdownText) {
        var headings = [];
        try {
            var withEmojis = replaceEmojis(markdownText);
            var renderer = buildRenderer(headings);
            var rawHtml = marked.marked(withEmojis, { gfm: true, breaks: false, renderer: renderer });
            var cleanHtml = window.DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
            return { html: cleanHtml, headings: headings, error: null };
        } catch (err) {
            return { html: null, headings: [], error: err && err.message ? err.message : "Could not parse this Markdown." };
        }
    }

    function renderToc(headings) {
        if (!headings.length) {
            tocBox.hidden = true;
            tocBox.innerHTML = "";
            return;
        }
        var items = headings.map(function (h) {
            var indent = Math.max(0, h.level - 1) * 1.2;
            return '<li style="margin-left:' + indent + 'rem"><a href="#' + h.slug + '">' + escapeHtml(h.text) + "</a></li>";
        }).join("");
        tocBox.innerHTML = "<h3>Table of Contents</h3><ul>" + items + "</ul>";
    }

    function escapeHtml(str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function updateCounts(markdownText) {
        var chars = markdownText.length;
        var plain = markdownText
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/[#>*_~`\-+|]/g, " ")
            .replace(/\[[^\]]*\]\([^)]*\)/g, " ");
        var words = plain.trim().length ? plain.trim().split(/\s+/).length : 0;
        var minutes = Math.max(1, Math.round(words / WPM));
        countEl.textContent = words + " words · " + chars + " chars · " + minutes + " min read";
    }

    function updateLineNumbers() {
        if (lineNumbers.classList.contains("hidden")) return;
        var lines = input.value.split("\n").length;
        var nums = [];
        for (var i = 1; i <= lines; i++) nums.push(i);
        lineNumbers.textContent = nums.join("\n");
    }

    function runConvert(showErrors) {
        var text = input.value;
        updateCounts(text);
        updateLineNumbers();

        if (!text.trim()) {
            preview.innerHTML = "";
            htmlOutput.textContent = "";
            tocBox.hidden = true;
            lastCleanHtml = "";
            if (showErrors) setError("");
            return;
        }

        var result = convert(text);
        if (result.error) {
            setError("Couldn't parse this Markdown: " + result.error + ". Showing the last successful preview.");
            return;
        }
        setError("");
        lastCleanHtml = result.html;
        preview.innerHTML = result.html;
        renderToc(result.headings);
        renderHtmlOutput();
    }

    function setError(message) {
        errorEl.textContent = message || "";
    }

    var debounceTimer = null;
    function scheduleConvert() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { runConvert(false); }, DEBOUNCE_MS);
    }

    input.addEventListener("input", scheduleConvert);

    document.getElementById("btnConvert").addEventListener("click", function () {
        runConvert(true);
        saveToHistory(input.value);
        showToast("Converted.");
    });

    /* ---------- HTML output formatting (beautify / minify) ---------- */

    var VOID_TAGS = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1 };
    var PRESERVE_WHITESPACE_TAGS = { pre: 1 };
    // Inline-level tags stay on the same line as surrounding text instead of
    // each getting their own indented line.
    var BLOCK_TAGS = {
        html: 1, head: 1, body: 1, div: 1, section: 1, article: 1, header: 1, footer: 1,
        nav: 1, main: 1, aside: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, p: 1,
        ul: 1, ol: 1, li: 1, table: 1, thead: 1, tbody: 1, tr: 1, th: 1, td: 1,
        blockquote: 1, pre: 1, hr: 1, form: 1, figure: 1, figcaption: 1, details: 1, summary: 1
    };

    function beautifyHtml(html) {
        var tokens = html.match(/<[^>]+>|[^<]+/g) || [];
        var depth = 0;
        var out = [];
        var buffer = "";
        var preserveTag = null;
        var preserveDepth = -1;
        var preserveBuffer = "";

        function flush() {
            if (buffer.trim()) out.push(indent(depth) + buffer.trim());
            buffer = "";
        }

        tokens.forEach(function (token) {
            if (preserveTag) {
                preserveBuffer += token;
                if (token === "</" + preserveTag + ">") {
                    depth = Math.max(0, depth - 1);
                    out.push(indent(preserveDepth) + preserveBuffer);
                    preserveBuffer = "";
                    preserveTag = null;
                    preserveDepth = -1;
                }
                return;
            }

            if (token.charAt(0) === "<") {
                var isClosing = /^<\//.test(token);
                var tagMatch = token.match(/^<\/?([a-zA-Z0-9]+)/);
                var tagName = tagMatch ? tagMatch[1].toLowerCase() : "";
                var isVoid = /\/>$/.test(token) || VOID_TAGS[tagName];

                if (!BLOCK_TAGS[tagName]) {
                    buffer += token;
                    return;
                }

                flush();
                if (isClosing) {
                    depth = Math.max(0, depth - 1);
                    out.push(indent(depth) + token);
                } else {
                    out.push(indent(depth) + token);
                    if (!isVoid) {
                        depth++;
                        if (PRESERVE_WHITESPACE_TAGS[tagName]) {
                            preserveTag = tagName;
                            preserveDepth = depth - 1;
                            preserveBuffer = "";
                        }
                    }
                }
            } else {
                buffer += token;
            }
        });
        flush();

        return out.join("\n");
    }

    function indent(depth) {
        return new Array(depth + 1).join("  ");
    }

    function minifyHtml(html) {
        var placeholders = [];
        var withPlaceholders = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, function (match) {
            placeholders.push(match);
            return " " + (placeholders.length - 1) + " ";
        });
        var minified = withPlaceholders.replace(/>\s+</g, "><").trim();
        return minified.replace(/ (\d+) /g, function (_, i) {
            return placeholders[Number(i)];
        });
    }

    function syntaxHighlight(html) {
        return html
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/&lt;(\/?[a-zA-Z0-9-]+)/g, '&lt;<span class="tok-tag">$1</span>')
            .replace(/([a-zA-Z-]+)=(&quot;|")([^"&]*)(&quot;|")/g, '<span class="tok-attr">$1</span>=<span class="tok-str">$2$3$4</span>');
    }

    function renderHtmlOutput() {
        if (!lastCleanHtml) {
            htmlOutput.innerHTML = "";
            return;
        }
        var formatted = lastFormat === "minify" ? minifyHtml(lastCleanHtml) : beautifyHtml(lastCleanHtml);
        htmlOutput.innerHTML = syntaxHighlight(formatted);
    }

    function getFormattedHtml() {
        return lastFormat === "minify" ? minifyHtml(lastCleanHtml) : beautifyHtml(lastCleanHtml);
    }

    document.getElementById("btnBeautify").addEventListener("click", function () {
        lastFormat = "beautify";
        setFormatButtons();
        renderHtmlOutput();
    });
    document.getElementById("btnMinify").addEventListener("click", function () {
        lastFormat = "minify";
        setFormatButtons();
        renderHtmlOutput();
    });
    function setFormatButtons() {
        document.getElementById("btnBeautify").setAttribute("aria-pressed", lastFormat === "beautify" ? "true" : "false");
        document.getElementById("btnMinify").setAttribute("aria-pressed", lastFormat === "minify" ? "true" : "false");
    }

    /* ---------- toolbar: clear / paste / upload / sample ---------- */

    document.getElementById("btnClear").addEventListener("click", function () {
        input.value = "";
        runConvert(true);
        input.focus();
        showToast("Cleared.");
    });

    document.getElementById("btnPaste").addEventListener("click", function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
            showToast("Clipboard paste isn't supported in this browser.");
            return;
        }
        navigator.clipboard.readText().then(function (text) {
            input.value = text;
            runConvert(true);
            showToast("Pasted from clipboard.");
        }).catch(function () {
            showToast("Couldn't read the clipboard.");
        });
    });

    var ALLOWED_EXTENSIONS = [".md", ".markdown", ".txt"];

    function loadTextFile(file) {
        var name = file.name.toLowerCase();
        var isAllowed = ALLOWED_EXTENSIONS.some(function (ext) { return name.endsWith(ext); });
        if (!isAllowed) {
            setError('Unsupported file type. Please use a ' + ALLOWED_EXTENSIONS.join(", ") + " file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("That file is too large (max 2 MB).");
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            input.value = e.target.result;
            runConvert(true);
            showToast("Loaded " + file.name);
        };
        reader.onerror = function () {
            setError("Couldn't read that file.");
        };
        reader.readAsText(file);
    }

    document.getElementById("btnUpload").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
        if (fileInput.files[0]) loadTextFile(fileInput.files[0]);
        fileInput.value = "";
    });

    var SAMPLE_MARKDOWN = [
        "# Markdown to HTML Converter",
        "",
        "This sample shows off **bold**, *italic*, ~~strikethrough~~, and `inline code`.",
        "",
        "> Blockquotes look like this.",
        "",
        "## Lists",
        "",
        "- Unordered item one",
        "- Unordered item two",
        "  1. Ordered sub-item",
        "  2. Another sub-item",
        "",
        "- [x] Task already done",
        "- [ ] Task still open",
        "",
        "## Code Block",
        "",
        "```js",
        "function greet(name) {",
        "  return `Hello, ${name}!`;",
        "}",
        "```",
        "",
        "## Table",
        "",
        "| Feature | Supported |",
        "|---|---|",
        "| Tables | Yes |",
        "| Task Lists | Yes |",
        "| Emojis | :tada: |",
        "",
        "## Links and Images",
        "",
        "[TechGeekBuzz](https://www.techgeekbuzz.com) and an image:",
        "",
        "![Placeholder](https://via.placeholder.com/150)",
        "",
        "---",
        "",
        "That's a horizontal rule above this line."
    ].join("\n");

    document.getElementById("btnSample").addEventListener("click", function () {
        input.value = SAMPLE_MARKDOWN;
        runConvert(true);
        showToast("Sample Markdown loaded.");
    });

    /* ---------- drag & drop (markdown files or images) ---------- */

    ["dragenter", "dragover"].forEach(function (evt) {
        editorWrap.addEventListener(evt, function (e) {
            e.preventDefault();
            editorWrap.classList.add("drag-over");
        });
    });
    ["dragleave", "drop"].forEach(function (evt) {
        editorWrap.addEventListener(evt, function () {
            editorWrap.classList.remove("drag-over");
        });
    });
    editorWrap.addEventListener("drop", function (e) {
        e.preventDefault();
        var file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;

        if (file.type.indexOf("image/") === 0) {
            var url = URL.createObjectURL(file);
            var insertion = "![" + file.name.replace(/\.[^.]+$/, "") + "](" + url + ")";
            var pos = input.selectionStart || input.value.length;
            input.value = input.value.slice(0, pos) + insertion + input.value.slice(pos);
            runConvert(true);
            showToast("Image inserted (local preview only).");
            return;
        }
        loadTextFile(file);
    });

    /* ---------- download / copy / print / share ---------- */

    function downloadFile(filename, content, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    document.getElementById("btnDownloadMd").addEventListener("click", function () {
        if (!input.value.trim()) { showToast("Nothing to download yet."); return; }
        downloadFile("document.md", input.value, "text/markdown;charset=utf-8;");
        showToast("Markdown downloaded.");
    });

    document.getElementById("btnDownloadHtml").addEventListener("click", function () {
        if (!lastCleanHtml) { showToast("Convert some Markdown first."); return; }
        var doc = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Converted Document</title>\n</head>\n<body>\n" + beautifyHtml(lastCleanHtml) + "\n</body>\n</html>\n";
        downloadFile("document.html", doc, "text/html;charset=utf-8;");
        showToast("HTML downloaded.");
    });

    document.getElementById("btnCopyHtml").addEventListener("click", function () {
        if (!lastCleanHtml) { showToast("Convert some Markdown first."); return; }
        var text = getFormattedHtml();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("HTML copied to clipboard.");
            }).catch(function () {
                showToast("Couldn't copy HTML.");
            });
        } else {
            showToast("Clipboard isn't supported in this browser.");
        }
    });

    document.getElementById("btnPrint").addEventListener("click", function () {
        if (!lastCleanHtml) { showToast("Convert some Markdown first."); return; }
        var win = window.open("", "_blank");
        if (!win) { showToast("Please allow pop-ups to print."); return; }
        win.document.write("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Print</title></head><body>" + lastCleanHtml + "</body></html>");
        win.document.close();
        win.focus();
        win.print();
    });

    document.getElementById("btnShare").addEventListener("click", function () {
        if (!lastCleanHtml) { showToast("Convert some Markdown first."); return; }
        var text = getFormattedHtml();
        if (navigator.share) {
            navigator.share({ title: "Converted HTML", text: text }).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("Sharing isn't supported here — HTML copied instead.");
            });
        } else {
            showToast("Sharing isn't supported in this browser.");
        }
    });

    /* ---------- line numbers toggle ---------- */

    document.getElementById("btnLineNumbers").addEventListener("click", function (e) {
        lineNumbers.classList.toggle("hidden");
        var on = !lineNumbers.classList.contains("hidden");
        e.currentTarget.setAttribute("aria-pressed", on ? "true" : "false");
        if (on) updateLineNumbers();
    });

    input.addEventListener("scroll", function () {
        lineNumbers.scrollTop = input.scrollTop;
        syncScroll(input, preview);
    });

    function syncScroll(source, target) {
        if (isSyncingScroll) return;
        isSyncingScroll = true;
        var ratio = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
        target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
        requestAnimationFrame(function () { isSyncingScroll = false; });
    }
    preview.addEventListener("scroll", function () { syncScroll(preview, input); });

    /* ---------- fullscreen ---------- */

    document.getElementById("btnFullscreen").addEventListener("click", function (e) {
        var isFull = app.classList.toggle("md-fullscreen");
        e.currentTarget.setAttribute("aria-pressed", isFull ? "true" : "false");
        document.body.style.overflow = isFull ? "hidden" : "";
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && app.classList.contains("md-fullscreen")) {
            app.classList.remove("md-fullscreen");
            document.body.style.overflow = "";
            document.getElementById("btnFullscreen").setAttribute("aria-pressed", "false");
        }
        var mod = e.ctrlKey || e.metaKey;
        if (mod && e.key === "Enter") {
            e.preventDefault();
            runConvert(true);
        } else if (mod && (e.key === "s" || e.key === "S")) {
            e.preventDefault();
            document.getElementById("btnDownloadHtml").click();
        }
    });

    /* ---------- mobile tabs ---------- */

    var tabs = Array.prototype.slice.call(document.querySelectorAll(".md-tab"));
    var panes = {
        markdown: document.querySelector('.md-pane[data-pane="markdown"]'),
        preview: document.querySelector('.md-pane[data-pane="preview"]'),
        html: document.querySelector('.md-pane[data-pane="html"]')
    };
    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            tabs.forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            Object.keys(panes).forEach(function (key) {
                panes[key].classList.toggle("active-tab", key === tab.dataset.tab);
            });
        });
    });

    /* ---------- split-screen resizing (desktop) ---------- */

    var resizer = document.getElementById("mdResizer");
    var workspace = document.getElementById("mdWorkspace");
    var dragging = false;

    resizer.addEventListener("mousedown", function (e) {
        dragging = true;
        resizer.classList.add("dragging");
        e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        var rect = workspace.getBoundingClientRect();
        var ratio = (e.clientX - rect.left) / rect.width;
        ratio = Math.min(0.8, Math.max(0.2, ratio));
        workspace.style.gridTemplateColumns = ratio + "fr auto " + (1 - ratio) + "fr";
    });
    document.addEventListener("mouseup", function () {
        dragging = false;
        resizer.classList.remove("dragging");
    });

    /* ---------- history ---------- */

    function loadHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(markdownText) {
        if (!markdownText.trim()) return;
        var history = loadHistory();
        history.unshift({ markdown: markdownText, timestamp: new Date().toISOString() });
        if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        var history = loadHistory();
        historyList.innerHTML = "";
        historyEmpty.hidden = history.length !== 0;

        history.forEach(function (entry, index) {
            var li = document.createElement("li");
            li.className = "md-history-item";

            var snippetBtn = document.createElement("button");
            snippetBtn.type = "button";
            snippetBtn.className = "md-history-snippet";
            snippetBtn.textContent = entry.markdown.slice(0, 80).replace(/\n/g, " ") || "(empty)";
            snippetBtn.addEventListener("click", function () {
                input.value = entry.markdown;
                runConvert(true);
                showToast("Restored from history.");
            });

            var meta = document.createElement("span");
            meta.className = "md-history-meta";
            meta.textContent = new Date(entry.timestamp).toLocaleString();

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "md-history-remove";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", function () {
                var updated = loadHistory();
                updated.splice(index, 1);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
                renderHistory();
            });

            li.appendChild(snippetBtn);
            li.appendChild(meta);
            li.appendChild(removeBtn);
            historyList.appendChild(li);
        });
    }

    document.getElementById("btnClearHistory").addEventListener("click", function () {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showToast("History cleared.");
    });

    /* ---------- toast ---------- */

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2600);
    }

    /* ---------- init ---------- */

    setFormatButtons();
    renderHistory();
    updateCounts("");
    updateLineNumbers();
})();
