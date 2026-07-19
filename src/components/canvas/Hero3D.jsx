import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sphere, Cylinder, Box } from '@react-three/drei';

export default function Hero3D() {
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.15;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2 + 1;
    }
  });

  return (
    <group ref={group} position={[0, 1, -2]}>
      {/* Networking / CS Sphere */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere args={[1.2, 32, 32]} position={[-3.5, 0.5, 0]}>
          <meshStandardMaterial 
            color="#0ea5e9" 
            wireframe={true} 
            emissive="#0284c7" 
            emissiveIntensity={2} 
            toneMapped={false}
          />
        </Sphere>
      </Float>

      {/* Electronics / Microchip */}
      <Float speed={1.5} rotationIntensity={2} floatIntensity={1.5}>
        <group position={[3.5, 1, -1]}>
          <Box args={[1.5, 0.1, 1.5]}>
            <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.8} roughness={0.1} metalness={1} toneMapped={false} />
          </Box>
          <Box args={[1.2, 0.15, 1.2]} position={[0, 0.05, 0]}>
            <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={1.5} roughness={0.2} metalness={0.9} toneMapped={false} />
          </Box>
        </group>
      </Float>
      
      {/* Mechanical / Piston */}
      <Float speed={2.5} rotationIntensity={1.5} floatIntensity={2}>
        <Cylinder args={[0.5, 0.5, 2.5, 32]} position={[0, -1, 1]} rotation={[Math.PI / 4, 0, Math.PI / 6]}>
          <meshStandardMaterial 
            color="#f97316" 
            emissive="#ea580c"
            emissiveIntensity={1.2}
            roughness={0.1} 
            metalness={1} 
            toneMapped={false}
          />
        </Cylinder>
      </Float>
    </group>
  );
}
