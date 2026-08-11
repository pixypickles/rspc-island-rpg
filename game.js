(() => {
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const touchUI = document.getElementById('touchUI');
const stickBase = document.getElementById('stickBase');
const stickKnob = document.getElementById('stickKnob');
const actionBtn = document.getElementById('actionBtn');
const nameOverlay = document.getElementById('nameOverlay');
const nameInput = document.getElementById('nameInput');
const nameOk = document.getElementById('nameOk');

const W = 960, H = 540;
let scene = 'title';
let titleSelection=0;
let autosaveTimer=0;
let lastFieldScene='world';

let last = performance.now();
let keys = {};
let dialogIndex = 0;
let flashText = '';
let flashTimer = 0;
let villageEventStarted = false;
let heroName = localStorage.getItem('risupekuHeroName') || 'ぴくるす';

let progress = JSON.parse(localStorage.getItem('risupekuProgress') || 'null') || {
  level:1, exp:0, sp:0,
  maxHP:42, maxMP:24, atk:8, def:5,
  learned:{ waterHeal:true, icePebble:true, iceSlash:false }
};
if(progress.gold===undefined) progress.gold=90;
if(!progress.items) progress.items={potion:0};



function suzuSingleSkillName(){
  const lv=progress.suzuSkills?.single||0;
  if(lv>=3)return '豪炎爆斬';
  if(lv>=2)return '爆炎斬り';
  return '火炎斬り';
}
function suzuAllSkillName(){
  const lv=progress.suzuSkills?.all||0;
  if(lv>=3)return '烈火走陣';
  if(lv>=2)return '炎走陣';
  return '火走り';
}
function heroIceSkillName(){
  const lv=progress.heroIceSkill||0;
  if(lv>=3)return '氷結三連斬り';
  if(lv>=2)return '氷結二段斬り';
  return '氷結斬り';
}
function heroIceHits(){
  const lv=progress.heroIceSkill||0;
  return lv>=3?3:lv>=2?2:1;
}
if(progress.heroIceSkill===undefined){
  progress.heroIceSkill=progress.learned?.iceSlash?1:0;
}

function partyLevel(){ return progress.level; }

function heroStats(){
  return {
    maxHP:progress.maxHP,
    maxMP:progress.maxMP,
    atk:progress.atk,
    def:progress.def
  };
}

function suzumaruStats(){
  const lv=partyLevel();
  // Lv1 baseline + character-specific growth.
  // Suzumaru: HP / ATK high, MP low, DEF slightly below hero.
  return {
    maxHP:50+(lv-1)*7,
    maxMP:18+(lv-1)*2,
    atk:11+(lv-1)*3,
    def:4+(lv-1)*1
  };
}

function yunoStats(){
  const lv=partyLevel();
  return {
    maxHP:42+(lv-1)*5,
    maxMP:30+(lv-1)*4,
    atk:9+(lv-1)*2,
    def:5+(lv-1)
  };
}

function totalSPForLevel(level){
  // Lv1 starts with 0, each level-up grants 1.
  return Math.max(0, level-1);
}

if(progress.suzuSP===undefined){
  progress.suzuSP=totalSPForLevel(progress.level);
}
if(progress.suzuSpentSP===undefined){
  {
  const s=progress.suzuSkills?.single||0,a=progress.suzuSkills?.all||0;
  const spent=n=>n<=0?0:n===1?1:n===2?3:6;
  progress.suzuSpentSP=spent(s)+spent(a);
}
  progress.suzuSP=Math.max(0,totalSPForLevel(progress.level)-progress.suzuSpentSP);
}

if(progress.yunoSP===undefined) progress.yunoSP=totalSPForLevel(progress.level);
if(!progress.yunoSkills)progress.yunoSkills={heal:0,regen:0,wind:0,haste:0,evade:0,evadeAll:0};


if(!progress.suzuSkills) progress.suzuSkills={
  single:0,   // 火炎斬り系：主力。伸び幅を大きくする
  all:0       // 火走り系：全体攻撃。伸ばせるが単体ほど火力効率は上がらない
};
saveProgress();
if(!progress.shopBought) progress.shopBought={fireBlade:false};
if(progress.shopBought.windKnife===undefined) progress.shopBought.windKnife=false;
saveProgress();

function saveProgress(){
  localStorage.setItem('risupekuProgress', JSON.stringify(progress));
}
function expNeeded(level){ return 22 + (level-1)*18; }
function gainExp(amount){
  progress.exp += amount;
  let leveled = false;
  while(progress.exp >= expNeeded(progress.level)){
    progress.exp -= expNeeded(progress.level);
    progress.level++;
progress.sp++;
    if(progress.suzuSP!==undefined)progress.suzuSP++;
    if(progress.yunoSP!==undefined)progress.yunoSP++;
    progress.maxHP += 6;
    progress.maxMP += 3;
    progress.atk += 2;
    progress.def += 1;
    leveled = true;
  }
  saveProgress();
  return leveled;
}

const dash = {x:1960,y:180,speed:178};
const hero = {x:360,y:300,speed:175};
const camera = {x:0,y:0};

let battle = null;
let battleMessage = '';
let battleMenu = 'main';
let battleActor='hero';
let battleCooldown = 0;
let caveHero={x:150,y:760,speed:230};
let caveBoss={x:1540,y:300,alive:true,hp:95,maxHP:95};
let caveBattle=false;
let caveCrystalTaken=false;
let caveMobs=[
  {id:201,name:'ヤキトカゲ',kind:'emberLizard',x:520,y:700,spawnX:520,spawnY:700,alive:true,hp:32,maxHP:32,respawn:0},
  {id:202,name:'トウガラネズミ',kind:'pepperMouse',x:910,y:520,spawnX:910,spawnY:520,alive:true,hp:36,maxHP:36,respawn:0},
  {id:203,name:'イワモグラ',kind:'rockMole',x:1270,y:420,spawnX:1270,spawnY:420,alive:true,hp:42,maxHP:42,respawn:0}
];
let suzumaruActive=false;
let suzumaruJoined=false;
let townHero={x:330,y:385,speed:210};
let shopType='weapon';
let battleFx={type:'',timer:0,x:0,y:0};
let battleChoiceText={hero:'未選択',suzu:'未選択'};
let damagePopups=[];
let route3Hero={x:210,y:760,speed:220};
let route3Mobs=[
  {id:301,name:'ダイコンフェレット',kind:'radishFerret',x:620,y:590,spawnX:620,spawnY:590,alive:true,hp:46,maxHP:46,respawn:0},
  {id:302,name:'ソラマメテン',kind:'beanMarten',x:1120,y:420,spawnX:1120,spawnY:420,alive:true,hp:50,maxHP:50,respawn:0},
  {id:303,name:'モモイタチ',kind:'peachWeasel',x:1600,y:300,spawnX:1600,spawnY:300,alive:true,hp:54,maxHP:54,respawn:0}
];
let sarubibiQuestStarted=false;
let yunoJoined=false;
let nightTrailStep=0;
let nightHero={x:170,y:760,speed:205};

let sarubibiHero={x:330,y:390,speed:210};
let takezoHero={x:150,y:760,speed:210};
let takezoWave=0;
let takezoIntroDone=false;
let takezoMobs=[
  {id:401,x:720,y:610,spawnX:720,spawnY:610,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:58,maxHP:58},
  {id:402,x:1030,y:500,spawnX:1030,spawnY:500,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:62,maxHP:62},
  {id:403,x:1320,y:390,spawnX:1320,spawnY:390,alive:true,name:'海賊タヌキ斥候',kind:'pirateTanuki',hp:66,maxHP:66}
];


function repairTakezoSquads(){
  const defs=[
    {id:401,x:620,y:480,spawnX:620,spawnY:480,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:58,maxHP:58},
    {id:402,x:980,y:420,spawnX:980,spawnY:420,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:62,maxHP:62},
    {id:403,x:1280,y:350,spawnX:1280,spawnY:350,alive:true,name:'海賊タヌキ斥候',kind:'pirateTanuki',hp:66,maxHP:66}
  ];
  for(const d of defs){
    if(!takezoMobs.some(m=>m.id===d.id))takezoMobs.push({...d});
  }
  // v0.28 saves could leave only two accessible squads. If the third was never
  // actually defeated, keep it present and accessible.
  const third=takezoMobs.find(m=>m.id===403);
  if(third && !takezoIntroDone && takezoMobs.filter(m=>!m.alive).length<3){
    third.x=1280;third.y=350;
  }
}
repairTakezoSquads();

let sarubibiShopType='weapon';




let menuPage = 'status';
let menuCharacter='hero';
let menuReturnScene='road2';

const prologue = [
  ['narrator','島の外での巡業を終えた「ちぇすたぴサーカス団」は、故郷・りすぺく島へ帰ろうとしていた。'],
  ['narrator','けれど、その船を遠くから見つめるオレンジ色の船影があった。'],
  ['pirate','……あの派手な船、つけてみるか。'],
  ['narrator','サーカス団は尾行に気づかないまま、りすぺく島へ帰還した。'],
  ['narrator','そして、その夜――。'],
  ['dash','……んぅ。なんか外、うるさいな……。'],
  ['narrator','船の中で寝ていたダッシュミウが窓をのぞくと、仲間たちは海賊たちに囲まれていた。'],
  ['pirate','この島には村が4つあるんだな？ 場所は……まあ、明るくなってから探せばいい。'],
  ['dash','……！　先に知らせなきゃ。みんなが捕まったことも、海賊が来たことも！'],
  ['narrator','ダッシュミウは船の反対側からこっそり降り、最も近いぶりふぉ村へ走り出した。']
];

function villageDialog(){
  return [
    ['dash','だ、誰かーっ！　起きてーっ！　大変なんだってばーっ！'],
    ['elder','……ダッシュミウ？ こんな夜更けにどうした。'],
    ['dash','サーカス団が海賊に襲われた！ みんな捕まってる！ 拳銃とか、マシンガンとか……！'],
    ['elder','……すぐに皆を起こせ。サーカス団側の道は氷壁で塞ぐ。'],
    ['dash','えっ、そんな大きいの作れるの！？'],
    ['elder','ぶりふぉ村を甘く見るな。水と氷なら、できる。'],
    ['elder','だが、壁を作る者も村を守る者も必要だ。残りの村へ知らせる者が足りないな……。'],
    ['dash','……あれ？ なんでみんな、そこの人を見てるの？'],
    ['hero','…………。'],
    ['elder',`${heroName}。頼めるか？`],
    ['hero','……分かった。行ってくる。'],
    ['narrator',`${heroName}とダッシュミウは、海賊より先に残る3つの村へ知らせるため旅立つことになった。`]
  ];
}

const departureDialog = [
  ['elder','まずは、さるびえ村へ向かえ。外周の道を進めば迷うことはない。'],
  ['elder','無理に戦う必要はない。だが、野生モンスターに絡まれたら落ち着いて対処しろ。'],
  ['dash','ボクは戦えないからね！ そこ大事だからね！'],
  ['hero','分かってる。'],
  ['elder','お前は魔法が得意だ。水の癒やしも、氷の術も使いこなせるはずだ。'],
  ['elder','必要な時だけでいい。力を貸してくれ。'],
  ['hero','……うん。']
];

const sarubieArrivalDialog = [
  ['dash','ここが、さるびえ村……で合ってるよね？'],
  ['hero','うん。'],
  ['dash','なんか……村のみんな、海賊どころじゃない顔してない？'],
  ['suzu','その通り。悪いけど、今は島の外より山の方がまずい。'],
  ['dash','え？'],
  ['suzu','中央火山の揺れが強くなってる。鎮めの儀式を急がないと、噴火する。'],
  ['dash','噴火！？ ちょっと待って！ 海賊の次は火山！？'],
  ['suzu','順番が逆だな。火山が先だ。海賊はそのあと。'],
  ['dash','落ち着きすぎじゃない！？'],
  ['suzu','慌てても噴火は止まらない。まず必要なものを揃える。'],
  ['hero','何が足りないの？'],
  ['suzu','儀式に使う炎晶石。山の麓の洞窟に取りに行く。'],
  ['suzu','海賊の話も聞く。でも、島そのものが無くなったら意味がない。手を貸してくれるか？'],
  ['hero','もちろん。'],
  ['narrator','スズマルが一時的に仲間になった！']
];

const sarubieRitualDialog = [
  ['narrator','炎晶石を手に、3人はさるびえ村へ戻った。'],
  ['suzu','間に合った。すぐ儀式を始める。'],
  ['dash','これで本当に噴火、止まるんだよね？'],
  ['suzu','止める。というより、火山の力を落ち着かせる。'],
  ['narrator','村人たちは祭壇を囲み、炎晶石へ少しずつ炎の魔力を注いでいく。'],
  ['narrator','赤く脈打っていた火山の光が、ゆっくりと静まっていった。'],
  ['dash','……揺れ、止まった？'],
  ['suzu','ああ。これでしばらくは大丈夫だ。'],
  ['dash','よかったぁ……海賊と火山を同時に相手にするところだった……。'],
  ['hero','じゃあ、次はさるびび村へ知らせないと。'],
  ['suzu','俺も行く。'],
  ['dash','村は大丈夫なの？'],
  ['suzu','火山は落ち着いた。あとは村のみんなで守れる。'],
  ['suzu','それに、島を守るなら次の村へ急いだ方がいい。'],
  ['narrator','スズマルが正式に仲間になった！']
];

const sarubibiArrivalDialog = [
  ['narrator','火山を鎮めた一行は、次の村・さるびび村へ急いだ。'],
  ['yuno','話は聞いた。クラウス海賊団が来たんだね。'],
  ['dash','早い！ まだほとんど説明してないのに！'],
  ['yuno','状況から考えれば、その可能性が一番高い。'],
  ['suzu','助かる。なら防衛の準備を――'],
  ['yuno','それが、ひとつ問題がある。'],
  ['dash','また！？'],
  ['yuno','防衛隊長が、ほとんど仕事にならない。'],
  ['captain','……もう、どうでもいいんだ……。'],
  ['hero','何があったの？'],
  ['captain','恋人が最近、俺より大事なものを見つけたみたいでさ……。'],
  ['dash','この島、今かなり大変なんだけど！？'],
  ['captain','夜になると毎晩どこかへ行く。俺には何も話してくれない。'],
  ['yuno','説得も推理も試したけど、感情の問題はどうも苦手でね。'],
  ['dash','ユーノにも苦手分野あるんだ……。'],
  ['yuno','あるよ。むしろ、かなりある。'],
  ['hero','今夜、後を追ってみよう。何をしてるのか分かれば話せるかもしれない。'],
  ['captain','……頼めるなら。'],
  ['narrator','今夜、防衛隊長の恋人をこっそり追うことになった。']
];


const takezoDepartureDialog=[
  ['narrator','翌朝。一行は島の外周路を急ぎ、最後の村――たけぞ村へ向かった。'],
  ['dash','ここまで来れば、あと少し！'],
  ['yuno','待って。海の方から魔力反応が続いてる。'],
  ['suzu','……戦ってるな。'],
  ['hero','急ごう。']
];

const takezoArrivalDialog=[
  ['narrator','たけぞ村の手前では、すでに海賊の先行部隊との戦闘が始まっていた。'],
  ['guard','防壁を下げるな！ 魔力が切れるまで耐えろ！'],
  ['yuno','村の守りは硬い。でも相手は兵器混じりだ。疲労の差で押し切られる。'],
  ['dash','じゃあ、こっちから数を減らそう！'],
  ['suzu','三小隊。順番に潰すぞ。'],
  ['hero','うん。村まで道を開けよう！']
];

const takezoReliefDialog=[
  ['narrator','最後の海賊小隊が退き、たけぞ村の防壁の前に静けさが戻った。'],
  ['guard','助かった……！ あと少し遅ければ、こちらの魔力が尽きていた。'],
  ['yuno','先行部隊だけでこれか。次はもっと多いはず。'],
  ['suzu','なら、来る前に準備する。'],
  ['dash','ぶりふぉ村の氷壁も、いつまでも持つわけじゃないもんね。'],
  ['hero','ここで第2陣を迎え撃つ準備をしよう。'],
  ['narrator','一行はたけぞ村へ入り、数日後に来る第2陣への備えを始めることにした。']
];

const sarubibiNightDialog = [
  ['narrator','夜。防衛隊長の恋人は、ひとりで村の外へ歩き出した。'],
  ['dash','ほんとに毎晩出かけてる……。'],
  ['yuno','距離を空けよう。近づきすぎると気づかれる。'],
  ['suzu','こういうの、お前は得意そうだな。'],
  ['yuno','観察は得意。恋愛は苦手。別の能力だよ。'],
  ['dash','そこはきっぱり言うんだ……。'],
  ['narrator','一行は物陰に隠れながら、静かに後を追った。']
];

const tsukipopoRevealDialog = [
  ['narrator','恋人が向かった先には、淡く光る小さな花の群れがあった。'],
  ['hero','……花？'],
  ['yuno','ツキポポ。夜にだけ開いて、風の魔力を溜める植物だ。'],
  ['dash','かわいい……って、これを見に来てたの？'],
  ['lover','見に来てたんじゃないの。育ててたの。'],
  ['dash','えっ。'],
  ['lover','弱ってるツキポポを見つけて、毎晩こっそり世話してた。'],
  ['hero','どうして隊長に言わなかったの？'],
  ['lover','あの人、昔から光る植物が苦手だって言ってたから……。'],
  ['yuno','なるほど。秘密の理由はそれだけか。'],
  ['dash','それだけって言い方！ 隊長は人生終わったみたいになってたよ！'],
  ['lover','えっ！？'],
  ['narrator','事情を聞いた一行は、防衛隊長のもとへ戻った。']
];

const sarubibiResolveDialog = [
  ['captain','……ツキポポ？'],
  ['lover','ごめんね。嫌いだと思ってたから、言えなくて。'],
  ['captain','苦手ではあるけど……そこまでじゃない。'],
  ['lover','ほんと？'],
  ['captain','それより、俺が勝手に変な想像して仕事まで放り出してたのが恥ずかしい……。'],
  ['dash','そこは本当にそう。'],
  ['yuno','ダッシュミウ、容赦ないね。'],
  ['captain','ツキポポ、村で育ててもいいよ。夜の見回りついでに俺も手伝う。'],
  ['lover','ありがとう！'],
  ['narrator','防衛隊長は元気を取り戻し、防衛隊へ復帰した。'],
  ['captain','海賊が来るなら、今度こそ仕事する。村は任せてくれ。'],
  ['hero','ユーノ、次の村へ一緒に来てくれる？'],
  ['yuno','もちろん。ここまで来たら、最後まで状況を見届けたい。'],
  ['dash','仲間がまた増えた！'],
  ['narrator','ユーノが正式に仲間になった！']
];





const world = { width:2400, height:1250 };
const road2 = { width:2200, height:1550 };
const monsters = [
  {id:1,name:'リンゴリス',kind:'appleSquirrel',x:720,y:570,spawnX:720,spawnY:570,alive:true,hp:24,maxHP:24,respawn:0},
  {id:2,name:'モモモモンガ',kind:'peachGlider',x:1210,y:890,spawnX:1210,spawnY:890,alive:true,hp:30,maxHP:30,respawn:0},
  {id:3,name:'カボチャガニ',kind:'pumpkinCrab',x:1710,y:1190,spawnX:1710,spawnY:1190,alive:true,hp:38,maxHP:38,respawn:0}
];

function battleTop(){
  // Keep battle status below mobile browser chrome on short landscape screens.
  return hudTop()+34;
}
function hudTop(){
  const h = window.innerHeight || 540;
  return h < 500 ? 74 : 20;
}

function saveGame(){
  if(scene==='title'||scene==='cutscene'||scene==='battle'||scene==='shop'||scene==='sarubibiShop')return;

  if(['world','road2','cave','route3','sarubieTown','sarubibiTown','takezoRoute'].includes(scene)){
    lastFieldScene=scene;
  }

  const data={
    version:21,
    scene,
    lastFieldScene,
    heroName,
    villageEventStarted,
    suzumaruActive,
    suzumaruJoined,
    caveCrystalTaken,
    caveBossAlive:caveBoss.alive,
    caveBossHP:caveBoss.hp,
    sarubibiQuestStarted,
    yunoJoined,
    takezoIntroDone,
    takezoHero:{x:takezoHero.x,y:takezoHero.y},
    takezoMobs:takezoMobs.map(m=>({id:m.id,alive:m.alive,x:m.x,y:m.y})),
    dash:{x:dash.x,y:dash.y},
    hero:{x:hero.x,y:hero.y},
    caveHero:{x:caveHero.x,y:caveHero.y},
    route3Hero:{x:route3Hero.x,y:route3Hero.y},
    townHero:{x:townHero.x,y:townHero.y},
    sarubibiHero:{x:sarubibiHero.x,y:sarubibiHero.y},
    monsters:monsters.map(m=>({id:m.id,alive:m.alive,respawn:m.respawn,x:m.x,y:m.y})),
    caveMobs:caveMobs.map(m=>({id:m.id,alive:m.alive,respawn:m.respawn,x:m.x,y:m.y})),
    route3Mobs:route3Mobs.map(m=>({id:m.id,alive:m.alive,respawn:m.respawn,x:m.x,y:m.y}))
  };
  localStorage.setItem('risupekuSave',JSON.stringify(data));
}
function hasSaveGame(){
  return !!localStorage.getItem('risupekuSave');
}
function restoreList(target,saved){
  if(!Array.isArray(saved))return;
  for(const s of saved){
    const m=target.find(v=>v.id===s.id);
    if(!m)continue;
    if(typeof s.alive==='boolean')m.alive=s.alive;
    if(Number.isFinite(s.respawn))m.respawn=s.respawn;
    if(Number.isFinite(s.x))m.x=s.x;
    if(Number.isFinite(s.y))m.y=s.y;
  }
}
function loadGame(){
  const raw=localStorage.getItem('risupekuSave');
  if(!raw)return false;
  try{
    const d=JSON.parse(raw);
    heroName=d.heroName||heroName||'ぴくるす';
    localStorage.setItem('risupekuHeroName',heroName);

    villageEventStarted=!!d.villageEventStarted;
    suzumaruActive=!!d.suzumaruActive;
    suzumaruJoined=!!d.suzumaruJoined;
    caveCrystalTaken=!!d.caveCrystalTaken;
    if(typeof d.caveBossAlive==='boolean')caveBoss.alive=d.caveBossAlive;
    if(Number.isFinite(d.caveBossHP))caveBoss.hp=d.caveBossHP;
    sarubibiQuestStarted=!!d.sarubibiQuestStarted;
    yunoJoined=!!d.yunoJoined;
    takezoIntroDone=!!d.takezoIntroDone;

    const apply=(obj,s)=>{if(s){if(Number.isFinite(s.x))obj.x=s.x;if(Number.isFinite(s.y))obj.y=s.y;}};
    apply(dash,d.dash);apply(hero,d.hero);apply(caveHero,d.caveHero);apply(route3Hero,d.route3Hero);
    apply(townHero,d.townHero);apply(sarubibiHero,d.sarubibiHero);apply(takezoHero,d.takezoHero);

    restoreList(monsters,d.monsters);
    restoreList(caveMobs,d.caveMobs);
    restoreList(route3Mobs,d.route3Mobs);restoreList(takezoMobs,d.takezoMobs);repairTakezoSquads();

    lastFieldScene=d.lastFieldScene||'world';
    let target=d.scene||lastFieldScene;

    // Dialogue/cutscene checkpoints resume from the nearest safe playable area.
    const safeMap={
      villageDialog:'world',
      departureDialog:'road2',
      sarubieArrival:'sarubieTown',
      sarubieRitual:'route3',
      sarubibiArrival:'sarubibiTown',
      takezoDeparture:'takezoRoute',
      takezoArrival:'takezoRoute',
      takezoRelief:'takezoRoute',
      end:lastFieldScene
    };
    if(safeMap[target])target=safeMap[target];
    if(target==='battle'||target==='shop'||target==='sarubibiShop'||target==='cutscene'||target==='title'){
      target=lastFieldScene||'world';
    }

    scene=target;
    dialogIndex=0;
    touchUI.classList.remove('hidden');
    flashText='セーブデータから再開しました';
    flashTimer=2.0;
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}
function startNewGame(){
  localStorage.removeItem('risupekuSave');
  localStorage.removeItem('risupekuProgress');
  localStorage.removeItem('risupekuHeroName');
  location.reload();
}
function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=W*dpr;canvas.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
}
resize();addEventListener('resize',resize);

function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function outlineRect(x,y,w,h,fill,stroke='#20324b',lw=2){
  rect(x,y,w,h,fill);ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1);
}
function text(t,x,y,size=24,align='left',color='#fff',weight=700){
  ctx.font=`${weight} ${size}px system-ui,-apple-system,"Yu Gothic",sans-serif`;
  ctx.textAlign=align;ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillText(t,x+2,y+3);ctx.fillStyle=color;ctx.fillText(t,x,y);
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}






function drawCaptainLover(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,18,6,'rgba(23,38,56,.18)');
  ctx.strokeStyle='#c7a678';ctx.lineWidth=7;ctx.beginPath();ctx.arc(18,14,18,-1.25,1.15);ctx.stroke();
  ellipse(-10,-25,5,6,'#d5b98c');ellipse(10,-25,5,6,'#d5b98c');
  ellipse(0,-12,17,15,'#e0c69a');ellipse(0,-4,9,6,'#f1dfbd');
  rect(-8,-14,4,5,'#243149');rect(4,-14,4,5,'#243149');
  rect(-15,4,30,25,'#5bb6ae');rect(-13,5,26,7,'#77ccc0');rect(-3,10,6,17,'#f0efe3');
  rect(-17,8,5,16,'#d5b98c');rect(12,8,5,16,'#d5b98c');
  rect(-13,23,26,4,'#355f6a');
  rect(-12,28,9,12,'#3e7678');rect(3,28,9,12,'#3e7678');
  ctx.restore();
}

