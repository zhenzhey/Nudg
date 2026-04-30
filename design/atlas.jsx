// ─────────────────────────────────────────────────────────────
// ATLAS — Cartographic / data-rich / Linear+Notion Calendar tone
// Cool blue-gray, dense info, layered map metaphor for roadmap.
// AI = quiet cyan. Emotion: 掌控感 (command, see the whole field).
// ─────────────────────────────────────────────────────────────

const AS = {
  bg: '#fafbfc',
  panel: '#ffffff',
  panel2: '#f3f5f8',
  border: '#e3e7ec',
  borderHi: '#c7cfd9',
  fg: '#0f1722',
  dim: '#5b6878',
  dimmer: '#9aa5b3',
  ai: '#0891b2',           // cyan-700
  aiSoft: '#cffafe',
  warn: '#b45309',
  done: '#0f8c4a',
  font: "'Geist', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
};
const AS_DARK = {
  bg: '#0c1117',
  panel: '#11161e',
  panel2: '#161c26',
  border: '#212a36',
  borderHi: '#33404f',
  fg: '#e8edf3',
  dim: '#8a96a6',
  dimmer: '#5b6878',
  ai: '#22d3ee',
  aiSoft: '#0e3a44',
  warn: '#f59e0b',
  done: '#34d399',
  font: "'Geist', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
};
const asTheme = m => m==='dark'? AS_DARK : AS;

const ASFrame = ({ mode='light', tab='dashboard', children }) => {
  const T = asTheme(mode);
  return (
    <div style={{width:'100%', height:'100%', background:T.bg, color:T.fg, fontFamily:T.font, fontSize:13, display:'flex', flexDirection:'column'}}>
      <div style={{height:44, padding:'0 16px', display:'flex', alignItems:'center', gap:18, borderBottom:`1px solid ${T.border}`, background:T.panel}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:22, height:22, borderRadius:6, background:`linear-gradient(135deg, ${T.fg}, ${T.dim})`, color:T.bg, display:'grid', placeItems:'center', fontWeight:700, fontSize:11}}>N</div>
          <div style={{fontWeight:600, letterSpacing:'-.005em'}}>Nudg</div>
          <span style={{color:T.dimmer}}>/</span>
          <span style={{color:T.dim}}>{SAMPLE.user}</span>
          <span style={{color:T.dimmer}}>/</span>
          <span style={{color:T.fg, fontWeight:500}}>{SAMPLE.project.name}</span>
        </div>
        <div style={{flex:1, display:'flex', justifyContent:'center', gap:2, fontSize:12}}>
          {['Dashboard','Map','Calendar','Portfolio'].map(t => {
            const k=t.toLowerCase().replace('map','projects'); const on=k===tab;
            return (
              <span key={t} style={{
                padding:'5px 10px', borderRadius:6, color: on? T.fg : T.dim,
                background: on? T.panel2 : 'transparent', cursor:'pointer', fontWeight: on? 500 : 400,
              }}>{t}</span>
            );
          })}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10, color:T.dim, fontSize:11}}>
          <span style={{display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:4, background:`${T.ai}15`, color:T.ai}}>
            <span style={{width:6, height:6, borderRadius:'50%', background:T.ai, boxShadow:`0 0 6px ${T.ai}`}}/>
            AI on
          </span>
          <span style={{padding:'3px 8px', border:`1px solid ${T.border}`, borderRadius:4, fontFamily:T.mono, fontSize:10}}>⌘K</span>
        </div>
      </div>
      {children}
    </div>
  );
};

