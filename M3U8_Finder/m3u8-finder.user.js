// ==UserScript==
// @name         Universal Stream & Subtitle Finder
// @namespace    https://github.com/Yash5320
// @version      3.3.0
// @description  Detects M3U8, MP4 (filtered by size), and Subtitles. Features a modern glassmorphic UI, shimmer effects, drag-to-move support, and a persistent clipboard downloader with VLC streaming.
// @author       Pain
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNMCAwaDQ4djQ4SDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTQyIDZINGMtMS4xIDAtMiAuOS0yIDJ2MjRjMCAxLjEuOSAyIDIgMmgxNHY0SDIwdjRoOHYtNGgtNHYtNEg0MlY4YzAtMS4xLS45LTItMi0yeiBtMCAyNkgyMFY4aDIyVjMyem0tOC0xMUwyMiAxMy41djExTDM0IDIxWiIvPjwvc3ZnPg==
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const MIN_MP4_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    const foundUrls = new Set();
    let uiContainer = null;
    let toggleButton = null;
    let toggleWrapper = null;

    // --- STYLES (Magic UI Aesthetic) ---
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght=400;500;600;700&display=swap');

        :root {
            --msf-bg: rgba(15, 15, 17, 0.75);
            --msf-border: rgba(255, 255, 255, 0.1);
            --msf-text: #ededed;
            --msf-muted: #a1a1aa;
            --msf-accent: #3b82f6;
        }

        /* Main Container */
        #msf-container {
            position: fixed;
            z-index: 2147483647;
            background: var(--msf-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--msf-border);
            border-radius: 16px;
            padding: 16px;
            color: var(--msf-text);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
            width: 340px;
            max-height: 65vh;
            display: flex;
            flex-direction: column;
            gap: 12px;

            /* Animation */
            opacity: 0;
            transform: translateY(10px) scale(0.96);
            pointer-events: none;
            transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #msf-container.msf-show {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        /* Scrollbar */
        #msf-scroll-area {
            overflow-y: auto;
            max-height: calc(65vh - 50px);
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-right: 4px;
        }
        #msf-scroll-area::-webkit-scrollbar { width: 4px; }
        #msf-scroll-area::-webkit-scrollbar-track { background: transparent; }
        #msf-scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }

        /* Toggle Button */
        #msf-toggle-wrapper {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483647;
            touch-action: none; /* Helps with mobile dragging */
        }
        .msf-toggle-glow {
            position: absolute;
            inset: 0;
            background: conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg);
            filter: blur(12px);
            opacity: 0.5;
            border-radius: 50%;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        #msf-toggle-wrapper:hover .msf-toggle-glow { opacity: 0.8; }

        #msf-toggle-btn {
            position: relative;
            background: rgba(20, 20, 22, 0.9);
            backdrop-filter: blur(8px);
            border: 1px solid var(--msf-border);
            color: white;
            border-radius: 50%;
            width: 52px;
            height: 52px;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #msf-toggle-btn:active { cursor: grabbing; transform: scale(0.95); }
        #msf-toggle-btn svg { width: 22px; height: 22px; stroke: #fff; pointer-events: none; }

        /* Bulletproof isolated Badge CSS */
        .msf-badge {
            position: absolute !important;
            top: 0 !important;
            right: 0 !important;
            transform: translate(25%, -25%) !important;
            background: #ef4444 !important;
            color: white !important;
            border-radius: 20px !important;
            min-width: 22px !important;
            height: 22px !important;
            padding: 0 6px !important;
            margin: 0 !important;
            font-size: 11px !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            font-weight: 700 !important;
            line-height: 1 !important;
            letter-spacing: normal !important;
            border: 2px solid #141416 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5) !important;
            z-index: 10 !important;
            pointer-events: none !important;
        }

        /* Header */
        .msf-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--msf-border);
        }
        .msf-header h4 { margin: 0; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .msf-header-icon { color: var(--msf-accent); }
        .msf-close {
            background: transparent; border: none; color: var(--msf-muted);
            cursor: pointer; padding: 4px; border-radius: 6px; display: flex;
            transition: background 0.2s, color 0.2s;
        }
        .msf-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* Clipboard Widget */
        .msf-quick-dl-section {
            background: rgba(255, 255, 255, 0.04);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 4px;
        }
        .msf-quick-dl-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--msf-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
        }
        .msf-input-wrapper {
            display: flex;
            gap: 6px;
        }
        .msf-input-field {
            flex: 1;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid var(--msf-border);
            border-radius: 8px;
            padding: 8px 10px;
            color: var(--msf-text);
            font-size: 12px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .msf-input-field:focus {
            border-color: var(--msf-accent);
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
        }
        .msf-btn-dl {
            background: var(--msf-accent) !important;
            border-color: rgba(59, 130, 246, 0.4) !important;
        }
        .msf-btn-dl:hover {
            background: #2563eb !important;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.4) !important;
        }
        .msf-status-msg {
            font-size: 10px;
            margin-top: 2px;
            font-family: inherit;
            font-weight: 500;
        }

        /* Entries */
        .msf-entry {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 12px;
            transition: transform 0.2s, background 0.2s;
        }
        .msf-entry:hover { background: rgba(255, 255, 255, 0.06); }

        .msf-entry-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }

        .msf-type-badge {
            font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .msf-type-m3u8 { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
        .msf-type-mp4 { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .msf-type-sub { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

        .msf-entry-size { font-size: 11px; color: var(--msf-muted); font-weight: 500; }

        /* Buttons */
        .msf-btn-group { display: flex; gap: 8px; }
        .msf-btn {
            flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
            color: #fff; font-size: 12px; font-weight: 500; padding: 8px; border-radius: 8px;
            cursor: pointer; text-decoration: none; transition: all 0.2s;
        }
        .msf-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
        .msf-btn svg { width: 14px; height: 14px; }

        /* Shimmer Effect for Copy Button */
        @keyframes msf-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .msf-btn-copy {
            background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.03) 75%);
            background-size: 200% 100%;
            animation: msf-shimmer 3s infinite linear;
            border-color: rgba(255,255,255,0.15);
        }
        .msf-btn-copy:hover { border-color: #60a5fa; box-shadow: 0 0 12px rgba(59,130,246,0.25); color: #60a5fa; }
        .msf-btn-down:hover { border-color: #f87171; box-shadow: 0 0 12px rgba(248,113,113,0.25); color: #f87171; }
        .msf-btn-open:hover { border-color: #34d399; box-shadow: 0 0 12px rgba(52,211,153,0.25); color: #34d399; }
        .msf-btn-vlc:hover { border-color: #f97316; box-shadow: 0 0 12px rgba(249,115,22,0.25); color: #f97316; }
    `);

    // --- UTILS ---
    function sanitizeFilename(name) { return name.replace(/[\\/:\*\?"<>\|]/g, '_').trim().replace(/^\.+|\.+$/g, '') || 'video'; }
    function formatBytes(bytes, decimals = 1) {
        if (!bytes || bytes === 0) return 'Unknown Size';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes =['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // --- UI LOGIC ---
    function updateBadgeCount() {
        if (!toggleButton) return;
        const count = foundUrls.size;
        const badge = toggleButton.querySelector('.msf-badge');
        if (count > 0) {
            badge.style.setProperty('display', 'flex', 'important');
            badge.textContent = count;
        } else {
            badge.style.setProperty('display', 'none', 'important');
        }
    }

    function updateContainerPosition() {
        if (!toggleWrapper || !uiContainer) return;

        const btnRect = toggleWrapper.getBoundingClientRect();
        const containerWidth = 340;
        const containerHeight = uiContainer.offsetHeight || 300;
        const gap = 15;

        let top = btnRect.top - containerHeight - gap;
        let left = btnRect.left - containerWidth + btnRect.width;

        if (top < 10) {
            top = btnRect.bottom + gap;
        }
        if (left < 10) {
            left = 10;
        }
        if (left + containerWidth > window.innerWidth - 10) {
            left = window.innerWidth - containerWidth - 10;
        }

        uiContainer.style.top = `${top}px`;
        uiContainer.style.left = `${left}px`;
        uiContainer.style.bottom = 'auto';
        uiContainer.style.right = 'auto';
    }

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;
        let hasDragged = false;

        handle.onmousedown = dragMouseDown;
        handle.ontouchstart = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            pos3 = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            pos4 = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

            isDragging = true;
            hasDragged = false;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;

            if(e.type !== 'touchstart') e.preventDefault();
        }

        function elementDrag(e) {
            if (!isDragging) return;
            e = e || window.event;

            let clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            let clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

            let dx = pos3 - clientX;
            let dy = pos4 - clientY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasDragged = true;
                if(e.type === 'touchmove') e.preventDefault();
            }

            if (hasDragged) {
                const rect = element.getBoundingClientRect();

                pos1 = pos3 - clientX;
                pos2 = pos4 - clientY;
                pos3 = clientX;
                pos4 = clientY;

                let newTop = rect.top - pos2;
                let newLeft = rect.left - pos1;

                newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));

                element.style.top = newTop + "px";
                element.style.left = newLeft + "px";
                element.style.right = 'auto';
                element.style.bottom = 'auto';

                if (uiContainer && uiContainer.classList.contains('msf-show')) {
                    updateContainerPosition();
                }
            }
        }

        function closeDragElement() {
            isDragging = false;
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }

        handle.onclick = (e) => {
            if (hasDragged) {
                e.preventDefault();
                e.stopPropagation();
                hasDragged = false;
                return;
            }
            uiContainer.classList.toggle('msf-show');
            if (uiContainer.classList.contains('msf-show')) {
                updateContainerPosition();
            }
        };
    }

    function createQuickDownloadPanel() {
        const panel = document.createElement('div');
        panel.className = 'msf-quick-dl-section';
        panel.innerHTML = `
            <div class="msf-quick-dl-title">Clipboard Downloader</div>
            <button class="msf-btn msf-btn-copy msf-btn-dl-clipboard" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Read & Download Clipboard
            </button>
            <div class="msf-input-wrapper">
                <input type="text" class="msf-input-field" placeholder="Or paste download URL here..." />
                <button class="msf-btn msf-btn-dl msf-btn-quick-dl" style="flex: 0 0 auto; width: 40px; padding: 8px 0;" title="Download entered URL">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </div>
            <div class="msf-status-msg" style="display: none;"></div>
        `;

        const clipboardBtn = panel.querySelector('.msf-btn-dl-clipboard');
        const inputField = panel.querySelector('.msf-input-field');
        const quickDlBtn = panel.querySelector('.msf-btn-quick-dl');
        const statusMsg = panel.querySelector('.msf-status-msg');

        const showStatus = (text, isError = false) => {
            statusMsg.textContent = text;
            statusMsg.style.color = isError ? '#f87171' : '#34d399';
            statusMsg.style.display = 'block';
            setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
        };

        const triggerDownload = (url) => {
            let cleanUrl = url.trim();
            if (!cleanUrl) {
                showStatus('Please enter a URL first!', true);
                return;
            }
            if (!/^https?:\/\//i.test(cleanUrl)) {
                showStatus('Invalid protocol. Must start with http:// or https://', true);
                return;
            }

            const filename = sanitizeFilename(document.title || 'video');
            const dlLink = document.createElement('a');
            dlLink.href = `down:${cleanUrl}|${filename}`;
            dlLink.target = '_blank';
            document.body.appendChild(dlLink);
            dlLink.click();
            document.body.removeChild(dlLink);
            showStatus('Download command sent!');
        };

        clipboardBtn.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && /^https?:\/\//i.test(text.trim())) {
                    triggerDownload(text);
                } else if (!text) {
                    showStatus('Clipboard is empty!', true);
                    inputField.focus();
                } else {
                    showStatus('Clipboard content is not a valid HTTP/HTTPS link.', true);
                    inputField.value = text.trim();
                    inputField.focus();
                }
            } catch (err) {
                showStatus('Permission denied. Please paste link manually below.', true);
                inputField.focus();
            }
        };

        quickDlBtn.onclick = () => {
            triggerDownload(inputField.value);
        };

        inputField.onkeydown = (e) => {
            if (e.key === 'Enter') {
                triggerDownload(inputField.value);
            }
        };

        return panel;
    }

    function createUI() {
        if (uiContainer || window.self !== window.top) return;

        // Create Toggle Wrapper
        toggleWrapper = document.createElement('div');
        toggleWrapper.id = 'msf-toggle-wrapper';

        const toggleGlow = document.createElement('div');
        toggleGlow.className = 'msf-toggle-glow';

        toggleButton = document.createElement('div');
        toggleButton.id = 'msf-toggle-btn';
        toggleButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <polygon points="10 8 14 11 10 14 10 8"></polygon>
            </svg>
            <div class="msf-badge" style="display: none;">0</div>
        `;

        toggleWrapper.appendChild(toggleGlow);
        toggleWrapper.appendChild(toggleButton);
        document.body.appendChild(toggleWrapper);

        // Create List Container
        uiContainer = document.createElement('div');
        uiContainer.id = 'msf-container';

        const header = document.createElement('div');
        header.className = 'msf-header';
        header.innerHTML = `
            <h4>
                <svg class="msf-header-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Media Detected
            </h4>
            <button class="msf-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        header.querySelector('.msf-close').onclick = () => uiContainer.classList.remove('msf-show');
        uiContainer.appendChild(header);

        const scrollArea = document.createElement('div');
        scrollArea.id = 'msf-scroll-area';

        // Add persistent Clipboard Panel to the top
        const quickDlPanel = createQuickDownloadPanel();
        scrollArea.appendChild(quickDlPanel);

        // Sub-container for dynamically detected files
        const detectedArea = document.createElement('div');
        detectedArea.id = 'msf-detected-entries';
        detectedArea.style.display = 'flex';
        detectedArea.style.flexDirection = 'column';
        detectedArea.style.gap = '10px';
        scrollArea.appendChild(detectedArea);

        uiContainer.appendChild(scrollArea);
        document.body.appendChild(uiContainer);

        makeDraggable(toggleWrapper, toggleButton);
        window.addEventListener('resize', () => {
            if (uiContainer.classList.contains('msf-show')) updateContainerPosition();
        });

        updateBadgeCount();
    }

    function addEntryToUI(url, type, sizeBytes = 0) {
        if (window.self !== window.top) {
            window.parent.postMessage({ type: 'stream-finder-found', url, entryType: type, sizeBytes }, '*');
            return;
        }

        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => addEntryToUI(url, type, sizeBytes));
            return;
        }
        createUI();
        updateBadgeCount();

        const detectedArea = document.getElementById('msf-detected-entries');
        if (!detectedArea) return;

        const entryDiv = document.createElement('div');
        entryDiv.className = 'msf-entry';

        let typeClass = '', typeLabel = '';
        if (type === 'm3u8') { typeClass = 'msf-type-m3u8'; typeLabel = 'M3U8'; }
        else if (type === 'mp4') { typeClass = 'msf-type-mp4'; typeLabel = 'MP4'; }
        else if (type === 'subtitle') { typeClass = 'msf-type-sub'; typeLabel = 'SUB'; }

        const sizeText = sizeBytes > 0 ? formatBytes(sizeBytes) : '';

        const topRow = document.createElement('div');
        topRow.className = 'msf-entry-top';
        topRow.innerHTML = `
            <span class="msf-type-badge ${typeClass}">${typeLabel}</span>
            <span class="msf-entry-size">${sizeText}</span>
        `;

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'msf-btn-group';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'msf-btn msf-btn-copy';
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
        copyBtn.onclick = () => {
            GM_setClipboard(url);
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
            setTimeout(() => {
                copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
            }, 2000);
        };
        buttonGroup.appendChild(copyBtn);

        if (type === 'm3u8' || type === 'mp4') {
            const dlLink = document.createElement('a');
            dlLink.className = 'msf-btn msf-btn-down';
            dlLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> DOWN`;
            dlLink.href = `down:${url}|${sanitizeFilename(document.title)}`;
            dlLink.target = '_blank';
            buttonGroup.appendChild(dlLink);

            // Watch in VLC Button
            const vlcLink = document.createElement('a');
            vlcLink.className = 'msf-btn msf-btn-vlc';
            vlcLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> VLC`;
            vlcLink.href = `vlc-stream:${url}`;
            vlcLink.target = '_blank';
            buttonGroup.appendChild(vlcLink);
        } else if (type === 'subtitle') {
            const openLink = document.createElement('a');
            openLink.className = 'msf-btn msf-btn-open';
            openLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> View`;
            openLink.href = url;
            openLink.target = '_blank';
            buttonGroup.appendChild(openLink);
        }

        entryDiv.appendChild(topRow);
        entryDiv.appendChild(buttonGroup);
        detectedArea.appendChild(entryDiv);
    }

    if (window.self === window.top) {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'stream-finder-found') {
                if (!foundUrls.has(event.data.url)) {
                    foundUrls.add(event.data.url);
                    addEntryToUI(event.data.url, event.data.entryType, event.data.sizeBytes);
                }
            }
        });
    }

    // --- DETECTION LOGIC ---
    const m3u8Regex = /\.m3u8($|\?)/i;
    const mp4Regex = /\.mp4($|\?)/i;
    const subtitleRegex = /\.(vtt|srt)($|\?)/i;

    function processEntry(url, transferSize) {
        if (!url || foundUrls.has(url)) return;

        if (m3u8Regex.test(url)) {
            foundUrls.add(url);
            addEntryToUI(url, 'm3u8', 0);
        } else if (subtitleRegex.test(url)) {
            foundUrls.add(url);
            addEntryToUI(url, 'subtitle', 0);
        } else if (mp4Regex.test(url)) {
            if (transferSize && transferSize > MIN_MP4_SIZE_BYTES) {
                foundUrls.add(url);
                addEntryToUI(url, 'mp4', transferSize);
            } else if (!transferSize || transferSize === 0) {
                checkMp4Size(url);
            }
        }
    }

    function checkMp4Size(url) {
        GM_xmlhttpRequest({
            method: "HEAD",
            url: url,
            onload: function(response) {
                const sizeHeader = response.responseHeaders.match(/content-length:\s*(\d+)/i);
                let size = 0;
                if (sizeHeader && sizeHeader[1]) {
                    size = parseInt(sizeHeader[1], 10);
                }
                if (size > MIN_MP4_SIZE_BYTES) {
                    if (!foundUrls.has(url)) {
                        foundUrls.add(url);
                        addEntryToUI(url, 'mp4', size);
                    }
                }
            }
        });
    }

    // --- PERFORMANCE OBSERVER ---
    try {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                const size = entry.transferSize || entry.encodedBodySize || 0;
                processEntry(entry.name, size);
            });
        });
        observer.observe({ type: "resource", buffered: true });
    } catch (e) {
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
            processEntry(args[1], 0);
            return originalXhrOpen.apply(this, args);
        };
    }

    // Start UI elements on load so the interface is persistently available
    if (window.self === window.top) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createUI);
        } else {
            createUI();
        }
    }

})();
