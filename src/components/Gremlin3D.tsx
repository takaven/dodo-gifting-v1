import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { LoadingSpinner } from './LoadingSpinner'

interface Gremlin3DProps {
  mood: 'happy' | 'lonely' | 'sleepy'
  isWaving?: boolean
}

const GREMLIN_COLORS = {
  body: '#f5e8d8', // Cream/beige
  accent: '#e8a0a0', // Coral pink for ears, arms, feet
  earInner: '#ffb8b8', // Lighter pink for inner ears
  eyeWhite: '#ffffff',
  eyeIris: '#8b5a5a', // Brown iris
  eyePupil: '#1a0f14',
  eyeHighlight: '#ffffff',
  nose: '#ff8866', // Orange-red nose
}

export function Gremlin3D({ mood, isWaving }: Gremlin3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100)
    camera.position.set(0, 0, 6)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    renderer.setSize(canvas.width, canvas.height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Soft, warm lighting
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0)
    mainLight.position.set(4, 5, 3)
    mainLight.castShadow = true
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xffcba4, 0.5)
    fillLight.position.set(-3, 2, 3)
    scene.add(fillLight)

    const rimLight = new THREE.PointLight(0xffa588, 0.4)
    rimLight.position.set(0, -1, -4)
    scene.add(rimLight)

    // Main gremlin group
    const gremlinGroup = new THREE.Group()
    scene.add(gremlinGroup)

    // === HEAD (large sphere) ===
    const headGeom = new THREE.SphereGeometry(1, 32, 32)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(GREMLIN_COLORS.body),
      metalness: 0.1,
      roughness: 0.9,
    })
    const head = new THREE.Mesh(headGeom, headMaterial)
    head.position.y = 0.3
    head.castShadow = true
    head.receiveShadow = true
    gremlinGroup.add(head)

    // === BODY (small, chibi-style) ===
    const bodyGeom = new THREE.SphereGeometry(0.6, 32, 32)
    bodyGeom.scale(1, 1.2, 0.9)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(GREMLIN_COLORS.body),
      metalness: 0.1,
      roughness: 0.9,
    })
    const body = new THREE.Mesh(bodyGeom, bodyMaterial)
    body.position.y = -1.0
    body.castShadow = true
    body.receiveShadow = true
    gremlinGroup.add(body)

    // === EARS (large, positioned outward) ===
    const createEar = (isLeft: boolean) => {
      const earGroup = new THREE.Group()

      // Outer ear (cream color)
      const outerEarGeom = new THREE.SphereGeometry(0.5, 16, 16)
      outerEarGeom.scale(0.6, 1.2, 0.3)
      const outerEarMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.body),
        metalness: 0.1,
        roughness: 0.9,
      })
      const outerEar = new THREE.Mesh(outerEarGeom, outerEarMaterial)
      outerEar.castShadow = true
      earGroup.add(outerEar)

      // Inner ear (pink accent)
      const innerEarGeom = new THREE.SphereGeometry(0.35, 16, 16)
      innerEarGeom.scale(0.5, 0.9, 0.2)
      const innerEarMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.earInner),
        metalness: 0.1,
        roughness: 0.8,
      })
      const innerEar = new THREE.Mesh(innerEarGeom, innerEarMaterial)
      innerEar.position.z = 0.08
      earGroup.add(innerEar)

      // Position ear
      const xPos = isLeft ? -0.85 : 0.85
      earGroup.position.set(xPos, 0.7, 0)
      earGroup.rotation.z = isLeft ? 0.3 : -0.3
      earGroup.rotation.y = isLeft ? -0.4 : 0.4

      return earGroup
    }

    const leftEar = createEar(true)
    const rightEar = createEar(false)
    gremlinGroup.add(leftEar, rightEar)

    // === EYES (large, expressive, multi-layered) ===
    const createEye = (isLeft: boolean) => {
      const eyeGroup = new THREE.Group()

      // White of eye
      const whiteGeom = new THREE.SphereGeometry(0.28, 20, 20)
      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.eyeWhite),
        metalness: 0.05,
        roughness: 0.3,
      })
      const white = new THREE.Mesh(whiteGeom, whiteMaterial)
      eyeGroup.add(white)

      // Iris (brown/red ring)
      const irisGeom = new THREE.CircleGeometry(0.2, 32)
      const irisMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.eyeIris),
        metalness: 0.1,
        roughness: 0.4,
      })
      const iris = new THREE.Mesh(irisGeom, irisMaterial)
      iris.position.z = 0.27
      eyeGroup.add(iris)

      // Pupil (black)
      const pupilGeom = new THREE.CircleGeometry(0.12, 32)
      const pupilMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.eyePupil),
        metalness: 0.2,
        roughness: 0.2,
      })
      const pupil = new THREE.Mesh(pupilGeom, pupilMaterial)
      pupil.position.z = 0.28
      eyeGroup.add(pupil)

      // Highlight (glossy white dot)
      const highlightGeom = new THREE.CircleGeometry(0.08, 16)
      const highlightMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.eyeHighlight),
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.6,
        metalness: 0,
        roughness: 0,
      })
      const highlight = new THREE.Mesh(highlightGeom, highlightMaterial)
      highlight.position.set(0.06, 0.06, 0.29)
      eyeGroup.add(highlight)

      // Position eye
      const xPos = isLeft ? -0.35 : 0.35
      eyeGroup.position.set(xPos, 0.4, 0.85)

      return eyeGroup
    }

    const leftEye = createEye(true)
    const rightEye = createEye(false)
    gremlinGroup.add(leftEye, rightEye)

    // === NOSE (small orange-red beak) ===
    const noseGeom = new THREE.SphereGeometry(0.15, 16, 16)
    noseGeom.scale(0.8, 0.6, 1.0)
    const noseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(GREMLIN_COLORS.nose),
      metalness: 0.2,
      roughness: 0.7,
    })
    const nose = new THREE.Mesh(noseGeom, noseMaterial)
    nose.position.set(0, 0.15, 0.95)
    nose.castShadow = true
    gremlinGroup.add(nose)

    // === MOUTH (simple curved smile) ===
    const mouthCurve = new THREE.EllipseCurve(
      0, 0,
      0.25, 0.15,
      0, Math.PI,
      false,
      0
    )
    const mouthPoints = mouthCurve.getPoints(20)
    const mouthGeom = new THREE.BufferGeometry().setFromPoints(
      mouthPoints.map(p => new THREE.Vector3(p.x, p.y, 0))
    )
    const mouthMaterial = new THREE.LineBasicMaterial({
      color: 0x8b6a5a,
      linewidth: 2,
    })
    const mouth = new THREE.Line(mouthGeom, mouthMaterial)
    mouth.position.set(0, -0.05, 0.92)
    mouth.rotation.z = Math.PI
    gremlinGroup.add(mouth)

    // === ARMS (short, positioned at sides) ===
    const createArm = (isLeft: boolean) => {
      const armGeom = new THREE.CapsuleGeometry(0.12, 0.5, 8, 8)
      const armMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.accent),
        metalness: 0.1,
        roughness: 0.9,
      })
      const arm = new THREE.Mesh(armGeom, armMaterial)

      const xPos = isLeft ? -0.65 : 0.65
      arm.position.set(xPos, -0.8, 0.1)
      arm.rotation.z = isLeft ? 0.3 : -0.3
      arm.castShadow = true

      return arm
    }

    const leftArm = createArm(true)
    const rightArm = createArm(false)
    gremlinGroup.add(leftArm, rightArm)

    // === FEET (small, rounded) ===
    const createFoot = (isLeft: boolean) => {
      const footGeom = new THREE.BoxGeometry(0.25, 0.15, 0.35)
      footGeom.translate(0, 0, 0.1)
      const footMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(GREMLIN_COLORS.accent),
        metalness: 0.1,
        roughness: 0.9,
      })
      const foot = new THREE.Mesh(footGeom, footMaterial)

      // Round the corners
      foot.geometry = new THREE.BoxGeometry(0.25, 0.15, 0.35, 4, 4, 4)

      const xPos = isLeft ? -0.3 : 0.3
      foot.position.set(xPos, -1.65, 0.1)
      foot.castShadow = true

      return foot
    }

    const leftFoot = createFoot(true)
    const rightFoot = createFoot(false)
    gremlinGroup.add(leftFoot, rightFoot)

    // === TAIL (cute little tail) ===
    const tailCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, -1.3, -0.5),
      new THREE.Vector3(0, -1.5, -0.8),
      new THREE.Vector3(0, -1.2, -1.0)
    )
    const tailGeom = new THREE.TubeGeometry(tailCurve, 10, 0.08, 8, false)
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(GREMLIN_COLORS.accent),
      metalness: 0.1,
      roughness: 0.9,
    })
    const tail = new THREE.Mesh(tailGeom, tailMaterial)
    tail.castShadow = true
    gremlinGroup.add(tail)

    // Animation variables
    let animationFrameId: number
    let time = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      time += 0.01

      // Mood-based animations
      if (mood === 'happy') {
        // Happy: Bouncy, bright
        body.position.y = -1.0 + Math.sin(time * 3) * 0.1
        head.position.y = 0.3 + Math.sin(time * 3) * 0.08
        gremlinGroup.rotation.y = Math.sin(time * 0.8) * 0.15

        // Ears wiggle
        leftEar.rotation.z = 0.3 + Math.sin(time * 2) * 0.1
        rightEar.rotation.z = -0.3 - Math.sin(time * 2) * 0.1

        // Tail wags
        tail.rotation.x = Math.sin(time * 4) * 0.3
      } else if (mood === 'lonely') {
        // Lonely: Slower, gentler movements
        body.position.y = -1.0 + Math.sin(time * 1.5) * 0.04
        head.position.y = 0.3 + Math.sin(time * 1.5) * 0.03
        gremlinGroup.rotation.y = Math.sin(time * 0.4) * 0.08

        // Ears droop slightly
        leftEar.rotation.z = 0.35
        rightEar.rotation.z = -0.35
      } else if (mood === 'sleepy') {
        // Sleepy: Minimal movement, head tilts
        head.rotation.x = 0.15 + Math.sin(time * 0.5) * 0.05
        gremlinGroup.rotation.x = 0.1

        // Slow breathing
        body.scale.set(1, 1 + Math.sin(time * 0.8) * 0.02, 1)
      }

      // Waving animation
      if (isWaving) {
        rightArm.rotation.z = -0.3 + Math.sin(time * 15) * 0.8
      } else {
        rightArm.rotation.z = -0.3
      }

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
    }
  }, [mood, isWaving])

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: mood === 'lonely' ? 0.85 : 1,
        rotate: isWaving ? [0, -5, 5, -5, 0] : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        rotate: { duration: 0.6, repeat: isWaving ? Infinity : 0 },
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

      {mood === 'happy' && !isLoading && (
        <motion.div
          className="absolute -top-4 left-1/2 -translate-x-1/2"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [-10, -30, -10], opacity: [0, 1, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <span className="text-3xl">✨</span>
        </motion.div>
      )}

      {isWaving && !isLoading && (
        <motion.div
          className="absolute top-1/4 right-8"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <span className="text-4xl">👋</span>
        </motion.div>
      )}
    </motion.div>
  )
}
