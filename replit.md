# こそだてパズル

子どもの人数・年齢・できることと家庭の状況に合わせて、育児と家事の段取りを組み立て直せるアプリ。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kosodate-puzzle/src/App.tsx` — 公開ベータのローカルファーストな画面と状態管理
- `artifacts/kosodate-puzzle/src/index.css` — アプリのテーマとレスポンシブ表示
- `artifacts/kosodate-puzzle/.replit-artifact/artifact.toml` — Web artifact の起動設定

## Architecture decisions

- 初期公開は無料の静的Webアプリとして行い、独自ドメイン・ログイン・クラウド同期・ネイティブアプリ化は後回しにする。
- 最初の公開版はログイン・外部APIなしのローカルファースト実装とし、家庭情報は端末内に保存する。
- 外出・食事・入浴・寝かしつけを同じタスクモデルで扱い、子どもの年齢と「できること」によって手順を変える。
- 公開ベータでは中核体験を優先し、家事タスクの本格対応は本番拡張として追加する。
- 本番のタスクモデルは直列のチェックリストに限定せず、同時実行可能なタスクを表現できるようにする。

## Product

- 子どもを複数登録し、年齢・できること・家庭固有の場所や移動手段を設定できる。
- 外出、食事、入浴、寝かしつけの段取りを、家族の条件に合わせて表示・完了・組み直しできる。
- 本番では、オムツ替え、親の睡眠、洗濯、料理、ゴミ出し、宅配の段ボール整理、買い物を育児タスクと同じボードで扱う。
- 「洗濯しながら料理をする」のように、同時に進められる家事を考慮し、実際の経過時間と親の負荷を抑えた組み合わせを提案する。
- 家事タスクには、所要時間、担当者、場所、必要なもの、中断可否、前後関係、並行可能なタスクを持たせる。

## User preferences

このアプリは、外出専用に見えないよう、育児全般を扱う中核体験を維持する。

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
