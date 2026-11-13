import fs from 'fs';
const px=(rows,pal,s=3,label='')=>{const h=rows.length,w=Math.max(...rows.map(r=>r.length));let r='';rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(pal[c])r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[c]}"/>`}));
 return `<svg class="px-i" width="${w*s}" height="${h*s}" viewBox="0 0 ${w} ${h}" ${label?`role="img" aria-label="${label}"`:'aria-hidden="true"'}>${r}</svg>`};
const cc={X:'currentColor'};
const ico=(rows,s=2)=>px(rows,cc,s);
const bit=(s=3)=>px(['...XX...','..XXXX..','.XXXXXX.','XXEXXEXX','XXXXXXXX','XXXEEXXX','.XXXXXX.','..X..X..'],{X:'var(--text)',E:'var(--bg)'},s);
const flame=(s=2)=>px(['...X....','...XX...','..XXX.X.','.XXXXXX.','.XXYXXX.','XXXYYXXX','.XXYYXX.','..XXXX..'],{X:'var(--u-html)',Y:'var(--u-js)'},s);
const coin=(s=2)=>px(['..XXXX..','.XXXXXX.','XXXYYXXX','XXXYYXXX','XXXYYXXX','XXXYYXXX','.XXXXXX.','..XXXX..'],{X:'var(--u-js)',Y:'var(--coin-in)'},s);
const trophy=(s=2)=>px(['XXXXXXXX','XXXXXXXX','.XXXXXX.','..XXXX..','...XX...','...XX...','..XXXX..','.XXXXXX.'],{X:'var(--u-js)'},s);
const cursor=(s=2)=>px(['X.......','XX......','XXX.....','XXXX....','XXXXX...','XXXXXX..','XXXX....','XX.XX...','X..XX...','....X...'],cc,s);
const play=(s=2)=>px(['X...','XX..','XXX.','XXXX','XXX.','XX..','X...'],cc,s);
const logo=px(['........','XX......','.XX.....','..XX....','.XX.....','XX......','....XXXX','........'],{X:'var(--text)'},3);
const R={
 prompt:['........','XX......','.XX.....','..XX....','.XX.....','XX......','....XXXX','........'],
 route:['XX......','XX......','.X......','..XX....','....XX..','......X.','......XX','......XX'],
 bars:['........','......X.','......X.','...X..X.','...X..X.','X..X..X.','X..X..X.','XXXXXXXX'],
 book:['........','XXXXXXXX','X..XX..X','X..XX..X','X..XX..X','X..XX..X','XXXXXXXX','........'],
 bolt:['....XX..','...XX...','..XX....','.XXXXXX.','....XX..','...XX...','..X.....','........'],
 cards:['..XXXXXX','..X....X','XXXXXX.X','X....X.X','X....X.X','X....XXX','X....X..','XXXXXX..'],
 braces:['..XX.XX..','..X...X..','.X.....X.','X.......X','.X.....X.','..X...X..','..XX.XX..'],
 check:['........','.......X','......XX','X....XX.','XX..XX..','.XXXX...','..XX....','........'],
 x:['........','XX....XX','.XX..XX.','..XXXX..','..XXXX..','.XX..XX.','XX....XX','........'],
 left:['...X....','..XX....','.XXXXXXX','XXXXXXXX','.XXXXXXX','..XX....','...X....','........'],
 sun:['....X....','.X..X..X.','..XXXXX..','..XXXXX..','X.XXXXX.X','..XXXXX..','.X..X..X.','....X....'],
 moon:['..XXXX..','.XXX....','XXX.....','XXX.....','XXX.....','.XXX....','..XXXX..','........'],
 term:['XXXXXXXX','X......X','X.X....X','X..X...X','X.X....X','X...XX.X','X......X','XXXXXXXX'],
};
const ic=Object.fromEntries(Object.entries(R).map(([k,v])=>[k,ico(v,2)]));
const ic3=Object.fromEntries(Object.entries(R).map(([k,v])=>[k,ico(v,3)]));
ic.sun=ic.sun.replace('class="px-i"','class="px-i sun"');ic.moon=ic.moon.replace('class="px-i"','class="px-i moon"');
// pixel discs 13x13
const disc=(kind)=>{const rows=[];const chk=new Set(['3,6','4,7','5,8','6,7','7,6','8,5','9,4','3,7','4,8','5,9','6,8','7,7','8,6','9,5']);
 for(let y=0;y<13;y++){let r='';for(let x=0;x<13;x++){const d=Math.hypot(x-6,y-6);let c='.';
  if(kind==='done'){if(d<=6.1)c=chk.has(x+','+y)?'K':'X'}
  else if(kind==='now'){if(d<=6.1&&d>=4.2)c='X';else if(d<=2.3)c='X';else if(d<=6.1)c='B'}
  else {if(d<=6.1&&d>4.9)c='X';else if(d<=4.9)c='B'}
  r+=c}rows.push(r)}
 return `<span class="disc">${px(rows,{X:'currentColor',K:'var(--on-u)',B:'var(--bg)'},3).replace('width="39" height="39"','width="100%" height="100%"')}</span>`};
