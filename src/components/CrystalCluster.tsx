import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

// Rock platform component shaped like an upside-down pyramid with hexagonal top
export default function RockPlatform() {
  const platformRef = useRef<THREE.Group>(null);
  const playerPosition = useGameStore((state) => state.playerPosition);
  
  // Create hexagonal top and pyramid geometry
  const createPlatformGeometry = () => {
    // Create a combined geometry for the platform
    const geometry = new THREE.BufferGeometry();
    
    // Create hexagon vertices for the top face
    const hexRadius = 5;
    const hexHeight = 0;
    const hexVertices = [];
    const hexSegments = 6;
    
    for (let i = 0; i < hexSegments; i++) {
      const angle = (Math.PI * 2 * i) / hexSegments;
      hexVertices.push(
        new THREE.Vector3(
          hexRadius * Math.cos(angle),
          hexHeight,
          hexRadius * Math.sin(angle)
        )
      );
    }
    
    // Center point for the hexagon top
    const centerTop = new THREE.Vector3(0, hexHeight, 0);
    
    // Bottom point for the pyramid (inverted)
    const centerBottom = new THREE.Vector3(0, -6, 0);
    
    // Create triangles for the hexagon top
    const vertices = [];
    const normals = [];
    const uvs = [];
    
    // Top face triangles (hexagon)
    for (let i = 0; i < hexSegments; i++) {
      const nextI = (i + 1) % hexSegments;
      
      // Triangle vertices
      vertices.push(
        ...centerTop.toArray(),
        ...hexVertices[i].toArray(),
        ...hexVertices[nextI].toArray()
      );
      
      // Normal (pointing up)
      const normal = new THREE.Vector3(0, 1, 0);
      for (let j = 0; j < 3; j++) {
        normals.push(...normal.toArray());
      }
      
      // Simple UVs
      uvs.push(0.5, 0.5, Math.cos(i / hexSegments * Math.PI * 2) * 0.5 + 0.5, Math.sin(i / hexSegments * Math.PI * 2) * 0.5 + 0.5, Math.cos(nextI / hexSegments * Math.PI * 2) * 0.5 + 0.5, Math.sin(nextI / hexSegments * Math.PI * 2) * 0.5 + 0.5);
    }
    
    // Side face triangles (pyramid sides)
    for (let i = 0; i < hexSegments; i++) {
      const nextI = (i + 1) % hexSegments;
      
      // Triangle 1 (part of the side face)
      vertices.push(
        ...centerBottom.toArray(),
        ...hexVertices[i].toArray(),
        ...hexVertices[nextI].toArray()
      );
      
      // Calculate normal for the side face
      const edge1 = new THREE.Vector3().subVectors(hexVertices[i], centerBottom);
      const edge2 = new THREE.Vector3().subVectors(hexVertices[nextI], centerBottom);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      
      // Apply normal to all vertices of this face
      for (let j = 0; j < 3; j++) {
        normals.push(...normal.toArray());
      }
      
      // Simple UVs for the side
      uvs.push(0.5, 0, i / hexSegments, 1, (i + 1) / hexSegments, 1);
    }
    
    // Set attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    return geometry;
  };
  
  // Material for the rock platform
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true,
  });
  
  // Animation
  useFrame(() => {
    if (platformRef.current) {
      // Very subtle movement for the platform
      platformRef.current.rotation.y += 0.0005;
    }
  });
  
  return (
    <group ref={platformRef}>
      <mesh geometry={createPlatformGeometry()} material={platformMaterial} />
    </group>
  );
} 