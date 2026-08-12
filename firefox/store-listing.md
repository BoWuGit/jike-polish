# AMO store listing

The API-ready localized fields are in [`amo-metadata.json`](./amo-metadata.json). Use the values below when completing or verifying the listing in AMO Developer Hub.

## Basic fields

| Field | Value |
| --- | --- |
| Name (zh-CN) | 阅赏 |
| Name (en-US) | Yueshang |
| Default locale | 简体中文 (`zh-CN`) |
| Categories | Appearance; Social & Communication |
| Homepage | https://github.com/BoWuGit/jike-polish |
| Support website | https://github.com/BoWuGit/jike-polish/issues |
| Support email | `<SUPPORT_EMAIL>` |
| Experimental | No |
| Requires payment/non-free software/hardware | No |
| Firefox for Android | Not supported |

## Summary

### zh-CN

> 优化 web.okjike.com 的字体与布局，增强转发卡片、用户资料预览和图片灯箱缩放。

### en-US

> Improves typography, repost previews, profile cards, and image zooming on web.okjike.com.

## Description

Use the localized `description` values from [`amo-metadata.json`](./amo-metadata.json). They explicitly disclose:

- the single supported website;
- all user-facing features;
- the account-free offline demo;
- direct communication with the target service;
- no developer collection, remote code, ads, analytics, or telemetry; and
- the public privacy-policy URL.

## Privacy policy

Select **This add-on has a privacy policy**. Paste the current bilingual policy from [`../PRIVACY.md`](../PRIVACY.md) into the AMO privacy-policy editor (or its locale-specific fields if offered). Public source URL:

> https://github.com/BoWuGit/jike-polish/blob/main/PRIVACY.md

Do not submit while this field is empty: the extension transmits data to the target service and Mozilla requires a privacy policy.

## License

Current metadata value: `all-rights-reserved`.

The repository has no `LICENSE` file. Keep this conservative value unless the copyright owner explicitly chooses an open-source license and adds the matching repository license before submission.

## Reviewer notes

Paste [`review-notes.md`](./review-notes.md). The same text is already present in `amo-metadata.json` for API submissions.

## Assets

Upload [`store-assets/screenshots/firefox-offline-demo.png`](./store-assets/screenshots/firefox-offline-demo.png):

- 1280×800 PNG;
- entirely local fictional content;
- no real profile, post, credential, or third-party copyrighted screenshot;
- shows repost restoration and a profile hover card.

The packaged 128×128 extension icon is used as the listing icon. If AMO asks for a separate icon, use [`../icon.png`](../icon.png).