const seg=(on,total,cls='',c='')=>`<span class="seg ${cls}" ${c?`style="--c:var(${c})"`:''}>${Array.from({length:total},(_,i)=>`<i class="${i<on?'':'off'}"></i>`).join('')}</span>`;
// shell
const head=(t)=>`<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t} - DIW Arcade</title><script src="theme.js"></script><link rel="stylesheet" href="app.css"></head><body>`;
const toggle=`<button class="iconbtn" data-theme-toggle aria-label="Alternar tema claro e escuro">${ic.sun}${ic.moon}</button>`;
const nav=(cur,pl=false)=>[['hoje','Hoje','prompt'],['trilha','Trilha','route'],['progresso','Progresso','bars']].map(([k,l,i])=>`<a href="${k}.html"${k===cur?' aria-current="page"':''}>${pl?ic[i]:`<span class="cur">${cursor(2)}</span>`}${l}</a>`).join('');
const topbar=(cur)=>`<header class="top"><div class="top-in"><a class="brand" href="index.html">${logo}DIW Arcade</a><nav class="nav" aria-label="Principal">${nav(cur)}</nav>
<div class="stat"><span class="lvl mono">nível 3</span>${seg(5,10,'sm')}<span class="chip" aria-label="Sequência de 4 dias">${flame()}4</span>${toggle}<span class="avatar px" aria-label="Menu da conta"><span>F</span></span></div></div></header>`;
const app=(file,title,cur,body)=>fs.writeFileSync(file,head(title)+topbar(cur)+`<main>${body}</main><nav class="tabbar" aria-label="Principal">${nav(cur,true).replace(/<span class="cur">.*?<\/span>/g,'')}</nav></body></html>`);
const L=(n,t)=>`<i>${n}</i>${t}\n`;
const codebox=(cap,lines,status='')=>`<div class="px codebox">${cap?`<div class="cap">${cap}</div>`:''}<div class="code">${lines.map((l,k)=>L(k+1,l)).join('')}</div>${status}</div>`;
const btn=(t,h,cls='primary')=>`<a class="btn ${cls}" href="${h}">${t}${cls==='primary'?play(2):''}</a>`;
const src=(t)=>`<span class="src">${ic.book}Fonte: ${t}</span>`;

// ---------- home: the trail is the page
const hrow=(f,fn,kind,c,inner)=>({f,fn,kind,c,inner});
const rows=[
 hrow(.30,0,'done','--u-fund',`<h2>${ic3.book}Ler</h2><p class="d">Seis a dez pontos tirados dos slides, cada um com o slide de origem. É o que faltava antes do quiz.</p>${codebox('menu.css',['<span class="k-t">.menu</span> {','  <span class="k-p">display</span>: <span class="k-s">flex</span>;','}'])}${src('aula 174, slide 3')}`),
 hrow(.72,0,'done','--u-css',`<h2>${ic3.bolt}Praticar</h2><p class="d">Um quiz curto. A resposta vem com o motivo e o slide de onde saiu.</p><div class="px mini-q"><b>Qual propriedade alinha no eixo principal?</b><span class="o">A  align-items</span><span class="o ok">B  justify-content  correto</span></div>`),
 hrow(.34,0,'now','--u-js',`<h2>${ic3.cards}Fixar</h2><p class="d">O que você errou volta como carta, na hora certa de rever.</p><div class="px card"><span class="f">O que faz <code>justify-content</code>?</span><span class="b">6 cartas para revisar hoje.</span></div>`),
 hrow(.70,0,'todo','--u-dados',`<h2>${ic3.braces}Construir</h2><p class="d">Desafios de código com editor, pré-visualização e testes que dizem o que falta.</p>${codebox('',['<span class="k-t">.menu</span> {','  <span class="k-p">gap</span>: <span class="k-n">16px</span>;','}'],'<div class="status"><span class="ok">3 testes passaram</span><span>+30 XP</span></div>')}`),
 hrow(.40,0,'todo','--u-prova',`<h2>${trophy(3)}Chegue na Prova 2</h2><p class="d">Seis unidades e 20 nós, com uma cor para cada linguagem. Sem conta e sem cadastro.</p><div class="units"><span><i class="dot" style="--c:var(--u-fund)"></i>Fundamentos<small>2</small></span><span><i class="dot" style="--c:var(--u-html)"></i>HTML<small>3</small></span><span><i class="dot" style="--c:var(--u-css)"></i>CSS<small>4</small></span><span><i class="dot" style="--c:var(--u-ux)"></i>Design e Mobile<small>3</small></span><span><i class="dot" style="--c:var(--u-js)"></i>Dados e JavaScript<small>2</small></span><span><i class="dot" style="--c:var(--u-prova)"></i>Prova 2<small>6</small></span></div><div class="cta" style="margin-top:28px">${btn('Começar a trilha','hoje.html')}</div>`),
];
const htrail=rows.map((r,i)=>{const nx=rows[i+1];
 const path=nx?`<svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M${r.f*100} 0 C${r.f*100} 55 ${nx.f*100} 45 ${nx.f*100} 100"/></svg>`:'';
 return `<div class="hrow" style="--f:${r.f};--c:var(${r.c})"><div class="col">${path}${disc(r.kind)}</div><div>${r.inner}</div></div>`}).join('');
