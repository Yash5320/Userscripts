# Userscripts

A collection of powerful userscripts designed to enhance your web browsing experience. These scripts add new features to popular websites and provide advanced tools for developers and power users.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Available Scripts](#available-scripts)
  - [1. IMDB Streamer](#1-imdb-streamer)
  - [2. M3U8 Finder & Downloader](#2-m3u8-finder--downloader)
- [Required Setup for M3U8 Finder](#required-setup-for-m3u8-finder)
- [Author](#author)
- [License](#license)

---

## Prerequisites

To use any of these scripts, you must have a userscript manager browser extension installed. I recommend the powerful, open-source **Violentmonkey**.

-   [**Install Violentmonkey**](https://violentmonkey.github.io/)

---

## Available Scripts

### 1. IMDB Streamer

Enhances IMDB pages by adding direct "Watch Now" buttons. It finds and embeds available streaming options from various sources, allowing you to watch movies and TV shows with a single click.

[![Install IMDB Streamer](https://img.shields.io/badge/Install-Script-blue.svg)](https://raw.githubusercontent.com/Yash5320/Userscripts/main/IMDB%20Streamer/imdb-streamer.user.js)

**Features:**
-   Adds buttons directly to the IMDB interface.
-   Supports multiple streaming sources.
-   Opens the selected stream in a new, clean tab.

---

### 2. M3U8 Finder & Downloader

A developer-focused tool that scans a webpage's network activity to detect video streams (`.m3u8`) and subtitle files (`.vtt`, `.srt`). It adds a simple UI to the page, allowing you to copy stream URLs or send them directly to `yt-dlp` for downloading.

[![Install M3U8 Finder](https://img.shields.io/badge/Install-Script-blue.svg)](https://raw.githubusercontent.com/Yash5320/Userscripts/main/M3U8_Finder/m3u8-finder.user.js)

> **Important:** The one-click download functionality requires a one-time setup on your local machine to handle the custom `ytdlp:` protocol. Please follow the instructions in the [**Required Setup**](#required-setup-for-m3u8-finder) section below.

**Features:**
-   Automatically detects `.m3u8`, `.vtt`, and `.srt` files.
-   Adds a non-intrusive UI to the bottom-right of the page.
-   Copy links with a single click.
-   **Download with `yt-dlp`:** Send video streams directly to your local `yt-dlp` instance, which will open a new terminal and begin the download.

---

## Required Setup for M3U8 Finder

To enable the one-click download feature, you need to teach your system and browser how to handle `ytdlp:` links using the provided `ytdlp-handler.sh` script. This guide is for Debian/Ubuntu-based Linux systems with a GNOME desktop.

#### Step 1: Install Dependencies

You need `yt-dlp` to handle the downloading and `gnome-terminal` to display the progress.

```bash
sudo apt-get update
sudo apt-get install yt-dlp gnome-terminal
```

#### Step 2: Place and Configure the Handler Script

1.  **Download the script:** Get the `ytdlp-handler.sh` file from the `M3U8_Finder` directory in this repository.

2.  **Move it to a standard location:** Place the script in `~/.local/bin/`. This ensures it's in your system's PATH and won't break if you move this repository.
    ```bash
    # Create the directory if it doesn't exist
    mkdir -p ~/.local/bin
    
    # Copy the script
    cp M3U8_Finder/ytdlp-handler.sh ~/.local/bin/
    ```

3.  **Make it executable:** This is a critical step.
    ```bash
    chmod +x ~/.local/bin/ytdlp-handler.sh
    ```

#### Step 3: Create a Desktop Entry File

This file tells your system that `ytdlp-handler.sh` is an "application" that can open `ytdlp:` links.

1.  **Create the file:**
    ```bash
    gedit ~/.local/share/applications/ytdlp-handler.desktop
    ```

2.  **Paste the following content** into the file and save it:
    ```ini
    [Desktop Entry]
    Name=YTDLP Handler
    Comment=Handles ytdlp:// links for downloading videos
    Exec=/home/YOUR_USERNAME/.local/bin/ytdlp-handler.sh %u
    Icon=utilities-terminal
    Terminal=false
    Type=Application
    MimeType=x-scheme-handler/ytdlp;
    ```
    > **Note:** Replace `YOUR_USERNAME` with your actual Linux username (e.g., `/home/pain/`).

#### Step 4: Register the New Application

Run this command to update your system's application database.

```bash
update-desktop-database ~/.local/share/applications/
```

#### Step 5: Configure Your Browser (Firefox Example)

1.  Open Firefox and navigate to `about:config`.
2.  Accept the warning.
3.  Search for `network.protocol-handler.expose.ytdlp`.
4.  If it exists, ensure its value is set to `false`. If it doesn't exist, right-click -> New -> Boolean, set the name to `network.protocol-handler.expose.ytdlp` and the value to `false`.
5.  Now, the next time you click a `ytdlp:` link from the userscript, Firefox will prompt you to choose an application. Click "Choose Application" and find "YTDLP Handler" in the list.

You are all set! The "Download with yt-dlp" button will now work as intended.

---

## Author

-   **Yash Deole** - [GitHub](https://github.com/Yash5320)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
