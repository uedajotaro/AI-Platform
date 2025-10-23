# AIMatch Campus - API使用例

## 目次

1. [認証フロー](#認証フロー)
2. [講師関連](#講師関連)
3. [主催者関連](#主催者関連)
4. [イベント関連](#イベント関連)
5. [受講者関連](#受講者関連)
6. [管理者関連](#管理者関連)

---

## 認証フロー

### 1. 新規ユーザー登録 (Email OTP)

```bash
# Step 1: OTPコード送信
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@example.com"
  }'

# レスポンス例:
# {
#   "message": "OTP sent to email",
#   "dev_otp": "123456",
#   "email": "instructor@example.com"
# }

# Step 2: OTP検証 + アカウント作成
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@example.com",
    "code": "123456",
    "name": "鈴木花子",
    "role": "instructor"
  }'

# レスポンス例:
# {
#   "token": "abc123...",
#   "user": {
#     "id": 1,
#     "email": "instructor@example.com",
#     "name": "鈴木花子",
#     "role": "instructor",
#     "avatar_url": null
#   }
# }
```

### 2. 既存ユーザーログイン

```bash
# Step 1: OTPコード送信 (同じエンドポイント)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@example.com"}'

# Step 2: OTP検証のみ (name, roleは不要)
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@example.com",
    "code": "123456"
  }'
```

### 3. ログアウト

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 現在のユーザー情報取得

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 講師関連

### 1. 講師プロフィール作成

```bash
curl -X POST http://localhost:3000/api/instructors \
  -H "Authorization: Bearer INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "headline": "n8nで現場自動化の実装まで伴走",
    "bio": "10年以上のIT経験を活かし、企業のAI活用を支援しています。特にワークフロー自動化とカスタマーサポート分野が得意です。",
    "skills": ["prompting", "workflow", "llm", "rag"],
    "industries": ["healthcare", "hr", "retail"],
    "tools": ["n8n", "openai", "claude", "gas"],
    "rate_type": "per_session",
    "rate_min": 60000,
    "rate_max": 150000,
    "availability_json": {
      "mon": [9, 18],
      "tue": [9, 18],
      "wed": [9, 18],
      "thu": [9, 18],
      "fri": [9, 18]
    }
  }'
```

### 2. 講師一覧取得

```bash
# すべての講師
curl http://localhost:3000/api/instructors

# 認証済み講師のみ
curl "http://localhost:3000/api/instructors?verified=true"
```

### 3. 講師詳細取得

```bash
curl http://localhost:3000/api/instructors/1
```

### 4. 募集への応募

```bash
curl -X POST http://localhost:3000/api/instructors/1/apply \
  -H "Authorization: Bearer INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": 1,
    "cover_letter": "貴社の募集内容を拝見し、私の経験が活かせると感じ応募いたしました。過去に類似案件で5件以上の実績があります。"
  }'
```

### 5. 推薦募集一覧取得

```bash
curl http://localhost:3000/api/instructors/1/recommended-jobs \
  -H "Authorization: Bearer INSTRUCTOR_TOKEN"
```

---

## 主催者関連

### 1. 組織作成

```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "株式会社サンプル研修",
    "tax_id": "T1234567890123",
    "invoice_number": "INV-2025-001",
    "billing_email": "billing@example.com"
  }'
```

### 2. 自組織情報取得

```bash
curl http://localhost:3000/api/organizations/me \
  -H "Authorization: Bearer ORG_TOKEN"
```

### 3. 講師募集作成

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "カスタマーサポート向け生成AI研修講師募集",
    "description": "小売業向けのカスタマーサポート部門に対し、生成AIを活用したFAQ要約と返信草案作成の研修を実施いただける講師を募集します。\n\n【対象】\n・カスタマーサポート担当者 20名\n・AI初心者が中心\n\n【実施内容】\n・基礎講義 (2時間)\n・ハンズオン (3時間)\n・Q&A (1時間)\n\n【納品物】\n・研修資料\n・運用マニュアル\n・評価シート",
    "deliverables": [
      "研修資料 (スライド)",
      "運用マニュアル (PDF)",
      "評価シート (Excel)",
      "ハンズオン用サンプルデータ"
    ],
    "date_range": {
      "start": "2025-11-20",
      "end": "2025-12-10"
    },
    "onsite": false,
    "budget_min": 120000,
    "budget_max": 250000,
    "theme_tags": ["customer-support-automation", "prompt-engineering"],
    "tool_tags": ["openai", "n8n"],
    "industry_tags": ["retail"]
  }'
```

### 4. 募集一覧取得

```bash
# すべての募集
curl http://localhost:3000/api/jobs

# オープン中のみ
curl "http://localhost:3000/api/jobs?status=open"
```

### 5. 応募者一覧取得

```bash
curl http://localhost:3000/api/jobs/1/candidates \
  -H "Authorization: Bearer ORG_TOKEN"
```

### 6. 推薦講師一覧取得 (AIマッチング)

```bash
curl http://localhost:3000/api/jobs/1/recommended \
  -H "Authorization: Bearer ORG_TOKEN"

# レスポンス例:
# {
#   "recommended": [
#     {
#       "id": 1,
#       "name": "鈴木花子",
#       "headline": "n8nで現場自動化の実装まで伴走",
#       "skills": ["prompting", "workflow", "llm"],
#       "tools": ["n8n", "openai"],
#       "industries": ["healthcare", "hr", "retail"],
#       "rate_min": 60000,
#       "rate_max": 150000,
#       "recommendation_score": 0.85,
#       "matched_themes": 2,
#       "matched_tools": 2,
#       "matched_industries": 1
#     }
#   ]
# }
```

### 7. 応募承認 (エスクロー作成)

```bash
curl -X POST http://localhost:3000/api/jobs/1/candidates/1/accept \
  -H "Authorization: Bearer ORG_TOKEN" \
  -H "Content-Type: application/json"
```

### 8. 募集クローズ

```bash
curl -X POST http://localhost:3000/api/jobs/1/close \
  -H "Authorization: Bearer ORG_TOKEN"
```

---

## イベント関連

### 1. イベント作成

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "生成AI基礎ウェビナー - ビジネス活用入門",
    "description": "生成AIをビジネスで活用するための基礎知識とプロンプトエンジニアリングの実践を学びます。\n\n【こんな方におすすめ】\n・生成AIを業務で使いたい方\n・プロンプトの書き方を学びたい方\n・AI活用の事例を知りたい方",
    "theme_tags": ["generative-ai-basics", "prompt-engineering"],
    "tool_tags": ["openai", "claude"],
    "industry_tags": ["it-saas", "marketing"],
    "difficulty": "beginner",
    "format": "online",
    "start_at": "2025-11-15T14:00:00Z",
    "end_at": "2025-11-15T17:00:00Z",
    "price": 5000,
    "capacity": 100,
    "recording": true,
    "status": "published"
  }'
```

### 2. イベント一覧取得

```bash
# すべてのイベント
curl http://localhost:3000/api/events

# フィルタ付き
curl "http://localhost:3000/api/events?status=published&date_from=2025-11-01&price_max=10000&recording=true"
```

### 3. イベント詳細取得

```bash
curl http://localhost:3000/api/events/1
```

### 4. イベント更新

```bash
curl -X PUT http://localhost:3000/api/events/1 \
  -H "Authorization: Bearer ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_url": "https://zoom.us/j/123456789",
    "status": "published"
  }'
```

---

## 受講者関連

### 1. チケット購入

```bash
curl -X POST http://localhost:3000/api/events/1/checkout \
  -H "Authorization: Bearer LEARNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "card"
  }'

# レスポンス例:
# {
#   "message": "Checkout session created",
#   "ticket_id": 1,
#   "payment_url": "#TODO_STRIPE_URL"
# }
```

### 2. レビュー投稿 (直後)

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer LEARNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "event",
    "subject_id": 1,
    "phase": "immediate",
    "rating": 5,
    "comment": "とてもわかりやすく、実務で即使える内容でした。講師の説明も丁寧で満足度が高いです。"
  }'
```

### 3. レビュー投稿 (30日後)

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer LEARNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_type": "event",
    "subject_id": 1,
    "phase": "after30d",
    "rating": 5,
    "metrics_json": {
      "time_saved_hours": 10,
      "quality_improvement": 30,
      "error_reduction": 50,
      "applied_to_work": true
    },
    "comment": "研修後、実際にカスタマーサポート業務で活用しています。週10時間の削減に成功しました。"
  }'
```

### 4. イベントのレビュー取得

```bash
curl "http://localhost:3000/api/reviews?subject_type=event&subject_id=1"

# レスポンス例:
# {
#   "reviews": [...],
#   "average_rating": 4.8,
#   "total_count": 15
# }
```

---

## 管理者関連

### 1. 審査待ち講師一覧

```bash
curl http://localhost:3000/api/admin/instructors/pending \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 2. 講師承認/却下

```bash
# 承認
curl -X POST http://localhost:3000/api/admin/instructors/1/verify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "notes": "実績・スキルともに問題なし"
  }'

# 却下
curl -X POST http://localhost:3000/api/admin/instructors/2/verify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "notes": "実績が不足しているため"
  }'

# 修正依頼
curl -X POST http://localhost:3000/api/admin/instructors/3/verify \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "revision_needed",
    "notes": "模擬動画の音質が悪いため再提出をお願いします"
  }'
```

### 3. プラットフォーム統計取得

```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"

# レスポンス例:
# {
#   "users": 150,
#   "instructors": 25,
#   "organizations": 10,
#   "events": 30,
#   "jobs": 15,
#   "tickets_sold": 450,
#   "revenue": 2250000
# }
```

### 4. チケット返金

```bash
curl -X POST http://localhost:3000/api/admin/tickets/1/refund \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "イベント中止のため"
  }'
