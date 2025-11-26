import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './App.css';
import AppHeader from './Header.jsx';
import { OWM_API_KEY, BACKEND_URL, VIETNAM_LOCATIONS } from './DataConfig.js';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Footer, { FontAwesomeLoader } from './Footer.jsx';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// KHẮC PHỤC LỖI LEAFLET ICON
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const getHourlyWeatherInfo = (humidity, temp, precipitation) => { 
    let iconCode = '01d'; 
    let description = 'Trời quang';
    if (precipitation > 1.0) { iconCode = '09d'; description = 'Mưa rào/Mưa lớn'; } 
    else if (precipitation > 0.05) { iconCode = '10d'; description = 'Mưa nhẹ'; } 
    else if (humidity > 85) { iconCode = '50d'; description = 'Mù / Rất ẩm'; } 
    else if (humidity > 70) { iconCode = '04d'; description = 'Nhiều mây'; } 
    else if (humidity > 55) { iconCode = '03d'; description = 'Mây cụm'; }
    const currentHour = new Date().getHours(); 
    if (currentHour < 6 || currentHour > 18) { if (iconCode.endsWith('d')) iconCode = iconCode.replace('d', 'n'); }
    return { iconCode, description };
};

// --- CÁC COMPONENT PHỤ (WIDGETS) ---
const WidgetPlaceholder = ({ title, className = "" }) => (
    <div className={`widget ${className} loading-placeholder`}>
        <h3>{title}</h3>
    <div className="widget-content" style={{ color: '#aaa' }}>Đang tải dữ liệu...</div>
    </div>
);

function MainWeatherWidget({ dataCurrent, cityName }) {
    if (!dataCurrent) return <WidgetPlaceholder title={cityName} className="main-weather-widget" />;
    const weatherIcon = dataCurrent?.weather?.[0]?.icon || '01d';
    const weatherDescription = dataCurrent?.weather?.[0]?.description || 'Trời quang';
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const feelsLike = Math.round(dataCurrent.feels_like);

    return (
        <div className="widget main-weather-widget">
            <h3>{cityName}</h3>
            <div className="main-weather-content">
                <img src={`https://openweathermap.org/img/wn/${weatherIcon}@4x.png`} alt={weatherDescription} className="temp-icon" />
                <span className="main-temp">{Math.round(dataCurrent.temp)}°C</span>
                <span className="main-time">{formattedDate}</span>
                <span className="main-desc">{weatherDescription}</span>
                <span className="main-feels-like">Cảm giác như: {feelsLike}°C</span>
            </div>
        </div>
    );
}

function SmallStatWidget({ title, value, unit, icon, color = 'white', className = '' }) {
    const isTempRange = title.includes("Thấp/Cao");
    let displayValue;
    if (value === '--' || value === null || value === undefined) { displayValue = '--'; } 
    else if (isTempRange && typeof value === 'string') { displayValue = value; } 
    else if (typeof value === 'number') { displayValue = Math.round(value); } 
    else { displayValue = value; }

    return (
        <div className={`small-stats-item ${className}`}> 
            <div className="widget stat-widget">
                <h3 style={{ color: '#99aab5' }}>{title}</h3>
                <div className="widget-content">
                    <span className="stat-value-small" style={{ color: color }}>
                        <span className="stat-icon">{icon}</span> {displayValue}{unit}
                    </span>
                </div>
                <div className="map-overlay"></div>
            </div>
        </div>
    );
}

