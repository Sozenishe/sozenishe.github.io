/**
 * Инициализация карты Leaflet с центром на Камчатке (56.0, 159.0) и zoom=6
 */
const map = L.map('map').setView([56.0, 159.0], 6);

// Делаем карту глобально доступной
window.map = map;

// ======================
// УПРАВЛЕНИЕ WASD (С АДАПТИВНОЙ ЧУВСТВИТЕЛЬНОСТЬЮ ПРИ ПРИБЛИЖЕНИИ)
// ======================
(function() {
    console.log('Добавляем управление WASD с адаптивной чувствительностью...');
    
    let keysPressed = {};
    let isPanning = false;
    let panVelocity = { x: 0, y: 0 };
    let lastFrameTime = 0;
    
    // Настройки физики перемещения
    const PHYSICS = {
        baseAcceleration: 0.001,    // Базовая скорость
        maxSpeed: 0.04,             // Максимальная скорость
        friction: 0.92              // Трение
    };
    
    // Функция для получения множителя скорости в зависимости от зума
    function getZoomMultiplier() {
        const currentZoom = map.getZoom();
        
        // Настройки чувствительности для разных уровней зума
        const zoomSettings = {
            minZoom: 3,      // Самый отдаленный вид
            maxZoom: 18,     // Максимальное приближение
            minMultiplier: 0.001,  // Минимальная чувствительность при максимальном приближении
            maxMultiplier: 1.0    // Максимальная чувствительность при отдалении
        };
        
        const { minZoom, maxZoom, minMultiplier, maxMultiplier } = zoomSettings;
        
        // Ограничиваем zoom в пределах настроек
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));
        
        // Линейная интерполяция множителя
        const zoomProgress = (clampedZoom - minZoom) / (maxZoom - minZoom);
        const multiplier = maxMultiplier - (zoomProgress * (maxMultiplier - minMultiplier));
        
        console.log(`Zoom: ${currentZoom}, Multiplier: ${multiplier.toFixed(3)}`);
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
        
        // Обработка zoom отдельно
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
    
    // Основная функция плавного перемещения
    function panMap(currentTime) {
        if (!isPanning) return;
        
        const deltaTime = Math.min((currentTime - lastFrameTime) / 16, 2);
        lastFrameTime = currentTime;
        
        const zoomMultiplier = getZoomMultiplier();
        let targetVelocityX = 0;
        let targetVelocityY = 0;
        
        // Определяем целевую скорость с учетом чувствительности
        const currentAcceleration = PHYSICS.baseAcceleration * zoomMultiplier;
        
        if (keysPressed['up']) targetVelocityY += currentAcceleration;    // ВВЕРХ
        if (keysPressed['down']) targetVelocityY -= currentAcceleration;  // ВНИЗ
        if (keysPressed['left']) targetVelocityX -= currentAcceleration;  // ВЛЕВО  
        if (keysPressed['right']) targetVelocityX += currentAcceleration; // ВПРАВО
        
        // Плавное изменение скорости
        panVelocity.x += (targetVelocityX - panVelocity.x) * 0.2 * deltaTime;
        panVelocity.y += (targetVelocityY - panVelocity.y) * 0.2 * deltaTime;
        
        // Ограничение максимальной скорости с учетом зума
        const currentMaxSpeed = PHYSICS.maxSpeed * zoomMultiplier;
        const currentSpeed = Math.sqrt(panVelocity.x * panVelocity.x + panVelocity.y * panVelocity.y);
        if (currentSpeed > currentMaxSpeed) {
            const ratio = currentMaxSpeed / currentSpeed;
            panVelocity.x *= ratio;
            panVelocity.y *= ratio;
        }
        
        // Применяем движение если есть скорость
        if (Math.abs(panVelocity.x) > 0.0001 || Math.abs(panVelocity.y) > 0.0001) {
            const center = map.getCenter();
            
            // Двигаем в географических координатах с учетом чувствительности
            const moveDistance = 80 * zoomMultiplier; // Базовое расстояние перемещения
            const newLat = center.lat + (panVelocity.y * deltaTime * moveDistance);
            const newLng = center.lng + (panVelocity.x * deltaTime * moveDistance);
            
            map.setView([newLat, newLng], map.getZoom(), {
                animate: true,
                duration: 0.1,
                easeLinearity: 0.25,
                noMoveStart: true
            });
        }
        
        // Замедление когда клавиши отпущены
        if (!keysPressed['up'] && !keysPressed['down'] && !keysPressed['left'] && !keysPressed['right']) {
            panVelocity.x *= PHYSICS.friction;
            panVelocity.y *= PHYSICS.friction;
            
            // Если скорость очень мала - останавливаем анимацию
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
    
    // Подсказка управления с информацией о чувствительности
    function createControlsHint() {
        const hint = L.control({position: 'bottomleft'});
        
        hint.onAdd = function(map) {
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
        
        return hint;
    }

    const controlsHint = createControlsHint();
    controlsHint.addTo(map);
    
    console.log('✅ Управление с адаптивной чувствительностью активировано!');
})();

// ======================
// 1. БАЗОВЫЕ СЛОИ КАРТЫ
// ======================

/** Основные слои карты */
const baseLayers = {
    "OSM Стандарт": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }),
    "Рельеф (OpenTopoMap)": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap',
        maxZoom: 17  // Ограничение OpenTopoMap
    })
};

