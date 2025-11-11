# Translation Platform - Feature Specification

## Overview
Nền tảng dịch thuật toàn diện bao gồm Web Application (Next.js 14) và Chrome Extension (Manifest V3) cho phép dịch file và nội dung web real-time sử dụng nhiều AI providers miễn phí.

---

## User Stories

### User Story 1 (P1) - File Translation

**As a** user
**I want to** upload files và tự động dịch chúng
**So that** tôi có thể dịch tài liệu lớn mà không bị giới hạn bởi token limit

**Acceptance Criteria:**
- Given user upload file 5MB, When chọn ngôn ngữ đích, Then dịch hoàn tất trong 2 phút
- Given file có 10,000 từ, When API hết quota, Then tự động chuyển API khác
- Given upload file epub, When dịch xong, Then giữ nguyên format, styles, images

**Technical Details:**
- Hỗ trợ file formats: epub, pdf, txt, docx
- Tự động phát hiện ngôn ngữ nguồn
- Chunking: 500-1000 tokens/chunk với overlap 50 tokens
- Progress tracking real-time
- Download file với format preservation

---

### User Story 2 (P2) - Web Translation (Extension)

**As a** người đọc web content
**I want to** dịch nội dung trên bất kỳ website
**So that** tôi có thể hiểu nội dung bằng ngôn ngữ của mình

**Acceptance Criteria:**
- Given đang đọc article tiếng Anh, When hover paragraph, Then hiển thị bản dịch trong 1 giây
- Given website có 50 paragraphs, When click "Translate All", Then dịch tuần tự với progress bar
- Given API error, When retry failed, Then hiển thị error message và suggest fallback

**Technical Details:**
- Chrome Extension Manifest V3
- Content scripts inject vào all domains (trừ chrome://)
- Translation modes: hover tooltip, inline, side-by-side
- Cache kết quả trong chrome.storage.local
- Batch translation với queue management

---

### User Story 3 (P3) - Multi-Provider AI Management

**As a** power user
**I want to** hệ thống tự động quản lý nhiều AI providers
**So that** tôi luôn có khả năng dịch mà không lo quota

**Acceptance Criteria:**
- Given new model released, When cron job chạy, Then model mới xuất hiện trong dropdown
- Given API key #1 hết quota, When translate request, Then tự động chuyển key #2
- Given 12 keys đều hết quota, When translate, Then hiển thị error "All quotas exhausted"

**Technical Details:**
- Auto-refresh models list hàng ngày (Vercel Cron)
- Load OpenRouter ":free" models + Qwen/DeepSeek/Kimi/GLM
- API key rotation: loop qua 10-12 keys
- Quota tracking và visualization
- Fallback chain: OpenRouter → Gemini → Mistral → Groq

---

## Functional Requirements

**FR-001**: Hệ thống PHẢI hỗ trợ 4 định dạng file: epub, pdf, txt, docx

**FR-002**: Hệ thống PHẢI chunk text thành các đoạn 500-1000 tokens

**FR-003**: Hệ thống PHẢI cache kết quả dịch (localStorage cho extension, Vercel KV cho web)

**FR-004**: Hệ thống PHẢI tự động phát hiện ngôn ngữ nguồn

**FR-005**: Extension PHẢI inject script vào tất cả domains (trừ chrome://)

**FR-006**: Hệ thống PHẢI auto-load models mới từ OpenRouter API hàng ngày

**FR-007**: Hệ thống PHẢI rotate qua 10-12 API keys khi hết quota

**FR-008**: UI PHẢI hỗ trợ dark/light mode

**FR-009**: UI PHẢI hỗ trợ 2 ngôn ngữ: Tiếng Việt và English

**FR-010**: API keys PHẢI được lưu trong Vercel environment variables

---

## Non-Functional Requirements

**NFR-001**: Performance - Dịch 10,000 từ hoàn tất trong <3 phút

**NFR-002**: Responsiveness - Extension hover event phản hồi trong <1 giây

**NFR-003**: Reliability - API success rate >95% nhờ fallback mechanism

**NFR-004**: Scalability - User có thể dịch 50,000 tokens/ngày với free tier

**NFR-005**: Availability - Zero downtime khi 1 provider bị lỗi

**NFR-006**: Security - API keys không expose ra client, CORS restrictions

**NFR-007**: Accessibility - WCAG 2.1 Level AA compliance

**NFR-008**: Mobile - Responsive design từ 320px trở lên

---

## Success Criteria

**SC-001**: Dịch file 10,000 từ hoàn tất trong <3 phút

**SC-002**: Extension phản hồi hover event trong <1 giây

**SC-003**: Tỷ lệ thành công API calls >95% (nhờ fallback)

**SC-004**: User có thể dịch 50,000 tokens/ngày với free tier

**SC-005**: Zero downtime khi 1 provider bị lỗi

**SC-006**: Dark/light mode toggle mượt mà không lag

**SC-007**: i18n switching không có missing translations

**SC-008**: Extension install rate >100 users trong tháng đầu

---

## Key Entities

### Translation Job
```typescript
{
  id: string;
  sourceFile: File;
  targetLang: string;
  sourceLang?: string; // auto-detected
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunks: TranslationChunk[];
  progress: number; // 0-100
  provider: string;
  model: string;
  createdAt: Date;
  completedAt?: Date;
}
```

### API Provider
```typescript
{
  name: string;
  models: Model[];
  apiKeys: string[];
  currentKeyIndex: number;
  quotaUsed: number;
  quotaLimit: number;
  lastRefreshed: Date;
}
```

### Translation Cache
```typescript
{
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  model: string;
  timestamp: Date;
  ttl: number; // 7 days
}
```

### User Preferences
```typescript
{
  theme: 'light' | 'dark' | 'system';
  language: 'vi' | 'en';
  defaultProvider: string;
  defaultModel: string;
  translationMode: 'tooltip' | 'inline' | 'side-by-side';
}
```

---

## Out of Scope (v1.0)

- ❌ User authentication/accounts
- ❌ Payment/premium tiers
- ❌ Translation history persistence (beyond cache)
- ❌ Collaborative translation
- ❌ Custom glossaries/terminology
- ❌ OCR for images
- ❌ Video subtitle translation
- ❌ Mobile apps (iOS/Android)

---

## Future Enhancements (v2.0)

- 🔮 User accounts với unlimited history
- 🔮 API usage analytics dashboard
- 🔮 Custom fine-tuned models
- 🔮 Team collaboration features
- 🔮 Browser extension cho Firefox, Edge, Safari
- 🔮 Desktop app (Electron)
- 🔮 Webhook integrations
- 🔮 REST API cho developers

---

## Glossary

**Chunking**: Phân chia văn bản lớn thành các đoạn nhỏ để tránh token limit

**Token**: Đơn vị văn bản nhỏ nhất mà AI model xử lý (~0.75 word)

**Quota**: Giới hạn số request hoặc tokens mà API provider cho phép

**Fallback**: Cơ chế tự động chuyển sang phương án dự phòng khi gặp lỗi

**Content Script**: JavaScript chạy trong context của web page

**Service Worker**: Background script trong Chrome Extension V3

**i18n**: Internationalization - hỗ trợ đa ngôn ngữ

**TTL**: Time To Live - thời gian cache tồn tại trước khi hết hạn
