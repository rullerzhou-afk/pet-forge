# pet-forge Agent Notes

This file is the short entry point for AI coding agents working in this repository. Keep user-facing docs public-safe: no personal names, local machine paths, private project paths, private handles, or unpublished asset references.

## Project

pet-forge is a toolkit for building custom desktop pets. It provides two base output routes that can also be combined:

### SVG Route

Output: self-contained `.svg.html` files.

- Local vector workflow: reference image -> background removal -> PNG to SVG -> preset/template -> CSS/JS animation.
- Best for precise loops, low file size, and hand-tuned animation.
- Main folders: `routes/svg/presets`, `routes/svg/templates`, `routes/svg/conventions`, `routes/svg/tools/png2svg`.

### APNG Route

Output: `.apng` frame animations.

- Generation workflow: reference and keyframe images -> prompt template -> explicit output ratio/resolution -> video generation with first/last-frame anchoring -> optional segment assembly and speed selection -> chroma key -> APNG.
- Best for fast rich visual exploration when API reruns are acceptable.
- For Doubao / Seedance, read `routes/apng/conventions/doubao-video-output.md` before fixing the reference canvas or output ratio.
- Main folders: `routes/apng/prompts`, `routes/apng/conventions`, `routes/apng/tools`.

### Hybrid Route

Output: APNG character motion with synchronized SVG overlays.

- Best for natural generated motion plus precise text, symbols, particles, glow, or tracked effects.
- Keep the generated prop surface blank when exact content will be added later, then drive the SVG layer from the same frame clock and measured anchors.

## Public-Repo Rules

- Do not add personal names, account handles, emails, local usernames, or absolute local paths.
- Do not reference private checkouts as if public users can access them.
- Do not commit `.env`, generated outputs, caches, or `node_modules`.
- Keep character/product assets separate from this toolkit unless they are explicitly licensed for inclusion.
- Keep quick-start commands runnable from the paths shown.

## Design Boundaries

The toolkit does not:

- manage external API keys or billing;
- decide final aesthetics for a user;
- include finished character assets;
- guarantee one-click generation of a complete pet.

The toolkit does:

- provide route-specific workflows;
- document loop/state conventions;
- provide APNG generation/post-processing scripts;
- provide SVG templates/presets;
- describe a generic desktop-pet state map.

## Current Status

- `README.md`: public user entry.
- `SKILL.md`: skill trigger and workflow guidance.
- `routes/svg/`: SVG presets, template, conventions, lessons, and `png2svg`.
- `routes/apng/`: prompt template, APNG workflow docs, segment assembly, chroma/edge rules, hybrid overlays, lessons, and tools.
- `shared/`: route-independent state map, asset lifecycle, and lessons.
- `examples/`: public-safe case-study notes.

The APNG tools have basic CLI validation. Real generation still requires user-provided API keys, network access, API credits, and `ffmpeg`.
