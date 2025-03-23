import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Using the eldara model
const MODEL_URL = '/models/eldara.glb';

// Custom aura shader with unique color
const auraShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#FFB7D1') }, // Soft pink color
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      // Gentle flowing movement animation
      vec3 pos = position;
      float movement = sin(time * 1.8 + position.y * 2.5) * 0.006;
      pos += normal * movement;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Gentle pulsing effect
      float pulse = sin(time * 1.2) * 0.1 + 0.9;
      
      // Vertical gradient
      float verticalGradient = pow(1.0 - abs(vPosition.y), 1.8);
      
      // Radial gradient
      vec2 center = vec2(0.5, 0.5);
      float dist = length(vUv - center) * 2.3;
      float radialGradient = 1.0 - smoothstep(0.0, 0.8, dist);
      
      // Combine gradients with more weight on vertical
      float gradient = mix(verticalGradient, radialGradient, 0.4);
      
      // Edge glow
      float edgeGlow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
      
      // Fine noise for texture
      float noise = fract(sin(dot(vUv, vec2(15.9898, 68.233)) + time * 0.7) * 43758.5453) * 0.04;
      
      // Combine all effects 
      float alpha = gradient * pulse * (0.2 + edgeGlow * 0.3) * (0.95 + noise);
      vec3 finalColor = mix(color, vec3(1.0, 0.8, 0.9), edgeGlow * 0.3 + noise);
      
      // Softer alpha falloff
      alpha = pow(alpha, 1.3);
      
      gl_FragColor = vec4(finalColor, alpha * 0.6);
    }
  `
};

export default function SecondNpc() {
  const ref = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, ref);
  
  const { secondNpcPosition, secondNpcRotation, updateSecondNpcPosition } = useGameStore(state => ({
    secondNpcPosition: state.secondNpcPosition,
    secondNpcRotation: state.secondNpcRotation,
    updateSecondNpcPosition: state.updateSecondNpcPosition
  }));

  // Clone the scene to avoid conflicts
  const npcScene = useMemo(() => scene.clone(), [scene]);
  
  // Scale the model appropriately
  useEffect(() => {
    npcScene.scale.set(0.7, 0.7, 0.7);
  }, [npcScene]);

  // Set initial rotation
  useEffect(() => {
    if (ref.current) {
      ref.current.rotation.y = Math.PI; // Face a different initial direction
    }
    
    // Log available animations for debugging
    console.log("Second NPC available animations:", Object.keys(actions));
  }, []);

  // Helper to check if there's rotation (for animation triggering)
  const isMoving = useMemo(() => {
    // Check if any rotation component is non-zero
    return Math.abs(secondNpcRotation[0]) > 0.01 || 
           Math.abs(secondNpcRotation[1]) > 0.01 || 
           Math.abs(secondNpcRotation[2]) > 0.01;
  }, [secondNpcRotation]);

  // Handle animations based on movement
  useEffect(() => {
    // Reset all animations
    Object.values(actions).forEach(action => action?.stop());

    // Play animation based on whether NPC is moving
    if (isMoving) {
      // Get all available animations
      const availableAnims = Object.keys(actions);
      
      // Try to find appropriate animation names
      const movementAnims = availableAnims.filter(name => 
        name.toLowerCase().includes('walk') || 
        name.toLowerCase().includes('run') || 
        name.toLowerCase().includes('move')
      );
      
      // If we found any movement animations, use the first one
      if (movementAnims.length > 0) {
        const animName = movementAnims[0];
        console.log(`Second NPC using movement animation: ${animName}`);
        actions[animName]?.play();
        actions[animName]?.setEffectiveTimeScale(0.5); // Slower, more graceful animation
      } else if (availableAnims.length > 0) {
        // Just use the first available animation if nothing specific found
        const firstAnim = availableAnims[0];
        console.log(`No specific Second NPC movement animation found. Using: ${firstAnim}`);
        actions[firstAnim]?.play();
      }
    } else {
      // For idle state, find an idle animation or use the first available
      const availableAnims = Object.keys(actions);
      
      const idleAnims = availableAnims.filter(name =>
        name.toLowerCase().includes('idle') ||
        name.toLowerCase().includes('stand') ||
        name.toLowerCase().includes('pose')
      );
      
      if (idleAnims.length > 0) {
        const animName = idleAnims[0];
        console.log(`Second NPC using idle animation: ${animName}`);
        actions[animName]?.play();
      } else if (availableAnims.length > 0) {
        // Just use the first available animation for idle
        const firstAnim = availableAnims[0];
        console.log(`No specific Second NPC idle animation found. Using: ${firstAnim}`);
        actions[firstAnim]?.play();
      }
    }
  }, [actions, isMoving]);

  // Animation and movement in each frame
  useFrame((state) => {
    // Update NPC position through the store
    updateSecondNpcPosition();
    
    // Ensure reference exists
    if (!ref.current) return;
    
    // Apply position from store
    ref.current.position.set(secondNpcPosition[0], secondNpcPosition[1], secondNpcPosition[2]);
    
    // Apply rotation from store if provided
    if (secondNpcRotation) {
      ref.current.rotation.set(secondNpcRotation[0], secondNpcRotation[1], secondNpcRotation[2]);
    }
    
    // Update aura time uniform
    if (auraRef.current) {
      const material = auraRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
    }
    
    // Manual bone animation for limbs if available
    const time = state.clock.getElapsedTime();
    ref.current.traverse((object) => {
      if (object instanceof THREE.Bone) {
        // Apply manual animations to specific bones by name pattern
        const name = object.name.toLowerCase();
        
        // Animated limbs for movement - more graceful style
        if (isMoving) {
          // Arms with graceful, flowing movement
          if (name.includes('arm') || name.includes('hand')) {
            // Slower, more flowing arm movements
            const baseSwing = Math.sin(time * 3.5) * 0.25; // Slower swing
            const graceEffect = Math.sin(time * 1.7) * 0.08; // Graceful secondary motion
            
            // Swing arms with different style for right vs left
            if (name.includes('right')) {
              object.rotation.x = baseSwing * 0.9 + graceEffect; // More subdued
              // Add elegant rotation in other axes
              object.rotation.y = Math.sin(time * 2.3) * 0.07;
              object.rotation.z = Math.sin(time * 1.5) * 0.09;
            } else if (name.includes('left')) {
              object.rotation.x = -baseSwing + graceEffect; // Regular swing with grace
              // Add elegant rotation in other axes
              object.rotation.y = Math.sin(time * 2.7) * 0.06;
              object.rotation.z = Math.sin(time * 1.9) * 0.08;
            }
            
            // Add more flowing motion for hands
            if (name.includes('hand')) {
              object.rotation.z += Math.sin(time * 3) * 0.12;
              object.rotation.x += Math.cos(time * 2.5) * 0.05;
            }
          }
          
          // Legs with graceful movement
          if (name.includes('leg') || name.includes('foot')) {
            const baseSwing = Math.sin(time * 3.5) * 0.25; // Match arm speed for coordination
            const graceEffect = Math.cos(time * 2.1) * 0.04; // Elegant secondary motion
            
            // Swing legs with more grace and less swagger
            if (name.includes('right')) {
              object.rotation.x = -baseSwing + graceEffect;
              object.rotation.y = Math.sin(time * 1.8) * 0.02 + 0.01; // Subtle outward rotation
              object.rotation.z = Math.cos(time * 2.1) * 0.03;
            } else if (name.includes('left')) {
              object.rotation.x = baseSwing + graceEffect;
              object.rotation.y = Math.sin(time * 1.9) * 0.02 - 0.01; // Subtle outward rotation
              object.rotation.z = Math.cos(time * 2.3) * 0.03;
            }
            
            // Add graceful flex for feet
            if (name.includes('foot')) {
              object.rotation.x += Math.sin(time * 7) * 0.05; // Subtle toe point
            }
          }
          
          // Add subtle head movement
          if (name.includes('head') || name.includes('neck')) {
            // Elegant looking around while walking
            object.rotation.y = Math.sin(time * 1.2) * 0.08;
            // Slight tilt with movement
            object.rotation.z = Math.sin(time * 0.9) * 0.03;
            // Slight nod
            object.rotation.x = Math.sin(time * 2.3) * 0.04;
          }
        } else {
          // Subtle idle motions with elegance
          if (name.includes('arm') || name.includes('hand')) {
            // Gentle breathing motion
            const breatheBase = Math.sin(time * 1.2) * 0.04;
            const secondary = Math.sin(time * 1.7) * 0.02;
            object.rotation.x = breatheBase + secondary;
            
            // Subtle graceful shifts
            object.rotation.y = Math.sin(time * 0.7) * 0.03;
            object.rotation.z = Math.sin(time * 0.9) * 0.04;
          }
          
          // Subtle leg movement while idle
          if (name.includes('leg') || name.includes('foot')) {
            // Very subtle weight shifting
            object.rotation.x = Math.sin(time * 0.8) * 0.02;
            object.rotation.z = Math.sin(time * 0.5) * 0.01;
          }
          
          // Add idle head movement - more curious
          if (name.includes('head') || name.includes('neck')) {
            // Occasional looking around
            object.rotation.y = Math.sin(time * 0.4) * 0.12;
            // Slight curious tilting
            object.rotation.z = Math.sin(time * 0.6) * 0.04;
          }
        }
      }
    });
    
    // Update visual position and animation effects
    if (isMoving) {
      // More graceful movement animation
      const primaryBob = Math.sin(time * 6) * 0.06; // Gentler, slower bobbing
      const secondaryBob = Math.sin(time * 3.3) * 0.02; // Secondary frequency
      const bobHeight = primaryBob + secondaryBob;
      
      // Add subtle horizontal elegance while walking
      const lateralMovement = Math.sin(time * 3) * 0.02; // More subtle than swagger
      
      // Position the NPC with elegance
      ref.current.position.set(
        secondNpcPosition[0] + lateralMovement,
        secondNpcPosition[1] - 0.20 + bobHeight,
        secondNpcPosition[2]
      );
      
      // Rotate NPC to face movement direction
      const angle = Math.atan2(secondNpcRotation[0], secondNpcRotation[2]);
      
      // Smooth rotation transition
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        angle + Math.sin(time * 2) * 0.04, // Subtle head turning
        0.08 // Slower, more graceful turning
      );
      
      // Graceful movement style effects
      // Gentle side-to-side motion (z-axis)
      const baseRockAngle = Math.sin(time * 4) * 0.03; // More subtle rocking
      const elegance = Math.sin(time * 2.1) * 0.01; // Delicate secondary motion
      const rockAngle = baseRockAngle + elegance;
      ref.current.rotation.z = rockAngle;
      
      // Forward/backward lean (x-axis) for elegant movement
      const baseLean = Math.sin(time * 3) * 0.02; 
      const forwardLean = baseLean + 0.04; // Slight graceful forward lean
      ref.current.rotation.x = forwardLean;
    } else {
      // Elegant idle animation
      // Static position with subtle breathing motion
      ref.current.position.set(
        secondNpcPosition[0],
        secondNpcPosition[1] - 0.20 + Math.sin(time * 1.2) * 0.015, // Subtle breathing
        secondNpcPosition[2]
      );
      
      // Graceful idle motion
      const primaryRock = Math.sin(time * 1.7) * 0.008;
      const secondaryRock = Math.cos(time * 1.1) * 0.004;
      const idleRock = primaryRock + secondaryRock;
      ref.current.rotation.z = idleRock;
      
      // Subtle forward/backward elegant sway
      const idleSway = Math.sin(time * 1.4) * 0.007;
      ref.current.rotation.x = idleSway + 0.005; // Very slight forward tilt
    }
  });

  return (
    <group ref={ref}>
      <primitive object={npcScene} position={[0, 1, 0]} />
      {/* Aura effect with pink color */}
      <mesh
        ref={auraRef}
        scale={[1.1, 1.7, 1.1]} 
        position={[0, 1.8, 0]}
      >
        <sphereGeometry args={[0.9, 32, 32]} />
        <shaderMaterial
          {...auraShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Pre-load the model
useGLTF.preload(MODEL_URL); 