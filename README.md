# Nothing To Do App

> タスクを保存するな。今すぐやれ。

従来のToDoアプリへのアンチテーゼ。タスクを入力した瞬間、AIが「今すぐやれ」と叱咤し、5秒カウントダウンで即行動を強制するジョークWebアプリ。

## 概要

- タスクをリストに「保存」する機能は一切ない
- 入力 → Claude APIがマイクロアクションに分解 → 5秒カウントダウン → 「やった」ボタンのみ
- 画面を離れると督促が飛んでくる

## Tech Stack

| | |
|--|--|
| Frontend | Vite + Vanilla TypeScript |
| Backend | Express + Anthropic SDK |
| AI | Claude API (claude-3-5-sonnet) |
| Voice | Web Speech API |
| Hosting (front) | Cloudflare Pages |
| Hosting (back) | Google Cloud Run |

## Getting Started

### 1. 環境変数を設定

```bash
# ルートに .env を作成
cp .env.example .env
# ANTHROPIC_API_KEY を記入

# フロントエンド用
cp client/.env.example client/.env
```

### 2. 依存インストール

```bash
cd client && npm install
cd ../server && npm install
```

### 3. 起動

```bash
# ターミナル1
cd server && npm run dev

# ターミナル2
cd client && npm run dev
```

ブラウザで `http://localhost:5173` を開く。

## Deployment

### Backend → Cloud Run

```bash
# リポジトリルートから
gcloud run deploy nothing-to-do-api \
  --source . \
  --set-env-vars ANTHROPIC_API_KEY=xxx,CLIENT_ORIGIN=https://your-pages-url
```

### Frontend → Cloudflare Pages

```bash
cd client && npm run build
# dist/ を Cloudflare Pages にデプロイ
# 環境変数 VITE_API_BASE_URL に Cloud Run の URL を設定
```

## UX Flow

```
[Input]      暗い画面、入力フォーム1つ
    ↓ 送信
[Screaming]  赤背景、5秒カウントダウン、AIのマイクロアクション表示 + 音声
    ↓ 5秒後
[Monitoring] 「やった！」ボタンのみ、経過時間カウント
             ※ 画面を離れると督促メッセージが出る
    ↓ やった！
[Input]      リセット
```
