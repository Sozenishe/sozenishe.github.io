/**
 * Инициализация карты Leaflet с центром на Камчатке (56.0, 159.0) и zoom=6
 */
const map = L.map('map').setView([56.0, 159.0], 6);

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
    fetch('Data_Rivers.geojson').then(res => res.json()),  // Геоданные рек
    fetch('Data_Fish.json').then(res => res.json()),      // Данные о рыбах
    fetch('Kurilskoye_Lake.geojson').then(res => res.json())  // Данные озера
])
.then(([riversGeoData, fishData, lakeData]) => {
    // Дополнительная загрузка данных о нерке
    fetch('Data_Nerka.json')
        .then(res => res.json())
        .then(nerkaData => {
            // Преобразуем данные о рыбах в удобный формат: {река: [рыбы]}
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

            /** Стиль для озера Курильское */
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
                            <h4>Размер</h4>
                            <div class="life-cycle">
                                <p>${data.size}</p>
                            </div>
                        </section>
                        
                        <section>
                            <h4>Цикл развития</h4>
                            <div class="life-cycle">
                                <p><strong>Нерест:</strong> ${data.life_cycle.spawning.period}</p>
                                <p><strong>Вылупление:</strong> ${data.life_cycle.spawning.hatching}</p>
                                <p><strong>Миграция:</strong> ${data.life_cycle.first_migration.description}</p>
                                <p><strong>Первая зимовка:</strong> ${data.life_cycle.first_wintering.description}</p>
                                <p><strong>Вторая зимовка:</strong> ${data.life_cycle.second_wintering.description}</p>
                                <p><strong>Морской нагул:</strong> ${data.life_cycle.marine_feeding.duration}</p>
                                <p><strong>Пресноводный нагул:</strong> ${data.life_cycle.freshwater_feeding.duration}</p>
                                <p><strong>Обратная миграция в озеро:</strong> ${data.life_cycle.return_migration.description}</p>
                            </div>
                        </section>
                        <div class="popup-footer">
                            <button class="back-button">← Назад к списку</button>
                        </div>
                    </div>
                `;
            }

            // ======================
            // 5. ДОБАВЛЕНИЕ ОЗЕРА
            // ======================

            L.geoJSON(lakeData, {
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
                    
                    // Обработчик для отображения деталей о нерке
                    layer.on('popupopen', function() {
                        document.querySelectorAll('.fish-item').forEach(item => {
                            item.addEventListener('click', () => {
                                if (item.dataset.fish === 'Нерка') {
                                    const nerkaPopup = L.popup()
                                        .setLatLng(layer.getPopup().getLatLng())
                                        .setContent(createNerkaPopup(nerkaData))
                                        .openOn(map);
                                        
                                    // Обработчик кнопки "Назад"
                                    nerkaPopup._container.addEventListener('click', (e) => {
                                        if (e.target.classList.contains('back-button')) {
                                            nerkaPopup.remove();
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
                        direction: 'top' // Можно настроить положение
                    });                    
                    
                    // Основной попап
                    layer.bindPopup(createFishPopup(riverName, fishes));

                    // Обработчик для отображения деталей о нерке
                    layer.on('popupopen', function() {
                        const currentPopup = layer.getPopup();
                        
                        document.querySelectorAll('.fish-item').forEach(item => {
                            item.addEventListener('click', () => {
                                if (item.dataset.fish === 'Нерка') {
                                    const nerkaPopup = L.popup()
                                        .setLatLng(currentPopup.getLatLng())
                                        .setContent(createNerkaPopup(nerkaData))
                                        .openOn(map);
                                    
                                    // Обработчик кнопки "Назад"
                                    nerkaPopup._container.addEventListener('click', (e) => {
                                        if (e.target.classList.contains('back-button')) {
                                            nerkaPopup.remove();
                                            currentPopup.setLatLng(nerkaPopup.getLatLng()).openOn(map);
                                        }
                                    });
                                }
                            });
                        });
                    });
                }
            }).addTo(map);
        })
        .catch(error => console.error('Ошибка загрузки данных о нерке:', error));
})
.catch(error => console.error('Ошибка загрузки основных данных:', error));