function drawDefenseCaptain(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,18,6,'rgba(23,38,56,.22)');
  // longer dark tail
  ctx.strokeStyle='#7f684f';ctx.lineWidth=7;ctx.beginPath();ctx.arc(18,14,18,-1.25,1.15);ctx.stroke();
  // ears/head, warmer/darker than Yuno
  ellipse(-10,-25,5,6,'#9f8563');ellipse(10,-25,5,6,'#9f8563');
  ellipse(0,-12,17,15,'#aa8e69');ellipse(0,-4,9,6,'#d1b58e');
  rect(-8,-14,4,5,'#1f293a');rect(4,-14,4,5,'#1f293a');
  // droopy brows
  rect(-10,-19,7,2,'#5b4c42');rect(3,-19,7,2,'#5b4c42');
  // turquoise/navy defense outfit
  rect(-15,4,30,25,'#276f75');rect(-13,5,26,7,'#348b8c');rect(-3,10,6,17,'#dcebe5');
  rect(-17,8,5,16,'#9f8563');rect(12,8,5,16,'#9f8563');
  rect(-13,23,26,4,'#253b4d');
  // captain sash
  ctx.fillStyle='#173b54';ctx.beginPath();ctx.moveTo(-12,5);ctx.lineTo(-6,5);ctx.lineTo(10,28);ctx.lineTo(4,28);ctx.closePath();ctx.fill();
  rect(-12,28,9,12,'#234c55');rect(3,28,9,12,'#234c55');
  ctx.restore();
}

function drawYuno(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,18,6,'rgba(23,38,56,.22)');
  // long weasel tail
  ctx.strokeStyle='#b99668';ctx.lineWidth=7;ctx.beginPath();ctx.arc(18,14,18,-1.25,1.15);ctx.stroke();
  // ears/head
  ellipse(-10,-25,5,6,'#c8aa78');ellipse(10,-25,5,6,'#c8aa78');
  ellipse(0,-12,17,15,'#d2b583');ellipse(0,-4,9,6,'#ead7ad');
  rect(-8,-14,4,5,'#1d293d');rect(4,-14,4,5,'#1d293d');
  // neat dark hair
  ctx.fillStyle='#3e4d52';ctx.beginPath();ctx.moveTo(-12,-24);ctx.lineTo(-5,-30);ctx.lineTo(0,-25);ctx.lineTo(7,-31);ctx.lineTo(12,-22);ctx.closePath();ctx.fill();
  // turquoise outfit
  rect(-15,4,30,25,'#2c9a9c');rect(-13,5,26,7,'#43b9b5');rect(-3,10,6,17,'#d9f1e8');
  rect(-17,8,5,16,'#c8aa78');rect(12,8,5,16,'#c8aa78');
  rect(-13,23,26,4,'#244b59');
  // bow
  ctx.strokeStyle='#6c4d36';ctx.lineWidth=3;ctx.beginPath();ctx.arc(18,18,12,-1.2,1.2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(22,7);ctx.lineTo(22,29);ctx.stroke();
  rect(-12,28,9,12,'#1d5860');rect(3,28,9,12,'#1d5860');
  ctx.restore();
}
function drawWindHouse(x,y){
  outlineRect(x,y+32,84,62,'#eef5ee','#3a6d73',2);
  ctx.fillStyle='#227f83';ctx.beginPath();ctx.moveTo(x-8,y+34);ctx.lineTo(x+42,y);ctx.lineTo(x+92,y+34);ctx.closePath();ctx.fill();
  rect(x+32,y+59,18,35,'#35aeb0');
  outlineRect(x+10,y+47,17,15,'#bde8e3','#5f8e8a',1);
  outlineRect(x+57,y+47,17,15,'#bde8e3','#5f8e8a',1);
}
function drawSuzumaru(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,18,6,'rgba(23,38,56,.22)');
  ctx.strokeStyle='#8d6a4d';ctx.lineWidth=7;ctx.beginPath();ctx.arc(17,13,16,-1.2,1.2);ctx.stroke();
  ellipse(-10,-26,6,7,'#a77b57');ellipse(10,-26,6,7,'#a77b57');
  ellipse(0,-12,17,16,'#b48761');ellipse(0,-3,10,7,'#d7b08d');
  rect(-8,-14,4,5,'#1d293d');rect(4,-14,4,5,'#1d293d');rect(-2,-6,4,3,'#553b31');
  ctx.fillStyle='#5c4238';ctx.beginPath();ctx.moveTo(-12,-24);ctx.lineTo(-4,-31);ctx.lineTo(0,-24);ctx.lineTo(7,-29);ctx.lineTo(12,-21);ctx.closePath();ctx.fill();
  rect(-15,4,30,25,'#6f2030');rect(-13,5,26,7,'#8e3142');rect(-3,9,6,18,'#f0d8b0');
  rect(-17,8,5,16,'#a77b57');rect(12,8,5,16,'#a77b57');rect(-13,23,26,4,'#382d2c');
  rect(15,10,4,25,'#806343');rect(18,31,12,3,'#c6cbd2');
  rect(-12,28,9,12,'#45252e');rect(3,28,9,12,'#45252e');
  ctx.restore();
}

function drawElderFox(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,19,6,'rgba(23,38,56,.22)');
  // tail
  ctx.fillStyle='#f5f7f8';ctx.beginPath();ctx.moveTo(14,8);ctx.quadraticCurveTo(38,7,34,27);ctx.quadraticCurveTo(28,38,12,28);ctx.closePath();ctx.fill();
  // ears
  ctx.fillStyle='#f4f5f5';
  ctx.beginPath();ctx.moveTo(-16,-25);ctx.lineTo(-7,-43);ctx.lineTo(-2,-21);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(16,-25);ctx.lineTo(7,-43);ctx.lineTo(2,-21);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d8d5d2';
  ctx.beginPath();ctx.moveTo(-12,-27);ctx.lineTo(-8,-37);ctx.lineTo(-5,-24);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(12,-27);ctx.lineTo(8,-37);ctx.lineTo(5,-24);ctx.closePath();ctx.fill();
  // head
  ellipse(0,-13,18,17,'#fbfbfb');ellipse(0,-4,10,8,'#f2f2f2');
  // eyebrows + eyes
  rect(-11,-18,6,2,'#c8c8c8');rect(5,-18,6,2,'#c8c8c8');
  rect(-8,-14,3,4,'#334052');rect(5,-14,3,4,'#334052');
  // beard
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(-8,-1);ctx.lineTo(0,12);ctx.lineTo(8,-1);ctx.closePath();ctx.fill();
  // robe
  rect(-16,4,32,28,'#253553');rect(-12,8,24,7,'#e8eef3');rect(-3,11,6,21,'#9ad9ea');
  rect(-12,31,9,10,'#dfe7eb');rect(3,31,9,10,'#dfe7eb');
  // staff
  rect(18,5,4,38,'#7b5c3f');ellipse(20,2,5,5,'#d6edf3');
  ctx.restore();
}
function drawHeroFox(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,18,6,'rgba(23,38,56,.22)');
  ctx.fillStyle='#79cde8';ctx.beginPath();ctx.moveTo(14,8);ctx.quadraticCurveTo(37,6,34,25);ctx.quadraticCurveTo(31,38,12,27);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f7fbff';ctx.beginPath();ctx.moveTo(29,17);ctx.quadraticCurveTo(38,15,33,26);ctx.quadraticCurveTo(29,33,21,29);ctx.closePath();ctx.fill();
  ctx.fillStyle='#80d5ef';
  ctx.beginPath();ctx.moveTo(-16,-26);ctx.lineTo(-6,-44);ctx.lineTo(-2,-21);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(16,-26);ctx.lineTo(6,-44);ctx.lineTo(2,-21);ctx.closePath();ctx.fill();
  ctx.fillStyle='#eefaff';
  ctx.beginPath();ctx.moveTo(-12,-28);ctx.lineTo(-7,-38);ctx.lineTo(-5,-24);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(12,-28);ctx.lineTo(7,-38);ctx.lineTo(5,-24);ctx.closePath();ctx.fill();
  ellipse(0,-14,18,17,'#c9f1fb');ellipse(0,-5,10,8,'#f7fbff');
  ctx.fillStyle='#67b8da';ctx.beginPath();ctx.moveTo(-13,-25);ctx.lineTo(-4,-31);ctx.lineTo(-1,-23);ctx.lineTo(7,-30);ctx.lineTo(11,-22);ctx.closePath();ctx.fill();
  rect(-9,-16,4,6,'#21304a');rect(5,-16,4,6,'#21304a');rect(-8,-16,1,2,'#fff');rect(6,-16,1,2,'#fff');rect(-2,-8,4,3,'#39455e');
  rect(-15,3,30,25,'#f4f8fb');rect(-13,4,26,8,'#17253c');rect(-4,11,8,17,'#8ad9ef');
  rect(-17,8,5,16,'#d8f3fa');rect(12,8,5,16,'#d8f3fa');rect(-13,22,26,4,'#263650');
  rect(13,16,4,20,'#7d6a55');rect(16,31,11,3,'#bdc9d2');
  rect(-12,28,9,12,'#1f2d46');rect(3,28,9,12,'#1f2d46');rect(-13,38,11,4,'#ecf8fc');rect(2,38,11,4,'#ecf8fc');
  ctx.restore();
}
function drawDashmiu(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,17,6,'rgba(23,38,56,.22)');
  ctx.fillStyle='#efe5da';ctx.beginPath();ctx.ellipse(-7,-36,6,18,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(7,-37,6,19,.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e8aeb8';ctx.beginPath();ctx.ellipse(-7,-36,2.4,13,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(7,-37,2.4,14,.1,0,Math.PI*2);ctx.fill();
  ellipse(0,-12,17,16,'#f6eee5');ellipse(0,-4,9,7,'#fff8f2');
  ctx.fillStyle='#d8c1ad';ctx.beginPath();ctx.moveTo(-8,-25);ctx.lineTo(-2,-31);ctx.lineTo(2,-24);ctx.lineTo(8,-29);ctx.lineTo(10,-21);ctx.closePath();ctx.fill();
  rect(-8,-14,4,6,'#243149');rect(4,-14,4,6,'#243149');rect(-7,-14,1,2,'#fff');rect(5,-14,1,2,'#fff');rect(-2,-6,4,3,'#cf8c96');
  rect(-14,4,28,24,'#182846');rect(-10,7,20,4,'#2b3f66');rect(-3,5,6,20,'#edf1f7');
  ctx.fillStyle='#f3aa4d';ctx.beginPath();ctx.moveTo(-5,4);ctx.lineTo(0,9);ctx.lineTo(5,4);ctx.closePath();ctx.fill();
  rect(-18,9,5,15,'#f6eee5');rect(13,9,5,15,'#f6eee5');rect(-11,28,8,12,'#263552');rect(3,28,8,12,'#263552');rect(-12,38,10,4,'#f6eee5');rect(2,38,10,4,'#f6eee5');
  ctx.restore();
}
function drawPirate(x,y,s=1,variant=0){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,29,17,5,'rgba(0,0,0,.22)');
  const fur = ['#9b765b','#b58a68','#6f8a72'][variant%3];
  const dark = '#263247';
  // tail / animal silhouette
  if(variant%3===0){
    ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(13,10);ctx.quadraticCurveTo(31,5,30,23);ctx.quadraticCurveTo(25,31,14,24);ctx.closePath();ctx.fill();
  }else if(variant%3===1){
    ctx.fillStyle=fur;ctx.beginPath();ctx.moveTo(13,12);ctx.quadraticCurveTo(32,12,32,29);ctx.quadraticCurveTo(22,26,13,24);ctx.closePath();ctx.fill();
  }
  // ears
  ctx.fillStyle=fur;
  if(variant%3===0){ // cat
    ctx.beginPath();ctx.moveTo(-13,-20);ctx.lineTo(-8,-34);ctx.lineTo(-1,-20);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(13,-20);ctx.lineTo(8,-34);ctx.lineTo(1,-20);ctx.closePath();ctx.fill();
  }else if(variant%3===1){ // rat
    ellipse(-10,-23,6,7,fur);ellipse(10,-23,6,7,fur);
  }else{ // boar-ish
    ctx.beginPath();ctx.moveTo(-14,-18);ctx.lineTo(-19,-28);ctx.lineTo(-7,-23);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(14,-18);ctx.lineTo(19,-28);ctx.lineTo(7,-23);ctx.closePath();ctx.fill();
  }
  ellipse(0,-10,15,14,fur);
  if(variant%3===2) ellipse(0,-4,9,6,'#b88f76');
  else ellipse(0,-4,8,6,'#c5a183');
  rect(-9,-13,4,5,'#172338');rect(5,-13,4,5,'#172338');
  // orange pirate outfit
  rect(-14,3,28,25,'#e8782d');rect(-13,7,26,5,dark);
  rect(-17,-25,34,6,'#f08b3c');rect(-10,-30,20,7,dark);
  // limbs
  rect(-11,28,8,12,'#30343e');rect(3,28,8,12,'#30343e');
  ctx.restore();
}

