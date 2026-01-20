// ==UserScript==
// @name         YouTube Shorts Enhanced Controls
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Deeply thought out layout: Dynamically anchors to the right of the video assembly to never overlap content or navigation.
// @author       Pain
// @match        *://www.youtube.com/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const PREDEFINED_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5,1.75, 2.0, 2.25, 2.5, 2.75,3.0];
    const DEFAULT_SPEED = 2.0;
    const STORAGE_KEY = 'ytShortsSpeed';
    const REFRESH_RATE = 200; // Fast refresh for smooth positioning

    // --- State ---
    let currentSpeed = GM_getValue(STORAGE_KEY, DEFAULT_SPEED);
    let isShortsPage = false;

    // --- Styles ---
    GM_addStyle(`
        #yt-shorts-speed-panel {
            position: fixed;
            z-index: 20000; /* Extremely high to stay above all YT layers */
            background: rgba(15, 15, 15, 0.92);
            padding: 12px;
            border-radius: 16px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            transition: opacity 0.2s, transform 0.1s ease-out;
            pointer-events: auto;
            backdrop-filter: blur(4px);
            opacity: 0.4; /* Dim when not in use */
        }
        #yt-shorts-speed-panel:hover { opacity: 1; }

        .speed-btn {
            background: #2b2b2b;
            color: #fff;
            border: 1px solid #444;
            padding: 10px 0;
            cursor: pointer;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            width: 62px;
            text-align: center;
            transition: all 0.15s;
        }
        .speed-btn:hover { background: #444; border-color: #777; transform: scale(1.05); }
        .speed-btn.active { background: #ff0000; color: white; border-color: #ff4d4d; box-shadow: 0 0 10px rgba(255,0,0,0.4); }

        .custom-input-container {
            grid-column: span 2;
            display: flex;
            margin-top: 4px;
        }
        .custom-input {
            width: 100%;
            background: #000;
            color: #fff;
            border: 1px solid #555;
            border-radius: 8px;
            font-size: 13px;
            text-align: center;
            padding: 8px 0;
            font-weight: bold;
        }
        .hidden-panel { display: none !important; }
    `);

    // --- Dynamic Positioning Engine ---
    function syncPanelPosition() {
        const panel = document.getElementById('yt-shorts-speed-panel');
        if (!panel || !isShortsPage) return;

        // 1. Find the active video renderer and its action buttons
        const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');
        if (!activeReel) return;

        // Anchor specifically to the right side of the "Actions" column (Like/Share/etc)
        const actionsColumn = activeReel.querySelector('#actions');
        const reelContainer = activeReel.querySelector('#short-video-container');

        if (actionsColumn && reelContainer) {
            const actionsRect = actionsColumn.getBoundingClientRect();
            const panelWidth = 160; // Approx width of our panel

            // TARGET: 15px to the right of the buttons
            let targetX = actionsRect.right + 15;
            let targetY = actionsRect.bottom - 280; // Align vertically with buttons

            // SAFETY CHECK: If it would go off-screen right
            if (targetX + panelWidth > window.innerWidth) {
                // Pin it to the far right edge instead
                targetX = window.innerWidth - panelWidth - 20;
            }

            // apply position
            panel.style.left = targetX + 'px';
            panel.style.top = targetY + 'px';
        }
    }

    // --- Speed Enforcement ---
    function getActiveShortsVideo() {
        return document.querySelector('ytd-reel-video-renderer[is-active] video.html5-main-video');
    }

    function applySpeed(video) {
        if (video && video.playbackRate !== currentSpeed) {
            video.playbackRate = currentSpeed;
        }
    }

    function setGlobalSpeed(val) {
        let speed = parseFloat(val);
        if (isNaN(speed)) return;
        currentSpeed = speed;
        GM_setValue(STORAGE_KEY, currentSpeed);

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === currentSpeed);
        });

        applySpeed(getActiveShortsVideo());
    }

    // --- UI Construction ---
    function createUI() {
        if (document.getElementById('yt-shorts-speed-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-shorts-speed-panel';
        panel.className = 'hidden-panel';

        PREDEFINED_SPEEDS.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'speed-btn';
            btn.textContent = s + 'x';
            btn.dataset.speed = s;
            if (s === currentSpeed) btn.classList.add('active');
            btn.onclick = () => setGlobalSpeed(s);
            panel.appendChild(btn);
        });

        const inputCont = document.createElement('div');
        inputCont.className = 'custom-input-container';
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.25';
        input.className = 'custom-input';
        input.placeholder = 'Custom Speed';
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                setGlobalSpeed(e.target.value);
                e.target.blur();
            }
        };
        inputCont.appendChild(input);
        panel.appendChild(inputCont);

        document.body.appendChild(panel);
    }

    // --- Logic Loop ---
    function checkNavigation() {
        const onShorts = window.location.pathname.includes('/shorts/');
        const panel = document.getElementById('yt-shorts-speed-panel');

        if (onShorts) {
            isShortsPage = true;
            if (panel) panel.classList.remove('hidden-panel');
        } else {
            isShortsPage = false;
            if (panel) panel.classList.add('hidden-panel');
        }
    }

    // Main interval: Handles speed enforcement AND positioning
    setInterval(() => {
        if (isShortsPage) {
            applySpeed(getActiveShortsVideo());
            syncPanelPosition();
        }
    }, REFRESH_RATE);

    // Trap loops/swipes
    document.addEventListener('play', (e) => {
        if (isShortsPage && e.target.tagName === 'VIDEO') {
            applySpeed(e.target);
        }
    }, true);

    // Initialize
    createUI();
    checkNavigation();

    // Listen for YouTube's weird internal navigation
    const navObserver = new MutationObserver(checkNavigation);
    navObserver.observe(document.head, { childList: true });
    window.addEventListener('popstate', checkNavigation);
    window.addEventListener('yt-navigate-finish', checkNavigation);
    window.addEventListener('resize', syncPanelPosition);

})();
