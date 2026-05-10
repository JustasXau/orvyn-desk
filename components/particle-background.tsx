'use client'

import { useEffect, useRef } from 'react'

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    console.log('[v0] ParticleBackground mounted')
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('[v0] Canvas not found')
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('[v0] Context not found')
      return
    }
    console.log('[v0] Canvas ready, starting animation')

    let animationId: number
    let rotationY = 0
    let time = 0
    let lastGlitch = 0

    const dpr = window.devicePixelRatio || 1

    const setupCanvas = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }

    setupCanvas()
    window.addEventListener('resize', setupCanvas)

    const W = () => window.innerWidth
    const H = () => window.innerHeight
    const cx = () => W() / 2
    const cy = () => H() / 2
    const baseRadius = () => Math.min(W(), H()) * 0.25

    // 400 nodes on a sphere
    const nodes = Array.from({ length: 400 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos(2 * Math.random() - 1),
      radiusOffset: 0.85 + Math.random() * 0.3,
      pulseOffset: Math.random() * Math.PI * 2,
      brightness: 0.3 + Math.random() * 0.7,
      size: 0.5 + Math.random() * 2,
    }))

    // 80 filaments
    const filaments = Array.from({ length: 80 }, () => ({
      nodeA: Math.floor(Math.random() * nodes.length),
      nodeB: Math.floor(Math.random() * nodes.length),
      life: Math.random(),
      speed: 0.005 + Math.random() * 0.01,
    }))

    // 60 orbital particles
    const particles = Array.from({ length: 60 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.015,
      orbitMult: 1.1 + Math.random() * 0.3,
      inclination: (Math.random() - 0.5) * Math.PI * 0.4,
      size: 1 + Math.random() * 2,
    }))

    // 3 orbital rings
    const rings = [
      { rotationAngle: 0, inclination: 0.25 },
      { rotationAngle: Math.PI / 3, inclination: -0.35 },
      { rotationAngle: Math.PI / 2, inclination: 0.15 },
    ]

    // 3D -> 2D projection
    const project = (x: number, y: number, z: number, rX: number, rY: number) => {
      const cosY = Math.cos(rY), sinY = Math.sin(rY)
      const x1 = x * cosY - z * sinY
      const z1 = x * sinY + z * cosY
      const cosX = Math.cos(rX), sinX = Math.sin(rX)
      const y2 = y * cosX - z1 * sinX
      const z2 = y * sinX + z1 * cosX
      const f = 800
      const s = f / (f + z2)
      return { x: cx() + x1 * s, y: cy() + y2 * s, z: z2 }
    }

    const glitch = () => {
      const gy = Math.random() * H()
      const gh = 20 + Math.random() * 40
      try {
        const img = ctx.getImageData(0, gy * dpr, canvas.width, gh * dpr)
        const offset = (Math.random() - 0.5) * 20
        ctx.putImageData(img, offset, gy)
      } catch (_) {}
      ctx.strokeStyle = 'rgba(168,85,247,0.8)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(W(), gy)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, gy + gh)
      ctx.lineTo(W(), gy + gh)
      ctx.stroke()
    }

    const animate = () => {
      time += 0.016
      rotationY += 0.008
      const rX = Math.sin(time * 0.3) * 0.3
      const pulse = Math.sin(time * 2) * 0.5 + 0.5
      const br = baseRadius()

      ctx.fillStyle = 'rgba(10,6,18,0.15)'
      ctx.fillRect(0, 0, W(), H())

      // Orbital rings
      rings.forEach((ring, i) => {
        const rp = Math.sin(time * 1.5 + i) * 0.5 + 0.5
        ctx.save()
        ctx.strokeStyle = `rgba(168,85,247,${0.08 + rp * 0.12})`
        ctx.lineWidth = 1
        ctx.shadowBlur = 15
        ctx.shadowColor = 'rgba(168,85,247,0.5)'
        ctx.beginPath()
        ctx.ellipse(
          cx(),
          cy(),
          br * 1.25 * (1 + i * 0.12) * (1 + pulse * 0.04),
          br * 1.25 * (1 + i * 0.12) * Math.abs(Math.cos(ring.inclination)) * (1 + pulse * 0.04),
          ring.rotationAngle,
          0,
          Math.PI * 2
        )
        ctx.stroke()
        ctx.restore()
      })

      // Filaments
      filaments.forEach(fil => {
        fil.life += fil.speed
        if (fil.life > 1) fil.life = 0
        const nA = nodes[fil.nodeA], nB = nodes[fil.nodeB]
        const rA = br * nA.radiusOffset
        const pA = project(
          rA * Math.sin(nA.phi) * Math.cos(nA.theta),
          rA * Math.sin(nA.phi) * Math.sin(nA.theta),
          rA * Math.cos(nA.phi),
          rX,
          rotationY
        )
        const rB = br * nB.radiusOffset
        const pB = project(
          rB * Math.sin(nB.phi) * Math.cos(nB.theta),
          rB * Math.sin(nB.phi) * Math.sin(nB.theta),
          rB * Math.cos(nB.phi),
          rX,
          rotationY
        )
        const alpha = fil.life < 0.5 ? fil.life * 2 : (1 - fil.life) * 2
        const grad = ctx.createLinearGradient(pA.x, pA.y, pB.x, pB.y)
        grad.addColorStop(0, 'rgba(168,85,247,0)')
        grad.addColorStop(0.5, `rgba(139,92,246,${alpha * 0.35})`)
        grad.addColorStop(1, 'rgba(168,85,247,0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.stroke()
      })

      // Project nodes back-to-front
      const projected = nodes.map(n => {
        const r = br * n.radiusOffset
        const p = project(
          r * Math.sin(n.phi) * Math.cos(n.theta),
          r * Math.sin(n.phi) * Math.sin(n.theta),
          r * Math.cos(n.phi),
          rX,
          rotationY
        )
        return { ...p, n }
      })
      projected.sort((a, b) => a.z - b.z)

      // Inter-node connections
      for (let i = 0; i < projected.length; i++) {
        const pA = projected[i]
        for (let j = i + 1; j < Math.min(i + 5, projected.length); j++) {
          const pB = projected[j]
          const dist = Math.hypot(pA.x - pB.x, pA.y - pB.y)
          if (dist < 50) {
            ctx.strokeStyle = `rgba(168,85,247,${(1 - dist / 50) * 0.15})`
            ctx.lineWidth = 0.4
            ctx.beginPath()
            ctx.moveTo(pA.x, pA.y)
            ctx.lineTo(pB.x, pB.y)
            ctx.stroke()
          }
        }
      }

      // Nodes
      projected.forEach(({ x, y, n }) => {
        const np = Math.sin(time * 3 + n.pulseOffset) * 0.3 + 0.7
        const bright = n.brightness * np
        const s = n.size * (1 + pulse * 0.2)
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4)
        g.addColorStop(0, `rgba(196,132,252,${bright * 0.9})`)
        g.addColorStop(0.5, `rgba(139,92,246,${bright * 0.3})`)
        g.addColorStop(1, 'rgba(168,85,247,0)')
        ctx.fillStyle = g
        ctx.shadowBlur = 6
        ctx.shadowColor = `rgba(168,85,247,${bright})`
        ctx.beginPath()
        ctx.arc(x, y, s * 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = `rgba(255,255,255,${bright})`
        ctx.beginPath()
        ctx.arc(x, y, s * 0.8, 0, Math.PI * 2)
        ctx.fill()
      })

      // Orbital particles
      particles.forEach(p => {
        p.angle += p.speed
        const r = br * p.orbitMult
        const px = r * Math.cos(p.angle)
        const py = r * Math.sin(p.angle) * Math.cos(p.inclination)
        const pz = r * Math.sin(p.angle) * Math.sin(p.inclination)
        const proj = project(px, py, pz, rX, rotationY)
        ctx.fillStyle = 'rgba(196,132,252,0.85)'
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(168,85,247,0.8)'
        ctx.beginPath()
        ctx.arc(proj.x, proj.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Central pulsing core
      const coreSize = 14 + pulse * 10
      const cg = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), coreSize)
      cg.addColorStop(0, 'rgba(255,255,255,0.95)')
      cg.addColorStop(0.3, 'rgba(196,132,252,0.75)')
      cg.addColorStop(0.7, 'rgba(139,92,246,0.4)')
      cg.addColorStop(1, 'rgba(168,85,247,0)')
      ctx.fillStyle = cg
      ctx.beginPath()
      ctx.arc(cx(), cy(), coreSize, 0, Math.PI * 2)
      ctx.fill()

      // Glitch
      if (time - lastGlitch > 2 + Math.random() * 3) {
        glitch()
        lastGlitch = time
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', setupCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes gridDrift {
          0% { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
        @keyframes haloPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #15091f 0%, #0a0612 50%, #050208 100%)',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'gridDrift 20s linear infinite',
        }}
      />

      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: '70vmin',
          height: '70vmin',
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'haloPulse 3s ease-in-out infinite',
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}
