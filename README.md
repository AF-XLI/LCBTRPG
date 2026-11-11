# LCBTRPG

LimbusCompanyを元にした二次創作TRPG「LCBTRPG」のサイトです。GitHub Pages(静的ホスティング)+ Firebase(無料のSparkプラン)で動きます。ビルド作業は不要で、ファイルをそのまま置くだけで動きます。

## 構成

| 場所 | 役割 |
| --- | --- |
| `index.html`, `style.css`, `script.js` | メインページ(ハブ)。Googleログイン・ログアウトと、各ページへのリンク |
| `config.js` | Firebase の接続情報(全ページ共通。ここだけ書き換えます) |
| `battle/` | 戦闘システム(説明は [battle/README.md](battle/README.md)) |
| `character/` | キャラクターシート(ハブ `character/` と、囚人ごとのページ `character/<囚人ID>/`。説明は下の「キャラクターシート」) |
| `data/` | キャラクターシートのマスターデータ(JSON。`prisoners.json` と、囚人ごとのフォルダ `data/<囚人ID>/` に人格・E.G.O) |
| `image/` | 画像(各ページで共用) |

## ログインと役職

- ログインはメインページで行います。戦闘システムなど各ページは、メインページでのログイン状態を使います。
- 役職は、データベースの `admin`(管理者)・`gm`(GM)・`player`(プレイヤーの持ちキャラ)に、アカウントのUIDを登録して決めます。登録のしかたは、下の Firebase の設定の手順6・7にあります。
- 管理者とGMは、今は同じ権限です。将来、権限を分けられるように、役職名を分けています。
- 観戦は、ログインなしで入れます。

## Firebase の設定