/** Полупрозрачный слой рельефа */
const reliefOverlay = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
    opacity: 0.4,
    attribution: 'Esri World Shaded Relief'
});

// Добавляем стандартный слой и контролы слоев
baseLayers["OSM Стандарт"].addTo(map);
const layerControl = L.control.layers(baseLayers, {
    "Рельеф (полупрозрачный)": reliefOverlay
}).addTo(map);

// ======================
// 2. ЗАГРУЗКА ДАННЫХ
// ======================

Promise.all([
    fetch('Data/Data_Geo/Data_Rivers.geojson').then(res => res.json()),
    fetch('Data/Data_fish/Data_Fish.json').then(res => res.json()),
    fetch('Data/Data_Geo/Kurilskoye_Lake.geojson').then(res => res.json()),
    fetch('Data/Data_Geo/Kronotskoye_Lake.geojson').then(res => res.json()),
    // Загружаем данные о рыбах параллельно 
    fetch('Data/Data_fish/Data_Nerka.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_kisutch.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_gorbuscha.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_keta.json').then(res => res.json()),
    fetch('Data/Data_fish/Data_tschawytscha.json').then(res => res.json())
])
.then(([riversGeoData, fishData, kurilskoyeLakeData, kronotskoyeLakeData, nerkaData, kisutchData, gorbuschaData, ketaData, tschawytschaData]) => {
    const fishByRiver = fishData.reduce((acc, item) => {
        if (!acc[item.name]) acc[item.name] = [];
        acc[item.name].push({
            name: item.fish,    
            description: item.description
        });
        return acc;
    }, {});

    // ======================
    // 3. СТИЛИ ОБЪЕКТОВ
    // ======================

    /** Стиль для рек */
    const riverStyle = {
        color: '#1E90FF',  // Синий цвет
        weight: 2,         // Толщина линии
        opacity: 0.8,
    };       

    /** Универсальный стиль для всех озер */
    const lakeStyle = {
        fillColor: '#1E90FF',
        weight: 2,
        opacity: 1,
        color: '#0d6efd',
        fillOpacity: 0.3
    };


    // ======================
    // 4. ФУНКЦИИ ДЛЯ ПОПАПОВ
    // ======================

    /**
     * Создает HTML-контент попапа со списком рыб
     * @param {string} name - Название водоема
     * @param {Array} fishes - Массив объектов с рыбами
     */
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


/**
 * Создает детализированный попап с информацией о нерке
 * @param {Object} nerkaData - Данные о нерке
 */
function createNerkaPopup(nerkaData) {
    const data = nerkaData.nerka;
    return `

        <div class="fish-details">
            <h3>Нерка (${data.systematic.species})</h3>
            
            <div class="model-container">
                <div class="model-title">3D модель нерки</div>
                <div class="sketchfab-embed-wrapper">
                    <iframe title="Red Salmon" frameborder="0" allowfullscreen 
                            mozallowfullscreen="true" webkitallowfullscreen="true" 
                            allow="autoplay; fullscreen; xr-spatial-tracking" 
                            xr-spatial-tracking execution-while-out-of-viewport 
                            execution-while-not-rendered web-share 
                            src="https://sketchfab.com/models/5d2a5c7458e4428180c27f0da7b27a4a/embed?ui_theme=dark">
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
                    <p> ${data.life_cycle.description}</p>
                </div>
            </section>
            <div class="popup-footer">
                <button class="back-button">← Назад к списку</button>
            </div>
        </div>

    `;
}

/**
 * Создает детализированный попап с информацией о чавыче
 * @param {Object} tschawytschaData - Данные о чавыче
 */
function createtschawytschaPopup(tschawytschaData) {
    const data = tschawytschaData.tschawytscha;
    return `

        <div class="fish-details">
            <h3>Чавыча (${data.systematic.species})</h3>
            
            <div class="model-container">
                <div class="model-title">3D модель чавычи</div>
                <div class="sketchfab-embed-wrapper">
                <iframe title="Chinook Salmon ( Ocean phase )" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/4d36e5f3db7e4c33908c42790e59caf3/embed"> </iframe>
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
                    <p> ${data.life_cycle.description}</p>
                </div>
            </section>
            <div class="popup-footer">
                <button class="back-button">← Назад к списку</button>
            </div>
        </div>

    `;
}

/**
 * Создает детализированный попап с информацией о кижуче
 * @param {Object} kisutchData - Данные о кижуче
 */
function createKisutchPopup(kisutchData) {
    const data = kisutchData.kisutch;
    return `
            <div class="fish-details">
                <h3>Кижуч (${data.systematic.species})</h3>
                
                <div class="model-container">
                    <div class="model-title">3D модель кижуча</div>
                    <div class="sketchfab-embed-wrapper"> 
                    <iframe title="Кижуч Oncorhynchus kisutch (Walbaum, 1792)" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/50aa5e5e73a14a018f021d4714e1eca2/embed"> </iframe>
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
                        <p> ${data.life_cycle.description}</p>
                    </div>
                </section>
                <div class="popup-footer">
                    <button class="back-button">← Назад к списку</button>
                </div>
            </div>
    `;
}

/**
 * Создает детализированный попап с информацией о горбуше
 * @param {Object} gorbuschaData - Данные о горбуше
 */
function createGorbuschaPopup(gorbuschaData) {
    const data = gorbuschaData.gorbuscha;
    return `
            <div class="fish-details">
                <h3>Горбуша (${data.systematic.species})</h3>
                
                <div class="model-container">
                    <div class="model-title">3D модель горбуши</div>
                    <div class="sketchfab-embed-wrapper">
                    <iframe title="Pink Salmon" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/952c6be1606e40d4a37339a785d65204/embed">
                    </iframe></div>
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
                        <p> ${data.life_cycle.description}</p>
                    </div>
                </section>
                <div class="popup-footer">
                    <button class="back-button">← Назад к списку</button>
                </div>
            </div>
    `;
}

/**
 * Создает детализированный попап с информацией о кете
 * @param {Object} ketaData - Данные о кете
 */
function createKetaPopup(ketaData) {
    const data = ketaData.keta;
    return `
            <div class="fish-details">
                <h3>Кета (${data.systematic.species})</h3>
                
                <div class="model-container">
                    <div class="model-title">3D модель кеты</div>
                    <div class="sketchfab-embed-wrapper"> <iframe title="Oncorhynchus keta (Walbaum, 1792) Кета" frameborder="0" allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking execution-while-out-of-viewport execution-while-not-rendered web-share src="https://sketchfab.com/models/85d832372230416ca46a3de223a950ec/embed"> </iframe>
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
                        <p> ${data.life_cycle.description}</p>
                    </div>
                </section>
                <div class="popup-footer">
                    <button class="back-button">← Назад к списку</button>
                </div>
            </div>
    `;
}

    // ======================
    // 5. ДОБАВЛЕНИЕ ОЗЕР
    // ======================

    // Курильское озеро (ИСПРАВЛЕНО: используем kurilskoyeLakeData вместо lakeData)
    L.geoJSON(kurilskoyeLakeData, {
        style: lakeStyle,
        onEachFeature: (feature, layer) => {
            const lakeName = "Курильское озеро";
            const fishes = fishByRiver["Курильское"] || [];
            
            // Всплывающая подсказка
            layer.bindTooltip(lakeName, {
                permanent: false,
                className: 'lake-tooltip'
            });

            // Основной попап
            layer.bindPopup(createFishPopup(lakeName, fishes));
            
            // Обработчик для отображения деталей о рыбах
            layer.on('popupopen', function() {
                const currentPopup = layer.getPopup(); 
                
                document.querySelectorAll('.fish-item').forEach(item => {
                    item.addEventListener('click', () => {
                        if (item.dataset.fish === 'Нерка') {
                            const fishPopup = L.popup()
                                .setLatLng(layer.getPopup().getLatLng())
                                .setContent(createNerkaPopup(nerkaData))
                                .openOn(map);
                                
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    layer.openPopup();
                                }
                            });
                        } else if (item.dataset.fish === 'Кижуч') {
                            const fishPopup = L.popup()
                                .setLatLng(layer.getPopup().getLatLng())
                                .setContent(createKisutchPopup(kisutchData))
                                .openOn(map);
                                
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    layer.openPopup();
                                }
                            });
                        } else if (item.dataset.fish === 'Горбуша') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createGorbuschaPopup(gorbuschaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Кета') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createKetaPopup(ketaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Чавыча') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createtschawytschaPopup(tschawytschaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        }
                    });
                });
            });
        }
    }).addTo(map);

    // Кроноцкое озеро
    L.geoJSON(kronotskoyeLakeData, {
        style: lakeStyle, 
        onEachFeature: (feature, layer) => {
            const lakeName = "Кроноцкое озеро";
            const fishes = fishByRiver["Кроноцкое"] || []; // Добавьте данные по рыбам в Data_Fish.json
            
            layer.bindTooltip(lakeName, {
                permanent: false,
                className: 'lake-tooltip'
            });

            layer.bindPopup(createFishPopup(lakeName, fishes));
            
            // Обработчик для отображения деталей о рыбах
            layer.on('popupopen', function() {
                const currentPopup = layer.getPopup(); 
                
                document.querySelectorAll('.fish-item').forEach(item => {
                    item.addEventListener('click', () => {
                        if (item.dataset.fish === 'Нерка') {
                            const fishPopup = L.popup()
                                .setLatLng(layer.getPopup().getLatLng())
                                .setContent(createNerkaPopup(nerkaData))
                                .openOn(map);
                                
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    layer.openPopup();
                                }
                            });
                        } else if (item.dataset.fish === 'Кижуч') {
                            const fishPopup = L.popup()
                                .setLatLng(layer.getPopup().getLatLng())
                                .setContent(createKisutchPopup(kisutchData))
                                .openOn(map);
                                
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    layer.openPopup();
                                }
                            });
                        } else if (item.dataset.fish === 'Горбуша') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createGorbuschaPopup(gorbuschaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Кета') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createKetaPopup(ketaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Чавыча') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createtschawytschaPopup(tschawytschaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        }
                    });
                });
            });
        }
    }).addTo(map);

    // ======================
    // 6. ДОБАВЛЕНИЕ РЕК
    // ======================

    L.geoJSON(riversGeoData, {
        style: riverStyle,
        onEachFeature: (feature, layer) => {
            const riverName = feature.properties.name;
            const fishes = fishByRiver[riverName] || [];

            // Добавляем всплывающую подсказку для рек
            layer.bindTooltip(riverName, {
                permanent: false,
                className: 'river-tooltip',
                direction: 'top'
            });                    
            
            // Основной попап
            layer.bindPopup(createFishPopup(riverName, fishes));

            // Обработчик для отображения деталей о рыбах
            layer.on('popupopen', function() {
                const currentPopup = layer.getPopup();
                
                document.querySelectorAll('.fish-item').forEach(item => {
                    item.addEventListener('click', () => {
                        if (item.dataset.fish === 'Нерка') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createNerkaPopup(nerkaData))
                                .openOn(map);
                            
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Кижуч') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createKisutchPopup(kisutchData))
                                .openOn(map);
                            
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Горбуша') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createGorbuschaPopup(gorbuschaData))
                                .openOn(map);
                            
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Кета') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng()) // ТЕПЕРЬ currentPopup ОПРЕДЕЛЕН
                                .setContent(createKetaPopup(ketaData))
                                .openOn(map);
                            
                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        } else if (item.dataset.fish === 'Чавыча') {
                            const fishPopup = L.popup()
                                .setLatLng(currentPopup.getLatLng())
                                .setContent(createtschawytschaPopup(tschawytschaData))
                                .openOn(map);

                            // Обработчик кнопки "Назад"
                            fishPopup._container.addEventListener('click', (e) => {
                                if (e.target.classList.contains('back-button')) {
                                    fishPopup.remove();
                                    currentPopup.setLatLng(fishPopup.getLatLng()).openOn(map);
                                }
                            });
                        }
                    });
                });
            });
        }
    }).addTo(map);
})
.catch(error => console.error('Ошибка загрузки данных:', error));
