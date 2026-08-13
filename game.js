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
let ngPlusMode=false;
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
if(progress.items.highPotion===undefined)progress.items.highPotion=0;
if(progress.heroIceWave===undefined)progress.heroIceWave=false;
if(progress.heroPebbleRandom===undefined)progress.heroPebbleRandom=0;
if(progress.heroPebbleAll===undefined)progress.heroPebbleAll=progress.heroIceWave?1:0;
if(progress.heroHealSkill===undefined)progress.heroHealSkill=1;
if(progress.heroManaSkill===undefined)progress.heroManaSkill=progress.gameCleared?1:0;
progress.heroManaSkill=Math.max(0,Math.min(2,progress.heroManaSkill||0));
if(!progress.shopBought)progress.shopBought={};
if(progress.shopBought.summitBow===undefined)progress.shopBought.summitBow=false;
if(progress.shopBought.summitSpear===undefined)progress.shopBought.summitSpear=false;
if(progress.shopBought.heroManaBlade===undefined)progress.shopBought.heroManaBlade=false;
if(progress.shopBought.suzuGloves===undefined)progress.shopBought.suzuGloves=false;
if(progress.shopBought.yunoBracelet===undefined)progress.shopBought.yunoBracelet=false;
if(progress.shopBought.gyouShield===undefined)progress.shopBought.gyouShield=false;
if(progress.shopBought.summitBow && !progress.summitBowYunoFix){
  progress.atk=Math.max(1,(progress.atk||1)-6);
  progress.summitBowYunoFix=true;
}



function suzuSingleSkillName(){
  const lv=progress.suzuSkills?.single||0;
  if(lv>=4)return '極炎二連斬';
  if(lv>=3)return '豪炎二連斬';
  if(lv>=2)return '火炎二連斬';
  return '火炎斬り';
}
function suzuAllSkillName(){
  const lv=progress.suzuSkills?.all||0;
  if(lv>=5)return '獄炎走陣';
  if(lv>=4)return '爆炎走陣';
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
if(progress.klausDefeated===undefined)progress.klausDefeated=false;
if(progress.postGamePirateRaidCleared)progress.klausDefeated=true;
if(progress.nineTailQuestUnlocked===undefined)progress.nineTailQuestUnlocked=false;
if(progress.nineTailGear===undefined)progress.nineTailGear=false;
if(progress.nineTailStoryComplete===undefined)progress.nineTailStoryComplete=false;
if(progress.nineTailSoloQuest===undefined)progress.nineTailSoloQuest=false;
if(progress.sealedCaveUnlocked===undefined)progress.sealedCaveUnlocked=false;
if(progress.orochiDefeated===undefined)progress.orochiDefeated=false;
if(progress.hiddenSkillsUnlocked===undefined)progress.hiddenSkillsUnlocked=!!progress.orochiDefeated;
if(!progress.hiddenSkills)progress.hiddenSkills={hero:false,suzu:false,yuno:false,gyou:false};
if(progress.fourAbyssUnlocked===undefined)progress.fourAbyssUnlocked=false;
if(progress.ngPlusUnlocked===undefined)progress.ngPlusUnlocked=false;
// Ver.1.31以前に4人異界で九頭龍を倒していた既存セーブも「はじめから＋」解禁扱いにする。
if(progress.orochiDefeated && progress.fourAbyssUnlocked)progress.ngPlusUnlocked=true;
if(progress.heroIceSkill===undefined){
  progress.heroIceSkill=progress.learned?.iceSlash?1:0;
}
if(!progress.learned)progress.learned={waterHeal:true,icePebble:true,iceSlash:false};
progress.learned.iceSlash=(progress.heroIceSkill||0)>=1;

function partyLevel(){ return progress.level; }

function heroStats(){
  const nine=!!progress.nineTailGear;
  return {
    maxHP:progress.maxHP+(nine?50:0),
    maxMP:progress.maxMP+(nine?50:0),
    atk:progress.atk+(nine?200:0),
    def:progress.def
  };
}
function heroIceHits(){
  const lv=progress.heroIceSkill||0;
  const base=lv>=3?3:lv>=2?2:1;
  return base*(progress.nineTailGear?3:1);
}
function heroPebbleHitCount(){
  const pr=progress.heroPebbleRandom||0;
  const base=pr>=3?7:pr>=2?5:pr>=1?3:1;
  return base+(progress.nineTailGear?2:0);
}
function nineTailIceMultiplier(){return progress.nineTailGear?3:1;}
function nineTailDamageCut(v){return progress.nineTailGear?Math.max(1,Math.ceil(v*.5)):v;}
function sealedSkillResist(v,skill){
  if(!battle)return v;
  if(skill==='iceSlash'&&battle.enemyKind==='blackDragon')return Math.max(1,Math.floor(v*.5));
  if(skill==='iceShot'&&battle.enemyKind==='whiteDragon')return Math.max(1,Math.floor(v*.5));
  return v;
}


function suzumaruStats(){
  const lv=partyLevel();
  // Lv1 baseline + character-specific growth.
  // Suzumaru: HP / ATK high, MP low, DEF slightly below hero.
  return {
    maxHP:50+(lv-1)*7,
    maxMP:18+(lv-1)*2,
    atk:11+(lv-1)*3+(progress.finalFlameBlade?10:0),
    def:4+(lv-1)*1
  };
}

function yunoStats(){
  const lv=partyLevel();
  return {
    maxHP:42+(lv-1)*5,
    maxMP:30+(lv-1)*4,
    atk:9+(lv-1)*2+(progress.shopBought?.summitBow?6:0),
    def:5+(lv-1)
  };
}

function gyouStats(){
  const lv=partyLevel();
  return {maxHP:50+(lv-1)*6,maxMP:18+(lv-1)*2,atk:12+(lv-1)*2+(progress.shopBought?.summitSpear?12:0),def:8+(lv-1)*2+(progress.shopBought?.summitSpear?5:0)};
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
  const spent=n=>n<=0?0:n===1?1:n===2?3:n===3?6:10;
  const fl=progress.suzuSkills?.fightingFlame||0;
  progress.suzuSpentSP=spent(s)+spent(a)+(fl>=2?5:fl>=1?2:0);
}
  progress.suzuSP=Math.max(0,totalSPForLevel(progress.level)-progress.suzuSpentSP);
}

if(progress.yunoSP===undefined) progress.yunoSP=totalSPForLevel(progress.level);
if(!progress.yunoSkills)progress.yunoSkills={heal:0,regen:0,wind:0,haste:0,mpRegen:0,mpRegenAll:0};
if(progress.yunoSkills.mpRegen===undefined)progress.yunoSkills.mpRegen=progress.yunoSkills.evade||0;
if(progress.yunoSkills.mpRegenAll===undefined)progress.yunoSkills.mpRegenAll=progress.yunoSkills.evadeAll||0;
if(progress.yunoSkills.archery===undefined)progress.yunoSkills.archery=Math.min(2,progress.yunoSkills.mpRegen||0);
progress.yunoSkills.mpRegen=0;
if(progress.yunoSkills.windFlow===undefined)progress.yunoSkills.windFlow=0;
progress.yunoSkills.windFlow=Math.max(0,Math.min(2,progress.yunoSkills.windFlow||0));
if(progress.heroMagicFlow===undefined)progress.heroMagicFlow=0;
progress.heroMagicFlow=Math.max(0,Math.min(2,progress.heroMagicFlow||0));
if(progress.gyouSP===undefined)progress.gyouSP=0;
if(!progress.gyouSkills)progress.gyouSkills={fortify:0,cover:0,taunt:0,manaGuard:0,healGuard:0,doubleThrust:0,counter:0};
progress.gyouSkills.taunt=Math.min(2,progress.gyouSkills.taunt||0);
progress.gyouSkills.doubleThrust=Math.min(2,progress.gyouSkills.doubleThrust||0);
if(progress.gyouSkills.earthBreath===undefined)progress.gyouSkills.earthBreath=0;
progress.gyouSkills.earthBreath=Math.max(0,Math.min(2,progress.gyouSkills.earthBreath||0));

function yunoSkillCost(key,lv){
  const table={
    heal:[2,1,2], regen:[2,1,2], wind:[2,1,2],
    haste:[3], mpRegenAll:[2], archery:[2,3], windFlow:[2,3]
  };
  const arr=table[key]||[3];
  return arr[Math.min(lv,arr.length-1)];
}
function yunoSkillMax(key){
  return ({heal:3,regen:3,wind:3,haste:1,mpRegenAll:1,archery:2,windFlow:2})[key]||1;
}
function gyouSkillMax(key){
  return (key==='taunt'||key==='doubleThrust'||key==='earthBreath')?2:1;
}
function gyouSkillCost(key,lv=0){
  if(key==='taunt')return lv===0?2:2;
  if(key==='doubleThrust')return lv===0?3:2;
  if(key==='earthBreath')return lv===0?2:3;
  return ({fortify:2,cover:2,manaGuard:3,healGuard:3,counter:3})[key]||3;
}



if(!progress.suzuSkills) progress.suzuSkills={
  single:0,   // 火炎斬り系：主力
  all:0,      // 火走り系：全体攻撃
  counter:0   // 剣技カウンター
};
if(progress.suzuSkills.counter===undefined)progress.suzuSkills.counter=0;
if(progress.suzuSkills.fightingFlame===undefined)progress.suzuSkills.fightingFlame=0;
progress.suzuSkills.fightingFlame=Math.max(0,Math.min(2,progress.suzuSkills.fightingFlame||0));
saveProgress();
if(!progress.shopBought) progress.shopBought={fireBlade:false};
if(progress.shopBought.windKnife===undefined) progress.shopBought.windKnife=false;
if(progress.shopBought.windSword===undefined) progress.shopBought.windSword=false;
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
    if(progress.gyouSP!==undefined)progress.gyouSP++;
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
  {id:203,name:'イワモグラ',kind:'rockMole',x:1270,y:420,spawnX:1270,spawnY:420,alive:true,hp:42,maxHP:42,respawn:0},
  {id:204,name:'ヤキトカゲ',kind:'emberLizard',x:760,y:310,spawnX:760,spawnY:310,alive:true,hp:34,maxHP:34,respawn:0},
  {id:205,name:'トウガラネズミ',kind:'pepperMouse',x:1420,y:690,spawnX:1420,spawnY:690,alive:true,hp:38,maxHP:38,respawn:0}
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
  {id:303,name:'モモイタチ',kind:'peachWeasel',x:1600,y:300,spawnX:1600,spawnY:300,alive:true,hp:54,maxHP:54,respawn:0},
  {id:304,name:'ダイコンフェレット',kind:'radishFerret',x:880,y:790,spawnX:880,spawnY:790,alive:true,hp:48,maxHP:48,respawn:0},
  {id:305,name:'ソラマメテン',kind:'beanMarten',x:1450,y:650,spawnX:1450,spawnY:650,alive:true,hp:52,maxHP:52,respawn:0}
];
let sarubibiQuestStarted=false;
let yunoJoined=false;
let gyouJoined=false;
let gyouJoinConfirmed=false;
let nightTrailStep=0;
let tsukipopoBattleCleared=false;
let nightHero={x:170,y:760,speed:205};

let sarubibiHero={x:330,y:390,speed:210};
let takezoTravelHero={x:180,y:470,speed:210};
let takezoScoutDefeated=false;
let takezoScout={id:450,x:1120,y:315,alive:true,name:'海賊ネコ偵察兵',kind:'pirateCat',hp:64,maxHP:64};
let takezoHero={x:150,y:760,speed:210};
let takezoPrepHero={x:300,y:400,speed:210};
let coastSurveyHero={x:160,y:430,speed:205};
let bananaSharkAlive=true;
let volcanoSurveyHero={x:160,y:470,speed:205};
let volcanoSurveyMobs=[
  {id:470,x:500,y:430,alive:true,name:'サツマイモイノシシ',kind:'sweetBoar',hp:78,maxHP:78},
  {id:471,x:720,y:365,alive:true,name:'ドリアングマ',kind:'durianBear',hp:92,maxHP:92},
  {id:473,x:900,y:455,alive:true,name:'サツマイモイノシシ',kind:'sweetBoar',hp:82,maxHP:82},
  {id:474,x:1080,y:340,alive:true,name:'ドリアングマ',kind:'durianBear',hp:96,maxHP:96},
  {id:475,x:1210,y:455,alive:true,name:'サツマイモイノシシ',kind:'sweetBoar',hp:86,maxHP:86}
];

let takezoPrepStage=0; // 0 plan, 1 coast survey, 2 volcano survey, 3 construction review
let secondWaveStage=0;
let secondWaveHero={x:160,y:450,speed:205};

let finalBear={id:472,x:1050,y:330,alive:true,name:'大ドリアングマ',kind:'durianBear',hp:165,maxHP:165};
let finalBearHero={x:150,y:430,speed:205};
let finalBearWave=0;


let dragonTrailHero={x:130,y:455,speed:210};
let postGameHero={x:480,y:400,speed:210},postGameArea='brifo',postGameVolcanoHero={x:180,y:455,speed:210};
let sealedCaveHero={x:220,y:455,speed:185};
let sealedCaveMobs=[
  {id:1101,name:'ブラックドラゴン',kind:'blackDragon',x:360,y:300,spawnX:360,spawnY:300,hp:4000,maxHP:4000,alive:true,respawn:0},
  {id:1102,name:'ホワイトドラゴン',kind:'whiteDragon',x:520,y:410,spawnX:520,spawnY:410,hp:4000,maxHP:4000,alive:true,respawn:0},
  {id:1103,name:'ブラックドラゴン',kind:'blackDragon',x:690,y:280,spawnX:690,spawnY:280,hp:4000,maxHP:4000,alive:true,respawn:0},
  {id:1104,name:'ホワイトドラゴン',kind:'whiteDragon',x:830,y:410,spawnX:830,spawnY:410,hp:4000,maxHP:4000,alive:true,respawn:0}
];
sealedCaveMobs.forEach(m=>{m.maxHP=4000;m.hp=4000;});


let postGameElderTalked=false,postGameRaidUnlocked=false,postGameRaidWave=0;
let postGameVolcanoMobs=[
{id:970,name:'溶岩オオヤマネコ',kind:'emberLizard',x:430,y:430,spawnX:430,spawnY:430,alive:true,hp:380,maxHP:380,respawn:0},
{id:971,name:'火口イワモグラ',kind:'rockMole',x:690,y:350,spawnX:690,spawnY:350,alive:true,hp:320,maxHP:320,respawn:0},
{id:972,name:'黒曜ドリアングマ',kind:'durianBear',x:980,y:405,spawnX:980,spawnY:405,alive:true,hp:380,maxHP:380,respawn:0},
{id:973,name:'噴煙オオヤマネコ',kind:'emberLizard',x:1280,y:315,spawnX:1280,spawnY:315,alive:true,hp:345,maxHP:345,respawn:0}];
let dragonTrailShopOpen=false;
let dragonTrailShopSelection=0;
let dragonTrailMobs=[
  {id:960,name:'溶岩オオヤマネコ',kind:'emberLizard',x:500,y:430,spawnX:500,spawnY:430,alive:true,hp:380,maxHP:380,respawn:0},
  {id:961,name:'火口イワモグラ',kind:'rockMole',x:820,y:350,spawnX:820,spawnY:350,alive:true,hp:320,maxHP:320,respawn:0},
  {id:962,name:'黒曜ドリアングマ',kind:'durianBear',x:1120,y:405,spawnX:1120,spawnY:405,alive:true,hp:380,maxHP:380,respawn:0},
  {id:963,name:'噴煙オオヤマネコ',kind:'emberLizard',x:1450,y:315,spawnX:1450,spawnY:315,alive:true,hp:345,maxHP:345,respawn:0}
];
let takezoWave=0;
let takezoIntroDone=false;
let takezoMobs=[
  {id:401,x:720,y:610,spawnX:720,spawnY:610,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:58,maxHP:58},
  {id:402,x:1030,y:500,spawnX:1030,spawnY:500,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:62,maxHP:62},
  {id:403,x:1220,y:390,spawnX:1220,spawnY:390,alive:true,name:'海賊タヌキ斥候',kind:'pirateTanuki',hp:66,maxHP:66},
  {id:404,x:820,y:350,spawnX:820,spawnY:350,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:60,maxHP:60},
  {id:405,x:1080,y:445,spawnX:1080,spawnY:445,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:64,maxHP:64}
];


function resetTakezoSquads(){
  const defs=[
    {id:401,x:650,y:430,spawnX:650,spawnY:430,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:58,maxHP:58},
    {id:402,x:900,y:390,spawnX:900,spawnY:390,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:62,maxHP:62},
    {id:403,x:1150,y:345,spawnX:1150,spawnY:345,alive:true,name:'海賊タヌキ斥候',kind:'pirateTanuki',hp:66,maxHP:66},
    {id:404,x:780,y:350,spawnX:780,spawnY:350,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:60,maxHP:60},
    {id:405,x:1030,y:445,spawnX:1030,spawnY:445,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:64,maxHP:64}
  ];
  takezoMobs=defs.map(d=>({...d}));
  takezoHero.x=430;takezoHero.y=455;
}
function repairTakezoSquads(){
  const defs=[
    {id:401,x:650,y:430,spawnX:650,spawnY:430,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:58,maxHP:58},
    {id:402,x:900,y:390,spawnX:900,spawnY:390,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:62,maxHP:62},
    {id:403,x:1150,y:345,spawnX:1150,spawnY:345,alive:true,name:'海賊タヌキ斥候',kind:'pirateTanuki',hp:66,maxHP:66},
    {id:404,x:780,y:350,spawnX:780,spawnY:350,alive:true,name:'海賊ネコ斥候',kind:'pirateCat',hp:60,maxHP:60},
    {id:405,x:1030,y:445,spawnX:1030,spawnY:445,alive:true,name:'海賊イヌ斥候',kind:'pirateDog',hp:64,maxHP:64}
  ];
  for(const d of defs){
    let m=takezoMobs.find(x=>x.id===d.id);
    if(!m){takezoMobs.push({...d});continue;}
    m.spawnX=d.spawnX;m.spawnY=d.spawnY;
    // Alive squads are always returned to a reachable point on the road.
    if(m.alive){m.x=d.x;m.y=d.y;}
  }
}
repairTakezoSquads();

let sarubibiShopType='weapon';
let sarubibiWeaponSelection=0;




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

const ngPlusVillageDialog=[
 ['dash','だ、誰かーっ！ 起きてーっ！ 海賊だよ！ サーカス団のみんなが捕まってる！'],
 ['elder','ふむ。'],
 ['elder','ぴくるす、ちゃちゃっと片付けてこい。'],
 ['dash','えっ？ ちょっ、何？ どういう事！？'],
 ['hero','わかりました。'],
 ['dash','えっ、待って待って！ 話が早すぎるって！'],
 ['elder','気をつけての。'],
 ['dash','軽い！ 村長まで軽い！']
];
const ngPlusReturnDialog=[
 ['narrator','ぴくるすとダッシュミウは二人で、ちぇすたぴサーカス団の拠点へ引き返した。'],
 ['dash','すごい数だよ？ 100人以上いるよ。'],
 ['hero','へー。'],
 ['dash','へーじゃなくて！ しかもみんな人質になってるよ！'],
 ['hero','問題ないです。'],
 ['dash','……その自信、どこから来るの？']
];
const ngPlusOverheadDialog=[
 ['narrator','サーカス団の拠点を上空から見下ろす。海賊の群れが、黒い点のように地面を埋め尽くしていた。'],
 ['hero','デスブリザード。']
];
const ngPlusAfterBlizzardDialog=[
 ['dash','……。'],
 ['hero','大丈夫。ちゃんと手加減してるし、サーカス団員は外してあるよ。'],
 ['dash','……。'],
 ['hero','船長っぽい人いないな。まだ船の中かな？'],
 ['dash','……う、うん。たぶん……。']
];
const ngPlusBossIntroDialog=[
 ['narrator','二人が海賊船へ向かうと、甲板への入口で三人が待ち構えていた。'],
 ['pirateCaptainDialog','……何をした？ 外が急に静かになったぞ。'],
 ['vice','お前ひとりでやったってのか？'],
 ['hero','たぶん。'],
 ['dash','たぶんじゃないよ！ 全部ぴくるすだよ！'],
 ['narrator','船長、副船長、そしてサイボーグのクラウスが武器を構えた！']
];
const ngPlusEndingDialog=[
 ['narrator','船長、副船長、クラウスが倒れ、海賊たちは戦意を失った。'],
 ['dash','……朝になる前に終わっちゃった。'],
 ['hero','村長に終わったって言ってきます。'],
 ['dash','いやいやいや！ ちょっと待って！ 何なの、その強さ！？'],
 ['hero','いろいろありまして。'],
 ['dash','絶対「いろいろ」で済む話じゃないよ！'],
 ['narrator','こうして、海賊騒動は始まったその日のうちに終わった。'],
 ['narrator','これはもう冒険というより、強くなりすぎた者による二周目であった――。']
];

function drawNgPlusVillage(){
  ctx.fillStyle='#8fd47f';ctx.fillRect(0,0,W,H);rect(0,0,W,92,'#89d9e8');drawHouse(95,145);drawHouse(225,105);drawHouse(725,135);drawTree(30,300);drawTree(845,290);drawTree(720,330);
  drawDashmiu(345,335,1.35);drawHeroFox(570,335,1.38);drawElderFox(490,350,1.2);
  const d=ngPlusVillageDialog[Math.min(dialogIndex,ngPlusVillageDialog.length-1)];drawDialog(d[0],d[1]);
}
function drawNgPlusReturn(){
  // drawWorld() normally draws Dashmiu, so temporarily move that sprite off-screen
  // and place the NG+ cutscene pair ourselves to avoid a duplicate Dashmiu.
  const oldDashX=dash.x,oldDashY=dash.y;
  dash.x=-9999;dash.y=-9999;drawWorld();dash.x=oldDashX;dash.y=oldDashY;
  drawHeroFox(590,330,1.15);drawDashmiu(470,330,1.15);
  const d=ngPlusReturnDialog[Math.min(dialogIndex,ngPlusReturnDialog.length-1)];drawDialog(d[0],d[1]);
}
function drawNgPlusOverhead(){
  ctx.fillStyle='#8aa1aa';ctx.fillRect(0,0,W,H);rect(0,60,W,480,'#716b59');
  outlineRect(90,90,250,135,'#f5e7c8','#9d4b45',4);text('ちぇすたぴサーカス団',215,115,16,'center','#9b3044',900);
  for(let i=0;i<120;i++){const x=115+(i%20)*34,y=245+Math.floor(i/20)*31;ellipse(x,y,5,5,i%3===0?'#e8782d':'#333943');}
  drawHeroFox(785,410,.62);drawDashmiu(835,415,.62);
  const d=ngPlusOverheadDialog[Math.min(dialogIndex,ngPlusOverheadDialog.length-1)];drawDialog(d[0],d[1]);
}
function drawNgPlusBlizzard(){
  ctx.fillStyle='#f8fdff';ctx.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){const x=(i*83+dialogIndex*17)%W,y=(i*47)%H;rect(x,y,35+(i%4)*12,3,'rgba(174,220,240,.75)');}
  text('デスブリザード',480,250,42,'center','#88bcd5',900);
  text('――白い吹雪が拠点全体を飲み込んだ――',480,315,20,'center','#7899aa',800);
}
function drawNgPlusAfterBlizzard(){
  ctx.fillStyle='#d9edf3';ctx.fillRect(0,0,W,H);rect(0,315,W,225,'#dbeaf0');
  for(let i=0;i<70;i++){const x=70+(i%18)*48,y=330+Math.floor(i/18)*39;ellipse(x,y,7,4,'#5e6c72');}
  drawHeroFox(650,380,1.05);drawDashmiu(500,380,1.05);
  const d=ngPlusAfterBlizzardDialog[Math.min(dialogIndex,ngPlusAfterBlizzardDialog.length-1)];drawDialog(d[0],d[1]);
}
function drawNgPlusBossIntro(){
  ctx.fillStyle='#466b82';ctx.fillRect(0,0,W,H);rect(0,315,W,225,'#8b654b');
  drawHeroFox(235,365,1.05);drawDashmiu(340,370,1.02);
  drawViceCaptainEnemy(625,350,1.35);drawPirateCaptainEnemy(735,350,1.35);drawCyborgKlaus(845,350,1.35);
  const d=ngPlusBossIntroDialog[Math.min(dialogIndex,ngPlusBossIntroDialog.length-1)];drawDialog(d[0],d[1]);
}
function drawNgPlusEnding(){
  ctx.fillStyle='#10213c';ctx.fillRect(0,0,W,H);
  drawHeroFox(390,285,1.1);drawDashmiu(560,292,1.08);
  text('NEW GAME +',480,90,42,'center','#f3dc91',900);
  const d=ngPlusEndingDialog[Math.min(dialogIndex,ngPlusEndingDialog.length-1)];drawDialog(d[0],d[1]);
}
function startNgPlusBossBattle(){
  // はじめから＋では直前のイベントでデスブリザードを使用しているため、戦闘でも必ず使用可能にする。
  progress.hiddenSkillsUnlocked=true;
  if(!progress.hiddenSkills)progress.hiddenSkills={hero:false,suzu:false,yuno:false,gyou:false};
  progress.hiddenSkills.hero=true;
  const hs=heroStats();
  const enemies=[
    {name:'副船長',kind:'viceCaptain',hp:6000,maxHP:6000},
    {name:'海賊船長',kind:'pirateCaptain',hp:8000,maxHP:8000,potions:2},
    {name:'クラウス',kind:'cyborgKlaus',hp:18000,maxHP:18000}
  ];
  battle={heroHP:hs.maxHP,heroMP:hs.maxMP,enemies,enemyHP:enemies[0].hp,enemyMaxHP:enemies[0].maxHP,enemyName:enemies[0].name,enemyKind:enemies[0].kind,monsterId:1290,turn:'player',defending:false,soloHero:true};
  damagePopups=[];battleMenu='main';battleActor='hero';battleMessage='二周目の最終決戦！';scene='battle';touchUI.classList.add('hidden');
}


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
  ['narrator','翌朝。一行はさるびび村を出て、北北東にある最後の村――たけぞ村へ向かった。'],
  ['dash','この道を抜ければ、たけぞ村だね。'],
  ['yuno','海沿いは見通しがいい。偵察に気をつけよう。'],
  ['suzu','海賊が先に回り込んでてもおかしくない。'],
  ['hero','急ぎつつ、周りも見て進もう。']
];

const takezoScoutAfterDialog=[
  ['dash','偵察小隊まで、こんなところに……。'],
  ['yuno','ここはまだ、たけぞ村の外だ。ここまで海賊が来ているなら――'],
  ['suzu','まさか、たけぞ村はもう……？'],
  ['hero','急ごう！'],
  ['narrator','一行は海岸沿いの道を駆け抜け、たけぞ村へ急いだ。']
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

const takezoPlanDialog=[
  ['narrator','その日の夕方。たけぞ村の作戦室に、各村の代表が集まった。'],
  ['guard','次の襲撃は先行部隊の比じゃない。正面から受け止め続けるのは無理だ。'],
  ['yuno','だから、正面から全部倒そうとしない。村の外に、巨大な落とし穴を作る。'],
  ['dash','巨大って、どのくらい？'],
  ['yuno','海賊の大部隊がまとめて乗れるくらい。'],
  ['suzu','……それ、穴を掘るだけでも大仕事だぞ。'],
  ['yuno','土魔法だけじゃ間に合わない。土の村人が地盤を割って、風の村人が砕いた土砂を巻き上げて外へ運ぶ。二つの魔法で掘る。'],
  ['hero','掘った後は？'],
  ['yuno','水を大量に入れる。水魔法でもいいし、海から海水を引いてもいい。'],
  ['yuno','その水面を氷魔法で厚く凍らせて、最後に土を薄く被せる。見た目は普通の地面になる。'],
  ['dash','氷の蓋と、土の蓋……。'],
  ['yuno','海賊をその上まで誘導してから、炎と風で蓋を壊す。銃も装備も、水の底に沈める。'],
  ['guard','なるほど……村の土壁で守りながら、わざと少しずつ後退するわけか。'],
  ['yuno','そう。ただし、穴の位置を決める前に地形を確認したい。海岸と、中央火山を見ておきたいんだ。'],
  ['hero','一緒に行くよ。'],
  ['narrator','巨大落とし穴の建設が始まった。土と風の村人たちが協力し、まずは広大な穴を掘り始める。']
];

const takezoCoastDialog=[
  ['narrator','ユーノと一行は、たけぞ村近くの海岸へ向かった。'],
  ['yuno','ここなら海水を引ける。水魔法だけで全部満たすより、ずっと魔力を節約できる。'],
  ['dash','海から穴まで、水の道を作るんだね。'],
  ['yuno','うん。風で水を押して、水の村人に流れを制御してもらえばいい。'],
  ['suzu','海賊船から見えない位置なのも都合がいいな。'],
  ['narrator','その時、浅瀬から大きな影が飛び出した！']
];

const bananaSharkAfterDialog=[
  ['dash','つ、強かった……！ あれがこの辺の普通の魚なの？'],
  ['yuno','バナナザメ。ここ一帯を縄張りにしてる。'],
  ['hero','海賊が海から回り込んでくる可能性は？'],
  ['yuno','かなり低いと思う。小舟で近づけば、先にバナナザメに襲われる。'],
  ['suzu','つまり、海岸側は天然の防壁ってわけか。'],
  ['yuno','そう。落とし穴へ海水を引く作業にも集中できる。次は中央火山を見よう。']
];

const takezoVolcanoDialog=[
  ['narrator','魔物を退けながら、一行は中央火山を望める高台へたどり着いた。'],
  ['yuno','……やっぱり。この斜面、ぶりふぉ村の氷壁側までかなり長く続いてる。'],
  ['hero','何か気になる？'],
  ['yuno','うん。傾斜と距離を覚えておきたい。'],
  ['narrator','ユーノはしばらく黙って斜面の先を見つめ、地図に何かを書き込んだ。'],
  ['yuno','それと、この時間は海側から火山へ風が上がってくる。上昇気流もあるね。'],
  ['dash','風まで調べるの？'],
  ['yuno','念のため。今はそれだけ分かれば十分。'],
  ['suzu','……何か考えてそうな顔だな。'],
  ['yuno','まだ考えがまとまってないんだ。戻ろう。落とし穴の工事も気になる。'],
  ['narrator','ユーノは斜面と気流だけを記録し、一行はたけぞ村へ戻った。']
];

const takezoConstructionDialog=[
  ['narrator','村へ戻る頃には、巨大な穴の輪郭がはっきり見えるほど工事が進んでいた。'],
  ['guard','土組、もう一段深く！ 風組は崩した土を西へ飛ばしてくれ！'],
  ['narrator','土魔法が地面を割り、風魔法が大量の土砂を巻き上げて運び出す。二つの村の力で、穴は急速に広がっていく。'],
  ['yuno','いい感じ。これなら間に合う。'],
  ['narrator','その後、海から引いた水と水魔法で穴を満たし、氷の村人たちが厚い氷の蓋を作った。'],
  ['narrator','最後に土の村人たちが氷の上を土で覆い、周囲と見分けがつかないように偽装した。'],
  ['dash','……知ってても、どこから穴なのか分からない。'],
  ['suzu','自分たちで落ちるなよ。'],
  ['yuno','目印は決めてある。あとは海賊が来るまで、休める人は休もう。'],
  ['narrator','巨大落とし穴が完成した。夜が明けるまで、交代で休みながら襲撃に備えることになった。']
];

const secondWaveIntroDialog=[
  ['narrator','翌日――。夜通しの準備を終えたたけぞ村に、見張り台の鐘が鳴り響いた。'],
  ['guard','海賊だ！ 今度は大部隊だぞ！'],
  ['dash','……多い。先行部隊の何倍いるの？'],
  ['yuno','想定内。みんな、予定通りに。'],
  ['guard','土組！ 第一防壁を上げろ！'],
  ['narrator','たけぞ村の村人たちが一斉に土魔法を放ち、村の前に分厚い土壁がせり上がった。'],
  ['yuno','風、氷、炎の組は壁の隙間から応戦。倒し切ろうとしなくていい。少しずつ下がって。'],
  ['suzu','落とし穴の上まで誘い込むんだな。'],
  ['yuno','そう。絶対に早く仕掛けないで。']
];

const secondWaveRetreatDialog=[
  ['narrator','海賊の大軍が土壁を越え、一気に押し寄せる。'],
  ['guard','第二線まで後退！'],
  ['narrator','氷の礫と炎弾が飛び、風が海賊の進路を少しずつ中央へ曲げていく。'],
  ['dash','押されてるようにしか見えない……。'],
  ['yuno','それでいい。右側をもう少し開けて。中央へ集める。'],
  ['suzu','そろそろ半分以上が入ったぞ。'],
  ['yuno','……まだ。'],
  ['narrator','海賊たちは勝ちを確信したように、後退する島民たちを追って前へ出た。'],
  ['guard','最終線！'],
  ['yuno','よし。全員、合図の位置まで下がって！']
];

const secondWaveTrapDialog=[
  ['yuno','炎組――敵じゃなくて、地面を狙って！'],
  ['narrator','炎魔法が偽装された地面を焼き、土の表面に次々と亀裂が走る。'],
  ['yuno','風組！ 海賊を中央へ！ 同時に亀裂の土を吹き飛ばして！'],
  ['narrator','横から吹きつける強風に押され、海賊たちが広い地面の中央へ密集していく。'],
  ['pirate','な、なんだ！？ 地面が――！'],
  ['narrator','バキッ――巨大な音とともに、土の下に隠されていた氷の蓋が崩壊した。'],
  ['narrator','広範囲の地面が一斉に抜け、大勢の海賊が水を満たした巨大落とし穴へ落ちていく。'],
  ['dash','うわぁ……本当に全部落ちた……！'],
  ['narrator','海賊たちの銃や重い装備も手を離れ、そのまま穴の水底へ沈んでいった。'],
  ['suzu','これじゃ、もうまともに戦えないな。'],
  ['yuno','穴の縁に残った部隊も混乱してる。今なら追い返せる！']
];

const secondWaveVictoryDialog=[
  ['narrator','武器を失った海賊たちは救助された仲間を連れ、海岸方面へ撤退していった。'],
  ['guard','……勝った。たけぞ村を守り切ったぞ！'],
  ['dash','作戦、大成功だね！'],
  ['yuno','うん。でも、これで終わりじゃない。'],
  ['narrator','その時、ぶりふぉ村から息を切らした伝令が駆け込んできた。'],
  ['messenger','緊急です！ ぶりふぉ村の氷壁が……もう長く持ちません！'],
  ['hero','ついに……。'],
  ['suzu','本隊が動くか。'],
  ['yuno','みんなを集めよう。ここからは、島全体で戦うことになる。'],
  ['narrator','海賊との最終決戦が迫っていた――。']
];

const gyouJoinDialog=[
  ['narrator','伝令の報告を聞いた直後、土壁の修復を指揮していた青年が一行の前へ来た。'],
  ['gyou','ぶりふぉ村へ行くなら、俺も連れていってくれ。'],
  ['dash','ジュウ！ ここの守りは？'],
  ['gyou','もう引き継いだ。土壁の扱いなら皆も十分分かってる。'],
  ['gyou','ここまで島中の村が力を貸してるんだ。最後だけ見送る気はない。'],
  ['suzu','決まりだな。'],
  ['yuno','うん。五人なら、できることも増える。'],
  ['hero','行こう、ジュウ。'],
  ['narrator','ジュウが仲間になった！']
];

const finalPrepDialog=[
  ['narrator','一行は各村の代表を集め、最終決戦に向けた準備を始めた。'],
  ['yuno','まず、ぶりふぉ村の氷壁が破られる前に動く。'],
  ['yuno','地上の戦力は海賊本隊を引き受けてもらう。土の村人たちは土壁を何重にも作って、防衛線を維持して。'],
  ['guard','任せろ。たけぞ村でやった形を、もっと大きくすればいい。'],
  ['yuno','火と水の村人には、海岸側で大量の霧を作ってもらう。風の村人がその霧を海賊本陣へゆっくり流す。'],
  ['dash','向こうから島の中が見えなくなるね。'],
  ['yuno','それが狙い。あと、火山で確認した斜面も使える。ぶりふぉ村の氷壁前に集まった海賊を、一気に崩せるかもしれない。'],
  ['suzu','この前、斜面ばかり見てたのはそのためか。'],
  ['yuno','岩を落とすか、氷の道を作って大きな物を滑らせるか……そこは現地で最終調整する。'],
  ['hero','僕たち五人は？'],
  ['yuno','地上には残らない。気球を使う。'],
  ['dash','気球！？'],
  ['yuno','スズマルの火で熱を作って、私が風で進路を調整する。霧に隠れて上空から海賊船へ入る。'],
  ['gyou','地上の大軍を相手にせず、頭を直接叩くわけか。'],
  ['yuno','船長を止めれば、この戦いを終わらせられる。'],
  ['narrator','作戦が決まった。決戦までのわずかな時間、一行は装備と技を整えることになった。']
];

const finalWeaponDialog=[
  ['narrator','ジュウの特訓が終わった頃、さるびえ村から鍛冶職人が長い包みを抱えてやって来た。'],
  ['smith','スズマル。お前に持たせたいものがある。'],
  ['suzu','俺に？'],
  ['smith','火山の炉で最後まで鍛えた大剣だ。刃の芯に炎晶石を仕込んである。'],
  ['dash','炎晶石って、あの洞窟で取ったやつ？'],
  ['smith','ああ。斬った瞬間に刃へ残った魔力が弾けて、少し遅れて炎が走る。'],
  ['yuno','一度の斬撃で、物理と炎の二段攻撃になるんだ。'],
  ['smith','名前は「爆炎大剣」。お前の火魔法なら一番うまく扱える。'],
  ['suzu','……ありがたく使わせてもらう。'],
  ['narrator','スズマルは「爆炎大剣」を装備した！ 攻撃力が10上がり、通常攻撃と単体斬撃に炎の追撃が発生する！'],
  ['smith','決戦が終わったら返せとは言わん。ちゃんと使い込め。']
];

const yunoComboDialog=[
  ['narrator','爆炎大剣を受け取ったあと、ユーノがぴくるすを呼び止めた。'],
  ['yuno','ぴくるす、ちょっと試したいことがあるんだけど。'],
  ['hero','試したいこと？'],
  ['yuno','ぴくるすは水と氷を使える。私は風を使える。'],
  ['yuno','雨と風が合わさると、台風になりますね。'],
  ['dash','急に授業みたいになった。'],
  ['yuno','つまり、別々に魔法を撃つより、二人で一つの流れを作ったほうが大きな力になるかもしれない。'],
  ['hero','攻撃だけじゃなくて、回復にも？'],
  ['yuno','うん。水の回復魔法を風で広げれば、全員を一気に癒せるはず。'],
  ['narrator','二人は魔力のタイミングを合わせる練習を始めた。'],
  ['yuno','今。風を送る！'],
  ['hero','――いくよ！'],
  ['narrator','水と風が渦を作り、広場いっぱいに涼しい霧が広がった。'],
  ['yuno','できた。これなら実戦でも使える。'],
  ['narrator','合体技「蒼風大癒」と「氷嵐大旋風」が使用可能になった！']
];

const volcanoBearQuestDialog=[
  ['suzu','……なあ。せっかく新しい剣をもらったんだ。試し斬りしておきたい。'],
  ['dash','試し斬りって、何を斬るの？'],
  ['suzu','火山にドリアングマが残ってただろ。あいつなら相手に不足はない。'],
  ['yuno','なるほど。ちょうどいいかも。'],
  ['hero','ちょうどいい？'],
  ['yuno','決戦では火山の斜面を使う。作戦中にドリアングマが暴れたら危ないから、先に安全を確保しておきたかったんだ。'],
  ['gyou','剣の試し斬りと、作戦の邪魔になる魔物の排除を一緒にやるわけか。'],
  ['suzu','決まりだな。爆炎大剣がどれくらいやれるか、俺も知っておきたい。'],
  ['dash','クマからしたら、とんでもない話だけどね……。'],
  ['narrator','決戦前任務「爆炎大剣の試し斬り」が始まった！']
];

const volcanoBearAfterDialog=[
  ['narrator','5体の大ドリアングマを退け、火山斜面の安全を確保した。'],
  ['yuno','これで斜面を使う作戦中に魔物が飛び込んでくる心配は減った。'],
  ['suzu','あとは海賊にぶつけるだけだな。'],
  ['dash','言い方が豪快すぎるよ。'],
  ['narrator','最終作戦の成功率が上がった！']
];


const finalEveDialog=[
  ['narrator','火山から戻った一行を、たけぞ村に集まった各村の代表たちが迎えた。'],
  ['suzu','爆炎大剣は問題ない。ドリアングマ相手でも十分通った。'],
  ['gyou','火山の斜面も安全になった。これで作戦中に魔物に邪魔される心配もない。'],
  ['yuno','じゃあ、最後に全員で作戦を確認しよう。'],
  ['narrator','ユーノは島の地図を広げ、ぶりふぉ村、火山、海岸を順番に指した。'],
  ['yuno','地上部隊は土壁を中心に防衛。海賊本隊を島の内側へ進ませない。'],
  ['yuno','火と水の村人は霧を作る。風の村人は、その霧を海賊本陣へ流して視界を奪う。'],
  ['dash','霧の中なら、向こうからこっちの動きも見えにくい。'],
  ['yuno','うん。そして火山側では、あの斜面を使う。'],
  ['suzu','この前、お前が斜面と風ばっかり見てた理由が、ようやく全部つながったな。'],
  ['yuno','ぶりふぉ村の氷壁前に集まっている海賊を、上から一気に崩す。岩を使うか、氷の道を使うかは現地の状態で決める。'],
  ['hero','僕たちは気球だね。'],
  ['yuno','そう。スズマルの火で浮かせて、私の風で操縦する。霧に紛れて海賊本陣の上空へ入る。'],
  ['gyou','地上の大軍は皆に任せて、俺たちは船長を直接叩く。'],
  ['dash','島中のみんなで道を作って、最後のところだけ僕たちが突っ込むわけだ。'],
  ['yuno','船長を止めれば、この戦いを終わらせられる。'],
  ['narrator','作戦の確認が終わると、村人たちはそれぞれの持ち場へ散っていった。'],
  ['elder','出る前に、装備も薬も確かめておけ。戦が始まってから忘れ物に気づいても遅いぞ。'],
  ['suzu','だそうだ。最後にちゃんと準備していこう。'],
  ['narrator','決戦前の自由時間になった。準備ができたらユーノに声をかけよう。']
];

const finalLaunchDialog=[
  ['yuno','準備はできた？'],
  ['hero','うん。行こう。'],
  ['narrator','その時、ぶりふぉ村から新たな伝令が駆け込んできた。'],
  ['messenger','氷壁に亀裂が！ 海賊本隊も動き始めています！'],
  ['suzu','……時間切れだな。'],
  ['gyou','ここから先は、やるだけだ。'],
  ['dash','みんな、絶対に戻ってこよう。'],
  ['yuno','最終作戦を開始する。ぶりふぉ村へ！'],
  ['narrator','島中の村人たちが、それぞれの持ち場へ走り出した――。']
];

const finalBattleGroundDialog=[
  ['narrator','ぶりふぉ村の外。氷壁の向こうには、これまでとは比べものにならない数の海賊が集まっていた。'],
  ['pirate','押せ！　もう壁はもたねえぞ！'],
  ['narrator','亀裂の入った氷壁へ砲撃が集中する。だが、その内側では島の村人たちがすでに配置についていた。'],
  ['elder','土の者は前へ！　壁を二重にするぞ！'],
  ['narrator','氷壁の後ろから分厚い土壁がせり上がり、崩れた場所を次々と塞いでいく。'],
  ['yuno','まだ反撃しないで。予定通り、少しずつ下がって。'],
  ['narrator','風、氷、炎の村人たちは攻撃しながら、わざと守備線を後退させた。海賊の大軍が島の内側へ踏み込んでくる。'],
  ['pirate','逃げてるぞ！　一気に潰せ！'],
  ['dash','……ちゃんと追ってきた。'],
  ['yuno','水の人たち、今！'],
  ['narrator','大量の水が地面と空へ放たれる。そこへ炎が走り、白い蒸気が戦場いっぱいに広がった。'],
  ['suzu','霧、できたぞ！'],
  ['yuno','風を海側へ。敵の本陣だけ濃くする！'],
  ['narrator','風魔法が霧を押し流す。島側の視界は開けたまま、海賊本陣だけが白く覆われていった。'],
  ['gyou','前が見えなくなって、隊列が崩れてる。今なら押さえられる。'],
  ['narrator','ジュウたち土の村人が壁を押し上げ、海賊の進路を狭める。'],
  ['hero','ユーノ、火山側の合図！'],
  ['yuno','来るよ。全員、壁の内側へ！'],
  ['narrator','遠くの火山で赤い合図が上がった。直後、ぶりふぉ村へ向いた斜面を巨大な岩が轟音とともに滑り始める。'],
  ['narrator','さらに氷で固めた滑走路を、資材を積んだ巨大な氷の舟が走り抜けた。'],
  ['pirate','なんだ、あれは――！？'],
  ['narrator','岩と氷舟は氷壁の外側に密集していた海賊部隊へ突入。砲台と隊列をまとめて押し崩した。'],
  ['suzu','うわ……思ってたより派手だな。'],
  ['yuno','これで地上の主力は分断できた。次は、あっち。'],
  ['narrator','ユーノが霧の向こうに浮かぶ海賊旗を指す。船長の本陣だ。'],
  ['dash','いよいよ気球か。'],
  ['gyou','地上は村のみんなに任せる。俺たちは船長を止めよう。'],
  ['yuno','スズマル、火を。私が風を読む。'],
  ['suzu','任せろ。燃やすんじゃなくて、浮かせるんだな。'],
  ['hero','みんな、乗って！'],
  ['narrator','熱を受けた気球がゆっくりと浮かび上がる。霧に隠れながら、5人は海賊本陣の上空へ向かった。']
];

const finalBalloonDialog=[
  ['narrator','地上では土壁と霧の中で戦いが続いている。だが上空からなら、海賊本陣まで一直線だった。'],
  ['yuno','右から強い風。スズマル、火を少し弱めて！'],
  ['suzu','これくらいか？'],
  ['yuno','うん。ぴくるす、前から来る風を水で散らせる？'],
  ['hero','やってみる！'],
  ['narrator','水と風がぶつかり、気球の前に小さな渦が生まれる。進路を塞いでいた霧が円を描いて開いた。'],
  ['dash','あった！　あの大きい旗のところ！'],
  ['gyou','下に銃を持った護衛がいる。降りた瞬間を狙われるぞ。'],
  ['yuno','なら、着地しない。真上まで行って一気に降りる。'],
  ['suzu','それ、奇襲っていうより落下じゃないか？'],
  ['yuno','ジュウがいるから大丈夫。'],
  ['gyou','俺を何だと思ってるんだ。'],
  ['dash','盾。'],
  ['gyou','……否定しづらいな。'],
  ['narrator','一瞬だけ、5人にいつもの空気が戻る。'],
  ['hero','見えた。船長だ。'],
  ['narrator','霧の切れ間。ぶりふぉ村攻略のため海岸近くに置かれた前線本陣。その巨大な海賊旗の下で、二人の影が空を見上げた。'],
  ['pirateCaptainDialog','……島の連中が、空から来るとはな。'],
  ['vice','船長、俺が叩き落とします。'],
  ['yuno','気づかれた！'],
  ['hero','行こう。ここで終わらせる！'],
  ['narrator','5人は海賊本陣へ降下を開始した――。']
];


const pirateCaptainIntroDialog=[
['narrator','5人は気球から海岸近くの前線本陣へ飛び降りた。ジュウが土の盾で着地の衝撃を受け止める。沖には船長の旗艦が待機している。'],
['pirateCaptainDialog','村を守るために、わざわざ俺のところまで来たか。'],
['suzu','そっちが島まで来たんだろ。帰ってくれるなら追いかけないぞ。'],
['yuno','長引けば食料も弾薬も尽きる。だから一気に攻めたかったんだね。'],
['pirateCaptainDialog','……よく見ている。だが、ここまで来て手ぶらでは帰れん。'],
['gyou','こっちも村は渡さない。'],
['dash','だったら、ここで決着をつけよう。'],
['hero','あなたを倒して、この戦いを終わらせる！'],
['vice','船長に近づけると思うな。俺の斧でまとめて潰す！'],
['pirateCaptainDialog','いいだろう。島の切り札――副船長と俺でまとめて相手をしてやる！']
];
const pirateCaptainAfterDialog=[
['narrator','副船長の大斧が転がり、続いて船長の武器も地面へ落ちた。'],
['pirateCaptainDialog','……ここまで、か。'],
['yuno','本隊も分断されてる。これ以上続けても勝てないよ。'],
['pirateCaptainDialog','全員に撤退を伝えろ。動ける船から海へ出す。'],
['suzu','最初からそうしてくれれば楽だったんだけどな。'],
['gyou','終わった……のか。'],
['dash','まだ村に戻るまでが決戦だよ。'],
['hero','うん。みんなのところへ戻ろう。'],
['narrator','海賊旗が下ろされ、島を覆っていた戦いは終わりへ向かい始めた――。']
];

const endingDialog=[
['narrator','海賊船が水平線の向こうへ消えていく。ぶりふぉ村の氷壁には、久しぶりに静かな風が吹いていた。'],
['dash','……本当に帰っていったね。'],
['suzu','腹減った。勝った後くらい、でかい飯にしようぜ。'],
['yuno','賛成。作戦会議より平和な相談だ。'],
['gyou','たけぞ村のみんなにも伝えてくる。今度は守るためじゃなく、祝いに集まろう。'],
['hero','うん。みんなで帰ろう。'],
['narrator','その夜、五つの村から料理と灯りが集まり、島じゅうを巻き込んだ宴が開かれた。'],
['narrator','土も、風も、水も、氷も、炎も。違う力は、争うためではなく島を守るために重なった。'],
['narrator','そして、ぴくるすたちの旅はひとまず終わる。――けれど、火山の奥ではまだ何かが眠っているらしい。']
];

const postGameElderDialog=[
 ['elder','あの海賊ら、まだ隣の島で悪さしとるらしいぞ。']
];
const postGameElderDragonDialog=[
 ['elder','あの海賊ら、また隣の島で悪さしとるらしいぞ。'],
 ['elder','拠点を突き止めたらしいけど、お前さんたちドラゴンを倒したんじゃろ？'],
 ['elder','もう4人で潰してきたらどうじゃ？ 行くならサーカス団の船を出してもらったらええ。']
];
const nineTailElderCheckDialog=[
 ['elder','おぬし、氷撃は一度に何発出せるようになった？ 氷結斬りはどうじゃ？'],
 ['elder','ほう？ 7発に3回じゃと。'],
 ['elder','もうええ頃合いかもしれんな。'],
 ['elder','今から信じられんような話をするが、本当のことなんじゃ。'],
 ['elder','実はのう、この島の火山の麓に立ち入り禁止区域があるのは知ってるじゃろ？'],
 ['elder','その奥には、異界へと通じる扉があるのじゃ。そしてその扉は絶対零度の氷に封じられておる。'],
 ['elder','じゃが、100年に1度その氷が溶けるらしいのじゃ。'],
 ['elder','わしも先代の村長から聞かされただけで、見た事はない。'],
 ['elder','その異界の魔物は桁違いな強さだという。全島民が束になっても勝てぬほどじゃ。'],
 ['elder','それなのにわしらの祖先は100年以上前からこの島で暮らしておる、何故だかわかるか？'],
 ['elder','それはのぉ、九尾の加護を受けたキツネ族の者なら異界の魔物にも対抗出来るからなのじゃ。'],
 ['elder','九尾の加護を得られるのは、お主しかおらんと思うのじゃ。'],
 ['elder','ちとお前さん1人だけついてこい。']
];
const sealedGateDialog=[
 ['narrator','火山の麓。立ち入り禁止区域の奥で、青白い氷に覆われた巨大な扉が脈打っている。'],
 ['narrator','九尾の妖刀が淡く光ると、絶対零度の氷に一本の亀裂が走った。'],
 ['hero','……開く。ここから先は、僕ひとりで行く。']
];
const nineTailPostDialog=[
 ['elder','九尾の力はお主に託した。火山の麓の立ち入り禁止区域、その奥を確かめてくるがよい。']
];
const nineTailHouseDialog=[
 ['elder','この九尾の妖刀と、九尾の衣、お主なら使いこなせるじゃろう。'],
 ['narrator','九尾の妖刀を手に入れた！ 攻撃+200。氷結斬りの攻撃回数3倍、さらに1撃ごとに固定99ダメージ。'],
 ['narrator','九尾の衣を手に入れた！ HP+50、MP+50、被ダメージ50%カット。氷魔法3倍、氷撃+2発、回復魔法+100。'],
 ['elder','火山の麓の立ち入り禁止区域へ行くがよい。絶対零度の封印が解ける時が来たのじゃ。']
];
const postGameCircusDialog=[
 ['dash','話は聞いたよ。ちぇすたぴサーカス団の船を出そう！'],
 ['dash','海賊の拠点まで一気に送る。帰りのことは倒してから考えよう！']
];
const postGameRaidClearDialog=[
 ['narrator','海賊の残党を率いていた三人が倒れ、隣の島にも静けさが戻った。'],
 ['hero','これで、本当に終わったね。'],
 ['suzu','ああ。今度こそ帰って、ゆっくり飯にしようぜ。']
];
function startPostGameRaidWave(){
 const wave=postGameRaidWave;
 if(wave<3){
   const count=6;const es=[];
   for(let i=0;i<count;i++)es.push({name:`海賊${wave*count+i+1}`,kind:i%3===0?'pirateBear':i%3===1?'pirateCat':'pirate',hp:220+wave*35,maxHP:220+wave*35});
   startBattleGroup(es,980+wave);battleMessage=`海賊の大集団！ 第${wave+1}波、${count}人！`;return;
 }
 startPostGameRaidBoss();
}
function startPostGameRaidBoss(){
 const lv=Math.max(20,progress.level||20),b=900+(lv-20)*32;
 const klausHP=2600+(lv-20)*85;
 const es=[
  {name:'副船長',kind:'viceCaptain',hp:Math.floor(b*.88),maxHP:Math.floor(b*.88)},
  {name:'海賊船長',kind:'pirateCaptain',hp:b,maxHP:b,potions:2},
  {name:'クラウス',kind:'cyborgKlaus',hp:klausHP,maxHP:klausHP}
 ];
 startBattleGroup(es,990);battle.bossTurn=0;battleMessage='船長・副船長・サイボーグのクラウスが立ちはだかった！';
}
const dragonCallDialog=[
['narrator','船長との死闘を終え、五人がようやくひと息ついた、その時だった。'],
['narrator','声ではない。五人全員の頭の中に、低く威厳のある言葉が直接響いた。'],
['dragonVoice','面白いものを見せてもらった。強き者たちよ、我と腕試しをせぬか？'],
['dragonVoice','我に挑む勇気があるなら、火山の頂上へ来るがよい。'],
['dash','……今の、みんなにも聞こえた？'],
['suzu','ああ。頭の中に直接な。火山の頂上で待ってるってわけか。'],
['yuno','道中も険しそうだね。準備しながら登ろう。'],
['gyou','万全の状態で行こう。これは俺たち自身の挑戦だ。'],
['hero','うん。火山の頂上を目指そう！']
];

const dragonSummitDialog=[
['narrator','険しい登山道を越え、五人はついに火山の頂上へたどり着いた。'],
['narrator','熱気の向こうで、巨大な古竜が静かに五人を待っている。'],
['dragonVoice','よくぞここまで来た。']
];


function dragonTrailEncounterGroup(first){
  const pool=[
    {name:'溶岩オオヤマネコ',kind:'emberLizard',hp:380,maxHP:380},
    {name:'火口イワモグラ',kind:'rockMole',hp:320,maxHP:320},
    {name:'黒曜ドリアングマ',kind:'durianBear',hp:380,maxHP:380},
    {name:'噴煙オオヤマネコ',kind:'emberLizard',hp:345,maxHP:345}
  ];
  const count=2+Math.floor(Math.random()*2);
  const enemies=[{name:first.name,kind:first.kind,hp:first.hp,maxHP:first.maxHP}];
  while(enemies.length<count){
    const t=pool[Math.floor(Math.random()*pool.length)];
    enemies.push({...t});
  }
  return enemies;
}

function startBattleGroup(enemies,monsterId){
  suzumaruActive=true;suzumaruJoined=true;yunoJoined=true;gyouJoinConfirmed=true;gyouJoined=true;syncStoryParty();
  const ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats(),first=enemies[0];
  battle={heroHP:progress.maxHP,heroMP:progress.maxMP,suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,gyouHP:gs.maxHP,gyouMaxHP:gs.maxHP,gyouMP:gs.maxMP,gyouMaxMP:gs.maxMP,
    enemyHP:first.hp,enemyMaxHP:first.maxHP,enemyName:first.name,enemyKind:first.kind,monsterId,turn:'player',defending:false,enemies};
  damagePopups=[];battleMenu='main';battleActor='hero';battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage=`${enemies.length}体の敵が現れた！`;scene='battle';touchUI.classList.add('hidden');
}
function startPostGameVolcanoBattle(mon){const pool=postGameVolcanoMobs.filter(m=>m.alive),count=2+Math.floor(Math.random()*2),chosen=[mon,...pool.filter(m=>m!==mon).sort(()=>Math.random()-.5).slice(0,count-1)];startBattleGroup(chosen.map(m=>({id:m.id,name:m.name,kind:m.kind,hp:m.hp,maxHP:m.maxHP})),mon.id);}
function startDragonTrailBattle(mon){
  suzumaruActive=true;suzumaruJoined=true;yunoJoined=true;gyouJoinConfirmed=true;gyouJoined=true;
  syncStoryParty();
  const ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();
  battle={heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    gyouHP:gs.maxHP,gyouMaxHP:gs.maxHP,gyouMP:gs.maxMP,gyouMaxMP:gs.maxMP,
    enemyHP:mon.hp,enemyMaxHP:mon.maxHP,enemyName:mon.name,enemyKind:mon.kind,
    monsterId:mon.id,turn:'player',defending:false,
    enemies:dragonTrailEncounterGroup(mon)};
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage=`${battle.enemies.length}体の魔物が頂上への道を塞いだ！`;scene='battle';touchUI.classList.add('hidden');
}

function buyDragonTrailShop(){
  const i=dragonTrailShopSelection;
  if(i===7){
    scene='dragonTrail';touchUI.classList.remove('hidden');
    flashText='登山道へ戻った';flashTimer=1.2;return;
  }
  const buyUnique=(flag,price,msg)=>{
    if(progress.shopBought[flag]){flashText='この装備は購入済みです';flashTimer=1.5;return false;}
    if(progress.gold<price){flashText='お金が足りません';flashTimer=1.5;return false;}
    progress.gold-=price;progress.shopBought[flag]=true;sfx('buy');flashText=msg;flashTimer=2;return true;
  };
  if(i===0){
    if(progress.gold<75){flashText='お金が足りません';flashTimer=1.5;return;}
    progress.gold-=75;progress.items.highPotion=(progress.items.highPotion||0)+1;sfx('buy');
    flashText=`高級回復薬を購入！ 所持 ${progress.items.highPotion}`;flashTimer=1.7;
  }else if(i===1){
    if(!buyUnique('summitBow',260,'烈風の強弓を購入！ ユーノ攻撃+6・消費MP約1/3減！'))return;
  }else if(i===2){
    if(!buyUnique('summitSpear',300,'黒曜の剛槍を購入！ ジュウの攻撃・防御が上昇'))return;
  }else if(i===3){
    if(!buyUnique('heroManaBlade',360,'水晶の小剣を購入！ 攻撃+10・氷威力+30%・消費MP半減！'))return;
  }else if(i===4){
    if(!buyUnique('suzuGloves',340,'炎獣のグローブを購入！ 毎ターン攻撃UP・炎威力+30%・MP25%減！'))return;
  }else if(i===5){
    if(!buyUnique('yunoBracelet',340,'風刻の腕輪を購入！ 支援+1ターン・風魔法威力+30%！'))return;
  }else if(i===6){
    if(!buyUnique('gyouShield',360,'地脈の大盾を購入！ 被ダメージ25%減＋被弾時MP回復！'))return;
  }
  saveProgress();saveGame();
}
function startPostDragonBattle(){
  // Postgame superboss: intended to remain threatening after a normal clear.
  const lv=Math.max(1,progress.level||1),hp=4000+Math.min(1800,Math.max(0,lv-15)*140);
  battle={heroHP:progress.maxHP,heroMP:progress.maxMP,enemyHP:hp,enemyMaxHP:hp,enemyName:'火山の古竜',enemyKind:'dragon',monsterId:950,turn:'player',defending:false,bossPhase:1,bossTurn:0};
  const ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();
  Object.assign(battle,{suzuMaxHP:ss.maxHP,suzuHP:ss.maxHP,suzuMaxMP:ss.maxMP,suzuMP:ss.maxMP,yunoMaxHP:ys.maxHP,yunoHP:ys.maxHP,yunoMaxMP:ys.maxMP,yunoMP:ys.maxMP,gyouMaxHP:gs.maxHP,gyouHP:gs.maxHP,gyouMaxMP:gs.maxMP,gyouMP:gs.maxMP});
  damagePopups=[];battleMenu='main';battleActor='hero';battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage='火山の古竜との腕試しが始まった！';scene='battle';touchUI.classList.add('hidden');
}
const gyouTrainingDialog=[
  ['narrator','準備を進めていると、たけぞ村の老村長がジュウを呼び止めた。'],
  ['takezoElder','ジュウ。守るというのは、ただ硬くなることではない。'],
  ['gyou','村長……。'],
  ['takezoElder','仲間が倒れるはずだった一撃を、自分が引き受ける。その覚悟まで含めて守りだ。'],
  ['narrator','村長はジュウと何度も打ち合い、複数方向から飛んでくる土の礫を一人で受け止める特訓を行った。'],
  ['gyou','……もう一度お願いします！'],
  ['takezoElder','よし。今度は四人全員を守るつもりで構えろ！'],
  ['narrator','激しい特訓の末、ジュウは奥義「大守護」を身につけた！'],
  ['takezoElder','使えばお前一人に攻撃が集中する。無茶はするな。だが――必要な時には迷うな。'],
  ['gyou','はい！']
];

const finalPrepFreeDialog=[
  ['narrator','決戦前の準備時間。各村から物資や協力者が集まり始めている。'],
  ['dash','今のうちに買い物や特訓をしておこう。'],
  ['suzu','本番で後悔しないようにな。'],
  ['yuno','準備ができたら、ぶりふぉ村へ向かおう。'],
  ['gyou','俺も付き合う。']
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
  {id:3,name:'カボチャガニ',kind:'pumpkinCrab',x:1710,y:1190,spawnX:1710,spawnY:1190,alive:true,hp:38,maxHP:38,respawn:0},
  {id:4,name:'リンゴリス',kind:'appleSquirrel',x:1030,y:1180,spawnX:1030,spawnY:1180,alive:true,hp:24,maxHP:24,respawn:0},
  {id:5,name:'モモモモンガ',kind:'peachGlider',x:1550,y:720,spawnX:1550,spawnY:720,alive:true,hp:30,maxHP:30,respawn:0}
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

  if(['world','road2','cave','route3','sarubieTown','sarubibiTown','takezoTravel','takezoRoute','coastSurveyField','volcanoSurveyField','finalBearField','finalEveFree'].includes(scene)){
    lastFieldScene=scene;
  }

  const data={
    version:22,
    postGameArea,postGameElderTalked,postGameRaidUnlocked,postGameRaidWave,
    postGameHero:{x:postGameHero.x,y:postGameHero.y},
    postGameVolcanoHero:{x:postGameVolcanoHero.x,y:postGameVolcanoHero.y},
    sealedCaveHero:{x:sealedCaveHero.x,y:sealedCaveHero.y},
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
    gyouJoined,
    gyouJoinConfirmed,
    takezoIntroDone,
    takezoPrepStage,
    secondWaveStage,
    bananaSharkAlive,
    finalBearWave,
    tsukipopoBattleCleared,
    coastSurveyHero:{x:coastSurveyHero.x,y:coastSurveyHero.y},
    volcanoSurveyHero:{x:volcanoSurveyHero.x,y:volcanoSurveyHero.y},
    volcanoSurveyMobs:volcanoSurveyMobs.map(m=>({id:m.id,alive:m.alive,x:m.x,y:m.y})),
    finalBear:{alive:finalBear.alive,x:finalBear.x,y:finalBear.y},finalBearHero:{x:finalBearHero.x,y:finalBearHero.y},
    takezoScoutDefeated,
    takezoScoutAlive:takezoScout.alive,
    takezoTravelHero:{x:takezoTravelHero.x,y:takezoTravelHero.y},
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
    const postGyouScenes=['finalPrep','finalPrepFree','gyouTraining','finalWeapon','yunoCombo','volcanoBearQuest','finalBearField','volcanoBearAfter'];
    if(typeof d.gyouJoinConfirmed==='boolean'){
      gyouJoinConfirmed=d.gyouJoinConfirmed;
    }else{
      // Conservative migration: only clearly post-join story checkpoints count.
      // Do not infer from progress/skills, because those persist separately and
      // caused Gyou to appear before his actual join event.
      gyouJoinConfirmed=postGyouScenes.includes(d.scene);
    }
    gyouJoined=gyouJoinConfirmed;
    takezoIntroDone=!!d.takezoIntroDone;takezoPrepStage=d.takezoPrepStage||0;secondWaveStage=d.secondWaveStage||0;
    if(typeof d.bananaSharkAlive==='boolean')bananaSharkAlive=d.bananaSharkAlive;
    takezoScoutDefeated=!!d.takezoScoutDefeated;
    if(typeof d.takezoScoutAlive==='boolean')takezoScout.alive=d.takezoScoutAlive;

    const apply=(obj,s)=>{if(s){if(Number.isFinite(s.x))obj.x=s.x;if(Number.isFinite(s.y))obj.y=s.y;}};
    apply(dash,d.dash);apply(hero,d.hero);apply(caveHero,d.caveHero);apply(route3Hero,d.route3Hero);
    apply(townHero,d.townHero);apply(sarubibiHero,d.sarubibiHero);apply(takezoTravelHero,d.takezoTravelHero);apply(takezoHero,d.takezoHero);apply(coastSurveyHero,d.coastSurveyHero);apply(volcanoSurveyHero,d.volcanoSurveyHero);apply(finalBearHero,d.finalBearHero);if(d.finalBear){if(typeof d.finalBear.alive==='boolean')finalBear.alive=d.finalBear.alive;}

    restoreList(monsters,d.monsters);
    restoreList(caveMobs,d.caveMobs);
    restoreList(route3Mobs,d.route3Mobs);restoreList(takezoMobs,d.takezoMobs);restoreList(volcanoSurveyMobs,d.volcanoSurveyMobs);repairTakezoSquads();

    lastFieldScene=d.lastFieldScene||'world';
    if(d.postGameArea)postGameArea=d.postGameArea;if(d.postGameElderTalked!==undefined)postGameElderTalked=d.postGameElderTalked;if(d.postGameRaidUnlocked!==undefined)postGameRaidUnlocked=d.postGameRaidUnlocked;if(d.postGameRaidWave!==undefined)postGameRaidWave=d.postGameRaidWave;apply(postGameHero,d.postGameHero);apply(postGameVolcanoHero,d.postGameVolcanoHero);apply(sealedCaveHero,d.sealedCaveHero);
    let target=d.scene||lastFieldScene;
    if(progress.gameCleared){suzumaruActive=true;suzumaruJoined=true;yunoJoined=true;gyouJoinConfirmed=true;gyouJoined=true;syncStoryParty();target='postGameIsland';}

    // If the save is clearly before Gyou's joining chapter, remove any stale
    // joined state left by v0.43/v0.44 migration logic.
    const preGyouScenes=[
      'world','road2','cave','route3','sarubieTown','sarubibiTown',
      'takezoDeparture','takezoTravel','takezoScoutAfter','takezoArrival',
      'takezoRoute','takezoRelief','takezoPlan','takezoCoastSurvey',
      'coastSurveyField','bananaSharkAfter','volcanoSurveyField',
      'takezoVolcanoSurvey','takezoConstruction','secondWaveIntro',
      'secondWaveRetreat','secondWaveTrap','secondWaveVictory'
    ];
    if(preGyouScenes.includes(target)){
      gyouJoinConfirmed=false;
      gyouJoined=false;
    }

    // Dialogue/cutscene checkpoints resume from the nearest safe playable area.
    const safeMap={
      villageDialog:'world',
      departureDialog:'road2',
      sarubieArrival:'sarubieTown',
      sarubieRitual:'route3',
      sarubibiArrival:'sarubibiTown',
      takezoDeparture:'takezoTravel',
      takezoScoutAfter:'takezoTravel',
      takezoArrival:'takezoRoute',
      takezoRelief:'takezoRelief',
      takezoPlan:'takezoPlan',
      takezoCoastSurvey:'takezoCoastSurvey',
      bananaSharkAfter:'bananaSharkAfter',
      takezoVolcanoSurvey:'takezoVolcanoSurvey',
      takezoConstruction:'takezoConstruction',
      secondWaveIntro:'secondWaveIntro',
      secondWaveRetreat:'secondWaveRetreat',
      secondWaveTrap:'secondWaveTrap',
      secondWaveVictory:'secondWaveVictory',
      gyouJoin:'gyouJoin',
      finalPrep:'finalPrep',
      finalPrepFree:'finalPrepFree',
      yunoCombo:'yunoCombo',volcanoBearQuest:'volcanoBearQuest',finalBearField:'finalBearField',volcanoBearAfter:'volcanoBearAfter',finalEve:'finalEve',finalEveFree:'finalEveFree',finalLaunch:'finalLaunch',finalBattleGround:'finalBattleGround',finalBalloon:'finalBalloon',pirateCaptainIntro:'pirateCaptainIntro',pirateCaptainAfter:'pirateCaptainAfter',ending:'ending',dragonIntro:'dragonIntro',postDragonClear:'postDragonClear',
      gyouTraining:'gyouTraining',
      finalWeapon:'finalWeapon',
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
  // Small text was hard to read on phone screens. Enlarge UI text slightly,
  // while keeping big titles essentially unchanged.
  const uiSize=size<=20?Math.ceil(size*1.10):size<=24?Math.ceil(size*1.06):size;
  ctx.font=`${weight} ${uiSize}px system-ui,-apple-system,"Yu Gothic",sans-serif`;
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


function drawGyou(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,18,6,'rgba(23,38,56,.22)');
  // sturdy badger-like villager
  ellipse(-11,-25,6,6,'#756b59');ellipse(11,-25,6,6,'#756b59');
  ellipse(0,-12,18,16,'#8a806c');ellipse(0,-4,10,7,'#d1c5aa');
  ctx.fillStyle='#e7e0cf';ctx.beginPath();ctx.moveTo(-13,-22);ctx.lineTo(-5,-25);ctx.lineTo(-2,-7);ctx.lineTo(-9,-5);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(13,-22);ctx.lineTo(5,-25);ctx.lineTo(2,-7);ctx.lineTo(9,-5);ctx.closePath();ctx.fill();
  rect(-8,-14,4,5,'#172235');rect(4,-14,4,5,'#172235');
  rect(-16,4,32,25,'#172844');rect(-14,5,28,7,'#273c62');rect(-3,10,6,17,'#ef8fb2');
  rect(-18,8,5,17,'#8a806c');rect(13,8,5,17,'#8a806c');
  rect(-13,24,26,4,'#e66f9d');rect(-12,28,9,12,'#14243d');rect(3,28,9,12,'#14243d');
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


function drawPirateCaptainEnemy(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,31,24,7,'rgba(0,0,0,.20)');
  // penguin captain
  ellipse(0,-4,23,28,'#273847');ellipse(0,2,16,21,'#f3eadb');
  ellipse(-8,-10,2.8,3.2,'#111827');ellipse(8,-10,2.8,3.2,'#111827');
  ctx.fillStyle='#d49b42';ctx.beginPath();ctx.moveTo(-5,-2);ctx.lineTo(5,-2);ctx.lineTo(0,4);ctx.closePath();ctx.fill();
  rect(-22,17,44,25,'#e97a2f');rect(-18,20,36,5,'#7a3b2c');rect(-15,42,11,13,'#273847');rect(4,42,11,13,'#273847');
  rect(-25,-29,50,7,'#e97a2f');rect(-16,-38,32,10,'#5c3940');ctx.restore();
}
function drawViceCaptainEnemy(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,31,27,7,'rgba(0,0,0,.20)');
  // polar bear vice captain
  ellipse(0,-5,25,25,'#f1eee3');ellipse(-17,-23,8,8,'#eee9dc');ellipse(17,-23,8,8,'#eee9dc');
  ellipse(-8,-9,3,3.5,'#111827');ellipse(8,-9,3,3.5,'#111827');ellipse(0,0,8,6,'#cfc5b3');rect(-2,-1,4,3,'#222831');
  rect(-24,17,48,27,'#e97a2f');rect(-20,20,40,6,'#723d2f');rect(-16,44,12,14,'#3b4249');rect(4,44,12,14,'#3b4249');
  // thick headband and large axe
  rect(-24,-31,48,7,'#e97a2f');rect(27,-2,6,55,'#6d4b35');ctx.fillStyle='#59616a';ctx.beginPath();ctx.moveTo(29,-5);ctx.lineTo(55,-15);ctx.lineTo(57,5);ctx.lineTo(31,12);ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawCyborgKlaus(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,34,27,7,'rgba(0,0,0,.23)');
  ellipse(0,-7,23,24,'#a77a5e');
  // metal half-face
  ctx.fillStyle='#818d98';ctx.beginPath();ctx.moveTo(0,-31);ctx.arc(0,-7,23,-Math.PI/2,Math.PI/2);ctx.lineTo(0,17);ctx.closePath();ctx.fill();
  ellipse(-8,-11,3,3,'#111827');ellipse(9,-11,4,4,'#ef3e32');rect(5,-12,8,2,'#ffb0a8');
  rect(-24,16,48,30,'#515d68');rect(-18,20,36,6,'#e8782d');
  rect(-17,46,12,15,'#343d46');rect(5,46,12,15,'#343d46');
  // machine gun arm
  rect(21,19,38,10,'#28323a');rect(53,21,26,6,'#171d22');rect(28,28,7,12,'#2a3238');
  text('CYBORG',0,35,8,'center','#d5e0e8',900);ctx.restore();
}

function drawAbyssDragon(x,y,s=1,white=false){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,30,30,7,'rgba(0,0,0,.25)');
  const c=white?'#eef4f7':'#202633', c2=white?'#b9d4df':'#414a5a';
  ellipse(0,0,27,25,c);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-18,-16);ctx.lineTo(-8,-42);ctx.lineTo(0,-20);ctx.lineTo(10,-43);ctx.lineTo(19,-15);ctx.fill();
  ellipse(-9,-5,3,3,white?'#375d78':'#e04a45');ellipse(9,-5,3,3,white?'#375d78':'#e04a45');
  ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(-22,3);ctx.lineTo(-50,-12);ctx.lineTo(-35,22);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(22,3);ctx.lineTo(50,-12);ctx.lineTo(35,22);ctx.closePath();ctx.fill();ctx.restore();
}

function drawAbyssDragonVariant(x,y,s=1,metal='gold'){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,30,30,7,'rgba(0,0,0,.25)');
  const gold=metal==='gold',c=gold?'#d6ad38':'#c7d0d8',c2=gold?'#8f681d':'#7b8792',eye=gold?'#fff0a0':'#dff7ff';
  ellipse(0,0,27,25,c);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(-18,-16);ctx.lineTo(-8,-42);ctx.lineTo(0,-20);ctx.lineTo(10,-43);ctx.lineTo(19,-15);ctx.fill();
  ellipse(-9,-5,3,3,eye);ellipse(9,-5,3,3,eye);
  ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(-22,3);ctx.lineTo(-50,-12);ctx.lineTo(-35,22);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(22,3);ctx.lineTo(50,-12);ctx.lineTo(35,22);ctx.closePath();ctx.fill();ctx.restore();
}

function drawSealedMetalDragonBattle(metal='gold'){
  const gold=metal==='gold',body=gold?'#d6ad38':'#c7d0d8',chest=gold?'#f0cf67':'#e4e9ed',wing=gold?'#8f681d':'#7b8792',edge=gold?'#5f4212':'#4f5962',horn=gold?'#fff0a0':'#f4fbff',eye=gold?'#fff3a8':'#dff7ff',label=gold?'#6d4b0e':'#40505e';
  ctx.save();ctx.translate(735,250);ellipse(0,92,118,17,'rgba(0,0,0,.25)');
  ctx.strokeStyle=body;ctx.lineWidth=24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-55,35);ctx.bezierCurveTo(-130,55,-150,5,-185,18);ctx.stroke();
  ellipse(-18,20,78,57,body);ellipse(8,35,43,43,chest);
  ctx.fillStyle=wing;ctx.strokeStyle=edge;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-45,-8);ctx.lineTo(-132,-105);ctx.lineTo(-118,5);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(30,-8);ctx.lineTo(118,-100);ctx.lineTo(102,8);ctx.closePath();ctx.fill();
  ctx.strokeStyle=body;ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(20,-5);ctx.quadraticCurveTo(48,-68,78,-78);ctx.stroke();
  ellipse(86,-83,36,27,body);ellipse(103,-72,22,14,chest);
  ctx.fillStyle=horn;ctx.beginPath();ctx.moveTo(65,-98);ctx.lineTo(68,-126);ctx.lineTo(80,-99);ctx.fill();ctx.beginPath();ctx.moveTo(91,-104);ctx.lineTo(103,-130);ctx.lineTo(106,-98);ctx.fill();
  ellipse(78,-88,5,5,eye);ellipse(101,-83,4,4,eye);
  for(const [lx,ly] of [[-55,55],[-12,62],[35,55],[65,46]]){rect(lx,ly,20,58,body);}
  text(`${battle.enemyName} ${Math.max(0,battle.enemyHP)}/${battle.enemyMaxHP}`,0,-145,18,'center',label,900);ctx.restore();
}

function drawSealedAncientDragonBattle(white=false){
  const body=white?'#e8eef2':'#202633', chest=white?'#c7d8e2':'#3a4352';
  const wing=white?'#c7d1d8':'#151b26', edge=white?'#8296a3':'#090d14';
  const neck=white?'#e8eef2':'#202633', head=white?'#f2f5f7':'#252c39';
  const muzzle=white?'#d7e2e8':'#353e4d', leg=white?'#bac8d0':'#171d27';
  const spike=white?'#9fc4d5':'#596778', horn=white?'#d6edf5':'#aeb9c7';
  const eye=white?'#3e79a1':'#ef3e32', label=white?'#34566d':'#dfe8f0';
  ctx.save();ctx.translate(735,250);
  ellipse(0,92,118,17,'rgba(0,0,0,.25)');
  ctx.strokeStyle=body;ctx.lineWidth=24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-55,35);ctx.bezierCurveTo(-130,55,-150,5,-185,18);ctx.stroke();
  ellipse(-18,20,78,57,body);ellipse(8,35,43,43,chest);
  ctx.fillStyle=wing;ctx.strokeStyle=edge;ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-45,-8);ctx.lineTo(-132,-105);ctx.lineTo(-118,-22);ctx.lineTo(-175,-54);ctx.lineTo(-105,32);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(12,-12);ctx.lineTo(65,-112);ctx.lineTo(82,-30);ctx.lineTo(137,-72);ctx.lineTo(72,28);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=neck;ctx.lineWidth=34;ctx.beginPath();ctx.moveTo(35,0);ctx.lineTo(72,-50);ctx.stroke();
  ellipse(88,-65,42,31,head);ellipse(119,-57,35,20,muzzle);
  ctx.fillStyle=horn;ctx.beginPath();ctx.moveTo(70,-86);ctx.lineTo(55,-122);ctx.lineTo(82,-92);ctx.fill();
  ctx.beginPath();ctx.moveTo(91,-91);ctx.lineTo(91,-128);ctx.lineTo(104,-91);ctx.fill();
  ellipse(99,-72,5,5,eye);ellipse(132,-61,3,3,white?'#53636e':'#06080d');
  ctx.fillStyle='#f5eee1';ctx.beginPath();ctx.moveTo(124,-43);ctx.lineTo(132,-31);ctx.lineTo(138,-44);ctx.fill();
  for(const [x,y] of [[-58,55],[-12,62],[35,55],[65,46]]){rect(x,y,20,58,leg);for(let c=0;c<3;c++){ctx.fillStyle=horn;ctx.beginPath();ctx.moveTo(x+c*7,y+58);ctx.lineTo(x+c*7+5,y+67);ctx.lineTo(x+c*7+8,y+58);ctx.fill();}}
  for(let x=-70;x<35;x+=24){ctx.fillStyle=spike;ctx.beginPath();ctx.moveTo(x,-28);ctx.lineTo(x+10,-51);ctx.lineTo(x+20,-25);ctx.fill();}
  text(`${battle.enemyName} ${Math.max(0,battle.enemyHP)}/${battle.enemyMaxHP}`,0,-145,18,'center',label,900);
  ctx.restore();
}
function drawYamataNoOrochi(x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,45,88,14,'rgba(0,0,0,.3)');
 const heads=[
   [-92,-28,-0.72],[-68,-68,-0.42],[-42,-40,0.22],[-20,-88,-0.18],
   [8,-58,0.48],[32,-96,0.18],[55,-48,-0.35],[78,-78,0.58],[100,-22,0.82]
 ];
 heads.forEach(([hx,hy,ang],i)=>{
   const sx=(i-4)*7;
   ctx.strokeStyle=i%2?'#3c624f':'#36594a';ctx.lineWidth=17;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(sx,30);
   ctx.bezierCurveTo(sx*1.4,-2,hx*.58,hy+34,hx,hy);
   ctx.stroke();
   ctx.save();ctx.translate(hx,hy);ctx.rotate(ang);
   ellipse(0,0,15,11,i%2?'#4c775e':'#456d58');
   ctx.fillStyle=i%2?'#4c775e':'#456d58';ctx.beginPath();ctx.moveTo(-12,-4);ctx.lineTo(-21,-12);ctx.lineTo(-15,2);ctx.fill();ctx.beginPath();ctx.moveTo(12,-4);ctx.lineTo(21,-12);ctx.lineTo(15,2);ctx.fill();
   ellipse(-5,-2,2.2,2.2,'#f0d75a');ellipse(5,-2,2.2,2.2,'#f0d75a');
   rect(-3,5,6,2,'#263b32');
   ctx.restore();
 });
 ellipse(0,30,60,37,'#36594a');ctx.restore();
}
function drawWildMonster(mon){
  if(mon&&mon.kind==='blackDragon'){drawAbyssDragon(mon.x,mon.y,1.2,false);return;}
  if(mon&&mon.kind==='whiteDragon'){drawAbyssDragon(mon.x,mon.y,1.2,true);return;}
  if(mon&&mon.kind==='yamataOrochi'){drawYamataNoOrochi(mon.x,mon.y,.8);return;}
  if(mon && mon.kind==='pirateCaptain'){drawPirateCaptainEnemy(mon.x,mon.y,1.25);return;}
  if(mon && mon.kind==='viceCaptain'){drawViceCaptainEnemy(mon.x,mon.y,1.22);return;}
  if(mon && mon.kind==='cyborgKlaus'){drawCyborgKlaus(mon.x,mon.y,1.25);return;}
  if(mon && ['bananaShark','sweetBoar','durianBear'].includes(mon.kind)){
    drawSurveyMonster(mon);return;
  }
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
  text('りすぺく島RPG',480,75,53,'center','#fff',800);text('Ver.1.31',480,121,18,'center','#eef8ff');
  text('♪ BGM：Mキー　効果音：Nキー　ON / OFF',480,145,12,'center','#d9edf5');
  const canContinue=hasSaveGame(),cleared=!!progress.gameCleared;
  const labels=['はじめから','初期状態からスタート',canContinue?'つづきから':'つづきから（セーブなし）'];
  if(cleared)labels.push(progress.postDragonDefeated?'ドラゴンに挑戦（再戦）':'ドラゴンに挑戦');
  const gap=50,startY=cleared?300:326;
  labels.forEach((lab,i)=>{
    const yy=startY+i*gap;
    outlineRect(280,yy,400,42,titleSelection===i?'#e8f7fb':'rgba(15,35,60,.78)',i===2&&!canContinue?'#566879':(i===3?'#d8893b':'#73b9d6'),2);
    text(lab,480,yy+21,i===2&&!canContinue?16:18,'center',i===2&&!canContinue?'#8193a2':(titleSelection===i?'#17324a':'#e8f4fa'));
  });
  if(progress.ngPlusUnlocked){
    const yy=startY;
    outlineRect(690,yy+4,165,34,titleSelection===4?'#fff0c8':'rgba(74,37,72,.88)','#d29ad0',2);
    text('はじめから＋',772,yy+21,14,'center',titleSelection===4?'#572b55':'#ffe9ff',900);
  }
}
function speakerName(who){
  return ({narrator:'語り',dash:'ダッシュミウ',pirate:'クラウス海賊団',elder:'ぶりふぉ村長',takezoElder:'たけぞ村長',hero:heroName,suzu:'スズマル',yuno:'ユーノ',gyou:'ジュウ',captain:'防衛隊長',pirateCaptainDialog:'船長',vice:'副船長',klaus:'クラウス',cyborgKlaus:'クラウス',lover:'防衛隊長の恋人',smith:'さるびえ村の鍛冶職人',dragonVoice:'？？？'})[who]||who;
}
function drawDialog(who,line){
  ctx.fillStyle='rgba(7,17,36,.92)';ctx.fillRect(46,380,868,132);
  ctx.strokeStyle='#d5ecf6';ctx.lineWidth=3;ctx.strokeRect(47.5,381.5,865,129);
  ctx.strokeStyle='#6db8d1';ctx.lineWidth=1;ctx.strokeRect(54.5,388.5,851,115);
  const n=speakerName(who);
  if(n){ctx.fillStyle='#eaf7fb';ctx.fillRect(72,363,208,37);ctx.strokeStyle='#6db8d1';ctx.strokeRect(72.5,363.5,207,36);text(n,88,382,18,'left','#19324b');}
  wrapText(line,78,420,805,30,24);text('▼',875,486,18,'center','#d9ecff');
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
    // 派手なサーカス団の船：赤白ボーダー＋金装飾＋三角旗
    rect(195,202,205,72,'#f5e7c8');
    for(let x=195;x<400;x+=34)rect(x,202,17,72,'#d84c4c');
    ctx.strokeStyle='#e7b84e';ctx.lineWidth=5;ctx.strokeRect(197,204,201,68);
    rect(265,100,8,108,'#f1e1b5');
    ctx.fillStyle='#7b2f72';ctx.beginPath();ctx.moveTo(273,108);ctx.lineTo(380,162);ctx.lineTo(273,186);ctx.closePath();ctx.fill();
    for(let x=212;x<=380;x+=28){ctx.fillStyle=(x/28)%2?'#f0c94f':'#52b9d0';ctx.beginPath();ctx.moveTo(x,194);ctx.lineTo(x+10,208);ctx.lineTo(x+20,194);ctx.fill();}
    outlineRect(224,218,148,31,'#fff3c9','#9d4b45',2);text('ちぇすたぴサーカス団',298,234,14,'center','#9b3044',900);
    ellipse(211,213,8,8,'#f0c94f');ellipse(386,213,8,8,'#f0c94f');
    rect(690,235,145,50,'#4e3025');rect(730,153,7,88,'#d0d5df');ctx.fillStyle='#e87a2f';ctx.beginPath();ctx.moveTo(737,158);ctx.lineTo(811,195);ctx.lineTo(737,213);ctx.closePath();ctx.fill();
  }else if(i<=8){
    ctx.fillStyle='#101936';ctx.fillRect(0,0,W,H);for(let a=0;a<60;a++)rect((a*137)%W,(a*79)%250,2,2,'#d5e7ff');
    rect(0,340,W,200,'#21483f');
    rect(100,262,300,84,'#f5e7c8');for(let x=100;x<400;x+=42)rect(x,262,21,84,'#d84c4c');
    ctx.strokeStyle='#e7b84e';ctx.lineWidth=5;ctx.strokeRect(102,264,296,80);
    outlineRect(160,283,180,35,'#fff3c9','#9d4b45',2);text('ちぇすたぴサーカス団',250,301,15,'center','#9b3044',900);
    for(let x=120;x<390;x+=34){ctx.fillStyle=(x%68)?'#52b9d0':'#f0c94f';ctx.beginPath();ctx.moveTo(x,255);ctx.lineTo(x+11,269);ctx.lineTo(x+22,255);ctx.fill();}
    text('ちぇすたぴ号',250,330,14,'center','#653c38');
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

function startFinalBearBattle(){
  syncStoryParty();
  const ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    gyouHP:gs.maxHP,gyouMaxHP:gs.maxHP,gyouMP:gs.maxMP,gyouMaxMP:gs.maxMP,
    regenTurns:0,hasteTarget:null,hasteTurns:0,hasteUsed:false,
    evadeTarget:null,evadeTurns:0,evadeAllTurns:0,
    gyouDefTurns:0,gyouTauntTurns:0,gyouCover:null,
    gyouManaGuard:false,gyouCounter:false,gyouGrandGuard:false,
    skipYunoThisRound:false,
    enemyHP:130,enemyMaxHP:130,
    enemyName:'大ドリアングマA',enemyKind:finalBear.kind,
    monsterId:finalBear.id,turn:'player',defending:false,
    enemies:[
      {name:`大ドリアングマ${finalBearWave*3+1}`,kind:'durianBear',hp:145,maxHP:145},
      {name:`大ドリアングマ${finalBearWave*3+2}`,kind:'durianBear',hp:140,maxHP:140},
      {name:`大ドリアングマ${finalBearWave*3+3}`,kind:'durianBear',hp:150,maxHP:150}
    ]
  };
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage=`大ドリアングマ3体が襲来！ 第${finalBearWave+1}波！`;
  scene='battle';touchUI.classList.add('hidden');
}

function startPirateCaptainBattle(){
  const over=Math.max(0,(progress.level||1)-10);
  // 本編ラスボスを少し強化。クリア後・はじめから＋の船長戦には影響しない。
  const hp=800+Math.min(520,over*42);
  const viceHP=Math.floor(hp*.78);
  battle={heroHP:progress.maxHP,heroMP:progress.maxMP,enemyHP:viceHP,enemyMaxHP:viceHP,
    enemyName:'副船長',enemyKind:'viceCaptain',monsterId:900,turn:'player',defending:false,bossPhase:1,bossTurn:0,
    enemies:[
      {name:'副船長',kind:'viceCaptain',hp:viceHP,maxHP:viceHP},
      {name:'海賊船長',kind:'pirateCaptain',hp:hp,maxHP:hp,potions:2}
    ]};
  const ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();
  Object.assign(battle,{suzuMaxHP:ss.maxHP,suzuHP:ss.maxHP,suzuMaxMP:ss.maxMP,suzuMP:ss.maxMP,
    yunoMaxHP:ys.maxHP,yunoHP:ys.maxHP,yunoMaxMP:ys.maxMP,yunoMP:ys.maxMP,
    gyouMaxHP:gs.maxHP,gyouHP:gs.maxHP,gyouMaxMP:gs.maxMP,gyouMP:gs.maxMP});
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage='海賊船長との最終決戦！';scene='battle';touchUI.classList.add('hidden');saveGame();
}
function startBattle(mon){
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    enemyHP:mon.hp,enemyMaxHP:mon.maxHP,
    enemyName:mon.name,enemyKind:mon.kind,
    monsterId:mon.id,turn:'player',defending:false
  };
  battleMessage=`${mon.name}が現れた！`;
  sfx('boss');
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
  if(type==='slash')sfx('slash');
  else if(type==='ice')sfx('ice');
  else if(type==='fire')sfx('fire');
  else if(type==='heal')sfx('heal');
  else if(type==='hitHero'||type==='hitSuzu'||type==='hitYuno'||type==='hitGyou')sfx('hit');
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

function ensureGyouBattle(){
  if(!battle || !gyouJoinConfirmed)return;
  const gs=gyouStats();
  if(battle.gyouMaxHP===undefined){battle.gyouMaxHP=gs.maxHP;battle.gyouHP=gs.maxHP;}
  if(battle.gyouMaxMP===undefined){battle.gyouMaxMP=gs.maxMP;battle.gyouMP=gs.maxMP;}
  if(battle.gyouDefTurns===undefined)battle.gyouDefTurns=0;
  if(battle.gyouTauntTurns===undefined)battle.gyouTauntTurns=0;
  if(battle.gyouCover===undefined)battle.gyouCover=null;
  if(battle.gyouManaGuard===undefined)battle.gyouManaGuard=false;
  if(battle.gyouCounter===undefined)battle.gyouCounter=false;
  if(battle.gyouGrandGuard===undefined)battle.gyouGrandGuard=false;
}

function partyTargetList(){
  const a=[{key:'hero',name:heroName}];
  if(battle&&battle.soloHero)return a;
  if(suzumaruActive)a.push({key:'suzu',name:'スズマル'});
  if(yunoJoined && battle && battle.monsterId>=400)a.push({key:'yuno',name:'ユーノ'});
  if(gyouJoinConfirmed && battle && battle.monsterId>=400)a.push({key:'gyou',name:'ジュウ'});
  return a;
}
function partyTargetName(k){return k==='hero'?heroName:k==='suzu'?'スズマル':k==='yuno'?'ユーノ':'ジュウ';}
function partyHPKey(k){return k==='hero'?'heroHP':k==='suzu'?'suzuHP':k==='yuno'?'yunoHP':'gyouHP';}
function partyMaxHP(k){return k==='hero'?heroStats().maxHP:k==='suzu'?battle.suzuMaxHP:k==='yuno'?battle.yunoMaxHP:battle.gyouMaxHP;}
function partyMPKey(k){return k==='hero'?'heroMP':k==='suzu'?'suzuMP':k==='yuno'?'yunoMP':'gyouMP';}
function partyMaxMP(k){return k==='hero'?heroStats().maxMP:k==='suzu'?battle.suzuMaxMP:k==='yuno'?battle.yunoMaxMP:battle.gyouMaxMP;}
function openPartyTarget(actor,skill,label){
  battlePendingTarget={actor,skill,label};
  battleMenu='target';
  battleMessage=`${label}：対象を選んでください`;
}
function cancelPartyTarget(){battlePendingTarget=null;battleMenu='skill';}
function resolvePartyTarget(target){
  if(!battlePendingTarget)return;
  const p=battlePendingTarget;battlePendingTarget=null;battleMenu='skill';
  if(p.actor==='hero')battleAttack(p.skill,target);
  else if(p.actor==='yuno')yunoAction(p.skill,target);
  else if(p.actor==='gyou')gyouAction(p.skill,target);
}

function isGyouTurn(){
  return !!(battle && !battle.soloHero && gyouJoinConfirmed && battle.monsterId>=400 && battleActor==='gyou');
}

function isPartyBattle(){
  return !!(battle && !battle.soloHero && suzumaruActive && (battle.monsterId===99 || battle.monsterId>=200));
}
function isSuzumaruTurn(){ return !!(isPartyBattle() && battleActor==='suzu'); }
function isYunoTurn(){ return !!(battle && !battle.soloHero && yunoJoined && battle.monsterId>=400 && battleActor==='yuno'); }
function partyActorHP(actor){
  if(!battle)return 0;
  return actor==='hero'?battle.heroHP:actor==='suzu'?battle.suzuHP:actor==='yuno'?battle.yunoHP:battle.gyouHP;
}
function isPartyActorConscious(actor){return (partyActorHP(actor)||0)>0;}
function activePartyKeys(){return partyMembers().map(m=>m.key);}
function partyWipedOut(){const a=activePartyKeys();return a.length>0&&a.every(k=>!isPartyActorConscious(k));}
function checkPartyWipe(){
  if(!battle||!partyWipedOut())return false;
  battle.turn='lose';battleCooldown=1.6;battleMenu='main';battleMessage='全員が気絶した……。';return true;
}
function reviveNote(name,before,after){return before<=0&&after>0?` ${name}は立ち上がった！`:'';}
function advancePartyTurn(){
  battleMenu='main';
  if(battle&&battle.soloHero){
    battleActor='hero';
    beginEnemyTurn();
    return;
  }
  if((battle.partyDoubleActions||0)>0){
    battle.partyDoubleUsed=battle.partyDoubleUsed||{};
    if(!battle.partyDoubleUsed[battleActor]){battle.partyDoubleUsed[battleActor]=true;battleMessage+='　天風の祝福でもう1回！';return;}
    battle.partyDoubleUsed[battleActor]=false;
    if(battleActor==='gyou')battle.partyDoubleActions=Math.max(0,battle.partyDoubleActions-1);
  }
  if(battle.hasteTarget===battleActor && battle.hasteTurns>0 && !battle.hasteUsed){
    battle.hasteUsed=true;battleMessage+='　疾風でもう1回！';return;
  }
  if(battle.hasteTarget===battleActor && battle.hasteUsed){
    battle.hasteUsed=false;battle.hasteTurns--;
    if(battle.hasteTurns<=0)battle.hasteTarget=null;
  }
  if(battleActor==='hero' && suzumaruActive){
    battleActor='suzu';
    if(!isPartyActorConscious('suzu'))return advancePartyTurn();
    if(progress.shopBought?.suzuGloves)battle.suzuGloveStacks=(battle.suzuGloveStacks||0)+1;
    if((progress.suzuSkills?.fightingFlame||0)>0)battle.suzuFightingFlameStacks=(battle.suzuFightingFlameStacks||0)+1;
    return;
  }
  if(battleActor==='suzu' && yunoJoined && battle.monsterId>=400){
    if(battle.skipYunoThisRound){
      battle.skipYunoThisRound=false;
      if(gyouJoinConfirmed){ensureGyouBattle();battleActor='gyou';if(!isPartyActorConscious('gyou')){beginEnemyTurn();return;}{const r=gyouPassiveHP();if(r>0)battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+r);}return;}
      beginEnemyTurn();return;
    }
    battleActor='yuno';
    if(!isPartyActorConscious('yuno'))return advancePartyTurn();
    battle.yunoHiddenUsedThisTurn=false;
    {const r=yunoPassiveMP();if(r>0){const before=battle.yunoMP;battle.yunoMP=Math.min(battle.yunoMaxMP,battle.yunoMP+r);const got=battle.yunoMP-before;if(got>0)battleMessage+=`　風脈の息吹 MP+${got}`;}}
    return;
  }
  if(battleActor==='yuno' && gyouJoinConfirmed && battle.monsterId>=400){
    ensureGyouBattle();battleActor='gyou';
    if(!isPartyActorConscious('gyou')){beginEnemyTurn();return;}
    {const r=gyouPassiveHP();if(r>0)battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+r);}
    return;
  }
  beginEnemyTurn();
}
function heroHiddenBattleRect(){
  if(battle&&battle.monsterId===1290)return {x:40,y:438,w:270,h:44};
  return {x:555,y:478,w:365,h:52};
}
function pointInRect(px,py,r){return px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h;}
function drawBattle(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#9cd8ef');g.addColorStop(1,'#b9dc8c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(battle.monsterId===1290){
    const py=(window.innerHeight||540)<500?285:270;
    drawHeroFox(170,py,1.34);drawDashmiu(285,py+5,1.18);
  }else if(!battle.soloHero && (battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    const py=(window.innerHeight||540)<500?285:270;
    drawHeroFox(135,py,1.20);
    drawSuzumaru(245,py+3,1.30);
    if(yunoJoined && battle.monsterId>=400)drawYuno(350,py+3,1.24);
    if(!battle.soloHero && gyouJoinConfirmed && battle.monsterId>=400){ensureGyouBattle();drawGyou(455,py+3,1.24);}
  }else{
    drawHeroFox(250,260,2.0);
  }
  if(battle.monsterId===99){
    drawCaveBoss(700,245,1.75);
  }else if(battle.monsterId===900){
    const vice=battle.enemies&&battle.enemies[0], cap=battle.enemies&&battle.enemies[1];
    // 副船長：シロクマ。太いヘアバンド＋大斧。
    if(vice&&vice.hp>0){ctx.save();ctx.translate(650,245);ellipse(0,72,48,11,'rgba(0,0,0,.22)');ellipse(0,-18,32,30,'#f2f3ed');ellipse(-25,-34,11,11,'#e7e9e4');ellipse(25,-34,11,11,'#e7e9e4');ellipse(0,-11,16,12,'#d9ddd8');ellipse(0,-8,5,4,'#34383c');rect(-34,-39,68,13,'#c94848');rect(-34,8,68,72,'#d97832');ctx.strokeStyle='#d4d7d8';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(40,-5);ctx.lineTo(72,75);ctx.stroke();ctx.fillStyle='#9ba2a5';ctx.beginPath();ctx.moveTo(58,-8);ctx.lineTo(92,8);ctx.lineTo(76,38);ctx.lineTo(45,20);ctx.closePath();ctx.fill();text(`副船長 ${vice.hp}/${vice.maxHP}`,0,-78,16,'center','#5b2020',900);ctx.restore();}
    // 船長：ペンギン。後方指揮型で自分用の回復薬を持つ。
    if(cap&&cap.hp>0){ctx.save();ctx.translate(785,240);ellipse(0,72,44,11,'rgba(0,0,0,.22)');ellipse(0,-18,30,31,'#202b39');ellipse(0,-13,20,23,'#f4f4eb');ctx.fillStyle='#e2a53a';ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(9,-9);ctx.lineTo(1,0);ctx.closePath();ctx.fill();rect(-34,8,68,72,'#d97832');ctx.fillStyle='#243245';ctx.beginPath();ctx.moveTo(-48,-40);ctx.lineTo(48,-40);ctx.lineTo(28,-60);ctx.lineTo(-26,-60);ctx.closePath();ctx.fill();ctx.strokeStyle='#d8dce1';ctx.lineWidth=7;ctx.beginPath();ctx.arc(48,25,38,-1.1,1.1);ctx.stroke();text(`海賊船長 ${cap.hp}/${cap.maxHP}`,0,-82,16,'center','#5b2020',900);ctx.restore();}
  }else if(battle.monsterId===950){
    ctx.save();ctx.translate(735,250);
    ellipse(0,92,118,17,'rgba(0,0,0,.25)');
    // long tail
    ctx.strokeStyle='#7b2e29';ctx.lineWidth=24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-55,35);ctx.bezierCurveTo(-130,55,-150,5,-185,18);ctx.stroke();
    // large body and chest
    ellipse(-18,20,78,57,'#9d3d32');ellipse(8,35,43,43,'#c66b3e');
    // wings with visible membranes
    ctx.fillStyle='#71302f';ctx.strokeStyle='#4f2729';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(-45,-8);ctx.lineTo(-132,-105);ctx.lineTo(-118,-22);ctx.lineTo(-175,-54);ctx.lineTo(-105,32);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(12,-12);ctx.lineTo(65,-112);ctx.lineTo(82,-30);ctx.lineTo(137,-72);ctx.lineTo(72,28);ctx.closePath();ctx.fill();ctx.stroke();
    // neck and unmistakable dragon head / muzzle
    ctx.strokeStyle='#9d3d32';ctx.lineWidth=34;ctx.beginPath();ctx.moveTo(35,0);ctx.lineTo(72,-50);ctx.stroke();
    ellipse(88,-65,42,31,'#a94435');ellipse(119,-57,35,20,'#b85439');
    // horns
    ctx.fillStyle='#e1c18a';ctx.beginPath();ctx.moveTo(70,-86);ctx.lineTo(55,-122);ctx.lineTo(82,-92);ctx.fill();
    ctx.beginPath();ctx.moveTo(91,-91);ctx.lineTo(91,-128);ctx.lineTo(104,-91);ctx.fill();
    // eye, nostrils, teeth
    ellipse(99,-72,5,5,'#ffd65a');ellipse(132,-61,3,3,'#3a2020');
    ctx.fillStyle='#f5eee1';ctx.beginPath();ctx.moveTo(124,-43);ctx.lineTo(132,-31);ctx.lineTo(138,-44);ctx.fill();
    // four legs and claws
    for(const [x,y] of [[-58,55],[-12,62],[35,55],[65,46]]){rect(x,y,20,58,'#7f302b');for(let c=0;c<3;c++){ctx.fillStyle='#e5d2ad';ctx.beginPath();ctx.moveTo(x+c*7,y+58);ctx.lineTo(x+c*7+5,y+67);ctx.lineTo(x+c*7+8,y+58);ctx.fill();}}
    // dorsal spikes
    for(let x=-70;x<35;x+=24){ctx.fillStyle='#d68a4c';ctx.beginPath();ctx.moveTo(x,-28);ctx.lineTo(x+10,-51);ctx.lineTo(x+20,-25);ctx.fill();}
    text(`火山の古竜 ${battle.enemyHP}/${battle.enemyMaxHP}`,0,-145,18,'center','#6b241e',900);ctx.restore();
  }else if(battle.enemyKind==='blackDragon'||battle.enemyKind==='whiteDragon'){
    if(progress.fourAbyssUnlocked)drawSealedMetalDragonBattle(battle.enemyKind==='blackDragon'?'gold':'silver');
    else drawSealedAncientDragonBattle(battle.enemyKind==='whiteDragon');
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
  partyRows.push({name:heroName,hp:battle.heroHP,maxHP:heroStats().maxHP,mp:battle.heroMP,maxMP:heroStats().maxMP});
  if(!battle.soloHero && (battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){
    partyRows.push({name:'スズマル',hp:battle.suzuHP,maxHP:battle.suzuMaxHP,mp:battle.suzuMP,maxMP:battle.suzuMaxMP});
  }
  if(!battle.soloHero && yunoJoined && battle.monsterId>=400){
    partyRows.push({name:'ユーノ',hp:battle.yunoHP,maxHP:battle.yunoMaxHP,mp:battle.yunoMP,maxMP:battle.yunoMaxMP});
  }
  if(!battle.soloHero && gyouJoinConfirmed && battle.monsterId>=400){
    ensureGyouBattle();
    partyRows.push({name:'ジュウ',hp:battle.gyouHP,maxHP:battle.gyouMaxHP,mp:battle.gyouMP,maxMP:battle.gyouMaxMP});
  }

  const rosterX=32, rosterY=bt, rosterW=370;
  const rowH=29;
  const rosterH=10+partyRows.length*rowH;
  ctx.fillStyle='rgba(14,30,55,.92)';
  ctx.fillRect(rosterX,rosterY,rosterW,rosterH);

  partyRows.forEach((m,i)=>{
    const y=rosterY+20+i*rowH;
    text(m.name,rosterX+14,y,18,'left','#ffffff',900);
    text(`HP ${m.hp}/${m.maxHP}${m.hp<=0?'  気絶':''}`,rosterX+122,y,16,'left',m.hp<=0?'#ffb1b1':'#ffffff',800);
    text(`MP ${m.mp}/${m.maxMP}`,rosterX+252,y,16,'left','#ffffff',800);
  });

  // 複数敵では「敵グループ 残り○体」のパネルを出さず、各敵の名前とHPだけで確認できるようにする。
  if(!battle.enemies){
    ctx.fillStyle='rgba(255,255,255,.88)';
    ctx.fillRect(650,bt,265,72);
    text(battle.enemyName,670,bt+28,19,'left','#243245',800);
    text(`HP ${Math.max(0,battle.enemyHP)}/${battle.enemyMaxHP}`,670,bt+55,17,'left','#52606f',800);
  }
  // battle phase
  if(battle.turn==='lose'){
    text('全員が気絶した……',480,300,22,'center','#ffb1a4',900);
  }else if(battle.turn==='enemy'){
    text('敵が攻撃してくる！',480,300,20,'center','#ffb1a4');
  }else if(battle.turn==='enemyResult'){
    text('敵の攻撃',480,300,20,'center','#ff9d91');
  }else if(battle.turn==='player'){
    const who=isGyouTurn()?'ジュウ':isYunoTurn()?'ユーノ':isSuzumaruTurn()?'スズマル':heroName;
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
  const cmdY=((window.innerHeight||540)<500)?338:365;
  ctx.fillStyle='rgba(9,20,42,.92)';ctx.fillRect(50,cmdY,860,140);
  if(battle.turn==='player'){
    if(battleMenu==='target'){
      text(`${battlePendingTarget?.label||'スキル'}：対象を選択`,480,366,20,'center','#ffffff',800);
      const ts=partyTargetList(),w=Math.min(190,760/Math.max(1,ts.length)),gap=10,total=ts.length*w+(ts.length-1)*gap,sx=(W-total)/2;
      ts.forEach((t,i)=>{
        const x=sx+i*(w+gap);
        outlineRect(x,392,w,58,'#e8f4fb','#71bad7',2);
        text(t.name,x+w/2,413,18,'center','#17324a',800);
        const hpK=partyHPKey(t.key),mpK=partyMPKey(t.key);
        text(`HP ${battle[hpK]??'-'} / MP ${battle[mpK]??'-'}`,x+w/2,436,13,'center','#35556b');
      });
      outlineRect(365,458,230,38,'#dff4fb','#71bad7',2);text('もどる',480,477,19,'center','#17324a',800);
    }else if(battleMenu==='main'){
      const by=((window.innerHeight||540)<500)?354:388;
      outlineRect(70,by,180,48,'#dff4fb','#71bad7',2);text('こうげき',160,by+24,23,'center','#17324a');
      outlineRect(270,by,180,48,'#dff4fb','#71bad7',2);text('スキル',360,by+24,23,'center','#17324a');
      outlineRect(470,by,180,48,'#dff4fb','#71bad7',2);text('ぼうぎょ',560,by+24,23,'center','#17324a');
      if(battle.monsterId>=960&&battle.monsterId<=963){
        outlineRect(670,by,180,48,'#39495a','#647688',2);text('逃走不可',760,by+24,17,'center','#a9b6c0');
      }else{
        outlineRect(670,by,180,48,'#dff4fb','#71bad7',2);text('にげる',760,by+24,23,'center','#17324a');
      }
      const actorName=isGyouTurn()?'ジュウ':isYunoTurn()?'ユーノ':isSuzumaruTurn()?'スズマル':heroName;
      text(`${actorName}の行動`,480,by+78,18,'center','#c8e7f4');
    }else{
      if(isGyouTurn()){
        text('ジュウのスキル',480,366,19,'center','#f4efcf',800);
        const opts=[
          ['fortify','岩守り','(5)'],['cover','かばう','(5)'],['taunt','挑発','(4)'],['manaGuard','土脈吸収','(4)'],
          ['healGuard','守りの呼吸','(7)'],['doubleThrust','二段突き','(6)'],['counter','迎撃の構え','(7)'],['grandGuard','大守護','(16)']
        ];
        opts.forEach((o,i)=>{
          const x=28+i*114,learned=o[0]==='grandGuard'?!!progress.gyouGrandGuard:!!progress.gyouSkills[o[0]];
          outlineRect(x,385,106,54,learned?'#ece8ce':'#53554f',learned?'#999064':'#777970',2);
          text(learned?o[1]:`${o[1]} 未`,x+53,405,learned?17:15,'center',learned?'#494427':'#ffffff',800);
          text(learned?o[2]:'未習得',x+53,428,14,'center',learned?'#69633e':'#d7d7d2');
        });
        if(progress.hiddenSkills?.gyou){outlineRect(610,447,300,42,'#ece8ce','#999064',2);text('天地崩槍 (55)',760,468,17,'center','#494427',900);} outlineRect(365,447,230,42,'#dff4fb','#71bad7',2);text('もどる',480,468,17,'center','#17324a',800);
      }else if(isYunoTurn()){
        text('ユーノのスキル',480,366,19,'center','#d8fff5',800);
        const yu=[
          ['heal','風の癒し','(8)'],['regen','そよぎの輪','(10)'],['wind','風刃嵐','(9)'],
          ['haste','疾風','(8)'],['archery','二連射','(7)'],['mpRegenAll','風巡りの泉','(12)']
        ];
        yu.forEach((o,i)=>{
          const x=35+i*145,w=i===5?150:135,lv=progress.yunoSkills[o[0]]||0,locked=(o[0]==='evadeAll'&&(progress.yunoSkills.evade||0)<1);
          outlineRect(x,385,w,54,lv?'#d8f2ed':'#536273',lv?'#59aaa6':'#7d8992',2);
          text(lv?`${o[1]} ${o[2]}`:`${o[1]} 未習得`,x+w/2,406,lv?18:15,'center',lv?'#174c4b':'#ffffff',800);
          text(lv>1?`Lv.${lv}`:(locked?'要：風の泉':lv?'使用可':'SPで習得'),x+w/2,430,14,'center',lv?'#356c69':'#d7dde1');
        });
        outlineRect(365,447,230,42,'#dff4fb','#71bad7',2);text('もどる',480,468,17,'center','#17324a',800);
        if(progress.hiddenSkills?.yuno){
          const used=!!battle.yunoHiddenUsedThisTurn;
          outlineRect(610,447,300,42,used?'#64716f':'#d8f2ed',used?'#8b9895':'#59aaa6',2);
          text(used?'天風の祝福（このターン使用済み）':'天風の祝福 (50)',760,468,used?14:17,'center',used?'#e2e8e6':'#174c4b',900);
        }
      }else if(isSuzumaruTurn()){
        text('スズマルのスキル',480,372,18,'center','#ffe5c8');
        outlineRect(55,385,245,54,'#ffd9cf','#d86145',2);text(`${suzuSingleSkillName()} (5)`,177,407,22,'center','#6b231d');text('単体・高威力',177,431,15,'center','#934a3e');
        const suzuAllLearned=(progress.suzuSkills?.all||0)>=1;
        outlineRect(315,385,245,54,suzuAllLearned?'#ffe2cf':'#626d78',suzuAllLearned?'#d78251':'#8d969e',2);
        text(suzuAllLearned?`${suzuAllSkillName()} (${(progress.suzuSkills?.all||0)>=5?13:(progress.suzuSkills?.all||0)>=4?11:8})`:'火走り（未習得）',437,406,suzuAllLearned?22:18,'center',suzuAllLearned?'#4b2118':'#ffffff',800);
        text(suzuAllLearned?'敵全体':'SPで習得',437,431,15,'center',suzuAllLearned?'#684436':'#f2f2f2',700);
        outlineRect(575,385,180,54,'#fff0d0','#d2a24d',2);text(`回復薬 x${progress.items.potion}`,665,412,17,'center','#5f4623');
        outlineRect(770,385,140,54,'#dff4fb','#71bad7',2);text('もどる',840,412,19,'center','#17324a');
        const suzuCounterLearned=(progress.suzuSkills?.counter||0)>=1;
        outlineRect(315,445,245,44,suzuCounterLearned?'#ffe0d6':'#626d78',suzuCounterLearned?'#c95f48':'#8d969e',2);
        text(suzuCounterLearned?'炎返し (7)':'炎返し（未習得）',437,467,suzuCounterLearned?18:15,'center',suzuCounterLearned?'#6b231d':'#ffffff',800); if(progress.hiddenSkills?.suzu){outlineRect(575,445,335,44,'#ffe0d6','#c95f48',2);text('紅蓮爆砕 (55)',742,467,18,'center','#6b231d',900);}
      }else{
        outlineRect(40,378,170,52,'#dff4fb','#71bad7',2);
        {const hl=progress.heroHealSkill||1,hname=hl>=4?'九尾大水癒':hl>=3?'大水癒':hl>=2?'水の大いやし':'水のいやし',hcost=hl>=4?18:hl>=3?12:hl>=2?8:5;
          text(`${hname} (${hcost})`,125,404,hname.length>=7?17:20,'center','#17324a',900);
        }
        outlineRect(220,378,170,52,'#dff4fb','#71bad7',2);
        const pr=progress.heroPebbleRandom||0;
        const pebbleName=pr>=3?'氷つぶて乱射IV':pr>=2?'氷つぶて乱射III':pr>=1?'氷つぶて乱射II':'氷のつぶて';
        const pebbleHits=heroPebbleHitCount();
        const pebbleCost=heroSkillMPCost(pebbleHits>=7?10:pebbleHits>=5?8:pebbleHits>=3?6:4);
        text(`${pebbleName} (${pebbleCost})`,305,404,pr?17:20,'center','#17324a',900);

        const iceLearned=(progress.heroIceSkill||0)>=1 && !!progress.learned.iceSlash;
        outlineRect(400,378,170,52,iceLearned?'#dff4fb':'#626d78',iceLearned?'#71bad7':'#8d969e',2);
        const iceCost=heroSkillMPCost((progress.heroIceSkill||0)>=3?11:(progress.heroIceSkill||0)>=2?9:7);
        text(iceLearned?`${heroIceSkillName()} (${iceCost})`:'氷結斬り（未習得）',485,404,iceLearned?18:15,'center',iceLearned?'#102b40':'#ffffff',900);

        const waveLv=progress.heroPebbleAll||0,waveLearned=waveLv>=1;
        outlineRect(580,378,170,52,waveLearned?'#d9f4ff':'#626d78',waveLearned?'#62afd1':'#8d969e',2);
        const waveCost=heroSkillMPCost(waveLv>=2?11:8);
        text(waveLearned?`${waveLv>=2?'氷晶大波':'氷晶波'} (${waveCost})`:'氷晶波（未習得）',665,404,waveLearned?19:15,'center',waveLearned?'#102b40':'#ffffff',900);

        outlineRect(760,378,160,52,(progress.heroManaSkill||0)?'#d9f4ff':'#626d78',(progress.heroManaSkill||0)?'#62afd1':'#8d969e',2);
        const manaCost=heroSkillMPCost(6);
        text((progress.heroManaSkill||0)?`水脈の雫 (${manaCost})`:'水脈の雫（未習得）',840,404,(progress.heroManaSkill||0)?18:14,'center',(progress.heroManaSkill||0)?'#102b40':'#ffffff',900);
        if(yunoJoined && progress.heroYunoComboUnlocked && battle.monsterId>=400){
          outlineRect(40,438,250,44,'#d8f2ed','#59aaa6',2);text('合体：蒼風大癒 (24)',165,460,20,'center','#174c4b');
          outlineRect(305,438,300,44,'#d8eef7','#5d9fbd',2);text('合体：氷嵐大旋風 (24)',455,460,20,'center','#173f57');
          outlineRect(620,438,145,44,'#ffe7c7','#c47b45',2);text(`高級薬 x${progress.items.highPotion||0}`,692,460,19,'center','#63371d');
          outlineRect(775,438,145,44,'#dff4fb','#71bad7',2);text('もどる',847,460,20,'center','#17324a'); if(progress.hiddenSkills?.hero){const hr=heroHiddenBattleRect();outlineRect(hr.x,hr.y,hr.w,hr.h,'#d9efff','#557fd0',3);text('デスブリザード (60)',hr.x+hr.w/2,hr.y+27,19,'center','#17324a',900);}
        }else{
          if((progress.hiddenSkills?.hero)||(battle&&battle.monsterId===1290)){
            const hr=heroHiddenBattleRect();
            outlineRect(hr.x,hr.y,hr.w,hr.h,'#d9efff','#557fd0',3);
            text('デスブリザード (60)',hr.x+hr.w/2,hr.y+22,18,'center','#17324a',900);
            outlineRect(330,442,210,42,'#ffe7c7','#c47b45',2);text(`高級回復薬 x${progress.items.highPotion||0}`,435,463,20,'center','#63371d');
            outlineRect(560,442,210,42,'#dff4fb','#71bad7',2);text('もどる',665,463,19,'center','#17324a');
          }else{
            outlineRect(330,442,210,42,'#ffe7c7','#c47b45',2);text(`高級回復薬 x${progress.items.highPotion||0}`,435,463,20,'center','#63371d');
            outlineRect(560,442,210,42,'#dff4fb','#71bad7',2);text('もどる',665,463,19,'center','#17324a');
          }
        }
      }
      text('スキルを選択',480,497,14,'center','#c8e7f4');
    }
  }else{
    wrapText(battleMessage,80,405,790,28,22);
  }
}
function heroMagicFlowPower(v){
  const lv=progress.heroMagicFlow||0;
  if(lv<=0||!battle)return v;
  const stacks=Math.min(5,battle.heroMagicFlowStacks||0),rate=lv>=2?.05:.03;
  return Math.floor(v*(1+rate*stacks));
}
function yunoPassiveMP(){
  const lv=progress.yunoSkills?.windFlow||0;
  return lv>=2?5:lv>=1?3:0;
}
function gyouPassiveHP(){
  const lv=progress.gyouSkills?.earthBreath||0;
  return lv>=2?10:lv>=1?6:0;
}
function heroEquipAtk(){
  return heroStats().atk+(progress.shopBought?.heroManaBlade?10:0);
}
function heroIcePower(v){
  return progress.shopBought?.heroManaBlade?Math.floor(v*1.30):v;
}
function heroIceMagicPower(v){
  return Math.floor(heroIcePower(v)*nineTailIceMultiplier());
}
function heroSkillMPCost(base){
  return progress.shopBought?.heroManaBlade?Math.max(1,Math.ceil(base/2)):base;
}
function battleAttack(mode='attack',target='hero'){
  if((progress.heroMagicFlow||0)>0 && battle && battleActor==='hero' && !battle.heroMagicFlowStarted){battle.heroMagicFlowStacks=1;battle.heroMagicFlowStarted=true;}
  if(!battle || battle.turn!=='player')return;
  if(mode==='heal'){
    const hl=progress.heroHealSkill||1;
    const cost=heroSkillMPCost(hl>=4?18:hl>=3?12:hl>=2?8:5);
    const hpKey=partyHPKey(target),maxHP=partyMaxHP(target);
    const amount=(hl>=2?120:50);
    const hname=hl>=4?'九尾大水癒':hl>=3?'大水癒':hl>=2?'水の大いやし':'水のいやし';
    if(battle.heroMP>=cost){
      battle.heroMP-=cost;
      if(hl>=3){
        if(hl>=4){
          const healOne=(key,mx)=>{const before=battle[key]||0;battle[key]=Math.min(mx,before+Math.floor(mx*.75));return battle[key]-before;};
          const vals=[healOne('heroHP',heroStats().maxHP)];
          if(!battle.soloHero){if(battle.suzuHP!==undefined)vals.push(healOne('suzuHP',battle.suzuMaxHP));if(battle.yunoHP!==undefined)vals.push(healOne('yunoHP',battle.yunoMaxHP));if(battle.gyouHP!==undefined)vals.push(healOne('gyouHP',battle.gyouMaxHP));}
          battleMessage=`${heroName}の「${hname}」！ 味方全体のHPを最大HPの75%回復！`;setBattleFx('heal',360,255);
        }else{
          const allHeal=130;
          battle.heroHP=Math.min(heroStats().maxHP,battle.heroHP+allHeal);
          if(!battle.soloHero){if(battle.suzuHP!==undefined)battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+allHeal);if(battle.yunoHP!==undefined)battle.yunoHP=Math.min(battle.yunoMaxHP,battle.yunoHP+allHeal);if(battle.gyouHP!==undefined)battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+allHeal);}
          battleMessage=battle.soloHero?`${heroName}の「${hname}」！ HPが${allHeal}回復！`:`${heroName}の「${hname}」！ 味方全体のHPが${allHeal}回復！`;setBattleFx('heal',360,255);
        }
      }else{
        battle[hpKey]=Math.min(maxHP,battle[hpKey]+amount);
        battleMessage=`${heroName}は${partyTargetName(target)}に「${hname}」！ HPが${amount}回復！`;
        setBattleFx('heal',target==='hero'?185:target==='suzu'?265:target==='yuno'?360:455,255);
      }
      if(battle.monsterId===99)battleChoiceText.hero=hname;
    }else battleMessage='MPが足りない！';
    if(isPartyBattle()){advancePartyTurn();}
    else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
    return;
  }
  if(mode==='manaHeal'){
    if(!(progress.heroManaSkill||0)){battleMessage='水脈の雫は未習得！';return;}
    const cost=heroSkillMPCost(6);if(battle.heroMP<cost){battleMessage='MPが足りない！';return;}
    battle.heroMP-=cost;const k=partyMPKey(target),mx=partyMaxMP(target),ml=progress.heroManaSkill||1,amount=ml>=2?32:18;
    const before=battle[k]||0;battle[k]=Math.min(mx,before+amount);const actual=battle[k]-before;
    battleMessage=`${heroName}の「${ml>=2?'水脈の恵み':'水脈の雫'}」！ ${partyTargetName(target)}のMPが${actual}回復！`;setBattleFx('heal',360,255);
    if(isPartyBattle())advancePartyTurn();else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
    return;
  }
  let dmg=0;
  if(mode==='iceWave'){
    const waveLv=progress.heroPebbleAll||0;
    if(waveLv<1){
      battleMessage='氷晶波は未習得！ スキル画面で習得できます。';
      flashText='氷晶波は未習得です';flashTimer=1.7;return;
    }
    const waveCost=heroSkillMPCost(waveLv>=2?11:8);
    if(battle.heroMP<waveCost){battleMessage='MPが足りない！';return;}
    battle.heroMP-=waveCost;
    dmg=heroMagicFlowPower(heroIceMagicPower((waveLv>=2?22:12)+Math.floor(heroEquipAtk()*(waveLv>=2?.58:.40))));
    const allDmg=damageAllEnemies(dmg);
    const summary=Array.isArray(allDmg)?allDmg.map(v=>typeof v==='object'?`${v.name} ${v.damage}`:v).join(' / '):'';
    const waveName=waveLv>=2?'氷晶大波':'氷晶波';
    battleMessage=`${heroName}の「${waveName}」！ ${summary}`;
    setBattleFx('ice');
    if(battle.monsterId===99||battle.monsterId>=200)battleChoiceText.hero=waveName;
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
    if(isPartyBattle())advancePartyTurn();
    else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
    return;
  }
  if(mode==='iceSlash'){
    if((progress.heroIceSkill||0)<1 || !progress.learned.iceSlash){
      battleMessage='氷結斬りは未習得！ スキル画面でSP1を使って習得できます。';
      flashText='氷結斬りは未習得です';flashTimer=1.7;return;
    }
    const il=Math.max(1,progress.heroIceSkill||1);
    const cost=heroSkillMPCost(il>=3?11:il>=2?9:7);
    if(battle.heroMP<cost){battleMessage='MPが足りない！';return;}
    battle.heroMP-=cost;
    const hits=heroIceHits();
    let total=0,parts=[];
    for(let i=0;i<hits;i++){
      let hit=heroIcePower(Math.max(1,heroEquipAtk()+(il>=3?11:il>=2?9:15)+Math.floor(Math.random()*7)));
      if(progress.nineTailGear)hit+=99;
      hit=sealedSkillResist(hit,'iceSlash');
      total+=hit;parts.push(hit);
    }
    dmg=total;
    const skillName=heroIceSkillName();
    battleMessage=`${heroName}の「${skillName}」！ ${parts.join(' + ')} = ${dmg}ダメージ！`;setBattleFx('ice');
    addDamagePopup(`${hits} HIT ${dmg}`,700,155,'#bdefff');
    if(battle.monsterId===99||battle.monsterId>=200)battleChoiceText.hero=skillName;
  }else if(mode==='ice'){
    const pr=progress.heroPebbleRandom||0,hits=heroPebbleHitCount();
    const cost=heroSkillMPCost(hits>=7?10:hits>=5?8:hits>=3?6:4);
    if(battle.heroMP<cost){battleMessage='MPが足りない！';return;}
    battle.heroMP-=cost;
    const skillName=pr>=3?'氷つぶて乱射IV':pr>=2?'氷つぶて乱射III':pr>=1?'氷つぶて乱射II':'氷のつぶて';
    let parts=[],total=0,targetCounts={};
    for(let i=0;i<hits;i++){
      let hit=heroMagicFlowPower(heroIceMagicPower(Math.max(1,Math.floor((heroEquipAtk()+5+Math.floor(Math.random()*6))*(hits===1?1:.60)))));
      hit=sealedSkillResist(hit,'iceShot');
      // Each shot independently selects one currently living enemy.
      // With one enemy, every shot therefore lands on that enemy.
      let targetIndex=0,targetName=battle.enemyName||'敵';
      if(battle.enemies){
        const live=livingEnemies();
        if(live.length){
          const chosen=live[Math.floor(Math.random()*live.length)];
          targetIndex=Math.max(0,live.indexOf(chosen));
          targetName=chosen.name;
        }else{
          const last=battle.enemies[battle.enemies.length-1];
          targetIndex=Math.max(0,battle.enemies.length-1);
          targetName=last?.name||targetName;
        }
      }
      const actual=damageMultiHitDisplay(hit,targetIndex);
      parts.push(actual);total+=actual;targetCounts[targetName]=(targetCounts[targetName]||0)+1;
    }
    const distribution=Object.entries(targetCounts).map(([name,n])=>`${name}×${n}`).join(' / ');
    battleMessage=`${heroName}の「${skillName}」！ ${distribution}　${parts.join(' + ')} = ${total}ダメージ！`;setBattleFx('ice');
    addDamagePopup(`${parts.length} HIT ${total}`,700,155,'#bdefff');
    if(battle.monsterId===99||battle.monsterId>=200)battleChoiceText.hero=skillName;
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
    if(isPartyBattle())advancePartyTurn();else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
    return;
  }else{
    dmg=heroEquipAtk()+4+Math.floor(Math.random()*5);
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


function useHighPotion(target){
  if(!battle || battle.turn!=='player')return;
  if((progress.items.highPotion||0)<=0){battleMessage='高級回復薬を持っていない！';return;}
  progress.items.highPotion--;saveProgress();
  const heal=70;
  if(target==='suzu'){
    const before=battle.suzuHP;battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+heal);
    battleMessage=`スズマルは高級回復薬を使った！ HPが${heal}回復！${reviveNote('スズマル',before,battle.suzuHP)}`;battleChoiceText.suzu='高級回復薬';
  }else if(target==='yuno'){
    const before=battle.yunoHP;battle.yunoHP=Math.min(battle.yunoMaxHP,battle.yunoHP+heal);
    battleMessage=`ユーノは高級回復薬を使った！ HPが${heal}回復！${reviveNote('ユーノ',before,battle.yunoHP)}`;battleChoiceText.yuno='高級回復薬';
  }else if(target==='gyou'){
    ensureGyouBattle();const before=battle.gyouHP;battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+heal);
    battleMessage=`ジュウは高級回復薬を使った！ HPが${heal}回復！${reviveNote('ジュウ',before,battle.gyouHP)}`;battleChoiceText.gyou='高級回復薬';
  }else{
    const before=battle.heroHP;battle.heroHP=Math.min(heroStats().maxHP,battle.heroHP+heal);
    battleMessage=`${heroName}は高級回復薬を使った！ HPが${heal}回復！${reviveNote(heroName,before,battle.heroHP)}`;battleChoiceText.hero='高級回復薬';
  }
  setBattleFx('heal',360,255);
  if(isPartyBattle())advancePartyTurn();else{battle.turn='enemy';battleCooldown=.8;battleMenu='main';}
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
    battle.heroHP=Math.min(heroStats().maxHP,battle.heroHP+25);
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


function dragonTrailEnemyTurn(){
  if(!battle)return;
  const live=(battle.enemies||[]).filter(e=>Number(e.hp)>0);
  const names={hero:heroName,suzu:'スズマル',yuno:'ユーノ',gyou:'ジュウ'};
  const lines=[];
  for(const foe of live){
    const candidates=[];
    if(Number(battle.heroHP)>0)candidates.push('hero');
    if(Number(battle.suzuHP)>0)candidates.push('suzu');
    if(Number(battle.yunoHP)>0)candidates.push('yuno');
    if(Number(battle.gyouHP)>0)candidates.push('gyou');
    if(!candidates.length)break;
    let target=(battle.gyouGrandGuard||battle.gyouTauntTurns>0)&&Number(battle.gyouHP)>0?'gyou':candidates[Math.floor(Math.random()*candidates.length)];
    if(battle.gyouCover===target&&Number(battle.gyouHP)>0)target='gyou';
    let dmg=14+Math.floor(Math.random()*9);
    if(target==='hero'){
      dmg=Math.max(1,(battle.defending?Math.floor(dmg/2):dmg)-Math.floor((progress.def||0)/4));
      battle.heroHP=Math.max(0,Number(battle.heroHP||0)-dmg);
    }else if(target==='suzu'){
      dmg=Math.max(1,dmg-Math.floor((suzumaruStats().def||0)/4));
      battle.suzuHP=Math.max(0,Number(battle.suzuHP||0)-dmg);
    }else if(target==='yuno'){
      dmg=Math.max(1,dmg-Math.floor((yunoStats().def||0)/4));
      battle.yunoHP=Math.max(0,Number(battle.yunoHP||0)-dmg);
    }else{
      dmg=Math.max(1,dmg-Math.floor(((gyouStats().def||0)+(battle.gyouDefTurns>0?10:0))/4));
      if(progress.shopBought?.gyouShield)dmg=Math.max(1,Math.ceil(dmg*.75));
      battle.gyouHP=Math.max(0,Number(battle.gyouHP||0)-dmg);
      if(progress.shopBought?.gyouShield&&battle.gyouMP!==undefined){
        battle.gyouMP=Math.min(battle.gyouMaxMP,Number(battle.gyouMP||0)+Math.max(1,Math.ceil(dmg/6)));
      }
    }
    lines.push(`${foe.name} → ${names[target]} ${dmg}`);
  }
  battle.defending=false;battle.gyouCover=null;battle.gyouCounter=false;battle.gyouGrandGuard=false;battle.suzuCounter=false;
  if((battle.gyouDefTurns||0)>0)battle.gyouDefTurns--;
  if((battle.gyouTauntTurns||0)>0)battle.gyouTauntTurns--;
  battleMessage=lines.length?`敵の攻撃！ ${lines.join(' / ')}`:'敵は動けない！';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  if(partyWipedOut()){battle.turn='lose';battleCooldown=1.6;battleMessage='全員が気絶した……。';return;}
  battle.turn='enemyResult';battleCooldown=1.05;
}
function beginEnemyTurn(){
  if(!battle)return;
  battleActor='hero';
  battleMenu='main';
  // 「ドラゴンに挑戦」の登山道だけはフレーム待ちを挟まず敵行動を確定させる。
  // クリア後の簡易島火山(970～973)とは別系統。
  if(battle.monsterId>=960&&battle.monsterId<=963){
    battle.turn='enemy';
    battleCooldown=0;
    dragonTrailEnemyTurn();
    return;
  }
  battle.turn='enemy';
  battleCooldown=.55;
}
function suzuFightingFlameBonus(baseAtk){
  const lv=progress.suzuSkills?.fightingFlame||0;
  if(lv<=0||!battle)return 0;
  const stacks=battle.suzuFightingFlameStacks||0;
  const rate=lv>=2?.05:.03;
  return Math.floor(baseAtk*rate*stacks);
}
function suzuSkillMPCost(base){
  return progress.shopBought?.suzuGloves?Math.max(1,Math.ceil(base*.75)):base;
}
function suzuFirePower(v){
  return progress.shopBought?.suzuGloves?Math.floor(v*1.30):v;
}
function suzuAction(mode='attack'){
  const ss={...suzumaruStats()};
  if(progress.shopBought?.suzuGloves)ss.atk+=(battle.suzuGloveStacks||0)*2;
  ss.atk+=suzuFightingFlameBonus(suzumaruStats().atk);
  ss.atk=Math.floor(ss.atk*(battle?.suzuHiddenAtkMultiplier||1));
  if(!battle || battle.turn!=='player' || battleActor!=='suzu')return;
  let dmg=0;
  if(mode==='counter'){
    sfx('guard');
    if((progress.suzuSkills?.counter||0)<1){battleMessage='炎返しは未習得！';return;}
    const counterCost=suzuSkillMPCost(7);if(battle.suzuMP<counterCost){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=counterCost;battle.suzuCounter=true;
    battleMessage='スズマルの「炎返し」！ 攻撃を受ければ炎をまとった剣で反撃する！';
    battleChoiceText.suzu='炎返し';advancePartyTurn();return;
  }
  if(mode==='fireRun'){
    if((progress.suzuSkills?.all||0)<1){
      battleMessage='火走りは未習得！ スキル画面でSP1を使って習得できます。';
      flashText='火走りは未習得です';flashTimer=1.7;return;
    }
    const allLv=progress.suzuSkills.all||0,allCost=suzuSkillMPCost(allLv>=5?13:allLv>=4?11:8);
    if(battle.suzuMP<allCost){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=allCost;
    {
      const al=progress.suzuSkills.all||0;
      const bonus=al>=5?34:al>=4?23:al>=3?14:al>=2?8:3;
      const ratio=al>=5?.72:al>=4?.62:al>=3?.54:.45;
      dmg=suzuFirePower(Math.floor(ss.atk*ratio)+bonus+Math.floor(Math.random()*5));
    }
    const allDmg=damageAllEnemies(dmg);
    const summary=Array.isArray(allDmg)?allDmg.map(v=>typeof v==='object'?`${v.name} ${v.damage}`:v).join(' / '):'';
    battleMessage=`スズマルの「火走り」！ ${summary}`;
    setBattleFx('fire');addDamagePopup('FIRE ALL',700,155,'#ffb093');battleChoiceText.suzu='火走り';
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1.0;return;}
    advancePartyTurn();return;
  }
  if(mode==='fire'){
    const fireCost=suzuSkillMPCost(5);if(battle.suzuMP<fireCost){battleMessage='MPが足りない！';return;}
    battle.suzuMP-=fireCost;
    {
      const sl=progress.suzuSkills.single||0;
      const skillName=suzuSingleSkillName();
      if(sl>=2){
        const ratio=sl>=4?1.18:sl>=3?1.02:.86;
        const bonus=sl>=4?26:sl>=3?18:10;
        const d1=suzuFirePower(Math.floor(ss.atk*ratio)+bonus+Math.floor(Math.random()*7));
        const d2=suzuFirePower(Math.floor(ss.atk*ratio)+bonus+Math.floor(Math.random()*7));
        damageEnemy(d1);if(!enemiesDefeated())damageEnemy(d2);
        battleMessage=`スズマルの「${skillName}」！ ${d1}＋${d2}ダメージ！`;
        setBattleFx('fire');addDamagePopup(skillName,700,155,'#ffb093');battleChoiceText.suzu=skillName;
        dmg=0;
      }else{
        dmg=suzuFirePower(Math.floor(ss.atk*1.12)+14+Math.floor(Math.random()*7));
        battleMessage=`スズマルの「${skillName}」！ ${dmg}ダメージ！`;
        setBattleFx('fire');addDamagePopup(skillName,700,155,'#ffb093');battleChoiceText.suzu=skillName;
      }
    }
  }else{
    dmg=ss.atk+2+Math.floor(Math.random()*5);
    battleMessage=`スズマルのこうげき！ ${dmg}ダメージ！`;setBattleFx('slash');battleChoiceText.suzu='こうげき';
  }
  if(dmg>0)damageEnemy(dmg);
  if(progress.finalFlameBlade && !enemiesDefeated()){
    const sl=progress.suzuSkills?.single||0;
    const follow=suzuFirePower((sl>=4?23:sl>=3?18:7)+Math.floor(ss.atk*(sl>=4?.52:sl>=3?.45:.28))+Math.floor(Math.random()*(sl>=3?9:5)));
    damageEnemy(follow);
    battleMessage+=`　爆炎大剣の炎が追撃！ ${follow}ダメージ！`;
    setBattleFx('fire');addDamagePopup(`+炎 ${follow}`,700,185,'#ff9b70');
  }
  if(enemiesDefeated()){
    battle.turn='win';battleCooldown=1.0;return;
  }
  advancePartyTurn();
}



function heroHiddenSkill(){
 if(!progress.hiddenSkills?.hero && !(battle&&battle.monsterId===1290)){battleMessage='デスブリザードは未習得！';return;}
 const cost=heroSkillMPCost(60);if(battle.heroMP<cost){battleMessage='MPが足りない！';return;}battle.heroMP-=cost;
 const dmg=heroMagicFlowPower(heroIceMagicPower(55+Math.floor(heroStats().atk*.75)));
 const res=damageAllEnemies(dmg);battle.vulnerableTurns=4;
 battleMessage=`${heroName}の「デスブリザード」！ ${res.map(v=>typeof v==='object'?`${v.name} ${v.damage}`:v).join(' / ')}　敵は4ターン被ダメージ+50%！`;setBattleFx('ice');
 if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}advancePartyTurn();
}
function suzuHiddenSkill(){
 if(!progress.hiddenSkills?.suzu){battleMessage='紅蓮爆砕は未習得！';return;}
 const cost=suzuSkillMPCost(55);if(battle.suzuMP<cost){battleMessage='MPが足りない！';return;}battle.suzuMP-=cost;
 const baseStats=suzumaruStats();
 let atk=baseStats.atk;
 if(progress.shopBought?.suzuGloves)atk+=(battle.suzuGloveStacks||0)*2;
 atk+=suzuFightingFlameBonus(baseStats.atk);
 atk=Math.floor(atk*(battle.suzuHiddenAtkMultiplier||1));
 const dmg=suzuFirePower(Math.floor(atk*8)+80+Math.floor(Math.random()*21));
 damageMultiHitDisplay(dmg);
 const first=!(battle.suzuHiddenAtkMultiplier>1);
 battle.suzuHiddenAtkMultiplier=first?2:battle.suzuHiddenAtkMultiplier*1.2;
 battleMessage=`スズマルの「紅蓮爆砕」！ ${dmg}ダメージ！ 攻撃力が${first?'2倍':'さらに1.2倍'}！（現在×${battle.suzuHiddenAtkMultiplier.toFixed(2)}）`;
 setBattleFx('fire');addDamagePopup('紅蓮爆砕',700,155,'#ff8a62');
 if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}advancePartyTurn();
}
function yunoHiddenSkill(){
 if(!progress.hiddenSkills?.yuno){battleMessage='天風の祝福は未習得！';return;}
 if(battle.yunoHiddenUsedThisTurn){battleMessage='「天風の祝福」はユーノの1ターンにつき1回まで！';return;}
 const cost=50;if(battle.yunoMP<cost){battleMessage='MPが足りない！';return;}battle.yunoMP-=cost;
 battle.yunoHiddenUsedThisTurn=true;
 for(const t of partyTargetList()){const hk=partyHPKey(t.key),mk=partyMPKey(t.key),hm=partyMaxHP(t.key),mm=partyMaxMP(t.key);battle[hk]=Math.min(hm,(battle[hk]||0)+Math.floor(hm*.25));battle[mk]=Math.min(mm,(battle[mk]||0)+Math.floor(mm*.25));}
 battle.partyDoubleActions=2;battle.partyDoubleUsed={};battleMessage='ユーノの「天風の祝福」！ 全員のHP・MP25%回復！ 全員が次の2ターン、2回行動！';setBattleFx('heal');advancePartyTurn();
}
function gyouHiddenSkill(){
 if(!progress.hiddenSkills?.gyou){battleMessage='天地崩槍は未習得！';return;}ensureGyouBattle();const cost=55;if(battle.gyouMP<cost){battleMessage='MPが足りない！';return;}battle.gyouMP-=cost;
 const gs=gyouStats(),base=Math.floor((gs.atk+gs.def)*1.15)+40,parts=[base,base,base];parts.forEach(d=>damageMultiHitDisplay(d));battle.gyouGrandGuard=true;battle.gyouHiddenGuard=true;battle.gyouDefTurns=Math.max(1,battle.gyouDefTurns||0);
 battleMessage=`ジュウの「天地崩槍」！ ${parts.join('＋')} = ${parts.reduce((a,b)=>a+b,0)}ダメージ！ このターン全員をかばい被ダメージ75%減！`;setBattleFx('slash');if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}advancePartyTurn();
}
function heroYunoCombo(mode){
  if(!battle || battle.turn!=='player' || battleActor!=='hero' || !yunoJoined || battle.monsterId<400)return;
  if(!progress.heroYunoComboUnlocked){battleMessage='ユーノとの合体技はまだ試していない！';return;}
  const ys=yunoStats();
  if(battle.heroMP<12 || battle.yunoMP<12){
    battleMessage='合体技に必要なMPが足りない！（二人ともMP12必要）';return;
  }
  battle.heroMP-=12;battle.yunoMP-=12;
  battle.skipYunoThisRound=true;
  if(mode==='grandHeal'){
    battle.heroHP=progress.maxHP;battle.suzuHP=battle.suzuMaxHP;battle.yunoHP=battle.yunoMaxHP;
    if(battle.gyouHP!==undefined)battle.gyouHP=battle.gyouMaxHP;
    battleMessage=`${heroName}＆ユーノの合体技「蒼風大癒」！ 味方全員のHPが全回復！`;
    setBattleFx('heal',360,255);
  }else{
    const dmg=30+Math.floor((progress.atk+ys.atk)*.65);
    const res=damageAllEnemies(dmg);
    const summary=res.map(v=>`${v.name} ${v.damage}`).join(' / ');
    battleMessage=`${heroName}＆ユーノの合体技「氷嵐大旋風」！ ${summary}`;
    setBattleFx('ice');addDamagePopup('COMBO ALL',700,155,'#b8f4ff');
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}
  }
  advancePartyTurn();
}

function yunoSkillMPCost(base){
  return progress.shopBought?.summitBow?Math.max(1,Math.ceil(base*2/3)):base;
}
function yunoWindPower(v){
  return progress.shopBought?.yunoBracelet?Math.floor(v*1.30):v;
}
function yunoAction(mode,target='hero'){
  if(!isYunoTurn())return;
  const key={healAll:'heal',regen:'regen',windAll:'wind',haste:'haste',mpRegenAll:'mpRegenAll',archery:'archery'}[mode];
  const lv=progress.yunoSkills[key]||0;
  if(!lv){battleMessage='その風術はまだ習得していない！ 「もどる」で行動選択へ戻れます。';return;}
  const ys=yunoStats();
  const cost=yunoSkillMPCost({healAll:8,regen:10,windAll:9,haste:8,mpRegenAll:12,archery:6}[mode]||0);
  if(battle.yunoMP<cost){battleMessage='MPが足りない！ 「もどる」で行動選択へ戻れます。';return;}
  battle.yunoMP-=cost;
  if(mode==='healAll'){
    const heal=14+Math.floor(ys.atk/3)+(lv-1)*10;
    const wasDown=partyMembers().filter(m=>(battle[partyHPKey(m.key)]||0)<=0).map(m=>m.name);
    battle.heroHP=Math.min(progress.maxHP,battle.heroHP+heal);battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+heal);
    battle.yunoHP=Math.min(battle.yunoMaxHP,battle.yunoHP+heal);if(battle.gyouHP!==undefined)battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+heal);
    battleMessage=`ユーノの「風の癒し Lv.${lv}」！ 味方全体のHPが${heal}回復！${wasDown.length?` ${wasDown.join('・')}は立ち上がった！`:''}`;setBattleFx('heal',360,255);
  }else if(mode==='regen'){
    battle.regenTurns=3+(lv>=3?1:0)+(progress.shopBought?.yunoBracelet?1:0);battle.regenPower=7+(lv-1)*5;
    battleMessage=`ユーノの「そよぎの輪 Lv.${lv}」！ ${battle.regenTurns}ターン、毎ターンHP${battle.regenPower}回復！`;setBattleFx('heal',360,255);
  }else if(mode==='windAll'){
    sfx('wind');
    const dmg=yunoWindPower(8+Math.floor(ys.atk*.65)+(lv-1)*12);const res=damageAllEnemies(dmg);
    battleMessage=`ユーノの「風刃嵐 Lv.${lv}」！ ${res.map(v=>`${v.name} ${v.damage}`).join(' / ')}`;setBattleFx('ice');addDamagePopup(`WIND ALL Lv.${lv}`,700,155,'#b8fff1');
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}
  }else if(mode==='haste'){
    sfx('wind');
    battle.hasteTarget=target;battle.hasteTurns=2+(progress.shopBought?.yunoBracelet?1:0);battle.hasteUsed=false;
    battleMessage=`ユーノの「疾風」！ ${partyTargetName(target)}は${battle.hasteTurns}ターン、行動を2回できる！`;
  }else if(mode==='archery'){
    sfx('bow');
    const hits=lv>=2?3:2,ratio=lv>=2?.78:.68,parts=[];
    for(let i=0;i<hits;i++){
      const d=yunoWindPower(Math.floor(ys.atk*ratio)+(lv>=2?8:5)+Math.floor(Math.random()*5));
      parts.push(d);damageMultiHitDisplay(d);
    }
    const nm=lv>=2?'風纏三連射':'二連射';
    battleMessage=`ユーノの「${nm}」！ ${parts.join('＋')} = ${parts.reduce((a,b)=>a+b,0)}ダメージ！`;setBattleFx('slash');addDamagePopup(`${parts.length} HIT`,700,155,'#b8fff1');
    if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}
  }else if(mode==='mpRegenAll'){
    sfx('wind');
    // Recasting refreshes/overwrites duration rather than stacking another copy.
    battle.mpRegenAllTurns=4+(progress.shopBought?.yunoBracelet?1:0);battle.mpRegenAllPower=5;
    battleMessage=`ユーノの「風巡りの泉」！ ${battle.mpRegenAllTurns}ターン、味方全体のMPが毎ターン5回復！`;setBattleFx('heal',360,255);
  }
  battleChoiceText.yuno=mode;advancePartyTurn();
}

function gyouAction(mode,target='hero'){
  if(!isGyouTurn())return;
  ensureGyouBattle();
  const key={fortify:'fortify',cover:'cover',taunt:'taunt',manaGuard:'manaGuard',healGuard:'healGuard',doubleThrust:'doubleThrust',counter:'counter'}[mode];
  if(mode!=='grandGuard' && !progress.gyouSkills[key]){battleMessage='その技はまだ習得していない！';return;}
  if(mode==='grandGuard'&&!progress.gyouGrandGuard){battleMessage='村長からまだ奥義を教わっていない！';return;}
  const cost={fortify:5,cover:5,taunt:4,manaGuard:4,healGuard:7,doubleThrust:6,counter:7,grandGuard:16}[mode];
  if(battle.gyouMP<cost){battleMessage='MPが足りない！';return;}
  battle.gyouMP-=cost;
  if(mode==='fortify'){sfx('earth');battle.gyouDefTurns=3;battleMessage='ジュウの「岩守り」！ 防御力が大きく上がった！';}
  else if(mode==='cover'){sfx('guard');battle.gyouCover=target;battleMessage=`ジュウの「かばう」！ ${partyTargetName(target)}への攻撃を引き受ける！`;}
  else if(mode==='taunt'){
    const lv=progress.gyouSkills.taunt||1;
    battle.gyouTauntTurns=lv>=2?5:3;
    battleMessage=`ジュウの「挑発${lv>=2?' Lv.2':''}」！ ${battle.gyouTauntTurns}ターン、敵の注意を一身に集めた！`;
  }
  else if(mode==='manaGuard'){battle.gyouManaGuard=true;battleMessage='ジュウの「土脈吸収」！ ダメージを受けるとMPが回復する！';}
  else if(mode==='healGuard'){const heal=18+Math.floor(gyouStats().def/2);battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+heal);battle.gyouDefTurns=2;battleMessage=`ジュウの「守りの呼吸」！ HP${heal}回復＋防御！`;setBattleFx('heal',455,255);}
  else if(mode==='doubleThrust'){
    sfx('spear');
    const gs=gyouStats(),lv=progress.gyouSkills.doubleThrust||1,mul=lv>=2?.92:.72,bonus=lv>=2?9:5;
    const d1=Math.floor(gs.atk*mul)+bonus+Math.floor(Math.random()*4),d2=Math.floor(gs.atk*mul)+bonus+Math.floor(Math.random()*4);
    damageEnemy(d1);if(!enemiesDefeated())damageEnemy(d2);
    battleMessage=`ジュウの「二段突き${lv>=2?'・剛':''}」！ ${d1}＋${d2}ダメージ！`;
    setBattleFx('slash');if(enemiesDefeated()){battle.turn='win';battleCooldown=1;return;}
  }
  else if(mode==='counter'){battle.gyouCounter=true;battleMessage='ジュウの「迎撃の構え」！ 攻撃を受ければ槍で反撃する！';}
  else if(mode==='grandGuard'){battle.gyouGrandGuard=true;battle.gyouDefTurns=1;battleMessage='ジュウの奥義「大守護」！ このターン、仲間全員への攻撃を引き受ける！';}
  battleChoiceText.gyou=mode;advancePartyTurn();
}

function battleDefend(){
  if(!battle || battle.turn!=='player')return;
  const restore=(key,max)=>{const before=battle[key]||0,amt=Math.max(4,Math.floor(max*.12));battle[key]=Math.min(max,before+amt);return battle[key]-before;};
  if(isGyouTurn()){
    ensureGyouBattle();battle.gyouDefTurns=Math.max(battle.gyouDefTurns,1);const r=restore('gyouMP',battle.gyouMaxMP);
    battleMessage=`ジュウは槍を構えて防御！ MPが${r}回復！`;battleChoiceText.gyou='ぼうぎょ';advancePartyTurn();return;
  }
  if(isYunoTurn()){
    const r=restore('yunoMP',battle.yunoMaxMP);battleMessage=`ユーノは身を守って集中した！ MPが${r}回復！`;battleChoiceText.yuno='ぼうぎょ';advancePartyTurn();return;
  }
  if(isSuzumaruTurn()){
    const r=restore('suzuMP',battle.suzuMaxMP);battleMessage=`スズマルは身を守って呼吸を整えた！ MPが${r}回復！`;
    battleChoiceText.suzu='ぼうぎょ';advancePartyTurn();return;
  }
  battle.defending=true;const r=restore('heroMP',progress.maxMP);
  battleMessage=`${heroName}は身を守って魔力を練った！ MPが${r}回復！`;if(battle.monsterId===99||battle.monsterId>=200)battleChoiceText.hero='ぼうぎょ';
  if((battle.monsterId===99||battle.monsterId>=200) && suzumaruActive){advancePartyTurn();}
  else{battle.turn='enemy';battleCooldown=.65;battleMenu='main';}
}
function battleRun(){
  if(!battle || battle.turn!=='player')return;
  if(battle.monsterId===99){
    battleMessage='マグマガメからは逃げられない！';return;
  }
  if(battle.monsterId>=960&&battle.monsterId<=963){
    battleMessage='頂上への登山道では逃げられない！';return;
  }
  battleMessage='うまく逃げ切った！';
  battle.turn='run';battleCooldown=.6;battleMenu='main';
}
function pirateCaptainTurn(){
  ensureGyouBattle();battle.bossTurn=(battle.bossTurn||0)+1;
  const vice=battle.enemies[0],cap=battle.enemies[1];
  if(cap.hp>0 && cap.hp<=cap.maxHP*.5 && battle.bossPhase===1){battle.bossPhase=2;battleMessage='海賊船長「まだ終わらん！」';}
  // 船長は自分専用の回復薬を最大2回使用。副船長には使わない。
  if(cap.hp>0 && cap.potions>0 && cap.hp<=cap.maxHP*.42){
    const heal=Math.min(140,cap.maxHP-cap.hp);cap.hp+=heal;cap.potions--;syncPrimaryEnemy();
    battleMessage=`海賊船長は自分に高級回復薬を使った！ HP ${heal}回復！（残り${cap.potions}）`;
    addDamagePopup(`+${heal}`,785,170,'#9ff0c5');battle.turn='enemyResult';battleCooldown=1.3;return;
  }
  let attacker=cap.hp>0?'captain':'vice';
  // 副船長は生存中、2ターンに1回割り込んで大斧を振るう。
  if(vice.hp>0 && (battle.bossTurn%2===0 || cap.hp<=0))attacker='vice';
  const isVice=attacker==='vice';
  const base=(isVice?46:(battle.bossPhase===2?36:27))+Math.floor(Math.random()*9);
  let targets=[];
  if(battle.gyouGrandGuard)targets=['gyou'];
  else if(!isVice && battle.bossTurn%3===0)targets=['hero','suzu','yuno','gyou'];
  else if(battle.gyouTauntTurns>0)targets=['gyou'];
  else targets=[['hero','suzu','yuno','gyou'][Math.floor(Math.random()*4)]];
  const lines=[];
  for(const target0 of targets){
    let target=(battle.gyouCover===target0)?'gyou':target0;
    const evade=(battle.evadeAllTurns>0?(battle.evadeAllBonus||.30):0)+((battle.evadeTarget===target&&battle.evadeTurns>0)?(battle.evadeSingleBonus||.25):0);
    if(target!=='gyou'&&Math.random()<evade){lines.push(`${target==='hero'?heroName:target==='suzu'?'スズマル':target==='yuno'?'ユーノ':'ジュウ'} 回避！`);continue;}
    let dmg=base;
    if(target==='hero'){dmg=Math.max(1,(battle.defending?Math.floor(dmg/2):dmg)-Math.floor(progress.def/4));battle.heroHP=Math.max(0,battle.heroHP-dmg);}
    else if(target==='suzu'){dmg=Math.max(1,dmg-Math.floor(suzumaruStats().def/4));battle.suzuHP=Math.max(0,battle.suzuHP-dmg);}
    else if(target==='yuno'){dmg=Math.max(1,dmg-Math.floor(yunoStats().def/4));battle.yunoHP=Math.max(0,battle.yunoHP-dmg);}
    else {
      dmg=Math.max(1,dmg-Math.floor((gyouStats().def+(battle.gyouDefTurns>0?10:0))/4));dmg=gyouShieldReduce(dmg);
      battle.gyouHP=Math.max(0,battle.gyouHP-dmg);
      const shieldMP=gyouShieldRecover(dmg);
      let skillMP=0;
      if(battle.gyouManaGuard){
        const before=battle.gyouMP;
        battle.gyouMP=Math.min(battle.gyouMaxMP,battle.gyouMP+Math.ceil(dmg/2));
        skillMP=battle.gyouMP-before;
      }
      if(shieldMP||skillMP)lines.push(`ジュウ MP回復：${skillMP?`土脈+${skillMP} `:''}${shieldMP?`盾+${shieldMP}`:''}`);
    }
    lines.push(`${target==='hero'?heroName:target==='suzu'?'スズマル':target==='yuno'?'ユーノ':'ジュウ'} -${dmg}`);
    addDamagePopup(`-${dmg}`,target==='hero'?185:target==='suzu'?265:target==='yuno'?360:455,215,'#ff796e');
  }
  battleMessage=isVice?`副船長の「豪斧撃」！ ${lines.join(' / ')}`:`海賊船長の${battle.bossTurn%3===0?'「一斉指揮斬り」':'斬撃'}！ ${lines.join(' / ')}`;
  battle.defending=false;
  if(battle.regenTurns>0){const h=battle.regenPower||7;for(const [k,m] of [['heroHP',progress.maxHP],['suzuHP',battle.suzuMaxHP],['yunoHP',battle.yunoMaxHP],['gyouHP',battle.gyouMaxHP]])battle[k]=Math.min(m,battle[k]+h);battle.regenTurns--;battleMessage+=` / そよぎの輪 +${h}`;} battleMessage+=applyPartyMPRegen();
  if(battle.evadeAllTurns>0)battle.evadeAllTurns--;if(battle.evadeTurns>0)battle.evadeTurns--;if(battle.gyouDefTurns>0)battle.gyouDefTurns--;if(battle.gyouTauntTurns>0)battle.gyouTauntTurns--;
  battle.gyouCover=null;battle.gyouCounter=false;battle.gyouGrandGuard=false;battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  if(checkPartyWipe())return;
  battle.turn='enemyResult';battleCooldown=1.3;
}
function applyPartyMPRegen(){
  if(!battle)return '';
  let notes=[];
  if((battle.mpRegenTurns||0)>0){
    const p=battle.mpRegenPower||5,t=battle.mpRegenTarget||'hero',k=partyMPKey(t),mx=partyMaxMP(t);
    if(battle[k]!==undefined){battle[k]=Math.min(mx,battle[k]+p);notes.push(`${partyTargetName(t)} MP+${p}`);}
    battle.mpRegenTurns--;
  }
  if((battle.mpRegenAllTurns||0)>0){
    const p=battle.mpRegenAllPower||5;
    battle.heroMP=Math.min(progress.maxMP,battle.heroMP+p);
    battle.suzuMP=Math.min(battle.suzuMaxMP,battle.suzuMP+p);
    if(battle.yunoMP!==undefined)battle.yunoMP=Math.min(battle.yunoMaxMP,battle.yunoMP+p);
    if(battle.gyouMP!==undefined)battle.gyouMP=Math.min(battle.gyouMaxMP,battle.gyouMP+p);
    battle.mpRegenAllTurns--;notes.push(`全員 MP+${p}`);
  }
  return notes.length?' / '+notes.join(' / '):'';
}
function gyouShieldReduce(dmg){
  return progress.shopBought?.gyouShield?Math.max(1,Math.ceil(dmg*.75)):dmg;
}
function gyouShieldRecover(dmg){
  if(!progress.shopBought?.gyouShield || !battle || battle.gyouMP===undefined)return 0;
  const mp=Math.max(1,Math.ceil(dmg/6));
  const before=battle.gyouMP;
  battle.gyouMP=Math.min(battle.gyouMaxMP,battle.gyouMP+mp);
  return battle.gyouMP-before;
}
function postGameRaidBossTurn(){
 battle.bossTurn=(battle.bossTurn||0)+1;const live=livingEnemies();let lines=[];
 const klaus=live.find(e=>e.name==='クラウス');
 if(klaus&&battle.bossTurn%2===1){
   for(const t of ['hero','suzu','yuno','gyou']){
     let d=34+Math.floor(Math.random()*15);
     if(t==='hero')battle.heroHP=Math.max(0,battle.heroHP-d);
     else if(t==='suzu')battle.suzuHP=Math.max(0,battle.suzuHP-d);
     else if(t==='yuno')battle.yunoHP=Math.max(0,battle.yunoHP-d);
     else {d=gyouShieldReduce(d);battle.gyouHP=Math.max(0,battle.gyouHP-d);gyouShieldRecover(d);}
     lines.push(`${t==='hero'?heroName:t==='suzu'?'スズマル':t==='yuno'?'ユーノ':'ジュウ'} -${d}`);
   }
   battleMessage=`クラウスのマシンガン掃射！ ${lines.join(' / ')}`;
 }else{
   const foe=live[Math.floor(Math.random()*live.length)],t=['hero','suzu','yuno','gyou'][Math.floor(Math.random()*4)],d=58+Math.floor(Math.random()*22);
   if(t==='hero')battle.heroHP=Math.max(0,battle.heroHP-d);else if(t==='suzu')battle.suzuHP=Math.max(0,battle.suzuHP-d);else if(t==='yuno')battle.yunoHP=Math.max(0,battle.yunoHP-d);else battle.gyouHP=Math.max(0,battle.gyouHP-gyouShieldReduce(d));
   battleMessage=`${foe.name}の強烈な攻撃！ ${t==='hero'?heroName:t==='suzu'?'スズマル':t==='yuno'?'ユーノ':'ジュウ'} -${d}`;
 }
 battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};battle.turn='enemyResult';battleCooldown=1.15;
}
function enemyTurn(){
  if(battle&&battle.vulnerableTurns>0)battle.vulnerableTurns--;
  // 登山道戦が何らかの経路で enemy 状態に入った場合も同じ処理へ集約。
  if(battle&&battle.monsterId>=960&&battle.monsterId<=963){
    dragonTrailEnemyTurn();return;
  }
  if(battle&&battle.monsterId===1199){
    const targets=battle.soloHero?['hero']:['hero','suzu','yuno','gyou'];
    const actionLines=[];
    let totalHeroTaken=0;
    for(let action=0;action<3;action++){
      battle.bossTurn=(battle.bossTurn||0)+1;
      const flame=(battle.bossTurn%2===0);
      const rawPerHit=flame?30:20;
      let perHit=nineTailDamageCut(rawPerHit);
      if(battle.defending)perHit=Math.max(1,Math.ceil(perHit*.5));
      if(progress.fourAbyssUnlocked)perHit=Math.max(perHit,Math.floor(perHit*Math.max(1,progress.level/100)));
      const hits=9,total=perHit*hits;
      for(const t of targets){
        let d=total;
        if(t==='gyou'&&battle.gyouHiddenGuard)d=Math.ceil(d*.25);
        const k=t==='hero'?'heroHP':t==='suzu'?'suzuHP':t==='yuno'?'yunoHP':'gyouHP';
        battle[k]=Math.max(0,battle[k]-d);
        if(t==='hero')totalHeroTaken+=d;
      }
      actionLines.push(`${action+1}回目 ${flame?'九頭灼炎':'九頭連牙'} ${perHit}×9=${total}`);
    }
    battle.gyouHiddenGuard=false;battle.defending=false;
    battleMessage=`九頭龍の3回行動！ ${actionLines.join(' / ')}${battle.soloHero?'':'（全体）'}`;
    addDamagePopup(`3 ACTION -${totalHeroTaken}`,250,205,'#ff796e');
    setBattleFx('hitHero',185,255);
    if(checkPartyWipe())return;battleActor='hero';battle.turn='enemyResult';battleCooldown=1.45;battleMenu='main';
    return;
  }
  if(battle&&battle.monsterId===990){postGameRaidBossTurn();return;}
  if(battle&&battle.monsterId===950){
    battle.bossTurn=(battle.bossTurn||0)+1;
    if(battle.enemyHP<=battle.enemyMaxHP*.5)battle.bossPhase=2;
    if(battle.enemyHP<=battle.enemyMaxHP*.25)battle.bossPhase=3;
    const phase=battle.bossPhase||1;
    const all=battle.bossTurn%3===0;
    const base=all?(phase>=2?72:52):(phase>=2?84:60);
    const targets=all?['hero','suzu','yuno','gyou']:[['hero','suzu','yuno','gyou'][Math.floor(Math.random()*4)]];
    let lines=[];
    for(const t0 of targets){
      const t=(battle.gyouGrandGuard||battle.gyouCover===t0)?'gyou':t0;
      let d=base+(phase>=3?18:0)+Math.floor(Math.random()*13);
      if(t==='hero'){d=Math.max(1,d-Math.floor(progress.def/5));battle.heroHP=Math.max(0,battle.heroHP-d);}
      else if(t==='suzu'){d=Math.max(1,d-Math.floor(suzumaruStats().def/5));battle.suzuHP=Math.max(0,battle.suzuHP-d);}
      else if(t==='yuno'){d=Math.max(1,d-Math.floor(yunoStats().def/5));battle.yunoHP=Math.max(0,battle.yunoHP-d);}
      else {
        d=Math.max(1,d-Math.floor(gyouStats().def/5));d=gyouShieldReduce(d);battle.gyouHP=Math.max(0,battle.gyouHP-d);
        const shieldMP=gyouShieldRecover(d);if(shieldMP>0)lines.push(`地脈の大盾 MP+${shieldMP}`);
      }
      lines.push(`${t==='hero'?heroName:t==='suzu'?'スズマル':t==='yuno'?'ユーノ':'ジュウ'} -${d}`);}
    battleMessage=`火山の古竜${phase>=3?'・激昂':phase>=2?'・覚醒':''}の${all?'「灼熱大咆哮」':'竜爪撃'}！ ${lines.join(' / ')}`;
    if(checkPartyWipe())return;battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};battle.turn='enemyResult';battleCooldown=1.3;return;
  }
  if(battle&&battle.monsterId===900){pirateCaptainTurn();return;}
  const ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();ensureGyouBattle();
  const attackers=battle.enemies?livingEnemies():[{name:battle.enemyName||'敵',kind:battle.enemyKind||''}];
  let totalHero=0,totalSuzu=0,totalYuno=0,totalGyou=0;
  const attackLines=[];
  attackers.forEach((foe,idx)=>{
    const baseDmg=(battle.monsterId>=960&&battle.monsterId<=963)?(14+Math.floor(Math.random()*9)):(5+Math.floor(Math.random()*5));
    let target='hero';
    if(battle.soloHero){
      target='hero';
    }else if(gyouJoinConfirmed && battle.monsterId>=400){
      if(battle.gyouGrandGuard||battle.gyouTauntTurns>0)target='gyou';
      else {const r=Math.random();target=r<.24?'hero':r<.46?'suzu':r<.68?'yuno':'gyou';}
    }else if(yunoJoined && battle.monsterId>=400){
      const r=Math.random();target=r<.34?'hero':r<.67?'suzu':'yuno';
    }else if(isPartyBattle()&&Math.random()<.4)target='suzu';
    if(!battle.soloHero && battle.gyouCover===target)target='gyou';

    const evadeChance=(battle.evadeAllTurns>0?(battle.evadeAllBonus||.30):0)+((battle.evadeTarget===target&&battle.evadeTurns>0)?(battle.evadeSingleBonus||.25):0);
    if(target!=='gyou'&&Math.random()<evadeChance){attackLines.push(`${foe.name} → ${target==='hero'?heroName:target==='suzu'?'スズマル':'ユーノ'} 回避！`);return;}
    const ep=[[650,235],[770,235],[610,310],[720,320],[830,310]][Math.min(idx,4)]||[700,245];
    addDamagePopup('攻撃！',ep[0],ep[1]-45,'#ffcf9d');
    let dmg=baseDmg;
    if(target==='gyou'){
      let def=gs.def+(battle.gyouDefTurns>0?10:0);dmg=Math.max(1,baseDmg-Math.floor(def/4));dmg=gyouShieldReduce(dmg);
      battle.gyouHP=Math.max(0,battle.gyouHP-dmg);totalGyou+=dmg;
      const shieldMP=gyouShieldRecover(dmg);
      if(battle.gyouManaGuard){
        const before=battle.gyouMP,mp=Math.max(1,Math.ceil(dmg/2));battle.gyouMP=Math.min(battle.gyouMaxMP,battle.gyouMP+mp);
        const skillMP=battle.gyouMP-before;
        attackLines.push(`${foe.name} → ジュウ ${dmg} / 土脈+${skillMP}${shieldMP?` / 盾+${shieldMP}`:''}`);
      }else attackLines.push(`${foe.name} → ジュウ ${dmg}${shieldMP?` / 盾MP+${shieldMP}`:''}`);
      if(battle.gyouCounter){const cd=Math.max(5,Math.floor(gs.atk*.8));damageEnemy(cd);attackLines.push(`迎撃 ${cd}`);}
    }else if(target==='yuno'){dmg=Math.max(1,baseDmg-Math.floor(ys.def/4));battle.yunoHP=Math.max(0,battle.yunoHP-dmg);totalYuno+=dmg;attackLines.push(`${foe.name} → ユーノ ${dmg}`);}
    else if(target==='suzu'){dmg=Math.max(1,baseDmg-Math.floor(ss.def/4));battle.suzuHP=Math.max(0,battle.suzuHP-dmg);totalSuzu+=dmg;attackLines.push(`${foe.name} → スズマル ${dmg}`);if(battle.suzuCounter){const cd=suzuFirePower(Math.max(7,Math.floor(ss.atk*.9)+6));damageEnemy(cd);attackLines.push(`炎返し ${cd}`);setBattleFx('fire');}}
    else{
      dmg=Math.max(1,(battle.defending?Math.floor(baseDmg/2):baseDmg)-Math.floor(progress.def/4));
      dmg=nineTailDamageCut(dmg);
      battle.heroHP=Math.max(0,battle.heroHP-dmg);totalHero+=dmg;attackLines.push(`${foe.name} → ${heroName} ${dmg}`);
    }
  });
  battle.defending=false;
  if(totalHero>0){addDamagePopup(`-${totalHero}`,185,215,'#ff796e');setBattleFx('hitHero',185,255);}
  if(totalSuzu>0)addDamagePopup(`-${totalSuzu}`,265,215,'#ff796e');
  if(totalYuno>0)addDamagePopup(`-${totalYuno}`,360,215,'#ff796e');
  if(totalGyou>0)addDamagePopup(`-${totalGyou}`,455,215,'#ff796e');
  battleMessage=`敵の攻撃！ ${attackLines.join(' / ')}`;
  if(battle.regenTurns>0){const heal=battle.regenPower||7;battle.heroHP=Math.min(progress.maxHP,battle.heroHP+heal);battle.suzuHP=Math.min(battle.suzuMaxHP,battle.suzuHP+heal);if(battle.yunoHP!==undefined)battle.yunoHP=Math.min(battle.yunoMaxHP,battle.yunoHP+heal);if(battle.gyouHP!==undefined)battle.gyouHP=Math.min(battle.gyouMaxHP,battle.gyouHP+heal);battle.regenTurns--;battleMessage+=` / そよぎの輪 +${heal}`;} battleMessage+=applyPartyMPRegen();
  if(battle.evadeAllTurns>0)battle.evadeAllTurns--;if(battle.evadeTurns>0)battle.evadeTurns--;
  if(battle.gyouDefTurns>0)battle.gyouDefTurns--;if(battle.gyouTauntTurns>0)battle.gyouTauntTurns--;
  battle.gyouCover=null;battle.gyouCounter=false;battle.gyouGrandGuard=false;battle.suzuCounter=false;
  if(isPartyBattle())battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  if(checkPartyWipe())return;
  battle.turn='enemyResult';battleCooldown=1.15;
}
function finishBattle(){
  if(battle && battle.monsterId===1290){
    battle=null;scene='ngPlusEnding';dialogIndex=0;touchUI.classList.add('hidden');saveGame();return;
  }

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

  if(battle && battle.monsterId===480){
    tsukipopoBattleCleared=true;
    progress.gold+=24;const leveled=gainExp(34);saveProgress();
    battle=null;scene='sarubibiResolve';dialogIndex=0;touchUI.classList.add('hidden');saveGame();return;
  }

  if(battle && battle.monsterId===460){
    bananaSharkAlive=false;
    const expGain=55,goldGain=35;
    progress.gold+=goldGain;const leveled=gainExp(expGain);saveProgress();
    battle=null;scene='bananaSharkAfter';dialogIndex=0;touchUI.classList.add('hidden');saveGame();return;
  }
  if(battle && battle.monsterId>=470 && battle.monsterId<=475 && battle.monsterId!==472){
    const mon=volcanoSurveyMobs.find(m=>m.id===battle.monsterId);
    if(mon)mon.alive=false;
    const isBear=(battle.enemyKind==='durianBear');const expGain=isBear?48:38,goldGain=isBear?30:22;
    progress.gold+=goldGain;const leveled=gainExp(expGain);saveProgress();
    battle=null;scene='volcanoSurveyField';touchUI.classList.remove('hidden');
    flashText=leveled?`レベルアップ！ Lv.${progress.level}`:`${mon?mon.name:'魔物'}を倒した！`;
    flashTimer=2.0;saveGame();return;
  }

  if(battle && battle.monsterId===472){
    progress.gold+=42;const leveled=gainExp(58);saveProgress();
    finalBearWave++;
    if(finalBearWave<3){
      battle=null;scene='finalBearField';touchUI.classList.remove('hidden');
      finalBearHero.x=Math.max(150,finalBear.x-230);
      flashText=`第${finalBearWave}波を撃破！ 次の3体が現れた！`;flashTimer=2.2;saveGame();return;
    }
    finalBear.alive=false;finalBearWave=0;
    battle=null;scene='volcanoBearAfter';dialogIndex=0;touchUI.classList.add('hidden');saveGame();return;
  }

  if(battle && battle.monsterId>=980 && battle.monsterId<=982){
    progress.gold+=220+postGameRaidWave*80;gainExp(260+postGameRaidWave*80);postGameRaidWave++;
    battle=null;touchUI.classList.remove('hidden');saveProgress();saveGame();
    startPostGameRaidWave();return;
  }
  if(battle && battle.monsterId>=1101 && battle.monsterId<=1104){
    const m=sealedCaveMobs.find(x=>x.id===battle.monsterId);if(m)m.alive=false;
    gainExp(2500);progress.gold+=1200;saveProgress();battle=null;scene='sealedCave';touchUI.classList.remove('hidden');saveGame();return;
  }
  if(battle && battle.monsterId===1199){
    const clearedWithFour=!!(progress.fourAbyssUnlocked && !battle.soloHero);
    progress.orochiDefeated=true;progress.hiddenSkillsUnlocked=true;progress.nineTailSoloQuest=true;
    if(clearedWithFour)progress.ngPlusUnlocked=true;
    gainExp(15000);progress.gold+=10000;saveProgress();battle=null;scene='sealedCave';sealedCaveHero.x=760;sealedCaveHero.y=430;touchUI.classList.remove('hidden');
    flashText=clearedWithFour?'九頭龍を討伐！「はじめから+」解禁！':'九頭龍を討伐した！';flashTimer=3;saveGame();return;
  }
  if(battle && battle.monsterId===990){
    progress.postGamePirateRaidCleared=true;progress.klausDefeated=true;postGameRaidUnlocked=false;
    progress.gold+=1000;gainExp(900);saveProgress();
    battle=null;scene='postGameRaidClear';dialogIndex=0;touchUI.classList.remove('hidden');saveGame();return;
  }
  if(battle && battle.monsterId>=970 && battle.monsterId<=973){const ids=battle.enemies?battle.enemies.map(e=>e.id):[battle.monsterId];ids.forEach(id=>{const m=postGameVolcanoMobs.find(x=>x.id===id);if(m){m.alive=false;m.respawn=10;}});const count=battle.enemies?battle.enemies.length:1,expGain=150+(count-1)*45,goldGain=90+(count-1)*30;progress.gold+=goldGain;const leveled=gainExp(expGain);saveProgress();battle=null;scene='postGameVolcano';touchUI.classList.remove('hidden');flashText=leveled?`レベルアップ！ Lv.${progress.level}　SP+1`:`経験値 ${expGain} / ${goldGain}G 獲得！`;flashTimer=2.4;saveGame();return;}
  if(battle && battle.monsterId>=960 && battle.monsterId<=963){
    const mon=dragonTrailMobs.find(m=>m.id===battle.monsterId);
    if(mon){mon.alive=false;mon.respawn=10;}
    const count=battle.enemies?battle.enemies.length:1;
    const expGain=145+(battle.monsterId-960)*20+(count-2)*45;
    const goldGain=85+(battle.monsterId-960)*15+(count-2)*30;
    progress.gold+=goldGain;const leveled=gainExp(expGain);saveProgress();
    battle=null;scene='dragonTrail';touchUI.classList.remove('hidden');
    flashText=leveled?`レベルアップ！ Lv.${progress.level}　SP+1`:`経験値 ${expGain} / ${goldGain}G 獲得！`;
    flashTimer=2.4;saveGame();return;
  }
  if(battle && battle.monsterId===950){
    progress.postDragonDefeated=true;saveProgress();battle=null;scene='postDragonClear';dialogIndex=0;saveGame();return;
  }
  if(battle && battle.monsterId===900){
    progress.pirateCaptainDefeated=true;saveProgress();
    battle=null;scene='pirateCaptainAfter';dialogIndex=0;touchUI.classList.add('hidden');saveGame();return;
  }

  if(battle && battle.monsterId===450){
    takezoScout.alive=false;takezoScoutDefeated=true;
    const expGain=32,goldGain=24;
    progress.gold+=goldGain;const leveled=gainExp(expGain);saveProgress();
    battle=null;scene='takezoScoutAfter';dialogIndex=0;touchUI.classList.add('hidden');
    saveGame();return;
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
    const items=[
      {name:'風切りの小剣',desc:'主人公の攻撃力 +4',flavor:'風を受け流す軽量な小剣。',price:85,bought:progress.shopBought.windKnife},
      {name:'風渡りの剣',desc:'主人公の攻撃力 +6',flavor:'風の村で鍛えた、扱いやすい片手剣。',price:135,bought:progress.shopBought.windSword}
    ];
    items.forEach((it,i)=>{
      const y=105+i*130,sel=sarubibiWeaponSelection===i;
      outlineRect(80,y,800,112,it.bought?'#576575':sel?'#fff6d8':'#eefaf7',sel?'#e6bd63':'#64aaa8',sel?4:2);
      text(`${sel?'▶ ':''}${it.name}`,115,y+30,22,'left',it.bought?'#c7d0d6':'#173a3e');
      text(it.desc,115,y+60,17,'left',it.bought?'#aab5bd':'#395f63');
      text(it.bought?'購入済み':`${it.price}G`,820,y+52,19,'right',it.bought?'#c7d0d6':'#2a7e78');
      text(it.flavor,115,y+88,14,'left',it.bought?'#aab5bd':'#526f72');
    });
    text('↑↓ / タップ：商品選択　A / Enter：購入',480,386,14,'center','#ccebe7');
  }else{
    outlineRect(80,125,800,120,'#eefaf7','#64aaa8',2);
    text('回復薬',115,157,24,'left','#173a3e');
    text('戦闘中、味方1人のHPを25回復',115,193,18,'left','#395f63');
    text('20G',820,184,20,'right','#2a7e78');
    text(`所持数：${progress.items.potion}`,115,224,15,'left','#526f72');
  }
  outlineRect(315,410,330,52,'#dff4f2','#61a7a5',2);text('購入する',480,436,20,'center','#173a3e');
  outlineRect(315,475,330,45,'#304e58','#66888e',2);text('店を出る',480,497,18,'center','#e5f3f1');
}
function sarubibiShopBuy(){
  if(sarubibiShopType==='weapon'){
    const sword=sarubibiWeaponSelection===1;
    const key=sword?'windSword':'windKnife',price=sword?135:85,atk=sword?6:4,name=sword?'風渡りの剣':'風切りの小剣';
    if(progress.shopBought[key]){flashText='もう購入済みです';flashTimer=1.6;return;}
    if(progress.gold<price){flashText='お金が足りません';flashTimer=1.6;return;}
    progress.gold-=price;progress.atk+=atk;progress.shopBought[key]=true;saveProgress();saveGame();
    flashText=`${name}を装備した！ 攻撃力+${atk}`;flashTimer=2.1;
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

function hiddenVulnerability(amount){return battle&&battle.vulnerableTurns>0?Math.floor(amount*1.5):amount;}
function damageMultiHitDisplay(amount,index=0){
  amount=hiddenVulnerability(Math.max(0,Math.floor(amount)));
  if(!battle.enemies){
    if(battle.enemyHP>0){
      battle.enemyHP=Math.max(0,battle.enemyHP-amount);
      addDamagePopup(`${amount}`,700,175,'#ffffff');
    }else{
      addDamagePopup(`${amount}`,700,175,'#bfe7ff');
    }
    return amount;
  }
  let live=livingEnemies();
  let target=live[Math.min(index,Math.max(0,live.length-1))];
  // If the final enemy was just defeated, keep displaying the remaining hits on that final slot.
  if(!target){
    target=battle.enemies[battle.enemies.length-1];
    const idx=battle.enemies.length-1,spots=[[650,235],[770,235],[610,310],[720,320],[830,310]];
    const p=spots[Math.min(idx,spots.length-1)]||[700,245];
    addDamagePopup(`${amount}`,p[0],p[1]-30,'#bfe7ff');
    return amount;
  }
  const idx=battle.enemies.indexOf(target),spots=[[650,235],[770,235],[610,310],[720,320],[830,310]];
  const p=spots[Math.min(idx,spots.length-1)]||[700,245];
  target.hp=Math.max(0,target.hp-amount);
  addDamagePopup(`${amount}`,p[0],p[1]-30,'#ffffff');
  syncPrimaryEnemy();
  return amount;
}
function damageEnemy(amount,index=0){
  amount=hiddenVulnerability(Math.max(0,Math.floor(amount)));
  if(!battle.enemies){
    if(battle.monsterId===900)amount=Math.min(amount,180);
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
  base=hiddenVulnerability(Math.max(0,Math.floor(base)));
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
    if(e.kind==='blackDragon')dmg=Math.max(1,Math.floor(dmg*.5));e.hp=Math.max(0,e.hp-dmg);
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





function startTsukipopoBattle(){
  const ss=suzumaruStats(),ys=yunoStats();
  yunoJoined=true; // this fight happens while Yuno is already accompanying the party
  const enemies=[
    {name:'ツキポポムシA',kind:'beanMarten',hp:58,maxHP:58},
    {name:'ツキポポムシB',kind:'beanMarten',hp:58,maxHP:58}
  ];
  battle={heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    enemies,enemyHP:58,enemyMaxHP:58,monsterId:480,enemyName:enemies[0].name,enemyKind:enemies[0].kind,
    turn:'player',defending:false};
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage='ツキポポの蜜に寄ってきた魔物が襲いかかってきた！';
  scene='battle';touchUI.classList.add('hidden');
}

function startBananaSharkBattle(){
  const ss=suzumaruStats(),ys=yunoStats();
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    regenTurns:0,hasteTarget:null,evadeTarget:null,evadeAllTurns:0,
    enemyHP:135,enemyMaxHP:135,monsterId:460,enemyName:'バナナザメA',enemyKind:'bananaShark',
    enemies:[
      {name:'バナナザメA',kind:'bananaShark',hp:135,maxHP:135},
      {name:'バナナザメB',kind:'bananaShark',hp:125,maxHP:125},
      {name:'バナナザメC',kind:'bananaShark',hp:130,maxHP:130}
    ],
    turn:'player',defending:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage='バナナザメ3体が群れで襲いかかってきた！';
  scene='battle';touchUI.classList.add('hidden');
}
function startVolcanoSurveyBattle(mon){
  const ss=suzumaruStats(),ys=yunoStats();
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    regenTurns:0,hasteTarget:null,evadeTarget:null,evadeAllTurns:0,
    enemyHP:mon.hp,enemyMaxHP:mon.maxHP,monsterId:mon.id,enemyName:mon.name,enemyKind:mon.kind,
    turn:'player',defending:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage=`${mon.name}が現れた！`;
  scene='battle';touchUI.classList.add('hidden');
}

function startTakezoScoutBattle(){
  const ss=suzumaruStats(),ys=yunoStats();
  const enemies=[
    {name:'海賊ネコ偵察兵',kind:'pirateCat',hp:64,maxHP:64},
    {name:'海賊イヌ偵察兵',kind:'pirateDog',hp:55,maxHP:55},
    {name:'海賊タヌキ偵察兵',kind:'pirateTanuki',hp:58,maxHP:58}
  ];
  battle={
    heroHP:progress.maxHP,heroMP:progress.maxMP,
    suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,
    yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,
    regenTurns:0,hasteTarget:null,evadeTarget:null,evadeAllTurns:0,
    enemies,enemyHP:64,enemyMaxHP:64,
    monsterId:450,enemyName:'海賊偵察小隊',enemyKind:'pirateCat',
    turn:'player',defending:false
  };
  damagePopups=[];battleMenu='main';battleActor='hero';
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
  battleMessage='海賊団の偵察小隊に見つかった！';
  scene='battle';touchUI.classList.add('hidden');
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
  battleChoiceText={hero:'未選択',suzu:'未選択',yuno:'未選択',gyou:'未選択'};
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

function syncStoryParty(){
  // A cleared save has already passed every join event. Rebuild the full
  // postgame party even when entering from the title after a page reload.
  if(progress.gameCleared){
    suzumaruActive=true;suzumaruJoined=true;
    yunoJoined=true;
    gyouJoinConfirmed=true;gyouJoined=true;
    return;
  }
  gyouJoined=!!gyouJoinConfirmed;
}
function drawMenu(){
  syncStoryParty();
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
    if(gyouJoinConfirmed){
      members.push({key:'gyou',name:'ジュウ',draw:drawGyou,stats:gyouStats(),sp:progress.gyouSP||0,desc:'土 / 守備・槍型',border:'#8e8b62'});
    }
    if(!(suzumaruActive||suzumaruJoined))members.push({key:'lockedSuzu',name:'???（未加入）',locked:true,border:'#536273'});
    if(!yunoJoined)members.push({key:'lockedYuno',name:'???（未加入）',locked:true,border:'#536273'});
    if(!gyouJoinConfirmed)members.push({key:'lockedGyou',name:'???（未加入）',locked:true,border:'#536273'});

    const n=members.length;
    const gap=14, left=35, totalW=890;
    const pw=(totalW-gap*(n-1))/n;
    members.forEach((m,i)=>{
      const x=left+i*(pw+gap);
      outlineRect(x,140,pw,315,'#182b48',m.border,2);
      if(m.locked){
        text('？',x+pw/2,230,48,'center','#718296',800);
        text(m.name,x+pw/2,292,n>=4?15:18,'center','#a9b4c0',800);
        text('まだ仲間になっていません',x+pw/2,350,n>=4?10:13,'center','#718296');
      }else{
        const base=n>=4?1.0:n>=3?1.18:1.5;
        m.draw(x+pw/2,225,m.key==='hero'?base*.86:base);
        text(m.name,x+18,292,21,'left','#ffffff',800);
        text(`Lv.${progress.level}`,x+pw-18,292,15,'right','#d9edf7');
        text(`HP ${m.stats.maxHP}　MP ${m.stats.maxMP}`,x+18,327,15,'left','#ffffff');
        text(`攻 ${m.stats.atk}　防 ${m.stats.def}`,x+18,357,15,'left','#ffffff');
        text(`SP ${m.sp}`,x+18,387,16,'left','#ffe7a5');
        text(m.desc,x+18,420,n>=4?10:n>=3?12:14,'left','#bcd7e5');
      }
    });
    text('レベルはパーティ共通。戦闘終了後はHP・MPが全回復します。',480,492,15,'center','#bad9e7');
  }else if(menuPage==='skill'){
    // character switch buttons
    const suzuEnabled=(suzumaruActive||suzumaruJoined);
    const yunoEnabled=yunoJoined;
    const gyouEnabled=gyouJoinConfirmed;
    const tx=[35,265,495,725],tw=205;
    outlineRect(tx[0],140,tw,42,menuCharacter==='hero'?'#dff4fb':'#31455f','#78b9d7',2);
    text(heroName,tx[0]+tw/2,161,15,'center',menuCharacter==='hero'?'#17324a':'#d9e6ef');
    outlineRect(tx[1],140,tw,42,menuCharacter==='suzu'?'#ffe1d7':'#31455f',suzuEnabled?'#c76e58':'#536273',2);
    text(suzuEnabled?'スズマル':'???（未加入）',tx[1]+tw/2,161,14,'center',suzuEnabled?(menuCharacter==='suzu'?'#65291f':'#e9d8d3'):'#758596');
    outlineRect(tx[2],140,tw,42,menuCharacter==='yuno'?'#d8f2ed':'#31455f',yunoEnabled?'#59aaa6':'#536273',2);
    text(yunoEnabled?'ユーノ':'???（未加入）',tx[2]+tw/2,161,14,'center',yunoEnabled?(menuCharacter==='yuno'?'#174c4b':'#d6ece8'):'#758596');
    outlineRect(tx[3],140,tw,42,menuCharacter==='gyou'?'#ece8ce':'#31455f',gyouEnabled?'#999064':'#536273',2);
    text(gyouEnabled?'ジュウ':'???（未加入）',tx[3]+tw/2,161,14,'center',gyouEnabled?(menuCharacter==='gyou'?'#494427':'#e5e0c8'):'#758596');

    if(menuCharacter==='gyou' && gyouEnabled){
      text(`ジュウ SP：${progress.gyouSP||0}`,45,212,17,'left','#f4efcf');
      const gsks=[
        ['fortify','岩守り','自分の防御UP'],
        ['cover','かばう','仲間1人を身代わり'],
        ['taunt','挑発','敵に狙われやすい'],
        ['manaGuard','土脈吸収','被ダメージでMP回復'],
        ['healGuard','守りの呼吸','防御＋自分を回復'],
        ['doubleThrust','二段突き','槍で単体2回攻撃'],
        ['counter','迎撃の構え','攻撃を受けて反撃'],
        ['earthBreath','大地の息吹','パッシブ：毎ターンHP回復']
      ];
      gsks.forEach((s,i)=>{
        const key=s[0],col=i%4,row=Math.floor(i/4),x=35+col*225,y=238+row*103,lv=progress.gyouSkills[key]||0,max=gyouSkillMax(key),cost=gyouSkillCost(key,lv);
        const passive=(key==='earthBreath');
        outlineRect(x,y,210,86,passive?'#514c30':'#3c3b2d',passive?'#d6c865':'#999064',passive?3:2);
        text(s[1]+(passive?'（パッシブ）':lv>1?` Lv.${lv}`:''),x+12,y+25,passive?13:16,'left',passive?'#fff2a8':'#f4efcf',800);
        text(s[2],x+12,y+49,passive?11:12,'left',passive?'#ece4b4':'#d7d1ae');
        text(lv>=max?(max>1?`Lv.${lv} 最大`:'習得済み'):(lv?`次 Lv.${lv+1} SP${cost}`:`習得 SP${cost}`),x+196,y+73,11,'right',lv>=max?'#b9d29e':'#ffe4a0');
      });
      const ult=progress.gyouGrandGuard;
      outlineRect(260,450,440,44,ult?'#6f6b4d':'#2e3340',ult?'#d7c86e':'#697181',2);
      text(ult?'村長奥義「大守護」習得済み':'村長との特訓で奥義「大守護」が開放',480,472,14,'center',ult?'#fff0a8':'#aab0b9'); if(progress.hiddenSkillsUnlocked){outlineRect(710,450,180,55,progress.hiddenSkills?.gyou?'#ece8ce':'#2e3340','#999064',2);text('天地崩槍',800,472,15,'center',progress.hiddenSkills?.gyou?'#494427':'#fff',900);text(progress.hiddenSkills?.gyou?'習得済み':'SP100',800,494,12,'center','#ffe7a5');}
    }else if(menuCharacter==='yuno' && yunoEnabled){
      text(`ユーノ SP：${progress.yunoSP||0}`,55,215,18,'left','#d8fff5');
      const ysks=[
        ['heal','風の癒し','全体回復'],['regen','そよぎの輪','全体徐々に回復'],
        ['wind','風刃嵐','敵全体攻撃'],['haste','疾風','1人を2回行動'],
        ['mpRegenAll','風巡りの泉','全体MP徐々に回復'],['archery','二連射','Lv2で風纏三連射'],
        ['windFlow','風巡の呼吸','パッシブ：毎ターンMP回復']
      ];
      ysks.forEach((s,i)=>{
        const key=s[0],col=i%4,row=Math.floor(i/4),x=35+col*225,y=245+row*105,lv=progress.yunoSkills[key]||0,max=yunoSkillMax(key);
        outlineRect(x,y,210,88,key==='windFlow'?'#355a4f':'#183a43',key==='windFlow'?'#d2d978':'#59aaa6',key==='windFlow'?3:2);
        text(s[1]+(key==='windFlow'?'（パッシブ）':''),x+12,y+25,key==='windFlow'?13:15,'left',key==='windFlow'?'#fff6b3':'#d8fff5',800);
        text(s[2],x+12,y+49,11,'left',key==='windFlow'?'#e8efbd':'#b9dfd9');
        if(lv>=max)text(max>1?`Lv.${lv} 最大`:'習得済み',x+195,y+72,11,'right','#8fc8bd');
        else{const cost=yunoSkillCost(key,lv);text(lv?`次 Lv.${lv+1} SP${cost}`:`習得 SP${cost}`,x+195,y+72,10,'right','#ffe7a5');}
      }); if(progress.hiddenSkillsUnlocked){outlineRect(710,465,180,55,progress.hiddenSkills?.yuno?'#d8f2ed':'#31455f','#59aaa6',2);text('天風の祝福',800,487,15,'center',progress.hiddenSkills?.yuno?'#174c4b':'#fff',900);text(progress.hiddenSkills?.yuno?'習得済み':'SP100',800,509,12,'center','#ffe7a5');}
    }else if(menuCharacter==='suzu' && suzuEnabled){
      text(`スズマル SP：${progress.suzuSP||0}`,70,215,18,'left','#ffe5c8');

      outlineRect(70,245,385,82,'#ffe0d6','#c95f48',2);
      text(suzuSingleSkillName(),95,270,20,'left','#6b231d');
      {
        const sl=progress.suzuSkills?.single||0;
        const nxt=sl<1?'火炎斬りを強化':sl===1?'次：爆炎斬り':sl===2?'次：豪炎爆斬':sl===3?'次：極炎斬り SP4':'単体系・最大強化';
        text(nxt,95,300,15,'left','#8d4a3b');
      }
      text(`現在：Lv.${progress.suzuSkills?.single||0}`,420,285,15,'right','#6b231d');

      outlineRect(505,245,385,82,'#ffe8dc','#d47b55',2);
      text(suzuAllSkillName(),530,270,20,'left','#703525');
      {
        const al=progress.suzuSkills?.all||0;
        const nxt=al<1?'習得：火走り SP1':al===1?'次：炎走陣 SP2':al===2?'次：烈火走陣 SP3':al===3?'次：爆炎走陣 SP4':al===4?'次：獄炎走陣 SP5':'全体系・最大強化';
        text(nxt,530,300,15,'left','#8d5847');
      }
      text(`現在：Lv.${progress.suzuSkills?.all||0}`,855,285,15,'right','#703525');

      text('火炎斬りはLv2から二連斬。Lv3・Lv4は回数を増やさず一撃ずつ強化。',480,350,14,'center','#ffd5c6'); if(progress.hiddenSkillsUnlocked){outlineRect(710,455,180,55,progress.hiddenSkills?.suzu?'#ffe0d6':'#3b4653','#c95f48',2);text('紅蓮爆砕',800,477,15,'center',progress.hiddenSkills?.suzu?'#6b231d':'#fff',900);text(progress.hiddenSkills?.suzu?'習得済み':'SP100',800,499,12,'center','#ffe7a5');}
      outlineRect(70,365,390,70,(progress.suzuSkills?.counter||0)>=1?'#ffe0d6':'#3b4653',(progress.suzuSkills?.counter||0)>=1?'#c95f48':'#7c8790',2);
      text('炎返し',95,390,19,'left',(progress.suzuSkills?.counter||0)>=1?'#6b231d':'#d9dde0',800);
      text('攻撃を受けた時に剣で反撃',95,414,13,'left',(progress.suzuSkills?.counter||0)>=1?'#8d4a3b':'#aab0b5');
      text((progress.suzuSkills?.counter||0)>=1?'習得済み':'必要 SP3',435,414,12,'right',(progress.suzuSkills?.counter||0)>=1?'#7d3a2d':'#ffe7a5',800);
      {
        const fl=progress.suzuSkills?.fightingFlame||0;
        outlineRect(500,365,390,70,fl?'#ffe7d1':'#3b4653',fl?'#e08a4e':'#7c8790',2);
        text('闘炎（パッシブ）',525,390,18,'left',fl?'#6b2d1e':'#d9dde0',800);
        text(fl>=2?'毎ターン攻撃+5% / 上限なし':fl===1?'毎ターン攻撃+3% / 上限なし':'長期戦ほど攻撃力上昇',525,414,12,'left',fl?'#8d4a3b':'#aab0b5');
        text(fl>=2?'Lv.2 最大':fl===1?'次 Lv.2 SP3':'習得 SP2',865,414,11,'right',fl?'#8a4931':'#ffe7a5',800);
      }
      text('闘炎は炎獣のグローブの毎ターン攻撃上昇と重複します。',480,470,14,'center','#ffffff');
    }else{
      text(`スキルポイント：${progress.sp}`,55,212,21,'left','#ffe8a8');

      // 主人公スキルツリー：横幅を整理し、回復・魔力ルートも読みやすく表示。
      const il=progress.heroIceSkill||0;
      const nodeW=205,nodeH=66,gap=20,startX=45;
      const iceNodes=[
        ['氷結斬り','MP7 / 単体1回',1],
        ['氷結二段斬り','MP9 / 単体2回',1],
        ['氷結三連斬り','MP11 / 単体3回',2]
      ];
      text('氷剣ルート',45,239,15,'left','#bfe7f6',800);
      iceNodes.forEach((n,i)=>{
        const x=startX+i*(nodeW+gap),need=i+1,owned=il>=need,next=il===i;
        outlineRect(x,252,nodeW,nodeH,owned?'#b9d9e8':next?'#e7f5fb':'#29394e',owned?'#6aaacb':next?'#78b9d7':'#536273',2);
        text(n[0],x+12,275,16,'left',owned?'#17324a':next?'#18334a':'#8192a0',800);
        text(n[1],x+12,295,11,'left',owned?'#35566d':next?'#3d5d73':'#697b89');
        text(owned?'習得済み':next?`必要 SP${n[2]}`:'前の技を習得',x+nodeW-10,311,10,'right',owned?'#356b7b':next?'#3d6f8a':'#74838d',800);
        if(i<2){ctx.strokeStyle=owned?'#83bfd6':'#536273';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+nodeW+3,285);ctx.lineTo(x+nodeW+gap-4,285);ctx.stroke();}
      });

      text('氷のつぶて派生（初期技から2方向）',45,343,14,'left','#bfe7f6',800);
      const pr=progress.heroPebbleRandom||0, pa=progress.heroPebbleAll||0;
      const pebNodes=[
        [45,356,'氷つぶて乱射II','ランダム3発',1,pr>=1,pr===0],
        [245,356,'氷つぶて乱射III','ランダム5発',1,pr>=2,pr===1],
        [445,356,'氷つぶて乱射IV','ランダム7発',2,pr>=3,pr===2],
        [45,425,'氷晶波','敵全体',1,pa>=1,pa===0],
        [245,425,'氷晶大波','全体攻撃強化',2,pa>=2,pa===1]
      ];
      pebNodes.forEach(n=>{
        const [x,y,name,desc,cost,owned,next]=n;
        outlineRect(x,y,180,58,owned?'#c8e2ed':next?'#e7f5fb':'#29394e',owned?'#6aaacb':next?'#78b9d7':'#536273',2);
        text(name,x+10,y+20,13,'left',owned?'#17324a':next?'#18334a':'#8192a0',800);
        text(desc,x+10,y+39,10,'left',owned?'#35566d':next?'#3d5d73':'#697b89');
        text(owned?'習得済み':next?`SP${cost}`:'要前段階',x+170,y+52,9,'right',owned?'#356b7b':next?'#3d6f8a':'#74838d');
      });

      const hh=progress.heroHealSkill||1, hm=progress.heroManaSkill||0;
      text('回復・魔力ルート',690,239,15,'left','#bfe7f6',800);
      outlineRect(690,252,225,92,'#e7f5fb','#78b9d7',2);
      const healName=hh>=4?'九尾大水癒':hh>=3?'大水癒':hh>=2?'水の大いやし':'水のいやし';
      text(healName,705,278,18,'left','#17324a',800);
      text(hh>=4?'味方全体 最大HP75%回復 / MP18':hh>=3?'味方全体 HP130回復 / MP12':hh>=2?'HP120回復 / MP8':'HP50回復 / MP5',705,302,11,'left','#3d5d73');
      text(hh>=4?'Lv.4 最大':hh===3?'次 Lv.4　SP25':hh===2?'次 Lv.3　SP2':'次 Lv.2　SP1',900,329,11,'right','#3d6f8a',800);

      outlineRect(690,360,225,92,hm?'#c8e2ed':'#e7f5fb',hm?'#6aaacb':'#78b9d7',2);
      text(hm>=2?'水脈の恵み':'水脈の雫',705,386,18,'left','#17324a',800);
      text(hm>=2?'味方1人 MP32回復 / MP6':'味方1人 MP18回復 / MP6',705,410,12,'left','#3d5d73');
      text(hm>=2?'Lv.2 最大':hm===1?'次 Lv.2　SP2':'必要 SP1',900,438,11,'right',hm?'#356b7b':'#3d6f8a',800);

      const mf=progress.heroMagicFlow||0;
      outlineRect(690,460,225,62,mf?'#d8eef7':'#26394b',mf?'#6aaacb':'#668398',2);
      text('水魔の高まり（パッシブ）',702,481,14,'left',mf?'#17324a':'#e0edf4',800);
      text(mf>=2?'魔法威力 +5%/ターン':mf===1?'魔法威力 +3%/ターン':'氷結斬り系は対象外',702,501,10,'left',mf?'#35566d':'#b7c7d0'); if(progress.hiddenSkillsUnlocked){outlineRect(470,465,190,55,progress.hiddenSkills?.hero?'#d9efff':'#26394b','#557fd0',2);text('デスブリザード',565,487,14,'center',progress.hiddenSkills?.hero?'#17324a':'#fff',900);text(progress.hiddenSkills?.hero?'習得済み':'SP100',565,509,12,'center','#ffe7a5');}
      text(mf>=2?'Lv.2 最大':mf===1?'次 Lv.2 SP2':'習得 SP1',900,515,10,'right',mf?'#356b7b':'#ffe7a5',800);
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
    if(x<250){menuCharacter='hero';return;}
    if(x>=250 && x<480 && (suzumaruActive||suzumaruJoined)){menuCharacter='suzu';return;}
    if(x>=480 && x<715 && yunoJoined){menuCharacter='yuno';return;}
    if(x>=715 && gyouJoinConfirmed){menuCharacter='gyou';return;}
  }

  if(menuPage==='skill'&&progress.hiddenSkillsUnlocked&&y>=445&&y<=525){
    const buyHidden=(who,spKey)=>{if(progress.hiddenSkills[who]){flashText='隠れスキルは習得済み';flashTimer=1.4;return true;}if((progress[spKey]||0)<100){flashText='SPが足りない（必要 100）';flashTimer=1.7;return true;}progress[spKey]-=100;progress.hiddenSkills[who]=true;saveProgress();saveGame();flashText='隠れスキルを習得！';flashTimer=2;return true;};
    if(menuCharacter==='hero'&&x>=470&&x<=660){buyHidden('hero','sp');return;}
    if(menuCharacter==='suzu'&&x>=710&&x<=900){buyHidden('suzu','suzuSP');return;}
    if(menuCharacter==='yuno'&&x>=710&&x<=900){buyHidden('yuno','yunoSP');return;}
    if(menuCharacter==='gyou'&&x>=710&&x<=900){buyHidden('gyou','gyouSP');return;}
  }
  if(menuPage==='skill' && menuCharacter==='gyou' && gyouJoinConfirmed && y>=238 && y<=430){
    const col=Math.floor((x-35)/225),row=Math.floor((y-238)/103);
    if(col>=0&&col<4&&row>=0&&row<2){
      const keys=['fortify','cover','taunt','manaGuard','healGuard','doubleThrust','counter','earthBreath'];
      const k=keys[row*4+col];
      if(!k)return;
      const lv=progress.gyouSkills[k]||0,max=gyouSkillMax(k);
      if(lv>=max){flashText=max>1?'この技は最大強化です':'習得済みです';flashTimer=1.4;return;}
      const cost=gyouSkillCost(k,lv);
      if((progress.gyouSP||0)<cost){flashText=`ジュウのSPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
      progress.gyouSP-=cost;progress.gyouSkills[k]=lv+1;
      saveProgress();saveGame();
      flashText=k==='earthBreath'
        ?(lv===0?'パッシブ「大地の息吹」を習得！':'「大地の息吹」をLv.2に強化！')
        :(lv===0?'ジュウが新しい守護技を習得！':`${k==='taunt'?'挑発':'二段突き'}をLv.2に強化！`);
      flashTimer=1.8;return;
    }
  }

  if(menuPage==='skill' && menuCharacter==='yuno' && yunoJoined && y>=245 && y<=455){
    const col=Math.floor((x-35)/225),row=Math.floor((y-245)/105);
    if(col>=0&&col<4&&row>=0&&row<2){
      const keys=['heal','regen','wind','haste','mpRegenAll','archery','windFlow'];
      const k=keys[row*4+col];if(!k)return;
      const lv=progress.yunoSkills[k]||0,max=yunoSkillMax(k);
      if(lv>=max){flashText='このスキルは最大強化です';flashTimer=1.4;return;}
      const cost=yunoSkillCost(k,lv);
      if((progress.yunoSP||0)<cost){flashText=`ユーノのSPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
      progress.yunoSP-=cost;progress.yunoSkills[k]=lv+1;saveProgress();saveGame();
      flashText=k==='windFlow'?(lv?'「風巡の呼吸」をLv.2に強化！':'パッシブ「風巡の呼吸」を習得！'):k==='archery'?(lv?'「風纏三連射」に強化！':'「二連射」を習得！'):(lv===0?'ユーノが新しい風術を習得！':'風術を強化！');
      flashTimer=1.8;return;
    }
  }

  if(menuPage==='skill' && menuCharacter==='suzu' && (suzumaruActive||suzumaruJoined)){
    if(y>=245 && y<=327){
      if(x>=70 && x<=455){
        const lv=progress.suzuSkills.single||0;
        if(lv>=4){flashText='単体系は最大強化です';flashTimer=1.6;return;}
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
        if(lv>=5){flashText='全体系は最大強化です';flashTimer=1.6;return;}
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

  if(menuPage==='skill' && menuCharacter==='suzu' && (suzumaruActive||suzumaruJoined) && y>=365 && y<=435){
    if(x>=70&&x<=460){
      if((progress.suzuSkills?.counter||0)>=1){flashText='炎返しは習得済みです';flashTimer=1.4;return;}
      if((progress.suzuSP||0)<3){flashText='SPが足りない（必要 3）';flashTimer=1.6;return;}
      progress.suzuSP-=3;progress.suzuSkills.counter=1;progress.suzuSpentSP=(progress.suzuSpentSP||0)+3;
      saveProgress();saveGame();flashText='スズマルが「炎返し」を習得！';flashTimer=2;return;
    }
    if(x>=500&&x<=890){
      const lv=progress.suzuSkills?.fightingFlame||0;
      if(lv>=2){flashText='闘炎は最大強化です';flashTimer=1.4;return;}
      const cost=lv===0?2:3;
      if((progress.suzuSP||0)<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
      progress.suzuSP-=cost;progress.suzuSkills.fightingFlame=lv+1;progress.suzuSpentSP=(progress.suzuSpentSP||0)+cost;
      saveProgress();saveGame();flashText=lv===0?'パッシブ「闘炎」を習得！':'「闘炎」をLv.2に強化！';flashTimer=2;return;
    }
  }

  if(menuPage==='skill' && menuCharacter==='hero' && x>=690&&x<=915&&y>=460&&y<=522){
    const lv=progress.heroMagicFlow||0;if(lv>=2){flashText='水魔の高まりは最大強化です';flashTimer=1.4;return;}
    const cost=lv===0?1:2;if(progress.sp<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
    progress.sp-=cost;progress.heroMagicFlow=lv+1;saveProgress();saveGame();
    flashText=lv?'「水魔の高まり」をLv.2に強化！':'パッシブ「水魔の高まり」を習得！';flashTimer=1.8;return;
  }

  // Hero ice-blade evolution: click the next unlocked node in the horizontal route.
  if(menuPage==='skill' && menuCharacter==='hero' && y>=252 && y<=318){
    const nodeW=205,gap=20,startX=45;
    const index=Math.floor((x-startX)/(nodeW+gap));
    const within=index>=0&&index<3 && x>=startX+index*(nodeW+gap) && x<=startX+index*(nodeW+gap)+nodeW;
    if(within){
      const lv=progress.heroIceSkill||0;
      if(index<lv){flashText='この技は習得済みです';flashTimer=1.4;return;}
      if(index>lv){flashText='ひとつ前の技を先に習得してください';flashTimer=1.6;return;}
      if(lv>=3){flashText='氷剣ルートは最大強化です';flashTimer=1.6;return;}
      const cost=lv===2?2:1;
      if(progress.sp<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.7;return;}
      progress.sp-=cost;progress.heroIceSkill=lv+1;progress.learned.iceSlash=true;
      saveProgress();saveGame();flashText=`「${heroIceSkillName()}」を習得！`;flashTimer=2.0;return;
    }
  }
  if(menuPage==='skill' && menuCharacter==='hero'){
    if(x>=690&&x<=915&&y>=360&&y<=452){
      const ml=progress.heroManaSkill||0;
      if(ml>=2){flashText='水脈の雫は最大強化です';flashTimer=1.4;return;}
      const cost=ml===0?1:2;
      if(progress.sp<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.5;return;}
      progress.sp-=cost;progress.heroManaSkill=ml+1;saveProgress();saveGame();
      flashText=ml===0?'「水脈の雫」を習得！':'「水脈の恵み」に強化！';flashTimer=1.8;return;
    }
    if(x>=690&&x<=915&&y>=252&&y<=344){
      const lv=progress.heroHealSkill||1;
      if(lv>=4){flashText='回復ルートは最大強化です';flashTimer=1.5;return;}
      if(lv===3&&!progress.orochiDefeated){flashText='最終強化は九頭龍撃破後に解禁';flashTimer=1.8;return;}
      const cost=lv===3?25:lv===2?2:1;
      if(progress.sp<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.6;return;}
      progress.sp-=cost;progress.heroHealSkill=lv+1;saveProgress();saveGame();
      flashText=lv===1?'「水の大いやし」に強化！':lv===2?'「大水癒」に強化！':'「九尾大水癒」に強化！';flashTimer=1.9;return;
    }
    const tryPebbleNode=(route,idx,cost,name)=>{
      const key=route==='random'?'heroPebbleRandom':'heroPebbleAll',lv=progress[key]||0;
      if(idx<lv){flashText='この技は習得済みです';flashTimer=1.4;return true;}
      if(idx>lv){flashText='ひとつ前の技を先に習得してください';flashTimer=1.6;return true;}
      if(progress.sp<cost){flashText=`SPが足りない（必要 ${cost}）`;flashTimer=1.7;return true;}
      progress.sp-=cost;progress[key]=lv+1;if(route==='all')progress.heroIceWave=true;
      saveProgress();saveGame();flashText=`「${name}」を習得！`;flashTimer=2;return true;
    };
    if(y>=356&&y<=414){
      if(x>=45&&x<=225){tryPebbleNode('random',0,1,'氷つぶて乱射II');return;}
      if(x>=245&&x<=425){tryPebbleNode('random',1,1,'氷つぶて乱射III');return;}
      if(x>=445&&x<=625){tryPebbleNode('random',2,2,'氷つぶて乱射IV');return;}
    }
    if(y>=425&&y<=483){
      if(x>=45&&x<=225){tryPebbleNode('all',0,1,'氷晶波');return;}
      if(x>=245&&x<=425){tryPebbleNode('all',1,2,'氷晶大波');return;}
    }
  }

}


function drawSurveyMonster(mon){
  if(!mon||!mon.alive)return;
  const x=mon.x,y=mon.y;
  ctx.save();ctx.translate(x,y);
  ellipse(0,24,25,7,'rgba(0,0,0,.18)');
  if(mon.kind==='bananaShark'){
    // Banana + shark
    ctx.fillStyle='#f0d64b';
    ctx.beginPath();ctx.ellipse(0,0,35,16,-.18,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d8bf3d';ctx.beginPath();ctx.moveTo(-7,-15);ctx.lineTo(2,-34);ctx.lineTo(10,-12);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f5e67e';ctx.beginPath();ctx.moveTo(-28,3);ctx.lineTo(-46,-10);ctx.lineTo(-40,10);ctx.closePath();ctx.fill();
    rect(18,-6,5,5,'#172235');
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(26,5);ctx.lineTo(32,2);ctx.lineTo(30,8);ctx.closePath();ctx.fill();
  }else if(mon.kind==='sweetBoar'){
    // Sweet potato + boar
    ellipse(0,0,27,18,'#9d5e7d');
    ellipse(-22,-7,8,8,'#7b4f66');ellipse(22,-7,8,8,'#7b4f66');
    ellipse(17,5,13,10,'#c9859f');
    rect(10,-5,4,4,'#1f2632');
    ctx.fillStyle='#f2e6d4';
    ctx.beginPath();ctx.moveTo(23,9);ctx.lineTo(33,15);ctx.lineTo(26,4);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(23,2);ctx.lineTo(34,-4);ctx.lineTo(26,7);ctx.closePath();ctx.fill();
    ctx.fillStyle='#68a45d';ctx.beginPath();ctx.ellipse(-10,-17,10,5,-.5,0,Math.PI*2);ctx.fill();
  }else if(mon.kind==='durianBear'){
    // Durian + bear
    ellipse(0,0,28,23,'#7aa35b');
    for(let a=0;a<Math.PI*2;a+=Math.PI/6){
      const px=Math.cos(a)*31,py=Math.sin(a)*24;
      ctx.fillStyle='#d4c660';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(a)*11,py+Math.sin(a)*11);ctx.lineTo(px+Math.cos(a+.35)*5,py+Math.sin(a+.35)*5);ctx.closePath();ctx.fill();
    }
    ellipse(-15,-18,8,8,'#6b5848');ellipse(15,-18,8,8,'#6b5848');
    ellipse(0,3,16,13,'#8d775d');
    rect(-9,-5,4,4,'#172235');rect(5,-5,4,4,'#172235');
    ellipse(0,5,5,4,'#372c28');
  }
  ctx.restore();
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
  rect(690,285,190,255,'#4f6063');rect(730,335,110,205,'#172844');
  rect(730,335,110,12,'#ef8fb2');
  // banners
  rect(675,135,8,85,'#584a3c');rect(920,135,8,85,'#584a3c');
  rect(683,142,45,28,'#ef8fb2');rect(875,142,45,28,'#ef8fb2');
  rect(690,148,31,7,'#172844');rect(882,148,31,7,'#172844');
}
function drawTakezoDeparture(){
  drawSarubibiVillageBG();
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(0,0,W,H);
  drawHeroFox(250,365,1.18);drawSuzumaru(365,370,1.1);drawDashmiu(470,378,1.0);drawYuno(585,370,1.12);
  const item=takezoDepartureDialog[Math.min(dialogIndex,takezoDepartureDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawTakezoTravel(){
  camera.x=Math.max(0,Math.min(1450-W,takezoTravelHero.x-W*.43));camera.y=0;
  ctx.save();ctx.translate(-camera.x,0);
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#9fdaea');sky.addColorStop(1,'#d9e9bd');
  ctx.fillStyle=sky;ctx.fillRect(0,0,1450,H);

  // 島の内陸。北側は中央火山の山麓で、海ではない。
  rect(0,0,1450,175,'#91ad78');
  ctx.fillStyle='#69745f';ctx.beginPath();ctx.moveTo(0,175);ctx.lineTo(180,75);ctx.lineTo(330,175);ctx.lineTo(510,45);ctx.lineTo(700,175);ctx.lineTo(900,82);ctx.lineTo(1080,175);ctx.lineTo(1260,55);ctx.lineTo(1450,175);ctx.closePath();ctx.fill();
  ctx.fillStyle='#7f946e';ctx.beginPath();ctx.moveTo(0,175);ctx.lineTo(250,125);ctx.lineTo(470,175);ctx.lineTo(720,112);ctx.lineTo(950,175);ctx.lineTo(1210,120);ctx.lineTo(1450,175);ctx.closePath();ctx.fill();
  rect(0,175,1450,365,'#83b77b');

  // North-northeast route: visually climbs up/right.
  ctx.fillStyle='#c5b483';ctx.beginPath();
  ctx.moveTo(70,500);ctx.lineTo(1370,220);ctx.lineTo(1440,315);ctx.lineTo(95,540);ctx.closePath();ctx.fill();

  // Low shrubs and rocks make it feel like a distinct travel map.
  for(let x=120;x<1370;x+=145){
    ellipse(x,205+(x%4)*52,24,13,'#6d9d6d');
    ellipse(x+34,212+(x%5)*43,19,11,'#769f72');
  }
  for(const p of [[360,400],[720,330],[980,265],[1290,215]])ellipse(p[0],p[1],18,10,'#8b9386');

  if(takezoScout.alive){
    drawPirateAnimal(takezoScout.x,takezoScout.y,'pirateCat',1.05);
    drawPirateAnimal(takezoScout.x+52,takezoScout.y+22,'pirateDog',.92);
    drawPirateAnimal(takezoScout.x-48,takezoScout.y+30,'pirateTanuki',.9);
  }

  drawHeroFox(takezoTravelHero.x,takezoTravelHero.y,1.1);
  drawSuzumaru(takezoTravelHero.x-44,takezoTravelHero.y+18,.98);
  drawDashmiu(takezoTravelHero.x-84,takezoTravelHero.y+28,.9);
  drawYuno(takezoTravelHero.x-124,takezoTravelHero.y+34,.91);
  ctx.restore();

  const ht=hudTop();ctx.fillStyle='rgba(10,28,48,.88)';ctx.fillRect(18,ht,405,46);
  text('目的：北北東のたけぞ村へ向かう',35,ht+23,16);
}
function drawTakezoScoutAfter(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#9fdaea');sky.addColorStop(1,'#d9e9bd');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#69745f';ctx.beginPath();ctx.moveTo(0,225);ctx.lineTo(170,105);ctx.lineTo(340,225);ctx.lineTo(570,80);ctx.lineTo(760,225);ctx.lineTo(960,115);ctx.lineTo(960,250);ctx.lineTo(0,250);ctx.closePath();ctx.fill();
  rect(0,225,W,315,'#83b77b');
  ctx.fillStyle='#c5b483';ctx.beginPath();ctx.moveTo(0,480);ctx.lineTo(W,260);ctx.lineTo(W,380);ctx.lineTo(0,540);ctx.closePath();ctx.fill();
  drawHeroFox(250,375,1.14);drawSuzumaru(360,380,1.04);drawDashmiu(465,388,.95);drawYuno(570,380,1.06);
  const item=takezoScoutAfterDialog[Math.min(dialogIndex,takezoScoutAfterDialog.length-1)];
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
  // たけぞ村周辺も島の内陸・山麓。
  ctx.fillStyle='#66725d';ctx.beginPath();ctx.moveTo(0,220);ctx.lineTo(180,105);ctx.lineTo(350,220);ctx.lineTo(610,75);ctx.lineTo(830,220);ctx.lineTo(1080,110);ctx.lineTo(1300,220);ctx.lineTo(1500,95);ctx.lineTo(1500,260);ctx.lineTo(0,260);ctx.closePath();ctx.fill();
  rect(0,220,1500,320,'#7eaa72');
  for(let x=20;x<140;x+=45){ellipse(x,280+(x%3)*55,24,17,'#668f62');}
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
  // Event recovery controls. These stay available even if a save gets into a bad state.
  outlineRect(590,ht,155,42,'#e9f6fb','#4f93ad',2);text('小隊をやり直す',667,ht+22,14,'center','#17324a');
  outlineRect(755,ht,170,42,'#fff1d6','#b68a42',2);text('いったん村へ戻る',840,ht+22,14,'center','#5b421e');
}
function drawTakezoRelief(){
  drawTakezoVillageGate();
  drawHeroFox(205,390,1.12);drawSuzumaru(305,395,1.04);drawDashmiu(400,402,.94);drawYuno(495,395,1.04);
  const item=takezoReliefDialog[Math.min(dialogIndex,takezoReliefDialog.length-1)];
  drawDialog(item[0],item[1]);
}


function drawTakezoPlan(){
  drawTakezoVillageGate();
  // planning table and elemental representatives
  rect(165,255,630,120,'#7a5639');rect(190,280,580,70,'#d5c59b');
  drawHeroFox(210,420,1.0);drawSuzumaru(310,420,.95);drawDashmiu(400,425,.86);drawYuno(500,420,.96);
  // earth + wind villagers
  drawSuzumaru(650,420,.85);drawYuno(735,420,.86);
  const item=takezoPlanDialog[Math.min(dialogIndex,takezoPlanDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawTakezoCoastSurvey(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#9bd8e9');gr.addColorStop(.48,'#9bd8e9');gr.addColorStop(.49,'#69b7d2');gr.addColorStop(1,'#4c9dbd');
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#d8c58f';ctx.beginPath();ctx.moveTo(0,340);ctx.lineTo(W,280);ctx.lineTo(W,540);ctx.lineTo(0,540);ctx.fill();
  drawHeroFox(220,380,1.08);drawYuno(340,380,1.08);drawSuzumaru(455,385,.98);drawDashmiu(560,390,.9);
  const item=takezoCoastDialog[Math.min(dialogIndex,takezoCoastDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawCoastSurveyField(){
  camera.x=Math.max(0,Math.min(1200-W,coastSurveyHero.x-W*.45));camera.y=0;
  ctx.save();ctx.translate(-camera.x,0);
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#9bd8e9');gr.addColorStop(.44,'#9bd8e9');gr.addColorStop(.45,'#69b7d2');gr.addColorStop(1,'#4c9dbd');
  ctx.fillStyle=gr;ctx.fillRect(0,0,1200,H);
  ctx.fillStyle='#d8c58f';ctx.beginPath();ctx.moveTo(0,345);ctx.lineTo(1200,250);ctx.lineTo(1200,540);ctx.lineTo(0,540);ctx.fill();
  for(let x=40;x<1180;x+=100){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.moveTo(x,250);ctx.lineTo(x+58,257);ctx.stroke();}
  if(bananaSharkAlive)drawSurveyMonster({x:900,y:305,alive:true,kind:'bananaShark'});
  drawHeroFox(coastSurveyHero.x,coastSurveyHero.y,1.08);drawYuno(coastSurveyHero.x-45,coastSurveyHero.y+15,.98);drawSuzumaru(coastSurveyHero.x-86,coastSurveyHero.y+24,.92);drawDashmiu(coastSurveyHero.x-125,coastSurveyHero.y+30,.84);
  ctx.restore();
  const ht=hudTop();ctx.fillStyle='rgba(10,28,48,.88)';ctx.fillRect(18,ht,410,46);
  text('目的：海岸線と海水の引き込み口を確認',35,ht+23,15);
}
function drawBananaSharkAfter(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#9bd8e9');gr.addColorStop(.48,'#9bd8e9');gr.addColorStop(.49,'#69b7d2');gr.addColorStop(1,'#4c9dbd');
  ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#d8c58f';ctx.beginPath();ctx.moveTo(0,340);ctx.lineTo(W,280);ctx.lineTo(W,540);ctx.lineTo(0,540);ctx.fill();
  drawHeroFox(220,380,1.08);drawYuno(340,380,1.08);drawSuzumaru(455,385,.98);drawDashmiu(560,390,.9);
  const item=bananaSharkAfterDialog[Math.min(dialogIndex,bananaSharkAfterDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawVolcanoSurveyField(){
  camera.x=Math.max(0,Math.min(1400-W,volcanoSurveyHero.x-W*.44));camera.y=0;
  ctx.save();ctx.translate(-camera.x,0);
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#e6b271');gr.addColorStop(1,'#d9d3a2');ctx.fillStyle=gr;ctx.fillRect(0,0,1400,H);
  rect(0,330,1400,210,'#7d9b69');
  // mountain rises to the right
  ctx.fillStyle='#6a685d';ctx.beginPath();ctx.moveTo(680,330);ctx.lineTo(1240,80);ctx.lineTo(1400,330);ctx.closePath();ctx.fill();
  ctx.fillStyle='#b4583c';ctx.beginPath();ctx.moveTo(1195,100);ctx.lineTo(1240,80);ctx.lineTo(1285,108);ctx.closePath();ctx.fill();
  for(const m of volcanoSurveyMobs)if(m.alive)drawSurveyMonster(m);
  drawHeroFox(volcanoSurveyHero.x,volcanoSurveyHero.y,1.07);drawYuno(volcanoSurveyHero.x-44,volcanoSurveyHero.y+15,.98);drawSuzumaru(volcanoSurveyHero.x-84,volcanoSurveyHero.y+24,.92);drawDashmiu(volcanoSurveyHero.x-123,volcanoSurveyHero.y+30,.84);
  ctx.restore();
  const ht=hudTop();ctx.fillStyle='rgba(10,28,48,.88)';ctx.fillRect(18,ht,390,46);
  text(`目的：火山の斜面を確認　魔物残り ${volcanoSurveyMobs.filter(m=>m.alive).length}`,35,ht+23,15);
}
function drawTakezoVolcanoSurvey(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#e6b271');gr.addColorStop(1,'#d9d3a2');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#5e6258';ctx.beginPath();ctx.moveTo(570,90);ctx.lineTo(770,360);ctx.lineTo(390,360);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c95d3d';ctx.beginPath();ctx.moveTo(570,90);ctx.lineTo(610,145);ctx.lineTo(530,145);ctx.closePath();ctx.fill();
  rect(0,360,W,180,'#7d9b69');
  drawHeroFox(220,405,1.05);drawYuno(335,405,1.08);drawSuzumaru(450,410,.98);drawDashmiu(555,415,.9);
  for(let x=90;x<880;x+=160){ctx.strokeStyle='rgba(230,250,255,.7)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,230);ctx.quadraticCurveTo(x+60,205,x+115,225);ctx.stroke();}
  const item=takezoVolcanoDialog[Math.min(dialogIndex,takezoVolcanoDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawTakezoConstruction(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#a7dbe8');gr.addColorStop(1,'#b8d49a');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  rect(0,260,W,280,'#82a96d');
  // enormous excavation, deliberately wide
  ellipse(520,380,330,105,'#574332');ellipse(520,390,270,78,'#263947');
  // earth workers at rim
  for(const p of [[210,330],[315,300],[725,305]])drawSuzumaru(p[0],p[1],.72);
  // wind workers; arcs show soil being carried away
  for(const p of [[785,350],[850,305]])drawYuno(p[0],p[1],.72);
  ctx.strokeStyle='rgba(235,245,220,.72)';ctx.lineWidth=6;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(650+i*45,315-i*18,55,2.8,5.8);ctx.stroke();}
  drawHeroFox(130,430,.95);drawYuno(205,430,.95);drawSuzumaru(280,435,.88);drawDashmiu(350,440,.82);
  const item=takezoConstructionDialog[Math.min(dialogIndex,takezoConstructionDialog.length-1)];drawDialog(item[0],item[1]);
}


function drawSecondWaveIntro(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#8799a7');gr.addColorStop(1,'#b7aa82');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
  rect(0,350,W,190,'#7f9d69');
  // earth wall
  rect(510,210,70,230,'#80634a');rect(580,235,75,205,'#765b45');rect(655,200,80,240,'#83674c');
  // defenders
  drawHeroFox(220,400,1.02);drawSuzumaru(315,405,.94);drawDashmiu(395,412,.84);drawYuno(475,405,.94);
  // pirate mass behind wall
  for(let i=0;i<10;i++)drawPirateAnimal(630+(i%5)*58,330+Math.floor(i/5)*55,i%3===0?'pirateCat':i%3===1?'pirateDog':'pirateTanuki',.68);
  const item=secondWaveIntroDialog[Math.min(dialogIndex,secondWaveIntroDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawSecondWaveRetreat(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#9aa7aa');gr.addColorStop(1,'#aaa477');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);rect(0,260,W,280,'#8aa06b');
  // fake ground/trap area
  ellipse(545,400,300,88,'#8b9f69');
  drawHeroFox(200,390,1);drawSuzumaru(285,395,.92);drawDashmiu(360,405,.83);drawYuno(435,395,.94);
  for(let i=0;i<13;i++)drawPirateAnimal(560+(i%5)*65,330+Math.floor(i/5)*55,i%3===0?'pirateCat':i%3===1?'pirateDog':'pirateTanuki',.68);
  const item=secondWaveRetreatDialog[Math.min(dialogIndex,secondWaveRetreatDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawSecondWaveTrap(){
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#9aa7aa');gr.addColorStop(1,'#aaa477');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);rect(0,250,W,290,'#849b68');
  // opened water-filled pit
  ellipse(560,390,350,118,'#4c4037');ellipse(560,405,305,88,'#559bb5');
  for(let i=0;i<10;i++)drawPirateAnimal(410+(i%5)*70,385+Math.floor(i/5)*45,i%3===0?'pirateCat':i%3===1?'pirateDog':'pirateTanuki',.62);
  drawHeroFox(120,390,.92);drawSuzumaru(190,395,.85);drawDashmiu(255,403,.76);drawYuno(320,395,.86);
  const item=secondWaveTrapDialog[Math.min(dialogIndex,secondWaveTrapDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawSecondWaveVictory(){
  ctx.fillStyle='#a9d5d9';ctx.fillRect(0,0,W,H);rect(0,310,W,230,'#86a66d');
  ellipse(680,400,230,70,'#4b4037');ellipse(680,410,195,50,'#5799ae');
  drawHeroFox(245,390,1.08);drawSuzumaru(350,395,1);drawDashmiu(450,405,.9);drawYuno(550,395,1);
  const item=secondWaveVictoryDialog[Math.min(dialogIndex,secondWaveVictoryDialog.length-1)];drawDialog(item[0],item[1]);
}


function drawGyouJoin(){
  ctx.fillStyle='#a9d5d9';ctx.fillRect(0,0,W,H);rect(0,310,W,230,'#86a66d');
  drawHeroFox(180,395,.88);drawSuzumaru(285,400,.95);drawDashmiu(385,408,.86);drawYuno(485,400,.95);drawGyou(610,400,1.0);
  const item=gyouJoinDialog[Math.min(dialogIndex,gyouJoinDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawFinalPrep(){
  ctx.fillStyle='#c5d9d5';ctx.fillRect(0,0,W,H);rect(0,320,W,220,'#879f70');
  // planning table
  rect(230,255,500,80,'#74583d');rect(250,270,460,50,'#d6c79c');
  drawHeroFox(180,400,.84);drawSuzumaru(285,405,.9);drawDashmiu(385,413,.82);drawYuno(485,405,.91);drawGyou(590,405,.94);
  const item=finalPrepDialog[Math.min(dialogIndex,finalPrepDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawYunoCombo(){
  ctx.fillStyle='#b9d8d4';ctx.fillRect(0,0,W,H);rect(0,320,W,220,'#8ca574');
  drawHeroFox(310,400,.9);drawYuno(500,400,1.0);drawDashmiu(650,410,.82);
  // Water/wind practice swirl.
  ctx.strokeStyle='rgba(205,245,255,.75)';ctx.lineWidth=5;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(410,300,45+i*18,.2,Math.PI*1.65);ctx.stroke();}
  const item=yunoComboDialog[Math.min(dialogIndex,yunoComboDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawVolcanoBearQuest(){
  ctx.fillStyle='#c7d6c1';ctx.fillRect(0,0,W,H);rect(0,320,W,220,'#8ca574');
  drawHeroFox(205,405,.88);drawSuzumaru(315,410,.94);drawDashmiu(420,418,.84);drawYuno(520,410,.94);drawGyou(625,410,.97);
  const item=volcanoBearQuestDialog[Math.min(dialogIndex,volcanoBearQuestDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawFinalBearField(){
  camera.x=Math.max(0,Math.min(1250-W,finalBearHero.x-W*.44));
  ctx.save();ctx.translate(-camera.x,0);
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#e5ad6c');gr.addColorStop(1,'#d6cf9b');ctx.fillStyle=gr;ctx.fillRect(0,0,1250,H);
  rect(0,330,1250,210,'#778d62');
  ctx.fillStyle='#666258';ctx.beginPath();ctx.moveTo(600,330);ctx.lineTo(1080,80);ctx.lineTo(1250,330);ctx.closePath();ctx.fill();
  if(finalBear.alive){
    const bearSpots=[[990,295],[1070,340],[1140,280],[1190,365],[1025,400]];
    bearSpots.forEach((p,i)=>drawSurveyMonster({x:p[0],y:p[1],alive:true,kind:'durianBear',name:`大ドリアングマ${i+1}`}));
  }
  drawHeroFox(finalBearHero.x,finalBearHero.y,.92);drawYuno(finalBearHero.x-50,finalBearHero.y+15,.96);drawSuzumaru(finalBearHero.x-95,finalBearHero.y+22,.92);drawDashmiu(finalBearHero.x-135,finalBearHero.y+28,.82);drawGyou(finalBearHero.x-178,finalBearHero.y+28,.9);
  ctx.restore();
  const ht=hudTop();ctx.fillStyle='rgba(10,28,48,.88)';ctx.fillRect(18,ht,440,46);
  text('決戦前任務：爆炎大剣の試し斬り',35,ht+23,16);
}
function drawVolcanoBearAfter(){
  ctx.fillStyle='#d9c68f';ctx.fillRect(0,0,W,H);rect(0,330,W,210,'#778d62');
  drawHeroFox(205,405,.88);drawSuzumaru(315,410,.94);drawDashmiu(420,418,.84);drawYuno(520,410,.94);drawGyou(625,410,.97);
  const item=volcanoBearAfterDialog[Math.min(dialogIndex,volcanoBearAfterDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawFinalWeapon(){
  ctx.fillStyle='#d8c8aa';ctx.fillRect(0,0,W,H);rect(0,330,W,210,'#8ca574');
  // simple supply table and wrapped sword
  rect(355,285,250,55,'#74583d');
  rect(420,302,125,8,'#d9e5ed');rect(530,296,18,20,'#ef8fb2');
  drawHeroFox(205,395,.88);drawSuzumaru(315,400,.94);drawDashmiu(420,408,.84);
  drawYuno(520,400,.94);drawGyou(625,400,.97);
  // Smith: reuse the established fire-village visual language.
  drawSuzumaru(760,395,.9);
  const item=finalWeaponDialog[Math.min(dialogIndex,finalWeaponDialog.length-1)];
  drawDialog(item[0],item[1]);
}


function drawFinalEve(){
  ctx.fillStyle='#b8d1c7';ctx.fillRect(0,0,W,H);rect(0,320,W,220,'#879f70');
  rect(225,250,510,82,'#74583d');rect(247,267,466,50,'#d6c79c');
  // Map marks: village, volcano, coast and arrows.
  ellipse(345,292,11,8,'#688e62');ellipse(480,292,12,9,'#666258');ellipse(620,292,11,8,'#609bb0');
  ctx.strokeStyle='#7d6b52';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(360,292);ctx.lineTo(465,292);ctx.lineTo(605,292);ctx.stroke();
  drawHeroFox(165,402,.86);drawSuzumaru(275,407,.92);drawDashmiu(380,415,.82);drawYuno(485,407,.92);drawGyou(595,407,.95);
  const item=finalEveDialog[Math.min(dialogIndex,finalEveDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawFinalEveFree(){
  ctx.fillStyle='#bdd7cf';ctx.fillRect(0,0,W,H);rect(0,305,W,235,'#8ca574');
  text('たけぞ村　決戦前の準備',480,72,30,'center','#17324a',800);
  text('装備・回復薬・スキルを確認してから出撃できます',480,112,17,'center','#29485b');
  drawHeroFox(145,250,.78);drawSuzumaru(245,255,.84);drawDashmiu(345,262,.75);drawYuno(445,255,.84);drawGyou(545,255,.87);
  outlineRect(35,340,190,62,'#dff4fb','#71bad7',2);text('メニュー',130,371,19,'center','#17324a');
  outlineRect(245,340,210,62,'#fff0cf','#c89d55',2);text('回復薬 20G',350,371,17,'center','#5a3c18');
  outlineRect(475,340,210,62,'#ffe7c7','#c47b45',2);text('高級回復薬 75G',580,371,16,'center','#63371d');
  outlineRect(705,340,220,62,'#e5ead0','#9c9a62',2);text('ユーノに話す',815,371,18,'center','#394126');
  text(`回復薬 ${progress.items.potion||0}　高級 ${progress.items.highPotion||0}　所持金 ${progress.gold||0}G`,480,445,16,'center','#213b4b');
  text('ユーノに話すと最終決戦へ進みます',480,492,15,'center','#425b68');
}
function drawFinalLaunch(){
  ctx.fillStyle='#aebfc2';ctx.fillRect(0,0,W,H);rect(0,320,W,220,'#7e956c');
  drawHeroFox(165,405,.88);drawSuzumaru(275,410,.94);drawDashmiu(385,418,.84);drawYuno(495,410,.94);drawGyou(605,410,.97);
  const item=finalLaunchDialog[Math.min(dialogIndex,finalLaunchDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawGyouTraining(){
  ctx.fillStyle='#c6d4bb';ctx.fillRect(0,0,W,H);rect(0,330,W,210,'#8f9d6b');
  drawGyou(390,395,1.25);drawGyou(590,395,1.12);
  for(const p of [[300,300],[480,275],[680,310]])ellipse(p[0],p[1],15,11,'#80694e');
  const item=gyouTrainingDialog[Math.min(dialogIndex,gyouTrainingDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawFinalPrepFree(){
  ctx.fillStyle='#b9d8d4';ctx.fillRect(0,0,W,H);rect(0,320,W,220,'#8ca574');
  drawHeroFox(205,405,.88);drawSuzumaru(315,410,.94);drawDashmiu(420,418,.84);drawYuno(520,410,.94);drawGyou(625,410,.97);
  const item=finalPrepFreeDialog[Math.min(dialogIndex,finalPrepFreeDialog.length-1)];drawDialog(item[0],item[1]);
}


function drawPirateCaptainIntro(){
  ctx.fillStyle='#9fc7d1';ctx.fillRect(0,0,W,H);rect(0,185,W,95,'#628ea1');rect(0,280,W,260,'#9a8b67');
  rect(600,305,300,125,'#7a694e');rect(615,320,270,95,'#aa956b');rect(855,205,7,115,'#403832');
  ctx.fillStyle='#8b3030';ctx.beginPath();ctx.moveTo(862,210);ctx.lineTo(930,235);ctx.lineTo(862,255);ctx.fill();
  drawHeroFox(110,415,.72);drawSuzumaru(195,420,.77);drawDashmiu(280,427,.70);drawYuno(365,420,.77);drawGyou(450,420,.79);
  ellipse(700,286,27,27,'#f2f3ed');ellipse(679,269,9,9,'#e4e7e2');ellipse(721,269,9,9,'#e4e7e2');rect(668,272,64,12,'#c94848');rect(670,310,60,90,'#d97832');
  ellipse(790,286,27,28,'#202b39');ellipse(790,291,18,20,'#f4f4eb');ctx.fillStyle='#e2a53a';ctx.beginPath();ctx.moveTo(783,286);ctx.lineTo(798,286);ctx.lineTo(790,294);ctx.closePath();ctx.fill();rect(760,310,60,90,'#d97832');rect(748,250,84,14,'#243245');
  const item=pirateCaptainIntroDialog[Math.min(dialogIndex,pirateCaptainIntroDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawPirateCaptainAfter(){
  ctx.fillStyle='#b4c7c8';ctx.fillRect(0,0,W,H);rect(0,190,W,90,'#6f98a5');rect(0,280,W,260,'#9a8b67');
  drawHeroFox(120,420,.72);drawSuzumaru(210,425,.77);drawDashmiu(300,432,.70);drawYuno(390,425,.77);drawGyou(480,425,.79);
  rect(700,320,58,90,'#d97832');ellipse(729,302,25,27,'#202b39');ellipse(729,307,17,19,'#f4f4eb');ctx.strokeStyle='#d8dce1';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(770,405);ctx.lineTo(825,430);ctx.stroke();
  const item=pirateCaptainAfterDialog[Math.min(dialogIndex,pirateCaptainAfterDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawFinalBattleGround(){
  ctx.fillStyle='#aebfc8';ctx.fillRect(0,0,W,H);
  rect(0,300,W,240,'#788b63');
  // broken ice wall + earth wall
  for(let x=30;x<930;x+=70){rect(x,255+(x%140?10:0),62,82,'#ccebf0');rect(x,315,62,46,'#816d4e');}
  // mist and distant pirate formation
  for(let i=0;i<8;i++)ellipse(520+i*55,220+(i%2)*22,72,30,'rgba(235,244,242,.55)');
  for(let i=0;i<9;i++){ellipse(510+i*45,285+(i%3)*18,13,13,'#5c4b43');rect(501+i*45,298+(i%3)*18,18,24,'#c06c3f');}
  drawHeroFox(130,420,.72);drawSuzumaru(220,424,.77);drawDashmiu(310,430,.70);drawYuno(400,424,.77);drawGyou(490,424,.79);
  const item=finalBattleGroundDialog[Math.min(dialogIndex,finalBattleGroundDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawFinalBalloon(){
  ctx.fillStyle='#9fc7d1';ctx.fillRect(0,0,W,H);
  // 奥が海、手前が海岸と前線本陣
  rect(0,350,W,70,'#628ea1');rect(0,420,W,120,'#9a8b67');
  for(let i=0;i<6;i++)ellipse(90+i*170,355+(i%2)*18,110,38,'rgba(240,245,242,.42)');
  // balloon
  ellipse(480,145,120,88,'#d8b56d');rect(405,218,150,64,'#806047');
  ctx.strokeStyle='#5d4b38';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(410,185);ctx.lineTo(425,220);ctx.moveTo(550,185);ctx.lineTo(535,220);ctx.stroke();
  drawHeroFox(425,255,.38);drawSuzumaru(452,257,.39);drawDashmiu(480,259,.36);drawYuno(508,257,.39);drawGyou(536,257,.40);
  // 海岸近くの前線本陣。船長の旗艦はさらに沖で待機。
  ctx.fillStyle='#6f5748';ctx.beginPath();ctx.moveTo(720,372);ctx.lineTo(800,310);ctx.lineTo(880,372);ctx.closePath();ctx.fill();rect(792,245,6,85,'#3f3632');
  ctx.fillStyle='#8b3030';ctx.beginPath();ctx.moveTo(798,248);ctx.lineTo(870,272);ctx.lineTo(798,290);ctx.fill();
  const item=finalBalloonDialog[Math.min(dialogIndex,finalBalloonDialog.length-1)];drawDialog(item[0],item[1]);
}

function drawEnding(){
  ctx.fillStyle='#17253d';ctx.fillRect(0,0,W,H);rect(0,330,W,210,'#6f8b62');
  for(let i=0;i<12;i++)ellipse(55+i*82,300+(i%2)*16,18,18,'#f2c86d');
  drawHeroFox(255,390,.82);drawSuzumaru(365,395,.90);drawDashmiu(475,402,.82);drawYuno(585,395,.89);drawGyou(695,395,.91);
  text('海賊との戦いが終わった夜',480,95,30,'center','#f4e5b7');
  const item=endingDialog[Math.min(dialogIndex,endingDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawDragonCall(){
  // 登山道へ入る前。五人の頭へ古竜の声が直接届く。
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#9ccedb');sky.addColorStop(1,'#d9ddb5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#59645b';ctx.beginPath();ctx.moveTo(560,300);ctx.lineTo(760,105);ctx.lineTo(950,300);ctx.closePath();ctx.fill();
  ctx.fillStyle='#71866a';ctx.beginPath();ctx.moveTo(0,330);ctx.lineTo(240,245);ctx.lineTo(430,330);ctx.lineTo(650,260);ctx.lineTo(960,340);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.closePath();ctx.fill();
  drawHeroFox(250,415,.72);drawSuzumaru(345,420,.77);drawDashmiu(440,427,.70);drawYuno(535,420,.77);drawGyou(630,420,.79);
  if(dialogIndex>=1&&dialogIndex<=3){ctx.fillStyle='rgba(20,15,30,.16)';ctx.fillRect(0,0,W,360);text('――五人の頭の中に、同じ声が響く――',480,105,20,'center','#f4edf8',800);}
  const item=dragonCallDialog[Math.min(dialogIndex,dragonCallDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawDragonSummit(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#392f39');sky.addColorStop(1,'#a65739');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#352d2d';ctx.beginPath();ctx.moveTo(0,360);ctx.lineTo(180,270);ctx.lineTo(330,330);ctx.lineTo(500,235);ctx.lineTo(680,325);ctx.lineTo(820,245);ctx.lineTo(960,320);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.closePath();ctx.fill();
  // 古竜は遠景で待っている。ここでは戦闘前の再勧誘はしない。
  drawDragonEnemy(760,270,1.25);
  drawHeroFox(225,410,.72);drawSuzumaru(315,418,.77);drawDashmiu(405,424,.70);drawYuno(495,418,.77);drawGyou(585,420,.79);
  text('火山・山頂',480,74,31,'center','#ffe1b1',900);
  const item=dragonSummitDialog[Math.min(dialogIndex,dragonSummitDialog.length-1)];drawDialog(item[0],item[1]);
}
function drawDragonConfirm(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#392f39');sky.addColorStop(1,'#a65739');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  drawDragonEnemy(720,250,1.35);
  text('火山・山頂',480,55,24,'center','#ffd69c',900);
  text('険しい登山道を越え、古竜の待つ頂上へたどり着いた。',480,88,15,'center','#e9d7c7');
  text('ドラゴンと戦いますか？',480,135,30,'center','#fff0ce',900);
  outlineRect(300,305,360,70,'#e9f5f8','#79bed6',3);
  text('戦う',480,340,26,'center','#17324a',900);
  text('A / Enter または「戦う」をタップ',480,410,16,'center','#dcebf0');
  text('X / Esc：登山道へ戻る',480,442,14,'center','#c5d7df');
}
function drawPostDragonClear(){
  ctx.fillStyle='#241d2a';ctx.fillRect(0,0,W,H);text('火山の古竜　撃破！',480,160,42,'center','#f0c47a');
  text('島の伝説に、新しい一頁が加わった。',480,235,24,'center','#e8e2da');
  text('A / Enter でクリア後メニューへ',480,350,19,'center','#b9cad8');
}


const fourAbyssDialog=[['ぶりふぉ村長','……おぬしら、もう強すぎじゃろ。'],['ぶりふぉ村長','異界の魔物が危険じゃと言うておったが……今となっては、あっちが気の毒になってきたわい。'],['ぶりふぉ村長','もう四人で行ってこい。異界へ。'],['ぶりふぉ村長','ただし、向こうで何が起きても知らんぞ？']];
function drawPostGamePartyAt(x,y,heroScale=.88){
  drawHeroFox(x,y,heroScale);
  if(!progress.nineTailSoloQuest){
    drawSuzumaru(x-38,y+13,.82);drawYuno(x-73,y+17,.80);drawGyou(x-108,y+20,.80);
  }
}
function drawPostGameIsland(){
  // One-screen pentagonal island: village positions follow the story geography.
  ctx.fillStyle='#5ab5d0';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#79bd72';ctx.strokeStyle='#e7d29a';ctx.lineWidth=12;
  ctx.beginPath();ctx.moveTo(480,62);ctx.lineTo(885,205);ctx.lineTo(795,500);ctx.lineTo(165,500);ctx.lineTo(75,205);ctx.closePath();ctx.fill();ctx.stroke();

  // central volcano
  ctx.fillStyle='#66675f';ctx.beginPath();ctx.moveTo(350,310);ctx.lineTo(480,125);ctx.lineTo(610,310);ctx.closePath();ctx.fill();
  ctx.fillStyle='#bf5b3d';ctx.beginPath();ctx.moveTo(447,172);ctx.lineTo(480,125);ctx.lineTo(516,174);ctx.closePath();ctx.fill();
  outlineRect(430,205,100,34,'#6a5549','#d29b67',2);text('火山',480,222,14,'center','#fff1d3');

  // roads radiating from the volcano / island center
  ctx.strokeStyle='#d8c48f';ctx.lineWidth=28;ctx.lineCap='round';
  [[480,315,205,405],[480,315,275,265],[480,315,685,405],[480,315,700,235],[480,315,480,205]].forEach(p=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[3]);ctx.stroke();});
  ctx.lineCap='butt';

  // Village locations: Brifo west, Sarubie southwest, Sarubibi southeast, Takezo north-east.
  const gates=[
    ['sarubie',135,365,'さるびえ村','#f2c995'],
    ['brifo',205,225,'ぶりふぉ村','#dff4fb'],
    ['sarubibi',610,365,'さるびび村','#ccebdc'],
    ['takezo',630,195,'たけぞ村','#d9c99e']
  ];
  gates.forEach(([a,x,y,n,c])=>{outlineRect(x,y,145,54,c,'#587064',3);text(n,x+72,y+20,16,'center','#29434b',900);text('入口',x+72,y+40,12,'center','#536c70');});
  if(postGameRaidUnlocked){
    outlineRect(395,66,170,58,'#f4d7a0','#8a3f45',4);text('ちぇすたぴ',480,87,15,'center','#7b2635',900);text('サーカス団 拠点',480,108,14,'center','#7b2635',900);
  }

  if(progress.sealedCaveUnlocked){
    outlineRect(675,75,155,50,'#d9eef5','#54758a',3);text('立入禁止区域',752,92,13,'center','#263d50',900);text('封印の洞窟',752,111,14,'center','#263d50',900);
  }
  // small elemental landmarks make the hub read as the same island, not a menu
  drawTree(92,285);drawTree(815,330);drawTree(760,120);
  rect(95,420,14,58,'#bcecf5');rect(112,425,9,50,'rgba(255,255,255,.55)');
  drawPostGamePartyAt(postGameHero.x,postGameHero.y,.88);

  const ht=hudTop();ctx.fillStyle='rgba(13,39,54,.88)';ctx.fillRect(18,ht,520,46);
  text(`平和になった りすぺく島　Lv.${progress.level}　${progress.gold}G`,35,ht+23,16);
}

function drawNineTailHouse(){
  ctx.fillStyle='#d8e8e5';ctx.fillRect(0,0,W,H);rect(0,350,W,190,'#9a7654');
  rect(90,70,780,300,'#f1eadc');for(let x=120;x<850;x+=120)rect(x,70,10,300,'#785b48');
  outlineRect(340,115,280,120,'#d9f2f6','#6a91a0',4);
  // ceremonial blue-white garment and thin rapier-like blade
  rect(440,142,80,65,'#ffffff');ctx.fillStyle='#72bddd';ctx.beginPath();ctx.moveTo(440,150);ctx.lineTo(400,215);ctx.lineTo(455,205);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(520,150);ctx.lineTo(560,215);ctx.lineTo(505,205);ctx.closePath();ctx.fill();
  rect(476,118,8,102,'#dbeef5');rect(477,85,6,58,'#c8d9e5');rect(470,138,20,4,'#466e8a');
  text('九尾の妖刀　／　九尾の衣',480,255,20,'center','#31546c',900);
  drawElderFox(270,385,1.1);drawHeroFox(620,390,1.05);
  text('ぶりふぉ村長',270,320,14,'center','#31443c',900);
  text(heroName,620,325,14,'center','#31443c',900);
  {
    const d=nineTailHouseDialog[Math.min(dialogIndex,nineTailHouseDialog.length-1)];
    drawDialog(d[0],d[1]);
  }
}
function drawNineTailElderTalk(){
  drawPostGameVillage();
  {
    const d=nineTailElderCheckDialog[Math.min(dialogIndex,nineTailElderCheckDialog.length-1)];
    drawDialog(d[0],d[1]);
  }
}
function drawPostGameVillage(){
  if(postGameArea==='brifo'){
    // Reuse the Brifo village look from the opening event.
    ctx.fillStyle='#8fd47f';ctx.fillRect(0,0,W,H);rect(0,0,W,92,'#89d9e8');
    drawHouse(95,145);drawHouse(225,105);drawHouse(725,135);drawTree(30,300);drawTree(845,290);drawTree(720,330);
  }else if(postGameArea==='sarubie'){
    // Same village background used by the Sarubie story scenes.
    drawSarubieVillageBG();
    outlineRect(455,250,150,112,'#6a4c3d','#3e2c27',2);rect(478,215,104,42,'#482f2a');text('武器屋・鍛冶場',530,235,15,'center','#f3d9b1');
    drawFireHouse(720,255);outlineRect(722,225,88,30,'#f0d39a','#83593d',2);text('道具屋',766,240,14,'center','#4d332c');
  }else if(postGameArea==='sarubibi'){
    // Same village background used by the Sarubibi story scenes.
    drawSarubibiVillageBG();
    drawWindHouse(430,285);outlineRect(432,252,92,30,'#d8f1e9','#3c7776',2);text('武器屋',478,267,14,'center','#315a5e');
    drawWindHouse(600,285);outlineRect(602,252,92,30,'#d8f1e9','#3c7776',2);text('道具屋',648,267,14,'center','#315a5e');
    outlineRect(765,270,135,88,'#eaf5ee','#3d7776',2);text('防衛隊詰所',832,293,15,'center','#315a5e');
  }else{
    // New peaceful Takezo village, based on its stone/earth defensive architecture.
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#a9d7e4');sky.addColorStop(1,'#d7dfb5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    rect(0,230,W,310,'#8fbf91');
    ctx.fillStyle='#66725d';ctx.beginPath();ctx.moveTo(0,230);ctx.lineTo(145,125);ctx.lineTo(285,230);ctx.lineTo(470,95);ctx.lineTo(640,230);ctx.lineTo(820,120);ctx.lineTo(960,230);ctx.closePath();ctx.fill();
    // sturdy earth-and-stone homes, now repaired after the battle
    for(const [x,y] of [[115,275],[330,245],[555,280],[750,245]]){
      outlineRect(x,y,145,105,'#9c9479','#5d6860',3);rect(x+18,y+20,109,22,'#c8b98f');rect(x+50,y+57,45,48,'#4f6063');
      rect(x-8,y-12,161,18,'#7b694f');
    }
    outlineRect(400,380,160,50,'#d7c89b','#776044',2);text('たけぞ村 集会所',480,405,16,'center','#4a3c30',900);
  }
  outlineRect(28,425,145,58,'#e8f4f2','#557a79',3);text('島へ出る',100,454,17,'center','#284b50',900);
  drawHeroFox(postGameHero.x,postGameHero.y,.96);
  if(!progress.nineTailSoloQuest){drawSuzumaru(postGameHero.x-43,postGameHero.y+14,.88);drawYuno(postGameHero.x-82,postGameHero.y+18,.86);drawGyou(postGameHero.x-120,postGameHero.y+21,.86);}
  if(postGameArea==='brifo'){
    // Opening village chief sprite reused exactly.
    drawElderFox(700,385,1.2);
    text('村長',700,325,13,'center','#31443c',800);
  }
  const names={brifo:'ぶりふぉ村',sarubie:'さるびえ村',sarubibi:'さるびび村',takezo:'たけぞ村'};
  const ht=hudTop();ctx.fillStyle='rgba(18,40,50,.84)';ctx.fillRect(18,ht,330,45);text(`${names[postGameArea]}　平和な日常`,35,ht+22,17);
}

function drawSealedCave(){
 ctx.fillStyle='#101b29';ctx.fillRect(0,0,W,H);rect(0,225,W,315,'#243548');
 for(let x=0;x<W;x+=90){ctx.fillStyle='#bcecff';ctx.beginPath();ctx.moveTo(x,225);ctx.lineTo(x+22,255);ctx.lineTo(x+45,225);ctx.fill();}
 text('封印の洞窟　異界の門',30,55,22,'left','#d8f4ff',900);
 for(const m of sealedCaveMobs){
   if(!m.alive)continue;
   if(progress.fourAbyssUnlocked){
     if(m.kind==='blackDragon')drawAbyssDragonVariant(m.x,m.y,1.15,'gold');
     else if(m.kind==='whiteDragon')drawAbyssDragonVariant(m.x,m.y,1.15,'silver');
   }else{
     if(m.kind==='blackDragon')drawAbyssDragon(m.x,m.y,1.15,false);
     else if(m.kind==='whiteDragon')drawAbyssDragon(m.x,m.y,1.15,true);
   }
 }
 if(!progress.orochiDefeated){
   drawYamataNoOrochi(885,310,.72);text('異界の門',885,205,16,'center','#e9f5ff',900);
 }else{
   outlineRect(820,235,130,105,'#d9eef5','#7bbbd3',4);
   text('異界の門',885,264,16,'center','#27455c',900);
   text('再封印中',885,290,14,'center','#52748a',800);
   if(sealedCaveHero.x>790)text('A：九尾の力で再び開く',785,390,15,'center','#dff7ff',900);
 }
 drawHeroFox(sealedCaveHero.x,sealedCaveHero.y,.9);if(progress.fourAbyssUnlocked){drawSuzumaru(sealedCaveHero.x-42,sealedCaveHero.y+12,.82);drawYuno(sealedCaveHero.x-78,sealedCaveHero.y+16,.80);drawGyou(sealedCaveHero.x-114,sealedCaveHero.y+20,.80);}
 outlineRect(8,455,105,45,'#d9eef5','#54758a',2);text('島へ戻る',60,478,14,'center','#263d50',900);
}
function startSealedDragonBattle(m){
 const hs=heroStats(),scale=progress.fourAbyssUnlocked?Math.max(1,progress.level/60):1,hp=Math.floor(4000*scale),ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();
 const abyssName=progress.fourAbyssUnlocked?(m.kind==='blackDragon'?'ゴールドドラゴン':'シルバードラゴン'):m.name;
 battle={heroHP:hs.maxHP,heroMP:hs.maxMP,suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,gyouHP:gs.maxHP,gyouMaxHP:gs.maxHP,gyouMP:gs.maxMP,gyouMaxMP:gs.maxMP,enemyHP:hp,enemyMaxHP:hp,enemyName:abyssName,enemyKind:m.kind,monsterId:m.id,turn:'player',defending:false,sealedMobId:m.id,soloHero:!progress.fourAbyssUnlocked};
 damagePopups=[];battleMenu='main';battleActor='hero';battleMessage=`${m.name}が現れた！`;scene='battle';touchUI.classList.remove('hidden');
}
function startOrochiBattle(){
 const hs=heroStats(),scale=progress.fourAbyssUnlocked?Math.max(1,progress.level/60):1,hp=Math.floor(30000*scale),ss=suzumaruStats(),ys=yunoStats(),gs=gyouStats();
 battle={heroHP:hs.maxHP,heroMP:hs.maxMP,suzuHP:ss.maxHP,suzuMaxHP:ss.maxHP,suzuMP:ss.maxMP,suzuMaxMP:ss.maxMP,yunoHP:ys.maxHP,yunoMaxHP:ys.maxHP,yunoMP:ys.maxMP,yunoMaxMP:ys.maxMP,gyouHP:gs.maxHP,gyouMaxHP:gs.maxHP,gyouMP:gs.maxMP,gyouMaxMP:gs.maxMP,enemyHP:hp,enemyMaxHP:hp,enemyName:'九頭龍',enemyKind:'yamataOrochi',monsterId:1199,turn:'player',defending:false,soloHero:!progress.fourAbyssUnlocked};
 damagePopups=[];battleMenu='main';battleActor='hero';battleMessage='異界の裏ボス、九頭龍が九つの首をもたげた！';scene='battle';touchUI.classList.remove('hidden');
}
function drawPostGameVolcano(){
  camera.x=Math.max(0,Math.min(520,postGameVolcanoHero.x-W*.42));ctx.save();ctx.translate(-camera.x,0);
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#5f6670');gr.addColorStop(1,'#9c694c');ctx.fillStyle=gr;ctx.fillRect(0,0,1480,H);
  ctx.fillStyle='#4e4b49';ctx.beginPath();ctx.moveTo(0,500);ctx.lineTo(300,380);ctx.lineTo(620,440);ctx.lineTo(900,285);ctx.lineTo(1200,365);ctx.lineTo(1480,240);ctx.lineTo(1480,540);ctx.lineTo(0,540);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c58b61';ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(80,465);ctx.bezierCurveTo(500,420,780,390,1030,350);ctx.bezierCurveTo(1230,320,1370,285,1430,260);ctx.stroke();
  outlineRect(35,405,125,55,'#e7ddc8','#8d6e55',3);text('島へ出る',97,433,16,'center','#4e3b31',900);
  postGameVolcanoMobs.forEach(m=>drawSurveyMonster(m));
  drawHeroFox(postGameVolcanoHero.x,postGameVolcanoHero.y,.92);drawSuzumaru(postGameVolcanoHero.x-48,postGameVolcanoHero.y+15,.96);drawYuno(postGameVolcanoHero.x-92,postGameVolcanoHero.y+18,.94);drawGyou(postGameVolcanoHero.x-135,postGameVolcanoHero.y+22,.92);ctx.restore();
  const ht=hudTop();ctx.fillStyle='rgba(15,25,35,.88)';ctx.fillRect(18,ht,520,48);text(`火山　Lv.${progress.level}　${progress.gold}G`,35,ht+24,17);text('ドラゴン挑戦と同系統の強敵が出現',745,ht+24,14,'center','#ffe0b0');
}
function drawPostGameCircus(){
 ctx.fillStyle='#91d7e4';ctx.fillRect(0,0,W,H);rect(0,300,W,240,'#79b86d');
 // striped circus base and ship
 outlineRect(95,180,330,180,'#f5e7bd','#9b3f45',4);
 for(let x=105;x<415;x+=52)rect(x,190,26,160,'#d94d55');
 text('ちぇすたぴサーカス団',260,215,20,'center','#6f2733',900);
 ctx.fillStyle='#8c5438';ctx.beginPath();ctx.moveTo(565,330);ctx.lineTo(875,330);ctx.lineTo(820,420);ctx.lineTo(620,420);ctx.closePath();ctx.fill();
 for(let x=600;x<840;x+=44)rect(x,285,22,45,x%88===0?'#e24d55':'#f0d27d');
 text('ちぇすたぴサーカス団',720,365,18,'center','#fff3c8',900);
 drawDashmiu(470,360,1.0);
 drawHeroFox(570,395,.95);
 drawSuzumaru(525,408,.88);
 drawYuno(485,412,.86);
 drawGyou(445,415,.86);
 text(scene==='postGameCircusTalk'?'Aで会話を進める':'ダッシュミウに話しかける',480,hudTop()+24,17,'center','#ffffff',900);
 text('ダッシュミウ',470,330,14,'center','#17324a',900);
}

function drawPostGameRaidShip(){
  const sea=ctx.createLinearGradient(0,0,0,H);sea.addColorStop(0,'#9cdef0');sea.addColorStop(.58,'#73c3dc');sea.addColorStop(.59,'#2f7ea0');sea.addColorStop(1,'#1f607f');
  ctx.fillStyle=sea;ctx.fillRect(0,0,W,H);
  for(let x=0;x<W;x+=95){rect(x,360+(x%3)*12,58,4,'rgba(255,255,255,.5)');}
  // same colorful circus ship motif, now at sea
  ctx.fillStyle='#8c5438';ctx.beginPath();ctx.moveTo(185,300);ctx.lineTo(790,300);ctx.lineTo(715,420);ctx.lineTo(275,420);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#e7b84e';ctx.lineWidth=5;ctx.stroke();
  rect(450,120,10,185,'#e9d49b');
  ctx.fillStyle='#f5e7c8';ctx.beginPath();ctx.moveTo(460,130);ctx.lineTo(700,225);ctx.lineTo(460,260);ctx.closePath();ctx.fill();
  for(let x=478;x<685;x+=42){ctx.fillStyle=(Math.floor((x-478)/42)%2===0)?'#d84c4c':'#f0c94f';ctx.beginPath();ctx.moveTo(x,146);ctx.lineTo(x+25,156);ctx.lineTo(x+25,244);ctx.lineTo(x,250);ctx.closePath();ctx.fill();}
  outlineRect(310,325,350,40,'#fff3c9','#9d4b45',2);text('ちぇすたぴサーカス団',485,345,19,'center','#9b3044',900);
  drawDashmiu(275,330,1.1);
  drawHeroFox(555,337,.88);drawSuzumaru(515,350,.82);drawYuno(478,354,.80);drawGyou(442,356,.80);
  text('海賊拠点へ向けて出航――',480,70,25,'center','#17324a',900);
  text('Aで進む',480,475,16,'center','#eaf7fb',800);
}
function drawPostGameRaid(){
 const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#8aa1aa');gr.addColorStop(1,'#665b50');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
 rect(0,335,W,205,'#756854');ctx.fillStyle='#3e4850';ctx.beginPath();ctx.moveTo(0,335);ctx.lineTo(200,225);ctx.lineTo(390,335);ctx.lineTo(620,190);ctx.lineTo(850,335);ctx.closePath();ctx.fill();
 outlineRect(700,250,180,120,'#5a3c32','#c56c55',4);text('海賊拠点',790,282,21,'center','#ffe0c0',900);
 for(let i=0;i<8;i++){const x=110+i*92,y=365+(i%2)*35;ellipse(x,y,18,18,i%3===0?'#f0f0e8':'#b67a58');rect(x-17,y+15,34,42,'#d97832');}
 drawHeroFox(350,430,.95);drawSuzumaru(305,445,.9);drawYuno(260,448,.88);drawGyou(218,450,.88);
 text(`海賊拠点　連戦 ${Math.min(postGameRaidWave+1,4)}/4`,35,hudTop()+24,18,'left','#fff',900);
}
function drawPostGameRaidClear(){
 drawPostGameRaid();const d=postGameRaidClearDialog[Math.min(dialogIndex,postGameRaidClearDialog.length-1)];drawDialog(d[0],d[1]);
}
function drawDragonTrail(){
  camera.x=Math.max(0,Math.min(700,dragonTrailHero.x-W*.42));
  ctx.save();ctx.translate(-camera.x,0);
  const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#5f6670');gr.addColorStop(1,'#9c694c');ctx.fillStyle=gr;ctx.fillRect(0,0,1660,H);
  ctx.fillStyle='#4e4b49';ctx.beginPath();ctx.moveTo(0,500);ctx.lineTo(300,380);ctx.lineTo(620,440);ctx.lineTo(900,285);ctx.lineTo(1200,365);ctx.lineTo(1510,225);ctx.lineTo(1660,270);ctx.lineTo(1660,540);ctx.lineTo(0,540);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c58b61';ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(80,465);ctx.bezierCurveTo(500,420,780,390,1030,350);ctx.bezierCurveTo(1260,320,1430,285,1590,260);ctx.stroke();
  // summit supply stall
  outlineRect(260,300,150,72,'#6f4e3c','#e2c38c',3);text('山頂売店',335,326,17,'center','#fff3d0',900);text('A：買い物',335,350,13,'center','#f5dfba');
  dragonTrailMobs.forEach(m=>drawSurveyMonster(m));
  drawHeroFox(dragonTrailHero.x,dragonTrailHero.y,.92);drawSuzumaru(dragonTrailHero.x-48,dragonTrailHero.y+15,.96);drawYuno(dragonTrailHero.x-92,dragonTrailHero.y+18,.94);drawGyou(dragonTrailHero.x-135,dragonTrailHero.y+22,.92);
  ctx.restore();
  const ht=hudTop();ctx.fillStyle='rgba(15,25,35,.88)';ctx.fillRect(18,ht,540,48);
  text(`古竜への登山道　Lv.${progress.level}　${progress.gold}G`,35,ht+24,17);
  text('右端が頂上 / 魔物は約10秒で復活',730,ht+24,14,'center','#ffe0b0');
}
function drawDragonTrailShop(){
  ctx.fillStyle='#172333';ctx.fillRect(0,0,W,H);
  text('火山頂上への売店',52,42,27,'left','#fff0c5',900);
  outlineRect(805,205,130,82,'#263a50','#e5bd68',2);
  text('所持金',870,229,14,'center','#ffe9ad',800);
  text(`${progress.gold} G`,870,258,22,'center','#fff6d7',900);

  const rows=[
    ['高級回復薬','HP70回復 / 75G',false],
    ['烈風の強弓','ユーノ専用　攻撃+6・MP約1/3減 / 260G',!!progress.shopBought.summitBow],
    ['黒曜の剛槍','ジュウ用　攻撃+12・防御+5 / 300G',!!progress.shopBought.summitSpear],
    ['水晶の小剣','主人公専用　攻撃+10・氷威力+30%・MP半減 / 360G',!!progress.shopBought.heroManaBlade],
    ['炎獣のグローブ','スズマル専用　毎T攻撃UP・炎威力+30%・MP25%減 / 340G',!!progress.shopBought.suzuGloves],
    ['風刻の腕輪','ユーノ専用　支援+1T・風魔法威力+30% / 340G',!!progress.shopBought.yunoBracelet],
    ['地脈の大盾','ジュウ専用　被ダメ25%減・被弾時MP回復 / 360G',!!progress.shopBought.gyouShield],
    ['店を出る','登山道へ戻る',false]
  ];
  rows.forEach((r,i)=>{
    const y=72+i*50,sel=dragonTrailShopSelection===i;
    outlineRect(55,y,735,43,sel?'#fff3d6':(i===7?'#344a64':'#e4edf2'),sel?'#e0a954':(i===7?'#718aa0':'#7793a6'),2);
    text(`${sel?'▶ ':''}${r[0]}`,75,y+16,15,'left',i===7&&!sel?'#e5eef4':'#17324a',900);
    text(r[1],285,y+16,12,'left',i===7&&!sel?'#b8c9d5':'#425f70');
    if(r[2])text('購入済み',770,y+16,12,'right','#7a6955',800);
  });
  text('↑↓ / タップ：選択　A / Enter：決定',480,493,14,'center','#d6e6ef');
}
function drawEnd(){
  ctx.fillStyle='#0c1830';ctx.fillRect(0,0,W,H);
  drawHeroFox(245,250,1.05);drawSuzumaru(355,255,1.14);drawDashmiu(465,262,1.03);drawYuno(575,255,1.12);drawGyou(685,255,1.14);
  text('THE END',480,82,44,'center','#f1e2ad');
  text('りすぺく島に平和が戻った',480,350,26,'center','#d8efff');
  text('A / Enter でタイトルへ',480,430,20,'center','#9fc8df');
  if(progress.gameCleared)text('タイトルに「ドラゴンに挑戦」が追加されました',480,472,16,'center','#e7c47d');
}
function chaseFieldMob(mon,px,py,dt,range=260,speed=52){
  if(!mon||!mon.alive)return;
  const dx=px-mon.x,dy=py-mon.y,d=Math.hypot(dx,dy);
  if(d>38&&d<range){mon.x+=dx/d*speed*dt;mon.y+=dy/d*speed*dt;}
}

// ---- 8bit BGM ------------------------------------------------------------
let bgmCtx=null,bgmMaster=null,bgmTimer=null,bgmStep=0,bgmTrack='',bgmEnabled=true,gameAudioActive=!document.hidden;
const BGM={
  // 序盤：オープニング～さるびえ村到着まで。明るい旅立ち感。
  early:{tempo:225,lead:[64,67,69,72,69,67,64,62,60,64,67,69,67,64,62,60],bass:[48,null,55,null,53,null,55,null]},
  // 中盤：さるびえ村～さるびび村滞在まで。仲間が増えて少し賑やか。
  middle:{tempo:195,lead:[67,71,74,76,74,71,69,67,64,67,71,72,71,69,67,64],bass:[43,null,50,null,48,null,52,null]},
  // さるびび村を出た後。海賊戦が近づく、やや緊迫感のある曲。
  tense:{tempo:155,lead:[62,65,67,70,69,67,65,62,60,62,65,69,67,65,62,60],bass:[38,38,41,null,43,43,41,null]},
  battle:{tempo:125,lead:[64,64,67,69,71,69,67,64,67,67,71,72,74,72,71,67],bass:[40,40,43,45,47,45,43,40]},
  boss:{tempo:105,lead:[52,55,59,60,59,55,52,50,52,55,60,62,60,59,55,52],bass:[40,40,38,38,36,36,35,35]},
  dragon:{tempo:92,lead:[57,60,64,63,60,57,55,52,57,60,65,64,60,57,55,52],bass:[33,33,36,36,35,35,31,31]},
  ending:{tempo:260,lead:[60,64,67,72,71,67,64,60,62,65,69,74,72,69,65,62],bass:[48,null,52,null,53,null,55,null]}
};
function bgmInit(){
  if(bgmCtx)return;
  try{
    bgmCtx=new (window.AudioContext||window.webkitAudioContext)();
    bgmMaster=bgmCtx.createGain();bgmMaster.gain.value=.055;bgmMaster.connect(bgmCtx.destination);
  }catch(e){bgmEnabled=false;}
}
function bgmTone(note,dur,type='square',vol=1){
  if(!gameAudioActive||!bgmCtx||note==null)return;
  const t=bgmCtx.currentTime,o=bgmCtx.createOscillator(),v=bgmCtx.createGain();
  o.type=type;o.frequency.value=440*Math.pow(2,(note-69)/12);
  v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(Math.max(.0002,.11*vol),t+.008);
  v.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(v);v.connect(bgmMaster);o.start(t);o.stop(t+dur+.02);
}

let sfxEnabled=true;
function sfxTone(freq,dur=.08,type='square',vol=.5,endFreq=null){
  if(!gameAudioActive)return;bgmInit();if(!bgmCtx||!sfxEnabled)return;
  if(bgmCtx.state==='suspended')bgmCtx.resume();
  const t=bgmCtx.currentTime,o=bgmCtx.createOscillator(),v=bgmCtx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);
  if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+dur);
  v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(.09*vol,t+.006);
  v.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(v);v.connect(bgmMaster);o.start(t);o.stop(t+dur+.02);
}
function sfx(name){
  if(!sfxEnabled)return;
  if(name==='decide'){sfxTone(660,.055,'square',.42);setTimeout(()=>sfxTone(880,.055,'square',.36),45);}
  else if(name==='attack'){sfxTone(520,.09,'square',.52,150);}
  else if(name==='slash'){sfxTone(900,.11,'sawtooth',.48,180);}
  else if(name==='bow'){sfxTone(760,.07,'square',.38,360);setTimeout(()=>sfxTone(1120,.05,'square',.28),55);}
  else if(name==='spear'){sfxTone(430,.10,'sawtooth',.45,920);}
  else if(name==='ice'){sfxTone(1250,.13,'square',.36,520);setTimeout(()=>sfxTone(1750,.08,'triangle',.30),55);}
  else if(name==='fire'){sfxTone(210,.15,'sawtooth',.48,620);setTimeout(()=>sfxTone(130,.10,'square',.28),65);}
  else if(name==='wind'){sfxTone(820,.18,'sine',.38,1450);}
  else if(name==='earth'){sfxTone(120,.17,'square',.50,70);}
  else if(name==='heal'){sfxTone(520,.09,'sine',.35);setTimeout(()=>sfxTone(780,.10,'sine',.32),70);setTimeout(()=>sfxTone(1040,.12,'sine',.28),140);}
  else if(name==='hit'){sfxTone(150,.09,'square',.55,75);}
  else if(name==='guard'){sfxTone(180,.10,'square',.38);setTimeout(()=>sfxTone(260,.07,'triangle',.28),50);}
  else if(name==='buy'){sfxTone(700,.05,'square',.35);setTimeout(()=>sfxTone(900,.05,'square',.35),55);setTimeout(()=>sfxTone(1200,.08,'square',.30),110);}
  else if(name==='win'){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>sfxTone(f,.16,'square',.30),i*95));}
  else if(name==='boss'){sfxTone(95,.28,'sawtooth',.48,55);}
}

function bgmWanted(){
  if(scene==='battle'){
    if(battle&&battle.type==='postDragon')return 'dragon';
    if(battle&&(battle.type==='pirateCaptain'||battle.type==='viceCaptain'))return 'boss';
    if(battle&&battle.monsterId===900)return 'boss';
    if(battle&&battle.monsterId===950)return 'dragon';
    return 'battle';
  }
  if(scene==='ending'||scene==='endingFinal'||scene==='ngPlusEnding'||scene==='end')return 'ending';

  // 第1期：ゲーム開始～さるびえ村へ到着するまで。
  const earlyScenes=[
    'title','cutscene','world','villageDialog','departureDialog','road2','menu'
  ];
  if(earlyScenes.includes(scene))return 'early';

  // 第2期：さるびえ村到着～さるびび村での事件解決まで。
  // さるびび村に滞在している間もこの曲を継続し、村を出発した時点で切り替える。
  const middleScenes=[
    'sarubieArrival','sarubieTown','shop','cave','sarubieRitual','route3',
    'sarubibiArrival','sarubibiTown','sarubibiShop','nightIntro','nightTrail',
    'tsukipopoReveal','sarubibiResolve'
  ];
  if(middleScenes.includes(scene))return 'middle';

  // 第3期：さるびび村を出てからエンディング直前まで。
  // たけぞ村、防衛準備、最終決戦前などは同じ少し緊迫したテーマ。
  return 'tense';
}
function bgmStart(name){
  if(!bgmEnabled||!gameAudioActive)return;
  bgmInit();if(!bgmCtx)return;
  if(bgmCtx.state==='suspended')bgmCtx.resume();
  if(bgmTrack===name&&bgmTimer)return;
  if(bgmTimer)clearInterval(bgmTimer);
  bgmTrack=name;bgmStep=0;
  const tr=BGM[name]||BGM.field;
  const tick=()=>{
    const n=bgmStep++;
    bgmTone(tr.lead[n%tr.lead.length],tr.tempo/1000*.72,'square',.72);
    if(n%2===0)bgmTone(tr.bass[Math.floor(n/2)%tr.bass.length],tr.tempo/1000*1.55,'triangle',.48);
  };
  tick();bgmTimer=setInterval(tick,tr.tempo);
}
function bgmSync(){if(!bgmEnabled||!gameAudioActive)return;const wanted=bgmWanted();if(wanted!==bgmTrack||!bgmTimer)bgmStart(wanted);}
function bgmToggle(){
  bgmEnabled=!bgmEnabled;
  if(!bgmEnabled){if(bgmTimer)clearInterval(bgmTimer);bgmTimer=null;bgmTrack='';}
  else if(gameAudioActive)bgmStart(bgmWanted());
  flashText=`BGM ${bgmEnabled?'ON':'OFF'}`;flashTimer=1.2;
}

function pauseGameAudio(){
  gameAudioActive=false;
  if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}
  if(bgmCtx&&bgmCtx.state==='running'){try{bgmCtx.suspend();}catch(e){}}
}
function resumeGameAudio(){
  if(document.hidden)return;
  gameAudioActive=true;
  if(!bgmEnabled)return;
  bgmInit();
  if(!bgmCtx)return;
  const resume=()=>{bgmSync();};
  if(bgmCtx.state==='suspended'){
    try{const p=bgmCtx.resume();if(p&&p.then)p.then(resume).catch(()=>{});else resume();}catch(e){}
  }else resume();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGameAudio();else resumeGameAudio();});
window.addEventListener('pagehide',pauseGameAudio);
window.addEventListener('pageshow',()=>{if(!document.hidden)resumeGameAudio();});
window.addEventListener('blur',pauseGameAudio);
window.addEventListener('focus',()=>{if(!document.hidden)resumeGameAudio();});

['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,()=>{
  if(bgmEnabled&&gameAudioActive){bgmInit();if(bgmCtx&&bgmCtx.state==='suspended')bgmCtx.resume();bgmSync();}
},{once:true,passive:true}));

function update(dt){
  if(scene==='sealedGateIntro' && dialogIndex>=sealedGateDialog.length){
    enterSealedCave();
    return;
  }

  if(scene==='postGameElderTalk' &&
     (progress.klausDefeated||progress.postGamePirateRaidCleared) &&
     !progress.nineTailStoryComplete &&
     (progress.heroPebbleRandom||0)>=3 &&
     (progress.heroIceSkill||0)>=3){
    scene='nineTailElderTalk';dialogIndex=0;
    touchUI.classList.remove('hidden');
  }
  if(scene==='nineTailElderTalk'||scene==='nineTailHouse'||scene==='nineTailPostTalk'||scene==='sealedGateIntro'||scene==='sealedCave'){
    touchUI.classList.remove('hidden');
    if(scene==='nineTailElderTalk'&&(dialogIndex<0||dialogIndex>=nineTailElderCheckDialog.length))dialogIndex=0;
    if(scene==='nineTailHouse'&&(dialogIndex<0||dialogIndex>=nineTailHouseDialog.length))dialogIndex=0;
  }
  if(scene==='postGameRaidClear')touchUI.classList.remove('hidden');
  if(scene==='postGameCircusTalk'){
    touchUI.classList.remove('hidden');
    if(dialogIndex<0 || dialogIndex>=postGameCircusDialog.length)dialogIndex=0;
  }
  if(scene==='postGameCircus'){
    scene='postGameCircusTalk';dialogIndex=0;touchUI.classList.remove('hidden');
    return;
  }
  if(bgmCtx&&bgmEnabled&&gameAudioActive)bgmSync();
  if(scene==='dragonSummit' || scene==='dragonConfirm'){
    startPostDragonBattle();
    return;
  }
  if(scene==='postGameIsland'){let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;dx+=touchVector.x;dy+=touchVector.y;const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);postGameHero.x+=dx*postGameHero.speed*dt;postGameHero.y+=dy*postGameHero.speed*dt;}postGameHero.x=Math.max(45,Math.min(920,postGameHero.x));postGameHero.y=Math.max(82,Math.min(500,postGameHero.y));const es=[['sarubie',207,392],['brifo',277,252],['sarubibi',682,392],['takezo',702,222]];for(const [a,x,y] of es)if(Math.hypot(postGameHero.x-x,postGameHero.y-y)<34){postGameArea=a;postGameHero.x=220;postGameHero.y=430;scene='postGameVillage';saveGame();return;}if(Math.hypot(postGameHero.x-480,postGameHero.y-222)<65){postGameVolcanoHero.x=180;postGameVolcanoHero.y=455;scene='postGameVolcano';saveGame();return;}
 if(postGameRaidUnlocked&&Math.hypot(postGameHero.x-480,postGameHero.y-95)<65){
  postGameHero.x=500;postGameHero.y=420;
  scene='postGameCircusTalk';dialogIndex=0;
  touchUI.classList.remove('hidden');
  saveGame();return;
}return;}
  if(scene==='postGameVillage'){let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;dx+=touchVector.x;dy+=touchVector.y;const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);postGameHero.x+=dx*postGameHero.speed*dt;postGameHero.y+=dy*postGameHero.speed*dt;}postGameHero.x=Math.max(45,Math.min(920,postGameHero.x));postGameHero.y=Math.max(250,Math.min(500,postGameHero.y));if(postGameHero.x<175&&postGameHero.y>385){const back={sarubie:[207,430],brifo:[277,290],sarubibi:[682,430],takezo:[702,260]}[postGameArea]||[480,400];postGameHero.x=back[0];postGameHero.y=back[1];scene='postGameIsland';saveGame();}return;}
  if(scene==='postGameVolcano'){for(const m of postGameVolcanoMobs){if(!m.alive&&m.respawn>0){m.respawn-=dt;if(m.respawn<=0){m.alive=true;m.hp=m.maxHP;m.x=m.spawnX;m.y=m.spawnY;}}}let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;dx+=touchVector.x;dy+=touchVector.y;const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);postGameVolcanoHero.x+=dx*postGameVolcanoHero.speed*dt;postGameVolcanoHero.y+=dy*postGameVolcanoHero.speed*dt;}postGameVolcanoHero.x=Math.max(55,Math.min(1430,postGameVolcanoHero.x));postGameVolcanoHero.y=Math.max(245,Math.min(495,postGameVolcanoHero.y));if(postGameVolcanoHero.x<165&&postGameVolcanoHero.y>385){postGameHero.x=480;postGameHero.y=300;scene='postGameIsland';saveGame();return;}for(const m of postGameVolcanoMobs){chaseFieldMob(m,postGameVolcanoHero.x,postGameVolcanoHero.y,dt,280,58);if(m.alive&&Math.hypot(postGameVolcanoHero.x-m.x,(postGameVolcanoHero.y-m.y)*1.25)<38){startPostGameVolcanoBattle(m);return;}}return;}
  if(scene==='sealedCave'){
    let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);sealedCaveHero.x+=dx*sealedCaveHero.speed*dt;sealedCaveHero.y+=dy*sealedCaveHero.speed*dt;}
    sealedCaveHero.x=Math.max(45,Math.min(920,sealedCaveHero.x));sealedCaveHero.y=Math.max(245,Math.min(500,sealedCaveHero.y));
    if(sealedCaveHero.x<42){postGameHero.x=700;postGameHero.y=165;if(progress.orochiDefeated)progress.nineTailSoloQuest=false;scene='postGameIsland';touchUI.classList.remove('hidden');saveProgress();saveGame();return;}
    for(const m of sealedCaveMobs){if(m.alive&&Math.hypot(sealedCaveHero.x-m.x,sealedCaveHero.y-m.y)<42){startSealedDragonBattle(m);return;}}
    if(!progress.orochiDefeated&&sealedCaveHero.x>845){startOrochiBattle();return;}
    return;
  }
  if(scene==='dragonTrail'){
    for(const m of dragonTrailMobs){if(!m.alive&&m.respawn>0){m.respawn-=dt;if(m.respawn<=0){m.alive=true;m.hp=m.maxHP;m.x=m.spawnX;m.y=m.spawnY;}}}
    let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);dragonTrailHero.x+=dx*dragonTrailHero.speed*dt;dragonTrailHero.y+=dy*dragonTrailHero.speed*dt;}
    dragonTrailHero.x=Math.max(55,Math.min(1605,dragonTrailHero.x));dragonTrailHero.y=Math.max(245,Math.min(495,dragonTrailHero.y));
    for(const m of dragonTrailMobs){
      const dx=dragonTrailHero.x-m.x,dy=(dragonTrailHero.y-m.y)*1.25;
      if(m.alive&&Math.hypot(dx,dy)<34){startDragonTrailBattle(m);return;}
    }
    if(dragonTrailHero.x>1575){
      startPostDragonBattle();
      return;
    }
  } else if(scene==='finalBearField'){
    let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);finalBearHero.x+=dx*finalBearHero.speed*dt;finalBearHero.y+=dy*finalBearHero.speed*dt;}
    finalBearHero.x=Math.max(60,Math.min(1190,finalBearHero.x));finalBearHero.y=Math.max(260,Math.min(500,finalBearHero.y));
    if(finalBear.alive&&Math.hypot(finalBearHero.x-finalBear.x,finalBearHero.y-finalBear.y)<95){startFinalBearBattle();}
  } else if(scene==='world'){
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

    for(const mon of monsters)chaseFieldMob(mon,hero.x,hero.y,dt,280,55);
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
  } else if(scene==='coastSurveyField'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);coastSurveyHero.x+=dx*coastSurveyHero.speed*dt;coastSurveyHero.y+=dy*coastSurveyHero.speed*dt;}
    coastSurveyHero.x=Math.max(90,Math.min(1120,coastSurveyHero.x));coastSurveyHero.y=Math.max(290,Math.min(500,coastSurveyHero.y));
    if(bananaSharkAlive && coastSurveyHero.x>790){startBananaSharkBattle();}
  } else if(scene==='volcanoSurveyField'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);volcanoSurveyHero.x+=dx*volcanoSurveyHero.speed*dt;volcanoSurveyHero.y+=dy*volcanoSurveyHero.speed*dt;}
    volcanoSurveyHero.x=Math.max(90,Math.min(1320,volcanoSurveyHero.x));volcanoSurveyHero.y=Math.max(300,Math.min(500,volcanoSurveyHero.y));
    for(const mon of volcanoSurveyMobs)chaseFieldMob(mon,volcanoSurveyHero.x,volcanoSurveyHero.y,dt,290,58);
    for(const mon of volcanoSurveyMobs){
      if(mon.alive&&Math.hypot(volcanoSurveyHero.x-mon.x,volcanoSurveyHero.y-mon.y)<62){startVolcanoSurveyBattle(mon);break;}
    }
    if(scene==='volcanoSurveyField' && volcanoSurveyMobs.every(m=>!m.alive) && volcanoSurveyHero.x>1220){
      scene='takezoVolcanoSurvey';dialogIndex=0;touchUI.classList.add('hidden');
    }
  } else if(scene==='takezoTravel'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      takezoTravelHero.x+=dx*takezoTravelHero.speed*dt;takezoTravelHero.y+=dy*takezoTravelHero.speed*dt;
    }
    takezoTravelHero.x=Math.max(80,Math.min(1380,takezoTravelHero.x));
    takezoTravelHero.y=Math.max(210,Math.min(520,takezoTravelHero.y));
    if(takezoScout.alive && Math.hypot(takezoTravelHero.x-takezoScout.x,takezoTravelHero.y-takezoScout.y)<72){
      startTakezoScoutBattle();
    }else if(!takezoScout.alive && takezoTravelHero.x>1320){
      scene='takezoArrival';dialogIndex=0;touchUI.classList.add('hidden');
    }
  } else if(scene==='takezoRoute'){
    // Defensive repair for old/partial saves: no living squad can remain off the road.
    for(const m of takezoMobs){
      if(m.alive && (m.x<500 || m.x>1250 || m.y<300 || m.y>480))repairTakezoSquads();
    }
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;
    if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);takezoHero.x+=dx*takezoHero.speed*dt;takezoHero.y+=dy*takezoHero.speed*dt;}
    takezoHero.x=Math.max(90,Math.min(1430,takezoHero.x));takezoHero.y=Math.max(260,Math.min(510,takezoHero.y));
    for(const mon of takezoMobs)chaseFieldMob(mon,takezoHero.x,takezoHero.y,dt,300,62);
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
    for(const mon of route3Mobs)chaseFieldMob(mon,route3Hero.x,route3Hero.y,dt,285,58);
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
    for(const mon of caveMobs)chaseFieldMob(mon,caveHero.x,caveHero.y,dt,250,48);
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
          if(checkPartyWipe())return;
          battle.turn='player';
          battleActor='hero';
          battleMenu='main';
          battleCooldown=0;
          if(!isPartyActorConscious('hero')&&isPartyBattle())advancePartyTurn();
        }
        else if(battle.turn==='lose'){
          battle=null;scene='title';titleSelection=0;touchUI.classList.add('hidden');
        }
        else if(battle.turn==='win')finishBattle();
        else if(battle.turn==='run'){
          scene=(battle&&battle.monsterId>=1101&&battle.monsterId<=1199)?'sealedCave':
                (battle&&battle.monsterId>=980&&battle.monsterId<=990)?'postGameRaid':
                (battle&&battle.monsterId>=970&&battle.monsterId<=973)?'postGameVolcano':
                (battle&&battle.monsterId>=960&&battle.monsterId<=963)?'dragonTrail':
                (battle&&battle.monsterId===460)?'coastSurveyField':
                (battle&&(battle.monsterId===470||battle.monsterId===471))?'volcanoSurveyField':
                (battle&&battle.monsterId===450)?'takezoTravel':
                (battle&&battle.monsterId>=400)?'takezoRoute':'road2';
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
function startFromInitialState(){
  ['risupekuProgress','risupekuSave','risupekuHeroName'].forEach(k=>localStorage.removeItem(k));
  location.reload();
}
function enterSealedCave(){
  progress.nineTailSoloQuest=true;
  sealedCaveHero.x=220;
  sealedCaveHero.y=455;
  dialogIndex=0;
  scene='sealedCave';
  touchUI.classList.remove('hidden');
  saveProgress();
  saveGame();
}
function pressAction(){
  if(!nameOverlay.classList.contains('hidden'))return;
  if(scene==='title'){
    if(titleSelection===4 && progress.ngPlusUnlocked){
      ngPlusMode=true;scene='cutscene';dialogIndex=0;touchUI.classList.add('hidden');return;
    }
    if(titleSelection===3 && progress.gameCleared){
      suzumaruActive=true;suzumaruJoined=true;yunoJoined=true;gyouJoinConfirmed=true;gyouJoined=true;
      syncStoryParty();
      dragonTrailHero.x=130;dragonTrailHero.y=455;
      dragonTrailMobs.forEach(m=>{m.alive=true;m.respawn=0;m.x=m.spawnX;m.y=m.spawnY;});
      scene='dragonCall';dialogIndex=0;touchUI.classList.add('hidden');return;
    }
    if(titleSelection===2){
      if(hasSaveGame()){if(loadGame())return;}
      flashText='つづきから遊べるデータがありません';flashTimer=1.8;return;
    }
    if(titleSelection===1){startFromInitialState();return;}
    scene='cutscene';dialogIndex=0;touchUI.classList.add('hidden');return;
  }
  if(scene==='cutscene'){
    dialogIndex++;
    if(dialogIndex>=prologue.length){
      if(ngPlusMode){scene='ngPlusVillage';dialogIndex=0;touchUI.classList.add('hidden');}
      else{scene='world';dialogIndex=0;touchUI.classList.remove('hidden');flashText='ダッシュミウをぶりふぉ村へ！';flashTimer=2.2;}
    }
    return;
  }
  if(scene==='ngPlusVillage'){
    dialogIndex++;if(dialogIndex>=ngPlusVillageDialog.length){scene='ngPlusReturn';dialogIndex=0;}return;
  }
  if(scene==='ngPlusReturn'){
    dialogIndex++;if(dialogIndex>=ngPlusReturnDialog.length){scene='ngPlusOverhead';dialogIndex=0;}return;
  }
  if(scene==='ngPlusOverhead'){
    dialogIndex++;
    if(dialogIndex>=ngPlusOverheadDialog.length){scene='ngPlusBlizzard';dialogIndex=0;touchUI.classList.remove('hidden');}
    return;
  }
  if(scene==='ngPlusBlizzard'){scene='ngPlusAfterBlizzard';dialogIndex=0;return;}
  if(scene==='ngPlusAfterBlizzard'){
    dialogIndex++;if(dialogIndex>=ngPlusAfterBlizzardDialog.length){scene='ngPlusBossIntro';dialogIndex=0;}return;
  }
  if(scene==='ngPlusBossIntro'){
    dialogIndex++;if(dialogIndex>=ngPlusBossIntroDialog.length){startNgPlusBossBattle();}return;
  }
  if(scene==='ngPlusEnding'){
    dialogIndex++;
    if(dialogIndex>=ngPlusEndingDialog.length){ngPlusMode=false;scene='end';dialogIndex=0;touchUI.classList.add('hidden');saveGame();}
    return;
  }
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
      dialogIndex=0;startTsukipopoBattle();
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
      scene='takezoTravel';dialogIndex=0;
      takezoTravelHero.x=180;takezoTravelHero.y=470;
      takezoScout.alive=!takezoScoutDefeated;
      touchUI.classList.remove('hidden');
      flashText='北北東へ進み、たけぞ村を目指そう';flashTimer=2.0;
    }
    return;
  }
  if(scene==='takezoScoutAfter'){
    dialogIndex++;
    if(dialogIndex>=takezoScoutAfterDialog.length){
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
      takezoIntroDone=true;takezoPrepStage=0;
      scene='takezoPlan';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='takezoPlan'){
    dialogIndex++;
    if(dialogIndex>=takezoPlanDialog.length){takezoPrepStage=1;scene='takezoCoastSurvey';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='takezoCoastSurvey'){
    dialogIndex++;
    if(dialogIndex>=takezoCoastDialog.length){
      scene='coastSurveyField';dialogIndex=0;coastSurveyHero.x=160;coastSurveyHero.y=430;bananaSharkAlive=true;
      touchUI.classList.remove('hidden');saveGame();
    }
    return;
  }
  if(scene==='bananaSharkAfter'){
    dialogIndex++;
    if(dialogIndex>=bananaSharkAfterDialog.length){
      takezoPrepStage=2;scene='volcanoSurveyField';dialogIndex=0;
      volcanoSurveyHero.x=160;volcanoSurveyHero.y=470;
      volcanoSurveyMobs.forEach(m=>m.alive=true);
      touchUI.classList.remove('hidden');saveGame();
    }
    return;
  }
  if(scene==='takezoVolcanoSurvey'){
    dialogIndex++;
    if(dialogIndex>=takezoVolcanoDialog.length){takezoPrepStage=3;scene='takezoConstruction';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='takezoConstruction'){
    dialogIndex++;
    if(dialogIndex>=takezoConstructionDialog.length){secondWaveStage=1;scene='secondWaveIntro';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='secondWaveIntro'){
    dialogIndex++;
    if(dialogIndex>=secondWaveIntroDialog.length){secondWaveStage=2;scene='secondWaveRetreat';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='secondWaveRetreat'){
    dialogIndex++;
    if(dialogIndex>=secondWaveRetreatDialog.length){secondWaveStage=3;scene='secondWaveTrap';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='secondWaveTrap'){
    dialogIndex++;
    if(dialogIndex>=secondWaveTrapDialog.length){secondWaveStage=4;scene='secondWaveVictory';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='secondWaveVictory'){
    dialogIndex++;
    if(dialogIndex>=secondWaveVictoryDialog.length){secondWaveStage=5;scene='gyouJoin';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='gyouJoin'){
    dialogIndex++;
    if(dialogIndex>=gyouJoinDialog.length){
      gyouJoined=true;
      gyouJoinConfirmed=true;
      if(!progress.gyouJoinSPGranted){
        progress.gyouSP=totalSPForLevel(progress.level);
        progress.gyouJoinSPGranted=true;
      }
      scene='finalPrep';dialogIndex=0;saveProgress();saveGame();
    }
    return;
  }
  if(scene==='finalPrep'){
    dialogIndex++;
    if(dialogIndex>=finalPrepDialog.length){scene='finalPrepFree';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='finalPrepFree'){
    dialogIndex++;
    if(dialogIndex>=finalPrepFreeDialog.length){scene='gyouTraining';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='gyouTraining'){
    dialogIndex++;
    if(dialogIndex>=gyouTrainingDialog.length){
      progress.gyouGrandGuard=true;saveProgress();scene='finalWeapon';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='finalWeapon'){
    dialogIndex++;
    if(dialogIndex>=finalWeaponDialog.length){
      progress.finalFlameBlade=true;saveProgress();scene='yunoCombo';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='yunoCombo'){
    dialogIndex++;
    if(dialogIndex>=yunoComboDialog.length){
      progress.heroYunoComboUnlocked=true;saveProgress();scene='volcanoBearQuest';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='volcanoBearQuest'){
    dialogIndex++;
    if(dialogIndex>=volcanoBearQuestDialog.length){
      scene='finalBearField';dialogIndex=0;finalBearHero.x=150;finalBearHero.y=430;touchUI.classList.remove('hidden');saveGame();
    }
    return;
  }
  if(scene==='volcanoBearAfter'){
    dialogIndex++;
    if(dialogIndex>=volcanoBearAfterDialog.length){
      progress.volcanoBearCleared=true;saveProgress();scene='finalEve';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='finalEve'){
    dialogIndex++;
    if(dialogIndex>=finalEveDialog.length){
      scene='finalEveFree';dialogIndex=0;touchUI.classList.add('hidden');saveGame();
    }
    return;
  }
  if(scene==='finalLaunch'){
    dialogIndex++;
    if(dialogIndex>=finalLaunchDialog.length){
      scene='finalBattleGround';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='finalBattleGround'){
    dialogIndex++;
    if(dialogIndex>=finalBattleGroundDialog.length){
      scene='finalBalloon';dialogIndex=0;saveGame();
    }
    return;
  }
  if(scene==='finalBalloon'){
    dialogIndex++;
    if(dialogIndex>=finalBalloonDialog.length){scene='pirateCaptainIntro';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='pirateCaptainIntro'){
    dialogIndex++;
    if(dialogIndex>=pirateCaptainIntroDialog.length){dialogIndex=0;startPirateCaptainBattle();}
    return;
  }
  if(scene==='pirateCaptainAfter'){
    dialogIndex++;
    if(dialogIndex>=pirateCaptainAfterDialog.length){scene='ending';dialogIndex=0;saveGame();}
    return;
  }
  if(scene==='ending'){
    dialogIndex++;if(dialogIndex>=endingDialog.length){progress.gameCleared=true;saveProgress();scene='end';dialogIndex=0;saveGame();}return;
  }
  if(scene==='dragonTrail'){
    syncStoryParty();
    if(Math.hypot(dragonTrailHero.x-335,dragonTrailHero.y-350)<135){
      dragonTrailShopSelection=0;scene='dragonTrailShop';touchUI.classList.remove('hidden');return;
    }
    openFieldMenu('dragonTrail');return;
  }
  if(scene==='dragonTrailShop'){buyDragonTrailShop();return;}
  if(scene==='dragonCall'){
    dialogIndex++;
    if(dialogIndex>=dragonCallDialog.length){
      scene='dragonTrail';dialogIndex=0;touchUI.classList.remove('hidden');
      flashText='火山頂上を目指そう。道中で鍛えられる';flashTimer=2.4;saveGame();
    }
    return;
  }
  if(scene==='postDragonClear'){scene='end';dialogIndex=0;return;}
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
  if(scene==='dragonTrailShop'){
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){dragonTrailShopSelection=(dragonTrailShopSelection+7)%8;e.preventDefault();return;}
    if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){dragonTrailShopSelection=(dragonTrailShopSelection+1)%8;e.preventDefault();return;}
    if(e.key==='Enter'||e.key===' '||e.key==='z'||e.key==='Z'){e.preventDefault();buyDragonTrailShop();return;}
    if(e.key==='Escape'||e.key==='x'||e.key==='X'){scene='dragonTrail';touchUI.classList.remove('hidden');return;}
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

  if(scene==='finalEveFree'){
    scene='finalLaunch';dialogIndex=0;saveGame();return;
  }

  if(scene==='postGameVillage'&&postGameArea==='brifo'&&Math.hypot(postGameHero.x-700,postGameHero.y-385)<100){
    if((progress.klausDefeated||progress.postGamePirateRaidCleared) &&
       (progress.heroPebbleRandom||0)>=3 && (progress.heroIceSkill||0)>=3){
      if(!progress.nineTailStoryComplete){scene='nineTailElderTalk';dialogIndex=0;touchUI.classList.remove('hidden');return;}
      if(progress.orochiDefeated&&!progress.fourAbyssUnlocked&&progress.hiddenSkills?.suzu&&progress.hiddenSkills?.yuno&&progress.hiddenSkills?.gyou){scene='fourAbyssTalk';dialogIndex=0;touchUI.classList.remove('hidden');return;}
      scene='nineTailPostTalk';dialogIndex=0;touchUI.classList.remove('hidden');return;
    }
    scene='postGameElderTalk';dialogIndex=0;touchUI.classList.add('hidden');return;
  }
  if(scene==='nineTailElderTalk'){
    dialogIndex++;
    if(dialogIndex>=nineTailElderCheckDialog.length){
      progress.nineTailSoloQuest=true;
      scene='nineTailHouse';dialogIndex=0;touchUI.classList.remove('hidden');saveProgress();saveGame();
    }
    return;
  }
  if(scene==='nineTailHouse'){
    touchUI.classList.remove('hidden');
    if(dialogIndex < nineTailHouseDialog.length-1){
      dialogIndex++;
      if(dialogIndex>=1 && !progress.nineTailGear){
        progress.nineTailGear=true;
        progress.nineTailQuestUnlocked=true;
        progress.sealedCaveUnlocked=true;
        saveProgress();saveGame();
      }
      return;
    }
    if(!progress.nineTailGear){
      progress.nineTailGear=true;
      progress.nineTailQuestUnlocked=true;
      progress.sealedCaveUnlocked=true;
      saveProgress();
    }
    progress.nineTailStoryComplete=true;
    progress.nineTailGear=true;
    progress.nineTailQuestUnlocked=true;
    progress.sealedCaveUnlocked=true;
    saveProgress();
    scene='postGameVillage';postGameArea='brifo';postGameHero.x=650;postGameHero.y=420;dialogIndex=0;
    touchUI.classList.remove('hidden');saveGame();
    return;
  }
  if(scene==='sealedGateIntro'){
    touchUI.classList.remove('hidden');
    if(dialogIndex < sealedGateDialog.length-1){
      dialogIndex++;
      return;
    }
    enterSealedCave();
    return;
  }
  if(scene==='fourAbyssTalk'){dialogIndex++;if(dialogIndex>=fourAbyssDialog.length){progress.fourAbyssUnlocked=true;progress.nineTailSoloQuest=false;saveProgress();scene='postGameVillage';postGameArea='brifo';dialogIndex=0;flashText='4人で異界へ行けるようになった！';flashTimer=3;saveGame();}return;}
  if(scene==='nineTailPostTalk'){
    scene='postGameVillage';dialogIndex=0;touchUI.classList.remove('hidden');saveGame();return;
  }
  if(scene==='postGameElderTalk'){
    const arr=progress.postDragonDefeated?postGameElderDragonDialog:postGameElderDialog;dialogIndex++;
    if(dialogIndex>=arr.length){if(progress.postDragonDefeated){postGameRaidUnlocked=true;postGameElderTalked=true;}scene='postGameVillage';dialogIndex=0;touchUI.classList.remove('hidden');saveGame();}return;
  }
  if(scene==='postGameCircus'){scene='postGameCircusTalk';dialogIndex=0;touchUI.classList.add('hidden');return;}
  if(scene==='postGameCircusTalk'){
    touchUI.classList.remove('hidden');
    if(dialogIndex < postGameCircusDialog.length-1){
      dialogIndex++;
      return;
    }
    postGameRaidWave=0;
    suzumaruActive=true;suzumaruJoined=true;yunoJoined=true;gyouJoinConfirmed=true;gyouJoined=true;syncStoryParty();
    scene='postGameRaidShip';dialogIndex=0;
    touchUI.classList.remove('hidden');
    saveGame();
    return;
  }
  if(scene==='postGameRaidShip'){
    scene='postGameRaid';dialogIndex=0;touchUI.classList.remove('hidden');
    flashText='海賊拠点へ上陸！';flashTimer=1.0;saveGame();startPostGameRaidWave();return;
  }
  if(scene==='postGameRaidClear'){
    dialogIndex++;
    if(dialogIndex>=postGameRaidClearDialog.length){
      postGameArea='brifo';postGameHero.x=300;postGameHero.y=420;
      scene='postGameVillage';dialogIndex=0;touchUI.classList.remove('hidden');saveGame();
    }
    return;
  }
  if(scene==='postGameIsland' && progress.sealedCaveUnlocked &&
     Math.hypot(postGameHero.x-752,postGameHero.y-112)<85){
    progress.nineTailSoloQuest=true;
    scene='sealedGateIntro';dialogIndex=0;
    touchUI.classList.remove('hidden');saveProgress();saveGame();return;
  }
  if(scene==='sealedCave'&&progress.orochiDefeated&&sealedCaveHero.x>790){
    startOrochiBattle();return;
  }
  if(scene==='sealedCave'&&sealedCaveHero.x<78){
    postGameHero.x=700;postGameHero.y=165;if(progress.orochiDefeated)progress.nineTailSoloQuest=false;scene='postGameIsland';touchUI.classList.remove('hidden');saveProgress();saveGame();return;
  }
  if(scene==='world' || scene==='road2' || scene==='route3' || scene==='cave' || scene==='takezoTravel' || scene==='takezoRoute' || scene==='coastSurveyField' || scene==='volcanoSurveyField' || scene==='finalBearField' || scene==='dragonTrail' || scene==='postGameIsland' || scene==='postGameVillage' || scene==='postGameVolcano' || scene==='sealedCave'){
    openFieldMenu(scene);
    return;
  }
  if(scene==='battle'){
    if(!battle || battle.turn!=='player')return;
    battleAttack('attack');return;
  }
  if(scene==='end'){
    scene='title';titleSelection=0;touchUI.classList.add('hidden');
    dash.x=1960;dash.y=180;hero.x=360;hero.y=300;villageEventStarted=false;
    monsters.forEach(m=>{m.alive=true;m.respawn=0;m.x=m.spawnX;m.y=m.spawnY;});
  }
}

function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);ctx.clearRect(0,0,W,H);
  if(scene==='title')drawTitle();
  else if(scene==='cutscene')drawCutscene();
  else if(scene==='ngPlusVillage')drawNgPlusVillage();
  else if(scene==='ngPlusReturn')drawNgPlusReturn();
  else if(scene==='ngPlusOverhead')drawNgPlusOverhead();
  else if(scene==='ngPlusBlizzard')drawNgPlusBlizzard();
  else if(scene==='ngPlusAfterBlizzard')drawNgPlusAfterBlizzard();
  else if(scene==='ngPlusBossIntro')drawNgPlusBossIntro();
  else if(scene==='ngPlusEnding')drawNgPlusEnding();
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
  else if(scene==='takezoTravel')drawTakezoTravel();
  else if(scene==='takezoScoutAfter')drawTakezoScoutAfter();
  else if(scene==='takezoArrival')drawTakezoArrival();
  else if(scene==='takezoRoute')drawTakezoRoute();
  else if(scene==='takezoRelief')drawTakezoRelief();
  else if(scene==='takezoPlan')drawTakezoPlan();
  else if(scene==='takezoCoastSurvey')drawTakezoCoastSurvey();
  else if(scene==='coastSurveyField')drawCoastSurveyField();
  else if(scene==='bananaSharkAfter')drawBananaSharkAfter();
  else if(scene==='volcanoSurveyField')drawVolcanoSurveyField();
  else if(scene==='takezoVolcanoSurvey')drawTakezoVolcanoSurvey();
  else if(scene==='takezoConstruction')drawTakezoConstruction();
  else if(scene==='secondWaveIntro')drawSecondWaveIntro();
  else if(scene==='secondWaveRetreat')drawSecondWaveRetreat();
  else if(scene==='secondWaveTrap')drawSecondWaveTrap();
  else if(scene==='secondWaveVictory')drawSecondWaveVictory();
  else if(scene==='gyouJoin')drawGyouJoin();
  else if(scene==='finalPrep')drawFinalPrep();
  else if(scene==='finalPrepFree')drawFinalPrepFree();
  else if(scene==='gyouTraining')drawGyouTraining();
  else if(scene==='finalWeapon')drawFinalWeapon();
  else if(scene==='yunoCombo')drawYunoCombo();
  else if(scene==='volcanoBearQuest')drawVolcanoBearQuest();
  else if(scene==='finalBearField')drawFinalBearField();
  else if(scene==='volcanoBearAfter')drawVolcanoBearAfter();
  else if(scene==='finalEve')drawFinalEve();
  else if(scene==='finalEveFree')drawFinalEveFree();
  else if(scene==='finalLaunch')drawFinalLaunch();
  else if(scene==='finalBattleGround')drawFinalBattleGround();
  else if(scene==='finalBalloon')drawFinalBalloon();
  else if(scene==='pirateCaptainIntro')drawPirateCaptainIntro();
  else if(scene==='pirateCaptainAfter')drawPirateCaptainAfter();
  else if(scene==='ending')drawEnding();
  else if(scene==='nineTailElderTalk')drawNineTailElderTalk();
  else if(scene==='fourAbyssTalk'){drawPostGameVillage();const d=fourAbyssDialog[dialogIndex]||fourAbyssDialog[0];drawDialog(d[0],d[1]);}
  else if(scene==='nineTailPostTalk'){drawPostGameVillage();const d=nineTailPostDialog[0];drawDialog(d[0],d[1]);}
  else if(scene==='sealedGateIntro'){drawPostGameIsland();let d=sealedGateDialog[Math.min(dialogIndex,sealedGateDialog.length-1)];if(progress.fourAbyssUnlocked&&dialogIndex===sealedGateDialog.length-1)d=['hero','……開く。みんな、行こう。異界へ。'];drawDialog(d[0],d[1]);}
  else if(scene==='nineTailHouse')drawNineTailHouse();
  else if(scene==='postGameElderTalk'){drawPostGameVillage();const a=progress.postDragonDefeated?postGameElderDragonDialog:postGameElderDialog,d=a[Math.min(dialogIndex,a.length-1)];drawDialog(d[0],d[1]);}
  else if(scene==='postGameCircus')drawPostGameCircus();
  else if(scene==='postGameCircusTalk'){drawPostGameCircus();const d=postGameCircusDialog[Math.min(dialogIndex,postGameCircusDialog.length-1)];drawDialog(d[0],d[1]);}
  else if(scene==='postGameRaidShip')drawPostGameRaidShip();
  else if(scene==='postGameRaid')drawPostGameRaid();
  else if(scene==='postGameRaidClear')drawPostGameRaidClear();
  else if(scene==='postGameIsland')drawPostGameIsland();
  else if(scene==='postGameVillage')drawPostGameVillage();
  else if(scene==='postGameVolcano')drawPostGameVolcano();
  else if(scene==='sealedCave')drawSealedCave();
  else if(scene==='dragonTrail')drawDragonTrail();
  else if(scene==='dragonTrailShop')drawDragonTrailShop();
  else if(scene==='dragonCall')drawDragonCall();
  else if(scene==='dragonSummit')drawDragonSummit();
  else if(scene==='dragonConfirm')drawDragonConfirm();
  else if(scene==='postDragonClear')drawPostDragonClear();
  else if(scene==='sarubibiTown')drawSarubibiTown();
  else if(scene==='sarubibiShop')drawSarubibiShop();
  else if(scene==='sarubieTown')drawSarubieTown();
  else if(scene==='shop')drawShop();
  else if(scene==='sarubieRitual')drawSarubieRitual();
  else if(scene==='cave')drawCave();
  else drawEnd();
  if(flashTimer>0 && ['title','road2','world','cave','route3','sarubieTown','shop','sarubibiTown','sarubibiShop','nightTrail','takezoTravel','takezoRoute','coastSurveyField','volcanoSurveyField','finalEveFree','dragonTrail'].includes(scene)){
    ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(305,85,350,58);text(flashText,480,114,20,'center');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('keydown',e=>{
  if(e.key==='m'||e.key==='M'){bgmToggle();return;}
  if(e.key==='n'||e.key==='N'){sfxEnabled=!sfxEnabled;flashText=`効果音 ${sfxEnabled?'ON':'OFF'}`;flashTimer=1.2;return;}
  keys[e.key]=true;
  if(scene==='title'){
    if((e.key==='ArrowRight'||e.key==='d'||e.key==='D')&&progress.ngPlusUnlocked){titleSelection=4;e.preventDefault();return;}
    if((e.key==='ArrowLeft'||e.key==='a'||e.key==='A')&&titleSelection===4){titleSelection=0;e.preventDefault();return;}
    if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){titleSelection=0;e.preventDefault();return;}
    if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){titleSelection=1;e.preventDefault();return;}
  }
  if(scene==='sarubibiShop'){
    if(sarubibiShopType==='weapon' && (e.key==='ArrowUp'||e.key==='ArrowDown')){
      e.preventDefault();sarubibiWeaponSelection=e.key==='ArrowUp'?Math.max(0,sarubibiWeaponSelection-1):Math.min(1,sarubibiWeaponSelection+1);return;
    }
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
  if(scene==='dragonTrailShop'){
    const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
    if(y>=68&&y<474){
      dragonTrailShopSelection=Math.max(0,Math.min(7,Math.floor((y-72)/50)));
      return;
    }
  }
  if(scene==='finalEveFree'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(y>=330&&y<=415){
      if(x<235){openFieldMenu('finalEveFree');return;}
      if(x<465){
        const cost=20;
        if((progress.gold||0)>=cost){progress.gold-=cost;progress.items.potion=(progress.items.potion||0)+1;saveProgress();saveGame();flashText='回復薬を1個補充した（20G）';flashTimer=1.5;}
        else{flashText='お金が足りない';flashTimer=1.5;}
        return;
      }
      if(x<695){
        const cost=75;
        if((progress.gold||0)>=cost){progress.gold-=cost;progress.items.highPotion=(progress.items.highPotion||0)+1;saveProgress();saveGame();flashText='高級回復薬を1個補充した（75G）';flashTimer=1.5;}
        else{flashText='お金が足りない';flashTimer=1.5;}
        return;
      }
      scene='finalLaunch';dialogIndex=0;saveGame();return;
    }
    return;
  }
  if(scene==='title'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    const titleStartY=progress.gameCleared?300:326;
    if(progress.ngPlusUnlocked&&x>=680&&x<=870&&y>=titleStartY-2&&y<=titleStartY+46){titleSelection=4;pressAction();return;}
    if(progress.gameCleared){
      if(y>=290&&y<345){titleSelection=0;pressAction();return;}
      if(y>=345&&y<395){titleSelection=1;pressAction();return;}
      if(y>=395&&y<445){titleSelection=2;pressAction();return;}
      if(y>=445&&y<=500){titleSelection=3;pressAction();return;}
    }else{
      if(y>=316&&y<372){titleSelection=0;pressAction();return;}
      if(y>=372&&y<428){titleSelection=1;pressAction();return;}
      if(y>=428&&y<=492){titleSelection=2;pressAction();return;}
    }
    return;
  }
  if(scene==='sarubibiShop'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(sarubibiShopType==='weapon' && x>=80&&x<=880){
      if(y>=105&&y<=217){sarubibiWeaponSelection=0;return;}
      if(y>=235&&y<=347){sarubibiWeaponSelection=1;return;}
    }
    if(y>=400&&y<=468){sarubibiShopBuy();return;}
    if(y>=468&&y<=530){scene='sarubibiTown';touchUI.classList.remove('hidden');return;}
  } else if(scene==='shop'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(y>=325&&y<=410){shopBuy();return;}
    if(y>=410&&y<=495){scene='sarubieTown';touchUI.classList.remove('hidden');return;}
  } else if(scene==='takezoRoute'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    const ht=hudTop();
    if(y>=ht && y<=ht+48 && x>=590 && x<750){
      resetTakezoSquads();saveGame();
      flashText='先行小隊を3部隊に戻しました';flashTimer=2.2;return;
    }
    if(y>=ht && y<=ht+48 && x>=750){
      scene='sarubibiTown';sarubibiHero.x=520;sarubibiHero.y=430;
      touchUI.classList.remove('hidden');saveGame();
      flashText='いったん村へ戻りました';flashTimer=2.0;return;
    }
  } else if(scene==='menu'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    menuTap(x,y);
  } else if(scene==='battle' && battle && battle.turn==='player'){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*W;
    const y=(e.clientY-r.top)/r.height*H;
    if(battleMenu==='skill' && battleActor==='hero' &&
       (progress.hiddenSkills?.hero || battle.monsterId===1290) &&
       pointInRect(x,y,heroHiddenBattleRect())){
      heroHiddenSkill();return;
    }
    if(battleMenu==='target'){
      if(y>=455&&y<=505){cancelPartyTarget();return;}
      if(y>=385&&y<=455){
        const ts=partyTargetList(),w=Math.min(190,760/Math.max(1,ts.length)),gap=10,total=ts.length*w+(ts.length-1)*gap,sx=(W-total)/2;
        for(let i=0;i<ts.length;i++){
          const x0=sx+i*(w+gap);
          if(x>=x0&&x<=x0+w){resolvePartyTarget(ts[i].key);return;}
        }
      }
      return;
    }
    if(battleMenu==='main'){
      const mainY=((window.innerHeight||540)<500)?346:380;
      if(y>=mainY && y<=mainY+75){
        if(x<260){
          if(isGyouTurn()){
            const gs=gyouStats(),dmg=gs.atk+2+Math.floor(Math.random()*5);
            battleMessage=`ジュウの槍攻撃！ ${dmg}ダメージ！`;damageEnemy(dmg);
            if(enemiesDefeated()){battle.turn='win';battleCooldown=1;}else advancePartyTurn();
          }else if(isYunoTurn()){
            const ys=yunoStats();const dmg=ys.atk+Math.floor(Math.random()*5);
            battleMessage=`ユーノの弓攻撃！ ${dmg}ダメージ！`;damageEnemy(dmg);
            if(enemiesDefeated()){battle.turn='win';battleCooldown=1;}else advancePartyTurn();
          }else if((battle.monsterId===99||battle.monsterId>=200)&&suzumaruActive&&battleActor==='suzu')suzuAction('attack');
          else battleAttack('attack');
        }
        else if(x<460)battleMenu='skill';
        else if(x<660)battleDefend();
        else {if(battle.monsterId>=960&&battle.monsterId<=963){battleMessage='この登山道では逃走できない！';return;}battleRun();}
      }
    }else{
      if(y>=385 && y<=500){
        if(isGyouTurn()){
          if(y>=445&&x>=610&&progress.hiddenSkills?.gyou){gyouHiddenSkill();return;}
          if(y>=445){battleMenu='main';battleMessage='ジュウの行動を選択';return;}
          const i=Math.max(0,Math.min(7,Math.floor((x-28)/114)));
          const modes=['fortify','cover','taunt','manaGuard','healGuard','doubleThrust','counter','grandGuard'];
          if(modes[i]==='cover'){openPartyTarget('gyou','cover','かばう');return;}
          gyouAction(modes[i]);
        }else if(isYunoTurn()){
          if(y>=438&&y<=500&&x>=595&&x<=925&&progress.hiddenSkills?.yuno){yunoHiddenSkill();return;}
          if(y>=445){battleMenu='main';battleMessage='ユーノの行動を選択';return;}
          if(x<175)yunoAction('healAll');
          else if(x<320)yunoAction('regen');
          else if(x<465)yunoAction('windAll');
          else if(x<610){openPartyTarget('yuno','haste','疾風');return;}
          else if(x<755){yunoAction('archery');return;}
          else yunoAction('mpRegenAll');
        }else if(isSuzumaruTurn()){
          if(y>=440&&x>=575&&progress.hiddenSkills?.suzu){suzuHiddenSkill();return;}
          if(y>=440 && x>=300 && x<575){suzuAction('counter');}
          else if(x<305)suzuAction('fire');
          else if(x<565)suzuAction('fireRun');
          else if(x<715)usePotion('suzu');
          else if(x<865)useHighPotion('suzu');
          else battleMenu='main';
        }else{
          if(y>=370&&y<=432){
            if(x<215){if((progress.heroHealSkill||1)>=3){battleAttack('heal');return;}openPartyTarget('hero','heal',(progress.heroHealSkill||1)>=2?'水の大いやし':'水のいやし');return;}
            else if(x<395)battleAttack('ice');
            else if(x<575)battleAttack('iceSlash');
            else if(x<755)battleAttack('iceWave');
            else {if(progress.heroManaSkill||0){openPartyTarget('hero','manaHeal','水脈の雫');return;} battleMessage='水脈の雫は未習得！';return;}
          }else if(yunoJoined && progress.heroYunoComboUnlocked && battle.monsterId>=400 && y>=435&&y<=485){
            if(x<300)heroYunoCombo('grandHeal');
            else if(x<615)heroYunoCombo('grandDamage');
            else if(x<770)useHighPotion('hero');
            else battleMenu='main';
          }else if(y>=435&&y<=490){
            if(x>=320&&x<550)useHighPotion('hero');else battleMenu='main';
          }else battleMenu='main';
        }
      }
    }
  } else if(scene!=='sealedGateIntro'&&scene!=='world'&&scene!=='road2'&&scene!=='route3'&&scene!=='sarubieTown'&&scene!=='shop'&&scene!=='cave'&&scene!=='sarubibiTown'&&scene!=='sarubibiShop'&&scene!=='nightTrail'&&scene!=='takezoTravel'&&scene!=='takezoRoute'&&scene!=='coastSurveyField'&&scene!=='volcanoSurveyField'&&scene!=='dragonTrail'&&scene!=='dragonTrailShop') pressAction();
});
let lastActionAt=0;
function triggerActionButton(e){
  if(e){e.preventDefault();e.stopPropagation();}
  const now=performance.now();
  if(now-lastActionAt<220)return;
  lastActionAt=now;

  // Dedicated path for the sealed gate so the final A never falls
  // through to field/menu handling on mobile browsers.
  if(scene==='sealedGateIntro'){
    if(dialogIndex < sealedGateDialog.length-1){
      dialogIndex++;
    }else{
      enterSealedCave();
    }
    return;
  }

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