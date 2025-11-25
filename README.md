# Interactive Ichthyofauna Map of Kamchatka

![Main Map View](screenshot_fishList.jpg)
*Interactive map with species list*

![Species Details](screenshot_fishCard.jpg) 
*Detailed species information popup*

## Live Demo
👉 [View Live Application](https://sozenishe.github.io/)

## Project Overview
A single-page web application for visualizing and exploring fish species distribution in the lakes and rivers of Kamchatka region. Developed as a diploma project for Software Engineering degree.

## Features
- Interactive map with zoom and pan functionality using Leaflet.js
- Multiple GeoJSON layers for different geographical features
- Species-specific data visualization with custom markers
- Detailed popups with fish species information
- Responsive design for mobile and desktop devices

## Technology Stack
- **Frontend:** JavaScript, HTML5, CSS3
- **Mapping:** Leaflet.js
- **Data Format:** Json, GeoJSON
- **Version Control:** Git, GitHub Pages

## Project Structure
```
IKIROK_Prototype/
├── index.html
├── main.js
├── styles.css
├── Data/
│   ├── Data_fish/
│   │   ├── Data_Fish.json
│   │   ├── Data_gorbuscha.json
│   │   ├── Data_keta.json
│   │   ├── Data_kisutch.json
│   │   ├── Data_Nerka.json
│   │   └── Data_tschawytscha.json
│   └── Data_Geo/
│       ├── Azhabachye_Lake.geojson
│       ├── Data_Rivers.geojson
│       ├── Kronotskoye_Lake.geojson
│       └── Kunlskoye_Lake.geojson
└── README.md
```

## Data Structure
- **Data_fish/**: Contains JSON files with detailed information about different fish species
- **Data_Geo/**: Contains GeoJSON files with geographical data of lakes and rivers in Kamchatka

## Installation & Local Development
- Open index.html in your browser or use a local server.

Data Sources
- Fish species data: Scientific articles and research papers
- Geographical data: OpenStreetMap Overpass API
