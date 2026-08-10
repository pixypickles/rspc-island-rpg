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
let keys = {};
let dialogIndex = 0;
let flashText = '';
let flashTimer = 0;
let villageEventStarted = false;

const dash = {x:125,y:362,speed:178};
const hero = {x:1435,y:392};
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

const world = { width: 1700, height: 760 };

function resize(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W*dpr;
  canvas.height = H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled = false;
}
resize();
addEventListener('resize', resize);

function rect(x,y,w,h,c){
  ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function outlineRect(x,y,w,h,fill,stroke='#20324b',lw=2){
  rect(x,y,w,h,fill);
  ctx.strokeStyle=stroke;ctx.lineWidth=lw;
  ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1);
}
function text(t,x,y,size=24,align='left',color='#fff',weight=700){
  ctx.font=`${weight} ${size}px system-ui,-apple-system,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
  ctx.textAlign=align; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillText(t,x+2,y+3);
  ctx.fillStyle=color; ctx.fillText(t,x,y);
}
function ellipse(x,y,rx,ry,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}

function drawHeroFox(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  // shadow
  ellipse(0,34,18,6,'rgba(23,38,56,.22)');
  // tail
  ctx.fillStyle='#79cde8';ctx.beginPath();ctx.moveTo(14,8);ctx.quadraticCurveTo(37,6,34,25);ctx.quadraticCurveTo(31,38,12,27);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f7fbff';ctx.beginPath();ctx.moveTo(29,17);ctx.quadraticCurveTo(38,15,33,26);ctx.quadraticCurveTo(29,33,21,29);ctx.closePath();ctx.fill();
  // ears
  ctx.fillStyle='#80d5ef';
  ctx.beginPath();ctx.moveTo(-16,-26);ctx.lineTo(-6,-44);ctx.lineTo(-2,-21);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(16,-26);ctx.lineTo(6,-44);ctx.lineTo(2,-21);ctx.closePath();ctx.fill();
  ctx.fillStyle='#eefaff';
  ctx.beginPath();ctx.moveTo(-12,-28);ctx.lineTo(-7,-38);ctx.lineTo(-5,-24);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(12,-28);ctx.lineTo(7,-38);ctx.lineTo(5,-24);ctx.closePath();ctx.fill();
  // head
  ellipse(0,-14,18,17,'#c9f1fb');
  ellipse(0,-5,10,8,'#f7fbff');
  // hair/forelock
  ctx.fillStyle='#67b8da';ctx.beginPath();ctx.moveTo(-13,-25);ctx.lineTo(-4,-31);ctx.lineTo(-1,-23);ctx.lineTo(7,-30);ctx.lineTo(11,-22);ctx.closePath();ctx.fill();
  // eyes
  rect(-9,-16,4,6,'#21304a');rect(5,-16,4,6,'#21304a');
  rect(-8,-16,1,2,'#fff');rect(6,-16,1,2,'#fff');
  rect(-2,-8,4,3,'#39455e');
  // body outfit: white/black/light blue
  rect(-15,3,30,25,'#f4f8fb');
  rect(-13,4,26,8,'#17253c');
  rect(-4,11,8,17,'#8ad9ef');
  rect(-17,8,5,16,'#d8f3fa');rect(12,8,5,16,'#d8f3fa');
  // belt + short sword
  rect(-13,22,26,4,'#263650');
  rect(13,16,4,20,'#7d6a55');rect(16,31,11,3,'#bdc9d2');
  // legs
  rect(-12,28,9,12,'#1f2d46');rect(3,28,9,12,'#1f2d46');
  rect(-13,38,11,4,'#ecf8fc');rect(2,38,11,4,'#ecf8fc');
  ctx.restore();
}

function drawDashmiu(x,y,s=1){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(s,s);
  ellipse(0,34,17,6,'rgba(23,38,56,.22)');
  // ears with soft curves
  ctx.fillStyle='#efe5da';
  ctx.beginPath();ctx.ellipse(-7,-36,6,18,-.1,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(7,-37,6,19,.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e8aeb8';
  ctx.beginPath();ctx.ellipse(-7,-36,2.4,13,-.1,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(7,-37,2.4,14,.1,0,Math.PI*2);ctx.fill();
  // head
  ellipse(0,-12,17,16,'#f6eee5');
  ellipse(0,-4,9,7,'#fff8f2');
  // little hair
  ctx.fillStyle='#d8c1ad';ctx.beginPath();ctx.moveTo(-8,-25);ctx.lineTo(-2,-31);ctx.lineTo(2,-24);ctx.lineTo(8,-29);ctx.lineTo(10,-21);ctx.closePath();ctx.fill();
  // eyes / expression
  rect(-8,-14,4,6,'#243149');rect(4,-14,4,6,'#243149');
  rect(-7,-14,1,2,'#fff');rect(5,-14,1,2,'#fff');
  rect(-2,-6,4,3,'#cf8c96');
  // navy circus staff shirt
  rect(-14,4,28,24,'#182846');
  rect(-10,7,20,4,'#2b3f66');
  rect(-3,5,6,20,'#edf1f7');
  // tiny circus neck accent
  ctx.fillStyle='#f3aa4d';ctx.beginPath();ctx.moveTo(-5,4);ctx.lineTo(0,9);ctx.lineTo(5,4);ctx.closePath();ctx.fill();
  // arms / legs
  rect(-18,9,5,15,'#f6eee5');rect(13,9,5,15,'#f6eee5');
  rect(-11,28,8,12,'#263552');rect(3,28,8,12,'#263552');
  rect(-12,38,10,4,'#f6eee5');rect(2,38,10,4,'#f6eee5');
  ctx.restore();
}

function drawPirate(x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ellipse(0,27,16,5,'rgba(0,0,0,.22)');
  ellipse(0,-10,14,13,'#806b56');
  rect(-13,2,26,24,'#e87a2e');
  rect(-12,6,24,5,'#283346');
  rect(-15,-23,30,6,'#ef8b3c');
  rect(-9,-28,18,7,'#2d3340');
  rect(-9,-13,4,4,'#1c2537');rect(5,-13,4,4,'#1c2537');
  rect(-10,26,8,12,'#2f2f36');rect(2,26,8,12,'#2f2f36');
  ctx.restore();
}

function drawTitle(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#77cae7');g.addColorStop(.55,'#c5eadc');g.addColorStop(1,'#f2d5a6');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  // island
  ctx.fillStyle='#66af63';ctx.beginPath();ctx.moveTo(480,118);ctx.lineTo(756,250);ctx.lineTo(654,448);ctx.lineTo(307,448);ctx.lineTo(205,251);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#4c8d59';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#526751';ctx.beginPath();ctx.moveTo(480,172);ctx.lineTo(570,352);ctx.lineTo(391,352);ctx.closePath();ctx.fill();
  ctx.fillStyle='#7b8e66';ctx.beginPath();ctx.moveTo(480,190);ctx.lineTo(545,335);ctx.lineTo(417,335);ctx.closePath();ctx.fill();

  [['🎪',480,140],['💧',273,266],['🔥',350,407],['🌪️',610,407],['🪨',687,266]].forEach(([a,x,y])=>text(a,x,y,30,'center'));
  text('りすぺく島RPG',480,75,53,'center','#fff',800);
  text('Ver.0.2',480,121,18,'center','#eef8ff');
  ctx.fillStyle='rgba(10,23,48,.73)';ctx.fillRect(310,466,340,52);
  text('タップ / Enter で はじめる',480,492,21,'center');
}

function speakerName(who){
  return ({narrator:'',dash:'ダッシュミウ',pirate:'海賊',elder:'ぶりふぉ村長',hero:'主人公'})[who]||who;
}
function drawDialog(who,line){
  ctx.fillStyle='rgba(7,17,36,.92)';ctx.fillRect(46,380,868,132);
  ctx.strokeStyle='#d5ecf6';ctx.lineWidth=3;ctx.strokeRect(47.5,381.5,865,129);
  ctx.strokeStyle='#6db8d1';ctx.lineWidth=1;ctx.strokeRect(54.5,388.5,851,115);
  const n=speakerName(who);
  if(n){
    ctx.fillStyle='#eaf7fb';ctx.fillRect(72,363,208,37);
    ctx.strokeStyle='#6db8d1';ctx.strokeRect(72.5,363.5,207,36);
    text(n,88,382,18,'left','#19324b');
  }
  wrapText(line,78,422,805,27,22);
  text('▼',875,486,17,'center','#d9ecff');
}
function wrapText(str,x,y,maxWidth,lineHeight,size){
  ctx.font=`700 ${size}px system-ui,-apple-system,"Yu Gothic",sans-serif`;
  ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='top';
  let line='',yy=y;
  for(const ch of str){
    const next=line+ch;
    if(ctx.measureText(next).width>maxWidth){ctx.fillText(line,x,yy);line=ch;yy+=lineHeight;}
    else line=next;
  }
  if(line)ctx.fillText(line,x,yy);
}

function drawCutscene(){
  ctx.fillStyle='#071023';ctx.fillRect(0,0,W,H);
  const i=Math.min(dialogIndex,prologue.length-1);
  const [who,line]=prologue[i];

  if(i<=3){
    ctx.fillStyle='#21466e';ctx.fillRect(0,268,W,272);
    for(let y=292;y<540;y+=34){
      for(let x=(y%68);x<W;x+=90) rect(x,y,50,3,'#3d6b92');
    }
    // circus ship
    rect(205,210,185,64,'#744936');rect(265,110,8,105,'#d5dbe7');
    ctx.fillStyle='#1b2844';ctx.beginPath();ctx.moveTo(273,118);ctx.lineTo(370,170);ctx.lineTo(273,190);ctx.closePath();ctx.fill();
    text('CHESTAPI',300,237,15,'center','#f4f2dc');
    // pirate ship
    rect(690,235,145,50,'#4e3025');rect(730,153,7,88,'#d0d5df');
    ctx.fillStyle='#e87a2f';ctx.beginPath();ctx.moveTo(737,158);ctx.lineTo(811,195);ctx.lineTo(737,213);ctx.closePath();ctx.fill();
  } else if(i<=8){
    ctx.fillStyle='#101936';ctx.fillRect(0,0,W,H);
    for(let a=0;a<60;a++) rect((a*137)%W,(a*79)%250,2,2,'#d5e7ff');
    rect(0,340,W,200,'#21483f');
    rect(110,270,280,76,'#5a3829');
    text('ちぇすたぴ号',250,307,17,'center','#e8e2cc');
    drawPirate(610,354,1.35);drawPirate(687,369,1.18);drawPirate(760,350,1.28);
    if(i>=5) drawDashmiu(220,361,1.32);
  } else {
    ctx.fillStyle='#101936';ctx.fillRect(0,0,W,H);
    rect(0,345,W,195,'#234d43');
    for(let x=0;x<W;x+=78){rect(x,286,42,80,'#173d36');rect(x+8,260,26,35,'#245d49')}
    drawDashmiu(455,365,1.45);
    text('りすぺく島',480,94,46,'center','#fff');
  }
  drawDialog(who,line);
}

function drawTree(x,y){
  rect(x+10,y+25,12,31,'#705039');
  ellipse(x+14,y+13,24,22,'#3b815c');
  ellipse(x+4,y+5,19,18,'#438f62');
  ellipse(x+27,y+4,18,17,'#4a9968');
  rect(x+2,y+9,7,5,'#69ae78');
}
function drawHouse(x,y){
  // soft SFC-style cottage
  outlineRect(x,y+32,82,61,'#f1f5f1','#345166',2);
  ctx.fillStyle='#1d2d49';ctx.beginPath();ctx.moveTo(x-8,y+34);ctx.lineTo(x+41,y);ctx.lineTo(x+90,y+34);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#0f1e35';ctx.lineWidth=2;ctx.stroke();
  rect(x+31,y+59,19,34,'#8bd7ea');
  outlineRect(x+9,y+47,17,15,'#aee8f2','#5a8290',1);
  outlineRect(x+56,y+47,17,15,'#aee8f2','#5a8290',1);
  rect(x+6,y+36,68,4,'#ffffff');
}
function drawVillage(x,y){
  // large ice wall
  ctx.fillStyle='rgba(219,250,255,.93)';
  ctx.beginPath();
  ctx.moveTo(x+220,y-8);ctx.lineTo(x+255,y-22);ctx.lineTo(x+260,y+250);ctx.lineTo(x+218,y+258);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#8fd7eb';ctx.lineWidth=3;ctx.stroke();
  for(let yy=y;yy<y+240;yy+=40) rect(x+232,yy,5,25,'rgba(130,206,230,.55)');
  drawHouse(x,y+58);drawHouse(x+108,y+15);drawHouse(x+100,y+157);drawHouse(x-28,y+178);
  text('ぶりふぉ村',x+92,y-25,25,'center','#284461');
}

function drawWorld(){
  camera.x=Math.max(0,Math.min(world.width-W,dash.x-W*.42));
  camera.y=Math.max(0,Math.min(world.height-H,dash.y-H*.56));

  ctx.save();ctx.translate(-camera.x,-camera.y);
  rect(0,0,world.width,world.height,'#8fd47f');
  rect(0,0,world.width,95,'#62c4df');
  rect(0,660,world.width,100,'#62c4df');

  // coastal road
  ctx.fillStyle='#e8d5a3';ctx.beginPath();
  ctx.moveTo(65,295);ctx.bezierCurveTo(500,280,890,335,1485,300);
  ctx.lineTo(1498,447);ctx.bezierCurveTo(900,470,510,430,65,445);ctx.closePath();ctx.fill();
  rect(65,330,1425,6,'#d4bc82');
  rect(65,411,1425,6,'#d4bc82');

  // tree rows
  for(let x=32;x<1640;x+=92){drawTree(x,178+(x%4)*10);drawTree(x+34,518+(x%5)*5);}
  // stream near village
  rect(1190,105,70,190,'#a6e8f2');
  rect(1203,105,10,190,'rgba(255,255,255,.28)');
  drawVillage(1390,180);

  // sign
  rect(982,280,8,50,'#74523b');outlineRect(944,243,86,42,'#efd99f','#98784c',2);text('ぶりふぉ',987,264,14,'center','#38475a');

  // IMPORTANT: only Dashmiu is present during this scene.
  drawDashmiu(dash.x,dash.y,1.22);
  ctx.restore();

  ctx.fillStyle='rgba(9,22,48,.8)';ctx.fillRect(18,18,292,46);
  text('目的：ぶりふぉ村へ向かう',35,41,18);
  if(flashTimer>0){
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(325,88,310,58);
    text(flashText,480,117,21,'center');
  }
}

function drawVillageDialog(){
  // village closeup
  ctx.fillStyle='#8fd47f';ctx.fillRect(0,0,W,H);
  rect(0,0,W,92,'#89d9e8');
  drawHouse(95,145);drawHouse(225,105);drawHouse(725,135);
  drawTree(30,300);drawTree(845,290);drawTree(720,330);
  // hero appears here for first time
  drawDashmiu(345,335,1.35);
  drawHeroFox(570,335,1.38);

  // villagers silhouettes
  for(let i=0;i<5;i++){
    const x=650+i*40,y=385+(i%2)*8;
    ellipse(x,y-10,11,10,'#d3eef3');rect(x-10,y,20,25,'#e8f4f5');
  }
  // elder
  ellipse(490,350,13,12,'#d2eef6');rect(475,362,30,30,'#22314c');

  const item=villageDialog[Math.min(dialogIndex,villageDialog.length-1)];
  drawDialog(item[0],item[1]);
}

function drawEnd(){
  ctx.fillStyle='#0c1830';ctx.fillRect(0,0,W,H);
  drawHeroFox(405,270,1.8);drawDashmiu(555,275,1.8);
  text('Ver.0.2 ここまで',480,115,43,'center');
  text('次は：ぶりふぉ村の旅立ち準備 ＋ 最初の戦闘',480,396,22,'center','#d8efff');
  text('タップ / Enter でタイトルへ',480,454,18,'center','#9fc8df');
}

function update(dt){
  if(scene==='world'){
    let dx=0,dy=0;
    if(keys.ArrowLeft||keys.a)dx-=1;
    if(keys.ArrowRight||keys.d)dx+=1;
    if(keys.ArrowUp||keys.w)dy-=1;
    if(keys.ArrowDown||keys.s)dy+=1;
    dx+=touchVector.x;dy+=touchVector.y;
    const l=Math.hypot(dx,dy);
    if(l>.05){
      dx/=Math.max(1,l);dy/=Math.max(1,l);
      dash.x+=dx*dash.speed*dt;dash.y+=dy*dash.speed*dt;
    }
    dash.x=Math.max(48,Math.min(world.width-70,dash.x));
    dash.y=Math.max(145,Math.min(world.height-120,dash.y));

    if(dash.x>1320 && dash.y>185 && dash.y<535 && !villageEventStarted){
      villageEventStarted=true;
      scene='villageDialog';dialogIndex=0;touchUI.classList.add('hidden');
    }
    if(flashTimer>0)flashTimer-=dt;
  }
}

function pressAction(){
  if(scene==='title'){
    scene='cutscene';dialogIndex=0;touchUI.classList.add('hidden');return;
  }
  if(scene==='cutscene'){
    dialogIndex++;
    if(dialogIndex>=prologue.length){
      scene='world';dialogIndex=0;touchUI.classList.remove('hidden');
      flashText='ダッシュミウをぶりふぉ村へ！';flashTimer=2.2;
    }
    return;
  }
  if(scene==='villageDialog'){
    dialogIndex++;
    if(dialogIndex>=villageDialog.length){scene='end';dialogIndex=0;}
    return;
  }
  if(scene==='end'){
    scene='title';dash.x=125;dash.y=362;villageEventStarted=false;
  }
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

addEventListener('keydown',e=>{
  keys[e.key]=true;
  if(['Enter',' ','z','Z'].includes(e.key)){e.preventDefault();pressAction();}
});
addEventListener('keyup',e=>{keys[e.key]=false;});
canvas.addEventListener('pointerdown',e=>{if(scene!=='world')pressAction();});
actionBtn.addEventListener('pointerdown',e=>{e.preventDefault();pressAction();});

let touchVector={x:0,y:0},stickPointer=null;
function stickMove(e){
  const r=stickBase.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=e.clientX-cx,dy=e.clientY-cy;const max=36,l=Math.hypot(dx,dy);
  if(l>max){dx=dx/l*max;dy=dy/l*max;}
  stickKnob.style.transform=`translate(${dx}px,${dy}px)`;
  touchVector.x=dx/max;touchVector.y=dy/max;
}
stickBase.addEventListener('pointerdown',e=>{stickPointer=e.pointerId;stickBase.setPointerCapture(e.pointerId);stickMove(e);});
stickBase.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)stickMove(e);});
function stickEnd(e){
  if(e.pointerId===stickPointer){
    stickPointer=null;touchVector={x:0,y:0};stickKnob.style.transform='translate(0,0)';
  }
}
stickBase.addEventListener('pointerup',stickEnd);
stickBase.addEventListener('pointercancel',stickEnd);
})();