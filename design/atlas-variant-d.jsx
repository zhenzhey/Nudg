// ─────────────────────────────────────────────────────────────
// ATLAS DASHBOARD · Variant D — refined from C
// Changes: removed redundant black CTA, added Workshop-style agent input,
// added day calendar, reduced jargon (kept only "camp" + "distance"),
// kept the journey/companion feel but more harmonious + practical.
// ─────────────────────────────────────────────────────────────

const ATD_T = AS;  // light only

const ATDFrame = ({ children }) => {
  const T = ATD_T;
  return (
    <div style={{width:'100%', height:'100%', background:T.bg, color:T.fg, fontFamily:T.font, fontSize:13, display:'flex', flexDirection:'column'}}>
      <div style={{height:44, padding:'0 16px', display:'flex', alignItems:'center', gap:18, borderBottom:`1px solid ${T.border}`, background:T.panel}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{width:22, height:22, borderRadius:6, background:`linear-gradient(135deg, ${T.fg}, ${T.dim})`, color:T.bg, display:'grid', placeItems:'center', fontWeight:700, fontSize:11}}>N</div>
          <div style={{fontWeight:600}}>Nudg</div>
          <span style={{color:T.dimmer}}>/</span>
          <span style={{color:T.dim}}>{SAMPLE.user}</span>
          <span style={{color:T.dimmer}}>/</span>
          <span style={{color:T.fg, fontWeight:500}}>{SAMPLE.project.name}</span>
        </div>
        <div style={{flex:1, display:'flex', justifyContent:'center', gap:2, fontSize:12}}>
          {['Dashboard','Map','Calendar','Portfolio'].map(t => {
            const on=t==='Dashboard';
            return (
              <span key={t} style={{
                padding:'5px 10px', borderRadius:6, color: on? T.fg : T.dim,
                background: on? T.panel2 : 'transparent', cursor:'pointer', fontWeight: on? 500 : 400,
              }}>{t}</span>
            );
          })}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10, color:T.dim, fontSize:11}}>
          <span style={{fontFamily:T.mono, fontSize:10, color:T.ai, padding:'3px 8px', background:`${T.ai}10`, borderRadius:4}}>VARIANT · D</span>
          <span style={{padding:'3px 8px', border:`1px solid ${T.border}`, borderRadius:4, fontFamily:T.mono, fontSize:10}}>⌘K</span>
        </div>
      </div>
      {children}
    </div>
  );
};

