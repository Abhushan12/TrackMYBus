// Global variables
let map;
let routingControl = null;
let bus = null;
let animation = null;

// Bus icon
const busIcon = L.icon({
    iconUrl: "bus.png",
    iconSize: [30, 30]
});

// Bus routes (stops only)
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


// Create map after page loads
window.onload = function () {

    map = L.map("leafletMap").setView([27.693, 85.338], 14);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    loadRoute(0);

};


// Load selected route
function loadRoute(index) {

    // Highlight selected button
    document.querySelectorAll(".routeBtn").forEach(btn => {
        btn.classList.remove("active");
    });

    document.querySelectorAll(".routeBtn")[index].classList.add("active");


    // Remove previous route
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    // Remove previous bus
    if (bus) {
        map.removeLayer(bus);
        bus = null;
    }

    clearTimeout(animation);


    routingControl = L.Routing.control({

        waypoints: routes[index],

        createMarker: function () {
            return null;
        },

        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: true,
        show: false,

        lineOptions: {
            styles: [{
                color: "#0066ff",
                weight: 6,
                opacity: 0.9
            }]
        }

    }).addTo(map);


    // Hide routing instructions
    routingControl.on("routingstart", function () {

        setTimeout(() => {
            const panel = document.querySelector(".leaflet-routing-container");
            if (panel) {
                panel.style.display = "none";
            }
        }, 100);

    });


   
    routingControl.on("routesfound", function (e) {

        const road = e.routes[0].coordinates;

        bus = L.marker(road[0], {
            icon: busIcon
        }).addTo(map);

        let i = 0;

        function moveBus() {

            bus.setLatLng(road[i]);

            i++;

            if (i >= road.length) {
                i = 0; 
            }

            animation = setTimeout(moveBus, 1000);

        }

        moveBus();

    });


    // If OSRM can't generate a route
    routingControl.on("routingerror", function (e) {

        console.error("Routing Error:", e);

        alert("Unable to generate this route.\nChoose coordinates that are connected by roads.");

    });

}