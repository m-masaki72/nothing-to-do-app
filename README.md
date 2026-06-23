# Nothing To Do App

> タスクを保存するな。今すぐやれ。

従来のToDoアプリへのアンチテーゼ。タスクを入力した瞬間、AIが「今すぐやれ」と叱咤し、5秒カウントダウンで即行動を強制するジョークWebアプリ。

**🔗 https://nothing-to-do-app.pages.dev/**

## Screenshots

| Input | Screaming (urgency 1) | Screaming (urgency 2) | Screaming (urgency 3) | Monitoring |
|---|---|---|---|---|
| ![Input](docs/screenshots/01_input.png) | ![urgency1](docs/screenshots/02_screaming_urgency1.png) | ![urgency2](docs/screenshots/03_screaming_urgency2.png) | ![urgency3](docs/screenshots/04_screaming_urgency3.png) | ![monitoring](docs/screenshots/05_monitoring.png) |

## UX Flow

```
[Input]      入力フォーム + 完了履歴（localStorageで永続化）
    ↓ 送信
[Screaming]  緊急度に応じた背景色・炎エフェクト、5秒カウントダウン
             urgency=3 は画面シェイク + アラーム音
    ↓ 5秒後
[Monitoring] 「やった！」ボタン、経過時間カウント、放置すると督促
    ↓ やった！（白フラッシュ + ファンファーレ）
[Input]      履歴に追加・保存
```

## Urgency Level

AIがタスクの緊急度を1〜3で判定し、演出が変わる。

| Level | 背景色 | 炎の数 | パルス速度 | 追加演出 |
|-------|--------|--------|------------|----------|
| 1 — 普通 | 青 | 5個 | ゆっくり | — |
| 2 — 急ぎ | オレンジ赤 | 10個 | 普通 | — |
| 3 — 今すぐ | 深紅 | 18個 | 速い | 画面シェイク（最大18px）+ 赤フラッシュ×3 + アラーム音 + 低周波ノイズ |

## Tech Stack

| | |
|--|--|
| Frontend | Vite + Vanilla TypeScript |
| Backend | Express + Anthropic SDK |
| AI | Claude API (claude-haiku-4-5) |
| Audio | Web Speech API + Web Audio API |
| PWA | vite-plugin-pwa（Service Worker、オフライン対応、ホーム画面インストール） |
| Testing | Vitest + jsdom |
| Hosting (front) | Cloudflare Pages |
| Hosting (back) | Google Cloud Run |

## Getting Started

### 1. 環境変数を設定

```bash
cp .env.example .env
# ANTHROPIC_API_KEY を記入

cp client/.env.example client/.env
# 開発時は VITE_API_BASE_URL=http://localhost:3001
```

### 2. 依存インストール・起動

```bash
cd server && npm install && npm run dev   # port 3001
cd client && npm install && npm run dev  # port 5173
```

## Deployment

### Backend → Cloud Run

```bash
gcloud run deploy nothing-to-do-api --source . --set-env-vars ANTHROPIC_API_KEY=xxx,CLIENT_ORIGIN=https://nothing-to-do-app.pages.dev
```

### Frontend → Cloudflare Pages

- ルートディレクトリ: `client`
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`
- フレームワーク: None
- 環境変数: `VITE_API_BASE_URL` = Cloud Run の URL

## Testing

```bash
cd client && npm run test
```

`src/utils.test.ts`・`src/api.test.ts`・`src/speech.test.ts` の3ファイル、計35件のテストが含まれる。

| ファイル | 対象 | 主なカバレッジ |
|----------|------|----------------|
| `utils.test.ts` | `formatElapsed`, `loadHistory`, `saveHistory`, `clampChallengerCount` | フォーマット・localStorage 読み書き・不正JSON耐性 |
| `api.test.ts` | `analyzeTask` | 正常系・HTTPエラー・ネットワークエラー・urgency_level 全値・8秒タイムアウト |
| `speech.test.ts` | `speak`, `stopSpeech` | cancel→speak 順序・lang設定・speechSynthesis undefined 耐性 |

## License

MIT
