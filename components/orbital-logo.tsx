'use client'

import { useEffect, useRef } from 'react'

export function OrbitalLogo({ size = 32 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2

    // Particles on sphere
    const particles: { theta: number; phi: number; r: number; brightness: number }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: Math.random() * Math.PI,
        r: size * 0.38,
        brightness: 0.3 + Math.random() * 0.7,
      })
    }

    // Orbital rings
    const rings = [
      { a: size * 0.34, b: size * 0.14, tilt: 0.4, speed: 0.012, color: '#a855f7', particles: [] as { angle: number; size: number }[] },
      { a: size * 0.28, b: size * 0.20, tilt: -0.5, speed: -0.009, color: '#c084fc', particles: [] as { angle: number; size: number }[] },
      { a: size * 0.22, b: size * 0.30, tilt: 0.9, speed: 0.007, color: '#7c3aed', particles: [] as { angle: number; size: number }[] },
    ]

    rings.forEach(ring => {
      for (let i = 0; i < 4; i++) {
        ring.particles.push({ angle: (i / 4) * Math.PI * 2, size: 1.2 + Math.random() })
      }
    })

    let frame = 0
    let animId: number

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, size, size)

      // Background glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5)
      bgGrad.addColorStop(0, 'rgba(120, 40, 200, 0.25)')
      bgGrad.addColorStop(1, 'rgba(5, 0, 20, 0)')
      ctx.fillStyle = bgGrad
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Draw sphere particles
      const t = frame * 0.008
      particles.forEach(p => {
        const rotTheta = p.theta + t
        const x3 = p.r * Math.sin(p.phi) * Math.cos(rotTheta)
        const y3 = p.r * Math.sin(p.phi) * Math.sin(rotTheta)
        const z3 = p.r * Math.cos(p.phi)

        const cosT = Math.cos(0.3)
        const sinT = Math.sin(0.3)
        const yr = y3 * cosT - z3 * sinT
        const zr = y3 * sinT + z3 * cosT

        const scale = (zr + p.r * 1.5) / (p.r * 2.5)
        const px = cx + x3
        const py = cy + yr

        const alpha = p.brightness * scale * 0.8
        const rad = scale * 1.0

        const grad = ctx.createRadialGradient(px, py, 0, px, py, rad + 0.5)
        grad.addColorStop(0, `rgba(220, 180, 255, ${alpha})`)
        grad.addColorStop(1, `rgba(140, 60, 220, 0)`)
        ctx.beginPath()
        ctx.arc(px, py, rad + 0.5, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      // Draw rings
      rings.forEach(ring => {
        ring.particles.forEach(rp => {
          rp.angle += ring.speed
        })

        // Draw ellipse ring
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(ring.tilt)
        ctx.beginPath()
        ctx.ellipse(0, 0, ring.a, ring.b, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `${ring.color}55`
        ctx.lineWidth = 0.5
        ctx.stroke()
        ctx.restore()

        // Draw orbital particles on ring
        ring.particles.forEach(rp => {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(ring.tilt)
          const px = ring.a * Math.cos(rp.angle)
          const py = ring.b * Math.sin(rp.angle)

          const glow = ctx.createRadialGradient(px, py, 0, px, py, rp.size * 2)
          glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
          glow.addColorStop(0.3, `${ring.color}cc`)
          glow.addColorStop(1, `${ring.color}00`)
          ctx.beginPath()
          ctx.arc(px, py, rp.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()

          ctx.beginPath()
          ctx.arc(px, py, rp.size * 0.5, 0, Math.PI * 2)
          ctx.fillStyle = 'white'
          ctx.fill()
          ctx.restore()
        })
      })

      // Central core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.1)
      core.addColorStop(0, 'rgba(255,255,255,0.9)')
      core.addColorStop(0.4, 'rgba(180,80,255,0.6)')
      core.addColorStop(1, 'rgba(100,20,180,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded-lg"
    />
  )
}
