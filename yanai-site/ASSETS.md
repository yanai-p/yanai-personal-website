# Media provenance

Current Hero (16 November 2026): the two owner-selected videos `dji_fly_20260629_095352_428_1782716958540_video.mp4` and `67454.mp4` from `C:/Users/Ariel/OneDrive - Meylon/Desktop/`. Both show aerial construction-site activity. Originals are unchanged (76.1 MB + 190.0 MB).

`yanai-hero-sites-60fps.mp4` and `yanai-hero-sites-60fps-mobile.mp4` combine both clips in a repeating 33.683-second sequence. Each transition, including the return to the first clip, dissolves over 0.75 seconds. Silent H.264, 60 fps, yuv420p, faststart, 1600×900 desktop (30,283,814 bytes) / 960×540 mobile (8,953,118 bytes). Only the matching source loads. Original files remain unchanged; there is no crop or speed change.

The originals are **29.97 and 30 fps**, not native 60fps. Each shot is independently converted using motion-compensated interpolation (`minterpolate`, aobmc/bidir/vsbmc) before dissolving; synthesized intermediate frames provide 60fps motion instead of duplicated frames. The DJI container includes telemetry and reports 18 seconds, but its actual video is 517 frames / 17.25057 seconds. Transitions use actual video duration to avoid a held tail. Reproducible encoding: `scripts/encode-hero-60fps.py`; reference: https://ffmpeg.org/ffmpeg-filters.html#minterpolate .

Both outputs were decoded completely: 2,021 frames each, consecutive timestamps on a 1/60-second timebase, zero identical adjacent frames, and the MP4 moov atom before media data for progressive loading. The matching `yanai-hero-sites-60fps-poster.jpg` comes from the final desktop loop's first frame. Playback still respects visibility, reduced motion and data saving. The previous 24fps `yanai-hero-sites*` derivatives are retained but no longer referenced by the page.

Earlier `yanai-site-hero*` finishing-work derivatives remain archived and are not referenced by the page.

The previous Pexels video is no longer referenced by the page. Archived files `hero.mp4`, `hero-mobile.mp4`, and `hero-poster.jpg` remain unused. Original attribution: Everett Bumstead, https://www.pexels.com/video/a-construction-worker-walking-inside-a-building-5423610/ ; license https://www.pexels.com/license/ .

Brand symbol supplied by the user. Field photographs from the user's previous website, as documented in README.md. Photographs illustrate site activity; no new project names, client testimonials or personnel identities have been invented.

## Owner-supplied photographs — 12 November 2026

Reviewed all 29 files (27 JPGs and two MP4s) in `C:/Users/Ariel/Downloads/OneDrive_2026-11-12/תמונות עבודה`. Video review used frames sampled throughout both timelines. The source files are unchanged. The review inventory and numbered contact sheets are in `research/media-review/` at repository root.

Selected derivatives (WebP, 640px plus larger version, metadata stripped):
- `yanai-interior-team-*`: `מסגרות - שיפוצים גבס/WhatsApp Image 2025-04-01 at 10.33.48_9179ce7d.jpg` — gallery; wide composition and Yanai branding, people mainly viewed from behind.
- `yanai-team-preparation-*`: `עבודה בגובה/1.jpg` — about section; crew with helmets and harnesses, viewed from behind. No claim of certification or project identity.
- `yanai-tiling-*`: `ריצוף/תמונה של WhatsApp‏ 2025-01-10 בשעה 14.48.45_44337760.jpg` — tiler profession; actual floor work, face turned away.
- `yanai-plastering-*`: `שיפוצים -טיח וצבע/תמונה של WhatsApp‏ 2025-02-03 בשעה 14.54.41_00239386.jpg` — plasterer profession; visible work and branding, face turned away.

The short finishing-work video supplied the previous Hero; it was replaced by the owner-selected aerial pair on 16 November. The long dark walkthrough remains unused. No client names, testimonials or project identities were inferred.

## Distinct subject selection — second media pass

- `yanai-formwork-*` and `yanai-rebar-*` are separate detail crops from `research/site-photo-4.jpg` (7680 × 3644), originally from the previous Yanai website. Crop boxes: formwork (3200,1580,4450,2830), reinforcement (1250,2200,3250,3400). They document different elements of the **same site**, not different projects. The broad near-duplicate aerial views are no longer used on the page.
- `yanai-roof-*`: `איטום גגות/תמונה של WhatsApp‏ 2025-02-25 בשעה 17.47.51_3b293c74.jpg`, owner-supplied folder; replaces the repeated aerial gallery image. The worker is viewed looking down, with the task in focus.
- All new visible captions and image/video descriptions are included in the seven language catalogs.