const ATDSidebar = () => {
  const T = ATD_T;
  return (
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
        {SAMPLE.projects.filter(p=>p.status==='shipped').slice(0,2).map(p=>(
          <div key={p.name} style={{padding:'7px 8px', display:'flex', alignItems:'center', gap:8, color:T.dim}}>
            <div style={{width:6, height:6, borderRadius:'50%', background:T.done}}/>
            <div style={{fontSize:12}}>{p.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Reuses ATVMain from atlas-variants.jsx (it has the proper CTA button on the hero card)
// ATVMiniMapTiny also reused from atlas-variants.jsx

const AtlasDashD = () => {
  const T = ATD_T;
  return (
    <ATDFrame>
      <div style={{flex:1, display:'grid', gridTemplateColumns:'220px 1fr 360px', minHeight:0}}>
        <ATDSidebar/>
        <ATVMain pulse/>
        <div style={{borderLeft:`1px solid ${T.border}`, background:T.panel, display:'flex', flexDirection:'column', minHeight:0, overflow:'auto'}}>

          {/* TOP — Distance + camp framing. NO duplicate CTA. */}
          <div style={{padding:'16px 16px 14px', borderBottom:`1px solid ${T.border}`, background:`linear-gradient(180deg, ${T.aiSoft}50, ${T.panel} 80%)`, position:'relative', overflow:'hidden'}}>
            {/* subtle contour bg */}
            <svg style={{position:'absolute', inset:0, opacity:.4, pointerEvents:'none'}} width="100%" height="100%">
              <path d="M 0 80 Q 80 60, 160 70 T 360 50" fill="none" stroke={T.ai} strokeWidth=".7" strokeOpacity=".5"/>
              <path d="M 0 100 Q 80 80, 160 90 T 360 70" fill="none" stroke={T.ai} strokeWidth=".7" strokeOpacity=".3"/>
            </svg>

            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:10, position:'relative'}}>
              <div style={{width:7, height:7, borderRadius:'50%', background:T.ai, boxShadow:`0 0 0 3px ${T.ai}25, 0 0 10px ${T.ai}`}}/>
              <div style={{fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:T.ai, fontWeight:600}}>Today</div>
              <div style={{flex:1}}/>
              <div style={{fontSize:9, color:T.dim, fontFamily:T.mono}}>09:14 · since wake</div>
            </div>

            <div style={{position:'relative'}}>
              <div style={{fontSize:10, color:T.dim, letterSpacing:'.05em', marginBottom:4}}>You're 2.4 km from</div>
              <div style={{fontSize:20, fontWeight:600, letterSpacing:'-.018em', color:T.fg, lineHeight:1.15, marginBottom:10}}>
                Camp Tool-loop<br/>
                <span style={{fontSize:12, color:T.ai, fontWeight:500}}>↑ unlocks v0.4 milestone</span>
              </div>

              {/* distance bar */}
              <div style={{margin:'10px 0'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:T.dim, fontFamily:T.mono, marginBottom:4}}>
                  <span>Today's distance</span>
                  <span style={{color:T.ai}}>1.2 / 3.6 km</span>
                </div>
                <div style={{height:8, borderRadius:4, background:T.panel2, overflow:'hidden', position:'relative', border:`1px solid ${T.border}`}}>
                  <div style={{position:'absolute', left:0, top:0, bottom:0, width:'33%', background:`linear-gradient(90deg, ${T.ai}aa, ${T.ai})`, boxShadow:`0 0 8px ${T.ai}80`}}/>
                  <div style={{position:'absolute', left:'33%', top:-3, bottom:-3, width:1, background:T.fg}}/>
                  <div style={{position:'absolute', left:'66%', top:-3, bottom:-3, width:1, background:T.borderHi}}/>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:T.dim, fontFamily:T.mono, marginTop:4}}>
                  <span style={{color:T.ai}}>● Now</span>
                  <span>○ Tool-loop</span>
                  <span>○ v0.4</span>
                </div>
              </div>

              {/* projection — no button, just the temptation */}
              <div style={{padding:'9px 11px', background:T.panel, border:`1px solid ${T.ai}30`, borderLeft:`3px solid ${T.ai}`, borderRadius:'4px 8px 8px 4px', fontSize:11, lineHeight:1.5, marginTop:6}}>
                <div style={{fontSize:9, color:T.ai, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:3}}>If you start now</div>
                <div style={{color:T.fg}}>Reach Tool-loop by <span style={{fontFamily:T.mono, fontWeight:600}}>11:44am</span>. Save the afternoon for v0.4.</div>
              </div>
            </div>
          </div>

          {/* Stats — supportive, not headline */}
          <div style={{padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
            {[
              ['Streak', '8 days', T.fg],
              ['Yesterday', '3h 42m', T.done],
              ['This week', '14h', T.ai],
            ].map(([l,v,c],i)=>(
              <div key={i} style={{textAlign:'center'}}>
                <div style={{fontSize:9, color:T.dim, letterSpacing:'.08em', textTransform:'uppercase'}}>{l}</div>
                <div style={{fontFamily:T.mono, fontSize:15, fontWeight:600, color:c, marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Agent — Workshop-style. Input + 2-3 suggestion chips. */}
          <div style={{padding:'14px 16px', borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:8}}>
              <Icon name="spark" size={11} style={{color:T.ai}}/>
              <div style={{fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:T.ai, fontWeight:600}}>Ask Pilot</div>
              <div style={{flex:1}}/>
              <span style={{fontSize:9, color:T.dimmer, fontFamily:T.mono}}>context · loaded</span>
            </div>
            <div style={{
              border:`1px solid ${T.border}`, borderRadius:8, background:T.bg,
              padding:'10px 12px', minHeight:60, display:'flex', flexDirection:'column', gap:8,
            }}>
              <div style={{color:T.dimmer, fontSize:12, fontStyle:'italic'}}>
                Plan my afternoon · split this task · draft check-in...
              </div>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {['Why am I behind?', 'Split tool-loop task', 'Draft Marcus update'].map(s => (
                  <span key={s} style={{
                    fontSize:10, padding:'3px 8px', border:`1px solid ${T.border}`,
                    borderRadius:4, color:T.dim, cursor:'pointer', background:T.panel,
                  }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Mini map */}
          <div style={{padding:14, borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
              <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>Project Map</div>
              <span style={{fontSize:9, color:T.ai, cursor:'pointer'}}>Open ↗</span>
            </div>
            <ATVMiniMapTiny T={T}/>
          </div>

          {/* Calendar — compact day view */}
          <div style={{padding:'12px 16px', borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div style={{fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:T.dim, fontWeight:600}}>Today · Apr 29</div>
              <div style={{fontSize:9, color:T.dim, fontFamily:T.mono}}>3 blocks · 5h 15m</div>
            </div>
            <div style={{position:'relative', height:200, fontSize:10, color:T.dimmer}}>
              {[10,11,12,1,2,3].map((h,i) => (
                <div key={h} style={{position:'absolute', left:0, right:0, top:i*34, height:34, borderTop:`1px solid ${T.border}`, paddingLeft:26}}>
                  <span style={{position:'absolute', left:0, top:-5, fontSize:9, fontFamily:T.mono}}>{h<=9?h+'pm':h===10||h===11?h+'am':h===12?'12pm':h+'pm'}</span>
                </div>
              ))}
              <div style={{position:'absolute', left:26, right:6, top:75, height:85, background:`${T.ai}18`, borderLeft:`3px solid ${T.ai}`, borderRadius:'4px 6px 6px 4px', padding:'6px 10px'}}>
                <div style={{fontSize:9, color:T.ai, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase'}}>Focus · protected</div>
                <div style={{fontSize:11, fontWeight:500, marginTop:2, color:T.fg}}>Wire tool-calling loop</div>
                <div style={{fontSize:9, color:T.dim, marginTop:1, fontFamily:T.mono}}>12:30 – 3:00pm</div>
              </div>
              <div style={{position:'absolute', left:26, right:6, top:170, height:24, background:T.panel2, borderLeft:`3px solid ${T.borderHi}`, borderRadius:'4px 6px 6px 4px', padding:'2px 10px'}}>
                <div style={{fontSize:10, fontWeight:500}}>Pair w/ Marcus</div>
              </div>
            </div>
          </div>

          {/* Check-in */}
          <div style={{padding:14}}>
            <div style={{padding:'10px 12px', border:`1px solid ${T.border}`, borderRadius:8, background:T.panel2, display:'flex', alignItems:'center', gap:10}}>
              <div style={{width:28, height:28, borderRadius:'50%', background:T.borderHi, color:T.bg, display:'grid', placeItems:'center', fontWeight:600, fontSize:12, flexShrink:0}}>M</div>
              <div style={{flex:1, fontSize:11}}>
                <div style={{color:T.fg, fontWeight:500}}>Marcus expects a check-in</div>
                <div style={{color:T.dim, fontSize:10, marginTop:1}}>in 7h 46m · last sent yesterday</div>
              </div>
              <span style={{fontSize:10, color:T.ai, cursor:'pointer', fontWeight:500}}>Draft</span>
            </div>
          </div>
        </div>
      </div>
    </ATDFrame>
  );
};

Object.assign(window, { AtlasDashD });