//Biểu đồ Nhiệt độ và Khả năng mưa----------
const LineChartWidget = ({ title, data }) => {
    // Lấy dữ liệu 12 giờ
    const aiTemps = data.predict?.temp?.slice(0, 12) || [];
    const aiHumidity = data.predict?.humidity?.slice(0, 12) || [];

    if (aiTemps.length === 0) return <WidgetPlaceholder title={title} className="line-chart-widget" />;

    const height = 150;
    const SVG_WIDTH = 630; 
    const PADDING_LEFT = 50; 
    const PADDING_RIGHT = 30;
    const PADDING_TOP = 20;    
    const PADDING_BOTTOM = 30;
    const CHART_DRAW_HEIGHT = height - PADDING_TOP - PADDING_BOTTOM;
    const CHART_DRAW_WIDTH = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const scaleYHumidity = (value) => PADDING_TOP + (100 - value) / 100 * CHART_DRAW_HEIGHT;
    const TEMP_MAX = 40; 
    const TEMP_MIN = 20; 
    const TEMP_RANGE = TEMP_MAX - TEMP_MIN;

    const scaleYTemp = (value) => PADDING_TOP + (TEMP_MAX - value) / TEMP_RANGE * CHART_DRAW_HEIGHT;
    const scaleX = (index) => PADDING_LEFT + (index / (aiTemps.length - 1)) * CHART_DRAW_WIDTH;
    const points = (values) => values.map((val, i) => `${scaleX(i)},${scaleYTemp(val)}`).join(' ');
    const hours = aiTemps.map((_, i) => new Date(data.predict?.forecast_time?.[i]).getHours());

    return (
        <div className="widget line-chart-widget line-chart-ai">
            <h3>{title}</h3>
            <div className="chart-legend-top">
                <div className="legend-item">
                    <span className="legend-line" style={{backgroundColor: '#4A90E2'}}></span>
                    Nhiệt độ
                </div>
                <div className="legend-item">
                    <span className="legend-bar" style={{backgroundColor: 'rgba(218, 108, 126, 0.5)'}}></span>
                    Độ ẩm 
                </div>
            </div>
            <div className="chart-container">
                <div className="chart-content-wrapper">
                    <svg width={SVG_WIDTH} height={height} viewBox={`0 0 ${SVG_WIDTH} ${height}`} preserveAspectRatio="none">
                        {[0, 20, 40, 60, 80, 100].map(val => ( 
                            <g key={`grid-y-${val}`}>
                                <line 
                                    x1={PADDING_LEFT} 
                                    y1={scaleYHumidity(val)} 
                                    x2={SVG_WIDTH - PADDING_RIGHT} 
                                    y2={scaleYHumidity(val)} 
                                    stroke="rgba(255, 255, 255, 0.1)" 
                                    strokeDasharray="4 4" 
                                />
                                {val !== 0 && val !== 100 && ( 
                                    <text 
                                        x={PADDING_LEFT - 30} 
                                        y={scaleYHumidity(val) + 4} 
                                        textAnchor="end" 
                                        fontSize="9" 
                                        fill="#0fdff6ff"
                                    >
                                        {val}%
                                    </text>
                                )}
                            </g>
                        ))}
                        <text 
                            x={PADDING_LEFT - 30} 
                            y={PADDING_TOP - 0} 
                            textAnchor="end" 
                            fontSize="9" 
                            fill="#0fdff6ff"
                        >
                            100%
                        </text>
                        <text 
                            x={PADDING_LEFT - 30} 
                            y={height - PADDING_BOTTOM + 4} 
                            textAnchor="end" 
                            fontSize="9" 
                            fill="#0fdff6ff"
                        >
                            0%
                        </text>
                        {hours.map((hour, i) => (
                            <g key={`grid-x-${i}`}>
                                {i !== 0 && ( 
                                    <line 
                                        x1={scaleX(i)} 
                                        y1={PADDING_TOP} 
                                        x2={scaleX(i)} 
                                        y2={height - PADDING_BOTTOM} 
                                        stroke="rgba(255, 255, 255, 0.1)" 
                                        strokeDasharray="4 4" 
                                    />
                                )}
                                <text 
                                    x={scaleX(i)} 
                                    y={height - PADDING_BOTTOM + 20} 
                                    textAnchor="middle" 
                                    fontSize="10" 
                                    fill="#b4bfc6ff"
                                >
                                    {hour}:00
                                </text>
                            </g>
                        ))}

                        {/* 1. VẼ CÁC CỘT (ĐỘ ẨM/KHẢ NĂNG MƯA) */}
                        {aiHumidity.map((humidity, i) => {
                            const barHeight = CHART_DRAW_HEIGHT - (humidity / 100) * CHART_DRAW_HEIGHT;
                            const barY = PADDING_TOP + (100 - humidity) / 100 * CHART_DRAW_HEIGHT; 
                            const barWidth = (CHART_DRAW_WIDTH / (aiTemps.length - 1)) * 0.5; 
                            return (
                                <g key={`bar-${i}`}>
                                    <rect 
                                        x={scaleX(i) - barWidth / 2} 
                                        y={barY} 
                                        width={barWidth} 
                                        height={CHART_DRAW_HEIGHT - barHeight} 
                                        fill="rgba(218, 108, 126, 0.5)" 
                                        rx="2" ry="2" 
                                    />
                                    {/* Label Độ ẩm/Khả năng mưa */}
                                    <text x={scaleX(i)} y={barY - 5} textAnchor="middle" fontSize="9" fill="#ffffffff">
                                        {Math.round(humidity)}%
                                    </text>
                                </g>
                            );
                        })}

                        {/* 2. VẼ ĐƯỜNG NHIỆT ĐỘ */}
                        <polyline fill="none" stroke="#4A90E2" strokeWidth="3" points={points(aiTemps)} />
                        
                        {/* 3. VẼ MARKERS & LABELS NHIỆT ĐỘ */}
                        {aiTemps.map((temp, i) => (
                            <g key={`point-${i}`}>
                                <circle cx={scaleX(i)} cy={scaleYTemp(temp)} r="4" fill="#4A90E2" stroke="#fff" strokeWidth="2" />
                                <text x={scaleX(i)} y={scaleYTemp(temp) - 10} textAnchor="middle" fontSize="9" fill="#ffffffff">
                                    {Math.round(temp)}°
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
        </div>
    );
};

const WindGaugeWidget = ({ windSpeed }) => {
    const maxSpeed = 15; 
    const speed = windSpeed === '--' || windSpeed === null ? 0 : parseFloat(windSpeed);
    const percentage = (speed / maxSpeed) * 100;
    const dashArray = 283; 
    const dashOffset = dashArray - (dashArray * percentage) / 100;
    const color = speed > 10 ? '#FF4D4D' : speed > 5 ? '#ffc400' : '#10B981';

    return (
        <div className="widget wind-gauge-widget small-stats-item gauge-wind">
            <h3>Đồng hồ đo Gió (m/s)</h3>
            <svg viewBox="0 0 100 100" className="wind-gauge-svg">
                <circle className="gauge-track" cx="50" cy="50" r="45"></circle>
                <circle 
                    className="gauge-progress" 
                    cx="50" cy="50" r="45"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    style={{ stroke: color }}
                ></circle>
            </svg>
            <div className="wind-value-text" style={{ color: color }}>
                {speed.toFixed(1)} m/s
            </div>
        </div>
    );
};

// BIỂU ĐỒ LƯỢNG MƯA ----------------
const PrecipChartWidget = ({ data }) => {
    const precipData = data.predict?.precipitation?.slice(0, 8) || [];
    const forecastTimes = data.predict?.forecast_time?.slice(0, 8) || [];

    if (precipData.length === 0) return <WidgetPlaceholder title="Biểu đồ Lượng mưa 8h" className="precip-chart-widget" />;

    const maxPrecip = 2.0;

    return (
        <div className="widget precip-chart-widget small-stats-item precip-chart">
            <h3>Biểu đồ Lượng mưa (mm/h)</h3>
            <div className="precip-bar-chart-container">
                <div className="chart-grid-lines">
                {[2.0, 1.5, 1.0, 0.5, 0].map(val => ( 
                        <div key={val} className="grid-line" style={{bottom: `${(val / maxPrecip) * 100}%`}}>
                            <span className="grid-label">{val.toFixed(1)}</span>
                        </div>
                    ))}
                </div>

                {precipData.map((precip, index) => (
                    <div key={index} className="precip-column-wrapper">
                        <div 
                            className="precip-bar"
                            style={{ 
                                height: `${Math.max((precip / maxPrecip) * 100, 2)}%`,
                                backgroundColor: precip > 0.5 ? '#1F75FE' : precip > 0.01 ? '#4A90E2' : 'transparent' 
                            }}
                        >
                            {precip > 0.05 && (
                                <span className="precip-value-label">
                                {precip.toFixed(1)}
                                </span>
                            )}
                        </div>
                        <span className="precip-label">
                            {new Date(forecastTimes[index]).getHours()}h
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Khai báo icon tùy chỉnh cho Leaflet
const defaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component Map GIS 
function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
        setTimeout(() => {
            map.invalidateSize();
        }, 50); 
    }, [center, zoom, map]);
    return null;
}

function GisMapWidget({ location, cityName }) {
    const MAP_ZOOM = 11;

    if (typeof location.lat !== 'number' || typeof location.lon !== 'number') {
        return <WidgetPlaceholder title="Bản đồ GIS" className="gis-map-widget" />;
    }
    const position = [location.lat, location.lon];

    return (
        <div className="widget gis-map-widget gis-map-container">
            <h3 style={{marginTop: '0'}}>Bản đồ GIS (Tương tác Leaflet)</h3>
            <div className="leaflet-map-wrapper">
                <MapContainer 
                    center={position} 
                    zoom={MAP_ZOOM} 
                    dragging={true} 
                    scrollWheelZoom={true} 
                    doubleClickZoom={true} 
                    className="leaflet-container"
                    key={location.lat + location.lon} 
                >
                    <ChangeView center={position} zoom={MAP_ZOOM} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={position} icon={defaultIcon}>
                        <Popup>
                            📍 **{cityName}** <br />
                            Tọa độ: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                        </Popup>
                    </Marker>
                </MapContainer>
            </div>
            <div style={{fontSize: '0.8em', color: '#99aab5', marginTop: '5px'}}>
                Tọa độ: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
            </div>
        </div>
    );
}

// Component đã sửa để cuộn ngang và hiển thị thẻ
function HourlyForecastWidget({ data, onShowDetails, cityName }) {
    if (!data || !data.temp || data.temp.length === 0) {
        return <WidgetPlaceholder title="Dự báo AI theo giờ" className="hourly-forecast-widget" />;
    }
    
    const hoursToDisplay = data.temp.slice(0, 24);
    const containerRef = React.useRef(null);
    const scrollLeft = () => {
        containerRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
    };
    const scrollRight = () => {
        containerRef.current?.scrollBy({ left: 150, behavior: 'smooth' });
    };

    return (
        <div className="widget hourly-forecast-widget">
            <div className="hourly-header">
                <h2>Thời tiết {cityName} theo giờ (24h)</h2>
                <button className="hourly-nav-button" onClick={onShowDetails}>Thời tiết 24h</button>
            </div>
            
            <div className="hourly-forecast-wrapper" style={{ position: 'relative' }}>
                <button className="scroll-btn left" onClick={scrollLeft} aria-label="Cuộn trái">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className="hourly-forecast-container" ref={containerRef}>
                    {hoursToDisplay.map((temp, index) => {
                        const humidity = data.humidity?.[index] ?? 70;
                        const precipitation = data.precipitation?.[index] ?? 0;
                        const forecastTime = new Date(data.forecast_time[index]);
                        const isCurrent = index === 0;
                        const timeLabel = isCurrent
                            ? "Hiện tại"
                            : forecastTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                        const { iconCode, description } = getHourlyWeatherInfo(humidity, temp, precipitation);
                        const minTemp = temp;
                        const maxTemp = temp + 5;

                        return (
                            <div key={index} className="hourly-card">
                                <span className="hourly-time">{timeLabel}</span>
                                <span className="hourly-humidity">💧 {Math.round(humidity)}%</span>
                                <div className="hourly-weather-info">
                                    <img src={`https://openweathermap.org/img/wn/${iconCode}.png`} alt={description} className="hourly-icon" />
                                    <span className="hourly-desc">{description}</span>
                                </div>
                                <div className="hourly-temps">
                                    <span className="temp-min">{minTemp.toFixed(1)}</span> / 
                                    <span className="temp-max">{maxTemp.toFixed(1)}</span> °C
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button className="scroll-btn right" onClick={scrollRight} aria-label="Cuộn phải">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/* 7 NGÀY */
const getDailyWeatherInfo = (code) => {
    let iconCode = '01d'; 
    let description = 'Trời quang';

    if (code === 0) { iconCode = '01d'; description = 'Trời quang'; }
    else if (code <= 3) { iconCode = '03d'; description = 'Mây rải rác'; }
    else if (code >= 45 && code <= 48) { iconCode = '50d'; description = 'Sương mù/Mù'; }
    else if (code >= 51 && code <= 55) { iconCode = '09d'; description = 'Mưa phùn'; }
    else if (code >= 61 && code <= 65) { iconCode = '10d'; description = 'Mưa nhẹ'; }
    else if (code >= 80 && code <= 82) { iconCode = '09d'; description = 'Mưa rào'; }
    else if (code >= 95) { iconCode = '11d'; description = 'Giông bão'; }
    
    return { iconCode, description };
};

function DailyCardForecastWidget({ data }) {
    if (!data || !data.daily || data.daily.time.length === 0) {
        return <WidgetPlaceholder title="Dự báo 7 ngày" className="daily-forecast-cards" />;
    }
    
    const dailyData = data.daily;
    const daysToDisplay = dailyData.time.slice(0, 7); 
    const today = new Date().toDateString();
    const containerRef = useRef(null);
    const scrollLeft = () => {
        containerRef.current?.scrollBy({ left: -170, behavior: 'smooth' });
    };
    const scrollRight = () => {
        containerRef.current?.scrollBy({ left: 170, behavior: 'smooth' });
    };

    return (
        <div className="widget daily-forecast-cards"> 
            <h2>Dự báo 7 ngày</h2>
            {/* Nút cuộn trái */} 
            <div className="daily-scroll-container">
                <button className="scroll-btn left" onClick={scrollLeft} aria-label="Cuộn trái">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className="daily-scroll-wrapper" ref={containerRef}>
                    <div className="daily-cards-container">
                    {daysToDisplay.map((timeISO, index) => {
                        const date = new Date(timeISO);
                        const isToday = date.toDateString() === today;
                        const maxTemp = Math.round(dailyData.temperature_2m_max[index]);
                        const minTemp = Math.round(dailyData.temperature_2m_min[index]);
                        const weatherCode = dailyData.weather_code[index];
                        const probPrecip = dailyData.precipitation_probability_max?.[index] ?? 60; 
                        const { iconCode, description } = getDailyWeatherInfo(weatherCode);

                        return (
                                <div key={timeISO} className="daily-card">
                                    <span className="daily-date">
                                        {isToday ? "Hôm nay" : date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' })}
                                    </span>
                                    <span className="daily-prob-precip">💧 {probPrecip}%</span>
                                    <div className="daily-weather-info">
                                        <img src={`https://openweathermap.org/img/wn/${iconCode}@2x.png`} alt={description} className="daily-icon" />
                                        <span className="daily-desc">{description}</span>
                                    </div>
                                    <span className="daily-temps">
                                        {minTemp.toFixed(1)}°C / {maxTemp.toFixed(1)}°C
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Nút Cuộn Phải */}
                <button className="scroll-btn right" onClick={scrollRight} aria-label="Cuộn phải">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function ProvinceModal({ isOpen, onClose, onSelect }) {
    if (!isOpen) return null; 

    const handleSelect = (province) => {
        onSelect(province); 
        onClose(); 
    };
    const VIETNAM_PROVINCES = {
        "Đông Bắc Bộ": ["Hà Giang", "Cao Bằng", "Bắc Kạn", "Tuyên Quang", "Thái Nguyên", "Lạng Sơn", "Quảng Ninh", "Bắc Giang", "Phú Thọ"],
        "Tây Bắc Bộ": ["Lào Cai", "Điện Biên", "Lai Châu", "Sơn La", "Yên Bái", "Hoà Bình"],
        "Đồng Bằng Sông Hồng": ["Hà Nội", "Vĩnh Phúc", "Bắc Ninh", "Hải Dương", "Hải Phòng", "Hưng Yên", "Thái Bình", "Hà Nam", "Nam Định", "Ninh Bình"],
        "Bắc Trung Bộ": ["Thanh Hoá", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị", "Thừa Thiên - Huế"],
        "Nam Trung Bộ": ["Đà Nẵng", "Hoàng Sa", "Quảng Nam", "Quảng Ngãi", "Bình Định", "Phú Yên", "Khánh Hoà", "Trường Sa", "Ninh Thuận", "Bình Thuận"],
        "Tây Nguyên": ["Kon Tum", "Gia Lai", "Đắk Lắk", "Đắk Nông", "Lâm Đồng"],
        "Đông Nam Bộ": ["Bình Phước", "Tây Ninh", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu", "Hồ Chí Minh"],
        "Đồng Bằng Sông Cửu Long": ["Long An", "Tiền Giang", "Bến Tre", "Trà Vinh", "Vĩnh Long", "Đồng Tháp", "An Giang", "Kiên Giang", "Cần Thơ", "Hậu Giang", "Sóc Trăng", "Bạc Liêu", "Cà Mau", "Phú Quốc"] 
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                    <div className="province-grid">
                    {Object.keys(VIETNAM_PROVINCES).map((region) => (
                        <div key={region} className="region-column">
                            <h4>{region}</h4>
                            <ul>
                                {VIETNAM_PROVINCES[region].map((province) => (
                                <li key={province} onClick={() => handleSelect(province)}>
                                {province}
                                </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    </div>
            </div>
        </div>
    );
}

// Component Màn hình Chi tiết 
function HourlyDetailScreen({ forecastData, cityName, onGoBack }) {
    if (!forecastData || !forecastData.temp || forecastData.temp.length === 0) {
        return (<div className="full-details-container widget"><button onClick={onGoBack} className="back-button">← Quay lại</button><div style={{ textAlign: 'center', color: '#ccc', padding: '50px' }}>Dữ liệu dự báo AI chưa sẵn sàng.</div></div>);
    }
    const fullHours = forecastData.forecast_time.slice(0, 24); 
    const HourlyDetailRow = ({ time, temp, desc, humidity, wind, precipitation }) => {
        const { iconCode } = getHourlyWeatherInfo(humidity, temp, precipitation); 
        const tempValue = temp?.toFixed(1) || '--';
        const windSpeedKmH = Math.round(wind * 3.6) || '--'; 
        const precipValue = precipitation?.toFixed(2) || '--'; 

        return (
        <tr className="hourly-detail-row"> 
            <td className="hour-time">{time}</td>
            <td className="temp-value">
                <img src={`https://openweathermap.org/img/wn/${iconCode}.png`} alt={desc} className="weather-icon-small" />
                {tempValue}°C
            </td>
            <td className="weather-desc">{desc}</td>
            <td className="humidity-value">{Math.round(humidity) || '--'}%</td>
            <td className="precipitation-value">{precipValue} mm/h</td> 
            <td className="wind-speed">{windSpeedKmH} km/h</td>
        </tr>
    );
};

    return (
        <div className="full-details-wrapper">
            <button onClick={onGoBack} className="back-button">← Quay lại</button>
            <h1 className="page-title">Chi tiết dự báo 24h: {cityName}</h1>
            <div className="hourly-details-container widget">
                <table className="hourly-details-table">
                    <thead>
                        <tr className="hourly-detail-header">
                            <th className="header-col time-col">Giờ</th>
                            <th className="header-col temp-col">Nhiệt độ</th> 
                            <th className="header-col desc-col">Mô tả</th>
                            <th className="header-col humidity-col">Độ ẩm</th>
                            <th className="header-col precip-col">Mưa (mm/h)</th> 
                            <th className="header-col wind-col">Gió (km/h)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fullHours.map((timeISO, index) => {
                            const temp = forecastData.temp[index];
                            const humidity = forecastData.humidity[index];
                            const wind = forecastData.wind_speed[index];
                            const precipitation = forecastData.precipitation[index]; 
                            const { description } = getHourlyWeatherInfo(humidity, temp, precipitation); 
                            return (<HourlyDetailRow key={index} time={new Date(timeISO).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })} temp={temp} desc={description} humidity={humidity} wind={wind} precipitation={precipitation} />);
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- APP CHÍNH (MAIN APP) ---
function App() {

    const [location, setLocation] = useState({ lat: 10.76, lon: 106.66 }); 
    const [cityName, setCityName] = useState("Thành phố Hồ Chí Minh");
    const [weatherData, setWeatherData] = useState({ current: null, predict: null, daily: null, });
    const [error, setError] = useState(null); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showHourlyDetails, setShowHourlyDetails] = useState(false);

    // HÀM LỌC URL TRƯỚC KHI GỌI AXIOS (TRIỆT ĐỂ)
    const normalizeApiUrl = (endpoint) => {
        const correctedBaseUrl = "https://weatherai-gis.onrender.com"; 
        return `${correctedBaseUrl}${endpoint}`;
    };

    const fetchAllData = useCallback(async () => {
        if (typeof location.lat !== 'number' || typeof location.lon !== 'number') return;
        setWeatherData({ current: null, predict: null, daily: null });
        setError(null);
        const apiParams = { lat: location.lat, lon: location.lon };
        const results = await Promise.allSettled([
            axios.get(normalizeApiUrl('/weather/current'), { params: apiParams }),
            axios.get(normalizeApiUrl('/predict'), { params: apiParams }),
            axios.get(normalizeApiUrl('/weather/daily'), { params: apiParams }),
        ]);

        setWeatherData({
            current: results[0].status === 'fulfilled' ? results[0].value.data.current : null, 
            predict: results[1].status === 'fulfilled' ? results[1].value.data : null,
            daily: results[2].status === 'fulfilled' ? results[2].value.data : null,
        });

        const firstError = results.find(res => res.status === 'rejected');
        if (firstError) { setError(firstError.reason?.response?.data?.detail || "Lỗi kết nối hoặc dữ liệu"); }
    }, [location]); 

    useEffect(() => { fetchAllData(); }, [location, fetchAllData]); 

    const normalizeString = (str) => { if (!str) return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim().replace(/\s+/g, ' '); };
    const handleSearch = async (searchQuery) => {
        setError(null); 
        const normalizedQuery = normalizeString(searchQuery);
        if (VIETNAM_LOCATIONS[normalizedQuery]) {
            const locationData = VIETNAM_LOCATIONS[normalizedQuery];
            setCityName(locationData.name);
            setLocation({ lat: locationData.lat, lon: locationData.lon });
            return; 
        }
        try {
            const geoUrl = normalizeApiUrl('/geocode');
            const response = await axios.get(geoUrl, { params: { city: searchQuery } });
            if (!response.data || !response.data.lat) { setError(`Không tìm thấy thành phố: ${searchQuery}`); } 
            else { setCityName(response.data.name); setLocation({ lat: response.data.lat, lon: response.data.lon }); }
        } catch (err) {
            const errorMessage = err.response?.data?.detail || `Lỗi khi tìm: ${searchQuery}`;
            setError(errorMessage);
        }
    };

    const todayMin = weatherData.daily?.daily?.temperature_2m_min?.[0] ?? null; 
    const todayMax = weatherData.daily?.daily?.temperature_2m_max?.[0] ?? null;
    const tempRange = (todayMin !== null && todayMax !== null) ? `${Math.round(todayMin)}°C / ${Math.round(todayMax)}°C` : '-- / --';
    const windSpeed = weatherData.current?.wind?.speed ?? '--';
    const humidity = weatherData.current?.main?.humidity ?? '--';
    const pressure = weatherData.current?.main?.pressure ?? '--';
    const visibility = weatherData.current?.visibility 
    ? (weatherData.current.visibility / 1000).toFixed(1): '--';
    const probPrecip = weatherData.current?.clouds?.all ?? '--'; 

    return (
    <div className="full-page-container">
        <FontAwesomeLoader />
        <AppHeader 
            onSearch={handleSearch} 
            onOpenModal={() => setIsModalOpen(true)}
            currentCity={cityName} 
        />

        <ProvinceModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)}
            onSelect={handleSearch} 
        />

    {showHourlyDetails ? (
    <HourlyDetailScreen 
        forecastData={weatherData.predict} 
        cityName={cityName} 
        onGoBack={() => setShowHourlyDetails(false)} 
    />
    ) : (
        <>
            <div className="main-title-bar">
                <h2>{cityName}</h2>
                {error && <div className="error-box-inline">{error}</div>}
            </div>
            <main className="main-grid">
                <div className="grid-col-left">
                    <div className="wind-stats-container">
                        <SmallStatWidget title="Gió (m/s)" value={windSpeed} unit=" m/s" icon="🌬️" color="#10B981" className="stat-wind"/>
                    </div>
                    <LineChartWidget title="Biểu đồ AI (Nhiệt/Ẩm 12h)" data={weatherData} className="line-chart-ai" />
                    <SmallStatWidget title="Bình minh" value={weatherData.current?.sunrise ? new Date(weatherData.current.sunrise * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'} unit="" icon="🌅" color="#FF8C00" className="stat-sunrise" />
                    <SmallStatWidget title="Hoàng hôn" value={weatherData.current?.sunset ? new Date(weatherData.current.sunset * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--'} unit="" icon="🌇" color="#FF8C00" className="stat-sunset"/>
                </div>
                <div className="grid-col-center">
                    <MainWeatherWidget dataCurrent={weatherData.current} cityName={cityName} />
                </div>
                <div className="grid-col-right">
                    <SmallStatWidget title="Thấp/Cao (°C)" value={tempRange} unit="" icon="🌡️" color="#ffc400" className="stat-low-high" />
                    <SmallStatWidget title="Độ ẩm (%)" value={humidity} unit="%" icon="💧" color="#4A90E2" className="stat-humidity" />
                    <SmallStatWidget title="Tầm nhìn (km)" value={visibility} unit=" km" icon="👁️" color="#cccccc" className="stat-visibility" />
                    <SmallStatWidget title="Khả năng mưa" value={probPrecip} unit="%" icon="☁️" color="#cccccc" className="stat-rain-prob" />
                    <PrecipChartWidget data={weatherData} className="precip-chart" />
                </div>

                <div className="gis-map-row">
                    <GisMapWidget location={location} cityName={cityName} />
                </div>

                <HourlyForecastWidget data={weatherData.predict} cityName={cityName} onShowDetails={() => setShowHourlyDetails(true)} className="forecast-widget-main" />

                <DailyCardForecastWidget data={weatherData.daily} />
            </main> 
        </>
        )}
        <Footer />
    </div>
    );
}

export default App;