fs.writeFileSync('index.html',head('Aprenda interfaces web zerando a trilha')+`
<header class="top"><div class="top-in"><a class="brand" href="index.html" style="flex:1">${logo}DIW Arcade</a>${toggle}<a class="btn quiet" href="hoje.html" style="min-height:44px;padding:0 20px">Entrar</a></div></header>
<section class="home-hero"><div><h1>Aprenda interfaces web zerando a trilha.</h1><p class="lede">Aulas curtas, quizzes, cartas e desafios de código para Desenvolvimento de Interfaces Web. Roda no navegador e guarda seu progresso só no seu computador.</p>
<div class="cta">${btn('Começar a trilha','hoje.html')}${btn('Ver como funciona','#como','quiet')}</div></div>
<div class="px cab" aria-label="Exemplo de um dia de estudo"><p>Um dia de estudo</p><span class="score">${coin(3)}32 XP</span>${seg(16,25,'',' --u-js'.trim())}<p>Meta de 50 XP. Quatro dias seguidos ${flame(2).replace('class="px-i"','class="px-i" style="display:inline-block;vertical-align:-3px"')}</p></div></section>
<div class="hw" id="como"><div class="htrail">${htrail}</div></div>
<footer class="f"><div>Projeto de estudo para a disciplina de Desenvolvimento de Interfaces Web da PUC Minas. Cada conteúdo cita o slide de origem.</div></footer></body></html>`);

// ---------- hoje
app('hoje.html','Hoje','hoje',`
<h1 class="hello">Bom te ver de volta.</h1>
<section class="px next" aria-labelledby="n"><div class="next-top"><div><h2 id="n">Flexbox e Grid</h2><p class="muted" style="margin-top:10px">Falta o desafio. 2 de 4 passos.</p></div><span class="tag"><i class="dot" style="--c:var(--u-css)"></i>CSS</span></div>
<span role="img" aria-label="2 de 4 passos">${seg(2,4,'',' --u-css'.trim())}</span>${btn('Continuar','licao.html')}</section>
<section class="sect" aria-labelledby="a"><h2 id="a">Também hoje</h2><div>
<div class="row"><span class="ic">${ic3.cards}</span><span class="t">6 cartas para revisar</span><a class="go" href="#">Revisar</a></div>
<div class="row"><span class="ic">${ic3.bolt}</span><span class="t">Quiz de Viewport e Media Queries</span><a class="go" href="quiz.html">Começar</a></div>
<div class="row"><span class="ic">${ic3.book}</span><span class="t">Primeiros pontos de Bootstrap</span><a class="go" href="ler.html">Ler</a></div></div></section>
<div class="goal"><p>${coin(2)}32 de 50 XP hoje</p>${seg(16,25,'',' --u-js'.trim())}<p class="muted">Faltam 18 XP. Um quiz de 10 perguntas já cobre.</p></div>`);

