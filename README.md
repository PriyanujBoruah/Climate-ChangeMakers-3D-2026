# AETHERIS: 3D Global Explorer 🌍

**Aetheris: 3D Global Explorer** is a high-fidelity geospatial platform that allows users to perform localized climate audits anywhere on the planet using 3D terrain and historical archives.

## 🌟 Overview
Following the **"Equity & Justice Lens,"** this tool provides a "Click-Anywhere" policy. While most weather apps ignore remote and Indigenous regions, Aetheris allows users to click any coordinate to fetch 15 years of climate data and generate a 2026 forecast.

## 🚀 Key Features
- **3D Geospatial Interface:** Powered by **CesiumJS** with OpenStreetMap (OSM) building footprints and world terrain.
- **Localized Forecasting:** Uses **Linear Regression** to predict 2026 temperature floors and peaks.
- **Historical Deep-Dive:** Fetches daily Max/Min temperatures from 2010 to present.
- **Two-Eyed Seeing:** Designed to validate traditional environmental observations with orbital satellite data.

## 📐 The Math
Aetheris utilizes a Linear Regression algorithm to calculate local climate slopes ($m$):
$$ m = \frac{n(\sum xy) - (\sum x)(\sum y)}{n(\sum x^2) - (\sum x)^2} $$
This allows us to generate a data-backed prediction for the 2026 climate cycle ($y = mx + b$).

## 🛠️ Tech Stack
- **Framework:** Flask (Python)
- **3D Engine:** CesiumJS
- **Charts:** Chart.js
- **Data:** Open-Meteo Historical Archive API
- **Deployment:** Render.com

## 📖 Part of the Aetheris Suite
1. [**Hazard Monitoring**](LINK_TO_REPO_1)
2. [**Snow & Heat Forecasting**](LINK_TO_REPO_2)
3. **3D Global Explorer:** (This Repo)

## ⚖️ License
Submitted by Saanvi Boruah & Priyanuj Boruah for Climate Changemakers 2026.
