/* =====================================================
 * 玖臻融资咨询匹配平台 - 核心：状态/鉴权/路由/工作台/产品库
 * ===================================================== */

/* ---------- 基础工具 ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function esc(x){ return String(x ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function now(){
  const d = new Date(); const p = x => String(x).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function today(){ return now().slice(0,10); }
function wan(n){ if(n===''||n==null||isNaN(+n)) return '—'; const v=+n; return (v%1 ? v.toFixed(1) : v) + '万'; }
function pct(n){ if(n==null||isNaN(n)) return '—'; return Math.round(n*100)+'%'; }
function uid(prefix){ state.seq[prefix] = (state.seq[prefix]||100) + 1; return prefix + state.seq[prefix]; }
function daysDiff(dateStr){ return Math.ceil((Date.now() - new Date(dateStr.replace(' ','T')).getTime()) / 86400000); }

function save(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function addLog(action, detail){
  state.logs.unshift({ time:now(), user:session?session.name:'-', role:session?ROLES[session.role]:'-', action, detail });
  if(state.logs.length > 500) state.logs.length = 500;
}

function toast(msg, type){
  const el = document.createElement('div');
  el.className = 'toast ' + (type||'');
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='.3s'; setTimeout(()=>el.remove(), 320); }, 2200);
}

/* ---------- 弹窗 ---------- */
function openModal(title, bodyHTML, width){
  $('#modal-root').innerHTML =
    `<div class="modal-mask" onclick="if(event.target===this)closeModal()">
       <div class="modal" style="width:${width||'720px'}">
         <div class="modal-head"><h3>${title}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
         <div class="modal-body">${bodyHTML}</div>
       </div>
     </div>`;
}
function closeModal(){ $('#modal-root').innerHTML=''; }
let _confirmCb = null;
function confirmBox(text, cb, danger){
  _confirmCb = cb;
  openModal('操作确认',
    `<p style="font-size:14px;line-height:1.8;padding:6px 0 4px">${text}</p>
     <div class="modal-foot">
       <button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn ${danger?'btn-danger':'btn-primary'}" onclick="_doConfirm()">确认</button>
     </div>`, '440px');
}
function _doConfirm(){ closeModal(); if(_confirmCb){ const cb=_confirmCb; _confirmCb=null; cb(); } }

/* ---------- 状态与鉴权 ---------- */
let state = null;
let session = null;
let route = 'workbench';

function can(action){
  const r = session ? session.role : '';
  switch(action){
    case 'product.edit':   return r==='admin' || r==='pm';
    case 'customer.all':   return r==='admin' || r==='pm';
    case 'match.review':   return r==='pm' || r==='admin';
    case 'system':         return r==='admin';
    case 'logs.view':      return r==='admin' || r==='pm';
    case 'analytics.export': return r==='admin' || r==='pm';
    case 'assign.owner':   return r==='admin' || r==='pm';
    default: return false;
  }
}

function login(username, pass){
  const u = state.users.find(x => x.username === username && x.password === pass);
  if(!u){ $('#login-err').textContent = '账号或密码错误'; return; }
  if(!u.active){ $('#login-err').textContent = '该账号已被停用，请联系管理员'; return; }
  session = u;
  state.loginLogs.unshift({ time:now(), user:u.name });
  if(state.loginLogs.length > 100) state.loginLogs.length = 100;
  save();
  $('#login-err').textContent = '';
  enterApp();
}

function logout(){
  session = null;
  $('#app').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  $('#login-pass').value = '';
}

function enterApp(){
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#user-chip').innerHTML =
    `<span class="avatar">${esc(session.name.slice(0,1))}</span><b>${esc(session.name)}</b><span class="role-tag ${session.role}">${ROLES[session.role]}</span>`;
  go('workbench');
}