// ─── Dashboard — command center ─────────────────────────────
const AtlasDashboard = ({ mode='light' }) => {
  const T = asTheme(mode);
  return (
    <ASFrame mode={mode} tab="dashboard">
      <div style={{flex:1, display:'grid', gridTemplateColumns:'220px 1fr 280px', minHeight:0}}>

        {/* sidebar */}
        <div style={{borderRight:`1px solid ${T.border}`, padding:'14px 12px', background:T.panel, fontSize:12, display:'flex', flexDirection:'column', gap:18}}>
          <div>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, padding:'4px 8px', marginBottom:4}}>Active</div>
            {SAMPLE.projects.filter(p=>p.status==='active').map((p,i)=>(
              <div key={p.name} style={{padding:'7px 8px', borderRadius:6, background: i===0? T.panel2 : 'transparent', display:'flex', alignItems:'center', gap:8, marginBottom:1, cursor:'pointer'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background: i===0? T.ai : T.dimmer}}/>
                <div style={{flex:1, color: i===0? T.fg : T.dim, fontWeight: i===0? 500 : 400, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.name}</div>
                <div style={{color:T.dimmer, fontFamily:T.mono, fontSize:10}}>{p.progress}%</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, padding:'4px 8px', marginBottom:4}}>Shipped</div>
            <div style={{padding:'7px 8px', display:'flex', alignItems:'center', gap:8, color:T.dim}}>
              <div style={{width:6, height:6, borderRadius:'50%', background:T.done}}/>
              <div style={{fontSize:12}}>Calendar × Google Sync</div>
            </div>
          </div>
          <div style={{marginTop:'auto', padding:8, background:T.panel2, borderRadius:8}}>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim}}>Accountability</div>
            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:6}}>
              <div style={{width:24, height:24, borderRadius:'50%', background:T.borderHi, color:T.bg, display:'grid', placeItems:'center', fontWeight:600, fontSize:11}}>M</div>
              <div style={{flex:1, fontSize:11}}>Marcus L.<div style={{color:T.dim, fontSize:10}}>checks in 5pm</div></div>
            </div>
          </div>
        </div>

        {/* main */}
        <div style={{overflow:'auto', minHeight:0}}>
          {/* status bar */}
          <div style={{padding:'14px 24px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:18}}>
            <div>
              <div style={{fontSize:11, color:T.dim, letterSpacing:'.05em'}}>Week {SAMPLE.project.week} of {SAMPLE.project.weekTotal} · ships in {SAMPLE.project.daysLeft}d</div>
              <div style={{fontSize:22, fontWeight:600, letterSpacing:'-.018em', marginTop:2}}>{SAMPLE.deliverable.title}</div>
            </div>
            <div style={{flex:1}}/>
            <Ring value={SAMPLE.project.progress} size={48} stroke={4} color={T.ai} track={T.border} label={
              <span style={{fontSize:12}}>{SAMPLE.project.progress}<span style={{fontSize:8, color:T.dim}}>%</span></span>
            }/>
          </div>

          {/* hero current task */}
          <div style={{padding:'18px 24px'}}>
            <div style={{
              border:`1px solid ${T.border}`, borderRadius:10, background:T.panel, overflow:'hidden',
              boxShadow:`0 1px 0 ${T.border}, 0 4px 16px ${T.fg}06`,
            }}>
              <div style={{padding:'14px 18px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${T.border}`, background:T.panel2}}>
                <div style={{padding:'2px 8px', background:T.ai, color:'#fff', borderRadius:4, fontFamily:T.mono, fontSize:10, fontWeight:600, letterSpacing:'.04em'}}>NEXT</div>
                <div style={{fontSize:11, color:T.dim}}>Task 2 of 6 in this deliverable</div>
                <div style={{flex:1}}/>
                <div style={{fontSize:11, color:T.dim, fontFamily:T.mono}}>{SAMPLE.currentTask.block}</div>
              </div>
              <div style={{padding:'18px 18px 4px'}}>
                <div style={{fontSize:24, fontWeight:600, letterSpacing:'-.018em', lineHeight:1.2}}>{SAMPLE.currentTask.title}</div>
              </div>

              {/* steps */}
              <div style={{padding:'14px 18px', display:'grid', gap:10}}>
                <div style={{display:'flex', gap:12, alignItems:'flex-start', padding:'10px 12px', background:`${T.ai}10`, border:`1px solid ${T.ai}40`, borderRadius:8}}>
                  <div style={{width:22, height:22, borderRadius:'50%', background:T.ai, color:'#fff', display:'grid', placeItems:'center', fontWeight:600, fontSize:11, flexShrink:0}}>1</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10, color:T.ai, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:2}}>Start step · 90s</div>
                    <div style={{color:T.fg}}>{SAMPLE.currentTask.startStep}</div>
                  </div>
                </div>
                <div style={{display:'flex', gap:12, alignItems:'flex-start', padding:'10px 12px', borderRadius:8, color:T.dim}}>
                  <Icon name="spark" size={14} style={{color:T.ai, marginTop:2}}/>
                  <div style={{flex:1, fontSize:12}}>{SAMPLE.currentTask.aiHint}</div>
                  <span style={{fontSize:11, color:T.ai, cursor:'pointer'}}>Ask</span>
                </div>
              </div>

              <div style={{padding:'14px 18px', borderTop:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10, background:T.panel2}}>
                <button style={{flex:1, height:44, background:T.fg, color:T.bg, border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, letterSpacing:'-.005em'}}>
                  <Icon name="play" size={11}/> Start focus block · 2h 30m
                </button>
                <button style={{padding:'0 14px', height:44, border:`1px solid ${T.border}`, background:T.panel, borderRadius:8, color:T.dim, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12}}>
                  Postpone
                </button>
              </div>
            </div>
          </div>

          {/* Conflict alert */}
          <div style={{margin:'4px 24px 0', padding:'12px 14px', border:`1px solid ${T.warn}40`, background:`${T.warn}10`, borderRadius:8, display:'flex', alignItems:'center', gap:12, fontSize:12}}>
            <div style={{width:22, height:22, borderRadius:'50%', background:T.warn, color:'#fff', display:'grid', placeItems:'center', flexShrink:0}}>!</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Schedule conflict — Open Coffee AI 9–10am overlaps protected block</div>
              <div style={{color:T.dim, marginTop:1}}>Pulled from Google Calendar 4 minutes ago</div>
            </div>
            <button style={{padding:'6px 10px', border:`1px solid ${T.border}`, background:T.panel, borderRadius:6, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:6}}>
              <Icon name="spark" size={11} style={{color:T.ai}}/> Smart reschedule
            </button>
            <button style={{padding:'6px 10px', border:`1px solid transparent`, background:'transparent', color:T.dim, fontSize:11, cursor:'pointer'}}>Dismiss</button>
          </div>

          {/* execution plan */}
          <div style={{padding:'18px 24px'}}>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
              <div style={{fontSize:11, color:T.dim, letterSpacing:'.05em', fontWeight:600, textTransform:'uppercase'}}>Execution plan</div>
              <div style={{flex:1}}/>
              <div style={{display:'flex', gap:1, fontSize:11, background:T.panel2, padding:2, borderRadius:6, border:`1px solid ${T.border}`}}>
                {['Today','Week','All'].map((s,i)=>(
                  <span key={s} style={{padding:'3px 10px', borderRadius:4, background: i===1? T.panel : 'transparent', color: i===1? T.fg : T.dim, cursor:'pointer'}}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden', background:T.panel}}>
              {SAMPLE.tasks.map((t,i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'24px 1fr 80px 60px 50px',
                  alignItems:'center', gap:14, padding:'10px 14px',
                  borderTop: i? `1px solid ${T.border}` : 'none',
                  opacity: t.done ? .5 : 1,
                  background: i===0 ? `${T.ai}06` : 'transparent',
                }}>
                  <div style={{width:14, height:14, borderRadius:4, border:`1.5px solid ${t.done? T.done : T.borderHi}`, background: t.done? T.done : 'transparent', color:'#fff', display:'grid', placeItems:'center'}}>{t.done && <Icon name="check" size={9}/>}</div>
                  <div>
                    <div style={{color:T.fg, textDecoration: t.done?'line-through':'none', fontWeight:500, fontSize:13}}>{t.title}</div>
                    {t.warn && <div style={{color:T.warn, fontSize:11, marginTop:2, display:'flex', alignItems:'center', gap:4}}><Icon name="spark" size={10}/> Consider splitting</div>}
                  </div>
                  <div style={{fontFamily:T.mono, fontSize:10, color:T.dim, display:'flex', alignItems:'center', gap:6}}>
                    <Icon name="cal" size={10}/> {t.day}
                  </div>
                  <div style={{fontFamily:T.mono, fontSize:11, color:T.dim, fontVariantNumeric:'tabular-nums'}}>{t.est}</div>
                  <div style={{display:'flex', justifyContent:'flex-end'}}>
                    <SparkBars values={[.4,.6,.8,.5,.3]} color={t.done?T.dimmer:T.ai} h={14} w={2}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{borderLeft:`1px solid ${T.border}`, background:T.panel, display:'flex', flexDirection:'column', minHeight:0}}>
          {/* mini map preview */}
          <div style={{padding:14, borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, marginBottom:8, fontWeight:600}}>Project Map</div>
            <MiniMap T={T}/>
          </div>

          {/* schedule */}
          <div style={{padding:14, flex:1, minHeight:0, overflow:'hidden'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>Today · Apr 29</div>
              <div style={{fontSize:10, color:T.dim, fontFamily:T.mono}}>3 blocks · 5h 15m</div>
            </div>
            <div style={{position:'relative', height:300, fontSize:10, color:T.dimmer}}>
              {[10,11,12,1,2,3,4,5].map((h,i) => (
                <div key={h} style={{position:'absolute', left:0, right:0, top:i*36, height:36, borderTop:`1px solid ${T.border}`, paddingLeft:30}}>
                  <span style={{position:'absolute', left:0, top:-5, fontSize:9, fontFamily:T.mono}}>{h>9?h-12+'pm':h+'am'}</span>
                </div>
              ))}
              <div style={{position:'absolute', left:30, right:8, top:80, height:90, background:`${T.ai}18`, borderLeft:`3px solid ${T.ai}`, borderRadius:'4px 6px 6px 4px', padding:'6px 10px'}}>
                <div style={{fontSize:9, color:T.ai, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase'}}>Focus · protected</div>
                <div style={{fontSize:11, fontWeight:500, marginTop:2, color:T.fg}}>Wire tool-calling loop</div>
                <div style={{fontSize:9, color:T.dim, marginTop:1, fontFamily:T.mono}}>12:30 – 3:00pm</div>
              </div>
              <div style={{position:'absolute', left:30, right:8, top:180, height:36, background:T.panel2, borderLeft:`3px solid ${T.borderHi}`, borderRadius:'4px 6px 6px 4px', padding:'4px 10px'}}>
                <div style={{fontSize:11, fontWeight:500}}>Pair w/ Marcus</div>
                <div style={{fontSize:9, color:T.dim, fontFamily:T.mono}}>3:30 – 4:00pm</div>
              </div>
              <div style={{position:'absolute', left:30, right:8, top:226, height:36, background:T.panel2, border:`1px dashed ${T.borderHi}`, borderRadius:6, padding:'4px 10px', color:T.dim}}>
                <div style={{fontSize:11}}>Demo recording</div>
                <div style={{fontSize:9, fontFamily:T.mono}}>4:00 – 4:30pm</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ASFrame>
  );
};

// Mini map preview for sidebar
const MiniMap = ({ T }) => (
  <div style={{position:'relative', height:120, borderRadius:8, background: `radial-gradient(circle at 30% 30%, ${T.ai}10, transparent 60%), ${T.panel2}`, border:`1px solid ${T.border}`, overflow:'hidden'}}>
    {/* lat/long grid */}
    <svg style={{position:'absolute', inset:0}} width="100%" height="100%">
      <defs>
        <pattern id="mmgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={T.border} strokeWidth=".5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mmgrid)"/>
      {/* path */}
      <path d="M 20 90 Q 70 60 100 70 T 200 30" fill="none" stroke={T.ai} strokeWidth="2" strokeDasharray="4 3"/>
      <circle cx="20" cy="90" r="5" fill={T.done}/>
      <circle cx="100" cy="70" r="6" fill={T.ai} stroke={T.panel} strokeWidth="2"/>
      <circle cx="100" cy="70" r="11" fill="none" stroke={T.ai} strokeOpacity=".3"/>
      <circle cx="160" cy="50" r="4" fill={T.dimmer}/>
      <circle cx="200" cy="30" r="4" fill={T.dimmer}/>
    </svg>
    <div style={{position:'absolute', bottom:6, left:8, fontSize:9, color:T.dim, fontFamily:T.mono}}>WK 2 · You are here</div>
    <div style={{position:'absolute', top:6, right:8, fontSize:9, color:T.dim}}>Open ↗</div>
  </div>
);

// ─── Roadmap — actual cartographic map ──────────────────────
const AtlasRoadmap = ({ mode='light' }) => {
  const T = asTheme(mode);
  // path nodes
  const nodes = [
    { x: 90, y: 380, ...SAMPLE.roadmap[0] },
    { x: 280, y: 280, ...SAMPLE.roadmap[1] },
    { x: 480, y: 340, ...SAMPLE.roadmap[2] },
    { x: 660, y: 220, ...SAMPLE.roadmap[3] },
    { x: 880, y: 140, ...SAMPLE.roadmap[4] },
  ];
  return (
    <ASFrame mode={mode} tab="projects">
      <div style={{flex:1, display:'grid', gridTemplateColumns:'320px 1fr', minHeight:0, overflow:'hidden'}}>
        {/* sidebar */}
        <div style={{borderRight:`1px solid ${T.border}`, padding:'24px 22px', overflow:'auto', background:T.panel}}>
          <div style={{display:'flex', alignItems:'center', gap:6, fontSize:11, color:T.dim, marginBottom:6, cursor:'pointer'}}>← Back to projects</div>
          <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>Project</div>
          <div style={{fontSize:26, fontWeight:600, letterSpacing:'-.022em', marginTop:4, lineHeight:1.15}}>{SAMPLE.project.name}</div>
          <div style={{color:T.dim, marginTop:10, fontSize:13, lineHeight:1.5}}>{SAMPLE.project.desc}</div>

          <div style={{marginTop:18, padding:'12px 14px', background:T.panel2, borderRadius:8, border:`1px solid ${T.border}`}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontSize:11, color:T.dim}}>Week {SAMPLE.project.week} of {SAMPLE.project.weekTotal}</div>
              <div style={{fontSize:11, color:T.fg, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>{SAMPLE.project.progress}%</div>
            </div>
            <div style={{height:4, background:T.border, borderRadius:2, marginTop:8, position:'relative'}}>
              <div style={{position:'absolute', inset:0, width:`${SAMPLE.project.progress}%`, background:T.ai, borderRadius:2}}/>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:T.dim, fontFamily:T.mono}}>
              <span>started Apr 12</span><span>ships in {SAMPLE.project.daysLeft}d</span>
            </div>
          </div>

          {/* legend */}
          <div style={{marginTop:22}}>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600, marginBottom:10}}>Legend</div>
            <div style={{display:'grid', gap:6, fontSize:12}}>
              {[
                ['Shipped', T.done],
                ['In progress', T.ai],
                ['Locked', T.dimmer],
              ].map(([l,c]) => (
                <div key={l} style={{display:'flex', alignItems:'center', gap:10}}>
                  <div style={{width:10, height:10, borderRadius:'50%', background:c}}/>
                  <span style={{color:T.dim}}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{marginTop:22}}>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600, marginBottom:10}}>Accountability partner</div>
            <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:`1px solid ${T.border}`, borderRadius:8}}>
              <div style={{width:32, height:32, borderRadius:'50%', background:T.borderHi, color:T.bg, display:'grid', placeItems:'center', fontWeight:600}}>M</div>
              <div style={{flex:1, fontSize:12}}>
                <div style={{fontWeight:500}}>Marcus L.</div>
                <div style={{color:T.dim, fontSize:11}}>Daily 5pm check-in</div>
              </div>
              <Icon name="inbox" size={14} style={{color:T.dim}}/>
            </div>
          </div>
        </div>

        {/* map */}
        <div style={{position:'relative', overflow:'hidden', background: T.bg}}>
          {/* topo grid bg */}
          <svg style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
            <defs>
              <pattern id="topo" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={T.border} strokeWidth=".5"/>
              </pattern>
              <radialGradient id="topo2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={T.ai} stopOpacity=".06"/>
                <stop offset="100%" stopColor={T.ai} stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#topo)"/>
            <rect width="100%" height="100%" fill="url(#topo2)"/>
            {/* contours */}
            {[0.4, 0.6, 0.8].map((o,i) => (
              <ellipse key={i} cx="280" cy="280" rx={120+i*50} ry={70+i*30} fill="none" stroke={T.borderHi} strokeOpacity={.3-i*0.08} strokeDasharray="2 5"/>
            ))}
          </svg>

          {/* top toolbar */}
          <div style={{position:'absolute', top:14, left:14, right:14, display:'flex', alignItems:'center', gap:10, zIndex:2}}>
            <div style={{fontSize:11, padding:'5px 10px', background:T.panel, border:`1px solid ${T.border}`, borderRadius:6, color:T.dim, fontFamily:T.mono}}>
              Project Map · Tap a chapter to expand
            </div>
            <div style={{flex:1}}/>
            <div style={{display:'flex', gap:1, padding:2, background:T.panel, border:`1px solid ${T.border}`, borderRadius:6}}>
              {['Map','Timeline','List'].map((s,i)=>(
                <span key={s} style={{padding:'4px 10px', borderRadius:4, background: i===0? T.panel2 : 'transparent', fontSize:11, color: i===0? T.fg : T.dim, cursor:'pointer'}}>{s}</span>
              ))}
            </div>
          </div>

          {/* path */}
          <svg style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
            <path
              d={`M ${nodes[0].x} ${nodes[0].y} ` + nodes.slice(1).map((n,i) => `Q ${(nodes[i].x+n.x)/2} ${nodes[i].y} ${n.x} ${n.y}`).join(' ')}
              fill="none" stroke={T.borderHi} strokeWidth="2" strokeDasharray="6 5"
            />
            {/* completed segment */}
            <path
              d={`M ${nodes[0].x} ${nodes[0].y} Q ${(nodes[0].x+nodes[1].x)/2} ${nodes[0].y} ${nodes[1].x} ${nodes[1].y}`}
              fill="none" stroke={T.ai} strokeWidth="2.5"
            />
          </svg>

          {/* nodes */}
          {nodes.map((n,i) => {
            const done = n.status==='done', active = n.status==='active', locked = n.status==='locked';
            const color = done? T.done : active? T.ai : T.dimmer;
            return (
              <div key={i} style={{position:'absolute', left:n.x, top:n.y, transform:'translate(-50%, -50%)'}}>
                {active && <div style={{position:'absolute', inset:-12, borderRadius:'50%', background:`${T.ai}25`, animation:'asPulse 2s infinite'}}/>}
                <div style={{
                  width: active? 44 : 32, height: active? 44 : 32, borderRadius:'50%',
                  background: T.panel, border:`2px solid ${color}`,
                  display:'grid', placeItems:'center', color, fontWeight:700, fontSize: active?14:12,
                  boxShadow: active? `0 4px 16px ${T.ai}40` : `0 2px 6px ${T.fg}10`,
                  position:'relative', zIndex:1,
                }}>
                  {done? <Icon name="check" size={14}/> : locked? <Icon name="lock" size={12}/> : i+1}
                </div>
                <div style={{
                  position:'absolute', top: active?52:38, left:'50%', transform:'translateX(-50%)',
                  whiteSpace:'nowrap', textAlign:'center', minWidth:140,
                }}>
                  <div style={{fontSize:9, fontFamily:T.mono, letterSpacing:'.1em', textTransform:'uppercase', color:T.dim}}>Week {n.week}</div>
                  <div style={{fontSize:13, fontWeight:600, color: locked? T.dim : T.fg, marginTop:2, letterSpacing:'-.005em'}}>{n.title}</div>
                  <div style={{fontSize:10, color:T.dim, marginTop:2}}>{n.tasks} tasks</div>
                </div>
              </div>
            );
          })}

          {/* expanded card for active */}
          <div style={{position:'absolute', left: 280-130, top: 280-180, width:260, padding:14, background:T.panel, border:`1px solid ${T.ai}`, borderRadius:10, boxShadow:`0 8px 24px ${T.fg}15, 0 0 0 4px ${T.ai}15`, zIndex:3}}>
            <div style={{fontSize:9, fontFamily:T.mono, letterSpacing:'.12em', textTransform:'uppercase', color:T.ai, fontWeight:600}}>Now · Week 2</div>
            <div style={{fontSize:14, fontWeight:600, marginTop:4, lineHeight:1.3}}>{SAMPLE.deliverable.title}</div>
            <div style={{fontSize:11, color:T.dim, marginTop:6, lineHeight:1.45}}>{SAMPLE.deliverable.desc.slice(0,100)}...</div>
            <div style={{marginTop:10, display:'flex', alignItems:'center', gap:8, fontSize:10, color:T.dim, fontFamily:T.mono}}>
              <span>2 / 6 tasks</span>
              <div style={{flex:1, height:3, background:T.border, borderRadius:2, position:'relative'}}>
                <div style={{position:'absolute', inset:0, width:'33%', background:T.ai, borderRadius:2}}/>
              </div>
            </div>
          </div>

          {/* AI hint floating */}
          <div style={{position:'absolute', right:24, bottom:24, padding:'12px 14px', background:T.panel, border:`1px solid ${T.ai}50`, borderRadius:10, maxWidth:300, display:'flex', gap:10, boxShadow:`0 4px 12px ${T.fg}10`}}>
            <Icon name="spark" size={14} style={{color:T.ai, marginTop:2}}/>
            <div>
              <div style={{fontSize:10, color:T.ai, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase'}}>AI suggestion</div>
              <div style={{fontSize:12, marginTop:2, lineHeight:1.4}}>Insert a buffer between Week 3 and 4 — interview week tends to overrun.</div>
            </div>
          </div>

          <style>{`@keyframes asPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}`}</style>
        </div>
      </div>
    </ASFrame>
  );
};

// ─── Portfolio ──────────────────────────────────────────────
const AtlasPortfolio = ({ mode='light' }) => {
  const T = asTheme(mode);
  return (
    <ASFrame mode={mode} tab="portfolio">
      <div style={{flex:1, overflow:'auto', padding:'28px 32px'}}>
        <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', borderBottom:`1px solid ${T.border}`, paddingBottom:20}}>
          <div>
            <div style={{fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:T.ai, fontWeight:600}}>Public profile</div>
            <div style={{fontSize:42, fontWeight:700, letterSpacing:'-.028em', marginTop:6, lineHeight:1}}>Tsuna<span style={{color:T.dim, fontWeight:400}}> · proof of work</span></div>
            <div style={{color:T.dim, marginTop:8, maxWidth:520, fontSize:13}}>7 projects shipped · {SAMPLE.skills.length} skills tracked · {SAMPLE.user}@nudg</div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button style={{padding:'8px 14px', border:`1px solid ${T.border}`, background:T.panel, borderRadius:6, fontSize:12, color:T.dim, cursor:'pointer'}}>Copy link</button>
            <button style={{padding:'8px 14px', border:'none', background:T.fg, color:T.bg, borderRadius:6, fontSize:12, cursor:'pointer', fontWeight:500}}>Export PDF</button>
          </div>
        </div>

        {/* metrics row */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginTop:18}}>
          {[
            ['Shipped','07', T.done],
            ['Streak','14d', T.ai],
            ['Focus hours','86', T.fg],
            ['Avg cycle','3.2w', T.fg],
            ['Top skill','AI/LLM', T.ai],
          ].map(([k,v,c]) => (
            <div key={k} style={{padding:'14px 16px', border:`1px solid ${T.border}`, borderRadius:10, background:T.panel}}>
              <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>{k}</div>
              <div style={{fontSize:26, fontWeight:600, letterSpacing:'-.02em', marginTop:4, color:c}}>{v}</div>
            </div>
          ))}
        </div>

        {/* radar + activity */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:14, marginTop:14}}>
          <div style={{padding:18, border:`1px solid ${T.border}`, borderRadius:10, background:T.panel}}>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600, marginBottom:6}}>Skill radar</div>
            <div style={{display:'grid', placeItems:'center', padding:'8px 0'}}>
              <RadarChart skills={SAMPLE.skills} T={{...T, ai:T.ai, font:T.mono, border:T.border}} size={240}/>
            </div>
            <div style={{fontSize:11, color:T.dim, textAlign:'center', marginTop:6}}>Auto-derived from deliverable verifications</div>
          </div>

          <div style={{padding:18, border:`1px solid ${T.border}`, borderRadius:10, background:T.panel}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
              <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>Build activity · last 30 days</div>
              <div style={{fontSize:11, color:T.dim, fontFamily:T.mono}}>142 commits · 86 focus hours</div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(15, 1fr)', gap:4}}>
              {Array.from({length:60}).map((_,i) => {
                const v = (Math.sin(i*0.7)+1)/2 * (0.4+Math.random()*0.6);
                const lvl = v<.2?0:v<.4?1:v<.6?2:v<.8?3:4;
                const op = [0.08, 0.3, 0.55, 0.78, 1][lvl];
                return <div key={i} style={{aspectRatio:'1', background:T.ai, opacity:op, borderRadius:3}}/>;
              })}
            </div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, fontSize:10, color:T.dim, fontFamily:T.mono}}>
              <span>Mar 30</span>
              <span style={{display:'flex', alignItems:'center', gap:4}}>
                less <span style={{display:'flex', gap:2}}>{[0.1,0.3,0.55,0.8,1].map((o,i)=> <span key={i} style={{width:10, height:10, background:T.ai, opacity:o, borderRadius:2}}/>)}</span> more
              </span>
              <span>Apr 29</span>
            </div>
          </div>
        </div>

        {/* case studies */}
        <div style={{marginTop:24}}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
            <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>Case studies · 7 shipped</div>
            <div style={{flex:1, height:1, background:T.border}}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14}}>
            {SAMPLE.shipped.map((p,i) => (
              <div key={p.name} style={{padding:0, border:`1px solid ${T.border}`, borderRadius:10, background:T.panel, overflow:'hidden'}}>
                <Placeholder label={p.name} h={140} color={T.fg} dense={6} style={{borderRadius:0, borderLeft:'none', borderRight:'none', borderTop:'none'}}/>
                <div style={{padding:14}}>
                  <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.done, fontWeight:600, display:'flex', alignItems:'center', gap:5}}>
                    <Icon name="check" size={10}/> Shipped {p.when}
                  </div>
                  <div style={{fontSize:16, fontWeight:600, marginTop:4, letterSpacing:'-.012em'}}>{p.name}</div>
                  <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:8}}>
                    {p.tags.map(t => (<span key={t} style={{fontSize:10, padding:'2px 7px', background:T.panel2, color:T.dim, borderRadius:4}}>{t}</span>))}
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:12, paddingTop:10, borderTop:`1px solid ${T.border}`, fontSize:11, color:T.dim}}>
                    <div><div style={{fontSize:9, letterSpacing:'.1em', textTransform:'uppercase'}}>Cycle</div><div style={{color:T.fg, fontFamily:T.mono, marginTop:2}}>{['18d','41d','12d'][i]}</div></div>
                    <div><div style={{fontSize:9, letterSpacing:'.1em', textTransform:'uppercase'}}>Focus</div><div style={{color:T.fg, fontFamily:T.mono, marginTop:2}}>{['14h','38h','9h'][i]}</div></div>
                    <div><div style={{fontSize:9, letterSpacing:'.1em', textTransform:'uppercase'}}>Tasks</div><div style={{color:T.fg, fontFamily:T.mono, marginTop:2}}>{['12','24','7'][i]}</div></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ASFrame>
  );
};

