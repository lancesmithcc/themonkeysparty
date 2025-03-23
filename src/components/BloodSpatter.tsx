import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BloodSpatterProps {
  position: [number, number, number];
  startTime: number;
  scale?: number;
  intensity?: number;
  isPurple?: boolean; // Whether this is a purple state hit
}

export default function BloodSpatter({ 
  position, 
  startTime,
  scale = 1.0,
  intensity = 1.0,
  isPurple = false
}: BloodSpatterProps) {
  // References for particles
  const particlesRef = useRef<THREE.Points>(null);
  
  // Particle configuration
  const PARTICLE_COUNT = 150;
  const ANIMATION_DURATION = 0.6; // 600ms to match hit animation duration
  
  // Create texture for blood particles
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Clear with transparent background
      context.clearRect(0, 0, 64, 64);
      
      // Create a circular shape
      const gradient = context.createRadialGradient(
        32, 32, 0,
        32, 32, 32
      );
      
      // Color based on state - purple for purple state, red for normal
      if (isPurple) {
        // Purple color gradient
        gradient.addColorStop(0, 'rgba(180, 0, 200, 1)');
        gradient.addColorStop(0.4, 'rgba(140, 0, 180, 0.9)');
        gradient.addColorStop(0.8, 'rgba(100, 0, 160, 0.6)');
        gradient.addColorStop(1, 'rgba(80, 0, 140, 0)');
      } else {
        // Deep red blood color gradient
        gradient.addColorStop(0, 'rgba(180, 0, 0, 1)');
        gradient.addColorStop(0.4, 'rgba(140, 0, 0, 0.9)');
        gradient.addColorStop(0.8, 'rgba(100, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(80, 0, 0, 0)');
      }
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    }
    
    const bloodTexture = new THREE.CanvasTexture(canvas);
    bloodTexture.needsUpdate = true;
    return bloodTexture;
  }, [isPurple]);
  
  // Create particles geometry, positions, velocities
  const particles = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const lifetimes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    
    // Create random particles in a sphere
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Random position around the hit point (slightly offset forward)
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      // Random velocities - strong directional spray
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * Math.PI - Math.PI / 2;
      const speed = 1 + Math.random() * 3;
      
      velocities[i3] = Math.sin(angle) * Math.cos(height) * speed;
      velocities[i3 + 1] = Math.sin(height) * speed * 0.7 + 0.5; // Slight upward bias
      velocities[i3 + 2] = Math.cos(angle) * Math.cos(height) * speed;
      
      // Random sizes for particles
      sizes[i] = (0.03 + Math.random() * 0.06) * scale;
      
      // Random lifetime for each particle
      lifetimes[i] = 0.2 + Math.random() * 0.8; // Between 0.2 and 1.0 of the animation duration
      
      // Color based on state
      if (isPurple) {
        // Purple color with variations
        const hue = 0.75 + Math.random() * 0.08; // Purple hue range
        const saturation = 0.8 + Math.random() * 0.2; // High saturation
        const lightness = 0.3 + Math.random() * 0.3; // Brighter than red
        
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      } else {
        // Blood red color with slight variations
        const hue = 0; // Red
        const saturation = 0.8 + Math.random() * 0.2; // High saturation
        const lightness = 0.2 + Math.random() * 0.2; // Darker reds
        
        const color = new THREE.Color().setHSL(hue, saturation, lightness);
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return {
      geometry,
      velocities,
      lifetimes
    };
  }, [scale, isPurple]);
  
  // Material for blood particles
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.1,
      map: texture,
      transparent: true,
      opacity: 0.9 * intensity,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
  }, [texture, intensity]);
  
  // Animation frame updates
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const currentTime = state.clock.getElapsedTime();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / ANIMATION_DURATION, 1.0);
    
    // Only animate during the duration
    if (progress < 1.0) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const sizes = particlesRef.current.geometry.attributes.size.array as Float32Array;
      
      // Update each particle
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const particleLifetime = particles.lifetimes[i] * ANIMATION_DURATION;
        const particleProgress = Math.min(elapsedTime / particleLifetime, 1.0);
        
        // Skip particles that have completed their lifetime
        if (particleProgress >= 1.0) continue;
        
        // Movement with gravity
        positions[i3] = positions[i3] + particles.velocities[i3] * 0.03;
        positions[i3 + 1] = positions[i3 + 1] + particles.velocities[i3 + 1] * 0.03 - 0.01; // Add gravity
        positions[i3 + 2] = positions[i3 + 2] + particles.velocities[i3 + 2] * 0.03;
        
        // Reduce size as particle ages
        sizes[i] = sizes[i] * (1 - particleProgress * 0.05);
      }
      
      // Update geometry
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.size.needsUpdate = true;
      
      // Fade out the material opacity toward the end
      material.opacity = (1 - progress * progress) * 0.9 * intensity;
    } else {
      // Hide when animation completes
      material.opacity = 0;
    }
  });
  
  return (
    <points 
      ref={particlesRef} 
      position={position} 
      material={material} 
      geometry={particles.geometry}
    />
  );
} 