import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { TOWER_DATA } from "../data/towerData";

// Palette
const BRONZE = "#C5A880";
const BRONZE_LIGHT = "#D4B895";
const PLATINUM = "#F1F3F5";
const CANVAS_CX = 400;
const CANVAS_CY = 490;
const COS30 = 0.866025; // Math.cos(Math.PI / 6)
const SIN30 = 0.5;

// Procedural 3D Neighboring Buildings in World Space
const NEIGHBOR_BUILDINGS = [
  { id: "nb-nw", x0: -330, x1: -260, y0: -260, y1: -190, H: 175, color: "#111622", name: "One Horizon" },
  { id: "nb-ne", x0: 260, x1: 330, y0: -240, y1: -170, H: 145, color: "#131826", name: "The Crest" },
  { id: "nb-se", x0: 270, x1: 350, y0: 170, y1: 250, H: 195, color: "#111622", name: "Equinox Tower" },
  { id: "nb-sw", x0: -340, x1: -260, y0: 180, y1: 250, H: 130, color: "#141A28", name: "Vanguard Spire" },
  { id: "nb-n",  x0: -140, x1: -60,  y0: -380, y1: -300, H: 215, color: "#101420", name: "Aria Central" },
  { id: "nb-n2", x0: 70,   x1: 150,  y0: -380, y1: -300, H: 165, color: "#121724", name: "Metropolitan" },
  { id: "nb-s",  x0: -140, x1: -60,  y0: 290,  y1: 360,  H: 120, color: "#131826", name: "Regent Pavilion" },
  { id: "nb-s2", x0: 70,   x1: 150,  y0: 280,  y1: 350,  H: 155, color: "#111622", name: "Solaris Hub" },
];