```

### 5. タグ作成

```bash
curl -X POST http://localhost:3000/api/admin/tags \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "tool",
    "name": "LangGraph",
    "slug": "langgraph"
  }'
```

### 6. タグ削除

```bash
curl -X DELETE http://localhost:3000/api/admin/tags/41 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 通知関連

### 1. 通知一覧取得

```bash
# すべての通知
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# 未読のみ
curl "http://localhost:3000/api/notifications?unread_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 通知を既読にする

```bash
curl -X POST http://localhost:3000/api/notifications/1/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. すべての通知を既読にする

```bash
curl -X POST http://localhost:3000/api/notifications/read-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## タグ一覧

### すべてのタグ取得 (kind別グループ化)

```bash
curl http://localhost:3000/api/tags

# レスポンス例:
# {
#   "tags": {
#     "theme": [
#       {"id": 1, "kind": "theme", "name": "生成AI基礎", "slug": "generative-ai-basics"},
#       {"id": 2, "kind": "theme", "name": "プロンプトエンジニアリング", "slug": "prompt-engineering"}
#     ],
#     "tool": [
#       {"id": 11, "kind": "tool", "name": "ChatGPT / OpenAI", "slug": "openai"},
#       {"id": 12, "kind": "tool", "name": "Claude (Anthropic)", "slug": "claude"}
#     ],
#     "industry": [...],
#     "outcome": [...]
#   }
# }
```

### 特定kindのタグのみ取得

```bash
curl "http://localhost:3000/api/tags?kind=theme"
curl "http://localhost:3000/api/tags?kind=tool"
curl "http://localhost:3000/api/tags?kind=industry"
curl "http://localhost:3000/api/tags?kind=outcome"
```

---

## エラーハンドリング

すべてのAPIエンドポイントは、エラー時に以下の形式で応答します:

```json
{
  "error": "エラーメッセージ"
}
```

HTTPステータスコード:
- `200` - 成功
- `201` - 作成成功
- `400` - リクエストエラー
- `401` - 認証エラー
- `403` - 権限エラー
- `404` - Not Found
- `500` - サーバーエラー

---

## 認証トークンの使い方

すべての保護されたエンドポイントには、Authorizationヘッダーにトークンを含める必要があります:

```bash
curl http://localhost:3000/api/some-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

トークンは `/api/auth/verify` エンドポイントから取得できます。

---

## 開発環境での注意点

1. **OTPコード**: 開発環境では `dev_otp` フィールドでOTPが返却されます(本番では削除)
2. **Stripe**: 決済フローは準備済みですが、実際の決済処理は未実装 (TODO)
3. **メール送信**: SendGrid統合は準備済みですが、実際のメール送信は未実装 (TODO)
4. **Google OAuth**: 設定は完了していますが、コールバックフローは未実装 (TODO)

---

**最終更新**: 2025-10-23
