// Port of standalone forecast renderer adapted for CRM forecast section
(function (){
  'use strict'

  var stageChart, lenderChart;
  var STAGE_ORDER = ["New Lead","Qualified Lead","Product Exploration","Mandate Signed","Lender Selected","Logged In To Lender","Documentation","Credit Evaluation","PD Completed","Sanctioned","Compliance","Disbursed","Active Customer"];
  var STAGE_COLORS = { "New Lead":"#94A3B8", "Qualified Lead":"#64748B", "Product Exploration":"#7C5EAB", "Mandate Signed":"#B08300", "Lender Selected":"#B45309", "Logged In To Lender":"#0E7490", "Documentation":"#1E40AF", "Credit Evaluation":"#1E3FA8", "PD Completed":"#5B21B6", "Sanctioned":"#0369A1", "Compliance":"#059669", "Disbursed":"#0E6B4B", "Active Customer":"#065F46" };

  function formatINR(n){ return "₹ " + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0}); }
  function formatINR2(n){ return "₹ " + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function formatUSD2(n){ return "$ " + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }

  function daysAgo(iso){ if(!iso) return Infinity; return (Date.now()-new Date(iso).getTime())/86400000; }
  function ytdStart(){ var d=new Date(); return new Date(d.getFullYear(),0,1).getTime(); }

  function populateFilters(deals){
    var uniq = function(arr,key){ return Array.from(new Set(arr.map(function(d){return d[key];}).filter(Boolean))); };
    fill("fltProduct", uniq(deals,"product"));
    fill("fltVertical", uniq(deals,"vertical"));
    fill("fltLender", uniq(deals,"assignedLender"));
    fill("fltExec", uniq(deals,"salesExecutive"));
  }
  function fill(id, opts){
    var sel = document.getElementById(id);
    if(!sel) return;
    var current = sel.value;
    var first = sel.querySelector("option[value=\"all\"]");
    sel.innerHTML = ""; if(first) sel.appendChild(first);
    opts.forEach(function(v){ var o=document.createElement("option"); o.value=v; o.textContent=v; sel.appendChild(o); });
    sel.value = current || "all";
  }

  function applyFilters(deals){
    var get = function(id){ var el=document.getElementById(id); return el?el.value:'all'; };
    var f = { date:get('fltDate'), product:get('fltProduct'), vertical:get('fltVertical'), lender:get('fltLender'), stage:get('fltStage'), exec:get('fltExec') };
    return deals.filter(function(d){
      if(f.product !== "all" && d.product !== f.product) return false;
      if(f.vertical !== "all" && d.vertical !== f.vertical) return false;
      if(f.lender !== "all" && d.assignedLender !== f.lender) return false;
      if(f.stage !== "all" && d.pipelineStage !== f.stage) return false;
      if(f.exec !== "all" && d.salesExecutive !== f.exec) return false;
      if(f.date === "30" && daysAgo(d.updatedAt) > 30) return false;
      if(f.date === "90" && daysAgo(d.updatedAt) > 90) return false;
      if(f.date === "ytd" && new Date(d.updatedAt).getTime() < ytdStart()) return false;
      return true;
    });
  }

  function computeAll(deals){
    return deals.map(function(d){
      var r = (window.FSRevenue && FSRevenue.computeDealRevenue) ? FSRevenue.computeDealRevenue(d) : { grossRevenue:0, weightedRevenue:0, usdRevenue:0, stageWeight:0 };
      return Object.assign({}, d, { _grossRevenue: r.grossRevenue, _weightedRevenue: r.weightedRevenue, _usdRevenue: r.usdRevenue, _stageWeight: r.stageWeight });
    });
  }

  function renderKPIs(deals){
    var totalWeighted = deals.reduce(function(s,d){return s+(d._weightedRevenue||0);},0);
    var totalUsd = deals.reduce(function(s,d){return s+(d._usdRevenue||0);},0);
    var totalGross = deals.reduce(function(s,d){return s+(d._grossRevenue||0);},0);
    var elW = document.getElementById('kpiWeighted'); if(elW) elW.textContent = formatINR2(totalWeighted);
    var elU = document.getElementById('kpiUsd'); if(elU) elU.textContent = formatUSD2(totalUsd);
    var elG = document.getElementById('kpiGross'); if(elG) elG.textContent = formatINR2(totalGross);
    var sub = document.getElementById('kpiWeightedSub'); if(sub) sub.textContent = deals.length + " deal" + (deals.length===1?"":"s") + " · weighted by stage";
    var usdSub = document.getElementById('kpiUsdSub'); if(usdSub) usdSub.textContent = "@ ₹ " + (deals[0] && deals[0].exchangeRate || 96.29) + " / USD";
    var grossSub = document.getElementById('kpiGrossSub'); if(grossSub) grossSub.textContent = "Full pipeline potential — unweighted";
  }

  function renderStageChart(deals){
    var byStage = {};
    STAGE_ORDER.forEach(function(s){ byStage[s]=0; });
    deals.forEach(function(d){ if(byStage[d.pipelineStage]!=null) byStage[d.pipelineStage]+=d._weightedRevenue; });
    var data = STAGE_ORDER.map(function(k){return byStage[k];});
    var colors = STAGE_ORDER.map(function(k){return STAGE_COLORS[k];});
    if(stageChart) stageChart.destroy();
    var el = document.getElementById('stageChart'); if(!el || !window.Chart) return;
    var ctx = el.getContext('2d');
    stageChart = new Chart(ctx, { type: 'bar', data: { labels: STAGE_ORDER, datasets: [{ label: 'Weighted Revenue (INR)', data: data, backgroundColor: colors, borderRadius:6, barThickness:36, barPercentage:0.85, categoryPercentage:0.9 }]}, options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:function(c){return ' ' + formatINR2(c.raw);} } } }, scales:{ y:{ ticks:{ callback:function(v){return formatINR(v);} }, grid:{ color:'#EEE7DD' } }, x:{ grid:{ display:false }, ticks:{ maxRotation:45, minRotation:30, autoSkip:true } } } } });
  }

  function renderLenderChart(deals){
    var byLender = {};
    deals.forEach(function(d){ var k = d.assignedLender || 'Unassigned'; byLender[k] = (byLender[k]||0) + (d._weightedRevenue||0); });
    var entries = Object.entries(byLender).sort(function(a,b){return b[1]-a[1];});
    var labels = entries.map(function(e){return e[0];});
    var data = entries.map(function(e){return e[1];});
    var palette = ["#7A1F1F","#1E3FA8","#0E6B4B","#B08300","#5C1414","#312E81","#9A6300"];
    if(lenderChart) lenderChart.destroy();
    var el = document.getElementById('lenderChart'); if(!el || !window.Chart) return;
    var ctx = el.getContext('2d');
    lenderChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label:'Weighted Revenue (INR)', data:data, backgroundColor: labels.map(function(_,i){return palette[i%palette.length];}), borderRadius:6, barThickness:28, barPercentage:0.9 }]}, options: { indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:function(c){return ' ' + formatINR2(c.raw);} } } }, scales:{ x:{ ticks:{ callback:function(v){return formatINR(v);} }, grid:{ color:'#EEE7DD' } }, y:{ grid:{ display:false }, ticks:{ autoSkip:true, maxRotation:0 } } } } });
  }

  function renderTable(deals){
    var body = document.getElementById('dealsBody');
    var empty = document.getElementById('emptyState');
    var count = document.getElementById('tableCount');
    if(count) count.textContent = deals.length + " deal" + (deals.length===1?"":"s");
    if(!body) return;
    if(deals.length === 0){ body.innerHTML = ''; if(empty) empty.style.display='block'; return; } else if(empty) empty.style.display='none';
    body.innerHTML = deals.map(function(d){
      var stageKey = (d.pipelineStage||'').split(' ')[0];
      return '<tr>' +
        '<td class="deal-ref">'+ (d.dealRef||'—') +'</td>' +
        '<td class="customer">'+ (d.customer||'—') +'</td>' +
        '<td>'+ (d.assignedLender||'—') +'</td>' +
        '<td>'+ (d.product||'—') +'</td>' +
        '<td>'+ (d.vertical||'—') +'</td>' +
        '<td class="mono">'+ formatINR(d.sanctionAmount) +'</td>' +
        '<td><span class="pill stage-'+ stageKey +'">'+ (d.pipelineStage||'—') +'</span></td>' +
        '<td class="mono">'+ formatINR2(d._grossRevenue) +'</td>' +
        '<td class="mono money-inr">'+ formatINR2(d._weightedRevenue) +'</td>' +
        '<td class="mono money-usd">'+ formatUSD2(d._usdRevenue) +'</td>' +
        '<td class="updated">'+ (d.updatedAt||'—') +'</td>' +
        '<td><a href="crm1.html?deal='+ encodeURIComponent(d.dealRef||'') +'" style="color:var(--maroon);font-weight:600;font-size:12px;text-decoration:none;">Open →</a></td>' +
      '</tr>';
    }).join('');
  }

  function renderTrendChart(deals){
    var chartEl = document.getElementById('forecast-chart');
    if(!chartEl || !window.Chart) return;
    var labels = [], actual = [], forecast = [], buckets = {};
    deals.forEach(function(d){ var dt=new Date(d.updatedAt||Date.now()); var key = dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0'); buckets[key]=buckets[key]||{actual:0,forecast:0}; buckets[key].actual += d._grossRevenue||0; buckets[key].forecast += d._weightedRevenue||0; });
    var sorted = Object.keys(buckets).sort(); sorted.forEach(function(k){ labels.push(k); actual.push(buckets[k].actual); forecast.push(buckets[k].forecast); });
    var ctx = chartEl.getContext('2d'); if(window._localForecastChart) window._localForecastChart.destroy();
    window._localForecastChart = new Chart(ctx, { type:'line', data:{ labels:labels, datasets:[ { label:'Actual', data:actual, borderColor:'#9B2335', tension:0.35 }, { label:'Forecast', data:forecast, borderColor:'#16a34a', tension:0.35 } ] }, options:{ responsive:true, maintainAspectRatio:false } });
  }

  function refresh(){
    var raw = (window.FSDeals && FSDeals.list) ? FSDeals.list() : [];
    var deals = computeAll(raw);
    populateFilters(raw);
    var filtered = applyFilters(deals);
    renderKPIs(filtered);
    renderStageChart(filtered);
    renderLenderChart(filtered);
    renderTable(filtered);
    renderTrendChart(filtered);
  }

  // Wire filter change events
  ['fltDate','fltProduct','fltVertical','fltLender','fltStage','fltExec'].forEach(function(id){ var el=document.getElementById(id); if(el) el.addEventListener('change', refresh); });

  window.addEventListener('fs-deals-updated', refresh);
  window.addEventListener('storage', function(e){ if(e.key==='fs_deals_v1') refresh(); });

  document.addEventListener('DOMContentLoaded', function(){ try{ refresh(); }catch(e){} });

  // expose for other scripts (crm-reports fallback)
  window.renderForecastingLocal = refresh;

})();
