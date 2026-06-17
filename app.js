/* Quantifying Social Impact — client-side engine.
   Implements the actual social-impact framework from the thesis (Development
   Contribution × SDG Alignment × Community Impact × Multiplier Effect), which
   reproduces the study's dataset exactly. Community Impact is proxied by
   employment, which the model estimates from the project's profile — it is not
   entered by the user, exactly as in the research. */

const JOB_BASE={"Micro Scale":5,"Small Scale":30,"Medium Scale":125,"Large Scale":850};
const COUNTRY_FACTOR={"Under Developed":1.7,"Developing":1.4,"Developed":1.0,"High Developed":0.7};
const METHOD_FACTOR={"Renewables":1.2,"Energy efficiency":1.0,"Community-based":1.3,"Re/afforestation":1.4,
  "REDD+":1.1,"IFM":1.1,"HIR":1.0,"Landfill gas capture":0.9,"Savanna burning":1.2,"Avoided deforestation":1.1};
const JOBS_MAX=1547, SI_SCALE=Math.log1p(12);

const PINE="#0e7c66", CLAY="#b65c3a", INK="#16211c", MUTED="#5f6b63", GRID="rgba(22,33,28,.10)";

const SDG=[[1,"No poverty","#E5243B"],[2,"Zero hunger","#DDA63A"],[3,"Good health","#4C9F38"],
 [4,"Quality education","#C5192D"],[5,"Gender equality","#FF3A21"],[6,"Clean water","#26BDE2"],
 [7,"Affordable energy","#FCC30B"],[8,"Decent work","#A21942"],[9,"Industry & innovation","#FD6925"],
 [10,"Reduced inequalities","#DD1367"],[11,"Sustainable cities","#FD9D24"],[12,"Responsible consumption","#BF8B2E"],
 [13,"Climate action","#3F7E44"],[14,"Life below water","#0A97D9"],[15,"Life on land","#56C02B"],
 [16,"Peace & justice","#00689D"],[17,"Partnerships","#19486A"]];
const SDG_NAME=Object.fromEntries(SDG.map(s=>[s[0],s[1]]));
const KW={1:["poverty","income","livelihood","poor"],2:["hunger","food","crop","farm","agricultur"],
 3:["health","smoke","disease","clinic","indoor air"],4:["school","education","training","literacy"],
 5:["women","girls","gender","female"],6:["water","sanitation","wash"],7:["energy","electricity","solar","cookstove","stove","clean fuel"],
 8:["job","employment","work","wage","manufactur","distribution"],9:["infrastructure","innovation","technology"],
 10:["inequalit","marginal","inclusive"],11:["city","urban","housing","community"],12:["waste","recycl","efficien"],
 13:["carbon","emission","climate","forest","deforestation","peat"],14:["ocean","marine","fish","coral"],
 15:["forest","biodiversity","land","wildlife","species","reforest","peat"],16:["governance","rights","justice"],
 17:["partnership","stakeholder","collaboration","ngo"]};

const selected=new Set([7,8,13]);

// chips
const chipWrap=document.getElementById("sdgChips");
SDG.forEach(([n,name])=>{const c=document.createElement("button");
  c.className="chip text-xs rounded-full px-2.5 py-1";c.textContent=n;c.title=name;c.dataset.n=n;
  chipWrap.appendChild(c);c.onclick=()=>{selected.has(n)?selected.delete(n):selected.add(n);paintChips();render();};});
function paintChips(){[...chipWrap.children].forEach(c=>{const n=+c.dataset.n,col=SDG[n-1][2],on=selected.has(n);
  c.classList.toggle("on",on);c.style.background=on?col:"#fffdf8";c.style.color=on?"#fff":MUTED;c.style.borderColor=on?col:"#d8d2c2";});}

// scoring — the thesis formula
function compute(){
  const scale=sclEl.value,country=devEl.value,method=methodEl.value,er=+erEl.value;
  const jobs=Math.round(JOB_BASE[scale]*COUNTRY_FACTOR[country]*METHOD_FACTOR[method]);
  const SDGA=selected.size, CI=jobs/JOBS_MAX, ME=SDGA>1?1.5:(SDGA===1?1:0), DCR=1-1/Math.max(er,1.0001);
  const impact=Math.max(0,DCR*SDGA*CI*ME);
  const score=Math.min(100,Math.round(100*Math.log1p(impact)/SI_SCALE));
  return {impact,score,jobs,SDGA,CI,ME,DCR,scale,country,method,er};
}

// charts
const gauge=echarts.init(document.getElementById("gauge"));
const radar=echarts.init(document.getElementById("radar"));
const wheel=echarts.init(document.getElementById("wheel"));
const whyB=echarts.init(document.getElementById("why-bars"));
const base=echarts.init(document.getElementById("baseline"));
const fut=echarts.init(document.getElementById("future"));
const L={textStyle:{color:INK,fontFamily:"Inter"}};
const DIMS={"Economic":[1,2,8,9,10],"Health & education":[3,4,6],"Equality":[5,10,16],
  "Energy & climate":[7,12,13],"Environment":[6,14,15],"Partnerships":[9,11,17]};

