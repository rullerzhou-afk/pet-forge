# SVG Case Study Notes

This file intentionally contains only public-safe notes. It does not point to private local repositories or include character assets.

## What To Learn From The SVG Case Study

- Start with one strong idle/hero state before planning a full state set.
- Keep SVG states self-contained so they can be loaded directly by a desktop-pet runtime.
- Use shared visual tokens: palette, stroke style, eye shapes, and motion timing.
- Archive rejected directions instead of deleting them; they explain why the final direction works.
- Treat product character shapes as separate assets, not as part of this toolkit.

## Apple-Precise Takeaways

- Rounded organic silhouettes work well.
- Subtle motion reads better than full deformation: try 70-90% morph/scale before 100%.
- Three-layer stroke systems help pale characters remain grounded on light backgrounds.
- Long-idle surprises need a quiet gap before the next trigger.
- Static-frame approval is not enough; watch multiple complete cycles, including the longest secondary motion.

## What Not To Copy

- Do not copy a finished character path, exact eye design, palette, or named product identity.
- Do not assume private examples are available to public users.
- Use the methodology to make a new character with its own visual DNA.

## Relevant pet-forge Files

- `routes/svg/presets/apple-precise.md`
- `routes/svg/templates/hello-idle.svg.html`
- `routes/svg/conventions/iteration.md`
- `routes/svg/conventions/loop-states.md`
- `routes/svg/lessons/pitfalls.md`
