// ==UserScript==
// @name         IMDB Multi-Source Streamer
// @namespace    https://github.com/Yash5320
// @version      1.0
// @description  Adds watch buttons on IMDb pages to stream from multiple sources (Vidsrc, Vidfast) in a new tab.
// @author       Pain
// @match        https://*.imdb.com/title/*
// @grant        none
// @icon         https://www.iconpacks.net/icons/1/free-icon-movie-850.png
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration: Define streaming sources here ---
    const sources = [
        {
            name: 'Vidsrc',
            // Note: vidsrc.xyz uses an embed link.
            buildUrl: (type, imdbId, season, episode) => {
                if (type === 'movie') {
                    return `https://vidsrc.xyz/embed/movie?imdb=${imdbId}`;
                } else { // type === 'tv'
                    return `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`;
                }
            }
        },
        {
            name: 'Vidfast',
            buildUrl: (type, imdbId, season, episode) => {
                const subLang = 'en'; // Optional: add subtitle language
                if (type === 'movie') {
                    return `https://vidfast.pro/movie/${imdbId}?sub=${subLang}`;
                } else { // type === 'tv'
                    return `https://vidfast.pro/tv/${imdbId}/${season}/${episode}?sub=${subLang}`;
                }
            }
        }
    ];

    // --- Helper Functions (Combined from both scripts) ---

    function getIMDbId() {
        const match = window.location.pathname.match(/title\/(tt\d+)/);
        return match ? match[1] : null;
    }

    function isTVSeriesPage() {
        // This is a more reliable way to check for a series main page
        return document.querySelector('[data-testid="hero-title-block__series-link"]') === null &&
               document.querySelector('a[href*="/episodes"]') !== null;
    }

    function getSeasonFromUrl() {
        const params = new URLSearchParams(location.search);
        return parseInt(params.get("season") || "1", 10);
    }

    function parseEpisodeNumbersFromCard(card, defaultSeason) {
        const label = card.querySelector(".ipc-title__text, .info")?.textContent || card.textContent;
        const match = label.match(/S(\d+)\.?E(\d+)/i);
        if (match) return { season: +match[1], episode: +match[2] };

        const epMatch = label.match(/Episode\s+(\d+)/i);
        if (epMatch) return { season: defaultSeason, episode: +epMatch[1] };

        return null;
    }


    // --- Core UI Functions ---

    /**
     * Creates a container with watch buttons for all configured sources.
     * @param {'movie'|'tv'} type - The type of content.
     * @param {string} imdbId - The IMDb ID (tt...).
     * @param {number} [season=1] - The season number for TV shows.
     * @param {number} [episode=1] - The episode number for TV shows.
     * @returns {HTMLDivElement} The container element with buttons.
     */
    function createWatchButtonsContainer(type, imdbId, season = 1, episode = 1) {
        const container = document.createElement('div');
        container.className = 'stream-container';

        sources.forEach(source => {
            const url = source.buildUrl(type, imdbId, season, episode);
            const button = document.createElement('a');
            button.href = url;
            button.target = '_blank'; // Open in a new tab
            button.rel = 'noopener noreferrer';
            button.textContent = `▶ ${source.name}`;
            button.className = 'stream-button';
            button.dataset.source = source.name.toLowerCase();

            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card clicks on episode lists
            });

            container.appendChild(button);
        });

        return container;
    }

    /**
     * Injects CSS styles into the document head for the buttons.
     */
    function addGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .stream-container {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .stream-button {
                padding: 8px 12px;
                background-color: #1a6496;
                color: #e0f2ff !important;
                border: none;
                cursor: pointer;
                font-weight: bold;
                border-radius: 6px;
                font-size: 14px;
                text-decoration: none !important;
                transition: background-color 0.2s;
                font-family: "IMDb plaus", "IMDb plaus fallback", "Helvetica", "Arial", sans-serif;
            }
            .stream-button:hover {
                background-color: #2581c2;
                color: white !important;
            }
            .stream-button[data-source="vidsrc"] {
                background-color: #e50914; /* Red for Vidsrc */
            }
            .stream-button[data-source="vidsrc"]:hover {
                background-color: #f61a26;
            }
        `;
        document.head.appendChild(style);
    }

    // --- Page-Specific Implementations ---

    function addMovieButtons() {
        const imdbId = getIMDbId();
        if (!imdbId || document.querySelector('.floating-stream-container')) return;

        const container = createWatchButtonsContainer('movie', imdbId);
        container.className += ' floating-stream-container'; // Add a specific class for styling
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 10001,
            padding: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '10px',
            filter: 'drop-shadow(0 10px 8px rgba(0,0,0,0.2))'
        });

        document.body.appendChild(container);
    }

    function replaceEpisodeGuideLink() {
        const guideLink = document.querySelector('a[href*="/episodes"]');
        if (!guideLink || guideLink.parentElement.querySelector('.stream-container')) return;

        const imdbId = getIMDbId();
        if (!imdbId) return;

        const container = createWatchButtonsContainer('tv', imdbId, 1, 1);
        container.style.marginLeft = '10px';

        // Replace the guide link with our button container
        guideLink.parentElement.replaceChild(container, guideLink);
    }

    function insertPerEpisodeButtons() {
        const imdbId = getIMDbId();
        if (!imdbId) return;
        const defaultSeason = getSeasonFromUrl();

        const cards = document.querySelectorAll('.episode-item-wrapper, .list_item, .ipc-list-card');
        cards.forEach(card => {
            if (card.querySelector('.stream-container')) return;

            const episodeInfo = parseEpisodeNumbersFromCard(card, defaultSeason);
            if (!episodeInfo) return;

            const { season, episode } = episodeInfo;
            const container = createWatchButtonsContainer('tv', imdbId, season, episode);

            // Style and position the container on the episode card
            if (getComputedStyle(card).position === 'static') {
                card.style.position = 'relative';
            }
            Object.assign(container.style, {
                position: 'absolute',
                right: '12px',
                bottom: '12px',
                zIndex: 10
            });

            card.appendChild(container);
        });
    }


    // --- Main Execution Logic ---

    function init() {
        addGlobalStyles();

        // Determine which page we are on and act accordingly
        const path = window.location.pathname;

        if (path.includes("/episodes")) {
            // Episode list page
            insertPerEpisodeButtons();
            // Use a MutationObserver to handle dynamically loaded episodes
            const observer = new MutationObserver(() => insertPerEpisodeButtons());
            observer.observe(document.body, { childList: true, subtree: true });
        } else if (isTVSeriesPage()) {
            // TV series main page
            replaceEpisodeGuideLink();
        } else {
            // Assumed to be a movie page or a single episode page
            addMovieButtons();
        }
    }

    // Run the script after the page has loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
