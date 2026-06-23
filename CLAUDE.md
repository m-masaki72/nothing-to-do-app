# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# フロントエンド (port 5173)
cd client && npm run dev

# バックエンド (port 3001)
cd server && npm run dev
```

### Test
```bash
cd client && npm run test
```

テストファイル: `client/src/utils.test.ts`, `client/src/api.test.ts`, `client/src/speech.test.ts`（計35件）。
jsdom 環境。`fetch` / `speechSynthesis` / `SpeechSynthesisUtterance` は `vi.stubGlobal` でモック。

### Type check
```bash
client/node_modules/.bin/tsc --noEmit -p client/tsconfig.json
server/node_modules/.bin/tsc --noEmit -p server/tsconfig.json
```

### Build
```bash
cd client && npm run build   # dist/ に静的ファイル生成 → Cloudflare Pages
cd server && npm run build   # dist/ にコンパイル → Cloud Run
```

## Architecture

モノレポ構成。`client/` と `server/` は独立した npm プロジェクト。

### データフロー
```
[ユーザー入力] → client/src/api.ts (fetch POST /api/analyze)
  → server/src/index.ts (Express, Claude API呼び出し)
  → { micro_step, angry_speech, urgency_level } をクライアントへ返却
  → client/src/main.ts がステート遷移 + speech.ts で音声再生
```

### フロントエンド (`client/`)
- **フレームワークなし**。Vite + Vanilla TypeScript のみ。
- `src/main.ts` が唯一のエントリポイント。`AppState = 'input' | 'screaming' | 'monitoring'` の3ステートをモジュールスコープ変数で管理し、`render()` で描画を切り替える。DOM操作はすべて直接実装。
- `src/api.ts`: バックエンドへの fetch ラッパー。`VITE_API_BASE_URL` 環境変数でエンドポイントを切り替え。AbortController による8秒タイムアウト実装済み。
- `src/speech.ts`: Web Speech API (`SpeechSynthesisUtterance`) のラッパー。外部音声APIなし。
- 履歴は `localStorage`（キー: `ntd_history`）に JSON 保存。最大50件。起動時ロード、タスク完了時セーブ。
- urgency=3 時: 画面シェイク（最大18px）+ 赤フラッシュオーバーレイ×3（350ms間隔） + Web Audio で 880Hz ビープ3連打 + 55Hz sawtooth 低周波ノイズ。
- タスク完了時: Web Audio で C→E→G→C ファンファーレ + 白フラッシュオーバーレイ（0.6秒後に input 遷移）。
- PWA: `vite-plugin-pwa` で Service Worker を自動生成。オフライン対応・ホーム画面インストール対応済み（`vite.config.ts` に設定）。

### バックエンド (`server/`)
- Express + TypeScript (CommonJS)。エンドポイントは `POST /api/analyze` **1本のみ**。
- `dotenv` は `../. env`（リポジトリルート）を参照する。`process.env.PORT` でポート変更可。
- CORS: 開発時は `http://localhost:5173`、本番は `CLIENT_ORIGIN` 環境変数必須。未設定だと `false`（全拒否）になる。
- Claude API のレスポンスは `{[\s\S]*}` 正規表現でJSONを抽出。失敗時は `FALLBACK` 定数を返す。

## Environment Variables

| 変数 | 場所 | 説明 |
|------|------|------|
| `ANTHROPIC_API_KEY` | ルート `.env` | Claude API キー（必須） |
| `CLIENT_ORIGIN` | ルート `.env` | 本番CORSオリジン（本番必須） |
| `PORT` | ルート `.env` | サーバーポート（デフォルト3001） |
| `VITE_API_BASE_URL` | `client/.env` | バックエンドURL（デフォルト `http://localhost:3001`） |

## Deployment

- **フロントエンド**: Cloudflare Pages（https://nothing-to-do-app.pages.dev/）
  - ルートディレクトリ: `client`、ビルドコマンド: `npm run build`、出力: `dist`、フレームワーク: None
  - 環境変数 `VITE_API_BASE_URL` に Cloud Run の URL を設定
- **バックエンド**: ルートの `Dockerfile` で `server/` をビルド → Cloud Run にデプロイ
  - Dockerfile はリポジトリルートに置き、`server/` のみをコンテナに含める（`.dockerignore` で `client/` 除外済み）
