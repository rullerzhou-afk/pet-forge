# pet-forge

Tools, templates, and working notes for building your own SVG or APNG desktop pet.

pet-forge can be used as a standalone toolkit or installed as a Codex skill. It is not a finished character pack; it is a reusable collection of route guides, prompt templates, SVG conventions, APNG post-processing scripts, examples, and state-mapping notes.

## Routes

```
[SVG route]                         [APNG route]

reference image                     prompt template
   -> remove background                -> AI reference image
   -> PNG to SVG                       -> AI video with frame anchors
   -> preset + SVG template            -> chroma key
   -> self-contained .svg.html         -> .apng
```

| Topic | SVG Route | APNG Route |
|---|---|---|
| Cost | Free after local setup | Uses paid/free generation APIs |
| Control | High, every keyframe is editable | Lower, reruns are normal |
| Looping | Exact CSS loops | Needs first/last-frame anchoring |
| File size | Usually small | Usually hundreds of KB or more |
| Best for | crisp vector pets, tiny runtime files | rich visual styles, fast drafts |

Choose SVG if you want precise loops, small files, and editable animation logic. Choose APNG if you want fast visual exploration and are comfortable with generation APIs and post-processing.

## Using as a Codex Skill

This repository includes `SKILL.md`, so Codex can use pet-forge as a skill when planning or building SVG/APNG desktop-pet assets. The skill points Codex toward the route docs, templates, tools, examples, and constraints in this repo instead of treating the task as a blank-page generation problem.

Use it when you want Codex to help choose a route, convert a transparent PNG into SVG, prepare APNG generation prompts, post-process generated video into APNG, or wire a small runnable demo.

## Demo: GPT Pear SVG Route

<table>
  <tr>
    <th align="center">1. Source PNG</th>
    <th align="center">png2svg + vtracer</th>
    <th align="center">2. Generated SVG</th>
  </tr>
  <tr>
    <td align="center" width="35%">
      <img src="examples/svg-gpt-pear/source.png" width="220" alt="GPT pear source PNG">
    </td>
    <td align="center" width="30%">
      <strong>PNG -> SVG</strong><br>
      transparent background<br>
      low-color quantization<br>
      raster-to-vector tracing<br>
      <code>--preset apple-precise</code>
    </td>
    <td align="center" width="35%">
      <img src="examples/svg-gpt-pear/pear.svg" width="220" alt="GPT pear converted SVG">
    </td>
  </tr>
  <tr>
    <td align="center">Original raster image. Best when the background is real alpha, not a checkerboard screenshot.</td>
    <td align="center">The tool cleans transparent pixels, limits colors, then asks vtracer to trace paths.</td>
    <td align="center">Vector output: 13 paths, about 21 KB. Easier to animate and inspect, but small details are simplified.</td>
  </tr>
</table>

The primary demo uses a GPT-generated transparent PNG, converts it with vtracer, and wraps the result in a tiny idle animation:

- Source PNG: `examples/svg-gpt-pear/source.png`
- Generated SVG: `examples/svg-gpt-pear/pear.svg`
- Runnable demo: `examples/svg-gpt-pear/idle.svg.html`

Reproduce the conversion:

```powershell
py -3.13 routes\svg\tools\png2svg\png2svg.py examples\svg-gpt-pear\source.png examples\svg-gpt-pear\pear.svg --preset apple-precise
```

This run produced 13 SVG paths and a 21 KB SVG file. The important part is that the source is a real transparent PNG; a screenshot with a checkerboard background will vectorize the checkerboard too and produce poor output.

`examples/svg-soft-orb/` is a smaller synthetic baseline demo for comparing a hand-made low-color source against a GPT-generated source.

## Quick Start

### SVG Route

```powershell
git clone <pet-forge-repo>
cd pet-forge

# Open the starter SVG pet in a browser:
# routes\svg\templates\hello-idle.svg.html

# Optional: remove background first if your PNG is not transparent.
py -3.13 -m pip install "rembg[cpu,cli]"
py -3.13 -m rembg i your-character.png your-character-clean.png

py -3.13 -m pip install Pillow numpy scipy vtracer
py -3.13 routes\svg\tools\png2svg\png2svg.py your-character-clean.png character.svg --preset apple-precise
```

Then copy the generated SVG paths into `routes/svg/templates/hello-idle.svg.html` and tune the CSS variables/presets.

The PNG-to-SVG step uses vtracer as the vectorization engine. It works best for simple, low-color, clean-edged graphics; complex photos, gradients, hair, texture, and noisy edges can produce huge or poor SVG output. Use the APNG route or redraw key shapes when the source image is complex.

### APNG Route

```powershell
git clone <pet-forge-repo>
cd pet-forge\routes\apng\tools

npm install
py -3 -m pip install Pillow numpy

copy .env.example .env
# Fill in your API keys in .env.

node test-api.js
node gen-images.js --prompt "A cute chibi ..." --output reference/main-ref.png --api doubao
node gen-video.js idle-dozing --image reference/main-ref.png --last-frame reference/main-ref.png --api doubao
```

If you need to rerun chroma key manually:

```powershell
py chroma_key.py output/idle-dozing/doubao-video.mp4 output/idle-dozing/result.apng --plays 0
```

## Repository Layout

```
pet-forge/
├── README.md
├── SKILL.md
├── CLAUDE.md
├── routes/
│   ├── svg/
│   │   ├── presets/
│   │   ├── templates/
│   │   ├── conventions/
│   │   ├── lessons/
│   │   └── tools/png2svg/
│   └── apng/
│       ├── prompts/
│       ├── conventions/
│       ├── lessons/
│       └── tools/
├── shared/
└── examples/
```

## What This Repo Does Not Do

- It does not include finished character assets.
- It does not ship private source project files.
- It does not provide API keys or pay for generation services.
- It does not make aesthetic decisions for you.
- It does not promise one-click generation of a complete multi-state pet.

## License

The repository documentation, templates, and original wrapper code are MIT licensed. See [LICENSE](LICENSE).

Some scripts were adapted from earlier internal prototypes; public releases should keep source/attribution notes where applicable. Character designs, generated art, and product assets are separate from this toolkit and are not included.
