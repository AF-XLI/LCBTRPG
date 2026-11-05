# 戦闘卓(リンバス風TRPG 戦闘サポート)

GitHub Pages(静的ホスティング)+ Firebase Realtime Database(無料のSparkプラン)で動く、最大8人程度向けの戦闘進行サイトです。ビルド作業は不要で、ファイルをそのまま置くだけで動きます。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面の骨組み |
| `style.css` | 見た目(スマホ対応) |
| `config.js` | Firebase の接続情報(ここだけ書き換えます) |
| `js/logic.js` | ルール計算(画面に依存しない純粋なロジック。Node でも動作) |
| `js/store.js` | 共有(Firebase / ローカル)の通信部分 |
| `js/ui.js` | 画面の組み立て(HTML文字列を返すだけ) |
| `js/app.js` | 操作・同期・矢印/演出の制御 |
| `sample/party.json`, `sample/enemies.json` | サンプルデータ |
| `test/sim.js` | 自動対戦試験(`node test/sim.js`) |

## まず動かす(Firebase なし)

`config.js` が空のままだと「ローカルモード」になり、同じブラウザの複数タブ間だけで同期します。操作の確認用です。
`index.html` をブラウザで開く(または `python3 -m http.server` で配信する)→ ルームIDを入れて入室 → KPで入ると準備パネルが出ます。

※ サンプルの自動読み込みボタンは、`file://` で直接開いた場合は動きません。公開後のURL、またはローカルサーバー経由でお試しください(JSONの貼り付けはどちらでも可)。

## Firebase の設定(みんなで共有する場合)

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成(Googleアナリティクスは不要)。料金プランは **Spark(無料)** のままで構いません。クレジットカードも不要です。
2. 「構築」→ **Realtime Database** → データベースを作成(ロケーションは近いもの。テストモードではなく **ロックモード** で開始)。
3. 「構築」→ **Authentication** → ログイン方法 → **匿名** を有効にする。
4. Realtime Database の「ルール」を次のように設定して公開する(ログインした人だけが読み書き可能)。
   ```json
   {
     "rules": {
       "rooms": {
         "$room": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```
5. プロジェクトの設定 →「マイアプリ」→ ウェブアプリ(`</>`)を追加し、表示される `firebaseConfig` の値を `config.js` に転記する。`databaseURL` は Realtime Database の画面に表示されるURLです。
   ```js
   window.LC_FIREBASE_CONFIG = {
     apiKey: '…',
     authDomain: '…',
     databaseURL: 'https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app',
     projectId: '…',
     appId: '…',
     useAuth: true
   };
   ```
   `apiKey` はウェブ用の識別子で、公開されても問題ありません(守っているのは上記ルールです)。匿名認証を使わない場合は `useAuth: false` にし、ルールを `".read": true, ".write": true` に変えてください(URLを知っている人は誰でも書き込めます)。
6. Authentication → 設定 → 承認済みドメインに、公開先のドメイン(`ユーザー名.github.io`)を追加する。

### 無料枠の目安

Spark の Realtime Database は同時接続100・保存1GB・ダウンロード月10GB です。8人卓なら余裕があります。

## GitHub Pages で公開する

1. この一式をリポジトリのルートに置いて push する。
2. リポジトリの Settings → Pages → Branch を `main` / `/ (root)` にして保存する。
3. 数分後に `https://ユーザー名.github.io/リポジトリ名/` で開けます。
4. 卓の参加者には、ルームIDを伝えてください(`…/?room=ルームID` のURLを共有しても入室できます)。

## 遊び方

役割は入室時に選びます。

- **KP**: 準備パネルで味方/敵のJSONを読み込み、戦闘開始。ラウンドの進行(戦闘開始 → 1手進める/自動進行 → 次のラウンド)と、体力・精神力・状態・振動爆発・E.G.O・復帰などの手動補助を行います。
- **GM**: 敵の行動決定(各スキルの対象選択、スキルの手動変更)を行います。
- **プレイヤー**: 上部で操作キャラを選び、手札から行動を選択 → 敵のスキル枠を押して対象を決める → 「確定」。
- **観戦**: 見るだけです。

