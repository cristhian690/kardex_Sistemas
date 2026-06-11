import { useState, useEffect, useRef } from 'react'
import type { FormEvent, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

interface Particle { x:number;y:number;vx:number;vy:number;r:number;c:[number,number,number];a:number }
interface Triangle  { cx:number;cy:number;vx:number;vy:number;va:number;angle:number;sz:number;c:[number,number,number];a:number }
interface Orb       { x:number;y:number;vx:number;vy:number;r:number;col:string }

const PAL: [number,number,number][] = [
  [56,139,221],[91,163,232],[33,118,204],[100,80,220],[140,60,240],[56,200,200],
]

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const rsz = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight }
    rsz(); window.addEventListener('resize', rsz)

    const pts: Particle[] = Array.from({length:60}, () => ({
      x:Math.random(),y:Math.random(),
      vx:(Math.random()-.5)*.00014,vy:(Math.random()-.5)*.00014,
      r:Math.random()*1.6+.4,
      c:PAL[Math.floor(Math.random()*PAL.length)],
      a:Math.random()*.45+.15,
    }))

    const tris: Triangle[] = Array.from({length:8}, () => ({
      cx:Math.random(),cy:Math.random(),
      vx:(Math.random()-.5)*.00006,vy:(Math.random()-.5)*.00006,
      va:(Math.random()-.5)*.0004,
      angle:Math.random()*Math.PI*2,
      sz:.06+Math.random()*.12,
      c:PAL[Math.floor(Math.random()*PAL.length)],
      a:Math.random()*.18+.06,
    }))

    const orbs: Orb[] = [
      {x:.15,y:.2,vx:.00005,vy:.00007,r:220,col:'56,180,220'},
      {x:.85,y:.75,vx:-.00006,vy:-.00005,r:260,col:'100,60,220'},
      {x:.5,y:.9,vx:.00004,vy:-.00004,r:180,col:'30,100,200'},
    ]

    let frame = 0, raf: number

    function draw() {
      const W = cv.width, H = cv.height
      ctx.clearRect(0,0,W,H)

      const bg = ctx.createLinearGradient(0,0,W,H)
      bg.addColorStop(0,'#04080f'); bg.addColorStop(.5,'#060d1a'); bg.addColorStop(1,'#050a12')
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H)

      for (const o of orbs) {
        o.x+=o.vx; o.y+=o.vy
        if(o.x<0||o.x>1)o.vx*=-1; if(o.y<0||o.y>1)o.vy*=-1
        const gx=o.x*W, gy=o.y*H
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,o.r)
        g.addColorStop(0,`rgba(${o.col},.12)`); g.addColorStop(1,`rgba(${o.col},0)`)
        ctx.beginPath(); ctx.arc(gx,gy,o.r,0,Math.PI*2)
        ctx.fillStyle=g; ctx.fill()
      }

      for (const t of tris) {
        t.cx+=t.vx; t.cy+=t.vy; t.angle+=t.va
        if(t.cx<-.1||t.cx>1.1)t.vx*=-1; if(t.cy<-.1||t.cy>1.1)t.vy*=-1
        const tx=t.cx*W, ty=t.cy*H, s=t.sz*Math.min(W,H)
        const [r,g,b]=t.c
        ctx.save(); ctx.translate(tx,ty); ctx.rotate(t.angle)
        ctx.beginPath(); ctx.moveTo(0,-s); ctx.lineTo(s*.866,s*.5); ctx.lineTo(-s*.866,s*.5); ctx.closePath()
        ctx.strokeStyle=`rgba(${r},${g},${b},${t.a*1.5})`; ctx.lineWidth=.8; ctx.stroke()
        ctx.fillStyle=`rgba(${r},${g},${b},${t.a*.4})`; ctx.fill()
        ctx.restore()
      }

      for (let i=0;i<pts.length;i++) {
        for (let j=i+1;j<pts.length;j++) {
          const p=pts[i], q=pts[j]
          const dx=(p.x-q.x)*W, dy=(p.y-q.y)*H
          const d=Math.sqrt(dx*dx+dy*dy)
          if(d<100){
            ctx.beginPath(); ctx.moveTo(p.x*W,p.y*H); ctx.lineTo(q.x*W,q.y*H)
            ctx.strokeStyle=`rgba(56,139,221,${.14*(1-d/100)})`
            ctx.lineWidth=.5; ctx.stroke()
          }
        }
      }

      for (const p of pts) {
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0||p.x>1)p.vx*=-1; if(p.y<0||p.y>1)p.vy*=-1
        const pulse=Math.sin(frame*.018+p.r*8)*.08
        const [r,g,b]=p.c
        ctx.beginPath(); ctx.arc(p.x*W,p.y*H,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(${r},${g},${b},${Math.max(0,p.a+pulse)})`
        ctx.fill()
      }

      frame++; raf=requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',rsz) }
  }, [])

  return <canvas ref={ref} style={canvasStyle} aria-hidden="true" />
}

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [mounted,  setMounted]  = useState(false)
  const [shake,    setShake]    = useState(false)
  const [focused,  setFocused]  = useState<'u'|'p'|null>(null)

  const cardRef      = useRef<HTMLDivElement>(null)
  const glowRef      = useRef<HTMLDivElement>(null)
  const shineRef     = useRef<HTMLDivElement>(null)
  const mousePos     = useRef({ x: 0.5, y: 0.5 })
  const tiltTarget   = useRef({ rx: 0, ry: 0 })
  const tiltCurrent  = useRef({ rx: 0, ry: 0 })
  const rafTilt      = useRef<number>(0)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  // ── Efecto tilt + glow suave ──────────────────────────────────────────────
  useEffect(() => {
    const card  = cardRef.current
    const glow  = glowRef.current
    const shine = shineRef.current
    if (!card || !glow || !shine) return

    const onMove = (e: MouseEvent) => {
      const r  = card.getBoundingClientRect()
      const mx = (e.clientX - r.left) / r.width   // 0..1
      const my = (e.clientY - r.top)  / r.height  // 0..1
      mousePos.current = { x: mx, y: my }

      // Tilt target
      tiltTarget.current = {
        rx: (my - 0.5) * -10,
        ry: (mx - 0.5) *  10,
      }

      // Glow spotlight: sigue al cursor dentro del card
      const gx = mx * 100
      const gy = my * 100
      glow.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(91,163,232,0.18) 0%, transparent 65%)`
      glow.style.opacity = '1'

      // Shine reflection: barra diagonal que sigue al mouse
      const angle  = mx * 60 - 30
      const posX   = mx * 120 - 10
      shine.style.background = `linear-gradient(${angle}deg, transparent 30%, rgba(255,255,255,0.055) 50%, transparent 70%)`
      shine.style.backgroundPositionX = `${posX}%`
      shine.style.opacity = '1'
    }

    const onLeave = () => {
      tiltTarget.current = { rx: 0, ry: 0 }
      glow.style.opacity  = '0'
      shine.style.opacity = '0'
    }

    // Loop de interpolación suave del tilt
    const tick = () => {
      const cur = tiltCurrent.current
      const tgt = tiltTarget.current
      cur.rx += (tgt.rx - cur.rx) * 0.08
      cur.ry += (tgt.ry - cur.ry) * 0.08
      card.style.transform = `perspective(1200px) rotateX(${cur.rx}deg) rotateY(${cur.ry}deg)`
      rafTilt.current = requestAnimationFrame(tick)
    }
    rafTilt.current = requestAnimationFrame(tick)

    card.addEventListener('mousemove', onMove)
    card.addEventListener('mouseleave', onLeave)
    return () => {
      card.removeEventListener('mousemove', onMove)
      card.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafTilt.current)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      await login({ username, password })
      toast.success(`Bienvenido, ${username}`)
      navigate('/', { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Credenciales incorrectas')
      setShake(true); setTimeout(() => setShake(false), 600)
    } finally { setLoading(false) }
  }

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading

  return (
    <div style={pageStyle}>
      <style>{css}</style>
      <ParticleCanvas />

      <div
        ref={cardRef}
        style={{
          ...cardStyle,
          opacity:   mounted ? 1 : 0,
          transform: mounted
            ? 'perspective(1200px) rotateX(0) rotateY(0) translateY(0)'
            : 'perspective(1200px) rotateX(0) rotateY(0) translateY(30px)',
          animation: shake ? 'kshake .5s ease' : undefined,
        }}
      >
        {/* ── Capa de resplandor (glow spotlight) ── */}
        <div
          ref={glowRef}
          style={{
            position: 'absolute', inset: 0, borderRadius: 20,
            pointerEvents: 'none', zIndex: 0,
            opacity: 0,
            transition: 'opacity .3s ease',
          }}
          aria-hidden="true"
        />

        {/* ── Capa de shine (reflejo diagonal) ── */}
        <div
          ref={shineRef}
          style={{
            position: 'absolute', inset: 0, borderRadius: 20,
            pointerEvents: 'none', zIndex: 0,
            opacity: 0,
            transition: 'opacity .4s ease',
          }}
          aria-hidden="true"
        />

        {/* ── Borde luminoso animado ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          pointerEvents: 'none', zIndex: 0,
          background: 'transparent',
          boxShadow: 'inset 0 0 0 1px rgba(91,163,232,0.0)',
        }} aria-hidden="true" />

        {/* ── Contenido (zIndex 1 para estar sobre las capas de efecto) ── */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <div style={logoBoxStyle} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <div>
              <div style={{ color:'rgba(255,255,255,.92)', fontSize:15, fontWeight:700, letterSpacing:'.06em' }}>KARDEX</div>
              <div style={{ color:'rgba(100,160,220,.6)', fontSize:9.5, letterSpacing:'.18em', textTransform:'uppercase', marginTop:1 }}>Sistema CPP</div>
            </div>
            <div style={versionStyle}>v2.0</div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom:22 }}>
            <h1 style={{ color:'rgba(255,255,255,.92)', fontSize:22, fontWeight:700, margin:'0 0 5px', letterSpacing:'-.01em' }}>Iniciar sesión</h1>
            <p  style={{ color:'rgba(100,150,210,.65)', fontSize:13, margin:0 }}>Accede a tu panel de control</p>
          </div>
          <div style={divStyle} aria-hidden="true" />

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ marginTop:22 }}>

            <div style={{ marginBottom:16 }}>
              <label htmlFor="login-user" style={labelStyle}>
                <span style={dotSt(focused==='u')} aria-hidden="true" />Usuario
              </label>
              <div style={wrapSt(focused==='u')}>
                <UserIcon />
                <input id="login-user" type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocused('u')} onBlur={() => setFocused(null)}
                  autoFocus required disabled={loading}
                  autoComplete="username" placeholder="Tu nombre de usuario"
                  style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom:26 }}>
              <label htmlFor="login-pass" style={labelStyle}>
                <span style={dotSt(focused==='p')} aria-hidden="true" />Contraseña
              </label>
              <div style={wrapSt(focused==='p')}>
                <LockIcon />
                <input id="login-pass" type={showPass?'text':'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('p')} onBlur={() => setFocused(null)}
                  required disabled={loading}
                  autoComplete="current-password" placeholder="••••••••"
                  style={inputStyle} />
                <button type="button" onClick={() => setShowPass(v => !v)} style={eyeStyle}
                  tabIndex={-1} aria-label={showPass?'Ocultar':'Mostrar contraseña'}>
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={!canSubmit} className="kbtn" style={btnSt(canSubmit)} aria-busy={loading}>
              {loading
                ? <><span style={spinStyle} aria-hidden="true" />Verificando…</>
                : <>Entrar
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
              }
            </button>
          </form>

          <p style={{ textAlign:'center', color:'rgba(60,100,150,.38)', fontSize:11, marginTop:22, letterSpacing:'.04em' }}>
            Sistema de Control de Inventarios · CPP
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const icoSt: CSSProperties = { position:'absolute', left:13, color:'rgba(80,130,190,.5)', pointerEvents:'none' }
const UserIcon = () => (
  <svg style={icoSt} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const LockIcon = () => (
  <svg style={icoSt} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ── Dynamic styles ────────────────────────────────────────────────────────────
const dotSt = (on: boolean): CSSProperties => ({
  display:'inline-block', width:5, height:5, borderRadius:'50%',
  background: on ? '#5ba3e8' : 'rgba(56,139,221,.28)',
  boxShadow: on ? '0 0 6px rgba(91,163,232,.7)' : 'none',
  marginRight:6, verticalAlign:'middle', marginBottom:1,
  transition:'background .2s, box-shadow .2s',
})
const wrapSt = (on: boolean): CSSProperties => ({
  position:'relative', display:'flex', alignItems:'center',
  background:'rgba(0,0,0,.22)',
  border:`1px solid ${on ? 'rgba(91,163,232,.48)' : 'rgba(255,255,255,.07)'}`,
  borderRadius:10,
  boxShadow: on ? '0 0 0 3px rgba(56,139,221,.1), inset 0 0 20px rgba(56,139,221,.03)' : 'none',
  transition:'border-color .2s, box-shadow .2s, background .2s',
})
const btnSt = (can: boolean): CSSProperties => ({
  width:'100%', padding:'13px',
  background: can
    ? 'linear-gradient(135deg,rgba(24,96,190,.82) 0%,rgba(56,139,221,.88) 50%,rgba(24,96,190,.82) 100%)'
    : 'rgba(255,255,255,.03)',
  backgroundSize:'200% 100%',
  color: can ? '#fff' : 'rgba(80,120,170,.38)',
  border:`1px solid ${can ? 'rgba(91,163,232,.32)' : 'rgba(255,255,255,.05)'}`,
  borderRadius:10, fontSize:14, fontWeight:600,
  cursor: can ? 'pointer' : 'not-allowed',
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  transition:'all .25s ease', letterSpacing:'.03em', fontFamily:'inherit',
  backdropFilter:'blur(4px)',
})

// ── Static styles ─────────────────────────────────────────────────────────────
const pageStyle: CSSProperties = {
  minHeight:'100vh', background:'#04080f',
  display:'flex', alignItems:'center', justifyContent:'center',
  padding:20, fontFamily:"'Inter',system-ui,-apple-system,sans-serif",
  overflow:'hidden', position:'relative',
}
const canvasStyle: CSSProperties = {
  position:'fixed', inset:0, width:'100%', height:'100%', zIndex:0, pointerEvents:'none',
}
const cardStyle: CSSProperties = {
  width:'100%', maxWidth:400,
  background:'rgba(255,255,255,.04)',
  border:'1px solid rgba(255,255,255,.09)',
  borderRadius:20, padding:'36px 32px 28px',
  position:'relative', zIndex:2, overflow:'hidden',
  backdropFilter:'blur(26px)',
  WebkitBackdropFilter:'blur(26px)',
  transition:'opacity .6s ease, transform .6s cubic-bezier(.16,1,.3,1)',
  willChange:'transform',
}
const logoBoxStyle: CSSProperties = {
  width:42, height:42,
  background:'rgba(56,139,221,.14)',
  border:'1px solid rgba(56,139,221,.28)',
  borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
  color:'#5ba3e8', flexShrink:0,
}
const versionStyle: CSSProperties = {
  marginLeft:'auto', background:'rgba(56,139,221,.1)',
  border:'1px solid rgba(56,139,221,.22)', borderRadius:20,
  padding:'2px 9px', fontSize:10, color:'#5ba3e8', fontWeight:600,
}
const divStyle: CSSProperties = {
  height:1,
  background:'linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)',
  margin:'0 -8px',
}
const labelStyle: CSSProperties = {
  display:'block', color:'rgba(140,185,230,.78)', fontSize:12, marginBottom:7,
  fontWeight:500, letterSpacing:'.03em',
}
const inputStyle: CSSProperties = {
  width:'100%', background:'transparent', border:'none',
  padding:'12px 40px 12px 40px',
  color:'rgba(225,235,250,.95)', fontSize:14, outline:'none',
  boxSizing:'border-box', letterSpacing:'.01em', fontFamily:'inherit',
}
const eyeStyle: CSSProperties = {
  position:'absolute', right:10, background:'none', border:'none',
  cursor:'pointer', color:'rgba(80,130,190,.45)', padding:4,
  display:'flex', alignItems:'center', borderRadius:4, transition:'color .15s',
}
const spinStyle: CSSProperties = {
  width:14, height:14,
  border:'2px solid rgba(255,255,255,.2)',
  borderTop:'2px solid #fff',
  borderRadius:'50%',
  display:'inline-block',
  animation:'kspin .7s linear infinite',
  flexShrink:0,
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @keyframes kspin { to { transform: rotate(360deg); } }
  @keyframes kshake {
    0%,100%{transform:perspective(1200px) translateX(0);}
    20%{transform:perspective(1200px) translateX(-9px);}
    40%{transform:perspective(1200px) translateX(9px);}
    60%{transform:perspective(1200px) translateX(-5px);}
    80%{transform:perspective(1200px) translateX(5px);}
  }
  #login-user::placeholder,#login-pass::placeholder{color:rgba(80,120,170,.38) !important;}
  #login-user:disabled,#login-pass:disabled{opacity:.5;}
  .kbtn:not(:disabled):hover{
    box-shadow:0 4px 28px rgba(56,139,221,.42), 0 0 0 1px rgba(91,163,232,.25) !important;
    transform:translateY(-1px) !important;
  }
  .kbtn:not(:disabled):active{transform:translateY(0) !important;box-shadow:none !important;}
  @media (prefers-reduced-motion:reduce){*,canvas{animation:none !important;transition:none !important;}}
`