export default function ArchitecturalAnatomy() {
  // Projection Mode: 'straight' (True Frontal Axonometric) | 'isometric' (360° Orbit)
  const [projectionMode, setProjectionMode] = useState("straight");

  // 3D Canvas Transform State
  const [orbitAngle, setOrbitAngle] = useState(35); // 0 to 360 degrees
  const [zoom, setZoom] = useState(1.0); // 0.6 to 2.8
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState("pan"); // 'pan' (Default) | 'rotate'
  const currentDragModeRef = useRef("pan");
  const dragStartRef = useRef({ x: 0, y: 0, initialAngle: 35, initialPan: { x: 0, y: 0 } });

  // Auto-Orbit state
  const [isAutoOrbit, setIsAutoOrbit] = useState(false);

  // Sales HUD State
  const [explodeGap, setExplodeGap] = useState(0.35); // 0.0 to 1.0
  const [sunTime, setSunTime] = useState(11); // 7 to 18 (7 AM to 6 PM)
  const [activeTierId, setActiveTierId] = useState("tier-residences");
  const [selectedSuiteId, setSelectedSuiteId] = useState("suite-01"); // Individual unit inspection
  const [isXRay, setIsXRay] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [dollhouseMode, setDollhouseMode] = useState(true); // true = show 3D interior architecture

  // Auto-Orbit Loop
  useEffect(() => {
    if (!isAutoOrbit) return;
    if (projectionMode !== "isometric") {
      setProjectionMode("isometric");
    }
    let lastTime = performance.now();
    let frameId;
    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setOrbitAngle((prev) => (prev + dt * 14) % 360);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isAutoOrbit, projectionMode]);

  // Radians for current orbit
  const rad = useMemo(() => (orbitAngle * Math.PI) / 180, [orbitAngle]);
  const cosRad = useMemo(() => Math.cos(rad), [rad]);
  const sinRad = useMemo(() => Math.sin(rad), [rad]);

  // Master Projection Function: Straight Plan Oblique vs 360° Z-Axis Isometric
  const project = useCallback((x, y, z) => {
    if (projectionMode === "straight") {
      // True Frontal Axonometric (Plan Oblique)
      const depthScale = 0.55;
      const rad30 = (30 * Math.PI) / 180;
      const isoX = CANVAS_CX + x + y * Math.cos(rad30) * depthScale;
      const isoY = CANVAS_CY - z - y * Math.sin(rad30) * depthScale;
      return { x: isoX, y: isoY, depth: -y, rx: x, ry: y, z };
    } else {
      // 360° Rotatable Isometric Orbit
      const rx = x * cosRad - y * sinRad;
      const ry = x * sinRad + y * cosRad;
      const isoX = CANVAS_CX + (rx - ry) * COS30;
      const isoY = CANVAS_CY + (rx + ry) * SIN30 - z;
      const depth = rx + ry;
      return { x: isoX, y: isoY, depth, rx, ry, z };
    }
  }, [projectionMode, cosRad, sinRad]);

  // Visibility test for vertical walls
  const isWallVisible = useCallback((nx, ny) => {
    if (projectionMode === "straight") {
      return ny < -0.01 || nx > 0.01;
    }
    const rnx = nx * cosRad - ny * sinRad;
    const rny = nx * sinRad + ny * cosRad;
    return rnx + rny > -0.01;
  }, [projectionMode, cosRad, sinRad]);

  // Helper for converting an array of 3D points [[x,y,z], ...] to SVG polygon points string
  const toPoly = useCallback((pts) => {
    return pts.map(([x, y, z]) => {
      const p = project(x, y, z);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");
  }, [project]);

  // Celestial Sun Position in World Space
  const sunAngle = useMemo(() => ((sunTime - 7) / 11) * Math.PI, [sunTime]);
  const sunWorld = useMemo(() => {
    const sunDistance = 440;
    const sunWorldX = Math.cos(sunAngle) * sunDistance;
    const sunWorldY = -220; // Recessed behind the tower
    const sunWorldZ = Math.sin(sunAngle) * 360 + 50;
    return { x: sunWorldX, y: sunWorldY, z: sunWorldZ };
  }, [sunAngle]);

  const sunScreen = useMemo(() => project(sunWorld.x, sunWorld.y, sunWorld.z), [project, sunWorld]);

  // Dynamic Sky Gradient Shift & Solar Lighting
  const skyColors = useMemo(() => {
    if (sunTime <= 8.5) {
      // Dawn (07:00 - 09:00): Deep Indigo to Terracotta & Warm Rose
      return {
        top: "#131024",
        mid: "#4A2035",
        bottom: "#C25E42",
        glow: "rgba(194, 94, 66, 0.42)",
        sunColor: "#F97316",
        sunCore: "#FFF7ED",
        rayOpacity: 0.16,
      };
    } else if (sunTime <= 10.5) {
      // Morning golden transition
      return {
        top: "#0F1220",
        mid: "#252038",
        bottom: "#5B3A48",
        glow: "rgba(212, 184, 149, 0.3)",
        sunColor: "#FBBF24",
        sunCore: "#FFFBEB",
        rayOpacity: 0.13,
      };
    } else if (sunTime <= 14.5) {
      // Midday (11:00 - 14:00): Architectural Daylight Slate
      return {
        top: "#0B101D",
        mid: "#152238",
        bottom: "#2D4568",
        glow: "rgba(147, 197, 253, 0.25)",
        sunColor: "#FDE047",
        sunCore: "#FFFFFF",
        rayOpacity: 0.11,
      };
    } else if (sunTime <= 16.5) {
      // Late Afternoon
      return {
        top: "#0E0E1B",
        mid: "#2A1C2C",
        bottom: "#6A3538",
        glow: "rgba(245, 158, 11, 0.35)",
        sunColor: "#F59E0B",
        sunCore: "#FFFBEB",
        rayOpacity: 0.14,
      };
    } else {
      // Golden Hour / Sunset (16:00 - 18:00): Dusk Obsidian to Rich Amber & Bronze
      return {
        top: "#0D0B16",
        mid: "#3A1924",
        bottom: "#B45309",
        glow: "rgba(180, 83, 9, 0.48)",
        sunColor: "#EA580C",
        sunCore: "#FFF7ED",
        rayOpacity: 0.18,
      };
    }
  }, [sunTime]);

  // Lighting computation using sun azimuth and Lambertian dot product
  const lighting = useMemo(() => {
    const sunDir = { x: Math.cos(sunAngle), y: Math.sin(sunAngle), z: 0.95 };
    const mag = Math.hypot(sunDir.x, sunDir.y, sunDir.z);
    const L = { x: sunDir.x / mag, y: sunDir.y / mag, z: sunDir.z / mag };

    const calcDot = (nx, ny, nz) => {
      if (projectionMode === "straight") {
        const dot = Math.max(0, nx * L.x + ny * L.y + nz * L.z);
        return 0.22 + 0.78 * dot;
      }
      const rnx = nx * cosRad - ny * sinRad;
      const rny = nx * sinRad + ny * cosRad;
      const dot = Math.max(0, rnx * L.x + rny * L.y + nz * L.z);
      return 0.2 + 0.8 * dot;
    };

    return {
      top: 0.28 + 0.72 * Math.max(0, L.z),
      calcDot,
      sunTime,
    };
  }, [sunAngle, sunTime, projectionMode, cosRad, sinRad]);

  // Dynamic Cast Shadow on Ground Plane
  const groundShadow = useMemo(() => {
    const shadowStretchX = -Math.cos(sunAngle) * 170;
    const shadowStretchY = 25 - Math.sin(sunAngle) * 12;
    const shadowRx = 100 + Math.abs(Math.cos(sunAngle)) * 135;
    const shadowRy = 48 - Math.abs(Math.cos(sunAngle)) * 14;
    return {
      cx: 400 + shadowStretchX * 0.7,
      cy: 580 + shadowStretchY,
      rx: shadowRx,
      ry: shadowRy,
      opacity: 0.35 + Math.sin(sunAngle) * 0.25,
    };
  }, [sunAngle]);

  // Mouse / Pointer handlers for Rotate & Pan
  const handleMouseDown = (e) => {
    const effectiveMode = (e.button === 1 || e.button === 2 || e.shiftKey) ? "pan" : activeTool;
    currentDragModeRef.current = effectiveMode;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialAngle: orbitAngle,
      initialPan: { ...pan },
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (currentDragModeRef.current === "rotate") {
      if (projectionMode === "straight") {
        setProjectionMode("isometric");
      }
      const newAngle = (dragStartRef.current.initialAngle + dx * 0.5) % 360;
      setOrbitAngle(newAngle < 0 ? newAngle + 360 : newAngle);
    } else {
      setPan({
        x: dragStartRef.current.initialPan.x + dx / zoom,
        y: dragStartRef.current.initialPan.y + dy / zoom,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 0.91;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.6), 2.8));
  };

  const activeTier = TOWER_DATA.find((t) => t.id === activeTierId) || TOWER_DATA[3];
  const residentialSuites = TOWER_DATA.find((t) => t.id === "tier-residences")?.suites || [];
  const activeSuite = residentialSuites.find((s) => s.id === selectedSuiteId) || residentialSuites[0];

  // Helper to render a 3D cuboid block [x0, x1] x [y0, y1] x [z0, z1]
  const renderBox = (
    x0, x1, y0, y1, z0, z1,
    baseFill = "#1E2532",
    stroke = "rgba(255,255,255,0.08)",
    strokeW = 0.5,
    isPillar = false
  ) => {
    const walls = [
      {
        normal: [1, 0, 0],
        pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
        center: [x1, (y0 + y1) / 2],
      },
      {
        normal: [0, 1, 0],
        pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
        center: [(x0 + x1) / 2, y1],
      },
      {
        normal: [-1, 0, 0],
        pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]],
        center: [x0, (y0 + y1) / 2],
      },
      {
        normal: [0, -1, 0],
        pts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
        center: [(x0 + x1) / 2, y0],
      },
    ];

    const visibleWalls = walls.filter((w) => isWallVisible(w.normal[0], w.normal[1]));
    const sortedWalls = [...visibleWalls].sort((a, b) => {
      const pA = project(a.center[0], a.center[1], z0);
      const pB = project(b.center[0], b.center[1], z0);
      return pA.depth - pB.depth;
    });

    const topPts = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];

    return (
      <g>
        {sortedWalls.map((w, wi) => {
          const dot = lighting.calcDot(w.normal[0], w.normal[1], 0);
          return (
            <g key={wi}>
              <polygon
                points={toPoly(w.pts)}
                fill={baseFill}
                style={{ filter: `brightness(${dot.toFixed(2)})` }}
                stroke={stroke}
                strokeWidth={strokeW}
                strokeLinejoin="round"
              />
              {isPillar && z0 <= 3 && (
                <polygon
                  points={toPoly([
                    [w.pts[0][0], w.pts[0][1], z0 + 1],
                    [w.pts[1][0], w.pts[1][1], z0 + 1],
                    [w.pts[1][0], w.pts[1][1], z0 + 6],
                    [w.pts[0][0], w.pts[0][1], z0 + 6],
                  ])}
                  fill="#F59E0B"
                  fillOpacity="0.8"
                  stroke="#1E2430"
                  strokeWidth="0.4"
                />
              )}
            </g>
          );
        })}
        <polygon
          points={toPoly(topPts)}
          fill={baseFill}
          style={{ filter: `brightness(${lighting.top.toFixed(2)})` }}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeLinejoin="round"
        />
      </g>
    );
  };

  // Render Procedural 3D Neighboring City Buildings
  const renderNeighborBuildings = () => {
    // Sort buildings back to front based on depth so they overlap correctly
    const sortedNeighbors = [...NEIGHBOR_BUILDINGS].sort((a, b) => {
      const cxA = (a.x0 + a.x1) / 2;
      const cyA = (a.y0 + a.y1) / 2;
      const cxB = (b.x0 + b.x1) / 2;
      const cyB = (b.y0 + b.y1) / 2;
      const pA = project(cxA, cyA, 0);
      const pB = project(cxB, cyB, 0);
      return pA.depth - pB.depth;
    });

    return (
      <g opacity="0.82" className="pointer-events-none">
        {sortedNeighbors.map((nb) => {
          const cx = (nb.x0 + nb.x1) / 2;
          const cy = (nb.y0 + nb.y1) / 2;
          const pTopCenter = project(cx, cy, nb.H);
          const pSpireTip = project(cx, cy, nb.H + 28);

          return (
            <g key={nb.id}>
              {/* 3D Massing Box */}
              {renderBox(
                nb.x0, nb.x1, nb.y0, nb.y1, 0, nb.H,
                nb.color,
                "#252F42",
                0.5
              )}

              {/* Faint Warm Interior Light Windows (15% opacity) */}
              {[0.25, 0.45, 0.65, 0.85].map((hRatio, hi) => {
                const zWin = nb.H * hRatio;
                const pW1 = project(nb.x0 + 8, nb.y0, zWin);
                const pW2 = project(nb.x1 - 8, nb.y0, zWin);
                return (
                  <line
                    key={`nb-win-${hi}`}
                    x1={pW1.x}
                    y1={pW1.y}
                    x2={pW2.x}
                    y2={pW2.y}
                    stroke="#D4B895"
                    strokeWidth="1.2"
                    strokeOpacity="0.15"
                    strokeDasharray="4 3"
                  />
                );
              })}

              {/* Slender Rooftop Spire & Red Aviation Beacon */}
              <line
                x1={pTopCenter.x}
                y1={pTopCenter.y}
                x2={pSpireTip.x}
                y2={pSpireTip.y}
                stroke="#334155"
                strokeWidth="1.0"
              />
              <circle cx={pSpireTip.x} cy={pSpireTip.y} r="1.5" fill="#EF4444" opacity="0.9" />
            </g>
          );
        })}
      </g>
    );
  };

  // Render 3D Ground Vector Circulation & Road Grid
  const render3DGroundGrid = () => {
    // Street arterials extending to the horizon
    const streets = [
      [[-440, 0, 0], [-150, 0, 0]], // West Ave
      [[150, 0, 0], [440, 0, 0]],   // East Ave
      [[0, -440, 0], [0, -140, 0]], // North Blvd
      [[0, 140, 0], [0, 440, 0]],   // South Blvd
    ];

    // Perimeter circular street lamp node coordinates
    const lampCoords = [
      [-260, 0], [-184, -184], [0, -260], [184, -184],
      [260, 0], [184, 184], [0, 260], [-184, 184],
    ];

    return (
      <g className="pointer-events-none">
        {/* Street Lines */}
        {streets.map(([pA, pB], si) => {
          const sA = project(pA[0], pA[1], pA[2]);
          const sB = project(pB[0], pB[1], pB[2]);
          return (
            <g key={`st-${si}`}>
              <line
                x1={sA.x} y1={sA.y}
                x2={sB.x} y2={sB.y}
                stroke="#1B2332"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1={sA.x} y1={sA.y}
                x2={sB.x} y2={sB.y}
                stroke="#D4B895"
                strokeWidth="0.8"
                strokeDasharray="6 4"
                strokeOpacity="0.4"
              />
            </g>
          );
        })}

        {/* Outer Perimeter Landscaping Ring */}
        <polygon
          points={lampCoords.map(([lx, ly]) => {
            const p = project(lx * 1.35, ly * 1.35, 0);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="#16202E"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />

        {/* Ambient Street Lamp Node Points */}
        {lampCoords.map(([lx, ly], li) => {
          const pLamp = project(lx, ly, 0);
          return (
            <g key={`lamp-${li}`}>
              <circle cx={pLamp.x} cy={pLamp.y} r="8" fill="url(#bollardGlow)" />
              <circle cx={pLamp.x} cy={pLamp.y} r="1.8" fill="#F1F3F5" />
            </g>
          );
        })}
      </g>
    );
  };

  // Render Luxury Vehicles in Basement
  const renderVehicle = (car, baseZ = 2) => {
    const { x, y, w, d, color, model, hasCharger } = car;
    const bodyH = 8.5;
    const cabinH = 6.5;
    const insetX = 2.5;
    const insetY = 4;

    const pFrontL = project(x + 1.5, y, baseZ + 4);
    const pFrontR = project(x + w - 1.5, y, baseZ + 4);
    const pRearL = project(x + 1.5, y + d, baseZ + 5);
    const pRearR = project(x + w - 1.5, y + d, baseZ + 5);

    const wheels = [
      [x - 0.5, y + 6],
      [x + w + 0.5, y + 6],
      [x - 0.5, y + d - 8],
      [x + w + 0.5, y + d - 8],
    ];

    return (
      <g key={model}>
        {renderBox(x, x + w, y, y + d, baseZ, baseZ + bodyH, color, "rgba(255,255,255,0.18)", 0.6)}

        {renderBox(
          x + insetX,
          x + w - insetX,
          y + insetY + 3,
          y + d - insetY - 1,
          baseZ + bodyH,
          baseZ + bodyH + cabinH,
          "#090C12",
          "#38BDF8",
          0.5
        )}

        <polygon
          points={toPoly([
            [x + insetX + 1, y + insetY + 5, baseZ + bodyH + cabinH],
            [x + w - insetX - 1, y + insetY + 5, baseZ + bodyH + cabinH],
            [x + w - insetX - 1, y + d - insetY - 3, baseZ + bodyH + cabinH],
            [x + insetX + 1, y + d - insetY - 3, baseZ + bodyH + cabinH],
          ])}
          fill="rgba(56, 189, 248, 0.28)"
          stroke="rgba(241, 243, 245, 0.5)"
          strokeWidth="0.4"
        />

        <line
          x1={pFrontL.x} y1={pFrontL.y}
          x2={pFrontR.x} y2={pFrontR.y}
          stroke="#E0F2FE" strokeWidth="2.2" strokeLinecap="round" filter="url(#cyanGlow)"
        />

        <line
          x1={pRearL.x} y1={pRearL.y}
          x2={pRearR.x} y2={pRearR.y}
          stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"
        />

        {wheels.map(([wx, wy], wi) => {
          const pWh = project(wx, wy, baseZ + 2.5);
          return (
            <circle
              key={`wh-${wi}`}
              cx={pWh.x} cy={pWh.y} r="2.2"
              fill="#1E293B" stroke="#94A3B8" strokeWidth="0.8"
            />
          );
        })}

        {hasCharger && (
          <g>
            {renderBox(x + w / 2 - 2.5, x + w / 2 + 2.5, y + d + 3, y + d + 7, baseZ, baseZ + 15, "#141A24", "#38BDF8", 0.6)}
            {(() => {
              const pPedTop = project(x + w / 2, y + d + 5, baseZ + 13);
              const pPedMid = project(x + w / 2, y + d + 5, baseZ + 5);
              const pCarPort = project(x + w - 1, y + d - 5, baseZ + 4.5);
              return (
                <g>
                  <line
                    x1={pPedMid.x} y1={pPedMid.y}
                    x2={pPedTop.x} y2={pPedTop.y}
                    stroke="#00F5FF" strokeWidth="1.8" strokeLinecap="round" filter="url(#cyanGlow)"
                  />
                  <path
                    d={`M ${pPedMid.x} ${pPedMid.y} Q ${(pPedMid.x + pCarPort.x) / 2 + 3} ${(pPedMid.y + pCarPort.y) / 2 + 6} ${pCarPort.x} ${pCarPort.y}`}
                    fill="none" stroke="#0B0F17" strokeWidth="1.8"
                  />
                  <circle cx={pCarPort.x} cy={pCarPort.y} r="1.5" fill="#00F5FF" filter="url(#cyanGlow)" />
                </g>
              );
            })()}
          </g>
        )}
      </g>
    );
  };

  // Render Basement Parking Stalls & EV Fleet
  const renderBasementParking = (baseZ = 1.5) => {
    const cars = [
      { x: -74, y: 12, w: 22, d: 38, color: "#0F1318", model: "Porsche Taycan EV", hasCharger: true },
      { x: -44, y: 10, w: 24, d: 42, color: "#162326", model: "Range Rover EV Flagship", hasCharger: true },
      { x: -14, y: 11, w: 22, d: 40, color: "#2E241A", model: "Lucid Air Sapphire", hasCharger: true },
      { x: 16, y: 12, w: 22, d: 38, color: "#E2E8F0", model: "Audi RS e-tron GT", hasCharger: true },
      { x: 46, y: 10, w: 24, d: 42, color: "#141926", model: "Rolls-Royce Spectre", hasCharger: true },
    ];

    const bayXCoords = [-78, -48, -18, 12, 42, 72];

    return (
      <g>
        <polygon
          points={toPoly([
            [-88, -4, baseZ],
            [88, -4, baseZ],
            [88, 70, baseZ],
            [-88, 70, baseZ],
          ])}
          fill="#10141D"
          stroke="#1F2837"
          strokeWidth="0.8"
        />

        {bayXCoords.map((bx, bi) => {
          const pStart = project(bx, 6, baseZ + 0.2);
          const pEnd = project(bx, 62, baseZ + 0.2);
          return (
            <line
              key={`bay-line-${bi}`}
              x1={pStart.x} y1={pStart.y}
              x2={pEnd.x} y2={pEnd.y}
              stroke={BRONZE} strokeWidth="0.8" strokeDasharray="4 2" strokeOpacity="0.75"
            />
          );
        })}

        {bayXCoords.slice(0, 5).map((bx, bi) => {
          const pNum = project(bx + 15, 57, baseZ + 0.3);
          return (
            <text
              key={`stall-txt-${bi}`}
              x={pNum.x} y={pNum.y}
              textAnchor="middle" fontSize="6" fontFamily="JetBrains Mono" fontWeight="600"
              fill={BRONZE_LIGHT} letterSpacing="0.08em" opacity="0.9"
            >
              {`EV-0${bi + 1}`}
            </text>
          );
        })}

        {[-30, 0, 30].map((arrowX, ai) => {
          const pA = project(arrowX - 4, 3, baseZ + 0.2);
          const pB = project(arrowX + 4, 3, baseZ + 0.2);
          const pC = project(arrowX, -1, baseZ + 0.2);
          return (
            <polygon
              key={`arrow-${ai}`}
              points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`}
              fill="#CBD5E1" fillOpacity="0.45"
            />
          );
        })}

        {renderBox(-50, -42, 62, 70, baseZ, baseZ + 28, "#252E3E", "#475569", 0.6, true)}
        {renderBox(-10, -2, 62, 70, baseZ, baseZ + 28, "#252E3E", "#475569", 0.6, true)}
        {renderBox(30, 38, 62, 70, baseZ, baseZ + 28, "#252E3E", "#475569", 0.6, true)}

        {cars.map((car) => renderVehicle(car, baseZ + 0.5))}
      </g>
    );
  };

  // Render 3D miniature furniture pieces inside dollhouse
  const renderFurniture = (item, baseZ = 2) => {
    const { type, x, y, w, d } = item;
    const x0 = x;
    const x1 = x + w;
    const y0 = y;
    const y1 = y + d;

    if (type === "king_bed") {
      const headboardD = Math.min(8, d * 0.2);
      return (
        <g key={`${x}-${y}`}>
          {renderBox(x0 - 2, x1 + 2, y0 - 2, y1 + 2, baseZ, baseZ + 3, "#2D241E", "#3E3228")}
          {renderBox(x0, x1, y0 + headboardD, y1, baseZ + 3, baseZ + 9, "#E2E8F0", "#CBD5E1")}
          {renderBox(x0, x1, y1 - d * 0.35, y1, baseZ + 9.2, baseZ + 10.2, BRONZE, "#A68A64")}
          {renderBox(x0 - 4, x1 + 4, y0, y0 + headboardD, baseZ, baseZ + 16, "#1A202C", BRONZE, 0.75)}
          {renderBox(x0 - 12, x0 - 3, y0 + 1, y0 + 12, baseZ, baseZ + 6, "#2D241E", BRONZE, 0.5)}
          {renderBox(x1 + 3, x1 + 12, y0 + 1, y0 + 12, baseZ, baseZ + 6, "#2D241E", BRONZE, 0.5)}
        </g>
      );
    }

    if (type === "sofa_l") {
      const backW = Math.min(10, w * 0.25);
      return (
        <g key={`${x}-${y}`}>
          {renderBox(x0, x1, y0, y1, baseZ, baseZ + 6, "#242E3D", "#334155")}
          {renderBox(x0, x0 + backW, y0, y1, baseZ + 6, baseZ + 13, "#1E2734", "#475569")}
          {renderBox(x0, x1, y0, y0 + backW, baseZ + 6, baseZ + 13, "#1E2734", "#475569")}
          {renderBox(x0 + 12, x0 + 22, y0 + 1, y0 + 6, baseZ + 7, baseZ + 12, BRONZE, "#D4B895")}
        </g>
      );
    }

    if (type === "coffee_table") {
      return (
        <g key={`${x}-${y}`}>
          {renderBox(x0, x1, y0, y1, baseZ, baseZ + 4.5, "#0F131A", BRONZE, 0.75)}
          {renderBox(x0 + 1, x1 - 1, y0 + 1, y1 - 1, baseZ + 4.5, baseZ + 5.5, "#E2E8F0", "#CBD5E1")}
        </g>
      );
    }

    if (type === "dining_table") {
      return (
        <g key={`${x}-${y}`}>
          {renderBox(x0 + w * 0.2, x1 - w * 0.2, y0 + d * 0.2, y1 - d * 0.2, baseZ, baseZ + 8, "#1A202C", BRONZE)}
          {renderBox(x0, x1, y0, y1, baseZ + 8, baseZ + 10, "#F1F5F9", BRONZE, 0.75)}
        </g>
      );
    }

    if (type === "kitchen_island") {
      return (
        <g key={`${x}-${y}`}>
          {renderBox(x0, x1, y0, y1, baseZ, baseZ + 11, "#18202A", BRONZE, 0.75)}
          {renderBox(x0, x1, y0, y1, baseZ + 11, baseZ + 12.5, "#F1F5F9", "#CBD5E1")}
        </g>
      );
    }

    if (type === "pool") {
      return (
        <g key={`${x}-${y}`}>
          {renderBox(x0 - 4, x1 + 4, y0 - 4, y1 + 4, baseZ, baseZ + 3, "#E2E8F0", "#CBD5E1", 0.5)}
          <polygon
            points={toPoly([
              [x0, y0, baseZ + 2],
              [x1, y0, baseZ + 2],
              [x1, y1, baseZ + 2],
              [x0, y1, baseZ + 2],
            ])}
            fill="url(#poolWater)"
            stroke="#38BDF8"
            strokeWidth="0.8"
          />
        </g>
      );
    }

    return renderBox(x0, x1, y0, y1, baseZ, baseZ + 6, "#242E3D", "#475569");
  };

  // Render 16:9 Simulated Balcony Window Vista for Selected Suite
  const renderBalconyVistaBox = () => {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#090C12] mt-3">
        {/* Dynamic Landscape Panorama tailored to Suite facing axis */}
        <svg viewBox="0 0 400 225" className="w-full h-full">
          <defs>
            {/* Sunrise East Sky Gradient */}
            <linearGradient id="vistaSunrise" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#25162E" />
              <stop offset="40%" stopColor="#7C2D3B" />
              <stop offset="75%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>

            {/* Sunset West Sky Gradient */}
            <linearGradient id="vistaSunset" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#181126" />
              <stop offset="45%" stopColor="#581C32" />
              <stop offset="80%" stopColor="#C2410C" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>

            {/* Daylight Pool Sky Gradient */}
            <linearGradient id="vistaDaylight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B1324" />
              <stop offset="50%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* Balcony Glass Sheen */}
            <linearGradient id="balconyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="35%" stopColor="rgba(56,189,248,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>

          {/* 1. SCENIC PANORAMA BACKGROUND */}
          {activeSuite.viewType === "sunrise_hills" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaSunrise)" />
              {/* Rising Sun Disk */}
              <circle cx="280" cy="115" r="26" fill="#FEF08A" opacity="0.9" filter="url(#cyanGlow)" />
              <circle cx="280" cy="115" r="50" fill="#F59E0B" opacity="0.25" />
              {/* Far Layer Mountain Ridges */}
              <path d="M 0 155 Q 80 120 180 145 T 320 135 T 400 150 L 400 225 L 0 225 Z" fill="#2E1C2C" />
              {/* Mid Layer Tea/Forest Hills */}
              <path d="M 0 165 Q 110 135 220 160 T 360 148 T 400 165 L 400 225 L 0 225 Z" fill="#1B2824" />
              {/* Valley Morning Mist */}
              <rect x="0" y="145" width="400" height="25" fill="rgba(253, 230, 138, 0.18)" />
              {/* Near Landscaped Ridge */}
              <path d="M 0 180 Q 90 158 200 175 T 400 170 L 400 225 L 0 225 Z" fill="#121D1A" />
            </g>
          )}

          {activeSuite.viewType === "pool_gardens" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaDaylight)" />
              {/* Distant Horizon */}
              <rect x="0" y="75" width="400" height="150" fill="#0F172A" />
              {/* Podium Lawn & Deck */}
              <polygon points="20,105 380,105 400,225 0,225" fill="#15212D" stroke="#1E2E40" />
              {/* 25m Heated Lap Pool */}
              <polygon points="110,120 290,120 310,185 90,185" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
              {/* Water Caustics / Shimmer Lines */}
              <line x1="120" y1="135" x2="280" y2="135" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.6" strokeDasharray="12 8" />
              <line x1="105" y1="155" x2="295" y2="155" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.6" strokeDasharray="16 10" />
              <line x1="95" y1="172" x2="305" y2="172" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.6" strokeDasharray="14 12" />
              {/* Poolside Cabanas & Sun Loungers */}
              {[-60, -30, 0, 30, 60].map((cx, ci) => (
                <rect key={ci} x={200 + cx * 1.3} y="112" width="10" height="6" fill="#F1F5F9" opacity="0.85" rx="1" />
              ))}
              {/* Manicured Palm Trees / Zen Groves */}
              {[-120, -90, 90, 120].map((px, pi) => (
                <g key={pi}>
                  <circle cx={200 + px} cy="150" r="14" fill="#065F46" opacity="0.8" />
                  <circle cx={200 + px} cy="150" r="8" fill="#10B981" opacity="0.7" />
                </g>
              ))}
            </g>
          )}

          {activeSuite.viewType === "sunset_skyline" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaSunset)" />
              {/* Blazing Sunset Orb */}
              <circle cx="150" cy="120" r="32" fill="#FBBF24" opacity="0.9" />
              <circle cx="150" cy="120" r="60" fill="#EA580C" opacity="0.25" />
              {/* Distant High-Rise Skyline Silhouettes */}
              <g fill="#181422" opacity="0.95">
                <rect x="30" y="90" width="35" height="135" />
                <polygon points="30,90 47,65 65,90" />
                <rect x="80" y="115" width="45" height="110" />
                <rect x="180" y="85" width="48" height="140" />
                <line x1="204" y1="55" x2="204" y2="85" stroke="#181422" strokeWidth="1.5" />
                <rect x="240" y="105" width="55" height="120" />
                <rect x="310" y="75" width="50" height="150" />
                <polygon points="310,75 335,55 360,75" />
                <rect x="370" y="125" width="30" height="100" />
              </g>
              {/* Window Lights on Skyline */}
              <g fill="#FEF08A" opacity="0.3">
                {[100, 115, 130, 145].map((wy, wi) => (
                  <g key={wi}>
                    <rect x="190" y={wy} width="6" height="3" />
                    <rect x="205" y={wy} width="6" height="3" />
                    <rect x="320" y={wy - 15} width="6" height="3" />
                    <rect x="335" y={wy - 15} width="6" height="3" />
                  </g>
                ))}
              </g>
              {/* Elevated Expressway Ribbon */}
              <path d="M 0 185 Q 160 165 400 190" stroke="#F59E0B" strokeWidth="2.5" fill="none" opacity="0.75" />
              <path d="M 0 188 Q 160 168 400 193" stroke="#EF4444" strokeWidth="1.8" fill="none" opacity="0.65" />
            </g>
          )}

          {activeSuite.viewType === "boulevard_city" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaSunrise)" />
              {/* Grand Avenue Perspective */}
              <polygon points="180,95 220,95 380,225 20,225" fill="#111827" />
              {/* Tree-lined Avenue Ribbons */}
              <line x1="180" y1="95" x2="20" y2="225" stroke="#059669" strokeWidth="6" opacity="0.8" />
              <line x1="220" y1="95" x2="380" y2="225" stroke="#059669" strokeWidth="6" opacity="0.8" />
              {/* Modern City Blocks Flanking Boulevard */}
              <rect x="0" y="105" width="130" height="120" fill="#1E293B" />
              <rect x="270" y="105" width="130" height="120" fill="#1E293B" />
              {/* Street light streaks */}
              <line x1="200" y1="95" x2="200" y2="225" stroke="#FDE047" strokeWidth="1.5" strokeDasharray="14 10" opacity="0.7" />
            </g>
          )}

          {/* 2. ARCHITECTURAL BALCONY GLASS RAILING OVERLAY */}
          {/* Glass Railing Panel */}
          <rect x="15" y="155" width="370" height="65" fill="url(#balconyGlass)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" rx="2" />
          {/* Stainless Steel Handrail Cap */}
          <line x1="10" y1="155" x2="390" y2="155" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="10" y1="153.5" x2="390" y2="153.5" stroke="#94A3B8" strokeWidth="1" />
          {/* Railing Vertical Posts */}
          {[60, 130, 200, 270, 340].map((px, pi) => (
            <line key={`post-${pi}`} x1={px} y1="155" x2={px} y2="220" stroke="#CBD5E1" strokeWidth="1.8" />
          ))}
          {/* Balcony Timber Floor Edge */}
          <rect x="0" y="215" width="400" height="10" fill="#2E241A" stroke="#C5A880" strokeWidth="0.5" />
        </svg>

        {/* HUD Overlay Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-[#0A0D14]/85 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-[#E2E8F0]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>FLOOR 14 · +52m AGL</span>
        </div>

        <div className="absolute top-2.5 right-2.5 bg-[#0A0D14]/85 backdrop-blur-md border border-[#C5A880]/30 px-2 py-0.5 rounded text-[10px] font-mono text-[#C5A880] font-semibold">
          {activeSuite.axis}
        </div>

        <div className="absolute bottom-2.5 left-2.5 bg-[#0A0D14]/90 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300">
          <strong className="text-white">{activeSuite.name}</strong> · {activeSuite.balcony}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-[#080A0E] text-[#EDECEA] flex flex-col lg:flex-row overflow-hidden select-none font-sans">

      {/* 3D Visual Stage */}
      <div
        className="relative flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top Header Monograph Title & Mode Switcher */}
        <div className="absolute top-5 left-6 z-20 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#C5A880] animate-ping" />
            <span className="font-['Cinzel'] tracking-[0.25em] text-sm text-[#F1F3F5] uppercase font-bold">
              Aalia Residences
            </span>
            <span className="text-[10px] font-mono tracking-wider text-[#C5A880] border border-[#C5A880]/30 px-2.5 py-0.5 rounded-full backdrop-blur-md">
              Living Architectural Anatomy
            </span>
          </div>
          <p className="text-[10px] text-[#8C95A6] tracking-widest uppercase mt-1 font-mono">
            {activeTool === "pan" ? "Drag to Pan Canvas Up/Down/Left/Right" : "Drag to Orbit 360°"} · Scroll to Zoom · Click Unit for Balcony Vista
          </p>
        </div>

        {/* Top HUD: Straight Elevation vs 3D Isometric View Mode Selector */}
        <div className="absolute top-5 right-6 z-20 flex items-center gap-2">
          {/* Projection Toggle Buttons */}
          <div className="bg-[#0D1017]/90 border border-white/10 p-1 rounded-xl backdrop-blur-md flex items-center shadow-xl">
            <button
              onClick={() => {
                setProjectionMode("straight");
                setIsAutoOrbit(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                projectionMode === "straight"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold shadow-md"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <span>🏢</span>
              <span>Straight Elevation</span>
            </button>
            <button
              onClick={() => setProjectionMode("isometric")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                projectionMode === "isometric"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold shadow-md"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <span>🔄</span>
              <span>3D Isometric</span>
            </button>
          </div>

          {/* Quick HUD Metrics */}
          <div className="hidden sm:flex items-center gap-3 bg-[#0D1017]/85 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md font-mono text-xs text-[#94A3B8] shadow-lg">
            <span>Zoom: <strong className="text-white">{(zoom * 100).toFixed(0)}%</strong></span>
            <span className="text-white/20">|</span>
            <span>Sun: <strong className="text-amber-300">{sunTime}:00 IST</strong></span>
          </div>
        </div>

        {/* Floating Tool Controls & Quick-Jump Deck (Bottom Left) */}
        <div className="absolute bottom-5 left-6 z-20 flex flex-wrap items-center gap-1.5 bg-[#0C0F16]/90 border border-white/10 p-1.5 rounded-xl backdrop-blur-md shadow-2xl">
          
          {/* Tool Mode: Pan vs Orbit */}
          <div className="flex bg-white/5 p-0.5 rounded-lg mr-1 border border-white/5">
            <button
              onClick={() => setActiveTool("pan")}
              className={`flex items-center gap-1 px-2.5 h-7 rounded text-[11px] font-mono transition-colors ${
                activeTool === "pan"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "text-[#94A3B8] hover:text-white"
              }`}
              title="Pan / Move: Click and drag anywhere to move building"
            >
              <span>🖐️ Pan</span>
            </button>
            <button
              onClick={() => {
                setActiveTool("rotate");
                if (projectionMode === "straight") setProjectionMode("isometric");
              }}
              className={`flex items-center gap-1 px-2.5 h-7 rounded text-[11px] font-mono transition-colors ${
                activeTool === "rotate"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "text-[#94A3B8] hover:text-white"
              }`}
              title="Orbit 360°: Click and drag horizontally to rotate"
            >
              <span>🔄 Orbit</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Zoom In/Out & Reset */}
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.2, 2.8))}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#EDECEA] flex items-center justify-center font-bold text-sm transition-colors"
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.2, 0.6))}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#EDECEA] flex items-center justify-center font-bold text-sm transition-colors"
            title="Zoom Out (−)"
          >
            −
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
              setOrbitAngle(35);
              setProjectionMode("straight");
            }}
            className="px-2 h-7 rounded-lg bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#94A3B8] text-[10px] font-mono transition-colors"
            title="Reset to Straight Frontal View"
          >
            Reset
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Quick-Jump Level Focus Buttons */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 220 });
              setActiveTierId("tier-penthouse");
              if (explodeGap < 0.25) setExplodeGap(0.35);
            }}
            className="px-2 h-7 rounded-lg bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#94A3B8] text-[10px] font-mono transition-colors"
            title="Focus Camera on Penthouse"
          >
            ⬆️ Penthouse
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setActiveTierId("tier-residences");
            }}
            className="px-2 h-7 rounded-lg bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#94A3B8] text-[10px] font-mono transition-colors"
            title="Center Camera on Residences"
          >
            🎯 Center
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: -220 });
              setActiveTierId("tier-foundation");
              if (explodeGap < 0.25) setExplodeGap(0.35);
            }}
            className="px-2 h-7 rounded-lg bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#94A3B8] text-[10px] font-mono transition-colors"
            title="Focus Camera on Basement & EV Stalls"
          >
            ⬇️ Basement
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {/* Cardinal presets */}
          {[
            ["ISO 35°", 35],
            ["FRONT", 0],
            ["SIDE", 90],
          ].map(([label, ang]) => (
            <button
              key={label}
              onClick={() => {
                setOrbitAngle(ang);
                setProjectionMode("isometric");
              }}
              className={`px-2 h-7 rounded-lg text-[10px] font-mono transition-colors ${
                projectionMode === "isometric" && Math.abs(orbitAngle - ang) < 5
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "bg-white/5 text-[#94A3B8] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Auto-Orbit Toggle */}
          <button
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`px-2.5 h-7 rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition-colors ${
              isAutoOrbit
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                : "bg-white/5 text-[#94A3B8] hover:text-white"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoOrbit ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
            Auto-Orbit
          </button>
        </div>

        {/* SVG Projection Canvas */}
        <svg
          viewBox="0 0 800 860"
          className="w-full h-full max-w-[1050px] max-h-[920px] pointer-events-auto"
        >
          <defs>
            {/* Dynamic Chromatic Twilight/Daylight Sky Gradient */}
            <linearGradient id="dynamicSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={skyColors.top} />
              <stop offset="45%" stopColor={skyColors.mid} />
              <stop offset="100%" stopColor={skyColors.bottom} />
            </linearGradient>

            {/* Dynamic Atmospheric Horizon Glow */}
            <radialGradient id="dynamicHorizonGlow" cx="50%" cy="100%" r="65%">
              <stop offset="0%" stopColor={skyColors.glow} />
              <stop offset="40%" stopColor={skyColors.glow} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Floating 3D Sun Sphere Radial Aura */}
            <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={skyColors.sunCore} stopOpacity="1" />
              <stop offset="25%" stopColor={skyColors.sunColor} stopOpacity="0.8" />
              <stop offset="60%" stopColor={skyColors.sunColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Volumetric Solar Ray Gradient */}
            <linearGradient id="solarRayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={skyColors.sunColor} stopOpacity="0.25" />
              <stop offset="50%" stopColor={skyColors.sunColor} stopOpacity="0.10" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Ground Bollard Halo Light */}
            <radialGradient id="bollardGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D4B895" stopOpacity="0.95" />
              <stop offset="35%" stopColor="rgba(197, 168, 128, 0.4)" />
              <stop offset="100%" stopColor="rgba(197, 168, 128, 0)" />
            </radialGradient>

            {/* Dynamic Cast Ground Shadow */}
            <radialGradient id="groundShadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#04060A" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#080C14" stopOpacity="0.45" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Pool water gradient */}
            <linearGradient id="poolWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>

            {/* Cyan Accent Glow */}
            <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ========================================================
              BACKGROUND: DYNAMIC CHROMATIC SKY CANVAS
             ======================================================== */}
          <rect x="0" y="0" width="800" height="860" fill="url(#dynamicSky)" />
          <ellipse cx="400" cy="580" rx="440" ry="110" fill="url(#dynamicHorizonGlow)" />

          {/* ========================================================
              UPGRADE 2: FLOATING 3D SUN ORB & VOLUMETRIC LIGHT RAYS
             ======================================================== */}
          {/* Volumetric Directional Light Shafts projecting from Sun */}
          <g opacity={skyColors.rayOpacity} className="pointer-events-none">
            {/* Main Central Light Shaft */}
            <polygon
              points={`${sunScreen.x - 18},${sunScreen.y} ${sunScreen.x + 18},${sunScreen.y} 510,720 280,720`}
              fill="url(#solarRayGradient)"
            />
            {/* Left Diagonal Shaft */}
            <polygon
              points={`${sunScreen.x - 30},${sunScreen.y + 4} ${sunScreen.x - 8},${sunScreen.y + 4} 240,680 120,680`}
              fill="url(#solarRayGradient)"
            />
            {/* Right Diagonal Shaft */}
            <polygon
              points={`${sunScreen.x + 8},${sunScreen.y + 4} ${sunScreen.x + 30},${sunScreen.y + 4} 620,700 480,700`}
              fill="url(#solarRayGradient)"
            />
          </g>

          {/* Floating Celestial 3D Sun Sphere with Dual-Stage Aura */}
          <g className="pointer-events-none">
            {/* Outer dissipation aura (48px) */}
            <circle cx={sunScreen.x} cy={sunScreen.y} r="48" fill="url(#sunAura)" />
            {/* Mid solar corona (20px) */}
            <circle cx={sunScreen.x} cy={sunScreen.y} r="18" fill={skyColors.sunColor} opacity="0.5" />
            {/* Core Sun Disk (8px) */}
            <circle cx={sunScreen.x} cy={sunScreen.y} r="8" fill={skyColors.sunCore} stroke={skyColors.sunColor} strokeWidth="1.5" />
          </g>

          {/* ========================================================
              FOREGROUND INTERACTIVE ROOT TRANSFORM (PAN & ZOOM)
             ======================================================== */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{
              transformOrigin: "400px 490px",
              transition: isDragging ? "none" : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >

            {/* UPGRADE 1: PROCEDURAL 3D NEIGHBORING CITY BUILDINGS (TRUE PARALLAX WORLD GRID) */}
            {renderNeighborBuildings()}

            {/* UPGRADE 1: 3D GROUND CIRCULATION & ROAD ARTERIALS */}
            {render3DGroundGrid()}

            {/* Dynamic Solar Cast Ground Shadow beneath Tower */}
            <ellipse
              cx={groundShadow.cx}
              cy={groundShadow.cy}
              rx={groundShadow.rx}
              ry={groundShadow.ry}
              fill="url(#groundShadowGrad)"
              opacity={groundShadow.opacity}
              className="pointer-events-none"
            />

            {/* Refined Ground Courtyard & Arrival Driveway */}
            <ellipse cx="400" cy="580" rx="310" ry="120" fill="#0C1017" stroke="#1A2230" strokeWidth="1" />
            <ellipse cx="400" cy="580" rx="230" ry="90" fill="none" stroke="#232C3E" strokeDasharray="4 4" strokeWidth="0.8" />
            <ellipse cx="400" cy="580" rx="150" ry="60" fill="none" stroke="#232C3E" strokeDasharray="3 5" strokeWidth="0.6" />

            {/* Perimeter Warm Bollard Ground Path Lights with Radial Halos */}
            {[
              [140, 580], [180, 540], [250, 505], [550, 505], [620, 540], [660, 580],
              [180, 620], [250, 655], [550, 655], [620, 620]
            ].map(([bx, by], bi) => (
              <g key={`bollard-${bi}`}>
                <circle cx={bx} cy={by} r="14" fill="url(#bollardGlow)" />
                <circle cx={bx} cy={by} r="2" fill="#F1F3F5" />
              </g>
            ))}

            {/* ========================================================
                RENDER ARCHITECTURAL TIERS (SORTED BOTTOM-TO-TOP)
               ======================================================== */}
            {TOWER_DATA.map((tier, index) => {
              const isSelected = tier.id === activeTierId;
              const H = tier.baseHeight;
              const verticalLift = tier.elevationOffset + index * 125 * explodeGap;

              // Footprint dimensions
              const W = 100;
              const D = 80;

              // 8 Bounding Vertices
              const p0 = project(-W, -D, 0); // North-West Front-Left
              const p1 = project(W, -D, 0);  // North-East Front-Right
              const p2 = project(W, D, 0);   // South-East Rear-Right
              const p3 = project(-W, D, 0);  // South-West Rear-Left

              const p4 = project(-W, -D, H);
              const p5 = project(W, -D, H);
              const p6 = project(W, D, H);
              const p7 = project(-W, D, H);

              const outerWalls = [
                { normal: [1, 0, 0],  name: "East",  pts: [p1, p2, p6, p5], center: [W, 0] },
                { normal: [0, 1, 0],  name: "South", pts: [p2, p3, p7, p6], center: [0, D] },
                { normal: [-1, 0, 0], name: "West",  pts: [p3, p0, p4, p7], center: [-W, 0] },
                { normal: [0, -1, 0], name: "North", pts: [p0, p1, p5, p4], center: [0, -D] },
              ];

              const visibleWalls = outerWalls.filter((w) => isWallVisible(w.normal[0], w.normal[1]));
              const sortedOuterWalls = [...visibleWalls].sort((a, b) => {
                const pA = project(a.center[0], a.center[1], 0);
                const pB = project(b.center[0], b.center[1], 0);
                return pA.depth - pB.depth;
              });

              const isDollhouseActive = dollhouseMode || isSelected;
              const ceilingOffset = isSelected ? 65 : isDollhouseActive && explodeGap > 0.2 ? 35 : 0;
              const ceilingOpacity = isSelected ? 0.08 : isDollhouseActive && explodeGap > 0.2 ? 0.35 : 1.0;
              const slabCapColor = isSelected ? "#F1F3F5" : "#CBD5E1";

              return (
                <g
                  key={tier.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTierId(tier.id);
                  }}
                  className="cursor-pointer transition-all duration-500 ease-out"
                  style={{
                    transform: `translate3d(0, ${-verticalLift}px, 0)`,
                    opacity: !isSelected && activeTierId ? (isXRay ? 0.2 : 0.6) : 1.0,
                  }}
                >
                  {/* --- 1. TIER FLOOR SLAB BASE PLATE --- */}
                  <polygon
                    points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                    fill="#151A24"
                    stroke={isSelected ? BRONZE : "#2E3646"}
                    strokeWidth={isSelected ? 1.5 : 0.8}
                  />

                  {sortedOuterWalls.map((w, wi) => (
                    <polygon
                      key={`slab-${wi}`}
                      points={`${w.pts[0].x},${w.pts[0].y} ${w.pts[1].x},${w.pts[1].y} ${w.pts[1].x},${w.pts[1].y + 3} ${w.pts[0].x},${w.pts[0].y + 3}`}
                      fill={slabCapColor}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* --- 2. DOLLHOUSE 3D INTERIOR (RENDERED ON FLOOR SLAB) --- */}
                  {isDollhouseActive && (
                    <g className="transition-opacity duration-300">
                      
                      {/* TIER-FOUNDATION: VIP EV FLEET & SUBSTRUCTURE */}
                      {tier.id === "tier-foundation" ? (
                        <g>
                          {renderBasementParking(1.5)}

                          {tier.interior && tier.interior.zones.slice(0, 2).map((zone, zi) => {
                            const z0 = project(zone.x, zone.y, 1.5);
                            const z1 = project(zone.x + zone.w, zone.y, 1.5);
                            const z2 = project(zone.x + zone.w, zone.y + zone.d, 1.5);
                            const z3 = project(zone.x, zone.y + zone.d, 1.5);
                            const isHovered = hoveredRoom === zone.name;

                            return (
                              <g
                                key={`zone-${zi}`}
                                onMouseEnter={() => setHoveredRoom(zone.name)}
                                onMouseLeave={() => setHoveredRoom(null)}
                              >
                                <polygon
                                  points={`${z0.x},${z0.y} ${z1.x},${z1.y} ${z2.x},${z2.y} ${z3.x},${z3.y}`}
                                  fill={zone.color}
                                  stroke={isHovered ? BRONZE : "rgba(255,255,255,0.08)"}
                                  strokeWidth={isHovered ? 1.5 : 0.6}
                                />
                                {renderBox(
                                  zone.x, zone.x + zone.w, zone.y, zone.y + zone.d,
                                  1.5, 1.5 + 14,
                                  "rgba(26, 32, 44, 0.6)",
                                  isHovered ? BRONZE : "#334155",
                                  0.6
                                )}
                                {isSelected && (
                                  <g className="pointer-events-none select-none">
                                    <rect
                                      x={(z0.x + z2.x) / 2 - 38}
                                      y={(z0.y + z2.y) / 2 - 6}
                                      width="76"
                                      height="12"
                                      rx="3"
                                      fill="rgba(10, 14, 22, 0.88)"
                                      stroke={isHovered ? BRONZE : "rgba(255,255,255,0.12)"}
                                      strokeWidth="0.5"
                                    />
                                    <text
                                      x={(z0.x + z2.x) / 2}
                                      y={(z0.y + z2.y) / 2 + 2.5}
                                      textAnchor="middle"
                                      fontSize="6"
                                      fontFamily="JetBrains Mono"
                                      fontWeight="600"
                                      fill={isHovered ? BRONZE_LIGHT : "rgba(241, 243, 245, 0.85)"}
                                    >
                                      {zone.name.toUpperCase().replace(" ROOM", "").replace(" PLANT", "")}
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      ) : tier.id === "tier-residences" ? (
                        /* UPGRADE 3: TIER-RESIDENCES MULTI-UNIT 4-CORNER SUITE BREAKDOWN */
                        <g>
                          {residentialSuites.map((suite) => {
                            const isSuiteActive = suite.id === selectedSuiteId;
                            const q = suite.quadrant;
                            const sq0 = project(q.x, q.y, 1.5);
                            const sq1 = project(q.x + q.w, q.y, 1.5);
                            const sq2 = project(q.x + q.w, q.y + q.d, 1.5);
                            const sq3 = project(q.x, q.y + q.d, 1.5);

                            return (
                              <g
                                key={suite.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSuiteId(suite.id);
                                }}
                                className="cursor-pointer transition-all duration-300"
                                opacity={isSuiteActive ? 1.0 : 0.28}
                              >
                                {/* Suite Quadrant Plate with Glowing Champagne Border */}
                                <polygon
                                  points={`${sq0.x},${sq0.y} ${sq1.x},${sq1.y} ${sq2.x},${sq2.y} ${sq3.x},${sq3.y}`}
                                  fill={suite.color}
                                  stroke={isSuiteActive ? BRONZE : "rgba(255,255,255,0.1)"}
                                  strokeWidth={isSuiteActive ? 2.0 : 0.6}
                                />

                                {/* 3D Partition Perimeter Walls */}
                                {renderBox(
                                  q.x, q.x + q.w, q.y, q.y + q.d,
                                  1.5, 1.5 + 14,
                                  "rgba(30, 41, 59, 0.45)",
                                  isSuiteActive ? BRONZE : "#475569",
                                  isSuiteActive ? 1.0 : 0.5
                                )}

                                {/* Suite Badge Identifier */}
                                <g className="pointer-events-none select-none">
                                  <rect
                                    x={(sq0.x + sq2.x) / 2 - 34}
                                    y={(sq0.y + sq2.y) / 2 - 6}
                                    width="68"
                                    height="12"
                                    rx="3"
                                    fill={isSuiteActive ? "rgba(197, 168, 128, 0.2)" : "rgba(10, 14, 22, 0.85)"}
                                    stroke={isSuiteActive ? BRONZE : "rgba(255,255,255,0.1)"}
                                    strokeWidth={isSuiteActive ? 1.0 : 0.5}
                                  />
                                  <text
                                    x={(sq0.x + sq2.x) / 2}
                                    y={(sq0.y + sq2.y) / 2 + 2.5}
                                    textAnchor="middle"
                                    fontSize="6.5"
                                    fontFamily="JetBrains Mono"
                                    fontWeight="700"
                                    fill={isSuiteActive ? "#FFFFFF" : BRONZE_LIGHT}
                                    letterSpacing="0.06em"
                                  >
                                    {suite.code}
                                  </text>
                                </g>
                              </g>
                            );
                          })}

                          {/* Furniture Pieces inside Active Suites */}
                          {tier.interior && tier.interior.furniture.map((item, fi) => (
                            <g key={fi}>
                              {renderFurniture(item, 2)}
                            </g>
                          ))}
                        </g>
                      ) : (
                        /* Standard Upper Floors (Podium, MEP, Penthouse) */
                        tier.interior && (
                          <g>
                            {tier.interior.zones.map((zone, zi) => {
                              const z0 = project(zone.x, zone.y, 1.5);
                              const z1 = project(zone.x + zone.w, zone.y, 1.5);
                              const z2 = project(zone.x + zone.w, zone.y + zone.d, 1.5);
                              const z3 = project(zone.x, zone.y + zone.d, 1.5);
                              const isHovered = hoveredRoom === zone.name;

                              return (
                                <g
                                  key={zi}
                                  onMouseEnter={() => setHoveredRoom(zone.name)}
                                  onMouseLeave={() => setHoveredRoom(null)}
                                >
                                  <polygon
                                    points={`${z0.x},${z0.y} ${z1.x},${z1.y} ${z2.x},${z2.y} ${z3.x},${z3.y}`}
                                    fill={zone.color}
                                    stroke={isHovered ? BRONZE : "rgba(255,255,255,0.06)"}
                                    strokeWidth={isHovered ? 1.5 : 0.5}
                                    className="transition-colors duration-200"
                                  />
                                  {renderBox(
                                    zone.x, zone.x + zone.w, zone.y, zone.y + zone.d,
                                    1.5, 1.5 + 14,
                                    "rgba(30, 41, 59, 0.45)",
                                    isHovered ? BRONZE : "#475569",
                                    0.6
                                  )}
                                  {isSelected && (
                                    <g className="pointer-events-none select-none">
                                      <rect
                                        x={(z0.x + z2.x) / 2 - 34}
                                        y={(z0.y + z2.y) / 2 - 5.5}
                                        width="68"
                                        height="11"
                                        rx="2.5"
                                        fill="rgba(10, 14, 22, 0.85)"
                                        stroke={isHovered ? BRONZE : "rgba(255,255,255,0.1)"}
                                        strokeWidth="0.5"
                                      />
                                      <text
                                        x={(z0.x + z2.x) / 2}
                                        y={(z0.y + z2.y) / 2 + 2.5}
                                        textAnchor="middle"
                                        fontSize="6"
                                        fontFamily="JetBrains Mono"
                                        fontWeight="600"
                                        letterSpacing="0.05em"
                                        fill={isHovered ? BRONZE_LIGHT : "rgba(241, 243, 245, 0.85)"}
                                      >
                                        {zone.name.toUpperCase()}
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}

                            {tier.interior.furniture.map((item, fi) => (
                              <g key={fi}>
                                {renderFurniture(item, 2)}
                              </g>
                            ))}
                          </g>
                        )
                      )}
                    </g>
                  )}

                  {/* --- 3. EXTERIOR FAÇADE WALLS --- */}
                  <g opacity={isSelected ? 0.22 : isDollhouseActive && explodeGap > 0.2 ? 0.45 : 1.0}>
                    {sortedOuterWalls.map((w, wi) => {
                      const dot = lighting.calcDot(w.normal[0], w.normal[1], 0);
                      const baseColor = tier.id === "tier-mep"
                        ? "#1A1E24"
                        : tier.id === "tier-foundation"
                        ? "#151921"
                        : "#1E293B";

                      return (
                        <g key={`wall-${wi}`}>
                          <polygon
                            points={`${w.pts[0].x},${w.pts[0].y} ${w.pts[1].x},${w.pts[1].y} ${w.pts[2].x},${w.pts[2].y} ${w.pts[3].x},${w.pts[3].y}`}
                            fill={baseColor}
                            style={{ filter: `brightness(${dot.toFixed(2)})` }}
                            stroke={isSelected ? BRONZE : "#2E3646"}
                            strokeWidth={isSelected ? 1.2 : 0.8}
                          />

                          {tier.id !== "tier-mep" && tier.id !== "tier-foundation" && (
                            [0.2, 0.4, 0.6, 0.8].map((ratio, li) => {
                              const xL = w.pts[0].x + (w.pts[1].x - w.pts[0].x) * ratio;
                              const yL = w.pts[0].y + (w.pts[1].y - w.pts[0].y) * ratio;
                              const xT = w.pts[3].x + (w.pts[2].x - w.pts[3].x) * ratio;
                              const yT = w.pts[3].y + (w.pts[2].y - w.pts[3].y) * ratio;
                              return (
                                <line
                                  key={li}
                                  x1={xL} y1={yL}
                                  x2={xT} y2={yT}
                                  stroke={isSelected ? BRONZE : "#475569"}
                                  strokeWidth="0.6"
                                  strokeOpacity="0.5"
                                />
                              );
                            })
                          )}

                          {tier.id === "tier-mep" && (
                            [0.2, 0.4, 0.6, 0.8].map((ratio, li) => {
                              const y0 = w.pts[0].y + (w.pts[3].y - w.pts[0].y) * ratio;
                              const y1 = w.pts[1].y + (w.pts[2].y - w.pts[1].y) * ratio;
                              return (
                                <line
                                  key={li}
                                  x1={w.pts[0].x} y1={y0}
                                  x2={w.pts[1].x} y2={y1}
                                  stroke="#11141A"
                                  strokeWidth="1.2"
                                />
                              );
                            })
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* --- 4. CEILING / ROOF SLAB --- */}
                  <g
                    style={{
                      transform: `translate3d(0, ${-ceilingOffset}px, 0)`,
                      transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease",
                      opacity: ceilingOpacity,
                    }}
                  >
                    <polygon
                      points={`${p4.x},${p4.y} ${p5.x},${p5.y} ${p6.x},${p6.y} ${p7.x},${p7.y}`}
                      fill="#212836"
                      style={{ filter: `brightness(${lighting.top.toFixed(2)})` }}
                      stroke={isSelected ? PLATINUM : "#475569"}
                      strokeWidth={isSelected ? 1.5 : 0.8}
                    />

                    {tier.id === "tier-penthouse" && (
                      <g stroke={BRONZE} strokeWidth="1.2">
                        {[-35, -20, -5, 10, 25, 40].map((pergX, pi) => {
                          const start = project(pergX, -30, H + 12);
                          const end = project(pergX, 25, H + 12);
                          return <line key={pi} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
                        })}
                      </g>
                    )}
                  </g>

                  {/* --- 5. HAIRLINE TECHNICAL ANNOTATION CALLOUT PIN --- */}
                  <g>
                    {(() => {
                      const allCorners = [p0, p1, p2, p3];
                      const rightCorner = allCorners.reduce((max, c) => (c.x > max.x ? c : max), allCorners[0]);
                      const anchorY = rightCorner.y - H / 2;

                      return (
                        <g>
                          <circle cx={rightCorner.x} cy={anchorY} r="2" fill={isSelected ? BRONZE : "#64748B"} />
                          <line
                            x1={rightCorner.x + 3}
                            y1={anchorY}
                            x2={rightCorner.x + 28}
                            y2={anchorY}
                            stroke={isSelected ? BRONZE : "#475569"}
                            strokeWidth="0.8"
                            strokeDasharray={isSelected ? undefined : "2 2"}
                          />
                          <text
                            x={rightCorner.x + 34}
                            y={anchorY + 3}
                            fill={isSelected ? PLATINUM : "#94A3B8"}
                            fontSize="9"
                            fontFamily="JetBrains Mono"
                            fontWeight={isSelected ? "600" : "400"}
                            letterSpacing="0.08em"
                          >
                            {tier.level}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hovered Room Floating Pill Tooltip */}
        {hoveredRoom && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1219]/95 border border-[#C5A880]/50 px-5 py-2 rounded-full font-mono text-xs text-[#C5A880] shadow-2xl backdrop-blur-md flex items-center gap-2 z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-pulse" />
            <span>Zone:</span>
            <strong className="text-white">{hoveredRoom}</strong>
          </div>
        )}
      </div>

      {/* Haute Architecture Sales Dossier & Controls HUD */}
      <div className="w-full lg:w-[450px] bg-[#0C0F15] border-t lg:border-t-0 lg:border-l border-white/5 p-6 flex flex-col justify-between overflow-y-auto">
        <div>

          {/* Header Title */}
          <div className="border-b border-white/5 pb-4 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#C5A880] uppercase block">
                Architectural Dossier
              </span>
              <span className="text-[10px] font-mono text-[#717886] border border-white/10 px-2 py-0.5 rounded">
                {activeTier.level}
              </span>
            </div>
            <h2 className="text-xl font-['Cinzel'] font-bold tracking-wide text-white mt-1.5">
              {activeTier.title}
            </h2>
            <p className="text-xs text-[#717886] mt-0.5">{activeTier.tagline}</p>

            {/* Level Selector Tabs */}
            <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
              {[...TOWER_DATA].reverse().map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTierId(t.id)}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded whitespace-nowrap transition-colors ${
                    t.id === activeTierId
                      ? "bg-[#C5A880] text-[#080A0E] font-bold"
                      : "bg-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t.level}
                </button>
              ))}
            </div>
          </div>

          {/* UPGRADE 3: INDIVIDUAL UNIT INSPECTOR & BALCONY VIEW SIMULATOR (FOR RESIDENCES) */}
          {activeTierId === "tier-residences" && (
            <div className="mb-6 p-4 rounded-xl bg-[#090C12] border border-[#C5A880]/30 shadow-2xl">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#C5A880] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-pulse" />
                  Unit Vista Inspector · Level 14
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {activeSuite.price}
                </span>
              </div>

              {/* 4 Corner Suite Selector Buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {residentialSuites.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSuiteId(s.id)}
                    className={`py-1.5 text-[10px] font-mono rounded font-medium transition-all ${
                      s.id === selectedSuiteId
                        ? "bg-[#C5A880] text-[#080A0E] font-bold shadow-md"
                        : "bg-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {s.code}
                  </button>
                ))}
              </div>

              {/* Active Suite Name */}
              <div className="text-xs text-white font-medium mb-1 flex items-center justify-between">
                <span>{activeSuite.title}</span>
                <span className="font-mono text-[#D4B895]">{activeSuite.area}</span>
              </div>

              {/* 16:9 Simulated Balcony View Box */}
              {renderBalconyVistaBox()}

              {/* Orientation & Acoustic Micro-Climate Metrics */}
              <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-[10px]">
                <div className="bg-[#111622] p-2 rounded border border-white/5">
                  <span className="text-[#717886] block text-[9px] uppercase">Solar Arc</span>
                  <span className="text-amber-300 font-medium">{activeSuite.sunlight}</span>
                </div>
                <div className="bg-[#111622] p-2 rounded border border-white/5">
                  <span className="text-[#717886] block text-[9px] uppercase">Acoustics</span>
                  <span className="text-emerald-400 font-medium">{activeSuite.decibels}</span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Controls Deck */}
          <div className="space-y-4 bg-[#080A0E] p-4 rounded-xl border border-white/5 mb-6">

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-mono text-[#94A3B8]">Dollhouse Interior View</span>
              <button
                onClick={() => setDollhouseMode(!dollhouseMode)}
                className={`text-[11px] font-mono px-3 py-1 rounded-md transition-colors ${
                  dollhouseMode
                    ? "bg-[#C5A880] text-[#080A0E] font-semibold"
                    : "bg-[#141822] text-[#717886] hover:text-white"
                }`}
              >
                {dollhouseMode ? "3D DOLLHOUSE" : "EXTERIOR"}
              </button>
            </div>

            {/* Anatomy Separation Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#94A3B8] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880]" />
                  Vertical Separation
                </span>
                <span className="text-[#C5A880]">{(explodeGap * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeGap}
                onChange={(e) => setExplodeGap(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1E2430] rounded-lg appearance-none cursor-pointer accent-[#C5A880]"
              />
              <div className="flex justify-between text-[9px] font-mono text-[#5A6272] mt-1">
                <span>Stacked</span>
                <span>Cutaway</span>
                <span>Exploded</span>
              </div>
            </div>

            {/* 360° Continuous Orbit Dial Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#94A3B8] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  360° Orbit Angle {projectionMode === "straight" ? "(Switches to 3D)" : ""}
                </span>
                <span className="text-cyan-400 font-semibold">{Math.round(orbitAngle)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={orbitAngle}
                onChange={(e) => {
                  setOrbitAngle(parseInt(e.target.value));
                  if (projectionMode === "straight") setProjectionMode("isometric");
                }}
                className="w-full h-1 bg-[#1E2430] rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Solar Simulator Dial */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#94A3B8] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Daylight Study & Solar Sun Path
                </span>
                <span className="text-amber-300 font-semibold">{sunTime}:00 IST</span>
              </div>
              <input
                type="range"
                min="7"
                max="18"
                step="1"
                value={sunTime}
                onChange={(e) => setSunTime(parseInt(e.target.value))}
                className="w-full h-1 bg-[#1E2430] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Engineering X-Ray Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <span className="text-xs font-mono text-[#94A3B8]">Concealed Structural X-Ray</span>
              <button
                onClick={() => setIsXRay(!isXRay)}
                className={`text-[11px] font-mono px-3 py-1 rounded transition-colors ${
                  isXRay
                    ? "bg-[#C5A880] text-[#080A0E] font-semibold"
                    : "bg-[#141822] text-[#717886] hover:text-white"
                }`}
              >
                {isXRay ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 gap-2.5 mb-6 font-mono text-xs">
            <div className="bg-[#080A0E] p-3 rounded-lg border border-white/5">
              <div className="text-[9px] text-[#717886] uppercase tracking-wider">Usable Carpet</div>
              <div className="text-white font-medium mt-0.5">{activeTier.specs.carpet}</div>
            </div>
            <div className="bg-[#080A0E] p-3 rounded-lg border border-white/5">
              <div className="text-[9px] text-[#717886] uppercase tracking-wider">Clear Ceiling</div>
              <div className="text-white font-medium mt-0.5">{activeTier.specs.ceiling || "N/A"}</div>
            </div>
            <div className="bg-[#080A0E] p-3 rounded-lg border border-white/5">
              <div className="text-[9px] text-[#717886] uppercase tracking-wider">Vastu Rating</div>
              <div className="text-emerald-400 font-medium mt-0.5">{activeTier.specs.vastu}</div>
            </div>
            <div className="bg-[#080A0E] p-3 rounded-lg border border-white/5">
              <div className="text-[9px] text-[#717886] uppercase tracking-wider">Valuation Index</div>
              <div className="text-[#C5A880] font-medium mt-0.5">{activeTier.specs.price}</div>
            </div>
          </div>

          {/* Room Allocation / Engineering Features */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#717886] block mb-2">
              Spatial Allocation & Systems
            </span>
            <div className="space-y-1.5">
              {activeTier.rooms ? (
                activeTier.rooms.map((room, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setHoveredRoom(room.name)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    className={`flex justify-between items-center text-xs p-2.5 rounded border transition-colors cursor-pointer ${
                      hoveredRoom === room.name
                        ? "bg-[#161D2A] border-[#C5A880]"
                        : "bg-[#080A0E]/70 border-white/5 hover:border-[#C5A880]/30"
                    }`}
                  >
                    <span className="text-[#D6D9E0] font-medium">{room.name}</span>
                    <div className="flex gap-3 font-mono text-[11px]">
                      <span className="text-[#717886]">{room.orientation}</span>
                      <span className="text-[#EDECEA] font-medium">{room.area}</span>
                    </div>
                  </div>
                ))
              ) : (
                activeTier.features.map((feat, i) => (
                  <div
                    key={i}
                    className="text-xs p-2.5 rounded bg-[#080A0E]/70 border border-white/5 text-[#94A3B8] flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880]" />
                    {feat}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp Private Buyer Capsule Trigger */}
        <div className="pt-6 border-t border-white/5 mt-6">
          <button
            onClick={() => {
              const url = window.location.href;
              const text = encodeURIComponent(
                `AALIA RESIDENCES — Private Architectural Anatomy Dossier for ${activeTier.title} (${activeTier.level})\nInvestment: ${activeTier.specs.price}\nRERA Carpet: ${activeTier.specs.carpet}\nVastu: ${activeTier.specs.vastu}\nInteractive Cutaway: ${url}`
              );
              window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
            }}
            className="w-full py-3 bg-[#111622] hover:bg-[#C5A880] text-[#C5A880] hover:text-[#080A0E] border border-[#C5A880]/40 font-mono text-xs tracking-wider uppercase font-semibold rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-xl"
          >
            <span>Transmit Buyer Capsule via WhatsApp</span>
          </button>
        </div>

      </div>

    </div>
  );
}