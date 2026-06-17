/* Beyond the Tonne — client-side social-impact engine.
   This is the ACTUAL formula from the research (it reproduces the dataset's
   Social-Impact index exactly). Job count is DERIVED from project scale, host
   country and methodology — exactly as in the original work — not entered. */

// derived job count = base(scale) × country factor × methodology factor
const JOB_BASE = { "Micro Scale":5, "Small Scale":30, "Medium Scale":125, "Large Scale":850 };
const COUNTRY_FACTOR = { "Under Developed":1.7, "Developing":1.4, "Developed":1.0, "High Developed":0.7 };
const METHOD_FACTOR = { "Renewables":1.2, "Energy efficiency":1.0, "Community-based":1.3,
  "Re/afforestation":1.4, "REDD+":1.1, "IFM":1.1, "HIR":1.0, "Landfill gas capture":0.9,
  "Savanna burning":1.2, "Avoided deforestation":1.1 };
const JOBS_MAX = 1547;          // dataset max, used to normalise jobs (CI)
const SI_SCALE = Math.log1p(12); // maps Social-Impact → 0..100

const SDG = [
 [1,"No poverty","#E5243B"],[2,"Zero hunger","#DDA63A"],[3,"Good health","#4C9F38"],
 [4,"Quality education","#C5192D"],[5,"Gender equality","#FF3A21"],[6,"Clean water","#26BDE2"],
 [7,"Affordable energy","#FCC30B"],[8,"Decent work","#A21942"],[9,"Industry & innovation","#FD6925"],
 [10,"Reduced inequalities","#DD1367"],[11,"Sustainable cities","#FD9D24"],[12,"Responsible consumption","#BF8B2E"],
 [13,"Climate action","#3F7E44"],[14,"Life below water","#0A97D9"],[15,"Life on land","#56C02B"],
 [16,"Peace & justice","#00689D"],[17,"Partnerships","#19486A"]
];
const SDG_NAME = Object.fromEntries(SDG.map(s=>[s[0],s[1]]));

// keyword → SDG suggestion for the description box
const KW = {
 1:["poverty","income","livelihood","poor"],2:["hunger","food","crop","farm","agricultur"],
 3:["health","smoke","disease","clinic","indoor air","sanitation"],4:["school","education","training","literacy"],
 5:["women","girls","gender","female"],6:["water","sanitation","wash"],7:["energy","electricity","solar","cookstove","stove","clean fuel"],
 8:["job","employment","work","wage","manufactur","distribution"],9:["infrastructure","innovation","technology","industry"],
 10:["inequalit","marginal","inclusive"],11:["city","urban","housing","community"],12:["waste","recycl","consumption","efficien"],
 13:["carbon","emission","climate","co2","forest","deforestation","peat"],14:["ocean","marine","fish","coral","sea"],
 15:["forest","biodiversity","land","wildlife","species","reforest","peat"],16:["governance","rights","peace","justice","institution"],
 17:["partnership","stakeholder","collaboration","ngo"]
};

const selected = new Set([7,8,13]); // cookstove default

// ---- SDG chips ----
const chipWrap = document.getElementById("sdgChips");
SDG.forEach(([n,name,col])=>{
  const c=document.createElement("button");
  c.className="chip text-xs rounded-full px-2.5 py-1 border";
  c.textContent=`${n}`; c.title=name; c.dataset.n=n;
  chipWrap.appendChild(c);
  c.onclick=()=>{ selected.has(n)?selected.delete(n):selected.add(n); paintChips(); recompute(); };
});
function paintChips(){
  [...chipWrap.children].forEach(c=>{
    const n=+c.dataset.n, col=SDG[n-1][2], on=selected.has(n);
    c.classList.toggle("on",on);
    c.style.background = on?col:"rgba(255,255,255,.05)";
    c.style.borderColor = on?col:"rgba(255,255,255,.12)";
    c.style.color = on?"#fff":"#9fb8ad";
  });
}

// ---- scoring (the research's actual formula) ----
function compute(){
  const scale=sclEl.value, country=devEl.value, method=methodEl.value, er=+erEl.value;
  // derived job count
  const base=JOB_BASE[scale], cf=COUNTRY_FACTOR[country], mf=METHOD_FACTOR[method];
  const jobs=Math.round(base*cf*mf);
  // formula terms
  const SDGA=selected.size;                                   // SDG Alignment Score
  const CI=jobs/JOBS_MAX;                                     // jobs intensity (normalised)
  const ME=SDGA>1?1.5:(SDGA===1?1:0);                         // multiplier effect
  const erTerm=1-1/Math.max(er,1.0001);                       // emission-scale factor (→1 when large)
  const impact=Math.max(0, erTerm*SDGA*CI*ME);
  const score=Math.min(100,Math.round(100*Math.log1p(impact)/SI_SCALE));
  return {impact,score,jobs,base,cf,mf,SDGA,CI,ME,erTerm,scale,country,method,er,
    terms:{ "SDG alignment":SDGA, "Jobs intensity":CI, "Multiplier (breadth)":ME, "Emission scale":erTerm }};
}

