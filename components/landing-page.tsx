"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Activity, ChevronRight } from "lucide-react"

export function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let width = window.innerWidth
    let height = window.innerHeight

    canvas.width = width
    canvas.height = height

    // Particle system
    interface Particle {
      x: number
      y: number
      z: number
      size: number
      speed: number
      angle: number
      orbitRadius: number
      orbitSpeed: number
      brightness: number
    }

    interface OrbitRing {
      radiusX: number
      radiusY: number
      rotation: number
      rotationSpeed: number
      tilt: number
      particles: { angle: number; speed: number; size: number }[]
    }

    const particles: Particle[] = []
    const orbitRings: OrbitRing[] = []
    const centerX = width / 2
    const centerY = height / 2

    // Create sphere particles
    for (let i = 0; i < 400; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 180 + Math.random() * 120

      particles.push({
        x: Math.sin(phi) * Math.cos(theta) * radius,
        y: Math.sin(phi) * Math.sin(theta) * radius,
        z: Math.cos(phi) * radius,
        size: Math.random() * 2 + 0.5,
        speed: 0.002 + Math.random() * 0.003,
        angle: Math.random() * Math.PI * 2,
        orbitRadius: radius,
        orbitSpeed: 0.001 + Math.random() * 0.002,
        brightness: 0.3 + Math.random() * 0.7
      })
    }

    // Create orbit rings
    for (let i = 0; i < 4; i++) {
      const ring: OrbitRing = {
        radiusX: 200 + i * 60,
        radiusY: 80 + i * 25,
        rotation: (i * Math.PI) / 4,
        rotationSpeed: 0.003 + i * 0.001,
        tilt: 0.3 + i * 0.15,
        particles: []
      }
      
      // Add particles to each ring
      const particleCount = 15 + i * 5
      for (let j = 0; j < particleCount; j++) {
        ring.particles.push({
          angle: (j / particleCount) * Math.PI * 2,
          speed: 0.008 + Math.random() * 0.004,
          size: 1.5 + Math.random() * 2
        })
      }
      orbitRings.push(ring)
    }

    let globalRotation = 0

    function draw() {
      ctx!.fillStyle = '#080012'
      ctx!.fillRect(0, 0, width, height)

      // Draw central glow
      const gradient = ctx!.createRadialGradient(centerX, centerY, 0, centerX, centerY, 350)
      gradient.addColorStop(0, 'rgba(147, 51, 234, 0.4)')
      gradient.addColorStop(0.3, 'rgba(126, 34, 206, 0.2)')
      gradient.addColorStop(0.6, 'rgba(88, 28, 135, 0.1)')
      gradient.addColorStop(1, 'transparent')
      ctx!.fillStyle = gradient
      ctx!.fillRect(0, 0, width, height)

      // Draw core pulse
      const pulseSize = 30 + Math.sin(Date.now() * 0.003) * 10
      const coreGradient = ctx!.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseSize)
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      coreGradient.addColorStop(0.3, 'rgba(192, 132, 252, 0.6)')
      coreGradient.addColorStop(0.7, 'rgba(147, 51, 234, 0.3)')
      coreGradient.addColorStop(1, 'transparent')
      ctx!.fillStyle = coreGradient
      ctx!.beginPath()
      ctx!.arc(centerX, centerY, pulseSize, 0, Math.PI * 2)
      ctx!.fill()

      globalRotation += 0.002

      // Draw orbit rings
      orbitRings.forEach((ring, ringIndex) => {
        ring.rotation += ring.rotationSpeed
        
        ctx!.save()
        ctx!.translate(centerX, centerY)
        ctx!.rotate(ring.rotation)

        // Draw ring line
        ctx!.strokeStyle = `rgba(147, 51, 234, ${0.15 + ringIndex * 0.05})`
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.ellipse(0, 0, ring.radiusX, ring.radiusY, ring.tilt, 0, Math.PI * 2)
        ctx!.stroke()

        // Draw particles on ring
        ring.particles.forEach(p => {
          p.angle += p.speed
          const x = Math.cos(p.angle) * ring.radiusX
          const y = Math.sin(p.angle) * ring.radiusY
          
          // Apply tilt transformation
          const tiltedY = y * Math.cos(ring.tilt)
          
          const particleGradient = ctx!.createRadialGradient(x, tiltedY, 0, x, tiltedY, p.size * 3)
          particleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
          particleGradient.addColorStop(0.4, 'rgba(192, 132, 252, 0.6)')
          particleGradient.addColorStop(1, 'transparent')
          
          ctx!.fillStyle = particleGradient
          ctx!.beginPath()
          ctx!.arc(x, tiltedY, p.size * 3, 0, Math.PI * 2)
          ctx!.fill()
        })

        ctx!.restore()
      })

      // Draw sphere particles with depth sorting
      const sortedParticles = particles.map(p => {
        const cosR = Math.cos(globalRotation)
        const sinR = Math.sin(globalRotation)
        const newX = p.x * cosR - p.z * sinR
        const newZ = p.x * sinR + p.z * cosR
        return { ...p, projX: newX, projY: p.y, projZ: newZ }
      }).sort((a, b) => a.projZ - b.projZ)

      sortedParticles.forEach(p => {
        const scale = (p.projZ + 300) / 600
        const screenX = centerX + p.projX * scale
        const screenY = centerY + p.projY * scale
        const size = p.size * scale * 1.5
        const alpha = Math.max(0.1, Math.min(1, scale)) * p.brightness

        ctx!.fillStyle = `rgba(192, 132, 252, ${alpha})`
        ctx!.beginPath()
        ctx!.arc(screenX, screenY, size, 0, Math.PI * 2)
        ctx!.fill()
      })

      // Add some extra bright scattered particles
      for (let i = 0; i < 50; i++) {
        const angle = globalRotation * 0.5 + i * 0.13
        const dist = 250 + Math.sin(i * 0.5 + Date.now() * 0.001) * 150
        const x = centerX + Math.cos(angle) * dist
        const y = centerY + Math.sin(angle) * dist * 0.4

        ctx!.fillStyle = `rgba(147, 51, 234, ${0.2 + Math.random() * 0.3})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2)
        ctx!.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080012]">
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-sm font-medium mb-8">
          <Activity className="w-4 h-4" />
          Analyses IA en temps reel
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center text-white tracking-tight mb-4">
          Trading intelligent avec
        </h1>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center text-purple-400 tracking-tight mb-8">
          The Gold Room
        </h2>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-400 text-center max-w-2xl mb-10 leading-relaxed">
          Accedez a des analyses de marche IA, des biais swing et journalier en temps 
          reel, des correlations dynamiques et un flux de news live.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/auth/sign-up"
            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            Commencer gratuitement
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/auth/login"
            className="px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-medium rounded-lg transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}
