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
if(!progress.suzuSkills) progress.suzuSkills={
  single:0,   // 火炎斬り系：主力。伸び幅を大きくする
  all:0       // 火走り系：全体攻撃。伸ばせるが単体ほど火力効率は上がらない
};
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
  {id:301,name:'ハネダイコン',kind:'radishFerret',x:620,y:590,spawnX:620,spawnY:590,alive:true,hp:46,maxHP:46,respawn:0},
  {id:302,name:'ソラマメテン',kind:'beanMarten',x:1120,y:420,spawnX:1120,spawnY:420,alive:true,hp:50,maxHP:50,respawn:0},
  {id:303,name:'ワタゲイタチ',kind:'fluffWeasel',x:1600,y:300,spawnX:1600,spawnY:300,alive:true,hp:54,maxHP:54,respawn:0}
];
let sarubibiQuestStarted=false;
let sarubibiHero={x:330,y:390,speed:210};
let sarubibiShopType='weapon';




let menuPage = 'status';

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




const world = { width:2400, height:1250 };
const road2 = { width:2200, height:1550 };
const monsters = [
  {id:1,name:'リンゴリス',kind:'appleSquirrel',x:720,y:570,spawnX:720,spawnY:570,alive:true,hp:24,maxHP:24,respawn:0},
  {id:2,name:'モモモモンガ',kind:'peachGlider',x:1210,y:890,spawnX:1210,spawnY:890,alive:true,hp:30,maxHP:30,respawn:0},
  {id:3,name:'カボチャガニ',kind:'pumpkinCrab',x:1710,y:1190,spawnX:1710,spawnY:1190,alive:true,hp:38,maxHP:38,respawn:0}
];

function hudTop(){
  const h = window.innerHeight || 540;
  return h < 500 ? 74 : 20;
}

