import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonHelper } from 'three';
import { useGameStore } from '../store/gameStore';

// Using our robob model with its own animations
const MODEL_URL = '/models/robob.glb';
// const ANIMATION_MODEL_URL = 'https://threejs.org/examples/models/gltf/Soldier.glb';

// Refined aura shader for tighter conformity
const auraShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color('#FFE5CC') }, // Warm golden-white color
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

// Create additional shader for purple state effect
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

export default function Player({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const purpleAuraRef = useRef<THREE.Mesh>(null);
  const puddleRef = useRef<THREE.Mesh>(null);
  const originalMaterials = useRef<{[key: string]: THREE.Material}>({});
  const materialsStored = useRef<boolean>(false);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, ref);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const moveDirection = useGameStore((state) => state.moveDirection);
  const isStrafing = useGameStore((state) => state.isStrafing);
  const updatePosition = useGameStore((state) => state.updatePosition);
  const { isPlayerPurple, isPlayerHit, playerMelted, playerMeltProgress } = useGameStore(state => ({
    isPlayerPurple: state.isPlayerPurple, 
    isPlayerHit: state.isPlayerHit,
    playerMelted: state.playerMelted,
    playerMeltProgress: state.playerMeltProgress
  }));
  const originalScale = useRef<[number, number, number]>([1, 1, 1]);
  // Replace state with constant since setter is not used
  const showSkeleton = true;

  console.log("Player component rendering, position from props:", position);
  
  // Get the position directly from the store as a backup
  const storePosition = useGameStore(state => state.playerPosition);
  console.log("Player position from store:", storePosition);
  
  // Check if model is loaded and valid
  useEffect(() => {
    if (scene) {
      // Verify model has content
      try {
        let hasContent = false;
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            hasContent = true;
          }
        });
        
        if (hasContent) {
          console.log("Player model loaded successfully");
          setModelLoaded(true);
        } else {
          console.warn("Player model loaded but no meshes found");
        }
      } catch (error) {
        console.error("Error loading player model:", error);
      }
    } else {
      console.error("Player model scene is undefined");
    }
  }, [scene]);

  // Use the position that was actually passed
  useEffect(() => {
    if (ref.current) {
      console.log("Setting player position to:", position);
      ref.current.position.set(position[0], position[1], position[2]);
    }
  }, [position]);

  // Scale the model to match our previous proportions
  if (scene) {
    scene.scale.set(0.7, 0.7, 0.7);
  }

  // Set initial rotation to face the camera
  useEffect(() => {
    if (ref.current) {
      ref.current.rotation.y = 0;
    }
    
    // Log available animations once when component mounts
    console.log("Available animations:", Object.keys(actions));
  }, []);

  // Handle animations based on movement with martial arts style
  useEffect(() => {
    // Debug: Log available animations to see what we're working with
    console.log("Available animations:", Object.keys(actions));
    
    // Reset all animations
    Object.values(actions).forEach(action => action?.stop());

    // Attempt to play any animation based on movement state
    if (moveDirection.length() > 0) {
      // Get all available animations and find one that might work
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
        console.log(`Using movement animation: ${animName}`);
        actions[animName]?.play();
        actions[animName]?.setEffectiveTimeScale(0.6);
      } else if (availableAnims.length > 0) {
        // Just use the first available animation if nothing specific found
        const firstAnim = availableAnims[0];
        console.log(`No specific movement animation found. Using: ${firstAnim}`);
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
        console.log(`Using idle animation: ${animName}`);
        actions[animName]?.play();
      } else if (availableAnims.length > 0) {
        // Just use the first available animation for idle
        const firstAnim = availableAnims[0];
        console.log(`No specific idle animation found. Using: ${firstAnim}`);
        actions[firstAnim]?.play();
      }
    }
  }, [actions, moveDirection.length()]);

  // Add material management functions before the useFrame hook
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

  useFrame((state) => {
    if (!ref.current) return;
    
    // Update aura time uniform
    if (auraRef.current) {
      const material = auraRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      
      // Hide aura when player is melted
      auraRef.current.visible = !playerMelted;
    }
    
    // Update purple aura when active
    if (purpleAuraRef.current) {
      const material = purpleAuraRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      
      // Toggle visibility based on purple state and not melted
      purpleAuraRef.current.visible = isPlayerPurple && !playerMelted;
    }
    
    // Update puddle animation when melting
    if (puddleRef.current) {
      const material = puddleRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.progress.value = playerMeltProgress;
      
      // Show puddle only when melting
      puddleRef.current.visible = playerMelted;
    }
    
    // Handle melting animation for the model
    if (playerMelted) {
      // Gradually scale down the model in Y axis (shrinking)
      const yScale = Math.max(0.05, 1 - playerMeltProgress * 0.95);
      
      // Spread out a bit in X and Z as it melts
      const xzScale = 1 + playerMeltProgress * 0.3;
      
      // Apply scale
      ref.current.scale.set(
        0.7 * xzScale,  // Original scale is 0.7
        0.7 * yScale,
        0.7 * xzScale
      );
      
      // Move down as it melts to stay on ground
      const meltOffset = playerMeltProgress * 0.6; // How far down it moves
      ref.current.position.y = position[1] - 0.2 - meltOffset;
      
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
            object.material.emissiveIntensity = 0.5 + playerMeltProgress * 0.5;
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
      if (ref.current && !isPlayerHit) {
        ref.current.scale.set(0.7, 0.7, 0.7);
      }
    }
    
    // Change model materials when in purple state
    if (ref.current) {
      ref.current.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          // Skip the aura meshes
          if (object === auraRef.current || object === purpleAuraRef.current || object === puddleRef.current) return;
          
          if (isPlayerPurple) {
            // Store original materials for later restoration
            storeOriginalMaterials();
            
            // Apply purple/pink flashing to materials
            const time = state.clock.getElapsedTime();
            const flash = Math.sin(time * 10) * 0.5 + 0.5; // Oscillates between 0-1
            
            // Create a gradient between purple and pink
            const purpleColor = new THREE.Color('#C000FF'); // Deep purple
            const pinkColor = new THREE.Color('#FF69B4');   // Hot pink
            const mixedColor = new THREE.Color().lerpColors(purpleColor, pinkColor, flash);
            
            // Apply color to different material types
            if (object.material instanceof THREE.MeshStandardMaterial) {
              object.material.emissive = mixedColor;
              object.material.emissiveIntensity = 0.8 + flash * 0.2; // Pulsing intensity
              object.material.color = mixedColor.clone().multiplyScalar(1.5); // Brighter base color
            } else if (object.material instanceof THREE.MeshBasicMaterial ||
                       object.material instanceof THREE.MeshLambertMaterial ||
                       object.material instanceof THREE.MeshPhongMaterial) {
              object.material.color = mixedColor;
            }
          } else if (materialsStored.current && !isPlayerHit && !playerMelted) {
            // Restore materials when purple state ends (and not hit or melted)
            restoreOriginalMaterials();
            materialsStored.current = false;
          }
        }
      });
    }
    
    // Manual bone animation for limbs if available
    const time = state.clock.getElapsedTime();
    ref.current.traverse((object) => {
      if (object instanceof THREE.Bone) {
        // Apply manual animations to specific bones by name pattern
        const name = object.name.toLowerCase();
        
        // Animated limbs for movement
        if (moveDirection.length() > 0) {
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
    
    // Update player position using the gameStore function
    updatePosition();
    
    // Update visual position and animation effects
    if (moveDirection.length() > 0) {
      // Enhanced martial arts style motion
      const bobHeight = Math.sin(time * 8) * 0.08;
      // Adjust base Y position to be flush with ground and add bobbing
      ref.current.position.y = position[1] - 0.20 + bobHeight;
      
      if (isStrafing && (moveDirection.x !== 0)) {
        // Add slight forward lean when strafing for combat ready posture
        ref.current.rotation.x = THREE.MathUtils.lerp(
          ref.current.rotation.x,
          0.1, // Slight forward lean
          0.05
        );
      } else {
        if (!isStrafing) {
          // Calculate angle without PI offset
          const angle = Math.atan2(moveDirection.x, moveDirection.z);
          const targetRotation = new THREE.Euler(0, angle, 0);
          
          // Smooth rotation transition
          ref.current.rotation.y = THREE.MathUtils.lerp(
            ref.current.rotation.y,
            targetRotation.y,
            0.1
          );
          
          // More pronounced martial arts style rocking and leaning
          // Rocking side to side (z-axis)
          const rockAngle = Math.sin(time * 6) * 0.05;
          ref.current.rotation.z = rockAngle;
          
          // Forward/backward lean (x-axis) for dynamic movement
          const forwardLean = Math.sin(time * 4) * 0.03 + 0.05; // Slight constant lean forward + oscillation
          ref.current.rotation.x = forwardLean;
        }
      }
    } else {
      // Reset height when not moving, keeping the adjusted base height
      ref.current.position.y = position[1] - 0.20;
      
      // Subtle motion even when idle for a vigilant stance
      const time = state.clock.getElapsedTime();
      const idleRock = Math.sin(time * 2) * 0.01;
      ref.current.rotation.z = idleRock;
    }

    // Add red flash and scale animation when hit
    if (ref.current && isPlayerHit) {
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
    } else if (!isPlayerHit && originalScale.current[0] !== 1) {
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

  // Set up skeleton helper for debugging
  useEffect(() => {
    // Traverse the scene to find the skeleton
    scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh) {
        console.log("Found skinned mesh:", object.name);
        console.log("Bones:", object.skeleton.bones.map(bone => bone.name));
      }
    });
  }, [scene]);

  // Create a helper for any skeletal meshes
  useEffect(() => {
    if (ref.current && modelLoaded) {
      // Find any skeletons in the scene
      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      ref.current.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh && object.skeleton && object.skeleton.bones.length > 0) {
          skinnedMeshes.push(object);
        }
      });
      
      if (skinnedMeshes.length > 0) {
        console.log(`Found ${skinnedMeshes.length} skinned meshes`);
        try {
          // Create helper for the first one
          const helper = new SkeletonHelper(skinnedMeshes[0]);
          helper.visible = showSkeleton;
          ref.current.add(helper);
        } catch (error) {
          console.warn("Error creating SkeletonHelper:", error);
        }
      } else {
        console.log("No skinned meshes found in the model");
      }
    }
  }, [ref.current, showSkeleton, modelLoaded]);

  return (
    <group ref={ref} position={position}>
      <primitive object={scene} position={[0, 1, 0]} />
      
      {/* Original aura effect */}
      <mesh ref={auraRef} scale={[1.1, 1.6, 1.1]} position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.9, 32, 32]} /> {/* Smaller radius for tighter glow */}
        <shaderMaterial
          attach="material"
          args={[auraShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Purple state aura effect - only visible when in purple state */}
      <mesh ref={purpleAuraRef} scale={[1.15, 1.65, 1.15]} position={[0, 1.8, 0]} visible={isPlayerPurple}>
        <sphereGeometry args={[0.9, 32, 32]} />
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
      <mesh ref={puddleRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={playerMelted}>
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
      
      {showSkeleton && ref.current && modelLoaded && (
        <>
          {/* Only add SkeletonHelper if ref.current contains actual meshes */}
          {(() => {
            // Check if skinnedMeshes exist before creating SkeletonHelper
            const skinnedMeshes: THREE.SkinnedMesh[] = [];
            ref.current.traverse((object) => {
              if (object instanceof THREE.SkinnedMesh && object.skeleton && object.skeleton.bones.length > 0) {
                skinnedMeshes.push(object);
              }
            });
            
            // Only return SkeletonHelper if we found valid skinned meshes
            if (skinnedMeshes.length > 0) {
              return <primitive object={new SkeletonHelper(skinnedMeshes[0])} />;
            }
            return null;
          })()}
        </>
      )}
    </group>
  );
}

// Pre-load both models
useGLTF.preload(MODEL_URL);
// useGLTF.preload(ANIMATION_MODEL_URL);