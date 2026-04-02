# Báo Cáo Tổng Quan Dự Án - AI Translation Platform

> **Ngày tạo:** 2026-04-02
> **Nhánh hiện tại:** `claude/translation-platform-setup-011CV1WzhyEsboaayPTmcVnM`
> **Trạng thái Git:** Clean (không có thay đổi chưa commit)

---

## 1. Hiện Trạng Tổng Quan

### Mục Đích Dự Án

Nền tảng dịch thuật AI miễn phí, gồm 3 thành phần chính:

| Thành phần | Mô tả | Trạng thái |
|------------|--------|------------|
| **Web App** (Next.js 14) | Dịch file EPUB, PDF, DOCX, TXT | Production-ready |
| **Chrome Extension** (WXT + React 19) | Dịch trang web, phụ đề video, đọc ePub/PDF | Production-ready |
| **Cloudflare Worker Proxy** | Proxy API với cache và rate limiting cho extension | Production-ready |
| **Chrome Extension cũ** (Webpack) | Phiên bản legacy, đang deprecated | Ngừng phát triển |

### Tech Stack

#### Web App

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | React 19 + TailwindCSS 4 |
| State Management | Zustand 5 |
| Đa ngôn ngữ (i18n) | next-intl (Tiếng Anh + Tiếng Việt) |
| Cache | Upstash Redis (TTL 7 ngày) |
| Rate Limiting | @upstash/ratelimit (10 req/phút/IP) |
| File Parsers | epub, pdf-parse, mammoth (DOCX), TXT native |
| Deploy | Vercel |

#### Chrome Extension (WXT)

| Thành phần | Công nghệ |
|------------|-----------|
| Build Tool | WXT 0.20 (Manifest V3) |
| UI | React 19 + TailwindCSS 4 |
| Local Cache | IndexedDB (idb) - TTL 30 ngày |
| PDF | pdfjs-dist 5.5 (lazy-loaded, ~2MB) |
| ePub | JSZip 3.10 |
| AI Providers | Gemini API, GLM (z.ai), Cloudflare Proxy |
| Bundle size | ~2.01 MB |

#### Cloudflare Worker Proxy

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Cloudflare Workers |
| Cache | Cloudflare KV (TTL 30 ngày) |
| Rate Limiting | In-memory (60 req/phút/IP) |
| Build | Wrangler 4 |

### Cấu Trúc Thư Mục Chính

```
AI-Translation-Platform/
├── web-app/                    # Web app Next.js 14
│   ├── app/                    # App Router (routes, API)
│   │   ├── [locale]/           # Routes đa ngôn ngữ (en, vi)
│   │   └── api/                # API endpoints
│   ├── components/             # 10+ React components
│   ├── lib/                    # Core logic (parsers, providers, cache)
│   ├── store/                  # Zustand stores
│   └── messages/               # File dịch i18n (en.json, vi.json)
│
├── extension/                  # Chrome Extension mới (WXT)
│   ├── entrypoints/            # Popup, sidepanel, background, content scripts
│   ├── lib/                    # Providers, parsers, storage, translators
│   ├── proxy-server/           # Cloudflare Worker proxy
│   └── styles/                 # CSS hiển thị song ngữ
│
├── chrome-extension/           # Extension cũ (DEPRECATED)
├── plans/                      # Kế hoạch phát triển (7 phases, tất cả complete)
├── .specify/                   # Spec-kit requirements
├── README.md                   # Hướng dẫn chung
├── SETUP_GUIDE.md              # Hướng dẫn cài đặt local
└── DEPLOYMENT.md               # Hướng dẫn deploy production
```

---

## 2. Các Tính Năng/Module Đã Hoàn Thiện

### Web App - Dịch File

- [x] Upload và dịch file EPUB, PDF, DOCX, TXT
- [x] Tự động phát hiện ngôn ngữ nguồn
- [x] Smart chunking (chia đoạn thông minh, 800 tokens, không cắt giữa câu)
- [x] Theo dõi tiến trình dịch real-time
- [x] Tải file đã dịch (định dạng TXT)
- [x] Giới hạn: 50MB (EPUB/PDF), 10MB (DOCX/TXT)

### Web App - Quản Lý AI Provider

- [x] Tích hợp OpenRouter (provider chính, hoạt động đầy đủ)
- [x] Xoay vòng API key (hỗ trợ 10-12 keys/provider)
- [x] Tự động fallback khi hết quota
- [x] Chọn provider thủ công
- [x] Cron job refresh danh sách model hàng ngày

### Web App - Cache & Performance

- [x] Redis cache qua Upstash (TTL 7 ngày)
- [x] Rate limiting 10 req/phút/IP
- [x] Cache key theo cặp ngôn ngữ + provider
- [x] UI quản lý cache (nút xóa cache)

### Web App - Giao Diện