// ---------- trilha
const U=[['Fundamentos da Web','--u-fund',[['Introdução à Web e tecnologias','done'],['Arquitetura, URI/URL/URN e dinâmica da Web','done']],true],
['HTML','--u-html',[['Sintaxe e elementos HTML','done'],['Formulários','done'],['Semântica','done']],true],
['CSS','--u-css',[['CSS: introdução e sintaxe','done'],['Propriedades CSS','done'],['Viewport e Media Queries','done'],['Flexbox e Grid','now']]],
['Design e Mobile','--u-ux',[['UX Design e projeto web','todo'],['Web e computação móvel','todo'],['Bootstrap','todo']]],
['Dados e JavaScript','--u-js',[['JSON e APIs','todo'],['Introdução ao JavaScript','todo']]],
['Prova 2','--u-prova',[['Leitura de código: escopo, hoisting e execução','todo'],['Tipos, igualdade e coerção','todo'],['DOM e eventos','todo'],['URLs e parâmetros de consulta','todo'],['Assíncrono: promises, async/await e fetch','todo'],['Formulários e validação com JavaScript','todo']]]];
let y=24,i=0,r=0,pts=[],h='';
for(const [name,c,ns,collapsed] of U){const d=ns.filter(n=>n[1]==='done').length;
 if(collapsed){const f=.5+.36*Math.sin(r*.95);pts.push([f*100,y+28]);
  h+=`<a class="node done" href="#" style="top:${y}px;--c:var(${c});--f:${f.toFixed(3)}" aria-label="${name}, unidade concluída, ${ns.length} nós. Abrir">${disc('done')}<span class="lbl"><span class="px-t" style="font-size:22px;display:block">${name}</span><span class="sub">${ns.length} de ${ns.length} nós, concluída</span></span></a>`;
  y+=72+8;i+=ns.length;r++;continue;}
 h+=`<div class="unit" style="top:${y}px"><i class="dot" style="--c:var(${c})"></i>${name}<small>${d} de ${ns.length}</small></div>`;y+=56;
 for(const [t,s] of ns){const f=.5+.36*Math.sin(r*.95);pts.push([f*100,y+28]);
  const st={done:'Concluído',now:'Em andamento',todo:'Não iniciado'}[s];
  const sub=s==='now'?`<span class="sub">${cursor(2)}Você está aqui, 2 de 4 passos</span>`:'';
  const last=t==='Formulários e validação com JavaScript'?`<span class="boss">${trophy(2)}</span>`:'';
  h+=`<a class="node ${s}" href="licao.html" style="top:${y}px;--c:var(${c});--f:${f.toFixed(3)}" aria-label="${t}, ${st}">${disc(s)}<span class="lbl"><span class="n">${String(i+1).padStart(2,'0')}</span>${t}${last}${sub}</span></a>`;y+=72;i++;r++;}
 y+=8;}
let d=`M${pts[0][0].toFixed(1)} ${pts[0][1]}`;
for(let k=0;k<pts.length-1;k++){const p0=pts[k-1]||pts[k],p1=pts[k],p2=pts[k+1],p3=pts[k+2]||p2;
 d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1]}`;}
app('trilha.html','Trilha','trilha',`<div class="trail-head"><div><h1>Trilha</h1><p class="muted" style="margin-top:10px">8 de 20 nós concluídos. Você está em Flexbox e Grid.</p></div>${btn('Continuar Flexbox e Grid','licao.html')}</div>
<div class="trail" style="height:${y}px"><svg class="path" viewBox="0 0 100 ${y}" height="${y}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>${h}</div>`);

// ---------- lesson + ler
const steps=(cur)=>{const S=[['Ler','10 pontos','ler.html'],['Praticar','8 de 10 certas','quiz.html'],['Fixar','6 cartas hoje','#'],['Construir','3 desafios','desafio.html']];
 const st=cur==='ler'?['cur','','','']:['done','done','cur',''];
 return `<ol class="steps">${S.map(([n,s,l],k)=>`<li class="${st[k]}"><a href="${l}"><span class="m px">${st[k]==='done'?ic.check:k+1}</span><b>${n}</b><small>${s}</small></a></li>`).join('')}</ol>`};
