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
let last = performance.now();
let keys = {};
let dialogIndex = 0;
let flashText = '';
let flashTimer = 0;
let villageEventStarted = false;
let heroName = localStorage.getItem('risupekuHeroName') || 'リク';

let progress = JSON.parse(localStorage.getItem('risupekuProgress') || 'null') || {
  level:1, exp:0, sp:0,
  maxHP:42, maxMP:24, atk:8, def:5,
  learned:{ waterHeal:true, icePebble:true, iceSlash:false }
};
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
let battleCooldown = 0;
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
  text('りすぺく島RPG',480,75,53,'center','#fff',800);text('Ver.0.11',480,121,18,'center','#eef8ff');
  ctx.fillStyle='rgba(10,23,48,.73)';ctx.fillRect(310,466,340,52);text('タップ / Enter で はじめる',480,492,21,'center');
}
function speakerName(who){
  return ({narrator:'',dash:'ダッシュミウ',pirate:'海賊',elder:'ぶりふぉ村長',hero:heroName,suzu:'スズマル'})[who]||who;
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
function drawBattle(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#9cd8ef');g.addColorStop(1,'#b9dc8c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  drawHeroFox(250,260,2.0);
  const tempMon={x:700,y:245,alive:true,kind:battle.enemyKind};
  drawWildMonster(tempMon);
  // status
  ctx.fillStyle='rgba(14,30,55,.9)';ctx.fillRect(45,35,330,105);ctx.fillRect(585,35,330,105);
  text(heroName,68,62,22);text(`Lv.${progress.level}  HP ${battle.heroHP}/${progress.maxHP}`,68,93,18);text(`MP ${battle.heroMP}/${progress.maxMP}`,68,119,18);
  text(battle.enemyName,610,62,22);text(`HP ${Math.max(0,battle.enemyHP)}/${battle.enemyMaxHP}`,610,96,19);
  // commands
  ctx.fillStyle='rgba(9,20,42,.92)';ctx.fillRect(50,365,860,140);
  if(battle.turn==='player'){
    if(battleMenu==='main'){
      outlineRect(70,388,180,48,'#dff4fb','#71bad7',2);text('こうげき',160,412,20,'center','#17324a');
      outlineRect(270,388,180,48,'#dff4fb','#71bad7',2);text('スキル',360,412,20,'center','#17324a');
      outlineRect(470,388,180,48,'#dff4fb','#71bad7',2);text('ぼうぎょ',560,412,20,'center','#17324a');
      outlineRect(670,388,180,48,'#dff4fb','#71bad7',2);text('にげる',760,412,20,'center','#17324a');
      text('タップでコマンド選択',480,474,15,'center','#c8e7f4');
    }else{
      outlineRect(55,390,205,56,'#dff4fb','#71bad7',2);text('水のいやし MP5',157,418,16,'center','#17324a');
      outlineRect(275,390,205,56,'#dff4fb','#71bad7',2);text('氷のつぶて MP4',377,418,16,'center','#17324a');
      if(progress.learned.iceSlash){
        outlineRect(495,390,205,56,'#dff4fb','#71bad7',2);text('氷結斬り MP7',597,418,16,'center','#17324a');
      }else{
        outlineRect(495,390,205,56,'#6f8092','#5d6d7c',2);text('？？？？',597,418,16,'center','#d5dde4');
      }
      outlineRect(715,390,150,56,'#dff4fb','#71bad7',2);text('もどる',790,418,16,'center','#17324a');
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
      battle.heroMP-=5;battle.heroHP=Math.min(42,battle.heroHP+16);
      battleMessage=`${heroName}は「水のいやし」を使った！ HPが回復した。`;
    }else battleMessage='MPが足りない！';
    battle.turn='enemy';battleCooldown=.8;battleMenu='main';return;
  }
  let dmg=0;
  if(mode==='iceSlash'){
    if(!progress.learned.iceSlash){battleMessage='まだ覚えていない！';return;}
    if(battle.heroMP<7){battleMessage='MPが足りない！';return;}
    battle.heroMP-=7;
    dmg=progress.atk+15+Math.floor(Math.random()*7);
    battleMessage=`${heroName}の「氷結斬り」！ ${dmg}ダメージ！`;
  }else if(mode==='ice'){
    if(battle.heroMP<4){battleMessage='MPが足りない！';return;}
    battle.heroMP-=4;
    dmg=progress.atk+9+Math.floor(Math.random()*6);
    battleMessage=`${heroName}の「氷のつぶて」！ ${dmg}ダメージ！`;
  }else{
    dmg=progress.atk+4+Math.floor(Math.random()*5);
    battleMessage=`${heroName}のこうげき！ ${dmg}ダメージ！`;
  }
  battle.enemyHP-=dmg;
  if(battle.enemyHP<=0){battle.turn='win';battleCooldown=1.0;return;}
  battle.turn='enemy';battleCooldown=.8;battleMenu='main';
}
function battleDefend(){
  if(!battle || battle.turn!=='player')return;
  battle.defending=true;
  battleMessage=`${heroName}は身を守っている！`;
  battle.turn='enemy';battleCooldown=.65;battleMenu='main';
}
function battleRun(){
  if(!battle || battle.turn!=='player')return;
  battleMessage='うまく逃げ切った！';
  battle.turn='run';battleCooldown=.6;battleMenu='main';
}
function enemyTurn(){
  let dmg=Math.max(1,7+Math.floor(Math.random()*5)-Math.floor(progress.def/3));
  if(battle.defending){dmg=Math.max(1,Math.floor(dmg/2));battle.defending=false;}
  battle.heroHP=Math.max(1,battle.heroHP-dmg);
  battleMessage=`${battle.enemyName}のこうげき！ ${dmg}ダメージ！`;
  battle.turn='player';
}
function finishBattle(){
  const mon=monsters.find(m=>m.id===battle.monsterId);
  if(mon){
    mon.alive=false;
    mon.respawn=12.0;
  }
  const expGain = mon ? ({1:12,2:15,3:20}[mon.id] || 10) : 10;
  const leveled = gainExp(expGain);
  scene='road2';touchUI.classList.remove('hidden');
  battle=null;
  flashText = leveled ? `レベルアップ！ Lv.${progress.level}　SP+1` : `経験値 ${expGain} 獲得！ HP・MP全回復`;
  flashTimer=3.0;
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
  text('Ver.0.11 ここまで',480,112,42,'center');
  text(`${heroName}の冒険は、ここから本格的に始まる。`,480,365,22,'center','#d8efff');
  text('次は：火山麓の洞窟 ＋ 炎晶石探しへ',480,405,20,'center','#d8efff');
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
  if(flashTimer>0)flashTimer-=dt;
}

function openNameInput(){
  nameInput.value=heroName;nameOverlay.classList.remove('hidden');
  setTimeout(()=>{nameInput.focus();nameInput.select();},50);
}
function confirmName(){
  const v=(nameInput.value||'').trim().slice(0,8);
  heroName=v || 'リク';localStorage.setItem('risupekuHeroName',heroName);nameOverlay.classList.add('hidden');
  dialogIndex=9;
}
nameOk.addEventListener('click',confirmName);
nameInput.addEventListener('keydown',e=>{if(e.key==='Enter')confirmName();});

function pressAction(){
  if(!nameOverlay.classList.contains('hidden'))return;
  if(scene==='title'){scene='cutscene';dialogIndex=0;touchUI.classList.add('hidden');return;}
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
      scene='end';dialogIndex=0;
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
  else drawEnd();
  if(flashTimer>0 && ['road2','world'].includes(scene)){
    ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(305,85,350,58);text(flashText,480,114,20,'center');
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('keydown',e=>{
  keys[e.key]=true;
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
  if(scene==='menu'){
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
        if(x<260)battleAttack('attack');
        else if(x<460)battleMenu='skill';
        else if(x<660)battleDefend();
        else battleRun();
      }
    }else{
      if(y>=385 && y<=460){
        if(x<270)battleAttack('heal');
        else if(x<490)battleAttack('ice');
        else if(x<710)battleAttack('iceSlash');
        else battleMenu='main';
      }
    }
  } else if(scene!=='world'&&scene!=='road2') pressAction();
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