- [x] Dark/Light/System theme
- [x] Responsive trên mobile
- [x] Đa ngôn ngữ UI (Tiếng Anh + Tiếng Việt)
- [x] Settings panel, hiển thị quota, fallback chain
- [x] Toast notifications, loading states, error boundaries

### Chrome Extension - Dịch Trang Web

- [x] Dịch theo đoạn văn (paragraph-level)
- [x] Batch translation (debounce 600ms, tối đa 20 đoạn/lần)
- [x] 3 chế độ hiển thị: bên dưới, hover, song song (side-by-side)
- [x] MutationObserver cho SPA/dynamic content
- [x] IntersectionObserver chỉ dịch nội dung trong viewport
- [x] Context menu "Translate selection"

### Chrome Extension - Phụ Đề Video

- [x] Hỗ trợ YouTube, Coursera, Udemy, HTML5 video
- [x] Parser SRT/VTT với timestamp
- [x] Hiển thị phụ đề kép (gốc + dịch)
- [x] Hỗ trợ fullscreen
- [x] Đồng bộ với playback

### Chrome Extension - Đọc ePub

- [x] Trích xuất chapter qua JSZip
- [x] Side Panel UI với tab navigation
- [x] Mục lục (TOC) sidebar
- [x] 3 chế độ hiển thị (xếp chồng/song song/chỉ bản dịch)
- [x] Lưu tiến trình đọc
- [x] Tuỳ chỉnh font size + theme

### Chrome Extension - Đọc PDF

- [x] PDF.js lazy-loaded (tiết kiệm 2MB khi không dùng)
- [x] Trích xuất text và dịch overlay
- [x] Navigation trang + zoom
- [x] Cache theo trang

### Chrome Extension - Hạ Tầng

- [x] Fallback chain: Proxy → Gemini → GLM
- [x] IndexedDB cache local (30 ngày)
- [x] Settings sync qua chrome.storage
- [x] i18n cho UI extension (EN/VI)

### Cloudflare Worker Proxy

- [x] `POST /api/translate` - Dịch đơn lẻ
- [x] `POST /api/translate/batch` - Dịch hàng loạt (tối đa 50 texts)
- [x] `GET /api/providers` - Liệt kê providers
- [x] KV cache (30 ngày), rate limiting (60 req/phút/IP)
- [x] CORS headers, provider fallback (Gemini → GLM)

---

## 3. Các Tính Năng/Module Chưa Hoàn Thiện Hoặc Còn Lỗi

### Mức Độ Cao (Ảnh hưởng trải nghiệm người dùng)

| # | Vấn đề | Vị trí | Chi tiết |
|---|--------|--------|----------|
| 1 | **README.md lỗi thời** | `/README.md` | Ghi "Chrome Extension: Coming Soon" nhưng extension đã hoàn thiện. Ghi "AI Provider Management: In Progress" nhưng đã xong. Không đề cập extension WXT mới. |
| 2 | **Thư mục `chrome-extension/` cũ vẫn tồn tại** | `/chrome-extension/` | Extension cũ (Webpack) chưa bị xóa dù đã có extension mới (WXT) tại `/extension/`. Gây nhầm lẫn cho developer mới. |
| 3 | **Web App chỉ xuất TXT** | `web-app/` | File dịch xong chỉ download được dạng .txt. Chưa hỗ trợ giữ nguyên format gốc (EPUB, DOCX). |

### Mức Độ Trung Bình (Tính năng chưa hoàn thiện)

| # | Vấn đề | Vị trí | Chi tiết |
|---|--------|--------|----------|
| 4 | **Web App chưa tích hợp Gemini/Mistral/Groq trực tiếp** | `web-app/lib/providers/` | UI có sẵn selector nhưng code backend chỉ kết nối OpenRouter. Có comment TODO trong code. |
| 5 | **Thiếu thư mục `docs/`** | `/docs/` | Không có docs chuẩn cho project (code standards, architecture, etc.). Tài liệu nằm rải rác ở README, SETUP_GUIDE, DEPLOYMENT. |
| 6 | **Chưa có hệ thống test** | Toàn project | Không tìm thấy test files (unit test, integration test, e2e). Không có test scripts trong package.json. |

### Mức Độ Thấp (Nice-to-have)

| # | Vấn đề | Vị trí | Chi tiết |
|---|--------|--------|----------|
| 7 | Chưa có authentication/user accounts | Toàn project | Ai cũng truy cập được, không tracking usage per user |
| 8 | Chưa lưu lịch sử dịch | Toàn project | Dịch xong là mất, không có history |
| 9 | Chưa hỗ trợ custom glossary | Toàn project | Không tuỳ chỉnh thuật ngữ chuyên ngành |
| 10 | Chỉ hỗ trợ EN↔VI, ZH↔VI | Toàn project | Chưa mở rộng thêm cặp ngôn ngữ khác |
| 11 | Chưa có OCR cho PDF scan | Toàn project | PDF dạng ảnh (scanned) không extract được text |

