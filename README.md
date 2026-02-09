# Snap-to-Road Map

Interactive visualization tool for the [NextBillion.ai Snap-to-Road API](https://docs.nextbillion.io/docs/api/snap-to-road). Click points on a map, see the snapped route, inspect edge segments, and explore the raw API response.

## Features

- **Interactive map** — Click to place waypoints on a MapLibre GL map using NextBillion.ai Orbis tiles
- **Draggable points** — Drag markers to reposition waypoints; the route re-snaps automatically
- **Snap-to-road** — Calls the NextBillion.ai Snap-to-Road API and renders the snapped polyline
- **Edge segmentation** — Black dots mark edge boundaries from `debug_info.edge_info`
- **Edge inspection** — Click or right-click an edge dot (or the route line) to view all edge attributes in the side panel
- **JSON response viewer** — Expandable/collapsible tree view of the full API response
- **Point management** — Add, remove, and reorder points from the side panel

## Getting Started

### Prerequisites

- Node.js 18+
- A [NextBillion.ai API key](https://nextbillion.ai/)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your API key in the top bar.

## Usage

1. Enter your NextBillion.ai API key
2. Click on the map to add waypoints (minimum 2 required)
3. The snapped route renders automatically with edge boundary dots
4. **Left-click** an edge dot to view its attributes in the side panel
5. **Right-click** the route line to inspect the nearest edge
6. **Drag** a marker to reposition it — the route re-snaps on drop
7. Use the JSON panel at the bottom to explore the raw API response

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/)
- [MapLibre GL JS](https://maplibre.org/)
- [NextBillion.ai Orbis Map Tiles](https://docs.nextbillion.io/docs/maps/orbis-maps)
- [@mapbox/polyline](https://github.com/mapbox/polyline) for geometry decoding
- TypeScript

## API Parameters

The app calls the Snap-to-Road API with these parameters:

| Parameter | Value |
|-----------|-------|
| `mode` | `car` |
| `radiuses` | `25` per point |
| `interpolate` | `true` |
| `option` | `flexible` |
| `road_info` | `way_id\|max_speed` |
| `detail` | `true` |
| `debug` | `true` |

## Project Structure

```
app/
  layout.tsx          # Root layout
  page.tsx            # Main page with state management
  globals.css         # All styles
components/
  ApiKeyInput.tsx     # API key input bar
  MapView.tsx         # MapLibre map with layers and interactions
  PointsPanel.tsx     # Side panel for points and edge info
  JsonResponsePanel.tsx  # JSON response panel with controls
  JsonTree.tsx        # Interactive JSON tree viewer
lib/
  snapToRoad.ts       # API client and response parsing
  types.ts            # TypeScript type definitions
```

## License

MIT
