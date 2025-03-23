import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import '@fontsource/press-start-2p';

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

// Create purple state shader similar to the Player component
const purpleStateShader = {
  uniforms: {
    time: { value: 0 },
    purpleColor: { value: new THREE.Color('#C000FF') }, // Deep purple
    pinkColor: { value: new THREE.Color('#FF69B4') },   // Hot pink
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
      
      // Pulsating movement animation
      vec3 pos = position;
      float movement = sin(time * 4.0 + position.y * 3.0) * 0.01;
      pos += normal * movement;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 purpleColor;
    uniform vec3 pinkColor;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      // Fast flashing effect between purple and pink
      float flash = sin(time * 10.0) * 0.5 + 0.5;
      
      // Edge glow effect
      float edgeGlow = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      
      // Mix between purple and pink based on flash value
      vec3 finalColor = mix(purpleColor, pinkColor, flash);
      
      // Increase glow intensity at edges
      finalColor = mix(finalColor, vec3(1.0, 0.5, 1.0), edgeGlow * 0.5);
      
      // Pulsating alpha
      float alpha = 0.7 + sin(time * 8.0) * 0.3;
      
      gl_FragColor = vec4(finalColor, alpha * 0.8);
    }
  `
};

// Add a melting puddle shader
const meltingPuddleShader = {
  uniforms: {
    time: { value: 0 },
    progress: { value: 0 },
    color: { value: new THREE.Color('#FF3333') }, // Red puddle color
  },
  vertexShader: `
    varying vec2 vUv;
    uniform float progress;
    
    void main() {
      vUv = uv;
      
      // Flatten the mesh based on progress
      vec3 pos = position;
      pos.y *= (1.0 - progress * 0.95);
      
      // Spread outward as it flattens
      vec2 offset = (uv - 0.5) * 2.0;
      float spread = progress * 1.5;
      pos.xz += offset * spread;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float time;
    uniform float progress;
    varying vec2 vUv;
    
    void main() {
      // Calculate distance from center for a radial gradient
      vec2 center = vec2(0.5, 0.5);
      float dist = length(vUv - center);
      
      // Create a pulsating effect
      float pulse = sin(time * 3.0 + dist * 5.0) * 0.1 + 0.9;
      
      // Edge glow effect
      float edgeGlow = smoothstep(0.0, 0.5, dist) * (1.0 - smoothstep(0.5, 1.0, dist));
      
      // Make the puddle more transparent at the edges
      float alpha = (1.0 - dist * 0.8) * progress;
      
      // Make the puddle "bubbling" with noise
      float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233)) * time) * 43758.5453);
      float bubbles = step(0.7 - progress * 0.3, noise) * step(dist, 0.9);
      
      // Final color with bubbling effect
      vec3 finalColor = mix(color, vec3(1.0, 0.5, 0.5), bubbles * pulse);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

