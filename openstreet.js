
/**
 * MyMap Class - Reusable Interactive Map Component
 *
 * Features:
 *  - Default marker (always shown at provided location)
 *  - onSelect callback → Fires when user selects location
 *  - Search bar (OSM geocoder)
 *  - Current location button (📍 locate user)
 *  - Map type toggle (Street / Satellite)
 *  - Polygon support:
 *       → Show multiple default polygons with attached metadata
 *       → Draw new polygons (if allowPolygon = true)
 *       → onPolygon callback when new polygon created
 *       → onPolygonClick callback when polygon clicked, returns coords + metadata
 */
class MyMap {
    constructor(divId, options = {}) {
        this.divId = divId;
        this.options = Object.assign({
            defaultLocation: [30.3753, 69.3451], // Pakistan default
            zoom: 5,
            showSearch: true,
            showCurrentLocation: true,
            showMapTypes: true,
            allowPolygon: false,
            defaultPolygons: [],   // [{coords: [[lat,lng],...], data: {...}}]
            onSelect: null,        // callback(lat, lng)
            onPolygon: null,       // callback(coords)
            onPolygonClick: null   // callback(coords, data)
        }, options);

        this.map = null;
        this.marker = null;
        this.drawnItems = new L.FeatureGroup();

        this.initMap();
    }

    initMap() {
        const { defaultLocation, zoom, showSearch, showCurrentLocation, showMapTypes, onSelect, allowPolygon } = this.options;

        // ✅ Initialize map
        this.map = L.map(this.divId).setView(defaultLocation, zoom);

        // ✅ Layers
        const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(this.map);

        const satellite = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
            attribution: "&copy; Google"
        });

        if (showMapTypes) {
            L.control.layers({
                "Street": street,
                "Satellite (Earth)": satellite
            }).addTo(this.map);
        }

        // ✅ Always show default marker
        this.setMarker(defaultLocation);

        // ✅ Interactive only if onSelect provided
        if (typeof onSelect === "function") {
            // Map click
            this.map.on("click", (e) => this.setMarker(e.latlng));

            // Search
            if (showSearch) {
                L.Control.geocoder({ defaultMarkGeocode: false })
                    .on("markgeocode", (e) => {
                        this.setMarker(e.geocode.center);
                        this.map.setView(e.geocode.center, 15);
                    })
                    .addTo(this.map);
            }

            // Current location button
            if (showCurrentLocation) {
                const locateControl = L.control({ position: "topleft" });
                locateControl.onAdd = () => {
                    const btn = L.DomUtil.create("div", "leaflet-control-custom");
                    btn.innerHTML = "📍 My Location";
                    btn.style.cursor = "pointer";
                    btn.style.background = "white";
                    btn.style.padding = "2px 6px";
                    btn.style.border = "1px solid gray";
                    btn.onclick = () => this.map.locate({ setView: true, maxZoom: 16 });
                    return btn;
                };
                locateControl.addTo(this.map);

                this.map.on("locationfound", (e) => this.setMarker(e.latlng));
            }
        }

        // ✅ Show multiple default polygons
        if (Array.isArray(this.options.defaultPolygons)) {
            this.options.defaultPolygons.forEach(poly => {
                const polygon = L.polygon(poly.coords, { color: "blue" }).addTo(this.map);
                this.drawnItems.addLayer(polygon);

                // Attach data
                polygon.customData = poly.data || {};

                // Bind click event
                this._bindPolygonClick(polygon);
            });

            if (this.options.defaultPolygons.length > 0) {
                const allBounds = L.featureGroup(this.drawnItems.getLayers()).getBounds();
                this.map.fitBounds(allBounds);
            }
        }

        // ✅ Polygon drawing enabled
        if (allowPolygon && typeof this.options.onPolygon === "function") {
            this.map.addLayer(this.drawnItems);

            const drawControl = new L.Control.Draw({
                edit: { featureGroup: this.drawnItems },
                draw: {
                    polygon: true,
                    marker: false,
                    circle: false,
                    rectangle: false,
                    circlemarker: false,
                    polyline: false
                }
            });
            this.map.addControl(drawControl);

            this.map.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                this.drawnItems.addLayer(layer);

                const coords = layer.getLatLngs()[0].map(pt => [pt.lat, pt.lng]);

                this.options.onPolygon(coords);

                // Default new polygon data is empty
                layer.customData = {};
                this._bindPolygonClick(layer);
            });
        }
    }

    // ✅ Add / move marker
    setMarker(latlng) {
        if (this.marker) {
            this.marker.setLatLng(latlng);
        } else {
            this.marker = L.marker(latlng).addTo(this.map);
        }

        if (typeof this.options.onSelect === "function") {
            this.options.onSelect(latlng.lat, latlng.lng);
        }
    }

    // ✅ Attach click event to polygon
    _bindPolygonClick(polygon) {
        if (typeof this.options.onPolygonClick === "function") {
            polygon.on("click", () => {
                const coords = polygon.getLatLngs()[0].map(p => [p.lat, p.lng]);
                this.options.onPolygonClick(coords, polygon.customData);
            });
        }
    }
}

// // --------------------
// // ✅ Example usage
// // --------------------
// const map = new MyMap("map", {
//     defaultLocation: [31.5204, 74.3587], // Lahore
//     zoom: 13,
//     allowPolygon: true,
//     defaultPolygons: [
//         {
//             coords: [
//                 [31.521, 74.357],
//                 [31.522, 74.360],
//                 [31.519, 74.362],
//                 [31.518, 74.358]
//             ],
//             data: { name: "Plot A", price: 100000 }
//         },
//         {
//             coords: [
//                 [31.524, 74.364],
//                 [31.525, 74.367],
//                 [31.523, 74.369],
//                 [31.522, 74.365]
//             ],
//             data: { name: "Plot B", price: 150000 }
//         }
//     ],
//     onSelect: (lat, lng) => {
//         console.log("Marker set:", lat, lng);
//     },
//     onPolygon: (coords) => {
//         console.log("Polygon drawn:", coords);
//     },
//     onPolygonClick: (coords, data) => {
//         alert("Polygon clicked: " + JSON.stringify(data));
//     }
// });