function drawWildMonster(mon){
  if(mon && ['pirateCat','pirateDog','pirateTanuki'].includes(mon.kind)){
    drawPirateAnimal(mon.x,mon.y,mon.kind,1.25);return;
  }
  if(mon.kind==='radishFerret'||mon.kind==='beanMarten'||mon.kind==='peachWeasel'){
    drawRoute3Mob(mon);return;
  }

  if(mon.kind==='emberLizard'||mon.kind==='pepperMouse'||mon.kind==='rockMole'){
    drawCaveMob(mon);return;
  }

  if(mon.kind==='magmaTurtle'){
    drawCaveBoss(mon.x||690,mon.y||250,1.55);
    return;
  }

  if(!mon || !mon.alive) return;
  if(mon.kind==='appleSquirrel') drawAppleSquirrel(mon.x,mon.y,1.25);
  else if(mon.kind==='peachGlider') drawPeachGlider(mon.x,mon.y,1.25);
  else drawPumpkinCrab(mon.x,mon.y,1.25);
}
function drawAppleSquirrel(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,24,22,6,'rgba(0,0,0,.16)');
  // apple body
  ellipse(0,3,21,20,'#e7685d');
  rect(-2,-22,5,10,'#6d5134');
  ctx.fillStyle='#5b9d58';ctx.beginPath();ctx.ellipse(8,-18,9,5,-.45,0,Math.PI*2);ctx.fill();
  // squirrel ears / tail
  ellipse(-11,-14,6,7,'#d9a36c');ellipse(11,-14,6,7,'#d9a36c');
  ctx.fillStyle='#d69a61';ctx.beginPath();ctx.moveTo(17,0);ctx.quadraticCurveTo(40,-10,38,18);ctx.quadraticCurveTo(30,34,15,22);ctx.closePath();ctx.fill();
  rect(-8,0,4,5,'#253148');rect(5,0,4,5,'#253148');rect(-2,7,4,3,'#7d3d40');
  rect(-13,17,8,8,'#d9a36c');rect(5,17,8,8,'#d9a36c');
  ctx.restore();
}
function drawPeachGlider(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,23,23,6,'rgba(0,0,0,.16)');
  ellipse(0,2,22,20,'#f5a1a5');
  ctx.fillStyle='#f7c2c4';
  ctx.beginPath();ctx.moveTo(-16,-3);ctx.lineTo(-38,10);ctx.lineTo(-17,18);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(16,-3);ctx.lineTo(38,10);ctx.lineTo(17,18);ctx.closePath();ctx.fill();
  ellipse(-10,-13,6,7,'#d9a47c');ellipse(10,-13,6,7,'#d9a47c');
  rect(-8,-2,4,5,'#253148');rect(4,-2,4,5,'#253148');rect(-2,6,4,3,'#8d4e55');
  ctx.fillStyle='#62a95b';ctx.beginPath();ctx.ellipse(7,-19,9,5,-.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawPumpkinCrab(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,23,26,6,'rgba(0,0,0,.16)');
  ellipse(0,3,25,21,'#e99b43');
  rect(-3,-23,6,10,'#598653');
  // pumpkin grooves
  ctx.strokeStyle='#c87535';ctx.lineWidth=2;
  [-12,0,12].forEach(xx=>{ctx.beginPath();ctx.moveTo(xx,-12);ctx.quadraticCurveTo(xx/2,4,xx,20);ctx.stroke();});
  // crab legs/claws
  ctx.strokeStyle='#c77a3b';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-20,10);ctx.lineTo(-35,18);ctx.lineTo(-43,12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(20,10);ctx.lineTo(35,18);ctx.lineTo(43,12);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-17,16);ctx.lineTo(-30,28);ctx.stroke();
  ctx.beginPath();ctx.moveTo(17,16);ctx.lineTo(30,28);ctx.stroke();
  ellipse(-9,-1,3,4,'#253148');ellipse(9,-1,3,4,'#253148');
  ctx.restore();
}



function drawTitle(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#77cae7');g.addColorStop(.55,'#c5eadc');g.addColorStop(1,'#f2d5a6');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#66af63';ctx.beginPath();ctx.moveTo(480,118);ctx.lineTo(756,250);ctx.lineTo(654,448);ctx.lineTo(307,448);ctx.lineTo(205,251);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#4c8d59';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#526751';ctx.beginPath();ctx.moveTo(480,172);ctx.lineTo(570,352);ctx.lineTo(391,352);ctx.closePath();ctx.fill();
  [['🎪',480,138],['💧',270,270],['🔥',350,410],['🌪️',612,410],['🪨',690,270]].forEach(([a,x,y])=>text(a,x,y,30,'center'));
  ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=3;ctx.setLineDash([7,6]);
  ctx.beginPath();ctx.moveTo(455,160);ctx.lineTo(300,245);ctx.lineTo(340,370);ctx.stroke();ctx.setLineDash([]);
  text('りすぺく島RPG',480,75,53,'center','#fff',800);text('Ver.0.26',480,121,18,'center','#eef8ff');
  const canContinue=hasSaveGame();
  const y1=350,y2=406;
  outlineRect(300,y1,360,46,titleSelection===0?'#e8f7fb':'rgba(15,35,60,.78)','#73b9d6',2);
  text('はじめから',480,y1+23,20,'center',titleSelection===0?'#17324a':'#e8f4fa');
  outlineRect(300,y2,360,46,titleSelection===1?'#e8f7fb':'rgba(15,35,60,.78)',canContinue?'#73b9d6':'#566879',2);
  text(canContinue?'つづきから':'つづきから（セーブなし）',480,y2+23,canContinue?20:16,'center',
       canContinue?(titleSelection===1?'#17324a':'#e8f4fa'):'#8193a2');
}
function speakerName(who){
  return ({narrator:'語り',dash:'ダッシュミウ',pirate:'海賊',elder:'ぶりふぉ村長',hero:heroName,suzu:'スズマル',yuno:'ユーノ',captain:'防衛隊長',lover:'防衛隊長の恋人'})[who]||who;
}
function drawDialog(who,line){
  ctx.fillStyle='rgba(7,17,36,.92)';ctx.fillRect(46,380,868,132);
  ctx.strokeStyle='#d5ecf6';ctx.lineWidth=3;ctx.strokeRect(47.5,381.5,865,129);
  ctx.strokeStyle='#6db8d1';ctx.lineWidth=1;ctx.strokeRect(54.5,388.5,851,115);
  const n=speakerName(who);
  if(n){ctx.fillStyle='#eaf7fb';ctx.fillRect(72,363,208,37);ctx.strokeStyle='#6db8d1';ctx.strokeRect(72.5,363.5,207,36);text(n,88,382,18,'left','#19324b');}
  wrapText(line,78,422,805,27,22);text('▼',875,486,17,'center','#d9ecff');
}
function wrapText(str,x,y,maxWidth,lineHeight,size){
  ctx.font=`700 ${size}px system-ui,-apple-system,"Yu Gothic",sans-serif`;ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='top';
  let line='',yy=y;for(const ch of str){const next=line+ch;if(ctx.measureText(next).width>maxWidth){ctx.fillText(line,x,yy);line=ch;yy+=lineHeight;}else line=next;}if(line)ctx.fillText(line,x,yy);
}
function drawCutscene(){
  ctx.fillStyle='#071023';ctx.fillRect(0,0,W,H);
  const i=Math.min(dialogIndex,prologue.length-1),[who,line]=prologue[i];
  if(i<=3){
    ctx.fillStyle='#21466e';ctx.fillRect(0,268,W,272);
    for(let y=292;y<540;y+=34)for(let x=(y%68);x<W;x+=90)rect(x,y,50,3,'#3d6b92');
    rect(205,210,185,64,'#744936');rect(265,110,8,105,'#d5dbe7');ctx.fillStyle='#1b2844';ctx.beginPath();ctx.moveTo(273,118);ctx.lineTo(370,170);ctx.lineTo(273,190);ctx.closePath();ctx.fill();
    text('CHESTAPI',300,237,15,'center','#f4f2dc');
    rect(690,235,145,50,'#4e3025');rect(730,153,7,88,'#d0d5df');ctx.fillStyle='#e87a2f';ctx.beginPath();ctx.moveTo(737,158);ctx.lineTo(811,195);ctx.lineTo(737,213);ctx.closePath();ctx.fill();
  }else if(i<=8){
    ctx.fillStyle='#101936';ctx.fillRect(0,0,W,H);for(let a=0;a<60;a++)rect((a*137)%W,(a*79)%250,2,2,'#d5e7ff');
    rect(0,340,W,200,'#21483f');rect(110,270,280,76,'#5a3829');text('ちぇすたぴ号',250,307,17,'center','#e8e2cc');
    drawPirate(610,354,1.35,0);drawPirate(687,369,1.18,1);drawPirate(760,350,1.28,2);if(i>=5)drawDashmiu(220,361,1.32);
  }else{
    ctx.fillStyle='#101936';ctx.fillRect(0,0,W,H);rect(0,345,W,195,'#234d43');
    for(let x=0;x<W;x+=78){rect(x,286,42,80,'#173d36');rect(x+8,260,26,35,'#245d49')}
    drawDashmiu(455,365,1.45);text('りすぺく島',480,94,46,'center','#fff');
  }
  drawDialog(who,line);
}
function drawTree(x,y){
  rect(x+10,y+25,12,31,'#705039');ellipse(x+14,y+13,24,22,'#3b815c');ellipse(x+4,y+5,19,18,'#438f62');ellipse(x+27,y+4,18,17,'#4a9968');rect(x+2,y+9,7,5,'#69ae78');
}
function drawHouse(x,y){
  outlineRect(x,y+32,82,61,'#f1f5f1','#345166',2);ctx.fillStyle='#1d2d49';ctx.beginPath();ctx.moveTo(x-8,y+34);ctx.lineTo(x+41,y);ctx.lineTo(x+90,y+34);ctx.closePath();ctx.fill();ctx.strokeStyle='#0f1e35';ctx.lineWidth=2;ctx.stroke();
  rect(x+31,y+59,19,34,'#8bd7ea');outlineRect(x+9,y+47,17,15,'#aee8f2','#5a8290',1);outlineRect(x+56,y+47,17,15,'#aee8f2','#5a8290',1);rect(x+6,y+36,68,4,'#ffffff');
}

function drawFireHouse(x,y){
  outlineRect(x,y+32,84,62,'#f2dfc4','#6f4433',2);
  ctx.fillStyle='#6b2d2f';ctx.beginPath();ctx.moveTo(x-8,y+34);ctx.lineTo(x+42,y);ctx.lineTo(x+92,y+34);ctx.closePath();ctx.fill();
  rect(x+32,y+59,18,35,'#8f3340');
  outlineRect(x+10,y+47,17,15,'#f6c77f','#9c6b39',1);
  outlineRect(x+57,y+47,17,15,'#f6c77f','#9c6b39',1);
  rect(x+7,y+36,70,4,'#d9a05b');
}
function drawSarubieVillageBG(){
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#d8b680');sky.addColorStop(1,'#c99b66');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#5f6258';ctx.beginPath();ctx.moveTo(635,230);ctx.lineTo(760,30);ctx.lineTo(900,230);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c35f3a';ctx.beginPath();ctx.moveTo(735,70);ctx.lineTo(760,30);ctx.lineTo(790,73);ctx.closePath();ctx.fill();
  rect(0,230,W,310,'#cfa96f');rect(0,410,W,130,'#b98b5b');
  drawFireHouse(70,260);drawFireHouse(195,220);drawFireHouse(730,250);
  rect(480,260,115,95,'#6a4c3d');rect(500,225,75,42,'#482f2a');rect(520,300,35,35,'#e57939');
  text('鍛冶場',538,244,16,'center','#f3d9b1');
}
function drawVillage(x,y){
  ctx.fillStyle='rgba(219,250,255,.93)';ctx.beginPath();ctx.moveTo(x+220,y-8);ctx.lineTo(x+255,y-22);ctx.lineTo(x+260,y+250);ctx.lineTo(x+218,y+258);ctx.closePath();ctx.fill();ctx.strokeStyle='#8fd7eb';ctx.lineWidth=3;ctx.stroke();
  for(let yy=y;yy<y+240;yy+=40)rect(x+232,yy,5,25,'rgba(130,206,230,.55)');
  drawHouse(x,y+58);drawHouse(x+108,y+15);drawHouse(x+100,y+157);drawHouse(x-28,y+178);text('ぶりふぉ村',x+92,y-25,25,'center','#284461');
}
function drawWorld(){
  camera.x=Math.max(0,Math.min(world.width-W,dash.x-W*.5));
  camera.y=Math.max(0,Math.min(world.height-H,dash.y-H*.45));
  ctx.save();ctx.translate(-camera.x,-camera.y);
  rect(0,0,world.width,world.height,'#72b96f');

  // One-map forest route from circus side to Brifo.
  ctx.fillStyle='#d8c48f';ctx.beginPath();
  ctx.moveTo(2050,145);
  ctx.bezierCurveTo(1810,260,1590,370,1390,500);
  ctx.bezierCurveTo(1160,650,930,800,700,920);
  ctx.bezierCurveTo(520,1015,420,1035,315,1045);
  ctx.lineTo(380,1140);
  ctx.bezierCurveTo(560,1110,750,1035,900,945);
  ctx.bezierCurveTo(1130,805,1340,650,1530,540);
  ctx.bezierCurveTo(1740,420,1940,320,2110,245);
  ctx.closePath();ctx.fill();

  // Dense tree walls so Brifo cannot be seen from the circus side.
  for(let x=20;x<2360;x+=80){
    drawTree(x,105+(x%5)*18);
    drawTree(x+30,195+(x%4)*20);
    if(x<1300) drawTree(x+10,305+(x%3)*24);
  }
  for(let x=30;x<2300;x+=84){
    if(x<240 || x>990){
      drawTree(x,900+(x%4)*18);
      drawTree(x+34,1000+(x%3)*16);
    }
  }
  for(let i=0;i<22;i++){
    const x=360+i*76;
    const y=540+Math.sin(i*.72)*110;
    drawTree(x,y-150);
    drawTree(x+35,y+155);
  }

  rect(1870,110,180,55,'#74cadf');
  text('サーカス団方面',1960,130,15,'center','#32526a');

  // Brifo appears only near the end of the same map.
  drawVillage(165,815);
  rect(445,885,8,55,'#74523b');
  outlineRect(398,845,105,42,'#efd99f','#98784c',2);
  text('ぶりふぉ村',450,866,14,'center','#38475a');

  rect(95,760,24,210,'#bcecf5');
  rect(122,772,16,195,'rgba(255,255,255,.45)');

  drawDashmiu(dash.x,dash.y,1.22);
  ctx.restore();

  const ht=hudTop();
  ctx.fillStyle='rgba(9,22,48,.82)';ctx.fillRect(18,ht,355,46);
  text('目的：森を抜けてぶりふぉ村へ',35,ht+23,18);
}

function drawVillageDialog(){
  ctx.fillStyle='#8fd47f';ctx.fillRect(0,0,W,H);rect(0,0,W,92,'#89d9e8');drawHouse(95,145);drawHouse(225,105);drawHouse(725,135);drawTree(30,300);drawTree(845,290);drawTree(720,330);
  drawDashmiu(345,335,1.35);drawHeroFox(570,335,1.38);
  for(let i=0;i<5;i++){const x=650+i*40,y=385+(i%2)*8;ellipse(x,y-10,11,10,'#d3eef3');rect(x-10,y,20,25,'#e8f4f5');}
  drawElderFox(490,350,1.2);
  const vd=villageDialog();const item=vd[Math.min(dialogIndex,vd.length-1)];drawDialog(item[0],item[1]);
}

function drawDepartureDialog(){
  ctx.fillStyle='#8fd47f';ctx.fillRect(0,0,W,H);rect(0,0,W,92,'#89d9e8');drawHouse(105,138);drawTree(770,260);drawTree(55,280);
  drawHeroFox(430,330,1.42);drawDashmiu(565,335,1.36);drawElderFox(330,350,1.2);
  const item=departureDialog[Math.min(dialogIndex,departureDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawRoad2(){
  camera.x=Math.max(0,Math.min(road2.width-W,hero.x-W*.43));
  camera.y=Math.max(0,Math.min(road2.height-H,hero.y-H*.45));
  ctx.save();ctx.translate(-camera.x,-camera.y);
  rect(0,0,road2.width,road2.height,'#90d47e');
  rect(0,0,road2.width,100,'#65c5df');rect(0,road2.height-100,road2.width,100,'#65c5df');

  // Brifo -> Sarubie: mostly south, slightly east
  ctx.fillStyle='#e7d09a';ctx.beginPath();
  ctx.moveTo(250,170);
  ctx.bezierCurveTo(430,450,700,720,1010,940);
  ctx.bezierCurveTo(1270,1125,1530,1290,1900,1420);
  ctx.lineTo(1960,1510);
  ctx.bezierCurveTo(1540,1405,1260,1250,950,1040);
  ctx.bezierCurveTo(620,820,370,540,165,260);
  ctx.closePath();ctx.fill();

  for(let x=20;x<2150;x+=115){
    drawTree(x,145+(x%4)*12);
    drawTree(x+38,1360+(x%5)*7);
  }

  // volcano becomes visible toward southeast
  ctx.fillStyle='#6e7562';ctx.beginPath();ctx.moveTo(1730,1220);ctx.lineTo(1910,880);ctx.lineTo(2080,1220);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c05f3e';ctx.beginPath();ctx.moveTo(1882,935);ctx.lineTo(1910,880);ctx.lineTo(1938,935);ctx.closePath();ctx.fill();
  text('中央火山',1910,840,16,'center','#4c5260');

  
  // Sarubie village entrance
  rect(1672,1280,8,58,'#72513a');
  outlineRect(1620,1240,112,46,'#f0d39a','#8e623d',2);
  text('さるびえ村',1676,1264,16,'center','#4d332c');
  rect(1840,1300,18,92,'#63383a'); rect(1990,1300,18,92,'#63383a'); rect(1835,1292,178,18,'#792d38');
  text('さるびえ村',1924,1277,17,'center','#5b2630',700);
  rect(1802,1354,28,18,'#5a4436'); ctx.fillStyle='#f07a34';ctx.beginPath();ctx.moveTo(1816,1354);ctx.lineTo(1807,1333);ctx.lineTo(1816,1339);ctx.lineTo(1822,1323);ctx.lineTo(1828,1354);ctx.closePath();ctx.fill();
  rect(2018,1354,28,18,'#5a4436'); ctx.fillStyle='#f07a34';ctx.beginPath();ctx.moveTo(2032,1354);ctx.lineTo(2023,1333);ctx.lineTo(2032,1339);ctx.lineTo(2038,1323);ctx.lineTo(2044,1354);ctx.closePath();ctx.fill();
  drawFireHouse(1870,1370); drawFireHouse(1990,1390);
for(const mon of monsters) drawWildMonster(mon);

  drawDashmiu(hero.x-55,hero.y+22,1.08);
  drawHeroFox(hero.x,hero.y,1.18);
  ctx.restore();

  const ht=hudTop();
  ctx.fillStyle='rgba(9,22,48,.8)';ctx.fillRect(18,ht,340,46);
  text('目的：南南東のさるびえ村へ　→ 村門を目指す',35,ht+23,17);
}
function startBattle(mon){
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    enemyHP:mon.hp,enemyMaxHP:mon.maxHP,
    enemyName:mon.name,enemyKind:mon.kind,
    monsterId:mon.id,turn:'player',defending:false
  };
  battleMessage=`${mon.name}が現れた！`;
  battleMenu='main';
  scene='battle';touchUI.classList.add('hidden');
}


function addDamagePopup(textValue,x,y,color='#ffffff'){
  damagePopups.push({text:String(textValue),x,y,timer:1.05,color});
}
function drawDamagePopups(){
  for(const p of damagePopups){
    const rise=(1.05-p.timer)*28;
    ctx.save();
    ctx.globalAlpha=Math.max(0,Math.min(1,p.timer/.3));
    text(p.text,p.x,p.y-rise,22,'center',p.color,900);
    ctx.restore();
  }
}
function setBattleFx(type,x=700,y=245){
  battleFx={type,timer:.48,x,y};
}
function drawBattleFx(){
  if(!battleFx || battleFx.timer<=0)return;
  const t=battleFx.timer/.48;
  ctx.save();
  if(battleFx.type==='slash'){
    ctx.strokeStyle=`rgba(255,255,255,${t})`;ctx.lineWidth=9;
    ctx.beginPath();ctx.moveTo(battleFx.x-45,battleFx.y+35);ctx.lineTo(battleFx.x+45,battleFx.y-35);ctx.stroke();
    ctx.strokeStyle=`rgba(150,220,255,${t})`;ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(battleFx.x-35,battleFx.y+45);ctx.lineTo(battleFx.x+55,battleFx.y-30);ctx.stroke();
  }else if(battleFx.type==='ice'){
    ctx.fillStyle=`rgba(185,240,255,${.8*t})`;
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      const r=35+(1-t)*35;
      ctx.beginPath();ctx.moveTo(battleFx.x+Math.cos(a)*r,battleFx.y+Math.sin(a)*r-18);
      ctx.lineTo(battleFx.x+Math.cos(a)*r+8,battleFx.y+Math.sin(a)*r+12);
      ctx.lineTo(battleFx.x+Math.cos(a)*r-8,battleFx.y+Math.sin(a)*r+12);
      ctx.closePath();ctx.fill();
    }
  }else if(battleFx.type==='fire'){
    ctx.fillStyle=`rgba(255,120,40,${.85*t})`;
    for(let i=0;i<6;i++){
      const x=battleFx.x-35+i*14;
      ctx.beginPath();ctx.moveTo(x,battleFx.y+35);ctx.lineTo(x-8,battleFx.y+5);ctx.lineTo(x,battleFx.y-25-(i%2)*10);ctx.lineTo(x+10,battleFx.y+10);ctx.closePath();ctx.fill();
    }
  }else if(battleFx.type==='heal'){
    ctx.fillStyle=`rgba(130,230,255,${.8*t})`;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4+(1-t);
      ellipse(battleFx.x+Math.cos(a)*35,battleFx.y+Math.sin(a)*35,5,5,ctx.fillStyle);
    }
    text('+',battleFx.x,battleFx.y,35,'center','#dfffff');
  }else if(battleFx.type==='hitHero'){
    ctx.fillStyle=`rgba(255,90,70,${.22*t})`;ctx.fillRect(95,185,180,160);
  }else if(battleFx.type==='hitSuzu'){
    ctx.fillStyle=`rgba(255,90,70,${.22*t})`;ctx.fillRect(260,185,180,160);
  }
  ctx.restore();
}