// ---- charts ----
const dark={textStyle:{color:"#cfe7dd",fontFamily:"Inter"}};
const gauge=echarts.init(document.getElementById("gauge"));
const radar=echarts.init(document.getElementById("radar"));
const wheel=echarts.init(document.getElementById("wheel"));
const whyB=echarts.init(document.getElementById("why-bars"));
const base=echarts.init(document.getElementById("baseline"));
const fut=echarts.init(document.getElementById("future"));

const DIMS={ "Economic":[1,2,8,9,10], "Health & education":[3,4,6],
  "Equality":[5,10,16], "Energy & climate":[7,12,13], "Environment":[6,14,15], "Partnerships":[9,11,17] };

function render(){
  const r=compute();

  // gauge
  const col=r.score>=66?"#34d399":r.score>=40?"#fbbf24":"#fb7185";
  gauge.setOption({series:[{type:"gauge",startAngle:210,endAngle:-30,min:0,max:100,radius:"100%",
    progress:{show:true,width:12,itemStyle:{color:col}},axisLine:{lineStyle:{width:12,color:[[1,"rgba(255,255,255,.08)"]]}},
    axisTick:{show:false},splitLine:{show:false},axisLabel:{show:false},pointer:{show:false},
    anchor:{show:false},detail:{valueAnimation:true,fontSize:38,fontFamily:"Sora",fontWeight:700,color:"#e9f3ee",offsetCenter:[0,0],formatter:"{value}"},
    data:[{value:r.score}]}]});
  const vEl=document.getElementById("verdict");
  vEl.textContent = r.score>=66?"High social impact":r.score>=40?"Moderate impact":"Limited impact";
  vEl.style.color=col;

  // radar
  const dimVals=Object.entries(DIMS).map(([d,gs])=>{
    const hit=gs.filter(g=>selected.has(g)).length;
    return Math.round(100*hit/gs.length);
  });
  radar.setOption({...dark,radar:{indicator:Object.keys(DIMS).map(d=>({name:d,max:100})),
    radius:"66%",axisName:{color:"#9fb8ad",fontSize:10},splitLine:{lineStyle:{color:"rgba(255,255,255,.08)"}},
    splitArea:{show:false},axisLine:{lineStyle:{color:"rgba(255,255,255,.08)"}}},
    series:[{type:"radar",data:[{value:dimVals,areaStyle:{color:"rgba(52,211,153,.25)"},
      lineStyle:{color:"#34d399"},itemStyle:{color:"#34d399"}}]}]});

  // SDG wheel
  wheel.setOption({series:[{type:"pie",radius:["38%","75%"],center:["50%","50%"],
    label:{show:false},data:SDG.map(([n,name,c])=>({value:1,name:n+" "+name,
      itemStyle:{color:selected.has(n)?c:"rgba(255,255,255,.07)",borderColor:"#07120e",borderWidth:2}}))
    ,emphasis:{scale:true}}],
    tooltip:{trigger:"item",formatter:p=>p.name}});

  // why bars — the score is a product, so each factor's log-contribution shows
  // how much it multiplies the result up (green) or drags it down (red)
  const L=x=>Math.log(Math.max(x,1e-6));
  let items=[
    ["SDG alignment ("+r.SDGA+" goals)", L(Math.max(r.SDGA,1e-6))],
    ["Jobs intensity ("+(r.CI*100).toFixed(0)+"% of max)", L(r.CI)],
    ["Breadth multiplier (×"+r.ME+")", L(Math.max(r.ME,1e-6))],
    ["Emission scale", L(r.erTerm)]
  ].sort((a,b)=>a[1]-b[1]);
  whyB.setOption({...dark,grid:{left:4,right:14,top:6,bottom:6,containLabel:true},
    xAxis:{type:"value",axisLabel:{show:false},splitLine:{show:false},axisLine:{show:false}},
    yAxis:{type:"category",data:items.map(i=>i[0]),axisLabel:{color:"#9fb8ad",fontSize:9.5},axisLine:{show:false},axisTick:{show:false}},
    series:[{type:"bar",data:items.map(i=>({value:+i[1].toFixed(2),itemStyle:{color:i[1]>=0?"#34d399":"#fb7185",borderRadius:3}})),barWidth:"58%"}]});

  // baseline vs typical
  base.setOption({...dark,grid:{left:4,right:14,top:10,bottom:18,containLabel:true},
    xAxis:{type:"category",data:["This project","Typical"],axisLabel:{color:"#9fb8ad",fontSize:10},axisLine:{lineStyle:{color:"rgba(255,255,255,.12)"}}},
    yAxis:{type:"value",axisLabel:{show:false},splitLine:{lineStyle:{color:"rgba(255,255,255,.06)"}}},
    series:[{type:"bar",barWidth:"45%",data:[{value:+r.impact.toFixed(2),itemStyle:{color:"#34d399",borderRadius:[4,4,0,0]}},
      {value:1.10,itemStyle:{color:"rgba(255,255,255,.18)",borderRadius:[4,4,0,0]}}]}]});

  // confidence
  const nS=selected.size, inRange=(r.er<=2_000_000 && r.jobs<=3000);
  let conf=Math.min(92, 52 + nS*4 + (inRange?8:0));
  const cEl=document.getElementById("conf"), cB=document.getElementById("confBar");
  cEl.textContent=(conf>=75?"High":conf>=60?"Medium":"Low")+" · "+conf+"%"; cB.style.width=conf+"%";

  // future projection (illustrative compounding benefit)
  const yrs=[0,1,2,3,4,5], cur=yrs.map(y=>+(r.impact*(1+0.12*y)).toFixed(2));
  fut.setOption({...dark,grid:{left:4,right:12,top:10,bottom:18,containLabel:true},
    xAxis:{type:"category",data:yrs.map(y=>"Yr "+y),axisLabel:{color:"#9fb8ad",fontSize:9},axisLine:{lineStyle:{color:"rgba(255,255,255,.12)"}}},
    yAxis:{type:"value",axisLabel:{show:false},splitLine:{lineStyle:{color:"rgba(255,255,255,.06)"}}},
    series:[{type:"line",smooth:true,data:cur,symbol:"circle",symbolSize:6,lineStyle:{color:"#2dd4bf",width:3},
      itemStyle:{color:"#2dd4bf"},areaStyle:{color:"rgba(45,212,191,.18)"}}]});

  // AI explanation
  explain(r);
}

