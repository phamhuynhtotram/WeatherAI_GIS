# === GIAI ĐOẠN 3: BACKEND (FASTAPI) ===
# File: main.py

# --- 1. IMPORT CÁC THƯ VIỆN CẦN THIẾT ---
import os
import uvicorn
import httpx 
import joblib 
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from dotenv import load_dotenv 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
from starlette.concurrency import run_in_threadpool
from fastapi.routing import APIRouter

print("--- Khởi động Backend Server ---")

# Tự động tìm đường dẫn file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOTENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(DOTENV_PATH)

API_KEY = os.getenv("OPENWEATHER_API_KEY")

# Khởi tạo ứng dụng FastAPI
app = FastAPI()

# URL Frontend đã triển khai trên Render
FRONTEND_URL = "https://weather-ai-gis.onrender.com"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tự động tìm đường dẫn file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- ĐỌC FILE .ENV ---
DOTENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(DOTENV_PATH)

API_KEY = os.getenv("OPENWEATHER_API_KEY")

if not API_KEY:
    print("CẢNH BÁO: Không tìm thấy OPENWEATHER_API_KEY trong file .env")


# --- TẢI MODEL VÀ SCALER ---
BACKEND_ROOT = os.path.join(BASE_DIR, '..')
DATA_DIR = os.path.join(BACKEND_ROOT, 'data') 
MODEL_PATH = os.path.join(DATA_DIR, 'weather_model.h5')
SCALER_PATH = os.path.join(DATA_DIR, 'weather_scaler.save')

model = None
scaler = None
try:
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        raise FileNotFoundError("Thiếu file mô hình AI. Vui lòng chạy data_training_01.py trước.")

    model = load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("Tải mô hình AI và scaler thành công!")
except Exception as e:
    print(f"LỖI NGHIÊM TRỌNG: Không thể tải mô hình hoặc scaler. Lỗi: {e}")
    print(f"Đang tìm ở: {MODEL_PATH} và {SCALER_PATH}")

# Các hằng số phải khớp với lúc train AI
INPUT_STEPS = 72
OUTPUT_STEPS = 24
NUM_FEATURES = 4

# --- 3. KHỞI TẠO ỨNG DỤNG FASTAPI & ROUTER ---
app = FastAPI()
api_router = APIRouter()

origins = [
    # Môi trường Phát triển cục bộ
    "http://localhost",
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "https://weather-ai-gis.onrender.com" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)
client = httpx.AsyncClient(timeout=10.0)

# --- 4. TẠO CÁC API ENDPOINTS (Logic giữ nguyên) ---

@app.get("/")
async def root():
    return {"message": "Chào bạn! FastAPI Backend (AI + GIS) đã chạy!"}


@api_router.get("/weather/current") 
async def get_current_weather(lat: float, lon: float): 
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key của OWM chưa được cấu hình")

    api_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=vi"

    try:
        response = await client.get(api_url)
        response.raise_for_status()
        data = response.json()

        # Tái cấu trúc dữ liệu để khớp với định dạng One Call API cũ (cho Frontend)
        return_data = {
            "current": {
                "main": data['main'], # Chứa temp, feels_like, humidity
                "wind": data['wind'], # Chứa speed
                "weather": data['weather'],
                "sys": data['sys'], # Chứa sunrise/sunset
                "visibility": data.get('visibility'), # Tầm nhìn (m)
                "clouds": data.get('clouds'), # Mây che phủ (%)
                # Các trường phụ khác mà frontend cần
                "temp": data['main']['temp'],
                "feels_like": data['main']['feels_like'],
                "humidity": data['main']['humidity'],
                "wind_speed": data['wind']['speed'],
                "sunrise": data['sys']['sunrise'],
                "sunset": data['sys']['sunset'],
            }
        }
        return return_data

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="API Key OWM không hợp lệ hoặc chưa được kích hoạt.")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống (Current): {e}")


@api_router.get("/predict")
async def get_prediction(lat: float, lon: float):
    if model is None or scaler is None:
        raise HTTPException(status_code=500, detail="Mô hình AI chưa được tải, kiểm tra console backend")

    try:
        # Lấy 72 giờ dữ liệu mồi từ Open-Meteo
        priming_api_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&past_days=3&forecast_days=0"
        response = await client.get(priming_api_url)
        response.raise_for_status()
        data = response.json()

        # Xử lý dữ liệu mồi
        df_priming = pd.DataFrame(data['hourly'])
        df_priming = df_priming.rename(columns={
            "temperature_2m": "temp", "relative_humidity_2m": "humidity",
            "precipitation": "precipitation", "wind_speed_10m": "wind_speed"
        })
        df_priming_input = df_priming[['temp', 'humidity', 'precipitation', 'wind_speed']].tail(INPUT_STEPS)

        if len(df_priming_input) != INPUT_STEPS:
            raise HTTPException(status_code=500, detail=f"Không thể lấy đủ {INPUT_STEPS} giờ dữ liệu mồi")

        # Chuẩn hóa
        data_scaled = scaler.transform(df_priming_input)
        input_data = np.expand_dims(data_scaled, axis=0)

        # DỰ ĐOÁN (NON-BLOCKING)
        prediction_scaled = await run_in_threadpool(model.predict, input_data)

        # Dịch ngược kết quả
        prediction = scaler.inverse_transform(prediction_scaled.reshape(OUTPUT_STEPS, NUM_FEATURES))

        # Tạo mốc thời gian
        last_time = pd.to_datetime(df_priming['time'].iloc[-1])
        forecast_times = pd.date_range(start=last_time + pd.Timedelta(hours=1), periods=OUTPUT_STEPS, freq='h')

        result = {
            "forecast_time": [t.isoformat() for t in forecast_times],
            "temp": prediction[:, 0].tolist(),
            "humidity": prediction[:, 1].tolist(),
            "precipitation": prediction[:, 2].tolist(),
            "wind_speed": prediction[:, 3].tolist(),
        }
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server khi dự báo: {e}")

@app.get("/api/weather/daily")
async def get_daily_forecast(lat: float, lon: float):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key của OWM chưa được cấu hình")

    api_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7"
    try:
        response = await client.get(api_url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi server nội bộ")

@app.get("/api/geocode")
async def get_geocode(city: str):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="API key của OWM chưa được cấu hình")

    api_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=5&appid={API_KEY}"

    try:
        response = await client.get(api_url)
        response.raise_for_status()
        data = response.json()

        vn_results = [item for item in data if item.get('country') == 'VN'] 

        if not vn_results: 
            raise HTTPException(status_code=404, detail=f"Không tìm thấy thành phố {city} ở Việt Nam.")

        result_vn = vn_results[0]

        return {
            "name": result_vn["local_names"].get("vi", result_vn["name"]), 
            "lat": result_vn["lat"],
            "lon": result_vn["lon"],
            "country": result_vn["country"]
        }

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi server nội bộ")

app.include_router(api_router)

# --- 5. CODE ĐỂ CHẠY SERVER ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)