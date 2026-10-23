import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { TOWER_DATA } from "../data/towerData";

// Architectural Monograph Palette
const BRONZE = "#C5A880";
const BRONZE_LIGHT = "#D4B895";
const PLATINUM = "#F1F3F5";
const CANVAS_CX = 400;
const CANVAS_CY = 490;
const COS30 = 0.866025; // Math.cos(Math.PI / 6)
const SIN30 = 0.5;

// Procedural 3D Neighboring Buildings in World Space
const NEIGHBOR_BUILDINGS = [
  { id: "nb-nw", x0: -330, x1: -260, y0: -260, y1: -190, H: 175, color: "#111622", name: "Tower 01" },
  { id: "nb-ne", x0: 260,  x1: 330,  y0: -240, y1: -170, H: 145, color: "#131826", name: "Tower 02" },
  { id: "nb-se", x0: 270,  x1: 350,  y0: 170,  y1: 250,  H: 195, color: "#111622", name: "Tower 03" },
  { id: "nb-sw", x0: -340, x1: -260, y0: 180,  y1: 250,  H: 130, color: "#141A28", name: "Tower 04" },
  { id: "nb-n",  x0: -140, x1: -60,  y0: -380, y1: -300, H: 215, color: "#101420", name: "Tower 05" },
  { id: "nb-n2", x0: 70,   x1: 150,  y0: -380, y1: -300, H: 165, color: "#121724", name: "Tower 06" },
  { id: "nb-s",  x0: -140, x1: -60,  y0: 290,  y1: 360,  H: 120, color: "#131826", name: "Tower 07" },
  { id: "nb-s2", x0: 70,   x1: 150,  y0: 280,  y1: 350,  H: 155, color: "#111622", name: "Tower 08" },
];