function explain(r){
  const band=r.score>=66?"a high":r.score>=40?"a moderate":"a limited";
  const sdgList=[...selected].sort((a,b)=>a-b).map(n=>SDG_NAME[n]);
  let txt=`This project scores <b>${r.score}/100</b> — ${band} social-impact profile. `;
  txt+= `Because it's a <b>${r.scale.replace(' Scale','').toLowerCase()}-scale</b>, ${r.method.toLowerCase()} project in a `
     +  `<b>${r.country.toLowerCase()}</b> country, the model estimates <b>~${r.jobs.toLocaleString()} jobs</b> created `
     +  `(${r.base} base × ${r.cf} country × ${r.mf} methodology) — jobs aren't entered, they're derived, just as in the research. `;
  if(r.SDGA===0) txt+=`No SDGs are claimed yet, so the multiplier collapses the score to zero — claiming the goals the project genuinely supports is what lifts it. `;
  else txt+=`It claims <b>${r.SDGA} SDG${r.SDGA>1?"s":""}</b> (${sdgList.slice(0,5).join(", ")}${sdgList.length>5?"…":""})`
     +  (r.SDGA>1?`, which triggers the ×1.5 breadth multiplier for projects spanning multiple goals. `:` — a single goal, so no breadth multiplier yet. `);
  txt+= `The score multiplies four factors — SDG alignment, jobs intensity, breadth multiplier and emission scale — so its biggest lever here is `
     +  (r.CI<0.25?`<b>jobs intensity</b> (only ${(r.CI*100).toFixed(0)}% of the dataset maximum): a larger scale or more labour-intensive methodology would raise it most. `
                  :`its <b>${r.SDGA} claimed goals combined with ~${r.jobs.toLocaleString()} jobs</b>. `);
  txt+= `<span class="text-mist">This is the actual research formula, computed live — every factor is shown above, nothing is hidden in a black box.</span>`;
  document.getElementById("aiExplain").innerHTML=txt;
}

// suggest SDGs from description
function suggestFromDesc(){
  const t=descEl.value.toLowerCase();
  for(const [n,kws] of Object.entries(KW)){ if(kws.some(k=>t.includes(k))) selected.add(+n); }
  paintChips(); recompute();
}

// ---- inputs ----
const devEl=document.getElementById("dev"), sclEl=document.getElementById("scl"),
      methodEl=document.getElementById("methodSel"), erEl=document.getElementById("er"),
      descEl=document.getElementById("desc");
const erVal=document.getElementById("erVal"), jobVal=document.getElementById("jobVal"),
      jobCalc=document.getElementById("jobCalc");
