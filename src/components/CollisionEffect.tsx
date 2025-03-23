import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

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
    const velocities = new Array(PARTICLE_COUNT).fill(0).map(() => new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 4 + 2,
      (Math.random() - 0.5) * 3
    ));
    
    const lifetimes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random starting positions near the origin
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      
      // Random lifetimes between 0.5 and 1.5 seconds
      lifetimes[i] = Math.random() * 1 + 0.5;
      
      // Colors: yellow, orange, and white with blue tint
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // Yellow
        colors[i * 3 + 0] = 1;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.3;
      } else if (colorChoice < 0.7) {
        // Orange
        colors[i * 3 + 0] = 1;
        colors[i * 3 + 1] = 0.6;
        colors[i * 3 + 2] = 0.1;
      } else if (colorChoice < 0.9) {
        // White
        colors[i * 3 + 0] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else {
        // Blue tint
        colors[i * 3 + 0] = 0.5;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 1;
      }
    }
    
    return { positions, velocities, lifetimes, colors };
  }, []);
  
  // Create particle shader material
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        size: { value: 8.0 },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        attribute float lifetime;
        attribute vec3 color;
        uniform float time;
        uniform float size;
        uniform float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          vColor = color;
          
          // Calculate particle age (0 to 1)
          float age = min(time / lifetime, 1.0);
          
          // Size decreases over time
          float particleSize = size * (1.0 - age * 0.7);
          
          // Opacity curve: rises quickly, then falls off
          vOpacity = opacity * (1.0 - age) * (1.0 - age);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = particleSize / gl_Position.w;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          // Circular particle shape
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          float alpha = smoothstep(0.5, 0.35, dist) * vOpacity;
          
          // Apply glow effect
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);
  
  // Sprite material for the central glow
  const glowMaterial = useMemo(() => {
    const glowTexture = new THREE.TextureLoader().load('/sprites/glow.png');
    return new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffbb33,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.0
    });
  }, []);
  
  // Create particle geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(particles.lifetimes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(particles.colors, 3));
    return geo;
  }, [particles]);
  
  // Animation logic
  useFrame((_, delta) => {
    if (!particlesRef.current || !glowRef.current) return;
    
    if (isColliding) {
      const elapsedTime = (Date.now() - collisionTime) / 1000; // Time since collision in seconds
      const duration = 1.5; // Total effect duration
      
      if (elapsedTime < duration) {
        // Update material uniforms
        particleMaterial.uniforms.time.value += delta;
        
        // Update particle positions based on velocities and gravity
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < particles.velocities.length; i++) {
          // Apply gravity
          particles.velocities[i].y -= 9.8 * delta * 0.7;
          
          // Update positions
          positions[i * 3 + 0] += particles.velocities[i].x * delta;
          positions[i * 3 + 1] += particles.velocities[i].y * delta;
          positions[i * 3 + 2] += particles.velocities[i].z * delta;
        }
        
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Make visible and place at collision position
        particlesRef.current.visible = true;
        glowRef.current.visible = true;
        
        if (collisionPosition) {
          particlesRef.current.position.set(
            collisionPosition[0], 
            collisionPosition[1] + 0.5, // Raise slightly above ground
            collisionPosition[2]
          );
          glowRef.current.position.set(
            collisionPosition[0], 
            collisionPosition[1] + 0.5, 
            collisionPosition[2]
          );
        }
        
        // Fade glow based on time
        const progress = elapsedTime / duration;
        const glowOpacity = progress < 0.2 
          ? progress * 5 // Quick fade in
          : Math.max(0, 1 - ((progress - 0.2) / 0.8)); // Gradual fade out
        
        glowRef.current.material.opacity = glowOpacity;
        
        // Grow and shrink glow
        const sizeMultiplier = 1 + Math.sin(elapsedTime * 10) * 0.2;
        glowRef.current.scale.set(2 * sizeMultiplier, 2 * sizeMultiplier, 1);
      } else {
        // Hide particles after effect duration
        particlesRef.current.visible = false;
        glowRef.current.visible = false;
      }
    } else {
      // Hide when not colliding
      if (particlesRef.current) particlesRef.current.visible = false;
      if (glowRef.current) glowRef.current.visible = false;
      
      // Reset uniforms for next collision
      particleMaterial.uniforms.time.value = 0;
    }
  });
  
  // Reset particles when a new collision occurs
  useEffect(() => {
    if (isColliding && particlesRef.current) {
      // Reset particle positions
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particles.velocities.length; i++) {
        // Reset to small random offsets around center
        positions[i * 3 + 0] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        
        // Reset velocities with random directions
        particles.velocities[i].set(
          (Math.random() - 0.5) * 3,
          Math.random() * 4 + 2,
          (Math.random() - 0.5) * 3
        );
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Reset material uniforms
      particleMaterial.uniforms.time.value = 0;
    }
  }, [isColliding, collisionTime, particles.velocities]);
  
  // Only render when a collision is active
  if (!isColliding) return null;
  
  return (
    <>
      <points ref={particlesRef} geometry={geometry} material={particleMaterial} />
      <sprite ref={glowRef} material={glowMaterial} scale={[2, 2, 1]} />
    </>
  );
} 