/* ---------- 路由 ---------- */
const NAV = [
  { id:'workbench', label:'工作台',     short:'工作台', icon:'⌂' },
  { id:'products',  label:'信贷产品库', short:'产品',   icon:'▦' },
  { id:'customers', label:'客户档案',   short:'客户',   icon:'◉' },
  { id:'match',     label:'智能匹配',   short:'匹配',   icon:'⚡' },
  { id:'followup',  label:'跟进与流程', short:'跟进',   icon:'☑' },
  { id:'analytics', label:'数据看板',   short:'看板',   icon:'◔' },
  { id:'system',    label:'系统管理',   short:'系统',   icon:'⚙', roles:['admin','pm'] }
];

function go(r){ route = r; renderRoute(); }
function renderRoute(){
  renderNav();
  $('#page-title').textContent = (NAV.find(n=>n.id===route)||{}).label || '';
  const map = { workbench:renderWorkbench, products:renderProducts, customers:renderCustomers, match:renderMatch, followup:renderFollowup, analytics:renderAnalytics, system:renderSystem };
  (map[route]||renderWorkbench)();
}
function renderNav(){
  const items = NAV.filter(n=>!n.roles || n.roles.includes(session.role));
  $('#nav').innerHTML = items
    .map(n => `<div class="nav-item ${route===n.id?'active':''}" onclick="go('${n.id}')"><span class="ico">${n.icon}</span><span class="txt">${n.label}</span></div>`).join('');
  const tb = $('#tabbar');
  if(tb) tb.innerHTML = items
    .map(n => `<div class="tab-item ${route===n.id?'active':''}" onclick="go('${n.id}')"><span class="ico">${n.icon}</span><span>${n.short||n.label}</span></div>`).join('');
}

/* ---------- 数据查询 ---------- */
function visibleCustomers(){
  return state.customers.filter(c => can('customer.all') ? true : c.owner === session.username);
}
function findCustomer(id){ return state.customers.find(c=>c.id===id); }
function findProduct(id){ return state.products.find(p=>p.id===id); }
function custDisplayName(c){ return c.type==='enterprise' ? (c.enterprise.companyName||c.name) : c.name; }
function customerCateOk(p, c){
  if(['个贷','房抵贷','车抵贷'].includes(p.category)) return c.type==='personal';
  return c.type==='enterprise';
}

/* =====================================================
 * 页面：工作台
 * ===================================================== */
