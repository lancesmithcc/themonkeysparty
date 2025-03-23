import RetroTV from './RetroTV';
import Stars from './Stars';
import GeometricShapes from './GeometricShapes';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { useGLTF } from '@react-three/drei';

export default function Room() {
  const floorRef = useRef<THREE.Mesh>(null);
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  // Load the bonsai model
  const { scene: bonsaiScene } = useGLTF('./bonsai.glb');
  
  // Scale the bonsai to be appropriate for the scene
  useEffect(() => {
    bonsaiScene.scale.set(0.8, 0.8, 0.8);
    bonsaiScene.position.set(0, 0.5, 0); // Raised higher above the floor
    bonsaiScene.rotation.y = Math.PI / 6; // Add a slight rotation for aesthetics
  }, [bonsaiScene]);

  // Create hexagonal shape vertices
  const hexagonGeometry = new THREE.BufferGeometry();
  const vertices = [];
  const radius = 5;
  
  // Center vertex
  vertices.push(0, 0, 0);
  
  // Outer vertices - now in XZ plane
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    vertices.push(x, 0, z);
  }
  
  // Create faces (triangles)
  const indices = [];
  for (let i = 1; i <= 6; i++) {
    indices.push(0, i, i === 6 ? 1 : i + 1);
  }
  
  hexagonGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  hexagonGeometry.setIndex(indices);
  hexagonGeometry.computeVertexNormals();

  const hexagonShader = {
    uniforms: {
      time: { value: 0 },
      playerPos: { value: new THREE.Vector2() },
      color: { value: new THREE.Color('#ffffff') }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vDistance;
      
      void main() {
        vUv = uv;
        vPosition = position;
        vDistance = length(position.xz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec2 playerPos;
      uniform vec3 color;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vDistance;

      #define PI 3.14159265359

      // Function to mix yellow variations
      vec3 yellowVariation(float value, float timeFactor) {
        // Pure yellow
        vec3 pureYellow = vec3(1.0, 1.0, 0.0);
        
        // Orange-tinted yellow
        vec3 orangeYellow = vec3(1.0, 0.7, 0.0);
        
        // White-tinted yellow
        vec3 whiteYellow = vec3(1.0, 1.0, 0.6);
        
        // Golden yellow
        vec3 goldenYellow = vec3(1.0, 0.8, 0.2);
        
        // Time-based oscillation between colors
        float t1 = sin(timeFactor + value * 5.0) * 0.5 + 0.5;
        float t2 = cos(timeFactor * 0.7 + value * 3.0) * 0.5 + 0.5;
        
        // First mix between pure yellow and orange yellow
        vec3 color1 = mix(pureYellow, orangeYellow, t1);
        
        // Second mix between golden yellow and white-tinted yellow
        vec3 color2 = mix(goldenYellow, whiteYellow, t2);
        
        // Final mix between both results
        return mix(color1, color2, sin(value * 8.0 + timeFactor * 0.5) * 0.5 + 0.5);
      }

      void main() {
        // Calculate distance from center
        float radius = 5.0;
        float normalizedDist = vDistance / radius;
        
        // Edge glow
        float edgeGlow = smoothstep(0.9, 1.0, normalizedDist);
        
        // Radial lines
        float angle = atan(vPosition.z, vPosition.x);
        float radialLines = abs(sin(angle * 6.0)) * 0.5 + 0.5;
        radialLines = pow(radialLines, 4.0); // Sharper lines
        
        // Circular rings
        float rings = abs(sin(normalizedDist * 8.0 - time * 0.5)) * 0.5 + 0.5;
        rings = pow(rings, 4.0); // Sharper rings
        
        // Player proximity effect
        vec2 playerToPoint = vPosition.xz - playerPos;
        float distanceFromPlayer = length(playerToPoint);
        float playerInfluence = smoothstep(3.0, 0.0, distanceFromPlayer);
        
        // Combine patterns
        float pattern = max(radialLines * 0.3, rings * 0.2);
        
        // Colors - Enhanced with more yellow variations
        vec3 baseColor = color;
        
        // Dynamic color based on position and time
        float positionFactor = (vPosition.x + vPosition.z) * 0.1;
        vec3 glowColor = yellowVariation(positionFactor, time);
        
        // Edge color with more white tint
        vec3 edgeColor = mix(glowColor, vec3(1.0, 1.0, 0.8), 0.4);
        
        // Player influence color - orangier
        vec3 playerColor = vec3(1.0, 0.6, 0.0);
        
        // Combine colors
        vec3 finalColor = baseColor;
        finalColor = mix(finalColor, glowColor, pattern);
        finalColor = mix(finalColor, edgeColor, edgeGlow);
        finalColor = mix(finalColor, playerColor, playerInfluence * 0.3);
        
        // Pulse effect with color variation
        float pulse = (sin(time * 2.0) * 0.5 + 0.5) * 0.3;
        // Use different yellow for pulse based on position
        vec3 pulseColor = yellowVariation(normalizedDist, time * 1.5);
        finalColor = mix(finalColor, pulseColor, pulse * pattern);
        
        // Alpha
        float alpha = 1.0;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  };

  useFrame((state) => {
    if (floorRef.current) {
      const material = floorRef.current.material as THREE.ShaderMaterial;
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.playerPos.value.set(playerPosition[0], playerPosition[2]);
    }
  });

  return (
    <group>
      {/* Hexagonal platform */}
      <mesh 
        ref={floorRef}
        receiveShadow
        position={[0, 0, 0]}
      >
        <primitive object={hexagonGeometry} />
        <shaderMaterial 
          {...hexagonShader}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cosmic environment */}
      <Stars />
      
      {/* Geometric Shapes */}
      <GeometricShapes />

      {/* Add the RetroTV */}
      <RetroTV />
      
      {/* Add the Bonsai tree */}
      <primitive object={bonsaiScene} castShadow receiveShadow />
    </group>
  );
}

// Preload the bonsai model
useGLTF.preload('./bonsai.glb');