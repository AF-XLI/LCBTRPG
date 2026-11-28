# LCBTRPG

LimbusCompanyを元にした二次創作TRPG「LCBTRPG」のサイトです。GitHub Pages(静的ホスティング)+ Firebase(無料のSparkプラン)で動きます。ビルド作業は不要で、ファイルをそのまま置くだけで動きます。

## 構成

| 場所 | 役割 |
| --- | --- |
| `index.html`, `style.css`, `script.js` | メインページ(ハブ)。Googleログイン・ログアウトと、各ページへのリンク |
| `config.js` | Firebase の接続情報(全ページ共通。ここだけ書き換えます) |
| `battle/` | 戦闘システム(説明は [battle/README.md](battle/README.md)) |
| `character/` | キャラクターシート(`character/index.html` 1枚で、ハブと囚人ごとのページを兼ねます。説明は下の「キャラクターシート」) |
| `extraction/` | 抽出(人格のガチャ)。チケットを使って、未所持の人格を1つずつ引きます。GMはチケットと人格を付与できます |
| `data/` | キャラクターシートのマスターデータ(JSON。`prisoners.json` と、囚人ごとのフォルダ `data/<囚人ID>/` に人格・E.G.O) |
| `shared/` | キャラクターシートと戦闘システムで共用するスクリプト(`effects.js`: 状態異常・タイミング・効果の種類と、その表示・戦闘用の処理 / `bgm.js`: BGM / `loading.js`・`loading.css`: 読み込み中の黒画面とクルクル / `keywords.js`: 人格のキーワードの読み取りと判定 / `sheet.js`・`sheet.css`: 人格の詳細の描画と操作。色の変数(`--gold` など)は、`sheet.css` の `.sheet` と `character/style.css` の `:root` の両方にあります) |
| `tools/` | データの検査ツール(`node tools/validate.js` で `data/` の人格・E.G.Oの誤りを調べます) |
| `audio/` | BGMの音声ファイル(`window.mp3`: メインページ・キャラクターシート用 / `extract.mp3`: 抽出用) |
| `image/` | 画像(各ページで共用) |

## ログインと役職

- ログインはメインページで行います。戦闘システムなど各ページは、メインページでのログイン状態を使います。
- 役職は、データベースの `admin`(管理者)・`gm`(GM)・`player`(プレイヤーの持ちキャラ)に、アカウントのUIDを登録して決めます。登録のしかたは、下の Firebase の設定の手順6・7にあります。
- 管理者とGMは、今は同じ権限です。将来、権限を分けられるように、役職名を分けています。
- 観戦は、ログインなしで入れます。

## BGM

