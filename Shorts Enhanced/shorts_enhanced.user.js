// ==UserScript==
// @name         YouTube Shorts Enhanced Controls (Movable)
// @namespace    https://github.com/Yash5320
// @version      7.1
// @description  Movable UI that remembers its position. Fixes immediate speed application and adds a redirect button. Includes auto-scroll option.
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
    const PREDEFINED_SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];
    const DEFAULT_SPEED = 2.0;
    const SPEED_KEY = 'ytShortsSpeed';
    const POS_KEY = 'ytShortsPanelPos';
    const SCROLL_KEY = 'ytShortsAutoScroll';
    const REFRESH_RATE = 200;

    // --- State ---
    let currentSpeed = GM_getValue(SPEED_KEY, DEFAULT_SPEED);
    let isAutoScrollEnabled = GM_getValue(SCROLL_KEY, false);
    let panelPos = GM_getValue(POS_KEY, { left: '80%', top: '20%' }); // Default if no save found
    let isShortsPage = false;
    let lastActiveSrc = '';
    let isScrolling = false;
    let lastScrollTime = 0;

    // --- Styles ---
    GM_addStyle(`
        #yt-shorts-speed-panel {
            position: fixed;
            z-index: 20000;
            background: rgba(15, 15, 15, 0.95);
            padding: 12px;
            border-radius: 16px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            pointer-events: auto;
            backdrop-filter: blur(4px);
            opacity: 0.6;
            cursor: move; /* Indicates it can be dragged */
            user-select: none; /* Prevents text highlighting while dragging */
            touch-action: none;
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
            transition: background 0.15s;
        }
        .speed-btn:hover { background: #444; border-color: #777; }
        .speed-btn.active { background: #ff0000; color: white; border-color: #ff4d4d; }

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

        /* Redirect Button Styling */
        .redirect-btn {
            grid-column: span 2;
            background: #cc181e;
            color: #fff;
            border: 1px solid #ff4d4d;
            padding: 8px 0;
            cursor: pointer;
            border-radius: 8px;
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin-top: 4px;
            transition: background 0.15s;
        }
        .redirect-btn:hover { background: #ff0000; }

        /* Scroll Button Styling */
        .scroll-btn {
            grid-column: span 2;
            background: #2b2b2b;
            color: #fff;
            border: 1px solid #444;
            padding: 8px 0;
            cursor: pointer;
            border-radius: 8px;
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            margin-top: 4px;
            transition: background 0.15s;
        }
        .scroll-btn:hover { background: #444; border-color: #777; }
        .scroll-btn.active { background: #0f9d58; color: white; border-color: #12b76a; }

        .hidden-panel { display: none !important; }
    `);

    // --- Speed Enforcement ---
    function getActiveShortsVideo() {
        // Find the reel container that is active
        const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]') ||
                           document.querySelector('ytd-reel-video-renderer.is-active');
        if (activeReel) {
            const video = activeReel.querySelector('video');
            if (video) return video;
        }

        // Fallback 1: Scan reels and find the one most visible in the viewport
        const reels = document.querySelectorAll('ytd-reel-video-renderer');
        for (const reel of reels) {
            const rect = reel.getBoundingClientRect();
            // Active reel's top is typically near the top of the viewport or occupies the center
            if (rect.top >= -100 && rect.top < window.innerHeight / 2) {
                const video = reel.querySelector('video');
                if (video) return video;
            }
        }

        // Fallback 2: Find the video that is currently playing
        const playingVideo = Array.from(document.querySelectorAll('video')).find(v => !v.paused && v.currentTime > 0);
        if (playingVideo) return playingVideo;

        // Last-resort fallback
        return document.querySelector('video');
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
        GM_setValue(SPEED_KEY, currentSpeed);

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === currentSpeed);
        });

        // Apply to ALL videos in the DOM immediately so the change is instant
        document.querySelectorAll('video').forEach(video => {
            video.playbackRate = currentSpeed;
        });
    }

    // --- Auto Scroll Logic ---
    function scrollToNextShort(video) {
        const now = Date.now();
        // Prevent scrolling if we initiated a scroll in the last 2 seconds
        if (isScrolling && (now - lastScrollTime < 2000)) return;

        isScrolling = true;
        lastScrollTime = now;

        // Try navigating using YouTube's built-in scroll buttons
        const nextBtn = document.querySelector('#navigation-button-down button') ||
                        document.querySelector('#navigation-button-down yt-button-shape button') ||
                        document.querySelector('ytd-shorts #navigation-button-down button') ||
                        document.querySelector('button[aria-label="Next video"]') ||
                        document.querySelector('button[aria-label="Next"]');
        if (nextBtn) {
            nextBtn.click();
        } else {
            // Fallback: Dispatch an ArrowDown keypress event to the active element or document
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                which: 40,
                bubbles: true,
                cancelable: true
            });
            (document.activeElement || document).dispatchEvent(event);
        }
    }

    function checkAutoScroll(video) {
        if (!video) return;

        if (isAutoScrollEnabled) {
            // Force disable looping on every check to combat YouTube dynamically re-enabling it
            if (video.loop || video.hasAttribute('loop')) {
                video.loop = false;
                video.removeAttribute('loop');
            }

            // Bind native end event listener
            if (!video.dataset.scrollListenerAdded) {
                video.dataset.scrollListenerAdded = 'true';
                video.addEventListener('ended', () => {
                    if (isAutoScrollEnabled) {
                        scrollToNextShort(video);
                    }
                });
            }

            // Fallback: Check if current video has completed or is within 0.25 seconds of ending
            const hasValidDuration = typeof video.duration === 'number' && !isNaN(video.duration);
            const isNearEnd = hasValidDuration && video.currentTime >= (video.duration - 0.25);
            if (video.ended || (isNearEnd && !video.paused)) {
                scrollToNextShort(video);
            }
        } else {
            // Restore native loop behavior if the auto-scroll feature is turned off
            if (!video.loop && !video.ended) {
                video.loop = true;
                video.setAttribute('loop', '');
            }
        }
    }

    // --- Redirect Logic ---
    function redirectToRegularVideo() {
        const currentUrl = window.location.href;
        const match = currentUrl.match(/\/shorts\/([a-zA-Z0-9_-]+)/);

        if (match && match[1]) {
            const videoId = match[1];
            const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
            window.location.href = newUrl;
        }
    }

    // --- Dragging Logic ---
    function makeMovable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        el.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            // Prevent dragging when clicking buttons or inputs using classList checks
            if (
                e.target.classList.contains('speed-btn') ||
                e.target.classList.contains('custom-input') ||
                e.target.classList.contains('redirect-btn') ||
                e.target.classList.contains('scroll-btn')
            ) return;

            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = el.offsetTop - pos2;
            let newLeft = el.offsetLeft - pos1;

            el.style.top = newTop + "px";
            el.style.left = newLeft + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;

            GM_setValue(POS_KEY, {
                top: el.style.top,
                left: el.style.left
            });
        }
    }

    // --- UI Construction ---
    function createUI() {
        if (document.getElementById('yt-shorts-speed-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'yt-shorts-speed-panel';
        panel.className = 'hidden-panel';

        panel.style.left = panelPos.left;
        panel.style.top = panelPos.top;

        PREDEFINED_SPEEDS.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'speed-btn';
            btn.textContent = s + 'x';
            btn.dataset.speed = s;
            if (s === currentSpeed) btn.classList.add('active');
            btn.onclick = (e) => { e.stopPropagation(); setGlobalSpeed(s); };
            panel.appendChild(btn);
        });

        // Custom Speed Input
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

        // Auto Scroll Toggle Button
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-btn';
        if (isAutoScrollEnabled) {
            scrollBtn.classList.add('active');
            scrollBtn.textContent = 'Auto Scroll: ON';
        } else {
            scrollBtn.textContent = 'Auto Scroll: OFF';
        }
        scrollBtn.onclick = (e) => {
            e.stopPropagation();
            isAutoScrollEnabled = !isAutoScrollEnabled;
            GM_setValue(SCROLL_KEY, isAutoScrollEnabled);
            scrollBtn.classList.toggle('active', isAutoScrollEnabled);
            scrollBtn.textContent = isAutoScrollEnabled ? 'Auto Scroll: ON' : 'Auto Scroll: OFF';

            // Refresh loop adjustments immediately on active video
            const video = getActiveShortsVideo();
            if (video) {
                checkAutoScroll(video);
            }
        };
        panel.appendChild(scrollBtn);

        // Redirect to Normal Video Button
        const redirectBtn = document.createElement('button');
        redirectBtn.className = 'redirect-btn';
        redirectBtn.textContent = 'Open as Video';
        redirectBtn.onclick = (e) => {
            e.stopPropagation();
            redirectToRegularVideo();
        };
        panel.appendChild(redirectBtn);

        document.body.appendChild(panel);
        makeMovable(panel);
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

    setInterval(() => {
        if (isShortsPage) {
            const video = getActiveShortsVideo();
            if (video) {
                const currentSrc = video.currentSrc || video.src;
                if (currentSrc !== lastActiveSrc) {
                    lastActiveSrc = currentSrc;
                    isScrolling = false; // Reset scroll lock immediately when a new video actually starts
                }
                applySpeed(video);
                checkAutoScroll(video);
            }
        }
    }, REFRESH_RATE);

    document.addEventListener('play', (e) => {
        if (isShortsPage && e.target.tagName === 'VIDEO') {
            applySpeed(e.target);
            checkAutoScroll(e.target);
        }
    }, true);

    createUI();
    checkNavigation();

    const navObserver = new MutationObserver(checkNavigation);
    navObserver.observe(document.head, { childList: true });
    window.addEventListener('popstate', checkNavigation);
    window.addEventListener('yt-navigate-finish', checkNavigation);
})();
