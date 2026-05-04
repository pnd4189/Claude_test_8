# Hướng dẫn cài đặt FreeLLMAPI trên MiniPC

> Cập nhật: 2026-05-04 | Dành cho người mới | Chi tiết từng bước

## FreeLLMAPI là gì?

FreeLLMAPI là một **proxy tự host** (chạy trên máy của bạn) giúp gom 11 nhà cung cấp AI miễn phí thành một API duy nhất. Bạn chỉ cần **một API key** để dùng tất cả.

**Lợi ích:**
- ~1 tỷ tokens AI miễn phí mỗi tháng
- Tự động chọn provider tốt nhất
- Chạy trên miniPC của bạn, không cần server đắt tiền
- Truy cập từ xa qua Cloudflare Tunnel (miễn phí)

## Yêu cầu trước khi bắt đầu

| Yêu cầu | Chi tiết |
|---------|----------|
| MiniPC/Linux | Đã cài Ubuntu/Debian, có terminal |
| Node.js 20+ | Chạy `node -v` để kiểm tra. Nếu chưa có: `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| Git | `sudo apt install git` |
| Internet | MiniPC cần có kết nối mạng ổn định |
| Tài khoản Cloudflare | Miễn phí, dùng để tạo tunnel truy cập từ xa |

---

## Bước 1: Tải FreeLLMAPI về máy

Mở terminal trên miniPC, chạy từng lệnh:

```bash
# Vào thư mục home
cd ~

# Tải mã nguồn FreeLLMAPI
git clone https://github.com/tashfeenahmed/freellmapi.git

# Vào thư mục dự án
cd freellmapi

# Cài đặt các thư viện cần thiết
npm install
```

**Nếu `npm install` bị lỗi:**
- Kiểm tra Node.js版本: `node -v` (phải >= 20)
- Xóa thử lại: `rm -rf node_modules && npm install`

---

## Bước 2: Cấu hình biến môi trường

```bash
# Copy file mẫu
cp .env.example .env

# Tạo mã khóa mã hóa (encryption key)
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

File `.env` sẽ chứa cấu hình của FreeLLMAPI. Bạn **không cần chỉnh sửa gì thêm** ở bước này.

---

## Bước 3: Build và test chạy thử

```bash
# Build dự án
npm run build

# Chạy thử
node server/dist/index.js
```

Nếu thấy output kiểu `Server running on port 3001` là **thành công**.

**Kiểm tra bằng lệnh khác (mở terminal mới):**

```bash
curl http://localhost:3001/v1/models
```

Nếu trả về danh sách models dạng JSON → FreeLLMAPI đang chạy tốt.

**Dừng server**: Nhấn `Ctrl+C` ở terminal đang chạy.

---

## Bước 4: Thêm API keys cho các provider miễn phí

FreeLLMAPI cần API keys của các provider miễn phí để hoạt động. Bạn cần đăng ký và thêm key cho các provider sau:

### 4.1 Chuẩn bị API keys

Đăng ký tài khoản miễn phí và lấy API key tại:

| Provider | Link đăng ký | Ghi chú |
|----------|-------------|---------|
| Google Gemini | https://aistudio.google.com/apikey | Free tier generous |
| Groq | https://console.groq.com/keys | Free, rất nhanh |
| OpenRouter | https://openrouter.ai/keys | Có nhiều model miễn phí |
| Cerebras | https://cloud.cerebras.ai/ | Free, tốc độ cực nhanh |
| Mistral | https://console.mistral.ai/ | ~1 tỷ tokens/tháng free |

### 4.2 Thêm keys vào FreeLLMAPI

1. Khởi động FreeLLMAPI: `node server/dist/index.js`
2. Mở trình duyệt trên miniPC: **http://localhost:3001**
3. Sẽ thấy Dashboard của FreeLLMAPI
4. Vào mục **Providers** → Thêm từng API key
5. Sau khi thêm xong, vào mục **Keys** → Tạo một **Unified Key** (key tổng)
6. **Copy key này lại** (dạng `freellmapi-xxxx...`) — đây là key duy nhất dùng cho cả 3 tích hợp

> **Lưu ý:** Bạn không cần thêm tất cả 5 provider. Thêm ít nhất 2-3 cái là đủ dùng. Gemini + Groq là combo tốt nhất.

---

## Bước 5: Cài đặt Cloudflare Tunnel

Tunnel giúp bạn truy cập FreeLLMAPI từ bên ngoài (từ điện thoại, laptop, Vercel...) mà không cần mở port hay IP công khai.

### 5.1 Cài cloudflared

```bash
# Tải cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb

# Cài đặt
sudo dpkg -i cloudflared.deb
```

### 5.2 Đăng nhập Cloudflare (chỉ lần đầu)

```bash
cloudflared tunnel login
```

Trình duyệt sẽ mở → Đăng nhập Cloudflare → Chọn domain của bạn.

