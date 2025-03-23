import { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'

// Updated model path
const MODEL_URL = '/models/eldara.glb'

export default function SecondNpc() {
  const { secondNpcPosition, secondNpcRotation, shouldSecondNpcMove } = useGameStore()
  const modelRef = useRef<THREE.Group>()
  const headRef = useRef<THREE.Bone>()
  const leftArmRef = useRef<THREE.Bone>()
  const rightArmRef = useRef<THREE.Bone>()
  const leftLegRef = useRef<THREE.Bone>()
  const rightLegRef = useRef<THREE.Bone>()
  
  // Track last position for movement detection
  const lastPositionRef = useRef(new THREE.Vector3(...secondNpcPosition))
  const rotationRef = useRef(new THREE.Euler(
    secondNpcRotation[0], 
    secondNpcRotation[1], 
    secondNpcRotation[2]
  ))
  
  // Animation state
  const isMovingRef = useRef(false)
  const animTimeRef = useRef(0)
  const personalityFactorRef = useRef(Math.random() * 0.4 + 0.8) // Randomize personality
  
  // Load the model
  const { scene, animations } = useGLTF(MODEL_URL) as any
  
  // Clone the scene to avoid conflicts
  const npcScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.scale.set(0.8, 0.8, 0.8) // Scale the model
    clone.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })
    return clone
  }, [scene])
  
  // Setup references to bones
  useEffect(() => {
    if (!modelRef.current) return
    
    // Log available bones for debugging
    console.log('NPC bones:', modelRef.current)
    
    // Find and reference important bones
    modelRef.current.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Bone) {
        const name = node.name.toLowerCase()
        if (name.includes('head')) headRef.current = node
        if (name.includes('leftarm') || name.includes('arm_l')) leftArmRef.current = node
        if (name.includes('rightarm') || name.includes('arm_r')) rightArmRef.current = node
        if (name.includes('leftleg') || name.includes('leg_l')) leftLegRef.current = node
        if (name.includes('rightleg') || name.includes('leg_r')) rightLegRef.current = node
      }
    })
    
    // Log found bones
    console.log('Found bones:', {
      head: headRef.current,
      leftArm: leftArmRef.current,
      rightArm: rightArmRef.current,
      leftLeg: leftLegRef.current,
      rightLeg: rightLegRef.current
    })
  }, [modelRef.current])
  
  // Setup initial rotation
  useEffect(() => {
    if (modelRef.current) {
      rotationRef.current.set(
        secondNpcRotation[0],
        secondNpcRotation[1],
        secondNpcRotation[2]
      )
      modelRef.current.rotation.copy(rotationRef.current)
    }
  }, [])
  
  // Log available animations
  useEffect(() => {
    if (animations?.length) {
      console.log('NPC animations:', animations.map((a: any) => a.name))
    }
  }, [animations])
  
  // Update position and animate in each frame
  useFrame((_, delta) => {
    if (!modelRef.current) return
    
    // Check if NPC is moving by comparing positions
    const currentPosition = new THREE.Vector3(...secondNpcPosition)
    const distance = currentPosition.distanceTo(lastPositionRef.current)
    isMovingRef.current = distance > 0.0001 && shouldSecondNpcMove
    
    // Update animation time
    animTimeRef.current += delta * (isMovingRef.current ? 2 : 0.5)
    
    // Update model position with smooth transitions
    modelRef.current.position.lerp(
      new THREE.Vector3(...secondNpcPosition),
      delta * 5
    )
    
    // Update rotation with smooth transition and slight overshoot
    const targetRotation = new THREE.Euler(
      secondNpcRotation[0],
      secondNpcRotation[1],
      secondNpcRotation[2]
    )
    
    rotationRef.current.x = THREE.MathUtils.lerp(
      rotationRef.current.x, 
      targetRotation.x, 
      delta * 3
    )
    
    rotationRef.current.y = THREE.MathUtils.lerp(
      rotationRef.current.y, 
      targetRotation.y, 
      delta * 3
    )
    
    rotationRef.current.z = THREE.MathUtils.lerp(
      rotationRef.current.z, 
      targetRotation.z, 
      delta * 3
    )
    
    // Apply rotation to model
    modelRef.current.rotation.copy(rotationRef.current)
    
    // Apply bobbing and swaying for more natural movement
    if (isMovingRef.current) {
      // Walking movement - bobbing up and down
      const bobHeight = Math.sin(animTimeRef.current * 8) * 0.05
      modelRef.current.position.y += bobHeight
      
      // Add some lateral swagger (side-to-side sway)
      const swayAmount = Math.sin(animTimeRef.current * 4) * 0.03 * personalityFactorRef.current
      modelRef.current.position.x += swayAmount
      modelRef.current.position.z += swayAmount
    } else {
      // Subtle idle motion - gentle up/down breathing
      const idleBob = Math.sin(animTimeRef.current * 2) * 0.01
      modelRef.current.position.y += idleBob
    }
    
    // Animate bones if they exist
    if (isMovingRef.current) {
      // Walking animations
      if (leftArmRef.current && rightArmRef.current) {
        // Arm swings
        const armSwing = Math.sin(animTimeRef.current * 8) * 0.3 * personalityFactorRef.current
        leftArmRef.current.rotation.x = -armSwing
        rightArmRef.current.rotation.x = armSwing
      }
      
      if (leftLegRef.current && rightLegRef.current) {
        // Leg swings - opposite phase from arms
        const legSwing = Math.sin(animTimeRef.current * 8) * 0.3 * personalityFactorRef.current
        leftLegRef.current.rotation.x = legSwing
        rightLegRef.current.rotation.x = -legSwing
      }
      
      if (headRef.current) {
        // Head bobbing while walking
        const headBob = Math.sin(animTimeRef.current * 8) * 0.05
        headRef.current.rotation.x = headBob
        headRef.current.rotation.z = Math.sin(animTimeRef.current * 4) * 0.03
      }
    } else {
      // Idle animations - subtle movements
      if (leftArmRef.current && rightArmRef.current) {
        // Subtle arm movement during idle
        const idleArmMove = Math.sin(animTimeRef.current * 2) * 0.05
        leftArmRef.current.rotation.x = idleArmMove
        rightArmRef.current.rotation.x = idleArmMove * 0.7 // Asymmetric for more natural look
      }
      
      if (headRef.current) {
        // Occasional subtle head movements
        const headTilt = Math.sin(animTimeRef.current * 0.5) * 0.1
        headRef.current.rotation.z = Math.sin(animTimeRef.current * 0.3) * 0.03
        headRef.current.rotation.x = Math.cos(animTimeRef.current * 0.7) * 0.02
      }
    }
    
    // Store current position for next frame comparison
    lastPositionRef.current.copy(currentPosition)
  })
  
  return (
    <group>
      <primitive 
        ref={modelRef} 
        object={npcScene} 
        position={secondNpcPosition} 
        rotation={[secondNpcRotation[0], secondNpcRotation[1], secondNpcRotation[2]]}
      />
    </group>
  )
}

// Preload the model
useGLTF.preload(MODEL_URL) 