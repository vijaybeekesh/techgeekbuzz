/* Outline Generator - rule-based, template-driven content outline engine
   with a fully editable, drag-and-drop tree editor. Everything (generation,
   editing, stats, SEO insights, search intent, export) runs client-side -
   there is no backend AI service in this project to call, so this follows
   the same pattern as the other "generator" tools already in this codebase
   (seotitlegenerator.js, seodescriptiongenerator.js, linkedinpostgenerator.js). */

(function () {
    "use strict";

    function $(id) { return document.getElementById(id); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }
    function uid() { return "og_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /* ---------- reference data ---------- */

    var CONTENT_TYPES = [
        ["blog-post", "Blog Post"], ["seo-article", "SEO Article"], ["how-to-guide", "How-To Guide"],
        ["listicle", "Listicle"], ["tutorial", "Tutorial"], ["ultimate-guide", "Ultimate Guide"],
        ["case-study", "Case Study"], ["essay", "Essay"], ["research-article", "Research Article"],
        ["product-review", "Product Review"], ["comparison", "Comparison"], ["landing-page", "Landing Page"],
        ["other", "Other"]
    ];
    var CONTENT_TYPE_LABELS = {};
    CONTENT_TYPES.forEach(function (c) { CONTENT_TYPE_LABELS[c[0]] = c[1]; });

    var FAMILY_MAP = {
        "blog-post": "guide", "seo-article": "guide", "ultimate-guide": "guide", "other": "guide",
        "how-to-guide": "howto", "tutorial": "howto",
        "listicle": "listicle",
        "case-study": "casestudy",
        "essay": "essay", "research-article": "essay",
        "product-review": "review",
        "comparison": "comparison",
        "landing-page": "landing"
    };

    var TONES = [
        ["professional", "Professional"], ["conversational", "Conversational"], ["friendly", "Friendly"],
        ["educational", "Educational"], ["persuasive", "Persuasive"], ["technical", "Technical"],
        ["simple", "Simple"], ["expert", "Expert"]
    ];

    var LENGTH_H2_RANGE = { short: [4, 5], medium: [5, 7], long: [7, 9], comprehensive: [9, 12] };
    var LENGTH_LABELS = {
        short: "Short (500-800 words)", medium: "Medium (800-1,500 words)",
        long: "Long (1,500-2,500 words)", comprehensive: "Comprehensive (2,500-4,000+ words)"
    };

    var IMPROVE_OPTIONS = [
        ["addDetail", "Adding more detail"],
        ["moreSeo", "Making it more SEO-focused"],
        ["beginnerFriendly", "Making it more beginner-friendly"],
        ["technical", "Making it more technical"],
        ["moreSections", "Adding more sections"],
        ["reduceSections", "Reducing unnecessary sections"],
        ["addFaqs", "Adding FAQs"],
        ["improveFlow", "Improving content flow"]
    ];

    var QUESTION_BANK = [
        "What is {Topic}?", "How does {Topic} work?", "Why is {Topic} important?",
        "How much does {Topic} cost?", "How long does it take to see results with {Topic}?",
        "What are the best {Topic} strategies?", "What are common mistakes with {Topic}?",
        "How do I get started with {Topic}?", "Is {Topic} worth it?",
        "What tools do I need for {Topic}?", "What are the benefits of {Topic}?",
        "How do I choose the right approach to {Topic}?"
    ];

    var SMALL_WORDS = { a: 1, an: 1, the: 1, and: 1, or: 1, but: 1, for: 1, nor: 1, in: 1, on: 1, at: 1, to: 1, of: 1, by: 1, with: 1, as: 1 };
    function titleCase(str) {
        var words = (str || "").trim().split(/\s+/);
        return words.map(function (w, i) {
            var lower = w.toLowerCase();
            if (i !== 0 && i !== words.length - 1 && SMALL_WORDS[lower]) return lower;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        }).join(" ");
    }

    /* ---------- node model ---------- */

    function makeNode(level, text, points, children) {
        return { id: uid(), level: level, text: text, points: points || [], children: children || [], collapsed: false };
    }

    /* ---------- generation: per content-type-family section banks ---------- */

    function buildContext(settings) {
        var raw = settings.topic.trim();
        var topic = titleCase(raw);
        // A noun-phrase version of the topic (leading "how to" stripped) for templates like
        // "What is {Topic}?" or "Benefits of {Topic}" - using the full imperative phrase there
        // (e.g. "What Is How To Start A Business?") would read awkwardly. The H1 itself still
        // uses the full phrase since it's meant to be the imperative "How to ..." form.
        var topicNoun = titleCase(raw.replace(/^how to\s+/i, "")) || topic;
        return {
            topicRaw: raw,
            topic: topic,
            topicNoun: topicNoun,
            keyword: (settings.keyword || "").trim(),
            audience: (settings.audience || "").trim(),
            tone: settings.tone,
            contentType: settings.contentType,
            family: FAMILY_MAP[settings.contentType] || "guide",
            length: settings.length
        };
    }

    function buildH1(ctx) {
        var t = ctx.topic;
        switch (ctx.family) {
            case "howto":
                return /^how to /i.test(t) ? t : "How to " + t.charAt(0).toLowerCase() + t.slice(1);
            case "listicle":
                return "A Practical Guide to " + t;
            case "casestudy":
                return "Case Study: " + t;
            case "essay":
                return t;
            case "review":
                return t + " Review: Is It Worth It?";
            case "comparison":
                return t + ": A Complete Comparison";
            case "landing":
                return t;
            default:
                return ctx.contentType === "ultimate-guide" ? "The Ultimate Guide to " + t : "The Complete Guide to " + t;
        }
    }

    function buildIntro(ctx) {
        return makeNode("h2", "Introduction", [
            "Why " + ctx.topicNoun + " matters" + (ctx.audience ? " for " + ctx.audience : ""),
            "What makes an effective approach to " + ctx.topicNoun,
            "What readers will learn in this " + (CONTENT_TYPE_LABELS[ctx.contentType] || "article").toLowerCase()
        ]);
    }
    function buildConclusion(ctx) {
        return makeNode("h2", "Conclusion", [
            "Summarize the key lessons about " + ctx.topicNoun,
            "Provide actionable next steps",
            "Encourage readers to get started"
        ]);
    }

    /* ---------- howto / tutorial ---------- */

    var STEP_PHRASES = [
        "Plan Your Approach", "Gather What You Need", "Set Up the Basics", "Execute the Core Steps",
        "Test and Refine Your Work", "Optimize for Better Results", "Scale Up and Automate", "Review and Improve"
    ];
    function buildHowtoSections(ctx, count, mods) {
        var sections = [];
        sections.push(new_h2("Understanding " + ctx.topicNoun, [], [
            makeNode("h3", "What Is " + ctx.topicNoun + "?", []),
            makeNode("h3", "Why " + ctx.topicNoun + " Matters" + (ctx.audience ? " for " + ctx.audience : ""), [])
        ]));
        sections.push(new_h2("What You'll Need Before You Start", [], [
            makeNode("h3", "Tools & Requirements", ["Essential tools or resources", "Time and budget considerations"]),
            makeNode("h3", "Preparation Checklist", [])
        ]));

        var steps = mods.improveFlow ? STEP_PHRASES.slice(0, count) : shuffle(STEP_PHRASES).slice(0, count);
        if (!mods.improveFlow) steps.sort(function (a, b) { return STEP_PHRASES.indexOf(a) - STEP_PHRASES.indexOf(b); });
        steps.forEach(function (phrase, i) {
            sections.push(new_h2("Step " + (i + 1) + ": " + phrase, [], [
                makeNode("h3", "What to Do", ["Clear, actionable instructions", "Expected outcome of this step"]),
                makeNode("h3", "Tips for This Step", [])
            ]));
        });

        sections.push(new_h2("Common Mistakes to Avoid", [], [
            makeNode("h3", "Mistake: Skipping Preparation", []),
            makeNode("h3", "Mistake: Moving Too Fast", [])
        ]));
        sections.push(new_h2("Tips for Success", ["Stay consistent", "Track your progress", "Learn from feedback"]));
        return sections;
    }

    /* ---------- listicle ---------- */

    var LISTICLE_ITEMS = [
        "Start With a Clear Plan", "Research Your Options", "Set Realistic Goals", "Choose the Right Tools",
        "Focus on Quality Over Quantity", "Learn From Others' Experience", "Track Your Progress",
        "Stay Consistent", "Avoid Common Pitfalls", "Continuously Improve", "Leverage Available Resources",
        "Build a Support Network"
    ];
    function buildListicleSections(ctx, count, mods) {
        var items = mods.improveFlow ? LISTICLE_ITEMS.slice(0, count) : shuffle(LISTICLE_ITEMS).slice(0, count);
        return items.map(function (item, i) {
            return new_h2((i + 1) + ". " + item, [], [
                makeNode("h3", "Why This Matters", []),
                makeNode("h3", "How to Apply This to " + ctx.topicNoun, [])
            ]);
        });
    }

    /* ---------- generic guide ---------- */

    var GUIDE_OPTIONAL_SECTIONS = [
        ["Types of " + "{Topic}", ["Common variations to know about"]],
        ["Key Strategies for {Topic}", []],
        ["Tools & Resources for {Topic}", ["Recommended tools", "Helpful resources and further reading"]],
        ["Real-World Examples of {Topic}", []],
        ["Frequently Overlooked Aspects of {Topic}", []]
    ];
    function buildGuideSections(ctx, count, mods) {
        var sections = [];
        sections.push(new_h2("What Is " + ctx.topicNoun + "?", [], [
            makeNode("h3", "Key Definition", []),
            makeNode("h3", "Why It Matters" + (ctx.audience ? " for " + ctx.audience : ""), [])
        ]));
        sections.push(new_h2("Benefits of " + ctx.topicNoun, [
            "Saves time and effort",
            "Improves overall results",
            "Provides a clear path forward"
        ]));

        var remaining = count - 5; // minus intro, definition, benefits, best-practices, conclusion
        var optionalPool = mods.improveFlow ? GUIDE_OPTIONAL_SECTIONS : shuffle(GUIDE_OPTIONAL_SECTIONS);
        var picked = optionalPool.slice(0, clamp(remaining, 0, optionalPool.length));
        picked.forEach(function (row) {
            sections.push(new_h2(row[0].replace("{Topic}", ctx.topicNoun), row[1].slice()));
        });

        sections.push(new_h2("How to Get Started with " + ctx.topicNoun, [], [
            makeNode("h3", "First Steps", []),
            makeNode("h3", "Common Challenges", [])
        ]));
        sections.push(new_h2("Best Practices for " + ctx.topicNoun, [
            "Stay consistent and patient",
            "Measure what matters",
            "Adapt based on results"
        ]));
        sections.push(new_h2("Common Mistakes to Avoid", []));
        return sections;
    }

    /* ---------- case study ---------- */

    function buildCasestudySections(ctx) {
        return [
            new_h2("Background", ["Context and starting point", "Why this case is worth examining"]),
            new_h2("The Challenge", [], [
                makeNode("h3", "Initial Situation", []),
                makeNode("h3", "Key Problems Identified", [])
            ]),
            new_h2("The Approach", [], [
                makeNode("h3", "Strategy Used", []),
                makeNode("h3", "Implementation Steps", [])
            ]),
            new_h2("The Results", [], [
                makeNode("h3", "Key Outcomes", []),
                makeNode("h3", "Metrics & Data", [])
            ]),
            new_h2("Lessons Learned", ["What worked well", "What could have been done differently"])
        ];
    }

    /* ---------- essay / research ---------- */

    var ARGUMENT_PHRASES = ["Supporting Evidence", "Key Considerations", "Practical Implications", "Counterpoints to Consider"];
    function buildEssaySections(ctx, count) {
        var sections = [];
        sections.push(new_h2("Background & Context", []));
        var n = clamp(count - 3, 1, ARGUMENT_PHRASES.length);
        ARGUMENT_PHRASES.slice(0, n).forEach(function (phrase, i) {
            sections.push(new_h2("Argument " + (i + 1) + ": " + phrase, []));
        });
        return sections;
    }

    /* ---------- product review ---------- */

    function buildReviewSections(ctx) {
        return [
            new_h2("What Is " + ctx.topicNoun + "?", []),
            new_h2("Key Features", ["Core functionality", "Standout capabilities"]),
            new_h2("Pros and Cons", [], [
                makeNode("h3", "Pros", []),
                makeNode("h3", "Cons", [])
            ]),
            new_h2("Pricing", []),
            new_h2("Who Should Use " + ctx.topicNoun + "?", []),
            new_h2("Final Verdict", ["Overall rating and recommendation"])
        ];
    }

    /* ---------- comparison ---------- */

    function buildComparisonSections(ctx) {
        return [
            new_h2("Overview", [], [
                makeNode("h3", "Key Differences", []),
                makeNode("h3", "Similarities", [])
            ]),
            new_h2("Feature-by-Feature Comparison", [], [
                makeNode("h3", "Pricing", []),
                makeNode("h3", "Ease of Use", []),
                makeNode("h3", "Performance", []),
                makeNode("h3", "Support", [])
            ]),
            new_h2("Which One Should You Choose?", ["Best for beginners", "Best for advanced users", "Best value for money"])
        ];
    }

    /* ---------- landing page ---------- */

    function buildLandingSections(ctx) {
        return [
            new_h2("Hero Section: Value Proposition", ["Clear headline stating the core benefit", "Supporting subheadline"]),
            new_h2("Key Benefits", ["Benefit 1 for " + (ctx.audience || "your audience"), "Benefit 2", "Benefit 3"]),
            new_h2("How It Works", [], [
                makeNode("h3", "Step 1", []),
                makeNode("h3", "Step 2", []),
                makeNode("h3", "Step 3", [])
            ]),
            new_h2("Features", []),
            new_h2("Social Proof / Testimonials", []),
            new_h2("Pricing / Offer", []),
            new_h2("Call to Action", ["Clear, action-oriented CTA button copy"])
        ];
    }

    function new_h2(text, points, children) { return makeNode("h2", text, points, children); }

    /* ---------- master builder ---------- */

    function buildOutline(settings, mods) {
        mods = mods || {};
        var ctx = buildContext(settings);
        var range = LENGTH_H2_RANGE[ctx.length] || LENGTH_H2_RANGE.medium;
        var count = clamp(Math.round((range[0] + range[1]) / 2), range[0], range[1]);
        if (mods.moreSections) count += 2;
        if (mods.reduceSections) count = Math.max(3, count - 2);

        var h1 = buildH1(ctx);
        var sections = [];

        // Case studies and comparisons open with their own "Background"/"Overview" section,
        // and reviews/comparisons close with their own "Verdict"/"Which one?" section - so the
        // generic Introduction/Conclusion would be redundant for those families.
        var SKIP_GENERIC_INTRO = { casestudy: true, comparison: true };
        var SKIP_GENERIC_CONCLUSION = { review: true, comparison: true };

        if (ctx.family === "landing") {
            sections = buildLandingSections(ctx);
        } else {
            if (!SKIP_GENERIC_INTRO[ctx.family]) sections.push(buildIntro(ctx));
            switch (ctx.family) {
                case "howto": sections = sections.concat(buildHowtoSections(ctx, Math.max(2, count - 5), mods)); break;
                case "listicle": sections = sections.concat(buildListicleSections(ctx, count, mods)); break;
                case "casestudy": sections = sections.concat(buildCasestudySections(ctx)); break;
                case "essay": sections = sections.concat(buildEssaySections(ctx, count)); break;
                case "review": sections = sections.concat(buildReviewSections(ctx)); break;
                case "comparison": sections = sections.concat(buildComparisonSections(ctx)); break;
                default: sections = sections.concat(buildGuideSections(ctx, count, mods)); break;
            }
            if (!SKIP_GENERIC_CONCLUSION[ctx.family]) sections.push(buildConclusion(ctx));
        }

        if (mods.beginnerFriendly && sections.length) {
            var firstBody = sections.find(function (s) { return s.text !== "Introduction"; }) || sections[0];
            firstBody.children = firstBody.children || [];
            firstBody.children.unshift(makeNode("h3", "Beginner Basics: What to Know First", ["Key terms explained simply", "No prior experience assumed"]));
        }
        if (mods.technical) {
            var lastBody = sections.slice().reverse().find(function (s) { return s.text !== "Conclusion"; });
            if (lastBody) {
                lastBody.children = lastBody.children || [];
                lastBody.children.push(makeNode("h3", "Technical Deep Dive", ["Advanced implementation details", "Edge cases to consider"]));
            }
        }
        if (mods.addDetail) {
            sections.forEach(function (s) {
                if (s.points && s.points.length) s.points.push("Additional context and supporting examples");
            });
        }
        if (mods.moreSeo && ctx.keyword) {
            var target = sections.find(function (s) { return s.text.indexOf("Introduction") === -1 && s.text.indexOf("Conclusion") === -1; });
            if (target && target.text.toLowerCase().indexOf(ctx.keyword.toLowerCase()) === -1) {
                target.text = target.text + " (" + titleCase(ctx.keyword) + ")";
            }
        }
        if (mods.addFaqs) {
            sections.splice(sections.length - 1, 0, buildFaqSection(ctx));
        }

        return { h1: h1, children: sections, ctx: ctx };
    }

    function buildFaqSection(ctx) {
        var qs = pickQuestions(ctx, 5);
        return new_h2("Frequently Asked Questions", [], qs.map(function (q) { return makeNode("h3", q, []); }));
    }

    function pickQuestions(ctx, n) {
        var filled = QUESTION_BANK.map(function (q) { return q.replace(/\{Topic\}/g, ctx.topicNoun); });
        return shuffle(filled).slice(0, n);
    }

    /* ---------- tree utilities ---------- */

    function locate(id, arr, parent) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id === id) return { arr: arr, index: i, node: arr[i], parent: parent || null };
            var found = locate(id, arr[i].children, arr[i]);
            if (found) return found;
        }
        return null;
    }

    function levelBelow(level) { return level === "h2" ? "h3" : (level === "h3" ? "h4" : null); }

    function forEachNode(arr, fn, depth) {
        depth = depth || 0;
        arr.forEach(function (node) {
            fn(node, depth);
            forEachNode(node.children, fn, depth + 1);
        });
    }

    /* ---------- derived data: stats / seo / intent / questions ---------- */

    function estimateWords(node) {
        var base = node.level === "h2" ? 45 : (node.level === "h3" ? 30 : 20);
        var total = base + node.points.length * 15;
        node.children.forEach(function (c) { total += estimateWords(c); });
        return total;
    }

    function computeStats(outline) {
        var sections = outline.children.length;
        var subsections = 0;
        forEachNode(outline.children, function (n, depth) { if (depth > 0) subsections++; });
        var words = 150; // baseline for title + connective prose
        outline.children.forEach(function (n) { words += estimateWords(n); });
        var totalNodes = sections + subsections;
        var depthLabel = totalNodes < 8 ? "Basic" : (totalNodes <= 16 ? "Detailed" : "Comprehensive");
        return { sections: sections, subsections: subsections, words: words, depth: depthLabel };
    }

    function computeSearchIntent(ctx) {
        var text = (ctx.topicRaw + " " + ctx.keyword).toLowerCase();
        var byFamily = {
            howto: "informational", guide: "informational", casestudy: "informational", essay: "informational",
            listicle: "informational", review: "commercial", comparison: "commercial", landing: "transactional"
        };
        var intent = byFamily[ctx.family] || "informational";

        var transactionalWords = ["buy", "order now", "sign up", "download", "free trial", "get started", "purchase", "book now"];
        var commercialWords = ["best", "top", "review", "vs", "versus", "cheap", "deal", "price", "pricing", "compare"];
        if (transactionalWords.some(function (w) { return text.indexOf(w) !== -1; })) intent = "transactional";
        else if (commercialWords.some(function (w) { return text.indexOf(w) !== -1; })) intent = "commercial";

        var explain = {
            informational: "Users are primarily looking to learn about " + ctx.topicNoun + ".",
            commercial: "Users are likely comparing options or researching " + ctx.topicNoun + " before making a decision.",
            transactional: "Users are likely ready to take action (sign up, buy, or download) related to " + ctx.topicNoun + ".",
            navigational: "Users are likely looking for a specific page or resource related to " + ctx.topicNoun + "."
        };
        return { intent: intent, label: titleCase(intent), text: explain[intent] };
    }

    function computeSeoInsights(outline, ctx) {
        var checks = [];
        var allText = outline.h1.toLowerCase();
        forEachNode(outline.children, function (n) {
            allText += " " + n.text.toLowerCase();
            n.points.forEach(function (p) { allText += " " + p.toLowerCase(); });
        });

        if (ctx.keyword) {
            var kw = ctx.keyword.toLowerCase();
            var found = allText.indexOf(kw) !== -1;
            var inH1 = outline.h1.toLowerCase().indexOf(kw) !== -1;
            checks.push({
                ok: found ? "good" : "warn",
                text: found
                    ? ('Your primary keyword "' + ctx.keyword + '" appears in the outline' + (inH1 ? " (including the H1)." : "."))
                    : ('Your primary keyword "' + ctx.keyword + '" doesn\'t appear yet - consider mentioning it in your H1 or an early H2.')
            });
        } else {
            checks.push({ ok: "warn", text: "No primary keyword set - add one above to get keyword coverage suggestions." });
        }

        var stats = computeStats(outline);
        checks.push({
            ok: stats.sections >= 4 ? "good" : "warn",
            text: stats.sections >= 4
                ? "Topic coverage looks solid with " + stats.sections + " main sections."
                : "Only " + stats.sections + " main sections - consider covering a few more subtopics for better depth."
        });

        checks.push({ ok: "good", text: "Estimated content depth: " + stats.depth + " (" + stats.words + " estimated words)." });

        var hasConclusion = outline.children.some(function (n) { return /conclusion/i.test(n.text); });
        checks.push({
            ok: hasConclusion ? "good" : "warn",
            text: hasConclusion ? "Outline includes a conclusion to wrap up the content." : "Consider adding a conclusion section to summarize key takeaways."
        });

        return checks;
    }

    /* ---------- rendering ---------- */

    var outlineState = null; // { h1, children, ctx }
    var currentQuestions = [];

    function renderNode(node) {
        var levelUp = node.level === "h3" ? "h2" : (node.level === "h4" ? "h3" : null);
        var canHaveChildren = node.level !== "h4";
        var hasChildren = node.children.length > 0;

        var html = '<div class="og-node og-node-' + node.level + (node.collapsed ? " is-collapsed" : "") + '" data-id="' + node.id + '" role="treeitem">';
        html += '<div class="og-node-row">';
        html += '<span class="og-drag-handle" draggable="true" title="Drag to reorder">⠿</span>';
        if (hasChildren) {
            html += '<button type="button" class="og-collapse-toggle" data-action="toggle-collapse" aria-label="Toggle section"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg></button>';
        } else {
            html += '<span class="og-collapse-spacer"></span>';
        }
        html += '<span class="og-level-badge og-level-' + node.level + '">' + node.level.toUpperCase() + "</span>";
        html += '<input type="text" class="og-heading-input" data-field="text" value="' + esc(node.text) + '" aria-label="' + node.level.toUpperCase() + ' heading">';
        html += '<div class="og-node-actions">';
        html += '<button type="button" class="og-icon-btn og-icon-btn-danger" data-action="delete-node" title="Delete section" aria-label="Delete section">✕</button>';
        html += "</div></div>";

        html += '<div class="og-node-body"><div class="og-points-list" data-points>';
        node.points.forEach(function (p, i) {
            html += '<div class="og-point-row" data-point-index="' + i + '">' +
                '<span class="og-point-bullet">•</span>' +
                '<input type="text" class="og-point-input" data-field="point" value="' + esc(p) + '" aria-label="Key point">' +
                '<button type="button" class="og-icon-btn og-icon-btn-danger" data-action="delete-point" aria-label="Delete point">✕</button>' +
                "</div>";
        });
        html += "</div></div>";

        html += '<div class="og-node-footer">';
        html += '<button type="button" class="og-text-btn" data-action="add-point">+ Add point</button>';
        if (canHaveChildren) {
            html += '<button type="button" class="og-text-btn" data-action="add-child">+ Add ' + levelBelow(node.level).toUpperCase() + "</button>";
        }
        html += "</div>";

        if (hasChildren) {
            html += '<div class="og-children">' + node.children.map(renderNode).join("") + "</div>";
        }

        html += "</div>";
        return html;
    }

    function renderTree() {
        $("ogTree").innerHTML = outlineState.children.map(renderNode).join("");
    }

    function renderStats() {
        var s = computeStats(outlineState);
        $("ogStatSections").textContent = s.sections;
        $("ogStatSubsections").textContent = s.subsections;
        $("ogStatQuestions").textContent = currentQuestions.length;
        $("ogStatWords").textContent = s.words.toLocaleString();
        $("ogStatDepth").textContent = s.depth;
    }

    function renderIntent() {
        var intent = computeSearchIntent(outlineState.ctx);
        var badge = $("ogIntentBadge");
        badge.textContent = intent.label;
        badge.className = "og-intent-badge " + intent.intent;
        $("ogIntentText").textContent = intent.text;
    }

    function renderSeo() {
        var checks = computeSeoInsights(outlineState, outlineState.ctx);
        var iconFor = { good: "✓", warn: "⚠", bad: "✕" };
        $("ogSeoList").innerHTML = checks.map(function (c) {
            return '<li class="og-analysis-item ' + c.ok + '"><span class="og-analysis-icon">' + iconFor[c.ok] + '</span><span>' + esc(c.text) + "</span></li>";
        }).join("");
    }

    function renderQuestions() {
        $("ogQuestionsList").innerHTML = currentQuestions.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("");
    }

    function renderAll() {
        $("ogH1Input").value = outlineState.h1;
        renderTree();
        renderStats();
        renderIntent();
        renderSeo();
        renderQuestions();
    }

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("ogToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
    }

    /* ---------- export ---------- */

    function toPlainText(outline) {
        var lines = ["H1: " + outline.h1, ""];
        function walk(node, prefix) {
            lines.push(prefix + node.level.toUpperCase() + ": " + node.text);
            node.points.forEach(function (p) { lines.push(prefix + "- " + p); });
            if (node.points.length) lines.push("");
            node.children.forEach(function (c) { walk(c, prefix); });
            if (!node.points.length && !node.children.length) lines.push("");
        }
        outline.children.forEach(function (n) { walk(n, ""); });
        return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
    }

    function toMarkdown(outline) {
        var lines = ["# " + outline.h1, ""];
        var hashes = { h2: "##", h3: "###", h4: "####" };
        function walk(node) {
            lines.push(hashes[node.level] + " " + node.text);
            node.points.forEach(function (p) { lines.push("- " + p); });
            lines.push("");
            node.children.forEach(walk);
        }
        outline.children.forEach(walk);
        return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
    }

    function downloadBlob(content, filename, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
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
        return {
            topic: $("ogTopic").value, keyword: $("ogKeyword").value, contentType: $("ogContentType").value,
            audience: $("ogAudience").value, length: $("ogLength").value, tone: $("ogTone").value
        };
    }

    function collectMods() {
        var mods = {};
        qsa('#ogImproveGrid input[type="checkbox"]').forEach(function (cb) { mods[cb.value] = cb.checked; });
        return mods;
    }

    /* ---------- init form ---------- */

    populateSelect("ogContentType", CONTENT_TYPES);
    $("ogContentType").value = "blog-post";
    populateSelect("ogTone", TONES);
    $("ogTone").value = "professional";

    $("ogImproveGrid").innerHTML = IMPROVE_OPTIONS.map(function (opt) {
        return '<label class="og-improve-chip"><input type="checkbox" value="' + opt[0] + '"> ' + esc(opt[1]) + "</label>";
    }).join("");

    /* ---------- generate flow ---------- */

    function runGenerate(mods) {
        var settings = collectSettings();
        var topic = settings.topic.trim();
        var errEl = $("errTopic");
        if (!topic) {
            errEl.textContent = "Please enter a topic to generate an outline.";
            $("ogTopic").focus();
            return;
        }
        errEl.textContent = "";
        $("ogErrorBanner").hidden = true;

        var btn = $("btnGenerate");
        btn.disabled = true;
        btn.classList.add("is-loading");
        $("ogLoadingText").hidden = false;

        setTimeout(function () {
            try {
                outlineState = buildOutline(settings, mods || {});
                currentQuestions = pickQuestions(outlineState.ctx, 6);
                renderAll();
                $("ogEmptyState").hidden = true;
                $("ogResultsSection").hidden = false;
                $("ogImproveCard").hidden = false;
                persistSession();
                showToast("Outline generated!");
            } catch (e) {
                $("ogErrorBanner").hidden = false;
                $("ogErrorBanner").textContent = "We couldn't generate the outline right now. Please try again.";
            } finally {
                btn.disabled = false;
                btn.classList.remove("is-loading");
                $("ogLoadingText").hidden = true;
            }
        }, 550);
    }

    $("ogForm").addEventListener("submit", function (e) {
        e.preventDefault();
        runGenerate({});
    });

    $("btnRegenerate").addEventListener("click", function () {
        runGenerate(collectMods());
    });

    /* ---------- session persistence (no backend - matches the rest of this app's tools) ---------- */

    function persistSession() {
        try {
            localStorage.setItem("ogLastSession", JSON.stringify({ settings: collectSettings(), outline: outlineState, questions: currentQuestions }));
        } catch (e) { }
    }
    function restoreSession() {
        try {
            var raw = localStorage.getItem("ogLastSession");
            if (!raw) return;
            var data = JSON.parse(raw);
            if (!data || !data.outline) return;
            $("ogTopic").value = data.settings.topic || "";
            $("ogKeyword").value = data.settings.keyword || "";
            if (data.settings.contentType) $("ogContentType").value = data.settings.contentType;
            $("ogAudience").value = data.settings.audience || "";
            if (data.settings.length) $("ogLength").value = data.settings.length;
            if (data.settings.tone) $("ogTone").value = data.settings.tone;
            outlineState = data.outline;
            currentQuestions = data.questions || [];
            renderAll();
            $("ogEmptyState").hidden = true;
            $("ogResultsSection").hidden = false;
            $("ogImproveCard").hidden = false;
        } catch (e) { }
    }

    /* ---------- tree editing (event delegation) ---------- */

    var tree = $("ogTree");

    tree.addEventListener("input", function (e) {
        var target = e.target;
        var nodeEl = target.closest(".og-node");
        if (!nodeEl) return;
        var loc = locate(nodeEl.getAttribute("data-id"), outlineState.children);
        if (!loc) return;

        if (target.matches('[data-field="text"]')) {
            loc.node.text = target.value;
        } else if (target.matches('[data-field="point"]')) {
            var row = target.closest("[data-point-index]");
            var idx = parseInt(row.getAttribute("data-point-index"), 10);
            loc.node.points[idx] = target.value;
        }
        renderStats(); renderSeo(); renderIntent();
        persistSession();
    });

    $("ogH1Input").addEventListener("input", function () {
        outlineState.h1 = this.value;
        persistSession();
    });

    tree.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-action]");
        if (!btn) return;
        var nodeEl = btn.closest(".og-node");
        var loc = locate(nodeEl.getAttribute("data-id"), outlineState.children);
        if (!loc) return;
        var action = btn.getAttribute("data-action");

        if (action === "toggle-collapse") {
            loc.node.collapsed = !loc.node.collapsed;
            renderTree();
        } else if (action === "delete-node") {
            loc.arr.splice(loc.index, 1);
            renderAll();
            persistSession();
            showToast("Section deleted.");
        } else if (action === "add-point") {
            loc.node.points.push("New key point");
            renderTree();
            persistSession();
        } else if (action === "delete-point") {
            var row = btn.closest("[data-point-index]");
            var idx = parseInt(row.getAttribute("data-point-index"), 10);
            loc.node.points.splice(idx, 1);
            renderAll();
            persistSession();
        } else if (action === "add-child") {
            var childLevel = levelBelow(loc.node.level);
            if (childLevel) {
                loc.node.children.push(makeNode(childLevel, "New " + childLevel.toUpperCase() + " Heading", []));
                loc.node.collapsed = false;
                renderAll();
                persistSession();
            }
        }
    });

    $("btnAddH2").addEventListener("click", function () {
        if (!outlineState) return;
        outlineState.children.push(makeNode("h2", "New H2 Section", ["Key point to cover"]));
        renderAll();
        persistSession();
    });

    /* ---------- drag and drop (same-level reordering; children move with their parent) ---------- */

    var draggedId = null;

    tree.addEventListener("dragstart", function (e) {
        var handle = e.target.closest(".og-drag-handle");
        if (!handle) return;
        var nodeEl = handle.closest(".og-node");
        draggedId = nodeEl.getAttribute("data-id");
        nodeEl.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", draggedId); } catch (err) { }
    });

    tree.addEventListener("dragend", function () {
        qsa(".og-node", tree).forEach(function (el) {
            el.classList.remove("is-dragging", "og-drag-over-top", "og-drag-over-bottom");
        });
        draggedId = null;
    });

    tree.addEventListener("dragover", function (e) {
        if (!draggedId) return;
        var targetEl = e.target.closest(".og-node");
        if (!targetEl || targetEl.getAttribute("data-id") === draggedId) return;
        e.preventDefault();
        var rect = targetEl.getBoundingClientRect();
        var before = (e.clientY - rect.top) < rect.height / 2;
        qsa(".og-node", tree).forEach(function (el) { el.classList.remove("og-drag-over-top", "og-drag-over-bottom"); });
        targetEl.classList.add(before ? "og-drag-over-top" : "og-drag-over-bottom");
    });

    tree.addEventListener("drop", function (e) {
        if (!draggedId) return;
        var targetEl = e.target.closest(".og-node");
        if (!targetEl) return;
        e.preventDefault();
        var targetId = targetEl.getAttribute("data-id");
        if (targetId === draggedId) return;

        var draggedLoc = locate(draggedId, outlineState.children);
        var targetLoc = locate(targetId, outlineState.children);
        if (!draggedLoc || !targetLoc) return;
        if (draggedLoc.arr !== targetLoc.arr) { showToast("Sections can only be reordered within the same level."); return; }

        var before = targetEl.classList.contains("og-drag-over-top");
        var arr = draggedLoc.arr;
        var draggedNode = arr[draggedLoc.index];
        arr.splice(draggedLoc.index, 1);
        var newTargetIndex = arr.indexOf(targetLoc.node);
        arr.splice(before ? newTargetIndex : newTargetIndex + 1, 0, draggedNode);

        renderAll();
        persistSession();
        showToast("Section reordered.");
    });

    /* ---------- actions ---------- */

    $("btnCopyOutline").addEventListener("click", function () {
        if (!outlineState) return;
        var text = toPlainText(outlineState);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast("Outline copied!"); }, function () { showToast("Could not copy - please copy manually."); });
        } else {
            window.prompt("Copy this outline:", text);
        }
    });
    $("btnDownloadTxt").addEventListener("click", function () {
        if (!outlineState) return;
        downloadBlob(toPlainText(outlineState), "content-outline.txt", "text/plain");
    });
    $("btnDownloadMd").addEventListener("click", function () {
        if (!outlineState) return;
        downloadBlob(toMarkdown(outlineState), "content-outline.md", "text/markdown");
    });
    $("btnClearOutline").addEventListener("click", function () {
        if (!window.confirm("Clear the current outline? This cannot be undone.")) return;
        outlineState = null;
        currentQuestions = [];
        $("ogResultsSection").hidden = true;
        $("ogImproveCard").hidden = true;
        $("ogEmptyState").hidden = false;
        try { localStorage.removeItem("ogLastSession"); } catch (e) { }
        showToast("Outline cleared.");
    });
    $("btnAddFaqSection").addEventListener("click", function () {
        if (!outlineState || !currentQuestions.length) return;
        var faq = new_h2("Frequently Asked Questions", [], currentQuestions.map(function (q) { return makeNode("h3", q, []); }));
        var conclusionIdx = outlineState.children.findIndex(function (n) { return /conclusion/i.test(n.text); });
        if (conclusionIdx === -1) outlineState.children.push(faq);
        else outlineState.children.splice(conclusionIdx, 0, faq);
        renderAll();
        persistSession();
        showToast("FAQ section added.");
    });

    restoreSession();
})();
