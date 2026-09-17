/* Roadmap Stepper - interactive stepper with a step-detail panel that always
   sits directly below it, plus a small floating popup for individual topic
   descriptions. The first step opens by default, and visiting any step marks
   it completed. Progress is tracked client-side (per browser) in
   localStorage against the real steps rendered from the backend - nothing
   here is hardcoded, and no extra network/API calls are made. */

(function () {
    "use strict";

    var section = document.getElementById("rmsSection");
    if (!section) return;

    function $(id) { return document.getElementById(id); }
    function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    var slug = section.getAttribute("data-roadmap-slug") || "roadmap";
    var STORAGE_KEY = "tgbRoadmapProgress:" + slug;

    var steps = qsa(".rms-step", section);
    var total = steps.length;

    var detail = $("rmsDetail");
    var detailContent = $("rmsDetailContent");
    var detailEyebrow = $("rmsDetailEyebrow");
    var detailTitle = $("rmsDetailTitle");
    var detailMeta = $("rmsDetailMeta");
    var detailBody = $("rmsDetailBody");
    var detailTopicsWrap = $("rmsDetailTopicsWrap");
    var detailTopics = $("rmsDetailTopics");
    var topicsHint = $("rmsTopicsHint");

    var progressFill = $("rmsProgressBarFill");
    var progressPct = $("rmsProgressPct");
    var progressWrap = $("rmsProgressBarWrap");

    var topicPopup = $("rmsTopicPopup");
    var topicPopupArrow = $("rmsTopicPopupArrow");
    var topicPopupInner = $("rmsTopicPopupInner");

    var selectedStep = null;
    var activeTopicBtn = null;
    var topicPinned = false;
    var topicHideTimer = null;
    var supportsHover = !window.matchMedia || window.matchMedia("(any-hover: hover)").matches;

    /* ---------- progress storage ---------- */

    function getCompleted() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch (e) { return []; }
    }
    function setCompleted(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { }
    }
    function isCompleted(id, completed) { return completed.indexOf(id) !== -1; }

    /* ---------- render step states ---------- */

    function renderSteps() {
        var completed = getCompleted();
        var completedCount = 0;
        var currentAssigned = false;

        steps.forEach(function (step) {
            var id = step.getAttribute("data-step-id");
            var done = isCompleted(id, completed);
            step.classList.remove("is-completed", "is-current", "is-upcoming");

            if (done) {
                completedCount++;
                step.classList.add("is-completed");
            } else if (!currentAssigned) {
                step.classList.add("is-current");
                currentAssigned = true;
            } else {
                step.classList.add("is-upcoming");
            }
        });

        var pct = total ? Math.round((completedCount / total) * 100) : 0;
        if (progressFill) progressFill.style.width = pct + "%";
        if (progressPct) progressPct.textContent = pct + "%";
        if (progressWrap) progressWrap.setAttribute("aria-valuenow", String(pct));

        // keep the open detail panel's status/CTA in sync if state changed elsewhere
        if (selectedStep) fillDetail(selectedStep);
    }

    function statusOf(step) {
        if (step.classList.contains("is-completed")) return "completed";
        if (step.classList.contains("is-current")) return "current";
        return "upcoming";
    }
    function statusLabel(status) {
        return status === "completed" ? "Completed" : (status === "current" ? "In Progress" : "Upcoming");
    }

    /* ---------- mark a step completed just by visiting it ---------- */

    function visitStep(step) {
        var id = step.getAttribute("data-step-id");
        var list = getCompleted();
        if (list.indexOf(id) === -1) {
            list.push(id);
            setCompleted(list);
            renderSteps();
        }
    }

    /* ---------- detail panel content ---------- */

    function fillDetail(step) {
        var index = parseInt(step.getAttribute("data-step-index"), 10);
        var stepTotal = parseInt(step.getAttribute("data-step-total"), 10) || total;
        var title = step.getAttribute("data-step-title") || "";
        var pct = stepTotal ? Math.round((index / stepTotal) * 100) : 0;
        var status = statusOf(step);
        var tpl = step.querySelector(".rms-step-data");

        detailEyebrow.textContent = "Step " + index + " of " + stepTotal;
        detailTitle.textContent = title;

        detailMeta.innerHTML =
            '<span class="rms-detail-chip status-' + status + '">' + statusLabel(status) + "</span>" +
            '<span class="rms-detail-chip">' + pct + "% through roadmap</span>";

        var hasTopics = false;

        if (tpl) {
            var frag = tpl.content.cloneNode(true);
            var descEl = frag.querySelector(".rms-detail-description");
            var topicsEl = frag.querySelector(".rms-detail-topics-source");

            detailBody.innerHTML = "";
            if (descEl && descEl.innerHTML.trim()) {
                detailBody.innerHTML = descEl.innerHTML;
                detailBody.hidden = false;
            } else {
                detailBody.hidden = true;
            }

            if (topicsEl && topicsEl.children.length) {
                detailTopics.innerHTML = topicsEl.innerHTML;
                detailTopicsWrap.hidden = false;
                hasTopics = true;
            } else {
                detailTopicsWrap.hidden = true;
            }
        } else {
            detailBody.hidden = true;
            detailTopicsWrap.hidden = true;
        }

        if (hasTopics) wireTopicButtons();
    }

    /* ---------- select a step (there is no "closed" state - a step is always shown) ---------- */

    function selectStep(step, scrollTo) {
        closeTopicPopup(false);

        var isNewlyOpened = selectedStep !== step;
        if (selectedStep && selectedStep !== step) {
            selectedStep.classList.remove("is-open");
            selectedStep.querySelector(".rms-step-node").setAttribute("aria-expanded", "false");
        }
        selectedStep = step;
        step.classList.add("is-open");
        step.querySelector(".rms-step-node").setAttribute("aria-expanded", "true");

        fillDetail(step);
        // Restart the entrance animation on every selection change.
        detailContent.classList.remove("rms-detail--pulse");
        void detailContent.offsetWidth; // force reflow so the animation re-triggers
        detailContent.classList.add("rms-detail--pulse");

        if (scrollTo) {
            detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        // Visiting a step is enough to mark it complete.
        if (isNewlyOpened) visitStep(step);
    }

    /* ---------- topic popup: positioning ---------- */

    function positionTopicPopup(anchorEl) {
        var anchorRect = anchorEl.getBoundingClientRect();
        var popupRect = topicPopup.getBoundingClientRect();
        var pw = popupRect.width || 300;
        var ph = popupRect.height || 120;
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var gap = 10;

        if (vw <= 700) {
            var top = clamp(anchorRect.bottom + gap, 8, vh - ph - 8);
            topicPopup.style.top = top + "px";
            topicPopup.style.left = "1.6rem";
            topicPopup.setAttribute("data-placement", "bottom");
            topicPopupArrow.style.left = "";
            return;
        }

        var spaceAbove = anchorRect.top;
        var spaceBelow = vh - anchorRect.bottom;
        var placement = (spaceBelow >= ph + gap || spaceBelow >= spaceAbove) ? "bottom" : "top";

        var top2 = placement === "bottom" ? (anchorRect.bottom + gap) : (anchorRect.top - ph - gap);
        top2 = clamp(top2, 8, vh - ph - 8);

        var centerX = anchorRect.left + anchorRect.width / 2;
        var left = clamp(centerX - pw / 2, 16, vw - pw - 16);

        topicPopup.style.top = top2 + "px";
        topicPopup.style.left = left + "px";
        topicPopup.setAttribute("data-placement", placement);

        var arrowX = clamp(centerX - left, 18, pw - 18);
        topicPopupArrow.style.left = arrowX + "px";
    }

    /* ---------- topic popup: open / close ---------- */

    function openTopicPopup(btn, pin) {
        var li = btn.closest("li");
        var tpl = li && li.querySelector(".rms-topic-data");
        if (!tpl) return;

        clearTimeout(topicHideTimer);
        if (activeTopicBtn && activeTopicBtn !== btn) activeTopicBtn.classList.remove("is-active");
        activeTopicBtn = btn;
        topicPinned = !!pin;
        btn.classList.add("is-active");
        btn.setAttribute("aria-expanded", "true");

        topicPopupInner.innerHTML = "";
        topicPopupInner.appendChild(tpl.content.cloneNode(true));

        topicPopup.hidden = false;
        topicPopup.style.left = topicPopup.style.left || "-9999px";
        requestAnimationFrame(function () {
            positionTopicPopup(btn);
            topicPopup.classList.add("is-visible");
        });
    }

    function closeTopicPopup(returnFocus) {
        if (!activeTopicBtn) return;
        var btn = activeTopicBtn;
        btn.classList.remove("is-active");
        btn.setAttribute("aria-expanded", "false");
        topicPopup.classList.remove("is-visible");
        topicPinned = false;
        activeTopicBtn = null;
        setTimeout(function () { if (!activeTopicBtn) topicPopup.hidden = true; }, 150);
        if (returnFocus) btn.focus();
    }

    function scheduleTopicHide() {
        clearTimeout(topicHideTimer);
        topicHideTimer = setTimeout(function () {
            if (!topicPinned) closeTopicPopup(false);
        }, 160);
    }

    /* ---------- wire up topic buttons (re-run every time detail content changes) ---------- */

    function wireTopicButtons() {
        var items = qsa(".rms-detail-topics li", detailTopics);
        var anyHasInfo = false;

        items.forEach(function (li) {
            var btn = li.querySelector(".rms-topic-btn");
            var tpl = li.querySelector(".rms-topic-data");
            if (!btn || !tpl) return;

            anyHasInfo = true;
            btn.classList.add("has-info");
            btn.setAttribute("aria-haspopup", "true");
            btn.setAttribute("aria-expanded", "false");

            if (supportsHover) {
                btn.addEventListener("mouseenter", function () { openTopicPopup(btn, false); });
                btn.addEventListener("mouseleave", scheduleTopicHide);
                btn.addEventListener("focus", function () { openTopicPopup(btn, false); });
                btn.addEventListener("blur", scheduleTopicHide);
            }
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                if (activeTopicBtn === btn && topicPinned) { closeTopicPopup(false); return; }
                openTopicPopup(btn, true);
            });
        });

        if (topicsHint) topicsHint.hidden = !anyHasInfo;
    }

    topicPopup.addEventListener("mouseenter", function () { clearTimeout(topicHideTimer); });
    topicPopup.addEventListener("mouseleave", scheduleTopicHide);

    var topicResizeRaf = null;
    window.addEventListener("resize", function () {
        if (!activeTopicBtn) return;
        cancelAnimationFrame(topicResizeRaf);
        topicResizeRaf = requestAnimationFrame(function () { positionTopicPopup(activeTopicBtn); });
    });
    window.addEventListener("scroll", function () {
        if (!activeTopicBtn) return;
        cancelAnimationFrame(topicResizeRaf);
        topicResizeRaf = requestAnimationFrame(function () { positionTopicPopup(activeTopicBtn); });
    }, { passive: true });

    /* ---------- step events ---------- */

    steps.forEach(function (step) {
        var node = step.querySelector(".rms-step-node");

        node.addEventListener("click", function (e) {
            e.preventDefault();
            selectStep(step, true);
        });
    });

    // Only the topic popup is dismissible (hover/focus tooltip); the step
    // detail panel itself has no close action - clicking outside it, or
    // pressing Escape with no topic popup open, intentionally does nothing.
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && activeTopicBtn) closeTopicPopup(true);
    });

    document.addEventListener("click", function (e) {
        if (activeTopicBtn && !topicPopup.contains(e.target) && !activeTopicBtn.contains(e.target)) {
            closeTopicPopup(false);
        }
    });

    /* ---------- init ---------- */

    renderSteps();
    if (steps.length) selectStep(steps[0], false);
})();
