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

export default function Player({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  // Load the soldier model for animations only
  // const { animations } = useGLTF(ANIMATION_MODEL_URL);
  const { actions } = useAnimations(animations, ref);
  const moveDirection = useGameStore((state) => state.moveDirection);
  const isStrafing = useGameStore((state) => state.isStrafing);
  const updatePosition = useGameStore((state) => state.updatePosition);
  // Replace state with constant since setter is not used
  const showSkeleton = true;

  // Scale the model to match our previous proportions
  scene.scale.set(0.7, 0.7, 0.7);

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

  useFrame((state) => {
    if (!ref.current) return;
    
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
    if (ref.current) {
      // Find any skeletons in the scene
      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      ref.current.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh) {
          skinnedMeshes.push(object);
        }
      });
      
      if (skinnedMeshes.length > 0) {
        console.log(`Found ${skinnedMeshes.length} skinned meshes`);
        // Create helper for the first one
        const helper = new SkeletonHelper(skinnedMeshes[0]);
        helper.visible = showSkeleton;
        ref.current.add(helper);
      } else {
        console.log("No skinned meshes found in the model");
      }
    }
  }, [ref.current, showSkeleton]);

  return (
    <group ref={ref} position={position}>
      <primitive object={scene} position={[0, 1, 0]} />
      {/* Tighter aura effect */}
      <mesh
        ref={auraRef}
        scale={[1.1, 1.6, 1.1]} // Reduced scale for tighter fit
        position={[0, 1.8, 0]} // Adjusted to match new character position
      >
        <sphereGeometry args={[0.9, 32, 32]} /> {/* Smaller radius for tighter glow */}
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

// Pre-load both models
useGLTF.preload(MODEL_URL);
// useGLTF.preload(ANIMATION_MODEL_URL);