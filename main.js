// Инициализация карты (центр на Камчатке)
const map = L.map('map').setView([56.0, 159.0], 6);
        
// Подключение OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Загрузка GeoJSON с реками
fetch('Data_Fish_JSON.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            style: { color: 'blue', weight: 3 },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <b>${feature.properties.river_name}</b><br>
                    Рыбы: ${feature.properties.species}
                `);
            }
        }).addTo(map);
    });