export default function Npc() {
  const ref = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const purpleAuraRef = useRef<THREE.Mesh>(null);
  const puddleRef = useRef<THREE.Mesh>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, ref);
  
  const { npcPosition, npcRotation, updateNpcPosition, npcScore, isNpcPurple, isNpcHit, npcMelted, npcMeltProgress } = useGameStore(state => ({
    npcPosition: state.npcPosition,
    npcRotation: state.npcRotation,
    updateNpcPosition: state.updateNpcPosition,
    npcScore: state.npcScore,
    isNpcPurple: state.isNpcPurple,
    isNpcHit: state.isNpcHit,
    npcMelted: state.npcMelted,
    npcMeltProgress: state.npcMeltProgress
  }));

  console.log("NPC component rendering, position:", npcPosition);

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

  // Save original materials when we first apply purple effect
  const originalMaterials = useRef<{[key: string]: THREE.Material}>({});
  const materialsStored = useRef<boolean>(false);
  const originalScale = useRef<[number, number, number]>([1, 1, 1]);
  
  // Store original materials to restore later
  const storeOriginalMaterials = () => {
    if (ref.current && !materialsStored.current) {
      ref.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const key = child.uuid;
          originalMaterials.current[key] = child.material.clone();
        }
      });
      materialsStored.current = true;
    }
  };
  
  // Restore original materials
  const restoreOriginalMaterials = () => {
    if (ref.current && materialsStored.current) {
      ref.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const key = child.uuid;
          if (originalMaterials.current[key]) {
            child.material = originalMaterials.current[key].clone();
          }
        }
      });
    }
  };

  // Animation and movement in each frame
  useFrame((state, delta) => {
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
      
      // Hide aura when NPC is melted
      auraRef.current.visible = !npcMelted;
    }
    
    // Update purple aura when active
    if (purpleAuraRef.current) {
      const material = purpleAuraRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      
      // Toggle visibility based on purple state and not melted
      purpleAuraRef.current.visible = isNpcPurple && !npcMelted;
    }
    
    // Update puddle animation when melting
    if (puddleRef.current) {
      const material = puddleRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.progress.value = npcMeltProgress;
      
      // Show puddle only when melting
      puddleRef.current.visible = npcMelted;
    }
    
    // Handle melting animation for the model
    if (npcMelted) {
      // Gradually scale down the model in Y axis (shrinking)
      const yScale = Math.max(0.05, 1 - npcMeltProgress * 0.95);
      
      // Spread out a bit in X and Z as it melts
      const xzScale = 1 + npcMeltProgress * 0.3;
      
      // Apply scale
      ref.current.scale.set(
        0.7 * xzScale,  // Original scale is 0.7
        0.7 * yScale,
        0.7 * xzScale
      );
      
      // Move down as it melts to stay on ground
      const meltOffset = npcMeltProgress * 0.6; // How far down it moves
      ref.current.position.y = npcPosition[1] - 0.2 - meltOffset;
      
      // Apply red melting effect to materials
      ref.current.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          // Skip the aura and puddle meshes
          if (object === auraRef.current || object === purpleAuraRef.current || object === puddleRef.current) return;
          
          // Store original materials if not already stored
          storeOriginalMaterials();
          
          // Apply red melting effect to materials
          if (object.material instanceof THREE.MeshStandardMaterial) {
            object.material.emissive.set(1, 0, 0);
            object.material.emissiveIntensity = 0.5 + npcMeltProgress * 0.5;
            object.material.color.setRGB(1, 0, 0);
          } else if (object.material instanceof THREE.MeshBasicMaterial ||
                     object.material instanceof THREE.MeshLambertMaterial ||
                     object.material instanceof THREE.MeshPhongMaterial) {
            object.material.color.setRGB(1, 0, 0);
          }
        }
      });
      
      // Skip all other visual effects when melting
      return;
    } else {
      // Reset scale if not melted
      if (ref.current && !isNpcHit) {
        ref.current.scale.set(0.7, 0.7, 0.7);
      }
    }
    
    // Handle purple state effects
    if (isNpcPurple) {
      // Store original materials for later restoration
      storeOriginalMaterials();
      
      // Apply purple material to the model
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && 
            object !== auraRef.current && 
            object !== purpleAuraRef.current &&
            object !== puddleRef.current) {
          // Skip aura meshes
          if (object.material) {
            // Apply emissive purple color
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => {
                if (mat.emissive) {
                  mat.emissive.set(0x8000ff);
                  mat.emissiveIntensity = 0.5;
                }
              });
            } else if (object.material.emissive) {
              object.material.emissive.set(0x8000ff);
              object.material.emissiveIntensity = 0.5;
            }
          }
        }
      });
    } else {
      // Restore original materials when not in purple state
      restoreOriginalMaterials();
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
    
    // Add red flash and scale animation when hit
    if (ref.current && isNpcHit) {
      // Store original scale if not stored
      if (originalScale.current[0] === 1) {
        originalScale.current = [
          ref.current.scale.x,
          ref.current.scale.y,
          ref.current.scale.z
        ];
      }
      
      // Calculate hit animation progress (pulsating)
      const hitPulse = Math.abs(Math.sin(time * 20)); // Fast pulsating
      
      // Apply red flash to materials
      ref.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          // Skip aura meshes
          if (child === auraRef.current || child === purpleAuraRef.current || child === puddleRef.current) return;
          
          // Apply red color flash
          if (child.material instanceof THREE.MeshStandardMaterial) {
            // Store original material if needed
            storeOriginalMaterials();
            
            // Intense red emissive for hit effect
            child.material.emissive.set(1, 0, 0);
            child.material.emissiveIntensity = 1 + hitPulse;
          } else if (child.material instanceof THREE.MeshBasicMaterial ||
                     child.material instanceof THREE.MeshLambertMaterial ||
                     child.material instanceof THREE.MeshPhongMaterial) {
            // Store original material if needed
            storeOriginalMaterials();
            
            // Flash between normal and red
            child.material.color.setRGB(1, hitPulse * 0.5, hitPulse * 0.5);
          }
        }
      });
      
      // Pulsating scale effect - shrink slightly when hit
      const shrinkFactor = 0.8 + hitPulse * 0.2; // Shrink to 80% and pulse back up
      ref.current.scale.set(
        originalScale.current[0] * shrinkFactor,
        originalScale.current[1] * shrinkFactor,
        originalScale.current[2] * shrinkFactor
      );
    } else if (!isNpcHit && originalScale.current[0] !== 1) {
      // Restore original scale when hit animation ends
      if (ref.current) {
        ref.current.scale.set(
          originalScale.current[0],
          originalScale.current[1],
          originalScale.current[2]
        );
      }
      // Reset the scale marker
      originalScale.current = [1, 1, 1];
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
      {/* Purple state aura effect - only visible when in purple state */}
      <mesh ref={purpleAuraRef} scale={[1.15, 1.65, 1.15]} position={[0, 1.8, 0]} visible={isNpcPurple}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <shaderMaterial
          attach="material"
          args={[purpleStateShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Melting puddle effect - only visible when melted */}
      <mesh ref={puddleRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={npcMelted}>
        <circleGeometry args={[1.2, 32]} />
        <shaderMaterial
          attach="material"
          args={[meltingPuddleShader]}
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