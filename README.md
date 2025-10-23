# AIMatch Campus

**AI研修の主催者・講師・受講者をつなぐ三者マッチングプラットフォーム (MVP)**

## 🎯 プロジェクト概要

AIMatch Campusは、AI研修を提供する主催者(企業/研修会社)、登壇したい講師、そして受講者の三者をマッチングする統合プラットフォームです。講師採用市場(B2Bの人材アサイン)と研修/ウェビナー流通市場(B2B/B2Cのイベント集客)を同一プラットフォームで回し、成約と実務アウトカムの最大化を図ります。

### 主な特徴

- 🤝 **講師マッチング**: AIタグマッチングによる最適な講師推薦システム
- 📅 **イベント管理**: 研修・ウェビナーの掲載から申込、決済まで一気通貫
- ⭐ **2層レビュー**: 直後満足度 + 30日後業務適用度の測定
- 💰 **エスクロー決済**: 講師報酬の安全な管理と支払い
- 🔒 **RBAC**: 4つのロール(Admin/Organization/Instructor/Learner)による権限管理

## 🚀 技術スタック

- **Frontend**: Vanilla JavaScript + Tailwind CSS (CDN)
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages
- **Authentication**: Email OTP + Google OAuth (準備済み)
- **Payment**: Stripe API (統合準備済み)
- **Email**: SendGrid API (統合準備済み)

## 📦 データモデル

### 主要テーブル

- **users**: ユーザー (4ロール: admin/org/instructor/learner)
- **organizations**: 主催者組織情報
- **instructors**: 講師プロフィール (スキル/業界/ツール)
- **events**: 研修/ウェビナー (価格/定員/形式/録画)
- **jobs**: 講師募集 (要件/報酬/納品物)
- **applications**: 講師応募情報
- **bookings**: 成約/エスクロー管理
- **tickets**: イベント参加チケット
- **reviews**: 2層レビュー (immediate/after30d)
- **tags**: タグマスタ (theme/tool/industry/outcome)
- **notifications**: アプリ内通知

## 🔌 API エンドポイント

### 認証 (`/api/auth`)

- `POST /login` - OTPコード送信
- `POST /verify` - OTP検証 + セッション作成
- `POST /logout` - ログアウト
- `GET /me` - 現在のユーザー情報取得

### 講師 (`/api/instructors`)

- `GET /` - 講師一覧 (フィルタ対応)
- `GET /:id` - 講師詳細 + レビュー
- `POST /` - プロフィール作成/更新
- `POST /:id/apply` - 募集への応募
- `GET /:id/recommended-jobs` - 推薦募集一覧

### 募集 (`/api/jobs`)

- `GET /` - 募集一覧 (フィルタ対応)
- `GET /:id` - 募集詳細
- `POST /` - 募集作成
- `POST /:id/close` - 募集クローズ
- `GET /:id/candidates` - 応募者一覧
- `GET /:id/recommended` - 推薦講師一覧 (AIマッチング)
- `POST /:id/candidates/:applicationId/accept` - 応募承認 + エスクロー作成

### イベント (`/api/events`)

- `GET /` - イベント一覧 (フィルタ対応)
- `GET /:id` - イベント詳細 + チケット在庫
- `POST /` - イベント作成
- `PUT /:id` - イベント更新
- `POST /:id/checkout` - チケット購入 (Stripe統合準備済み)

### 組織 (`/api/organizations`)

- `GET /me` - 自組織情報取得
- `POST /` - 組織作成
- `PUT /:id` - 組織更新

### レビュー (`/api/reviews`)

- `GET /` - レビュー一覧 (subject絞込み)
- `POST /` - レビュー投稿 (phase: immediate/after30d)

### タグ (`/api/tags`)

- `GET /` - タグ一覧 (kind別グループ化)

### 通知 (`/api/notifications`)

- `GET /` - 通知一覧 (未読絞込み可)
- `POST /:id/read` - 既読マーク
- `POST /read-all` - 全既読

### 管理 (`/api/admin`)

- `GET /instructors/pending` - 審査待ち講師一覧
- `POST /instructors/:id/verify` - 講師承認/却下
- `GET /reports` - 通報一覧
- `POST /reports/:id/action` - 通報対応
- `POST /tickets/:id/refund` - チケット返金
- `GET /stats` - プラットフォーム統計
- `POST /tags` - タグ作成
- `DELETE /tags/:id` - タグ削除

## 🛠️ ローカル開発

### 前提条件

- Node.js 18+
- npm

### セットアップ

```bash
# リポジトリクローン
git clone <repository-url>
cd webapp

# 依存関係インストール
npm install

# データベースマイグレーション実行
npm run db:migrate:local

# 開発サーバー起動
npm run build
pm2 start ecosystem.config.cjs

# 別ターミナルで確認
curl http://localhost:3000/api/health
```

### 環境変数

`.dev.vars` ファイルに以下を設定:

```bash
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# SendGrid API Key
SENDGRID_API_KEY=...

# JWT Secret
JWT_SECRET=your-secret-key

# Application URL
APP_URL=http://localhost:3000
```

## 🌐 公開URL