function isPartyBattle(){
  return !!(battle && suzumaruActive && (battle.monsterId===99 || battle.monsterId>=200));
}
function isSuzumaruTurn(){ return !!(isPartyBattle() && battleActor==='suzu'); }
function isYunoTurn(){ return !!(battle && yunoJoined && battle.monsterId>=400 && battleActor==='yuno'); }
function advancePartyTurn(){
  battleMenu='main';
  if(battleActor==='hero' && battle.hasteTarget==='hero' && battle.hasteTurns>0 && !battle.hasteUsed){
    battle.hasteUsed=true;battleMessage+='　疾風でもう1回！';return;
  }
  if(battleActor==='hero' && suzumaruActive){battle.hasteUsed=false;if(battle.hasteTurns>0)battle.hasteTurns--;battleActor='suzu';return;}
  if(battleActor==='suzu' && yunoJoined && battle.monsterId>=400){battleActor='yuno';return;}
  beginEnemyTurn();
}
function drawBattle(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#9cd8ef');g.addColorStop(1,'#b9dc8c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    const py=(window.innerHeight||540)<500?285:270;
    drawHeroFox(145,py,1.45);
    drawSuzumaru(265,py+3,1.45);
    if(yunoJoined && battle.monsterId>=400)drawYuno(380,py+3,1.35);
  }else{
    drawHeroFox(250,260,2.0);
  }
  if(battle.monsterId===99){
    drawCaveBoss(700,245,1.75);
  }else if(battle.enemies){
    const live=livingEnemies();
    const spots=[
      [650,205],[760,205],[600,285],[710,295],[820,285]
    ];
    live.forEach((e,i)=>{
      const p=spots[i]||[700,245];
      const tempMon={x:p[0],y:p[1],alive:true,kind:e.kind};
      drawWildMonster(tempMon);
      text(`${e.name} ${e.hp}/${e.maxHP}`,p[0],p[1]+48,12,'center','#26364b');
    });
  }else{
    const tempMon={x:700,y:245,alive:true,kind:battle.enemyKind};
    drawWildMonster(tempMon);
  }
  drawBattleFx();
  drawDamagePopups();
  // status
  // Compact party roster: leaves the enemy side completely unobstructed.
  // This area is intentionally sized for up to four party members.
  const bt=battleTop();
  const partyRows=[];
  partyRows.push({name:heroName,hp:battle.heroHP,maxHP:progress.maxHP,mp:battle.heroMP,maxMP:progress.maxMP});
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    partyRows.push({name:'スズマル',hp:battle.suzuHP,maxHP:battle.suzuMaxHP,mp:battle.suzuMP,maxMP:battle.suzuMaxMP});
  }
  if(yunoJoined && battle.monsterId>=400){
    partyRows.push({name:'ユーノ',hp:battle.yunoHP,maxHP:battle.yunoMaxHP,mp:battle.yunoMP,maxMP:battle.yunoMaxMP});
  }

  const rosterX=32, rosterY=bt, rosterW=350;
  const rowH=43;
  const rosterH=18+partyRows.length*rowH;
  ctx.fillStyle='rgba(14,30,55,.90)';
  ctx.fillRect(rosterX,rosterY,rosterW,rosterH);

  partyRows.forEach((m,i)=>{
    const y=rosterY+26+i*rowH;
    text(m.name,rosterX+18,y,16,'left','#ffffff',800);
    text(`HP ${m.hp}/${m.maxHP}`,rosterX+130,y,14,'left','#ffffff');
    text(`MP ${m.mp}/${m.maxMP}`,rosterX+248,y,14,'left','#ffffff');
  });

  // Enemy information gets its own small panel above/right of the monsters.
  ctx.fillStyle='rgba(255,255,255,.88)';
  ctx.fillRect(650,bt,265,72);
  if(battle.enemies){
    text(`敵グループ　残り ${livingEnemies().length}体`,670,bt+28,17,'left','#243245',800);
    text('HPは各敵の下に表示',670,bt+54,13,'left','#52606f');
  }else{
    text(battle.enemyName,670,bt+28,18,'left','#243245',800);
    text(`HP ${Math.max(0,battle.enemyHP)}/${battle.enemyMaxHP}`,670,bt+54,15,'left','#52606f');
  }
  // battle phase
  if(battle.turn==='enemy'){
    text('敵が攻撃してくる！',480,300,20,'center','#ffb1a4');
  }else if(battle.turn==='enemyResult'){
    text('敵の攻撃',480,300,20,'center','#ff9d91');
  }else if(battle.turn==='player'){
    const who=isYunoTurn()?'ユーノ':isSuzumaruTurn()?'スズマル':heroName;
    text(`${who}のターン`,480,300,18,'center','#e8f6ff');
  }
  // party command state
  if(battle.monsterId===99 && suzumaruActive && battle.turn==='player'){
    ctx.fillStyle='rgba(15,31,53,.9)';ctx.fillRect(120,322,720,38);
    const heroSel=battleChoiceText.hero||'未選択';
    const suzuSel=battleChoiceText.suzu||'未選択';
    text(`${battleActor==='hero'?'▶ ':''}${heroName}：${heroSel}`,145,341,15,'left',battleActor==='hero'?'#fff2ad':'#d7e6ee');
    text(`${battleActor==='suzu'?'▶ ':''}スズマル：${suzuSel}`,505,341,15,'left',battleActor==='suzu'?'#fff2ad':'#d7e6ee');
  }
  // commands
  ctx.fillStyle='rgba(9,20,42,.92)';ctx.fillRect(50,365,860,140);
  if(battle.turn==='player'){
    if(battleMenu==='main'){
      outlineRect(70,388,180,48,'#dff4fb','#71bad7',2);text('こうげき',160,412,20,'center','#17324a');
      outlineRect(270,388,180,48,'#dff4fb','#71bad7',2);text('スキル',360,412,20,'center','#17324a');
      outlineRect(470,388,180,48,'#dff4fb','#71bad7',2);text('ぼうぎょ',560,412,20,'center','#17324a');
      outlineRect(670,388,180,48,'#dff4fb','#71bad7',2);text('にげる',760,412,20,'center','#17324a');
      const actorName=isYunoTurn()?'ユーノ':isSuzumaruTurn()?'スズマル':heroName;
      text(`${actorName}の行動`,480,474,15,'center','#c8e7f4');
    }else{
      if(isYunoTurn()){
        text('ユーノのスキル',480,372,14,'center','#d8fff5');
        outlineRect(35,385,135,54,'#d8f2ed','#59aaa6',2);text('風の癒し MP8',102,408,13,'center','#174c4b');text('味方全体回復',102,426,10,'center','#356c69');
        outlineRect(180,385,135,54,'#d8f2ed','#59aaa6',2);text('そよぎの輪 MP10',247,408,12,'center','#174c4b');text('全体徐々に回復',247,426,10,'center','#356c69');
        outlineRect(325,385,135,54,'#d8f2ed','#59aaa6',2);text('風刃嵐 MP9',392,408,13,'center','#174c4b');text('敵全体',392,426,10,'center','#356c69');
        outlineRect(470,385,135,54,'#d8f2ed','#59aaa6',2);text('疾風 MP8',537,408,13,'center','#174c4b');text('主人公2回行動',537,426,10,'center','#356c69');
        outlineRect(615,385,135,54,'#d8f2ed','#59aaa6',2);text('風まとい MP6',682,408,12,'center','#174c4b');text('1人回避UP',682,426,10,'center','#356c69');
        outlineRect(760,385,150,54,'#d8f2ed','#59aaa6',2);text('風護陣 MP12',835,408,12,'center','#174c4b');text('全体回避UP',835,426,10,'center','#356c69');
      }else if(isSuzumaruTurn()){
        text('スズマルのスキル',480,372,14,'center','#ffe5c8');
        outlineRect(55,385,245,54,'#ffd9cf','#d86145',2);text(`${suzuSingleSkillName()} MP5`,177,406,16,'center','#6b231d');text('単体・高威力',177,425,11,'center','#934a3e');
        outlineRect(315,385,245,54,'#ffe2cf','#d78251',2);text(`${suzuAllSkillName()} MP8`,437,406,16,'center','#5c3023');text('敵全体',437,425,11,'center','#7d5748');
        outlineRect(575,385,180,54,'#fff0d0','#d2a24d',2);text(`回復薬 x${progress.items.potion}`,665,412,14,'center','#5f4623');
        outlineRect(770,385,140,54,'#dff4fb','#71bad7',2);text('もどる',840,412,15,'center','#17324a');
      }else{
        outlineRect(40,378,170,48,'#dff4fb','#71bad7',2);text('水のいやし',125,402,14,'center','#17324a');
        outlineRect(220,378,170,48,'#dff4fb','#71bad7',2);text('氷のつぶて',305,402,14,'center','#17324a');
        outlineRect(400,378,170,48,'#dff4fb','#71bad7',2);text('氷結斬り',485,402,14,'center','#17324a');
        outlineRect(580,378,170,48,'#d9f4ff','#62afd1',2);text('氷晶波 MP8',665,402,14,'center','#17324a');
        outlineRect(760,378,160,48,'#fff0d0','#d2a24d',2);text(`回復薬 x${progress.items.potion}`,840,402,13,'center','#5f4623');
        outlineRect(330,442,300,42,'#dff4fb','#71bad7',2);text('もどる',480,463,15,'center','#17324a');
      }
      text('スキルを選択',480,474,15,'center','#c8e7f4');
    }
  }else{
    wrapText(battleMessage,80,405,790,28,22);
  }
}
function battleAttack(mode='attack'){
  if(!battle || battle.turn!=='player')return;
  if(mode==='heal'){
    if(battle.heroMP>=5){
      battle.heroMP-=5;battle.heroHP=Math.min(progress.maxHP,battle.heroHP+16);
      battleMessage=`${heroName}は「水のいやし」を使った！ HPが回復した。`;setBattleFx('heal',185,255);
      if(battle.monsterId===99)battleChoiceText.hero='水のいやし';
    }else battleMessage='MPが足りない！';
    if(isPartyBattle()){advancePartyTurn();}
    else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
    return;
  }
  let dmg=0;
  if(mode==='iceWave'){
    if(battle.heroMP<8){battleMessage='MPが足りない！';return;}
    battle.heroMP-=8;
    dmg=8+Math.floor(progress.atk/3);
    const allDmg=damageAllEnemies(dmg);
    const summary=Array.isArray(allDmg)?allDmg.map(v=>typeof v==='object'?`${v.name} ${v.damage}`:v).join(' / '):'';
    battleMessage=`${heroName}の「氷晶波」！ ${summary}`;
    setBattleFx('ice');
    if(battle.monsterId===99||battle.monsterId>=200)battleChoiceText.hero='氷晶波';
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
    if(isPartyBattle())advancePartyTurn();
    else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
    return;
  }
  if(mode==='iceSlash'){
    if(!progress.learned.iceSlash){battleMessage='まだ覚えていない！';return;}
    if(battle.heroMP<7){battleMessage='MPが足りない！';return;}
    battle.heroMP-=7;
    dmg=progress.atk+15+Math.floor(Math.random()*7);
    battleMessage=`${heroName}の「氷結斬り」！ ${dmg}ダメージ！`;setBattleFx('ice');
    addDamagePopup('ICE',700,155,'#bdefff');
    if(battle.monsterId===99)battleChoiceText.hero='氷結斬り';
  }else if(mode==='ice'){
    if(battle.heroMP<4){battleMessage='MPが足りない！';return;}
    battle.heroMP-=4;
    dmg=progress.atk+9+Math.floor(Math.random()*6);
    battleMessage=`${heroName}の「氷のつぶて」！ ${dmg}ダメージ！`;setBattleFx('ice');
    addDamagePopup('ICE',700,155,'#bdefff');
    if(battle.monsterId===99)battleChoiceText.hero='氷のつぶて';
  }else{
    dmg=progress.atk+4+Math.floor(Math.random()*5);
    battleMessage=`${heroName}のこうげき！ ${dmg}ダメージ！`;setBattleFx('slash');
    if(battle.monsterId===99)battleChoiceText.hero='こうげき';
  }
  if(mode==='iceWave'){
    if(battle.heroMP<8){battleMessage='MPが足りない！';return;}
  }
  damageEnemy(dmg);
  if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
  if(isPartyBattle()){
    advancePartyTurn();
    if(battle.turn==='player')battleMessage+=`　次は${battleActor==='suzu'?'スズマル':'ユーノ'}！`;
  }else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
}


function usePotion(target){
  if(!battle || battle.turn!=='player')return;
  if(progress.items.potion<=0){battleMessage='回復薬を持っていない！';return;}
  progress.items.potion--;saveProgress();
  if(target==='suzu'){
    battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+25);
    battleMessage='スズマルは回復薬を使った！ HPが25回復！';
    setBattleFx('heal',335,258);
    battleChoiceText.suzu='回復薬';
    battleMessage+='　→ 敵の番';
    beginEnemyTurn();
  }else{
    battle.heroHP=Math.min(progress.maxHP,battle.heroHP+25);
    battleMessage=`${heroName}は回復薬を使った！ HPが25回復！`;
    setBattleFx('heal',185,255);
    if(battle.monsterId===99||battle.monsterId>=200)battleChoiceText.hero='回復薬';
    if(suzumaruActive && (battle.monsterId===99||battle.monsterId>=200)){
      battleActor='suzu';battleMenu='main';
    }else{
      battle.turn='enemy';battleCooldown=.8;battleMenu='main';
    }
  }
}


function beginEnemyTurn(){
  if(!battle)return;
  battleActor='hero';
  battle.turn='enemy';
  battleCooldown=.55;
  battleMenu='main';
}
function suzuAction(mode='attack'){
  const ss=suzumaruStats();
  if(!battle || battle.turn!=='player' || battleActor!=='suzu')return;
  let dmg=0;
  if(mode==='fireRun'){
    if(battle.suzuMP<8){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=8;
    {
      const al=progress.suzuSkills.all||0;
      const bonus=al>=3?12:al>=2?8:3;
      dmg=Math.floor(ss.atk*0.45)+bonus+Math.floor(Math.random()*4);
    }
    const allDmg=damageAllEnemies(dmg);
    const summary=Array.isArray(allDmg)?allDmg.map(v=>typeof v==='object'?`${v.name} ${v.damage}`:v).join(' / '):'';
    battleMessage=`スズマルの「火走り」！ ${summary}`;
    setBattleFx('fire');addDamagePopup('FIRE ALL',700,155,'#ffb093');battleChoiceText.suzu='火走り';
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
    advancePartyTurn();return;
  }
  if(mode==='fire'){
    if(battle.suzuMP<5){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=5;
    {
      const sl=progress.suzuSkills.single||0;
      const bonus=sl>=3?30:sl>=2?20:10;
      dmg=ss.atk+bonus+Math.floor(Math.random()*7);
    }
    battleMessage=`スズマルの「火炎斬り」！ ${dmg}ダメージ！`;setBattleFx('fire');addDamagePopup('FIRE',700,155,'#ffb093');battleChoiceText.suzu='火炎斬り';
  }else{
    dmg=ss.atk+2+Math.floor(Math.random()*5);
    battleMessage=`スズマルのこうげき！ ${dmg}ダメージ！`;setBattleFx('slash');battleChoiceText.suzu='こうげき';
  }
  damageEnemy(dmg);
  if(enemiesDefeated()){
    battle.turn='win';battleCooldown=1.0;return;
  }
  advancePartyTurn();
}

function yunoAction(mode){
  if(!isYunoTurn())return;
  const key={healAll:'heal',regen:'regen',windAll:'wind',haste:'haste',evade:'evade',evadeAll:'evadeAll'}[mode];
  if(!progress.yunoSkills[key]){battleMessage='その風術はまだ習得していない！';return;}
  const ys=yunoStats();
  const cost={healAll:8,regen:10,windAll:9,haste:8,evade:6,evadeAll:12}[mode]||0;
  if(battle.yunoMP<cost){battleMessage='MPが足りない！';return;}
  battle.yunoMP-=cost;
  if(mode==='healAll'){
    const heal=14+Math.floor(ys.atk/3);
    battle.heroHP=Math.min(progress.maxHP,battle.heroHP+heal);
    battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+heal);
    battle.yunoHP=Math.min(battle.yunoMaxHP,battle.yunoHP+heal);
    battleMessage=`ユーノの「風の癒し」！ 味方全体のHPが${heal}回復！`;setBattleFx('heal',360,255);
  }else if(mode==='regen'){
    battle.regenTurns=3;
    battleMessage='ユーノの「そよぎの輪」！ 3ターン、味方全体が徐々に回復！';setBattleFx('heal',360,255);
  }else if(mode==='windAll'){
    const dmg=8+Math.floor(ys.atk*.65);
    const res=damageAllEnemies(dmg);
    battleMessage=`ユーノの「風刃嵐」！ ${res.map(v=>`${v.name} ${v.damage}`).join(' / ')}`;
    setBattleFx('ice');addDamagePopup('WIND ALL',700,155,'#b8fff1');
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}
  }else if(mode==='haste'){
    battle.hasteTarget='hero';battle.hasteTurns=2;
    battleMessage=`ユーノの「疾風」！ ${heroName}は2ターン、行動を2回できる！`;
  }else if(mode==='evade'){
    battle.evadeTarget='hero';battle.evadeTurns=3;
    battleMessage=`ユーノの「風まとい」！ ${heroName}の回避率が上がった！`;
  }else if(mode==='evadeAll'){
    battle.evadeAllTurns=3;
    battleMessage='ユーノの「風護陣」！ 味方全体の回避率が上がった！';
  }
  battleChoiceText.yuno=mode;
  advancePartyTurn();
}

