/* PPF Calculator — computes PPF maturity/interest/schedule using the standard
   annual-compounding model (yearly contribution compounded once a year),
   the same model used by most public PPF calculators. Charts via Chart.js. */

(function () {
    "use strict";

    var HISTORY_KEY = "ppfCalculatorHistory";
    var MAX_HISTORY = 10;
    var MIN_YEARLY = 500;
    var MAX_YEARLY = 150000;
    var DEBOUNCE_MS = 300;

    var yearlyInput = document.getElementById("yearlyInvestment");
    var monthlyInput = document.getElementById("monthlyInvestment");
    var freqYearlyRadio = document.getElementById("freqYearly");
    var freqMonthlyRadio = document.getElementById("freqMonthly");
    var rateInput = document.getElementById("ppfRate");
    var durationSelect = document.getElementById("ppfDuration");
    var existingInput = document.getElementById("existingBalance");

    var errorYearly = document.getElementById("errorYearly");
    var errorRate = document.getElementById("errorRate");
    var errorExisting = document.getElementById("errorExisting");

    var resMaturity = document.getElementById("resMaturity");
    var resTotalInvestment = document.getElementById("resTotalInvestment");
    var resTotalInterest = document.getElementById("resTotalInterest");
    var resDuration = document.getElementById("resDuration");
    var resRate = document.getElementById("resRate");
    var resWealthGained = document.getElementById("resWealthGained");

    var scheduleBody = document.getElementById("scheduleBody");
    var scheduleSearch = document.getElementById("scheduleSearch");
    var scheduleEmpty = document.getElementById("scheduleEmpty");

    var toast = document.getElementById("ppfToast");
    var historyList = document.getElementById("historyList");
    var historyEmpty = document.getElementById("historyEmpty");

    var lastSchedule = null;
    var lastSummary = null;

    /* ---------- currency formatting ---------- */

    function roundToRupee(num) {
        return Math.round(num);
    }

    function formatCurrency(num) {
        return "₹" + Math.round(num).toLocaleString("en-IN");
    }

    function formatNumberInput(value) {
        return Number(value).toLocaleString("en-IN");
    }

    /* ---------- validation ---------- */

    function getYearlyInvestment() {
        var isMonthly = freqMonthlyRadio.checked;
        if (isMonthly) {
            var monthly = parseFloat(monthlyInput.value);
            if (isNaN(monthly)) return NaN;
            return monthly * 12;
        }
        return parseFloat(yearlyInput.value);
    }

    function validate(showErrors) {
        var yearly = getYearlyInvestment();
        var rate = parseFloat(rateInput.value);
        var existing = existingInput.value.trim() === "" ? 0 : parseFloat(existingInput.value);
        var valid = true;

        if (isNaN(yearly) || yearly < MIN_YEARLY || yearly > MAX_YEARLY) {
            valid = false;
            if (showErrors) {
                errorYearly.textContent = "Yearly investment must be between " + formatCurrency(MIN_YEARLY) + " and " + formatCurrency(MAX_YEARLY) + ".";
            }
        } else if (showErrors) {
            errorYearly.textContent = "";
        }

        if (isNaN(rate) || rate <= 0 || rate > 15) {
            valid = false;
            if (showErrors) errorRate.textContent = "Interest rate must be a positive number (up to 15%).";
        } else if (showErrors) {
            errorRate.textContent = "";
        }

        if (isNaN(existing) || existing < 0) {
            valid = false;
            if (showErrors) errorExisting.textContent = "Existing balance can't be negative.";
        } else if (showErrors) {
            errorExisting.textContent = "";
        }

        if (!valid) return null;
        return {
            yearly: yearly,
            rate: rate,
            existing: existing,
            duration: parseInt(durationSelect.value, 10)
        };
    }

    /* ---------- PPF calculation engine ---------- */

    // Standard annual-compounding model: the yearly contribution is treated as
    // a lump sum at the start of the year, and interest is credited once a
    // year on (opening balance + that year's contribution). This is the model
    // used by most public PPF calculators; the official scheme technically
    // computes interest monthly on the lowest balance between the 5th and the
    // last day of the month, which can differ by a small amount depending on
    // exactly when deposits are made within the year.
    function computeSchedule(input) {
        var balance = input.existing;
        var rows = [];
        var totalInvestment = 0;
        var totalInterest = 0;

        for (var year = 1; year <= input.duration; year++) {
            var opening = balance;
            var interest = (opening + input.yearly) * (input.rate / 100);
            var closing = opening + input.yearly + interest;

            rows.push({
                year: year,
                opening: roundToRupee(opening),
                investment: roundToRupee(input.yearly),
                interest: roundToRupee(interest),
                closing: roundToRupee(closing)
            });

            totalInvestment += input.yearly;
            totalInterest += interest;
            balance = closing;
        }

        return {
            rows: rows,
            maturity: roundToRupee(balance),
            totalInvestment: roundToRupee(totalInvestment),
            totalInterest: roundToRupee(totalInterest),
            existing: input.existing,
            rate: input.rate,
            duration: input.duration,
            wealthGained: roundToRupee(balance - totalInvestment)
        };
    }

    /* ---------- comparison schemes ---------- */

    // FD/EPF: same annual lump-sum compounding model as PPF, different rate.
    function computeAnnualCompounding(yearly, rate, duration, existing) {
        var balance = existing || 0;
        for (var y = 1; y <= duration; y++) {
            balance = (balance + yearly) * (1 + rate / 100);
        }
        return roundToRupee(balance);
    }

    // SIP/NPS: monthly contribution, monthly compounding future value of a
    // recurring deposit (the standard SIP future-value formula).
    function computeMonthlyCompounding(yearly, ratePercent, duration) {
        var monthly = yearly / 12;
        var i = ratePercent / 100 / 12;
        var n = duration * 12;
        if (i === 0) return roundToRupee(monthly * n);
        var fv = monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
        return roundToRupee(fv);
    }

    /* ---------- charts ---------- */

    var charts = {};

    function destroyChart(key) {
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
    }

    function renderCharts(summary) {
        if (typeof Chart === "undefined") return;

        destroyChart("pie");
        var pieCtx = document.getElementById("chartPie");
        if (pieCtx) {
            charts.pie = new Chart(pieCtx, {
                type: "pie",
                data: {
                    labels: ["Total Investment", "Total Interest"],
                    datasets: [{ data: [summary.totalInvestment, summary.totalInterest], backgroundColor: ["#003d93", "#17803d"] }]
                },
                options: { responsive: true, plugins: { legend: { position: "bottom" } } }
            });
        }

        destroyChart("line");
        var lineCtx = document.getElementById("chartLine");
        if (lineCtx) {
            charts.line = new Chart(lineCtx, {
                type: "line",
                data: {
                    labels: summary.rows.map(function (r) { return "Yr " + r.year; }),
                    datasets: [{ label: "Closing Balance", data: summary.rows.map(function (r) { return r.closing; }), borderColor: "#003d93", backgroundColor: "rgba(0,61,147,0.15)", tension: 0.25 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        destroyChart("bar");
        var barCtx = document.getElementById("chartBar");
        if (barCtx) {
            charts.bar = new Chart(barCtx, {
                type: "bar",
                data: {
                    labels: summary.rows.map(function (r) { return "Yr " + r.year; }),
                    datasets: [{ label: "Annual Interest", data: summary.rows.map(function (r) { return r.interest; }), backgroundColor: "#0d6efd" }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        destroyChart("area");
        var areaCtx = document.getElementById("chartArea");
        if (areaCtx) {
            charts.area = new Chart(areaCtx, {
                type: "line",
                data: {
                    labels: summary.rows.map(function (r) { return "Yr " + r.year; }),
                    datasets: [
                        { label: "Investment (cumulative)", data: cumulative(summary.rows.map(function (r) { return r.investment; })), borderColor: "#6b7280", backgroundColor: "rgba(107,114,128,0.2)", fill: true, tension: 0.2 },
                        { label: "Balance", data: summary.rows.map(function (r) { return r.closing; }), borderColor: "#17803d", backgroundColor: "rgba(23,128,61,0.25)", fill: true, tension: 0.2 }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: "bottom" } } }
            });
        }
    }

    function cumulative(arr) {
        var total = 0;
        return arr.map(function (v) { total += v; return total; });
    }

    /* ---------- animated counters ---------- */

    function animateValue(el, endValue, formatter) {
        var startValue = 0;
        var duration = 600;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min(1, (timestamp - startTime) / duration);
            var current = startValue + (endValue - startValue) * progress;
            el.textContent = formatter(current);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ---------- render results ---------- */

    function renderResults(summary) {
        animateValue(resMaturity, summary.maturity, formatCurrency);
        animateValue(resTotalInvestment, summary.totalInvestment, formatCurrency);
        animateValue(resTotalInterest, summary.totalInterest, formatCurrency);
        animateValue(resWealthGained, summary.wealthGained, formatCurrency);
        resDuration.textContent = summary.duration + " years";
        resRate.textContent = summary.rate + "%";
    }

    function renderSchedule(rows) {
        scheduleBody.innerHTML = "";
        if (!rows.length) {
            scheduleEmpty.hidden = false;
            return;
        }
        scheduleEmpty.hidden = true;
        rows.forEach(function (row) {
            var tr = document.createElement("tr");
            tr.innerHTML =
                "<td>" + row.year + "</td>" +
                "<td>" + formatCurrency(row.opening) + "</td>" +
                "<td>" + formatCurrency(row.investment) + "</td>" +
                "<td>" + formatCurrency(row.interest) + "</td>" +
                "<td>" + formatCurrency(row.closing) + "</td>";
            scheduleBody.appendChild(tr);
        });
    }

    scheduleSearch.addEventListener("input", function () {
        var query = scheduleSearch.value.trim();
        var rows = Array.prototype.slice.call(scheduleBody.querySelectorAll("tr"));
        rows.forEach(function (tr) {
            var yearText = tr.children[0].textContent;
            tr.hidden = query !== "" && yearText.indexOf(query) === -1;
        });
    });

    /* ---------- main calculate pipeline ---------- */

    function calculate(showErrors) {
        var input = validate(showErrors);
        if (!input) return null;

        var summary = computeSchedule(input);
        lastSchedule = summary.rows;
        lastSummary = summary;

        renderResults(summary);
        renderSchedule(summary.rows);
        renderCharts(summary);
        renderComparison(summary);

        return summary;
    }

    var debounceTimer = null;
    function scheduleCalculate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { calculate(false); }, DEBOUNCE_MS);
    }

    [yearlyInput, monthlyInput, rateInput, durationSelect, existingInput].forEach(function (el) {
        el.addEventListener("input", scheduleCalculate);
    });
    [freqYearlyRadio, freqMonthlyRadio].forEach(function (el) {
        el.addEventListener("change", function () {
            toggleFrequencyFields();
            scheduleCalculate();
        });
    });

    function toggleFrequencyFields() {
        var isMonthly = freqMonthlyRadio.checked;
        document.getElementById("yearlyField").hidden = isMonthly;
        document.getElementById("monthlyField").hidden = !isMonthly;
    }

    document.getElementById("btnCalculate").addEventListener("click", function () {
        var summary = calculate(true);
        if (summary) {
            saveToHistory(summary);
            showToast("Calculated.");
        }
    });

    document.getElementById("btnReset").addEventListener("click", function () {
        yearlyInput.value = "";
        monthlyInput.value = "";
        rateInput.value = "7.1";
        durationSelect.value = "15";
        existingInput.value = "";
        freqYearlyRadio.checked = true;
        toggleFrequencyFields();
        errorYearly.textContent = "";
        errorRate.textContent = "";
        errorExisting.textContent = "";
        scheduleBody.innerHTML = "";
        scheduleEmpty.hidden = false;
        resMaturity.textContent = "₹0";
        resTotalInvestment.textContent = "₹0";
        resTotalInterest.textContent = "₹0";
        resWealthGained.textContent = "₹0";
        resDuration.textContent = "—";
        resRate.textContent = "—";
        ["pie", "line", "bar", "area", "comparison"].forEach(destroyChart);
        showToast("Reset.");
    });

    document.getElementById("btnExample").addEventListener("click", function () {
        freqYearlyRadio.checked = true;
        toggleFrequencyFields();
        yearlyInput.value = "150000";
        rateInput.value = "7.1";
        durationSelect.value = "15";
        existingInput.value = "0";
        calculate(true);
        showToast("Example values loaded.");
    });

    /* ---------- comparison mode ---------- */

    var compareChecks = {
        fd: document.getElementById("compareFD"),
        sip: document.getElementById("compareSIP"),
        nps: document.getElementById("compareNPS"),
        epf: document.getElementById("compareEPF")
    };
    var compareRates = {
        fd: document.getElementById("fdRate"),
        sip: document.getElementById("sipRate"),
        nps: document.getElementById("npsRate"),
        epf: document.getElementById("epfRate")
    };
    var compareLabels = { fd: "Fixed Deposit", sip: "SIP (Mutual Fund)", nps: "NPS", epf: "EPF" };
    var comparisonBody = document.getElementById("comparisonBody");
    var comparisonEmpty = document.getElementById("comparisonEmpty");

    Object.keys(compareChecks).forEach(function (key) {
        compareChecks[key].addEventListener("change", function () { renderComparison(lastSummary); });
        compareRates[key].addEventListener("input", function () { renderComparison(lastSummary); });
    });

    function renderComparison(summary) {
        comparisonBody.innerHTML = "";
        destroyChart("comparison");

        if (!summary) {
            comparisonEmpty.hidden = false;
            return;
        }

        var selected = Object.keys(compareChecks).filter(function (key) { return compareChecks[key].checked; });
        if (!selected.length) {
            comparisonEmpty.hidden = false;
            return;
        }
        comparisonEmpty.hidden = true;

        var labels = ["PPF"];
        var maturities = [summary.maturity];

        var ppfRow = document.createElement("tr");
        ppfRow.innerHTML = "<td>PPF</td><td>" + summary.rate + "%</td><td>" + formatCurrency(summary.maturity) + "</td><td>" + formatCurrency(summary.totalInterest) + "</td>";
        comparisonBody.appendChild(ppfRow);

        selected.forEach(function (key) {
            var rate = parseFloat(compareRates[key].value) || 0;
            var maturity;
            if (key === "sip" || key === "nps") {
                maturity = computeMonthlyCompounding(summary.totalInvestment / summary.duration, rate, summary.duration);
            } else {
                maturity = computeAnnualCompounding(summary.totalInvestment / summary.duration, rate, summary.duration, summary.existing);
            }
            var interest = maturity - summary.totalInvestment - summary.existing;

            var tr = document.createElement("tr");
            tr.innerHTML = "<td>" + compareLabels[key] + "</td><td>" + rate + "%</td><td>" + formatCurrency(maturity) + "</td><td>" + formatCurrency(interest) + "</td>";
            comparisonBody.appendChild(tr);

            labels.push(compareLabels[key]);
            maturities.push(maturity);
        });

        if (typeof Chart !== "undefined") {
            var ctx = document.getElementById("chartComparison");
            if (ctx) {
                charts.comparison = new Chart(ctx, {
                    type: "bar",
                    data: { labels: labels, datasets: [{ label: "Maturity Amount", data: maturities, backgroundColor: "#003d93" }] },
                    options: { responsive: true, plugins: { legend: { display: false } } }
                });
            }
        }
    }

    /* ---------- exports ---------- */

    function scheduleToCsvRows() {
        var header = ["Year", "Opening Balance", "Investment", "Interest Earned", "Closing Balance"];
        var rows = lastSchedule.map(function (r) { return [r.year, r.opening, r.investment, r.interest, r.closing]; });
        return [header].concat(rows);
    }

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

    document.getElementById("btnExportCsv").addEventListener("click", function () {
        if (!lastSchedule) { showToast("Calculate first."); return; }
        var csv = scheduleToCsvRows().map(function (row) { return row.join(","); }).join("\n");
        downloadFile("ppf-schedule.csv", csv, "text/csv;charset=utf-8;");
        showToast("CSV exported.");
    });

    document.getElementById("btnExportExcel").addEventListener("click", function () {
        if (!lastSchedule) { showToast("Calculate first."); return; }
        var rows = scheduleToCsvRows();
        var html = "<table><tr>" + rows[0].map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr>" +
            rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") +
            "</table>";
        downloadFile("ppf-schedule.xls", html, "application/vnd.ms-excel;charset=utf-8;");
        showToast("Excel file exported.");
    });

    document.getElementById("btnPrintTable").addEventListener("click", function () {
        window.print();
    });

    document.getElementById("btnPrintResults").addEventListener("click", function () {
        window.print();
    });

    function resultSummaryText() {
        if (!lastSummary) return "";
        return [
            "PPF Calculator Result",
            "Maturity Amount: " + formatCurrency(lastSummary.maturity),
            "Total Investment: " + formatCurrency(lastSummary.totalInvestment),
            "Total Interest Earned: " + formatCurrency(lastSummary.totalInterest),
            "Wealth Gained: " + formatCurrency(lastSummary.wealthGained),
            "Duration: " + lastSummary.duration + " years",
            "Interest Rate: " + lastSummary.rate + "%"
        ].join("\n");
    }

    document.getElementById("btnCopyResults").addEventListener("click", function () {
        if (!lastSummary) { showToast("Calculate first."); return; }
        var text = resultSummaryText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast("Results copied."); });
        } else {
            showToast("Clipboard isn't supported in this browser.");
        }
    });

    document.getElementById("btnShareResults").addEventListener("click", function () {
        if (!lastSummary) { showToast("Calculate first."); return; }
        var text = resultSummaryText();
        if (navigator.share) {
            navigator.share({ title: "PPF Calculator Result", text: text }).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { showToast("Sharing isn't supported here — results copied instead."); });
        } else {
            showToast("Sharing isn't supported in this browser.");
        }
    });

    document.getElementById("btnDownloadPdf").addEventListener("click", function () {
        if (!lastSummary) { showToast("Calculate first."); return; }
        window.print();
    });

    /* ---------- history ---------- */

    function loadHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(summary) {
        var history = loadHistory();
        history.unshift({
            timestamp: new Date().toISOString(),
            yearly: summary.totalInvestment / summary.duration,
            rate: summary.rate,
            duration: summary.duration,
            maturity: summary.maturity
        });
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
            li.className = "ppf-history-item";

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ppf-history-snippet";
            btn.textContent = formatCurrency(entry.yearly) + "/yr @ " + entry.rate + "% for " + entry.duration + " yrs → " + formatCurrency(entry.maturity);
            btn.addEventListener("click", function () {
                freqYearlyRadio.checked = true;
                toggleFrequencyFields();
                yearlyInput.value = Math.round(entry.yearly);
                rateInput.value = entry.rate;
                durationSelect.value = String(entry.duration);
                calculate(true);
                showToast("Restored from history.");
            });

            var meta = document.createElement("span");
            meta.className = "ppf-history-meta";
            meta.textContent = new Date(entry.timestamp).toLocaleString();

            var removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "ppf-history-remove";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", function () {
                var updated = loadHistory();
                updated.splice(index, 1);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
                renderHistory();
            });

            li.appendChild(btn);
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

    toggleFrequencyFields();
    renderHistory();
})();
