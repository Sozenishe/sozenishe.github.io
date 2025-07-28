// 1. Функция для анимации (ДОБАВЬТЕ ЭТО В НАЧАЛО)
function animateRiver(layer, speed = 100, dashArray = '10, 10') {
    let offset = 0;
    const interval = setInterval(() => {
      offset = (offset + 1) % 20;
      layer.setStyle({ dashOffset: offset });
    }, speed);
    return { interval, dashArray };
  }
  
  // 2. Инициализация карты
  const map = L.map('map').setView([56.0, 159.0], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  

  
  // 3. Загрузка данных
  Promise.all([
    fetch('Data_Rivers.geojson').then(res => res.json()),
    fetch('Data_Fish.json').then(res => res.json())
  ])
  .then(([riversGeoData, fishData]) => {
    const fishByRiver = fishData.reduce((acc, item) => {
      if (!acc[item.name]) acc[item.name] = [];
      acc[item.name].push({ name: item.fish, description: item.description });
      return acc;
    }, {});
  
    const riverStyle = {
      color: '#1E90FF',
      weight: 2,
      opacity: 0.8
    };
  
    L.geoJSON(riversGeoData, {
      style: riverStyle,
      onEachFeature: (feature, layer) => {
        const riverName = feature.properties.name;
        const fishes = fishByRiver[riverName] || [];
  
        layer.bindTooltip(riverName, { 
          permanent: false, 
          className: 'river-tooltip' 
        });
  
        layer.bindPopup(`
          <b>${riverName}</b>
          <ul class="fish-list">
            ${fishes.map(fish => `
              <li class="fish-item">
                <strong>${fish.name}</strong>: ${fish.description}
              </li>
            `).join('')}
          </ul>
        `);
        
        // Анимация только для "Озёрная"
        if (riverName === "Озёрная") {
            
          layer.setStyle({ dashArray: '10, 10' }); // Добавляем пунктир
          const animation = animateRiver(layer);
          
          layer.on('mouseover', () => {
            layer.setStyle({ weight: 5, opacity: 1, dashArray: '5, 5' });
            clearInterval(animation.interval);
            animation.interval = animateRiver(layer, 50, '5, 5').interval;
          });
  
          layer.on('mouseout', () => {
            layer.setStyle({ weight: 2, opacity: 0.8, dashArray: '10, 10' });
            clearInterval(animation.interval);
            animation.interval = animateRiver(layer, 100, '10, 10').interval;
          });
        }
      }
    }).addTo(map);
  })
  .catch(error => console.error('Ошибка:', error));
// Загрузка GeoJSON с рыбами (Data_Fish_JSON.json) //пока что не нужно
// fetch('Data_Fish_JSON.json')
//     .then(response => response.json())
//     .then(data => {
//         const riverAnimations = [];
        
//         L.geoJSON(data, {
//             style: { 
//                 color: 'blue', 
//                 weight: 3,
//                 dashArray: '10, 10',
//                 dashOffset: '0',
//                 opacity: 0.8
//             },
//             onEachFeature: (feature, layer) => {
//                 layer.bindPopup(`
//                     <b>${feature.properties.river_name}</b><br>
//                     Рыбы: ${feature.properties.species}
//                 `);
                
//                 // Анимация для реки (только для реки Озерная)
//                 if (feature.properties.river_name === "Река Озёрная") {
//                     const animation = animateRiver(layer);
//                     riverAnimations.push({
//                         layer,
//                         interval: animation.interval,
//                         originalStyle: {
//                             dashArray: animation.dashArray,
//                             speed: 100
//                         }
//                     });

//                     // Анимация при наведении
//                     layer.on('mouseover', () => {
//                         layer.setStyle({
//                             weight: 5,
//                             opacity: 1,
//                             dashArray: '5, 5' // Более частый пунктир
//                         });
                        
//                         // Ускоряем анимацию
//                         clearInterval(animation.interval);
//                         animation.interval = animateRiver(layer, 50, '5, 5').interval;
//                     });

//                     layer.on('mouseout', () => {
//                         layer.setStyle({
//                             weight: 3,
//                             opacity: 0.8,
//                             dashArray: '10, 10' // Возвращаем исходный пунктир
//                         });
                        
//                         // Возвращаем обычную скорость
//                         clearInterval(animation.interval);
//                         animation.interval = animateRiver(layer, 100, '10, 10').interval;
//                     });
//                 }
//             }
//         }).addTo(map);
        
//         // Очистка интервалов при уничтожении карты
//         map.on('unload', () => {
//             riverAnimations.forEach(anim => clearInterval(anim.interval));
//         });
//     })
//     .catch(error => {
//         console.error('Ошибка загрузки Data_Fish_JSON.json:', error);
//     });


