import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Using the existing robob model as a fallback since anuki.glb doesn't exist
const MODEL_URL = '/models/anuki.glb';

// Same aura shader as Player but with different color
const auraShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#CCFFE5') }, // Cool mint-green color
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
      
      // More subtle movement animation
      vec3 pos = position;
      float movement = sin(time * 2.0 + position.y * 3.0) * 0.005;
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
      // Gentler pulsing effect
      float pulse = sin(time * 1.5) * 0.1 + 0.9;
      
      // Sharper vertical gradient
      float verticalGradient = pow(1.0 - abs(vPosition.y), 1.5);
      
      // Tighter radial gradient
      vec2 center = vec2(0.5, 0.5);
      float dist = length(vUv - center) * 2.5; // Increased for tighter falloff
      float radialGradient = 1.0 - smoothstep(0.0, 0.8, dist);
      
      // Combine gradients with more weight on radial
      float gradient = mix(verticalGradient, radialGradient, 0.7);
      
      // Sharper edge glow
      float edgeGlow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
      
      // Finer noise for texture
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233)) + time) * 43758.5453) * 0.05;
      
      // Combine all effects with tighter alpha falloff
      float alpha = gradient * pulse * (0.15 + edgeGlow * 0.25) * (0.95 + noise);
      vec3 finalColor = mix(color, vec3(1.0), edgeGlow * 0.2 + noise);
      
      // Sharper alpha falloff
      alpha = pow(alpha, 1.5);
      
      gl_FragColor = vec4(finalColor, alpha * 0.5);
    }
  `
};

export default function Npc() {
  const ref = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, ref);
  
  const { npcPosition, npcRotation, updateNpcPosition } = useGameStore(state => ({
    npcPosition: state.npcPosition,
    npcRotation: state.npcRotation,
    updateNpcPosition: state.updateNpcPosition
  }));

  // Clone the scene to avoid conflicts with Player component
  const npcScene = useMemo(() => scene.clone(), [scene]);
  
  // Scale the model appropriately
  useEffect(() => {
    npcScene.scale.set(0.7, 0.7, 0.7);
  }, [npcScene]);

  // Set initial rotation
  useEffect(() => {
    if (ref.current) {
      ref.current.rotation.y = 0;
    }
    
    // Log available animations for debugging
    console.log("NPC available animations:", Object.keys(actions));
  }, []);

  // Helper to check if there's rotation (for animation triggering)
  const isMoving = useMemo(() => {
    // Check if any rotation component is non-zero
    return Math.abs(npcRotation[0]) > 0.01 || 
           Math.abs(npcRotation[1]) > 0.01 || 
           Math.abs(npcRotation[2]) > 0.01;
  }, [npcRotation]);

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
        console.log(`NPC using movement animation: ${animName}`);
        actions[animName]?.play();
        actions[animName]?.setEffectiveTimeScale(0.6); // Slightly slower animation
      } else if (availableAnims.length > 0) {
        // Just use the first available animation if nothing specific found
        const firstAnim = availableAnims[0];
        console.log(`No specific NPC movement animation found. Using: ${firstAnim}`);
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
        console.log(`NPC using idle animation: ${animName}`);
        actions[animName]?.play();
      } else if (availableAnims.length > 0) {
        // Just use the first available animation for idle
        const firstAnim = availableAnims[0];
        console.log(`No specific NPC idle animation found. Using: ${firstAnim}`);
        actions[firstAnim]?.play();
      }
    }
  }, [actions, isMoving]);

  // Animation and movement in each frame
  useFrame((state) => {
    // Update NPC position through the store
    updateNpcPosition();
    
    // Ensure reference exists
    if (!ref.current) return;
    
    // Apply position from store
    ref.current.position.set(npcPosition[0], npcPosition[1], npcPosition[2]);
    
    // Apply rotation from store if provided
    if (npcRotation) {
      ref.current.rotation.set(npcRotation[0], npcRotation[1], npcRotation[2]);
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
        
        // Animated limbs for movement
        if (isMoving) {
          // Arms with more swagger and personality
          if (name.includes('arm') || name.includes('hand')) {
            const baseSwing = Math.sin(time * 5) * 0.3;
            const personalityFactor = Math.sin(time * 2.7) * 0.05; // Add some irregularity
            
            // Swing arms with different style for right vs left
            if (name.includes('right')) {
              object.rotation.x = baseSwing * 1.1 + personalityFactor; // Slightly exaggerated
              // Add rotation in other axes for more lifelike movement
              object.rotation.y = Math.sin(time * 3.3) * 0.05;
              object.rotation.z = Math.sin(time * 2.5) * 0.07;
            } else if (name.includes('left')) {
              object.rotation.x = -baseSwing + personalityFactor; // Regular swing plus personality
              // Add rotation in other axes for more lifelike movement
              object.rotation.y = Math.sin(time * 3.7) * 0.05;
              object.rotation.z = Math.sin(time * 2.9) * 0.07;
            }
            
            // Add more motion for hands specifically
            if (name.includes('hand')) {
              object.rotation.z += Math.sin(time * 6) * 0.1;
            }
          }
          
          // Legs with more character
          if (name.includes('leg') || name.includes('foot')) {
            const baseSwing = Math.sin(time * 5) * 0.3;
            const personalityFactor = Math.cos(time * 3.1) * 0.05; // Different phase for personality
            
            // Swing legs with more character
            if (name.includes('right')) {
              object.rotation.x = -baseSwing * 1.1 + personalityFactor;
              // Add slight outward rotation for swagger
              object.rotation.y = Math.sin(time * 2.5) * 0.03 + 0.02;
              object.rotation.z = Math.cos(time * 3.1) * 0.04;
            } else if (name.includes('left')) {
              object.rotation.x = baseSwing * 1.2 + personalityFactor; // Slightly exaggerated
              // Add slight outward rotation for swagger
              object.rotation.y = Math.sin(time * 2.7) * 0.03 - 0.02;
              object.rotation.z = Math.cos(time * 3.3) * 0.04;
            }
            
            // Add more flex for feet specifically
            if (name.includes('foot')) {
              object.rotation.x += Math.sin(time * 10) * 0.07; // Quick flex at step points
            }
          }
          
          // Add subtle head movement if head bones exist
          if (name.includes('head') || name.includes('neck')) {
            // Look around slightly while walking
            object.rotation.y = Math.sin(time * 1.7) * 0.1;
            // Slight nod with movement
            object.rotation.x = Math.sin(time * 3.3) * 0.05 + 0.03; // Slight downward tilt
          }
        } else {
          // Subtle idle motions with more character
          if (name.includes('arm') || name.includes('hand')) {
            // More natural breathing motion
            const breatheBase = Math.sin(time * 1.5) * 0.05;
            const secondary = Math.sin(time * 2.3) * 0.02;
            object.rotation.x = breatheBase + secondary;
            
            // Subtle shifts in other axes
            object.rotation.y = Math.sin(time * 0.9) * 0.02;
            object.rotation.z = Math.sin(time * 1.2) * 0.03;
          }
          
          // Subtle leg movement while idle
          if (name.includes('leg') || name.includes('foot')) {
            // Very subtle weight shifting
            object.rotation.x = Math.sin(time * 1.1) * 0.02;
            object.rotation.z = Math.sin(time * 0.7) * 0.01;
          }
          
          // Add idle head movement
          if (name.includes('head') || name.includes('neck')) {
            // Occasional looking around
            object.rotation.y = Math.sin(time * 0.5) * 0.1;
            // Slight curious tilting
            object.rotation.z = Math.sin(time * 0.7) * 0.03;
          }
        }
      }
    });
    
    // Update visual position and animation effects
    if (isMoving) {
      // Enhanced movement animation with irregular bobbing for personality
      const primaryBob = Math.sin(time * 8) * 0.08;
      const secondaryBob = Math.sin(time * 5.3) * 0.03; // Secondary frequency for more natural motion
      const bobHeight = primaryBob + secondaryBob;
      
      // Add slight horizontal swagger while walking
      const lateralSwagger = Math.sin(time * 4) * 0.03;
      
      // Position the NPC with swagger and enhanced bobbing
      ref.current.position.set(
        npcPosition[0] + lateralSwagger,
        npcPosition[1] - 0.20 + bobHeight,
        npcPosition[2]
      );
      
      // Rotate NPC to face movement direction (using y rotation)
      const angle = Math.atan2(npcRotation[0], npcRotation[2]);
      
      // Smoother rotation transition with slight overshoot
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        angle + Math.sin(time * 3) * 0.05, // Add slight head turning for personality
        0.1
      );
      
      // Enhanced movement style effects
      // Rocking side to side with personality (z-axis)
      const baseRockAngle = Math.sin(time * 6) * 0.05;
      const personality = Math.sin(time * 2.7) * 0.02; // Add asymmetric motion
      const rockAngle = baseRockAngle + personality;
      ref.current.rotation.z = rockAngle;
      
      // Forward/backward lean (x-axis) for dynamic movement
      // Add more forward lean for eager walking stance
      const baseLean = Math.sin(time * 4) * 0.03; 
      const forwardLean = baseLean + 0.08; // Increased constant forward lean for swagger
      ref.current.rotation.x = forwardLean;
      
      // Slight bounce in rotation for more character
      const bounce = Math.abs(Math.sin(time * 7)) * 0.01;
      ref.current.rotation.x += bounce;
    } else {
      // Improved idle animation
      const time = state.clock.getElapsedTime();
      // Static position when not moving, with correct ground adjustment
      ref.current.position.set(
        npcPosition[0],
        npcPosition[1] - 0.20 + Math.sin(time * 1.5) * 0.02, // Subtle breathing motion in position
        npcPosition[2]
      );
      
      // Enhanced idle motion with more personality
      const primaryRock = Math.sin(time * 2) * 0.01;
      const secondaryRock = Math.cos(time * 1.3) * 0.005; // Secondary subtle motion
      const idleRock = primaryRock + secondaryRock;
      ref.current.rotation.z = idleRock;
      
      // Subtle forward/backward sway while idle
      const idleSway = Math.sin(time * 1.7) * 0.01;
      ref.current.rotation.x = idleSway + 0.01; // Slight forward tilt for attentive stance
    }
  });

  return (
    <group ref={ref}>
      <primitive object={npcScene} position={[0, 1, 0]} />
      {/* Aura effect with different color than player */}
      <mesh
        ref={auraRef}
        scale={[1.1, 1.6, 1.1]} 
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