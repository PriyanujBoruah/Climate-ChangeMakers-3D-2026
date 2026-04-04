from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)

# We will use Open-Meteo API (Free, no key required) for historical data
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    # Requesting both Max and Min daily temperatures
    api_url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date=2010-01-01&end_date=2023-12-31&daily=temperature_2m_max,temperature_2m_min&timezone=GMT"
    response = requests.get(api_url)
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(debug=True)