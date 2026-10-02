# Design source

UI mockups made with Claude Design from [docs/DESIGN_BRIEF.md](../docs/DESIGN_BRIEF.md) and the staged prompts in [docs/DESIGN_PROMPTS.md](../docs/DESIGN_PROMPTS.md).

- `canvas/project/*.dc.html`: one file per screen in Claude Design's "Design Component" format. They need Claude Design's runtime to render, so read them as source (markup, copy, states, sample data) rather than opening them in a browser.
- `canvas/project/canvas.json`: the canvas index (screen titles and layout).
- `registry-globals.css`: the original theme token export. The live, merged version is [src/app/globals.css](../src/app/globals.css).

How these map to app routes, colour tokens and components: [docs/UI_GUIDE.md](../docs/UI_GUIDE.md).

Live canvas: https://claude.ai/artifact/7Uah6X9XoPaice8LJq56t9