1. [Firebase コンソール](https://console.firebase.google.com/) でプロジェクトを作成(Googleアナリティクスは不要)。料金プランは **Spark(無料)** のままで構いません。クレジットカードも不要です。
2. 「構築」→ **Realtime Database** → データベースを作成(ロケーションは近いもの。テストモードではなく **ロックモード** で開始)。
3. 「セキュリティ」→ **Authentication** → ログイン方法 → **匿名** と **Google** を有効にする(Google は、プロジェクトのサポートメールを選んで保存)。GM・管理者・プレイヤーはGoogleアカウントでログインし、観戦だけが匿名ログインです。
4. Realtime Database の「ルール」を次のように設定して公開する。管理者(`admin`)またはGM(`gm`)として登録したアカウントだけが全体を書き込め、プレイヤーは自分のキャラのスキル選択(`units/<キャラID>/choice`)と資源(`res`)だけを書き込めます。
   ```json
   {
     "rules": {
       "admin": {
         "$uid": { ".read": "auth != null && auth.uid === $uid" }
       },
       "gm": {
         "$uid": { ".read": "auth != null && auth.uid === $uid" }
       },
       "player": {
         "$uid": { ".read": "auth != null && auth.uid === $uid" }
       },
       "rooms": {
         "$room": {
           "state": {
             ".read": "auth != null",
             ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true",
             "units": { "$u": { "choice": { ".write": "root.child('player').child(auth.uid).val() === $u" } } },
             "res": { ".write": "root.child('player').child(auth.uid).exists()" }
           }
         }
       },
       "characters": {
         "$cid": {
           ".read": true,
           "desc": { ".write": "root.child('admin').child(auth.uid).val() === true || root.child('player').child(auth.uid).val() === $cid" },
           "memo": { ".write": "root.child('admin').child(auth.uid).val() === true || root.child('player').child(auth.uid).val() === $cid" },
           "identity": { ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || root.child('player').child(auth.uid).val() === $cid" },
           "egos": { ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || root.child('player').child(auth.uid).val() === $cid" }
         }
       }
     }
   }
   ```
   `characters/<囚人ID>` はキャラクターシートの保存先です。誰でも読めます(ログイン不要)。`desc`(説明)と `memo`(メモ)は、管理者と、その囚人の担当プレイヤー(`player/<UID>` がその囚人のID)だけが書き込めます。`identity`(装備中の人格)と `egos`(装備中のE.G.O)は、これに加えてGMも書き込めます(装備の変更画面は、これから作ります)。
   プレイヤーの操作が「permission denied」で失敗する場合は、いったん `"state"` の中を `".read": "auth != null", ".write": "auth != null"` の2行だけにして原因を確認してください。
5. プロジェクトの設定 →「マイアプリ」→ ウェブアプリ(`</>`)を追加し、表示される `firebaseConfig` の値を、`config.js` に転記する。`databaseURL` は Realtime Database の画面に表示されるURLです。
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
6. 管理者・GMの登録: トップページ(ハブ)を開き、「Googleでログイン」を押す。表示された `UID` を控える(「コピー」ボタンでコピーできます)。Realtime Database の「データ」で、ルートに `admin`(管理者)または `gm`(GM)を作り、その下に `(UID)` というキーで値 `true`(ブール)を追加する。登録済みのアカウントには、トップページの名前の横に「(管理者)」「(GM)」と表示されます。今は、どちらも同じ権限(戦闘システムにGMとして入れる・全体を書き込める)で、将来、権限を分けられるように役職名を分けています。そのあと戦闘システム(`battle/`)を開き、役割を「GM」にして入室すると入れます。
7. プレイヤーの登録: プレイヤーもトップページでGoogleログインします(観戦はログイン不要)。表示された `UID` を、GMに伝えてください。Realtime Database の「データ」で、ルートに `player` を作り、その下に `(UID)` というキーで、値にそのプレイヤーのキャラのID(キャラクターJSONの `id`。例: `gray`)を文字列で追加します。そのあと、役割を「プレイヤー」にして入室すると、そのキャラが自動で選ばれ、他のキャラは操作できません。複数キャラへの対応は、必要になった時点で追加します。
8. Authentication → 設定 → 承認済みドメインに、公開先のドメイン(`ユーザー名.github.io`)を追加する。

### 無料枠の目安

Spark の Realtime Database は同時接続100・保存1GB・ダウンロード月10GB です。8人卓なら余裕があります。

## GitHub Pages で公開する

1. この一式をリポジトリに置く(`image/` と `battle/` を含め、構成のとおりに置きます)。
2. リポジトリの Settings → Pages → Branch を `main` / `/ (root)` にして保存する。
3. 数分後に `https://ユーザー名.github.io/リポジトリ名/` で開けます。戦闘システムは、その下の `battle/` です。

## キャラクターシート

- 入口は `character/`(メインページの「キャラクターシート」から入れます)。囚人ごとのページは `character/<囚人ID>/index.html` です(試験用: `character/gray/`)。
- 表示するデータは `data/` のJSONで、管理者がGitHubに置きます。プレイヤーは書き換えられません。
  - `data/prisoners.json`: 囚人(名前、立ち絵・アイコン・背景の画像、所持している人格・E.G.OのID、装備の初期値 `default`)
  - `data/<囚人ID>/identities.json`: その囚人の人格(名前、所属、レアリティ、体力、速度、耐性の倍率 `resist`、スキル1〜3、守備)
  - `data/<囚人ID>/egos.json`: その囚人のE.G.O(ランク、名前、罪悪、物理属性、基礎威力、コイン威力、コイン枚数)
  - 人格・E.G.OのIDは囚人ごとに独立しているので、別の囚人に同じ名前の人格があっても、性能は囚人ごとに別に書けます。`prisoners.json` の `identities` `egos` `default` には、その囚人のフォルダ内のIDを書きます。
- Firebase に保存するのは、説明・メモ・装備です(`characters/<囚人ID>`)。装備が未保存のときは、`data/prisoners.json` の `default` を表示します。
- 囚人を増やすには、`data/prisoners.json` に追記して `data/<囚人ID>/` に人格・E.G.Oを置き、`character/<囚人ID>/index.html` を `character/gray/index.html` からコピーして `data-prisoner` を書き換えます。画像は `image/character/<囚人ID>/` に `portrait.png`(立ち絵)・`icon.png`(アイコン)・`bg.png`(立ち絵の背景)を置き、`data/prisoners.json` の `portrait` `icon` `background` で指定します。レアリティ画像は `image/icon/rarity/<レア>.png`(例: レア1は `1.png`)で、人格の `rarity` にその数字を書きます。
- 閲覧は全員、説明・メモの編集は管理者と担当プレイヤー、装備の変更はこれに加えてGMが可能です(装備の変更画面は未実装)。
- 今のところ、スマートフォンでは PC 版と同じ画面を横スクロールで表示します(見栄えの調整は後で行います)。
