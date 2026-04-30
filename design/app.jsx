// App: design canvas with all 4 directions × 3 screens + focus

const DIRS = [
  {
    id:'workshop',
    title:'01 · Workshop',
    sub:'Terminal · brutalist · dev-tool — for the builder who wants signal, not noise.',
    color:'#7dff9c',
    Dashboard: window.WorkshopDashboard,
    Roadmap: window.WorkshopRoadmap,
    Portfolio: window.WorkshopPortfolio,
    Focus: window.WorkshopFocus,
    defaultMode:'dark',
  },
  {
    id:'atelier',
    title:'02 · Atelier',
    sub:'Editorial · Swiss · serif display — every shipment treated like a print release.',
    color:'#b8541f',
    Dashboard: window.AtelierDashboard,
    Roadmap: window.AtelierRoadmap,
    Portfolio: window.AtelierPortfolio,
    Focus: window.AtelierFocus,
    defaultMode:'light',
  },
  {
    id:'atlas',
    title:'03 · Atlas',
    sub:'Cartographic · data-rich · command-center — see the whole field, ship with intention.',
    color:'#0891b2',
    Dashboard: window.AtlasDashboard,
    Roadmap: window.AtlasRoadmap,
    Portfolio: window.AtlasPortfolio,
    Focus: window.AtlasFocus,
    defaultMode:'light',
  },
  {
    id:'quest',
    title:'04 · Quest',
    sub:'Game-like (restrained) · skill-tree · XP feel — momentum + satisfaction, without kitsch.',
    color:'#a78bfa',
    Dashboard: window.QuestDashboard,
    Roadmap: window.QuestRoadmap,
    Portfolio: window.QuestPortfolio,
    Focus: window.QuestFocus,
    defaultMode:'dark',
  },
];