function battleDefend(){
  if(!battle || battle.turn!=='player')return;
  if(isYunoTurn()){
    battleMessage='ユーノは身を守っている！';battleChoiceText.yuno='ぼうぎょ';advancePartyTurn();return;
  }
  if(isSuzumaruTurn()){
    battleMessage='スズマルは身を守っている！';
    battleChoiceText.suzu='ぼうぎょ';advancePartyTurn();return;
  }
  battle.defending=true;
  battleMessage=`${heroName}は身を守っている！`;if(battle.monsterId===99)battleChoiceText.hero='ぼうぎょ';
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){advancePartyTurn();}
  else{
    battle.turn='enemy';battleCooldown=.65;battleMenu='main';
  }
}
function battleRun(){
  if(!battle || battle.turn!=='player')return;
  if(battle.monsterId===99){
    battleMessage='マグマガメからは逃げられない！';
    return;
  }
  battleMessage='うまく逃げ切った！';
  battle.turn='run';battleCooldown=.6;battleMenu='main';
}
function enemyTurn(){
  const ss=suzumaruStats(),ys=yunoStats();
  const attackers=battle.enemies?livingEnemies():[{
    name:battle.enemyName||'敵',
    kind:battle.enemyKind||''
  }];

  let totalHero=0,totalSuzu=0,totalYuno=0;
  const attackLines=[];

  attackers.forEach((foe,idx)=>{
    let baseDmg=5+Math.floor(Math.random()*5);
    let dmg=baseDmg;
    if(battle.defending)dmg=Math.max(1,Math.floor(dmg/2));

    let target='hero';
    if(yunoJoined && battle.monsterId>=400){
      const r=Math.random();target=r<.34?'hero':r<.67?'suzu':'yuno';
    }else if(isPartyBattle() && Math.random()<0.4)target='suzu';

    const evadeChance=(battle.evadeAllTurns>0?.30:0)+((battle.evadeTarget===target&&battle.evadeTurns>0)?.25:0);
    if(Math.random()<evadeChance){
      attackLines.push(`${foe.name} → ${target==='hero'?heroName:target==='suzu'?'スズマル':'ユーノ'} 回避！`);
      return;
    }

    const enemySpots=[[650,235],[770,235],[610,310],[720,320],[830,310]];
    const ep=enemySpots[Math.min(idx,enemySpots.length-1)]||[700,245];
    addDamagePopup('攻撃！',ep[0],ep[1]-45,'#ffcf9d');

    if(target==='yuno'){
      dmg=Math.max(1,baseDmg-Math.floor(ys.def/4));
      battle.yunoHP=Math.max(1,battle.yunoHP-dmg);totalYuno+=dmg;
      attackLines.push(`${foe.name} → ユーノ ${dmg}`);
    }else if(target==='suzu'){
      dmg=Math.max(1,baseDmg-Math.floor(ss.def/4));
      battle.suzuHP=Math.max(1,battle.suzuHP-dmg);
      totalSuzu+=dmg;
      attackLines.push(`${foe.name} → スズマル ${dmg}`);
    }else{
      dmg=Math.max(1,baseDmg-Math.floor(progress.def/4));
      battle.heroHP=Math.max(1,battle.heroHP-dmg);
      totalHero+=dmg;
      attackLines.push(`${foe.name} → ${heroName} ${dmg}`);
    }
  });

  battle.defending=false;

  if(totalHero>0){
    addDamagePopup(`-${totalHero}`,185,215,'#ff796e');
    setBattleFx('hitHero',185,255);
  }
  if(totalSuzu>0){addDamagePopup(`-${totalSuzu}`,265,215,'#ff796e');setBattleFx('hitSuzu',265,258);}
  if(totalYuno>0){addDamagePopup(`-${totalYuno}`,380,215,'#ff796e');}

  // Keep this text on screen during enemyResult.
  battleMessage=`敵の攻撃！ ${attackLines.join(' / ')}`;
  if(battle.regenTurns>0){
    const heal=7;
    battle.heroHP=Math.min(progress.maxHP,battle.heroHP+heal);
    battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+heal);
    if(battle.yunoHP!==undefined)battle.yunoHP=Math.min(battle.yunoMaxHP,battle.yunoHP+heal);
    battle.regenTurns--;
    battleMessage+=` / そよぎの輪 +${heal}`;
  }
  if(battle.evadeAllTurns>0)battle.evadeAllTurns--;
  if(battle.evadeTurns>0)battle.evadeTurns--;
  if(isPartyBattle())battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択'};

  battle.turn='enemyResult';
  battleCooldown=1.15;
}
function finishBattle(){
  if(battle && battle.monsterId===99){
    caveBoss.alive=false;caveBoss.hp=0;
    const expGain=35;
    progress.gold+=35;
    const leveled=gainExp(expGain);
    saveProgress();
    battle=null;scene='cave';touchUI.classList.remove('hidden');
    caveHero.x=1450;caveHero.y=350;
    flashText=leveled?`マグマガメ撃破！ Lv.${progress.level}　SP+1`:'マグマガメ撃破！ 炎晶石への道が開いた';
    flashTimer=3.0;return;
  }

  if(battle && battle.monsterId>=400){
    const mon=takezoMobs.find(m=>m.id===battle.monsterId);
    if(mon)mon.alive=false;
    const expGain=28,goldGain=20;
    progress.gold+=goldGain;
    const leveled=gainExp(expGain);saveProgress();
    battle=null;
    if(takezoMobs.every(m=>!m.alive)){
      scene='takezoRelief';dialogIndex=0;touchUI.classList.add('hidden');
    }else{
      scene='takezoRoute';touchUI.classList.remove('hidden');
      flashText=leveled?`レベルアップ！ Lv.${progress.level}　各自SP+1`:`海賊小隊を撃退！ 経験値 ${expGain}`;
      flashTimer=2.2;
    }
    saveGame();return;
  }

  if(battle && battle.monsterId>=300){
    const mon=route3Mobs.find(m=>m.id===battle.monsterId);
    if(mon){mon.alive=false;mon.respawn=12.0;}
    const count=battle.enemies?battle.enemies.length:1;
    const expGain=18+(count-1)*8;
    const goldGain=12+(count-1)*5;
    progress.gold+=goldGain;
    const leveled=gainExp(expGain);saveProgress();
    battle=null;scene='route3';touchUI.classList.remove('hidden');
    flashText=leveled?`レベルアップ！ Lv.${progress.level}　SP+1`:`経験値 ${expGain} / ${goldGain}G 獲得！`;
    flashTimer=2.5;return;
  }

  if(battle && battle.monsterId>=200){
    const mon=caveMobs.find(m=>m.id===battle.monsterId);
    if(mon){mon.alive=false;mon.respawn=12.0;}
    const count=battle.enemies?battle.enemies.length:1;
    const expGain=(mon?({201:14,202:16,203:18}[mon.id]||12):12)+(count-1)*7;
    const goldGain=(mon?({201:9,202:11,203:12}[mon.id]||8):8)+(count-1)*5;
    progress.gold+=goldGain;
    const leveled=gainExp(expGain);saveProgress();
    battle=null;scene='cave';touchUI.classList.remove('hidden');
    flashText=leveled?`レベルアップ！ Lv.${progress.level}　SP+1`:`経験値 ${expGain} / ${goldGain}G 獲得！`;
    flashTimer=2.5;return;
  }

  const mon=monsters.find(m=>m.id===battle.monsterId);
  if(mon){mon.alive=false;mon.respawn=12.0;}
  const expGain=mon?({1:12,2:15,3:20}[mon.id]||10):10;
  const goldGain=mon?({1:8,2:10,3:14}[mon.id]||6):6;
  progress.gold+=goldGain;
  const leveled=gainExp(expGain);saveProgress();
  scene=menuReturnScene||'road2';touchUI.classList.remove('hidden');
  battle=null;
  flashText=leveled?`レベルアップ！ Lv.${progress.level}　SP+1`:`経験値 ${expGain} / ${goldGain}G 獲得！`;
  flashTimer=3.0;
}



function drawSarubieRitual(){
  // Dedicated ritual plaza, away from the forge.
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#d8b680');sky.addColorStop(1,'#c99b66');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  // volcano in distance
  ctx.fillStyle='#5f6258';ctx.beginPath();ctx.moveTo(690,225);ctx.lineTo(800,45);ctx.lineTo(920,225);ctx.closePath();ctx.fill();
  ctx.fillStyle='#8f5a46';ctx.beginPath();ctx.moveTo(780,78);ctx.lineTo(800,45);ctx.lineTo(824,80);ctx.closePath();ctx.fill();

  // stone ritual plaza
  rect(0,225,W,315,'#c7a171');
  ellipse(480,340,270,120,'#aa8b6b');
  ellipse(480,340,220,90,'#c4aa84');

  // altar at center
  outlineRect(415,240,130,76,'#765f56','#d2a46d',3);
  rect(435,218,90,24,'#8a6b5b');
  ctx.fillStyle='#ff8a45';
  ctx.beginPath();ctx.moveTo(480,183);ctx.lineTo(500,230);ctx.lineTo(480,266);ctx.lineTo(460,230);ctx.closePath();ctx.fill();

  // four braziers
  [[300,305],[660,305],[330,420],[630,420]].forEach(([x,y])=>{
    rect(x-15,y,30,17,'#5a4436');
    ctx.fillStyle='#f07a34';ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x-9,y-22);ctx.lineTo(x,y-14);ctx.lineTo(x+7,y-29);ctx.lineTo(x+13,y);ctx.closePath();ctx.fill();
  });

  drawHeroFox(260,385,1.24);
  drawDashmiu(345,392,1.12);
  drawSuzumaru(665,385,1.28);

  for(let i=0;i<7;i++){
    const ang=Math.PI*.12+i*Math.PI*.12;
    const x=480+Math.cos(ang)*250;
    const y=385+Math.sin(ang)*70;
    ellipse(x,y-11,10,9,'#b78c68');
    rect(x-9,y,18,22,'#6d2733');
  }

  const item=sarubieRitualDialog[Math.min(dialogIndex,sarubieRitualDialog.length-1)];
  drawDialog(item[0],item[1]);
}



function drawRoute3(){
  camera.x=Math.max(0,Math.min(1900-W,route3Hero.x-W*.45));
  camera.y=Math.max(0,Math.min(1050-H,route3Hero.y-H*.48));
  ctx.save();ctx.translate(-camera.x,-camera.y);
  const sky=ctx.createLinearGradient(0,0,0,1050);sky.addColorStop(0,'#b7e7e5');sky.addColorStop(1,'#9ad7b3');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1900,1050);

  // highland road; one map, readable
  ctx.fillStyle='#e6d7aa';ctx.beginPath();
  ctx.moveTo(100,820);ctx.bezierCurveTo(500,760,820,590,1080,450);ctx.bezierCurveTo(1330,315,1580,250,1830,220);
  ctx.lineTo(1860,350);ctx.bezierCurveTo(1590,390,1370,460,1130,585);ctx.bezierCurveTo(850,730,530,900,110,945);ctx.closePath();ctx.fill();

  // wind grass / stones
  for(let x=70;x<1850;x+=95){
    ctx.strokeStyle='#5ca48d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,600+(x%7)*18);ctx.quadraticCurveTo(x+20,580+(x%5)*18,x+28,560+(x%3)*20);ctx.stroke();
  }
  for(let x=80;x<1800;x+=180) ellipse(x,245+(x%4)*55,24,13,'#77a28d');

  for(const mon of route3Mobs) drawRoute3Mob(mon);

  // Sarubibi entrance visible at far end
  rect(1740,180,18,95,'#2d7779');rect(1850,180,18,95,'#2d7779');rect(1735,175,138,18,'#269195');
  text('さるびび村',1804,152,17,'center','#24585d');
  drawWindHouse(1765,245);

  drawHeroFox(route3Hero.x,route3Hero.y,1.15);
  drawSuzumaru(route3Hero.x-52,route3Hero.y+18,1.02);
  drawDashmiu(route3Hero.x-98,route3Hero.y+32,.94);
  ctx.restore();

  const ht=hudTop();
  ctx.fillStyle='rgba(17,63,70,.85)';ctx.fillRect(18,ht,355,46);
  text('目的：さるびび村へ急ぐ',35,ht+23,18);
}

function drawSarubibiVillageBG(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#a8e2e1');sky.addColorStop(1,'#d5ebc9');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  rect(0,245,W,295,'#92cda9');
  // windmills / ribbon poles
  for(const x of [140,820]){
    rect(x,170,8,110,'#557b73');
    ctx.strokeStyle='#f2f7ed';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(x+4,175);ctx.lineTo(x-30,145);ctx.moveTo(x+4,175);ctx.lineTo(x+40,145);ctx.moveTo(x+4,175);ctx.lineTo(x-30,205);ctx.moveTo(x+4,175);ctx.lineTo(x+40,205);ctx.stroke();
  }
  drawWindHouse(70,280);drawWindHouse(210,245);drawWindHouse(735,275);
  outlineRect(450,255,125,82,'#e9f4ec','#3d7776',2);
  text('防衛隊詰所',512,278,15,'center','#315a5e');
}



function drawTsukipopo(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.strokeStyle='#6ba596';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(0,-4);ctx.stroke();
  ellipse(-6,-7,7,5,'rgba(224,247,164,.85)');
  ellipse(6,-7,7,5,'rgba(224,247,164,.85)');
  ellipse(0,-12,7,7,'#f6f0a4');
  ellipse(0,-12,3,3,'#fff7c6');
  ctx.restore();
}

