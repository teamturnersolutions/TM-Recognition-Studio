# Template Manifest Specification (Schema v1.0)

TM Recognition Studio decouples presentation templates from recognition data and application UI components. Every template is an independently versioned, read-only package stored under `public/templates/` (or mounted read-only at `/usr/share/nginx/html/templates` in Docker).

## Directory Structure

```text
templates/
├── index.json                       # Template registry listing installed packages
└── <template-id>/
    ├── manifest.json                # Authoritative layout, typography, and fitting rules
    ├── nominees-background.<ext>    # Static background artwork for Slide 1
    ├── winner-background.<ext>      # Static background artwork for Slide 2
    └── fonts/                       # Local self-hosted .woff2 fonts (no external URLs)
```

## Registry Format (`templates/index.json`)

```json
{
  "schemaVersion": "1.0",
  "templates": [
    {
      "id": "bjs-spotlight",
      "manifestPath": "/templates/bjs-spotlight/manifest.json"
    }
  ]
}
```

## Manifest Top-Level Fields (`manifest.json`)

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `"1.0"` | Yes | Manifest schema version |
| `id` | `string` | Yes | Unique template identifier (matches folder name) |
| `name` | `string` | Yes | Human-readable display name shown in Builder |
| `version` | `string` | Yes | Semantic version of this template package (e.g., `"1.0.0"`) |
| `description` | `string` | No | Optional summary shown in template selector |
| `canvas` | `{ width: number, height: number }` | Yes | Fixed deterministic export dimensions (`1920 × 1080`) |
| `fonts` | `TemplateFontAsset[]` | Yes | Local `.woff2` font files preloaded via `FontFace` before rendering |
| `slides` | `{ nominees: SlideDefinition, winner: SlideDefinition }` | Yes | Region definitions for both presentation slides |

## Normalized Coordinate System

All region rectangles (`rect`) use normalized coordinates in the `[0.0, 1.0]` range relative to `canvas.width` and `canvas.height`:

- `x`: Left edge fraction (`0` = left edge of canvas, `1` = right edge)
- `y`: Top edge fraction (`0` = top edge of canvas, `1` = bottom edge)
- `width`: Width fraction (`x + width <= 1`)
- `height`: Height fraction (`y + height <= 1`)
- `borderRadius` *(optional)*: Corner radius expressed as a fraction of `min(canvas.width, canvas.height)`

## Slide Background (`background`)

- `asset`: Filename relative to the template directory (e.g., `"nominees-background.jpg"`)
- `fit`: `"contain"` (preserves aspect ratio with `backdropColor` framing), `"cover"` (aspect-preserving fill), or `"fill"`
- `backdropColor`: Hex color painted behind the background image

## Image Regions (`imageRegions`)

- `id`: Unique region identifier
- `binding`: `"nominee.0.photo"` .. `"nominee.5.photo"` or `"winner.photo"`
- `rect`: Normalized bounding box
- `fit`: `"cover"` (aspect-ratio-preserving crop; never stretches or distorts)
- `focalPoint` *(optional)*: `{ x, y }` in `[0..1]`, defaults to `{ x: 0.5, y: 0.35 }` to keep portrait heads well-framed
- `placeholder`:
  - `mode`: `"neutral-silhouette"` (renders clean silhouette when photo is omitted) or `"template-artwork"` (reveals underlying background)
  - `backgroundColor`, `foregroundColor`: Optional colors for `neutral-silhouette`

## Text Regions (`textRegions`)

- `id`: Unique region identifier
- `binding`: `"nominee.0.name"` .. `"nominee.5.name"`, `"winner.name"`, `"winner.storeDepartment"`, `"winner.category"`, or `"winner.summary"`
- `rect`: Normalized bounding box (text is strictly clipped to this region)
- `prefix` *(optional)*: Static prefix prepended before the bound value (e.g., `"Store / Dept: "`, `"Category: "`)
- `maskFill` *(optional)*: Hex fill drawn inside `rect` prior to text rendering (useful when the base background image contains baked-in placeholder labels)
- `padding` *(optional)*: `{ x, y }` normalized horizontal/vertical inset
- `font`: `{ family, weight, style, maxSizePx, minSizePx, lineHeight, color, textTransform }`
- `align`: `"left" | "center" | "right"`
- `verticalAlign`: `"top" | "middle" | "bottom"`
- `maxLines`: Maximum allowed wrapped lines
- `overflow`: `"shrink-then-ellipsis" | "shrink-only"`

## Adding a New Template Package

1. Create a new directory under `public/templates/<new-id>/` containing `manifest.json`, background assets, and local `.woff2` fonts.
2. Add an entry to `public/templates/index.json`.
3. No changes to React components, validation logic, or the rendering engine are required.
4. In Docker deployments, you may mount an external read-only folder to `/usr/share/nginx/html/templates:ro` in `docker-compose.yml`.
