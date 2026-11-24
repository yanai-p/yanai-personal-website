# Localization

The Hebrew website is available in Thai (`th`), Hindi (`hi`), Sinhala (`si`), simplified Chinese (`zh-CN`), Romanian (`ro`), Uzbek in Latin script (`uz`), and English (`en`). Hebrew remains the default. The selector uses native language names, without country flags.

Each JSON array has 316 corresponding entries. `he.json` is the canonical source; the other files contain translations in the same order. To change wording, edit the JSON entry and run `npm run build:locales` from `yanai-site`, then `npm test`. New source entries need translations in every catalog. These are the maintained catalogs; `dist/locales.js` is generated. The website is buildless and does not need Node or a translation service to run.

## Review performed on 12 November 2026

- Authored English against the Hebrew source, then edited target-language drafts. Draft generation used Google's translation endpoint during development only. No visitor data or form contents were submitted to it.
- Read and corrected target-language wording, including mistranslations of construction site as website, trade as commerce, engagement as marriage, concrete casting as casting actors, and worker names as building materials.
- Rewrote split headings to form coherent sentences. Kept `Yanai Personnel` consistent, retained company number, dates, contacts and qualifications, and added no customer claims or availability promises.
- Checked trade terminology against primary vocational sources: [CIDA Sri Lanka](https://www.cida.gov.lk/content/files/applications/Craftsman%20Registration%20Application%20-%20Rev.%2006%20%281%29.pdf), [Construction Skill Development Council of India](https://www.csdcindia.org/participant-hand-book/), [Romania's ANOFM](https://mediere.anofm.ro/app/module/mediere/jobs), and [Thailand's vocational education standards](https://dles.vec.go.th/standards/roles.html).
- Followed [W3C internationalization guidance](https://www.w3.org/International/quicktips/index) for UTF-8, native language names, document language/direction and text expansion. Local Noto fonts cover Thai, Devanagari and Sinhala; OFL licenses are in `dist/assets/fonts`. Chinese uses platform CJK fonts.

This is an AI-assisted linguistic and technical review, not certification or independent proofreading by native speakers. Native professional review remains the appropriate final editorial check before a public multilingual launch, especially for Sinhala, Thai and employment/privacy terminology.

## Behavior and checks

- `?lang=en` (or another supported code) selects a language directly. A supported URL takes priority over localStorage, then the default is Hebrew. Switching retains the URL fragment and current form input.
- Hebrew uses RTL; the seven additions use LTR. Both tab systems follow the visual direction for arrow keys. Menus, image descriptions, modals, validation, video controls and dynamic profession content are translated.
- Form option values remain canonical Hebrew business values. Submission opens a localized, prefilled WhatsApp message, preserving the visitor's own text and ending with a blank line. The visitor sends the message in WhatsApp. Phone links use Israel's international prefix.
- Automated DOM tests cover every locale, four trades, three project choices, validation, fallback messages, persistence, direct links, Hebrew restoration and input preservation. All form-test requests are mocked; no inquiry was sent.
- Localization is client-side. Base HTML and social previews remain Hebrew for crawlers that do not execute JavaScript. Per-language prerendering is a separate SEO/deployment enhancement.

The form does not use an email service. No FormSubmit activation or server-side email configuration is required. Live sending to the company has not been tested; automated tests intercept the WhatsApp handoff.
