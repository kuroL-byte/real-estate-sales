# MISSION: Living Architectural Anatomy Engine (Interactive Real Estate Cutaway)

## 1. Directive
Build a zero-dependency, 60fps interactive isometric architectural sales engine in React + Tailwind CSS. 
The app replaces static real estate brochures and maquettes with a digital twin that buyers can peel open, simulate sunlight on, and inspect floor-by-floor.

## 2. Technical Invariants (Do Not Deviate)
- **Zero WebGL/3D file bloat**: Use pure mathematical SVG projection. No Three.js or heavy `.gltf` meshes.
- **Performance**: The vertical explosion must execute via hardware-accelerated CSS `translate3d(0, -Ypx, 0)` on parent `<g>` tags. Never recalculate SVG path points in JavaScript loops during animation.
- **Dynamic Shading**: Shading across faces (Top, Left, Right) must be calculated via Lambertian dot product using sun azimuth and injected into CSS variables.
- **Topological Sorting**: DOM order must render Substructure first and Sky Penthouse last to preserve depth occlusion.

## 3. Key Components to Implement
- `src/components/ArchitecturalAnatomy.jsx`: Core SVG isometric canvas with explosion physics and sun path controls.
- `src/components/FloorInspector.jsx`: Detail drawer showing RERA carpet area, ceiling height, Vastu score, and unit specs.
- `src/components/SalesControls.jsx`: HUD with Explode slider, Daylight dial, X-Ray toggle, and WhatsApp share trigger.
- `src/data/towerData.js`: Data structure holding 5 structural tiers, room dimensions, MEP conduits, and price matrices.