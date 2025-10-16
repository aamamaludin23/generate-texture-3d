import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import Spinner from './Spinner';
import { PBRMaps } from '../App';

interface ThreeSceneProps {
  fileUrl: string;
  pbrMaps?: PBRMaps | null;
  onError: (message: string) => void;
  onLoad: () => void;
}

const ThreeScene = forwardRef<({ generateAoMap: () => Promise<string | null> }), ThreeSceneProps>(
  ({ fileUrl, pbrMaps, onError, onLoad }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [loadedObject, setLoadedObject] = useState<THREE.Group | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);

    // Mengekspos fungsi untuk menghasilkan Peta AO ke komponen induk
    useImperativeHandle(ref, () => ({
      generateAoMap: async (): Promise<string | null> => {
        const scene = sceneRef.current;
        const renderer = rendererRef.current;
        const object = loadedObject;

        if (!scene || !renderer || !object) {
          onError("3D object not ready for analysis.");
          return null;
        }

        // Simpan material asli
        const originalMaterials = new Map<THREE.Object3D, THREE.Material | THREE.Material[]>();
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            originalMaterials.set(child, child.material);
          }
        });

        // Ganti dengan material sederhana untuk rendering AO
        const aoMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = aoMaterial;
          }
        });

        // Atur untuk menangkap AO
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        const aoCamera = new THREE.OrthographicCamera(-maxDim / 2, maxDim / 2, maxDim / 2, -maxDim / 2, 0.1, maxDim * 2);
        aoCamera.position.set(center.x, center.y + maxDim, center.z);
        aoCamera.lookAt(center);

        const originalBackground = scene.background;
        scene.background = new THREE.Color(0x000000); // Latar belakang hitam untuk AO
        
        // Simpan dan atur ukuran renderer
        const originalSize = new THREE.Vector2();
        renderer.getSize(originalSize);
        renderer.setSize(1024, 1024, false);

        renderer.render(scene, aoCamera);
        const dataURL = renderer.domElement.toDataURL('image/png');
        
        // Kembalikan perubahan
        renderer.setSize(originalSize.x, originalSize.y, false);
        scene.background = originalBackground;
        originalMaterials.forEach((material, mesh) => {
          (mesh as THREE.Mesh).material = material;
        });

        return dataURL;
      }
    }));


    useEffect(() => {
      if (!mountRef.current) return;

      let animationFrameId: number;
      const currentMount = mountRef.current;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111827);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
      camera.position.set(0, 0, 10);
      scene.add(camera);

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.outputEncoding = THREE.sRGBEncoding;
      rendererRef.current = renderer;
      currentMount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
      directionalLight.position.set(5, 10, 7.5);
      scene.add(directionalLight);

      const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x444444);
      scene.add(gridHelper);

      const loader = new FBXLoader();
      loader.load(fileUrl, (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5;
        camera.position.z = cameraZ;
        const minZ = box.min.z;
        const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
        camera.far = cameraToFarEdge * 3;
        camera.updateProjectionMatrix();
        controls.target.copy(new THREE.Vector3(0,0,0));
        controls.update();

        scene.add(object);
        setLoadedObject(object);
        setLoading(false);
        onLoad();
      }, (xhr) => {
        setProgress((xhr.loaded / xhr.total) * 100);
      }, (error) => {
        console.error('An error happened during loading:', error);
        onError(`Failed to load FBX model. The file might be corrupted or in an unsupported format.`);
        setLoading(false);
      });

      const handleResize = () => {
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
        if (renderer.domElement.parentNode === currentMount) {
          currentMount.removeChild(renderer.domElement);
        }
        scene.traverse(obj => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach(material => material.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        renderer.dispose();
        setLoadedObject(null);
        rendererRef.current = null;
        sceneRef.current = null;
      };
    }, [fileUrl, onError, onLoad]);

    useEffect(() => {
      if (!pbrMaps || !loadedObject) return;

      const textureLoader = new THREE.TextureLoader();
      
      // Muat semua tekstur
      const albedoMap = textureLoader.load(pbrMaps.albedo, (tex) => tex.encoding = THREE.sRGBEncoding);
      const normalMap = textureLoader.load(pbrMaps.normal);
      const roughnessMap = textureLoader.load(pbrMaps.roughness);
      const aoMap = textureLoader.load(pbrMaps.ao);
      
      // Buat material PBR baru dengan semua peta
      const newMaterial = new THREE.MeshStandardMaterial({
        map: albedoMap,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        aoMap: aoMap,
        aoMapIntensity: 1,
        metalness: 0.1, // Nilai default yang bagus untuk non-logam
      });
      
      // Terapkan material baru ke semua mesh dalam objek
      loadedObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = newMaterial;
          // Penting untuk UV set kedua untuk AO
          if (child.geometry.attributes.uv) {
             child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
          }
        }
      });

    }, [pbrMaps, loadedObject, onError]);

    return (
      <div className="w-full h-full relative" ref={mountRef}>
        {loading && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-10">
            <Spinner className="h-12 w-12" />
            <p className="text-white mt-4 text-lg">Loading Model...</p>
            <div className="w-64 bg-gray-700 rounded-full h-2.5 mt-2">
              <div className="bg-cyan-400 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-sm text-gray-400 mt-1">{Math.round(progress)}%</p>
          </div>
        )}
      </div>
    );
  }
);

export default ThreeScene;
