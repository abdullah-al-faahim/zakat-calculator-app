# Privacy policy — Zakat Calculator (যাকাত ক্যালকুলেটর)

*Effective 29 October 2026 · applies to app version 3.0.1 and later*

**In short:** none of your financial information leaves your phone. There are no accounts, no ads, no analytics
and no tracking.

## What the app stores, where, and for how long

| What | Where | Protection | How long |
|---|---|---|---|
| Amounts you enter, gold/silver weights, your zakat (hawl) date | On your phone only | Encrypted with AES-256-GCM; the key is kept in Android Keystore | Until you delete it or uninstall the app |
| Language, theme, calculation method, weight unit | On your phone only | Private to the app; contains no amounts | Until you delete it or uninstall the app |
| Last fetched gold/silver rates | On your phone only | Private to the app | Replaced on each fetch |

None of this is included in Android cloud backup or device-to-device transfer.

## What the app does not collect

No name, phone number, email, location, contacts or device identifiers. No advertising or analytics SDKs.

## Network use

The app connects to the internet only to:

1. read today's gold and silver rates from **bajus.org**, and
2. check **github.com** for a new app version (you can turn off automatic checks in Settings). The update itself
   is downloaded by your browser when you tap *Update now*; the app never installs anything itself.

These requests contain none of your data. All connections use HTTPS (TLS 1.2 or higher). Like any website,
those servers can see your IP address. Their own privacy policies apply.

Tapping *Report an error* on a verse or hadith opens a pre-filled GitHub issue in your browser. It contains
only the record ID and app version, and nothing is sent unless you submit it yourself.

## Permissions

- **Internet:** for rates and update checks. This is the only permission the app asks for.

## Your control

In **Settings › My data & privacy** you can:
- **Export** everything the app stores, as a readable JSON file. The exported file is not encrypted, so keep it safe.
- **Permanently delete** all data, including the encryption key.

## Children

The app does not knowingly collect any data from anyone, including children.

## Changes

Changes to this policy are published with the app's release notes and in this file.

## Contact

Questions: open an issue at <https://github.com/abdullah-al-faahim/zakat-calculator-app/issues>.
This app is designed to comply with Bangladesh's data-protection rules and the GDPR principles of data
minimisation and storage limitation.
