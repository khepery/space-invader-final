# Ultra Pro Space Invaders – Premium Educational Edition

A Space Invaders–style quiz game where players answer questions to defeat waves of alien invaders.

## Changing the access code

Open **`config.js`** and update the `code` value — that is the only file you need to edit:

```js
window.SITE_CONFIG = {
  code: "YOURNEWCODE"   // ← change this
};
```

Save the file and share the new code with your students. No other file needs to be changed.

The default code is **`GALAXY2026`**.

## Development

Open `index.html` directly in a browser with all asset files in the same folder:

```
asteroid.png  enemyShip.png  explosion.mp3  ...  index.html
```

No build step is needed for local development.

## Building the single-file release

Running the build script produces a **single self-contained HTML file** that works 100% offline — no internet, no CDN, no external files required.

### Requirements

- [Node.js](https://nodejs.org/) (v14 or newer)

### Steps

```bash
node build.js
# or
npm run build
```

The output file `Ultra_Pro_Space_Invaders_RELEASE.html` is written to the project root.  
Copy that one file to a USB drive, share it by email, or open it on any machine — it needs nothing else.

### What the build script does

1. Reads `index.html` as the source.
2. Replaces the Google Fonts CDN `<link>` with an offline CSS fallback `<style>` block.
3. Converts every `<audio src="…mp3">` tag to an inline Base64 data URI.
4. Converts every `loadImage(…, 'file.png', …)` call to use an inline Base64 data URI.
5. Writes the result to `Ultra_Pro_Space_Invaders_RELEASE.html`.

> **Note:** `Ultra_Pro_Space_Invaders_RELEASE.html` is listed in `.gitignore` and is not committed to the repository.
