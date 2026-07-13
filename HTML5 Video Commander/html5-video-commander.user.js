// ==UserScript==
// @name         HTML5 Video Speed Controller
// @namespace    https://github.com/Yash5320
// @version      1.4
// @description  HTML5 Video Commander
// @author       Pain
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const SPEED_STEP = 0.1;
    const MIN_SPEED = 0.1;
    const MAX_SPEED = 16;
    const FIXED_SPEED = 2.4; // Speed when pressing '\'

    let indicatorTimeout;

    // --- Create Speed/Status Indicator ---
    let speedIndicator = document.createElement('div');
    speedIndicator.id = 'videospeed-indicator';
    document.body.appendChild(speedIndicator);

    GM_addStyle(`
        #videospeed-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            font-family: sans-serif;
            font-size: 16px;
            font-weight: bold;
            z-index: 2147483647;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
            backdrop-filter: blur(2px);
        }
    `);

    // Helper: Show the OSD (On Screen Display)
    function showSpeedIndicator(value, target) {
        clearTimeout(indicatorTimeout);

        if (typeof value === 'number') {
            speedIndicator.textContent = `${value.toFixed(1)}x`;
        } else {
            speedIndicator.textContent = value;
        }

        // Ensure indicator is visible even in fullscreen mode
        const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
        if (fullscreenElement && !fullscreenElement.contains(speedIndicator)) {
            fullscreenElement.appendChild(speedIndicator);
        } else if (document.body !== speedIndicator.parentNode) {
            document.body.appendChild(speedIndicator);
        }

        speedIndicator.style.opacity = '1';
        indicatorTimeout = setTimeout(() => {
            speedIndicator.style.opacity = '0';
        }, 1500);
    }

    /**
     * Recursively finds all video elements, including those deeply nested inside Shadow DOMs.
     */
    function findAllVideos(root = document, videos = []) {
        const elements = root.querySelectorAll('*');
        for (const el of elements) {
            if (el.tagName === 'VIDEO') {
                videos.push(el);
            }
            if (el.shadowRoot) {
                findAllVideos(el.shadowRoot, videos);
            }
        }
        return videos;
    }

    function handleKeyDown(event) {
        // 1. Ignore if user is typing in a text field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) return;

        // 2. Map keys
        const key = event.key.toLowerCase();
        const isDecrease = event.key === '[';
        const isIncrease = event.key === ']';
        const isFixed = event.key === '\\';
        const isPip = key === 'p' && event.altKey;;

        if (!isDecrease && !isIncrease && !isFixed && !isPip) return;

        // 3. Find the "active" video
        // Prioritize: Playing video > Visible video
        const allVideos = findAllVideos();
        if (allVideos.length === 0) return;

        let target = allVideos.find(v => !v.paused && v.offsetWidth > 0) ||
                     allVideos.find(v => v.offsetWidth > 0);

        if (!target) return; // No visible video found

        event.preventDefault();
        event.stopPropagation();

        // 4. Handle Picture-in-Picture (PiP)
        if (isPip) {
            // A. Anti-Anti-PiP: Remove attributes sites use to block this
            if (target.hasAttribute('disablePictureInPicture')) {
                target.removeAttribute('disablePictureInPicture');
            }

            // B. Toggle Logic
            if (document.pictureInPictureElement) {
                document.exitPictureInPicture();
                showSpeedIndicator("PiP OFF", target);
            }
            // C. Standard API (Chrome, Edge, New Safari)
            else if (target.requestPictureInPicture) {
                target.requestPictureInPicture()
                    .then(() => showSpeedIndicator("PiP ON", target))
                    .catch(err => {
                        console.error("PiP Error:", err);
                        showSpeedIndicator("PiP Error (Check Console)", target);
                    });
            }
            // D. Fallback for Older Safari / WebKit
            else if (target.webkitSetPresentationMode) {
                target.webkitSetPresentationMode(target.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
                showSpeedIndicator("PiP (Safari)", target);
            }
            // E. Firefox (API not exposed to scripts)
            else {
                showSpeedIndicator("Firefox: Click icon on video", target);
            }
            return;
        }

        // 5. Handle Speed
        let newSpeed = target.playbackRate;
        if (isFixed) newSpeed = FIXED_SPEED;
        else if (isDecrease) newSpeed = Math.max(MIN_SPEED, target.playbackRate - SPEED_STEP);
        else if (isIncrease) newSpeed = Math.min(MAX_SPEED, target.playbackRate + SPEED_STEP);

        // Apply new speed
        target.playbackRate = parseFloat(newSpeed.toFixed(2));
        showSpeedIndicator(target.playbackRate, target);
    }

    document.addEventListener('keydown', handleKeyDown, true);
})();
