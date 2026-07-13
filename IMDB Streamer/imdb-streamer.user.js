// ==UserScript==
// @name         IMDB Multi-Source Streamer
// @namespace    https://github.com/Yash5320
// @version      2.2
// @description  Adds a stunning, glassmorphic dock on IMDb pages to stream from multiple sources in a new tab.
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
            name: 'Vidsrc.xyz',
            className: 'x-bg-vidsrc',
            iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor" class="x-icon"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>`,
            buildUrl: (type, imdbId, season, episode) => {
                if (type === 'movie') {
                    return `https://vidsrc.xyz/embed/movie?imdb=${imdbId}`;
                } else {
                    return `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`;
                }
            }
        },
        {
            name: 'Vidfast',
            className: 'x-bg-vidfast',
            iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor" class="x-icon"><path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clip-rule="evenodd" /></svg>`,
            buildUrl: (type, imdbId, season, episode) => {
                const subLang = 'en';
                if (type === 'movie') {
                    return `https://vidfast.pro/movie/${imdbId}?sub=${subLang}`;
                } else {
                    return `https://vidfast.pro/tv/${imdbId}/${season}/${episode}?sub=${subLang}`;
                }
            }
        },
        {
            name: 'Streamimdb',
            excludeFromEpisodes: true,
            className: 'x-bg-streamimdb',
            iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor" class="x-icon"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" /></svg>`,
            buildUrl: (type, imdbId, season, episode) => {
                return `https://www.playimdb.com/title/${imdbId}/`;
            }
        },
        {
            name: 'Vidsrc.me',
            className: 'x-bg-vidsrcme',
            iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor" class="x-icon"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12zm-5-6l-7 4V7l7 4z"/></svg>`,
            buildUrl: (type, imdbId, season, episode) => {
                if (type === 'movie') {
                    return `https://vidsrc.me/embed/movie?imdb=${imdbId}`;
                } else {
                    return `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`;
                }
            }
        },
        {
            name: '2Embed',
            className: 'x-bg-twoembed',
            iconSvg: `<svg viewBox="0 0 24 24" fill="currentColor" class="x-icon"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
            buildUrl: (type, imdbId, season, episode) => {
                const targetUrl = type === 'movie'
                    ? `https://www.2embed.cc/embed/${imdbId}`
                    : `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`;
                return `data:text/html,<body style="margin:0"><iframe src="${targetUrl}" style="width:100vw;height:100vh;border:none;" allowfullscreen></iframe></body>`;
            }
        }
    ];

    // --- Helper Functions ---

    function getIMDbId() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        return (parts[0] === 'title' && parts[1]) ? parts[1] : null;
    }

    function isTVSeriesPage() {
        return document.querySelector('[data-testid="hero-title-block__series-link"]') === null &&
               document.querySelector('a[href*="/episodes"]') !== null;
    }

    function isSingleEpisodePage() {
        return document.querySelector('[data-testid="hero-title-block__series-link"]') !== null;
    }

    function getSeasonFromUrl() {
        const params = new URLSearchParams(location.search);
        return parseInt(params.get("season") || "1", 10);
    }

    function parseEpisodeNumbersFromCard(card, defaultSeason) {
        const label = card.querySelector(".ipc-title__text, .image, .info, .hover-over-image")?.textContent || card.textContent;
        const match = label.match(/S(\d+)\.?E(\d+)/i);
        if (match) return { season: +match[1], episode: +match[2] };
        const epMatch = label.match(/Episode\s+(\d+)/i);
        if (epMatch) return { season: defaultSeason, episode: +epMatch[1] };
        return null;
    }

    // --- Dock Injection Logic ---

    function createWatchButtonsContainer(type, imdbId, season = 1, episode = 1, isEpisodeContext = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'x-stream-container';

        // Outer glass aesthetic backing
        const glassBg = document.createElement('div');
        glassBg.className = 'x-glass-bg';
        wrapper.appendChild(glassBg);

        const dock = document.createElement('div');
        dock.className = 'x-dock';

        sources.forEach(source => {
            if (isEpisodeContext && source.excludeFromEpisodes) return;

            const url = source.buildUrl(type, imdbId, season, episode);

            const dockItem = document.createElement('div');
            dockItem.className = 'x-dock-item group';

            const tooltip = document.createElement('div');
            tooltip.className = 'x-tooltip';
            tooltip.textContent = source.name;

            const button = document.createElement('a');
            button.href = url;
            button.target = '_blank';
            button.rel = 'noopener noreferrer';
            button.className = `x-squircle ${source.className}`;
            button.innerHTML = source.iconSvg;

            // Safe fallback implementation for data URIs blocked by browser rules
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                if (url.startsWith('data:text/html')) {
                    e.preventDefault();
                    const newWindow = window.open();
                    if (newWindow) {
                        newWindow.document.open();
                        newWindow.document.write(url.substring('data:text/html,'.length));
                        newWindow.document.close();
                    }
                }
            });

            dockItem.appendChild(tooltip);
            dockItem.appendChild(button);
            dock.appendChild(dockItem);
        });

        wrapper.appendChild(dock);
        return wrapper;
    }

    // CSS styling replicating clean Glassmorphism in a tighter form factor
    function addGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .x-stream-container { position: relative; display: inline-block; }

            /* Placements */
            .x-floating { position: fixed; bottom: 20px; right: 20px; z-index: 10001; filter: drop-shadow(0 15px 15px rgba(0,0,0,0.5)); }
            .x-series-guide { margin-left: 10px; transform: scale(0.75); transform-origin: left center; }
            .x-episode-card { position: absolute; right: 10px; bottom: 10px; z-index: 10; transform: scale(0.65); transform-origin: bottom right; }

            /* Glass Background Overlay */
            .x-glass-bg {
                position: absolute; inset: 0;
                background-color: rgba(20, 20, 20, 0.4);
                backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
                border-radius: 1.15rem;
                border: 1px solid rgba(255, 255, 255, 0.15);
                box-shadow: inset 0 0 10px rgba(255,255,255,0.05);
            }

            .x-dock { position: relative; display: flex; align-items: flex-end; gap: 0.5rem; padding: 0.5rem; }
            .x-dock-item { position: relative; display: flex; flex-direction: column; align-items: center; }

            /* Tooltip animation and styling */
            .x-tooltip {
                position: absolute;
                bottom: 100%;
                margin-bottom: 0.75rem;
                background: rgba(0, 0, 0, 0.9);
                color: #fff;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.05em;
                white-space: nowrap;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .x-dock-item:hover .x-tooltip { opacity: 1; transform: translateY(0); }

            /* Icon Anchor - Compacted "Squircle" bounds */
            .x-squircle {
                width: 2.75rem; height: 2.75rem;
                clip-path: url(#squircleClip);
                border-radius: 0.9rem;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.2);
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                text-decoration: none;
            }

            /* Icon scaling */
            .x-dock-item:hover .x-squircle {
                transform: scale(1.1) translateY(-0.35rem);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            .x-icon { width: 1.5rem; height: 1.5rem; color: #ffffff; }

            /* Gradient configurations per platform */
            .x-bg-vidsrc { background: linear-gradient(135deg, #ef4444, #7f1d1d); }
            .x-bg-vidfast { background: linear-gradient(135deg, #3b82f6, #1e3a8a); }
            .x-bg-streamimdb { background: linear-gradient(135deg, #facc15, #a16207); border-color: rgba(250, 204, 21, 0.6); }
            .x-bg-vidsrcme { background: linear-gradient(135deg, #6366f1, #312e81); }
            .x-bg-twoembed { background: linear-gradient(135deg, #10b981, #064e3b); }

            /* Contrast override for the Streamimdb icon */
            .x-bg-streamimdb .x-icon { color: #000; }
        `;
        document.head.appendChild(style);
    }

    // Injects clipping definitions globally once
    function addSquircleDef() {
        if (document.getElementById('squircleClip')) return;
        const svgDiv = document.createElement('div');
        svgDiv.innerHTML = `
            <svg width="0" height="0" style="position: absolute;">
              <defs>
                <clipPath id="squircleClip" clipPathUnits="objectBoundingBox">
                  <path d="M 0,0.5 C 0,0 0,0 0.5,0 S 1,0 1,0.5 1,1 0.5,1 0,1 0,0.5"></path>
                </clipPath>
              </defs>
            </svg>
        `;
        document.body.appendChild(svgDiv);
    }

    // --- Page Implementations ---

    function addMovieButtons(isEpisodeContext = false) {
        const imdbId = getIMDbId();
        if (!imdbId || document.querySelector('.x-floating')) return;

        const container = createWatchButtonsContainer('movie', imdbId, 1, 1, isEpisodeContext);
        container.classList.add('x-floating');
        document.body.appendChild(container);
    }

    function replaceEpisodeGuideLink() {
        const guideLink = document.querySelector('a[href*="/episodes"]');
        if (!guideLink || guideLink.parentElement.querySelector('.x-stream-container')) return;

        const imdbId = getIMDbId();
        if (!imdbId) return;

        const container = createWatchButtonsContainer('tv', imdbId, 1, 1, false);
        container.classList.add('x-series-guide');
        guideLink.parentElement.replaceChild(container, guideLink);
    }

    function insertPerEpisodeButtons() {
        const imdbId = getIMDbId();
        if (!imdbId) return;
        const defaultSeason = getSeasonFromUrl();

        const cards = document.querySelectorAll('.episode-item-wrapper, .list_item, .ipc-list-card');
        cards.forEach(card => {
            if (card.querySelector('.x-stream-container')) return;

            const episodeInfo = parseEpisodeNumbersFromCard(card, defaultSeason);
            if (!episodeInfo) return;

            const { season, episode } = episodeInfo;
            const container = createWatchButtonsContainer('tv', imdbId, season, episode, true);
            container.classList.add('x-episode-card');

            if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
            card.appendChild(container);
        });
    }

    // --- Initialization Logic ---

    function init() {
        addSquircleDef();
        addGlobalStyles();

        const path = window.location.pathname;
        if (path.includes("/episodes")) {
            insertPerEpisodeButtons();
            const observer = new MutationObserver(() => insertPerEpisodeButtons());
            observer.observe(document.body, { childList: true, subtree: true });
        } else if (isTVSeriesPage()) {
            replaceEpisodeGuideLink();
        } else if (isSingleEpisodePage()) {
            addMovieButtons(true);
        } else {
            addMovieButtons(false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