1ラウンドの流れ: `敵の行動決定(GM)` → `味方の行動選択` → `戦闘処理(速度順)` → `ラウンド終了`。

画面の見かた:

- 矢印: 金=マッチ(中央に ✸)/ 赤=敵の一方攻撃 / 水色=味方の一方攻撃 / 点線=未確定。右上のメニューで「すべて/自分のみ/なし」を切り替えられます。
- 敵のスキル枠や部位を押すと詳細、味方を押すとスキル詳細が出ます。体力バーの黄色い線は混乱の閾値です。
- 敵の速度はKP/GMにだけ表示されます。

## JSON の形式

味方は `sample/party.json`、敵は `sample/enemies.json` を見本にしてください。要点:

- 味方: `name, maxHp, sp(精神力), speed:[最小,最大], thr:[混乱閾値(%)…], resist(耐性), skills{0〜3}`。`skills.0` が守備(`kind:"defense"` の `sub` は `guard`=防御 / `evade`=回避、または `kind:"counter"`)、1〜3 が攻撃スキル。
- スキル: `name, kind, sin(罪悪), phys(物理), tier, base, coins:[各コインの加算], text, grants[]`。`grants` は `{status, p(威力), c(回数) または v(値), to:"target"|"self", when:"hit"|"use", coin:N, next:true}`。
- 状態の ID: `burn bleed vibration rupture sinking breath charge paralysis bind dmgUp dmgDown fragile protect powerDown quick powerUp ...`(`js/logic.js` の `STATUS` 参照)。
- 敵: `kind:"normal"`(1部位・体力と精神力あり)/ `"abnormality"`(体力共有・部位ごとに耐久と精神力。`destroyable` で破壊可能)。`skillSets:[{name, when, loop:[[スキルキー…],…]}]` で行動パターンを定義し、後ろにある条件一致が優先されます。
- 条件付きダメージ補正は `dmgBonusIf`、スキル差し替えは `replace`、条件分岐は `branches` を使います。

## ルールの実装範囲

実装済み: マッチ(威力同値は振り直し)、威力とダメージ計算(バフ枠×耐性枠・最低1)、精神力と表確率、状態異常(火傷/出血/振動/破裂/沈潜/呼吸/充電/麻痺 ほか)、混乱(体力閾値・多重・振動爆発)、デッキ(1,1,1,2,2,3 の山札)、守備スキル(防御=バリア / 回避=コイン単位で無効化 / 反撃)、速度順の処理、ラウンド終了処理。

### 仮の扱い(要確認)

次はルールが未確定のため、仮の動作です。違っていたらお知らせください。

- 回避に失敗した後は、そのスキルの残りコインに対して回避が働かない。
- 防御のバリアは、1ラウンドにつき最初の攻撃スキルに対して1回だけ獲得する。
- 混乱中に追加で閾値を越えた場合は、混乱レベルが加算される。
- 反撃は混乱・離脱中は行われない。
- 反撃・防御は「守備」扱いで、守備威力の増減が掛かる(マッチ威力の増減は掛からない)。
- 敵スキルセットの条件が複数一致した場合は、最後に書いたものを採用。

### 未実装(手動補助で対応)

- 処理タイミング(「◯◯時」)の自動化、広域スキル/広域乱射
- E.G.O の使用コストと効果(耐性の上書きのみ。KPの手動補助から実行)
- 精神力の減少条件(人格・敵ごと)、敵の回復、復帰(KPの手動補助で対応)
- パニック効果(ログに記録のみ)

## 開発メモ

- ルール計算は `js/logic.js` に分離しており、DOM・通信に依存しません。`node test/sim.js` で乱数対戦を400回流して例外が出ないことを確認できます(`node test/sim.js one 7` でシード7の戦闘ログを表示)。
- 共有データは `rooms/<ルームID>/state` に1つのJSONとして保存されます。KPの操作は差分だけを書き込み、プレイヤーは自分の `units/<id>/choice` だけを書き込みます。
