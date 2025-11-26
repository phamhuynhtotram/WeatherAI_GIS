# === GIAI ĐOẠN 2: PHÂN TÍCH VÀ HUẤN LUYỆN AI ===
# Đọc dữ liệu, làm sạch, huấn luyện mô hình LSTM

# --- 1. IMPORT CÁC THƯ VIỆN CẦN THIẾT ---
import pandas as pd  
import matplotlib.pyplot as plt 
from sklearn.preprocessing import MinMaxScaler 
import numpy as np 
import joblib  
import tensorflow as tf
from tensorflow.keras.models import Sequential 
from tensorflow.keras.layers import LSTM, Dense, Input, Dropout 
import os # Xử lý đường dẫn

# --- 2. TỰ ĐỘNG TÌM ĐƯỜNG DẪN (ĐÃ CẢI TIẾN LÙI LẠI MỘT CẤP) ---
# Giả định file này nằm trong thư mục con (scripts). Cần lùi lại một cấp (..) để vào thư mục data.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Đi lùi một cấp (..) từ scripts/ để về thư mục gốc, rồi vào thư mục data
DATA_DIR = os.path.join(BASE_DIR, '..', 'data') 

file_path = os.path.join(DATA_DIR, 'weather_history.csv')
scaler_filename = os.path.join(DATA_DIR, 'weather_scaler.save')
model_path = os.path.join(DATA_DIR, 'weather_model.h5')

# --- KIỂM TRA ĐƯỜNG DẪN TRƯỚC KHI CHẠY ---
if not os.path.exists(DATA_DIR):
     print(f"LỖI: Thư mục 'data' không tồn tại tại đường dẫn: {DATA_DIR}. Vui lòng tạo thư mục này.")
     raise FileNotFoundError(f"Thư mục không tồn tại: {DATA_DIR}")
elif not os.path.exists(file_path):
     print(f"LỖI: File 'weather_history.csv' không tồn tại tại đường dẫn: {file_path}. Vui lòng tải dữ liệu vào đây.")
     raise FileNotFoundError(f"File không tồn tại: {file_path}")
else:
     print("Kiểm tra đường dẫn OK. Bắt đầu xử lý...")

# --- 3. ĐỌC VÀ LÀM SẠCH DỮ LIỆU ---
print("Đang đọc và làm sạch dữ liệu...")
df = pd.read_csv(file_path, skiprows=3)

new_columns = ['time', 'temp', 'humidity', 'precipitation', 'wind_speed']
df.columns = new_columns
df['time'] = pd.to_datetime(df['time'])
df = df.set_index('time')
print("Đọc và làm sạch dữ liệu thành công!")

# --- 4. TRỰC QUAN HÓA ---
print("Đang vẽ biểu đồ phân tích nhiệt độ...")
plt.figure(figsize=(15, 7))  
df['temp'].plot()  
plt.title('Biểu đồPhân tích Nhiệt độ (5 năm 2020-2024)', fontsize=16)
plt.ylabel('Nhiệt độ (°C)')
plt.xlabel('Thời gian')
plt.grid(True)  
plt.show()  

# --- 5. CHUẨN BỊ DỮ LIỆU CHO AI ---
print("\n--- CHUẨN BỊ DỮ LIỆU CHO AI ---")

# 5.1. Chuẩn hóa (Scaling)
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(df)

# 5.2. Tạo Cửa sổ trượt (Sliding Window)
INPUT_STEPS = 72    # Số giờ dùng làm Input
OUTPUT_STEPS = 24  # Số giờ dùng làm Output (dự đoán)

X_data = [] 
y_data = [] 

for i in range(len(data_scaled) - INPUT_STEPS - OUTPUT_STEPS + 1):
     X_data.append(data_scaled[i : i + INPUT_STEPS])
     y_data.append(data_scaled[i + INPUT_STEPS : i + INPUT_STEPS + OUTPUT_STEPS])

X_data = np.array(X_data)
y_data = np.array(y_data)
print("Kích thước dữ liệu Input (X):", X_data.shape)
print("Kích thước dữ liệu Output (y):", y_data.shape)

# --- 6. XÂY DỰNG VÀ HUẤN LUYỆN MÔ HÌNH AI ---
print("\n--- XÂY DỰNG VÀ HUẤN LUYỆN AI ---")

# 6.1. Lưu Scaler
joblib.dump(scaler, scaler_filename)
print("Đã lưu scaler thành công!")

# 6.2. Chia dữ liệu Train / Validation
test_size = int(len(X_data) * 0.2) 
X_train, X_val = X_data[:-test_size], X_data[-test_size:]
y_train, y_val = y_data[:-test_size], y_data[-test_size:]

INPUT_SHAPE = X_train.shape[1:] 
OUTPUT_SHAPE = y_train.shape[1] 
NUM_FEATURES = y_train.shape[2] 

# 6.3. Xây dựng kiến trúc mô hình LSTM (Kiến trúc cải tiến)
model = Sequential()
model.add(Input(shape=INPUT_SHAPE))
model.add(LSTM(units=128, return_sequences=True)) 
model.add(Dropout(0.2)) 
model.add(LSTM(units=64, return_sequences=False))
model.add(Dropout(0.2)) 
model.add(Dense(units=OUTPUT_SHAPE * NUM_FEATURES))
model.add(tf.keras.layers.Reshape((OUTPUT_SHAPE, NUM_FEATURES)))

# 6.4. Compile và Huấn luyện
model.compile(optimizer='adam', loss='mean_squared_error')
model.summary()

# Early Stopping để tự dừng khi học xong
early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss', 
    patience=5,
    restore_best_weights=True
)

history = model.fit(
     X_train, y_train,    
     epochs=50,  
     batch_size=32,  
     validation_data=(X_val, y_val),
    callbacks=[early_stopping]
)
print("ĐÃ HUẤN LUYỆN XONG!")

# 6.5. Lưu mô hình (bộ não AI)
model.save(model_path)
print(f"Đã lưu mô hình AI thành công tại: {model_path}")

# 6.6. Vẽ biểu đồ Loss
plt.figure(figsize=(10, 6))
plt.plot(history.history['loss'], label='Training Loss')    
plt.plot(history.history['val_loss'], label='Validation Loss') 
plt.title('Biểu đồ Loss của Mô hình')
plt.xlabel('Epochs')
plt.ylabel('Loss (MSE)')
plt.legend()
plt.show() 

print("\n=== HOÀN TẤT GIAI ĐOẠN 2 ===")