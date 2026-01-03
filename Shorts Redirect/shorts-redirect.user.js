// ==UserScript==
// @name         YouTube Shorts to Standard Video Redirect
// @namespace    Yash5320
// @version      1
// @description  Prevent YouTube Shorts from playing and redirect instantly to regular video URLs
// @author       Yash
// @match        https://youtube.com/*
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to handle redirection when on a Shorts page
    function checkAndRedirect() {
        const currentUrl = window.location.href;

        // Check if the current URL contains '/shorts/' (indicating it's a Shorts video)
        if (currentUrl.includes('/shorts/')) {
            // Extract the video ID from the URL
            const videoId = currentUrl.split('/shorts/')[1].split('?')[0];

            // Construct the new URL for the regular video page
            const newUrl = `https://youtube.com/watch?v=${videoId}`;

            // Redirect immediately to the new URL (before the Short video starts)
            window.location.replace(newUrl);
        }
    }

    // Perform the check and redirect as early as possible on page load
    window.addEventListener('DOMContentLoaded', checkAndRedirect);

    // Block the video request resources by using the 'beforeunload' event
    window.addEventListener('beforeunload', () => {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => video.pause()); // Stop any video resources from loading
    });

    // Set up a MutationObserver to detect URL changes (for dynamic Shorts navigation)
    const observer = new MutationObserver(() => {
        // Check if the URL has changed and if we are on a Shorts page
        checkAndRedirect();
    });

    // Observe changes in the URL (specifically in the body element)
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();

