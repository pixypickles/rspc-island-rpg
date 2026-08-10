(() => {
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const touchUI = document.getElementById('touchUI');
const stickBase = document.getElementById('stickBase');
const stickKnob = document.getElementById('stickKnob');
const actionBtn = document.getElementById('actionBtn');

const W = 960, H = 540;
let scene = 'title';
let last = performance.now();
let actionPressed = false;
let keys = {};
let dialogIndex = 0;
let dialogChars = 999;
let fade = 0;
let flashText = '';
let flashTimer = 0;

const player = {x:118,y:360,dir:'down',speed:170};
const dash = {x:188,y:385};
const camera = {x:0,y:0};

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

const villageDialog = [
  ['dash','だ、誰かーっ！　起きてーっ！　大変なんだってばーっ！'],
  ['elder','……ダッシュミウ？ こんな夜更けにどうした。'],
  ['dash','サーカス団が海賊に襲われた！ みんな捕まってる！ 拳銃とか、マシンガンとか……！'],
  ['elder','……すぐに皆を起こせ。サーカス団側の道は氷壁で塞ぐ。'],
  ['dash','えっ、そんな大きいの作れるの！？'],
  ['elder','ぶりふぉ村を甘く見るな。水と氷なら、できる。'],
  ['elder','だが、壁を作る者も村を守る者も必要だ。残りの村へ知らせる者が足りないな……。'],
  ['dash','……あれ？ なんでみんな、そこの人を見てるの？'],
  ['hero','…………。'],
  ['elder','頼めるか？'],
  ['hero','……分かった。行ってくる。'],
  ['narrator','こうして、ぶりふぉ村の青年とダッシュミウは、海賊より先に残る3つの村へ知らせるため旅立つことになった。']
];

const world = {
  width: 1700, height: 760,
  villageGate: {x:1345,y:245,w:220,h:275}
};

function resize(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W*dpr; canvas.height = H*dpr;
  canvas.style.width='100%';canvas.style.height='100%';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;
}
resize();
addEventListener('resize', resize);

function pxRect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function text(t,x,y,size=24,align='left',color='#fff'){
  ctx.font=`700 ${size}px system-ui,-apple-system,"Yu Gothic",sans-serif`;
  ctx.textAlign=align;ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.fillText(t,x+2,y+3);
  ctx.fillStyle=color;ctx.fillText(t,x,y);
}

function drawPixelFox(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  pxRect(-12,-19,9,9,'#bdefff'); pxRect(3,-19,9,9,'#bdefff');
  pxRect(-8,-24,5,8,'#fff'); pxRect(3,-24,5,8,'#fff');
  pxRect(-13,-12,26,23,'#d9f6ff');
  pxRect(-10,-9,5,5,'#111827'); pxRect(5,-9,5,5,'#111827');
  pxRect(-3,-3,6,4,'#2a3448');
  pxRect(-14,11,28,18,'#111827');
  pxRect(-9,12,18,15,'#dff8ff');
  pxRect(-18,29,10,14,'#edfaff'); pxRect(8,29,10,14,'#edfaff');
  pxRect(12,4,15,9,'#bdefff'); pxRect(21,1,8,7,'#fff');
  ctx.restore();
}
function drawRabbit(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  pxRect(-10,-30,7,18,'#f6e8dd'); pxRect(4,-31,7,19,'#f6e8dd');
  pxRect(-8,-27,3,13,'#f2b9c2'); pxRect(6,-28,3,13,'#f2b9c2');
  pxRect(-12,-14,24,23,'#f6e8dd');
  pxRect(-8,-8,4,4,'#182238'); pxRect(4,-8,4,4,'#182238');
  pxRect(-2,-2,4,3,'#d48b92');
  pxRect(-14,9,28,18,'#14213d');
  pxRect(-8,11,16,11,'#25345a');
  pxRect(-17,27,9,13,'#f6e8dd'); pxRect(8,27,9,13,'#f6e8dd');
  ctx.restore();
}
function drawPirateSilhouette(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  pxRect(-13,-16,26,22,'#352116');pxRect(-15,6,30,23,'#ed7d2f');
  pxRect(-20,-19,40,7,'#ed7d2f');pxRect(-3,29,7,14,'#2b2631');
  ctx.restore();
}

function drawTitle(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7bd2ec');g.addColorStop(.58,'#bde9dc');g.addColorStop(1,'#f5d29d');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // island silhouette
  ctx.fillStyle='#75b86d';ctx.beginPath();ctx.moveTo(480,115);ctx.lineTo(750,250);ctx.lineTo(650,450);ctx.lineTo(310,450);ctx.lineTo(210,250);ctx.closePath();ctx.fill();
  ctx.fillStyle='#496c55';ctx.beginPath();ctx.moveTo(480,175);ctx.lineTo(565,350);ctx.lineTo(395,350);ctx.closePath();ctx.fill();
  // five markers
  [['🎪',480,140],['💧',275,265],['🔥',350,410],['🌪️',610,410],['🪨',685,265]].forEach(([a,x,y])=>text(a,x,y,30,'center'));
  text('りすぺく島RPG',480,78,54,'center','#fff');
  text('Ver.0.1',480,124,19,'center','#eef8ff');
  ctx.fillStyle='rgba(10,23,48,.72)';ctx.fillRect(310,465,340,54);
  text('タップ / Enter で はじめる',480,492,22,'center');
}

function drawCutscene(){
  ctx.fillStyle='#071023';ctx.fillRect(0,0,W,H);
  const i=Math.min(dialogIndex,prologue.length-1), [who,line]=prologue[i];
  if(i===0 || i===1 || i===2 || i===3){
    // sea
    ctx.fillStyle='#183d68';ctx.fillRect(0,270,W,270);
    ctx.fillStyle='#102d50';
    for(let y=290;y<540;y+=38) for(let x=((y/38)%2)*30;x<W;x+=85) pxRect(x,y,45,4,'#2c5b87');
    // circus ship
    pxRect(210,210,180,65,'#6e3f2f');pxRect(265,115,8,100,'#d5dbe7');
    ctx.fillStyle='#18213c';ctx.beginPath();ctx.moveTo(273,122);ctx.lineTo(365,172);ctx.lineTo(273,188);ctx.closePath();ctx.fill();
    text('CHESTAPI',300,236,16,'center','#f4f2dc');
    // pirate ship
    pxRect(690,235,145,50,'#43291f');pxRect(730,155,7,85,'#d0d5df');
    ctx.fillStyle='#e8752d';ctx.beginPath();ctx.moveTo(737,160);ctx.lineTo(810,195);ctx.lineTo(737,211);ctx.closePath();ctx.fill();
  } else if(i<=8){
    // night camp/ship
    ctx.fillStyle='#101a3a';ctx.fillRect(0,0,W,H);
    for(let a=0;a<50;a++) pxRect((a*137)%W,(a*79)%250,2,2,'#d5e7ff');
    ctx.fillStyle='#152f45';ctx.fillRect(0,330,W,210);
    pxRect(120,275,260,70,'#513225'); text('ちぇすたぴ号',250,310,17,'center','#e8e2cc');
    drawPirateSilhouette(610,355,1.4);drawPirateSilhouette(690,370,1.2);drawPirateSilhouette(760,350,1.3);
    if(i>=5) drawRabbit(220,360,1.4);
  } else {
    ctx.fillStyle='#101a3a';ctx.fillRect(0,0,W,H);
    pxRect(0,340,W,200,'#254f45');
    for(let x=0;x<W;x+=70){pxRect(x,285,40,80,'#173f37');pxRect(x+8,260,24,35,'#235d48')}
    drawRabbit(450,365,1.5);
    text('りすぺく島',480,90,48,'center','#fff');
  }
  drawDialog(prologue[i][0],prologue[i][1]);
}

function speakerName(who){
  return ({narrator:'',dash:'ダッシュミウ',pirate:'海賊',elder:'ぶりふぉ村長',hero:'主人公'})[who]||who;
}
function drawDialog(who,line){
  ctx.fillStyle='rgba(4,10,25,.88)';ctx.fillRect(55,385,850,125);
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;ctx.strokeRect(55,385,850,125);
  const n=speakerName(who);
  if(n){ctx.fillStyle='#eaf5ff';ctx.fillRect(75,370,190,34);text(n,90,387,18,'left','#13203c');}
  wrapText(line,85,424,790,26,23);
  text('▼',868,486,18,'center','#d9ecff');
}
function wrapText(str,x,y,maxWidth,lineHeight,size){
  ctx.font=`700 ${size}px system-ui,-apple-system,"Yu Gothic",sans-serif`;
  ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='top';
  let line='', yy=y;
  for(const ch of str){
    const t=line+ch;
    if(ctx.measureText(t).width>maxWidth){ctx.fillText(line,x,yy);line=ch;yy+=lineHeight;}
    else line=t;
  }
  if(line) ctx.fillText(line,x,yy);
}

function drawWorld(){
  ctx.fillStyle='#83d5dc';ctx.fillRect(0,0,W,H);
  camera.x=Math.max(0,Math.min(world.width-W,player.x-W*.42));
  camera.y=Math.max(0,Math.min(world.height-H,player.y-H*.55));
  ctx.save();ctx.translate(-camera.x,-camera.y);
  // grass
  ctx.fillStyle='#8fd17d';ctx.fillRect(0,0,world.width,world.height);
  // coastline / water
  ctx.fillStyle='#61c3df';ctx.fillRect(0,0,world.width,95);ctx.fillRect(0,660,world.width,100);
  // path
  ctx.fillStyle='#e7d39e';ctx.fillRect(70,300,1430,145);
  ctx.fillStyle='#d7bd7e';ctx.fillRect(70,330,1430,8);ctx.fillRect(70,410,1430,8);
  // trees
  for(let x=40;x<1620;x+=88){ drawTree(x,190+(x%3)*14); drawTree(x+35,520+(x%4)*8);}
  // river-ish icy stream near village
  ctx.fillStyle='#a7e9f4';ctx.fillRect(1180,105,70,190);
  // village
  drawVillage(1390,180);
  // sign
  pxRect(980,280,8,48,'#73513b');pxRect(945,245,82,42,'#f0d99f');text('ぶりふぉ',986,266,14,'center','#38475a');
  drawRabbit(dash.x,dash.y,1.15);
  drawPixelFox(player.x,player.y,1.15);
  ctx.restore();

  ctx.fillStyle='rgba(9,22,48,.78)';ctx.fillRect(18,18,290,46);
  text('目的：ぶりふぉ村へ向かう',36,41,18);
  if(flashTimer>0){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(330,90,300,58);text(flashText,480,119,22,'center');}
}

function drawTree(x,y){
  pxRect(x+10,y+25,12,30,'#6b4d37');pxRect(x,y,32,32,'#397657');pxRect(x+7,y-13,24,28,'#4b9463');pxRect(x-7,y+8,25,24,'#3f865b');
}
function drawVillage(x,y){
  // ice wall hint on far side
  ctx.fillStyle='#d6fbff';ctx.fillRect(x+205,y-5,28,260);ctx.fillStyle='#aee8f5';ctx.fillRect(x+213,y,8,250);
  drawHouse(x,y+55,'#eef7fb','#17233f','#91d9ee');
  drawHouse(x+105,y+15,'#eef7fb','#17233f','#91d9ee');
  drawHouse(x+95,y+155,'#eef7fb','#17233f','#91d9ee');
  drawHouse(x-25,y+175,'#eef7fb','#17233f','#91d9ee');
  text('ぶりふぉ村',x+90,y-25,25,'center','#284461');
}
function drawHouse(x,y,wall,roof,trim){
  pxRect(x,y+28,78,65,wall);ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x-8,y+32);ctx.lineTo(x+39,y);ctx.lineTo(x+86,y+32);ctx.closePath();ctx.fill();
  pxRect(x+31,y+58,17,35,trim);pxRect(x+10,y+46,15,14,'#a9dff0');pxRect(x+54,y+46,15,14,'#a9dff0');
}

function drawVillageDialog(){
  drawWorld();
  const item=villageDialog[Math.min(dialogIndex,villageDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function update(dt){
  if(scene==='world'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx-=1;if(keys.ArrowRight||keys.d)dx+=1;
    if(keys.ArrowUp||keys.w)dy-=1;if(keys.ArrowDown||keys.s)dy+=1;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);if(l>.05){dx/=Math.max(1,l);dy/=Math.max(1,l);player.x+=dx*player.speed*dt;player.y+=dy*player.speed*dt;}
    player.x=Math.max(50,Math.min(world.width-70,player.x));player.y=Math.max(140,Math.min(world.height-120,player.y));
    dash.x += (player.x-55-dash.x)*Math.min(1,dt*4.8);
    dash.y += (player.y+25-dash.y)*Math.min(1,dt*4.8);
    if(player.x>1320 && player.y>190 && player.y<530){
      scene='villageDialog';dialogIndex=0;touchUI.classList.add('hidden');
    }
    if(flashTimer>0) flashTimer-=dt;
  }
}

function pressAction(){
  if(scene==='title'){
    scene='cutscene';dialogIndex=0;touchUI.classList.add('hidden');return;
  }
  if(scene==='cutscene'){
    dialogIndex++;
    if(dialogIndex>=prologue.length){
      scene='world'; dialogIndex=0; touchUI.classList.remove('hidden');
      flashText='ダッシュミウをぶりふぉ村へ！';flashTimer=2.2;
    }
    return;
  }
  if(scene==='villageDialog'){
    dialogIndex++;
    if(dialogIndex>=villageDialog.length){
      scene='end';dialogIndex=0;
    }
    return;
  }
  if(scene==='end'){
    scene='title';player.x=118;player.y=360;dash.x=188;dash.y=385;
  }
}

function drawEnd(){
  ctx.fillStyle='#0c1830';ctx.fillRect(0,0,W,H);
  drawPixelFox(400,270,2);drawRabbit(555,275,2);
  text('Ver.0.1 ここまで',480,115,43,'center');
  text('次は：ぶりふぉ村の出発準備 ＋ 最初のフィールド',480,395,23,'center','#d8efff');
  text('タップ / Enter でタイトルへ',480,455,18,'center','#9fc8df');
}

function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);
  ctx.clearRect(0,0,W,H);
  if(scene==='title')drawTitle();
  else if(scene==='cutscene')drawCutscene();
  else if(scene==='world')drawWorld();
  else if(scene==='villageDialog')drawVillageDialog();
  else drawEnd();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('keydown',e=>{keys[e.key]=true;if(['Enter',' ','z','Z'].includes(e.key)){e.preventDefault();pressAction();}});
addEventListener('keyup',e=>{keys[e.key]=false;});
canvas.addEventListener('pointerdown',e=>{
  if(scene!=='world') pressAction();
});

actionBtn.addEventListener('pointerdown',e=>{e.preventDefault();pressAction();});

let touchVector={x:0,y:0}, stickPointer=null;
function stickMove(e){
  const r=stickBase.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const max=36,l=Math.hypot(dx,dy);
  if(l>max){dx=dx/l*max;dy=dy/l*max;}
  stickKnob.style.transform=`translate(${dx}px,${dy}px)`;
  touchVector.x=dx/max;touchVector.y=dy/max;
}
stickBase.addEventListener('pointerdown',e=>{stickPointer=e.pointerId;stickBase.setPointerCapture(e.pointerId);stickMove(e);});
stickBase.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)stickMove(e);});
function stickEnd(e){if(e.pointerId===stickPointer){stickPointer=null;touchVector={x:0,y:0};stickKnob.style.transform='translate(0,0)';}}
stickBase.addEventListener('pointerup',stickEnd);stickBase.addEventListener('pointercancel',stickEnd);
})();