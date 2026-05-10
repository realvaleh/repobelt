# Demo video

RepoBelt has a short rendered launch video at:

```text
docs/assets/repobelt-demo.mp4
```

Render it from the repository root with:

```bash
pnpm render:demo-video
```

## Requirements

The script uses:

- Python 3
- Pillow
- ffmpeg

On macOS, install ffmpeg with:

```bash
brew install ffmpeg
```

If Pillow is missing:

```bash
python3 -m pip install pillow
```

## What the video shows

The video is a synthetic terminal-style walkthrough:

1. Run `npx repobelt check --base HEAD --head worktree --format markdown`.
2. Show a `FAIL` RepoBelt report.
3. Highlight a protected `.env` change.
4. Highlight a risky `auth/login.ts` change.
5. Highlight secret-shaped findings without printing any real secret value.
6. End with the RepoBelt tagline and GitHub URL.

The video intentionally uses fake/synthetic findings only. It does not include real credentials, tokens, private keys, or private repository content.

## Launch usage

Use the MP4 in launch posts where video upload is supported:

- X/Twitter
- LinkedIn
- Product Hunt gallery
- GitHub release assets

For README display, keep using the SVG screenshot because GitHub renders it cleanly inline. Link the MP4 from docs or upload it directly to the release/social post.

## Regeneration policy

The script is deterministic. If the README/report format changes, regenerate the video and commit both:

```bash
pnpm render:demo-video
git add scripts/render-demo-video.py docs/assets/repobelt-demo.mp4 docs/demo-video.md package.json
git commit -m "docs: refresh launch demo video"
```
