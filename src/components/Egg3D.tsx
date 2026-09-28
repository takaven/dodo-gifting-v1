import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { LoadingSpinner } from './LoadingSpinner'

interface Egg3DProps {
  crackLevel: number
  isHatching: boolean
}

const EGG_CONFIG = {
  color: '#f4e4c1',
  metalness: 0.2,
  roughness: 0.6,
  emissive: '#ffd4a3',
  emissiveIntensity: 0.15,
  cracks: [
    { start: [0, 0.9, 0.3], end: [0.15, 0.6, 0.4], midpoint: [0.08, 0.75, 0.35] },
    { start: [0.1, 0.6, 0.5], end: [-0.15, 0.3, 0.6], midpoint: [-0.03, 0.45, 0.55] },
    { start: [0.25, 0.4, 0.3], end: [0.35, 0.1, 0.5], midpoint: [0.3, 0.25, 0.4] },
    { start: [-0.3, 0.5, 0.2], end: [-0.45, 0.2, 0.3], midpoint: [-0.38, 0.35, 0.25] },
    { start: [0.05, -0.1, 0.9], end: [0.2, -0.4, 0.85], midpoint: [0.13, -0.25, 0.88] },
    { start: [0.15, 0.7, 0.6], end: [0.3, 0.4, 0.7], midpoint: [0.23, 0.55, 0.65] },
    { start: [-0.2, 0.5, 0.7], end: [-0.35, 0.2, 0.6], midpoint: [-0.28, 0.35, 0.65] },
    { start: [0.02, 0.3, 0.95], end: [0.12, 0, 0.98], midpoint: [0.07, 0.15, 0.97] },
  ],
}

// Create proper egg shape using LatheGeometry
function createEggGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = []
  const segments = 32

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = t * Math.PI

    // Parametric egg curve - narrower at top, wider at bottom
    const y = Math.cos(angle) * 1.5
    const radius = Math.sin(angle) * (1.2 - t * 0.15) // Slightly narrower at top

    points.push(new THREE.Vector2(radius, y))
  }

  return new THREE.LatheGeometry(points, 32)
}

export function Egg3D({ crackLevel, isHatching }: Egg3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const maxCracks = 8

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100)
    camera.position.set(0, 0, 5)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    renderer.setSize(canvas.width, canvas.height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Improved three-point lighting
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.5)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(5, 5, 5)
    mainLight.castShadow = true
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xffd4a3, 0.4)
    fillLight.position.set(-3, 2, 3)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0xffb088, 0.6)
    rimLight.position.set(0, -2, -3)
    scene.add(rimLight)

    // Create egg with proper geometry
    const eggGeom = createEggGeometry()
    const eggMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(EGG_CONFIG.color),
      metalness: EGG_CONFIG.metalness,
      roughness: EGG_CONFIG.roughness,
      emissive: new THREE.Color(EGG_CONFIG.emissive),
      emissiveIntensity: EGG_CONFIG.emissiveIntensity,
    })

    const egg = new THREE.Mesh(eggGeom, eggMaterial)
    egg.castShadow = true
    egg.receiveShadow = true
    scene.add(egg)

    // Create 3D cracks with depth
    const crackGroup = new THREE.Group()
    scene.add(crackGroup)

    const visibleCracks = EGG_CONFIG.cracks.slice(0, crackLevel)
    visibleCracks.forEach((crack) => {
      // Create curved crack using QuadraticBezierCurve3
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(crack.start[0], crack.start[1], crack.start[2]),
        new THREE.Vector3(crack.midpoint[0], crack.midpoint[1], crack.midpoint[2]),
        new THREE.Vector3(crack.end[0], crack.end[1], crack.end[2])
      )

      const points = curve.getPoints(20)
      const crackGeom = new THREE.BufferGeometry().setFromPoints(points)
      const crackMaterial = new THREE.LineBasicMaterial({
        color: 0x3a2a1f,
        linewidth: 3,
      })
      const crackLine = new THREE.Line(crackGeom, crackMaterial)
      crackGroup.add(crackLine)
    })

    let animationFrameId: number
    let time = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      time += 0.01

      if (isHatching) {
        // Dramatic hatching shake
        egg.rotation.z = Math.sin(time * 10) * 0.3
        egg.rotation.x = Math.sin(time * 8) * 0.15
        egg.scale.set(1 + Math.sin(time * 5) * 0.08, 1 + Math.sin(time * 5) * 0.08, 1)
        eggMaterial.emissiveIntensity = 0.3 + Math.sin(time * 6) * 0.2
      } else {
        // Gentle floating and rotation
        egg.rotation.y += 0.005
        egg.position.y = Math.sin(time) * 0.12

        // Glow increases as cracks accumulate
        const glowIntensity = EGG_CONFIG.emissiveIntensity + (crackLevel / maxCracks) * 0.2
        eggMaterial.emissiveIntensity = glowIntensity + Math.sin(time * 2) * 0.05
      }

      crackGroup.rotation.copy(egg.rotation)
      crackGroup.position.copy(egg.position)

      renderer.render(scene, camera)
    }

    animate()

    setIsLoading(false)

    const handleResize = () => {
      if (!canvas) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      eggGeom.dispose()
      eggMaterial.dispose()
    }
  }, [crackLevel, isHatching])

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isHatching ? [1, 1.1, 0.9, 1.1, 0] : 1,
        opacity: isHatching ? [1, 1, 1, 1, 0] : 1,
        rotate: isHatching ? [0, -5, 5, -5, 0] : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        scale: isHatching ? { duration: 2, times: [0, 0.25, 0.5, 0.75, 1] } : undefined,
        rotate: isHatching ? { duration: 2, times: [0, 0.25, 0.5, 0.75, 1] } : undefined,
      }}
      className="relative w-full h-full"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="w-full h-full"
        style={{ maxWidth: '100%', maxHeight: '100%', opacity: isLoading ? 0 : 1 }}
      />

      {crackLevel > 0 && crackLevel < maxCracks && !isLoading && (
        <motion.div
          className="absolute top-2 right-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          <span className="text-2xl">💫</span>
        </motion.div>
      )}
    </motion.div>
  )
}













































































