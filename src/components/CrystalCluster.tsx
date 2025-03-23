import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Crystal cluster component to be positioned under the platform
export default function CrystalCluster() {
  const crystalGroupRef = useRef<THREE.Group>(null);
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  // Crystal properties
  const CRYSTAL_COUNT = 60;
  const CLUSTER_RADIUS = 5;
  const CRYSTALS_DATA = useMemo(() => {
    const data = [];
    
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      // Crystal position - create a ring pattern under the platform
      const angle = (Math.random() * Math.PI * 2);
      const radiusVariation = CLUSTER_RADIUS * (0.6 + Math.random() * 0.4);
      
      // Position with more concentration at the edges
      const x = Math.cos(angle) * radiusVariation;
      const z = Math.sin(angle) * radiusVariation;
      
      // Random crystal properties
      const height = 0.5 + Math.random() * 1.5;
      const width = 0.1 + Math.random() * 0.3;
      const rotation = Math.random() * Math.PI;
      const rotationAxis = [
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ];
      
      // Random color variation for each crystal
      const hue = Math.random() * 0.1 + 0.6; // Range for blue-ish colors
      const saturation = 0.7 + Math.random() * 0.3;
      const lightness = 0.5 + Math.random() * 0.3;
      
      // Random animation phases
      const pulseSpeed = 0.5 + Math.random() * 2;
      const pulseIntensity = 0.3 + Math.random() * 0.7;
      
      data.push({
        position: [x, -1.5 - Math.random() * 0.8, z],
        scale: [width, height, width],
        rotation,
        rotationAxis,
        color: new THREE.Color().setHSL(hue, saturation, lightness),
        pulseSpeed,
        pulseIntensity
      });
    }
    
    return data;
  }, []);
  
  // Create crystal material with glow effect
  const crystalMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x4080ff) },
        playerPos: { value: new THREE.Vector3() },
        glowIntensity: { value: 1.0 },
        pulseSpeed: { value: 1.0 },
        pulseIntensity: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vPosition = position;
          vNormal = normal;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform vec3 playerPos;
        uniform float glowIntensity;
        uniform float pulseSpeed;
        uniform float pulseIntensity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          // Edge glow effect
          float edgeFactor = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          edgeFactor = pow(edgeFactor, 2.0);
          
          // Calculate fresnel effect for crystal edges
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnelFactor = 1.0 - max(0.0, dot(viewDirection, vNormal));
          fresnelFactor = pow(fresnelFactor, 3.0);
          
          // Pulsing effect
          float pulse = sin(time * pulseSpeed) * 0.5 + 0.5;
          pulse = pulse * pulseIntensity + (1.0 - pulseIntensity);
          
          // Calculate distance-based glow from player
          float distanceToPlayer = length(playerPos - vPosition);
          float playerInfluence = 1.0 / (1.0 + distanceToPlayer * 0.2);
          playerInfluence = clamp(playerInfluence, 0.0, 1.0) * 0.3;
          
          // Combine all lighting effects
          float glowFactor = edgeFactor * 0.6 + fresnelFactor * 0.4;
          glowFactor = glowFactor * pulse + playerInfluence;
          
          // Crystal inner structure - add some noise patterns
          float noisePattern = sin(vPosition.x * 10.0 + time) * 
                               sin(vPosition.y * 8.0 - time * 0.5) * 
                               sin(vPosition.z * 12.0 + time * 0.7);
          noisePattern = (noisePattern * 0.5 + 0.5) * 0.15;
          
          // Final color calculation
          vec3 baseColor = color;
          vec3 glowColor = color * 1.5; // Brighter for glow
          
          vec3 finalColor = mix(baseColor, glowColor, glowFactor);
          finalColor += vec3(1.0, 1.0, 1.0) * noisePattern; // Add white noise highlights
          finalColor *= glowIntensity;
          
          gl_FragColor = vec4(finalColor, 0.8 + fresnelFactor * 0.2);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, []);
  
  // Animation
  useFrame((state) => {
    if (crystalGroupRef.current) {
      // Rotate the entire crystal group slowly
      crystalGroupRef.current.rotation.y += 0.001;
      
      // Update shader uniforms
      const time = state.clock.getElapsedTime();
      
      // Update each crystal's material
      crystalGroupRef.current.children.forEach((crystal) => {
        if (crystal instanceof THREE.Mesh && crystal.material instanceof THREE.ShaderMaterial) {
          crystal.material.uniforms.time.value = time;
          crystal.material.uniforms.playerPos.value.set(
            playerPosition[0],
            playerPosition[1],
            playerPosition[2]
          );
        }
      });
    }
  });
  
  return (
    <group ref={crystalGroupRef}>
      {CRYSTALS_DATA.map((crystal, index) => (
        <mesh
          key={index}
          position={new THREE.Vector3(...crystal.position as [number, number, number])}
          scale={new THREE.Vector3(...crystal.scale as [number, number, number])}
          rotation={new THREE.Euler(
            crystal.rotationAxis[0] * crystal.rotation,
            crystal.rotationAxis[1] * crystal.rotation,
            crystal.rotationAxis[2] * crystal.rotation
          )}
        >
          <coneGeometry args={[1, 1, 6, 1]} />
          <shaderMaterial 
            transparent={true}
            side={THREE.DoubleSide}
            vertexShader={crystalMaterial.vertexShader}
            fragmentShader={crystalMaterial.fragmentShader}
            uniforms={{
              time: { value: 0 },
              color: { value: crystal.color },
              playerPos: { value: new THREE.Vector3() },
              glowIntensity: { value: 1.0 },
              pulseSpeed: { value: crystal.pulseSpeed },
              pulseIntensity: { value: crystal.pulseIntensity }
            }}
          />
        </mesh>
      ))}
    </group>
  );
} 