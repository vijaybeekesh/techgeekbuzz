/* SEO Title Generator — rule-based title engine with SEO/CTR scoring,
   a Google SERP preview, and local history. Everything runs client-side. */

(function () {
    "use strict";

    /* ---------- reference data ---------- */

    var CONTENT_TYPES = [
        ["blog-post", "Blog Post"], ["article", "Article"], ["landing-page", "Landing Page"],
        ["product-page", "Product Page"], ["service-page", "Service Page"], ["category-page", "Category Page"],
        ["youtube-video", "YouTube Video"], ["news-article", "News Article"], ["affiliate-article", "Affiliate Article"],
        ["comparison-article", "Comparison Article"], ["review", "Review"], ["how-to-guide", "How-To Guide"],
        ["tutorial", "Tutorial"], ["listicle", "Listicle"], ["case-study", "Case Study"],
        ["ecommerce-product", "E-commerce Product"], ["social-media", "Social Media"], ["email-subject", "Email Subject"],
        ["custom", "Custom"]
    ];
    var CONTENT_TYPE_LABELS = {};
    CONTENT_TYPES.forEach(function (c) { CONTENT_TYPE_LABELS[c[0]] = c[1]; });

    var TONES = [
        ["professional", "Professional"], ["friendly", "Friendly"], ["conversational", "Conversational"],
        ["formal", "Formal"], ["persuasive", "Persuasive"], ["educational", "Educational"], ["creative", "Creative"],
        ["luxury", "Luxury"], ["minimal", "Minimal"], ["exciting", "Exciting"], ["humorous", "Humorous"],
        ["urgent", "Urgent"], ["confident", "Confident"]
    ];

    var LANGUAGES = [
        ["en", "English"], ["hi", "Hindi"], ["es", "Spanish"], ["fr", "French"], ["de", "German"],
        ["ar", "Arabic"], ["pt", "Portuguese"], ["it", "Italian"], ["ja", "Japanese"], ["zh", "Chinese"]
    ];

    var COUNTRIES = [
        ["", "Global"], ["United States", "United States"], ["United Kingdom", "United Kingdom"], ["Canada", "Canada"],
        ["Australia", "Australia"], ["India", "India"], ["Germany", "Germany"], ["France", "France"], ["Spain", "Spain"],
        ["Italy", "Italy"], ["Portugal", "Portugal"], ["Brazil", "Brazil"], ["Mexico", "Mexico"], ["Japan", "Japan"],
        ["China", "China"], ["South Korea", "South Korea"], ["Singapore", "Singapore"], ["UAE", "United Arab Emirates"],
        ["Saudi Arabia", "Saudi Arabia"], ["South Africa", "South Africa"], ["Nigeria", "Nigeria"], ["Egypt", "Egypt"],
        ["Netherlands", "Netherlands"], ["Sweden", "Sweden"], ["Switzerland", "Switzerland"], ["Ireland", "Ireland"],
        ["New Zealand", "New Zealand"], ["Indonesia", "Indonesia"], ["Philippines", "Philippines"], ["Malaysia", "Malaysia"],
        ["Pakistan", "Pakistan"], ["Bangladesh", "Bangladesh"], ["Turkey", "Turkey"], ["Poland", "Poland"],
        ["Argentina", "Argentina"], ["Chile", "Chile"], ["Colombia", "Colombia"], ["Vietnam", "Vietnam"], ["Thailand", "Thailand"]
    ];

    var CATEGORY_ORDER = [
        "question", "howto", "ultimateGuide", "beginner", "expert", "numberList", "comparison", "review",
        "benefit", "mistake", "checklist", "powerWord", "emotional", "curiosity", "trending", "localSeo",
        "product", "service", "evergreen", "seasonal"
    ];
    var CATEGORY_LABELS = {
        question: "Question", howto: "How-To", ultimateGuide: "Ultimate Guide", beginner: "Beginner",
        expert: "Expert", numberList: "Number/List", comparison: "Comparison", review: "Review",
        benefit: "Benefit", mistake: "Mistake", checklist: "Checklist", powerWord: "Power Word",
        emotional: "Emotional", curiosity: "Curiosity", trending: "Trending", localSeo: "Local SEO",
        product: "Product", service: "Service", evergreen: "Evergreen", seasonal: "Seasonal"
    };

    var INTENT_WEIGHTS = {
        informational: { howto: 3, ultimateGuide: 3, question: 3, beginner: 2, expert: 2, checklist: 2, evergreen: 2 },
        commercial: { comparison: 3, review: 3, benefit: 2, numberList: 2 },
        transactional: { product: 3, service: 3, benefit: 2, powerWord: 2 },
        navigational: { product: 2, service: 2, evergreen: 2 },
        local: { localSeo: 4, service: 2, product: 1 }
    };
    var CONTENTTYPE_WEIGHTS = {
        "how-to-guide": { howto: 3, checklist: 2 }, "tutorial": { howto: 3, beginner: 2 },
        "listicle": { numberList: 3 }, "review": { review: 3 }, "comparison-article": { comparison: 3 },
        "product-page": { product: 3 }, "service-page": { service: 3 }, "ecommerce-product": { product: 3, benefit: 2 },
        "youtube-video": { curiosity: 2, numberList: 2, howto: 2 }, "case-study": { expert: 2, benefit: 2 },
        "news-article": { trending: 3 }, "email-subject": { curiosity: 3, urgent: 2 }, "category-page": { evergreen: 2 },
        "landing-page": { benefit: 2, powerWord: 2 }, "affiliate-article": { review: 2, comparison: 2 }
    };

    var TONE_FLAVOR = {
        friendly: [" — A Friendly Guide"], educational: [" Explained"], luxury: [" — The Premium Choice"],
        exciting: [" — You Won't Want to Miss This"], humorous: [" (Yes, Really)"], urgent: [" — Don't Wait"],
        confident: [" — Proven to Work"], persuasive: [" You Need to Try"], creative: [" (A Fresh Take)"]
    };

    var POWER_WORDS = ["proven", "ultimate", "essential", "free", "secret", "guaranteed", "powerful", "effortless",
        "instant", "exclusive", "best", "top", "easy", "simple", "complete", "definitive", "expert", "advanced",
        "professional", "trusted", "reliable", "smart", "effective", "breakthrough", "revolutionary", "must-have",
        "critical", "unlock", "discover", "master"];
    var EMOTIONAL_WORDS = ["love", "surprising", "amazing", "shocking", "incredible", "inspiring", "fear", "worry",
        "stress", "happy", "excited", "trust", "regret", "joy", "frustrating", "life-changing", "heartbreaking",
        "unbelievable", "stunning", "powerful", "beautiful", "painful", "delight", "truth"];

    /* Title templates per language. English has richer variety; other languages
       provide one solid template per category (still fully category-aware and
       keyword-driven, not machine translated on the fly). */
    var TEMPLATES = {
        en: {
            question: ["What Is {Kw}? A Complete Guide", "Why Does {Kw} Matter in {Year}?", "How Does {Kw} Actually Work?", "Is {Kw} Worth It in {Year}?"],
            howto: ["How to {Kw} in {Year}: Step-by-Step Guide", "How to {Kw} Like a Pro", "How to Master {Kw} in Minutes", "How to Get Started With {Kw} Today"],
            ultimateGuide: ["The Ultimate Guide to {Kw}", "{Kw}: The Complete {Year} Guide", "Everything You Need to Know About {Kw}", "The Definitive {Kw} Guide for {Audience}"],
            beginner: ["{Kw} for Beginners: Where to Start", "A Beginner's Guide to {Kw}", "{Kw} 101: The Basics Explained", "Getting Started With {Kw}: A Simple Guide"],
            expert: ["{Kw}: Expert Tips You Need to Know", "Pro Secrets to Mastering {Kw}", "Advanced {Kw} Strategies From Experts", "What Experts Wish You Knew About {Kw}"],
            numberList: ["10 Best {Kw} Tips for {Year}", "7 Reasons {Kw} Matters", "15 {Kw} Ideas You'll Love", "9 {Kw} Strategies That Actually Work"],
            comparison: ["{Kw} vs {Kw2}: Which Is Better?", "{Kw} Compared: Pros and Cons", "{Kw} or {Kw2}? Here's How to Choose", "{Kw} vs {Kw2}: A Side-by-Side Comparison"],
            review: ["{Kw} Review: Is It Worth Your Money?", "Honest {Kw} Review ({Year})", "{Kw} Review: Pros, Cons & Verdict", "We Tested {Kw} — Here's Our Review"],
            benefit: ["5 Benefits of {Kw} You Should Know", "Why {Kw} Can Transform Your Business", "How {Kw} Helps {Audience} Succeed", "The Real Benefits of {Kw} Explained"],
            mistake: ["7 {Kw} Mistakes to Avoid", "Common {Kw} Mistakes (and How to Fix Them)", "Stop Making These {Kw} Mistakes", "{Kw} Mistakes That Are Costing You"],
            checklist: ["The Ultimate {Kw} Checklist", "{Kw} Checklist: Everything You Need", "A Simple Checklist for {Kw} Success", "Your {Kw} Checklist for {Year}"],
            powerWord: ["The Proven {Kw} Strategy That Works", "Unlock the Secret to {Kw}", "The Essential Guide to {Kw}", "The Only {Kw} Guide You'll Ever Need"],
            emotional: ["Fall in Love With {Kw} All Over Again", "The Surprising Truth About {Kw}", "Why {Kw} Will Change Everything", "The {Kw} Journey That Changed My Mind"],
            curiosity: ["What Nobody Tells You About {Kw}", "The {Kw} Secret Experts Won't Share", "You Won't Believe What {Kw} Can Do", "The Hidden Side of {Kw} Revealed"],
            trending: ["{Kw} Trends to Watch in {Year}", "What's New in {Kw} for {Year}", "The Future of {Kw} in {Year}", "{Kw} in {Year}: What's Changing"],
            localSeo: ["Best {Kw} in {Country}", "{Kw} Near You: A {Country} Guide", "Top-Rated {Kw} Services in {Country}", "Find the Best {Kw} in {Country} Today"],
            product: ["{Biz} {Kw}: Features, Price & Details", "Meet {Kw} by {Biz}", "{Kw} — Built for {Audience}", "{Kw}: The Smarter Way to Get Results"],
            service: ["Professional {Kw} Services for {Audience}", "{Biz}: Trusted {Kw} Experts", "{Kw} Services That Deliver Results", "Reliable {Kw} Services You Can Trust"],
            evergreen: ["{Kw}: A Complete Overview", "Understanding {Kw}: A Practical Guide", "{Kw} Explained Simply", "{Kw}: What It Is and Why It Matters"],
            seasonal: ["Best {Kw} Deals This Season", "{Kw} Guide for {Year}", "Seasonal {Kw} Tips You Need Now", "{Kw}: Your {Year} Season Checklist"]
        },
        es: {
            question: ["¿Qué Es {Kw}? Guía Completa"], howto: ["Cómo Hacer {Kw} en {Year}: Guía Paso a Paso"],
            ultimateGuide: ["La Guía Definitiva de {Kw}"], beginner: ["{Kw} para Principiantes: Por Dónde Empezar"],
            expert: ["{Kw}: Consejos de Expertos"], numberList: ["10 Mejores Consejos de {Kw} para {Year}"],
            comparison: ["{Kw} vs {Kw2}: ¿Cuál Es Mejor?"], review: ["Reseña de {Kw}: ¿Vale la Pena?"],
            benefit: ["5 Beneficios de {Kw} Que Debes Conocer"], mistake: ["7 Errores Comunes de {Kw} (y Cómo Evitarlos)"],
            checklist: ["La Lista de Verificación Definitiva de {Kw}"], powerWord: ["La Estrategia Comprobada de {Kw}"],
            emotional: ["La Sorprendente Verdad Sobre {Kw}"], curiosity: ["Lo Que Nadie Te Dice Sobre {Kw}"],
            trending: ["Tendencias de {Kw} para {Year}"], localSeo: ["Mejor {Kw} en {Country}"],
            product: ["{Kw} de {Biz}: Características y Precio"], service: ["Servicios Profesionales de {Kw}"],
            evergreen: ["{Kw}: Una Guía Práctica"], seasonal: ["Mejores Ofertas de {Kw} de la Temporada"]
        },
        fr: {
            question: ["Qu'est-ce Que {Kw} ? Le Guide Complet"], howto: ["Comment Faire {Kw} en {Year} : Guide Étape par Étape"],
            ultimateGuide: ["Le Guide Ultime de {Kw}"], beginner: ["{Kw} pour Débutants : Par Où Commencer"],
            expert: ["{Kw} : Conseils d'Experts"], numberList: ["10 Meilleurs Conseils {Kw} pour {Year}"],
            comparison: ["{Kw} vs {Kw2} : Lequel Choisir ?"], review: ["Avis {Kw} : Est-ce Que Ça Vaut le Coup ?"],
            benefit: ["5 Avantages de {Kw} à Connaître"], mistake: ["7 Erreurs Fréquentes Avec {Kw}"],
            checklist: ["La Checklist Ultime pour {Kw}"], powerWord: ["La Stratégie Éprouvée pour {Kw}"],
            emotional: ["La Vérité Surprenante Sur {Kw}"], curiosity: ["Ce Que Personne Ne Vous Dit Sur {Kw}"],
            trending: ["Tendances {Kw} à Suivre en {Year}"], localSeo: ["Meilleur {Kw} à {Country}"],
            product: ["{Kw} par {Biz} : Fonctionnalités et Prix"], service: ["Services Professionnels de {Kw}"],
            evergreen: ["{Kw} : Un Guide Pratique"], seasonal: ["Meilleures Offres {Kw} de la Saison"]
        },
        de: {
            question: ["Was Ist {Kw}? Der Komplette Leitfaden"], howto: ["Wie Man {Kw} in {Year} Macht: Schritt-für-Schritt"],
            ultimateGuide: ["Der Ultimative Leitfaden Für {Kw}"], beginner: ["{Kw} Für Anfänger: Der Einstieg"],
            expert: ["{Kw}: Expertentipps, Die Du Kennen Solltest"], numberList: ["10 Beste {Kw} Tipps Für {Year}"],
            comparison: ["{Kw} vs {Kw2}: Was Ist Besser?"], review: ["{Kw} Test: Lohnt Sich Das?"],
            benefit: ["5 Vorteile von {Kw}, Die Du Kennen Solltest"], mistake: ["7 Häufige {Kw} Fehler (Und Wie Man Sie Vermeidet)"],
            checklist: ["Die Ultimative {Kw} Checkliste"], powerWord: ["Die Bewährte {Kw} Strategie"],
            emotional: ["Die Überraschende Wahrheit Über {Kw}"], curiosity: ["Was Dir Niemand Über {Kw} Erzählt"],
            trending: ["{Kw} Trends Für {Year}"], localSeo: ["Bestes {Kw} In {Country}"],
            product: ["{Kw} Von {Biz}: Funktionen Und Preis"], service: ["Professionelle {Kw} Dienstleistungen"],
            evergreen: ["{Kw}: Ein Praktischer Überblick"], seasonal: ["Beste {Kw} Angebote Dieser Saison"]
        },
        pt: {
            question: ["O Que É {Kw}? Guia Completo"], howto: ["Como Fazer {Kw} em {Year}: Guia Passo a Passo"],
            ultimateGuide: ["O Guia Definitivo de {Kw}"], beginner: ["{Kw} para Iniciantes: Por Onde Começar"],
            expert: ["{Kw}: Dicas de Especialistas"], numberList: ["10 Melhores Dicas de {Kw} para {Year}"],
            comparison: ["{Kw} vs {Kw2}: Qual É Melhor?"], review: ["Análise de {Kw}: Vale a Pena?"],
            benefit: ["5 Benefícios de {Kw} Que Você Deve Conhecer"], mistake: ["7 Erros Comuns em {Kw} (e Como Evitá-los)"],
            checklist: ["A Checklist Definitiva de {Kw}"], powerWord: ["A Estratégia Comprovada de {Kw}"],
            emotional: ["A Verdade Surpreendente Sobre {Kw}"], curiosity: ["O Que Ninguém Te Conta Sobre {Kw}"],
            trending: ["Tendências de {Kw} para {Year}"], localSeo: ["Melhor {Kw} em {Country}"],
            product: ["{Kw} da {Biz}: Recursos e Preço"], service: ["Serviços Profissionais de {Kw}"],
            evergreen: ["{Kw}: Uma Visão Geral Prática"], seasonal: ["Melhores Ofertas de {Kw} da Temporada"]
        },
        it: {
            question: ["Cos'è {Kw}? Guida Completa"], howto: ["Come Fare {Kw} nel {Year}: Guida Passo Passo"],
            ultimateGuide: ["La Guida Definitiva a {Kw}"], beginner: ["{Kw} per Principianti: Da Dove Iniziare"],
            expert: ["{Kw}: Consigli degli Esperti"], numberList: ["10 Migliori Consigli su {Kw} per il {Year}"],
            comparison: ["{Kw} vs {Kw2}: Qual È Meglio?"], review: ["Recensione di {Kw}: Ne Vale la Pena?"],
            benefit: ["5 Vantaggi di {Kw} da Conoscere"], mistake: ["7 Errori Comuni con {Kw}"],
            checklist: ["La Checklist Definitiva per {Kw}"], powerWord: ["La Strategia Comprovata per {Kw}"],
            emotional: ["La Sorprendente Verità su {Kw}"], curiosity: ["Quello Che Nessuno Ti Dice su {Kw}"],
            trending: ["Tendenze {Kw} da Seguire nel {Year}"], localSeo: ["Miglior {Kw} a {Country}"],
            product: ["{Kw} di {Biz}: Caratteristiche e Prezzo"], service: ["Servizi Professionali di {Kw}"],
            evergreen: ["{Kw}: Una Panoramica Pratica"], seasonal: ["Migliori Offerte {Kw} della Stagione"]
        },
        hi: {
            question: ["{Kw} क्या है? पूरी जानकारी"], howto: ["{Kw} कैसे करें: {Year} की पूरी गाइड"],
            ultimateGuide: ["{Kw} की संपूर्ण गाइड"], beginner: ["शुरुआती लोगों के लिए {Kw} गाइड"],
            expert: ["{Kw}: विशेषज्ञों की सलाह"], numberList: ["{Year} के लिए {Kw} के 10 बेहतरीन टिप्स"],
            comparison: ["{Kw} बनाम {Kw2}: कौन बेहतर है?"], review: ["{Kw} समीक्षा: क्या यह पैसे के लायक है?"],
            benefit: ["{Kw} के 5 फायदे जो आपको जानने चाहिए"], mistake: ["{Kw} की 7 आम गलतियाँ और उनसे कैसे बचें"],
            checklist: ["{Kw} की संपूर्ण चेकलिस्ट"], powerWord: ["{Kw} की आजमाई हुई रणनीति"],
            emotional: ["{Kw} के बारे में चौंकाने वाला सच"], curiosity: ["{Kw} के बारे में कोई आपको नहीं बताता"],
            trending: ["{Year} में {Kw} के ट्रेंड्स"], localSeo: ["{Country} में सबसे अच्छा {Kw}"],
            product: ["{Biz} का {Kw}: फीचर्स और कीमत"], service: ["पेशेवर {Kw} सेवाएं"],
            evergreen: ["{Kw}: एक सरल और व्यावहारिक गाइड"], seasonal: ["इस सीज़न के बेहतरीन {Kw} ऑफर्स"]
        },
        ar: {
            question: ["ما هو {Kw}؟ الدليل الكامل"], howto: ["كيفية {Kw} في {Year}: دليل خطوة بخطوة"],
            ultimateGuide: ["الدليل الشامل لـ {Kw}"], beginner: ["{Kw} للمبتدئين: من أين تبدأ"],
            expert: ["{Kw}: نصائح من الخبراء"], numberList: ["أفضل 10 نصائح حول {Kw} لعام {Year}"],
            comparison: ["{Kw} مقابل {Kw2}: أيهما أفضل؟"], review: ["مراجعة {Kw}: هل يستحق الأمر؟"],
            benefit: ["5 فوائد لـ {Kw} يجب أن تعرفها"], mistake: ["7 أخطاء شائعة في {Kw} وكيفية تجنبها"],
            checklist: ["قائمة التحقق الشاملة لـ {Kw}"], powerWord: ["الاستراتيجية المثبتة لـ {Kw}"],
            emotional: ["الحقيقة المفاجئة حول {Kw}"], curiosity: ["ما لا يخبرك به أحد عن {Kw}"],
            trending: ["اتجاهات {Kw} لعام {Year}"], localSeo: ["أفضل {Kw} في {Country}"],
            product: ["{Kw} من {Biz}: المميزات والسعر"], service: ["خدمات {Kw} احترافية"],
            evergreen: ["{Kw}: نظرة عامة عملية"], seasonal: ["أفضل عروض {Kw} لهذا الموسم"]
        },
        ja: {
            question: ["{Kw}とは？完全ガイド"], howto: ["{Kw}のやり方：{Year}年版ステップガイド"],
            ultimateGuide: ["{Kw}の完全ガイド"], beginner: ["初心者のための{Kw}入門"],
            expert: ["{Kw}：専門家が教えるコツ"], numberList: ["{Year}年版 {Kw}のおすすめ10選"],
            comparison: ["{Kw} vs {Kw2}：どちらが良い？"], review: ["{Kw}レビュー：本当に使う価値はある？"],
            benefit: ["{Kw}の5つのメリットとは"], mistake: ["{Kw}でよくある7つの失敗と対策"],
            checklist: ["{Kw}完全チェックリスト"], powerWord: ["実証済みの{Kw}戦略"],
            emotional: ["{Kw}にまつわる意外な真実"], curiosity: ["誰も教えてくれない{Kw}の真実"],
            trending: ["{Year}年の{Kw}トレンド"], localSeo: ["{Country}で人気の{Kw}"],
            product: ["{Biz}の{Kw}：機能と価格"], service: ["プロの{Kw}サービス"],
            evergreen: ["{Kw}をわかりやすく解説"], seasonal: ["今シーズンの{Kw}おすすめ情報"]
        },
        zh: {
            question: ["什么是{Kw}？完整指南"], howto: ["如何在{Year}年做好{Kw}：分步指南"],
            ultimateGuide: ["{Kw}终极指南"], beginner: ["{Kw}入门指南：从这里开始"],
            expert: ["{Kw}：专家建议"], numberList: ["{Year}年{Kw}十大技巧"],
            comparison: ["{Kw}与{Kw2}：哪个更好？"], review: ["{Kw}评测：值得购买吗？"],
            benefit: ["{Kw}的5大好处"], mistake: ["{Kw}常见的7个错误及避免方法"],
            checklist: ["{Kw}完整清单"], powerWord: ["经过验证的{Kw}策略"],
            emotional: ["关于{Kw}令人惊讶的真相"], curiosity: ["没人告诉你的{Kw}秘密"],
            trending: ["{Year}年{Kw}趋势"], localSeo: ["{Country}最好的{Kw}"],
            product: ["{Biz}的{Kw}：功能与价格"], service: ["专业{Kw}服务"],
            evergreen: ["{Kw}实用指南"], seasonal: ["本季{Kw}优惠推荐"]
        }
    };

    /* ---------- small utilities ---------- */

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function uid() { return "ti_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function classForScore(score) {
        if (score >= 75) return "high";
        if (score >= 50) return "mid";
        return "low";
    }

    var SMALL_WORDS_EN = { a: 1, an: 1, the: 1, and: 1, or: 1, but: 1, for: 1, nor: 1, in: 1, on: 1, at: 1, to: 1, of: 1, by: 1, with: 1, as: 1 };
    function titleCaseEn(str) {
        var words = str.split(/\s+/);
        return words.map(function (w, i) {
            var lower = w.toLowerCase();
            if (i !== 0 && i !== words.length - 1 && SMALL_WORDS_EN[lower]) return lower;
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        }).join(" ");
    }
    function capFirst(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    function formatKeyword(kw, lang) {
        kw = (kw || "").trim();
        if (!kw) return "";
        if (lang === "en") return titleCaseEn(kw);
        if (lang === "ar" || lang === "ja" || lang === "zh" || lang === "hi") return kw;
        return capFirst(kw);
    }

    function slugify(s) {
        return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "page";
    }

    function downloadBlob(content, filename, mime) {
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }
    function csvEscape(v) {
        var s = String(v);
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
    }

    function formatWhen(iso) {
        try {
            var d = new Date(iso);
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        } catch (e) { return ""; }
    }

    function getList(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
    function setList(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { } }

    /* ---------- pixel width estimate (Arial-ish, ~16px) ---------- */
    var NARROW_CHARS = "iIl.,:;'|!".split("");
    var WIDE_CHARS = "mMWw@".split("");
    function estimatePixelWidth(text) {
        var w = 0;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (ch === " ") w += 4.5;
            else if (NARROW_CHARS.indexOf(ch) !== -1) w += 4;
            else if (WIDE_CHARS.indexOf(ch) !== -1) w += 12;
            else if (/[A-Z]/.test(ch)) w += 9.5;
            else if (/[0-9]/.test(ch)) w += 8.5;
            else if (/[a-z]/.test(ch)) w += 7.5;
            else w += 8;
        }
        return Math.round(w);
    }

    /* ---------- generation engine ---------- */

    function buildContext(settings, lang) {
        return {
            Kw: formatKeyword(settings.kwPrimary, lang),
            Kw2: formatKeyword(settings.kwSecondary, lang),
            Biz: (settings.bizName || "").trim(),
            Audience: (settings.targetAudience || "").trim() || (lang === "en" ? "Everyone" : formatKeyword(settings.kwPrimary, lang)),
            Year: String(new Date().getFullYear()),
            Country: (settings.country || "").trim() || (lang === "en" ? "Your Area" : "")
        };
    }

    function templateNeeds(tpl, token) { return tpl.indexOf("{" + token + "}") !== -1; }

    function pickTemplates(bank, hasKw2, hasBiz) {
        return (bank || []).filter(function (tpl) {
            if (templateNeeds(tpl, "Kw2") && !hasKw2) return false;
            if (templateNeeds(tpl, "Biz") && !hasBiz) return false;
            return true;
        });
    }

    function renderTemplate(tpl, ctx) {
        return tpl.replace(/\{(\w+)\}/g, function (_, key) { return ctx[key] !== undefined ? ctx[key] : ""; })
            .replace(/\s{2,}/g, " ").trim();
    }

    function applyToneModifier(text, tone, lang) {
        if (lang !== "en") return text;
        var suffixes = TONE_FLAVOR[tone];
        if (!suffixes || !suffixes.length) return text;
        if (Math.random() < 0.3) text = text + suffixes[Math.floor(Math.random() * suffixes.length)];
        return text;
    }

    function fitToLength(text, maxLen) {
        maxLen = parseInt(maxLen, 10) || 60;
        if (text.length <= maxLen) return text;
        var cut = text.slice(0, maxLen);
        var lastSpace = cut.lastIndexOf(" ");
        if (lastSpace > maxLen * 0.5) cut = cut.slice(0, lastSpace);
        return cut.replace(/[\s,.;:\-–—]+$/, "").trim();
    }

    function weightedCategoryOrder(settings) {
        var weights = {};
        CATEGORY_ORDER.forEach(function (c) { weights[c] = 1; });
        var iw = INTENT_WEIGHTS[settings.searchIntent] || {};
        Object.keys(iw).forEach(function (k) { weights[k] = (weights[k] || 1) + iw[k]; });
        var cw = CONTENTTYPE_WEIGHTS[settings.contentType] || {};
        Object.keys(cw).forEach(function (k) { weights[k] = (weights[k] || 1) + cw[k]; });

        var order = [];
        CATEGORY_ORDER.forEach(function (c) {
            var n = weights[c] || 1;
            for (var i = 0; i < n; i++) order.push(c);
        });
        for (var i = order.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }
        return order;
    }

    function generateTitles(settings, excludeSet) {
        var lang = TEMPLATES[settings.language] ? settings.language : "en";
        var bank = TEMPLATES[lang];
        var ctx = buildContext(settings, lang);
        var hasKw2 = !!(settings.kwSecondary && settings.kwSecondary.trim());
        var hasBiz = !!(settings.bizName && settings.bizName.trim());
        var order = weightedCategoryOrder(settings);

        var results = [];
        var seen = excludeSet || {};
        var attempts = 0;
        var maxAttempts = settings.numSuggestions * 25 + 150;
        var idx = 0;

        while (results.length < settings.numSuggestions && attempts < maxAttempts) {
            attempts++;
            var cat = order[idx % order.length];
            idx++;
            var pool = pickTemplates(bank[cat], hasKw2, hasBiz);
            if (!pool.length) continue;
            var tpl = pool[Math.floor(Math.random() * pool.length)];
            var raw = renderTemplate(tpl, ctx);
            if (!raw) continue;
            raw = applyToneModifier(raw, settings.tone, lang);
            raw = fitToLength(raw, settings.maxLength);
            var key = raw.toLowerCase();
            if (seen[key]) continue;
            seen[key] = true;
            results.push({ id: uid(), text: raw, category: cat, tone: settings.tone });
        }
        return results;
    }

    /* ---------- scoring engine ---------- */

    function countMatches(lower, list) {
        var n = 0;
        list.forEach(function (w) { if (lower.indexOf(w) !== -1) n++; });
        return n;
    }

    function scoreTitle(item, settings) {
        var text = item.text;
        var lower = text.toLowerCase();
        var maxLen = parseInt(settings.maxLength, 10) || 60;
        var charCount = text.length;
        var pixelWidth = estimatePixelWidth(text);
        var kwLower = (settings.kwPrimary || "").toLowerCase().trim();
        var kw2Lower = (settings.kwSecondary || "").toLowerCase().trim();
        var keywordPresent = !!kwLower && lower.indexOf(kwLower) !== -1;
        var keywordPosition = keywordPresent ? lower.indexOf(kwLower) : -1;
        var keywordEarly = keywordPresent && keywordPosition <= Math.floor(text.length * 0.4);
        var secondaryPresent = !!kw2Lower && lower.indexOf(kw2Lower) !== -1;
        var hasNumber = /\d/.test(text);
        var powerWordCount = countMatches(lower, POWER_WORDS);
        var emotionalWordCount = countMatches(lower, EMOTIONAL_WORDS);
        var wordCount = text.split(/\s+/).filter(Boolean).length;
        var avgWordLen = wordCount ? (text.replace(/\s+/g, "").length / wordCount) : 0;

        var readability = 70;
        readability += (wordCount >= 5 && wordCount <= 12) ? 20 : -10;
        readability += (avgWordLen <= 6.5) ? 10 : -10;
        readability = clamp(readability, 0, 100);

        var lengthOk = charCount <= maxLen && charCount >= Math.max(20, maxLen * 0.55);
        var googleFriendly = charCount <= 60;
        var mobileFriendly = charCount <= 50 && pixelWidth <= 460;

        var seoScore = 0;
        seoScore += keywordPresent ? 30 : 0;
        seoScore += keywordEarly ? 10 : 0;
        seoScore += lengthOk ? 20 : (charCount <= maxLen ? 10 : 0);
        seoScore += powerWordCount > 0 ? 12 : 0;
        seoScore += emotionalWordCount > 0 ? 8 : 0;
        seoScore += hasNumber ? 8 : 0;
        seoScore += readability >= 70 ? 12 : 6;
        seoScore = clamp(Math.round(seoScore), 0, 100);

        var ctrScore = 0;
        ctrScore += hasNumber ? 18 : 0;
        ctrScore += powerWordCount > 0 ? 18 : 0;
        ctrScore += emotionalWordCount > 0 ? 16 : 0;
        ctrScore += /\?/.test(text) ? 12 : 0;
        ctrScore += keywordEarly ? 12 : 6;
        ctrScore += googleFriendly ? 14 : 4;
        ctrScore += (item.category === "curiosity" || item.category === "question") ? 10 : 0;
        ctrScore = clamp(Math.round(ctrScore), 0, 100);

        var tips = [];
        if (charCount > maxLen) tips.push("Title is too long for your selected limit — trim it down.");
        else if (charCount < maxLen * 0.5) tips.push("Title is quite short — consider adding more detail.");
        if (!keywordPresent) tips.push("Primary keyword is missing from this title.");
        if (!hasNumber && item.category !== "evergreen") tips.push("Try adding a number to boost CTR.");
        if (emotionalWordCount === 0) tips.push("Add an emotional word to increase engagement.");
        if (powerWordCount === 0) tips.push('Add a power word like "Proven" or "Essential".');
        if (!googleFriendly) tips.push("This may get truncated in Google search results.");

        return {
            charCount: charCount, pixelWidth: pixelWidth, seoScore: seoScore, ctrScore: ctrScore,
            readability: readability, keywordPresent: keywordPresent, secondaryPresent: secondaryPresent,
            powerWordCount: powerWordCount, emotionalWordCount: emotionalWordCount, hasNumber: hasNumber,
            googleFriendly: googleFriendly, mobileFriendly: mobileFriendly, tips: tips
        };
    }

    /* ---------- state ---------- */

    var currentResults = []; // [{item, scored}]
    var currentSettings = null;

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("sgToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
    }

    /* ---------- results rendering ---------- */

    function isFavorited(text) {
        return getList("sgFavorites").some(function (f) { return f.text === text; });
    }

    function cardHTML(item, scored, isFav) {
        var catLabel = CATEGORY_LABELS[item.category] || item.category;
        var chips = '<span class="sg-chip category">' + esc(catLabel) + "</span>";
        chips += '<span class="sg-chip ' + (scored.keywordPresent ? "good" : "bad") + '">' + (scored.keywordPresent ? "✓ Keyword Found" : "✕ No Keyword") + "</span>";
        chips += '<span class="sg-chip ' + (scored.googleFriendly ? "good" : "warn") + '">' + (scored.googleFriendly ? "✓ Google SERP Safe" : "⚠ May Truncate") + "</span>";
        chips += '<span class="sg-chip ' + (scored.mobileFriendly ? "good" : "warn") + '">' + (scored.mobileFriendly ? "✓ Mobile Friendly" : "⚠ Long on Mobile") + "</span>";
        if (scored.hasNumber) chips += '<span class="sg-chip good">✓ Has Number</span>';

        var scores =
            '<div class="sg-score ' + classForScore(scored.seoScore) + '"><span>SEO Score</span><strong>' + scored.seoScore + "</strong></div>" +
            '<div class="sg-score ' + classForScore(scored.ctrScore) + '"><span>CTR Score</span><strong>' + scored.ctrScore + "</strong></div>" +
            '<div class="sg-score ' + classForScore(scored.readability) + '"><span>Readability</span><strong>' + scored.readability + "</strong></div>" +
            '<div class="sg-score"><span>Chars</span><strong>' + scored.charCount + "</strong></div>";

        var tip = scored.tips.length ? '<div class="sg-title-tip">💡 ' + esc(scored.tips[0]) + "</div>" : "";

        return (
            '<div class="sg-title-card' + (isFav ? " is-favorite" : "") + '" data-id="' + item.id + '">' +
            '<div class="sg-title-text">' + esc(item.text) + "</div>" +
            '<div class="sg-title-meta">' + chips + "</div>" +
            '<div class="sg-score-row">' + scores + "</div>" +
            tip +
            '<div class="sg-title-actions">' +
            '<button type="button" class="sg-btn sg-btn-sm" data-act="copy">Copy</button>' +
            '<button type="button" class="sg-btn sg-btn-sm sg-fav-btn' + (isFav ? " active" : "") + '" data-act="fav">' + (isFav ? "★ Favorited" : "☆ Favorite") + "</button>" +
            '<button type="button" class="sg-btn sg-btn-sm" data-act="regen">↻ Regenerate</button>' +
            '<button type="button" class="sg-btn sg-btn-sm" data-act="preview">Preview</button>' +
            '<button type="button" class="sg-btn sg-btn-sm sg-btn-danger" data-act="delete" aria-label="Delete this title">✕</button>' +
            "</div></div>"
        );
    }

    function renderAll() {
        var grid = $("resultsGrid");
        grid.innerHTML = currentResults.map(function (r) { return cardHTML(r.item, r.scored, isFavorited(r.item.text)); }).join("");
        $("resultsCount").textContent = currentResults.length ? (currentResults.length + " titles generated") : "";
        $("resultsSection").hidden = currentResults.length === 0;
    }

    function buildMetaSnippet(settings) {
        var kw = settings.kwPrimary || "this topic";
        return "Learn everything about " + kw + ". Explore tips, guides, and expert insights to help you get the best results — updated for " + new Date().getFullYear() + ".";
    }

    function showSerp(result) {
        var settings = currentSettings || {};
        var url = (settings.bizName ? slugify(settings.bizName) : "yourwebsite") + ".com";
        var path = settings.kwPrimary ? " › " + slugify(settings.kwPrimary) : "";
        $("serpUrl").textContent = url + path;
        $("serpTitle").textContent = result.item.text;
        $("serpDesc").textContent = buildMetaSnippet(settings);
        $("serpHint").textContent = 'Previewing: "' + result.item.text + '"';
    }

    /* ---------- history / favorites / copied ---------- */

    function copyTitle(text) {
        function done() {
            var list = getList("sgRecentlyCopied");
            list.unshift({ text: text, at: new Date().toISOString() });
            setList("sgRecentlyCopied", list.slice(0, 30));
            renderHistoryLists();
            showToast("Copied to clipboard.");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { showToast("Could not copy — please copy manually."); });
        } else {
            window.prompt("Copy this title:", text);
            done();
        }
    }

    function toggleFavorite(item) {
        var list = getList("sgFavorites");
        var idx = -1;
        list.forEach(function (f, i) { if (f.text === item.text) idx = i; });
        if (idx > -1) { list.splice(idx, 1); showToast("Removed from favorites."); }
        else { list.unshift({ text: item.text, category: item.category, at: new Date().toISOString() }); showToast("Added to favorites."); }
        setList("sgFavorites", list);
        renderAll();
        renderHistoryLists();
    }

    function saveRecentSearch(settings) {
        var list = getList("sgRecentSearches");
        list.unshift({
            kwPrimary: settings.kwPrimary, kwSecondary: settings.kwSecondary, contentType: settings.contentType,
            tone: settings.tone, language: settings.language, at: new Date().toISOString()
        });
        setList("sgRecentSearches", list.slice(0, 20));
        renderHistoryLists();
    }

    function applyRecentSearch(entry) {
        $("kwPrimary").value = entry.kwPrimary || "";
        $("kwSecondary").value = entry.kwSecondary || "";
        if (entry.contentType) $("contentType").value = entry.contentType;
        if (entry.tone) $("sgTone").value = entry.tone;
        if (entry.language) $("sgLanguage").value = entry.language;
        $("sgForm").dispatchEvent(new Event("submit", { cancelable: true }));
        window.scrollTo({ top: $("sgForm").offsetTop - 20, behavior: "smooth" });
    }

    function renderHistoryUl(ulId, list, mapFn) {
        var ul = $(ulId);
        ul.innerHTML = list.map(function (entry, idx) {
            var row = mapFn(entry, idx);
            return '<li><div class="sg-history-info"><strong>' + esc(row.title) + "</strong><span>" + esc(row.meta) + "</span></div>" +
                '<div class="sg-history-actions">' +
                '<button type="button" class="sg-btn sg-btn-sm" data-role="use">' + esc(row.useLabel || "Use") + "</button>" +
                '<button type="button" class="sg-btn sg-btn-sm sg-btn-danger" data-role="del">Delete</button>' +
                "</div></li>";
        }).join("");
        Array.prototype.forEach.call(ul.querySelectorAll("li"), function (li, idx) {
            var row = mapFn(list[idx], idx);
            li.querySelector('[data-role="use"]').addEventListener("click", row.onUse);
            li.querySelector('[data-role="del"]').addEventListener("click", row.onDelete);
        });
    }

    function renderHistoryLists() {
        var recent = getList("sgRecentSearches");
        var favs = getList("sgFavorites");
        var copied = getList("sgRecentlyCopied");

        renderHistoryUl("recentSearchesList", recent, function (entry, idx) {
            return {
                title: entry.kwPrimary + (entry.kwSecondary ? " / " + entry.kwSecondary : ""),
                meta: (CONTENT_TYPE_LABELS[entry.contentType] || entry.contentType || "") + " · " + (entry.tone || "") + " · " + formatWhen(entry.at),
                useLabel: "Use", onUse: function () { applyRecentSearch(entry); },
                onDelete: function () { var l = getList("sgRecentSearches"); l.splice(idx, 1); setList("sgRecentSearches", l); renderHistoryLists(); }
            };
        });
        renderHistoryUl("favoritesList", favs, function (entry, idx) {
            return {
                title: entry.text, meta: (CATEGORY_LABELS[entry.category] || entry.category) + " · " + formatWhen(entry.at),
                useLabel: "Copy", onUse: function () { copyTitle(entry.text); },
                onDelete: function () { var l = getList("sgFavorites"); l.splice(idx, 1); setList("sgFavorites", l); renderHistoryLists(); renderAll(); }
            };
        });
        renderHistoryUl("copiedList", copied, function (entry, idx) {
            return {
                title: entry.text, meta: formatWhen(entry.at),
                useLabel: "Copy Again", onUse: function () { copyTitle(entry.text); },
                onDelete: function () { var l = getList("sgRecentlyCopied"); l.splice(idx, 1); setList("sgRecentlyCopied", l); renderHistoryLists(); }
            };
        });
        updateHistoryEmptyState();
    }

    function updateHistoryEmptyState() {
        var activeTab = document.querySelector(".sg-tab.active");
        if (!activeTab) return;
        var mapId = { recent: "recentSearchesList", favorites: "favoritesList", copied: "copiedList" }[activeTab.getAttribute("data-tab")];
        var ul = $(mapId);
        $("historyEmpty").hidden = ul.children.length > 0;
    }

    /* ---------- session persistence ---------- */

    function persistLastSession() {
        try {
            localStorage.setItem("sgLastSession", JSON.stringify({
                settings: currentSettings, results: currentResults.map(function (r) { return r.item; })
            }));
        } catch (e) { }
    }

    function applySettingsToForm(settings) {
        if (!settings) return;
        $("kwPrimary").value = settings.kwPrimary || "";
        $("kwSecondary").value = settings.kwSecondary || "";
        $("bizName").value = settings.bizName || "";
        $("targetAudience").value = settings.targetAudience || "";
        if (settings.contentType) $("contentType").value = settings.contentType;
        if (settings.language) $("sgLanguage").value = settings.language;
        if (settings.country !== undefined) $("sgCountry").value = settings.country;
        if (settings.tone) $("sgTone").value = settings.tone;
        if (settings.searchIntent) $("searchIntent").value = settings.searchIntent;
        if (settings.numSuggestions) $("numSuggestions").value = String(settings.numSuggestions);
    }

    function restoreLastSession() {
        try {
            var raw = localStorage.getItem("sgLastSession");
            if (!raw) return;
            var data = JSON.parse(raw);
            if (!data || !data.results || !data.results.length) return;
            currentSettings = data.settings;
            currentResults = data.results.map(function (item) { return { item: item, scored: scoreTitle(item, data.settings) }; });
            applySettingsToForm(data.settings);
            renderAll();
            if (currentResults.length) showSerp(currentResults[0]);
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
        var maxLenSel = $("maxLength").value;
        var maxLength = maxLenSel === "custom" ? (parseInt($("maxLengthCustom").value, 10) || 60) : parseInt(maxLenSel, 10);
        return {
            kwPrimary: $("kwPrimary").value.trim(), kwSecondary: $("kwSecondary").value.trim(),
            bizName: $("bizName").value.trim(), targetAudience: $("targetAudience").value.trim(),
            contentType: $("contentType").value, language: $("sgLanguage").value, country: $("sgCountry").value,
            tone: $("sgTone").value, searchIntent: $("searchIntent").value, maxLength: maxLength,
            numSuggestions: parseInt($("numSuggestions").value, 10)
        };
    }

    /* ---------- init ---------- */

    populateSelect("contentType", CONTENT_TYPES);
    $("contentType").value = "blog-post";
    populateSelect("sgTone", TONES);
    $("sgTone").value = "professional";
    populateSelect("sgLanguage", LANGUAGES);
    $("sgLanguage").value = "en";
    populateSelect("sgCountry", COUNTRIES);
    $("sgCountry").value = "";

    $("maxLength").addEventListener("change", function () {
        $("maxLengthCustomField").hidden = this.value !== "custom";
    });

    $("btnHeroCta").addEventListener("click", function () {
        $("sgForm").scrollIntoView({ behavior: "smooth", block: "start" });
        $("kwPrimary").focus();
    });

    $("sgForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var kw = $("kwPrimary").value.trim();
        var errEl = $("errKwPrimary");
        if (!kw) { errEl.textContent = "Primary keyword is required."; $("kwPrimary").focus(); return; }
        errEl.textContent = "";

        var settings = collectSettings();
        currentSettings = settings;
        var fresh = generateTitles(settings, {});
        currentResults = fresh.map(function (item) { return { item: item, scored: scoreTitle(item, settings) }; });
        renderAll();
        if (currentResults.length) showSerp(currentResults[0]);
        showToast(currentResults.length < settings.numSuggestions
            ? ("Generated " + currentResults.length + " unique titles for this mix — try a secondary keyword for more variety.")
            : (currentResults.length + " titles generated!"));
        saveRecentSearch(settings);
        persistLastSession();
        $("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("btnClearForm").addEventListener("click", function () {
        $("sgForm").reset();
        $("contentType").value = "blog-post";
        $("sgTone").value = "professional";
        $("sgLanguage").value = "en";
        $("sgCountry").value = "";
        $("searchIntent").value = "informational";
        $("maxLength").value = "60";
        $("maxLengthCustomField").hidden = true;
        $("numSuggestions").value = "10";
        $("errKwPrimary").textContent = "";
        $("kwPrimary").focus();
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
        if (act === "copy") copyTitle(currentResults[idx].item.text);
        else if (act === "fav") toggleFavorite(currentResults[idx].item);
        else if (act === "preview") showSerp(currentResults[idx]);
        else if (act === "delete") { currentResults.splice(idx, 1); renderAll(); persistLastSession(); }
        else if (act === "regen") {
            var excludeSet = {};
            currentResults.forEach(function (r) { excludeSet[r.item.text.toLowerCase()] = true; });
            var fresh = generateTitles(Object.assign({}, currentSettings, { numSuggestions: 1 }), excludeSet);
            if (fresh.length) {
                currentResults[idx] = { item: fresh[0], scored: scoreTitle(fresh[0], currentSettings) };
                renderAll();
                persistLastSession();
                showToast("Title regenerated.");
            } else {
                showToast("Could not generate a new unique title — try different settings.");
            }
        }
    });

    /* bulk actions */
    $("btnCopyAll").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to copy yet."); return; }
        var text = currentResults.map(function (r) { return r.item.text; }).join("\n");
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { showToast("All titles copied."); });
    });
    $("btnDownloadTxt").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to export yet."); return; }
        downloadBlob(currentResults.map(function (r) { return r.item.text; }).join("\n"), "seo-titles.txt", "text/plain");
    });
    $("btnDownloadCsv").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to export yet."); return; }
        var rows = [["Title", "Category", "Characters", "SEO Score", "CTR Score", "Readability"]];
        currentResults.forEach(function (r) {
            rows.push([r.item.text, CATEGORY_LABELS[r.item.category] || r.item.category, r.scored.charCount, r.scored.seoScore, r.scored.ctrScore, r.scored.readability]);
        });
        downloadBlob(rows.map(function (row) { return row.map(csvEscape).join(","); }).join("\n"), "seo-titles.csv", "text/csv");
    });
    $("btnDownloadPdf").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to export yet."); return; }
        window.print();
    });
    $("btnPrintResults").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to print yet."); return; }
        window.print();
    });
    $("btnShareResults").addEventListener("click", function () {
        if (!currentResults.length) { showToast("Nothing to share yet."); return; }
        var text = currentResults.slice(0, 10).map(function (r) { return r.item.text; }).join("\n");
        if (navigator.share) navigator.share({ title: "SEO Title Suggestions", text: text }).catch(function () { });
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { showToast("Sharing isn't supported here — titles copied instead."); });
    });
    $("btnGenerateMore").addEventListener("click", function () {
        if (!currentSettings) { showToast("Generate titles first."); return; }
        var excludeSet = {};
        currentResults.forEach(function (r) { excludeSet[r.item.text.toLowerCase()] = true; });
        var more = generateTitles(currentSettings, excludeSet);
        var added = more.map(function (item) { return { item: item, scored: scoreTitle(item, currentSettings) }; });
        currentResults = currentResults.concat(added);
        renderAll();
        persistLastSession();
        showToast(added.length ? (added.length + " more titles added.") : "No more unique titles available for this mix.");
    });
    $("btnClearResults").addEventListener("click", function () {
        if (!currentResults.length) return;
        if (!window.confirm("Clear all generated titles?")) return;
        currentResults = [];
        renderAll();
        persistLastSession();
        showToast("Results cleared.");
    });

    /* history tabs */
    var tabButtons = document.querySelectorAll(".sg-tab");
    Array.prototype.forEach.call(tabButtons, function (tab) {
        tab.addEventListener("click", function () {
            Array.prototype.forEach.call(tabButtons, function (t) { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
            tab.classList.add("active"); tab.setAttribute("aria-selected", "true");
            var target = tab.getAttribute("data-tab");
            var map = { recent: "recentSearchesList", favorites: "favoritesList", copied: "copiedList" };
            Object.keys(map).forEach(function (name) { $(map[name]).hidden = name !== target; });
            updateHistoryEmptyState();
        });
    });
    $("btnClearHistory").addEventListener("click", function () {
        if (!window.confirm("Clear all history — recent searches, favorites, and recently copied titles?")) return;
        localStorage.removeItem("sgRecentSearches");
        localStorage.removeItem("sgFavorites");
        localStorage.removeItem("sgRecentlyCopied");
        renderHistoryLists();
        renderAll();
        showToast("History cleared.");
    });
    $("btnExportHistory").addEventListener("click", function () {
        var data = { recentSearches: getList("sgRecentSearches"), favorites: getList("sgFavorites"), recentlyCopied: getList("sgRecentlyCopied") };
        downloadBlob(JSON.stringify(data, null, 2), "seo-title-history.json", "application/json");
    });

    renderHistoryLists();
    restoreLastSession();
})();
