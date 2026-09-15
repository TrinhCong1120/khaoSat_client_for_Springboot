# API Dashboard Admin — `GET /survey/dashboard`

Tài liệu đầy đủ cho backend. Frontend đọc JSON theo **camelCase** (chuẩn ASP.NET Core `System.Text.Json` với `PropertyNamingPolicy = CamelCase`).

---

## 1. Yêu cầu HTTP

| Mục | Giá trị |
|-----|---------|
| **Method** | `GET` |
| **URL** | `{BASE}/survey/dashboard` |
| **BASE** | Cùng origin với các API hiện tại (ví dụ `http://localhost:5000`). Qua Next.js rewrite: client gọi `NEXT_PUBLIC_API_URL` + `/survey/dashboard`. |
| **Header** | `Authorization: Bearer <access_token>` (bắt buộc, giống `GET /survey`) |
| **Content-Type response** | `application/json; charset=utf-8` |

**HTTP status:**

- `200` — thành công, body là object JSON như mục 3.
- `401` — hết hạn / không có token.
- `403` — không đủ quyền.
- `404` / `500` — frontend hiển thị lỗi (nên trả message trong body nếu có).

---

## 2. Cấu trúc object gốc (`DashboardApiResponse`)

| Thuộc tính | Kiểu | Bắt buộc logic | Mô tả |
|------------|------|----------------|--------|
| `kpis` | object | Có (nếu thiếu, frontend coi như toàn 0) | Bốn ô KPI trên cùng. |
| `activityLast7Days` | array | Có (có thể `[]`) | Thống kê theo ngày cho biểu đồ vùng (7 cột). Nên **7 phần tử**; ít hơn UI vẫn chạy (tự pad). |
| `statusDistribution` | array | Có (có thể `[]`) | Phân bổ số lượng khảo sát theo trạng thái (donut). Thứ tự phần tử = thứ tự màu trên chart. |
| `topSurveysByCompletion` | array | Có (có thể `[]`) | Top khảo sát theo % hoàn thành + số phản hồi. |

---

## 3. Object `kpis` (`DashboardKpis`)

| Thuộc tính | Kiểu | Bắt buộc | Mô tả |
|------------|------|----------|--------|
| `openSurveys` | number | Khuyến nghị | Số khảo sát đang **mở / đang thu thập** (theo định nghĩa DB của bạn). |
| `openSurveysTrendDelta` | number \| null | Không | Chênh lệch so với **kỳ trước cùng độ dài** (ví dụ +2 khảo sát). Âm = giảm. `null` = không tính / không áp dụng → UI hiển thị "—". |
| `responsesLast30Days` | number | Khuyến nghị | Tổng số **lượt gửi phản hồi** trong 30 ngày gần nhất. |
| `responsesTrendPercent` | number \| null | Không | % thay đổi so với kỳ trước (ví dụ `18` = +18%). `null` → "—". |
| `averageCompletionRatePercent` | number | Khuyếc nghị | Tỷ lệ hoàn thành trung bình toàn hệ thống, **0–100**. |
| `completionTrendDeltaPercent` | number \| null | Không | Chênh **điểm phần trăm** so với kỳ trước (ví dụ +4). `null` → "—". |
| `satisfactionScore` | number \| null | Không | Điểm hài lòng (ví dụ thang 5 sao: `4.6`). Không có dữ liệu → `null` → ô KPI hiển thị "—". |
| `satisfactionTrendDelta` | number \| null | Không | Chênh điểm so với kỳ trước. `null` nếu không có `satisfactionScore`. |

---

## 4. Phần tử `activityLast7Days[]` (`DashboardActivityDay`)

| Thuộc tính | Kiểu | Mô tả |
|------------|------|--------|
| `label` | string | Nhãn trục X: `T2`…`CN`, hoặc `01/04`, ISO date ngắn, v.v. |
| `responses` | number | Số phản hồi **mới** trong ngày đó (hoặc metric bạn chọn — nhất quán là được). |
| `views` | number | Số **lượt xem** form khảo sát (nếu không tracking được thì gửi `0`). |

