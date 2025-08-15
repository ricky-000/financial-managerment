// 完整版 app.js
/* ===== 狀態與儲存鍵 ===== */
const KEY_ROWS='fp_rows_v2';
const KEY_OPTS='fp_opts_v2';
let rows=[];
let opts={cats:[], attrs:[]};
let editingKind='cat';           // 'cat' 或 'attr'
let editIndex = null;            // 正在編輯的列索引

/* ===== 讀寫狀態 ===== */
function loadState(){
  rows = JSON.parse(localStorage.getItem(KEY_ROWS)||'[]');
  const o = JSON.parse(localStorage.getItem(KEY_OPTS)||'null');
  if(o && Array.isArray(o.cats) && Array.isArray(o.attrs)){ opts=o; }
  else{ opts={ cats:['必要','發展','彈性','投資'], attrs:['固定','變動','一次性','分期'] }; }
}
function saveState(){
  localStorage.setItem(KEY_ROWS, JSON.stringify(rows));
  localStorage.setItem(KEY_OPTS, JSON.stringify(opts));
}

/* ===== DOM ===== */
const nameEl=document.getElementById('name');
const catEl=document.getElementById('cat');
const attrEl=document.getElementById('attr');
const amtEl=document.getElementById('amt');
const addBtn=document.getElementById('add');
const clearBtn=document.getElementById('clear');
const tbody=document.getElementById('tbody');
const totalEl=document.getElementById('total');
const saveBtn=document.getElementById('save');
const loadBtn=document.getElementById('load');
const pieCanvas=document.getElementById('pie');

const catSetting=document.getElementById('catSetting');
const attrSetting=document.getElementById('attrSetting');
const drawer=document.getElementById('drawer');
const drawerTitle=document.getElementById('drawerTitle');
const closeDrawer=document.getElementById('closeDrawer');
const optList=document.getElementById('optList');
const newOpt=document.getElementById('newOpt');
const addOpt=document.getElementById('addOpt');

/* ===== 下拉渲染 ===== */
function fillSelect(select, arr){
  select.innerHTML='';
  arr.forEach(v=>{
    const o=document.createElement('option'); o.value=v; o.textContent=v;
    select.appendChild(o);
  });
}
function renderSelects(){ fillSelect(catEl, opts.cats); fillSelect(attrEl, opts.attrs); }

/* ===== 圓餅圖：主題與配色（高對比） ===== */
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => mqDark.matches;

const lightColors = ['#1A1A1A','#4B5563','#9CA3AF','#D1D5DB','#C08457','#6B8E23','#3B82F6','#D97706'];
const darkColors  = ['#F9FAFB','#D1D5DB','#9CA3AF','#4B5563','#C08457','#A3B18A','#60A5FA','#FBBF24'];

const legendColor = () => isDark() ? '#E5E7EB' : '#111827';
const borderColor = () => isDark() ? '#0B0B0B' : '#FFFFFF';
const bgColors    = () => isDark() ? darkColors : lightColors;

const pieChart=new Chart(pieCanvas,{
  type:'pie',
  data:{ labels:[], datasets:[{
    data:[],
    backgroundColor:bgColors(),
    borderColor:borderColor(),
    borderWidth:2
  }]},
  options:{
    responsive:true,
    plugins:{ legend:{ labels:{ color:legendColor(), font:{ size:14, weight:'bold' }, boxWidth:20 } } }
  }
});

mqDark.addEventListener('change', ()=>{
  pieChart.data.datasets[0].backgroundColor = bgColors();
  pieChart.data.datasets[0].borderColor = borderColor();
  pieChart.options.plugins.legend.labels.color = legendColor();
  pieChart.update();
});

