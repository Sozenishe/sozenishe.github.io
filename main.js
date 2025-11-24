/**
 * Инициализация карты Leaflet с центром на Камчатке (56.0, 159.0) и zoom=6
 */
const map = L.map('map').setView([56.0, 159.0], 6);
window.map = map;

// ======================
// УПРАВЛЕНИЕ WASD (С АДАПТИВНОЙ ЧУВСТВИТЕЛЬНОСТЬЮ)
// ======================
(function() {
    console.log('Добавляем управление WASD с адаптивной чувствительностью...');
    
    let keysPressed = {};
    let isPanning = false;
    let panVelocity = { x: 0, y: 0 };
    let lastFrameTime = 0;
    
    const PHYSICS = {
        baseAcceleration: 0.001,
        maxSpeed: 0.04,
        friction: 0.92
    };
    
    function getZoomMultiplier() {
        const currentZoom = map.getZoom();
        const zoomSettings = {
            minZoom: 3,
            maxZoom: 18,
            minMultiplier: 0.001,
            maxMultiplier: 1.0
        };
        
        const { minZoom, maxZoom, minMultiplier, maxMultiplier } = zoomSettings;
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));
        const zoomProgress = (clampedZoom - minZoom) / (maxZoom - minZoom);
        const multiplier = maxMultiplier - (zoomProgress * (maxMultiplier - minMultiplier));
        
        return multiplier;
    }
    
    function getActionByKey(key) {
        const keyActions = {
            'w': 'up', 'a': 'left', 's': 'down', 'd': 'right', 
            'ц': 'up', 'ф': 'left', 'ы': 'down', 'в': 'right',
            'arrowup': 'up', 'arrowleft': 'left', 'arrowdown': 'down', 'arrowright': 'right',
            'e': 'zoomIn', 'q': 'zoomOut', 'у': 'zoomIn', 'й': 'zoomOut'
        };
        return keyActions[key.toLowerCase()];
    }
    
    function handleKeyDown(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        
        const key = event.key.toLowerCase();
        const action = getActionByKey(key);
        
        if (action && ['up', 'down', 'left', 'right'].includes(action)) {
            keysPressed[action] = true;
            event.preventDefault();
            
            if (!isPanning) {
                isPanning = true;
                lastFrameTime = performance.now();
                requestAnimationFrame(panMap);
            }
        }
        
        if (action && ['zoomIn', 'zoomOut'].includes(action)) {
            if (action === 'zoomIn') map.zoomIn();
            if (action === 'zoomOut') map.zoomOut();
            event.preventDefault();
        }
    }
    
    function handleKeyUp(event) {
        const key = event.key.toLowerCase();
        const action = getActionByKey(key);
        
        if (action && ['up', 'down', 'left', 'right'].includes(action)) {
            keysPressed[action] = false;
            event.preventDefault();
        }
    }
    
    function panMap(currentTime) {
        if (!isPanning) return;
        
        const deltaTime = Math.min((currentTime - lastFrameTime) / 16, 2);
        lastFrameTime = currentTime;
        
        const zoomMultiplier = getZoomMultiplier();
        let targetVelocityX = 0;
        let targetVelocityY = 0;
        
        const currentAcceleration = PHYSICS.baseAcceleration * zoomMultiplier;
        
        if (keysPressed['up']) targetVelocityY += currentAcceleration;
        if (keysPressed['down']) targetVelocityY -= currentAcceleration;
        if (keysPressed['left']) targetVelocityX -= currentAcceleration;  
        if (keysPressed['right']) targetVelocityX += currentAcceleration;
        
        panVelocity.x += (targetVelocityX - panVelocity.x) * 0.2 * deltaTime;
        panVelocity.y += (targetVelocityY - panVelocity.y) * 0.2 * deltaTime;
        
        const currentMaxSpeed = PHYSICS.maxSpeed * zoomMultiplier;
        const currentSpeed = Math.sqrt(panVelocity.x * panVelocity.x + panVelocity.y * panVelocity.y);
        if (currentSpeed > currentMaxSpeed) {
            const ratio = currentMaxSpeed / currentSpeed;
            panVelocity.x *= ratio;
            panVelocity.y *= ratio;
        }
        
        if (Math.abs(panVelocity.x) > 0.0001 || Math.abs(panVelocity.y) > 0.0001) {
            const center = map.getCenter();
            const moveDistance = 80 * zoomMultiplier;
            const newLat = center.lat + (panVelocity.y * deltaTime * moveDistance);
            const newLng = center.lng + (panVelocity.x * deltaTime * moveDistance);
            
            map.setView([newLat, newLng], map.getZoom(), {
                animate: true,
                duration: 0.1,
                easeLinearity: 0.25,
                noMoveStart: true
            });
        }
        
        if (!keysPressed['up'] && !keysPressed['down'] && !keysPressed['left'] && !keysPressed['right']) {
            panVelocity.x *= PHYSICS.friction;
            panVelocity.y *= PHYSICS.friction;
            
            if (Math.abs(panVelocity.x) < 0.0001 && Math.abs(panVelocity.y) < 0.0001) {
                panVelocity.x = 0;
                panVelocity.y = 0;
                isPanning = false;
                return;
            }
        }
        
        requestAnimationFrame(panMap);
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Подсказка управления
    const controlsHint = L.control({position: 'bottomleft'});
    controlsHint.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'controls-hint');
        div.innerHTML = `
            <div style="
                background: white;
                padding: 10px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                border: 2px solid #3388ff;
            ">
                <strong>Управление с адаптивной чувствительностью:</strong><br>
                W/Ц - вверх | S/Ы - вниз<br>
                A/Ф - влево | D/В - вправо<br>
                Q/Й - отдалить | E/У - приблизить<br>
                <em style="color: #666; font-size: 10px;">
                🔍 Чувствительность снижается при приближении
                </em>
            </div>
        `;
        return div;
    };
    controlsHint.addTo(map);
    
    console.log('✅ Управление с адаптивной чувствительностью активировано!');
})();