function recompute(){
  erVal.textContent=(+erEl.value).toLocaleString()+" tCO₂e";
  const base=JOB_BASE[sclEl.value], cf=COUNTRY_FACTOR[devEl.value], mf=METHOD_FACTOR[methodEl.value];
  jobVal.textContent=Math.round(base*cf*mf).toLocaleString();
  jobCalc.textContent=`${base} base × ${cf} (${devEl.options[devEl.selectedIndex].text}) × ${mf} (${methodEl.value})`;
  render();
}
[devEl,sclEl,methodEl,erEl].forEach(el=>el.addEventListener("input",recompute));
descEl.addEventListener("change",suggestFromDesc);

// ---- static content ----
const benefits=[
 ["💪","Jobs & livelihoods","Local manufacturing, distribution and maintenance work — often the biggest human dividend.","#A21942","SDG 8"],
 ["🩺","Health","Clean cookstoves and water cut indoor smoke and disease.","#4C9F38","SDG 3"],
 ["📚","Education","Time and money freed up keeps children — especially girls — in school.","#C5192D","SDG 4"],
 ["⚡","Clean energy","Solar, biogas and efficient stoves bring affordable, cleaner power.","#FCC30B","SDG 7"],
 ["♀","Gender equality","Women spend less time gathering fuel and water, more on work and study.","#FF3A21","SDG 5"],
 ["💧","Clean water","Safe water and sanitation for households and schools.","#26BDE2","SDG 6"],
 ["🌳","Biodiversity","Protected forests and peatlands safeguard species and habitats.","#56C02B","SDG 15"],
 ["🤝","Partnerships","Community institutions and NGOs that outlast the project.","#19486A","SDG 17"]
];
const bg=document.getElementById("benefitGrid");
benefits.forEach(([ic,t,d,c,s])=>{ const el=document.createElement("div");
  el.className="glass p-5 reveal";
  el.innerHTML=`<div class="text-2xl">${ic}</div><div class="display font-semibold mt-2">${t}</div>
    <p class="text-mist text-sm mt-1.5">${d}</p>
    <div class="text-xs font-semibold mt-3 inline-block px-2 py-0.5 rounded-full" style="background:${c}33;color:#cfe7dd">${s}</div>`;
  bg.appendChild(el); });

const stake=[
 ["For investors","Two projects, same carbon, very different community risk and reputation. A social-impact score lets capital flow to durable, high-integrity projects — and price premium credits with evidence, not anecdote."],
 ["For governments","Aligns carbon policy with national development goals. Regulators can reward projects that actually advance the SDGs and screen out those that dilute them."],
 ["For carbon markets","Integrity is the market's existential issue. Quantified, auditable social impact is a defence against greenwashing claims and a basis for higher-quality credit classes."],
 ["For project developers","A transparent score shows exactly which levers — jobs, energy access, education — raise impact, turning vague co-benefit claims into a design and funding advantage."]
];
const sg=document.getElementById("stakeGrid");
stake.forEach(([t,d])=>{ const el=document.createElement("div"); el.className="glass p-7 reveal";
  el.innerHTML=`<div class="display text-xl font-semibold grad-text">${t}</div><p class="text-mist text-sm mt-3 leading-relaxed">${d}</p>`;
  sg.appendChild(el); });

const ladder=[
 ["Zero-shot","Asked cold, GPT-4 maps Rimba Raya to SDG 13 (Climate Action) and SDG 15 (Life on Land) from the forest-preservation description — correct, but with little justification."],
 ["One-shot","Given one worked example, the model's output becomes more structured and consistent in how it names and orders the relevant SDGs."],
 ["Few-shot","With several examples, it reliably separates primary SDGs (13, 15) from secondary co-benefits, mirroring expert framing."],
 ["Chain-of-thought","Asked to reason step by step, it explains <i>why</i>: preserving peat-swamp forest → avoided emissions (SDG 13) and protected biodiversity (SDG 15) — an auditable trail."],
 ["Contrastive chain-of-thought","Weighing positives against counter-arguments, it stress-tests each claim — the most rigorous setting, and the one best suited to verifying SDG claims rather than rubber-stamping them."]
];
const lw=document.getElementById("ladder");
ladder.forEach(([t,d],i)=>{ const el=document.createElement("div");
  el.className="glass p-6 reveal"+(i===4?" sm:col-span-2":"");
  el.style.borderColor = i===4?"rgba(52,211,153,.4)":"rgba(255,255,255,.09)";
  el.innerHTML=`<div class="flex items-center gap-2"><span class="text-gold display font-bold">0${i+1}</span>
    <span class="display font-semibold">${t}</span></div><p class="text-mist text-sm mt-2 leading-relaxed">${d}</p>`;
  lw.appendChild(el); });

// ---- reveal on scroll ----
const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){e.target.classList.add("in"); io.unobserve(e.target);} }),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

// resize
addEventListener("resize",()=>[gauge,radar,wheel,whyB,base,fut].forEach(c=>c.resize()));

// init
paintChips(); recompute();
