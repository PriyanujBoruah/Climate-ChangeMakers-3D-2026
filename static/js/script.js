// 1. Initialize Cesium Access Token
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNDk4NzZiNi03OGYxLTQzZjEtYThjYS01YmQ4YjA2ODU4MmYiLCJpZCI6NDEzNjYzLCJpYXQiOjE3NzUzMDA5NjJ9.iizhYzXimZGS3uzbWbohD_KOMvBpCEhUsOLdWKGzxqg';

let viewer;
let charts = {}; 
let isZoomLocked = false; 

async function initGlobe() {
    try {
        viewer = new Cesium.Viewer('cesiumContainer', {
            terrain: Cesium.Terrain.fromWorldTerrain(),
            animation: false, timeline: false, geocoder: true,
            baseLayerPicker: true, infoBox: false, selectionIndicator: false
        });

        const buildings = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(buildings);

        // Day/Night & Lighting
        viewer.scene.globe.enableLighting = true;
        viewer.scene.fog.enabled = true;

        viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000), duration: 3 });
        setupInteraction();

    } catch (error) { console.error("Cesium Load Error:", error); }
}

function toggleZoomLock() {
    isZoomLocked = !isZoomLocked;
    viewer.scene.screenSpaceCameraController.enableZoom = !isZoomLocked;
    const btn = document.getElementById('lockZoomBtn');
    const statusText = document.getElementById('lockStatus');
    const icon = btn.querySelector('.icon');
    
    if (isZoomLocked) {
        btn.classList.add('active'); statusText.innerText = "ON"; icon.innerText = "🔒";
    } else {
        btn.classList.remove('active'); statusText.innerText = "OFF"; icon.innerText = "🔓";
    }
}

function setupInteraction() {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(async function(click) {
        const cartesian = viewer.camera.pickEllipsoid(click.position);
        if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
            const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);

            addPingMarker(cartesian);

            if (!isZoomLocked) {
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(parseFloat(lon), parseFloat(lat) - 0.05, 8000),
                    orientation: { pitch: Cesium.Math.toRadians(-35) },
                    duration: 2
                });
            }

            showPanelLoading(lat, lon);
            fetchWeatherData(lat, lon);
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function addPingMarker(position) {
    viewer.entities.removeAll();
    viewer.entities.add({
        position: position,
        point: { pixelSize: 12, color: Cesium.Color.fromCssColorString('#ff9100'), outlineColor: Cesium.Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: 'Analysis Point', font: '10pt monospace', style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 2, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -15), disableDepthTestDistance: Number.POSITIVE_INFINITY }
    });
}

function fetchWeatherData(lat, lon) {
    // --- 1. FETCH LIVE REAL-TIME WEATHER (Open-Meteo Direct) ---
    const liveApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`;
    fetch(liveApiUrl)
        .then(res => res.json())
        .then(liveData => {
            if(liveData.current) {
                document.getElementById('liveWeatherWidget').classList.remove('hidden');
                document.getElementById('liveTemp').innerText = liveData.current.temperature_2m + "°C";
                document.getElementById('liveWind').innerText = liveData.current.wind_speed_10m + " km/h";
                document.getElementById('liveHumidity').innerText = liveData.current.relative_humidity_2m + "%";
            }
        })
        .catch(err => console.error("Live weather error:", err));

    // --- 2. FETCH HISTORICAL WEATHER & PREDICTIONS (Via Flask) ---
    fetch(`/get_weather?lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (data.daily) {
                const metrics = processThreeMetrics(data.daily);
                
                updateMetric('max', metrics.years, metrics.maxes, '#ff5252');
                updateMetric('avg', metrics.years, metrics.avgs, '#4caf50');
                updateMetric('min', metrics.years, metrics.mins, '#00e5ff');

                document.getElementById('locationName').innerText = "Climate Insight";
                
                // Alert Logic (Check Average Temp Trend)
                const avgTrendDiff = metrics.avgs[metrics.avgs.length - 1] - metrics.avgs[0];
                const alertBox = document.getElementById('warmingAlert');
                if (avgTrendDiff > 0) {
                    alertBox.classList.remove('hidden'); 
                } else {
                    alertBox.classList.add('hidden');    
                }
            }
        })
        .catch(err => console.error(err));
}

function processThreeMetrics(dailyData) {
    const years = [], maxes = [], mins = [], avgs = [];
    let curYear = dailyData.time[0].split('-')[0];
    let yMax = -999, yMin = 999, ySum = 0, yCount = 0;

    for (let i = 0; i < dailyData.time.length; i++) {
        const year = dailyData.time[i].split('-')[0];
        const dMax = dailyData.temperature_2m_max[i];
        const dMin = dailyData.temperature_2m_min[i];

        if (year !== curYear) {
            years.push(curYear); maxes.push(yMax); mins.push(yMin); avgs.push(ySum / (yCount * 2));
            curYear = year; yMax = -999; yMin = 999; ySum = 0; yCount = 0;
        }
        if (dMax > yMax) yMax = dMax;
        if (dMin < yMin) yMin = dMin;
        ySum += (dMax + dMin); yCount++;
    }
    years.push(curYear); maxes.push(yMax); mins.push(yMin); avgs.push(ySum / (yCount * 2));
    return { years, maxes, mins, avgs };
}

function updateMetric(type, years, dataPoints, color) {
    const pred = generatePrediction(years, dataPoints);
    const diff = (dataPoints[dataPoints.length - 1] - dataPoints[0]).toFixed(1);
    
    const trendEl = document.getElementById(`${type}Trend`);
    trendEl.innerText = (diff > 0 ? "+" : "") + diff + "°C";
    trendEl.style.color = diff > 0 ? "#ff5252" : "#4caf50";

    document.getElementById(`${type}Forecast`).innerText = pred.temps[1].toFixed(1) + "°C";

    const ctx = document.getElementById(`${type}Chart`).getContext('2d');
    const lastPoint = dataPoints[dataPoints.length - 1];
    const predSeries = [...Array(years.length - 1).fill(null), lastPoint, ...pred.temps];

    if (charts[type]) charts[type].destroy();

    charts[type] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...years, ...pred.years],
            datasets: [
                { label: 'History', data: dataPoints, borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.4, pointRadius: 1 },
                { label: 'Prediction', data: predSeries, borderColor: '#ff9100', borderDash: [5, 5], fill: false, tension: 0.4, pointRadius: 2 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#888', font: { size: 10 } }, grid: { display: false } } }
        }
    });
}

function generatePrediction(years, temps) {
    const n = temps.length; let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) { sumX += i; sumY += temps[i]; sumXY += i * temps[i]; sumXX += i * i; }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const lastYear = parseInt(years[years.length - 1]);
    return { years: [(lastYear + 1).toString(), (lastYear + 2).toString()], temps: [slope * n + intercept, slope * (n + 1) + intercept] };
}

function showPanelLoading(lat, lon) {
    document.getElementById('bottomPanel').classList.remove('hidden');
    document.getElementById('coordsText').innerText = `Lat: ${lat}, Lon: ${lon}`;
    document.getElementById('locationName').innerText = "Processing Data...";
    document.getElementById('warmingAlert').classList.add('hidden');
    document.getElementById('liveWeatherWidget').classList.add('hidden'); // Hide until loaded
}

function closePanel() {
    document.getElementById('bottomPanel').classList.add('hidden');
    viewer.entities.removeAll(); 
}

initGlobe();