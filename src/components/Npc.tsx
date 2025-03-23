import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Using the existing robob model as a fallback since anuki.glb doesn't exist
const MODEL_URL = '/models/robob.glb';

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
  
  // Get NPC position and movement data from the store
  const npcPosition = useGameStore((state) => state.npcPosition);
  const npcMoveDirection = useGameStore((state) => state.npcMoveDirection);
  const updateNpcPosition = useGameStore((state) => state.updateNpcPosition);

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

  // Handle animations based on movement
  useEffect(() => {
    // Reset all animations
    Object.values(actions).forEach(action => action?.stop());

    // Play animation based on whether NPC is moving
    if (npcMoveDirection.length() > 0) {
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
  }, [actions, npcMoveDirection.length()]);

  // Animation and movement in each frame
  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Update aura time uniform
    if (auraRef.current) {
      const material = auraRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
    }
    
    // Update NPC position using the gameStore function
    updateNpcPosition(delta);
    
    // Manual bone animation for limbs if available
    const time = state.clock.getElapsedTime();
    ref.current.traverse((object) => {
      if (object instanceof THREE.Bone) {
        // Apply manual animations to specific bones by name pattern
        const name = object.name.toLowerCase();
        
        // Animated limbs for movement
        if (npcMoveDirection.length() > 0) {
          // Arms
          if (name.includes('arm') || name.includes('hand')) {
            // Swing arms back and forth
            if (name.includes('right')) {
              object.rotation.x = Math.sin(time * 5) * 0.3;
            } else if (name.includes('left')) {
              object.rotation.x = -Math.sin(time * 5) * 0.3;
            }
          }
          
          // Legs
          if (name.includes('leg') || name.includes('foot')) {
            // Swing legs back and forth in opposite phase
            if (name.includes('right')) {
              object.rotation.x = -Math.sin(time * 5) * 0.3;
            } else if (name.includes('left')) {
              object.rotation.x = Math.sin(time * 5) * 0.3;
            }
          }
        } else {
          // Subtle idle motion
          if (name.includes('arm') || name.includes('hand')) {
            // Subtle breathing motion
            object.rotation.x = Math.sin(time * 1.5) * 0.05;
          }
        }
      }
    });
    
    // Update visual position and animation effects
    if (npcMoveDirection.length() > 0) {
      // Movement animation
      const bobHeight = Math.sin(time * 8) * 0.08;
      
      // Position the NPC at the correct location with ground adjustment and bobbing
      ref.current.position.set(
        npcPosition[0],
        npcPosition[1] - 0.20 + bobHeight,
        npcPosition[2]
      );
      
      // Rotate NPC to face movement direction
      const angle = Math.atan2(npcMoveDirection.x, npcMoveDirection.z);
      
      // Smooth rotation transition
      ref.current.rotation.y = THREE.MathUtils.lerp(
        ref.current.rotation.y,
        angle,
        0.1
      );
      
      // Movement style effects
      // Rocking side to side (z-axis)
      const rockAngle = Math.sin(time * 6) * 0.05;
      ref.current.rotation.z = rockAngle;
      
      // Forward/backward lean (x-axis) for dynamic movement
      const forwardLean = Math.sin(time * 4) * 0.03 + 0.05; // Slight constant lean forward + oscillation
      ref.current.rotation.x = forwardLean;
    } else {
      // Static position when not moving, with correct ground adjustment
      ref.current.position.set(
        npcPosition[0],
        npcPosition[1] - 0.20,
        npcPosition[2]
      );
      
      // Subtle idle motion
      const idleRock = Math.sin(time * 2) * 0.01;
      ref.current.rotation.z = idleRock;
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