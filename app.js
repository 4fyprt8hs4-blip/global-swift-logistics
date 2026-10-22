"use strict";

// =========================
// MOBILE NAVIGATION
// =========================

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    mainNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            mainNav.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.textContent = "☰";
        });
    });
}


// =========================
// FOOTER YEAR
// =========================

const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}


// =========================
// SHIPMENT TRACKING FORM
// =========================

const trackingForm = document.getElementById("trackingForm");
const trackingInput = document.getElementById("trackingNumber");
const trackingMessage = document.getElementById("trackingMessage");

if (trackingForm && trackingInput && trackingMessage) {

    trackingForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const trackingNumber = trackingInput.value.trim();

        if (!trackingNumber) {
            trackingMessage.textContent =
                "Please enter your tracking number.";

            return;
        }

        // The tracking page will connect to the backend
        // when we complete the tracking system.

        const destination =
            `tracking.html?number=${encodeURIComponent(trackingNumber)}`;

        window.location.href = destination;
    });

}