import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Stage, Environment } from '@react-three/drei';

/**
 * GUIDELINES FOR CUSTOM 3D MODELS:
 * 1. Format: .glb (recommended) or .gltf
 * 2. Location: Place file in /public/models/your_model.glb
 * 3. Origin: Model must be centered at (0,0,0) with Y-up.
 * 4. Scale: Keep dimensions within ~2 Three.js units (roughly 2 Blender units).
 * 5. Textures: Embedded textures work best. Keep under 1024px.
 */

function ExternalModel({ url, rotation = [0, 0, 0], autoRotate = false, rotationOffset = 0 }) {
    const { scene } = useGLTF(url);
    const groupRef = useRef();

    useFrame((state, delta) => {
        if (groupRef.current) {
            if (autoRotate) {
                groupRef.current.rotation.y += delta * 0.5;
            } else {
                const scrollY = window.scrollY;
                const stepSize = 8;
                const angleStep = Math.PI / 80;
                const targetRotation = Math.floor(scrollY / stepSize) * angleStep;
                groupRef.current.rotation.y = targetRotation + rotationOffset;
            }
        }
    });

    return (
        <group ref={groupRef} rotation={[0, rotationOffset, 0]}>
            <primitive object={scene} rotation={rotation} />
        </group>
    );
}

function Model({ model, scale = 1, rotation = [0, 0, 0], autoRotate = false, rotationOffset = 0 }) {
    const groupRef = useRef(null);
    const modelType = model || 'default';

    useFrame((state, delta) => {
        if (groupRef.current && !modelType.endsWith('.glb')) {
            if (autoRotate) {
                groupRef.current.rotation.y += delta * 0.5;
            } else {
                const scrollY = window.scrollY;
                const stepSize = 8;
                const angleStep = Math.PI / 80;
                const targetRotation = Math.floor(scrollY / stepSize) * angleStep;
                groupRef.current.rotation.y = targetRotation + rotationOffset;
            }
        }
    });

    // Check if the model string is a path to a GLB file
    if (modelType.endsWith('.glb')) {
        return (
            <group scale={scale}>
                <ExternalModel url={modelType} rotation={rotation} autoRotate={autoRotate} rotationOffset={rotationOffset} />
            </group>
        );
    }

    const renderGeometry = () => {
        switch (modelType) {
            case 'chip8':
                return (
                    <mesh rotation={rotation}>
                        <boxGeometry args={[1.5, 0.5, 1.5]} />
                        <meshStandardMaterial color="#880000" flatShading roughness={0.3} metalness={0.8} />
                    </mesh>
                );
            case 'kernel':
                return (
                    <mesh rotation={rotation}>
                        <sphereGeometry args={[1, 16, 16]} />
                        <meshStandardMaterial color="#000088" flatShading wireframe />
                    </mesh>
                );
            case 'scdfight':
                return (
                    <mesh rotation={rotation}>
                        <octahedronGeometry args={[1, 0]} />
                        <meshStandardMaterial color="#aa8800" flatShading roughness={0.2} metalness={0.6} />
                    </mesh>
                );
            case 'tage':
                return (
                    <mesh rotation={rotation}>
                        <torusKnotGeometry args={[0.6, 0.2, 64, 8]} />
                        <meshStandardMaterial color="#008800" flatShading roughness={0.4} metalness={0.5} />
                    </mesh>
                );
            case 'rap1':
                return (
                    <group rotation={rotation}>
                        <mesh>
                            <boxGeometry args={[1.8, 0.2, 1.8]} />
                            <meshStandardMaterial color="#444" flatShading roughness={0.2} metalness={0.8} />
                        </mesh>
                        <mesh position={[0, 0.15, 0]}>
                            <boxGeometry args={[0.8, 0.1, 0.8]} />
                            <meshStandardMaterial color="#222" flatShading roughness={0.2} metalness={0.8} />
                        </mesh>
                    </group>
                );
            case 'rebel':
                return (
                    <group rotation={rotation}>
                        <mesh>
                            <boxGeometry args={[1.2, 0.2, 1.2]} />
                            <meshStandardMaterial color="#333" flatShading roughness={0.2} metalness={0.9} />
                        </mesh>
                        <mesh position={[0.3, 0.15, 0.3]}><boxGeometry args={[0.3, 0.1, 0.3]} /><meshStandardMaterial color="#c00" roughness={0.1} metalness={0.5} /></mesh>
                        <mesh position={[-0.3, 0.15, 0.3]}><boxGeometry args={[0.3, 0.1, 0.3]} /><meshStandardMaterial color="#c00" roughness={0.1} metalness={0.5} /></mesh>
                        <mesh position={[0.3, 0.15, -0.3]}><boxGeometry args={[0.3, 0.1, 0.3]} /><meshStandardMaterial color="#c00" roughness={0.1} metalness={0.5} /></mesh>
                        <mesh position={[-0.3, 0.15, -0.3]}><boxGeometry args={[0.3, 0.1, 0.3]} /><meshStandardMaterial color="#c00" roughness={0.1} metalness={0.5} /></mesh>
                    </group>
                );
            default:
                return (
                    <mesh rotation={rotation}>
                        <boxGeometry args={[1, 0.2, 1]} />
                        <meshStandardMaterial color="#444" flatShading roughness={0.5} metalness={0.5} />
                    </mesh>
                );
        }
    };

    return (
        <group scale={scale} ref={groupRef} rotation={[0, rotationOffset, 0]}>
            {renderGeometry()}
        </group>
    );
}

export default function ThreeViewer({
    model,
    environment = "city",
    scale = 1,
    cameraPos = [3, 5, 3],
    rotation = [0, 0, 0],
    autoRotate = false,
    rotationOffset = 0
}) {
    // Determine if 'environment' is a preset name or a file path
    // Presets in drei: sunset, dawn, night, warehouse, forest, apartment, studio, city, park, lobby, toshimany
    const isPreset = !environment.includes('/') && !environment.includes('.');

    return (
        <div style={{ width: '100%', height: '100%', background: 'transparent' }}>
            <Canvas
                dpr={[1, 2]}
                camera={{ fov: 40, position: cameraPos }}
                aria-label={`Interactive 3D model of ${model}`}
                role="img"
            >
                <Suspense fallback={null}>
                    {/* Dim manual lights to let HDRI dominate */}
                    <ambientLight intensity={0.2} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={0.5} />

                    {/* HDRI Environment */}
                    {isPreset ? (
                        <Environment preset={environment} />
                    ) : (
                        <Environment files={environment} path="/" />
                    )}

                    <Model model={model} scale={scale} rotation={rotation} autoRotate={autoRotate} rotationOffset={rotationOffset} />
                </Suspense>
            </Canvas>
        </div>
    );
}
