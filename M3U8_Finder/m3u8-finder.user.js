// ==UserScript==
// @name         Universal Stream & Subtitle Finder (Robust v2.5 - MP4 & Size Support)
// @namespace    https://github.com/Yash5320
// @version      2.5
// @description  Detects M3U8, MP4 (filtered by size), and Subtitles. Features a toggleable, scrollable UI and displays file sizes.
// @author       Yash
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

    // --- STYLES ---
    GM_addStyle(`
        /* Main List Container */
        #stream-finder-container {
            display: none; /* Hidden by default */
            position: fixed;
            bottom: 70px; /* Above the toggle button */
            right: 15px;
            z-index: 2147483647;
            background-color: rgba(30, 30, 30, 0.95);
            border: 1px solid #555;
            border-radius: 8px;
            padding: 10px;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            width: 320px;
            max-height: 60vh; /* Prevent overflowing screen height */
            overflow-y: auto; /* Enable scrolling */
            scrollbar-width: thin;
            scrollbar-color: #555 #333;
        }

        /* Toggle Button (The Icon) */
        #stream-finder-toggle {
            position: fixed;
            bottom: 15px;
            right: 15px;
            z-index: 2147483647;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: transform 0.2s, background-color 0.2s;
        }
        #stream-finder-toggle:hover { background-color: #0056b3; transform: scale(1.05); }
        #stream-finder-toggle .badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: #dc3545;
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: bold;
            display: none;
        }

        /* Header */
        #stream-finder-container h4 {
            margin: 0 0 10px 0;
            padding: 0 0 5px 0;
            font-size: 14px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background-color: rgba(30, 30, 30, 0.95);
        }

        /* Entries */
        .finder-entry { border: 1px solid #4a4a4a; border-radius: 5px; padding: 8px; margin-top: 8px; background-color: rgba(0,0,0,0.2); }
        .finder-entry-label { font-size: 12px; font-weight: bold; margin-bottom: 6px; word-break: break-all; color: #ddd; }
        .finder-entry-size { font-size: 11px; color: #aaa; margin-left: 5px; font-weight: normal; }

        /* Buttons */
        .finder-button-group { display: flex; gap: 5px; }
        .finder-button, .finder-button-link {
            flex-grow: 1; cursor: pointer; color: white !important;
            border: none; padding: 6px 10px; text-align: center; text-decoration: none;
            display: inline-block; font-size: 12px; border-radius: 4px;
            transition: background-color 0.2s;
        }
        .finder-button.copy { background-color: #007bff; } .finder-button.copy:hover { background-color: #0056b3; }
        .finder-button-link.download { background-color: #dc3545; } .finder-button-link.download:hover { background-color: #a71d2a; }
        .finder-button-link.view { background-color: #28a745; } .finder-button-link.view:hover { background-color: #1e7e34; }
    `);

    // --- UTILS ---
    function sanitizeFilename(name) { return name.replace(/[\\/:\*\?"<>\|]/g, '_').trim().replace(/^\.+|\.+$/g, '') || 'video'; }
    function formatBytes(bytes, decimals = 1) {
        if (!bytes || bytes === 0) return 'Size unknown';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // --- UI LOGIC ---
    function updateBadgeCount() {
        if (!toggleButton) return;
        const count = foundUrls.size;
        const badge = toggleButton.querySelector('.badge');
        if (count > 0) {
            badge.style.display = 'block';
            badge.textContent = count;
        }
    }

    function createUI() {
        if (uiContainer || window.self !== window.top) return;

        // Create Toggle Button
        toggleButton = document.createElement('button');
        toggleButton.id = 'stream-finder-toggle';
        toggleButton.innerHTML = '🔍<span class="badge"></span>';
        toggleButton.onclick = () => {
            const isHidden = uiContainer.style.display === 'none';
            uiContainer.style.display = isHidden ? 'block' : 'none';
        };
        document.body.appendChild(toggleButton);

        // Create List Container
        uiContainer = document.createElement('div');
        uiContainer.id = 'stream-finder-container';

        const header = document.createElement('h4');
        header.innerHTML = 'Media Found <span style="font-size:11px; color:#aaa; cursor:pointer;" onclick="this.parentElement.parentElement.style.display=\'none\'">Hide</span>';
        uiContainer.appendChild(header);

        document.body.appendChild(uiContainer);
    }

    function addEntryToUI(url, type, sizeBytes = 0) {
        // If inside iframe, send to top
        if (window.self !== window.top) {
            window.parent.postMessage({ type: 'stream-finder-found', url, entryType: type, sizeBytes }, '*');
            return;
        }

        // Ensure UI exists
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => addEntryToUI(url, type, sizeBytes));
            return;
        }
        createUI();
        updateBadgeCount();

        const entryDiv = document.createElement('div');
        entryDiv.className = 'finder-entry';

        // Label construction
        let labelText = '';
        if (type === 'm3u8') labelText = `Stream (M3U8)`;
        else if (type === 'mp4') labelText = `Video (MP4)`;
        else if (type === 'subtitle') labelText = `Subtitle`;

        const sizeText = sizeBytes > 0 ? formatBytes(sizeBytes) : '';
        const displayLabel = `${labelText} <span class="finder-entry-size">${sizeText ? '('+sizeText+')' : ''}</span>`;

        // Buttons
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'finder-button-group';

        const copyButton = document.createElement('button');
        copyButton.className = 'finder-button copy';
        copyButton.textContent = 'Copy';
        copyButton.onclick = () => {
            GM_setClipboard(url);
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
        };
        buttonGroup.appendChild(copyButton);

        if (type === 'm3u8' || type === 'mp4') {
            const downloadLink = document.createElement('a');
            downloadLink.className = 'finder-button-link download';
            downloadLink.textContent = 'YTDLP';
            const pageTitle = sanitizeFilename(document.title);
            downloadLink.href = `ytdlp:${url}|${pageTitle}`;
            downloadLink.target = '_blank';
            buttonGroup.appendChild(downloadLink);
        } else if (type === 'subtitle') {
            const viewLink = document.createElement('a');
            viewLink.className = 'finder-button-link view';
            viewLink.textContent = 'Open';
            viewLink.href = url;
            viewLink.target = '_blank';
            buttonGroup.appendChild(viewLink);
        }

        entryDiv.innerHTML = `<div class="finder-entry-label">${displayLabel}</div>`;
        entryDiv.appendChild(buttonGroup);
        uiContainer.appendChild(entryDiv);
    }

    // Listen for iframe messages
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

        // 1. M3U8 (Size usually small/irrelevant for the manifest itself)
        if (m3u8Regex.test(url)) {
            foundUrls.add(url);
            console.log('[Stream Finder] M3U8:', url);
            addEntryToUI(url, 'm3u8', 0);
        }
        // 2. Subtitles
        else if (subtitleRegex.test(url)) {
            foundUrls.add(url);
            console.log('[Stream Finder] Subtitle:', url);
            addEntryToUI(url, 'subtitle', 0);
        }
        // 3. MP4 - The Tricky Part (Size Filter)
        else if (mp4Regex.test(url)) {
            // Case A: Browser gave us the size (Performance API)
            if (transferSize && transferSize > MIN_MP4_SIZE_BYTES) {
                foundUrls.add(url);
                console.log('[Stream Finder] Large MP4 (Known Size):', url);
                addEntryToUI(url, 'mp4', transferSize);
            }
            // Case B: Size is unknown (0) - often due to CORS. We must check manually.
            else if (!transferSize || transferSize === 0) {
                checkMp4Size(url);
            }
        }
    }

    // Makes a HEAD request to check Content-Length
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
                        console.log('[Stream Finder] Large MP4 (Checked Size):', url, formatBytes(size));
                        addEntryToUI(url, 'mp4', size);
                    }
                } else {
                    // console.log('[Stream Finder] Ignored small MP4:', size, url);
                }
            },
            onerror: function(err) {
                console.warn('[Stream Finder] Could not check size for:', url);
            }
        });
    }

    // --- PERFORMANCE OBSERVER ---
    try {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                // We use transferSize (network bytes) or encodedBodySize
                const size = entry.transferSize || entry.encodedBodySize || 0;
                processEntry(entry.name, size);
            });
        });
        // Observe resource loads
        observer.observe({ type: "resource", buffered: true });
    } catch (e) {
        console.error('[Stream Finder] PerformanceObserver not supported.', e);
        // Fallback for very old browsers (Limited, won't get size easily)
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(...args) {
            processEntry(args[1], 0);
            return originalXhrOpen.apply(this, args);
        };
    }

})();
