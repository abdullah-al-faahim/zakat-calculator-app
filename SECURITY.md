# Security policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's private vulnerability reporting:
<https://github.com/abdullah-al-faahim/zakat-calculator-app/security/advisories/new>

Include the app version (Settings › App updates), the device and Android version, and steps to reproduce.
We aim to acknowledge reports within 3 working days and will credit reporters who wish to be named.

**Errors in Quran, hadith or rulings** are not security issues. Use the in-app *Report an error* button on
any verse or hadith, or open an issue labelled `content-correction` with the record ID, the problem and the
authoritative source.

## Supported versions

Only the latest release receives fixes. The app checks for updates itself (Settings › App updates) and opens the
new APK in the browser; it never downloads or installs packages itself.

## How the app protects your data

This follows the project's security protocol (OWASP MASVS for the mobile app).

| Data | Examples | Handling |
|---|---|---|
| Highly sensitive | Amounts, savings, debts, gold/silver weights, zakat date | AES-256-GCM, key generated and kept in Android Keystore; stored in `noBackupFilesDir`; never logged; excluded from backup and device transfer |
| Settings | Language, theme, calculation method | Private app preferences; contain no amounts |
| Public | Quran/Hadith, rules, gold/silver rates | Integrity-checked (SHA-256) at build time and at startup |

- **Local only:** no accounts, no cloud sync, no ads, no analytics, no crash reporting SDK. Financial data never leaves the device.
- **Network:** HTTPS only, enforced in code and by the network security config. TLS 1.2+ on every socket, system CAs only (user-installed CAs are not trusted), a host allow-list (bajus.org, github.com and its download CDN), redirects checked hop by hop, and response size limits. Requests carry no user data.
- **Certificate pinning:** the app has no API of its own, so there is nothing of ours to pin. Third-party hosts (BAJUS, GitHub) rotate certificates outside our control, so pinning them would break the app without a rotation plan we can own. If an own backend is ever added, it must be pinned, with a documented backup-key rotation plan.
- **Prices:** responses are validated for type, range, karat ordering and date (not in the future, not older than 45 days). Rejected responses keep the last good value. The source, rate date and fetch time are always shown, and manual prices are labelled.
- **Updates:** the check reads `version.json` only from the allowed GitHub hosts, and the APK link must point to one of them. The app holds no install permission and contains no installer code (a unit test enforces this), so it cannot install anything. Android itself refuses an update signed with a different key, and the SHA-256 of every APK is published in `version.json` and the release notes.
- **Input validation:** every number is parsed as a decimal with range and length limits. Malformed input is rejected and stored values are clamped.
- **Release builds:** not debuggable, minified with R8, all `android.util.Log` calls stripped, signed with a key kept outside the repository.
- **Device risk signal:** rooted devices get a one-time, non-blocking warning.
- **Optional:** "Block screenshots" (FLAG_SECURE) in Settings.
- **User control:** export all data or permanently delete it (including the Keystore key) from Settings.

## Secrets

- No keys, tokens or passwords in the repository. Release signing reads `keystore.properties`, which is git-ignored.
- CI runs gitleaks on every push and pull request. Developers can install the same check locally:
  `pip install pre-commit && pre-commit install` (see `.pre-commit-config.yaml`).
- The app needs no API keys at all, so there are no per-environment keys to separate. Debug builds use a separate application ID (`.debug`).

## Supply chain

- Dependency versions are locked in `app/gradle.lockfile` (`./gradlew :app:dependencies --write-locks` to update).
- The Gradle distribution is pinned by SHA-256 in `gradle-wrapper.properties`, and CI validates the wrapper JAR.
- Dependabot checks Gradle dependencies and GitHub Actions.
- External datasets (Quran, hadith, font) are recorded with source, version and checksum in `content/SOURCES.md`.

## Incident response

1. **Detect:** reports through private advisories, CI alerts, Dependabot alerts.
2. **Contain:** pull the affected release from the public repository, and publish a fixed release that the in-app update check announces.
3. **Notify:** the app holds no user data on any server, so a breach of user data on our side is not possible. If a flaw could expose data on devices, announce it on the release page and in the update notes within 72 hours of confirmation, and notify authorities where the law requires.
4. **Fix:** patch, add a regression test, release.
5. **Publish** a short post-incident summary on the release page.

## Testing

- Unit tests on every push: calculation (known answers, nisab boundaries), security (tampered price responses, tampered update manifests, storage codec, platform config) and content integrity (hashes, schema, references).
- Static analysis: Android Lint in CI. CodeQL is recommended once GitHub code scanning is available for this repository.
- Before major releases: test offline, on a poor network, and with tampered responses; periodic penetration testing.