---

## 4. Các Bước Cần Xử Lý Tiếp Theo

### Ưu Tiên CAO - Phải làm trước khi deploy/publish

#### Action 1: Cập nhật README.md
- **File:** `/README.md`
- **Việc cần làm:**
  - Cập nhật trạng thái Chrome Extension từ "Coming Soon" → "Completed"
  - Thêm mô tả extension WXT mới (`/extension/`)
  - Thêm mô tả Cloudflare Worker Proxy (`/extension/proxy-server/`)
  - Cập nhật project structure cho đúng thực tế
  - Đánh dấu `chrome-extension/` là deprecated
- **Ai làm:** Developer bất kỳ
- **Thời gian ước tính:** 30 phút

#### Action 2: Dọn dẹp code legacy
- **File:** `/chrome-extension/` (toàn bộ thư mục)
- **Việc cần làm:**
  - Quyết định: xóa hẳn hoặc archive vào branch riêng
  - Nếu xóa: `rm -rf chrome-extension/` rồi commit
  - Nếu giữ: thêm `DEPRECATED.md` vào thư mục
- **Lý do:** Gây nhầm lẫn, tăng kích thước repo không cần thiết
- **Ai làm:** Developer chính / repo owner

#### Action 3: Thiết lập test cơ bản
- **Việc cần làm:**
  - Cài Vitest cho web-app: `cd web-app && npm i -D vitest`
  - Viết unit tests cho core logic: `text-chunker.ts`, `api-key-rotator.ts`, file parsers
  - Cài Vitest cho extension: `cd extension && npm i -D vitest`
  - Viết tests cho: provider registry, parsers, storage
  - Thêm script `"test"` vào `package.json`
- **Lý do:** Không có test = không phát hiện regression khi sửa code
- **Ai làm:** Developer

### Ưu Tiên TRUNG BÌNH - Nên làm để cải thiện chất lượng

#### Action 4: Tổ chức documentation
- **Việc cần làm:**
  - Tạo `/docs/` với cấu trúc chuẩn:
    - `project-overview-pdr.md` - Tổng quan dự án
    - `system-architecture.md` - Kiến trúc hệ thống
    - `code-standards.md` - Quy chuẩn code
    - `deployment-guide.md` - Hợp nhất từ DEPLOYMENT.md + SETUP_GUIDE.md
  - Di chuyển nội dung từ SETUP_GUIDE.md, DEPLOYMENT.md vào docs/
- **Ai làm:** Developer / docs manager

#### Action 5: Tích hợp Gemini/Mistral/Groq cho Web App
- **Việc cần làm:**
  - Tạo provider client cho Gemini, Mistral, Groq trong `web-app/lib/providers/`
  - Wire vào API route `/api/translate`
  - Test fallback chain giữa các providers
- **Lý do:** UI đã có selector nhưng chỉ OpenRouter hoạt động — gây confuse cho user
- **Ai làm:** Backend developer

#### Action 6: Hỗ trợ xuất file giữ format gốc
- **Việc cần làm:**
  - Web app hiện chỉ xuất .txt
  - Thêm xuất EPUB (dùng epub-gen hoặc tương tự)
  - Thêm xuất DOCX (dùng docx library)
- **Lý do:** Người dùng upload EPUB muốn nhận lại EPUB, không phải TXT
- **Ai làm:** Full-stack developer

### Ưu Tiên THẤP - Tính năng mở rộng tương lai

#### Action 7: Thêm authentication & lịch sử dịch
- Cho phép user đăng ký/đăng nhập
- Lưu lịch sử dịch theo user
- Quota management per user

#### Action 8: Mở rộng ngôn ngữ
- Thêm cặp ngôn ngữ: ZH↔EN, FR↔VI, JA↔VI, KO↔VI
- UI cho phép chọn ngôn ngữ linh hoạt

#### Action 9: OCR cho PDF scan
- Tích hợp Tesseract.js hoặc Google Vision API
- Xử lý PDF dạng ảnh (scanned documents)

#### Action 10: Custom glossary
- Cho phép user upload bảng thuật ngữ chuyên ngành
- Inject vào prompt dịch để đảm bảo nhất quán

---

## Tóm Tắt Nhanh

```
Tổng quan:    3 thành phần chính, tất cả production-ready
Tech stack:   Next.js 14 + WXT + Cloudflare Workers + TypeScript
Hoàn thiện:   ~90% tính năng core
Cần làm gấp:  Cập nhật README + Dọn code legacy + Thêm tests
Cần cải thiện: Docs + Thêm providers + Xuất file giữ format
Tương lai:    Auth + Thêm ngôn ngữ + OCR + Glossary
```