- メインページ・キャラクターシート(ハブと囚人ページ)は `audio/window.mp3`、抽出は `audio/extract.mp3` を流します。戦闘システムは無音です。音声ファイルは自分で `audio/` フォルダに置きます(ファイルが無いときは、メインページのBGM欄にその旨が出ます)。
- 初期状態はOFFです。ON/OFFと音量は、メインページの「BGM」欄だけで変えます。設定はそのブラウザに保存されます。
- ページを離れてから10秒以内に開いたページでは、曲は続きの位置から再開します。それより間が空いたとき(抽出や戦闘に移ってしばらくしてから戻ったときなど)は、最初から始まります。ブラウザの自動再生の制限で、移動先で鳴り始めないときは、画面の最初のタップ(クリック・キー入力)で再開します。
- Chrome・Edge・Operaは、リンクでページを移動すれば、続けて鳴ることが多いです。Firefoxは、アドレスバーのサイト設定で、このサイトの音声と動画の自動再生を一度許可すると、続けて鳴ります。iPhone・iPad(Safari)は、移動のたびに最初のタップが必要になることが多いです。
- 仕組みは `shared/bgm.js` にあります。使うページの `script` タグに `data-track="audio/○○.mp3"` を書いて読み込みます。

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
           "egos": { ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || root.child('player').child(auth.uid).val() === $cid" },
           "owned": {
             "$pid": {
               ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || (root.child('player').child(auth.uid).val() === $cid && !data.exists() && newData.val() === true && newData.parent().parent().child('tickets').val() === data.parent().parent().child('tickets').val() - 1)",
               ".validate": "newData.val() === true"
             }
           },
           "tickets": {
             ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || (root.child('player').child(auth.uid).val() === $cid && newData.isNumber() && newData.val() === data.val() - 1)",
             ".validate": "newData.isNumber() && newData.val() >= 0"
           },
           "pickup": { ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || root.child('player').child(auth.uid).val() === $cid" },
           "history": {
             "$h": {
               ".write": "root.child('admin').child(auth.uid).val() === true || root.child('gm').child(auth.uid).val() === true || (root.child('player').child(auth.uid).val() === $cid && !data.exists())",
               ".validate": "newData.hasChildren(['id', 'at'])"
             }
           }
         }
       }
     }
   }
   ```
   `characters/<囚人ID>` はキャラクターシートの保存先です。誰でも読めます(ログイン不要)。`desc`(説明)と `memo`(メモ)は、管理者と、その囚人の担当プレイヤー(`player/<UID>` がその囚人のID)だけが書き込めます。`identity`(装備中の人格)と `egos`(装備中のE.G.O)は、これに加えてGMも書き込めます(装備の変更画面は、人格の詳細ページにあります)。
   `owned`(入手済みの人格)・`tickets`(抽出チケットの枚数)・`pickup`(ピックアップに選んだ人格)は抽出用です。`owned` は、キーが人格ID・値が `true` の形で、管理者とGMが自由に付与・剥奪できます。プレイヤーは、チケットを1枚減らすのと同時にだけ、自分の囚人の `owned` を1つ増やせます(抽出ページの動作です)。`tickets` を増やせるのは、管理者とGMだけです。
   `history`(抽出履歴)は、抽出するたびに、引いた人格と日時が1件ずつ追加されます(追加だけで、書き換えはできません)。履歴の保存に失敗しても、抽出自体は成立します。
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

- 入口は `character/`(メインページの「キャラクターシート」から入れます)。ハブも囚人ごとのページも `character/index.html` 1枚で、アドレスの `#` 以降で切り替えます(ハブ `character/`、囚人ページ `character/#/<囚人ID>`、人格画面 `character/#/<囚人ID>/identities/<人格ID>`、人格一覧 `.../identities`、E.G.O一覧 `.../egos`。試験用: `character/#/gray`)。画面の切り替えではページを読み込み直さないので、BGMは途切れません。
- 表示するデータは `data/` のJSONで、管理者がGitHubに置きます。プレイヤーは書き換えられません。
  - `data/prisoners.json`: 囚人(名前、立ち絵・アイコン・背景の画像、所持している人格・E.G.OのID、装備の初期値 `default`)
  - `data/<囚人ID>/identities.json`: その囚人の人格(名前、キーワード `keywords`、レアリティ、体力、速度、混乱区間 `thr`、耐性の倍率 `resist`、スキル1〜3、守備、パッシブ、サポートパッシブ)
  - `data/<囚人ID>/egos.json`: その囚人のE.G.O(ランク、名前、罪悪、物理属性、基礎威力、コイン威力、コイン枚数、精神消耗量、必要資源、耐性、効果、パッシブ)
  - スキル・パッシブ・E.G.Oの効果は `effects` に1効果ずつ書きます(書き方は [battle/README.md](battle/README.md) の「効果(effects)」)。表示は効果から自動で作られ、戦闘システムも同じデータを読みます。
  - 人格・E.G.OのIDは囚人ごとに独立しているので、別の囚人に同じ名前の人格があっても、性能は囚人ごとに別に書けます。`prisoners.json` の `identities` `egos` `default` には、その囚人のフォルダ内のIDを書きます。
- Firebase に保存するのは、説明・メモ・装備です(`characters/<囚人ID>`)。装備が未保存のときは、`data/prisoners.json` の `default` を表示します。
- 囚人を増やすには、`data/prisoners.json` に追記して `data/<囚人ID>/` に人格・E.G.Oを置きます。ページの追加は不要で、`data/prisoners.json` に書いた囚人は、そのまま `character/#/<囚人ID>` で開けます。画像は `image/character/<囚人ID>/` に `portrait.png`(立ち絵)・`icon.png`(アイコン)・`bg.png`(立ち絵の背景)を置き、`data/prisoners.json` の `portrait` `icon` `background` で指定します。レアリティ画像は `image/icon/rarity/<レア>.png`(例: レア1は `1.png`)で、人格の `rarity` にその数字を書きます。
- 人格の立ち絵: `stageImage`(立ち絵と背景が1枚)があればそれを、`portrait`(立ち絵のみ)があれば囚人の背景に重ねて表示します。囚人の既定の人格は囚人の立ち絵、どれも無ければプレースホルダーです。抽出ページの人格カードも同じ規則です。
- 戦闘用の囚人データ(`shared/roster.js`)は、装備を Firebase の `characters/<囚人ID>` から読み、無ければ `default` の装備を使います。
- 閲覧は全員、説明・メモの編集は管理者と担当プレイヤー、装備の変更はこれに加えてGMが可能です(装備の変更画面は未実装)。
- 今のところ、スマートフォンでは PC 版と同じ画面を横スクロールで表示します(見栄えの調整は後で行います)。

