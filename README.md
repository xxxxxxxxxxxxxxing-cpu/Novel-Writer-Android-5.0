# NovelWriter

NovelWriter is a mobile-first Expo writing workspace based on the supplied warm paper UI reference. The current MVP includes a responsive chapter editor, local persistence, a library drawer, chapter reordering, lock/unlock protection, reading and writing display settings, large plain-text import with heading detection, encoding-aware messaging, TXT export through the Android share sheet, and a GitHub Actions workflow for APK builds.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the Expo preview URL on an Android device or emulator. The app stores the current book and chapters locally with AsyncStorage; no account or server is required for the core writing flow.

## Import behavior

The importer accepts plain text and attempts to read UTF-8/Unicode text. It detects headings such as `Chapter 1`, `Part I`, `第1章`, `第一章`, `卷一`, and common numbered-heading formats. For very large files, parsing is line-based and avoids rendering the entire manuscript as one list item.

## Build an APK with GitHub Actions

1. Create an Expo account/project and generate an `EXPO_TOKEN` with permission to build the project.
2. Add `EXPO_TOKEN` as a repository secret in GitHub.
3. Push to `main` or start **Build NovelWriter APK** from the Actions tab.
4. The workflow runs type checking, queues an EAS internal Android build, and exposes the build URL in the job log. The `preview` profile is configured to produce an installable `.apk`.

The workflow file is `.github/workflows/build-apk.yml`; the EAS profile is in `eas.json`.