const lessonHead=`<div class="lead"><h1>Flexbox e Grid</h1><span class="tag"><i class="dot" style="--c:var(--u-css)"></i>CSS, aula 174</span><div class="mastery"><p>5 de 10 pontos de domínio</p>${seg(5,10,'',' --u-css'.trim())}</div></div>`;
app('licao.html','Flexbox e Grid','trilha',`<div class="crumb"><a class="back" href="trilha.html">${ic.left}Trilha</a></div>${lessonHead}${steps('fixar')}
<div class="stage"><h2>Fixar</h2><p class="muted">27 cartas, 6 para revisar hoje. Você acertou 8 de 10 no quiz, então vale fixar o que errou.</p>${btn('Continuar','#')}</div>
<section class="sect" style="margin-top:64px"><h2>O que você já domina</h2><ul class="know">
${[['display: flex',1],['justify-content',1],['align-items',1],['grid-area',0],['grid-template-columns',0],['gap',0]].map(([c,y])=>`<li class="${y?'y':''}"><code>${c}</code><span>${y?ic.check+'Dominado':'Falta praticar'}</span></li>`).join('')}</ul></section>`);
const pt=(t,body,code,s)=>`<li><div><b>${t}</b><p>${body}</p>${code||''}${src(s)}</div></li>`;
app('ler.html','Ler: Flexbox e Grid','trilha',`<div class="crumb"><a class="back" href="licao.html">${ic.left}Flexbox e Grid</a></div>${steps('ler')}
<div class="prose"><h1>Flexbox e Grid</h1><div class="meta"><span>6 pontos</span><span>cerca de 4 minutos</span><span class="tag"><i class="dot" style="--c:var(--u-css)"></i>CSS</span></div>
<ol class="points">
${pt('Flexbox organiza em uma dimensão','Declare <code>display: flex</code> no contêiner e os filhos diretos viram itens alinhados em linha ou coluna.',codebox('menu.css',['<span class="k-t">.menu</span> {','  <span class="k-p">display</span>: <span class="k-s">flex</span>;','}']),'aula 174, slide 3')}
${pt('O eixo principal manda','<code>justify-content</code> distribui os itens no eixo principal. <code>align-items</code> alinha no eixo cruzado.','','aula 174, slide 5')}
${pt('flex-direction troca os eixos','Com <code>column</code>, o eixo principal passa a ser o vertical e os dois alinhamentos se invertem.','','aula 174, slide 6')}
${pt('Grid organiza em duas dimensões','Com <code>display: grid</code> você define linhas e colunas ao mesmo tempo.','','aula 174, slide 11')}
${pt('As trilhas se declaram no contêiner','<code>grid-template-columns</code> define o tamanho de cada coluna e <code>gap</code> abre o espaço entre elas.',codebox('grade.css',['<span class="k-t">.grade</span> {','  <span class="k-p">display</span>: <span class="k-s">grid</span>;','  <span class="k-p">grid-template-columns</span>: <span class="k-n">1fr 2fr</span>;','  <span class="k-p">gap</span>: <span class="k-n">16px</span>;','}']),'aula 174, slide 12')}
${pt('A unidade fr divide o espaço livre','<code>1fr 2fr</code> reparte o espaço que sobra em três partes: uma para a primeira coluna e duas para a segunda.','','aula 174, slide 14')}
</ol>${btn('Continuar para o quiz','quiz.html')}</div>`);

// ---------- quiz
const sessTop=(on,n)=>`<header class="sess-top"><a class="x" href="licao.html" aria-label="Sair da sessão">${ic.x}</a><span role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="10" aria-label="Progresso" style="flex:1;display:flex">${seg(on,10,'',' --text'.trim()).replace('class="seg "','class="seg " style="flex:1"')}</span><span class="n">${n} de 10</span></header>`;
const quiz=(file,ok)=>fs.writeFileSync(file,head('Quiz')+sessTop(4,4)+`<main class="sess"><h1 class="q">Qual propriedade alinha os itens no eixo principal do flexbox?</h1>
<ul class="opts"><li><button class="opt dim" disabled><span class="k">A</span><code>align-items</code></button></li>
${ok?`<li><button class="opt ok" disabled><span class="k">${ic.check}</span><code>justify-content</code></button></li>`:`<li><button class="opt bad" disabled><span class="k">${ic.x}</span><code>align-content</code></button></li><li><button class="opt ok" disabled><span class="k">${ic.check}</span><code>justify-content</code></button></li>`}
<li><button class="opt dim" disabled><span class="k">${ok?'C':'D'}</span><code>flex-wrap</code></button></li></ul>
<p class="hint">Dica: as teclas A a D escolhem a resposta e Enter continua.</p></main>
<div class="fb ${ok?'ok':'bad'}" role="status"><div class="fb-in"><div style="display:flex;gap:16px;align-items:flex-start">${bit(3)}<div><h3>${ok?'Correto.':'Quase.'}</h3><p>${ok?'<code>justify-content</code> age no eixo principal.':'A resposta é <code>justify-content</code>. <code>align-content</code> distribui as linhas no eixo cruzado.'}</p>${src('aula 174, slide 5')}</div></div>${btn('Continuar',ok?'resumo.html':'quiz.html')}</div></div></body></html>`);
quiz('quiz.html',true);quiz('quiz-erro.html',false);
fs.writeFileSync('resumo.html',head('Resumo')+sessTop(10,10)+`<main class="sum"><div style="display:flex;gap:12px;align-items:center">${bit(3)}<p class="muted">Boa. Só dois deslizes.</p></div>
<div><p class="muted">Você acertou</p><p class="big">8 de 10</p></div>
<div class="facts"><div><b>${coin(3)}+40</b><span>XP</span></div><div><b>6</b><span>cartas novas</span></div><div><b>${flame(3)}4</b><span>dias de sequência</span></div></div>
<div class="lvl-up"><p>Faltam 60 XP para o nível 4</p>${seg(4,10,'',' --u-js'.trim())}</div>
<p>Os dois erros foram sobre <code>align-content</code> e <code>grid-area</code>. Vamos fixar com 6 cartas?</p>${btn('Fixar com 6 cartas','hoje.html')}</main></body></html>`);

