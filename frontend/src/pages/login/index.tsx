"use client"

import { useEffect, useState, useRef } from 'react'
import { LoginForm } from "./components/login-form"
import { cn } from "@/lib/utils"

interface Particle { x: number; y: number; vx: number; vy: number; r: number; c: [number, number, number]; a: number }
interface Triangle { cx: number; cy: number; vx: number; vy: number; va: number; angle: number; sz: number; c: [number, number, number]; a: number }
interface Orb { x: number; y: number; vx: number; vy: number; r: number; col: string }

const PAL: [number, number, number][] = [
  [56, 139, 221], [91, 163, 232], [33, 118, 204], [100, 80, 220], [140, 60, 240], [56, 200, 200],
]

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const rsz = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight }
    rsz(); window.addEventListener('resize', rsz)

    const pts: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * .00014, vy: (Math.random() - .5) * .00014,
      r: Math.random() * 1.6 + .4,
      c: PAL[Math.floor(Math.random() * PAL.length)],
      a: Math.random() * .45 + .15,
    }))

    const tris: Triangle[] = Array.from({ length: 8 }, () => ({
      cx: Math.random(), cy: Math.random(),
      vx: (Math.random() - .5) * .00006, vy: (Math.random() - .5) * .00006,
      va: (Math.random() - .5) * .0004,
      angle: Math.random() * Math.PI * 2,
      sz: .06 + Math.random() * .12,
      c: PAL[Math.floor(Math.random() * PAL.length)],
      a: Math.random() * .18 + .06,
    }))

    const orbs: Orb[] = [
      { x: .15, y: .2, vx: .00005, vy: .00007, r: 220, col: '56,180,220' },
      { x: .85, y: .75, vx: -.00006, vy: -.00005, r: 260, col: '100,60,220' },
      { x: .5, y: .9, vx: .00004, vy: -.00004, r: 180, col: '30,100,200' },
    ]

    let frame = 0, raf: number

    function draw() {
      const W = cv.width, H = cv.height
      ctx.clearRect(0, 0, W, H)

      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, '#04080f'); bg.addColorStop(.5, '#060d1a'); bg.addColorStop(1, '#050a12')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      for (const o of orbs) {
        o.x += o.vx; o.y += o.vy
        if (o.x < 0 || o.x > 1) o.vx *= -1; if (o.y < 0 || o.y > 1) o.vy *= -1
        const gx = o.x * W, gy = o.y * H
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, o.r)
        g.addColorStop(0, `rgba(${o.col},.12)`); g.addColorStop(1, `rgba(${o.col},0)`)
        ctx.beginPath(); ctx.arc(gx, gy, o.r, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
      }

      for (const t of tris) {
        t.cx += t.vx; t.cy += t.vy; t.angle += t.va
        if (t.cx < -.1 || t.cx > 1.1) t.vx *= -1; if (t.cy < -.1 || t.cy > 1.1) t.vy *= -1
        const tx = t.cx * W, ty = t.cy * H, s = t.sz * Math.min(W, H)
        const [r, g, b] = t.c
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(t.angle)
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .866, s * .5); ctx.lineTo(-s * .866, s * .5); ctx.closePath()
        ctx.strokeStyle = `rgba(${r},${g},${b},${t.a * 1.5})`; ctx.lineWidth = .8; ctx.stroke()
        ctx.fillStyle = `rgba(${r},${g},${b},${t.a * .4})`; ctx.fill()
        ctx.restore()
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const p = pts[i], q = pts[j]
          const dx = (p.x - q.x) * W, dy = (p.y - q.y) * H
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(p.x * W, p.y * H); ctx.lineTo(q.x * W, q.y * H)
            ctx.strokeStyle = `rgba(56,139,221,${.14 * (1 - d / 100)})`
            ctx.lineWidth = .5; ctx.stroke()
          }
        }
      }

      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1
        const pulse = Math.sin(frame * .018 + p.r * 8) * .08
        const [r, g, b] = p.c
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, p.a + pulse)})`
        ctx.fill()
      }

      frame++; raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', rsz) }
  }, [])

  return <canvas ref={ref} className="position fixed inset-0 w-full h-full z-0 pointer-events-none" aria-hidden="true" />
}

export default function LoginPage() {
  const [shake, setShake] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden bg-[#04080f]">
      
      {/* Animaciones de sacudida inyectadas */}
      <style>{`
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .animate-shake { animation: login-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      {/* Fondo de Partículas Original */}
      <ParticleCanvas />

      {/* Contenedor del Formulario Adaptado */}
      <div 
        className={cn(
          "w-full max-w-sm md:max-w-3xl z-10 transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-6",
          shake && "animate-shake"
        )}
      >
        <LoginForm onShakeTrigger={triggerShake} />
      </div>
    </div>
  )
}