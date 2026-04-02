# Brainstorm Report: Chrome Extension AI Provider Strategy

**Date:** 2026-04-02 | **Status:** Agreed

---

## Problem Statement

Chrome Extension cần chiến lược AI API hợp lý để:
1. Dịch 50-100+ trang/ngày cho power users
2. Hỗ trợ cả user miễn phí (BYOK) lẫn user trả phí (built-in)
3. Chất lượng dịch EN→VI, ZH→VI tốt nhất có thể
4. Chi phí vận hành thấp nhất

## Key Research Findings

### Free Tier Đánh Giá

| Provider | Free/ngày | Chất lượng VI | Ổn định? | Kết luận |
|----------|-----------|---------------|----------|----------|
| Groq 8B | ~100 trang | ⭐⭐⭐⭐ | ✅ Cao | Best free option |
| Gemini Flash-Lite | ~62 trang | ⭐⭐⭐⭐⭐ | ⚠️ Quota giảm | Backup |
| GLM-4.7-Flash | ~200 trang | ⭐⭐⭐⭐ | ❌ Limit thay đổi | Không tin cậy |
| Mistral | Không rõ | ⭐⭐⭐ | ❌ | Loại |

**Kết luận:** Free tier đơn lẻ KHÔNG đủ cho 50-100+ trang/ngày ổn định. Cần kết hợp hoặc dùng paid.

### Paid Tier Chi Phí (100 trang/ngày)

| Provider | Model | $/tháng | Chất lượng VI |
|----------|-------|---------|---------------|
| **Qwen-Flash** | qwen-flash | **$1.47** | ⭐⭐⭐⭐⭐ Best |
| Gemini Flash | gemini-2.5-flash | $1.05 | ⭐⭐⭐⭐⭐ |
| Groq (OpenRouter) | llama-3.3-70b | $1.50 | ⭐⭐⭐⭐ |

**Kết luận:** Qwen-Flash là tối ưu nhất — rẻ nhất + chất lượng Vietnamese tốt nhất.

## Agreed Solution: Hybrid Provider Architecture

### Kiến trúc

```
Extension
├── FREE TIER (BYOK - User tự nhập API key)
│   ├── Gemini (direct call) ← đã có
│   ├── GLM (direct call) ← đã có  
│   ├── Groq (direct call) ← CẦN THÊM
│   └── Qwen (direct call) ← CẦN THÊM (optional BYOK)
│
├── PAID TIER (Built-in qua CF Worker Proxy)
│   ├── Qwen-Flash (primary) ← CẦN THÊM vào Proxy
│   ├── Gemini Flash (backup) ← đã có trong Proxy
│   └── GLM (emergency) ← đã có trong Proxy
│
├── SMART FALLBACK
│   └── Paid Proxy → Free BYOK → Cache → Error
│
└── CACHE (IndexedDB, 30 ngày)
    └── Giảm 40-60% API calls
```

### 3 Tiers Cho User

| Tier | Provider | Giới hạn | Chi phí user | Chi phí bạn |
|------|----------|----------|-------------|-------------|
| Free BYOK | Gemini/Groq/GLM/Qwen (user key) | Tùy provider | $0 | $0 |
| Free Built-in | Qwen qua Proxy | 20 trang/ngày | $0 | ~$0.01/user/ngày |
| Paid Built-in | Qwen + Gemini qua Proxy | Unlimited | ~$1.99/tháng | ~$0.049/100 trang |

### Monetization Recommendation

Freemium subscription (Phase sau):
- Free: 20 trang/ngày qua Proxy
- Paid: $1.99/tháng unlimited
- BYOK: luôn free, không giới hạn

## Implementation Plan (Đã thống nhất thứ tự)

### Phase 1: Thêm Providers (Ưu tiên CAO)

**1a. Thêm Groq Provider vào Extension (BYOK)**
- Tạo `extension/lib/providers/groq-provider.ts` (~40 LOC)
- Groq API compatible OpenAI format → code tương tự GLM provider
- Model: `llama-3.3-70b-versatile` hoặc `llama-3.1-8b-instant`
- Thêm `groq` vào `ExtensionSettings.apiKeys` và provider registry

**1b. Thêm Qwen Provider vào CF Worker Proxy**
- Tạo `extension/proxy-server/src/providers/qwen.ts` (~50 LOC)
- Endpoint: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`
- Model: `qwen-flash` (OpenAI-compatible format)
- Thêm `QWEN_API_KEY` vào wrangler secrets
- Set Qwen làm primary provider trong proxy fallback

**1c. Thêm Qwen BYOK vào Extension (optional)**
- Tạo `extension/lib/providers/qwen-provider.ts` (~40 LOC)
- Cho user tự nhập Qwen API key nếu muốn

**1d. Update UI Settings**
- Thêm Groq, Qwen vào provider selector trong Popup
- Thêm input fields cho Groq API key, Qwen API key
- Mode selector: "Free (BYOK)" vs "Built-in (Proxy)"

### Phase 2: Quota & Tracking (Ưu tiên TRUNG BÌNH)
- Quota tracking trên CF KV (IP-based hoặc device fingerprint)
- 20 trang/ngày free built-in
- UI hiển thị quota còn lại

### Phase 3: Payment (Ưu tiên THẤP - Phase sau)
- Stripe hoặc Polar integration
- License key validation trên Proxy
- Paid tier unlimited

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Qwen API downtime | Proxy ngừng hoạt động | Fallback sang Gemini → GLM |
| Google giảm free quota tiếp | BYOK user bị giới hạn | Groq làm default free, Gemini backup |
| Abuse free built-in tier | Chi phí tăng | Rate limit + quota 20 trang/ngày + IP tracking |
| Qwen pricing thay đổi | Chi phí tăng | Monitor + switch sang Gemini Flash nếu cần |

## Success Criteria

- [ ] Groq BYOK hoạt động trong extension
- [ ] Qwen-Flash hoạt động qua CF Proxy
- [ ] Fallback chain: Proxy → BYOK → Cache → Error
- [ ] Settings UI cho phép chọn mode + nhập API keys
- [ ] Dịch được 100 trang/ngày ổn định (kết hợp free + paid)
- [ ] Chất lượng EN→VI ≥ Gemini Flash hiện tại

## Next Steps

1. Tạo implementation plan chi tiết (Phase 1a-1d)
2. Implement Groq + Qwen providers
3. Test chất lượng dịch Vietnamese so sánh giữa providers
4. Update Proxy server với Qwen primary
5. Update Extension UI

---

**Unresolved Questions:**
1. Qwen international endpoint có ổn định cho Vietnam region không? Cần test latency.
2. Benchmark chất lượng dịch Vietnamese giữa Qwen vs Gemini chưa có — cần test thực tế 100 bài.
3. Free built-in 20 trang/ngày — tracking bằng IP hay device fingerprint? IP dễ bypass.
