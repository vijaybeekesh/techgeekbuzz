/* Invoice Generator — DOM-driven state, live calculation engine, print-ready
   preview, and PDF export (jsPDF + html2canvas render the preview panel).
   No data ever leaves the browser: everything is read from/written to the
   form and localStorage directly. */

(function () {
    "use strict";

    var DRAFT_KEY = "invoiceLastDraft";
    var COUNTER_KEY = "invoiceNumberCounter";
    var DEBOUNCE_MS = 250;

    var CURRENCIES = [
        ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"], ["INR", "Indian Rupee"],
        ["AED", "UAE Dirham"], ["AUD", "Australian Dollar"], ["CAD", "Canadian Dollar"], ["JPY", "Japanese Yen"],
        ["SAR", "Saudi Riyal"], ["SGD", "Singapore Dollar"], ["CHF", "Swiss Franc"], ["CNY", "Chinese Yuan"],
        ["HKD", "Hong Kong Dollar"], ["NZD", "New Zealand Dollar"], ["ZAR", "South African Rand"],
        ["SEK", "Swedish Krona"], ["NOK", "Norwegian Krone"], ["DKK", "Danish Krone"], ["PLN", "Polish Zloty"],
        ["THB", "Thai Baht"], ["MYR", "Malaysian Ringgit"], ["IDR", "Indonesian Rupiah"], ["PHP", "Philippine Peso"],
        ["VND", "Vietnamese Dong"], ["KRW", "South Korean Won"], ["TRY", "Turkish Lira"], ["RUB", "Russian Ruble"],
        ["BRL", "Brazilian Real"], ["MXN", "Mexican Peso"], ["EGP", "Egyptian Pound"], ["NGN", "Nigerian Naira"],
        ["KES", "Kenyan Shilling"], ["PKR", "Pakistani Rupee"], ["BDT", "Bangladeshi Taka"], ["LKR", "Sri Lankan Rupee"],
        ["QAR", "Qatari Riyal"], ["KWD", "Kuwaiti Dinar"], ["ILS", "Israeli New Shekel"], ["CZK", "Czech Koruna"],
        ["HUF", "Hungarian Forint"], ["RON", "Romanian Leu"]
    ];

    /* ---------- tiny utilities ---------- */

    function $(id) { return document.getElementById(id); }

    function esc(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function uid() { return "it_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function debounce(fn, wait) {
        var t;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    function todayISO() { return new Date().toISOString().slice(0, 10); }
    function addDaysISO(iso, days) {
        var d = new Date(iso + "T00:00:00");
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    }
    function formatDate(iso) {
        if (!iso) return "—";
        var d = new Date(iso + "T00:00:00");
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }

    function nextInvoiceNumber() {
        var year = new Date().getFullYear();
        var key = COUNTER_KEY + "_" + year;
        var n = parseInt(localStorage.getItem(key) || "0", 10) + 1;
        try { localStorage.setItem(key, String(n)); } catch (e) { }
        return "INV-" + year + "-" + String(n).padStart(4, "0");
    }

    /* ---------- currency formatting ---------- */

    var currencyMetaCache = {};
    function getCurrencyMeta(code) {
        if (currencyMetaCache[code]) return currencyMetaCache[code];
        var meta;
        try {
            var fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "symbol" });
            meta = { fractionDigits: fmt.resolvedOptions().maximumFractionDigits, formatter: fmt };
        } catch (e) {
            meta = { fractionDigits: 2, formatter: new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
        }
        currencyMetaCache[code] = meta;
        return meta;
    }
    function roundMoney(value, code) {
        var meta = getCurrencyMeta(code);
        var f = Math.pow(10, meta.fractionDigits);
        return Math.round((value + Number.EPSILON) * f) / f;
    }
    function formatMoney(value, code) {
        var meta = getCurrencyMeta(code);
        var v = isFinite(value) ? value : 0;
        try { return meta.formatter.format(v); } catch (e) { return code + " " + v.toFixed(2); }
    }

    /* ---------- toast ---------- */

    var toastTimer;
    function showToast(msg) {
        var t = $("invToast");
        t.textContent = msg;
        t.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
    }

    /* ---------- items table ---------- */

    var itemsBody = $("itemsBody");

    function blankItem() {
        return { id: uid(), name: "", description: "", qty: 1, price: 0, taxRate: 0, discountRate: 0 };
    }

    function rowTemplate(item) {
        return (
            '<tr class="inv-item-row" data-id="' + item.id + '">' +
            '<td>' +
            '<input type="text" data-field="name" placeholder="Item name" value="' + esc(item.name) + '" aria-label="Item name">' +
            '<input type="text" class="inv-item-desc" data-field="description" placeholder="Description (optional)" value="' + esc(item.description) + '" aria-label="Item description">' +
            "</td>" +
            '<td><input type="number" data-field="qty" min="0" step="1" value="' + item.qty + '" aria-label="Quantity"></td>' +
            '<td><input type="number" data-field="price" min="0" step="0.01" value="' + item.price + '" aria-label="Unit price"></td>' +
            '<td><input type="number" data-field="taxRate" min="0" max="100" step="0.01" value="' + item.taxRate + '" aria-label="Tax percent"></td>' +
            '<td><input type="number" data-field="discountRate" min="0" max="100" step="0.01" value="' + item.discountRate + '" aria-label="Discount percent"></td>' +
            '<td class="inv-amount-cell" data-role="amount">0.00</td>' +
            '<td><div class="inv-row-actions">' +
            '<button type="button" class="inv-btn inv-btn-icon" data-action="dup" title="Duplicate item" aria-label="Duplicate item">⧉</button>' +
            '<button type="button" class="inv-btn inv-btn-icon" data-action="del" title="Delete item" aria-label="Delete item">✕</button>' +
            "</div></td>" +
            "</tr>"
        );
    }

    function buildRowEl(item) {
        var tpl = document.createElement("template");
        tpl.innerHTML = rowTemplate(item).trim();
        return tpl.content.firstChild;
    }

    function setItemsToDOM(items) {
        itemsBody.innerHTML = "";
        items.forEach(function (it) { itemsBody.appendChild(buildRowEl(it)); });
    }

    function getItemsFromDOM() {
        var rows = itemsBody.querySelectorAll("tr[data-id]");
        var arr = [];
        rows.forEach(function (tr) {
            arr.push({
                id: tr.dataset.id,
                name: tr.querySelector('[data-field="name"]').value.trim(),
                description: tr.querySelector('[data-field="description"]').value.trim(),
                qty: parseFloat(tr.querySelector('[data-field="qty"]').value) || 0,
                price: parseFloat(tr.querySelector('[data-field="price"]').value) || 0,
                taxRate: parseFloat(tr.querySelector('[data-field="taxRate"]').value) || 0,
                discountRate: parseFloat(tr.querySelector('[data-field="discountRate"]').value) || 0
            });
        });
        return arr;
    }

    function readRowData(tr) {
        return {
            id: uid(),
            name: tr.querySelector('[data-field="name"]').value,
            description: tr.querySelector('[data-field="description"]').value,
            qty: parseFloat(tr.querySelector('[data-field="qty"]').value) || 0,
            price: parseFloat(tr.querySelector('[data-field="price"]').value) || 0,
            taxRate: parseFloat(tr.querySelector('[data-field="taxRate"]').value) || 0,
            discountRate: parseFloat(tr.querySelector('[data-field="discountRate"]').value) || 0
        };
    }

    $("btnAddRow").addEventListener("click", function () {
        var tr = buildRowEl(blankItem());
        itemsBody.appendChild(tr);
        tr.querySelector('[data-field="name"]').focus();
        scheduleRecalc();
    });

    itemsBody.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-action]");
        if (!btn) return;
        var tr = btn.closest("tr");
        var action = btn.getAttribute("data-action");
        if (action === "del") {
            if (itemsBody.querySelectorAll("tr").length <= 1) {
                tr.replaceWith(buildRowEl(blankItem()));
            } else {
                tr.remove();
            }
        } else if (action === "dup") {
            var data = readRowData(tr);
            var newTr = buildRowEl(data);
            tr.parentNode.insertBefore(newTr, tr.nextSibling);
        }
        scheduleRecalc();
    });

    /* ---------- calculation engine ---------- */

    // amount = qty * price, tax and discount are each a percentage of that base.
    function computeItem(item) {
        var qty = Math.max(0, item.qty || 0);
        var price = Math.max(0, item.price || 0);
        var base = qty * price;
        var taxRate = clamp(item.taxRate || 0, 0, 100);
        var discountRate = clamp(item.discountRate || 0, 0, 100);
        var taxAmount = base * taxRate / 100;
        var discountAmount = base * discountRate / 100;
        var total = Math.max(0, base + taxAmount - discountAmount);
        return {
            id: item.id, name: item.name, description: item.description,
            qty: qty, price: price, taxRate: taxRate, discountRate: discountRate,
            base: base, taxAmount: taxAmount, discountAmount: discountAmount, total: total
        };
    }

    function computeAll(items) {
        var computedItems = items.map(computeItem);
        var subtotal = 0, taxTotal = 0, discountTotal = 0;
        computedItems.forEach(function (ci) {
            subtotal += ci.base;
            taxTotal += ci.taxAmount;
            discountTotal += ci.discountAmount;
        });
        var grandTotal = Math.max(0, subtotal + taxTotal - discountTotal);
        return { items: computedItems, subtotal: subtotal, taxTotal: taxTotal, discountTotal: discountTotal, grandTotal: grandTotal };
    }

    /* ---------- state read/write ---------- */

    function collectState() {
        return {
            business: {
                name: $("bizName").value.trim(), logo: $("bizLogoPreview").hidden ? "" : $("bizLogoPreview").src,
                address: $("bizAddress").value.trim(), email: $("bizEmail").value.trim(),
                phone: $("bizPhone").value.trim(), website: $("bizWebsite").value.trim(), gstin: $("bizGstin").value.trim()
            },
            customer: {
                name: $("custName").value.trim(), company: $("custCompany").value.trim(),
                billingAddress: $("custBillingAddress").value.trim(), email: $("custEmail").value.trim(),
                phone: $("custPhone").value.trim()
            },
            info: {
                number: $("invNumber").value.trim(), date: $("invDate").value, dueDate: $("invDueDate").value,
                currency: $("invCurrency").value, status: $("invStatus").value
            },
            items: getItemsFromDOM(),
            notes: { notes: $("invNotes").value.trim(), terms: $("invTerms").value.trim() }
        };
    }

    function setVal(id, value) { $(id).value = value == null ? "" : value; }

    function applyState(data) {
        var d = data || {};
        var biz = d.business || {}, cust = d.customer || {}, info = d.info || {}, notes = d.notes || {};
        setVal("bizName", biz.name); setVal("bizAddress", biz.address); setVal("bizEmail", biz.email);
        setVal("bizPhone", biz.phone); setVal("bizWebsite", biz.website); setVal("bizGstin", biz.gstin);
        if (biz.logo) {
            $("bizLogoPreview").src = biz.logo; $("bizLogoPreview").hidden = false;
            $("logoPlaceholder").hidden = true; $("btnRemoveLogo").hidden = false;
        } else {
            $("bizLogoPreview").src = ""; $("bizLogoPreview").hidden = true;
            $("logoPlaceholder").hidden = false; $("btnRemoveLogo").hidden = true;
        }
        setVal("custName", cust.name); setVal("custCompany", cust.company);
        setVal("custBillingAddress", cust.billingAddress); setVal("custEmail", cust.email); setVal("custPhone", cust.phone);

        setVal("invNumber", info.number || nextInvoiceNumber());
        setVal("invDate", info.date || todayISO());
        setVal("invDueDate", info.dueDate || addDaysISO($("invDate").value, 15));
        if (info.currency) $("invCurrency").value = info.currency;
        if (info.status) $("invStatus").value = info.status;

        setItemsToDOM(d.items && d.items.length ? d.items : [blankItem()]);
        setVal("invNotes", notes.notes); setVal("invTerms", notes.terms);
    }

    function defaultState() {
        return {
            business: { name: "", logo: "", address: "", email: "", phone: "", website: "", gstin: "" },
            customer: { name: "", company: "", billingAddress: "", email: "", phone: "" },
            info: { number: nextInvoiceNumber(), date: todayISO(), dueDate: addDaysISO(todayISO(), 15), currency: "USD", status: "Draft" },
            items: [blankItem()],
            notes: { notes: "", terms: "" }
        };
    }

    /* ---------- validation ---------- */

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;

    function setErr(id, msg) { $(id).textContent = msg || ""; }

    function toggleInvalid(el, bad) { el.classList.toggle("inv-invalid", !!bad); }

    function validate() {
        var ok = true;

        var bizName = $("bizName").value.trim();
        toggleInvalid($("bizName"), !bizName);
        setErr("errBizName", bizName ? "" : "Business name is required.");
        if (!bizName) ok = false;

        var bizEmail = $("bizEmail").value.trim();
        var bizEmailBad = bizEmail && !EMAIL_RE.test(bizEmail);
        toggleInvalid($("bizEmail"), bizEmailBad);
        setErr("errBizEmail", bizEmailBad ? "Enter a valid email address." : "");
        if (bizEmailBad) ok = false;

        var bizPhone = $("bizPhone").value.trim();
        var bizPhoneBad = bizPhone && !PHONE_RE.test(bizPhone);
        toggleInvalid($("bizPhone"), bizPhoneBad);
        setErr("errBizPhone", bizPhoneBad ? "Enter a valid phone number." : "");
        if (bizPhoneBad) ok = false;

        var custName = $("custName").value.trim();
        toggleInvalid($("custName"), !custName);
        setErr("errCustName", custName ? "" : "Customer name is required.");
        if (!custName) ok = false;

        var custEmail = $("custEmail").value.trim();
        var custEmailBad = custEmail && !EMAIL_RE.test(custEmail);
        toggleInvalid($("custEmail"), custEmailBad);
        setErr("errCustEmail", custEmailBad ? "Enter a valid email address." : "");
        if (custEmailBad) ok = false;

        var custPhone = $("custPhone").value.trim();
        var custPhoneBad = custPhone && !PHONE_RE.test(custPhone);
        toggleInvalid($("custPhone"), custPhoneBad);
        setErr("errCustPhone", custPhoneBad ? "Enter a valid phone number." : "");
        if (custPhoneBad) ok = false;

        var items = getItemsFromDOM();
        var itemRows = itemsBody.querySelectorAll("tr[data-id]");
        var hasValidItem = false;
        items.forEach(function (it, i) {
            var tr = itemRows[i];
            var nameInput = tr.querySelector('[data-field="name"]');
            var qtyInput = tr.querySelector('[data-field="qty"]');
            var priceInput = tr.querySelector('[data-field="price"]');
            var rowHasContent = it.name || it.price > 0;
            var qtyBad = rowHasContent && it.qty <= 0;
            var priceBad = rowHasContent && it.price < 0;
            toggleInvalid(qtyInput, qtyBad);
            toggleInvalid(priceInput, priceBad);
            if (it.name && it.qty > 0 && it.price >= 0) hasValidItem = true;
        });
        setErr("errItems", hasValidItem ? "" : "Add at least one item with a name, a positive quantity, and a price.");
        if (!hasValidItem) ok = false;

        if (!ok) {
            var firstError = $("invApp").querySelector(".inv-error:not(:empty)");
            if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return ok;
    }

    /* ---------- preview rendering ---------- */

    function renderPreview(data, computed) {
        var cur = data.info.currency;
        var money = function (v) { return formatMoney(roundMoney(v, cur), cur); };
        var biz = data.business, cust = data.customer, info = data.info;

        var logoHtml = biz.logo ? '<div class="inv-doc-logo"><img src="' + biz.logo + '" alt="' + esc(biz.name || "Business") + ' logo"></div>' : "";
        var bizMetaLines = [biz.address, biz.email, biz.phone, biz.website, biz.gstin ? ("Tax ID: " + biz.gstin) : ""].filter(Boolean);
        var custMetaLines = [cust.company, cust.billingAddress, cust.email, cust.phone].filter(Boolean);

        var header =
            '<div class="inv-doc-topbar"></div>' +
            '<div class="inv-doc-header">' +
            "<div>" + logoHtml + '<div class="inv-doc-biz-name">' + esc(biz.name || "Your Business") + "</div>" +
            '<div class="inv-doc-biz-meta">' + esc(bizMetaLines.join("\n")) + "</div></div>" +
            '<div class="inv-doc-title-block">' +
            '<div class="inv-doc-title">Invoice</div>' +
            '<div class="inv-doc-meta-row"><span>Invoice #:</span> <b>' + esc(info.number || "—") + "</b></div>" +
            '<div class="inv-doc-meta-row"><span>Date:</span> <b>' + esc(formatDate(info.date)) + "</b></div>" +
            '<div class="inv-doc-meta-row"><span>Due Date:</span> <b>' + esc(formatDate(info.dueDate)) + "</b></div>" +
            '<span class="inv-doc-status">' + esc(info.status || "Draft") + "</span>" +
            "</div></div>";

        var parties =
            '<div class="inv-doc-parties">' +
            '<div class="inv-doc-party"><h4>Bill To</h4><div class="inv-doc-party-name">' + esc(cust.name || "—") + '</div><div class="inv-doc-cust-meta">' + esc(custMetaLines.join("\n")) + "</div></div>" +
            "</div>";

        var rows = computed.items.map(function (it) {
            var descHtml = it.description ? '<div class="inv-doc-item-desc">' + esc(it.description) + "</div>" : "";
            return "<tr><td>" + esc(it.name || "—") + descHtml + "</td>" +
                '<td class="num">' + it.qty + "</td>" +
                '<td class="num">' + money(it.price) + "</td>" +
                '<td class="num">' + (it.taxRate > 0 ? it.taxRate + "%" : "—") + "</td>" +
                '<td class="num">' + (it.discountRate > 0 ? it.discountRate + "%" : "—") + "</td>" +
                '<td class="num">' + money(it.total) + "</td></tr>";
        }).join("");

        var table =
            '<table class="inv-doc-table"><thead><tr>' +
            "<th>Item</th><th class=\"num\">Qty</th><th class=\"num\">Price</th>" +
            "<th class=\"num\">Tax</th><th class=\"num\">Discount</th><th class=\"num\">Total</th>" +
            "</tr></thead><tbody>" + rows + "</tbody></table>";

        var totalsRows =
            '<div class="inv-doc-total-row"><span>Subtotal</span><span>' + money(computed.subtotal) + "</span></div>" +
            '<div class="inv-doc-total-row"><span>Tax</span><span>' + money(computed.taxTotal) + "</span></div>" +
            '<div class="inv-doc-total-row"><span>Discount</span><span>-' + money(computed.discountTotal) + "</span></div>" +
            '<div class="inv-doc-total-row grand"><span>Grand Total</span><span>' + money(computed.grandTotal) + "</span></div>";
        var totals = '<div class="inv-doc-totals">' + totalsRows + "</div>";

        var notesSections = "";
        if (data.notes.notes) notesSections += '<div class="inv-doc-section"><h4>Notes</h4><p>' + esc(data.notes.notes) + "</p></div>";
        if (data.notes.terms) notesSections += '<div class="inv-doc-section"><h4>Terms &amp; Conditions</h4><p>' + esc(data.notes.terms) + "</p></div>";

        var footer = '<div class="inv-doc-footer">Thank you for your business!</div>';

        var watermark = buildWatermarkHTML();
        var html = watermark + '<div class="inv-doc">' + header + parties + table + totals + notesSections + footer + "</div>";
        $("invoicePreview").innerHTML = html;
    }

    // Plain, individually-positioned watermark <span>s (see the CSS comment
    // on .inv-watermark for why this technique, specifically, was chosen).
    var WATERMARK_SPOTS = [
        [8, 6], [55, 10], [20, 38], [68, 42], [4, 68], [50, 72], [80, 78]
    ];
    function buildWatermarkHTML() {
        var spans = WATERMARK_SPOTS.map(function (pos) {
            return '<span style="top:' + pos[0] + '%;left:' + pos[1] + '%;">TechGeekBuzz</span>';
        }).join("");
        return '<div class="inv-watermark" aria-hidden="true">' + spans + "</div>";
    }

    function refreshRowAmounts(computedItems, currencyCode) {
        var rows = itemsBody.querySelectorAll("tr[data-id]");
        rows.forEach(function (tr, i) {
            var ci = computedItems[i];
            if (!ci) return;
            var cell = tr.querySelector('[data-role="amount"]');
            if (cell) cell.textContent = formatMoney(roundMoney(ci.total, currencyCode), currencyCode);
        });
    }

    function renderMiniTotals(computed, cur) {
        $("miniSubtotal").textContent = formatMoney(roundMoney(computed.subtotal, cur), cur);
        $("miniTax").textContent = formatMoney(roundMoney(computed.taxTotal, cur), cur);
        $("miniDiscount").textContent = "-" + formatMoney(roundMoney(computed.discountTotal, cur), cur);
        $("miniGrandTotal").textContent = formatMoney(roundMoney(computed.grandTotal, cur), cur);
    }

    /* ---------- recalculate + persist ---------- */

    var persistDraftDebounced = debounce(function (data) {
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) { }
    }, 400);

    function recalcAndRender() {
        var data = collectState();
        var computed = computeAll(data.items);
        refreshRowAmounts(computed.items, data.info.currency);
        renderMiniTotals(computed, data.info.currency);
        renderPreview(data, computed);
        persistDraftDebounced(data);
        return { data: data, computed: computed };
    }

    var scheduleRecalc = debounce(recalcAndRender, DEBOUNCE_MS);

    /* ---------- logo upload ---------- */

    function handleLogoFile(file) {
        if (!file || !/^image\//.test(file.type)) { showToast("Please choose an image file."); return; }
        if (file.size > 2 * 1024 * 1024) { showToast("Logo should be under 2MB."); return; }
        var reader = new FileReader();
        reader.onload = function () {
            $("bizLogoPreview").src = reader.result;
            $("bizLogoPreview").hidden = false;
            $("logoPlaceholder").hidden = true;
            $("btnRemoveLogo").hidden = false;
            scheduleRecalc();
        };
        reader.readAsDataURL(file);
    }
    $("bizLogoInput").addEventListener("change", function (e) { handleLogoFile(e.target.files[0]); });
    $("btnRemoveLogo").addEventListener("click", function () {
        $("bizLogoPreview").src = ""; $("bizLogoPreview").hidden = true;
        $("logoPlaceholder").hidden = false; $("btnRemoveLogo").hidden = true;
        $("bizLogoInput").value = "";
        scheduleRecalc();
    });

    /* ---------- currency select ---------- */

    function populateCurrencySelect() {
        var sel = $("invCurrency");
        CURRENCIES.forEach(function (c) {
            var opt = document.createElement("option");
            opt.value = c[0];
            opt.textContent = c[0] + " — " + c[1];
            sel.appendChild(opt);
        });
        sel.value = "USD";
    }

    /* ---------- form-wide live recalculation ---------- */

    $("invForm").addEventListener("input", scheduleRecalc);
    $("invForm").addEventListener("change", scheduleRecalc);

    $("btnRegenNumber").addEventListener("click", function () {
        $("invNumber").value = nextInvoiceNumber();
        scheduleRecalc();
    });

    /* ---------- preview modal ---------- */

    function openPreviewModal() {
        recalcAndRender();
        $("previewModalBackdrop").hidden = false;
        document.body.style.overflow = "hidden";
        $("btnClosePreview").focus();
    }
    function closePreviewModal() {
        $("previewModalBackdrop").hidden = true;
        document.body.style.overflow = "";
    }
    $("btnClosePreview").addEventListener("click", closePreviewModal);
    $("previewModalBackdrop").addEventListener("click", function (e) {
        if (e.target === $("previewModalBackdrop")) closePreviewModal();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !$("previewModalBackdrop").hidden) closePreviewModal();
    });

    /* ---------- actions ---------- */

    $("btnHeroCta").addEventListener("click", function () {
        $("bizName").focus();
        $("invForm").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("btnPreview").addEventListener("click", function () {
        if (!validate()) { showToast("Please fix the highlighted fields."); return; }
        openPreviewModal();
    });

    $("btnPrint").addEventListener("click", function () {
        if (!validate()) { showToast("Please fix the highlighted fields."); return; }
        openPreviewModal();
        window.print();
    });

    $("btnCopyInvoice").addEventListener("click", function () {
        var r = recalcAndRender();
        var d = r.data, c = r.computed;
        var lines = [
            (d.business.name || "Your Business"), "",
            "Invoice #: " + (d.info.number || ""),
            "Date: " + formatDate(d.info.date) + "   Due: " + formatDate(d.info.dueDate), "",
            "Bill To: " + (d.customer.name || "") + (d.customer.company ? (" (" + d.customer.company + ")") : ""), ""
        ];
        c.items.forEach(function (it) {
            lines.push((it.name || "Item") + "  x" + it.qty + "  " + formatMoney(roundMoney(it.total, d.info.currency), d.info.currency));
        });
        lines.push("");
        lines.push("Subtotal: " + formatMoney(roundMoney(c.subtotal, d.info.currency), d.info.currency));
        lines.push("Tax: " + formatMoney(roundMoney(c.taxTotal, d.info.currency), d.info.currency));
        lines.push("Discount: -" + formatMoney(roundMoney(c.discountTotal, d.info.currency), d.info.currency));
        lines.push("Grand Total: " + formatMoney(roundMoney(c.grandTotal, d.info.currency), d.info.currency));
        var text = lines.join("\n");
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast("Invoice summary copied to clipboard."); },
                function () { showToast("Could not copy — please copy manually."); });
        } else {
            window.prompt("Copy this invoice summary:", text);
        }
    });

    $("btnDownloadPdf").addEventListener("click", function () {
        if (!validate()) { showToast("Please fix the highlighted fields."); return; }
        openPreviewModal();
        var btn = $("btnDownloadPdf");
        var el = $("invoicePreview");
        if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
            showToast("PDF library failed to load — please try Print instead.");
            return;
        }
        var originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Generating…";

        // Rendered via html2canvas directly (not jsPDF's own .html() plugin,
        // which clones/paginates the DOM itself and silently drops
        // absolutely-positioned overlays like the watermark) and placed into
        // the PDF as a plain image, sliced across pages if it runs long.
        window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" }).then(function (canvas) {
            var jsPDF = window.jspdf.jsPDF;
            var pdf = new jsPDF("p", "pt", "a4");
            var margin = 28;
            var pageWidth = pdf.internal.pageSize.getWidth();
            var pageHeight = pdf.internal.pageSize.getHeight();
            var usableWidth = pageWidth - margin * 2;
            var usableHeight = pageHeight - margin * 2;
            var imgWidth = usableWidth;
            var imgHeight = canvas.height * (imgWidth / canvas.width);

            // JPEG, not PNG: the anti-aliased watermark text produces a lot of
            // per-pixel noise that PNG's lossless compression can't shrink,
            // sometimes ballooning to several MB. JPEG at high quality is
            // visually identical here (the page has no transparency) and a
            // small fraction of the size.
            if (imgHeight <= usableHeight) {
                pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgWidth, imgHeight);
            } else {
                var pxPerPt = canvas.height / imgHeight;
                var remainingPt = imgHeight;
                var sourceY = 0;
                var isFirstPage = true;
                while (remainingPt > 0.5) {
                    var slicePt = Math.min(usableHeight, remainingPt);
                    var slicePx = Math.round(slicePt * pxPerPt);
                    var sliceCanvas = document.createElement("canvas");
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = slicePx;
                    sliceCanvas.getContext("2d").drawImage(canvas, 0, sourceY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
                    if (!isFirstPage) pdf.addPage();
                    pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgWidth, slicePt);
                    sourceY += slicePx;
                    remainingPt -= slicePt;
                    isFirstPage = false;
                }
            }

            var number = $("invNumber").value.trim() || "invoice";
            pdf.save(number + ".pdf");
            btn.disabled = false;
            btn.textContent = originalLabel;
            showToast("PDF downloaded.");
        }).catch(function () {
            btn.disabled = false;
            btn.textContent = originalLabel;
            showToast("Could not generate the PDF — please try Print instead.");
        });
    });

    $("btnReset").addEventListener("click", function () {
        if (!window.confirm("Reset the form? Unsaved changes will be lost.")) return;
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { }
        ["errBizName", "errBizEmail", "errBizPhone", "errCustName", "errCustEmail", "errCustPhone", "errItems"].forEach(function (id) { setErr(id, ""); });
        document.querySelectorAll(".inv-invalid").forEach(function (el) { el.classList.remove("inv-invalid"); });
        closePreviewModal();
        applyState(defaultState());
        recalcAndRender();
        showToast("Form reset.");
    });

    /* ---------- init ---------- */

    populateCurrencySelect();

    (function init() {
        var restored = false;
        try {
            var raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                var draft = JSON.parse(raw);
                if (draft && draft.business && draft.items && draft.items.length) {
                    applyState(draft);
                    restored = true;
                }
            }
        } catch (e) { }
        if (!restored) applyState(defaultState());
        recalcAndRender();
    })();
})();