export default function ArchitecturalAnatomy() {
  // Projection Mode: 'straight' (Orthographic Elevation) | 'isometric' (Axonometric 360°)
  const [projectionMode, setProjectionMode] = useState("straight");

  // 3D Canvas Transform State
  const [orbitAngle, setOrbitAngle] = useState(35); // 0 to 360 degrees
  const [zoom, setZoom] = useState(1.0); // 0.6 to 2.8
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState("pan"); // 'pan' | 'rotate'
  const currentDragModeRef = useRef("pan");
  const dragStartRef = useRef({ x: 0, y: 0, initialAngle: 35, initialPan: { x: 0, y: 0 } });

  // Auto-Orbit state
  const [isAutoOrbit, setIsAutoOrbit] = useState(false);

  // Architectural HUD State
  const [explodeGap, setExplodeGap] = useState(0.35); // 0.0 to 1.0
  const [sunTime, setSunTime] = useState(11); // 7 to 18 (7 AM to 6 PM)
  const [activeTierId, setActiveTierId] = useState("tier-residences");
  const [selectedSuiteId, setSelectedSuiteId] = useState("suite-01");
  const [isXRay, setIsXRay] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [dollhouseMode, setDollhouseMode] = useState(true);

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

  const rad = useMemo(() => (orbitAngle * Math.PI) / 180, [orbitAngle]);
  const cosRad = useMemo(() => Math.cos(rad), [rad]);
  const sinRad = useMemo(() => Math.sin(rad), [rad]);

  // Master Architectural Projection Function
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

  const isWallVisible = useCallback((nx, ny) => {
    if (projectionMode === "straight") {
      return ny < -0.01 || nx > 0.01;
    }
    const rnx = nx * cosRad - ny * sinRad;
    const rny = nx * sinRad + ny * cosRad;
    return rnx + rny > -0.01;
  }, [projectionMode, cosRad, sinRad]);

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
    const sunWorldY = -220;
    const sunWorldZ = Math.sin(sunAngle) * 360 + 50;
    return { x: sunWorldX, y: sunWorldY, z: sunWorldZ };
  }, [sunAngle]);

  const sunScreen = useMemo(() => project(sunWorld.x, sunWorld.y, sunWorld.z), [project, sunWorld]);

  // Chromatic Atmospheric Palette
  const skyColors = useMemo(() => {
    if (sunTime <= 8.5) {
      return {
        top: "#110E1D",
        mid: "#3A1B29",
        bottom: "#8A3C2A",
        glow: "rgba(168, 75, 50, 0.35)",
        sunColor: "#F97316",
        sunCore: "#FFF7ED",
        rayOpacity: 0.14,
      };
    } else if (sunTime <= 10.5) {
      return {
        top: "#0E111C",
        mid: "#1F1B2B",
        bottom: "#4A323E",
        glow: "rgba(197, 168, 128, 0.25)",
        sunColor: "#FBBF24",
        sunCore: "#FFFBEB",
        rayOpacity: 0.12,
      };
    } else if (sunTime <= 14.5) {
      return {
        top: "#090D17",
        mid: "#121C2E",
        bottom: "#243753",
        glow: "rgba(147, 197, 253, 0.20)",
        sunColor: "#FDE047",
        sunCore: "#FFFFFF",
        rayOpacity: 0.10,
      };
    } else if (sunTime <= 16.5) {
      return {
        top: "#0D0C17",
        mid: "#241825",
        bottom: "#592E32",
        glow: "rgba(217, 119, 6, 0.30)",
        sunColor: "#F59E0B",
        sunCore: "#FFFBEB",
        rayOpacity: 0.13,
      };
    } else {
      return {
        top: "#0A0913",
        mid: "#2E141D",
        bottom: "#85310B",
        glow: "rgba(180, 83, 9, 0.40)",
        sunColor: "#EA580C",
        sunCore: "#FFF7ED",
        rayOpacity: 0.16,
      };
    }
  }, [sunTime]);

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
      opacity: 0.32 + Math.sin(sunAngle) * 0.22,
    };
  }, [sunAngle]);

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

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 0.91;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.6), 2.8));
  };

  const activeTier = TOWER_DATA.find((t) => t.id === activeTierId) || TOWER_DATA[3];
  const residentialSuites = TOWER_DATA.find((t) => t.id === "tier-residences")?.suites || [];
  const activeSuite = residentialSuites.find((s) => s.id === selectedSuiteId) || residentialSuites[0];

  const renderBox = (
    x0, x1, y0, y1, z0, z1,
    baseFill = "#1E2532",
    stroke = "rgba(255,255,255,0.08)",
    strokeW = 0.5,
    isPillar = false
  ) => {
    const walls = [
      { normal: [1, 0, 0],  pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], center: [x1, (y0 + y1) / 2] },
      { normal: [0, 1, 0],  pts: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], center: [(x0 + x1) / 2, y1] },
      { normal: [-1, 0, 0], pts: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], center: [x0, (y0 + y1) / 2] },
      { normal: [0, -1, 0], pts: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], center: [(x0 + x1) / 2, y0] },
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
                  fill="#D4B895"
                  fillOpacity="0.75"
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

  const renderNeighborBuildings = () => {
    const sortedNeighbors = [...NEIGHBOR_BUILDINGS].sort((a, b) => {
      const cxA = (a.x0 + a.x1) / 2;
      const cyA = (a.y0 + a.y1) / 2;
      const cxB = (b.x0 + b.x1) / 2;
      const cyB = (b.y0 + b.y1) / 2;
      return project(cxA, cyA, 0).depth - project(cxB, cyB, 0).depth;
    });

    return (
      <g opacity="0.85" className="pointer-events-none">
        {sortedNeighbors.map((nb) => {
          const cx = (nb.x0 + nb.x1) / 2;
          const cy = (nb.y0 + nb.y1) / 2;
          const pTopCenter = project(cx, cy, nb.H);
          const pSpireTip = project(cx, cy, nb.H + 28);

          return (
            <g key={nb.id}>
              {renderBox(nb.x0, nb.x1, nb.y0, nb.y1, 0, nb.H, nb.color, "#242E40", 0.5)}
              {[0.3, 0.5, 0.7, 0.85].map((hRatio, hi) => {
                const zWin = nb.H * hRatio;
                const pW1 = project(nb.x0 + 8, nb.y0, zWin);
                const pW2 = project(nb.x1 - 8, nb.y0, zWin);
                return (
                  <line
                    key={`nb-win-${hi}`}
                    x1={pW1.x} y1={pW1.y}
                    x2={pW2.x} y2={pW2.y}
                    stroke="#D4B895" strokeWidth="1.2" strokeOpacity="0.14" strokeDasharray="4 3"
                  />
                );
              })}
              <line
                x1={pTopCenter.x} y1={pTopCenter.y}
                x2={pSpireTip.x} y2={pSpireTip.y}
                stroke="#334155" strokeWidth="1.0"
              />
              <circle cx={pSpireTip.x} cy={pSpireTip.y} r="1.2" fill="#E2E8F0" opacity="0.75" />
            </g>
          );
        })}
      </g>
    );
  };

  const render3DGroundGrid = () => {
    const streets = [
      [[-440, 0, 0], [-150, 0, 0]],
      [[150, 0, 0], [440, 0, 0]],
      [[0, -440, 0], [0, -140, 0]],
      [[0, 140, 0], [0, 440, 0]],
    ];

    const lampCoords = [
      [-260, 0], [-184, -184], [0, -260], [184, -184],
      [260, 0], [184, 184], [0, 260], [-184, 184],
    ];

    return (
      <g className="pointer-events-none">
        {streets.map(([pA, pB], si) => {
          const sA = project(pA[0], pA[1], pA[2]);
          const sB = project(pB[0], pB[1], pB[2]);
          return (
            <g key={`st-${si}`}>
              <line
                x1={sA.x} y1={sA.y}
                x2={sB.x} y2={sB.y}
                stroke="#161E2B" strokeWidth="7" strokeLinecap="round"
              />
              <line
                x1={sA.x} y1={sA.y}
                x2={sB.x} y2={sB.y}
                stroke="#C5A880" strokeWidth="0.8" strokeDasharray="6 4" strokeOpacity="0.35"
              />
            </g>
          );
        })}

        <polygon
          points={lampCoords.map(([lx, ly]) => {
            const p = project(lx * 1.35, ly * 1.35, 0);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" ")}
          fill="none" stroke="#16202E" strokeWidth="1.0" strokeDasharray="4 4"
        />

        {lampCoords.map(([lx, ly], li) => {
          const pLamp = project(lx, ly, 0);
          return (
            <circle key={`lamp-${li}`} cx={pLamp.x} cy={pLamp.y} r="1.5" fill="#C5A880" opacity="0.8" />
          );
        })}
      </g>
    );
  };

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
          x + insetX, x + w - insetX, y + insetY + 3, y + d - insetY - 1,
          baseZ + bodyH, baseZ + bodyH + cabinH,
          "#090C12", "#38BDF8", 0.5
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
          stroke="#E0F2FE" strokeWidth="2.0" strokeLinecap="round"
        />

        <line
          x1={pRearL.x} y1={pRearL.y}
          x2={pRearR.x} y2={pRearR.y}
          stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round"
        />

        {wheels.map(([wx, wy], wi) => {
          const pWh = project(wx, wy, baseZ + 2.5);
          return (
            <circle
              key={`wh-${wi}`}
              cx={pWh.x} cy={pWh.y} r="2.0"
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
                    stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round"
                  />
                  <path
                    d={`M ${pPedMid.x} ${pPedMid.y} Q ${(pPedMid.x + pCarPort.x) / 2 + 3} ${(pPedMid.y + pCarPort.y) / 2 + 6} ${pCarPort.x} ${pCarPort.y}`}
                    fill="none" stroke="#0B0F17" strokeWidth="1.8"
                  />
                  <circle cx={pCarPort.x} cy={pCarPort.y} r="1.5" fill="#38BDF8" />
                </g>
              );
            })()}
          </g>
        )}
      </g>
    );
  };

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
          fill="#10141D" stroke="#1F2837" strokeWidth="0.8"
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

  const renderBalconyVistaBox = () => {
    return (
      <div className="relative w-full aspect-video rounded overflow-hidden border border-white/10 bg-[#070A0F] mt-2.5">
        <svg viewBox="0 0 400 225" className="w-full h-full">
          <defs>
            <linearGradient id="vistaSunrise" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E1428" />
              <stop offset="45%" stopColor="#6B2838" />
              <stop offset="80%" stopColor="#C46B18" />
              <stop offset="100%" stopColor="#E2A862" />
            </linearGradient>

            <linearGradient id="vistaSunset" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#140F22" />
              <stop offset="50%" stopColor="#4A182A" />
              <stop offset="85%" stopColor="#9E340E" />
              <stop offset="100%" stopColor="#D98A2C" />
            </linearGradient>

            <linearGradient id="vistaDaylight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#080F1E" />
              <stop offset="50%" stopColor="#182335" />
              <stop offset="100%" stopColor="#2E4C6E" />
            </linearGradient>

            <linearGradient id="balconyGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="40%" stopColor="rgba(200,220,240,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
            </linearGradient>
          </defs>

          {activeSuite.viewType === "sunrise_hills" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaSunrise)" />
              <circle cx="280" cy="115" r="22" fill="#FDE68A" opacity="0.9" />
              <path d="M 0 155 Q 80 120 180 145 T 320 135 T 400 150 L 400 225 L 0 225 Z" fill="#241624" />
              <path d="M 0 165 Q 110 135 220 160 T 360 148 T 400 165 L 400 225 L 0 225 Z" fill="#16221E" />
              <rect x="0" y="145" width="400" height="20" fill="rgba(253, 230, 138, 0.12)" />
              <path d="M 0 180 Q 90 158 200 175 T 400 170 L 400 225 L 0 225 Z" fill="#0E1614" />
            </g>
          )}

          {activeSuite.viewType === "pool_gardens" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaDaylight)" />
              <rect x="0" y="75" width="400" height="150" fill="#0C1322" />
              <polygon points="20,105 380,105 400,225 0,225" fill="#121B26" stroke="#1A2838" />
              <polygon points="110,120 290,120 310,185 90,185" fill="#0369A1" stroke="#38BDF8" strokeWidth="0.8" />
              <line x1="120" y1="135" x2="280" y2="135" stroke="#7DD3FC" strokeWidth="0.6" opacity="0.5" strokeDasharray="12 8" />
              <line x1="105" y1="155" x2="295" y2="155" stroke="#7DD3FC" strokeWidth="0.6" opacity="0.5" strokeDasharray="16 10" />
              {[-60, -30, 0, 30, 60].map((cx, ci) => (
                <rect key={ci} x={200 + cx * 1.3} y="112" width="10" height="5" fill="#CBD5E1" opacity="0.75" />
              ))}
              {[-120, -90, 90, 120].map((px, pi) => (
                <circle key={pi} cx={200 + px} cy="150" r="10" fill="#064E3B" opacity="0.7" />
              ))}
            </g>
          )}

          {activeSuite.viewType === "sunset_skyline" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaSunset)" />
              <circle cx="150" cy="120" r="28" fill="#FBBF24" opacity="0.85" />
              <g fill="#140F1E" opacity="0.95">
                <rect x="30" y="90" width="35" height="135" />
                <polygon points="30,90 47,65 65,90" />
                <rect x="80" y="115" width="45" height="110" />
                <rect x="180" y="85" width="48" height="140" />
                <line x1="204" y1="55" x2="204" y2="85" stroke="#140F1E" strokeWidth="1.2" />
                <rect x="240" y="105" width="55" height="120" />
                <rect x="310" y="75" width="50" height="150" />
                <polygon points="310,75 335,55 360,75" />
              </g>
              <path d="M 0 185 Q 160 165 400 190" stroke="#C5A880" strokeWidth="1.8" fill="none" opacity="0.7" />
            </g>
          )}

          {activeSuite.viewType === "boulevard_city" && (
            <g>
              <rect x="0" y="0" width="400" height="225" fill="url(#vistaSunrise)" />
              <polygon points="180,95 220,95 380,225 20,225" fill="#0E1420" />
              <line x1="180" y1="95" x2="20" y2="225" stroke="#047857" strokeWidth="4" opacity="0.7" />
              <line x1="220" y1="95" x2="380" y2="225" stroke="#047857" strokeWidth="4" opacity="0.7" />
              <rect x="0" y="105" width="130" height="120" fill="#162030" />
              <rect x="270" y="105" width="130" height="120" fill="#162030" />
            </g>
          )}

          {/* Architectural Balcony Glass Railing */}
          <rect x="15" y="160" width="370" height="60" fill="url(#balconyGlass)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
          <line x1="10" y1="160" x2="390" y2="160" stroke="#CBD5E1" strokeWidth="2.5" />
          {[60, 130, 200, 270, 340].map((px, pi) => (
            <line key={`post-${pi}`} x1={px} y1="160" x2={px} y2="220" stroke="#94A3B8" strokeWidth="1.2" />
          ))}
          <rect x="0" y="218" width="400" height="7" fill="#1C1814" stroke="#4A3B2C" strokeWidth="0.5" />
        </svg>

        {/* Clean Typographic Watermarks */}
        <div className="absolute top-2 left-2.5 font-mono text-[9px] text-[#CBD5E1] tracking-wider uppercase">
          LEVEL 14 · +52.0M AGL
        </div>

        <div className="absolute top-2 right-2.5 font-mono text-[9px] text-[#C5A880] tracking-wider uppercase font-semibold">
          {activeSuite.axis}
        </div>

        <div className="absolute bottom-2 left-2.5 font-mono text-[9px] text-[#94A3B8] tracking-wide">
          {activeSuite.name} · {activeSuite.balcony}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-[#07090D] text-[#E4E3DF] flex flex-col lg:flex-row overflow-hidden select-none font-sans">

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
        {/* Architectural Monograph Header */}
        <div className="absolute top-6 left-8 z-20 pointer-events-none">
          <span className="font-['Cinzel'] tracking-[0.3em] text-base text-[#F1F3F5] uppercase font-semibold block">
            Aalia Residences
          </span>
          <span className="text-[9px] font-mono tracking-[0.22em] text-[#C5A880]/90 uppercase mt-0.5 block">
            Architectural Digital Twin · 20 Storey Tower
          </span>
        </div>

        {/* Top HUD: Elevation / Axonometric Mode Selector */}
        <div className="absolute top-6 right-8 z-20 flex items-center gap-3">
          <div className="bg-[#0A0D14]/90 border border-white/10 p-0.5 rounded flex items-center">
            <button
              onClick={() => {
                setProjectionMode("straight");
                setIsAutoOrbit(false);
              }}
              className={`px-3 py-1.5 text-[10px] font-mono tracking-wider transition-colors ${
                projectionMode === "straight"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "text-[#8E98A8] hover:text-white"
              }`}
            >
              ORTHO ELEVATION
            </button>
            <button
              onClick={() => setProjectionMode("isometric")}
              className={`px-3 py-1.5 text-[10px] font-mono tracking-wider transition-colors ${
                projectionMode === "isometric"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "text-[#8E98A8] hover:text-white"
              }`}
            >
              3D AXONOMETRIC
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 bg-[#0A0D14]/85 border border-white/10 px-3 py-1.5 rounded font-mono text-[10px] text-[#8E98A8]">
            <span>ZOOM <strong className="text-white">{(zoom * 100).toFixed(0)}%</strong></span>
            <span className="text-white/20">/</span>
            <span>SOLAR <strong className="text-[#C5A880]">{sunTime}:00 IST</strong></span>
          </div>
        </div>

        {/* Minimalist Architectural Dock (Bottom Left) */}
        <div className="absolute bottom-6 left-8 z-20 flex flex-wrap items-center gap-1.5 bg-[#090C12]/95 border border-white/10 p-1.5 rounded">
          
          {/* Tool: Pan / Orbit */}
          <div className="flex bg-white/5 p-0.5 rounded mr-1">
            <button
              onClick={() => setActiveTool("pan")}
              className={`px-2.5 h-6 text-[10px] font-mono tracking-wider transition-colors ${
                activeTool === "pan"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "text-[#8E98A8] hover:text-white"
              }`}
            >
              PAN
            </button>
            <button
              onClick={() => {
                setActiveTool("rotate");
                if (projectionMode === "straight") setProjectionMode("isometric");
              }}
              className={`px-2.5 h-6 text-[10px] font-mono tracking-wider transition-colors ${
                activeTool === "rotate"
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "text-[#8E98A8] hover:text-white"
              }`}
            >
              ORBIT
            </button>
          </div>

          <div className="h-3 w-px bg-white/10 mx-0.5" />

          {/* Zoom & Reset */}
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.2, 2.8))}
            className="w-6 h-6 rounded bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#EDECEA] flex items-center justify-center font-mono text-xs transition-colors"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.2, 0.6))}
            className="w-6 h-6 rounded bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#EDECEA] flex items-center justify-center font-mono text-xs transition-colors"
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
            className="px-2 h-6 rounded bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#8E98A8] text-[9px] font-mono tracking-wider transition-colors"
          >
            RESET
          </button>

          <div className="h-3 w-px bg-white/10 mx-0.5" />

          {/* Level Jumps */}
          <button
            onClick={() => {
              setPan({ x: 0, y: 220 });
              setActiveTierId("tier-penthouse");
              if (explodeGap < 0.25) setExplodeGap(0.35);
            }}
            className="px-2 h-6 rounded bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#8E98A8] text-[9px] font-mono tracking-wider transition-colors"
          >
            PENTHOUSE
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: 0 });
              setActiveTierId("tier-residences");
            }}
            className="px-2 h-6 rounded bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#8E98A8] text-[9px] font-mono tracking-wider transition-colors"
          >
            TOWER
          </button>
          <button
            onClick={() => {
              setPan({ x: 0, y: -220 });
              setActiveTierId("tier-foundation");
              if (explodeGap < 0.25) setExplodeGap(0.35);
            }}
            className="px-2 h-6 rounded bg-white/5 hover:bg-[#C5A880] hover:text-[#080A0E] text-[#8E98A8] text-[9px] font-mono tracking-wider transition-colors"
          >
            SUBSTRUCTURE
          </button>

          <div className="h-3 w-px bg-white/10 mx-0.5" />

          {/* Cardinal Presets */}
          {[
            ["ISO 35°", 35],
            ["0° FRONT", 0],
            ["90° SIDE", 90],
          ].map(([label, ang]) => (
            <button
              key={label}
              onClick={() => {
                setOrbitAngle(ang);
                setProjectionMode("isometric");
              }}
              className={`px-2 h-6 rounded text-[9px] font-mono tracking-wider transition-colors ${
                projectionMode === "isometric" && Math.abs(orbitAngle - ang) < 5
                  ? "bg-[#C5A880] text-[#080A0E] font-bold"
                  : "bg-white/5 text-[#8E98A8] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Continuous Orbit Mode */}
          <button
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`px-2.5 h-6 rounded text-[9px] font-mono tracking-wider transition-colors ${
              isAutoOrbit
                ? "bg-[#C5A880] text-[#080A0E] font-bold"
                : "bg-white/5 text-[#8E98A8] hover:text-white"
            }`}
          >
            ROTATION
          </button>
        </div>

        {/* SVG Projection Canvas */}
        <svg
          viewBox="0 0 800 860"
          className="w-full h-full max-w-[1050px] max-h-[920px] pointer-events-auto"
        >
          <defs>
            <linearGradient id="dynamicSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={skyColors.top} />
              <stop offset="45%" stopColor={skyColors.mid} />
              <stop offset="100%" stopColor={skyColors.bottom} />
            </linearGradient>

            <radialGradient id="dynamicHorizonGlow" cx="50%" cy="100%" r="65%">
              <stop offset="0%" stopColor={skyColors.glow} />
              <stop offset="40%" stopColor={skyColors.glow} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={skyColors.sunCore} stopOpacity="1" />
              <stop offset="25%" stopColor={skyColors.sunColor} stopOpacity="0.8" />
              <stop offset="60%" stopColor={skyColors.sunColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <linearGradient id="solarRayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={skyColors.sunColor} stopOpacity="0.22" />
              <stop offset="50%" stopColor={skyColors.sunColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            <radialGradient id="groundShadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#04060A" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#080C14" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <linearGradient id="poolWater" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
          </defs>

          {/* Background Sky */}
          <rect x="0" y="0" width="800" height="860" fill="url(#dynamicSky)" />
          <ellipse cx="400" cy="580" rx="440" ry="110" fill="url(#dynamicHorizonGlow)" />

          {/* Volumetric Solar Rays */}
          <g opacity={skyColors.rayOpacity} className="pointer-events-none">
            <polygon
              points={`${sunScreen.x - 18},${sunScreen.y} ${sunScreen.x + 18},${sunScreen.y} 510,720 280,720`}
              fill="url(#solarRayGradient)"
            />
            <polygon
              points={`${sunScreen.x - 30},${sunScreen.y + 4} ${sunScreen.x - 8},${sunScreen.y + 4} 240,680 120,680`}
              fill="url(#solarRayGradient)"
            />
            <polygon
              points={`${sunScreen.x + 8},${sunScreen.y + 4} ${sunScreen.x + 30},${sunScreen.y + 4} 620,700 480,700`}
              fill="url(#solarRayGradient)"
            />
          </g>

          {/* Celestial Sun Disk */}
          <g className="pointer-events-none">
            <circle cx={sunScreen.x} cy={sunScreen.y} r="44" fill="url(#sunAura)" />
            <circle cx={sunScreen.x} cy={sunScreen.y} r="16" fill={skyColors.sunColor} opacity="0.45" />
            <circle cx={sunScreen.x} cy={sunScreen.y} r="7" fill={skyColors.sunCore} stroke={skyColors.sunColor} strokeWidth="1.2" />
          </g>

          {/* Interactive World Transform */}
          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            style={{
              transformOrigin: "400px 490px",
              transition: isDragging ? "none" : "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* 3D Parallax Neighboring Buildings */}
            {renderNeighborBuildings()}

            {/* 3D Street Vectors */}
            {render3DGroundGrid()}

            {/* Dynamic Ground Shadow */}
            <ellipse
              cx={groundShadow.cx}
              cy={groundShadow.cy}
              rx={groundShadow.rx}
              ry={groundShadow.ry}
              fill="url(#groundShadowGrad)"
              opacity={groundShadow.opacity}
              className="pointer-events-none"
            />

            {/* Ground Courtyard */}
            <ellipse cx="400" cy="580" rx="310" ry="120" fill="#0C1017" stroke="#1A2230" strokeWidth="1" />
            <ellipse cx="400" cy="580" rx="230" ry="90" fill="none" stroke="#232C3E" strokeDasharray="4 4" strokeWidth="0.8" />
            <ellipse cx="400" cy="580" rx="150" ry="60" fill="none" stroke="#232C3E" strokeDasharray="3 5" strokeWidth="0.6" />

            {/* Tiers Rendered Bottom-to-Top */}
            {TOWER_DATA.map((tier, index) => {
              const isSelected = tier.id === activeTierId;
              const H = tier.baseHeight;
              const verticalLift = tier.elevationOffset + index * 125 * explodeGap;

              const W = 100;
              const D = 80;

              const p0 = project(-W, -D, 0);
              const p1 = project(W, -D, 0);
              const p2 = project(W, D, 0);
              const p3 = project(-W, D, 0);

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
                return project(a.center[0], a.center[1], 0).depth - project(b.center[0], b.center[1], 0).depth;
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
                  {/* Floor Slab Plate */}
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

                  {/* 3D Interior Architecture */}
                  {isDollhouseActive && (
                    <g className="transition-opacity duration-300">
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
                                  <text
                                    x={(z0.x + z2.x) / 2}
                                    y={(z0.y + z2.y) / 2 + 2.5}
                                    textAnchor="middle"
                                    fontSize="6"
                                    fontFamily="JetBrains Mono"
                                    fontWeight="600"
                                    fill={isHovered ? BRONZE_LIGHT : "rgba(241, 243, 245, 0.85)"}
                                    className="pointer-events-none select-none"
                                  >
                                    {zone.name.toUpperCase().replace(" ROOM", "").replace(" PLANT", "")}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      ) : tier.id === "tier-residences" ? (
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
                                <polygon
                                  points={`${sq0.x},${sq0.y} ${sq1.x},${sq1.y} ${sq2.x},${sq2.y} ${sq3.x},${sq3.y}`}
                                  fill={suite.color}
                                  stroke={isSuiteActive ? BRONZE : "rgba(255,255,255,0.1)"}
                                  strokeWidth={isSuiteActive ? 2.0 : 0.6}
                                />

                                {renderBox(
                                  q.x, q.x + q.w, q.y, q.y + q.d,
                                  1.5, 1.5 + 14,
                                  "rgba(30, 41, 59, 0.45)",
                                  isSuiteActive ? BRONZE : "#475569",
                                  isSuiteActive ? 1.0 : 0.5
                                )}

                                <text
                                  x={(sq0.x + sq2.x) / 2}
                                  y={(sq0.y + sq2.y) / 2 + 2.5}
                                  textAnchor="middle"
                                  fontSize="6.5"
                                  fontFamily="JetBrains Mono"
                                  fontWeight="700"
                                  fill={isSuiteActive ? "#FFFFFF" : BRONZE_LIGHT}
                                  letterSpacing="0.06em"
                                  className="pointer-events-none select-none"
                                >
                                  {suite.code}
                                </text>
                              </g>
                            );
                          })}

                          {tier.interior && tier.interior.furniture.map((item, fi) => (
                            <g key={fi}>
                              {renderFurniture(item, 2)}
                            </g>
                          ))}
                        </g>
                      ) : (
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
                                    <text
                                      x={(z0.x + z2.x) / 2}
                                      y={(z0.y + z2.y) / 2 + 2.5}
                                      textAnchor="middle"
                                      fontSize="6"
                                      fontFamily="JetBrains Mono"
                                      fontWeight="600"
                                      letterSpacing="0.05em"
                                      fill={isHovered ? BRONZE_LIGHT : "rgba(241, 243, 245, 0.85)"}
                                      className="pointer-events-none select-none"
                                    >
                                      {zone.name.toUpperCase()}
                                    </text>
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

                  {/* Façade Skin */}
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

                  {/* Ceiling Plate */}
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

                  {/* Callout Tag */}
                  <g>
                    {(() => {
                      const allCorners = [p0, p1, p2, p3];
                      const rightCorner = allCorners.reduce((max, c) => (c.x > max.x ? c : max), allCorners[0]);
                      const anchorY = rightCorner.y - H / 2;

                      return (
                        <g>
                          <circle cx={rightCorner.x} cy={anchorY} r="1.5" fill={isSelected ? BRONZE : "#64748B"} />
                          <line
                            x1={rightCorner.x + 3} y1={anchorY}
                            x2={rightCorner.x + 28} y2={anchorY}
                            stroke={isSelected ? BRONZE : "#475569"} strokeWidth="0.8"
                            strokeDasharray={isSelected ? undefined : "2 2"}
                          />
                          <text
                            x={rightCorner.x + 34} y={anchorY + 3}
                            fill={isSelected ? PLATINUM : "#94A3B8"}
                            fontSize="8.5" fontFamily="JetBrains Mono"
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

        {/* Hovered Room Indicator */}
        {hoveredRoom && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#090C12]/95 border border-[#C5A880]/50 px-4 py-1.5 rounded font-mono text-[10px] text-[#C5A880] shadow-2xl backdrop-blur-md flex items-center gap-2 z-20">
            <span className="text-[#8E98A8] uppercase tracking-wider">ZONE</span>
            <strong className="text-white font-medium">{hoveredRoom}</strong>
          </div>
        )}
      </div>

      {/* Haute Architecture Dossier Specification Panel */}
      <div className="w-full lg:w-[440px] bg-[#090B10] border-t lg:border-t-0 lg:border-l border-white/5 p-6 flex flex-col justify-between overflow-y-auto">
        <div>

          {/* Dossier Monograph Header */}
          <div className="border-b border-white/5 pb-4 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-[0.25em] text-[#C5A880] uppercase block">
                ARCHITECTURAL SPECIFICATION
              </span>
              <span className="text-[9px] font-mono text-[#8E98A8] border border-white/10 px-2 py-0.5 rounded">
                {activeTier.level}
              </span>
            </div>
            <h2 className="text-lg font-['Cinzel'] font-semibold tracking-wide text-white mt-1.5">
              {activeTier.title}
            </h2>
            <p className="text-[11px] text-[#8E98A8] mt-0.5">{activeTier.tagline}</p>

            {/* Level Selector Tabs */}
            <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
              {[...TOWER_DATA].reverse().map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTierId(t.id)}
                  className={`px-2.5 py-1 text-[9px] font-mono tracking-wider rounded whitespace-nowrap transition-colors ${
                    t.id === activeTierId
                      ? "bg-[#C5A880] text-[#080A0E] font-bold"
                      : "bg-white/5 text-[#8E98A8] hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t.level}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Vista Inspector (For Sky Residences) */}
          {activeTierId === "tier-residences" && (
            <div className="mb-5 p-3.5 rounded bg-[#06080D] border border-[#C5A880]/30 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#C5A880]">
                  BALCONY VISTA SIMULATOR · LEVEL 14
                </span>
                <span className="text-[10px] font-mono text-[#D4B895] font-semibold">
                  {activeSuite.price}
                </span>
              </div>

              {/* Suite Selection Tabs */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                {residentialSuites.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSuiteId(s.id)}
                    className={`py-1 text-[9px] font-mono rounded font-medium transition-all ${
                      s.id === selectedSuiteId
                        ? "bg-[#C5A880] text-[#080A0E] font-bold"
                        : "bg-white/5 text-[#8E98A8] hover:text-white"
                    }`}
                  >
                    {s.code}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-white font-medium mb-1 flex items-center justify-between">
                <span>{activeSuite.title}</span>
                <span className="font-mono text-[#D4B895]">{activeSuite.area}</span>
              </div>

              {/* 16:9 View Box */}
              {renderBalconyVistaBox()}

              <div className="grid grid-cols-2 gap-2 mt-2.5 font-mono text-[9px]">
                <div className="bg-[#0C1017] p-2 rounded border border-white/5">
                  <span className="text-[#64748B] block uppercase tracking-wider">SOLAR ARC</span>
                  <span className="text-amber-300 font-medium">{activeSuite.sunlight}</span>
                </div>
                <div className="bg-[#0C1017] p-2 rounded border border-white/5">
                  <span className="text-[#64748B] block uppercase tracking-wider">ACOUSTICS</span>
                  <span className="text-emerald-400 font-medium">{activeSuite.decibels}</span>
                </div>
              </div>
            </div>
          )}

          {/* Architectural Controls Deck */}
          <div className="space-y-3.5 bg-[#06080D] p-3.5 rounded border border-white/5 mb-5">

            {/* Cutaway Toggle */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
              <span className="text-[10px] font-mono text-[#8E98A8] tracking-wider uppercase">INTERIOR CUTAWAY</span>
              <button
                onClick={() => setDollhouseMode(!dollhouseMode)}
                className={`text-[9px] font-mono px-2.5 py-1 rounded transition-colors tracking-wider ${
                  dollhouseMode
                    ? "bg-[#C5A880] text-[#080A0E] font-bold"
                    : "bg-[#141822] text-[#64748B] hover:text-white"
                }`}
              >
                {dollhouseMode ? "EXPOSED" : "ENCLOSED"}
              </button>
            </div>

            {/* Explosion Slider */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#8E98A8] mb-1">
                <span className="tracking-wider uppercase">EXPLOSION DISPLACEMENT</span>
                <span className="text-[#C5A880]">{(explodeGap * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeGap}
                onChange={(e) => setExplodeGap(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1A2230] rounded appearance-none cursor-pointer accent-[#C5A880]"
              />
            </div>

            {/* 360° Continuous Orbit Dial */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#8E98A8] mb-1">
                <span className="tracking-wider uppercase">CAMERA AZIMUTH</span>
                <span className="text-[#C5A880] font-semibold">{Math.round(orbitAngle)}°</span>
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
                className="w-full h-1 bg-[#1A2230] rounded appearance-none cursor-pointer accent-[#C5A880]"
              />
            </div>

            {/* Solar Simulator Dial */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-[#8E98A8] mb-1">
                <span className="tracking-wider uppercase">SOLAR TIME</span>
                <span className="text-amber-300 font-semibold">{sunTime}:00 IST</span>
              </div>
              <input
                type="range"
                min="7"
                max="18"
                step="1"
                value={sunTime}
                onChange={(e) => setSunTime(parseInt(e.target.value))}
                className="w-full h-1 bg-[#1A2230] rounded appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Structural X-Ray Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <span className="text-[10px] font-mono text-[#8E98A8] tracking-wider uppercase">CONCEALED MEP X-RAY</span>
              <button
                onClick={() => setIsXRay(!isXRay)}
                className={`text-[9px] font-mono px-2.5 py-1 rounded transition-colors tracking-wider ${
                  isXRay
                    ? "bg-[#C5A880] text-[#080A0E] font-bold"
                    : "bg-[#141822] text-[#64748B] hover:text-white"
                }`}
              >
                {isXRay ? "ACTIVE" : "INACTIVE"}
              </button>
            </div>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 gap-2 mb-5 font-mono text-xs">
            <div className="bg-[#06080D] p-2.5 rounded border border-white/5">
              <div className="text-[8px] text-[#64748B] uppercase tracking-widest">USABLE CARPET</div>
              <div className="text-white font-medium mt-0.5 text-[11px]">{activeTier.specs.carpet}</div>
            </div>
            <div className="bg-[#06080D] p-2.5 rounded border border-white/5">
              <div className="text-[8px] text-[#64748B] uppercase tracking-widest">CLEAR CEILING</div>
              <div className="text-white font-medium mt-0.5 text-[11px]">{activeTier.specs.ceiling || "N/A"}</div>
            </div>
            <div className="bg-[#06080D] p-2.5 rounded border border-white/5">
              <div className="text-[8px] text-[#64748B] uppercase tracking-widest">VASTU COMPLIANCE</div>
              <div className="text-emerald-400 font-medium mt-0.5 text-[11px]">{activeTier.specs.vastu}</div>
            </div>
            <div className="bg-[#06080D] p-2.5 rounded border border-white/5">
              <div className="text-[8px] text-[#64748B] uppercase tracking-widest">VALUATION INDEX</div>
              <div className="text-[#C5A880] font-medium mt-0.5 text-[11px]">{activeTier.specs.price}</div>
            </div>
          </div>

          {/* Spatial Breakdown Schedule */}
          <div>
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#64748B] block mb-2">
              SPATIAL SCHEDULE & CORE SYSTEMS
            </span>
            <div className="space-y-1">
              {activeTier.rooms ? (
                activeTier.rooms.map((room, i) => (
                  <div
                    key={i}
                    onMouseEnter={() => setHoveredRoom(room.name)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    className={`flex justify-between items-center text-[11px] p-2 rounded border transition-colors cursor-pointer ${
                      hoveredRoom === room.name
                        ? "bg-[#141B26] border-[#C5A880]"
                        : "bg-[#06080D] border-white/5 hover:border-[#C5A880]/30"
                    }`}
                  >
                    <span className="text-[#D1D5DB] font-medium">{room.name}</span>
                    <div className="flex gap-2.5 font-mono text-[10px]">
                      <span className="text-[#64748B]">{room.orientation}</span>
                      <span className="text-[#E5E7EB] font-medium">{room.area}</span>
                    </div>
                  </div>
                ))
              ) : (
                activeTier.features.map((feat, i) => (
                  <div
                    key={i}
                    className="text-[11px] p-2 rounded bg-[#06080D] border border-white/5 text-[#94A3B8] flex items-center gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#C5A880]" />
                    {feat}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Private Client Desk Call to Action */}
        <div className="pt-5 border-t border-white/5 mt-5">
          <button
            onClick={() => {
              const url = window.location.href;
              const text = encodeURIComponent(
                `AALIA RESIDENCES — Private Architectural Dossier Inquiry\nLevel: ${activeTier.title} (${activeTier.level})\nValuation: ${activeTier.specs.price}\nRERA Carpet: ${activeTier.specs.carpet}\nVastu: ${activeTier.specs.vastu}\nDigital Model: ${url}`
              );
              window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
            }}
            className="w-full py-2.5 bg-[#0C1018] hover:bg-[#C5A880] text-[#C5A880] hover:text-[#080A0E] border border-[#C5A880]/40 font-mono text-[10px] tracking-[0.2em] uppercase font-bold rounded transition-all duration-200 text-center block"
          >
            INQUIRE VIA PRIVATE CLIENT DESK
          </button>
        </div>

      </div>

    </div>
  );
}