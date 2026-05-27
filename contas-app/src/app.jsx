import { useState, useEffect, useRef } from "react";

// ── Palette ──────────────────────────────────────────────────────────────
const C = {
  // Aqua base
  bg:         "#CBE9E6",
  bgMid:      "#B8DFDB",
  // Glass
  glass:      "rgba(255,255,255,0.58)",
  glassHover: "rgba(255,255,255,0.70)",
  glassBorder:"rgba(255,255,255,0.80)",
  glassDeep:  "rgba(255,255,255,0.38)",
  sheetBg:    "rgba(220,244,242,0.94)",
  // Wallpaper accents
  amber:      "#C85C0C",
  amberL:     "#E07A1A",
  crimson:    "#8A1818",
  teal:       "#1A6868",
  olive:      "#4A5A1A",
  navy:       "#1A3A60",
  // Text
  text:       "#142422",
  textMid:    "#2E5250",
  textDim:    "#6AA8A4",
  // Status
  late:  "#C02020", lateBg:  "rgba(192,32,32,0.12)",
  soon:  "#B05010", soonBg:  "rgba(176,80,16,0.12)",
  ok:    "#1A7060", okBg:    "rgba(26,112,96,0.12)",
  paid:  "#1A6060", paidBg:  "rgba(26,96,96,0.12)",
};

const CAT = {
  renda:     {l:"Renda",     i:"home",                c:"#A82020"},
  energia:   {l:"Energia",   i:"bolt",                c:"#C86010"},
  agua:      {l:"Água",      i:"water_drop",          c:"#1A6868"},
  gas:       {l:"Gás",       i:"local_fire_department",c:"#C04018"},
  internet:  {l:"Internet",  i:"wifi",                c:"#1A4870"},
  telemovel: {l:"Telemóvel", i:"smartphone",          c:"#601A80"},
  seguro:    {l:"Seguro",    i:"shield",              c:"#487020"},
  sub:       {l:"Subscrição",i:"autorenew",           c:"#8A2828"},
  saude:     {l:"Saúde",     i:"health_and_safety",   c:"#702848"},
  outro:     {l:"Outro",     i:"receipt_long",        c:"#2E5A58"},
};
const CATS = Object.entries(CAT).map(([id,v])=>({id,...v}));

const MO = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const SAMPLE = [
  {id:"s1",name:"Renda",         amount:750, dueDay:1,  dueMonth:null,freq:"monthly",cat:"renda",    notes:"",lastPaid:null},
  {id:"s2",name:"EDP",           amount:68,  dueDay:20, dueMonth:null,freq:"monthly",cat:"energia",  notes:"",lastPaid:null},
  {id:"s3",name:"NOS Internet",  amount:38,  dueDay:8,  dueMonth:null,freq:"monthly",cat:"internet", notes:"",lastPaid:null},
];

const DEF_NOTIF = {enabled:false, daysBefore:[1,7], hour:9, backendUrl:""};
const EMPTY = {name:"",amount:"",dueDay:"1",dueMonth:"1",freq:"monthly",cat:"outro",notes:""};

