import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Stars() {
  const starsRef = useRef<THREE.Points>(null);
  const auroraRef = useRef<THREE.Mesh>(null);

  // Create star particles
  const particlesCount = 2000;
  const positions = new Float32Array(particlesCount * 3);
  const speeds = new Float32Array(particlesCount);

  for (let i = 0; i < particlesCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 50;
    positions[i3 + 1] = Math.random() * 30 + 5;
    positions[i3 + 2] = (Math.random() - 0.5) * 50;
    speeds[i] = Math.random() * 0.02;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  useFrame((state) => {
    if (starsRef.current) {
      // Animate stars
      const positions = starsRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += speeds[i];
        if (positions[i3 + 1] > 35) positions[i3 + 1] = 5;
      }

      starsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (auroraRef.current) {
      // Animate aurora
      const time = state.clock.getElapsedTime();
      (auroraRef.current.material as THREE.ShaderMaterial).uniforms.time.value = time;
    }
  });

  // Enhanced aurora shader
  const auroraShader = {
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        vUv = uv;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        float elevation = sin(modelPosition.x * 0.5 + time * 0.5) * 
                         sin(modelPosition.z * 0.5 + time * 0.5) * 2.0;
        modelPosition.y += elevation;
        vElevation = elevation;
        gl_Position = projectionMatrix * viewMatrix * modelPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        vec3 color1 = vec3(0.1, 0.5, 0.8);
        vec3 color2 = vec3(0.0, 0.8, 0.4);
        vec3 color3 = vec3(0.4, 0.2, 0.8);
        
        float noise1 = sin(vUv.x * 20.0 + time) * 0.5 + 0.5;
        float noise2 = sin(vUv.y * 15.0 + time * 0.7) * 0.5 + 0.5;
        float noise3 = sin((vUv.x + vUv.y) * 10.0 + time * 0.3) * 0.5 + 0.5;
        
        vec3 mixColor1 = mix(color1, color2, noise1);
        vec3 mixColor2 = mix(mixColor1, color3, noise2);
        
        float alpha = (noise1 * noise2 * noise3) * 0.5 * (1.0 + sin(vElevation));
        gl_FragColor = vec4(mixColor2, alpha * 0.6);
      }
    `
  };

  return (
    <group>
      {/* Stars */}
      <points ref={starsRef}>
        <bufferGeometry {...particleGeometry} />
        <pointsMaterial
          size={0.05}
          color="#ffffff"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>

      {/* Enhanced Aurora */}
      <mesh
        ref={auroraRef}
        position={[0, 15, -20]}
        rotation={[-Math.PI * 0.1, 0, 0]}
      >
        <planeGeometry args={[60, 30, 32, 32]} />
        <shaderMaterial
          {...auroraShader}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}