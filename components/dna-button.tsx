'use client'

import { useEffect, useRef } from 'react'

export function DnaButton({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2

    // Particles on sphere
    const particles: { x: number; y: number; z: number }[] = []
    for (let i = 0; i < 60; i++) {
      const phi = Math.acos(2 * Math.random() - 1)
      const theta = Math.random() * Math.PI * 2
      const r = 18
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      })
    }

    // Orbital particles
    const orbitals: { angle: number; speed: number; tilt: number; radius: number }[] = []
    for (let i = 0; i < 12; i++) {
      orbitals.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.02,
        tilt: Math.random() * 0.6 - 0.3,
        radius: 16 + Math.random() * 6,
      })
    }

    let rotation = 0

    const draw = () => {
      ctx.fillStyle = 'rgba(8, 0, 18, 0.3)'
      ctx.fillRect(0, 0, W, H)

      rotation += 0.012

      // Draw glow center
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20)
      glow.addColorStop(0, 'rgba(168, 85, 247, 0.6)')
      glow.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Sort particles by z for depth
      const cosR = Math.cos(rotation)
      const sinR = Math.sin(rotation)
      const projected = particles.map(p => {
        const x = p.x * cosR - p.z * sinR
        const z = p.x * sinR + p.z * cosR
        return { x: cx + x, y: cy + p.y, z, orig: p }
      }).sort((a, b) => a.z - b.z)

      // Draw particles
      projected.forEach(p => {
        const alpha = 0.3 + (p.z + 18) / 36 * 0.7
        const size = 1 + (p.z + 18) / 36 * 1.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(168, 85, 247, ${alpha})`
        ctx.fill()
      })

      // Draw orbital rings
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, 18, 8 + i * 3, rotation * (i + 1) * 0.3, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw orbital particles
      orbitals.forEach(o => {
        o.angle += o.speed
        const x = cx + Math.cos(o.angle) * o.radius
        const y = cy + Math.sin(o.angle) * o.radius * 0.4 + Math.sin(o.angle + o.tilt) * 3
        
        // Glow
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)'
        ctx.fill()
        
        // Core
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fill()
      })

      // Center pulse
      const pulse = 0.7 + Math.sin(Date.now() * 0.005) * 0.3
      ctx.beginPath()
      ctx.arc(cx, cy, 3 * pulse, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="transition-all duration-200 transform hover:scale-110 active:scale-95 focus:outline-none"
      title="Deep Dive"
    >
      <canvas
        ref={canvasRef}
        width={52}
        height={52}
        className="block"
      />
    </button>
  )
}