function saveGame(){
  if(scene==='title'||scene==='cutscene'||scene==='battle'||scene==='shop'||scene==='sarubibiShop')return;

  if(['world','road2','cave','route3','sarubieTown','sarubibiTown'].includes(scene)){
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

    const apply=(obj,s)=>{if(s){if(Number.isFinite(s.x))obj.x=s.x;if(Number.isFinite(s.y))obj.y=s.y;}};
    apply(dash,d.dash);apply(hero,d.hero);apply(caveHero,d.caveHero);apply(route3Hero,d.route3Hero);
    apply(townHero,d.townHero);apply(sarubibiHero,d.sarubibiHero);

    restoreList(monsters,d.monsters);
    restoreList(caveMobs,d.caveMobs);
    restoreList(route3Mobs,d.route3Mobs);

    lastFieldScene=d.lastFieldScene||'world';
    let target=d.scene||lastFieldScene;

    // Dialogue/cutscene checkpoints resume from the nearest safe playable area.
    const safeMap={
      villageDialog:'world',
      departureDialog:'road2',
      sarubieArrival:'sarubieTown',
      sarubieRitual:'route3',
      sarubibiArrival:'sarubibiTown',
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
  if(mon.kind==='radishFerret'||mon.kind==='beanMarten'||mon.kind==='fluffWeasel'){
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
  text('りすぺく島RPG',480,75,53,'center','#fff',800);text('Ver.0.21',480,121,18,'center','#eef8ff');
  const canContinue=hasSaveGame();
  const y1=430,y2=486;
  outlineRect(300,y1,360,46,titleSelection===0?'#e8f7fb':'rgba(15,35,60,.78)','#73b9d6',2);
  text('はじめから',480,y1+23,20,'center',titleSelection===0?'#17324a':'#e8f4fa');
  outlineRect(300,y2,360,46,titleSelection===1?'#e8f7fb':'rgba(15,35,60,.78)',canContinue?'#73b9d6':'#566879',2);
  text(canContinue?'つづきから':'つづきから（セーブなし）',480,y2+23,canContinue?20:16,'center',
       canContinue?(titleSelection===1?'#17324a':'#e8f4fa'):'#8193a2');
}
function speakerName(who){
  return ({narrator:'語り',dash:'ダッシュミウ',pirate:'海賊',elder:'ぶりふぉ村長',hero:heroName,suzu:'スズマル',yuno:'ユーノ',captain:'防衛隊長'})[who]||who;
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
function isSuzumaruTurn(){
  return !!(isPartyBattle() && battleActor==='suzu');
}
function drawBattle(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#9cd8ef');g.addColorStop(1,'#b9dc8c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    drawHeroFox(185,255,1.65);
    drawSuzumaru(335,258,1.65);
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
  ctx.fillStyle='rgba(14,30,55,.9)';
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    ctx.fillRect(35,28,430,122);
    text(heroName,55,52,20);
    text(`HP ${battle.heroHP}/${progress.maxHP}  MP ${battle.heroMP}/${progress.maxMP}`,55,82,16);
    text('スズマル',55,113,20);
    text(`HP ${battle.suzuHP}/${battle.suzuMaxHP}  MP ${battle.suzuMP}/${battle.suzuMaxMP}`,185,113,16);
  }else{
    ctx.fillRect(45,35,330,105);
    text(heroName,68,62,22);
    text(`Lv.${progress.level}  HP ${battle.heroHP}/${progress.maxHP}`,68,93,18);
    text(`MP ${battle.heroMP}/${progress.maxMP}`,68,119,18);
  }
  ctx.fillRect(585,35,330,105);
  if(battle.enemies){
    text(`敵グループ　残り ${livingEnemies().length}体`,610,62,20);
    text('各敵のHPは敵の下に表示',610,96,15);
  }else{
    text(battle.enemyName,610,62,22);
    text(`HP ${Math.max(0,battle.enemyHP)}/${battle.enemyMaxHP}`,610,96,19);
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
      const actorName=isSuzumaruTurn()?'スズマル':heroName;
      text(`${actorName}の行動`,480,474,15,'center','#c8e7f4');
    }else{
      if(isSuzumaruTurn()){
        text('スズマルのスキル',480,372,14,'center','#ffe5c8');
        outlineRect(55,385,245,54,'#ffd9cf','#d86145',2);text('火炎斬り MP5',177,406,16,'center','#6b231d');text('単体・高威力',177,425,11,'center','#934a3e');
        outlineRect(315,385,245,54,'#ffe2cf','#d78251',2);text('火走り MP8',437,406,16,'center','#5c3023');text('敵全体',437,425,11,'center','#7d5748');
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
    if(isPartyBattle()&&battleActor==='hero'){
      battleActor='suzu';battle.turn='player';battleMenu='main';
    }else{
      battle.turn='enemy';battleCooldown=.8;battleMenu='main';
    }
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
    if(isPartyBattle()){
      battleActor='suzu';battleMenu='main';
    }else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
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
  if(isPartyBattle() && battleActor==='hero'){
    battleActor='suzu';
    battle.turn='player';
    battleMenu='main';
    battleMessage+='　次はスズマル！';
  }else{
    battle.turn='enemy';battleCooldown=.8;battleMenu='main';
  }
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
    battleActor='hero';
    battle.turn='enemy';battleCooldown=.8;battleMenu='main';
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

function suzuAction(mode='attack'){
  if(!battle || battle.turn!=='player' || battleActor!=='suzu')return;
  let dmg=0;
  if(mode==='fireRun'){
    if(battle.suzuMP<8){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=8;
    dmg=8+progress.suzuSkills.all*2+Math.floor(Math.random()*4);
    const allDmg=damageAllEnemies(dmg);
    const summary=Array.isArray(allDmg)?allDmg.map(v=>typeof v==='object'?`${v.name} ${v.damage}`:v).join(' / '):'';
    battleMessage=`スズマルの「火走り」！ ${summary}`;
    setBattleFx('fire');addDamagePopup('FIRE ALL',700,155,'#ffb093');battleChoiceText.suzu='火走り';
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
    battleActor='hero';battle.turn='enemy';battleCooldown=.8;battleMenu='main';return;
  }
  if(mode==='fire'){
    if(battle.suzuMP<5){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=5;
    dmg=22+progress.suzuSkills.single*5+Math.floor(Math.random()*7);
    battleMessage=`スズマルの「火炎斬り」！ ${dmg}ダメージ！`;setBattleFx('fire');addDamagePopup('FIRE',700,155,'#ffb093');battleChoiceText.suzu='火炎斬り';
  }else{
    dmg=12+Math.floor(Math.random()*5);
    battleMessage=`スズマルのこうげき！ ${dmg}ダメージ！`;setBattleFx('slash');battleChoiceText.suzu='こうげき';
  }
  damageEnemy(dmg);
  if(enemiesDefeated()){
    battle.turn='win';battleCooldown=1.0;return;
  }
  battleActor='hero';
  battle.turn='enemy';
  battleCooldown=.8;
  battleMenu='main';
}
function battleDefend(){
  if(!battle || battle.turn!=='player')return;
  if(isSuzumaruTurn()){
    battleMessage='スズマルは身を守っている！';battleChoiceText.suzu='ぼうぎょ';
    battleActor='hero';battleMenu='main';
    return;
  }
  battle.defending=true;
  battleMessage=`${heroName}は身を守っている！`;if(battle.monsterId===99)battleChoiceText.hero='ぼうぎょ';
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    battleActor='suzu';battleMenu='main';
  }else{
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
  const attackers=battle.enemies?livingEnemies():[null];
  let totalHero=0,totalSuzu=0;

  for(const foe of attackers){
    let dmg=Math.max(1,4+Math.floor(Math.random()*4)-Math.floor(progress.def/4));
    if(battle.defending)dmg=Math.max(1,Math.floor(dmg/2));

    if(isPartyBattle() && Math.random()<0.4){
      battle.suzuHP=Math.max(1,battle.suzuHP-dmg);
      totalSuzu+=dmg;
    }else{
      battle.heroHP=Math.max(1,battle.heroHP-dmg);
      totalHero+=dmg;
    }
  }

  battle.defending=false;

  if(totalHero>0){
    addDamagePopup(`-${totalHero}`,185,215,'#ff8b7d');
    setBattleFx('hitHero',185,255);
  }
  if(totalSuzu>0){
    addDamagePopup(`-${totalSuzu}`,335,215,'#ff8b7d');
    setBattleFx('hitSuzu',335,258);
  }

  if(battle.monsterId===99){
    if(totalHero>0 && totalSuzu>0)
      battleMessage=`マグマガメの攻撃！ ${heroName}に${totalHero}、スズマルに${totalSuzu}ダメージ！`;
    else if(totalSuzu>0)
      battleMessage=`マグマガメの攻撃！ スズマルに${totalSuzu}ダメージ！`;
    else
      battleMessage=`マグマガメの攻撃！ ${heroName}に${totalHero}ダメージ！`;
  }else if(battle.enemies){
    const parts=[];
    if(totalHero>0)parts.push(`${heroName} ${totalHero}`);
    if(totalSuzu>0)parts.push(`スズマル ${totalSuzu}`);
    battleMessage=`敵グループの攻撃！ ${parts.join(' / ')} ダメージ！`;
  }else{
    battleMessage=`${battle.enemyName}のこうげき！ ${totalHero}ダメージ！`;
  }

  if(isPartyBattle())battleChoiceText={hero:'未選択',suzu:'未選択'};
  battle.turn='player';
  battleActor='hero';
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
  scene='road2';touchUI.classList.remove('hidden');
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
    ellipse(0,2,20,15,'#d8c59c');
    ellipse(-9,-11,5,6,'#b89468');ellipse(9,-11,5,6,'#b89468');
    rect(-7,-2,3,4,'#263149');rect(5,-2,3,4,'#263149');
    // cotton fluff
    ellipse(-10,-18,9,8,'#f4f1e8');ellipse(0,-22,10,9,'#f4f1e8');ellipse(10,-18,9,8,'#f4f1e8');
    ctx.strokeStyle='#b89468';ctx.lineWidth=6;ctx.beginPath();ctx.arc(18,8,18,-1.1,1.15);ctx.stroke();
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
  const spots=[[650,205],[760,205],[600,285],[710,295],[820,285]];
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
  const spots=[[650,205],[760,205],[600,285],[710,295],[820,285]];
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


function startRoute3Battle(mon){
  const pool=[
    {name:'ハネダイコン',kind:'radishFerret',hp:46,maxHP:46},
    {name:'ソラマメテン',kind:'beanMarten',hp:50,maxHP:50},
    {name:'ワタゲイタチ',kind:'fluffWeasel',hp:54,maxHP:54}
  ];
  const count=2+Math.floor(Math.random()*3);
  const enemies=[{name:mon.name,kind:mon.kind,hp:mon.hp,maxHP:mon.maxHP}];
  while(enemies.length<count) enemies.push({...pool[Math.floor(Math.random()*pool.length)]});
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:56,suzuMaxHP:56,suzuMP:22,suzuMaxMP:22,
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
  const enemies=caveEncounterGroup(mon);
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:56,suzuMaxHP:56,suzuMP:22,suzuMaxMP:22,
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
  caveBattle=true;
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:56,suzuMaxHP:56,suzuMP:22,suzuMaxMP:22,
    enemyHP:caveBoss.hp,enemyMaxHP:caveBoss.maxHP,
    monsterId:99,monsterName:'マグマガメ',enemyName:'マグマガメ',enemyKind:'magmaTurtle',
    turn:'player',guard:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';battleChoiceText={hero:'未選択',suzu:'未選択'};battleMessage='炎晶石を守るマグマガメが現れた！';
  scene='battle';touchUI.classList.add('hidden');
}

function drawMenu(){
  ctx.fillStyle='#0e1d37';ctx.fillRect(0,0,W,H);
  text('メニュー',55,45,30,'left','#ffffff',800);
  // Tabs
  outlineRect(55,80,180,52,menuPage==='status'?'#dff4fb':'#31455f','#78b9d7',2);
  text('ステータス',145,106,19,'center',menuPage==='status'?'#17324a':'#d9e6ef');
  outlineRect(250,80,180,52,menuPage==='skill'?'#dff4fb':'#31455f','#78b9d7',2);
  text('スキル習得',340,106,19,'center',menuPage==='skill'?'#17324a':'#d9e6ef');
  outlineRect(445,80,180,52,'#31455f','#78b9d7',2);text('もちもの',535,106,19,'center','#8ea5b7');
  outlineRect(640,80,180,52,'#31455f','#78b9d7',2);text('とじる',730,106,19,'center','#d9e6ef');

  if(menuPage==='status'){
    drawHeroFox(190,290,2.0);
    text(heroName,340,185,30,'left');
    text(`Lv. ${progress.level}`,340,230,22,'left');
    text(`EXP ${progress.exp} / ${expNeeded(progress.level)}`,340,267,20,'left');
    text(`SP ${progress.sp}`,340,305,22,'left','#ffe8a8');
    text(`HP ${progress.maxHP}`,340,350,20,'left');
    text(`MP ${progress.maxMP}`,500,350,20,'left');
    text(`こうげき ${progress.atk}`,340,388,20,'left');
    text(`ぼうぎょ ${progress.def}`,500,388,20,'left');
    text('戦闘終了後はHP・MPが全回復します。',340,447,17,'left','#bad9e7');
  }else{
    text(`スキルポイント：${progress.sp}`,65,170,23,'left','#ffe8a8');
    outlineRect(65,215,390,92,progress.learned.iceSlash?'#536777':'#e7f5fb','#78b9d7',2);
    text('氷結斬り',90,242,22,'left',progress.learned.iceSlash?'#c5d0d8':'#18334a');
    text('MP7 / 氷をまとった小剣で強く斬る',90,277,16,'left',progress.learned.iceSlash?'#c5d0d8':'#3d5d73');
    text(progress.learned.iceSlash?'習得済み':'必要SP：1',420,261,17,'right',progress.learned.iceSlash?'#c5d0d8':'#b66f31');
    outlineRect(65,330,390,80,'#536777','#64798a',2);
    text('いやしの水・強化',90,355,20,'left','#aebbc5');
    text('まだ先のスキル',90,385,15,'left','#91a0ab');
    text('※ 今回はスキルツリーの土台だけ実装',65,460,16,'left','#a9c5d2');
  }
}
function menuTap(x,y){
  if(y>=80 && y<=140){
    if(x<240)menuPage='status';
    else if(x<440)menuPage='skill';
    else if(x>=640){scene='road2';touchUI.classList.remove('hidden');}
    return;
  }
  if(menuPage==='skill' && y>=215 && y<=307 && x>=65 && x<=455){
    if(!progress.learned.iceSlash && progress.sp>=1){
      progress.sp--;progress.learned.iceSlash=true;saveProgress();
      flashText='「氷結斬り」を習得した！';flashTimer=2.3;
    }
  }
}
function drawEnd(){
  ctx.fillStyle='#0c1830';ctx.fillRect(0,0,W,H);drawHeroFox(405,270,1.8);drawDashmiu(555,275,1.8);
  text('Ver.0.21 ここまで',480,112,42,'center');
  text(`さるびび村の問題を解決し、ユーノの協力を得よう。`,480,365,22,'center','#d8efff');
  text('次は：夜の尾行とツキポポの秘密へ',480,405,20,'center','#d8efff');
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
        else if(battle.turn==='win')finishBattle();
        else if(battle.turn==='run'){
          scene='road2';
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
  if(scene==='road2'){
    scene='menu';menuPage='status';touchUI.classList.add('hidden');return;
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
    flashText='武器屋や道具屋を調べよう';flashTimer=1.6;
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
  else if(scene==='sarubibiTown')drawSarubibiTown();
  else if(scene==='sarubibiShop')drawSarubibiShop();
  else if(scene==='sarubieTown')drawSarubieTown();
  else if(scene==='shop')drawShop();
  else if(scene==='sarubieRitual')drawSarubieRitual();
  else if(scene==='cave')drawCave();
  else drawEnd();
  if(flashTimer>0 && ['title','road2','world','cave','route3','sarubieTown','shop','sarubibiTown','sarubibiShop'].includes(scene)){
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
    if(y>=420&&y<478){titleSelection=0;pressAction();return;}
    if(y>=478&&y<=540){titleSelection=1;pressAction();return;}
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
          if((battle.monsterId===99||battle.monsterId>=200)&&suzumaruActive&&battleActor==='suzu')suzuAction('attack');
          else battleAttack('attack');
        }
        else if(x<460)battleMenu='skill';
        else if(x<660)battleDefend();
        else battleRun();
      }
    }else{
      if(y>=385 && y<=460){
        if(isSuzumaruTurn()){
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
  } else if(scene!=='world'&&scene!=='road2'&&scene!=='route3'&&scene!=='sarubieTown'&&scene!=='shop'&&scene!=='cave'&&scene!=='sarubibiTown'&&scene!=='sarubibiShop') pressAction();
});
actionBtn.addEventListener('pointerdown',e=>{e.preventDefault();pressAction();});

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