> **Nếu chưa có domain Cloudflare:** Bạn có thể dùng **Quick Tunnel** miễn phí (không cần domain). Xem mục [Quick Tunnel](#quick-tunnel---không-cần-domain) ở cuối.

### 5.3 Tạo tunnel

```bash
# Tạo tunnel tên "freellmapi"
cloudflared tunnel create freellmapi
```

Lưu lại **tunnel ID** từ output (dạng `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### 5.4 Cấu hình tunnel

```bash
# Tạo file cấu hình
cat > ~/.cloudflared/config.yml << EOF
tunnel: THAY_TUNNEL_ID_VAO_DAY
credentials-file: /home/dung/.cloudflared/THAY_TUNNEL_ID_VAO_DAY.json

ingress:
  - hostname: freellmapi.YOUR-DOMAIN.com
    service: http://localhost:3001
  - service: http_status:404
EOF
```

**Thay thế:**
- `THAY_TUNNEL_ID_VAO_DAY` → tunnel ID từ bước 5.3
- `freellmapi.YOUR-DOMAIN.com` → subdomain bạn muốn dùng (VD: `freellmapi.example.com`)

### 5.5 Tạo DNS record

```bash
cloudflared tunnel route dns freellmapi freellmapi.YOUR-DOMAIN.com
```

### 5.6 Test tunnel

```bash
cloudflared tunnel run freellmapi
```

Mở trình duyệt trên máy khác, truy cập: `https://freellmapi.YOUR-DOMAIN.com/v1/models`

Nếu thấy JSON → Tunnel hoạt động. Nhấn `Ctrl+C` để dừng.

---

## Bước 6: Cấu hình tự khởi động (systemd)

Để FreeLLMAPI và tunnel tự chạy khi miniPC khởi động lại.

### 6.1 Tạo service cho FreeLLMAPI

```bash
sudo tee /etc/systemd/system/freellmapi.service > /dev/null << 'EOF'
[Unit]
Description=FreeLLMAPI Proxy
After=network.target

[Service]
Type=simple
User=dung
WorkingDirectory=/home/dung/freellmapi
ExecStart=/usr/bin/node server/dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF
```

> **Quan trọng:** Thay `dung` bằng username thực tế của bạn nếu khác. Kiểm tra bằng lệnh `whoami`.

### 6.2 Tạo service cho Cloudflare Tunnel

```bash
sudo tee /etc/systemd/system/cloudflared-freellmapi.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel for FreeLLMAPI
After=network.target freellmapi.service

[Service]
Type=simple
User=dung
ExecStart=/usr/local/bin/cloudflared tunnel run freellmapi
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### 6.3 Kích hoạt và khởi động

```bash
# Reload systemd
sudo systemctl daemon-reload

# Cho phép tự khởi động cùng máy
sudo systemctl enable freellmapi cloudflared-freellmapi

# Khởi động ngay
sudo systemctl start freellmapi cloudflared-freellmapi
```

### 6.4 Kiểm tra trạng thái

```bash
# Kiểm tra FreeLLMAPI
sudo systemctl status freellmapi

# Kiểm tra Tunnel
sudo systemctl status cloudflared-freellmapi
```

Cả hai phải hiện **active (running)**.

---

## Bước 7: Ghi lại thông tin cấu hình

Sau khi hoàn tất, ghi lại 2 giá trị này — bạn sẽ cần cho bước tích hợp:

| Biến | Giá trị | Ví dụ |
|------|---------|-------|
| `FREELLMAPI_URL` | URL tunnel của bạn | `https://freellmapi.example.com` |
| `FREELLMAPI_KEY` | Unified key từ dashboard | `freellmapi-abc123...` |

---

## Quick Tunnel — Không cần domain

Nếu bạn chưa có domain Cloudflare, dùng Quick Tunnel (miễn phí, nhanh):

```bash
cloudflared tunnel --url http://localhost:3001
```

Output sẽ hiện URL kiểu: `https://xxx-yyy-zzz.trycloudflare.com`

**Hạn chế:** URL thay đổi mỗi lần restart. Chỉ dùng để test, không dùng cho production.

---

## Các lệnh hữu ích

| Lệnh | Mục đích |
|------|----------|
| `sudo systemctl start freellmapi` | Khởi động FreeLLMAPI |
| `sudo systemctl stop freellmapi` | Dừng FreeLLMAPI |
| `sudo systemctl restart freellmapi` | Khởi động lại |
| `sudo systemctl status freellmapi` | Xem trạng thái |
| `sudo journalctl -u freellmapi -f` | Xem log real-time |
| `curl http://localhost:3001/v1/models` | Test local |
| `curl https://freellmapi.YOUR-DOMAIN.com/v1/models` | Test qua tunnel |

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|------------|----------|
| `npm install` lỗi better-sqlite3 | Node.js < 20 | Cài Node.js 20+: `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| Service không start | Sai WorkingDirectory | Kiểm tra `WorkingDirectory` trong file service trỏ đúng thư mục |
| Tunnel không kết nối | Sai tunnel ID hoặc DNS | Chạy lại `cloudflared tunnel route dns` |
| `curl localhost:3001` không phản hồi | FreeLLMAPI chưa chạy | `sudo systemctl start freellmapi` |
| `EADDRINUSE: port 3001` | Port bị chiếm | `lsof -i :3001` để xem process nào chiếm, rồi kill |
| Không truy cập được từ ngoài | Tunnel chưa chạy | `sudo systemctl status cloudflared-freellmapi` |

---

## Tổng quan kiến trúc

```
MiniPC của bạn
├── FreeLLMAPI (port 3001) ← gom 11 provider miễn phí
└── cloudflared tunnel ← tạo HTTPS URL public
        │
        ▼
https://freellmapi.YOUR-DOMAIN.com ← URL public
        │
        ├── Web App (Vercel) → gọi FreeLLMAPI trước, fallback 5 provider khác
        ├── Extension (BYOK) → gọi FreeLLMAPI trước, fallback 5 provider khác
        └── CF Worker Proxy → gọi FreeLLMAPI trước, fallback 5 provider khác

Khi miniPC tắt → tự động dùng 5 provider còn lại (Gemini, Groq, GLM, Qwen, OpenRouter)
Khi miniPC bật lại → tự động quay về dùng FreeLLMAPI
```

## Tiếp theo

Sau khi hoàn thành hướng dẫn này, quay lại thực hiện Phase 5 (Test Fallback Behavior) trong plan FreeLLMAPI Integration.
