// Global variables
let map;
let routingControl = null;
let buses = [];

// How many simulated buses run on the currently selected route
const BUSES_PER_ROUTE = 3;

// Base animation step delay in ms; each bus gets a small random jitter
// around this so multiple buses don't move in perfect lockstep
const ANIMATION_SPEED_MS = 1000;
const SPEED_JITTER_MS = 250;

// One color per bus running on the route
const BUS_COLORS = ["#FF6B00", "#10B981", "#3B82F6"];

// Bus icon: a colored pulsing marker with a bus glyph, replaces the old static PNG icon
function createBusIcon(color) {
    return L.divIcon({
        className: "",
        html: `
            <div class="bus-marker">
                <div class="bus-marker-pulse" style="background:${color}"></div>
                <div class="bus-marker-core" style="background:${color}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#ffffff">
                        <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zM7.5 17A1.5 1.5 0 1 1 7.5 14a1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM6 11V6h12v5H6z"/>
                    </svg>
                </div>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// Predefined routes (Latitude, Longitude) — unchanged
const routes = [
    // Route 1
    [
        L.latLng(27.70130, 85.33998),
        L.latLng(27.68198, 85.33248)
    ],
    // Route 2
    [
        L.latLng(27.68852, 85.33494),
        L.latLng(27.68933, 85.36046)
    ]
];

// Helper: Format seconds into readable time (e.g., "4m 12s" or "45s")
function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

// Initialize Map
window.onload = function () {
    map = L.map("leafletMap").setView([27.693, 85.338], 14);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    loadRoute(0);
};

// Remove all active bus markers and their animation timers
function clearBuses() {
    buses.forEach(b => {
        if (b.timer) clearTimeout(b.timer);
        if (b.marker) map.removeLayer(b.marker);
    });
    buses = [];
}

// Load selected route
function loadRoute(index) {
    // Update active button state
    const buttons = document.querySelectorAll(".routeBtn");
    buttons.forEach((btn, i) => {
        btn.classList.toggle("active", i === index);
    });

    // Clear active timers and previous layers
    clearBuses();
    if (routingControl) map.removeControl(routingControl);

    // Create Leaflet Routing Control
    routingControl = L.Routing.control({
        waypoints: routes[index],
        createMarker: () => null, // Hide default waypoints
        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: {
            styles: [{ color: "#FF6B00", weight: 6, opacity: 0.8 }]
        }
    }).addTo(map);

    // Hide OSRM instruction box automatically
    routingControl.on("routesfound", function (e) {
        const panel = document.querySelector(".leaflet-routing-container");
        if (panel) panel.style.display = "none";

        const routeData = e.routes[0];
        const coordinates = routeData.coordinates;
        const totalDurationSeconds = routeData.summary ? routeData.summary.totalTime : 0;

        // Update Total Duration UI element if available
        const totalTimeElem = document.getElementById("totalTime");
        if (totalTimeElem) {
            totalTimeElem.innerText = formatTime(totalDurationSeconds);
        }

        // Spawn multiple animated buses along the same route
        spawnBuses(coordinates, totalDurationSeconds);
    });

    routingControl.on("routingerror", function (e) {
        console.error("Routing Error:", e);
        alert("Unable to generate route. Please check connected road coordinates.");
    });
}

// Create BUSES_PER_ROUTE buses, spaced out along the route, each animating independently
function spawnBuses(coordinates, totalDurationSeconds) {
    for (let i = 0; i < BUSES_PER_ROUTE; i++) {
        const color = BUS_COLORS[i % BUS_COLORS.length];

        // Spread starting positions along the route so buses don't overlap
        const startStep = Math.floor((coordinates.length - 1) * (i / BUSES_PER_ROUTE));

        // Slight per-bus speed variation for a more natural feel
        const speed = ANIMATION_SPEED_MS + (Math.random() * 2 - 1) * SPEED_JITTER_MS;

        const marker = L.marker(coordinates[startStep], { icon: createBusIcon(color) }).addTo(map);
        marker.bindPopup(`<b>Bus ${i + 1}</b>`);

        const bus = {
            id: i + 1,
            marker,
            step: startStep,
            direction: 1, // 1 = Forward, -1 = Reverse
            speed,
            timer: null
        };

        buses.push(bus);
        animateBus(bus, coordinates, totalDurationSeconds);
    }
}

// Animation loop with Reverse logic & ETA calculation, generalized per bus
function animateBus(bus, coordinates, totalDurationSeconds) {
    if (!bus.marker) return;

    // Move marker to current step
    bus.marker.setLatLng(coordinates[bus.step]);

    // Calculate progress and remaining ETA
    const progressRatio = bus.step / (coordinates.length - 1);
    const remainingSeconds = Math.max(0, totalDurationSeconds * (1 - progressRatio));
    const formattedRemaining = formatTime(remainingSeconds);

    // Update Remaining Time UI element (bound to the lead bus) if available
    if (bus.id === 1) {
        const remainingElem = document.getElementById("remainingTime");
        if (remainingElem) {
            remainingElem.innerText = formattedRemaining;
        }
    }

    // Display direction status & remaining time in marker popup
    const statusLabel = bus.direction === 1 ? "In Transit (Forward)" : "Returning (Reverse)";
    bus.marker.setPopupContent(`<b>Bus ${bus.id} — ${statusLabel}</b><br>ETA: <strong>${formattedRemaining}</strong>`);

    // Advance step based on active direction
    bus.step += bus.direction;

    // Reverse direction automatically at either end of the route
    if (bus.step >= coordinates.length) {
        bus.step = coordinates.length - 2;
        bus.direction = -1; // Switch to reverse
    } else if (bus.step < 0) {
        bus.step = 1;
        bus.direction = 1; // Switch to forward
    }

    bus.timer = setTimeout(() => animateBus(bus, coordinates, totalDurationSeconds), bus.speed);
}
