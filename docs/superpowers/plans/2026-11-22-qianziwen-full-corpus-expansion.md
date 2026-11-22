# Plan: expand the approved lesson template to all 250 groups

**Goal:** Put all 250 four-character units into the existing static module, render them as 63 pages of four units (last page two), and make incomplete material visibly reviewable without claiming verification.

**Architecture:** Keep the approved single-unit lesson model as the source of truth. Add page navigation that selects four entries from the same JSON corpus. Store source/version metadata per field; use the Wikisource transcription as a draft text base, with editorial variants surfaced in review metadata. Do not use screenshots as content sources.

**Tech stack:** Existing HTML/CSS/ES modules, Node `node:test`, Playwright, JSON. No new runtime framework.

**Spec:** `docs/superpowers/specs/2026-11-22-qianziwen-learning-module-design.md`.

**Global constraints:** Exactly 250 unique entries and 63 pages; no internal project names on learner pages; uncertain pinyin, meanings, English, image, audio, and stroke data remain `needs_review`; no fabricated stroke-order paths; no real Android retest is claimed unless the user provides a new run.

**Review focus:** canonical text and variants, pinyin alignment, missing per-character stroke coverage, missing audio/image fallbacks, responsive page navigation, final page and quiz cap.

## Tasks

1. Add failing corpus validation for exact sequences, 250 units, 63 pages, per-field status/source, and aligned pinyin; then implement the full structured corpus from the cited primary text, leaving non-verified fields marked `needs_review`.
2. Add failing pagination/navigation browser checks; render four lessons per page using existing components and support previous/next, page selection, and progress without exposing internal names.
3. Add failing missing-resource and mobile-layout checks; make ungenerated audio, image and stroke assets explicit review states with usable controls hidden/disabled, not broken requests or fake paths.
4. Run the full Node and Playwright suites, read back first/middle/final entries and data counts, and record remaining review fields and device-test limits.

## Progress

- The structural corpus and navigation are implemented: 250 four-character entries, 63 pages, page/group URL state, field-level `needs_review` metadata, and explicit placeholders for unreviewed teaching content.
- The approved first lesson remains the usable content sample. Entries 2–250 are an expansion scaffold, not yet fully authored teaching lessons: meanings, English notes, images, pinyin, generated audio, and stroke data need review as documented in the module README and source table.
- Audio and stroke assets were bundled with their source/terms records. Ten stroke characters are missing and are surfaced without fabricated paths.
- Verification run on 2026-11-22: `npm test` (20 passed), `npm run validate:data` (250 lessons/63 pages), and `npm run test:e2e` (7 passed). These are desktop/browser automation results; they do not replace a new Android Chrome check of the expanded UI.
- Remaining work: author and verify the lesson content/assets for groups 2–250 in reviewable batches; perform Android Chrome verification of this expanded build before reporting device acceptance.
