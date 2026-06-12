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

## フェーズ別チェックリスト

### Phase 1: プロジェクト初期化
- [x] `npm create vite@latest client` (Vanilla + TypeScript)
- [x] `server/` ディレクトリに Express + Anthropic SDK セットアップ
- [x] ルート `.env` / `client/.env` 作成
- [x] ルート `package.json` にショートカットスクリプト追加

### Phase 2: バックエンド (Express)
- [x] `POST /api/analyze` — Claude API呼び出し
- [x] フォールバック実装（API失敗時テンプレ文返却）
- [x] CORS 設定

### Phase 3: フロントエンド (Vanilla TS)
- [x] `main.ts`: 3ステート管理 (input / screaming / monitoring)
- [x] State 1: Input 画面
- [x] State 2: Screaming 画面（5秒カウントダウン + CSS アニメーション）
- [x] State 3: Monitoring 画面（経過時間 + visibilitychange 督促）
- [x] `api.ts`: バックエンドへの fetch
- [x] `speech.ts`: Web Speech API ラッパー
- [x] `style.css`: 3ステート分のスタイル

### Phase 4: PROGRESS.md・後処理
- [x] `PROGRESS.md` 作成
- [x] 設計書テキストファイル削除

### Phase 5: Dockerfile
- [ ] `Dockerfile` 作成（Express サーバー用）
- [ ] Cloud Run へデプロイ
- [ ] Cloudflare Pages へフロント静的ビルドをデプロイ
- [ ] `VITE_API_BASE_URL` を Cloud Run URL に設定

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
