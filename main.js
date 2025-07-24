// Инициализация карты (центр на Камчатке)
const map = L.map('map').setView([56.0, 159.0], 6);

// Подключение OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Функция для анимации рек (обратное направление)
function animateRiver(layer, speed = 100, dashArray = '10, 10') {
    let offset = 0;
    const interval = setInterval(() => {
        offset = (offset - 1) % 20;
        layer.setStyle({
            dashOffset: offset
        });
    }, speed);
    return { interval, dashArray };
}

// Загрузка GeoJSON с реками
fetch('Data_Fish_JSON.json')
    .then(response => response.json())
    .then(data => {
        const riverAnimations = [];
        
        L.geoJSON(data, {
            style: { 
                color: 'blue', 
                weight: 3,
                dashArray: '10, 10',
                dashOffset: '0',
                opacity: 0.8
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <b>${feature.properties.river_name}</b><br>
                    Рыбы: ${feature.properties.species}
                `);
                
                // Анимация для реки (только для реки Озерная)
                if (feature.properties.river_name === "Река Озёрная") {
                    const animation = animateRiver(layer);
                    riverAnimations.push({
                        layer,
                        interval: animation.interval,
                        originalStyle: {
                            dashArray: animation.dashArray,
                            speed: 100
                        }
                    });

                    // Анимация при наведении
                    layer.on('mouseover', () => {
                        layer.setStyle({
                            weight: 5,
                            opacity: 1,
                            dashArray: '5, 5' // Более частый пунктир
                        });
                        
                        // Ускоряем анимацию
                        clearInterval(animation.interval);
                        animation.interval = animateRiver(layer, 50, '5, 5').interval;
                    });

                    layer.on('mouseout', () => {
                        layer.setStyle({
                            weight: 3,
                            opacity: 0.8,
                            dashArray: '10, 10' // Возвращаем исходный пунктир
                        });
                        
                        // Возвращаем обычную скорость
                        clearInterval(animation.interval);
                        animation.interval = animateRiver(layer, 100, '10, 10').interval;
                    });
                }
            }
        }).addTo(map);
        
        // Очистка интервалов при уничтожении карты
        map.on('unload', () => {
            riverAnimations.forEach(anim => clearInterval(anim.interval));
        });
    });
