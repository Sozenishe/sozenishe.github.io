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
    // Загружаем данные о нерке
    fetch('Data_Nerka.json')
      .then(res => res.json())
      .then(nerkaData => {
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

        // Функция для создания HTML попапа с деталями о нерке
        function createNerkaPopup(nerkaData) {
          const data = nerkaData.nerka;
          return `
            <div class="fish-details">
              <button class="back-button">← Назад к списку</button>
              <h3>Нерка (${data.systematic.species})</h3>
              
              <section>
                <h4>Систематика</h4>
                <p><strong>Класс:</strong> ${data.systematic.class}</p>
                <p><strong>Отряд:</strong> ${data.systematic.order}</p>
                <p><strong>Семейство:</strong> ${data.systematic.family}</p>
              </section>
              
              <section>
                <h4>Распространение</h4>
                <p>${data.distribution}</p>
              </section>
              
              <section>
                <h4>Размер</h4>
                <p>${data.size}</p>
              </section>
              
              <section>
                <h4>Цикл жизни</h4>
                <div class="life-cycle">
                  <p><strong>Нерест:</strong> ${data.life_cycle.spawning.period}</p>
                  <p><strong>Вылупление:</strong> ${data.life_cycle.spawning.hatching}</p>
                  <p><strong>Морской нагул:</strong> ${data.life_cycle.marine_feeding.duration}</p>
                  <!-- Добавьте другие этапы по аналогии -->
                </div>
              </section>
            </div>
          `;
        }

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
                  <li class="fish-item" data-fish="${fish.name}">
                    <strong>${fish.name}</strong>
                    <div class="fish-short-desc">${fish.description}</div>
                  </li>
                `).join('')}
              </ul>
            `);

            // Обработчик открытия попапа
            layer.on('popupopen', function() {
              const currentPopup = layer.getPopup();
              const riverName = feature.properties.name;
              
              document.querySelectorAll('.fish-item').forEach(item => {
                item.addEventListener('click', () => {
                  if (item.dataset.fish === 'Нерка') {
                    const nerkaPopup = L.popup()
                      .setLatLng(currentPopup.getLatLng())
                      .setContent(createNerkaPopup(nerkaData, riverName, fishes))
                      .openOn(map);
                    
                    // Обработчик кнопки назад
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
  
      .catch(error => console.error('Ошибка загрузки данных о нерке:', error));
  })

.catch(error => console.error('Ошибка:', error));