function drawNightIntro(){
  drawSarubibiVillageBG();
  ctx.fillStyle='rgba(12,25,45,.54)';ctx.fillRect(0,0,W,H);
  drawHeroFox(255,370,1.2);
  drawSuzumaru(365,375,1.1);
  drawDashmiu(470,383,1.0);
  drawYuno(590,375,1.15);
  drawDefenseCaptain(745,375,1.18);
  const item=sarubibiNightDialog[Math.min(dialogIndex,sarubibiNightDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawNightTrail(){
  camera.x=Math.max(0,Math.min(1700-W,nightHero.x-W*.46));
  camera.y=Math.max(0,Math.min(980-H,nightHero.y-H*.46));
  ctx.save();ctx.translate(-camera.x,-camera.y);

  const sky=ctx.createLinearGradient(0,0,0,980);
  sky.addColorStop(0,'#152640');sky.addColorStop(1,'#315969');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1700,980);

  // grass and moonlit road
  rect(0,260,1700,720,'#375f55');
  ctx.fillStyle='#6d7464';ctx.beginPath();
  ctx.moveTo(90,810);ctx.bezierCurveTo(430,760,700,620,980,500);ctx.bezierCurveTo(1260,380,1450,315,1630,290);
  ctx.lineTo(1670,390);ctx.bezierCurveTo(1450,430,1280,490,1030,610);ctx.bezierCurveTo(720,760,450,880,100,925);ctx.closePath();ctx.fill();

  // bushes for hiding
  for(let x=120;x<1600;x+=170){
    ellipse(x,515+(x%5)*48,38,23,'#294b47');
    ellipse(x+35,525+(x%4)*42,33,20,'#315953');
  }

  // lover walking ahead
  drawCaptainLover(1475,335,1.05);

  // final Tsukipopo patch
  for(let i=0;i<12;i++){
    const x=1420+(i%4)*45;
    const y=220+Math.floor(i/4)*30;
    drawTsukipopo(x,y,1.0+(i%3)*.1);
  }

  drawHeroFox(nightHero.x,nightHero.y,1.12);
  drawSuzumaru(nightHero.x-48,nightHero.y+18,1.0);
  drawDashmiu(nightHero.x-92,nightHero.y+30,.92);
  drawYuno(nightHero.x-134,nightHero.y+36,.92);

  ctx.restore();

  const ht=hudTop();
  ctx.fillStyle='rgba(10,28,48,.88)';ctx.fillRect(18,ht,390,46);
  text('目的：気づかれないように後を追う',35,ht+23,16);
}

function drawTsukipopoReveal(){
  ctx.fillStyle='#172944';ctx.fillRect(0,0,W,H);
  rect(0,250,W,290,'#365e55');

  for(let i=0;i<24;i++){
    const x=520+(i%6)*42;
    const y=260+Math.floor(i/6)*38;
    drawTsukipopo(x,y,1.15);
  }

  drawHeroFox(220,375,1.18);
  drawSuzumaru(325,380,1.08);
  drawDashmiu(420,388,1.0);
  drawYuno(510,380,1.1);
  drawCaptainLover(760,375,1.2);

  const item=tsukipopoRevealDialog[Math.min(dialogIndex,tsukipopoRevealDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawSarubibiResolve(){
  drawSarubibiVillageBG();
  drawDefenseCaptain(275,360,1.25);
  drawCaptainLover(390,360,1.2);
  drawHeroFox(520,360,1.18);
  drawDashmiu(615,368,1.0);
  drawSuzumaru(710,360,1.12);
  drawYuno(810,360,1.18);

  const item=sarubibiResolveDialog[Math.min(dialogIndex,sarubibiResolveDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawSarubibiTown(){
  drawSarubibiVillageBG();

  // Weapon shop
  drawWindHouse(430,285);
  outlineRect(432,252,92,30,'#d8f1e9','#3c7776',2);
  text('武器屋',478,267,14,'center','#315a5e');

  // Item shop
  drawWindHouse(600,285);
  outlineRect(602,252,92,30,'#d8f1e9','#3c7776',2);
  text('道具屋',648,267,14,'center','#315a5e');

  // Defense office
  outlineRect(765,270,135,88,'#eaf5ee','#3d7776',2);
  text('防衛隊詰所',832,293,15,'center','#315a5e');

  drawHeroFox(sarubibiHero.x,sarubibiHero.y,1.18);
  drawSuzumaru(sarubibiHero.x-50,sarubibiHero.y+18,1.02);
  drawDashmiu(sarubibiHero.x-96,sarubibiHero.y+30,.93);

  const ht=hudTop();
  ctx.fillStyle='rgba(17,63,70,.86)';ctx.fillRect(18,ht,420,48);
  text(`さるびび村　${progress.gold}G　A：調べる`,35,ht+24,17);
}

function openSarubibiShop(type){
  sarubibiShopType=type;
  scene='sarubibiShop';
  touchUI.classList.add('hidden');
}

function drawSarubibiShop(){
  ctx.fillStyle='#123840';ctx.fillRect(0,0,W,H);
  text(sarubibiShopType==='weapon'?'さるびび武器屋':'さるびび道具屋',70,58,31,'left','#fff',800);
  text(`所持金：${progress.gold}G`,760,58,22,'center','#e5fff5');

  if(sarubibiShopType==='weapon'){
    const bought=progress.shopBought.windKnife===true;
    outlineRect(80,125,800,120,bought?'#576575':'#eefaf7','#64aaa8',2);
    text('風切りの小剣',115,157,24,'left',bought?'#c7d0d6':'#173a3e');
    text('主人公の攻撃力 +4',115,193,18,'left',bought?'#aab5bd':'#395f63');
    text(bought?'購入済み':'85G',820,184,20,'right',bought?'#c7d0d6':'#2a7e78');
    text('風を受け流す軽量な小剣。',115,224,15,'left',bought?'#aab5bd':'#526f72');
  }else{
    outlineRect(80,125,800,120,'#eefaf7','#64aaa8',2);
    text('回復薬',115,157,24,'left','#173a3e');
    text('戦闘中、味方1人のHPを25回復',115,193,18,'left','#395f63');
    text('20G',820,184,20,'right','#2a7e78');
    text(`所持数：${progress.items.potion}`,115,224,15,'left','#526f72');
  }

  outlineRect(315,335,330,66,'#dff4f2','#61a7a5',2);text('購入する',480,368,22,'center','#173a3e');
  outlineRect(315,420,330,58,'#304e58','#66888e',2);text('店を出る',480,449,20,'center','#e5f3f1');
}

function sarubibiShopBuy(){
  if(sarubibiShopType==='weapon'){
    if(progress.shopBought.windKnife){flashText='もう購入済みです';flashTimer=1.6;return;}
    if(progress.gold<85){flashText='お金が足りません';flashTimer=1.6;return;}
    progress.gold-=85;progress.atk+=4;progress.shopBought.windKnife=true;saveProgress();saveGame();
    flashText='風切りの小剣を装備した！ 攻撃力+4';flashTimer=2.1;
  }else{
    if(progress.gold<20){flashText='お金が足りません';flashTimer=1.6;return;}
    progress.gold-=20;progress.items.potion+=1;saveProgress();saveGame();
    flashText=`回復薬を買った！ 所持数 ${progress.items.potion}`;flashTimer=1.8;
  }
}

function drawSarubibiArrival(){
  drawSarubibiVillageBG();
  drawHeroFox(275,355,1.25);
  drawSuzumaru(385,360,1.18);
  drawDashmiu(485,368,1.08);
  drawYuno(655,355,1.3);
  // depressed defense captain: color-variant weasel
  drawDefenseCaptain(765,355,1.25);
  const item=sarubibiArrivalDialog[Math.min(dialogIndex,sarubibiArrivalDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawSarubieTown(){
  drawSarubieVillageBG();

  // weapon shop / forge
  outlineRect(455,250,150,112,'#6a4c3d','#3e2c27',2);
  rect(478,215,104,42,'#482f2a');
  text('武器屋・鍛冶場',530,235,15,'center','#f3d9b1');

  // item shop
  drawFireHouse(720,255);
  outlineRect(722,225,88,30,'#f0d39a','#83593d',2);
  text('道具屋',766,240,14,'center','#4d332c');

  // cave road
  outlineRect(845,330,92,42,'#ead2a2','#7f6045',2);
  text('火山麓',891,351,14,'center','#4b382c');
  ctx.fillStyle='#4a4140';
  ctx.beginPath();ctx.moveTo(875,292);ctx.lineTo(915,292);ctx.lineTo(938,330);ctx.lineTo(852,330);ctx.closePath();ctx.fill();

  // ritual plaza sign points elsewhere
  outlineRect(88,212,104,34,'#e9d4a1','#8b6343',2);
  text('火鎮め広場',140,229,13,'center','#4d332c');

  drawHeroFox(townHero.x,townHero.y,1.22);
  if(suzumaruActive) drawSuzumaru(townHero.x-52,townHero.y+18,1.08);
  drawDashmiu(townHero.x-100,townHero.y+32,0.98);

  const ht=hudTop();
  ctx.fillStyle='rgba(53,31,34,.86)';ctx.fillRect(18,ht,400,48);
  text(`さるびえ村　${progress.gold}G　A：調べる`,35,ht+24,17);
}

function openShop(type){
  shopType=type;
  scene='shop';
  touchUI.classList.add('hidden');
}

function drawShop(){
  ctx.fillStyle='#14233c';ctx.fillRect(0,0,W,H);
  text(shopType==='weapon'?'さるびえ武器屋':'さるびえ道具屋',70,58,31,'left','#fff',800);
  text(`所持金：${progress.gold}G`,760,58,22,'center','#ffe4a3');

  if(shopType==='weapon'){
    const bought=progress.shopBought.fireBlade;
    outlineRect(80,125,800,120,bought?'#576575':'#eef8fb','#79b9d5',2);
    text('火打ちの小剣',115,157,24,'left',bought?'#c7d0d6':'#17324a');
    text('主人公の攻撃力 +3',115,193,18,'left',bought?'#aab5bd':'#395a70');
    text(bought?'購入済み':'60G',820,184,20,'right',bought?'#c7d0d6':'#b4612e');
    text('炎の村で鍛えた軽い小剣。水・氷魔法の邪魔をしない。',115,224,15,'left',bought?'#aab5bd':'#526f82');
  }else{
    outlineRect(80,125,800,120,'#eef8fb','#79b9d5',2);
    text('回復薬',115,157,24,'left','#17324a');
    text('戦闘中、味方1人のHPを25回復',115,193,18,'left','#395a70');
    text('20G',820,184,20,'right','#b4612e');
    text(`所持数：${progress.items.potion}`,115,224,15,'left','#526f82');
  }

  outlineRect(315,335,330,66,'#dff4fb','#71bad7',2);
  text('購入する',480,368,22,'center','#17324a');
  outlineRect(315,420,330,58,'#344a64','#718aa0',2);
  text('店を出る',480,449,20,'center','#e5eef4');
}

function shopBuy(){
  if(shopType==='weapon'){
    if(progress.shopBought.fireBlade){flashText='もう購入済みです';flashTimer=1.6;return;}
    if(progress.gold<60){flashText='お金が足りません';flashTimer=1.6;return;}
    progress.gold-=60;
    progress.atk+=3;
    progress.shopBought.fireBlade=true;
    saveProgress();saveGame();
    flashText='火打ちの小剣を装備した！ 攻撃力+3';flashTimer=2.1;
  }else{
    if(progress.gold<20){flashText='お金が足りません';flashTimer=1.6;return;}
    progress.gold-=20;
    progress.items.potion+=1;
    saveProgress();saveGame();
    flashText=`回復薬を買った！ 所持数 ${progress.items.potion}`;flashTimer=1.8;
  }
}

function drawSarubieArrival(){
  drawSarubieVillageBG();
  drawHeroFox(300,340,1.35);
  drawDashmiu(415,346,1.28);
  drawSuzumaru(610,340,1.38);
  for(let i=0;i<4;i++){
    const x=690+i*48,y=385+(i%2)*6;
    ellipse(x,y-12,11,10,'#b98d68');rect(x-10,y,20,24,'#6d2733');
  }
  const item=sarubieArrivalDialog[Math.min(dialogIndex,sarubieArrivalDialog.length-1)];
  drawDialog(item[0],item[1]);
}




function drawRoute3Mob(mon){
  if(!mon||!mon.alive)return;
  const x=mon.x,y=mon.y;
  ctx.save();ctx.translate(x,y);
  ellipse(0,18,22,6,'rgba(0,0,0,.16)');
  if(mon.kind==='radishFerret'){
    ellipse(0,1,19,16,'#f4eee4');
    ctx.fillStyle='#7dbb69';ctx.beginPath();ctx.moveTo(-6,-14);ctx.lineTo(-16,-29);ctx.lineTo(-2,-23);ctx.lineTo(4,-34);ctx.lineTo(10,-16);ctx.closePath();ctx.fill();
    ellipse(-8,-2,4,4,'#263149');ellipse(7,-2,4,4,'#263149');
    ctx.strokeStyle='#cbb991';ctx.lineWidth=5;ctx.beginPath();ctx.arc(17,5,17,-1.1,1.1);ctx.stroke();
  }else if(mon.kind==='beanMarten'){
    ellipse(0,0,21,15,'#75b36c');
    ellipse(-9,-12,6,6,'#c8aa78');ellipse(9,-12,6,6,'#c8aa78');
    rect(-8,-3,4,4,'#263149');rect(5,-3,4,4,'#263149');
    ctx.strokeStyle='#b89568';ctx.lineWidth=6;ctx.beginPath();ctx.arc(18,7,18,-1.1,1.15);ctx.stroke();
    ellipse(-5,2,5,8,'#a6d69a');ellipse(6,2,5,8,'#a6d69a');
  }else{
    // Peach + weasel
    ellipse(0,2,20,15,'#e6ad88');
    ellipse(-9,-11,5,6,'#b98a67');ellipse(9,-11,5,6,'#b98a67');
    rect(-7,-2,3,4,'#263149');rect(5,-2,3,4,'#263149');
    // peach crown / leaf
    ctx.fillStyle='#70a95f';ctx.beginPath();ctx.ellipse(6,-18,9,5,-.45,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b98a67';ctx.lineWidth=6;ctx.beginPath();ctx.arc(18,8,18,-1.1,1.15);ctx.stroke();
  }
  ctx.restore();
}

function drawCaveMob(mon){
  if(!mon || !mon.alive)return;
  const x=mon.x,y=mon.y;
  if(mon.kind==='emberLizard'){
    ctx.save();ctx.translate(x,y);
    ellipse(0,18,22,6,'rgba(0,0,0,.2)');
    ellipse(0,0,24,12,'#d66a43');
    ellipse(20,-3,10,8,'#e27c4f');
    rect(22,-6,3,3,'#243149');
    ctx.strokeStyle='#c95839';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-20,2);ctx.lineTo(-38,-8);ctx.stroke();
    text('🔥',-34,-18,16,'center');
    ctx.restore();
  }else if(mon.kind==='pepperMouse'){
    ctx.save();ctx.translate(x,y);
    ellipse(0,18,20,6,'rgba(0,0,0,.2)');
    ctx.fillStyle='#b53838';ctx.beginPath();ctx.moveTo(-18,10);ctx.lineTo(-10,-12);ctx.lineTo(12,-18);ctx.lineTo(20,8);ctx.closePath();ctx.fill();
    ellipse(-9,-14,6,6,'#8d6a52');ellipse(9,-14,6,6,'#8d6a52');
    rect(-7,-5,3,4,'#243149');rect(5,-5,3,4,'#243149');
    ctx.strokeStyle='#8d6a52';ctx.lineWidth=3;ctx.beginPath();ctx.arc(20,7,17,-1.0,1.0);ctx.stroke();
    ctx.restore();
  }else{
    ctx.save();ctx.translate(x,y);
    ellipse(0,18,22,6,'rgba(0,0,0,.2)');
    ellipse(0,3,22,16,'#766f64');
    ellipse(0,-3,15,12,'#928a7b');
    rect(-7,-6,3,4,'#243149');rect(4,-6,3,4,'#243149');
    ctx.fillStyle='#c3b49b';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(7,7);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();
    ctx.restore();
  }
}

function drawCaveBoss(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,36,34,8,'rgba(0,0,0,.28)');

  // rear shell: broad and clearly turtle-like
  ellipse(-4,4,38,28,'#7d4437');
  ellipse(-4,1,31,22,'#a9553e');

  // lava seams on shell
  ctx.strokeStyle='#ff8a3d';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-26,-4);ctx.lineTo(-10,6);ctx.lineTo(-18,18);ctx.stroke();
  ctx.beginPath();ctx.moveTo(3,-15);ctx.lineTo(8,2);ctx.lineTo(24,10);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-2,8);ctx.lineTo(12,22);ctx.stroke();

  // head protrudes in front
  ellipse(38,8,17,14,'#c96743');
  ellipse(44,12,10,8,'#df8456');
  rect(39,3,4,5,'#243149');
  rect(48,12,3,2,'#693d31');

  // four short legs
  ellipse(-24,27,12,8,'#8e4c3d');
  ellipse(18,28,12,8,'#8e4c3d');
  ellipse(-30,-12,10,7,'#8e4c3d');
  ellipse(15,-15,10,7,'#8e4c3d');

  // small tail
  ctx.fillStyle='#8e4c3d';
  ctx.beginPath();ctx.moveTo(-41,7);ctx.lineTo(-56,14);ctx.lineTo(-42,20);ctx.closePath();ctx.fill();

  // heat / flame accent
  ctx.fillStyle='#ff9c45';
  ctx.beginPath();ctx.moveTo(-5,-30);ctx.lineTo(2,-48);ctx.lineTo(9,-30);ctx.lineTo(4,-24);ctx.closePath();ctx.fill();

  ctx.restore();
}
function drawCave(){
  camera.x=Math.max(0,Math.min(1800-W,caveHero.x-W*.5));
  camera.y=Math.max(0,Math.min(1000-H,caveHero.y-H*.5));
  ctx.save();ctx.translate(-camera.x,-camera.y);
  rect(0,0,1800,1000,'#302d35');
  // simple, readable cave floor
  rect(70,90,1660,820,'#51464a');
  // walls
  for(let x=70;x<1730;x+=90){ellipse(x,95,52,35,'#292832');ellipse(x,900,52,35,'#292832');}
  for(let y=120;y<900;y+=80){ellipse(75,y,42,48,'#292832');ellipse(1725,y,42,48,'#292832');}
  // winding but not maze-like route markers
  for(let x=250;x<1450;x+=230) ellipse(x,520+(x%460?80:-80),28,18,'#403a40');
  // lava cracks
  for(let x=480;x<1380;x+=280){
    ctx.strokeStyle='#e46c38';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,220);ctx.lineTo(x+35,260);ctx.lineTo(x+12,300);ctx.stroke();
  }
  // crystal altar
  outlineRect(1510,160,105,70,'#6b5b57','#b98754',2);
  if(!caveCrystalTaken){
    ctx.fillStyle='#ff8a45';ctx.beginPath();ctx.moveTo(1562,120);ctx.lineTo(1582,170);ctx.lineTo(1562,202);ctx.lineTo(1542,170);ctx.closePath();ctx.fill();
    text('炎晶石',1562,95,17,'center','#ffd39d');
  }
  for(const mon of caveMobs) drawCaveMob(mon);
  if(caveBoss.alive) drawCaveBoss(caveBoss.x,caveBoss.y,1.45);

  drawHeroFox(caveHero.x,caveHero.y,1.15);
  if(suzumaruActive) drawSuzumaru(caveHero.x-52,caveHero.y+18,1.04);
  drawDashmiu(caveHero.x-98,caveHero.y+34,0.98);
  ctx.restore();

  const ht=hudTop();
  ctx.fillStyle='rgba(9,22,35,.88)';ctx.fillRect(18,ht,390,46);
  text(caveBoss.alive?'目的：洞窟の奥で炎晶石を探す':'目的：炎晶石を手に入れる',35,ht+23,17);
}


function caveEncounterGroup(first){
  const pool=[
    {name:'ヤキトカゲ',kind:'emberLizard',hp:32,maxHP:32},
    {name:'トウガラネズミ',kind:'pepperMouse',hp:36,maxHP:36},
    {name:'イワモグラ',kind:'rockMole',hp:42,maxHP:42}
  ];
  // Early cave: usually 2-3. Deeper cave can occasionally reach 4-5.
  let count=2+Math.floor(Math.random()*2);
  if(caveHero.x>1050 && Math.random()<0.38) count=4+Math.floor(Math.random()*2);
  const enemies=[{name:first.name,kind:first.kind,hp:first.hp,maxHP:first.maxHP}];
  while(enemies.length<count){
    const t=pool[Math.floor(Math.random()*pool.length)];
    enemies.push({...t});
  }
  return enemies;
}
function livingEnemies(){
  return battle && battle.enemies ? battle.enemies.filter(e=>e.hp>0) : [];
}
function syncPrimaryEnemy(){
  if(!battle || !battle.enemies)return;
  const live=livingEnemies();
  if(live.length){
    battle.enemyName=live[0].name;
    battle.enemyKind=live[0].kind;
    battle.enemyHP=live[0].hp;
    battle.enemyMaxHP=live[0].maxHP;
  }
}
function damageEnemy(amount,index=0){
  if(!battle.enemies){
    const actual=Math.max(0,Math.min(amount,battle.enemyHP));
    battle.enemyHP-=amount;
    addDamagePopup(`${actual} DAMAGE`,700,205,'#ffffff');
    return actual;
  }
  const live=livingEnemies();
  const target=live[Math.min(index,live.length-1)];
  if(!target)return 0;
  const actual=Math.max(0,Math.min(amount,target.hp));
  target.hp=Math.max(0,target.hp-amount);
  // map target to battle positions
  const allLiveBefore=battle.enemies.filter(e=>e.hp>0 || e===target);
  const idx=battle.enemies.indexOf(target);
  const spots=[[650,235],[770,235],[610,310],[720,320],[830,310]];
  const p=spots[Math.min(idx,spots.length-1)]||[700,245];
  addDamagePopup(`${actual}`,p[0],p[1]-30,'#ffffff');
  syncPrimaryEnemy();
  return actual;
}
function damageAllEnemies(base){
  if(!battle.enemies){
    const actual=Math.max(0,Math.min(base,battle.enemyHP));
    battle.enemyHP-=base;
    addDamagePopup(`${actual}`,700,205,'#ffffff');
    return [actual];
  }
  const damages=[];
  const spots=[[650,235],[770,235],[610,310],[720,320],[830,310]];
  battle.enemies.forEach((e,idx)=>{
    if(e.hp<=0)return;
    const dmg=Math.max(1,base+Math.floor(Math.random()*5)-2);
    const actual=Math.min(dmg,e.hp);
    e.hp=Math.max(0,e.hp-dmg);
    damages.push({name:e.name,damage:actual});
    const p=spots[Math.min(idx,spots.length-1)]||[700,245];
    addDamagePopup(`${actual}`,p[0],p[1]-30,'#ffffff');
  });
  syncPrimaryEnemy();
  return damages;
}
function enemiesDefeated(){
  return battle.enemies ? livingEnemies().length===0 : battle.enemyHP<=0;
}



function startTakezoBattle(mon){
  const ss=suzumaruStats(),ys=yunoStats();
  const piratePool=[
    {name:'海賊ネコ斥候',kind:'pirateCat',hp:48,maxHP:48},
    {name:'海賊イヌ斥候',kind:'pirateDog',hp:52,maxHP:52},
    {name:'海賊タヌキ斥候',kind:'pirateTanuki',hp:56,maxHP:56}
  ];
  const count=3+Math.floor(Math.random()*3);
  const enemies=[{name:mon.name,kind:mon.kind,hp:mon.hp,maxHP:mon.maxHP}];
  while(enemies.length<count)enemies.push({...piratePool[Math.floor(Math.random()*piratePool.length)]});
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    regenTurns:0,hasteTarget:null,evadeTarget:null,evadeAllTurns:0,
    enemies,
    enemyHP:mon.hp,enemyMaxHP:mon.maxHP,
    monsterId:mon.id,enemyName:mon.name,enemyKind:mon.kind,
    turn:'player',defending:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択'};
  battleMessage=`${mon.name}が立ちはだかった！`;
  scene='battle';touchUI.classList.add('hidden');
}
function startRoute3Battle(mon){
  const ss=suzumaruStats();
  const pool=[
    {name:'ダイコンフェレット',kind:'radishFerret',hp:46,maxHP:46},
    {name:'ソラマメテン',kind:'beanMarten',hp:50,maxHP:50},
    {name:'モモイタチ',kind:'peachWeasel',hp:54,maxHP:54}
  ];
  const count=2+Math.floor(Math.random()*3);
  const enemies=[{name:mon.name,kind:mon.kind,hp:mon.hp,maxHP:mon.maxHP}];
  while(enemies.length<count) enemies.push({...pool[Math.floor(Math.random()*pool.length)]});
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    enemies,enemyHP:enemies[0].hp,enemyMaxHP:enemies[0].maxHP,
    monsterId:mon.id,enemyName:enemies[0].name,enemyKind:enemies[0].kind,
    turn:'player',defending:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択'};
  battleMessage=`${enemies.length}体の魔物が現れた！`;
  scene='battle';touchUI.classList.add('hidden');
}

function startCaveMobBattle(mon){
  const ss=suzumaruStats();
  const enemies=caveEncounterGroup(mon);
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    enemies,
    enemyHP:enemies[0].hp,enemyMaxHP:enemies[0].maxHP,
    monsterId:mon.id,enemyName:enemies[0].name,enemyKind:enemies[0].kind,
    turn:'player',defending:false
  };
  battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択'};
  damagePopups=[];battleMessage=`${enemies.length}体の魔物が現れた！`;
  scene='battle';touchUI.classList.add('hidden');
}

function startCaveBossBattle(){
  const ss=suzumaruStats();
  caveBattle=true;
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    enemyHP:caveBoss.hp,enemyMaxHP:caveBoss.maxHP,
    monsterId:99,monsterName:'マグマガメ',enemyName:'マグマガメ',enemyKind:'magmaTurtle',
    turn:'player',guard:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';battleChoiceText={hero:'未選択',suzu:'未選択'};battleMessage='炎晶石を守るマグマガメが現れた！';
  scene='battle';touchUI.classList.add('hidden');
}

function drawMenu(){
  ctx.fillStyle='#0e1d37';ctx.fillRect(0,0,W,H);
  text('メニュー',55,42,28,'left','#ffffff',800);

  // tabs
  outlineRect(45,72,165,46,menuPage==='status'?'#dff4fb':'#31455f','#78b9d7',2);
  text('ステータス',127,95,17,'center',menuPage==='status'?'#17324a':'#d9e6ef');
  outlineRect(225,72,165,46,menuPage==='skill'?'#dff4fb':'#31455f','#78b9d7',2);
  text('スキル',307,95,17,'center',menuPage==='skill'?'#17324a':'#d9e6ef');
  outlineRect(405,72,165,46,'#31455f','#78b9d7',2);
  text('もちもの',487,95,17,'center','#8ea5b7');
  outlineRect(750,72,165,46,'#31455f','#78b9d7',2);
  text('とじる',832,95,17,'center','#d9e6ef');

  if(menuPage==='status'){
    const members=[
      {key:'hero',name:heroName,draw:drawHeroFox,stats:{maxHP:progress.maxHP,maxMP:progress.maxMP,atk:progress.atk,def:progress.def},sp:progress.sp,desc:'水・氷 / 短剣・小剣',border:'#6ea9c8'},
    ];
    if(suzumaruActive||suzumaruJoined){
      members.push({key:'suzu',name:'スズマル',draw:drawSuzumaru,stats:suzumaruStats(),sp:progress.suzuSP||0,desc:'火 / 剣・大剣　単体攻撃型',border:'#b56a5a'});
    }
    if(yunoJoined){
      members.push({key:'yuno',name:'ユーノ',draw:drawYuno,stats:yunoStats(),sp:progress.yunoSP||0,desc:'風 / 弓　補助・遠距離型',border:'#55aaa8'});
    }

    const n=members.length;
    const gap=14, left=35, totalW=890;
    const pw=(totalW-gap*(n-1))/n;
    members.forEach((m,i)=>{
      const x=left+i*(pw+gap);
      outlineRect(x,140,pw,315,'#182b48',m.border,2);
      m.draw(x+pw/2,225,n>=3?1.18:1.5);
      text(m.name,x+18,292,21,'left','#ffffff',800);
      text(`Lv.${progress.level}`,x+pw-18,292,15,'right','#d9edf7');
      text(`HP ${m.stats.maxHP}　MP ${m.stats.maxMP}`,x+18,327,15,'left','#ffffff');
      text(`攻 ${m.stats.atk}　防 ${m.stats.def}`,x+18,357,15,'left','#ffffff');
      text(`SP ${m.sp}`,x+18,387,16,'left','#ffe7a5');
      text(m.desc,x+18,420,n>=3?12:14,'left','#bcd7e5');
    });
    text('レベルはパーティ共通。戦闘終了後はHP・MPが全回復します。',480,492,15,'center','#bad9e7');
  }else if(menuPage==='skill'){
    // character switch buttons
    const suzuEnabled=(suzumaruActive||suzumaruJoined);
    const yunoEnabled=yunoJoined;
    outlineRect(55,140,260,42,menuCharacter==='hero'?'#dff4fb':'#31455f','#78b9d7',2);
    text(heroName,185,161,16,'center',menuCharacter==='hero'?'#17324a':'#d9e6ef');
    outlineRect(350,140,260,42,menuCharacter==='suzu'?'#ffe1d7':'#31455f',suzuEnabled?'#c76e58':'#536273',2);
    text(suzuEnabled?'スズマル':'スズマル（未加入）',480,161,16,'center',suzuEnabled?(menuCharacter==='suzu'?'#65291f':'#e9d8d3'):'#758596');
    outlineRect(645,140,260,42,menuCharacter==='yuno'?'#d8f2ed':'#31455f',yunoEnabled?'#59aaa6':'#536273',2);
    text(yunoEnabled?'ユーノ':'ユーノ（未加入）',775,161,16,'center',yunoEnabled?(menuCharacter==='yuno'?'#174c4b':'#d6ece8'):'#758596');

    if(menuCharacter==='yuno' && yunoEnabled){
      text(`ユーノ SP：${progress.yunoSP||0}`,55,215,18,'left','#d8fff5');
      const ysks=[
        ['heal','風の癒し','全体回復'],['regen','そよぎの輪','全体徐々に回復'],
        ['wind','風刃嵐','敵全体攻撃'],['haste','疾風','1人を2回行動'],
        ['evade','風まとい','1人の回避率UP'],['evadeAll','風護陣','全体回避率UP']
      ];
      ysks.forEach((s,i)=>{
        const col=i%3,row=Math.floor(i/3),x=55+col*300,y=245+row*105,lv=progress.yunoSkills[s[0]]||0;
        outlineRect(x,y,280,88,'#183a43','#59aaa6',2);
        text(s[1],x+15,y+27,17,'left','#d8fff5');
        text(s[2],x+15,y+52,13,'left','#b9dfd9');
        text(lv?'習得済み':'習得 SP1',x+265,y+72,12,'right',lv?'#8fc8bd':'#ffe7a5');
      });
    }else if(menuCharacter==='suzu' && suzuEnabled){
      text(`スズマル SP：${progress.suzuSP||0}`,70,215,18,'left','#ffe5c8');

      outlineRect(70,245,385,82,'#ffe0d6','#c95f48',2);
      text(suzuSingleSkillName(),95,270,20,'left','#6b231d');
      {
        const sl=progress.suzuSkills?.single||0;
        const nxt=sl<1?'火炎斬りを強化':sl===1?'次：爆炎斬り':sl===2?'次：豪炎爆斬':'単体系・最大強化';
        text(nxt,95,300,15,'left','#8d4a3b');
      }
      text(`現在：Lv.${progress.suzuSkills?.single||0}`,420,285,15,'right','#6b231d');

      outlineRect(505,245,385,82,'#ffe8dc','#d47b55',2);
      text(suzuAllSkillName(),530,270,20,'left','#703525');
      {
        const al=progress.suzuSkills?.all||0;
        const nxt=al<1?'火走りを強化':al===1?'次：炎走陣':al===2?'次：烈火走陣':'全体系・最大強化';
        text(nxt,530,300,15,'left','#8d5847');
      }
      text(`現在：Lv.${progress.suzuSkills?.all||0}`,855,285,15,'right','#703525');

      text('スズマルは全体系も伸ばせますが、単体系の伸び幅が大きい設計です。',480,375,16,'center','#ffd5c6');
      text('現在の主力：火炎斬り / 火走り',480,420,17,'center','#ffffff');
    }else{
      text(`スキルポイント：${progress.sp}`,65,215,22,'left','#ffe8a8');

      outlineRect(65,250,390,82,progress.learned.iceSlash?'#536777':'#e7f5fb','#78b9d7',2);
      text(heroIceSkillName(),90,277,21,'left','#18334a');
      text((progress.heroIceSkill||0)>=2
        ?`MP7 / ${heroIceHits()}ヒットする氷属性の連続斬り`
        :'MP7 / 氷をまとった小剣で強く斬る',90,307,15,'left','#3d5d73');
      {
        const il=progress.heroIceSkill||0;
        const next=il===0?'習得 SP1':il===1?'→ 氷結二段斬り SP2':il===2?'→ 氷結三連斬り SP3':'最大強化';
        text(next,420,292,15,'right','#b66f31');
      }

      outlineRect(505,250,390,82,'#dceffc','#6aaacb',2);
      text('氷晶波',530,277,21,'left','#18334a');
      text('MP8 / 敵全体へ氷属性攻撃',530,307,15,'left','#3d5d73');

      text('主人公は回復・単体・全体を扱える万能型。',480,405,16,'center','#c8e1ec');
    }
  }
}
function menuTap(x,y){
  if(y>=70 && y<=125){
    if(x<215){menuPage='status';return;}
    if(x<400){menuPage='skill';return;}
    if(x>=740){
      scene=menuReturnScene||'road2';
      touchUI.classList.remove('hidden');
      return;
    }
  }

  if(menuPage==='skill' && y>=135 && y<=190){
    if(x<325){menuCharacter='hero';return;}
    if(x>=325 && x<630 && (suzumaruActive||suzumaruJoined)){menuCharacter='suzu';return;}
    if(x>=630 && yunoJoined){menuCharacter='yuno';return;}
  }

  if(menuPage==='skill' && menuCharacter==='yuno' && yunoJoined && y>=245 && y<=455){
    const col=Math.floor((x-55)/300),row=Math.floor((y-245)/105);
    if(col>=0&&col<3&&row>=0&&row<2){
      const keys=['heal','regen','wind','haste','evade','evadeAll'];
      const k=keys[row*3+col];
      if(progress.yunoSkills[k]){flashText='習得済みです';flashTimer=1.4;return;}
      if((progress.yunoSP||0)<1){flashText='ユーノのSPが足りない';flashTimer=1.5;return;}
      progress.yunoSP--;progress.yunoSkills[k]=1;saveProgress();saveGame();
      flashText='ユーノが新しい風術を習得！';flashTimer=1.8;return;
    }
  }

  if(menuPage==='skill' && menuCharacter==='suzu' && (suzumaruActive||suzumaruJoined)){
    if(y>=245 && y<=327){
      if(x>=70 && x<=455){
        const lv=progress.suzuSkills.single||0;
        if(lv>=3){flashText='単体系は最大強化です';flashTimer=1.6;return;}
        const cost=lv+1;
        if((progress.suzuSP||0)<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
        progress.suzuSP-=cost;
        progress.suzuSkills.single=lv+1;
        progress.suzuSpentSP=(progress.suzuSpentSP||0)+cost;
        saveProgress();saveGame();
        flashText=`「${suzuSingleSkillName()}」になった！`;flashTimer=1.9;return;
      }
      if(x>=505 && x<=890){
        const lv=progress.suzuSkills.all||0;
        if(lv>=3){flashText='全体系は最大強化です';flashTimer=1.6;return;}
        const cost=lv+1;
        if((progress.suzuSP||0)<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
        progress.suzuSP-=cost;
        progress.suzuSkills.all=lv+1;
        progress.suzuSpentSP=(progress.suzuSpentSP||0)+cost;
        saveProgress();saveGame();
        flashText=`「${suzuAllSkillName()}」になった！`;flashTimer=1.9;return;
      }
    }
  }

  // Hero ice-blade evolution: learn -> two-hit -> three-hit.
  if(menuPage==='skill' && menuCharacter==='hero' && y>=245 && y<=332 && x>=65 && x<=455){
    const lv=progress.heroIceSkill||0;
    const cost=lv===0?1:lv===1?2:lv===2?3:999;
    if(lv>=3){
      flashText='氷結斬り系は最大強化です';flashTimer=1.7;return;
    }
    if(progress.sp<cost){
      flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.7;return;
    }
    progress.sp-=cost;
    progress.heroIceSkill=lv+1;
    progress.learned.iceSlash=true;
    saveProgress();saveGame();
    flashText=`「${heroIceSkillName()}」になった！`;
    flashTimer=2.1;
    return;
  }
}

function drawPirateAnimal(x,y,kind='pirateCat',s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,30,21,6,'rgba(0,0,0,.18)');
  let fur='#c99768';
  if(kind==='pirateDog')fur='#b98762';
  if(kind==='pirateTanuki')fur='#8e7a68';
  // tail
  ctx.strokeStyle=fur;ctx.lineWidth=8;ctx.beginPath();ctx.arc(20,10,19,-1.2,1.2);ctx.stroke();
  // ears
  ctx.fillStyle=fur;
  ctx.beginPath();ctx.moveTo(-15,-17);ctx.lineTo(-9,-35);ctx.lineTo(-2,-20);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(15,-17);ctx.lineTo(9,-35);ctx.lineTo(2,-20);ctx.closePath();ctx.fill();
  ellipse(0,-10,19,17,fur);
  if(kind==='pirateDog'){ellipse(-16,-18,7,13,'#795b48');ellipse(16,-18,7,13,'#795b48');}
  if(kind==='pirateTanuki'){ellipse(-8,-11,7,6,'#4c4542');ellipse(8,-11,7,6,'#4c4542');}
  rect(-8,-13,4,5,'#172235');rect(4,-13,4,5,'#172235');
  ellipse(0,-4,5,4,'#382d2b');
  // pirate coat / sash
  rect(-17,5,34,28,'#d36d35');rect(-15,7,30,7,'#f09a4d');
  ctx.strokeStyle='#3d3150';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-14,8);ctx.lineTo(14,30);ctx.stroke();
  rect(-12,31,9,11,'#4a4651');rect(3,31,9,11,'#4a4651');
  // little cutlass
  ctx.strokeStyle='#dfe7e8';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(18,12);ctx.lineTo(32,-2);ctx.stroke();
  ctx.restore();
}
function drawTakezoVillageGate(){
  rect(0,0,W,H,'#a9d7e4');rect(0,235,W,305,'#8fbf91');
  // sea
  rect(0,235,170,305,'#65aecd');
  for(let y=255;y<520;y+=42){ctx.strokeStyle='rgba(235,250,255,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(160,y+12);ctx.stroke();}
  // hard stone-and-wood defenses
  rect(650,170,310,370,'#727c7d');
  for(let y=190;y<530;y+=45)for(let x=665;x<950;x+=55)outlineRect(x,y,48,35,'#9aa4a2','#5d686a',1);
  rect(690,285,190,255,'#4f6063');rect(730,335,110,205,'#31484d');
  // banners
  rect(675,135,8,85,'#584a3c');rect(920,135,8,85,'#584a3c');
  rect(683,142,45,28,'#d8c66e');rect(875,142,45,28,'#d8c66e');
}
function drawTakezoDeparture(){
  drawSarubibiVillageBG();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,0,W,H);
  drawHeroFox(250,365,1.18);drawSuzumaru(365,370,1.1);drawDashmiu(470,378,1.0);drawYuno(585,370,1.12);
  const item=takezoDepartureDialog[Math.min(dialogIndex,takezoDepartureDialog.length-1)];
  drawDialog(item[0],item[1]);
}
function drawTakezoArrival(){
  drawTakezoVillageGate();
  // defensive clash in the distance
  [
    [525,300,'pirateCat'],[575,335,'pirateDog'],[625,295,'pirateTanuki'],
    [675,345,'pirateCat'],[720,305,'pirateDog']
  ].forEach(p=>drawPirateAnimal(p[0],p[1],p[2],.82));
  drawHeroFox(235,390,1.15);drawSuzumaru(340,395,1.05);drawDashmiu(440,402,.95);drawYuno(535,395,1.05);
  const item=takezoArrivalDialog[Math.min(dialogIndex,takezoArrivalDialog.length-1)];
  drawDialog(item[0],item[1]);
}
function drawTakezoRoute(){
  camera.x=Math.max(0,Math.min(1500-W,takezoHero.x-W*.44));camera.y=0;
  ctx.save();ctx.translate(-camera.x,0);
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#9ed8e7');sky.addColorStop(1,'#d5e4b1');ctx.fillStyle=sky;ctx.fillRect(0,0,1500,H);
  rect(0,220,1500,320,'#7eaa72');
  // coast
  rect(0,220,120,320,'#63adca');
  // road to village
  ctx.fillStyle='#b7a77e';ctx.beginPath();ctx.moveTo(80,470);ctx.lineTo(1500,230);ctx.lineTo(1500,390);ctx.lineTo(80,540);ctx.closePath();ctx.fill();
  // village wall in distance
  rect(1370,135,130,300,'#747e7d');rect(1410,250,90,185,'#40565a');
  // smoke / battle cues
  ellipse(1280,165,35,18,'rgba(92,91,91,.28)');ellipse(1325,125,42,20,'rgba(92,91,91,.22)');
  for(const m of takezoMobs)if(m.alive)drawPirateAnimal(m.x,m.y,m.kind,1.05);
  drawHeroFox(takezoHero.x,takezoHero.y,1.12);
  drawSuzumaru(takezoHero.x-45,takezoHero.y+18,1.0);
  drawDashmiu(takezoHero.x-86,takezoHero.y+28,.9);
  drawYuno(takezoHero.x-128,takezoHero.y+34,.92);
  ctx.restore();
  const ht=hudTop();ctx.fillStyle='rgba(10,28,48,.88)';ctx.fillRect(18,ht,420,46);
  text(`目的：海賊の先行小隊を撃退する　残り ${takezoMobs.filter(m=>m.alive).length}`,35,ht+23,15);
}
function drawTakezoRelief(){
  drawTakezoVillageGate();
  drawHeroFox(205,390,1.12);drawSuzumaru(305,395,1.04);drawDashmiu(400,402,.94);drawYuno(495,395,1.04);
  const item=takezoReliefDialog[Math.min(dialogIndex,takezoReliefDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawEnd(){
  ctx.fillStyle='#0c1830';ctx.fillRect(0,0,W,H);
  drawHeroFox(300,270,1.55);drawSuzumaru(420,275,1.45);drawDashmiu(540,282,1.3);drawYuno(655,275,1.4);
  text('Ver.0.27 ここまで',480,105,40,'center');
  text('たけぞ村の先行部隊を撃退！',480,365,22,'center','#d8efff');
  text('次は：第2陣を迎え撃つ準備',480,405,20,'center','#d8efff');
  text('タップ / Enter でタイトルへ',480,462,18,'center','#9fc8df');
}
function update(dt){
  if(scene==='world'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;
    if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;
    if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      dash.x+=dx*dash.speed*dt;dash.y+=dy*dash.speed*dt;
    }
    dash.x=Math.max(60,Math.min(world.width-70,dash.x));
    dash.y=Math.max(140,Math.min(world.height-130,dash.y));

    if(dash.x<560&&dash.y>760&&!villageEventStarted){
      villageEventStarted=true;
      scene='villageDialog';
      dialogIndex=0;
      touchUI.classList.add('hidden');
    }
  } else if(scene==='road2'){
    for(const mon of monsters){
      if(!mon.alive && mon.respawn>0){
        mon.respawn -= dt;
        if(mon.respawn<=0){
          mon.alive=true;
          mon.x=mon.spawnX + (Math.random()*50-25);
          mon.y=mon.spawnY + (Math.random()*40-20);
        }
      }
    }
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;
    if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;
    if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      hero.x+=dx*hero.speed*dt;hero.y+=dy*hero.speed*dt;
    }
    hero.x=Math.max(50,Math.min(road2.width-60,hero.x));
    hero.y=Math.max(140,Math.min(road2.height-130,hero.y));

    for(const mon of monsters){
      if(mon.alive && Math.hypot(hero.x-mon.x,hero.y-mon.y)<58){
        startBattle(mon);break;
      }
    }
    if(hero.x>1840 && hero.y>1360){
      scene='sarubieArrival';
      dialogIndex=0;
      touchUI.classList.add('hidden');
    }
  } else if(scene==='takezoRoute'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);takezoHero.x+=dx*takezoHero.speed*dt;takezoHero.y+=dy*takezoHero.speed*dt;}
    takezoHero.x=Math.max(90,Math.min(1430,takezoHero.x));takezoHero.y=Math.max(260,Math.min(510,takezoHero.y));
    for(const mon of takezoMobs){
      if(mon.alive && Math.hypot(takezoHero.x-mon.x,takezoHero.y-mon.y)<58){startTakezoBattle(mon);break;}
    }
  } else if(scene==='route3'){
    for(const mon of route3Mobs){
      if(!mon.alive && mon.respawn>0){
        mon.respawn-=dt;
        if(mon.respawn<=0){
          mon.alive=true;mon.x=mon.spawnX+(Math.random()*40-20);mon.y=mon.spawnY+(Math.random()*30-15);
        }
      }
    }
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);route3Hero.x+=dx*route3Hero.speed*dt;route3Hero.y+=dy*route3Hero.speed*dt;}
    route3Hero.x=Math.max(70,Math.min(1850,route3Hero.x));
    route3Hero.y=Math.max(170,Math.min(960,route3Hero.y));
    for(const mon of route3Mobs){
      if(mon.alive&&Math.hypot(route3Hero.x-mon.x,route3Hero.y-mon.y)<55){startRoute3Battle(mon);break;}
    }
    if(scene==='route3'&&route3Hero.x>1700&&route3Hero.y<430){
      scene='sarubibiArrival';dialogIndex=0;touchUI.classList.add('hidden');
    }
  } else if(scene==='nightTrail'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      nightHero.x+=dx*nightHero.speed*dt;nightHero.y+=dy*nightHero.speed*dt;
    }
    nightHero.x=Math.max(80,Math.min(1600,nightHero.x));
    nightHero.y=Math.max(250,Math.min(900,nightHero.y));

    if(nightHero.x>1320 && nightHero.y<470){
      scene='tsukipopoReveal';
      dialogIndex=0;
      touchUI.classList.add('hidden');
    }
  } else if(scene==='sarubibiTown'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      sarubibiHero.x+=dx*sarubibiHero.speed*dt;sarubibiHero.y+=dy*sarubibiHero.speed*dt;
    }
    sarubibiHero.x=Math.max(80,Math.min(900,sarubibiHero.x));
    sarubibiHero.y=Math.max(260,Math.min(455,sarubibiHero.y));
  } else if(scene==='sarubieTown'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;
    if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;
    if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      townHero.x+=dx*townHero.speed*dt;townHero.y+=dy*townHero.speed*dt;
    }
    townHero.x=Math.max(80,Math.min(900,townHero.x));
    townHero.y=Math.max(250,Math.min(455,townHero.y));
  } else if(scene==='cave'){
    for(const mon of caveMobs){
      if(!mon.alive && mon.respawn>0){
        mon.respawn-=dt;
        if(mon.respawn<=0){
          mon.alive=true;
          mon.x=mon.spawnX+(Math.random()*40-20);
          mon.y=mon.spawnY+(Math.random()*30-15);
        }
      }
    }
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;
    if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;
    if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);caveHero.x+=dx*caveHero.speed*dt;caveHero.y+=dy*caveHero.speed*dt;}
    caveHero.x=Math.max(120,Math.min(1660,caveHero.x));
    caveHero.y=Math.max(150,Math.min(850,caveHero.y));
    for(const mon of caveMobs){
      if(mon.alive && Math.hypot(caveHero.x-mon.x,caveHero.y-mon.y)<55){startCaveMobBattle(mon);break;}
    }
    if(scene==='cave' && caveBoss.alive && Math.hypot(caveHero.x-caveBoss.x,caveHero.y-caveBoss.y)<85) startCaveBossBattle();
    if(!caveBoss.alive && !caveCrystalTaken && Math.hypot(caveHero.x-1562,caveHero.y-170)<95){
      caveCrystalTaken=true;
      scene='sarubieRitual';
      dialogIndex=0;
      touchUI.classList.add('hidden');
    }
  } else if(scene==='battle'){
    if(battleCooldown>0){
      battleCooldown-=dt;
      if(battleCooldown<=0){
        if(battle.turn==='enemy')enemyTurn();
        else if(battle.turn==='enemyResult'){
          battle.turn='player';
          battleActor='hero';
          battleMenu='main';
          battleCooldown=0;
        }
        else if(battle.turn==='win')finishBattle();
        else if(battle.turn==='run'){
          scene=(battle&&battle.monsterId>=400)?'takezoRoute':'road2';
          touchUI.classList.remove('hidden');
          battle=null;
          flashText='戦闘から離脱した';
          flashTimer=1.8;
        }
      }
    }
  }
  if(scene!=='title'&&scene!=='cutscene'&&scene!=='battle'&&scene!=='shop'&&scene!=='sarubibiShop'){
    autosaveTimer+=dt;
    if(autosaveTimer>=1.2){autosaveTimer=0;saveGame();}
  }
  if(flashTimer>0)flashTimer-=dt;
  if(battleFx.timer>0)battleFx.timer=Math.max(0,battleFx.timer-dt);
  for(const p of damagePopups)p.timer-=dt;
  damagePopups=damagePopups.filter(p=>p.timer>0);
}

