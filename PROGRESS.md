# Nothing To Do App — 開発進捗

## 概要

先延ばしを根絶するアンチToDoアプリ。タスクを「保存」するのではなく、入力した瞬間にAIが「今すぐやれ」と叱咤し、5秒カウントダウンで即行動を強制するジョークWebアプリ。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Vite + Vanilla TypeScript + プレーンCSS |
| バックエンド | Express + Anthropic SDK |
| AI | Claude API (claude-3-5-sonnet) |
| 音声 | Web Speech API |
| フロント公開 | Cloudflare Pages |
| バックエンド公開 | Google Cloud Run |

## 環境変数

### ルート `.env`（サーバーが参照）
```
ANTHROPIC_API_KEY=your_api_key_here
CLIENT_ORIGIN=https://your-cloudflare-pages-url  # 本番必須
```

### `client/.env`（フロントが参照）
```
VITE_API_BASE_URL=http://localhost:3001   # 開発時
# VITE_API_BASE_URL=https://your-cloud-run-url  # 本番時
```

## 起動コマンド

```bash
# フロントエンド（開発）
cd client && npm run dev

# バックエンド（開発）
cd server && npm run dev

# フロントエンド（本番ビルド）
cd client && npm run build

# バックエンド（本番ビルド）
cd server && npm run build && npm start
```

## 完了済み

- [x] プロジェクト初期化（Vite Vanilla TS + Express）
- [x] バックエンド: `POST /api/analyze`（Claude API + CORS + fallback）
- [x] フロントエンド: 3ステート管理・画面実装・音声再生
- [x] セキュリティ対応: `.gitignore`、XSS修正、CORS本番設定
- [x] コード品質: simplify適用（DOM参照キャッシュ、innerHTML排除）
- [x] バグ修正: screamTimer追跡、visibilitychange重複登録、FALLBACK HTTP 500、content[0] null guard
- [x] CLAUDE.md / README.md 作成
- [x] GitHub Public リポジトリ公開

## Feature候補

### UX改善
- [ ] タスク入力中のリアルタイムバリデーション（文字数カウント表示）
- [ ] screaming 画面でのアニメーション強化（炎エフェクト等）
- [ ] monitoring 画面で micro_step を常時表示

### 機能追加
- [ ] 完了履歴の表示（セッション内のみ、保存なし）
- [ ] urgency_level に応じて叱咤の強度を変える
- [ ] キーボードショートカット（Enter で「やった！」）

### インフラ
- [ ] Cloud Run デプロイ（`gcloud run deploy`）
- [ ] Cloudflare Pages デプロイ
- [ ] `VITE_API_BASE_URL` を Cloud Run URL に設定
- [ ] GitHub Actions で CI（tsc --noEmit）

## ファイル構成

```
nothing-to-do-app/
  client/
    index.html
    src/
      main.ts        # 3ステート管理・イベント制御
      api.ts         # バックエンドへの fetch
      speech.ts      # Web Speech API ラッパー
      style.css
    .env
  server/
    src/
      index.ts       # Express + /api/analyze エンドポイント
    tsconfig.json
  Dockerfile
  PROGRESS.md
  .env
```