function App() {
  const [globalMode, setGlobalMode] = React.useState(null); // null = each direction's default
  const modeFor = (d) => globalMode || d.defaultMode;

  return (
    <DesignCanvas>
      {/* Intro section */}
      <DCSection id="intro" title="NUDG · Visual Direction Explorations" subtitle="4 directions × Dashboard + Roadmap + Portfolio + Focus block · light/dark per direction">
        <DCArtboard id="brief" label="Read me first" width={520} height={520}>
          <Brief setGlobalMode={setGlobalMode} globalMode={globalMode}/>
        </DCArtboard>
      </DCSection>

      {/* Atlas Dashboard variant exploration — addresses 右上黄金区 question */}
      <DCSection id="atlas-variants" title="✦ Atlas Dashboard · 3 Variants" subtitle="Same Atlas language. Different answers to 'what wins the right-side golden zone?'">
        <DCArtboard id="atlas-var-d" label="D · Refined (latest — recommended)" width={1280} height={820}>
          <AtlasDashD/>
        </DCArtboard>
        <DCArtboard id="atlas-var-brief" label="Read me · variant brief" width={520} height={620}>
          <AtlasVariantsBrief/>
        </DCArtboard>
        <DCArtboard id="atlas-var-a" label="A · Pilot-first (safe baseline)" width={1280} height={820}>
          <AtlasDashA/>
        </DCArtboard>
        <DCArtboard id="atlas-var-b" label="B · Map-first (most distinctive)" width={1280} height={820}>
          <AtlasDashB/>
        </DCArtboard>
        <DCArtboard id="atlas-var-c" label="C · Pilot + Camp-unlock (recommended)" width={1280} height={820}>
          <AtlasDashC/>
        </DCArtboard>
      </DCSection>

      {DIRS.map(d => (
        <DCSection key={d.id} id={d.id} title={d.title} subtitle={d.sub}>
          <DCArtboard id={`${d.id}-dash`} label="Dashboard" width={1280} height={820}>
            <d.Dashboard mode={modeFor(d)}/>
          </DCArtboard>
          <DCArtboard id={`${d.id}-road`} label="Roadmap" width={1280} height={820}>
            <d.Roadmap mode={modeFor(d)}/>
          </DCArtboard>
          <DCArtboard id={`${d.id}-port`} label="Portfolio" width={1280} height={820}>
            <d.Portfolio mode={modeFor(d)}/>
          </DCArtboard>
          <DCArtboard id={`${d.id}-focus`} label="Focus block (full-screen)" width={1280} height={820}>
            <d.Focus mode={modeFor(d)}/>
          </DCArtboard>
          {/* dark+light comparison swatches */}
          <DCArtboard id={`${d.id}-dash-alt`} label={`Dashboard · ${modeFor(d)==='dark'?'light':'dark'} variant`} width={1280} height={820}>
            <d.Dashboard mode={modeFor(d)==='dark'?'light':'dark'}/>
          </DCArtboard>
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

function Brief({ globalMode, setGlobalMode }) {
  return (
    <div style={{
      width:'100%', height:'100%', padding:'32px 32px',
      background:'#fbf8f1', color:'#1a1814',
      fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:13, lineHeight:1.55,
      display:'flex', flexDirection:'column', gap:14, overflow:'auto',
    }}>
      <div style={{fontFamily:"'Geist Mono', monospace", fontSize:10, letterSpacing:'.2em', textTransform:'uppercase', color:'#9a917f'}}>
        Brief · for tsunacon
      </div>
      <div style={{fontFamily:"'Fraunces', Georgia, serif", fontSize:36, lineHeight:1.05, letterSpacing:'-.025em', fontWeight:400}}>
        Four ways for NUDG to <em>feel</em> like the builder's tool it actually is.
      </div>
      <p style={{margin:0, color:'#6b6354'}}>
        The current design lacks hierarchy and is visually generic. Each of these four directions is a distinct take —
        with its own typography, color, AI vocabulary, and core emotion — built across the three highest-leverage screens:
        <strong> Dashboard, Roadmap, Portfolio</strong>, plus a full-screen <strong>Focus block</strong>.
      </p>
      <div style={{display:'grid', gap:10, marginTop:6}}>
        {[
          ['01 · Workshop','Terminal · electric-mint AI · mono everywhere','Focus','#7dff9c'],
          ['02 · Atelier','Editorial · serif display · burnt-amber AI','Craft','#b8541f'],
          ['03 · Atlas','Map metaphor · cyan AI · command-center density','Command','#0891b2'],
          ['04 · Quest','Skill-tree · XP · violet glow · level up','Momentum','#a78bfa'],
        ].map(([t,d,e,c]) => (
          <div key={t} style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center', padding:'10px 14px', border:'1px solid #d8d0bd', borderLeft:`4px solid ${c}`, background:'#f5f1e8'}}>
            <div style={{fontFamily:"'Fraunces', Georgia, serif", fontSize:18, letterSpacing:'-.01em'}}>{t.split(' · ')[1]}</div>
            <div style={{color:'#6b6354', fontSize:12}}>{d}</div>
            <div style={{fontFamily:"'Geist Mono', monospace", fontSize:10, letterSpacing:'.18em', textTransform:'uppercase', color:c}}>{e}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:'auto', paddingTop:14, borderTop:'1px solid #d8d0bd', display:'flex', flexDirection:'column', gap:8}}>
        <div style={{fontFamily:"'Geist Mono', monospace", fontSize:10, letterSpacing:'.18em', textTransform:'uppercase', color:'#9a917f'}}>Light/Dark</div>
        <div style={{display:'flex', gap:6}}>
          {[
            ['auto','Each direction default'],
            ['light','Force light'],
            ['dark','Force dark'],
          ].map(([k,l]) => (
            <button key={k} onClick={()=>setGlobalMode(k==='auto'?null:k)} style={{
              padding:'6px 12px', borderRadius:6, fontSize:11, cursor:'pointer',
              border:`1px solid ${ (globalMode||'auto')===k ? '#1a1814' : '#d8d0bd'}`,
              background: (globalMode||'auto')===k ? '#1a1814' : 'transparent',
              color: (globalMode||'auto')===k ? '#fbf8f1' : '#1a1814',
              fontFamily:'inherit',
            }}>{l}</button>
          ))}
        </div>
        <div style={{fontSize:11, color:'#9a917f', marginTop:4}}>
          Tip — click any artboard's expand icon to view fullscreen. Use ←/→/Esc to navigate.
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
