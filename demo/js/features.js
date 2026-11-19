/* =====================================================
 * 玖臻融资咨询匹配平台 - 业务：客户/匹配/跟进/看板/系统
 * ===================================================== */

/* =====================================================
 * 页面：客户档案
 * ===================================================== */
let custFilter = { q:'', type:'', status:'' };

function statusTag(s){
  const map = { '待评估':'t-gray','方案已出':'t-blue','资料收集中':'t-amber','已进件':'t-purple','银行审批中':'t-cyan','放款':'t-green','驳回':'t-red' };
  return `<span class="tag ${map[s]||'t-gray'}">${esc(s)}</span>`;
}

function renderCustomers(){
  const list = visibleCustomers().filter(c=>{
    if(custFilter.q && !custDisplayName(c).includes(custFilter.q) && !(c.phone||'').includes(custFilter.q)) return false;
    if(custFilter.type && c.type!==custFilter.type) return false;
    if(custFilter.status && c.status!==custFilter.status) return false;
    return true;
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const ownerName = u => { const x = state.users.find(y=>y.username===u); return x?x.name:'—'; };
  const lastFollow = c => c.followUps.length ? c.followUps[0].content.slice(0,18)+'…' : '—';

  $('#page').innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <input placeholder="搜索客户名称 / 手机号" style="width:200px" value="${esc(custFilter.q)}" oninput="custFilter.q=this.value;renderCustomers()">
        <select onchange="custFilter.type=this.value;renderCustomers()">
          <option value="">全部类型</option><option value="personal" ${custFilter.type==='personal'?'selected':''}>个人客户</option>
          <option value="enterprise" ${custFilter.type==='enterprise'?'selected':''}>企业客户</option>
        </select>
        <select onchange="custFilter.status=this.value;renderCustomers()">
          <option value="">全部状态</option>${CUSTOMER_STATUS.map(s=>`<option ${custFilter.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <div class="spacer"></div>
        <span style="font-size:12px;color:var(--muted)">${can('customer.all')?'全量客户可见':'仅显示我的客户'}</span>
        <button class="btn btn-primary btn-sm" onclick="openCustomerForm()">＋ 新增客户</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>客户名称</th><th>类型</th><th>手机号</th><th>期望额度</th><th>状态</th><th>跟进人</th><th>最近跟进</th><th>录入时间</th><th>操作</th></tr></thead>
        <tbody>${list.map(c=>`<tr>
          <td><b style="cursor:pointer" onclick="openCustomerDetail('${c.id}')">${esc(custDisplayName(c))}</b></td>
          <td>${c.type==='personal'?'<span class="tag t-blue">个人</span>':'<span class="tag t-indigo">企业</span>'}</td>
          <td style="font-size:12px">${esc(c.phone||'—')}</td>
          <td>${wan(c.need.amount)}</td>
          <td>${statusTag(c.status)}</td>
          <td>${ownerName(c.owner)}</td>
          <td style="font-size:12px;color:var(--muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(lastFollow(c))}</td>
          <td style="font-size:12px;color:var(--muted)">${c.createdAt}</td>
          <td style="white-space:nowrap">
            <button class="btn-link" onclick="openCustomerDetail('${c.id}')">详情</button>
            <button class="btn-link" onclick="openCustomerForm('${c.id}')">编辑</button>
            <button class="btn-link" onclick="jumpMatch('${c.id}')">匹配</button>
          </td></tr>`).join('')}
        </tbody></table></div>
      ${list.length?'':'<div class="empty-tip">没有符合条件的客户</div>'}
    </div>`;
}

function jumpMatch(id){ go('match'); setTimeout(()=>{ $('#match-cust').value=id; renderMatchProfile(); },50); }

/* ---------- 客户新增 / 编辑 ---------- */
function openCustomerForm(id){
  const c = id ? findCustomer(id) : null;
  const salesUsers = state.users.filter(u=>u.role==='sales'&&u.active);
  const p = c ? (c.type==='personal'?c.personal:null) : null;
  const e = c ? (c.type==='enterprise'?c.enterprise:null) : null;

  openModal(c?`编辑客户 · ${esc(custDisplayName(c))}`:'新增客户', `
    <div class="form-grid">
      <div class="field"><label>客户类型<span class="req">*</span></label>
        <div class="radio-row">
          <label style="margin:0"><input type="radio" name="cf-type" value="personal" ${!c||c.type==='personal'?'checked':''} onchange="toggleCustType()"> 个人客户</label>
          <label style="margin:0"><input type="radio" name="cf-type" value="enterprise" ${c&&c.type==='enterprise'?'checked':''} onchange="toggleCustType()"> 企业客户</label>
        </div>
      </div>
      <div class="field"><label>姓名 / 联系人<span class="req">*</span></label><input id="cf-name" value="${c?esc(c.name):''}"></div>
      <div class="field"><label>手机号<span class="req">*</span></label><input id="cf-phone" value="${c?esc(c.phone):''}" placeholder="用于业务联系，妥善保密"></div>
      <div class="field"><label>客户来源</label><select id="cf-source">${SOURCES.map(s=>`<option ${c&&c.source===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>意向程度</label><select id="cf-intent">${INTENTS.map(s=>`<option ${c&&c.intent===s?'selected':''}>${s}</option>`).join('')}</select></div>
      ${can('assign.owner')?`<div class="field"><label>跟进人</label><select id="cf-owner">${salesUsers.map(u=>`<option value="${u.username}" ${c&&c.owner===u.username?'selected':''}>${u.name}（销售）</option>`).join('')}</select></div>`:''}
    </div>

    <div class="form-section"><h4>个人资质</h4>
      <div id="sec-personal">
        <div class="form-grid">
          <div class="field"><label>年龄<span class="req">*</span></label><input id="cf-age" type="number" value="${p?esc(p.age):''}"></div>
          <div class="field"><label>职业</label><input id="cf-occ" value="${p?esc(p.occupation):''}"></div>
          <div class="field"><label>月收入（万）<span class="req">*</span></label><input id="cf-income" type="number" step="0.1" value="${p?esc(p.monthlyIncome):''}"></div>
          <div class="field"><label>负债率（%）<span class="req">*</span></label><input id="cf-debt" type="number" value="${p?esc(p.debtRatio):''}" placeholder="月还款/月收入"></div>
          <div class="field"><label>近两年逾期次数</label><input id="cf-overdue" type="number" value="${p?esc(p.overdue2y):0}"></div>
          <div class="field"><label>当前是否逾期</label><div class="radio-row"><label style="margin:0"><input type="radio" name="cf-cur" value="no" ${!p||!p.currentOverdue?'checked':''}> 否</label><label style="margin:0"><input type="radio" name="cf-cur" value="yes" ${p&&p.currentOverdue?'checked':''}> 是</label></div></div>
          <div class="field"><label>名下房产</label><div class="radio-row"><label style="margin:0"><input type="radio" name="cf-house" value="no" ${!p||!p.hasHouse?'checked':''} onchange="toggleHouse()"> 无</label><label style="margin:0"><input type="radio" name="cf-house" value="yes" ${p&&p.hasHouse?'checked':''} onchange="toggleHouse()"> 有，估值（万）</label><input id="cf-houseV" type="number" style="width:90px" value="${p?esc(p.houseValue):''}"></div></div>
          <div class="field"><label>名下车辆</label><div class="radio-row"><label style="margin:0"><input type="radio" name="cf-car" value="no" ${!p||!p.hasCar?'checked':''} onchange="toggleCar()"> 无</label><label style="margin:0"><input type="radio" name="cf-car" value="yes" ${p&&p.hasCar?'checked':''} onchange="toggleCar()"> 有，估值（万）</label><input id="cf-carV" type="number" style="width:90px" value="${p?esc(p.carValue):''}"></div></div>
          <div class="field"><label>社保</label><div class="radio-row"><label style="margin:0"><input type="radio" name="cf-social" value="no" ${!p||!p.social?'checked':''}> 无</label><label style="margin:0"><input type="radio" name="cf-social" value="yes" ${p&&p.social?'checked':''}> 有</label></div></div>
          <div class="field"><label>公积金</label><div class="radio-row"><label style="margin:0"><input type="radio" name="cf-prov" value="no" ${!p||!p.provident?'checked':''}> 无</label><label style="margin:0"><input type="radio" name="cf-prov" value="yes" ${p&&p.provident?'checked':''}> 有</label></div></div>
        </div>
      </div>
    </div>

    <div class="form-section"><h4>企业资质</h4>
      <div id="sec-enterprise" class="${c&&c.type==='enterprise'?'':'hidden'}">
        <div class="form-grid">
          <div class="field"><label>企业名称<span class="req">*</span></label><input id="cf-company" value="${e?esc(e.companyName):''}"></div>
          <div class="field"><label>所属行业<span class="req">*</span></label><select id="cf-industry">${INDUSTRIES.map(i=>`<option ${e&&e.industry===i?'selected':''}>${i}</option>`).join('')}</select></div>
          <div class="field"><label>成立年限（年）<span class="req">*</span></label><input id="cf-years" type="number" value="${e?esc(e.years):''}"></div>
          <div class="field"><label>月均开票（万）<span class="req">*</span></label><input id="cf-invoice" type="number" value="${e?esc(e.monthlyInvoice):''}"></div>
          <div class="field"><label>年纳税（万）</label><input id="cf-tax" type="number" step="0.1" value="${e?esc(e.yearlyTax):''}"></div>
          <div class="field"><label>对公月流水（万）</label><input id="cf-flow" type="number" value="${e?esc(e.publicFlow):''}"></div>
          <div class="field"><label>法人姓名</label><input id="cf-legal" value="${e?esc(e.legalPerson):''}"></div>
          <div class="field"><label>法人年龄</label><input id="cf-legalAge" type="number" value="${e?esc(e.legalAge):''}"></div>
        </div>
      </div>
    </div>

    <div class="form-section"><h4>融资需求</h4>
      <div class="form-grid">
        <div class="field"><label>期望额度（万）<span class="req">*</span></label><input id="cf-amount" type="number" value="${c?esc(c.need.amount):''}"></div>
        <div class="field"><label>期望期限（月）</label><input id="cf-term" type="number" value="${c?esc(c.need.term):''}"></div>
        <div class="field"><label>资金用途</label><select id="cf-purpose">${PURPOSES.map(s=>`<option ${c&&c.need.purpose===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>初始状态</label><select id="cf-status"><option>待评估</option>${c?CUSTOMER_STATUS.filter(s=>s!=='待评估').map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join(''):''}</select></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveCustomerForm('${id||''}')">保存</button>
    </div>
  `, '780px');

  if(!c || c.type!=='enterprise') $('#sec-enterprise').classList.add('hidden');
  if(c && c.type==='enterprise') $('#sec-personal').classList.add('hidden');
}
function toggleCustType(){
  const ent = document.querySelector('input[name="cf-type"]:checked').value==='enterprise';
  $('#sec-personal').classList.toggle('hidden', ent);
  $('#sec-enterprise').classList.toggle('hidden', !ent);
}
function toggleHouse(){}
function toggleCar(){}

function saveCustomerForm(id){
  const type = document.querySelector('input[name="cf-type"]:checked').value;
  const name = $('#cf-name').value.trim(), phone = $('#cf-phone').value.trim();
  if(!name || !phone){ toast('请填写姓名与手机号','err'); return; }
  const radio = (n,yesVal='yes') => document.querySelector(`input[name="${n}"]:checked`).value===yesVal;
  let personal=null, enterprise=null;

  if(type==='personal'){
    const age=$('#cf-age').value, income=$('#cf-income').value, debt=$('#cf-debt').value;
    if(age===''||income===''||debt===''){ toast('请完整填写年龄、月收入、负债率','err'); return; }
    personal = {
      age:+age, occupation:$('#cf-occ').value.trim(), monthlyIncome:+income, debtRatio:+debt,
      overdue2y:+$('#cf-overdue').value||0, currentOverdue:radio('cf-cur'),
      hasHouse:radio('cf-house'), houseValue:$('#cf-houseV').value===''?'':+$('#cf-houseV').value,
      hasCar:radio('cf-car'), carValue:$('#cf-carV').value===''?'':+$('#cf-carV').value,
      social:radio('cf-social'), provident:radio('cf-prov')
    };
  } else {
    const years=$('#cf-years').value, invoice=$('#cf-invoice').value;
    if(!$('#cf-company').value.trim()||years===''||invoice===''){ toast('请完整填写企业名称、成立年限、月均开票','err'); return; }
    enterprise = {
      companyName:$('#cf-company').value.trim(), industry:$('#cf-industry').value, years:+years,
      monthlyInvoice:+invoice, yearlyTax:+$('#cf-tax').value||0, publicFlow:+$('#cf-flow').value||0,
      legalPerson:$('#cf-legal').value.trim(), legalAge:+$('#cf-legalAge').value||0, employees:0
    };
  }
  const amount=$('#cf-amount').value;
  if(amount===''){ toast('请填写期望额度','err'); return; }
  const need = { amount:+amount, term:+$('#cf-term').value||0, purpose:$('#cf-purpose').value };

  if(id){
    const c = findCustomer(id);
    Object.assign(c, { name, phone, source:$('#cf-source').value, intent:$('#cf-intent').value, type, personal, enterprise, need });
    c.updatedAt = now();
    addLog('编辑客户', `修改客户【${custDisplayName(c)}】档案`);
    save(); closeModal(); toast('客户档案已更新','ok'); renderCustomers();
  } else {
    const c = {
      id:uid('c'), type, name, phone, source:$('#cf-source').value, intent:$('#cf-intent').value,
      status:$('#cf-status').value, owner:can('assign.owner')?($('#cf-owner')?$('#cf-owner').value:session.username):session.username,
      personal, enterprise, need, chosenProductId:'', followUps:[], matches:[], rejectReason:'',
      statusLog:[{ status:$('#cf-status').value, time:now(), by:session.name, note:'录入客户档案' }],
      createdAt:now(), updatedAt:now()
    };
    state.customers.unshift(c);
    addLog('新增客户', `录入客户【${custDisplayName(c)}】档案`);
    save(); closeModal(); toast('客户已录入','ok'); renderCustomers();
  }
}

/* ---------- 客户详情（标签页） ---------- */
function openCustomerDetail(id){
  const c = findCustomer(id); if(!c) return;
  window._detailCustId = id; window._detailTab = 'info';
  const body = `<div id="cust-detail-body"></div>`;
  openModal(`客户档案 · ${esc(custDisplayName(c))}`, body, '760px');
  renderCustomerDetailTab();
}
function switchDetailTab(tab){ window._detailTab = tab; renderCustomerDetailTab(); }
function renderCustomerDetailTab(){
  const c = findCustomer(window._detailCustId); if(!c) return;
  const tab = window._detailTab;
  const p = c.personal, e = c.enterprise;
  const flow = CUSTOMER_STATUS.filter(s=>s!=='驳回');
  const flowIdx = flow.indexOf(c.status);

  let tabBody = '';
  if(tab==='info'){
    tabBody = `
      <div class="kv-grid">
        <div class="kv"><span>手机号</span><b>${esc(c.phone||'—')}</b></div>
        <div class="kv"><span>客户来源 / 意向</span><b>${esc(c.source)} · 意向${esc(c.intent)}</b></div>
        ${c.type==='personal' ? `
          <div class="kv"><span>年龄 / 职业</span><b>${p.age}岁 · ${esc(p.occupation||'—')}</b></div>
          <div class="kv"><span>月收入 / 负债率</span><b>${wan(p.monthlyIncome)} / ${p.debtRatio}%</b></div>
          <div class="kv"><span>逾期情况</span><b>${p.currentOverdue?'<span style="color:var(--danger)">当前逾期</span>':`近两年${p.overdue2y}次`}</b></div>
          <div class="kv"><span>资产</span><b>${p.hasHouse?`房${wan(p.houseValue)}`:''}${p.hasHouse&&p.hasCar?' + ':''}${p.hasCar?`车${wan(p.carValue)}`:''}${!p.hasHouse&&!p.hasCar?'无房无车':''}</b></div>
          <div class="kv"><span>社保 / 公积金</span><b>${p.social?'有':'无'} / ${p.provident?'有':'无'}</b></div>
        ` : `
          <div class="kv"><span>企业名称</span><b>${esc(e.companyName)}</b></div>
          <div class="kv"><span>行业 / 成立年限</span><b>${esc(e.industry)} · ${e.years}年</b></div>
          <div class="kv"><span>月均开票 / 年纳税</span><b>${wan(e.monthlyInvoice)} / ${wan(e.yearlyTax)}</b></div>
          <div class="kv"><span>对公月流水</span><b>${wan(e.publicFlow)}</b></div>
          <div class="kv"><span>法人</span><b>${esc(e.legalPerson||'—')} ${e.legalAge?e.legalAge+'岁':''}</b></div>
        `}
        <div class="kv"><span>期望额度 / 期限</span><b>${wan(c.need.amount)} · ${c.need.term||'—'}个月</b></div>
        <div class="kv"><span>资金用途</span><b>${esc(c.need.purpose)}</b></div>
        ${c.rejectReason?`<div class="kv full"><span>驳回原因</span><b style="color:var(--danger);max-width:70%">${esc(c.rejectReason)}</b></div>`:''}
      </div>
      ${can('match.review')&&c.matches.length?`<div style="margin-top:14px;font-size:12px;color:var(--muted)">产品经理复核入口：在「智能匹配」页对该客户方案进行复核调整。</div>`:''}`;
  }
  else if(tab==='follow'){
    tabBody = `
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <textarea id="new-follow" rows="2" style="flex:1;border:1px solid var(--line);border-radius:8px;padding:8px 12px" placeholder="记录本次沟通内容、客户疑问…"></textarea>
        <button class="btn btn-primary btn-sm" style="align-self:flex-end" onclick="addFollowUp()">添加</button>
      </div>
      ${c.followUps.length ? c.followUps.map(f=>`<div class="follow-item"><div class="f-meta">${f.time} · ${esc(f.by)}</div>${esc(f.content)}</div>`).join('') : '<div class="empty-tip">暂无跟进记录</div>'}`;
  }
  else if(tab==='match'){
    tabBody = c.matches.length ? c.matches.map(m=>{
      const prod = id2 => { const pp=findProduct(id2); return pp?esc(pp.name):'—'; };
      return `<div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);margin-bottom:8px">
          <span>${m.time} · 经办：${esc(m.by)}${m.review?` · <span class="tag t-purple">已复核</span>`:''}</span>
          <button class="btn-link" onclick="printScheme('${c.id}','${m.time}')">导出方案 PDF</button>
        </div>
        ${m.results.map((r,i)=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px dashed #F0F0F5">
          <span>${r.pid===m.chosenId?'<span class="tag t-green">主推</span> ':''}${i+1}. ${prod(r.pid)}</span>
          <span>匹配度 <b style="color:var(--primary)">${r.score}%</b> · 预估可贷 ${wan(r.est)}</span></div>`).join('')}
      </div>`;
    }).join('') : '<div class="empty-tip">暂无匹配记录</div>';
  }
  else if(tab==='status'){
    tabBody = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        ${CUSTOMER_STATUS.map(s=>{
          const idx = flow.indexOf(s);
          const active = c.status===s;
          const passed = s!=='驳回' && flowIdx>=0 && idx<=flowIdx;
          const bg = active?'linear-gradient(135deg,var(--primary),var(--blue))':(passed?'#EDE9FE':'#F3F4F6');
          const color = active?'#fff':(passed?'var(--primary-d)':'var(--muted)');
          return `<span style="padding:5px 12px;border-radius:16px;font-size:12px;background:${bg};color:${color}">${s}${s==='驳回'&&active?'：见驳回原因':''}</span>`;
        }).join('')}
      </div>
      ${c.status!=='放款' ? `
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
        <div class="field" style="width:180px"><label>流转至</label>
          <select id="next-status">${allowedNextStatus(c).map(s=>`<option>${s}</option>`).join('')}</select></div>
        <div class="field" style="flex:1;min-width:200px"><label>备注 / 驳回原因（驳回时必填）</label><input id="status-note" placeholder="选填；驳回时必填原因"></div>
        <button class="btn btn-primary btn-sm" onclick="changeStatus()">更新状态</button>
      </div>`:'<div class="tag t-green" style="margin-bottom:14px">该客户已放款，流程归档</div>'}
      <div class="timeline">
        ${c.statusLog.map(s=>`<div class="t-item"><div class="t-time">${s.time} · ${esc(s.by)}</div><div class="t-txt"><b>${esc(s.status)}</b>${s.note?' — '+esc(s.note):''}</div></div>`).join('')}
      </div>`;
  }

  $('#cust-detail-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>${statusTag(c.status)} <b style="font-size:15px;margin-left:6px">${esc(custDisplayName(c))}</b>
        ${c.chosenProductId?`<span class="tag t-purple" style="margin-left:8px">主推：${esc((findProduct(c.chosenProductId)||{}).name||'—')}</span>`:''}</div>
      <button class="btn btn-primary btn-sm" onclick="closeModal();jumpMatch('${c.id}')">⚡ 发起匹配</button>
    </div>
    <div class="tabs">
      <button class="tab ${tab==='info'?'active':''}" onclick="switchDetailTab('info')">基本资料</button>
      <button class="tab ${tab==='follow'?'active':''}" onclick="switchDetailTab('follow')">跟进记录 (${c.followUps.length})</button>
      <button class="tab ${tab==='match'?'active':''}" onclick="switchDetailTab('match')">匹配历史 (${c.matches.length})</button>
      <button class="tab ${tab==='status'?'active':''}" onclick="switchDetailTab('status')">状态流转</button>
    </div>
    ${tabBody}`;
}

function allowedNextStatus(c){
  if(c.status==='驳回') return ['待评估'];
  const flow = CUSTOMER_STATUS.filter(s=>s!=='驳回');
  const idx = flow.indexOf(c.status);
  const nexts = idx>=0 && idx<flow.length-1 ? [flow[idx+1]] : [];
  if(c.status!=='放款') nexts.push('驳回');
  return nexts.length?nexts:['驳回'];
}

function addFollowUp(){
  const c = findCustomer(window._detailCustId);
  const txt = $('#new-follow').value.trim();
  if(!txt){ toast('请填写跟进内容','err'); return; }
  c.followUps.unshift({ time:now(), by:session.name, content:txt });
  addLog('更新跟进记录', `客户【${custDisplayName(c)}】添加跟进笔记`);
  save(); toast('跟进记录已添加','ok'); renderCustomerDetailTab();
}

function changeStatus(){
  const c = findCustomer(window._detailCustId);
  const next = $('#next-status').value;
  const note = $('#status-note').value.trim();
  if(next==='驳回' && !note){ toast('驳回必须填写原因','err'); return; }
  if((next==='已进件'||next==='银行审批中'||next==='放款') && !c.chosenProductId){
    toast('请先在匹配方案中选定主推产品，再流转该状态','err'); return;
  }
  const prev = c.status;
  if(next==='已进件' && c.chosenProductId){
    const p = findProduct(c.chosenProductId);
    if(p){ p.counters.submit++; addLog('产品进件', `【${p.name}】进件+1（客户：${custDisplayName(c)}）`); }
  }
  if(next==='放款' && c.chosenProductId){
    const p = findProduct(c.chosenProductId);
    if(p){ p.counters.loan++; addLog('产品放款', `【${p.name}】放款+1（客户：${custDisplayName(c)}）`); }
  }
  c.status = next;
  c.statusLog.push({ status:next, time:now(), by:session.name, note });
  if(next==='驳回'){ c.rejectReason = note; }
  addLog('状态流转', `客户【${custDisplayName(c)}】：${prev} → ${next}${note?('，'+note):''}`);
  save(); toast('状态已更新','ok'); closeModal();
}

/* =====================================================
 * 页面：智能匹配（核心）
 * ===================================================== */
let matchCtx = { customerId:'', result:null };

function renderMatch(){
  const list = visibleCustomers();
  $('#page').innerHTML = `
    <div class="danger-banner">⚠ 合规提示：匹配结果仅为系统<strong>预评估</strong>，不代表银行审批结果。严禁向客户承诺“一定放款、保证通过”等话术，违者追究责任。</div>
    <div style="display:grid;grid-template-columns:340px 1fr;gap:18px" class="match-grid">
      <div class="card" style="margin:0;align-self:start">
        <div class="card-title">选择客户<span class="sub">录入资质后发起匹配</span></div>
        <select id="match-cust" onchange="renderMatchProfile()" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:9px 12px;margin-bottom:14px">
          <option value="">— 请选择客户 —</option>
          ${list.map(c=>`<option value="${c.id}" ${matchCtx.customerId===c.id?'selected':''}>${esc(custDisplayName(c))}（${wan(c.need.amount)}）</option>`).join('')}
        </select>
        <div id="match-profile"></div>
        <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="runMatch()">⚡ 开始匹配</button>
      </div>
      <div id="match-result"></div>
    </div>`;
  renderMatchProfile();
  if(matchCtx.customerId && matchCtx.result) renderMatchResult();
}

function renderMatchProfile(){
  const c = matchCtx.customerId = $('#match-cust') ? $('#match-cust').value : '';
  const el = $('#match-profile');
  if(!c){ el.innerHTML = '<div class="empty-tip">选择客户后展示资质摘要</div>'; return; }
  const cu = findCustomer(c);
  const p = cu.personal, e = cu.enterprise;
  el.innerHTML = `
    <div class="match-profile">
      <div class="kv"><span>类型</span><b>${cu.type==='personal'?'个人':'企业'}</b></div>
      <div class="kv"><span>意向</span><b>${esc(cu.intent)}</b></div>
      ${cu.type==='personal'?`
        <div class="kv"><span>年龄</span><b>${p.age}岁</b></div>
        <div class="kv"><span>月收入</span><b>${wan(p.monthlyIncome)}</b></div>
        <div class="kv"><span>负债率</span><b>${p.debtRatio}%</b></div>
        <div class="kv"><span>逾期</span><b>${p.currentOverdue?'<span style="color:var(--danger)">当前逾期</span>':'近两年'+p.overdue2y+'次'}</b></div>
        <div class="kv"><span>房产</span><b>${p.hasHouse?wan(p.houseValue):'无'}</b></div>
        <div class="kv"><span>车辆</span><b>${p.hasCar?wan(p.carValue):'无'}</b></div>
        <div class="kv"><span>社保/公积金</span><b>${p.social?'有':'无'}/${p.provident?'有':'无'}</b></div>`:`
        <div class="kv"><span>行业</span><b>${esc(e.industry)}</b></div>
        <div class="kv"><span>成立年限</span><b>${e.years}年</b></div>
        <div class="kv"><span>月均开票</span><b>${wan(e.monthlyInvoice)}</b></div>
        <div class="kv"><span>年纳税</span><b>${wan(e.yearlyTax)}</b></div>
        <div class="kv"><span>对公月流水</span><b>${wan(e.publicFlow)}</b></div>`}
      <div class="kv"><span>期望额度</span><b>${wan(cu.need.amount)}</b></div>
      <div class="kv"><span>用途</span><b>${esc(cu.need.purpose)}</b></div>
    </div>`;
}

/* ---------- 匹配引擎 ---------- */
function checkHardRules(p, c){
  const h = p.rules.hard, reasons = [];
  if(!customerCateOk(p, c)){ reasons.push('客户类型不符：该产品需以' + (c.type==='personal'?'个人':'企业') + '主体以外的资质申请'); return { ok:false, reasons }; }
  if(c.type==='personal'){
    const x = c.personal;
    if(h.ageMin && x.age < +h.ageMin) reasons.push(`年龄 ${x.age} 岁低于下限 ${h.ageMin} 岁`);
    if(h.ageMax && x.age > +h.ageMax) reasons.push(`年龄 ${x.age} 岁超过上限 ${h.ageMax} 岁`);
    if(x.currentOverdue){
      if(h.creditReq!=='none') reasons.push('当前存在逾期，征信不满足准入');
    } else if(h.creditReq==='no_2y' && (x.overdue2y||0)>0) reasons.push(`近两年有 ${x.overdue2y} 次逾期，要求近两年无逾期`);
    else if(h.creditReq==='lte3' && (x.overdue2y||0)>3) reasons.push(`近两年逾期 ${x.overdue2y} 次，超出 3 次上限`);
    else if(h.creditReq==='no_lian36' && (x.overdue2y||0)>6) reasons.push('近两年逾期累计超 6 次（连三累六禁入）');
    if(h.maxDebt && (x.debtRatio||0) > +h.maxDebt) reasons.push(`负债率 ${x.debtRatio}% 超上限 ${h.maxDebt}%`);
    const hasAny = x.hasHouse || x.hasCar;
    if(h.assetReq==='house' && !x.hasHouse) reasons.push('准入要求名下有房产');
    if(h.assetReq==='car' && !x.hasCar) reasons.push('准入要求名下有车辆');
    if(h.assetReq==='house_or_car' && !hasAny) reasons.push('准入要求房产或车辆任一');
    if(h.assetReq==='house_and_car' && !(x.hasHouse&&x.hasCar)) reasons.push('准入要求房产和车辆均有');
    const so = (x.social?1:0) + (x.provident?1:0);
    if(h.socialReq==='social' && !x.social) reasons.push('准入要求有社保');
    if(h.socialReq==='provident' && !x.provident) reasons.push('准入要求有公积金');
    if(h.socialReq==='either' && so===0) reasons.push('准入要求社保或公积金任一');
    if(h.socialReq==='both' && so<2) reasons.push('准入要求社保和公积金均有');
  } else {
    const x = c.enterprise;
    if(h.yearsMin && (x.years||0) < +h.yearsMin) reasons.push(`成立 ${x.years} 年，未达 ${h.yearsMin} 年要求`);
    if(h.invoiceMin && (x.monthlyInvoice||0) < +h.invoiceMin) reasons.push(`月均开票 ${wan(x.monthlyInvoice)}，未达 ${wan(h.invoiceMin)} 门槛`);
    if(h.taxMin && (x.yearlyTax||0) < +h.taxMin) reasons.push(`年纳税 ${wan(x.yearlyTax)}，未达 ${wan(h.taxMin)} 门槛`);
    if(h.flowMin && (x.publicFlow||0) < +h.flowMin) reasons.push(`对公月流水 ${wan(x.publicFlow)}，未达 ${wan(h.flowMin)} 门槛`);
    if(h.banInd.includes(x.industry)) reasons.push(`行业禁入：${x.industry}`);
  }
  return { ok:reasons.length===0, reasons };
}

function estAmount(p, c){
  let cap = 0;
  if(p.category==='个贷')      cap = ((c.personal||{}).monthlyIncome||0) * 18;
  if(p.category==='房抵贷')    cap = ((c.personal||{}).houseValue||0) * 0.7;
  if(p.category==='车抵贷')    cap = ((c.personal||{}).carValue||0) * 0.8;
  if(p.category==='商户贷')    cap = ((c.enterprise||{}).monthlyInvoice||0) * 6;
  if(p.category==='企业经营贷') cap = Math.max(((c.enterprise||{}).yearlyTax||0)*4, ((c.enterprise||{}).monthlyInvoice||0)*4);
  cap = Math.min(cap, p.amountMax);
  return Math.max(0, Math.round(cap*10)/10);
}

function scoreProduct(p, c){
  let s = 55; const pros = [];
  (p.rules.soft||[]).forEach(r=>{
    const cond = SOFT_CONDITIONS.find(x=>x.key===r.key);
    if(cond && cond.test(c,p)){ s += (+r.score||0); pros.push(cond.label+' +'+r.score); }
  });
  const need = c.need.amount||0, est = estAmount(p,c);
  let amountNote = '';
  if(need && est>=need){ s+=8; amountNote='额度可覆盖需求'; }
  else if(need && est>=need*0.6){ s+=3; amountNote='额度部分覆盖需求，可组合申请'; }
  else if(need){ amountNote='预估额度低于需求，建议搭配其他产品'; }
  s = Math.min(98, Math.round(s));
  return { score:s, pros, amountNote };
}

function computeMatch(c){
  const passed = [], excluded = [];
  state.products.filter(p=>p.status==='active').forEach(p=>{
    const r = checkHardRules(p, c);
    if(r.ok) passed.push(p);
    else excluded.push({ pid:p.id, name:p.name, category:p.category, reasons:r.reasons });
  });
  const results = passed.map(p=>{
    const sc = scoreProduct(p,c);
    return { pid:p.id, name:p.name, category:p.category, score:sc.score, pros:sc.pros, amountNote:sc.amountNote, est:estAmount(p,c) };
  }).sort((a,b)=>b.score-a.score);
  return { results, excluded };
}

function runMatch(){
  if(!matchCtx.customerId){ toast('请先选择客户','err'); return; }
  const c = findCustomer(matchCtx.customerId);
  const { results, excluded } = computeMatch(c);
  results.forEach(r=>{ const p=findProduct(r.pid); if(p) p.counters.matched++; });
  matchCtx.result = {
    time:now(), by:session.name, chosenId:c.chosenProductId||'',
    results, excluded,
    review:{ by:'', time:'', note:'', pinned:[], removed:[] }
  };
  c.matches.push(JSON.parse(JSON.stringify(matchCtx.result)));
  c.updatedAt = now();
  addLog('发起匹配', `客户【${custDisplayName(c)}】完成智能匹配：命中 ${results.length} 款，排除 ${excluded.length} 款`);
  save();
  toast(`匹配完成：命中 ${results.length} 款产品`,'ok');
  renderMatchResult();
  renderMatchProfile();
}

/* ---------- 匹配结果渲染 ---------- */
function renderMatchResult(){
  const el = $('#match-result');
  const c = findCustomer(matchCtx.customerId);
  const m = matchCtx.result;
  if(!c || !m){ el.innerHTML = '<div class="card" style="margin:0"><div class="empty-tip">选择客户并点击「开始匹配」查看推荐方案</div></div>'; return; }

  const pinned = m.review.pinned||[], removed = m.review.removed||[];
  const shown = m.results.filter(r=>!removed.includes(r.pid)).slice()
    .sort((a,b)=>(pinned.includes(b.pid)-pinned.includes(a.pid)) || (b.score-a.score));

  const productOf = pid => findProduct(pid);
  el.innerHTML = `
    <div class="card" style="margin:0">
      <div class="card-title">匹配结果 · ${esc(custDisplayName(c))}
        <span class="sub">命中 ${m.results.length} 款 · 排除 ${m.excluded.length} 款 · ${m.time}</span></div>
      <div class="warn-banner"><b>风险提示：</b>本方案仅为预评估参考，额度与利率为系统估算，最终以银行及持牌机构审核为准。</div>

      ${shown.length ? shown.map((r,i)=>{
        const p = productOf(r.pid); if(!p) return '';
        const isPinned = pinned.includes(r.pid);
        const chosen = m.chosenId===r.pid;
        const lowAmount = r.est>0 && r.est<p.amountMin;
        return `<div class="rec-card ${i===0?'rank-1':''}" style="${isPinned?'border-left-color:#F59E0B;':''}">
          <div class="rec-head">
            <span class="rank-no ${i===0?'top':''}">${i+1}</span>
            <b>${esc(p.name)}</b>
            <span class="tag t-gray">${esc(p.org)}</span>
            <span class="tag t-blue">${p.category}</span>
            ${isPinned?'<span class="pinned-tip">产品经理置顶</span>':''}
            <span class="score-badge">匹配度 ${r.score}%</span>
          </div>
          <div class="rec-attrs">
            <div class="attr"><div class="k">预估可贷额度</div><div class="v"><em>${wan(r.est)}</em>${lowAmount?' <span style="font-size:11px;color:var(--danger)">低于起借额，需评估</span>':''}</div></div>
            <div class="attr"><div class="k">年化利率</div><div class="v">${p.rateMin}% ~ ${p.rateMax}%</div></div>
            <div class="attr"><div class="k">期限</div><div class="v">${p.termMin}~${p.termMax}个月</div></div>
            <div class="attr"><div class="k">还款方式</div><div class="v">${esc(p.repay)}</div></div>
            <div class="attr"><div class="k">放款周期</div><div class="v">约${p.cycleDays}个工作日</div></div>
          </div>
          <div class="rec-lists">
            <div class="adv"><h5>准入优势</h5><ul>${r.pros.length?r.pros.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>满足全部硬性准入条件</li>'}${r.amountNote?`<li>${esc(r.amountNote)}</li>`:''}</ul></div>
            <div class="risk"><h5>风险提示</h5><ul><li>${esc(p.riskNote)}</li><li>预估额度非审批承诺，以银行核定为准</li></ul></div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:8px"><b>需准备资料：</b>${p.materials.map(esc).join('、')}</div>
          <div class="rec-ops">
            ${chosen?'<span class="tag t-green">已设为主推</span>':`<button class="btn btn-primary btn-sm" onclick="chooseMain('${r.pid}')">设为主推产品</button>`}
            ${can('match.review')?`
              <button class="btn btn-ghost btn-sm" onclick="togglePin('${r.pid}')">${isPinned?'取消置顶':'置顶'}</button>
              <button class="btn btn-ghost btn-sm" onclick="toggleRemove('${r.pid}')">移出方案</button>`:''}
          </div>
        </div>`;
      }).join('') : '<div class="empty-tip">无符合准入条件的产品，请查看下方排除原因或调整客户资质</div>'}

      <div style="margin-top:18px">
        <div class="card-title" style="font-size:14px">未通过产品及原因<span class="sub">便于向客户解释</span></div>
        <table class="excl-table"><thead><tr><th style="width:200px">产品</th><th>未通过原因</th></tr></thead>
          <tbody>${m.excluded.length ? m.excluded.map(x=>`<tr>
            <td><b>${esc(x.name)}</b> <span class="tag t-gray">${esc(x.category)}</span></td>
            <td class="excl-reason">${x.reasons.map(esc).join('；')}</td></tr>`).join('')
            : '<tr><td colspan="2" style="text-align:center;color:var(--ok)">全部在售产品均通过硬性准入</td></tr>'}</tbody></table>
      </div>

      ${can('match.review')?`
      <div class="form-section" style="margin-top:16px">
        <h4>产品经理人工复核（高价值客户）</h4>
        <textarea id="review-note" rows="2" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 12px" placeholder="复核意见：如“置顶房抵方案，客户对先息后本接受度高；融e借额度不足，降级推荐”">${esc(m.review.note||'')}</textarea>
        <div class="modal-foot" style="border:none;padding-top:10px;margin-top:8px">
          <button class="btn btn-primary btn-sm" onclick="saveReview()">保存复核意见</button>
        </div>
      </div>`:''}

      <div class="modal-foot" style="border-top:1px solid var(--line)">
        <button class="btn btn-ghost" onclick="printScheme('${c.id}')">⇩ 导出融资方案 PDF</button>
      </div>
    </div>`;
}

function chooseMain(pid){
  const c = findCustomer(matchCtx.customerId);
  matchCtx.result.chosenId = pid;
  c.chosenProductId = pid;
  const last = c.matches[c.matches.length-1];
  if(last && last.time===matchCtx.result.time) last.chosenId = pid;
  if(c.status==='待评估'){
    c.status='方案已出';
    c.statusLog.push({ status:'方案已出', time:now(), by:session.name, note:'匹配完成，选定主推产品：'+((findProduct(pid)||{}).name||'') });
  }
  addLog('选定主推产品', `客户【${custDisplayName(c)}】主推：${(findProduct(pid)||{}).name||''}`);
  save(); toast('已设为主推产品','ok'); renderMatchResult();
}
function togglePin(pid){
  const rv = matchCtx.result.review, i = rv.pinned.indexOf(pid);
  i>=0 ? rv.pinned.splice(i,1) : rv.pinned.push(pid);
  renderMatchResult();
}
function toggleRemove(pid){
  const rv = matchCtx.result.review, i = rv.removed.indexOf(pid);
  i>=0 ? rv.removed.splice(i,1) : rv.removed.push(pid);
  renderMatchResult();
}
function saveReview(){
  const m = matchCtx.result, c = findCustomer(matchCtx.customerId);
  m.review = { by:session.name, time:now(), note:$('#review-note').value.trim(), pinned:m.review.pinned, removed:m.review.removed };
  const last = c.matches[c.matches.length-1];
  if(last && last.time===m.time) last.review = JSON.parse(JSON.stringify(m.review));
  addLog('方案复核', `产品经理复核客户【${custDisplayName(c)}】匹配方案`);
  save(); toast('复核意见已保存','ok');
}

/* ---------- 方案 PDF 导出（打印） ---------- */
function printScheme(custId, matchTime){
  const c = findCustomer(custId); if(!c) return;
  let m = matchCtx.customerId===custId && matchCtx.result ? matchCtx.result : null;
  if(matchTime) m = c.matches.find(x=>x.time===matchTime) || m;
  if(!m && c.matches.length) m = c.matches[c.matches.length-1];
  if(!m){ toast('该客户暂无匹配方案','err'); return; }

  const p = c.personal, e = c.enterprise;
  const removed = (m.review&&m.review.removed)||[];
  const shown = m.results.filter(r=>!removed.includes(r.pid));
  const rows = shown.map((r,i)=>{
    const prod = findProduct(r.pid); if(!prod) return '';
    return `<tr>
      <td style="text-align:center">${i+1}</td>
      <td>${esc(prod.name)}（${esc(prod.org)}）</td>
      <td style="text-align:center">${r.score}%</td>
      <td style="text-align:center">${wan(r.est)}</td>
      <td style="text-align:center">${prod.rateMin}%~${prod.rateMax}%</td>
      <td style="text-align:center">${prod.termMin}~${prod.termMax}个月</td>
      <td style="text-align:center">${esc(prod.repay)}</td>
      <td>${prod.materials.map(esc).join('、')}</td>
    </tr>`;
  }).join('');

  $('#print-area').innerHTML = `
    <div style="max-width:800px;margin:0 auto;font-size:13px;line-height:1.7;color:#000">
      <div style="text-align:center;border-bottom:3px double #333;padding-bottom:12px;margin-bottom:18px">
        <div style="font-size:20px;font-weight:700;letter-spacing:2px">郑州玖臻商务信息咨询有限公司</div>
        <div style="font-size:16px;margin-top:6px">客户融资咨询方案（预评估）</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
        <tr><td style="padding:4px 8px;border:1px solid #999">客户名称</td><td style="border:1px solid #999;padding:4px 8px">${esc(custDisplayName(c))}</td>
            <td style="padding:4px 8px;border:1px solid #999">联系电话</td><td style="border:1px solid #999;padding:4px 8px">${esc(c.phone)}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #999">客户类型</td><td style="border:1px solid #999;padding:4px 8px">${c.type==='personal'?'个人':'企业'}</td>
            <td style="padding:4px 8px;border:1px solid #999">期望额度/期限</td><td style="border:1px solid #999;padding:4px 8px">${wan(c.need.amount)} / ${c.need.term}个月（${esc(c.need.purpose)}）</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #999">资质摘要</td><td colspan="3" style="border:1px solid #999;padding:4px 8px">${
          c.type==='personal'
            ? `${p.age}岁 · 月收入${wan(p.monthlyIncome)} · 负债率${p.debtRatio}% · ${p.currentOverdue?'当前逾期':('近两年逾期'+p.overdue2y+'次')} · ${p.hasHouse?('房产'+wan(p.houseValue)):'无房产'} · ${p.hasCar?('车辆'+wan(p.carValue)):'无车辆'} · 社保${p.social?'有':'无'} 公积金${p.provident?'有':'无'}`
            : `${esc(e.companyName)} · ${esc(e.industry)} · 成立${e.years}年 · 月开票${wan(e.monthlyInvoice)} · 年纳税${wan(e.yearlyTax)} · 对公月流水${wan(e.publicFlow)}`
        }</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #999">方案生成</td><td style="border:1px solid #999;padding:4px 8px">${m.time}</td>
            <td style="padding:4px 8px;border:1px solid #999">经办顾问</td><td style="border:1px solid #999;padding:4px 8px">${esc(m.by)}${m.review?('（复核：'+esc(m.review.by)+'）'):''}</td></tr>
      </table>
      ${m.review&&m.review.note?`<div style="border:1px dashed #999;padding:8px 12px;margin-bottom:14px"><b>产品经理复核意见：</b>${esc(m.review.note)}</div>`:''}
      <table style="width:100%;border-collapse:collapse" cellpadding="0">
        <thead><tr style="background:#f0f0f0">
          <th style="border:1px solid #999;padding:6px">序号</th><th style="border:1px solid #999;padding:6px">推荐产品</th>
          <th style="border:1px solid #999;padding:6px">匹配度</th><th style="border:1px solid #999;padding:6px">预估额度</th>
          <th style="border:1px solid #999;padding:6px">年化利率</th><th style="border:1px solid #999;padding:6px">期限</th>
          <th style="border:1px solid #999;padding:6px">还款方式</th><th style="border:1px solid #999;padding:6px">需准备资料</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="border:1px solid #999;padding:10px;text-align:center">暂无通过准入的产品</td></tr>'}</tbody>
      </table>
      <div style="margin-top:16px;border:1px solid #999;padding:10px 14px;font-size:12px">
        <b>重要提示：</b>
        ① 本方案由融资居间咨询系统预评估生成，仅作业务洽谈参考，<b>不代表任何银行或持牌机构的审批承诺</b>；实际额度、利率、期限以金融机构最终核定为准。
        ② 本公司仅提供融资咨询、方案匹配、资料整理与流程协助等<b>居间服务</b>，不从事资金发放业务，不收取任何形式的“保证放款”费用。
        ③ 客户个人信息仅用于本次融资咨询用途，本公司依法严格保密。
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:13px">
        <span>客户确认签字：＿＿＿＿＿＿＿＿</span><span>日期：＿＿＿＿＿＿＿＿</span>
      </div>
    </div>`;
  window.print();
}

/* =====================================================
 * 页面：跟进与流程
 * ===================================================== */
function renderFollowup(){
  const mine = visibleCustomers();
  const myTasks = state.tasks.filter(t=>can('customer.all')||t.owner===session.username);
  const open = myTasks.filter(t=>!t.done), done = myTasks.filter(t=>t.done);
  const flowCols = CUSTOMER_STATUS;

  $('#page').innerHTML = `
    <div class="card">
      <div class="card-title">任务提醒<span class="sub">待收集资料 / 待回访客户</span></div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px;padding:10px 12px;background:#FAFAFE;border-radius:8px">
        <div class="field" style="width:130px"><label>任务类型</label><select id="nt-type"><option>回访客户</option><option>收集资料</option><option>其他</option></select></div>
        <div class="field" style="width:200px"><label>关联客户</label><select id="nt-cust">${mine.map(c=>`<option value="${c.id}">${esc(custDisplayName(c))}</option>`).join('')}</select></div>
        <div class="field" style="flex:1;min-width:220px"><label>任务内容</label><input id="nt-title" placeholder="如：回访确认方案意向"></div>
        <div class="field" style="width:150px"><label>截止日期</label><input id="nt-due" type="date" value="${today()}"></div>
        <button class="btn btn-primary btn-sm" onclick="addTask()">＋ 添加任务</button>
      </div>
      ${open.map(t=>{
        const c = findCustomer(t.customerId);
        const overdue = t.due < today();
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #F4F4F9">
          <input type="checkbox" onchange="completeTask('${t.id}')">
          <span class="tag ${t.type==='收集资料'?'t-cyan':(t.type==='回访客户'?'t-amber':'t-gray')}">${t.type}</span>
          <div style="flex:1;font-size:13px">${esc(t.title)}<span style="font-size:11.5px;color:var(--muted)"> · ${c?esc(custDisplayName(c)):''}</span></div>
          <span style="font-size:12px;color:${overdue?'var(--danger)':'var(--muted)'}">${t.due}${overdue?' 逾期':''}</span>
        </div>`;
      }).join('') || '<div class="empty-tip">暂无未完成任务</div>'}
      ${done.length?`<div style="margin-top:10px;font-size:12px;color:var(--muted)">已完成 ${done.length} 项</div>`:''}
    </div>

    <div class="card">
      <div class="card-title">业务状态流转<span class="sub">点击卡片查看客户 · 拖动流程见详情页「状态流转」</span></div>
      <div class="kanban">
        ${flowCols.map(s=>{
          const cards = mine.filter(c=>c.status===s);
          const dotColor = { '待评估':'#6B7280','方案已出':'#2563EB','资料收集中':'#D97706','已进件':'#7C3AED','银行审批中':'#0891B2','放款':'#059669','驳回':'#DC2626' }[s];
          return `<div class="kcol">
            <div class="kcol-head"><span><span class="dot" style="background:${dotColor}"></span>${s}</span><span class="cnt">${cards.length}</span></div>
            ${cards.map(c=>`<div class="kcard" onclick="openCustomerDetail('${c.id}')">
              <b>${esc(custDisplayName(c))}</b>
              <div class="meta"><span>${wan(c.need.amount)}</span><span>${c.chosenProductId?esc((findProduct(c.chosenProductId)||{}).name||''):''}</span></div>
              ${s==='驳回'&&c.rejectReason?`<div style="font-size:11px;color:var(--danger);margin-top:4px;line-height:1.5">${esc(c.rejectReason.slice(0,26))}…</div>`:''}
            </div>`).join('') || '<div style="text-align:center;font-size:11px;color:#C4C6D0;padding:14px 0">空</div>'}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
function addTask(){
  const title = $('#nt-title').value.trim();
  if(!title){ toast('请填写任务内容','err'); return; }
  state.tasks.unshift({ id:uid('t'), type:$('#nt-type').value, customerId:$('#nt-cust').value, title, due:$('#nt-due').value||today(), done:false, owner:session.username });
  addLog('新建任务', title);
  save(); toast('任务已添加','ok'); renderFollowup();
}

/* =====================================================
 * 页面：数据看板
 * ===================================================== */
let anaRange = 0; // 0 全部 / 7 / 30 天
function renderAnalytics(){
  const cutoff = anaRange ? D(anaRange) : '0000-00-00';
  const scoped = anaRange===0 ? state.customers : state.customers.filter(c=>c.createdAt.slice(0,10)>=cutoff);
  const total = scoped.length;
  const matchedN = scoped.filter(c=>c.matches.length).length;
  const schemeN = scoped.filter(c=>c.status!=='待评估').length;
  const submitN = scoped.filter(c=>['已进件','银行审批中','放款','驳回'].includes(c.status)).length;
  const loanN = scoped.filter(c=>c.status==='放款').length;
  const maxMatch = Math.max(1, ...state.products.map(p=>p.counters.matched));

  const empStats = {};
  scoped.forEach(c=>{
    const o = c.owner;
    empStats[o] = empStats[o] || { total:0, scheme:0, submit:0, loan:0 };
    empStats[o].total++;
    if(c.status!=='待评估') empStats[o].scheme++;
    if(['已进件','银行审批中','放款','驳回'].includes(c.status)) empStats[o].submit++;
    if(c.status==='放款') empStats[o].loan++;
  });
  const flow = CUSTOMER_STATUS.map(s=>({ s, n:scoped.filter(c=>c.status===s).length }));
  const maxFlow = Math.max(1, ...flow.map(f=>f.n));

  $('#page').innerHTML = `
    <div class="filter-bar">
      <span style="font-size:13px;color:var(--muted)">统计范围：</span>
      <select onchange="anaRange=+this.value;renderAnalytics()">
        <option value="0" ${anaRange===0?'selected':''}>全部时间</option>
        <option value="7" ${anaRange===7?'selected':''}>近 7 天</option>
        <option value="30" ${anaRange===30?'selected':''}>近 30 天</option>
      </select>
      <div class="spacer"></div>
      ${can('analytics.export')?'<button class="btn btn-ghost btn-sm" onclick="exportReport()">⇩ 导出报表 CSV</button>':''}
    </div>

    <div class="stat-grid">
      ${statCard('◉','#7C3AED', total, '客户总数')}
      ${statCard('⚡','#2563EB', matchedN, '已匹配客户')}
      ${statCard('▣','#0891B2', submitN, '已进件')}
      ${statCard('✓','#059669', loanN, '放款成功')}
      ${statCard('%','#D97706', matchedN?pct(loanN/submitN||0):'—', '放款成功率（放款/进件）')}
      ${statCard('↑','#7C3AED', matchedN?pct(schemeN/matchedN||0):'—', '方案转化率（出方案/已匹配）')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="ana-grid">
      <div class="card" style="margin:0">
        <div class="card-title">客户漏斗（按当前状态分布）</div>
        ${flow.map(f=>`<div class="hbar-row">
          <span class="lbl">${f.s}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(f.n/maxFlow*100)}%"></div></div>
          <span class="val">${f.n}</span></div>`).join('')}
      </div>
      <div class="card" style="margin:0">
        <div class="card-title">产品命中排行（累计匹配次数）<span class="sub">全周期</span></div>
        ${state.products.slice().sort((a,b)=>b.counters.matched-a.counters.matched).slice(0,8).map(p=>`
          <div class="hbar-row"><span class="lbl" title="${esc(p.name)}">${esc(p.name)}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${Math.round(p.counters.matched/maxMatch*100)}%"></div></div>
            <span class="val">${p.counters.matched}</span></div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">产品维度业务数据</div>
      <div class="table-wrap"><table>
        <thead><tr><th>产品</th><th>机构</th><th>匹配次数</th><th>进件量</th><th>放款量</th><th>放款成功率</th><th>状态</th></tr></thead>
        <tbody>${state.products.map(p=>`<tr>
          <td><b>${esc(p.name)}</b></td><td>${esc(p.org)}</td>
          <td>${p.counters.matched}</td><td>${p.counters.submit}</td><td>${p.counters.loan}</td>
          <td>${p.counters.submit?pct(p.counters.loan/p.counters.submit):'—'}</td>
          <td>${p.status==='active'?'<span class="tag t-green">在售</span>':'<span class="tag t-gray">下架</span>'}</td>
        </tr>`).join('')}</tbody></table></div>
    </div>

    <div class="card">
      <div class="card-title">员工维度转化数据</div>
      <div class="table-wrap"><table>
        <thead><tr><th>销售顾问</th><th>客户数</th><th>出方案</th><th>已进件</th><th>放款</th><th>方案转化率</th></tr></thead>
        <tbody>${Object.entries(empStats).map(([o,s])=>{
          const u = state.users.find(x=>x.username===o);
          return `<tr><td><b>${u?esc(u.name):o}</b></td><td>${s.total}</td><td>${s.scheme}</td><td>${s.submit}</td><td>${s.loan}</td>
            <td>${s.total?pct(s.scheme/s.total):'—'}</td></tr>`;
        }).join('') || '<tr><td colspan="6" class="empty-tip">所选时间范围内暂无数据</td></tr>'}</tbody></table></div>
    </div>`;
}

function exportReport(){
  const rows = [['产品名称','机构','大类','匹配次数','进件量','放款量','放款成功率','状态']];
  state.products.forEach(p=>rows.push([p.name,p.org,p.category,p.counters.matched,p.counters.submit,p.counters.loan, p.counters.submit?Math.round(p.counters.loan/p.counters.submit*100)+'%':'-', p.status==='active'?'在售':'下架']));
  rows.push([]);
  rows.push(['客户名称','类型','期望额度(万)','状态','主推产品','跟进人','录入时间']);
  state.customers.forEach(c=>rows.push([custDisplayName(c), c.type==='personal'?'个人':'企业', c.need.amount, c.status, c.chosenProductId?((findProduct(c.chosenProductId)||{}).name||''):'', c.owner, c.createdAt]));
  const csv = '\uFEFF' + rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `玖臻业务报表_${today()}.csv`;
  a.click();
  addLog('导出报表', '导出业务数据 CSV');
  save(); toast('报表已导出','ok');
}

/* =====================================================
 * 页面：系统管理
 * ===================================================== */
function renderSystem(){
  const isAdmin = can('system');
  if(isAdmin){
    $('#page').innerHTML = `
      <div class="card">
        <div class="card-title">账号管理
          <button class="btn btn-primary btn-sm" onclick="openUserForm()">＋ 新增账号</button></div>
        <table><thead><tr><th>姓名</th><th>账号</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${state.users.map(u=>`<tr>
            <td><b>${esc(u.name)}</b></td><td>${esc(u.username)}</td>
            <td><span class="tag ${u.role==='admin'?'t-gray':(u.role==='pm'?'t-purple':'t-blue')}">${ROLES[u.role]}</span></td>
            <td>${u.active?'<span class="tag t-green">启用</span>':'<span class="tag t-red">停用</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn-link" onclick="openUserForm('${u.id}')">编辑</button>
              <button class="btn-link" onclick="toggleUser('${u.id}')">${u.active?'停用':'启用'}</button>
              ${u.username!==session.username?`<button class="btn-link danger" onclick="delUser('${u.id}')">删除</button>`:''}
            </td></tr>`).join('')}</tbody></table>
        <p style="font-size:12px;color:var(--muted);margin-top:10px">权限说明：金融产品经理＝产品库全权限＋方案复核＋全量数据；销售顾问＝客户录入/匹配/仅见自己客户，不可编辑产品库；管理员＝账号与权限分配。</p>
      </div>
      <div class="card">
        <div class="card-title">登录日志</div>
        <table><thead><tr><th>时间</th><th>用户</th></tr></thead>
          <tbody>${state.loginLogs.slice(0,20).map(l=>`<tr><td>${l.time}</td><td>${esc(l.user)}</td></tr>`).join('')}</tbody></table>
      </div>
      ${systemLogCard()}
      <div class="card">
        <div class="card-title">数据管理</div>
        <button class="btn btn-danger btn-sm" onclick="resetDemo()">重置演示数据</button>
        <span style="font-size:12px;color:var(--muted);margin-left:10px">恢复到初始演示状态，清空所有本地修改</span>
      </div>`;
  } else {
    $('#page').innerHTML = `
      ${systemLogCard()}
      <div class="card">
        <div class="card-title">登录日志（最近）</div>
        <table><thead><tr><th>时间</th><th>用户</th></tr></thead>
          <tbody>${state.loginLogs.slice(0,20).map(l=>`<tr><td>${l.time}</td><td>${esc(l.user)}</td></tr>`).join('')}</tbody></table>
      </div>`;
  }
}
function systemLogCard(){
  return `<div class="card">
    <div class="card-title">操作日志<span class="sub">谁在什么时候做了什么 · 最近 50 条</span></div>
    <div class="table-wrap"><table><thead><tr><th style="width:150px">时间</th><th style="width:90px">操作人</th><th style="width:120px">角色</th><th style="width:120px">动作</th><th>详情</th></tr></thead>
      <tbody>${state.logs.slice(0,50).map(l=>`<tr>
        <td style="font-size:12px;color:var(--muted)">${l.time}</td><td>${esc(l.user)}</td>
        <td><span class="tag t-gray">${esc(l.role)}</span></td><td>${esc(l.action)}</td>
        <td style="font-size:12.5px">${esc(l.detail)}</td></tr>`).join('')}</tbody></table></div>
  </div>`;
}
function openUserForm(id){
  const u = id ? state.users.find(x=>x.id===id) : null;
  openModal(u?`编辑账号 · ${esc(u.name)}`:'新增账号', `
    <div class="form-grid">
      <div class="field"><label>姓名<span class="req">*</span></label><input id="uf-name" value="${u?esc(u.name):''}"></div>
      <div class="field"><label>登录账号<span class="req">*</span></label><input id="uf-username" value="${u?esc(u.username):''}" ${u?'disabled':''}></div>
      <div class="field"><label>角色</label><select id="uf-role">${Object.entries(ROLES).map(([v,l])=>`<option value="${v}" ${u&&u.role===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>密码 ${u?'（留空则不修改）':'<span class="req">*</span>'}</label><input id="uf-pass" type="password" value=""></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="saveUserForm('${id||''}')">保存</button>
    </div>`, '520px');
}
function saveUserForm(id){
  const name = $('#uf-name').value.trim();
  if(!name){ toast('请填写姓名','err'); return; }
  if(id){
    const u = state.users.find(x=>x.id===id);
    u.name = name; u.role = $('#uf-role').value;
    const pass = $('#uf-pass').value;
    if(pass) u.password = pass;
    addLog('账号管理', `编辑账号【${name}】`);
  } else {
    const username = $('#uf-username').value.trim(), pass = $('#uf-pass').value;
    if(!username || !pass){ toast('请填写账号与密码','err'); return; }
    if(state.users.some(u=>u.username===username)){ toast('账号已存在','err'); return; }
    state.users.push({ id:uid('u'), name, username, password:pass, role:$('#uf-role').value, active:true });
    addLog('账号管理', `新增账号【${name}】（${username}）`);
  }
  save(); closeModal(); toast('已保存','ok'); renderSystem();
}
function toggleUser(id){
  const u = state.users.find(x=>x.id===id);
  u.active = !u.active;
  addLog('账号管理', `${u.active?'启用':'停用'}账号【${u.name}】`);
  save(); renderSystem();
}
function delUser(id){
  const u = state.users.find(x=>x.id===id);
  confirmBox(`确认删除账号「${esc(u.name)}」？该操作不可恢复。`, ()=>{
    state.users = state.users.filter(x=>x.id!==id);
    addLog('账号管理', `删除账号【${u.name}】`);
    save(); toast('已删除','ok'); renderSystem();
  }, true);
}
function resetDemo(){
  confirmBox('将清空全部本地数据并恢复到初始演示状态，确认继续？', ()=>{
    localStorage.removeItem(STATE_KEY);
    location.reload();
  }, true);
}

/* =====================================================
 * 产品版本历史（供产品库调用）
 * ===================================================== */
function openVersionHistory(id){
  const p = findProduct(id); if(!p) return;
  openModal(`版本历史 · ${esc(p.name)}`, `
    <table><thead><tr><th>版本</th><th>时间</th><th>操作人</th><th>变更说明</th><th>操作</th></tr></thead>
      <tbody>${p.versions.slice().reverse().map(v=>`<tr>
        <td><b>v${v.v}</b>${v.v===p.version?' <span class="tag t-green">当前</span>':''}</td>
        <td style="font-size:12px">${v.time}</td><td>${esc(v.by)}</td>
        <td style="font-size:12.5px">${esc(v.log)}</td>
        <td>${v.v!==p.version?`<button class="btn-link" onclick="rollbackVersion('${id}',${v.v})">回滚至此版本</button>`:''}</td>
      </tr>`).join('')}</tbody></table>`, '640px');
}
function rollbackVersion(id, v){
  const p = findProduct(id);
  const ver = p.versions.find(x=>x.v===v); if(!ver) return;
  confirmBox(`确认回滚至 v${v}？将<strong>新建版本</strong>记录本次回滚，不覆盖历史。`, ()=>{
    const snap = ver.snapshot;
    if(snap){
      Object.assign(p, snap.core);
      p.rules = JSON.parse(JSON.stringify(snap.rules));
    }
    p.version += 1;
    p.versions.push({ v:p.version, time:now(), by:session.name, log:`回滚至 v${v} 版本内容` });
    p.updatedAt = now();
    addLog('版本回滚', `【${p.name}】回滚至 v${v}，当前 v${p.version}`);
    save(); closeModal(); toast(`已回滚，当前版本 v${p.version}`,'ok'); renderProducts();
  });
}

/* =====================================================
 * 初始化
 * ===================================================== */
(function init(){
  try{ const raw = localStorage.getItem(STATE_KEY); if(raw) state = JSON.parse(raw); }catch(e){ state = null; }
  if(!state || !state.users){ state = buildSeed(); save(); }
  $('#login-btn').addEventListener('click', ()=>login($('#login-user').value.trim(), $('#login-pass').value));
  $('#login-pass').addEventListener('keydown', e=>{ if(e.key==='Enter') login($('#login-user').value.trim(), $('#login-pass').value); });
  $$('#login-screen .login-quick button').forEach(b=>{
    b.addEventListener('click', ()=>{ $('#login-user').value = b.dataset.u; $('#login-pass').value='123456'; login(b.dataset.u,'123456'); });
  });
})();
