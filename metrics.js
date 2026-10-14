const DATASETS=['HOT3D','EgoX-Bench','HOI4D','H2O'];
const metric=(name,direction,note,methods,values,digits=2)=>({name,direction,note,methods,values,digits});
const groups={
 hand:{label:'Hand',metrics:[
  metric('PA-MPJPE (mm)','↓','Per-frame Procrustes-aligned hand error.',['EgoX (Ours)','HandFlow','WiLoR + SLAM'],{'HOT3D':[3.70,5.54,5.90],'EgoX-Bench':[4.64,11.14,8.51],'HOI4D':[3.32,19.91,19.41],'H2O':[4.97,7.07,5.11]}),
  metric('W-MPJPE (mm)','↓','World-space hand error with each method’s estimated camera.',['EgoX (Ours)','HandFlow','WiLoR + SLAM'],{'HOT3D':[38.89,119.48,58.55],'EgoX-Bench':[113.24,375.11,328.81],'HOI4D':[42.67,120.26,132.94],'H2O':[23.95,34.63,74.95]})]},
 object:{label:'Object',metrics:[
  metric('ADD-S (mm)','↓','Symmetry-aware camera-frame object-pose error.',['EgoX (Ours)','FoundationPose','Any6D'],{'HOT3D':[14.03,59.87,44.05],'EgoX-Bench':[12.41,55.04,41.41],'HOI4D':[21.11,73.02,53.26],'H2O':[10.29,30.97,36.57]}),
  metric('AUC-S₅₀ (%)','↑','Area under the ADD-S curve up to 50 mm.',['EgoX (Ours)','FoundationPose','Any6D'],{'HOT3D':[73.71,23.32,42.99],'EgoX-Bench':[76.59,31.99,38.39],'HOI4D':[59.08,13.39,34.61],'H2O':[80.42,46.03,38.37]})]},
 camera:{label:'Camera',metrics:[
  metric('nATE','↓','Normalized camera trajectory error.',['EgoX (Ours)','DA3 Nested','VGGT-Ω'],{'HOT3D':[.0059,.0036,.0018],'EgoX-Bench':[.0295,.0135,.0071],'HOI4D':[.0066,.0307,.0212],'H2O':[.0035,.0026,.0030]},4),
  metric('RRE (°)','↓','Relative camera rotation error in degrees.',['EgoX (Ours)','DA3 Nested','VGGT-Ω'],{'HOT3D':[.88,.23,.16],'EgoX-Bench':[2.21,.92,.61],'HOI4D':[.78,1.54,1.56],'H2O':[.33,.26,.27]})]},
 depth:{label:'Depth',metrics:[
  metric('AbsRel','↓','Absolute relative metric-depth error.',['EgoX (Ours)','DA3 Nested','VGGT-Ω'],{'HOT3D':[.0604,.0799,.1031],'EgoX-Bench':[.0460,.1785,.0806],'HOI4D':[.0312,.0746,.0558],'H2O':[.0700,.0823,.0784]},4),
  metric('δ₁.₂₅ (%)','↑','Percentage of depth predictions within a 1.25× ratio.',['EgoX (Ours)','DA3 Nested','VGGT-Ω'],{'HOT3D':[96.21,94.40,92.20],'EgoX-Bench':[97.37,82.29,91.57],'HOI4D':[99.98,97.34,99.68],'H2O':[99.70,92.64,95.46]})]}
};
const tabs=document.querySelector('.metric-tabs'),charts=document.querySelector('.metric-charts'),summary=document.querySelector('.metric-summary');
function datasetCard(dataset,m){const values=m.values[dataset],max=Math.max(...values)*1.08,card=document.createElement('article');card.className='metric-card';card.innerHTML=`<header><span>${dataset}</span></header>`;const rows=document.createElement('div');rows.className='metric-rows';values.forEach((value,i)=>{const row=document.createElement('div');row.className='metric-row'+(i===0?' ours':'');const width=Math.max(2,value/max*100);row.innerHTML=`<div><span>${m.methods[i]}</span><b>${value.toFixed(m.digits)}</b></div><i><span style="width:${width}%"></span></i>`;rows.append(row);});card.append(rows);return card;}
function render(key){const group=groups[key];tabs.querySelectorAll('button').forEach(b=>{const active=b.dataset.metric===key;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});summary.replaceChildren();charts.replaceChildren();for(const m of group.metrics){const block=document.createElement('section');block.className='metric-block';block.innerHTML=`<header class="metric-block-head"><div><strong>${m.name} ${m.direction}</strong></div></header>`;const datasets=document.createElement('div');datasets.className='metric-datasets';for(const dataset of DATASETS)datasets.append(datasetCard(dataset,m));block.append(datasets);charts.append(block);}}
if(tabs&&charts){for(const [key,group] of Object.entries(groups)){const b=document.createElement('button');b.type='button';b.role='tab';b.dataset.metric=key;b.textContent=group.label;b.onclick=()=>render(key);tabs.append(b);}render('hand');}
