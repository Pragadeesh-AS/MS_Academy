import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';

function CourseCard({ position, color, title, delay, emissiveColor }) {
  const mesh = useRef();
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.15;
      mesh.current.rotation.y = hovered ? 0 : Math.sin(state.clock.elapsedTime * 0.5 + delay) * 0.2;
      mesh.current.scale.setScalar(hovered ? 1.15 : 1);
    }
  });

  return (
    <group position={position} ref={mesh} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <RoundedBox args={[2.2, 1.6, 0.3]} radius={0.15} smoothness={4}>
        <meshStandardMaterial 
          color={hovered ? '#ffffff' : color} 
          emissive={hovered ? emissiveColor : color}
          emissiveIntensity={hovered ? 2 : 0.5}
          roughness={0.1} 
          metalness={0.8} 
          toneMapped={false}
        />
      </RoundedBox>
      <Text 
        position={[0, 0, 0.2]} 
        fontSize={0.22} 
        color={hovered ? '#000000' : '#ffffff'} 
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        anchorX="center" 
        anchorY="middle" 
        maxWidth={1.8} 
        textAlign="center"
        fontWeight="bold"
      >
        {title}
      </Text>
    </group>
  );
}

export default function Courses3D() {
  return (
    <group position={[0, -2.5, 0]}>
      <CourseCard position={[-3.5, 0, 0]} color="#ea580c" emissiveColor="#f97316" title="Computer Science (CSE)" delay={0} />
      <CourseCard position={[0, 0, 1.5]} color="#2563eb" emissiveColor="#3b82f6" title="Electronics (ECE)" delay={1} />
      <CourseCard position={[3.5, 0, 0]} color="#059669" emissiveColor="#10b981" title="Mechanical (ME)" delay={2} />
    </group>
  );
}
