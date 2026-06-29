import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

// ────────────────────────────────────────────
// 🔐  비밀번호
// ────────────────────────────────────────────
const PASSWORD = "listerine2026";

// ────────────────────────────────────────────
// 📡  Google Sheets 연동 설정
//     → 시트 ID나 API 키 변경 필요 시 여기만 수정
// ────────────────────────────────────────────
const SHEET_ID  = "1H-H1WOt2TVIoxrCxcrU7QdvGqYqSIleYDDOJLfRcArs";
const API_KEY   = "AIzaSyDVCQe8bXekdKDbSA_ppbCArWxXrWbeg2U";
const SHEET_NAME = "Data";
const RANGE     = `${SHEET_NAME}!B2:T50`; // B열(NO) ~ S열(CPV), 2행(헤더) ~ 48행

// ── 구글 시트 데이터 → 앱 데이터로 변환
function parseSheetRow(row, index) {
  const clean = (v) => (v || "").toString().replace(/[₩,\s%]/g, "").trim();
  const num   = (v) => { const n = parseFloat(clean(v)); return isNaN(n) ? null : n; };
  const pct   = (v) => { const n = parseFloat(clean(v)); return isNaN(n) ? null : n / 100; };

  return {
    no:         num(row[0]) || index + 1,
    category:   row[1] || "",
    name:       row[2] || "",
    status:     row[3] || "",
    platform:   (row[4] || "").replace(/\s/g, ""),
    format:     row[5] || "",
    product:    (row[7] || "").replace(/\s/g, ""),   // H열 제품
    amount:     num(row[8]),                           // I열 금액
    date:       row[9] || "",                          // J열 업로드일자
    link:       row[10] || "",                         // K열 콘텐츠 링크
    views:      num(row[11]),                          // L열 View
    er:         pct(row[12]),                          // M열 ER
    engagement: num(row[13]),                          // N열 Engagement
    likes:      num(row[14]),                          // O열 Like
    comments:   num(row[15]),                          // P열 Comment
    impression: num(row[16]),                          // Q열 Impression
    cpv:        num(row[17]),                          // R열 CPV (₩ 기호 제거)
  };
}

// ── 디자인 토큰
const C = {
  bg:      "#F5F3FA",
  surface: "#FFFFFF",
  border:  "#E4DFF2",
  primary: "#5B2D8E",
  accent:  "#8B5CF6",
  light:   "#EDE9FB",
  text:    "#1E1B2E",
  sub:     "#6B6680",
  good:    "#16A34A",
  warn:    "#DC2626",
  sidebar: "#3D1A6E",
};

// ── 포맷 헬퍼
function fmt(n, type) {
  if (n == null || isNaN(n)) return "-";
  if (type === "views")  return n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? Math.round(n/1000)+"K" : String(n);
  if (type === "money")  return "₩" + n.toLocaleString();
  if (type === "cpv")    return "₩" + Math.round(n).toLocaleString();
  if (type === "er")     return (n * 100).toFixed(2) + "%";
  if (type === "imp")    return n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? Math.round(n/1000)+"K" : String(n);
  return n.toLocaleString();
}

function getYM(d) {
  if (!d) return "";
  const parts = d.split(".");
  if (parts.length < 2) return d;
  return `20${parts[0]}.${parts[1]}`;
}

const PLATFORM_OPTS = ["전체","YT","IG","TT"];
const STATUS_OPTS   = ["전체","Mega","Macro","Micro","Nano","Nano▼"];
const PRODUCT_OPTS  = ["전체","TCC","TCM","TCP"];
const PRODUCT_FULL  = { TCC:"토탈케어 캐비티케어 마일드액", TCM:"토탈케어 마일드", TCP:"토탈케어 플러스" };
const STATUS_RANGE  = { Mega:"100만+", Macro:"40만–100만", Micro:"10만–40만", Nano:"5만–10만", "Nano▼":"5만 이하" };
const STATUS_COLOR  = {
  Mega:    { bg:"#F3E8FF", color:"#7C3AED" },
  Macro:   { bg:"#EDE9FB", color:"#5B2D8E" },
  Micro:   { bg:"#E0F2FE", color:"#0369A1" },
  Nano:    { bg:"#FEF3C7", color:"#92400E" },
  "Nano▼": { bg:"#FEE2E2", color:"#991B1B" },
};