function render(){
  const r=compute();
  const col=r.score>=66?PINE:r.score>=40?CLAY:"#9a3b2f";
  gauge.setOption({series:[{type:"gauge",startAngle:210,endAngle:-30,min:0,max:100,radius:"100%",
    progress:{show:true,width:11,itemStyle:{color:col}},axisLine:{lineStyle:{width:11,color:[[1,"#e6e1d3"]]}},
    axisTick:{show:false},splitLine:{show:false},axisLabel:{show:false},pointer:{show:false},
    detail:{valueAnimation:true,fontSize:38,fontFamily:"Newsreader",fontWeight:600,color:INK,offsetCenter:[0,0]},
    data:[{value:r.score}]}]});
  const v=document.getElementById("verdict");
  v.textContent=r.score>=66?"High impact":r.score>=40?"Moderate impact":"Limited impact";v.style.color=col;

  const dimVals=Object.entries(DIMS).map(([d,gs])=>Math.round(100*gs.filter(g=>selected.has(g)).length/gs.length));
  radar.setOption({...L,radar:{indicator:Object.keys(DIMS).map(d=>({name:d,max:100})),radius:"64%",
    axisName:{color:MUTED,fontSize:10},splitLine:{lineStyle:{color:GRID}},splitArea:{show:false},axisLine:{lineStyle:{color:GRID}}},
    series:[{type:"radar",data:[{value:dimVals,areaStyle:{color:"rgba(14,124,102,.18)"},lineStyle:{color:PINE},itemStyle:{color:PINE}}]}]});

  wheel.setOption({tooltip:{trigger:"item",formatter:p=>p.name},series:[{type:"pie",radius:["40%","74%"],center:["50%","50%"],
    label:{show:false},data:SDG.map(([n,name,c])=>({value:1,name:n+" "+name,
      itemStyle:{color:selected.has(n)?c:"#ece7da",borderColor:"#fffdf8",borderWidth:2}}))}]});

  // what shapes the score — the four framework components (log contribution)
  const lg=x=>Math.log(Math.max(x,1e-6));
  let items=[["Community impact (employment)",lg(r.CI)],["SDG alignment",lg(Math.max(r.SDGA,1e-6))],
    ["Multiplier effect",lg(Math.max(r.ME,1e-6))],["Development contribution",lg(r.DCR)]].sort((a,b)=>a[1]-b[1]);
  whyB.setOption({...L,grid:{left:4,right:14,top:6,bottom:6,containLabel:true},
    xAxis:{type:"value",axisLabel:{show:false},splitLine:{show:false},axisLine:{show:false}},
    yAxis:{type:"category",data:items.map(i=>i[0]),axisLabel:{color:MUTED,fontSize:10},axisLine:{show:false},axisTick:{show:false}},
    series:[{type:"bar",barWidth:"56%",data:items.map(i=>({value:+i[1].toFixed(2),itemStyle:{color:i[1]>=0?PINE:CLAY,borderRadius:3}}))}]});

  base.setOption({...L,grid:{left:4,right:14,top:10,bottom:18,containLabel:true},
    xAxis:{type:"category",data:["This project","Typical"],axisLabel:{color:MUTED,fontSize:10},axisLine:{lineStyle:{color:GRID}}},
    yAxis:{type:"value",axisLabel:{show:false},splitLine:{lineStyle:{color:GRID}}},
    series:[{type:"bar",barWidth:"45%",data:[{value:+r.impact.toFixed(2),itemStyle:{color:PINE,borderRadius:[4,4,0,0]}},
      {value:1.10,itemStyle:{color:"#d8d2c2",borderRadius:[4,4,0,0]}}]}]});

  let conf=Math.min(92,52+selected.size*4+(r.er<=2e6?8:0));
  document.getElementById("conf").textContent=(conf>=75?"High":conf>=60?"Medium":"Low")+" · "+conf+"%";
  document.getElementById("confBar").style.width=conf+"%";

  const yrs=[0,1,2,3,4,5];
  fut.setOption({...L,grid:{left:4,right:12,top:10,bottom:18,containLabel:true},
    xAxis:{type:"category",data:yrs.map(y=>"Yr "+y),axisLabel:{color:MUTED,fontSize:9},axisLine:{lineStyle:{color:GRID}}},
    yAxis:{type:"value",axisLabel:{show:false},splitLine:{lineStyle:{color:GRID}}},
    series:[{type:"line",smooth:true,symbol:"circle",symbolSize:6,data:yrs.map(y=>+(r.impact*(1+0.12*y)).toFixed(2)),
      lineStyle:{color:PINE,width:2.5},itemStyle:{color:PINE},areaStyle:{color:"rgba(14,124,102,.12)"}}]});

  explain(r);
}

