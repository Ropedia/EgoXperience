# EgoXperience

The complete, self-contained project website: EgoX-Engine, EgoX-Data-6M &
EgoX-Bench, and EgoX reconstruction results. `codex/website-final` is the clean release branch, with no inherited development history.

## View locally

Clone or download this repository, then run in its root:

```sh
python3 -m http.server 8090
```

Open **http://localhost:8090/**. Use an HTTP server rather than opening
`index.html` with `file://`, because the viewers load JavaScript modules and data.
No npm install, model inference, dataset download, credentials, or build step is
needed. All videos, posters, captions, geometry, mesh colors, fonts, and Three.js
dependencies are included as regular Git files (not Git LFS pointers).
Interactive reconstruction requires JavaScript and WebGL.

## Included examples

- Data: 12 clips with 96 synchronized observations each and seven video streams
  (RGB, depth, mask, object 6DoF, hands, colored mesh, 3D camera) plus captions.
- Model: 12 interactive reconstructions, three each from EgoX-Bench, HOT3D,
  HOI4D, and H2O. Catalogs specify the active examples.
- All 16 hero background videos and posters, high-resolution X branding,
  institution logos, self-contained pipeline SVG, network icon and local fonts.

Captions come from fresh Chinese Qwen3-ASR-1.7B inference with
Qwen3-ForcedAligner-0.6B. English translations are displayed; Chinese source text
is retained. Each frame uses the most recent preceding instruction until the next
cue starts, including instructions before the clip's first frame. Original
speech timestamps remain unchanged in `captionCues`; these differ from display
intervals. Clock mapping and ASR provenance are recorded in
`assets-v2/caption-asr-audit.json` and scene metadata. ASR/translation may contain
recognition errors; this is not a claim of exhaustive manual transcription.

Model examples are training-sequence qualitative demonstrations, not held-out
evaluation. They use fresh inference from checkpoints 30500, 34000 and 40500.
`assets-v2/model-training-audit.json` records membership/provenance. Membership
does not establish that a displayed frame window was sampled by the optimizer.
The first source object pose initializes the mesh; subsequent display uses
predicted relative SE(3), without future reference poses. Browser geometry is
subsampled for performance; source vertex colors are retained.
Captions are data annotations, not model outputs.

The training-data panel summarizes the union of the scratch and phase-3 source
configurations. EgoX-Data-6M counts as the complete 50-hour release, not the small
historical subset. Other source durations are estimated from available indexed
frames and configured FPS; this is not optimizer sampling exposure. The computed
284.0-hour pool (excluding Golden from this overview) is displayed as approximately 280 hours, with real/simulated
shares calculated from unrounded durations. `assets-v2/training-data-summary.json`
records per-source counts, estimates, index hashes, and known index omissions.

## Validate and publish

```sh
python3 site_assets.py
python3 package-site.py
```

The inventory checks all required runtime files and size limits. Packaging copies
the current site to `dist/` and refuses to overwrite an existing build.
GitHub Actions validates and publishes this artifact on pushes to `main` or `codex/website-final`
(Pages must use GitHub Actions).

Lossless eight-frame geometry chunks are committed; redundant uncompressed copies
are not shipped. Browsers use native gzip decompression when available, or the
included fflate fallback. No private dataset access is needed.

## Rights and provenance

Three.js 0.160.1 and fflate 0.8.2 are vendored with their MIT licenses. Geist and Geist Mono include
their SIL Open Font License files in `assets-v2/fonts/`.
Dataset examples, branding and institution logos retain their respective rights;
dependency licenses do not license datasets. Private source paths, model
checkpoints and full-length research recordings are not required to run this
website and are not distributed here.
