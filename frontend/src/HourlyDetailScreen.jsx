// File: HourlyDetailScreen.jsx  (Trang chi tiết)

import React from 'react';

// --- HÀM LOGIC VÀ HÀNG CHI TIẾT ---

// Hàm Logic: Gán Icon và Mô tả dựa trên Độ ẩm VÀ Lượng mưa
const getHourlyWeatherInfo = (humidity, temp, precipitation) => { 
    let iconCode = '01d'; 
    let description = 'Trời quang';

    // Quy tắc 1 (Ưu tiên): Dựa vào Lượng mưa (precipitation)
    if (precipitation > 1.0) { iconCode = '09d'; description = 'Mưa rào/Mưa lớn'; } 
    else if (precipitation > 0.05) { iconCode = '10d'; description = 'Mưa nhẹ'; }
    // Quy tắc 2 (Thứ cấp): Dựa vào Độ ẩm (chỉ áp dụng nếu không có mưa)
    else if (humidity > 85) { iconCode = '50d'; description = 'Mù / Rất ẩm'; } 
    else if (humidity > 70) { iconCode = '04d'; description = 'Nhiều mây'; } 
    else if (humidity > 55) { iconCode = '03d'; description = 'Mây cụm'; }

    // Logic ngày/đêm
    const currentHour = new Date().getHours(); 
    if (currentHour < 6 || currentHour > 18) { if (iconCode.endsWith('d')) iconCode = iconCode.replace('d', 'n'); }
    return { iconCode, description };
};
export { getHourlyWeatherInfo }; 

// Component tạo ra một hàng chi tiết trong bảng (6 cột)
export const HourlyDetailRow = ({ time, temp, desc, humidity, wind, precipitation }) => {
    const { iconCode } = getHourlyWeatherInfo(humidity, temp, precipitation); 
    const tempValue = temp?.toFixed(1) || '--';
    const windSpeedKmH = Math.round(wind * 3.6) || '--'; 

    return (
        <li className="hourly-detail-row"> 
            <span className="hour-time">{time}</span>

            {/* Cột 2: Nhiệt độ + Icon */}
            <span className="temp-value">
                <img 
                    src={`https://openweathermap.org/img/wn/${iconCode}.png`} 
                    alt={desc} 
                    className="weather-icon-small"
                    style={{width: '24px', height: '24px', marginRight: '5px', verticalAlign: 'middle'}}
                />
                {tempValue}°C
            </span>

            {/* Cột 3: Mô tả */}
            <span className="weather-desc">{desc}</span>

            {/* Cột 4: Độ ẩm */}
            <span className="humidity-value">{Math.round(humidity) || '--'}%</span>
            
            {/* Cột 5: Lượng mưa */}
            <span className="precipitation-value">{precipitation?.toFixed(2) || '--'} mm/h</span> 

            {/* Cột 6: Tốc độ gió */}
            <span className="wind-speed">{windSpeedKmH} km/h</span>
        </li>
    );
};

// Component Màn hình Chi tiết (EXPORT DEFAULT)
export default function HourlyDetailScreen({ forecastData, cityName, onGoBack }) {
    const data = forecastData; 

    if (!data || !data.temp || data.temp.length === 0) { 
        return (
            <div className="full-details-container widget">
                <button onClick={onGoBack} className="back-button">← Quay lại Dashboard</button>
                <div style={{ textAlign: 'center', color: '#ccc', padding: '50px' }}>Dữ liệu dự báo AI chưa sẵn sàng.</div>
            </div>
        );
    }

    const fullHours = data.forecast_time.slice(0, 24); 

    return (
        <div className="full-details-container widget">
            <button onClick={onGoBack} className="back-button">← Quay lại</button>

            <h1 className="page-title">Chi tiết dự báo 24h: {cityName}</h1>

            <ul className="hourly-details-list">
                {/* HEADER 6 CỘT */}
                <li className="hourly-detail-header">
                    <span className="header-col time-col">Giờ</span>
                    <span className="header-col temp-col">Nhiệt độ (°C)</span> 
                    <span className="header-col desc-col">Mô tả</span>
                    <span className="header-col humidity-col">Độ ẩm (%)</span>
                    <span className="header-col precip-col">Mưa (mm/h)</span> 
                    <span className="header-col wind-col">Gió (km/h)</span>
                </li>

                {fullHours.map((timeISO, index) => {
                    const temp = data.temp[index];
                    const humidity = data.humidity[index];
                    const wind = data.wind_speed[index];
                    const precipitation = data.precipitation[index]; 

                    const { description } = getHourlyWeatherInfo(humidity, temp, precipitation); 

                    return (
                        <HourlyDetailRow 
                            key={index}
                            time={new Date(timeISO).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                            temp={temp} 
                            desc={description}
                            humidity={humidity}
                            wind={wind}
                            precipitation={precipitation} 
                        />
                    );
                })}
            </ul>
        </div>
    );
}