function renderWorkbench(){
  const mine = visibleCustomers();
  const myTasks = state.tasks.filter(t => !t.done && (can('customer.all') || t.owner===session.username));
  const doneTasks = state.tasks.filter(t => t.done && (can('customer.all') || t.owner===session.username)).slice(0,5);
  const byStatus = s => mine.filter(c=>c.status===s).length;
  const recentMatches = mine.flatMap(c => c.matches.map(m => ({ c, m }))).sort((a,b)=>b.m.time.localeCompare(a.m.time)).slice(0,6);

  $('#page').innerHTML = `
    <div class="stat-grid">
      ${statCard('◉','#7C3AED', mine.length, can('customer.all')?'客户总数':'我的客户数')}
      ${statCard('⚡','#2563EB', mine.filter(c=>c.matches.length).length, '已匹配客户')}
      ${statCard('▣','#0891B2', byStatus('资料收集中')+byStatus('已进件')+byStatus('银行审批中'), '在途业务')}
      ${statCard('✓','#059669', byStatus('放款'), '累计放款')}
      ${statCard('⏰','#D97706', myTasks.length, '今日待办')}
    </div>

    <div class="card">
      <div class="card-title">快捷操作<span class="sub">高频业务入口</span></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="openCustomerForm()">＋ 新增客户</button>
        <button class="btn btn-ghost" onclick="go('match')">⚡ 发起智能匹配</button>
        <button class="btn btn-ghost" onclick="go('products')">▦ 查看产品库</button>
        <button class="btn btn-ghost" onclick="go('followup')">☑ 跟进与流程</button>
        ${can('product.edit')?'<button class="btn btn-ghost" onclick="openProductForm()">＋ 录入新产品</button>':''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:18px" class="wb-grid">
      <div class="card" style="margin:0">
        <div class="card-title">我的待办任务<span class="sub">共 ${myTasks.length} 项未完成</span></div>
        ${myTasks.length ? myTasks.map(t=>{
          const c = findCustomer(t.customerId);
          const overdue = t.due < today();
          return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #F4F4F9">
            <input type="checkbox" onchange="completeTask('${t.id}')" style="margin-top:3px">
            <div style="flex:1">
              <div style="font-size:13px"><span class="tag ${t.type==='收集资料'?'t-cyan':'t-amber'}">${t.type}</span> ${esc(t.title)}</div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:3px">客户：${c?esc(custDisplayName(c)):'—'} · 截止：${t.due} ${overdue?'<span style="color:var(--danger)">（已逾期）</span>':''}</div>
            </div>
          </div>`;
        }).join('') : '<div class="empty-tip">暂无待办任务</div>'}
        ${doneTasks.length?`<div style="margin-top:10px;font-size:12px;color:var(--muted)">最近已完成：${doneTasks.map(t=>esc(t.title)).join('；')}</div>`:''}
      </div>

      <div class="card" style="margin:0">
        <div class="card-title">最近匹配记录<span class="sub">最新 6 条</span></div>
        ${recentMatches.length ? `<table><thead><tr><th>客户</th><th>时间</th><th>命中</th><th>主推产品</th></tr></thead><tbody>
          ${recentMatches.map(({c,m})=>{
            const p = m.chosenId ? findProduct(m.chosenId) : null;
            return `<tr onclick="openCustomerDetail('${c.id}')" style="cursor:pointer">
              <td>${esc(custDisplayName(c))}</td><td style="font-size:12px;color:var(--muted)">${m.time}</td>
              <td>${m.results.length} 款</td><td>${p?esc(p.name):'<span style="color:var(--muted)">未选定</span>'}</td></tr>`;
          }).join('')}</tbody></table>` : '<div class="empty-tip">暂无匹配记录，去「智能匹配」发起首次匹配</div>'}
      </div>
    </div>`;
}
function statCard(icon, color, num, label){
  return `<div class="stat-card">
    <div class="stat-ico" style="background:linear-gradient(135deg,${color},${color}CC)">${icon}</div>
    <div><div class="num">${num}</div><div class="lbl">${label}</div></div></div>`;
}
function completeTask(id){
  const t = state.tasks.find(x=>x.id===id); if(!t) return;
  t.done = true; t.doneTime = now();
  addLog('完成任务', t.title);
  save(); toast('任务已完成', 'ok'); renderRoute();
}

/* =====================================================
 * 页面：信贷产品库
 * ===================================================== */
let prodFilter = { q:'', cat:'', status:'' };

function renderProducts(){
  const list = state.products.filter(p=>{
    if(prodFilter.q && !(p.name+p.org).toLowerCase().includes(prodFilter.q.toLowerCase())) return false;
    if(prodFilter.cat && p.category!==prodFilter.cat) return false;
    if(prodFilter.status && p.status!==prodFilter.status) return false;
    return true;
  });
  const catTag = { '个贷':'t-blue','房抵贷':'t-purple','车抵贷':'t-cyan','商户贷':'t-amber','企业经营贷':'t-indigo' };

  $('#page').innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <input placeholder="搜索产品名称 / 机构" style="width:220px" value="${esc(prodFilter.q)}" oninput="prodFilter.q=this.value;renderProducts()">
        <select onchange="prodFilter.cat=this.value;renderProducts()">
          <option value="">全部大类</option>
          ${CATEGORIES.map(c=>`<option ${prodFilter.cat===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <select onchange="prodFilter.status=this.value;renderProducts()">
          <option value="">全部状态</option>
          <option value="active" ${prodFilter.status==='active'?'selected':''}>在售</option>
          <option value="off" ${prodFilter.status==='off'?'selected':''}>已下架</option>
        </select>
        <div class="spacer"></div>
        ${can('product.edit')?'<button class="btn btn-primary btn-sm" onclick="openProductForm()">＋ 录入新产品</button>':'<span class="sub" style="font-size:12px;color:var(--muted)">销售顾问仅可查看，产品库由金融产品经理维护</span>'}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>产品名称</th><th>机构</th><th>大类</th><th>额度区间</th><th>年化利率</th><th>期限</th><th>版本</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>${list.map(p=>`<tr>
          <td><b style="cursor:pointer" onclick="openProductDetail('${p.id}')">${esc(p.name)}</b></td>
          <td>${esc(p.org)}</td>
          <td><span class="tag ${catTag[p.category]||'t-gray'}">${p.category}</span></td>
          <td>${wan(p.amountMin)} ~ ${wan(p.amountMax)}</td>
          <td>${p.rateMin}% ~ ${p.rateMax}%</td>
          <td>${p.termMin}~${p.termMax}个月</td>
          <td>v${p.version}</td>
          <td>${p.status==='active'?'<span class="tag t-green">在售</span>':'<span class="tag t-gray">已下架</span>'}</td>
          <td style="font-size:12px;color:var(--muted)">${p.updatedAt}</td>
          <td style="white-space:nowrap">
            <button class="btn-link" onclick="openProductDetail('${p.id}')">详情</button>
            ${can('product.edit')?`
              <button class="btn-link" onclick="openProductForm('${p.id}')">编辑</button>
              <button class="btn-link" onclick="openVersionHistory('${p.id}')">版本</button>
              <button class="btn-link danger" onclick="toggleProductStatus('${p.id}')">${p.status==='active'?'下架':'上架'}</button>`:''}
          </td></tr>`).join('')}
        </tbody></table></div>
      ${list.length?'':'<div class="empty-tip">没有符合条件的产品</div>'}
    </div>`;
}

function toggleProductStatus(id){
  const p = findProduct(id); if(!p) return;
  const toOff = p.status==='active';
  confirmBox(`确认将「${esc(p.name)}」${toOff?'下架':'上架'}？${toOff?'下架后该产品不再参与智能匹配。':''}`, ()=>{
    p.status = toOff?'off':'active'; p.updatedAt = now();
    addLog(toOff?'产品下架':'产品上架', `【${p.name}】${toOff?'停贷下架，退出匹配':'恢复在售'}`);
    save(); toast('操作成功','ok'); renderProducts();
  }, toOff);
}

/* ---------- 产品详情 ---------- */
function openProductDetail(id){
  const p = findProduct(id); if(!p) return;
  const h = p.rules.hard;
  const isEnt = ['商户贷','企业经营贷'].includes(p.category);
  const creditLabel = v => (CREDIT_REQ.find(x=>x.v===v)||{}).label || v;
  const assetLabel  = v => (ASSET_REQ.find(x=>x.v===v)||{}).label || v;
  const socialLabel = v => (SOCIAL_REQ.find(x=>x.v===v)||{}).label || v;
  openModal(`产品详情 · ${esc(p.name)}`, `
    <div class="kv-grid">
      <div class="kv"><span>所属机构</span><b>${esc(p.org)}</b></div>
      <div class="kv"><span>产品大类</span><b>${p.category}</b></div>
      <div class="kv"><span>额度区间</span><b>${wan(p.amountMin)} ~ ${wan(p.amountMax)}</b></div>
      <div class="kv"><span>年化利率</span><b>${p.rateMin}% ~ ${p.rateMax}%</b></div>
      <div class="kv"><span>期限</span><b>${p.termMin}~${p.termMax}个月</b></div>
      <div class="kv"><span>还款方式</span><b>${esc(p.repay)}</b></div>
      <div class="kv"><span>放款周期</span><b>约 ${p.cycleDays} 个工作日</b></div>
      <div class="kv"><span>状态 / 版本</span><b>${p.status==='active'?'在售':'已下架'} · v${p.version}</b></div>
    </div>
    <div class="form-section"><h4>${isEnt?'企业准入规则（硬性）':'个人准入规则（硬性）'}</h4>
      <div class="kv-grid">
        ${isEnt ? `
          <div class="kv"><span>成立年限</span><b>${h.yearsMin?`≥ ${h.yearsMin} 年`:'无要求'}</b></div>
          <div class="kv"><span>月均开票</span><b>${h.invoiceMin?`≥ ${wan(h.invoiceMin)}`:'无要求'}</b></div>
          <div class="kv"><span>年纳税</span><b>${h.taxMin?`≥ ${wan(h.taxMin)}`:'无要求'}</b></div>
          <div class="kv"><span>对公月流水</span><b>${h.flowMin?`≥ ${wan(h.flowMin)}`:'无要求'}</b></div>
          <div class="kv full"><span>禁入行业</span><b>${h.banInd.length?h.banInd.map(esc).join('、'):'无'}</b></div>
        ` : `
          <div class="kv"><span>年龄要求</span><b>${h.ageMin||'—'} ~ ${h.ageMax||'—'} 岁</b></div>
          <div class="kv"><span>征信要求</span><b>${creditLabel(h.creditReq)}</b></div>
          <div class="kv"><span>负债率上限</span><b>${h.maxDebt?`≤ ${h.maxDebt}%`:'无要求'}</b></div>
          <div class="kv"><span>资产要求</span><b>${assetLabel(h.assetReq)}</b></div>
          <div class="kv full"><span>社保/公积金</span><b>${socialLabel(h.socialReq)}</b></div>
        `}
      </div>
    </div>
    <div class="form-section"><h4>软性加分规则</h4>
      ${p.rules.soft.length ? p.rules.soft.map(r=>{
        const cond = SOFT_CONDITIONS.find(x=>x.key===r.key);
        return cond?`<div style="font-size:12.5px;margin-bottom:5px"><span class="tag t-purple">+${r.score}分</span> ${esc(cond.label)}</div>`:'';
      }).join('') : '<div class="empty-tip" style="padding:8px 0">未配置</div>'}
    </div>
    <div class="form-section"><h4>申请资料清单</h4>
      <ul style="padding-left:18px;font-size:13px;line-height:2">${p.materials.map(m=>`<li>${esc(m)}</li>`).join('')}</ul>
    </div>
    <div class="form-section"><h4>办理流程</h4>
      <div style="font-size:13px">${p.process.map((s,i)=>`<span class="tag t-blue" style="margin:2px 4px 2px 0">${i+1}. ${esc(s)}</span>`).join('')}</div>
    </div>
    <div class="form-section"><h4>风险提示</h4>
      <p style="font-size:13px;color:#92400E;background:#FFF7E6;border-radius:8px;padding:10px 14px;line-height:1.7">${esc(p.riskNote)}</p>
    </div>`, '680px');
}

/* ---------- 产品新增 / 编辑 ---------- */
let _productEditingId = null;

function openProductForm(id){
  if(!can('product.edit')){ toast('销售顾问无权编辑产品库','err'); return; }
  _productEditingId = id || null;
  const p = id ? findProduct(id) : null;
  const h = p ? p.rules.hard : { ageMin:'',ageMax:'',creditReq:'no_current',maxDebt:'',assetReq:'none',socialReq:'none',yearsMin:'',invoiceMin:'',taxMin:'',flowMin:'',banInd:[] };
  const soft = p ? JSON.parse(JSON.stringify(p.rules.soft)) : [{key:'noOverdue',score:6}];

  const isEnt = p ? ['商户贷','企业经营贷'].includes(p.category) : false;
  openModal(p?`编辑产品 · ${esc(p.name)}`:'录入新产品', `
    <div class="form-grid">
      <div class="field"><label>产品名称<span class="req">*</span></label><input id="pf-name" value="${p?esc(p.name):''}" placeholder="如：中原消费贷"></div>
      <div class="field"><label>所属机构<span class="req">*</span></label><input id="pf-org" value="${p?esc(p.org):''}" placeholder="如：中原银行"></div>
      <div class="field"><label>产品大类<span class="req">*</span></label>
        <select id="pf-cat" onchange="toggleRuleSection()">${CATEGORIES.map(c=>`<option ${p&&p.category===c?'selected':''}>${c}</option>`).join('')}</select>
      </div>
      <div class="field"><label>还款方式</label>
        <select id="pf-repay">${REPAY_METHODS.map(m=>`<option ${p&&p.repay.includes(m)?'selected':''}>${m}</option>`).join('')}</select>
      </div>
      <div class="field"><label>额度区间（万）<span class="req">*</span></label>
        <div style="display:flex;gap:8px;align-items:center"><input id="pf-am" type="number" value="${p?p.amountMin:''}" placeholder="最低"> <span>~</span> <input id="pf-ax" type="number" value="${p?p.amountMax:''}" placeholder="最高"></div>
      </div>
      <div class="field"><label>年化利率区间（%）<span class="req">*</span></label>
        <div style="display:flex;gap:8px;align-items:center"><input id="pf-rmin" type="number" step="0.01" value="${p?p.rateMin:''}" placeholder="下限"> <span>~</span> <input id="pf-rmax" type="number" step="0.01" value="${p?p.rateMax:''}" placeholder="上限"></div>
      </div>
      <div class="field"><label>期限（月）<span class="req">*</span></label>
        <div style="display:flex;gap:8px;align-items:center"><input id="pf-tmin" type="number" value="${p?p.termMin:''}"> <span>~</span> <input id="pf-tmax" type="number" value="${p?p.termMax:''}"></div>
      </div>
      <div class="field"><label>放款周期（工作日）</label><input id="pf-cycle" type="number" value="${p?p.cycleDays:''}" placeholder="如：5"></div>
      <div class="field full"><label>申请资料清单（每行一项）</label><textarea id="pf-materials" rows="4">${p?esc(p.materials.join('\n')):''}</textarea></div>
      <div class="field full"><label>办理流程（每行一步）</label><textarea id="pf-process" rows="3">${p?esc(p.process.join('\n')):''}</textarea></div>
      <div class="field full"><label>风险提示</label><textarea id="pf-risk" rows="2">${p?esc(p.riskNote):''}</textarea></div>
    </div>

    <div class="form-section"><h4>硬性准入规则（不满足直接排除）</h4>
      <div id="rule-personal" class="${isEnt?'hidden':''}">
        <div class="form-grid">
          <div class="field"><label>年龄下限（岁）</label><input id="pf-ageMin" type="number" value="${esc(h.ageMin)}"></div>
          <div class="field"><label>年龄上限（岁）</label><input id="pf-ageMax" type="number" value="${esc(h.ageMax)}"></div>
          <div class="field"><label>征信要求</label><select id="pf-creditReq">${CREDIT_REQ.map(o=>`<option value="${o.v}" ${h.creditReq===o.v?'selected':''}>${o.label}</option>`).join('')}</select></div>
          <div class="field"><label>负债率上限（%）</label><input id="pf-maxDebt" type="number" value="${esc(h.maxDebt)}"></div>
          <div class="field"><label>资产要求</label><select id="pf-assetReq">${ASSET_REQ.map(o=>`<option value="${o.v}" ${h.assetReq===o.v?'selected':''}>${o.label}</option>`).join('')}</select></div>
          <div class="field"><label>社保/公积金</label><select id="pf-socialReq">${SOCIAL_REQ.map(o=>`<option value="${o.v}" ${h.socialReq===o.v?'selected':''}>${o.label}</option>`).join('')}</select></div>
        </div>
      </div>
      <div id="rule-enterprise" class="${isEnt?'':'hidden'}">
        <div class="form-grid">
          <div class="field"><label>成立年限≥（年）</label><input id="pf-yearsMin" type="number" value="${esc(h.yearsMin)}"></div>
          <div class="field"><label>月均开票≥（万）</label><input id="pf-invoiceMin" type="number" value="${esc(h.invoiceMin)}"></div>
          <div class="field"><label>年纳税≥（万）</label><input id="pf-taxMin" type="number" value="${esc(h.taxMin)}"></div>
          <div class="field"><label>对公月流水≥（万）</label><input id="pf-flowMin" type="number" value="${esc(h.flowMin)}"></div>
          <div class="field full"><label>禁入行业（按住 Ctrl 多选）</label>
            <select id="pf-banInd" multiple size="5" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:6px">${INDUSTRIES.map(i=>`<option ${h.banInd.includes(i)?'selected':''}>${i}</option>`).join('')}</select>
          </div>
        </div>
      </div>
    </div>

    <div class="form-section"><h4>软性加分规则（可视化配置，用于匹配度打分）</h4>
      <div id="soft-rules"></div>
      <button class="btn btn-ghost btn-sm" onclick="addSoftRuleRow()">＋ 添加加分规则</button>
    </div>

    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveProductForm()">${p?'保存并生成新版本':'保存'}</button>
    </div>
  `, '760px');

  window._softRules = soft;
  renderSoftRules();
}
function toggleRuleSection(){
  const cat = $('#pf-cat').value;
  const ent = ['商户贷','企业经营贷'].includes(cat);
  $('#rule-personal').classList.toggle('hidden', ent);
  $('#rule-enterprise').classList.toggle('hidden', !ent);
}
function renderSoftRules(){
  $('#soft-rules').innerHTML = window._softRules.map((r,i)=>{
    const opts = SOFT_CONDITIONS.map(c=>`<option value="${c.key}" ${r.key===c.key?'selected':''}>${c.label}</option>`).join('');
    return `<div class="soft-rule-row">
      <span class="tag t-purple">规则 ${i+1}</span>
      <select onchange="window._softRules[${i}].key=this.value">${opts}</select>
      <input type="number" value="${r.score||0}" oninput="window._softRules[${i}].score=+this.value||0" placeholder="分值">
      <span style="font-size:12px;color:var(--muted)">分</span>
      <button class="btn-link danger" onclick="window._softRules.splice(${i},1);renderSoftRules()">删除</button>
    </div>`;
  }).join('');
}
function addSoftRuleRow(){ window._softRules.push({key:SOFT_CONDITIONS[0].key, score:5}); renderSoftRules(); }

function saveProductForm(){
  const name = $('#pf-name').value.trim(), org = $('#pf-org').value.trim();
  if(!name || !org){ toast('请填写产品名称与所属机构','err'); return; }
  const am=$('#pf-am').value, ax=$('#pf-ax').value, rmin=$('#pf-rmin').value, rmax=$('#pf-rmax').value, tmin=$('#pf-tmin').value, tmax=$('#pf-tmax').value;
  if(am===''||ax===''||rmin===''||rmax===''||tmin===''||tmax===''){ toast('请完整填写额度、利率、期限区间','err'); return; }
  const cat = $('#pf-cat').value;
  const banInd = Array.from($('#pf-banInd').selectedOptions).map(o=>o.value);

  const core = {
    name, org, category:cat, repay:$('#pf-repay').value,
    amountMin:+am, amountMax:+ax, rateMin:+rmin, rateMax:+rmax, termMin:+tmin, termMax:+tmax,
    cycleDays:+$('#pf-cycle').value||0,
    materials:$('#pf-materials').value.split('\n').map(s=>s.trim()).filter(Boolean),
    process:$('#pf-process').value.split('\n').map(s=>s.trim()).filter(Boolean),
    riskNote:$('#pf-risk').value.trim() || '额度、利率以银行最终审批为准。',
    rules:{
      hard:{
        ageMin:$('#pf-ageMin').value, ageMax:$('#pf-ageMax').value, creditReq:$('#pf-creditReq').value,
        maxDebt:$('#pf-maxDebt').value, assetReq:$('#pf-assetReq').value, socialReq:$('#pf-socialReq').value,
        yearsMin:$('#pf-yearsMin').value, invoiceMin:$('#pf-invoiceMin').value, taxMin:$('#pf-taxMin').value,
        flowMin:$('#pf-flowMin').value, banInd
      },
      soft: window._softRules.filter(r=>r.score>0)
    }
  };

  if(_productEditingId){
    const p = findProduct(_productEditingId);
    const before = JSON.stringify({ n:p.name,o:p.org,c:p.category,r:p.repay,a:[p.amountMin,p.amountMax,p.rateMin,p.rateMax,p.termMin,p.termMax,p.cycleDays],m:p.materials,pr:p.process,k:p.riskNote,ru:p.rules });
    const after  = JSON.stringify({ n:core.name,o:core.org,c:core.category,r:core.repay,a:[core.amountMin,core.amountMax,core.rateMin,core.rateMax,core.termMin,core.termMax,core.cycleDays],m:core.materials,pr:core.process,k:core.riskNote,ru:core.rules });
    if(before === after){ toast('内容未变化，无需保存'); closeModal(); return; }
    window._pendingCore = core;
    confirmBox('检测到产品内容变更，将<strong>新建版本</strong>并记录变更日志。是否继续？', ()=>{
      openModal('版本变更说明', `
        <div class="field"><label>变更说明（记录于版本日志）<span class="req">*</span></label>
          <textarea id="pf-changelog" rows="3" placeholder="如：征信要求收紧为近两年无逾期"></textarea></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="closeModal()">取消</button>
          <button class="btn btn-primary" onclick="_commitProductVersion()">确认升级版本</button>
        </div>`, '480px');
    });
  } else {
    const p = Object.assign({ id:uid('p'), status:'active', version:1,
      versions:[{ v:1, time:now(), by:session.name, log:'初始版本录入' }],
      counters:{ matched:0, submit:0, loan:0 }, createdAt:now(), updatedAt:now() }, core);
    p.versions[0].snapshot = snapOf(p);
    state.products.unshift(p);
    addLog('新增产品', `录入产品【${p.name}】（${p.org} · ${p.category}）`);
    save(); closeModal(); toast('产品已录入','ok'); renderProducts();
  }
}
function _commitProductVersion(){
  const log = $('#pf-changelog').value.trim();
  if(!log){ toast('请填写变更说明','err'); return; }
  const p = findProduct(_productEditingId);
  const snap = snapOf(p);           /* 保存旧版本快照，供回滚 */
  Object.assign(p, _pendingCore);
  p.version += 1;
  p.versions.push({ v:p.version, time:now(), by:session.name, log, snapshot:snap });
  p.updatedAt = now();
  addLog('产品规则更新', `【${p.name}】升级至 v${p.version}：${log}`);
  save(); closeModal(); closeModal(); toast(`已保存，当前版本 v${p.version}`,'ok'); renderProducts();
}

/* 生成产品快照（当前字段 + 规则深拷贝），供版本回滚 */
function snapOf(p){
  return {
    core:{ name:p.name, org:p.org, category:p.category, repay:p.repay,
      amountMin:p.amountMin, amountMax:p.amountMax, rateMin:p.rateMin, rateMax:p.rateMax,
      termMin:p.termMin, termMax:p.termMax, cycleDays:p.cycleDays,
      materials:p.materials.slice(), process:p.process.slice(), riskNote:p.riskNote },
    rules: JSON.parse(JSON.stringify(p.rules))
  };
}
