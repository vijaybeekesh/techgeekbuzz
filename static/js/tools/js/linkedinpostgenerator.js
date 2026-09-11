/* LinkedIn Post Generator & Formatter - rule-based content engine.
   Generates posts from a topic, formats pasted posts, generates hooks and
   hashtags, scores content heuristically, and stores saved drafts in
   localStorage. Everything runs client-side - no server calls. */

(function () {
    "use strict";

    /* ================= reference data ================= */

    var GOALS = [
        ["personal-brand", "Build Personal Brand"], ["engagement", "Increase Engagement"],
        ["leads", "Generate Leads"], ["promote-product", "Promote a Product"],
        ["share-knowledge", "Share Knowledge"], ["announce-launch", "Announce a Launch"],
        ["personal-story", "Share a Personal Story"], ["authority", "Build Authority"],
        ["traffic", "Drive Website Traffic"], ["recruit", "Recruit Talent"],
        ["celebrate", "Celebrate an Achievement"], ["other", "Other"]
    ];

    var TONES = [
        ["professional", "Professional"], ["friendly", "Friendly"], ["inspirational", "Inspirational"],
        ["educational", "Educational"], ["conversational", "Conversational"], ["storytelling", "Storytelling"],
        ["bold", "Bold"], ["humorous", "Humorous"], ["thought-leadership", "Thought Leadership"],
        ["promotional", "Promotional"]
    ];

    var STYLES = [
        ["storytelling", "Storytelling"], ["problem-solution", "Problem → Solution"],
        ["lesson-learned", "Lesson Learned"], ["list-style", "List Style"],
        ["personal-experience", "Personal Experience"], ["educational", "Educational"],
        ["case-study", "Case Study"], ["announcement", "Announcement"],
        ["question-based", "Question-Based"], ["before-after", "Before → After"],
        ["contrarian", "Contrarian Opinion"]
    ];

    var CTAS = [
        ["question", "Ask a Question"], ["comment", "Comment Below"], ["share-experience", "Share Your Experience"],
        ["visit-website", "Visit Website"], ["try-tool", "Try the Tool"], ["follow", "Follow for More"],
        ["message", "Send a Message"], ["none", "No CTA"]
    ];

    var LENGTH_BUCKETS = {
        short: { min: 50, max: 100, label: "Short" },
        medium: { min: 100, max: 250, label: "Medium" },
        long: { min: 250, max: 500, label: "Long" }
    };

    var STYLE_HOOKS = {
        "storytelling": ["I still remember the moment {Topic} clicked for me.", "A few months ago, {Topic} was just an idea."],
        "problem-solution": ["Most people get {Topic} wrong. Here's why.", "{Topic} shouldn't be this hard - but for most people, it is."],
        "lesson-learned": ["{Topic} taught me something I didn't expect.", "I learned the hard way what {Topic} really takes."],
        "list-style": ["Here are 3 things I learned about {Topic}.", "3 lessons {Topic} taught me."],
        "personal-experience": ["I recently went through {Topic}.", "Here's my honest experience with {Topic}."],
        "educational": ["Here's what most people don't know about {Topic}.", "Let's break down {Topic}."],
        "case-study": ["Here's a real example of {Topic} in action.", "A quick case study on {Topic}."],
        "announcement": ["Big news: {Topic}.", "I'm excited to share {Topic}."],
        "question-based": ["What if {Topic} was easier than you think?", "Have you ever struggled with {Topic}?"],
        "before-after": ["Before {Topic}, things looked very different.", "Here's the before and after of {Topic}."],
        "contrarian": ["Unpopular opinion: {Topic} isn't what everyone says it is.", "Everyone talks about {Topic} the wrong way."]
    };

    var STYLE_INTROS = {
        "storytelling": "Here's what happened next.",
        "problem-solution": "Here's the problem I kept running into:",
        "lesson-learned": "Here's what I learned along the way:",
        "list-style": "Here's what stood out:",
        "personal-experience": "Here's what happened when I tried this:",
        "educational": "Here's what you need to know:",
        "case-study": "Here's a quick breakdown:",
        "announcement": "Here's the news:",
        "question-based": "Ever wondered about this?",
        "before-after": "Before vs. after:",
        "contrarian": "Here's an unpopular opinion:"
    };

    var GOAL_VALUE = {
        "personal-brand": "showing up consistently, in public, is what actually builds trust over time",
        "engagement": "real conversations beat vanity metrics every time",
        "leads": "providing value earns attention long before you ask for anything",
        "promote-product": "solving a real, specific problem beats a flashy pitch",
        "share-knowledge": "sharing what you know helps more people than you'd expect",
        "announce-launch": "shipping something real beats waiting for it to be perfect",
        "personal-story": "every setback usually teaches something worth sharing",
        "authority": "expertise shows up in the small details, not the job title",
        "traffic": "genuinely useful content is what earns the click",
        "recruit": "great people join a mission, not just a job post",
        "celebrate": "progress is worth celebrating, even the small wins",
        "other": "small, consistent actions compound faster than big, occasional ones"
    };

    var TAKEAWAY_TEMPLATES = [
        "The takeaway? {Takeaway}.",
        "Here's the lesson: {Takeaway}.",
        "Bottom line: {Takeaway}."
    ];

    var CTA_BANK = {
        question: ["What's your experience with this?", "What would you add to this list?", "How do you handle this in your own work?"],
        comment: ["Drop a comment - I'd love to hear your take.", "Let me know your thoughts in the comments."],
        "share-experience": ["Share your experience below - I'd love to hear it.", "Have you faced something similar? Share your story."],
        "visit-website": ["Check the link in the comments to learn more.", "Visit the website to see it for yourself."],
        "try-tool": ["Try it yourself - link in the comments.", "Give it a try and tell me what you think."],
        follow: ["Follow for more posts like this.", "Follow along for more on this topic."],
        message: ["Send me a message if you'd like to talk more.", "Feel free to DM me if you want to chat about this."],
        none: [""]
    };

    var CTA_SIGNAL_WORDS = [
        "comment below", "comment down below", "share your", "what do you think", "dm me",
        "send me a message", "let me know", "thoughts?", "what's your", "have you ever",
        "would you", "follow for more", "check the link", "visit", "try it"
    ];

    var SLANG_WORDS = ["gonna", "wanna", "lol", "omg", "yolo", "kinda", "sorta", "dude"];

    var PROFESSIONAL_SWAPS = {
        "gonna": "going to", "wanna": "want to", "awesome": "excellent", "guys": "everyone",
        "kinda": "somewhat", "sorta": "somewhat", "yeah": "yes", "lol": "", "omg": "", "super ": "extremely "
    };

    var LONGER_FILLERS = [
        "None of this happened overnight - it took a lot of small, unglamorous steps.",
        "It's easy to overlook, but the details here matter more than they seem.",
        "This is the part most people skip, and it's usually the part that matters most."
    ];

    var ENGAGEMENT_QUESTIONS = [
        "What's your take on this?", "Has this been true for you as well?", "What would you add?"
    ];

    var HOOK_CATEGORY_BANK = {
        "Professional": [
            "{Topic} matters more than most people realize.",
            "Here's what experience has taught me about {Topic}.",
            "Getting {Topic} right starts with getting the basics right.",
            "The best professionals treat {Topic} as a process, not an event.",
            "{Topic} is simple in theory - and harder in practice.",
            "If you want better results, start with {Topic}.",
            "There's a right way and a wrong way to approach {Topic}."
        ],
        "Curiosity": [
            "What if {Topic} was easier than you think?",
            "Here's something most people miss about {Topic}.",
            "I didn't expect {Topic} to change how I think about this.",
            "What nobody tells you about {Topic}.",
            "There's a detail about {Topic} that changes everything.",
            "Curious why {Topic} works the way it does?",
            "Here's a surprising truth about {Topic}."
        ],
        "Storytelling": [
            "I still remember the moment {Topic} clicked for me.",
            "A few months ago, {Topic} was just an idea.",
            "Let me take you back to when {Topic} started.",
            "It started with a simple question about {Topic}.",
            "I almost gave up on {Topic} before it worked.",
            "Here's the story behind {Topic}.",
            "Not long ago, {Topic} looked nothing like it does today."
        ],
        "Bold": [
            "Stop overthinking {Topic}.",
            "{Topic} is not as complicated as people make it.",
            "Most advice about {Topic} is wrong.",
            "You don't need more time for {Topic}. You need a better approach.",
            "Forget everything you've heard about {Topic}.",
            "{Topic} rewards action, not perfection.",
            "If {Topic} feels hard, you're doing it the hard way."
        ],
        "Question-Based": [
            "What's the biggest myth about {Topic}?",
            "Have you ever struggled with {Topic}?",
            "What would change if {Topic} was solved for good?",
            "Why does {Topic} still trip up so many people?",
            "What's one thing you wish you knew earlier about {Topic}?",
            "Is {Topic} really as hard as it seems?",
            "What's holding you back from mastering {Topic}?"
        ]
    };

    var STOPWORDS = {};
    ["a","an","the","and","or","but","if","of","to","in","on","for","with","at","by","from","as","is","are",
     "was","were","be","been","being","this","that","these","those","it","its","i","we","you","he","she",
     "they","them","his","her","their","our","your","my","me","us","not","no","so","do","does","did","have",
     "has","had","will","would","can","could","should","just","about","into","than","then","there","here",
     "what","when","where","which","who","how","all","any","some","more","most","very","also","up","out",
     "over","after","before","because","while","new","free"].forEach(function (w) { STOPWORDS[w] = true; });

    var INDUSTRY_MAP = [
        [["startup", "founder", "founders"], "#Startup"],
        [["small business", "business owner", "entrepreneur"], "#SmallBusiness"],
        [["market", "marketing"], "#Marketing"],
        [["sale", "sales"], "#Sales"],
        [["tech", "software", "developer", "code", "coding", "engineer", "engineering"], "#Technology"],
        [["ai", "artificial intelligence", "machine learning"], "#ArtificialIntelligence"],
        [["career", "job", "hiring", "recruit", "recruiting", "talent"], "#CareerGrowth"],
        [["leadership", "manage", "management", "team"], "#Leadership"],
        [["productivity"], "#Productivity"],
        [["finance", "invoice", "money", "budget"], "#Finance"],
        [["design", "ux", "ui"], "#Design"],
        [["data", "analytics"], "#DataScience"],
        [["learn", "education", "student"], "#Learning"],
        [["health", "wellness"], "#Health"],
        [["saas", "product"], "#SaaS"],
        [["remote", "work from home"], "#RemoteWork"]
    ];

    var BROAD_TAGS = ["#Business", "#Growth", "#Innovation", "#Entrepreneurship", "#Networking", "#Motivation", "#CareerAdvice", "#PersonalDevelopment"];

    var DEFAULT_FOLDERS = ["Product Launches", "Personal Branding", "Business Updates", "Educational Posts", "Startup Journey", "General"];

    /* ================= small utilities ================= */

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function uid() { return "lpg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

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

    function arrayUnique(list) {
        var seen = {}, out = [];
        (list || []).forEach(function (v) {
            var key = String(v).toLowerCase();
            if (!seen[key]) { seen[key] = true; out.push(v); }
        });
        return out;
    }

    function shuffle(list) {
        var arr = list.slice();
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    function wordCount(text) { return (text || "").trim().split(/\s+/).filter(Boolean).length; }

    function downloadBlob(content, filename, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }

    function splitParagraphs(text) {
        return (text || "").split(/\n\s*\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    }

    function splitSentences(text) {
        var matches = (text || "").replace(/\n+/g, " ").match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [];
        return matches.map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function toTopicSlot(rawTopic) {
        var t = (rawTopic || "").trim().replace(/\s+/g, " ");
        var firstSentence = splitSentences(t)[0] || t;
        firstSentence = firstSentence.replace(/[.!?]+$/, "").trim();
        var words = firstSentence.split(/\s+/);
        if (words.length > 14) firstSentence = words.slice(0, 14).join(" ");
        if (firstSentence) firstSentence = firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1);
        return firstSentence || "this";
    }

    function renderTemplate(tpl, ctx) {
        return tpl.replace(/\{(\w+)\}/g, function (_, key) { return ctx[key] !== undefined ? ctx[key] : ""; });
    }

    /* ================= hashtag engine ================= */

    function tokenize(text) { return (text || "").toLowerCase().match(/[a-z0-9']+/g) || []; }

    function topKeywords(text, n) {
        var tokens = tokenize(text).filter(function (w) { return w.length > 3 && !STOPWORDS[w]; });
        var freq = {};
        tokens.forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
        var uniq = Object.keys(freq);
        uniq.sort(function (a, b) { return freq[b] - freq[a] || a.localeCompare(b); });
        return uniq.slice(0, n);
    }

    function toHashtag(phrase) {
        return "#" + phrase.split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join("");
    }

    function generateHashtags(text) {
        var lower = (text || "").toLowerCase();
        var keywords = topKeywords(text, 12);
        var highRelevance = keywords.slice(0, 5).map(toHashtag);

        var tokensRaw = tokenize(text).filter(function (w) { return !STOPWORDS[w]; });
        var bigrams = [];
        for (var i = 0; i < tokensRaw.length - 1; i++) {
            if (tokensRaw[i].length > 2 && tokensRaw[i + 1].length > 2) bigrams.push(tokensRaw[i] + " " + tokensRaw[i + 1]);
        }
        var niche = arrayUnique(bigrams).slice(0, 5).map(toHashtag);

        var industry = [];
        INDUSTRY_MAP.forEach(function (pair) {
            var keys = pair[0], tag = pair[1];
            if (keys.some(function (k) { return lower.indexOf(k) !== -1; })) industry.push(tag);
        });
        industry = arrayUnique(industry).slice(0, 6);

        if (!highRelevance.length) highRelevance = BROAD_TAGS.slice(0, 3);

        var used = {};
        highRelevance.concat(industry).forEach(function (t) { used[t.toLowerCase()] = true; });
        niche = niche.filter(function (t) { return !used[t.toLowerCase()]; });
        niche.forEach(function (t) { used[t.toLowerCase()] = true; });
        var broad = BROAD_TAGS.filter(function (t) { return !used[t.toLowerCase()]; }).slice(0, 4);

        return { highRelevance: highRelevance, industry: industry, niche: niche, broad: broad };
    }

    function flattenHashtags(groups, count) {
        var flat = [].concat(groups.highRelevance, groups.industry, groups.niche, groups.broad);
        flat = arrayUnique(flat);
        return count ? flat.slice(0, count) : flat;
    }

    /* ================= scoring engine ================= */

    function scorePost(text) {
        var clean = text || "";
        var lower = clean.toLowerCase();
        var paragraphs = splitParagraphs(clean);
        var sentences = splitSentences(clean.replace(/#[A-Za-z0-9_]+/g, ""));
        var words = wordCount(clean.replace(/#[A-Za-z0-9_]+/g, ""));
        var hashtagCount = (clean.match(/#[A-Za-z0-9_]+/g) || []).length;
        var hasQuestion = /\?/.test(clean);
        var firstLine = (paragraphs[0] || "").split(/\n/)[0] || "";
        var firstLineWords = wordCount(firstLine);
        var strongHook = firstLineWords > 0 && firstLineWords <= 14;
        var ctaHit = CTA_SIGNAL_WORDS.some(function (w) { return lower.indexOf(w) !== -1; });
        var personalPronouns = (clean.match(/\b(i|we|my|our|i've|i'm|we've|we're)\b/gi) || []).length;
        var longParagraphs = paragraphs.filter(function (p) { return wordCount(p) > 40; }).length;
        var avgSentenceLen = sentences.length ? words / sentences.length : words;
        var allCapsWords = (clean.match(/\b[A-Z]{4,}\b/g) || []).length;
        var exclaimSpam = (clean.match(/!{2,}/g) || []).length;
        var emojiCount = (clean.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
        var slangHits = SLANG_WORDS.filter(function (w) { return lower.indexOf(w) !== -1; }).length;
        var hasBullets = /(^|\n)\s*[•\-→]\s+/.test(clean);

        var readability = 50;
        readability += paragraphs.length >= 3 ? 15 : (paragraphs.length === 2 ? 8 : 0);
        readability += longParagraphs === 0 ? 20 : (longParagraphs === 1 ? 5 : -10);
        readability += (avgSentenceLen >= 6 && avgSentenceLen <= 20) ? 15 : (avgSentenceLen > 28 ? -15 : 5);
        readability += strongHook ? 10 : 0;
        readability += hasBullets ? 8 : 0;
        readability = clamp(Math.round(readability), 0, 100);

        var engagement = 35;
        engagement += strongHook ? 15 : 0;
        engagement += hasQuestion ? 15 : 0;
        engagement += ctaHit ? 15 : 0;
        engagement += personalPronouns > 0 ? 10 : 0;
        engagement += (hashtagCount >= 1 && hashtagCount <= 6) ? 10 : (hashtagCount > 10 ? -15 : 0);
        engagement -= emojiCount > 8 ? 10 : 0;
        engagement = clamp(Math.round(engagement), 0, 100);

        var professional = 70;
        professional += allCapsWords === 0 ? 10 : -15;
        professional += exclaimSpam === 0 ? 10 : -15;
        professional -= Math.min(slangHits * 10, 20);
        professional += emojiCount <= 3 ? 10 : (emojiCount > 6 ? -15 : -5);
        professional -= hashtagCount > 12 ? 10 : 0;
        professional = clamp(Math.round(professional), 0, 100);

        var tips = [];
        if (longParagraphs > 0) tips.push("Some paragraphs are long - break them into 1-3 sentence chunks for mobile readability.");
        if (!strongHook) tips.push("Consider making the opening line shorter and punchier.");
        if (!hasQuestion && !ctaHit) tips.push("Add a question or CTA at the end to encourage discussion.");
        if (hashtagCount === 0) tips.push("Adding 3-5 relevant hashtags can help with discoverability.");
        if (hashtagCount > 8) tips.push("This has a lot of hashtags - 3-5 relevant ones usually work better than many.");
        if (slangHits > 0) tips.push("A few casual/slang words may read as less professional.");
        if (emojiCount > 6) tips.push("Consider trimming emoji use - a couple go a long way.");

        return {
            charCount: clean.length, wordCount: words, paragraphCount: paragraphs.length, hashtagCount: hashtagCount,
            readability: readability, engagement: engagement, professional: professional, tips: tips
        };
    }

    /* ================= post generation engine ================= */

    function buildHashtagsForPost(settings) {
        var pref = settings.hashtagPref;
        var groups = generateHashtags([settings.topic, settings.additionalContext, settings.audience].filter(Boolean).join(" "));
        if (pref === "0") return "";
        var count = pref === "recommended" ? clamp(groups.highRelevance.length + Math.min(groups.industry.length, 2), 3, 6) : parseInt(pref, 10);
        return flattenHashtags(groups, count).join(" ");
    }

    function buildValueSection(settings) {
        if (settings.additionalContext) {
            var ctxSentences = splitSentences(settings.additionalContext);
            if (settings.style === "list-style" && ctxSentences.length >= 2) {
                return ctxSentences.slice(0, 4).map(function (s) { return "→ " + capFirst(s.replace(/[.!?]+$/, "")) + "."; }).join("\n");
            }
            return capFirst(settings.additionalContext.trim());
        }
        var base = GOAL_VALUE[settings.goal] || GOAL_VALUE.other;
        if (settings.style === "list-style") {
            return ["→ " + capFirst(base) + ".", "→ Small, consistent steps beat one big push.", "→ Clarity matters more than volume."].join("\n");
        }
        return capFirst(base) + ".";
    }

    function buildPostVariant(settings, excludeHooks) {
        var topicSlot = toTopicSlot(settings.topic);
        var hookPool = STYLE_HOOKS[settings.style] || STYLE_HOOKS.storytelling;
        var hook = null;
        for (var i = 0; i < hookPool.length; i++) {
            var candidate = capFirst(renderTemplate(randomFrom(hookPool), { Topic: topicSlot }));
            if (!excludeHooks[candidate.toLowerCase()]) { hook = candidate; break; }
        }
        if (!hook) hook = capFirst(renderTemplate(randomFrom(hookPool), { Topic: topicSlot }));
        excludeHooks[hook.toLowerCase()] = true;

        var contextPara = capFirst(settings.topic.trim());
        if (!/[.!?]$/.test(contextPara)) contextPara += ".";
        if (settings.audience && Math.random() < 0.7) {
            contextPara += " If you're in " + settings.audience.trim() + ", this might resonate.";
        }
        if (STYLE_INTROS[settings.style] && Math.random() < 0.5) {
            contextPara = STYLE_INTROS[settings.style] + "\n\n" + contextPara;
        }

        var valuePara = buildValueSection(settings);
        var takeawayLine = capFirst(renderTemplate(randomFrom(TAKEAWAY_TEMPLATES), { Takeaway: GOAL_VALUE[settings.goal] || GOAL_VALUE.other }));
        var ctaLine = settings.cta !== "none" ? randomFrom(CTA_BANK[settings.cta] || [""]) : "";
        var hashtagLine = buildHashtagsForPost(settings);

        var parts = [hook, contextPara, valuePara];
        if (settings.length !== "short") parts.push(takeawayLine);
        if (settings.length === "long") parts.push(randomFrom(LONGER_FILLERS));
        if (ctaLine) parts.push(ctaLine);

        var bucket = LENGTH_BUCKETS[settings.length] || LENGTH_BUCKETS.medium;
        var bodyText = parts.filter(Boolean).join("\n\n");
        var currentWords = wordCount(bodyText);
        if (currentWords < bucket.min && settings.length !== "short") {
            bodyText += "\n\n" + randomFrom(LONGER_FILLERS);
        }
        if (hashtagLine) bodyText += "\n\n" + hashtagLine;

        return { id: uid(), text: bodyText };
    }

    function generatePosts(settings, count, excludeHooks) {
        var results = [];
        var attempts = 0;
        while (results.length < count && attempts < count * 6 + 10) {
            attempts++;
            results.push(buildPostVariant(settings, excludeHooks));
        }
        return results;
    }

    /* ================= formatter engine ================= */

    function fixGrammarSentence(s) {
        s = s.trim().replace(/\s{2,}/g, " ");
        if (!s) return s;
        s = capFirst(s);
        s = s.replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?").replace(/\.{4,}/g, "...");
        if (!/[.!?]$/.test(s)) s += ".";
        return s;
    }

    function looksLikeList(sentence) {
        var commaCount = (sentence.match(/,/g) || []).length;
        var andCount = (sentence.match(/\band\b/gi) || []).length;
        return sentence.length > 55 && (commaCount >= 2 || andCount >= 2);
    }

    function toBulletList(sentence, bulletChar) {
        var items = sentence.replace(/[.!?]+$/, "").split(/,|\band\b/i)
            .map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 1; });
        if (items.length < 3) return sentence;
        return items.map(function (it) { return bulletChar + " " + capFirst(it) + "."; }).join("\n");
    }

    function formatPost(rawText, opts) {
        var text = (rawText || "").replace(/\r\n/g, "\n").trim();
        var rawParagraphs = splitParagraphs(text);
        if (rawParagraphs.length <= 1) rawParagraphs = [text.replace(/\s+/g, " ").trim()];

        var sentences = [];
        rawParagraphs.forEach(function (p) { sentences = sentences.concat(splitSentences(p)); });
        sentences = sentences.map(function (s) { return s.trim(); }).filter(Boolean);
        if (!opts.preserveOriginal) sentences = sentences.map(fixGrammarSentence);

        var perPara = opts.intensity === "light" ? 3 : (opts.intensity === "moderate" ? 2 : 1);
        var bulletChar = (opts.style === "engaging" || opts.style === "storytelling" || opts.style === "bold") ? "→" : "•";

        var outParas = [];
        for (var i = 0; i < sentences.length; i += perPara) {
            var joined = sentences.slice(i, i + perPara).join(" ");
            if (opts.intensity !== "light" && looksLikeList(joined)) {
                outParas.push(toBulletList(joined, bulletChar));
            } else {
                outParas.push(joined);
            }
        }
        return outParas.join("\n\n");
    }

    /* ================= improve actions ================= */

    function improveHook(text) {
        var paras = splitParagraphs(text);
        if (!paras.length) return text;
        var slot = toTopicSlot(paras[0].split(/\n/)[0]);
        var pool = HOOK_CATEGORY_BANK.Bold.concat(HOOK_CATEGORY_BANK.Curiosity);
        var newHook = capFirst(renderTemplate(randomFrom(pool), { Topic: slot }));
        paras[0] = newHook;
        return paras.join("\n\n");
    }

    function makeMoreEngaging(text) {
        var out = text;
        if (!/\?/.test(out)) out += "\n\n" + randomFrom(ENGAGEMENT_QUESTIONS);
        return formatPost(out, { intensity: "moderate", style: "engaging", preserveOriginal: true });
    }

    function makeMoreProfessional(text) {
        var out = text;
        Object.keys(PROFESSIONAL_SWAPS).forEach(function (slang) {
            var re = new RegExp("\\b" + slang.trim() + "\\b", "gi");
            out = out.replace(re, PROFESSIONAL_SWAPS[slang]);
        });
        out = out.replace(/!{2,}/g, ".").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
        out = out.split(/\n\s*\n+/).map(function (p) { return capFirst(p.trim()); }).join("\n\n");
        return out.replace(/\s{2,}/g, " ").replace(/ \n/g, "\n");
    }

    function makeShorter(text) {
        var paras = splitParagraphs(text);
        if (paras.length <= 3) return text;
        var hashtagLine = /^#/.test(paras[paras.length - 1]) ? paras.pop() : null;
        var last = paras.pop();
        var first = paras.shift();
        var middle = paras.sort(function (a, b) { return wordCount(a) - wordCount(b); }).slice(0, 1);
        var kept = [first].concat(middle, [last]);
        if (hashtagLine) kept.push(hashtagLine);
        return kept.filter(Boolean).join("\n\n");
    }

    function makeLonger(text) {
        var paras = splitParagraphs(text);
        var hashtagLine = paras.length && /^#/.test(paras[paras.length - 1]) ? paras.pop() : null;
        paras.splice(Math.max(paras.length - 1, 1), 0, randomFrom(LONGER_FILLERS));
        if (hashtagLine) paras.push(hashtagLine);
        return paras.join("\n\n");
    }

    function addCta(text) {
        var lower = text.toLowerCase();
        if (CTA_SIGNAL_WORDS.some(function (w) { return lower.indexOf(w) !== -1; })) return text;
        var paras = splitParagraphs(text);
        var hashtagLine = paras.length && /^#/.test(paras[paras.length - 1]) ? paras.pop() : null;
        paras.push(randomFrom(CTA_BANK.question.concat(CTA_BANK.comment)));
        if (hashtagLine) paras.push(hashtagLine);
        return paras.join("\n\n");
    }

    function addHashtagsToText(text) {
        var paras = splitParagraphs(text);
        var hasHashtagLine = paras.length && /^#/.test(paras[paras.length - 1]);
        var groups = generateHashtags(text);
        var tags = flattenHashtags(groups, 5);
        if (hasHashtagLine) {
            var existing = paras.pop().split(/\s+/).filter(Boolean);
            tags = arrayUnique(existing.concat(tags)).slice(0, 6);
        }
        paras.push(tags.join(" "));
        return paras.join("\n\n");
    }

    function fixGrammar(text) {
        var paras = splitParagraphs(text);
        return paras.map(function (p) {
            if (/^#/.test(p) || /^[•→\-]\s/.test(p)) return p;
            return splitSentences(p).map(fixGrammarSentence).join(" ");
        }).join("\n\n");
    }

    function rewritePost(text) {
        var plain = text.replace(/#[A-Za-z0-9_]+/g, "").trim();
        var firstSentence = splitSentences(plain)[0] || plain.slice(0, 80);
        var settings = {
            topic: firstSentence, goal: "share-knowledge", audience: "", tone: "conversational",
            length: "medium", style: randomFrom(["storytelling", "lesson-learned", "educational"]),
            cta: "question", hashtagPref: "0", additionalContext: plain
        };
        return buildPostVariant(settings, {}).text;
    }

    /* ================= hook generator ================= */

    function buildHookGroups(topic) {
        var slot = toTopicSlot(topic);
        var groups = {};
        Object.keys(HOOK_CATEGORY_BANK).forEach(function (cat) {
            var pool = shuffle(HOOK_CATEGORY_BANK[cat]).slice(0, 5);
            groups[cat] = pool.map(function (tpl) { return capFirst(renderTemplate(tpl, { Topic: slot })); });
        });
        return groups;
    }

    /* ================= clipboard / toast ================= */

    var toastTimer;
    function showToast(msg) {
        var t = $("lpgToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
    }

    function copyText(text, msg) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast(msg || "Copied to clipboard."); }, function () { showToast("Could not copy - please copy manually."); });
        } else {
            window.prompt("Copy this text:", text);
        }
    }

    /* ================= saved posts storage ================= */

    function loadSaved() { try { return JSON.parse(localStorage.getItem("lpgSavedPosts")) || []; } catch (e) { return []; } }
    function saveSaved(list) { try { localStorage.setItem("lpgSavedPosts", JSON.stringify(list)); } catch (e) { } }
    function loadFolders() {
        try {
            var stored = JSON.parse(localStorage.getItem("lpgFolders"));
            if (stored && stored.length) return stored;
        } catch (e) { }
        return DEFAULT_FOLDERS.slice();
    }
    function saveFolders(list) { try { localStorage.setItem("lpgFolders", JSON.stringify(arrayUnique(list))); } catch (e) { } }

    var lastUsedFolder = null;
    var activeSavedFolder = "All";

    function promptFolder() {
        var folders = loadFolders();
        var msg = "Save to which folder?\nExisting: " + folders.join(", ") + "\n(Type a new name to create one.)";
        var input = window.prompt(msg, lastUsedFolder || folders[0]);
        if (input === null) return null;
        input = input.trim() || "General";
        if (folders.indexOf(input) === -1) { folders.push(input); saveFolders(folders); }
        return input;
    }

    function saveToLibrary(text) {
        var folder = promptFolder();
        if (folder === null) return;
        lastUsedFolder = folder;
        var list = loadSaved();
        list.unshift({ id: uid(), text: text, folder: folder, createdAt: Date.now() });
        saveSaved(list);
        renderSavedFolderBar();
        renderSavedGrid();
        showToast('Saved to "' + folder + '".');
    }

    function renderSavedFolderBar() {
        var bar = $("savedFolderBar");
        var saved = loadSaved();
        var used = {};
        saved.forEach(function (p) { used[p.folder] = true; });
        var folders = arrayUnique(loadFolders().filter(function (f) { return used[f]; }).concat(Object.keys(used)));
        var chips = ["All"].concat(folders);
        bar.innerHTML = chips.map(function (f) {
            return '<button type="button" class="lpg-folder-chip' + (f === activeSavedFolder ? " active" : "") + '" data-folder="' + esc(f) + '">' + esc(f) + "</button>";
        }).join("");
    }

    function savedCardHTML(post) {
        return (
            '<div class="lpg-saved-card" data-id="' + post.id + '">' +
            '<div class="lpg-saved-card-head"><span class="lpg-saved-folder-tag">' + esc(post.folder) + "</span></div>" +
            '<div class="lpg-saved-text" data-id="' + post.id + '">' + esc(post.text) + "</div>" +
            '<div class="lpg-saved-actions">' +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="copy">Copy</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="edit">Edit</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="move">Move</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm lpg-btn-danger" data-act="delete">Delete</button>' +
            "</div></div>"
        );
    }

    function renderSavedGrid() {
        var grid = $("savedGrid");
        var saved = loadSaved();
        var filtered = activeSavedFolder === "All" ? saved : saved.filter(function (p) { return p.folder === activeSavedFolder; });
        grid.innerHTML = filtered.map(savedCardHTML).join("");
        $("savedResultsCount").textContent = saved.length ? (saved.length + " saved") : "";
        $("savedEmptyState").hidden = filtered.length !== 0;
    }

    /* ================= tab switching ================= */

    function initTabs() {
        var tabButtons = Array.prototype.slice.call(document.querySelectorAll(".lpg-tab"));
        tabButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                tabButtons.forEach(function (b) {
                    b.classList.remove("active"); b.setAttribute("aria-selected", "false");
                });
                btn.classList.add("active"); btn.setAttribute("aria-selected", "true");
                document.querySelectorAll(".lpg-tabpanel").forEach(function (panel) {
                    panel.hidden = panel.id !== btn.getAttribute("data-tab");
                });
            });
        });
    }

    /* ================= GENERATE POST tab ================= */

    var currentGenResults = []; // [{item, scored}]
    var currentGenSettings = null;
    var selectedGenId = null;

    function populateSelect(id, list) {
        var sel = $(id);
        list.forEach(function (pair) {
            var opt = document.createElement("option");
            opt.value = pair[0]; opt.textContent = pair[1];
            sel.appendChild(opt);
        });
    }

    function collectGenSettings() {
        return {
            topic: $("lpgTopic").value.trim(),
            goal: $("lpgGoal").value,
            audience: $("lpgAudience").value.trim(),
            tone: $("lpgTone").value,
            length: $("lpgLength").value,
            style: $("lpgStyle").value,
            cta: $("lpgCta").value,
            hashtagPref: $("lpgHashtagPref").value,
            additionalContext: $("lpgContext").value.trim()
        };
    }

    function scoreChipsHTML(scored) {
        return (
            '<div class="lpg-score ' + classForStatus(scored.readability) + '"><span>Readability</span><strong>' + scored.readability + "/100</strong></div>" +
            '<div class="lpg-score ' + classForStatus(scored.engagement) + '"><span>Engagement</span><strong>' + scored.engagement + "/100</strong></div>" +
            '<div class="lpg-score ' + classForStatus(scored.professional) + '"><span>Professional</span><strong>' + scored.professional + "/100</strong></div>"
        );
    }

    function genPostCardHTML(item, scored, isSelected) {
        var meta = '<span class="lpg-chip">' + scored.wordCount + " words</span>" +
            '<span class="lpg-chip">' + scored.paragraphCount + " paragraphs</span>" +
            '<span class="lpg-chip' + (scored.hashtagCount ? " good" : "") + '">' + scored.hashtagCount + " hashtags</span>";
        var tips = scored.tips.slice(0, 2).map(function (t) { return '<div class="lpg-desc-tip">⚠ ' + esc(t) + "</div>"; }).join("");

        return (
            '<div class="lpg-post-card' + (isSelected ? " is-selected" : "") + '" data-id="' + item.id + '">' +
            '<div class="lpg-post-text" data-id="' + item.id + '">' + esc(item.text) + "</div>" +
            '<div class="lpg-post-meta">' + meta + "</div>" +
            '<div class="lpg-score-row">' + scoreChipsHTML(scored) + "</div>" +
            tips +
            '<div class="lpg-post-actions">' +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="copy">Copy</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="edit">Edit</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="regen">↻ Regenerate</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm lpg-select-btn' + (isSelected ? " active" : "") + '" data-act="select">' + (isSelected ? "✓ Previewing" : "Preview") + "</button>" +
            '<button type="button" class="lpg-btn lpg-btn-sm" data-act="save">Save Draft</button>' +
            '<button type="button" class="lpg-btn lpg-btn-sm lpg-btn-danger" data-act="delete" aria-label="Delete">✕</button>' +
            "</div></div>"
        );
    }

    function initialsFromName(name) {
        var parts = (name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "YN";
        return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
    }

    function renderPreview() {
        var found = null;
        currentGenResults.forEach(function (r) { if (r.item.id === selectedGenId) found = r.item; });
        if (!found && currentGenResults.length) found = currentGenResults[0].item;
        $("previewSection").hidden = !found;
        if (!found) return;
        $("previewBody").textContent = found.text;
        var name = $("lpgPreviewName").value.trim() || "Your Name";
        var headline = $("lpgPreviewHeadline").value.trim() || "Your professional headline";
        $("previewName").textContent = name;
        $("previewHeadline").textContent = headline;
        $("previewAvatar").textContent = initialsFromName(name);
    }

    function renderGenResults() {
        var grid = $("generatePostsGrid");
        grid.innerHTML = currentGenResults.map(function (r) { return genPostCardHTML(r.item, r.scored, r.item.id === selectedGenId); }).join("");
        $("generateResultsCount").textContent = currentGenResults.length ? (currentGenResults.length + " posts generated") : "";
        $("generateResultsSection").hidden = currentGenResults.length === 0;
        renderPreview();
    }

    function initGenerateTab() {
        populateSelect("lpgGoal", GOALS); $("lpgGoal").value = "share-knowledge";
        populateSelect("lpgTone", TONES); $("lpgTone").value = "professional";
        populateSelect("lpgStyle", STYLES); $("lpgStyle").value = "storytelling";
        populateSelect("lpgCta", CTAS); $("lpgCta").value = "question";

        $("btnHeroCta").addEventListener("click", function () {
            $("lpgForm").scrollIntoView({ behavior: "smooth", block: "start" });
            $("lpgTopic").focus();
        });

        $("lpgForm").addEventListener("submit", function (e) {
            e.preventDefault();
            var topic = $("lpgTopic").value.trim();
            var errEl = $("errTopic");
            if (!topic) { errEl.textContent = "Post topic or idea is required."; $("lpgTopic").focus(); return; }
            errEl.textContent = "";

            var settings = collectGenSettings();
            currentGenSettings = settings;
            selectedGenId = null;
            var fresh = generatePosts(settings, 3, {});
            currentGenResults = fresh.map(function (item) { return { item: item, scored: scorePost(item.text) }; });
            selectedGenId = currentGenResults.length ? currentGenResults[0].item.id : null;
            renderGenResults();
            showToast(currentGenResults.length + " post variations generated!");
            $("generateResultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
        });

        $("btnClearGenerateForm").addEventListener("click", function () {
            $("lpgForm").reset();
            $("lpgGoal").value = "share-knowledge"; $("lpgTone").value = "professional";
            $("lpgStyle").value = "storytelling"; $("lpgCta").value = "question";
            $("lpgLength").value = "medium"; $("lpgHashtagPref").value = "5";
            $("errTopic").textContent = "";
            $("lpgTopic").focus();
        });

        $("generatePostsGrid").addEventListener("click", function (e) {
            var btn = e.target.closest("[data-act]");
            if (!btn) return;
            var card = btn.closest("[data-id]");
            var id = card.getAttribute("data-id");
            var idx = -1;
            currentGenResults.forEach(function (r, i) { if (r.item.id === id) idx = i; });
            if (idx === -1) return;
            var act = btn.getAttribute("data-act");

            if (act === "copy") {
                copyText(currentGenResults[idx].item.text, "Post copied to clipboard.");
            } else if (act === "select") {
                selectedGenId = id;
                renderGenResults();
                $("previewSection").scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (act === "save") {
                saveToLibrary(currentGenResults[idx].item.text);
            } else if (act === "delete") {
                currentGenResults.splice(idx, 1);
                if (selectedGenId === id) selectedGenId = currentGenResults.length ? currentGenResults[0].item.id : null;
                renderGenResults();
            } else if (act === "regen") {
                var excludeHooks = {};
                var fresh = buildPostVariant(currentGenSettings, excludeHooks);
                currentGenResults[idx] = { item: fresh, scored: scorePost(fresh.text) };
                if (selectedGenId === id) selectedGenId = fresh.id;
                renderGenResults();
                showToast("Post regenerated.");
            } else if (act === "edit") {
                var textEl = card.querySelector(".lpg-post-text");
                var isEditing = textEl.getAttribute("contenteditable") === "true";
                if (!isEditing) {
                    textEl.textContent = currentGenResults[idx].item.text;
                    textEl.setAttribute("contenteditable", "true");
                    textEl.focus();
                    btn.textContent = "Save";
                } else {
                    var newText = textEl.textContent.trim();
                    if (newText) {
                        currentGenResults[idx].item.text = newText;
                        currentGenResults[idx].scored = scorePost(newText);
                    }
                    renderGenResults();
                    showToast("Post updated.");
                }
            }
        });

        $("btnCopyAllPosts").addEventListener("click", function () {
            if (!currentGenResults.length) { showToast("Nothing to copy yet."); return; }
            copyText(currentGenResults.map(function (r) { return r.item.text; }).join("\n\n---\n\n"), "All posts copied.");
        });
        $("btnDownloadAllPosts").addEventListener("click", function () {
            if (!currentGenResults.length) { showToast("Nothing to export yet."); return; }
            downloadBlob(currentGenResults.map(function (r) { return r.item.text; }).join("\n\n---\n\n"), "linkedin-posts.txt", "text/plain");
        });
        $("btnGenerateMorePosts").addEventListener("click", function () {
            if (!currentGenSettings) { showToast("Generate a post first."); return; }
            var excludeHooks = {};
            var more = generatePosts(currentGenSettings, 1, excludeHooks);
            var added = more.map(function (item) { return { item: item, scored: scorePost(item.text) }; });
            currentGenResults = currentGenResults.concat(added);
            renderGenResults();
            showToast("1 more post added.");
        });
        $("btnClearGenerateResults").addEventListener("click", function () {
            if (!currentGenResults.length) return;
            if (!window.confirm("Clear all generated posts?")) return;
            currentGenResults = []; selectedGenId = null;
            renderGenResults();
        });

        $("lpgPreviewName").addEventListener("input", renderPreview);
        $("lpgPreviewHeadline").addEventListener("input", renderPreview);
    }

    /* ================= FORMAT POST tab ================= */

    var currentFormatText = "";

    function formatChipsAndScores() {
        var scored = scorePost(currentFormatText);
        $("formatResultMeta").innerHTML =
            '<span class="lpg-chip">' + scored.wordCount + " words</span>" +
            '<span class="lpg-chip">' + scored.paragraphCount + " paragraphs</span>" +
            '<span class="lpg-chip' + (scored.hashtagCount ? " good" : "") + '">' + scored.hashtagCount + " hashtags</span>";
        $("formatResultScores").innerHTML = scoreChipsHTML(scored);
        return scored;
    }

    function renderFormatResult() {
        $("formatResultText").textContent = currentFormatText;
        formatChipsAndScores();
        $("formatResultSection").hidden = false;
        $("formatEmptyState").hidden = true;
    }

    function initFormatTab() {
        $("btnFormatPost").addEventListener("click", function () {
            var raw = $("lpgFormatInput").value.trim();
            if (!raw) { showToast("Paste a post to format first."); return; }
            var opts = {
                style: $("lpgFormatStyle").value,
                intensity: $("lpgFormatIntensity").value,
                preserveOriginal: $("lpgPreserveOriginal").checked
            };
            currentFormatText = formatPost(raw, opts);
            renderFormatResult();
            showToast("Post formatted.");
        });

        $("btnClearFormat").addEventListener("click", function () {
            $("lpgFormatInput").value = "";
            currentFormatText = "";
            $("formatResultSection").hidden = true;
            $("formatEmptyState").hidden = false;
        });

        $("formatImproveRow").addEventListener("click", function (e) {
            var btn = e.target.closest("[data-improve]");
            if (!btn || !currentFormatText) return;
            var action = btn.getAttribute("data-improve");
            var map = {
                hook: improveHook, engaging: makeMoreEngaging, professional: makeMoreProfessional,
                shorter: makeShorter, longer: makeLonger, cta: addCta, hashtags: addHashtagsToText,
                grammar: fixGrammar, rewrite: rewritePost
            };
            if (map[action]) {
                currentFormatText = map[action](currentFormatText);
                renderFormatResult();
                showToast("Post updated.");
            }
        });

        $("btnCopyFormatted").addEventListener("click", function () {
            copyText(currentFormatText, "Formatted post copied.");
        });
        $("btnDownloadFormatted").addEventListener("click", function () {
            downloadBlob(currentFormatText, "linkedin-post-formatted.txt", "text/plain");
        });
        $("btnSaveFormatted").addEventListener("click", function () {
            if (!currentFormatText) return;
            saveToLibrary(currentFormatText);
        });
        $("btnEditFormatted").addEventListener("click", function (e) {
            var textEl = $("formatResultText");
            var isEditing = textEl.getAttribute("contenteditable") === "true";
            if (!isEditing) {
                textEl.setAttribute("contenteditable", "true");
                textEl.focus();
                e.target.textContent = "Save";
            } else {
                currentFormatText = textEl.textContent.trim();
                textEl.setAttribute("contenteditable", "false");
                formatChipsAndScores();
                e.target.textContent = "Edit";
                showToast("Formatted post updated.");
            }
        });
    }

    /* ================= HOOKS tab ================= */

    function hookGroupHTML(category, hooks) {
        var items = hooks.map(function (h) {
            return '<li class="lpg-hook-item"><span>' + esc(h) + '</span><button type="button" class="lpg-btn lpg-btn-sm" data-hook="' + esc(h) + '">Copy</button></li>';
        }).join("");
        return '<div class="lpg-hook-group"><h3>' + esc(category) + '</h3><ul class="lpg-hook-list">' + items + "</ul></div>";
    }

    function initHooksTab() {
        $("btnGenerateHooks").addEventListener("click", function () {
            var topic = $("lpgHookTopic").value.trim();
            if (!topic) { $("errHookTopic").textContent = "Enter a topic to generate hooks."; $("lpgHookTopic").focus(); return; }
            $("errHookTopic").textContent = "";
            var groups = buildHookGroups(topic);
            var grid = $("hookGroupsGrid");
            grid.innerHTML = Object.keys(groups).map(function (cat) { return hookGroupHTML(cat, groups[cat]); }).join("");
            grid.hidden = false;
            $("hooksEmptyState").hidden = true;
            showToast("Hooks generated.");
        });

        $("hookGroupsGrid").addEventListener("click", function (e) {
            var btn = e.target.closest("[data-hook]");
            if (!btn) return;
            copyText(btn.getAttribute("data-hook"), "Hook copied to clipboard.");
        });
    }

    /* ================= HASHTAGS tab ================= */

    var selectedHashtags = {};

    function hashtagGroupHTML(label, tags) {
        if (!tags.length) return "";
        var chips = tags.map(function (t) {
            var selected = selectedHashtags[t] ? " selected" : "";
            return '<button type="button" class="lpg-hashtag-chip' + selected + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
        }).join("");
        return '<div class="lpg-hashtag-group"><h3>' + esc(label) + '</h3><div class="lpg-hashtag-chips">' + chips + "</div></div>";
    }

    function renderHashtagSelectedCount() {
        var count = Object.keys(selectedHashtags).filter(function (k) { return selectedHashtags[k]; }).length;
        $("hashtagSelectedCount").textContent = count + " selected";
    }

    function initHashtagsTab() {
        $("btnGenerateHashtags").addEventListener("click", function () {
            var content = $("lpgHashtagContent").value.trim();
            if (!content) { $("errHashtagContent").textContent = "Add content or a topic to generate hashtags."; $("lpgHashtagContent").focus(); return; }
            $("errHashtagContent").textContent = "";
            selectedHashtags = {};
            var groups = generateHashtags(content);
            $("hashtagGroupsGrid").innerHTML =
                hashtagGroupHTML("High-Relevance", groups.highRelevance) +
                hashtagGroupHTML("Industry", groups.industry) +
                hashtagGroupHTML("Niche", groups.niche) +
                hashtagGroupHTML("Broad", groups.broad);
            $("hashtagResultsWrap").hidden = false;
            $("hashtagsEmptyState").hidden = true;
            renderHashtagSelectedCount();
            showToast("Hashtags generated.");
        });

        $("hashtagGroupsGrid").addEventListener("click", function (e) {
            var chip = e.target.closest("[data-tag]");
            if (!chip) return;
            var tag = chip.getAttribute("data-tag");
            selectedHashtags[tag] = !selectedHashtags[tag];
            chip.classList.toggle("selected", !!selectedHashtags[tag]);
            renderHashtagSelectedCount();
        });

        $("btnSelectAllHashtags").addEventListener("click", function () {
            document.querySelectorAll("#hashtagGroupsGrid [data-tag]").forEach(function (chip) {
                selectedHashtags[chip.getAttribute("data-tag")] = true;
                chip.classList.add("selected");
            });
            renderHashtagSelectedCount();
        });
        $("btnClearHashtagSelection").addEventListener("click", function () {
            selectedHashtags = {};
            document.querySelectorAll("#hashtagGroupsGrid [data-tag]").forEach(function (chip) { chip.classList.remove("selected"); });
            renderHashtagSelectedCount();
        });
        $("btnCopySelectedHashtags").addEventListener("click", function () {
            var tags = Object.keys(selectedHashtags).filter(function (k) { return selectedHashtags[k]; });
            if (!tags.length) { showToast("Select at least one hashtag first."); return; }
            copyText(tags.join(" "), "Hashtags copied.");
        });
    }

    /* ================= SAVED POSTS tab ================= */

    function initSavedTab() {
        renderSavedFolderBar();
        renderSavedGrid();

        $("savedFolderBar").addEventListener("click", function (e) {
            var chip = e.target.closest("[data-folder]");
            if (!chip) return;
            activeSavedFolder = chip.getAttribute("data-folder");
            renderSavedFolderBar();
            renderSavedGrid();
        });

        $("savedGrid").addEventListener("click", function (e) {
            var btn = e.target.closest("[data-act]");
            if (!btn) return;
            var card = btn.closest("[data-id]");
            var id = card.getAttribute("data-id");
            var list = loadSaved();
            var idx = -1;
            list.forEach(function (p, i) { if (p.id === id) idx = i; });
            if (idx === -1) return;
            var act = btn.getAttribute("data-act");

            if (act === "copy") {
                copyText(list[idx].text, "Post copied to clipboard.");
            } else if (act === "delete") {
                if (!window.confirm("Delete this saved post?")) return;
                list.splice(idx, 1);
                saveSaved(list);
                renderSavedFolderBar();
                renderSavedGrid();
            } else if (act === "move") {
                var folder = promptFolder();
                if (folder === null) return;
                list[idx].folder = folder;
                saveSaved(list);
                renderSavedFolderBar();
                renderSavedGrid();
            } else if (act === "edit") {
                var textEl = card.querySelector(".lpg-saved-text");
                var isEditing = textEl.getAttribute("contenteditable") === "true";
                if (!isEditing) {
                    textEl.setAttribute("contenteditable", "true");
                    textEl.focus();
                    btn.textContent = "Save";
                } else {
                    var newText = textEl.textContent.trim();
                    if (newText) { list[idx].text = newText; saveSaved(list); }
                    textEl.setAttribute("contenteditable", "false");
                    btn.textContent = "Edit";
                    showToast("Saved post updated.");
                }
            }
        });
    }

    /* ================= init ================= */

    initTabs();
    initGenerateTab();
    initFormatTab();
    initHooksTab();
    initHashtagsTab();
    initSavedTab();
})();