// ── 공통 컴포넌트
function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 13px", borderRadius:20, cursor:"pointer", whiteSpace:"nowrap",
      border:`1.5px solid ${active ? C.primary : C.border}`,
      background: active ? C.primary : C.surface,
      color: active ? "#fff" : C.sub,
      fontSize:12, fontWeight: active ? 700 : 400, transition:"all .15s",
    }}>{label}</button>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:14,
      padding:"20px 24px", flex:1, minWidth:160 }}>
      <div style={{ fontSize:11, color:C.sub, fontWeight:700, letterSpacing:1,
        textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color: color||C.primary, letterSpacing:-1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.sub, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────
// 🔐  LOGIN PAGE
// ────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [pw, setPw]   = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr]   = useState(false);

  function handleLogin() {
    if (pw === PASSWORD) { onLogin(); }
    else { setErr(true); setTimeout(() => setErr(false), 1800); }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ background:C.primary, padding:"18px 32px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ background:"#fff", color:C.primary, fontWeight:900, fontSize:15,
          padding:"3px 12px", borderRadius:6, letterSpacing:2, display:"inline-block" }}>
          LISTERINE®
        </div>
        <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>인플루언서 캠페인 퍼포먼스 리포트</span>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:20,
          padding:"44px 48px", width:360, boxShadow:"0 8px 32px rgba(91,45,142,0.10)" }}>

          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ background:C.light, borderRadius:50, width:56, height:56,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 16px", fontSize:24 }}>🔒</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.text, letterSpacing:-0.5 }}>캠페인 리포트</div>
            <div style={{ fontSize:13, color:C.sub, marginTop:6 }}>접근하려면 비밀번호를 입력하세요</div>
          </div>

          <div style={{ position:"relative", marginBottom:14 }}>
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="비밀번호"
              style={{
                width:"100%", padding:"12px 44px 12px 16px", borderRadius:10, fontSize:14,
                border:`1.5px solid ${err ? C.warn : C.border}`,
                outline:"none", boxSizing:"border-box", color:C.text,
                background: err ? "#FFF5F5" : "#fff", transition:"border .2s",
              }}
            />
            <button onClick={() => setShow(s => !s)} style={{
              position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer", color:C.sub, fontSize:16, padding:0,
            }}>{show ? "🙈" : "👁️"}</button>
          </div>

          {err && (
            <div style={{ fontSize:12, color:C.warn, textAlign:"center", marginBottom:10, fontWeight:600 }}>
              비밀번호가 올바르지 않습니다
            </div>
          )}

          <button onClick={handleLogin} style={{
            width:"100%", padding:"13px", borderRadius:10, border:"none", cursor:"pointer",
            background:C.primary, color:"#fff", fontSize:14, fontWeight:700, letterSpacing:0.5,
          }}>로그인</button>

          <div style={{ textAlign:"center", marginTop:24, fontSize:11, color:C.sub }}>
            © 2026 비트리코퍼레이션. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 📊  PAGE 1 : 광고 성과 추이
