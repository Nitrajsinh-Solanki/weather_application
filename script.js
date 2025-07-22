const API_KEY = '774fb6081dee0b15b6194b5cf5330e17';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

let currentUnit = 'celsius';
let currentHourlyView = 12;

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const celsiusBtn = document.getElementById('celsius-btn');
const fahrenheitBtn = document.getElementById('fahrenheit-btn');
const hours12Btn = document.getElementById('hours-12');
const hours24Btn = document.getElementById('hours-24');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const weatherMain = document.getElementById('weather-main');
const suggestions = document.getElementById('suggestions');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
searchInput.addEventListener('input', handleSearchInput);
locationBtn.addEventListener('click', getCurrentLocation);
celsiusBtn.addEventListener('click', () => toggleUnit('celsius'));
fahrenheitBtn.addEventListener('click', () => toggleUnit('fahrenheit'));
hours12Btn.addEventListener('click', () => toggleHourlyView(12));
hours24Btn.addEventListener('click', () => toggleHourlyView(24));

// Initialize app
init();

function init() {
    getCurrentLocation();
}

function handleSearch() {
    const query = searchInput.value.trim();
    if (query) {
        getWeatherByCity(query);
        hideSuggestions();
    }
}

function handleSearchInput() {
    const query = searchInput.value.trim();
    if (query.length > 2) {
        showSuggestions(query);
    } else {
        hideSuggestions();
    }
}

function showSuggestions(query) {
    // Simple mock suggestions - in real app, use geocoding API
    const mockSuggestions = [
        `${query}, US`,
        `${query}, UK`,
        `${query}, CA`
    ];
    
    suggestions.innerHTML = mockSuggestions
        .map(item => `<div class="suggestion-item" onclick="selectSuggestion('${item}')">${item}</div>`)
        .join('');
    suggestions.style.display = 'block';
}

function hideSuggestions() {
    suggestions.style.display = 'none';
}

function selectSuggestion(city) {
    searchInput.value = city;
    hideSuggestions();
    getWeatherByCity(city);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            () => {
                hideLoading();
                showError('Unable to get your location. Please search for a city.');
            }
        );
    } else {
        showError('Geolocation is not supported by this browser.');
    }
}

function getWeatherByCity(city) {
    showLoading();
    const url = `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('City not found');
            return response.json();
        })
        .then(data => {
            const { lat, lon } = data.coord;
            getWeatherByCoords(lat, lon);
        })
        .catch(error => {
            hideLoading();
            showError('City not found. Please try again.');
        });
}

function getWeatherByCoords(lat, lon) {
    const currentWeatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    
    Promise.all([
        fetch(currentWeatherUrl).then(res => res.json()),
        fetch(forecastUrl).then(res => res.json())
    ])
    .then(([currentData, forecastData]) => {
        hideLoading();
        hideError();
        displayCurrentWeather(currentData);
        displayHourlyForecast(forecastData);
        displayDailyForecast(forecastData);
        showWeatherMain();
    })
    .catch(error => {
        hideLoading();
        showError('Failed to fetch weather data. Please try again.');
    });
}

function displayCurrentWeather(data) {
    const temp = convertTemp(data.main.temp);
    const feelsLike = convertTemp(data.main.feels_like);
    
    document.getElementById('location-name').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('current-date-time').textContent = formatDateTime(new Date());
    document.getElementById('current-temp').textContent = `${Math.round(temp)}°`;
    document.getElementById('weather-condition').textContent = data.weather[0].main;
    document.getElementById('weather-description').textContent = data.weather[0].description;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${data.wind.speed} m/s`;
    document.getElementById('wind-direction').textContent = getWindDirection(data.wind.deg);
    document.getElementById('feels-like').textContent = `${Math.round(feelsLike)}°`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
}

function displayHourlyForecast(data) {
    const container = document.getElementById('hourly-container');
    const hours = data.list.slice(0, currentHourlyView);
    
    container.innerHTML = hours.map(item => {
        const temp = convertTemp(item.main.temp);
        const time = new Date(item.dt * 1000);
        
        return `
            <div class="hourly-item">
                <div class="hourly-time">${formatTime(time)}</div>
                <div class="hourly-icon">
                    <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="Weather">
                </div>
                <div class="hourly-temp">${Math.round(temp)}°</div>
                <div class="hourly-desc">${item.weather[0].main}</div>
            </div>
        `;
    }).join('');
}

function displayDailyForecast(data) {
    const container = document.getElementById('daily-container');
    const dailyData = getDailyForecast(data.list);
    
    container.innerHTML = dailyData.map(day => {
        const highTemp = convertTemp(day.temp.max);
        const lowTemp = convertTemp(day.temp.min);
        
        return `
            <div class="daily-item">
                <div class="daily-day">${formatDay(day.date)}</div>
                <div class="daily-icon">
                    <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="Weather">
                </div>
                <div class="daily-desc">${day.description}</div>
                <div class="daily-temps">
                    <span class="daily-high">${Math.round(highTemp)}°</span>
                    <span class="daily-low">${Math.round(lowTemp)}°</span>
                </div>
            </div>
        `;
    }).join('');
}

function getDailyForecast(list) {
    const daily = {};
    
    list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toDateString();
        
        if (!daily[day]) {
            daily[day] = {
                date: date,
                temp: { min: item.main.temp, max: item.main.temp },
                icon: item.weather[0].icon,
                description: item.weather[0].main
            };
        } else {
            daily[day].temp.min = Math.min(daily[day].temp.min, item.main.temp);
            daily[day].temp.max = Math.max(daily[day].temp.max, item.main.temp);
        }
    });
    
    return Object.values(daily).slice(0, 5);
}

function toggleUnit(unit) {
    currentUnit = unit;
    
    celsiusBtn.classList.toggle('active', unit === 'celsius');
    fahrenheitBtn.classList.toggle('active', unit === 'fahrenheit');
    
    // Refresh display with new units
    if (!weatherMain.classList.contains('hidden')) {
        const location = document.getElementById('location-name').textContent;
        const city = location.split(',')[0];
        getWeatherByCity(city);
    }
}

function toggleHourlyView(hours) {
    currentHourlyView = hours;
    
    hours12Btn.classList.toggle('active', hours === 12);
    hours24Btn.classList.toggle('active', hours === 24);
    
    // Refresh hourly display
    if (!weatherMain.classList.contains('hidden')) {
        const location = document.getElementById('location-name').textContent;
        const city = location.split(',')[0];
        getWeatherByCity(city);
    }
}

function convertTemp(temp) {
    return currentUnit === 'fahrenheit' ? (temp * 9/5) + 32 : temp;
}

function getWindDirection(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
}

function formatDateTime(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatDay(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function showLoading() {
    loading.classList.remove('hidden');
    weatherMain.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    document.getElementById('error-text').textContent = message;
    errorMessage.classList.remove('hidden');
    weatherMain.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function showWeatherMain() {
    weatherMain.classList.remove('hidden');
}