## 人格の入手と抽出

- 人格データ(`data/<囚人ID>/identities.json`)には、入手のしかたを決める項目があります。
  - `initial: true`: 初期人格。最初から所持していて、抽出には出ません。囚人の既定の人格には、必ず付けます。
  - `season`: 登場するシーズン(`data/seasons.json` のキー。例: `season-1`)。そのシーズンが未公開(`released: false`)の間は、どのページにも出ません。シーズン名は、人格の詳細ページだけに表示されます。
  - どちらもない人格: 恒常人格。すぐに公開され、抽出で入手できます。シーズンの表示はありません。
- 未所持の人格は、人格一覧では「所持のみ」と「未所持も表示」(グレー表示)を切り替えられます。未所持の人格は装備できません。
- 入手済みの人格は、Realtime Database の `characters/<囚人ID>/owned/<人格ID>` に `true` で保存されます。配布の人格や、クリア報酬の人格は、抽出ページのGM操作(人格の付与・剥奪)から渡せます。データベースの画面から直接追加しても構いません。
- 抽出ページ(`extraction/`)は、ログインした本人の囚人だけを表示します。管理者とGMは、囚人を切り替えて、チケットと人格を付与できます。
- 抽出のルール: 人格のみ・被りなし・1枚で1回(単発)・確率は均等です。ピックアップに選んだ人格は、確率が3倍になります(倍率は `extraction/script.js` の `PICKUP_RATE`)。
- `node tools/validate.js` は、`season` が `data/seasons.json` にあるか、既定の人格が初期人格か、なども調べます。

## 読み込み中の表示

- 全ページの `head` で `shared/loading.css` と `shared/loading.js` を読み込み、表示の準備が整うまで画面全体を黒くして中央に回転する円弧と LOADING を出します。
- 各ページのスクリプトが準備完了時に `LC_LOADING.done()` を呼ぶと消えます。呼ばれなかった場合も10秒で消えます。
- `LC_LOADING.doneAfterImages(要素)` は、要素内の画像(背景画像を含む)が読み込み終わってから消します(画像が来なくても5秒で消えます)。`LC_LOADING.show()` は、ページ内で画面を切り替えるときにもう一度Loadingを出します。

## 実装メモ

- メインページ(`script.js`)のデータベース読み取りは、ルールの不備や接続不良で返事が来ないときも、表示が「確認しています…」のまま止まらないようにしています。
- キャラクターシート(`character/script.js`)は、保存済みの装備を読み込むまで人格を描画しません(既定の人格が一瞬映るのを防ぐため)。囚人を切り替えるときは前の囚人のデータの購読を外します。通信が遅い・途切れている場合でも、画面が空のままにならないよう、一定時間で表示します。
- 抽出ページ(`extraction/script.js`)は、立ち絵の上半身(画像の高さの20〜50%)の横方向の重心を測り、枠の中央に被写体が来るように補正します。
- 人格の詳細(スキル・パッシブ・ステータス・耐性・装備ボタン)の描画と操作は、`shared/sheet.js`(`LCSheet`)と `shared/sheet.css` にまとめてあります。キャラクターシートの囚人ページ・人格ページ、抽出の詳細、今後の戦闘の詳細は、どれもこの部品を使います。`LCSheet.mount(要素, 設定)` で詳細を描画し、設定の `equip`(`on` / `unowned` / `can` / `none`)で装備ボタンの表示を、`actionHtml` でそのボタンの位置に別の部品(戦闘の体力バーなど)を差し込めます。
- 抽出の詳細(虫眼鏡・「詳細を見る」)は、抽出ページの上に重ねて開きます。BGMは切り替わりません。閉じるには、戻るボタン、Escキー、ブラウザの戻るのどれかを使います。装備を確定したときも閉じます。Ctrl・Shift・中クリックでリンクを開くと、従来どおり別タブで開きます。

## キーワード

- 人格の `keywords` は配列です。要素は文字列、または打消し線つきの `{ "text": "W社", "strike": true }` です。打消し線は見た目だけで、効果・パッシブの判定には影響しません。
- 判定には `LC_KEYWORDS.has(identity, '○○')`(完全一致)または `LC_KEYWORDS.names(identity)` を使います。