// ---------- desafio
fs.writeFileSync('desafio.html',head('Desafio')+`<header class="top ch-top"><div class="top-in"><a class="x" href="licao.html" aria-label="Sair do desafio">${ic.x}</a><span class="ch-title">Menu responsivo com flexbox</span><span class="tag"><i class="dot" style="--c:var(--u-css)"></i>CSS</span>${toggle}</div></header>
<div class="ch">
<section aria-label="Editor"><div class="tabs"><span class="on">style.css</span><span>index.html</span></div>
<div class="code" role="textbox" aria-label="Editor de código" tabindex="0">${['<span class="k-t">.menu</span> {','  <span class="k-p">display</span>: <span class="k-s">flex</span>;','  <span class="k-p">justify-content</span>: <span class="k-s">space-between</span>;','  <span class="k-p">gap</span>: <span class="k-n">16px</span>;','}','','<span class="k-t">.menu a</span> {','  <span class="k-p">padding</span>: <span class="k-n">12px</span>;','}'].map((l,k)=>L(k+1,l)).join('')}</div>
<div class="term"><div>$ executar testes</div><div><span class="ok">passou</span> o menu usa display: flex</div><div><span class="ok">passou</span> os itens têm espaço entre si</div><div><span class="bad">falhou</span> os itens quebram de linha em telas estreitas</div></div>
<div class="run">${btn('Executar testes','#')}<span class="mono muted">2 de 4 requisitos</span></div></section>
<section aria-label="Pré-visualização"><div class="pad"><h2>Pré-visualização</h2><div class="frame"><div class="chrome">localhost</div><div class="page"><i style="background:#4F8BFF"></i><i style="background:#F4C542"></i><i style="background:#2FC9A0"></i></div></div></div></section>
<section aria-label="Requisitos"><div class="pad"><h2>Requisitos</h2><ul class="checks">
<li><span style="color:var(--ok)">${ic.check}</span>O menu usa <code>display: flex</code></li>
<li><span style="color:var(--ok)">${ic.check}</span>Os itens têm espaço entre si</li>
<li><span style="color:var(--bad)">${ic.x}</span>Os itens quebram de linha em telas estreitas</li>
<li><span class="muted">${ic.x}</span><span class="muted">O link ativo tem destaque</span></li></ul></div></section></div></body></html>`);
app('progresso.html','Progresso','progresso',`<h1>Progresso</h1><p class="muted" style="margin-top:10px">Ainda não implementado.</p>`);
const m=[['Página inicial','index.html'],['Hoje','hoje.html'],['Trilha','trilha.html'],['Lição: passo Fixar','licao.html'],['Lição: passo Ler','ler.html'],['Quiz: resposta certa','quiz.html'],['Quiz: resposta errada','quiz-erro.html'],['Resumo da sessão','resumo.html'],['Desafio de código','desafio.html']];
fs.writeFileSync('mapa.html',head('Mapa do protótipo')+`<main class="map"><h1>Protótipo da Trilha, versão 4</h1><p class="muted" style="margin:12px 0 32px">Descartável. Fluxo: página inicial, Hoje, Trilha, lição, quiz, resumo, Hoje.</p>${m.map(([n,f])=>`<div class="row"><span class="t">${n}</span><a class="go" href="${f}">Abrir</a></div>`).join('')}</main></body></html>`);
