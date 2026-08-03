/* GST Calculator — add/remove GST, split CGST/SGST/IGST, history, share/print/CSV */

(function () {
    "use strict";

    var HISTORY_KEY = "gstCalculatorHistory";
    var MAX_HISTORY = 20;

    var form = document.getElementById("gstForm");
    var modeAddBtn = document.getElementById("modeAdd");
    var modeRemoveBtn = document.getElementById("modeRemove");
    var amountInput = document.getElementById("gstAmount");
    var amountLabel = document.getElementById("amountLabel");
    var amountError = document.getElementById("amountError");
    var currencySelect = document.getElementById("gstCurrency");
    var rateButtons = Array.prototype.slice.call(document.querySelectorAll(".gst-rate-btn"));
    var customRateInput = document.getElementById("customRate");
    var rateError = document.getElementById("rateError");
    var interstateToggle = document.getElementById("interstateToggle");
    var resetBtn = document.getElementById("resetBtn");

    var resultCard = document.getElementById("resultCard");
    var resOriginal = document.getElementById("resOriginal");
    var resRate = document.getElementById("resRate");
    var resGst = document.getElementById("resGst");
    var resCgst = document.getElementById("resCgst");
    var resSgst = document.getElementById("resSgst");
    var resIgst = document.getElementById("resIgst");
    var resTotal = document.getElementById("resTotal");
    var rowCgst = document.getElementById("rowCgst");
    var rowSgst = document.getElementById("rowSgst");
    var rowIgst = document.getElementById("rowIgst");

    var copyBtn = document.getElementById("copyBtn");
    var shareBtn = document.getElementById("shareBtn");
    var printBtn = document.getElementById("printBtn");
    var pdfBtn = document.getElementById("pdfBtn");

    var historyList = document.getElementById("historyList");
    var historyEmpty = document.getElementById("historyEmpty");
    var exportCsvBtn = document.getElementById("exportCsvBtn");
    var clearHistoryBtn = document.getElementById("clearHistoryBtn");

    var toast = document.getElementById("gstToast");

    var mode = "add"; // "add" | "remove"
    var lastResult = null;

    /* ---------- helpers ---------- */

    function roundTo2(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    function formatMoney(num) {
        var symbol = currencySelect.value;
        var value = roundTo2(num);
        return symbol + value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseDecimal(value) {
        if (value === null || value === undefined) return NaN;
        var cleaned = String(value).trim().replace(/,/g, "");
        if (cleaned === "") return NaN;
        return Number(cleaned);
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () {
            toast.classList.remove("show");
        }, 2600);
    }

    function setError(el, message) {
        el.textContent = message || "";
    }

    /* ---------- mode switching ---------- */

    function setMode(newMode) {
        mode = newMode;
        var isAdd = mode === "add";
        modeAddBtn.classList.toggle("active", isAdd);
        modeAddBtn.setAttribute("aria-selected", isAdd ? "true" : "false");
        modeRemoveBtn.classList.toggle("active", !isAdd);
        modeRemoveBtn.setAttribute("aria-selected", !isAdd ? "true" : "false");
        amountLabel.textContent = isAdd ? "Original Amount" : "GST-Inclusive Amount";
        amountInput.placeholder = "0.00";
        liveCalculate();
    }

    modeAddBtn.addEventListener("click", function () { setMode("add"); });
    modeRemoveBtn.addEventListener("click", function () { setMode("remove"); });

    /* ---------- rate selection ---------- */

    function getSelectedRate() {
        var customVal = customRateInput.value.trim();
        if (customVal !== "") {
            return parseDecimal(customVal);
        }
        var activeBtn = rateButtons.find(function (btn) { return btn.classList.contains("active"); });
        return activeBtn ? parseDecimal(activeBtn.dataset.rate) : NaN;
    }

    rateButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            rateButtons.forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            customRateInput.value = "";
            liveCalculate();
        });
    });

    customRateInput.addEventListener("input", function () {
        if (customRateInput.value.trim() !== "") {
            rateButtons.forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
        }
        liveCalculate();
    });

    /* ---------- core GST math ---------- */

    function calculateAddGST(originalAmount, rate) {
        var gstAmount = roundTo2(originalAmount * rate / 100);
        var totalAmount = roundTo2(originalAmount + gstAmount);
        return { originalAmount: roundTo2(originalAmount), gstAmount: gstAmount, totalAmount: totalAmount };
    }

    function calculateRemoveGST(inclusiveAmount, rate) {
        var originalAmount = roundTo2((inclusiveAmount * 100) / (100 + rate));
        var gstAmount = roundTo2(inclusiveAmount - originalAmount);
        return { originalAmount: originalAmount, gstAmount: gstAmount, totalAmount: roundTo2(inclusiveAmount) };
    }

    function splitGST(gstAmount, interstate) {
        if (interstate) {
            return { cgst: 0, sgst: 0, igst: roundTo2(gstAmount) };
        }
        var half = roundTo2(gstAmount / 2);
        return { cgst: half, sgst: half, igst: 0 };
    }

    /* ---------- validation ---------- */

    function validate(showErrors) {
        var amountValue = parseDecimal(amountInput.value);
        var rateValue = getSelectedRate();
        var valid = true;

        if (isNaN(amountValue) || amountValue < 0) {
            valid = false;
            if (showErrors) setError(amountError, "Please enter a valid, non-negative amount.");
        } else if (showErrors) {
            setError(amountError, "");
        }

        if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
            valid = false;
            if (showErrors) setError(rateError, "Please select a preset rate or enter a custom rate between 0 and 100.");
        } else if (showErrors) {
            setError(rateError, "");
        }

        return valid ? { amount: amountValue, rate: rateValue } : null;
    }

    /* ---------- render ---------- */

    function renderResult(data) {
        var interstate = interstateToggle.checked;
        var split = splitGST(data.gstAmount, interstate);

        resOriginal.textContent = formatMoney(data.originalAmount);
        resRate.textContent = data.rate + "%";
        resGst.textContent = formatMoney(data.gstAmount);
        resCgst.textContent = formatMoney(split.cgst);
        resSgst.textContent = formatMoney(split.sgst);
        resIgst.textContent = formatMoney(split.igst);
        resTotal.textContent = formatMoney(data.totalAmount);

        rowCgst.hidden = interstate;
        rowSgst.hidden = interstate;
        rowIgst.hidden = !interstate;

        resultCard.hidden = false;

        lastResult = {
            mode: mode,
            currency: currencySelect.value,
            interstate: interstate,
            originalAmount: data.originalAmount,
            rate: data.rate,
            gstAmount: data.gstAmount,
            cgst: split.cgst,
            sgst: split.sgst,
            igst: split.igst,
            totalAmount: data.totalAmount,
            timestamp: new Date().toISOString()
        };
    }

    function runCalculation(showErrors) {
        var inputs = validate(showErrors);
        if (!inputs) return null;

        var data = mode === "add"
            ? calculateAddGST(inputs.amount, inputs.rate)
            : calculateRemoveGST(inputs.amount, inputs.rate);
        data.rate = inputs.rate;

        renderResult(data);
        return lastResult;
    }

    function liveCalculate() {
        // Silent recalculation as the user types/selects, no error messages shown.
        runCalculation(false);
    }

    ["input"].forEach(function (evt) {
        amountInput.addEventListener(evt, liveCalculate);
    });
    currencySelect.addEventListener("change", liveCalculate);
    interstateToggle.addEventListener("change", liveCalculate);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var result = runCalculation(true);
        if (result) {
            saveToHistory(result);
            showToast("GST calculated.");
        }
    });

    resetBtn.addEventListener("click", function () {
        form.reset();
        setError(amountError, "");
        setError(rateError, "");
        rateButtons.forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
        var defaultBtn = rateButtons.find(function (b) { return b.dataset.rate === "18"; });
        if (defaultBtn) { defaultBtn.classList.add("active"); defaultBtn.setAttribute("aria-pressed", "true"); }
        interstateToggle.checked = false;
        resultCard.hidden = true;
        lastResult = null;
        setMode("add");
        showToast("Form reset.");
    });

    /* ---------- copy / share / print ---------- */

    function resultSummaryText() {
        if (!lastResult) return "";
        var r = lastResult;
        var lines = [
            "GST Calculation (" + (r.mode === "add" ? "Add GST" : "Remove GST") + ")",
            "Original Amount: " + formatMoney(r.originalAmount),
            "GST Rate: " + r.rate + "%",
            "GST Amount: " + formatMoney(r.gstAmount)
        ];
        if (r.interstate) {
            lines.push("IGST: " + formatMoney(r.igst));
        } else {
            lines.push("CGST: " + formatMoney(r.cgst));
            lines.push("SGST: " + formatMoney(r.sgst));
        }
        lines.push("Total Amount: " + formatMoney(r.totalAmount));
        return lines.join("\n");
    }

    copyBtn.addEventListener("click", function () {
        if (!lastResult) return;
        var text = resultSummaryText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("Results copied to clipboard.");
            }).catch(function () {
                showToast("Could not copy results.");
            });
        } else {
            showToast("Clipboard not supported in this browser.");
        }
    });

    shareBtn.addEventListener("click", function () {
        if (!lastResult) return;
        var text = resultSummaryText();
        if (navigator.share) {
            navigator.share({ title: "GST Calculator Result", text: text, url: window.location.href }).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("Sharing isn't supported here — result copied instead.");
            });
        } else {
            showToast("Sharing isn't supported in this browser.");
        }
    });

    function printResult() {
        if (!lastResult) {
            showToast("Calculate a result first.");
            return;
        }
        window.print();
    }

    printBtn.addEventListener("click", printResult);
    // No PDF library is used (per the "no external libraries" requirement); this
    // reuses the browser's native print dialog, where "Save as PDF" is a destination.
    pdfBtn.addEventListener("click", printResult);

    /* ---------- history (localStorage) ---------- */

    function loadHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(entry) {
        var history = loadHistory();
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        var history = loadHistory();
        historyList.innerHTML = "";

        if (history.length === 0) {
            historyEmpty.hidden = false;
            return;
        }
        historyEmpty.hidden = true;

        history.forEach(function (entry, index) {
            var li = document.createElement("li");
            li.className = "gst-history-item";

            var info = document.createElement("div");
            var title = document.createElement("div");
            title.textContent = (entry.mode === "add" ? "Add GST" : "Remove GST") + " · " +
                entry.currency + entry.originalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) +
                " @ " + entry.rate + "% → " +
                entry.currency + entry.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            var meta = document.createElement("div");
            meta.className = "gst-history-meta";
            meta.textContent = new Date(entry.timestamp).toLocaleString();
            info.appendChild(title);
            info.appendChild(meta);

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "gst-history-remove";
            removeBtn.textContent = "Remove";
            removeBtn.setAttribute("aria-label", "Remove this history entry");
            removeBtn.addEventListener("click", function () {
                var updated = loadHistory();
                updated.splice(index, 1);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
                renderHistory();
            });

            li.appendChild(info);
            li.appendChild(removeBtn);
            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.addEventListener("click", function () {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showToast("History cleared.");
    });

    exportCsvBtn.addEventListener("click", function () {
        var history = loadHistory();
        if (history.length === 0) {
            showToast("No history to export.");
            return;
        }
        var headers = ["Timestamp", "Mode", "Currency", "OriginalAmount", "Rate", "GSTAmount", "CGST", "SGST", "IGST", "TotalAmount"];
        var rows = history.map(function (e) {
            return [
                e.timestamp, e.mode, e.currency, e.originalAmount, e.rate,
                e.gstAmount, e.cgst, e.sgst, e.igst, e.totalAmount
            ].join(",");
        });
        var csv = [headers.join(",")].concat(rows).join("\n");
        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "gst-calculator-history.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    /* ---------- init ---------- */

    renderHistory();
    setMode("add");
})();
