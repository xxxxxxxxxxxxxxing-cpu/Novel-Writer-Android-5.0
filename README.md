# NovelWriter

NovelWriter is a mobile-first Expo writing workspace based on the supplied warm paper UI reference. It now includes a real books-to-chapters model, a safe-area-aware editor, local persistence, chapter reordering, per-chapter lock/unlock protection, read-only reading mode, display settings, large plain-text import with Chinese heading detection, JSON backups, EPUB import/export, ZIP project archives, and Android system sharing.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the Expo preview URL on an Android device or emulator. Core writing data is stored locally with AsyncStorage; no account or server is required for the writing flow.

## Import and export

Supported imports are TXT, Markdown, JSON, EPUB, and ZIP. Plain-text imports recognize headings such as `Chapter 1`, `Part I`, `第1章`, `第一章`, `卷一`, and common numbered formats. EPUB imports read chapter XHTML files, while ZIP imports read a NovelWriter JSON backup when present or collect text/Markdown files from the archive.

From **Import & Export**, the current chapter or the whole book can be exported as JSON, EPUB, or ZIP. A full-book ZIP includes `novelwriter.json` plus individual chapter text files. The Android share sheet is used for delivery; when installed on the device it can expose Wi-Fi/Nearby Share, Bluetooth, Drive, and other compatible targets.

## Build an installable Android APK

The repository includes `.github/workflows/build-apk.yml` and `eas.json`. The preview profile is configured as an installable APK and includes both `armeabi-v7a` and `arm64-v8a` build architectures for broad Android phone and tablet compatibility.

To run the build:

1. Create or link an Expo/EAS project for this repository.
2. Generate an Expo access token and save it in GitHub as the `EXPO_TOKEN` repository secret.
3. Push to `main` or start **Build NovelWriter APK** from the Actions tab.
4. Download the `novelwriter-preview-apk` artifact from the completed workflow run and install it on the phone or tablet.

The APK cannot be produced in an unauthenticated local session; the GitHub workflow is ready once the repository secret and EAS project link are provided.
