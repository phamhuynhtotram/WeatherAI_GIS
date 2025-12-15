# 🚀 Weather AI + GIS
Dự án phát triển một ứng dụng web để phân tích và dự báo thời tiết tại Việt Nam.
**Công nghệ chính:** Backend FastAPI (Python/LSTM AI) và Frontend React/Vite (GIS/Leaflet).

## 🌟 Giới Thiệu Chung
Ứng dụng kết hợp dữ liệu thời tiết thực tế từ OpenWeatherMap và các API miễn phí khác, cùng với mô hình học sâu LSTM được huấn luyện để cung cấp dự báo 24 giờ chính xác. Giao diện trực quan sử dụng bản đồ Leaflet để hiển thị vị trí và dữ liệu thời tiết.

## 📦 Yêu Cầu Môi Trường
Trước khi bắt đầu, đảm bảo máy tính đã cài đặt các phần mềm sau:
* **Python:** Phiên bản 3.9+ (Để chạy Backend và huấn luyện AI).
* **Node.js:** Phiên bản >= 18.x (Để chạy Frontend).
* **Git**.

  ```bash
  # Kiểm tra phiên bản
  node -v
  npm -v
  git --version  

## 📁 Cấu Trúc Thư Mục (tham khảo)
WeatherAI_GIS/
├── backend/            
│   ├── .env           
│   └── main.py         
├── data/               
│   ├── weather_history.csv 
│   ├── weather_model.h5  
│   └── weather_scaler.save 
├── frontend/          
│   ├── package.json   
│   └── src/           
├── scripts/            
│   └── data_training_01.py 
└── requirements.txt    

## ⚙️ Hướng Dẫn Cài Đặt (Setup)
### 1. Backend (Python/FastAPI)
1. Tạo và kích hoạt môi trường ảo (khuyến nghị):
   ```bash
    python -m venv venv  # Tạo môi trường ảo
    .\venv\Scripts\activate  # Kích hoạt môi trường

2. Cài đặt các thư viện Python:
   ```bash
   python -m pip install pandas matplotlib scikit-learn numpy tensorflow joblib fastapi uvicorn python-dotenv httpx starlette 

3. Cấu hình API Key (Nếu chưa có):
  Đảm bảo file backend/.env đã có key OpenWeatherMap.
  Key này là bắt buộc để truy cập các API thời tiết và Geocoding.
  * backend/.env : OPENWEATHER_API_KEY=5847b5e134ec403837dec63690809a97

4. Huấn luyện/Kiểm tra Mô hình AI: Nếu chưa có file data/weather_model.h5 và data/weather_scaler.save, cần chạy script huấn luyện.
    ```bash
    python scripts/data_training_01.py
    ✅ Thành công: Script sẽ tự động tạo và lưu mô hình, scaler vào thư mục data/.

### 2. Frontend (React/Vite)
1. Di chuyển vào thư mục Frontend:
   ```bash
   cd frontend
3. Cài đặt thư viện Node.js:
   ```bash
   npm install
⏳ Chờ npm cài xong node_modules.

## 🏃 Hướng Dẫn Chạy Dự Án
### BƯỚC 1: Chạy Backend
Backend phải được khởi động trước để Frontend có thể lấy dữ liệu AI và thời tiết.
1. Di chuyển vào thư mục Backend:
   ```bash
   cd backend
2. Khởi động Server:
   ```bash
   py -m pip install fastapi uvicorn
   py -m uvicorn main:app --reload
✅ Thành công khi thấy: Server khởi động trên cổng 8000 và thông báo tải mô hình AI thành công.

### BƯỚC 2: Chạy Frontend
1. Di chuyển vào thư mục Frontend:
    ```bash
    cd frontend
2. Khởi động Client:
   ```bash
   npm run dev
✅ Thành công khi thấy: Local: http://localhost:5173/
💡 Mở trình duyệt truy cập: http://localhost:5173

## 📝 API Endpoints
Backend cung cấp các API sau:
* /: Chào mừng.
* /weather/current?lat={lat}&lon={lon}: Lấy dữ liệu thời tiết hiện tại.
* /predict?lat={lat}&lon={lon}: Dự báo 24 giờ bằng mô hình AI (LSTM).
* /weather/daily?lat={lat}&lon={lon}: Dự báo 7 ngày.
* /geocode?city={city}: Tìm tọa độ từ tên thành phố.