**Gợi ý:** 7 phần tử theo **7 ngày liên tiếp**, ngày cũ → mới hoặc ngược lại (frontend chỉ hiển thị đúng thứ tự mảng).

---

## 5. Phần tử `statusDistribution[]` (`DashboardStatusSlice`)

| Thuộc tính | Kiểu | Mô tả |
|------------|------|--------|
| `label` | string | Nhãn hiển thị (ví dụ `Đang mở`, `Đã đóng`, `Bản nháp`). |
| `count` | number | Số khảo sát thuộc trạng thái đó (≥ 0). |

Tổng `count` có thể khác tổng khảo sát nếu bạn chỉ đếm một subset — UI chỉ vẽ biểu đồ theo số liệu bạn gửi.

---

## 6. Phần tử `topSurveysByCompletion[]` (`DashboardTopSurvey`)

| Thuộc tính | Kiểu | Mô tả |
|------------|------|--------|
| `title` | string | Tiêu đề khảo sát (hiển thị trên chart + list). |
| `completionPercent` | number | Tỷ lệ hoàn thành **0–100** (frontend clamp trong khoảng này). |
| `responseCount` | number | Số phản hồi đã thu được (để hiển thị kèm). |

---

## 7. JSON mẫu — đầy đủ field (dữ liệu giả minh họa)

```json
{
  "kpis": {
    "openSurveys": 12,
    "openSurveysTrendDelta": 2,
    "responsesLast30Days": 1284,
    "responsesTrendPercent": 18,
    "averageCompletionRatePercent": 76,
    "completionTrendDeltaPercent": 4,
    "satisfactionScore": 4.6,
    "satisfactionTrendDelta": 0.2
  },
  "activityLast7Days": [
    { "label": "T2", "responses": 42, "views": 120 },
    { "label": "T3", "responses": 55, "views": 132 },
    { "label": "T4", "responses": 48, "views": 118 },
    { "label": "T5", "responses": 61, "views": 145 },
    { "label": "T6", "responses": 73, "views": 160 },
    { "label": "T7", "responses": 68, "views": 151 },
    { "label": "CN", "responses": 89, "views": 178 }
  ],
  "statusDistribution": [
    { "label": "Đang mở", "count": 12 },
    { "label": "Đã đóng", "count": 9 },
    { "label": "Bản nháp", "count": 5 },
    { "label": "Lên lịch", "count": 2 }
  ],
  "topSurveysByCompletion": [
    {
      "title": "Khảo sát nhân sự Q1",
      "completionPercent": 92,
      "responseCount": 428
    },
    {
      "title": "Đánh giá sản phẩm mới",
      "completionPercent": 78,
      "responseCount": 312
    },
    {
      "title": "Hậu mãi & hỗ trợ",
      "completionPercent": 65,
      "responseCount": 241
    },
    {
      "title": "Onboarding khách hàng",
      "completionPercent": 54,
      "responseCount": 198
    }
  ]
}
```

---

## 8. JSON mẫu — tối thiểu (backend mới triển khai dần)

```json
{
  "kpis": {
    "openSurveys": 0,
    "responsesLast30Days": 0,
    "averageCompletionRatePercent": 0
  },
  "activityLast7Days": [],
  "statusDistribution": [],
  "topSurveysByCompletion": []
}
```

Các field optional trong `kpis` có thể bỏ hết; frontend normalize thành `0` hoặc `null` tùy field (xem code `normalizeDashboard` trong `client/src/lib/dashboard.ts`).

---

## 9. Ghi chú triển khai

- Tên field phải khớp **đúng chữ** (camelCase): `openSurveys`, không phải `open_surveys`.
- Số thực / số nguyên đều được; frontend ép `Number(...)`.
- File TypeScript nguồn sự thật: `client/src/lib/dashboard.ts` (`DashboardApiResponse`).