// ────────────────────────────────────────────
function TrendPage({ data }) {
  const totalViews  = data.reduce((s,r) => s + (r.views||0), 0);
  const avgCPV      = data.length ? data.reduce((s,r) => s + (r.cpv||0), 0) / data.length : 0;
  const avgER       = data.length ? data.reduce((s,r) => s + (r.er||0),  0) / data.length : 0;
  const totalBudget = data.reduce((s,r) => s + (r.amount||0), 0);

  const monthlyMap = {};
  data.forEach(r => {
    const ym = getYM(r.date);
    if (!ym) return;
    if (!monthlyMap[ym]) monthlyMap[ym] = { ym, views:0, cpvSum:0, erSum:0, count:0, budget:0 };
    monthlyMap[ym].views   += (r.views||0);
    monthlyMap[ym].cpvSum  += (r.cpv||0);
    monthlyMap[ym].erSum   += (r.er||0);
    monthlyMap[ym].count   += 1;
    monthlyMap[ym].budget  += (r.amount||0);
  });
  const monthly = Object.values(monthlyMap)
    .sort((a,b) => a.ym.localeCompare(b.ym))
    .map(d => ({
      month: d.ym.slice(2),
      "조회수(만)": Math.round(d.views/10000),
      CPV: Math.round(d.cpvSum/d.count),
      "ER(%)": parseFloat((d.erSum/d.count*100).toFixed(2)),
      "예산(만)": Math.round(d.budget/10000),
    }));

  const chartCard = (title, sub, children) => (
    <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:16, padding:"22px 24px" }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{title}
        <span style={{ fontSize:11, color:C.sub, fontWeight:400, marginLeft:6 }}>{sub}</span>
      </div>
      <div style={{ marginTop:16 }}>{children}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:8 }}>
        <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>광고 성과 추이</h2>
        <p style={{ fontSize:12, color:C.sub, margin:"4px 0 0" }}>2024.10 – 2026.06 · 전체 캠페인 기간 종합</p>
      </div>

      <div style={{ display:"flex", gap:14, flexWrap:"wrap", margin:"20px 0" }}>
        <KpiCard label="총 조회수"    value={fmt(totalViews,"views")} sub={`${data.length}개 콘텐츠 합산`} />
        <KpiCard label="평균 CPV"    value={fmt(avgCPV,"cpv")}        sub="집행비용 ÷ 조회수" color={C.accent} />
        <KpiCard label="평균 ER"     value={fmt(avgER,"er")}           sub="총 인게이지먼트 ÷ 조회수" color="#7C3AED" />
        <KpiCard label="총 집행 예산" value={"₩"+(totalBudget/100000000).toFixed(1)+"억"} sub="부가세 별도" color={C.sub} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:18 }}>
        {chartCard("월별 조회수 추이","(만 회)",
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{top:0,right:8,left:-16,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:C.sub}}/>
              <YAxis tick={{fontSize:10,fill:C.sub}}/>
              <Tooltip formatter={v=>[v+"만 회","조회수"]} contentStyle={{fontSize:12,borderRadius:8}}/>
              <Bar dataKey="조회수(만)" fill={C.accent} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
        {chartCard("월별 평균 CPV","(원, 낮을수록 효율 ↑)",
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly} margin={{top:0,right:8,left:-16,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:C.sub}}/>
              <YAxis tick={{fontSize:10,fill:C.sub}}/>
              <Tooltip formatter={v=>["₩"+v,"평균 CPV"]} contentStyle={{fontSize:12,borderRadius:8}}/>
              <Line type="monotone" dataKey="CPV" stroke={C.primary} strokeWidth={2.5} dot={{r:3,fill:C.primary}}/>
            </LineChart>
          </ResponsiveContainer>
        )}
        {chartCard("월별 평균 ER","(%, 높을수록 반응 ↑)",
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly} margin={{top:0,right:8,left:-16,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:C.sub}}/>
              <YAxis tick={{fontSize:10,fill:C.sub}}/>
              <Tooltip formatter={v=>[v+"%","평균 ER"]} contentStyle={{fontSize:12,borderRadius:8}}/>
              <Line type="monotone" dataKey="ER(%)" stroke="#7C3AED" strokeWidth={2.5} dot={{r:3,fill:"#7C3AED"}}/>
            </LineChart>
          </ResponsiveContainer>
        )}
        {chartCard("월별 집행 예산","(만 원)",
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{top:0,right:8,left:-16,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="month" tick={{fontSize:10,fill:C.sub}}/>
              <YAxis tick={{fontSize:10,fill:C.sub}}/>
              <Tooltip formatter={v=>[v+"만 원","예산"]} contentStyle={{fontSize:12,borderRadius:8}}/>
              <Bar dataKey="예산(만)" fill="#C4B5FD" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 📋  PAGE 2 : 상세 광고 성과
// ────────────────────────────────────────────
function DetailPage({ data }) {
  const [platform, setPlatform] = useState("전체");
  const [status,   setStatus]   = useState("전체");
  const [product,  setProduct]  = useState("전체");
  const [sortKey,  setSortKey]  = useState("no");
  const [sortDir,  setSortDir]  = useState("asc");

  const filtered = useMemo(() => data.filter(r => {
    const pOk = platform === "전체" || (r.platform||"").includes(platform);
    const sOk = status   === "전체" || r.status === status;
    const dOk = product  === "전체" || (r.product||"").includes(product);
    return pOk && sOk && dOk;
  }), [data, platform, status, product]);

  const avgCPV = filtered.length ? filtered.reduce((s,r)=>s+(r.cpv||0),0)/filtered.length : 0;
  const avgER  = filtered.length ? filtered.reduce((s,r)=>s+(r.er||0), 0)/filtered.length : 0;

  const sorted = useMemo(() => [...filtered].sort((a,b) => {
    const va = a[sortKey] ?? -Infinity, vb = b[sortKey] ?? -Infinity;
    return sortDir === "asc" ? (va>vb?1:-1) : (va<vb?1:-1);
  }), [filtered, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const TH = ({k, label}) => (
    <th onClick={()=>k&&toggleSort(k)} style={{
      padding:"10px 12px", fontSize:11, fontWeight:700, textAlign:"left",
      color: sortKey===k ? C.primary : C.sub, letterSpacing:0.5,
      textTransform:"uppercase", cursor: k?"pointer":"default",
      whiteSpace:"nowrap", borderBottom:`2px solid ${C.border}`,
      background:C.light, userSelect:"none",
    }}>
      {label}{k && (sortKey===k ? (sortDir==="asc"?" ▲":" ▼") : "")}
    </th>
  );

  const td = { padding:"10px 12px", fontSize:13, color:C.text,
    borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" };

  return (
    <div>
      <div style={{ marginBottom:8 }}>
        <h2 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>상세 광고 성과</h2>
        <p style={{ fontSize:12, color:C.sub, margin:"4px 0 0" }}>콘텐츠별 개별 퍼포먼스 · 헤더 클릭 시 정렬</p>
      </div>

      {/* 필터 */}
      <div style={{ background:C.surface, border:`1.5px solid ${C.border}`,
        borderRadius:14, padding:"16px 20px", margin:"16px 0" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:18, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.sub, minWidth:40 }}>플랫폼</span>
            <div style={{ display:"flex", gap:6 }}>
              {PLATFORM_OPTS.map(o=><Chip key={o} label={o} active={platform===o} onClick={()=>setPlatform(o)}/>)}
            </div>
          </div>
          <div style={{ width:1, height:24, background:C.border }}/>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.sub, minWidth:28 }}>규모</span>
            <div style={{ display:"flex", gap:6 }}>
              {STATUS_OPTS.map(o=><Chip key={o} label={o} active={status===o} onClick={()=>setStatus(o)}/>)}
            </div>
          </div>
          <div style={{ width:1, height:24, background:C.border }}/>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.sub, minWidth:28 }}>제품</span>
            <div style={{ display:"flex", gap:6 }}>
              {PRODUCT_OPTS.map(o=><Chip key={o} label={o} active={product===o} onClick={()=>setProduct(o)}/>)}
            </div>
          </div>
        </div>
        {product !== "전체" && (
          <div style={{ marginTop:10, fontSize:11, color:C.accent, fontWeight:600 }}>
            📦 {product} : 리스테린 {PRODUCT_FULL[product]}
          </div>
        )}
      </div>

      {/* 미니 KPI */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { label:"필터 콘텐츠", value:`${filtered.length}개` },
          { label:"총 조회수",   value:fmt(filtered.reduce((s,r)=>s+(r.views||0),0),"views") },
          { label:"평균 CPV",   value:fmt(avgCPV,"cpv") },
          { label:"평균 ER",    value:fmt(avgER,"er") },
        ].map(k=>(
          <div key={k.label} style={{ background:C.surface, border:`1.5px solid ${C.border}`,
            borderRadius:12, padding:"12px 18px", flex:1, minWidth:120 }}>
            <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.primary, marginTop:2 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <TH k="no"          label="NO"/>
                <TH k="name"        label="인플루언서"/>
                <TH k="status"      label="규모"/>
                <TH k="platform"    label="플랫폼"/>
                <TH k="product"     label="제품"/>
                <TH k="date"        label="업로드일"/>
                <TH k="views"       label="조회수"/>
                <TH k="er"          label="ER"/>
                <TH k="engagement"  label="인게이지먼트"/>
                <TH k="impression"  label="노출수"/>
                <TH k="amount"      label="집행비용"/>
                <TH k="cpv"         label="CPV"/>
                <TH k={null}        label="링크"/>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r,i) => {
                const sc = STATUS_COLOR[r.status] || { bg:C.light, color:C.primary };
                return (
                  <tr key={r.no || i} style={{ background: i%2===0?"#fff":C.bg }}>
                    <td style={{...td, color:C.sub, fontSize:11}}>{r.no}</td>
                    <td style={{...td, fontWeight:600}}>{r.name}</td>
                    <td style={td}>
                      <span style={{ padding:"2px 8px", borderRadius:10, fontSize:11,
                        fontWeight:600, background:sc.bg, color:sc.color }}>{r.status}</span>
                    </td>
                    <td style={{...td, fontSize:11, color:C.sub}}>{r.platform}</td>
                    <td style={td}>
                      <span style={{ padding:"2px 8px", borderRadius:10, fontSize:11,
                        background:C.light, color:C.primary, fontWeight:600 }}>{r.product}</span>
                    </td>
                    <td style={{...td, fontSize:11, color:C.sub}}>{r.date}</td>
                    <td style={{...td, fontWeight:600}}>{fmt(r.views,"views")}</td>
                    <td style={{...td, fontWeight:700, color: r.er > avgER ? C.good : C.warn}}>
                      {fmt(r.er,"er")}
                    </td>
                    <td style={td}>{r.engagement ? r.engagement.toLocaleString() : "-"}</td>
                    <td style={{...td, color: r.impression ? C.text : C.sub}}>
                      {r.impression ? fmt(r.impression,"imp") : "-"}
                    </td>
                    <td style={{...td, fontSize:12}}>{fmt(r.amount,"money")}</td>
                    <td style={{...td, fontWeight:700, color: r.cpv < avgCPV ? C.good : C.warn}}>
                      {fmt(r.cpv,"cpv")}
                    </td>
                    <td style={td}>
                      {r.link ? (
                        <a href={r.link.split("\n")[0].trim()} target="_blank" rel="noreferrer"
                          style={{ color:C.accent, fontSize:15, textDecoration:"none" }}
                          title="콘텐츠 보기">🔗</a>
                      ) : <span style={{color:C.sub}}>-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 범례 */}
      <div style={{ marginTop:12, display:"flex", gap:16, flexWrap:"wrap", fontSize:11, color:C.sub }}>
        {Object.entries(STATUS_RANGE).map(([s,r])=>(
          <span key={s}><strong style={{color:C.text}}>{s}</strong> {r}</span>
        ))}
        <span style={{ marginLeft:8 }}>
          <span style={{color:C.good,fontWeight:700}}>■</span> 평균 이상 &nbsp;
          <span style={{color:C.warn,fontWeight:700}}>■</span> 평균 이하
          <span style={{color:C.sub}}> (현재 필터 기준)</span>
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// 🏠  ROOT
// ────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page,     setPage]     = useState("trend");
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── 구글 시트에서 데이터 불러오기
  useEffect(() => {
    if (!loggedIn) return;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`API 오류 (${res.status})`);
        return res.json();
      })
      .then(json => {
        const rows = (json.values || []).slice(1); // 첫 행(헤더) 제외
        const parsed = rows
          .filter(r => r[2]) // 이름(Name) 있는 행만
          .map((r, i) => parseSheetRow(r, i));
        setData(parsed);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [loggedIn]);

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

  const NAV = [
    { id:"trend",  icon:"📊", label:"광고 성과 추이" },
    { id:"detail", icon:"📋", label:"상세 광고 성과" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif" }}>

      {/* SIDEBAR */}
      <div style={{ width:200, background:C.sidebar, display:"flex", flexDirection:"column",
        flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"24px 20px 20px" }}>
          <div style={{ background:"#fff", color:C.primary, fontWeight:900, fontSize:13,
            padding:"4px 10px", borderRadius:6, letterSpacing:2, display:"inline-block" }}>
            LISTERINE®
          </div>
          <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, marginTop:6, lineHeight:1.4 }}>
            인플루언서 캠페인<br/>퍼포먼스 리포트
          </div>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:9, marginTop:4 }}>2024.10 – 2026.06</div>
        </div>

        <div style={{ height:1, background:"rgba(255,255,255,0.1)", margin:"0 20px" }}/>

        <nav style={{ padding:"16px 12px", flex:1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%",
              padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer",
              background: page===n.id ? "rgba(255,255,255,0.15)" : "transparent",
              color: page===n.id ? "#fff" : "rgba(255,255,255,0.55)",
              fontSize:13, fontWeight: page===n.id ? 700 : 400,
              marginBottom:4, textAlign:"left", transition:"all .15s",
            }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* 데이터 상태 표시 */}
        <div style={{ padding:"12px 20px", fontSize:10,
          color: error ? "#FCA5A5" : loading ? "rgba(255,255,255,0.4)" : "#86EFAC" }}>
          {loading ? "⏳ 데이터 불러오는 중..." : error ? `⚠️ ${error}` : `✅ ${data.length}개 데이터 로드됨`}
        </div>

        <div style={{ padding:"12px 20px 20px", fontSize:10, color:"rgba(255,255,255,0.25)" }}>
          © 2026 비트리코퍼레이션
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, background:C.bg, overflow:"auto" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            height:"100vh", flexDirection:"column", gap:16 }}>
            <div style={{ fontSize:32 }}>⏳</div>
            <div style={{ fontSize:14, color:C.sub }}>구글 시트에서 데이터를 불러오는 중...</div>
          </div>
        ) : error ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            height:"100vh", flexDirection:"column", gap:12 }}>
            <div style={{ fontSize:32 }}>⚠️</div>
            <div style={{ fontSize:14, color:C.warn, fontWeight:600 }}>데이터 로드 실패</div>
            <div style={{ fontSize:12, color:C.sub }}>{error}</div>
            <div style={{ fontSize:11, color:C.sub, marginTop:8 }}>
              구글 시트 공유 설정 및 API 키를 확인해주세요
            </div>
          </div>
        ) : (
          <div style={{ padding:"32px 36px", maxWidth:1200 }}>
            {page === "trend"  && <TrendPage  data={data} />}
            {page === "detail" && <DetailPage data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}