// ── Logic ─────────────────────────────────────────────────────────────────
const t0 = () => { const t=new Date(); t.setHours(0,0,0,0); return t; };
const cycleDue = b => {
  const t=t0();
  return b.freq==="monthly"
    ? new Date(t.getFullYear(),t.getMonth(),b.dueDay)
    : new Date(t.getFullYear(),(b.dueMonth||1)-1,b.dueDay);
};
const nextDue = b => {
  const t=t0(), cd=cycleDue(b);
  if (b.lastPaid) {
    const lp=new Date(b.lastPaid); lp.setHours(0,0,0,0);
    if (lp>=cd) return b.freq==="monthly"
      ? new Date(cd.getFullYear(),cd.getMonth()+1,b.dueDay)
      : new Date(cd.getFullYear()+1,(b.dueMonth||1)-1,b.dueDay);
  }
  if (b.freq==="yearly" && cd<t && !b.lastPaid)
    return new Date(cd.getFullYear()+1,(b.dueMonth||1)-1,b.dueDay);
  return cd;
};
const days = b => Math.round((nextDue(b)-t0())/86400000);
const status = b => {
  const lp=b.lastPaid?(()=>{const d=new Date(b.lastPaid);d.setHours(0,0,0,0);return d;})():null;
  if (lp&&lp>=cycleDue(b)) return "paid";
  const d=days(b);
  return d<0?"late":d<=7?"soon":"ok";
};
const ST = {
  late:{c:C.late,bg:C.lateBg,lbl:d=>`${-d}d atraso`},
  soon:{c:C.soon,bg:C.soonBg,lbl:d=>d===0?"Hoje":d===1?"Amanhã":`${d} dias`},
  ok:  {c:C.ok,  bg:C.okBg,  lbl:d=>`${d} dias`},
  paid:{c:C.paid,bg:C.paidBg,lbl:()=>"Pago"},
};
const eur = n => n.toLocaleString("pt-PT",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
const cat = id => CAT[id] || CAT.outro;

// ── Icon ──────────────────────────────────────────────────────────────────
const I = ({n,sz=20,c,f=0,s={}}) => (
  <span className="material-symbols-outlined" style={{
    fontSize:sz, color:c||C.textMid, userSelect:"none",
    display:"inline-flex", alignItems:"center", lineHeight:1,
    fontVariationSettings:`'FILL' ${f},'wght' 400,'GRAD' 0,'opsz' 24`, ...s,
  }}>{n}</span>
);

// ── Aqua background with soft wallpaper blobs ─────────────────────────────
const BG = () => (
  <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
    <svg viewBox="0 0 480 900" preserveAspectRatio="xMidYMid slice"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
      <defs>
        {[["r1","15%","18%","#8A1818",".13"],["r2","88%","10%","#4A5A1A",".10"],
          ["r3","78%","52%","#C86010",".14"],["r4","8%","70%","#1A4870",".10"],
          ["r5","45%","88%","#601A80",".09"]].map(([id,cx,cy,col,op])=>(
          <radialGradient key={id} id={id} cx={cx} cy={cy}>
            <stop offset="0%" stopColor={col} stopOpacity={op}/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </radialGradient>
        ))}
      </defs>
      <rect width="480" height="900" fill={C.bg}/>
      <ellipse cx="72"  cy="162" rx="300" ry="240" fill="url(#r1)"/>
      <ellipse cx="422" cy="90"  rx="260" ry="200" fill="url(#r2)"/>
      <ellipse cx="374" cy="468" rx="320" ry="260" fill="url(#r3)"/>
      <ellipse cx="38"  cy="630" rx="260" ry="200" fill="url(#r4)"/>
      <ellipse cx="216" cy="792" rx="320" ry="220" fill="url(#r5)"/>
      <path d="M-40,220 C100,155 220,285 360,220 S520,285 560,220" stroke={C.amber}   strokeWidth="1.5" fill="none" opacity=".09"/>
      <path d="M-40,380 C100,315 220,445 360,380 S520,445 560,380" stroke={C.crimson} strokeWidth="1.2" fill="none" opacity=".08"/>
      <path d="M-40,560 C120,495 240,625 380,560 S520,625 560,560" stroke={C.teal}    strokeWidth="1"   fill="none" opacity=".08"/>
      <path d="M-40,720 C100,655 220,785 360,720 S520,785 560,720" stroke={C.olive}   strokeWidth="1"   fill="none" opacity=".06"/>
    </svg>
  </div>
);

// ── Glassmorphism wrapper ─────────────────────────────────────────────────
const G = ({ch,s={},onClick,hover=false}) => {
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={hover?()=>setHov(true):null}
      onMouseLeave={hover?()=>setHov(false):null}
      style={{
        background: hov ? C.glassHover : C.glass,
        backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
        border:`1px solid ${C.glassBorder}`,
        boxShadow:"0 4px 28px rgba(20,80,76,0.10), 0 1px 4px rgba(20,80,76,0.06)",
        transition:"background 0.15s",
        ...s,
      }}>
      {ch}
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [bills,   setBills]   = useState([]);
  const [ready,   setReady]   = useState(false);
  const [sheet,   setSheet]   = useState(false);   // false|"new"|bill
  const [form,    setForm]    = useState(EMPTY);
  const [delConf, setDelConf] = useState(false);
  const [toast,   setToast]   = useState({msg:"",ok:true});
  const [tab,     setTab]     = useState("home");
  const [notifSh, setNotifSh] = useState(false);
  const [notif,   setNotif]   = useState(DEF_NOTIF);
  const toastTimer = useRef(null);

  // ── Fonts
  useEffect(()=>{
    ["https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap",
     "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200",
    ].forEach(href=>{
      if (!document.querySelector(`link[href="${href}"]`)){
        const l=document.createElement("link");l.rel="stylesheet";l.href=href;
        document.head.appendChild(l);
      }
    });
    document.body.style.cssText=`margin:0;background:${C.bg};font-family:'Nunito',sans-serif;`;
  },[]);

  // ── Storage
  useEffect(()=>{
    try{
      const b=localStorage.getItem("ctas-bills");
      const n=localStorage.getItem("ctas-notif");
      setBills(b?JSON.parse(b):SAMPLE);
      if(n)setNotif(JSON.parse(n));
    }catch{setBills(SAMPLE);}
    setReady(true);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem("ctas-bills",JSON.stringify(bills));},[bills,ready]);
  useEffect(()=>{localStorage.setItem("ctas-notif",JSON.stringify(notif));},[notif]);

  // ── Toast
  const flash = (msg,ok=true) => {
    clearTimeout(toastTimer.current);
    setToast({msg,ok});
    toastTimer.current=setTimeout(()=>setToast({msg:"",ok:true}),2400);
  };

  // ── Handlers
  const openNew  = () => { setForm({...EMPTY}); setDelConf(false); setSheet("new"); };
  const openEdit = b  => { setForm({...b,dueMonth:b.dueMonth||1}); setDelConf(false); setSheet(b); };
  const closeSheet = () => { setSheet(false); setDelConf(false); };

  const markPaid = (id,e) => {
    e.stopPropagation();
    setBills(p=>p.map(b=>b.id===id?{...b,lastPaid:new Date().toISOString().slice(0,10)}:b));
    flash("Marcado como pago");
  };
  const markUnpaid = (id,e) => {
    e.stopPropagation();
    setBills(p=>p.map(b=>b.id===id?{...b,lastPaid:null}:b));
  };

  const save = () => {
    const name=form.name?.trim(), amount=parseFloat(form.amount);
    const dueDay=Math.min(28,Math.max(1,parseInt(form.dueDay)||1));
    if(!name||isNaN(amount)||amount<=0){flash("Preenche nome e valor","error");return;}
    const bill={
      id:sheet==="new"?Date.now().toString():form.id,
      name,amount,dueDay,
      dueMonth:form.freq==="yearly"?parseInt(form.dueMonth)||1:null,
      freq:form.freq,cat:form.cat,notes:form.notes||"",
      lastPaid:sheet==="new"?null:form.lastPaid,
    };
    setBills(p=>sheet==="new"?[...p,bill]:p.map(b=>b.id===bill.id?bill:b));
    closeSheet();
    flash(sheet==="new"?"Conta adicionada ✓":"Conta actualizada ✓");
  };

  const del = () => {
    setBills(p=>p.filter(b=>b.id!==form.id));
    closeSheet(); flash("Eliminado");
  };

  // ── Derived
  const sorted  = [...bills].sort((a,b)=>days(a)-days(b));
  const shown   = tab==="paid" ? sorted.filter(b=>status(b)==="paid")
                : tab==="all"  ? sorted
                :                sorted.filter(b=>status(b)!=="paid");
  const totalM  = bills.reduce((s,b)=>s+(b.freq==="monthly"?b.amount:b.amount/12),0);
  const lateN   = bills.filter(b=>status(b)==="late").length;
  const soonN   = bills.filter(b=>status(b)==="soon").length;
  const paidN   = bills.filter(b=>status(b)==="paid").length;

  if (!ready) return <div style={{background:C.bg,minHeight:"100vh"}}/>;

  return (
    <div style={{minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",paddingBottom:96}}>
      <BG/>

      {/* ═══ HERO ═══ */}
      <div style={{position:"relative",zIndex:1,padding:"56px 18px 0"}}>
        <G s={{borderRadius:28,padding:"22px 22px 18px",marginBottom:14}} ch={
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:11,color:C.textMid,fontWeight:800,letterSpacing:"0.14em",marginBottom:5,textTransform:"uppercase"}}>Total Mensal</div>
                <div style={{fontSize:40,fontWeight:900,color:C.text,letterSpacing:"-1.5px",lineHeight:1.05}}>
                  {eur(totalM)}
                </div>
                <div style={{fontSize:12,color:C.textDim,marginTop:5,fontWeight:600,display:"flex",gap:10}}>
                  <span>{bills.length} conta{bills.length!==1?"s":""}</span>
                  {paidN>0&&<span style={{color:C.ok}}>· {paidN} paga{paidN!==1?"s":""}</span>}
                </div>
              </div>
              {/* Bell */}
              <button onClick={()=>setNotifSh(true)} style={{
                width:48,height:48,borderRadius:16,flexShrink:0,cursor:"pointer",
                background:notif.enabled?`${C.amber}18`:"rgba(255,255,255,0.4)",
                border:`1.5px solid ${notif.enabled?`${C.amber}50`:C.glassBorder}`,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <I n={notif.enabled?"notifications_active":"notifications"} sz={24} c={notif.enabled?C.amber:C.textDim} f={notif.enabled?1:0}/>
              </button>
            </div>

            {/* Status chips */}
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {lateN>0 && <Chip icon="error"        label={`${lateN} em atraso`}  c={C.late} bg={C.lateBg}/>}
              {soonN>0 && <Chip icon="schedule"     label={`${soonN} esta semana`} c={C.soon} bg={C.soonBg}/>}
              {lateN===0&&soonN===0&&bills.length>0&&<Chip icon="check_circle" label="Tudo em dia" c={C.ok} bg={C.okBg}/>}
            </div>
          </>
        }/>

        {/* ═══ TABS ═══ */}
        <G s={{borderRadius:18,padding:5,display:"flex",marginBottom:14}} ch={
          [["home","Pendentes","pending"],["paid","Pagas","check_circle"],["all","Todas","list"]].map(([id,l,icon])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1,padding:"10px 4px",border:"none",borderRadius:13,cursor:"pointer",
              fontFamily:"'Nunito',sans-serif",
              background:tab===id?C.amber:"transparent",
              color:tab===id?"#fff":C.textMid,
              fontSize:12,fontWeight:800,
              display:"flex",alignItems:"center",justifyContent:"center",gap:5,
              transition:"all 0.15s",
            }}>
              <I n={icon} sz={14} c={tab===id?"#fff":C.textMid} f={tab===id?1:0}/>
              {l}
            </button>
          ))
        }/>

        {/* ═══ BILL LIST ═══ */}
        {shown.length===0 ? (
          <div style={{textAlign:"center",paddingTop:60,color:C.textDim}}>
            <I n="receipt_long" sz={56} c={C.textDim}/>
            <div style={{fontSize:16,color:C.textMid,fontWeight:800,marginTop:14}}>
              {tab==="paid"?"Nenhuma paga":tab==="all"?"Sem contas":"Tudo tratado!"}
            </div>
            {tab==="home"&&bills.length===0&&
              <div style={{fontSize:13,marginTop:6,color:C.textDim}}>Toca em + para adicionar</div>}
          </div>
        ) : shown.map(b=>{
          const st=status(b), {c,bg,lbl}=ST[st], d=days(b);
          const {i,c:cc}=cat(b.cat);
          const paid=st==="paid";
          return (
            <G key={b.id} hover s={{
              borderRadius:20, borderLeft:`4px solid ${cc}`,
              padding:"14px 14px 14px 15px", marginBottom:10, cursor:"pointer",
              display:"flex", alignItems:"center", gap:14,
              opacity:paid?.68:1,
            }} onClick={()=>openEdit(b)} ch={
              <>
                {/* Category icon */}
                <div style={{width:46,height:46,borderRadius:14,flexShrink:0,background:`${cc}18`,border:`1.5px solid ${cc}30`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <I n={i} sz={24} c={cc} f={1}/>
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:800,color:paid?C.textDim:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textDecoration:paid?"line-through":"none"}}>
                    {b.name}
                  </div>
                  <div style={{fontSize:11,color:C.textDim,marginTop:3,display:"flex",alignItems:"center",gap:3}}>
                    <I n="event" sz={11} c={C.textDim}/>
                    {b.freq==="monthly"?`Dia ${b.dueDay} · mensal`:`${b.dueDay} ${MS[(b.dueMonth||1)-1]} · anual`}
                  </div>
                  {b.notes&&<div style={{fontSize:10,color:C.textDim,marginTop:2}}>{b.notes}</div>}
                </div>

                {/* Right */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:900,color:paid?C.textDim:C.text}}>{eur(b.amount)}</div>
                  <div style={{fontSize:10,fontWeight:800,color:c,background:bg,borderRadius:99,padding:"3px 10px",whiteSpace:"nowrap"}}>
                    {lbl(d)}
                  </div>
                  <button onClick={paid?e=>markUnpaid(b.id,e):e=>markPaid(b.id,e)} style={{
                    display:"flex",alignItems:"center",gap:4,
                    background:paid?C.paidBg:`${C.amber}15`,
                    border:`1px solid ${paid?`${C.paid}40`:`${C.amber}40`}`,
                    borderRadius:99,padding:"4px 10px",cursor:"pointer",
                    color:paid?C.paid:C.amber,fontSize:11,fontWeight:800,
                    fontFamily:"'Nunito',sans-serif",
                  }}>
                    <I n={paid?"check_circle":"radio_button_unchecked"} sz={13} c={paid?C.paid:C.amber} f={paid?1:0}/>
                    {paid?"Pago":"Pagar"}
                  </button>
                </div>
              </>
            }/>
          );
        })}

        {bills.length>0&&(
          <div style={{fontSize:11,color:C.textDim,textAlign:"center",padding:"6px 0 8px"}}>
            {bills.length} conta{bills.length!==1?"s":""} · estimativa {eur(totalM)}/mês
          </div>
        )}
      </div>

      {/* ═══ BOTTOM NAV ═══ */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:20}}>
        <G s={{borderRadius:"24px 24px 0 0",borderBottom:"none",display:"flex",alignItems:"center",justifyContent:"space-around",padding:"10px 0 26px"}} ch={
          <>
            <NBtn icon="home"          label="Início"  active/>
            <div style={{marginBottom:26}}>
              <button onClick={openNew} style={{
                width:60,height:60,borderRadius:22,
                background:`linear-gradient(140deg,${C.crimson} 0%,${C.amber} 60%,${C.amberL} 100%)`,
                border:"none",cursor:"pointer",
                boxShadow:`0 6px 24px ${C.amber}55, 0 2px 8px ${C.amber}30`,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <I n="add" sz={32} c="#fff"/>
              </button>
            </div>
            <NBtn icon="notifications" label="Alertas" active={false} onClick={()=>setNotifSh(true)}/>
          </>
        }/>
      </div>

      {/* ═══ BILL SHEET ═══ */}
      {sheet!==false&&(
        <Sheet onClose={closeSheet}>
          <SheetHeader
            title={sheet==="new"?"Nova Conta":"Editar Conta"}
            onClose={closeSheet}
          />

          <FL>Nome</FL>
          <FI value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Ex: Seguro Automóvel"/>

          <FL>Categoria</FL>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:20}}>
            {CATS.map(({id,l,i,c:cc})=>{
              const sel=form.cat===id;
              return(
                <div key={id} onClick={()=>setForm(p=>({...p,cat:id}))} style={{
                  background:sel?`${cc}20`:"rgba(255,255,255,0.5)",
                  border:`2px solid ${sel?cc:"rgba(255,255,255,0.75)"}`,
                  borderRadius:14,padding:"10px 4px",cursor:"pointer",textAlign:"center",
                  transition:"all 0.12s",boxShadow:sel?`0 2px 12px ${cc}30`:"none",
                }}>
                  <I n={i} sz={22} c={sel?cc:C.textMid} f={sel?1:0}/>
                  <div style={{fontSize:9,color:sel?cc:C.textDim,marginTop:4,fontWeight:sel?800:500}}>{l}</div>
                </div>
              );
            })}
          </div>

          <FL>Valor (€)</FL>
          <FI value={form.amount} onChange={v=>setForm(p=>({...p,amount:v}))} type="number" placeholder="0,00"/>

          <FL>Periodicidade</FL>
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {[["monthly","Mensal","event_repeat"],["yearly","Anual","calendar_today"]].map(([v,l,icon])=>{
              const sel=form.freq===v;
              return(
                <div key={v} onClick={()=>setForm(p=>({...p,freq:v}))} style={{
                  flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  padding:"13px",borderRadius:14,cursor:"pointer",
                  background:sel?`${C.amber}18`:"rgba(255,255,255,0.5)",
                  border:`2px solid ${sel?C.amber:"rgba(255,255,255,0.75)"}`,
                  color:sel?C.amber:C.textMid,fontSize:13,fontWeight:sel?800:500,
                  transition:"all 0.12s",
                }}>
                  <I n={icon} sz={18} c={sel?C.amber:C.textMid} f={sel?1:0}/>
                  {l}
                </div>
              );
            })}
          </div>

          <div style={{display:"flex",gap:12,marginBottom:20}}>
            {form.freq==="yearly"&&(
              <div style={{flex:2}}>
                <FL>Mês</FL>
                <select value={form.dueMonth} onChange={e=>setForm(p=>({...p,dueMonth:e.target.value}))} style={{...FIS,marginBottom:0,appearance:"none"}}>
                  {MO.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
            )}
            <div style={{flex:1}}>
              <FL>Dia (1–28)</FL>
              <input type="number" min="1" max="28" value={form.dueDay}
                onChange={e=>setForm(p=>({...p,dueDay:e.target.value}))}
                style={{...FIS,marginBottom:0}}/>
            </div>
          </div>

          <FL>Notas</FL>
          <FI value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Opcional"/>

          <button onClick={save} style={{
            width:"100%",padding:"16px",border:"none",borderRadius:16,cursor:"pointer",
            background:`linear-gradient(135deg,${C.crimson} 0%,${C.amber} 100%)`,
            color:"#fff",fontFamily:"'Nunito',sans-serif",fontSize:15,fontWeight:900,
            boxShadow:`0 4px 24px ${C.amber}45`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}>
            <I n="check" sz={20} c="#fff"/> Guardar
          </button>

          {sheet!=="new"&&(delConf?(
            <div style={{marginTop:14}}>
              <div style={{fontSize:13,color:C.textMid,textAlign:"center",marginBottom:12}}>
                Eliminar <strong style={{color:C.text}}>"{form.name}"</strong>?
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={del} style={{flex:1,padding:"13px",borderRadius:14,background:C.lateBg,color:C.late,border:`1px solid ${C.late}40`,cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontSize:13,fontWeight:800}}>Eliminar</button>
                <button onClick={()=>setDelConf(false)} style={{flex:1,padding:"13px",borderRadius:14,background:"rgba(255,255,255,0.5)",color:C.textMid,border:"1px solid rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontSize:13,fontWeight:600}}>Cancelar</button>
              </div>
            </div>
          ):(
            <button onClick={()=>setDelConf(true)} style={{width:"100%",padding:"13px",marginTop:12,background:"none",color:C.late,border:`1px solid ${C.late}30`,borderRadius:14,cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <I n="delete_outline" sz={18} c={C.late}/> Eliminar conta
            </button>
          ))}
        </Sheet>
      )}

      {/* ═══ NOTIFICATIONS SHEET ═══ */}
      {notifSh&&(
        <Sheet onClose={()=>setNotifSh(false)}>
          <SheetHeader title="Notificações" onClose={()=>setNotifSh(false)} icon="notifications_active"/>

          {/* Info banner (web only) */}
          <div style={{background:`${C.soon}12`,border:`1px solid ${C.soon}30`,borderRadius:14,padding:"12px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
            <I n="info" sz={18} c={C.soon} f={1} s={{flexShrink:0,marginTop:1}}/>
            <div style={{fontSize:12,color:C.textMid,lineHeight:1.6}}>
              Notificações nativas activas na app Android.<br/>
              Aqui podes configurar quando e como ser avisado.
            </div>
          </div>

          {/* Toggle */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(255,255,255,0.5)",borderRadius:16,padding:"16px",marginBottom:20,border:"1px solid rgba(255,255,255,0.75)"}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>Activar notificações</div>
              <div style={{fontSize:12,color:C.textMid,marginTop:2}}>Lembretes automáticos</div>
            </div>
            <div onClick={()=>setNotif(p=>({...p,enabled:!p.enabled}))} style={{
              width:52,height:30,borderRadius:15,
              background:notif.enabled?C.amber:C.textDim,
              position:"relative",cursor:"pointer",transition:"background 0.2s",
              boxShadow:notif.enabled?`0 2px 10px ${C.amber}60`:"none",
            }}>
              <div style={{position:"absolute",top:3,left:notif.enabled?23:3,width:24,height:24,borderRadius:12,background:"white",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
            </div>
          </div>

          {notif.enabled&&(<>
            <FL>Quando notificar</FL>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {[[0,"No próprio dia"],[1,"1 dia antes"],[3,"3 dias antes"],[7,"7 dias antes"]].map(([d,l])=>{
                const sel=notif.daysBefore.includes(d);
                return(
                  <div key={d} onClick={()=>setNotif(p=>({...p,daysBefore:sel?p.daysBefore.filter(x=>x!==d):[...p.daysBefore,d].sort((a,b)=>b-a)}))} style={{
                    display:"flex",alignItems:"center",gap:12,
                    background:sel?`${C.amber}14`:"rgba(255,255,255,0.5)",
                    border:`1.5px solid ${sel?C.amber:"rgba(255,255,255,0.75)"}`,
                    borderRadius:14,padding:"13px 16px",cursor:"pointer",
                    transition:"all 0.12s",
                  }}>
                    <I n={sel?"check_box":"check_box_outline_blank"} sz={20} c={sel?C.amber:C.textDim} f={sel?1:0}/>
                    <span style={{fontSize:14,fontWeight:sel?800:500,color:sel?C.amber:C.textMid}}>{l}</span>
                  </div>
                );
              })}
            </div>

            <FL>Hora do aviso</FL>
            <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
              {[7,8,9,10,12,18].map(h=>{
                const sel=notif.hour===h;
                return(
                  <div key={h} onClick={()=>setNotif(p=>({...p,hour:h}))} style={{
                    padding:"10px 14px",borderRadius:12,cursor:"pointer",
                    background:sel?`${C.amber}18`:"rgba(255,255,255,0.5)",
                    border:`1.5px solid ${sel?C.amber:"rgba(255,255,255,0.75)"}`,
                    color:sel?C.amber:C.textMid,fontSize:13,fontWeight:sel?800:500,
                  }}>{h}:00</div>
                );
              })}
            </div>

            <FL>URL do backend (push remoto)</FL>
            <FI value={notif.backendUrl} onChange={v=>setNotif(p=>({...p,backendUrl:v}))} placeholder="https://o-teu-backend.railway.app"/>
            <div style={{fontSize:11,color:C.textDim,marginTop:-12,marginBottom:20,lineHeight:1.6}}>
              Token FCM enviado para <code style={{background:"rgba(255,255,255,0.5)",padding:"1px 5px",borderRadius:4,fontSize:11}}>/api/register-device</code>
            </div>
          </>)}

          <button onClick={()=>{setNotifSh(false);flash("Configuração guardada ✓");}} style={{
            width:"100%",padding:"16px",border:"none",borderRadius:16,cursor:"pointer",
            background:`linear-gradient(135deg,${C.teal} 0%,${C.navy} 100%)`,
            color:"#fff",fontFamily:"'Nunito',sans-serif",fontSize:15,fontWeight:900,
            boxShadow:`0 4px 24px ${C.teal}40`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}>
            <I n="save" sz={20} c="#fff"/> Guardar configuração
          </button>
        </Sheet>
      )}

      {/* ═══ TOAST ═══ */}
      {toast.msg&&(
        <div style={{
          position:"fixed",bottom:98,left:"50%",transform:"translateX(-50%)",
          background:"rgba(255,255,255,0.88)",backdropFilter:"blur(16px)",
          color:C.text,padding:"11px 20px",borderRadius:16,
          fontSize:13,fontWeight:800,zIndex:300,pointerEvents:"none",
          whiteSpace:"nowrap",
          boxShadow:"0 4px 20px rgba(20,80,76,0.16)",
          border:`1px solid ${C.glassBorder}`,
          display:"flex",alignItems:"center",gap:8,
        }}>
          <I n="check_circle" sz={16} c={C.ok} f={1}/>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
const FIS = {
  width:"100%",boxSizing:"border-box",
  background:"rgba(255,255,255,0.6)",
  border:"1.5px solid rgba(255,255,255,0.80)",
  borderRadius:14,padding:"13px 16px",
  color:C.text,fontSize:14,fontFamily:"'Nunito',sans-serif",
  outline:"none",marginBottom:16,fontWeight:600,
};
const FL = ({children}) => (
  <div style={{fontSize:10,fontWeight:800,color:C.textMid,marginBottom:8,
    letterSpacing:"0.12em",textTransform:"uppercase"}}>{children}</div>
);
const FI = ({value,onChange,placeholder,type="text"}) => (
  <input type={type} value={value} placeholder={placeholder}
    onChange={e=>onChange(e.target.value)} style={FIS}/>
);
const Chip = ({icon,label,c,bg}) => (
  <div style={{display:"flex",alignItems:"center",gap:5,background:bg,
    borderRadius:99,padding:"5px 12px 5px 8px",border:`1px solid ${c}25`}}>
    <I n={icon} sz={13} c={c} f={1}/>
    <span style={{fontSize:12,color:c,fontWeight:800}}>{label}</span>
  </div>
);
const NBtn = ({icon,label,active,onClick}) => (
  <div onClick={onClick} style={{display:"flex",flexDirection:"column",
    alignItems:"center",gap:3,cursor:"pointer",padding:"0 20px",opacity:active?1:.45}}>
    <I n={icon} sz={24} c={active?C.amber:C.textMid} f={active?1:0}/>
    <span style={{fontSize:10,fontWeight:800,color:active?C.amber:C.textMid}}>{label}</span>
  </div>
);
const Sheet = ({children,onClose}) => (
  <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{
    position:"fixed",inset:0,zIndex:100,
    background:"rgba(18,56,52,0.30)",backdropFilter:"blur(8px)",
    display:"flex",alignItems:"flex-end",
  }}>
    <div style={{
      background:C.sheetBg,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",
      border:`1px solid ${C.glassBorder}`,borderBottom:"none",
      width:"100%",maxWidth:480,margin:"0 auto",
      borderRadius:"28px 28px 0 0",
      padding:"0 22px 50px",maxHeight:"92vh",overflowY:"auto",
    }}>
      <div style={{display:"flex",justifyContent:"center",padding:"14px 0 2px"}}>
        <div style={{width:40,height:4,background:C.textDim,borderRadius:2,opacity:.4}}/>
      </div>
      {children}
    </div>
  </div>
);
const SheetHeader = ({title,onClose,icon}) => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,marginTop:10}}>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      {icon&&<div style={{width:40,height:40,borderRadius:12,background:`${C.amber}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <I n={icon} sz={22} c={C.amber} f={1}/>
      </div>}
      <div style={{fontSize:22,fontWeight:900,color:C.text}}>{title}</div>
    </div>
    <button onClick={onClose} style={{background:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.8)",width:36,height:36,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <I n="close" sz={20} c={C.textMid}/>
    </button>
  </div>
);
