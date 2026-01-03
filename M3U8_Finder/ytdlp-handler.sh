#!/bin/bash

# Get the full argument from the browser (e.g., ytdlp:https...%7Ctitle)
FULL_INPUT="$1"

# Remove the "ytdlp:" prefix
CLEAN_INPUT="${FULL_INPUT#ytdlp:}"

# --- THE FIX: URL Decode the input string ---
# Browsers encode special characters like '|' into '%7C'.
# This command decodes those %XX sequences back into actual characters.
DECODED_INPUT=$(printf '%b' "$(echo "$CLEAN_INPUT" | sed 's/%\([0-9A-Fa-f]\{2\}\)/\\x\1/g')")

# Now, check for our delimiter '|' in the DECODED string
if [[ "$DECODED_INPUT" == *"|"* ]]; then
    # It exists, so parse the URL and FILENAME from the decoded string
    URL="${DECODED_INPUT%|*}"
    FILENAME="${DECODED_INPUT#*|}"
    OUTPUT_TEMPLATE="$FILENAME.%(ext)s"
else
    # It does not exist, fall back to old behavior (just a URL)
    URL="$DECODED_INPUT"
    FILENAME="video_download" # A default name in case title is missing
    OUTPUT_TEMPLATE="%(title)s [%(id)s].%(ext)s"
fi

# Open a new terminal and execute yt-dlp.
# Quotes around variables are crucial to handle spaces and other special characters.
gnome-terminal --working-directory="$HOME/Videos" \
               --title="Downloading: $FILENAME" \
               -- yt-dlp -o "$OUTPUT_TEMPLATE" "$URL"
