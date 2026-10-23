export const TOWER_DATA = [
    {
        id: "tier-foundation",
        level: "B1 - B3",
        title: "Substructure & EV Mobility Hub",
        tagline: "Seismic Base Isolation & High-Speed EV Fleet Stalls",
        baseHeight: 40,
        elevationOffset: 0,
        specs: {
            carpet: "19,200 sq.ft",
            capacity: "140 Automated EV Stacks & VIP Bays",
            engineering: "M60 Grade Piles down to 34m bedrock",
            vastu: "Neutral / Utility Grade",
            price: "Common Infrastructure",
            ceiling: "12.0 ft Clear"
        },
        features: [
            "Dedicated 350kW DC Ultra-Fast EV charging grid",
            "Heavy M60 concrete structural columns with seismic shock dampeners",
            "200,000L Rainwater filtration cistern & dual-bus 1.5MVA substation",
            "Automated robotic hydraulic car parking grid"
        ],
        rooms: [
            { name: "Private VIP EV Bays (01-05)", area: "4,800 sq.ft", orientation: "North Ramp" },
            { name: "350kW Supercharging Hub", area: "2,200 sq.ft", orientation: "East Core" },
            { name: "Transformer & Switchgear Room", area: "3,400 sq.ft", orientation: "South-West" },
            { name: "Rainwater Filtration Plant", area: "4,100 sq.ft", orientation: "South-East" },
            { name: "Automated Stacker Grid", area: "4,700 sq.ft", orientation: "West Core" }
        ],
        interior: {
            zones: [
                { name: "Transformer & Switchgear Room", x: -90, y: -70, w: 70, d: 55, color: "#1E293B" },
                { name: "Rainwater Filtration Plant", x: -10, y: -70, w: 95, d: 55, color: "#0F172A" },
                { name: "VIP EV Parking & Mobility Hub", x: -90, y: -5, w: 175, d: 75, color: "#141A24" }
            ],
            furniture: []
        }
    },
    {
        id: "tier-podium",
        level: "Level 01 - 03",
        title: "Grand Atrium & Wellness Sanctuary",
        tagline: "Double-Height Pilotis Lobby & Pool Club",
        baseHeight: 55,
        elevationOffset: 60,
        specs: {
            carpet: "14,800 sq.ft",
            capacity: "Exclusive Club Membership",
            engineering: "Acoustic floating slab (96% noise damp)",
            vastu: "94% Conformance (NE Water Deck)",
            price: "Inbuilt Amenity",
            ceiling: "15.5 ft Double Height"
        },
        features: [
            "25-meter ozone heated lap pool with marble rim",
            "Soundproof indoor squash court & wellness gym",
            "Private screening theater & temperature-controlled wine cellar"
        ],
        interior: {
            zones: [
                { name: "Arrival Atrium & Concierge", x: -95, y: -75, w: 90, d: 70, color: "#1E2533" },
                { name: "Ozone Heated Lap Pool", x: 5, y: -75, w: 85, d: 65, color: "#0369A1" },
                { name: "Wellness Lounge & Spa", x: -95, y: 5, w: 100, d: 65, color: "#1A222F" },
                { name: "Business Boardroom Suites", x: 15, y: 0, w: 75, d: 70, color: "#161D29" }
            ],
            furniture: [
                { type: "pool", x: 10, y: -70, w: 75, d: 55 },
                { type: "desk", x: -60, y: -45, w: 25, d: 10 },
                { type: "table", x: 35, y: 25, w: 35, d: 18 }
            ]
        }
    },
    {
        id: "tier-mep",
        level: "Level 04",
        title: "MEP Service & Safety Core",
        tagline: "Concealed Infrastructure & Acoustic Buffers",
        baseHeight: 30,
        elevationOffset: 135,
        specs: {
            carpet: "8,200 sq.ft",
            capacity: "Primary Plant Room",
            engineering: "Tuned mass damper integration springs",
            vastu: "Service Utility",
            price: "Engineered Asset",
            ceiling: "9.5 ft Service Clear"
        },
        features: [
            "Central VRV 5-pipe heat recovery HVAC system",
            "Soundproof multilayer PEX greywater downpipes",
            "Stairwell fire pressurization smoke evacuation fans"
        ],
        interior: {
            zones: [
                { name: "VRV Chiller & Heat Recovery", x: -85, y: -65, w: 80, d: 60, color: "#1A1E24" },
                { name: "Fire Booster & Pressure Control", x: 5, y: -65, w: 80, d: 60, color: "#1A1E24" },
                { name: "Telecommunications & Fiber Core", x: -85, y: 5, w: 170, d: 60, color: "#14181D" }
            ],
            furniture: []
        }
    },
    {
        id: "tier-residences",
        level: "Level 05 - 18",
        title: "Grand 3BHK Sky Residences",
        tagline: "Column-Free Usable Carpet with Dual Balconies",
        baseHeight: 65,
        elevationOffset: 185,
        specs: {
            carpet: "1,680 sq.ft (RERA Usable)",
            efficiency: "82.4% Carpet Efficiency",
            ceiling: "10.8 ft Clear Height",
            vastu: "91% (East-Facing Morning Deck)",
            price: "₹4.85 Cr onwards"
        },
        features: [
            "Acoustic laminated Low-E French window glazing",
            "Biometric keycard & video intercom entry",
            "Daikin VRV ducted air conditioning in all rooms"
        ],
        suites: [
            {
                id: "suite-01",
                name: "Suite 01",
                code: "01 · NE",
                title: "3BHK Sunrise Garden Vista",
                type: "3BHK Luxury",
                area: "1,720 sq.ft",
                facing: "North-East",
                axis: "East-by-North-East",
                sunlight: "4.5 hrs morning solar arc",
                decibels: "32 dB (Triple acoustic laminate)",
                balcony: "8.5 ft Deep Sunrise Sundeck",
                quadrant: { x: 5, y: -72, w: 85, d: 68 },
                viewType: "sunrise_hills",
                price: "₹4.95 Cr",
                color: "#1E2738",
                features: ["Panoramic morning sunrise over misty green hills", "Direct east-facing breakfast deck", "Acoustic insulated master glass wall"]
            },
            {
                id: "suite-02",
                name: "Suite 02",
                code: "02 · SE",
                title: "3BHK Podium Pool & Deck View",
                type: "3BHK Premium",
                area: "1,640 sq.ft",
                facing: "South-East",
                axis: "South-East Pool Deck",
                sunlight: "5.5 hrs balanced daylight",
                decibels: "34 dB (Acoustic sanctuary)",
                balcony: "7.0 ft Poolside Overlook Loggia",
                quadrant: { x: 5, y: 2, w: 85, d: 70 },
                viewType: "pool_gardens",
                price: "₹4.75 Cr",
                color: "#182232",
                features: ["Direct bird's-eye view of 25m ozone lap pool", "Overlook of manicured Zen gardens & water features", "Dual-aspect breeze ventilation"]
            },
            {
                id: "suite-03",
                name: "Suite 03",
                code: "03 · SW",
                title: "3BHK Skyline Horizon & Sunset",
                type: "3BHK Skyline",
                area: "1,680 sq.ft",
                facing: "South-West",
                axis: "South-West Horizon",
                sunlight: "4.0 hrs golden afternoon",
                decibels: "31 dB (Whisper quiet)",
                balcony: "8.0 ft Twilight Sky Terrace",
                quadrant: { x: -90, y: 2, w: 88, d: 70 },
                viewType: "sunset_skyline",
                price: "₹4.85 Cr",
                color: "#1C2430",
                features: ["Unobstructed sunset horizon vista across metropolis", "Panoramic dusk city skyline illumination", "Low-E solar heat-reflective glazing"]
            },
            {
                id: "suite-04",
                name: "Suite 04",
                code: "04 · NW",
                title: "4BHK Executive Corner Suite",
                type: "4BHK Grand Suite",
                area: "2,150 sq.ft",
                facing: "North-West",
                axis: "North-West Boulevard Vista",
                sunlight: "3.5 hrs soft afternoon",
                decibels: "30 dB (Triple-glazed sanctuary)",
                balcony: "10.0 ft Grand Corner Wrap Balcony",
                quadrant: { x: -90, y: -72, w: 88, d: 68 },
                viewType: "boulevard_city",
                price: "₹6.20 Cr",
                color: "#222D3E",
                features: ["Dual-aspect corner wrap sundeck", "Expansive master suite with walk-in closet", "Direct private keycard elevator access"]
            }
        ],
        rooms: [
            { name: "Master Suite", area: "310 sq.ft", orientation: "South-West" },
            { name: "Living & Dining Room", area: "520 sq.ft", orientation: "East Balcony" },
            { name: "Chef's Kitchen", area: "180 sq.ft", orientation: "South-East" },
            { name: "Sky Deck Balcony", area: "190 sq.ft", orientation: "East-Facing" },
            { name: "Guest Bedroom", area: "240 sq.ft", orientation: "North-West" }
        ],
        interior: {
            zones: [
                { name: "Living & Dining Great Room", x: -90, y: -70, w: 100, d: 75, color: "#1B222D" },
                { name: "Master Suite & Walk-in", x: 20, y: -70, w: 75, d: 75, color: "#171E28" },
                { name: "Guest Bedroom", x: -90, y: 15, w: 85, d: 60, color: "#151C26" },
                { name: "Chef's Island Kitchen", x: 5, y: 15, w: 45, d: 60, color: "#19212C" },
                { name: "Sky Deck Balcony", x: 60, y: 15, w: 35, d: 60, color: "#0F141B" }
            ],
            furniture: [
                { type: "sofa_l", x: -75, y: -50, w: 40, d: 30 },
                { type: "coffee_table", x: -50, y: -38, w: 18, d: 12 },
                { type: "dining_table", x: -75, y: -15, w: 32, d: 18 },
                { type: "king_bed", x: 35, y: -55, w: 34, d: 38 },
                { type: "kitchen_island", x: 12, y: 30, w: 25, d: 12 }
            ]
        }
    },
    {
        id: "tier-penthouse",
        level: "Level 19 - 20",
        title: "Crown Duplex Sky Palace",
        tagline: "360° Wrap Terrace, Lap Pool & Timber Pergola",
        baseHeight: 50,
        elevationOffset: 270,
        specs: {
            carpet: "3,850 sq.ft",
            efficiency: "88.0% Usable Footprint",
            ceiling: "13.2 ft Double-Height Living",
            vastu: "98% Conformance",
            price: "₹12.50 Cr"
        },
        features: [
            "Private high-speed keycard elevator with direct foyer",
            "Cantilevered rooftop lap pool with glass floor panel",
            "Motorized bronze louvers & teak solar pergola"
        ],
        interior: {
            zones: [
                { name: "Grand Double-Height Salon", x: -80, y: -65, w: 100, d: 85, color: "#1E2532" },
                { name: "Private Infinity Pool Deck", x: 30, y: -65, w: 55, d: 55, color: "#0284C7" },
                { name: "Master Suite Penthouse", x: -80, y: 30, w: 90, d: 45, color: "#18202B" },
                { name: "Sky Terrace & Pergola", x: 20, y: 0, w: 65, d: 75, color: "#121720" }
            ],
            furniture: [
                { type: "pool", x: 35, y: -60, w: 45, d: 45 },
                { type: "sofa_l", x: -65, y: -45, w: 45, d: 35 },
                { type: "king_bed", x: -60, y: 40, w: 35, d: 30 }
            ]
        }
    }
];