function openNameInput(){
  nameInput.value=(heroName||'ぴくるす');nameOverlay.classList.remove('hidden');
  setTimeout(()=>{nameInput.focus();nameInput.select();},50);
}
function confirmName(){
  const v=(nameInput.value||'').trim().slice(0,8);
  heroName=v || 'ぴくるす';localStorage.setItem('risupekuHeroName',heroName);nameOverlay.classList.add('hidden');
  dialogIndex=9;
}
nameOk.addEventListener('click',confirmName);
nameInput.addEventListener('keydown',e=>{if(e.key==='Enter')confirmName();});


function openFieldMenu(fromScene){
  menuReturnScene=fromScene||scene;
  scene='menu';
  menuPage='status';
  menuCharacter='hero';
  touchUI.classList.add('hidden');
}
function pressAction(){
  if(!nameOverlay.classList.contains('hidden'))return;
  if(scene==='title'){
    if(titleSelection===1){
      if(hasSaveGame()){
        if(loadGame())return;
      }
      flashText='つづきから遊べるデータがありません';flashTimer=1.8;
      return;
    }
    scene='cutscene';dialogIndex=0;touchUI.classList.add('hidden');return;
  }
  if(scene==='cutscene'){dialogIndex++;if(dialogIndex>=prologue.length){scene='world';dialogIndex=0;touchUI.classList.remove('hidden');flashText='ダッシュミウをぶりふぉ村へ！';flashTimer=2.2;}return;}
  if(scene==='villageDialog'){
    const vd=villageDialog();
    if(dialogIndex===8){openNameInput();return;}
    dialogIndex++;
    if(dialogIndex>=vd.length){scene='departureDialog';dialogIndex=0;}
    return;
  }
  if(scene==='departureDialog'){
    dialogIndex++;
    if(dialogIndex>=departureDialog.length){
      scene='road2';dialogIndex=0;hero.x=260;hero.y=210;monsters.forEach(m=>{m.alive=true;m.respawn=0;m.x=m.spawnX;m.y=m.spawnY;});touchUI.classList.remove('hidden');
      flashText='さるびえ村へ向かおう';flashTimer=2.0;
    }
    return;
  }
  if(scene==='sarubieArrival'){
    dialogIndex++;
    if(dialogIndex>=sarubieArrivalDialog.length){
      suzumaruActive=true;
      scene='sarubieTown';
      dialogIndex=0;
      townHero.x=330;townHero.y=385;
      touchUI.classList.remove('hidden');
      flashText='鍛冶場や道具屋も利用できる';flashTimer=2.2;
    }
    return;
  }
  if(scene==='nightIntro'){
    dialogIndex++;
    if(dialogIndex>=sarubibiNightDialog.length){
      scene='nightTrail';dialogIndex=0;
      nightHero.x=170;nightHero.y=760;
      touchUI.classList.remove('hidden');
    }
    return;
  }
  if(scene==='tsukipopoReveal'){
    dialogIndex++;
    if(dialogIndex>=tsukipopoRevealDialog.length){
      scene='sarubibiResolve';dialogIndex=0;
    }
    return;
  }
  if(scene==='sarubibiResolve'){
    dialogIndex++;
    if(dialogIndex>=sarubibiResolveDialog.length){
      yunoJoined=true;
      scene='takezoDeparture';dialogIndex=0;
      touchUI.classList.add('hidden');
      saveGame();
    }
    return;
  }
  if(scene==='takezoDeparture'){
    dialogIndex++;
    if(dialogIndex>=takezoDepartureDialog.length){
      scene='takezoArrival';dialogIndex=0;
    }
    return;
  }
  if(scene==='takezoArrival'){
    dialogIndex++;
    if(dialogIndex>=takezoArrivalDialog.length){
      scene='takezoRoute';dialogIndex=0;
      takezoHero.x=150;takezoHero.y=470;
      touchUI.classList.remove('hidden');
      flashText='海賊の先行小隊を順番に撃退しよう';flashTimer=2.2;
    }
    return;
  }
  if(scene==='takezoRelief'){
    dialogIndex++;
    if(dialogIndex>=takezoReliefDialog.length){
      takezoIntroDone=true;
      scene='end';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='sarubibiArrival'){
    dialogIndex++;
    if(dialogIndex>=sarubibiArrivalDialog.length){
      sarubibiQuestStarted=true;
      scene='sarubibiTown';
      sarubibiHero.x=330;sarubibiHero.y=390;
      dialogIndex=0;
      touchUI.classList.remove('hidden');
      flashText='武器屋と道具屋も利用できる';flashTimer=2.0;
    }
    return;
  }
  if(scene==='sarubibiTown'){
    if(Math.hypot(sarubibiHero.x-478,sarubibiHero.y-350)<105){openSarubibiShop('weapon');return;}
    if(Math.hypot(sarubibiHero.x-648,sarubibiHero.y-350)<105){openSarubibiShop('item');return;}
    if(sarubibiQuestStarted && Math.hypot(sarubibiHero.x-832,sarubibiHero.y-335)<120){
      scene='nightIntro';dialogIndex=0;touchUI.classList.add('hidden');return;
    }
    flashText='武器屋・道具屋・防衛隊詰所を調べよう';flashTimer=1.6;
    return;
  }
  if(scene==='sarubibiShop'){
    return;
  }
  if(scene==='sarubieTown'){
    if(Math.hypot(townHero.x-530,townHero.y-330)<105){
      openShop('weapon');return;
    }
    if(Math.hypot(townHero.x-765,townHero.y-330)<100){
      openShop('item');return;
    }
    if(townHero.x>820){
      scene='cave';
      caveHero.x=150;caveHero.y=760;
      touchUI.classList.remove('hidden');
      flashText='火山麓の洞窟　ダッシュミウも同行中';flashTimer=2.3;
      return;
    }
    flashText='近くの店や火山麓への道を調べよう';flashTimer=1.8;
    return;
  }
  if(scene==='shop'){
    return;
  }
  if(scene==='sarubieRitual'){
    dialogIndex++;
    if(dialogIndex>=sarubieRitualDialog.length){
      suzumaruJoined=true;
      suzumaruActive=true;
      scene='route3';
      saveGame();
      route3Hero.x=210;route3Hero.y=760;
      dialogIndex=0;
      touchUI.classList.remove('hidden');
      flashText='次は、さるびび村へ';flashTimer=2.0;
    }
    return;
  }

  if(scene==='world' || scene==='road2' || scene==='route3' || scene==='cave' || scene==='takezoRoute'){
    openFieldMenu(scene);
    return;
  }
  if(scene==='battle'){
    if(!battle || battle.turn!=='player')return;
    battleAttack('attack');return;
  }
  if(scene==='end'){
    scene='title';dash.x=1960;dash.y=180;hero.x=360;hero.y=300;villageEventStarted=false;monsters.forEach(m=>{m.alive=true;m.respawn=0;m.x=m.spawnX;m.y=m.spawnY;});
  }
}

function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);ctx.clearRect(0,0,W,H);
  if(scene==='title')drawTitle();
  else if(scene==='cutscene')drawCutscene();
  else if(scene==='world')drawWorld();
  else if(scene==='villageDialog')drawVillageDialog();
  else if(scene==='departureDialog')drawDepartureDialog();
  else if(scene==='road2')drawRoad2();
  else if(scene==='battle')drawBattle();
  else if(scene==='menu')drawMenu();
  else if(scene==='sarubieArrival')drawSarubieArrival();
  else if(scene==='route3')drawRoute3();
  else if(scene==='sarubibiArrival')drawSarubibiArrival();
  else if(scene==='nightIntro')drawNightIntro();
  else if(scene==='nightTrail')drawNightTrail();
  else if(scene==='tsukipopoReveal')drawTsukipopoReveal();
  else if(scene==='sarubibiResolve')drawSarubibiResolve();
  else if(scene==='takezoDeparture')drawTakezoDeparture();
  else if(scene==='takezoArrival')drawTakezoArrival();
  else if(scene==='takezoRoute')drawTakezoRoute();
  else if(scene==='takezoRelief')drawTakezoRelief();
  else if(scene==='sarubibiTown')drawSarubibiTown();
  else if(scene==='sarubibiShop')drawSarubibiShop();
  else if(scene==='sarubieTown')drawSarubieTown();
  else if(scene==='shop')drawShop();
  else if(scene==='sarubieRitual')drawSarubieRitual();
  else if(scene==='cave')drawCave();
  else drawEnd();
  if(flashTimer>0 && ['title','road2','world','cave','route3','sarubieTown','shop','sarubibiTown','sarubibiShop','nightTrail','takezoRoute'].includes(scene)){
    ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(305,85,350,58);text(flashText,480,114,20,'center');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('keydown',e=>{
  keys[e.key]=true;
  if(scene==='title'){
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){titleSelection=0;e.preventDefault();return;}
    if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){titleSelection=1;e.preventDefault();return;}
  }
  if(scene==='sarubibiShop'){
    if(e.key==='Enter'||e.key===' '||e.key==='z'||e.key==='Z'){e.preventDefault();sarubibiShopBuy();return;}
    if(e.key==='Escape'||e.key==='x'||e.key==='X'){scene='sarubibiTown';touchUI.classList.remove('hidden');return;}
  }
  if(scene==='shop'){
    if(e.key==='Enter'||e.key===' '||e.key==='z'||e.key==='Z'){e.preventDefault();shopBuy();return;}
    if(e.key==='Escape'||e.key==='x'||e.key==='X'){scene='sarubieTown';touchUI.classList.remove('hidden');return;}
  }
  if(['Enter',' ','z','Z'].includes(e.key)){e.preventDefault();pressAction();}
  if(scene==='menu'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    menuTap(x,y);
  } else if(scene==='battle' && battle && battle.turn==='player'){
    if(e.key==='1')battleAttack('attack');
    if(e.key==='2')battleMenu='skill';
    if(e.key==='3')battleDefend();
    if(e.key==='4')battleRun();
    if((e.key==='x'||e.key==='X') && battleMenu==='skill')battleAttack('heal');
    if((e.key==='c'||e.key==='C') && battleMenu==='skill')battleAttack('ice');
  }
});
addEventListener('keyup',e=>{keys[e.key]=false;});
canvas.addEventListener('pointerdown',e=>{
  if(scene==='title'){
    const r=canvas.getBoundingClientRect();
    const y=(e.clientY-r.top)/r.height*H;
    if(y>=340&&y<398){titleSelection=0;pressAction();return;}
    if(y>=398&&y<=466){titleSelection=1;pressAction();return;}
    return;
  }
  if(scene==='sarubibiShop'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(y>=325&&y<=410){sarubibiShopBuy();return;}
    if(y>=410&&y<=495){scene='sarubibiTown';touchUI.classList.remove('hidden');return;}
  } else if(scene==='shop'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(y>=325&&y<=410){shopBuy();return;}
    if(y>=410&&y<=495){scene='sarubieTown';touchUI.classList.remove('hidden');return;}
  } else if(scene==='menu'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    menuTap(x,y);
  } else if(scene==='battle' && battle && battle.turn==='player'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(battleMenu==='main'){
      if(y>=380 && y<=455){
        if(x<260){
          if(isYunoTurn()){
            const ys=yunoStats();const dmg=ys.atk+Math.floor(Math.random()*5);
            battleMessage=`ユーノの弓攻撃！ ${dmg}ダメージ！`;damageEnemy(dmg);
            if(enemiesDefeated()){battle.turn='win';battleCooldown=1;}else advancePartyTurn();
          }else if((battle.monsterId===99||battle.monsterId>=200)&&suzumaruActive&&battleActor==='suzu')suzuAction('attack');
          else battleAttack('attack');
        }
        else if(x<460)battleMenu='skill';
        else if(x<660)battleDefend();
        else battleRun();
      }
    }else{
      if(y>=385 && y<=460){
        if(isYunoTurn()){
          if(x<175)yunoAction('healAll');
          else if(x<320)yunoAction('regen');
          else if(x<465)yunoAction('windAll');
          else if(x<610)yunoAction('haste');
          else if(x<755)yunoAction('evade');
          else yunoAction('evadeAll');
        }else if(isSuzumaruTurn()){
          if(x<305)suzuAction('fire');
          else if(x<565)suzuAction('fireRun');
          else if(x<760)usePotion('suzu');
          else battleMenu='main';
        }else{
          if(y>=370&&y<=432){
            if(x<215)battleAttack('heal');
            else if(x<395)battleAttack('ice');
            else if(x<575)battleAttack('iceSlash');
            else if(x<755)battleAttack('iceWave');
            else usePotion('hero');
          }else battleMenu='main';
        }
      }
    }
  } else if(scene!=='world'&&scene!=='road2'&&scene!=='route3'&&scene!=='sarubieTown'&&scene!=='shop'&&scene!=='cave'&&scene!=='sarubibiTown'&&scene!=='sarubibiShop'&&scene!=='nightTrail'&&scene!=='takezoRoute') pressAction();
});
let lastActionAt=0;
function triggerActionButton(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const now=performance.now();
  if(now-lastActionAt<220)return;
  lastActionAt=now;

  // Route3 gets a direct path because some mobile browsers were
  // dropping the general handler on this field.
  if(scene==='route3'){
    openFieldMenu('route3');
    return;
  }
  pressAction();
}
actionBtn.addEventListener('pointerup',triggerActionButton);
actionBtn.addEventListener('click',triggerActionButton);

let touchVector={x:0,y:0},stickPointer=null;
function stickMove(e){
  const r=stickBase.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const max=36,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max;}
  stickKnob.style.transform=`translate(${dx}px,${dy}px)`;touchVector.x=dx/max;touchVector.y=dy/max;
}
stickBase.addEventListener('pointerdown',e=>{stickPointer=e.pointerId;stickBase.setPointerCapture(e.pointerId);stickMove(e);});
stickBase.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)stickMove(e);});
function stickEnd(e){if(e.pointerId===stickPointer){stickPointer=null;touchVector={x:0,y:0};stickKnob.style.transform='translate(0,0)';}}
stickBase.addEventListener('pointerup',stickEnd);stickBase.addEventListener('pointercancel',stickEnd);
})();