import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Create a basic particle texture if the glow.png is missing
function createFallbackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  
  if (context) {
    // Create a radial gradient
    const gradient = context.createRadialGradient(
      32, 32, 0,
      32, 32, 32
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    // Fill with gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Sparks particle system for collision effect
export default function CollisionEffect() {
  const { isColliding, collisionPosition, collisionTime } = useGameStore((state) => ({
    isColliding: state.isColliding,
    collisionPosition: state.collisionPosition,
    collisionTime: state.collisionTime
  }));
  
  // Refs for particles
  const particlesRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  
  // Particle count and properties
  const PARTICLE_COUNT = 200;
  
  // Create particles with random velocities and lifetimes
  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const lifetimes = new Float32Array(PARTICLE_COUNT);
    
    // Define a set of vibrant colors for the particles
    const particleColors = [
      new THREE.Color(0xffff00), // Yellow
      new THREE.Color(0xffaa00), // Orange
      new THREE.Color(0xffffff), // White
      new THREE.Color(0xaaddff), // Light blue tint
    ];
    
    // Initialize particles with random positions, velocities, and colors
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random initial position near the center
      positions[i * 3] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      
      // Random velocity in all directions
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1 + Math.random() * 2;
      
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      
      // Random color from our palette
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Random size for each particle
      sizes[i] = 0.1 + Math.random() * 0.3;
      
      // Random lifetime for each particle
      lifetimes[i] = 0.5 + Math.random() * 1.5;
    }
    
    // Create geometry and set attributes
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return {
      geometry,
      velocities,
      lifetimes,
    };
  }, []);
  
  // Try to load the texture, use fallback if it fails
  const texture = useMemo(() => {
    const textureLoader = new THREE.TextureLoader();
    return new Promise<THREE.Texture>((resolve) => {
      textureLoader.load(
        '/sprites/glow.png',
        (loadedTexture) => {
          resolve(loadedTexture);
        },
        undefined,
        () => {
          console.warn('Failed to load glow.png, using fallback texture');
          resolve(createFallbackTexture());
        }
      );
    });
  }, []);
  
  // Create shader material for particles
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        collisionTime: { value: 0 },
        texture: { value: null },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        uniform float collisionTime;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Fade out based on time since collision
          float timeSinceCollision = time - collisionTime;
          float fadeOut = 1.0 - min(1.0, timeSinceCollision / 1.5);
          
          gl_PointSize = size * fadeOut * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform sampler2D texture;
        
        void main() {
          vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
          vec4 texColor = texture2D(texture, uv);
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });
  }, []);
  
  // Create sprite material for center glow
  const glowMaterial = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: null,
      color: 0xffff80,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);
  
  // Load the texture once and apply it to our materials
  useEffect(() => {
    texture.then(loadedTexture => {
      if (shaderMaterial.uniforms) {
        shaderMaterial.uniforms.texture.value = loadedTexture;
      }
      if (glowMaterial.map === null) {
        glowMaterial.map = loadedTexture;
      }
    });
  }, [texture, shaderMaterial, glowMaterial]);
  
  // Handle collision - reset particles
  useEffect(() => {
    if (isColliding && particlesRef.current && collisionPosition) {
      const positions = particlesRef.current.geometry.getAttribute('position');
      const velocities = particles.velocities;
      
      // Reset all particles to the collision position with new random velocities
      for (let i = 0; i < positions.count; i++) {
        // Small random offset from collision point
        positions.setXYZ(
          i,
          collisionPosition[0] + (Math.random() - 0.5) * 0.1,
          collisionPosition[1] + (Math.random() - 0.5) * 0.1, 
          collisionPosition[2] + (Math.random() - 0.5) * 0.1
        );
        
        // New random velocity in all directions
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 1 + Math.random() * 2;
        
        velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i * 3 + 1] = Math.cos(phi) * speed;
        velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      }
      
      positions.needsUpdate = true;
    }
  }, [isColliding, collisionTime, collisionPosition, particles]);
  
  // Animation logic
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (particlesRef.current && isColliding) {
      // Update the particle positions based on velocities
      const positions = particlesRef.current.geometry.getAttribute('position');
      const sizes = particlesRef.current.geometry.getAttribute('size');
      
      // Update time uniform for fading effect
      shaderMaterial.uniforms.time.value = time;
      shaderMaterial.uniforms.collisionTime.value = collisionTime / 1000; // Convert to seconds
      
      // Update each particle position based on its velocity
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        
        // Get current position
        let x = positions.getX(i);
        let y = positions.getY(i);
        let z = positions.getZ(i);
        
        // Add velocity and simulate gravity
        x += particles.velocities[ix] * 0.01;
        y += particles.velocities[iy] * 0.01 - 0.005; // Apply gravity
        z += particles.velocities[iz] * 0.01;
        
        // Update position
        positions.setXYZ(i, x, y, z);
        
        // Optional: Slow down particles over time
        particles.velocities[ix] *= 0.99;
        particles.velocities[iy] *= 0.99;
        particles.velocities[iz] *= 0.99;
      }
      
      positions.needsUpdate = true;
    }
    
    // Update the center glow
    if (glowRef.current && collisionPosition) {
      // Position the glow at the collision point
      glowRef.current.position.set(
        collisionPosition[0],
        collisionPosition[1],
        collisionPosition[2]
      );
      
      // Pulse size effect
      const timeSinceCollision = time - collisionTime / 1000;
      const fadeOut = Math.max(0, 1 - timeSinceCollision / 1.5);
      const pulseSize = 1 + Math.sin(time * 10) * 0.2;
      
      glowRef.current.scale.set(
        pulseSize * fadeOut * 2,
        pulseSize * fadeOut * 2,
        1
      );
      
      // Fade opacity
      glowRef.current.material.opacity = fadeOut * 0.7;
    }
  });
  
  // Only render when a collision is active
  if (!isColliding) return null;
  
  return (
    <>
      <points ref={particlesRef} material={shaderMaterial} geometry={particles.geometry} />
      <sprite ref={glowRef} material={glowMaterial} scale={[2, 2, 1]} />
    </>
  );
} 