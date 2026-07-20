window.onload = function () {

    var map = L.map('leafletMap').setView([27.7172, 85.3240], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

   
};