- **開発環境**: https://3000-ieofnuhfgsxmkqvswdfmu-5185f4aa.sandbox.novita.ai
- **本番環境**: (デプロイ後に更新)

## 📊 推薦アルゴリズム (v0)

講師推薦スコア計算式:

```
score = Σ(w_theme * match(theme)) + Σ(w_tool * match(tool)) + 
        Σ(w_industry * match(industry)) + w_outcome * match(outcome_tags) + 
        w_rating * avg_rating + w_activity * response_rate
```

重み設定 (初期値):
- テーマ一致: 0.3
- ツール一致: 0.25
- 業界一致: 0.2
- 成果タグ一致: 0.15
- 平均評価: 0.05
- アクティビティ: 0.05

## ✅ 実装済み機能 (MVP)

### コア機能
- ✅ 認証システム (Email OTP)
- ✅ RBAC権限管理 (4ロール)
- ✅ 講師プロフィール CRUD
- ✅ 講師審査システム
- ✅ 募集投稿 CRUD
- ✅ 講師応募・承認フロー
- ✅ イベント掲載・検索
- ✅ チケット予約システム
- ✅ レビューシステム (2層)
- ✅ 通知システム (アプリ内)
- ✅ AI推薦ロジック (講師↔募集)
- ✅ 管理画面 (審査・通報・返金・統計)

### データベース
- ✅ D1 (SQLite) 全テーブル作成
- ✅ マイグレーションシステム
- ✅ 初期タグデータ投入 (40+ タグ)
- ✅ インデックス最適化

### API
- ✅ REST API 全エンドポイント実装
- ✅ 認証ミドルウェア
- ✅ ロールベース認可
- ✅ JSON応答の統一

## 🚧 未実装機能 (今後の拡張)

### 統合
- ⏳ Stripe決済フロー (checkout sessionの実装)
- ⏳ Google OAuth認証フロー
- ⏳ SendGridメール送信 (OTP/通知)
- ⏳ PDF生成 (請求書/契約書)

### フロントエンド
- ⏳ React/Vue/Svelteでの本格的なUI実装
- ⏳ 講師ダッシュボード
- ⏳ 主催者ダッシュボード
- ⏳ 受講者マイページ
- ⏳ 管理画面UI

### 高度な機能
- ⏳ リアルタイムチャット (主催者↔講師)
- ⏳ カレンダー連携
- ⏳ 動画アップロード・録画管理
- ⏳ 多言語対応
- ⏳ エンタープライズSSO

## 🧪 テスト方法

### API動作確認

1. **認証フロー**
```bash
# OTP送信
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# OTP検証 (レスポンスのdev_otpを使用)
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456","name":"山田太郎","role":"org"}'

# トークンを保存
TOKEN="<返却されたtoken>"
```

2. **講師プロフィール作成**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@example.com"}'

curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@example.com","code":"<OTP>","name":"鈴木花子","role":"instructor"}'

INSTRUCTOR_TOKEN="<token>"

curl -X POST http://localhost:3000/api/instructors \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "headline": "n8nで現場自動化の実装まで伴走",
    "bio": "10年以上のIT経験でAI活用を支援",
    "skills": ["prompting","workflow","llm"],
    "industries": ["healthcare","hr"],
    "tools": ["n8n","openai"],
    "rate_type": "per_session",
    "rate_min": 60000,
    "rate_max": 150000
  }'
```

3. **組織作成 + 募集投稿**
```bash
# 組織作成
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"株式会社サンプル","billing_email":"billing@example.com"}'

# 募集投稿
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "カスタマーサポート向け生成AI研修",
    "description": "FAQ要約と返信草案の運用まで",
    "deliverables": ["運用マニュアル","評価シート"],
    "budget_min": 120000,
    "budget_max": 250000,
    "theme_tags": ["customer-support-automation"],
    "tool_tags": ["openai","n8n"],
    "industry_tags": ["retail"]
  }'
```

4. **推薦講師取得**
```bash
JOB_ID=1
curl http://localhost:3000/api/jobs/$JOB_ID/recommended \
  -H "Authorization: Bearer $TOKEN"
```

5. **タグ一覧取得**
```bash
curl http://localhost:3000/api/tags
```

## 📈 今後の開発計画

### Phase 2 (決済・通知完成)
- Stripe決済フローの完全統合
- SendGridメール通知の実装
- PDF請求書/契約書生成

### Phase 3 (UI/UX強化)
- React/Vueでの本格的なフロントエンド実装
- ダッシュボードUI完成
- モバイル最適化

### Phase 4 (スケール対応)
- パフォーマンス最適化
- キャッシング戦略
- 監視・アラート設定

## 🔐 セキュリティ

- セッショントークン認証
- ロールベースアクセス制御 (RBAC)
- SQL injection対策 (prepared statements)
- CORS設定
- 環境変数による秘密情報管理

## 📝 ライセンス

MIT License

## 👥 コントリビューション

プルリクエストを歓迎します!

## 📞 サポート

問題が発生した場合は、Issuesセクションにお知らせください。

---

**開発者**: Generated with AI assistance  
**最終更新**: 2025-10-23  
**バージョン**: 0.1.0 (MVP)
