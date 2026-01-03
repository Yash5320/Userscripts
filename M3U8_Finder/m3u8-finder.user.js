// ==UserScript==
// @name         Universal Stream & Subtitle Finder
// @namespace    https://github.com/Yash5320
// @version      1.0
// @description  Detects M3U8 streams and Subtitle files (.vtt, .srt) and adds a UI to copy URLs or download.
// @author       Yash
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @run-at       document-start
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgd2lkdGg9IjQ4Ij48cGF0aCBkPSJNMCAwaDQ4djQ4SDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTQyIDZINGMtMS4xIDAtMiAuOS0yIDJ2MjRjMCAxLjEuOSAyIDIgMmgxNHY0SDIwdjRoOHYtNGgtNHYtNEg0MlY4YzAtMS4xLS45LTItMi0yeiBtMCAyNkgyMFY4aDIyVjMyem0tOC0xMUwyMiAxMy41djExTDM0IDIxWiIvPjwvc3ZnPg==
// ==/UserScript==

(function() {
    'use strict';

    const foundM3u8Urls = new Set();
    const foundSubtitleUrls = new Set();
    let uiContainer = null;

    const m3u8Regex = /\.m3u8($|\?)/i;
    const subtitleRegex = /\.(vtt|srt)($|\?)/i;

    GM_addStyle(`
        #stream-finder-container {
            position: fixed; bottom: 15px; right: 15px; z-index: 99999;
            background-color: rgba(30, 30, 30, 0.9); border: 1px solid #555; border-radius: 8px;
            padding: 10px; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); max-width: 320px;
        }
        #stream-finder-container h4 {
            margin: 0 0 10px 0; padding: 0 0 5px 0; font-size: 14px; border-bottom: 1px solid #444;
            display: flex; justify-content: space-between; align-items: center;
        }
        #stream-finder-close { cursor: pointer; font-size: 18px; font-weight: bold; color: #aaa; padding: 0 5px; }
        #stream-finder-close:hover { color: white; }
        .finder-entry { border: 1px solid #4a4a4a; border-radius: 5px; padding: 8px; margin-top: 8px; background-color: rgba(0,0,0,0.2); }
        .finder-entry-label { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
        .finder-button-group { display: flex; gap: 5px; }
        .finder-button, .finder-button-link {
            flex-grow: 1; cursor: pointer; color: white !important; border: none; padding: 8px 12px;
            text-align: center; text-decoration: none; display: inline-block; font-size: 13px;
            border-radius: 5px; transition: background-color 0.2s;
        }
        .finder-button.copy { background-color: #007bff; }
        .finder-button.copy:hover { background-color: #0056b3; }
        .finder-button-link.download { background-color: #dc3545; }
        .finder-button-link.download:hover { background-color: #a71d2a; }
        .finder-button-link.view { background-color: #28a745; }
        .finder-button-link.view:hover { background-color: #1e7e34; }
    `);

    function sanitizeFilename(name) {
        let sanitized = name.replace(/[\\/:\*\?"<>\|]/g, '_');
        sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
        return sanitized || 'video';
    }

    function createUiContainer() {
        if (uiContainer) return;
        uiContainer = document.createElement('div');
        uiContainer.id = 'stream-finder-container';
        const header = document.createElement('h4');
        header.textContent = 'Streams & Subtitles Found:';
        const closeButton = document.createElement('span');
        closeButton.id = 'stream-finder-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => { uiContainer.style.display = 'none'; };
        header.appendChild(closeButton);
        uiContainer.appendChild(header);
        document.body.appendChild(uiContainer);
    }

    function addEntryToUI(url, type) {
        // Only create the UI when the first item is found
        if (!document.body) {
            // If body is not ready, wait for it.
            document.addEventListener('DOMContentLoaded', () => addEntryToUI(url, type));
            return;
        }
        createUiContainer();
        uiContainer.style.display = 'block';

        const entryDiv = document.createElement('div');
        entryDiv.className = 'finder-entry';
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'finder-button-group';

        // --- Copy Button (common for both) ---
        const copyButton = document.createElement('button');
        copyButton.className = 'finder-button copy';
        copyButton.textContent = 'Copy URL';
        copyButton.onclick = () => { GM_setClipboard(url); copyButton.textContent = 'Copied!'; setTimeout(() => { copyButton.textContent = 'Copy URL'; }, 2000); };
        buttonGroup.appendChild(copyButton);

        let labelText;
        if (type === 'm3u8') {
            labelText = `Stream #${foundM3u8Urls.size}`;
            // --- Download Button (M3U8 only) ---
            const downloadLink = document.createElement('a');
            downloadLink.className = 'finder-button-link download';
            downloadLink.textContent = 'Download';
            const pageTitle = sanitizeFilename(document.title);
            downloadLink.href = `ytdlp:${url}|${pageTitle}`;
            downloadLink.target = '_blank';
            buttonGroup.appendChild(downloadLink);
        } else if (type === 'subtitle') {
            labelText = `Subtitle #${foundSubtitleUrls.size}`;
            // --- View Button (Subtitle only) ---
            const viewLink = document.createElement('a');
            viewLink.className = 'finder-button-link view';
            viewLink.textContent = 'View';
            viewLink.href = url;
            viewLink.target = '_blank';
            buttonGroup.appendChild(viewLink);
        }

        entryDiv.innerHTML = `<div class="finder-entry-label">${labelText}</div>`;
        entryDiv.appendChild(buttonGroup);
        uiContainer.appendChild(entryDiv);
    }

    function processUrl(url) {
        if (!url) return;

        if (m3u8Regex.test(url) && !foundM3u8Urls.has(url)) {
            foundM3u8Urls.add(url);
            console.log('M3U8 Detected:', url);
            addEntryToUI(url, 'm3u8');
        } else if (subtitleRegex.test(url) && !foundSubtitleUrls.has(url)) {
            foundSubtitleUrls.add(url);
            console.log('Subtitle Detected:', url);
            addEntryToUI(url, 'subtitle');
        }
    }

    // --- Detection Method 1: Network Request Interception (Very reliable) ---
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = (args[0] instanceof Request) ? args[0].url : args[0];
        processUrl(url);
        return originalFetch.apply(this, args);
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
        const url = args[1];
        processUrl(url);
        return originalXhrOpen.apply(this, args);
    };

    // --- Detection Method 2: DOM Observation for <track> tags ---
    // This part runs after the DOM is loaded
    function scanForTrackElements(node) {
        if (node.nodeType === 1) { // Check if it's an element
            if (node.tagName === 'TRACK' && node.src) {
                processUrl(node.src);
            }
            node.querySelectorAll('track[src]').forEach(track => processUrl(track.src));
        }
    }

    window.addEventListener('load', () => {
        // Initial scan for any <track> elements already present
        document.querySelectorAll('track[src]').forEach(track => processUrl(track.src));

        // Observe the body for dynamically added elements
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const addedNode of mutation.addedNodes) {
                    scanForTrackElements(addedNode);
                }
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

})();


