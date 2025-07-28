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