// ======================
// БАЗОВЫЕ СЛОИ КАРТЫ
// ======================
const baseLayers = {
    "OSM Стандарт": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }),
    "Рельеф (OpenTopoMap)": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap',
        maxZoom: 17
    })
};

const reliefOverlay = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
    opacity: 0.4,
    attribution: 'Esri World Shaded Relief'
});

baseLayers["OSM Стандарт"].addTo(map);
L.control.layers(baseLayers, {
    "Рельеф (полупрозрачный)": reliefOverlay
}).addTo(map);

// ======================
// КОНСТАНТЫ И СТИЛИ
// ======================
const STYLES = {
    river: {
        color: '#1E90FF',
        weight: 2,
        opacity: 0.8,
    },
    lake: {
        fillColor: '#1E90FF',
        weight: 2,
        opacity: 1,
        color: '#0d6efd',
        fillOpacity: 0.3
    }
};

// ======================
// ЗАГРУЗКА ДАННЫХ
// ======================
Promise.all([
    fetch('Data/Data_Geo/Data_Rivers.geojson').then(res => res.json()),
    fetch('Data/Data_fish/Data_Fish.json').then(res => res.json()),
    fetch('Data/Data_Geo/Kurilskoye_Lake.geojson').then(res => res.json()),
    fetch('Data/Data_Geo/Kronotskoye_Lake.geojson').then(res => res.json()),
    fetch('Data/Data_Geo/Azhabachye_Lake.geojson').then(res => res.json()),
    fetch('Data/Data_fish/Data_Nerka.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_kisutch.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_gorbuscha.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_keta.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_tschawytscha.json').then(res => res.json())
])
.then(([riversGeoData, fishData, kurilskoyeLakeData, kronotskoyeLakeData, azhabachyeLakeData, ...fishSpeciesData]) => {
    const [nerkaData, kisutchData, gorbuschaData, ketaData, tschawytschaData] = fishSpeciesData;
    
    const fishByRiver = fishData.reduce((acc, item) => {
        if (!acc[item.name]) acc[item.name] = [];
        acc[item.name].push({
            name: item.fish,    
            description: item.description
        });
        return acc;
    }, {});

    // ======================
    // УНИВЕРСАЛЬНЫЕ ФУНКЦИИ
    // ======================
    
    function createFishPopup(name, fishes) {
        return `
            <b>${name}</b>
            <ul class="fish-list">
                ${fishes.map(fish => `
                    <li class="fish-item" data-fish="${fish.name}">
                        <strong>${fish.name}</strong>
                        <div class="fish-short-desc">${fish.description}</div>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function createFishDetailPopup(fishData, fishType) {
        const data = fishData[fishType];
        const modelEmbeds = {
            'nerka': '5d2a5c7458e4428180c27f0da7b27a4a',
            'tschawytscha': '4d36e5f3db7e4c33908c42790e59caf3',
            'kisutch': '50aa5e5e73a14a018f021d4714e1eca2',
            'gorbuscha': '952c6be1606e40d4a37339a785d65204',
            'keta': '85d832372230416ca46a3de223a950ec'
        };

        return `
            <div class="fish-details">
                <h3>${data.systematic.species}</h3>
                
                <div class="model-container">
                    <div class="model-title">3D модель</div>
                    <div class="sketchfab-embed-wrapper">
                        <iframe title="${data.systematic.species}" frameborder="0" allowfullscreen 
                                mozallowfullscreen="true" webkitallowfullscreen="true" 
                                allow="autoplay; fullscreen; xr-spatial-tracking" 
                                src="https://sketchfab.com/models/${modelEmbeds[fishType]}/embed?ui_theme=dark">
                        </iframe>       
                    </div>
                </div>

                <section>
                    <h4>Систематика</h4>
                    <div class="life-cycle">
                        <p><strong>Класс:</strong> ${data.systematic.class}</p>
                        <p><strong>Отряд:</strong> ${data.systematic.order}</p>
                        <p><strong>Семейство:</strong> ${data.systematic.family}</p>
                    </div>
                </section>
                
                <section>
                    <h4>Распространение</h4>
                    <div class="life-cycle">
                        <p>${data.distribution}</p>
                    </div>
                </section>
                
                <section>
                    <h4>Цикл развития</h4>
                    <div class="life-cycle">
                        <p>${data.life_cycle.description}</p>
                    </div>
                </section>
                <div class="popup-footer">
                    <button class="back-button">← Назад к списку</button>
                </div>
            </div>
        `;
    }

    function setupFishPopupHandlers(layer, fishesData) {
        layer.on('popupopen', function() {
            const currentPopup = layer.getPopup();
            
            document.querySelectorAll('.fish-item').forEach(item => {
                item.addEventListener('click', () => {
                    const fishTypeMap = {
                        'Нерка': () => createFishDetailPopup(fishesData.nerka, 'nerka'),
                        'Кижуч': () => createFishDetailPopup(fishesData.kisutch, 'kisutch'),
                        'Горбуша': () => createFishDetailPopup(fishesData.gorbuscha, 'gorbuscha'),
                        'Кета': () => createFishDetailPopup(fishesData.keta, 'keta'),
                        'Чавыча': () => createFishDetailPopup(fishesData.tschawytscha, 'tschawytscha')
                    };

                    const fishType = item.dataset.fish;
                    if (fishTypeMap[fishType]) {
                        const fishPopup = L.popup()
                            .setLatLng(currentPopup.getLatLng())
                            .setContent(fishTypeMap[fishType]())
                            .openOn(map);

                        fishPopup._container.addEventListener('click', (e) => {
                            if (e.target.classList.contains('back-button')) {
                                fishPopup.remove();
                                layer.openPopup();
                            }
                        });
                    }
                });
            });
        });
    }

    // ======================
    // ДОБАВЛЕНИЕ ОЗЕР
    // ======================
    const lakesData = [
        { data: kurilskoyeLakeData, name: "Курильское озеро", fishKey: "Курильское" },
        { data: azhabachyeLakeData, name: "Ажабачье озеро", fishKey: "Ажабачье" },
        { data: kronotskoyeLakeData, name: "Кроноцкое озеро", fishKey: "Кроноцкое" }
    ];

    lakesData.forEach(lake => {
        L.geoJSON(lake.data, {
            style: STYLES.lake,
            onEachFeature: (feature, layer) => {
                const fishes = fishByRiver[lake.fishKey] || [];
                
                layer.bindTooltip(lake.name, {
                    permanent: false,
                    className: 'lake-tooltip'
                });

                layer.bindPopup(createFishPopup(lake.name, fishes));
                
                // ИСПРАВЛЕНИЕ: Передаем все данные о рыбах правильно
                layer.on('popupopen', function() {
                    const currentPopup = layer.getPopup();
                    
                    document.querySelectorAll('.fish-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const fishTypeMap = {
                                'Нерка': () => createFishDetailPopup(nerkaData, 'nerka'),
                                'Кижуч': () => createFishDetailPopup(kisutchData, 'kisutch'),
                                'Горбуша': () => createFishDetailPopup(gorbuschaData, 'gorbuscha'),
                                'Кета': () => createFishDetailPopup(ketaData, 'keta'),
                                'Чавыча': () => createFishDetailPopup(tschawytschaData, 'tschawytscha')
                            };

                            const fishType = item.dataset.fish;
                            if (fishTypeMap[fishType]) {
                                const fishPopup = L.popup()
                                    .setLatLng(currentPopup.getLatLng())
                                    .setContent(fishTypeMap[fishType]())
                                    .openOn(map);

                                fishPopup._container.addEventListener('click', (e) => {
                                    if (e.target.classList.contains('back-button')) {
                                        fishPopup.remove();
                                        layer.openPopup();
                                    }
                                });
                            }
                        });
                    });
                });
            }
        }).addTo(map);
    });

    // ======================
    // ДОБАВЛЕНИЕ РЕК
    // ======================
    L.geoJSON(riversGeoData, {
        style: STYLES.river,
        onEachFeature: (feature, layer) => {
            const riverName = feature.properties.name;
            const fishes = fishByRiver[riverName] || [];

            layer.bindTooltip(riverName, {
                permanent: false,
                className: 'river-tooltip',
                direction: 'top'
            });                    
            
            layer.bindPopup(createFishPopup(riverName, fishes));
            
            // ИСПРАВЛЕНИЕ: Такая же логика для рек
            layer.on('popupopen', function() {
                const currentPopup = layer.getPopup();
                
                document.querySelectorAll('.fish-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const fishTypeMap = {
                            'Нерка': () => createFishDetailPopup(nerkaData, 'nerka'),
                            'Кижуч': () => createFishDetailPopup(kisutchData, 'kisutch'),
                            'Горбуша': () => createFishDetailPopup(gorbuschaData, 'gorbuscha'),
                            'Кета': () => createFishDetailPopup(ketaData, 'keta'),
                            'Чавыча': () => createFishDetailPopup(tschawytschaData, 'tschawytscha')
                        };

                        const fishType = item.dataset.fish;
                        if (fishTypeMap[fishType]) {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(fishTypeMap[fishType]())
                                .openOn(map);

                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    layer.openPopup();
                                }
                            });
                        }
                    });
                });
            });
        }
    }).addTo(map);

    // ======================
    // РЕЧНЫЕ ПОРОГИ С АДАПТИВНЫМ РАЗМЕРОМ
    // ======================
    function getRapidsSize(zoom) {
        const sizeSettings = {
            minZoom: 3,
            maxZoom: 18,
            minSize: 3,
            maxSize: 8
        };
        
        const { minZoom, maxZoom, minSize, maxSize } = sizeSettings;
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        const zoomProgress = (clampedZoom - minZoom) / (maxZoom - minZoom);
        
        return Math.round(minSize + (zoomProgress * (maxSize - minSize)));
    }

    const rapidsGroup = L.layerGroup().addTo(map);

    function updateRapidsSize() {
        const currentZoom = map.getZoom();
        const newSize = getRapidsSize(currentZoom);
        
        rapidsGroup.eachLayer(layer => {
            if (layer.setRadius) {
                layer.setRadius(newSize);
                layer.setStyle({
                    fillOpacity: currentZoom <= 6 ? 0.3 : 0.6,
                    opacity: currentZoom <= 6 ? 0.6 : 0.9
                });
            }
        });
    }

    // Добавляем пороги
    riversGeoData.features.forEach(feature => {
        if (feature.geometry.type === 'Point' && feature.properties?.waterway === 'rapids') {
            const initialZoom = map.getZoom();
            const initialSize = getRapidsSize(initialZoom);
            
            const marker = L.circleMarker(
                [feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 
                {
                    radius: initialSize,
                    fillColor: "#FFD700",
                    color: "#8B4513",
                    weight: 2,
                    opacity: initialZoom <= 6 ? 0.6 : 0.9,
                    fillOpacity: initialZoom <= 6 ? 0.3 : 0.6,
                    className: 'adaptive-rapids-marker'
                }
            );
            
            marker.bindTooltip('🌊 Речной порог', {
                permanent: false,
                direction: 'top',
                className: 'rapids-tooltip'
            });
            
            marker.bindPopup(`
                <div class="rapids-popup">
                    <h3>🌊 Речной порог</h3>
                    <p><strong>Река:</strong> Кроноцкая</p>
                    <p><strong>Тип:</strong> Порожистый участок</p>
                    <p><em>Участок с быстрым течением и каменистым дном</em></p>
                </div>
            `);
            
            marker.addTo(rapidsGroup);
        }
    });

    map.on('zoomend', updateRapidsSize);
    map.on('moveend', updateRapidsSize);

    console.log('✅ Все данные успешно загружены и отображены на карте!');
})
.catch(error => console.error('Ошибка загрузки данных:', error));