function explain(r){
  const band=r.score>=66?"a high":r.score>=40?"a moderate":"a limited";
  const sdgList=[...selected].sort((a,b)=>a-b).map(n=>SDG_NAME[n]);
  let t=`This ${r.scale.replace(" Scale","").toLowerCase()}-scale, ${r.method.toLowerCase()} project in a ${r.country.toLowerCase()} country scores <b>${r.score}/100</b> — ${band} social-impact profile. `;
  t+=`Its <b>community impact</b> rests on an estimated <b>${r.jobs.toLocaleString()} jobs</b> of employment created — modelled from the project's profile rather than entered. `;
  if(r.SDGA===0) t+=`No SDGs are claimed, so the multiplier collapses the score to zero; recording the goals the project genuinely advances is what lifts it. `;
  else t+=`It advances <b>${r.SDGA} of the 17 SDGs</b> (${sdgList.slice(0,5).join(", ")}${sdgList.length>5?"…":""})`+(r.SDGA>1?`, broad enough to trigger the multiplier effect for projects that reach several goals at once. `:`, a single goal, so no multiplier yet. `);
  t+= r.CI<0.25 ? `Community impact is the clearest lever here — a larger scale or more labour-intensive methodology would raise the score most.`
                : `Strong employment paired with broad SDG alignment is what carries this project's score.`;
  document.getElementById("aiExplain").innerHTML=t;
}

function suggestFromDesc(){const t=descEl.value.toLowerCase();
  for(const[n,kws]of Object.entries(KW)){if(kws.some(k=>t.includes(k)))selected.add(+n);}paintChips();render();}

// inputs
const devEl=document.getElementById("dev"),sclEl=document.getElementById("scl"),methodEl=document.getElementById("methodSel"),
      erEl=document.getElementById("er"),descEl=document.getElementById("desc"),
      erVal=document.getElementById("erVal"),jobVal=document.getElementById("jobVal");
function recompute(){erVal.textContent=(+erEl.value).toLocaleString()+" tCO₂e";
  jobVal.textContent=Math.round(JOB_BASE[sclEl.value]*COUNTRY_FACTOR[devEl.value]*METHOD_FACTOR[methodEl.value]).toLocaleString();render();}
[devEl,sclEl,methodEl,erEl].forEach(e=>e.addEventListener("input",recompute));
descEl.addEventListener("change",suggestFromDesc);

// Gen-AI auditor ladder (real research outputs, summarised)
const ladder=[
 ["Zero-shot","Asked cold, the model maps Rimba Raya to SDG 13 (Climate Action) and SDG 15 (Life on Land) from the forest-preservation description — correct, but lightly justified."],
 ["One-shot","Given a single worked example, its output becomes more structured and consistent in naming and ordering the relevant SDGs."],
 ["Few-shot","With several examples it reliably separates primary SDGs (13, 15) from secondary co-benefits, mirroring expert framing."],
 ["Chain-of-thought","Prompted to reason step by step, it explains why: preserving peat-swamp forest avoids emissions (SDG 13) and protects biodiversity (SDG 15) — an auditable trail."],
 ["Contrastive chain-of-thought","Weighing each claim against counter-arguments, it stress-tests rather than rubber-stamps — the setting best suited to verifying SDG claims."]
];
const lw=document.getElementById("ladder");
ladder.forEach(([t,d],i)=>{const el=document.createElement("div");el.className="bg-paper p-6 reveal";
  el.innerHTML=`<div class="flex items-baseline gap-3"><span class="secnum">0${i+1}</span><span class="serif text-lg">${t}</span></div>
    <p class="text-muted text-[15px] mt-1.5 leading-relaxed">${d}</p>`;lw.appendChild(el);});

const stake=[
 ["Investors","Two projects with identical carbon can carry very different community value and reputational risk. A social-impact score lets capital back durable, high-integrity projects — and price premium credits on evidence, not anecdote."],
 ["Governments & policymakers","It aligns carbon policy with national development goals, letting regulators reward projects that genuinely advance the SDGs and screen out those that merely dilute them."],
 ["Carbon markets","Integrity is the market's existential question. Quantified, verifiable social impact is a defence against greenwashing and a basis for higher-quality credit classes."],
 ["Project developers","A transparent score shows which levers — employment, energy access, education — raise impact, turning vague co-benefit claims into a design and funding advantage."]
];
const sg=document.getElementById("stakeGrid");
stake.forEach(([t,d])=>{const el=document.createElement("div");el.className="bg-paper p-7 reveal";
  el.innerHTML=`<p class="serif text-xl" style="color:#0e7c66">${t}</p><p class="text-muted text-[15px] mt-2 leading-relaxed">${d}</p>`;sg.appendChild(el);});

// reveal + resize
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
addEventListener("resize",()=>[gauge,radar,wheel,whyB,base,fut].forEach(c=>c.resize()));

paintChips();recompute();
