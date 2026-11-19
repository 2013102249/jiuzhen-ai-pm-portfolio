/* =====================================================
 * 玖臻融资咨询匹配平台 - 常量与种子数据
 * ===================================================== */

const STATE_KEY = 'jiuzhen_platform_v1';

/* ---------- 日期工具（种子数据相对时间，保证演示数据常新） ---------- */
function D(n){ const d = new Date(Date.now() - n * 86400000); const p = x => String(x).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function DT(n){ const d = new Date(Date.now() - n * 86400000); const p = x => String(x).padStart(2,'0'); return `${D(n)} ${p(d.getHours())}:${p(d.getMinutes())}`; }

/* ---------- 业务常量 ---------- */
const CATEGORIES = ['个贷','房抵贷','车抵贷','商户贷','企业经营贷'];
const INDUSTRIES = ['批发零售','建筑工程','制造业','信息技术','住宿餐饮','交通运输','房地产','金融','娱乐休闲','教育培训','医疗健康','农林牧渔','其他'];
const CUSTOMER_STATUS = ['待评估','方案已出','资料收集中','已进件','银行审批中','放款','驳回'];
const SOURCES = ['电话开发','转介绍','线上广告','门店来访','老客户复购','其他'];
const INTENTS = ['高','中','低'];
const PURPOSES = ['经营周转','装修','购车','日常消费','教育','医疗','其他'];
const REPAY_METHODS = ['等额本息','等额本金','先息后本','随借随还'];
const ROLES = { admin:'管理员', pm:'金融产品经理', sales:'销售顾问' };

const CREDIT_REQ = [
  { v:'none',       label:'无特别要求' },
  { v:'no_current', label:'无当前逾期' },
  { v:'no_2y',      label:'近两年无逾期' },
  { v:'lte3',       label:'近两年逾期≤3次' },
  { v:'no_lian36',  label:'无连三累六（累计≤6次）' }
];
const ASSET_REQ = [
  { v:'none',          label:'无要求' },
  { v:'house',         label:'需名下房产' },
  { v:'car',           label:'需名下车辆' },
  { v:'house_or_car',  label:'房产或车辆任一' },
  { v:'house_and_car', label:'房产和车辆均有' }
];
const SOCIAL_REQ = [
  { v:'none',      label:'无要求' },
  { v:'social',    label:'需社保' },
  { v:'provident', label:'需公积金' },
  { v:'either',    label:'社保或公积金任一' },
  { v:'both',      label:'社保和公积金均有' }
];

/* 软性加分规则目录：test(客户, 产品) 返回 boolean */
const SOFT_CONDITIONS = [
  { key:'noOverdue',  label:'征信良好（无任何逾期）', scope:'personal',   test:(c)=>c.personal && !c.personal.currentOverdue && (c.personal.overdue2y||0)===0 },
  { key:'lowDebt',    label:'负债率低于30%',          scope:'personal',   test:(c)=>c.personal && (c.personal.debtRatio||0) < 30 },
  { key:'hasHouse',   label:'名下有房产',             scope:'personal',   test:(c)=>c.personal && c.personal.hasHouse },
  { key:'hasCar',     label:'名下有车辆',             scope:'personal',   test:(c)=>c.personal && c.personal.hasCar },
  { key:'hasSocial',  label:'有社保',                 scope:'personal',   test:(c)=>c.personal && c.personal.social },
  { key:'hasProvident',label:'有公积金',              scope:'personal',   test:(c)=>c.personal && c.personal.provident },
  { key:'highIncome', label:'月收入≥2万',             scope:'personal',   test:(c)=>c.personal && (c.personal.monthlyIncome||0) >= 2 },
  { key:'invoiceHigh',label:'月开票达门槛2倍',        scope:'enterprise', test:(c,p)=>c.enterprise && p.rules.hard.invoiceMin>0 && (c.enterprise.monthlyInvoice||0) >= p.rules.hard.invoiceMin*2 },
  { key:'taxHigh',    label:'年纳税≥10万',            scope:'enterprise', test:(c)=>c.enterprise && (c.enterprise.yearlyTax||0) >= 10 },
  { key:'flowHigh',   label:'对公月流水≥50万',        scope:'enterprise', test:(c)=>c.enterprise && (c.enterprise.publicFlow||0) >= 50 },
  { key:'yearsHigh',  label:'成立年限≥5年',           scope:'enterprise', test:(c)=>c.enterprise && (c.enterprise.years||0) >= 5 }
];

/* ---------- 种子数据构建 ---------- */
function buildSeed(){
  const by = '陈明';

  /* 产品工厂 */
  function P(id, name, org, category, base, hardP, hardE, soft, cnt){
    return {
      id, name, org, category,
      amountMin:base.am, amountMax:base.ax,
      rateMin:base.rmin, rateMax:base.rmax,
      termMin:base.tmin, termMax:base.tmax,
      repay:base.repay, cycleDays:base.cycle,
      materials:base.materials, process:base.process,
      riskNote:base.risk || '额度、利率以银行最终审批为准。',
      rules:{ hard:Object.assign({ageMin:'',ageMax:'',creditReq:'none',maxDebt:'',assetReq:'none',socialReq:'none',yearsMin:'',invoiceMin:'',taxMin:'',flowMin:'',banInd:[]}, hardP, hardE), soft },
      status:'active', version:1,
      versions:[{ v:1, time:DT(30), by, log:'初始版本录入' }],
      counters:cnt || { matched:0, submit:0, loan:0 },
      createdAt:DT(30), updatedAt:DT(3)
    };
  }

  const products = [
    P('p101','中原消费贷','中原银行','个贷',
      { am:1, ax:30, rmin:3.6, rmax:7.2, tmin:12, tmax:36, repay:'等额本息/先息后本', cycle:3,
        materials:['身份证','个人征信报告','收入证明或代发工资流水','社保/公积金缴存证明'],
        process:['扫码预审','线下面签','银行审批','签约放款'],
        risk:'近期征信查询次数过多可能影响授信；额度以银行审批为准。' },
      { ageMin:22, ageMax:55, creditReq:'no_current', maxDebt:70, assetReq:'none', socialReq:'either' }, {},
      [{key:'noOverdue',score:8},{key:'hasProvident',score:6},{key:'lowDebt',score:5}],
      { matched:15, submit:4, loan:3 }),

    P('p102','薪金贷','郑州银行','个贷',
      { am:2, ax:50, rmin:4.0, rmax:8.0, tmin:12, tmax:60, repay:'等额本息', cycle:5,
        materials:['身份证','征信报告','工资流水（近6个月）','工作证明'],
        process:['线上申请','银行电核','审批','放款'],
        risk:'代发工资需满足连续6个月以上。' },
      { ageMin:22, ageMax:58, creditReq:'lte3', maxDebt:65, assetReq:'none', socialReq:'either' }, {},
      [{key:'noOverdue',score:6},{key:'hasSocial',score:5},{key:'lowDebt',score:4}],
      { matched:8, submit:2, loan:1 }),

    P('p103','融e借','工商银行','个贷',
      { am:1, ax:80, rmin:3.4, rmax:6.0, tmin:12, tmax:60, repay:'等额本息/先息后本', cycle:3,
        materials:['身份证','征信报告','公积金/社保缴存记录','收入证明'],
        process:['手机银行测额','线下签约','审批','放款'],
        risk:'对征信要求较高，白户、小逾期均可能被拒；利率以审批为准。' },
      { ageMin:22, ageMax:60, creditReq:'no_2y', maxDebt:60, assetReq:'none', socialReq:'either' }, {},
      [{key:'noOverdue',score:10},{key:'hasProvident',score:8},{key:'highIncome',score:6},{key:'lowDebt',score:5}],
      { matched:18, submit:6, loan:4 }),

    P('p104','宅抵贷','平安银行','房抵贷',
      { am:20, ax:500, rmin:3.85, rmax:6.5, tmin:60, tmax:240, repay:'等额本息/先息后本', cycle:10,
        materials:['身份证','户口本','婚姻证明','房产证','征信报告','收入流水','用途合同'],
        process:['房产评估','线下面签','银行审批','抵押登记','放款'],
        risk:'需房产评估价7成以内；房龄、区域影响成数；抵押登记周期约5-7个工作日。' },
      { ageMin:25, ageMax:60, creditReq:'no_current', maxDebt:80, assetReq:'house', socialReq:'none' }, {},
      [{key:'noOverdue',score:8},{key:'lowDebt',score:6},{key:'highIncome',score:5}],
      { matched:9, submit:3, loan:2 }),

    P('p105','抵押快贷','建设银行','房抵贷',
      { am:10, ax:300, rmin:3.9, rmax:6.8, tmin:36, tmax:120, repay:'等额本息', cycle:7,
        materials:['身份证','房产证','征信报告','收入流水','经营/用途证明'],
        process:['评估预审','面签','审批','抵押放款'],
        risk:'仅受理住宅类抵押；征信当前逾期禁入。' },
      { ageMin:25, ageMax:60, creditReq:'lte3', maxDebt:75, assetReq:'house', socialReq:'none' }, {},
      [{key:'noOverdue',score:6},{key:'lowDebt',score:5}],
      { matched:6, submit:2, loan:1 }),

    P('p106','车主贷','平安银行','车抵贷',
      { am:3, ax:100, rmin:8.0, rmax:15.0, tmin:12, tmax:48, repay:'等额本息', cycle:2,
        materials:['身份证','驾驶证','车辆登记证','车辆评估照片','征信报告'],
        process:['车辆评估','GPS安装/抵押登记','审批','放款'],
        risk:'车辆评估价需≥5万；利率偏高，建议优先推荐信用类产品；按评估价8成以内放款。' },
      { ageMin:22, ageMax:60, creditReq:'no_current', maxDebt:85, assetReq:'car', socialReq:'none' }, {},
      [{key:'noOverdue',score:6},{key:'hasCar',score:4}],
      { matched:7, submit:2, loan:1 }),

    P('p107','商户贷','中原银行','商户贷',
      { am:5, ax:100, rmin:4.5, rmax:9.0, tmin:12, tmax:36, repay:'先息后本/等额本息', cycle:5,
        materials:['营业执照','身份证','经营流水','征信报告','租赁合同'],
        process:['预审','实地尽调','审批','放款'],
        risk:'个体工商户及小微商户适用；实际经营需与执照经营范围一致。' },
      {}, { yearsMin:1, invoiceMin:5, taxMin:0, flowMin:0, banInd:['娱乐休闲'] },
      [{key:'invoiceHigh',score:8},{key:'yearsHigh',score:5},{key:'noOverdue',score:6}],
      { matched:8, submit:3, loan:2 }),

    P('p108','商超快贷','郑州银行','商户贷',
      { am:3, ax:50, rmin:5.0, rmax:10.0, tmin:6, tmax:24, repay:'等额本息', cycle:4,
        materials:['营业执照','身份证','近3个月经营流水','征信报告'],
        process:['线上申请','审批','放款'],
        risk:'额度偏低，适合小额周转；批发零售、住宿餐饮类商户优先。' },
      {}, { yearsMin:1, invoiceMin:3, taxMin:0, flowMin:0, banInd:['娱乐休闲','金融'] },
      [{key:'invoiceHigh',score:6},{key:'yearsHigh',score:4}],
      { matched:5, submit:1, loan:1 }),

    P('p109','云税贷','建设银行','企业经营贷',
      { am:10, ax:300, rmin:3.9, rmax:7.5, tmin:12, tmax:36, repay:'先息后本/等额本息', cycle:6,
        materials:['营业执照','法人身份证','企业征信报告','法人征信报告','纳税证明','对公流水'],
        process:['税务授权测额','线下开户面签','审批','对公户放款'],
        risk:'需企业正常纳税满2年；纳税等级B级以上通过率更高；企业征信异常禁入。' },
      {}, { yearsMin:2, invoiceMin:0, taxMin:2, flowMin:0, banInd:['房地产','金融','娱乐休闲'] },
      [{key:'taxHigh',score:10},{key:'invoiceHigh',score:6},{key:'yearsHigh',score:5}],
      { matched:12, submit:5, loan:3 }),

    P('p110','纳税e贷','农业银行','企业经营贷',
      { am:10, ax:100, rmin:4.0, rmax:8.0, tmin:12, tmax:24, repay:'等额本息', cycle:5,
        materials:['营业执照','法人身份证','纳税证明','征信报告'],
        process:['线上测额','面签','审批','放款'],
        risk:'年纳税1万以下额度有限；行业禁入名单以银行最新政策为准。' },
      {}, { yearsMin:2, invoiceMin:0, taxMin:1, flowMin:0, banInd:['房地产','金融','娱乐休闲'] },
      [{key:'taxHigh',score:8},{key:'yearsHigh',score:4}],
      { matched:9, submit:3, loan:2 }),

    P('p111','票易贷','招商银行','企业经营贷',
      { am:20, ax:500, rmin:4.5, rmax:9.0, tmin:6, tmax:24, repay:'先息后本', cycle:7,
        materials:['营业执照','法人身份证','增值税开票数据（授权）','企业征信','对公流水'],
        process:['发票授权测额','面签','审批','放款'],
        risk:'依托开票数据授信；开票波动大、断票超3个月将影响额度。' },
      {}, { yearsMin:2, invoiceMin:30, taxMin:0, flowMin:0, banInd:['娱乐休闲','金融'] },
      [{key:'invoiceHigh',score:10},{key:'flowHigh',score:6}],
      { matched:6, submit:2, loan:1 })
  ];

  /* 客户 */
  const customers = [
    {
      id:'c101', type:'personal', name:'王强', phone:'138****6621',
      source:'转介绍', intent:'高', status:'放款', owner:'sales',
      personal:{ age:35, occupation:'企业职员', monthlyIncome:1.5, overdue2y:0, currentOverdue:false, debtRatio:35, hasHouse:true, houseValue:120, hasCar:false, carValue:'', social:true, provident:true },
      enterprise:null,
      need:{ amount:30, term:36, purpose:'装修' },
      chosenProductId:'p103',
      followUps:[
        { time:DT(18), by:'李晓', content:'客户确认装修合同已签，接受36期方案，已提交全套资料。' },
        { time:DT(22), by:'李晓', content:'面签完成，银行已受理，客户对接顺畅。' }
      ],
      matches:[{ time:DT(24), by:'李晓', chosenId:'p103', review:null,
        results:[{pid:'p103',score:92,est:27},{pid:'p101',score:84,est:27},{pid:'p102',score:79,est:27},{pid:'p104',score:76,est:84}],
        excluded:[
          {pid:'p106',name:'车主贷',reasons:['利率显著偏高（8%-15%），客户资质可支持更低成本产品']},
          {pid:'p107',name:'商户贷',reasons:['客户类型不符：企业类产品需以企业主体申请']},
          {pid:'p109',name:'云税贷',reasons:['客户类型不符：企业类产品需以企业主体申请']}
        ] }],
      statusLog:[
        { status:'待评估',   time:DT(26), by:'李晓', note:'录入客户档案' },
        { status:'方案已出', time:DT(24), by:'李晓', note:'匹配完成，主推工行融e借' },
        { status:'资料收集中',time:DT(23), by:'李晓', note:'' },
        { status:'已进件',   time:DT(20), by:'李晓', note:'提交工商银行融e借' },
        { status:'银行审批中',time:DT(19), by:'李晓', note:'' },
        { status:'放款',     time:DT(17), by:'李晓', note:'放款27万，36期等额本息' }
      ],
      rejectReason:'', createdAt:DT(26), updatedAt:DT(17)
    },
    {
      id:'c102', type:'personal', name:'李娜', phone:'186****3389',
      source:'线上广告', intent:'中', status:'待评估', owner:'sales',
      personal:{ age:28, occupation:'销售', monthlyIncome:0.8, overdue2y:2, currentOverdue:false, debtRatio:55, hasHouse:false, houseValue:'', hasCar:true, carValue:12, social:true, provident:false },
      enterprise:null,
      need:{ amount:5, term:24, purpose:'日常消费' },
      chosenProductId:'',
      followUps:[ { time:DT(2), by:'李晓', content:'客户有2次小额逾期，先沟通解释征信影响，约明日拉详版征信。' } ],
      matches:[],
      statusLog:[ { status:'待评估', time:DT(2), by:'李晓', note:'录入客户档案' } ],
      rejectReason:'', createdAt:DT(2), updatedAt:DT(2)
    },
    {
      id:'c103', type:'enterprise', name:'郑州宏图商贸有限公司', phone:'139****8807',
      source:'老客户复购', intent:'高', status:'已进件', owner:'zhou',
      personal:null,
      enterprise:{ companyName:'郑州宏图商贸有限公司', industry:'批发零售', years:5, monthlyInvoice:85, yearlyTax:12, publicFlow:60, legalPerson:'张宏图', legalAge:42, employees:15 },
      need:{ amount:150, term:24, purpose:'经营周转' },
      chosenProductId:'p109',
      followUps:[
        { time:DT(5), by:'周洁', content:'纳税授权已完成，云税贷测额180万，客户接受，约本周面签。' },
        { time:DT(9), by:'周洁', content:'企业开票稳定，年纳税12万，优先推云税贷+票易贷组合。' }
      ],
      matches:[{ time:DT(9), by:'周洁', chosenId:'p109', review:null,
        results:[{pid:'p109',score:94,est:150},{pid:'p111',score:88,est:300},{pid:'p110',score:80,est:100}],
        excluded:[] }],
      statusLog:[
        { status:'待评估',   time:DT(10), by:'周洁', note:'录入企业档案' },
        { status:'方案已出', time:DT(9),  by:'周洁', note:'主推建行云税贷' },
        { status:'资料收集中',time:DT(7),  by:'周洁', note:'收集纳税证明、对公流水' },
        { status:'已进件',   time:DT(5),  by:'周洁', note:'建行云税贷进件180万' }
      ],
      rejectReason:'', createdAt:DT(10), updatedAt:DT(5)
    },
    {
      id:'c104', type:'personal', name:'张伟', phone:'155****2077',
      source:'门店来访', intent:'高', status:'方案已出', owner:'zhou',
      personal:{ age:45, occupation:'个体经营者', monthlyIncome:2.5, overdue2y:0, currentOverdue:false, debtRatio:20, hasHouse:true, houseValue:260, hasCar:true, carValue:30, social:true, provident:false },
      enterprise:null,
      need:{ amount:100, term:60, purpose:'经营周转' },
      chosenProductId:'p104',
      followUps:[ { time:DT(3), by:'周洁', content:'已出房抵方案，客户对比中，重点强调先息后本降低月供压力，明日回访。' } ],
      matches:[{ time:DT(3), by:'周洁', chosenId:'p104', review:null,
        results:[{pid:'p104',score:93,est:182},{pid:'p105',score:85,est:182},{pid:'p103',score:78,est:45}],
        excluded:[{pid:'p106',name:'车主贷',reasons:['额度需求超出产品上限，资金缺口过大']}] }],
      statusLog:[
        { status:'待评估',   time:DT(5), by:'周洁', note:'录入客户档案' },
        { status:'方案已出', time:DT(3), by:'周洁', note:'主推平安宅抵贷，预估可贷182万' }
      ],
      rejectReason:'', createdAt:DT(5), updatedAt:DT(3)
    },
    {
      id:'c105', type:'enterprise', name:'河南锦程建筑劳务有限公司', phone:'135****5123',
      source:'电话开发', intent:'中', status:'驳回', owner:'zhou',
      personal:null,
      enterprise:{ companyName:'河南锦程建筑劳务有限公司', industry:'建筑工程', years:3, monthlyInvoice:40, yearlyTax:3, publicFlow:25, legalPerson:'刘锦', legalAge:38, employees:22 },
      need:{ amount:60, term:12, purpose:'经营周转' },
      chosenProductId:'p109',
      followUps:[ { time:DT(8), by:'周洁', content:'银行反馈法人征信当前有逾期，建议结清并养护3个月后重新进件。' } ],
      matches:[{ time:DT(14), by:'周洁', chosenId:'p109', review:null,
        results:[{pid:'p109',score:82,est:60},{pid:'p110',score:80,est:60}],
        excluded:[{pid:'p111',name:'票易贷',reasons:['月均开票未达30万门槛']}] }],
      statusLog:[
        { status:'待评估',   time:DT(16), by:'周洁', note:'录入企业档案' },
        { status:'方案已出', time:DT(14), by:'周洁', note:'' },
        { status:'资料收集中',time:DT(13), by:'周洁', note:'' },
        { status:'已进件',   time:DT(12), by:'周洁', note:'云税贷进件60万' },
        { status:'银行审批中',time:DT(11), by:'周洁', note:'' },
        { status:'驳回',     time:DT(8),  by:'周洁', note:'法人征信当前逾期' }
      ],
      rejectReason:'银行审批环节发现法人征信当前存在逾期记录，暂不符合准入；建议结清逾期并养护3个月后重新匹配进件。',
      createdAt:DT(16), updatedAt:DT(8)
    },
    {
      id:'c106', type:'personal', name:'赵芳', phone:'188****9942',
      source:'转介绍', intent:'低', status:'资料收集中', owner:'sales',
      personal:{ age:52, occupation:'超市员工', monthlyIncome:0.6, overdue2y:0, currentOverdue:false, debtRatio:0, hasHouse:false, houseValue:'', hasCar:false, carValue:'', social:false, provident:false },
      enterprise:null,
      need:{ amount:3, term:12, purpose:'医疗' },
      chosenProductId:'',
      followUps:[ { time:DT(1), by:'李晓', content:'征信白户，无社保公积金，信用类产品受限，先收详版征信再定方案。' } ],
      matches:[],
      statusLog:[
        { status:'待评估',   time:DT(4), by:'李晓', note:'录入客户档案' },
        { status:'资料收集中',time:DT(3), by:'李晓', note:'先收集征信报告与收入证明' }
      ],
      rejectReason:'', createdAt:DT(4), updatedAt:DT(1)
    }
  ];

  /* 待办任务 */
  const tasks = [
    { id:'t101', type:'回访客户', customerId:'c102', title:'回访李娜：确认车抵补充方案意愿，约拉详版征信', due:D(0), done:false, owner:'sales' },
    { id:'t102', type:'收集资料', customerId:'c106', title:'收集赵芳：征信报告、收入证明', due:D(1), done:false, owner:'sales' },
    { id:'t103', type:'收集资料', customerId:'c103', title:'收集宏图商贸：对公流水、纳税证明原件（面签用）', due:D(2), done:false, owner:'zhou' },
    { id:'t104', type:'回访客户', customerId:'c104', title:'回访张伟：跟进宅抵贷方案对比结果', due:D(1), done:true, owner:'zhou' }
  ];

  /* 操作日志 */
  const logs = [
    { time:DT(1),  user:'李晓', role:'销售顾问',   action:'更新跟进记录', detail:'客户【赵芳】添加跟进笔记' },
    { time:DT(2),  user:'李晓', role:'销售顾问',   action:'新增客户',     detail:'录入客户【李娜】档案' },
    { time:DT(3),  user:'周洁', role:'销售顾问',   action:'发起匹配',     detail:'客户【张伟】完成智能匹配，命中3款产品' },
    { time:DT(3),  user:'陈明', role:'金融产品经理', action:'产品规则更新', detail:'【融e借】征信要求调整为近两年无逾期，版本升级至 v2' }
  ];

  const loginLogs = [ { time:DT(1), user:'李晓' }, { time:DT(1), user:'陈明' } ];

  /* 为种子产品的 v1 版本补快照，保证回滚功能可用 */
  products.forEach(p=>{ p.versions[0].snapshot = snapOf(p); });

  return {
    users:[
      { id:'u1', name:'王总', username:'admin', password:'123456', role:'admin', active:true },
      { id:'u2', name:'陈明', username:'pm',    password:'123456', role:'pm',    active:true },
      { id:'u3', name:'李晓', username:'sales',  password:'123456', role:'sales', active:true },
      { id:'u4', name:'周洁', username:'zhou',   password:'123456', role:'sales', active:true }
    ],
    products, customers, tasks, logs, loginLogs,
    seq:{ product:200, customer:200, task:200, user:10 }
  };
}