// ─── Focus ──────────────────────────────────────────────────
const AtlasFocus = ({ mode='light' }) => {
  const T = asTheme(mode);
  return (
    <div style={{width:'100%', height:'100%', background:T.bg, color:T.fg, fontFamily:T.font, display:'flex', flexDirection:'column', backgroundImage:`radial-gradient(ellipse 60% 50% at 50% 30%, ${T.ai}10, transparent 70%)`}}>
      <div style={{padding:'18px 28px', display:'flex', alignItems:'center', gap:14, fontSize:11, color:T.dim, fontFamily:T.mono}}>
        <span style={{display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:99, background:`${T.ai}15`, color:T.ai}}>
          <span style={{width:6, height:6, borderRadius:'50%', background:T.ai, boxShadow:`0 0 6px ${T.ai}`}}/> Focus block · 02 of 03
        </span>
        <span style={{flex:1}}/>
        <span>esc · exit</span>
      </div>
      <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px', textAlign:'center'}}>
        <div style={{fontSize:11, color:T.dim, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:10}}>Working on · Week 2 deliverable</div>
        <div style={{fontSize:42, fontWeight:600, letterSpacing:'-.025em', maxWidth:880, lineHeight:1.15}}>{SAMPLE.currentTask.title}</div>

        <div style={{marginTop:48, position:'relative'}}>
          <Ring value={42} size={280} stroke={3} color={T.ai} track={T.border}/>
          <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
            <div style={{fontVariantNumeric:'tabular-nums', fontSize:84, fontWeight:600, letterSpacing:'-.04em', lineHeight:1, color:T.fg}}>
              27<span style={{color:T.dim}}>:</span>14
            </div>
            <div style={{marginTop:8, fontSize:11, color:T.dim, letterSpacing:'.18em', textTransform:'uppercase', fontFamily:T.mono}}>remaining · 02 / 05</div>
          </div>
        </div>

        <div style={{marginTop:36, padding:'16px 22px', background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, maxWidth:640, display:'flex', gap:14, alignItems:'flex-start', textAlign:'left', boxShadow:`0 4px 16px ${T.fg}06`}}>
          <div style={{width:28, height:28, borderRadius:8, background:`${T.ai}15`, color:T.ai, display:'grid', placeItems:'center', flexShrink:0, fontWeight:700}}>1</div>
          <div style={{flex:1}}>
            <div style={{fontSize:10, color:T.ai, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase'}}>Start step</div>
            <div style={{marginTop:3, fontSize:14, lineHeight:1.4}}>{SAMPLE.currentTask.startStep}</div>
          </div>
          <button style={{border:`1px solid ${T.border}`, background:'transparent', color:T.dim, fontSize:11, padding:'5px 10px', borderRadius:6, cursor:'pointer'}}>Mark done</button>
        </div>
      </div>
      <div style={{padding:'24px 28px', display:'flex', justifyContent:'center', gap:10}}>
        {[['pause','Pause','Space'],['arrow','Next step','⌘→'],['check','Complete','⌘⏎']].map(([i,l,k]) => (
          <button key={l} style={{padding:'10px 18px', background:T.panel, border:`1px solid ${T.border}`, borderRadius:8, color:T.fg, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:T.font}}>
            <Icon name={i} size={12}/> {l} <span style={{color:T.dim, fontFamily:T.mono, fontSize:10}}>{k}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { AtlasDashboard, AtlasRoadmap, AtlasPortfolio, AtlasFocus });