/* ===== 表格、總計、圖表 ===== */
function renderTable() {
  tbody.innerHTML = '';
  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (editIndex === i) {
      // 編輯模式
      const nameTd = document.createElement('td');
      const nameInput = document.createElement('input');
      nameInput.type = 'text'; nameInput.value = r.name; nameInput.style.width="120px";
      nameTd.appendChild(nameInput);

      const catTd = document.createElement('td');
      const catSelect = document.createElement('select');
      opts.cats.forEach(cat=>{
        const o=document.createElement('option'); o.value=cat; o.textContent=cat;
        if(cat===r.cat) o.selected=true; catSelect.appendChild(o);
      });
      catTd.appendChild(catSelect);

      const attrTd = document.createElement('td');
      const attrSelect = document.createElement('select');
      opts.attrs.forEach(attr=>{
        const o=document.createElement('option'); o.value=attr; o.textContent=attr;
        if(attr===r.attr) o.selected=true; attrSelect.appendChild(o);
      });
      attrTd.appendChild(attrSelect);

      const amtTd = document.createElement('td');
      const amtInput = document.createElement('input');
      amtInput.type='number'; amtInput.min=0; amtInput.step='1'; amtInput.value=r.amt; amtInput.style.width="110px";
      amtTd.appendChild(amtInput);

      const actionTd = document.createElement('td');
      const saveB = document.createElement('button'); saveB.textContent='儲存';
      const cancelB = document.createElement('button'); cancelB.textContent='取消';
      actionTd.appendChild(saveB); actionTd.appendChild(cancelB);

      saveB.addEventListener('click', ()=>{
        const name=nameInput.value.trim(); const cat=catSelect.value; const attr=attrSelect.value; const amt=Number(amtInput.value);
        if(!name||!cat||!attr||!Number.isFinite(amt)||amt<0){ alert('請輸入正確資料'); return; }
        rows[i]={name,cat,attr,amt}; editIndex=null; saveState(); updateUI();
      });
      cancelB.addEventListener('click', ()=>{ editIndex=null; updateUI(); });

      tr.append(nameTd,catTd,attrTd,amtTd,actionTd);
    } else {
      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${r.cat}</td>
        <td>${r.attr}</td>
        <td>$${r.amt.toLocaleString()}</td>
        <td>
          <button class="edit" data-i="${i}">編輯</button>
          <button class="del" data-i="${i}">刪除</button>
        </td>`;
    }
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.edit').forEach(b=>{
    b.addEventListener('click',e=>{ editIndex = Number(e.target.getAttribute('data-i')); renderTable(); });
  });
  tbody.querySelectorAll('.del').forEach(b=>{
    b.addEventListener('click',e=>{
      const i=Number(e.target.getAttribute('data-i'));
      rows.splice(i,1);
      if(editIndex===i) editIndex=null; else if(editIndex!==null && i<editIndex) editIndex--;
      saveState(); updateUI();
    });
  });
}
function renderTotal(){
  const t=rows.reduce((s,r)=>s+r.amt,0);
  totalEl.textContent=`總計：$${t.toLocaleString()}`;
}
function renderPie(){
  // 依「屬性」分組
  const byAttr={};
  rows.forEach(r=> byAttr[r.attr]=(byAttr[r.attr]||0)+r.amt);
  const labels=Object.keys(byAttr);
  const data=labels.map(k=>byAttr[k]);
  pieChart.data.labels=labels;
  pieChart.data.datasets[0].data=data;
  pieChart.update();
}
function updateUI(){ renderTable(); renderTotal(); renderPie(); }

/* ===== 事件：新增/清空/存取 ===== */
addBtn.addEventListener('click',()=>{
  const name=nameEl.value.trim();
  const cat=catEl.value||'';
  const attr=attrEl.value||'';
  const amt=Number(amtEl.value);
  if(!name||!cat||!attr||!Number.isFinite(amt)||amt<0) return;
  rows.push({name,cat,attr,amt});
  nameEl.value=''; amtEl.value='';
  editIndex=null;
  saveState(); updateUI();
});
clearBtn.addEventListener('click',()=>{
  if(!confirm('確定清空清單？')) return;
  rows=[]; editIndex=null; saveState(); updateUI();
});
saveBtn.addEventListener('click',()=>{ saveState(); alert('已儲存到本機'); });
loadBtn.addEventListener('click',()=>{ loadState(); renderSelects(); updateUI(); });

/* ===== 側欄：分類/屬性設定 ===== */
function openDrawer(kind){
  editingKind=kind;
  drawerTitle.textContent= kind==='cat'?'管理「用途分類」':'管理「屬性」';
  renderDrawerList();
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
}
function closeDrawerFn(){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); newOpt.value=''; }
catSetting.addEventListener('click',()=>openDrawer('cat'));
attrSetting.addEventListener('click',()=>openDrawer('attr'));
closeDrawer.addEventListener('click',closeDrawerFn);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrawerFn(); });

function renderDrawerList(){
  const arr = editingKind==='cat'?opts.cats:opts.attrs;
  optList.innerHTML='';
  arr.forEach((v,idx)=>{
    const row=document.createElement('div'); row.className='item';
    const span=document.createElement('span'); span.textContent=v;
    const del=document.createElement('button'); del.textContent='刪除';
    del.addEventListener('click',()=>{
      const list= editingKind==='cat'?opts.cats:opts.attrs;
      list.splice(idx,1); saveState(); renderDrawerList(); renderSelects();
    });
    row.append(span,del); optList.appendChild(row);
  });
}
addOpt.addEventListener('click',()=>{
  const val=newOpt.value.trim(); if(!val) return;
  const list = editingKind==='cat'?opts.cats:opts.attrs;
  if(!list.includes(val)) list.push(val);
  newOpt.value=''; saveState(); renderDrawerList(); renderSelects();
});

/* ===== 啟動 ===== */
loadState();
renderSelects();
updateUI();