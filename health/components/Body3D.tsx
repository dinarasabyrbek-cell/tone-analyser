"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MUSCLE_IDS } from "@/lib/anatomy";

export type BodyMode = "health" | "muscles";

export interface Body3DProps {
  mode: BodyMode;
  /** mesh name → colour (hex). Meshes without a colour use a neutral tone. */
  colors: Record<string, string>;
  /** mesh names belonging to the current selection (framed by the camera, others fade) */
  selectedMeshes: string[];
  onPick: (meshName: string | null) => void;
  showSkin: boolean;
  showBones: boolean;
  view: "front" | "back";
  onError?: (msg: string) => void;
}

const NEUTRAL_ORGAN = "#d9c9ad";
const NEUTRAL_MUSCLE = "#c9b79a";
const BONE = "#efe6d4";
const SKIN = "#cfbb99";

type Tween = { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number; dur: number };

export default function Body3D(props: Body3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    meshes: Map<string, THREE.Mesh>;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    render: () => void;
    animateTo: (pos: THREE.Vector3, target: THREE.Vector3) => void;
    home: { pos: THREE.Vector3; target: THREE.Vector3 };
  } | null>(null);
  const propsRef = useRef(props);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    propsRef.current = props;
  });

  // ── one-time scene setup
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      propsRef.current.onError?.("3D isn't supported on this device.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.01, 20);
    scene.add(new THREE.HemisphereLight("#fffaf0", "#6b7548", 1.6));
    const key = new THREE.DirectionalLight("#ffffff", 1.6);
    key.position.set(1.5, 2.5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#d6dc8a", 0.9);
    rim.position.set(-2, 1.5, -2.5);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.minDistance = 0.12;
    controls.maxDistance = 4.5;
    controls.rotateSpeed = 0.8;

    let raf = 0;
    let tween: Tween | null = null;
    const render = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      raf = 0;
      let again = false;
      if (tween) {
        const t = Math.min(1, (now - tween.start) / tween.dur);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        camera.position.lerpVectors(tween.from, tween.to, e);
        controls.target.lerpVectors(tween.tFrom, tween.tTo, e);
        if (t >= 1) tween = null;
        again = true;
      }
      again = controls.update() || again;
      renderer.render(scene, camera);
      if (again) render();
    };
    controls.addEventListener("change", render);

    const animateTo = (pos: THREE.Vector3, target: THREE.Vector3) => {
      tween = { from: camera.position.clone(), to: pos, tFrom: controls.target.clone(), tTo: target, start: performance.now(), dur: 750 };
      render();
    };

    const meshes = new Map<string, THREE.Mesh>();
    const home = { pos: new THREE.Vector3(0, 0.95, 3.6), target: new THREE.Vector3(0, 0.9, 0) };
    api.current = { meshes, camera, controls, render, animateTo, home };

    new GLTFLoader().load(
      "/anatomy/body.glb",
      (gltf) => {
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.material = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02 });
          meshes.set(m.name || m.parent?.name || "", m);
        });
        // Fix node names: glTF meshes are named after their node
        for (const [name, m] of [...meshes]) {
          if (!name && m.parent) meshes.set(m.parent.name, m);
        }
        scene.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const h = box.max.y - box.min.y;
        home.target.set(0, box.min.y + h * 0.55, 0);
        home.pos.set(0, box.min.y + h * 0.6, h * 2.1);
        camera.position.copy(home.pos);
        controls.target.copy(home.target);
        controls.maxDistance = h * 3;
        setLoaded(true);
        render();
      },
      (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      () => propsRef.current.onError?.("Couldn't load the 3D body model.")
    );

    // tap (not drag) → pick
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      down = null;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const { mode, showBones } = propsRef.current;
      const pickable = [...meshes.entries()]
        .filter(([name, m]) => {
          if (!m.visible || name === "skin") return false;
          const isMuscle = MUSCLE_IDS.includes(name);
          if (mode === "muscles") return isMuscle;
          if (name === "skeleton") return showBones;
          return !isMuscle && name !== "diaphragm";
        })
        .map(([, m]) => m);
      const hit = ray.intersectObjects(pickable, false)[0];
      const name = hit ? [...meshes.entries()].find(([, m]) => m === hit.object)?.[0] ?? null : null;
      propsRef.current.onPick(name);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const ro = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      render();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, []);

  // ── materials: visibility, colours, fading
  const { mode, colors, selectedMeshes, showSkin, showBones } = props;
  const selKey = selectedMeshes.join(",");
  useEffect(() => {
    const a = api.current;
    if (!a || !loaded) return;
    applyMaterials(a.meshes, { mode, colors, sel: new Set(selKey ? selKey.split(",") : []), showSkin, showBones });
    a.render();
  }, [mode, colors, selKey, showSkin, showBones, loaded]);

  // ── camera: frame the selection, or go home / to the requested side
  const view = props.view;
  useEffect(() => {
    const a = api.current;
    if (!a || !loaded) return;
    const sel = selKey ? selKey.split(",") : [];
    const side = view === "back" ? -1 : 1;
    if (!sel.length) {
      const p = a.home.pos.clone();
      p.z = Math.abs(p.z - a.home.target.z) * side + a.home.target.z;
      a.animateTo(p, a.home.target.clone());
      return;
    }
    const box = new THREE.Box3();
    for (const n of sel) {
      const m = a.meshes.get(n);
      if (m) box.expandByObject(m);
    }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(0.25, (size / 2 / Math.tan((a.camera.fov * Math.PI) / 360)) * 1.6);
    a.animateTo(new THREE.Vector3(center.x + dist * 0.25, center.y + dist * 0.12, center.z + dist * side), center);
  }, [selKey, view, loaded]);

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center text-sm text-kombu/70">
          <span>Loading body… {progress ? `${progress}%` : ""}</span>
        </div>
      )}
    </div>
  );
}

/** Visibility, colour and fading for every mesh (kept outside the component: it mutates three.js objects). */
function applyMaterials(
  meshes: Map<string, THREE.Mesh>,
  { mode, colors, sel, showSkin, showBones }: { mode: BodyMode; colors: Record<string, string>; sel: Set<string>; showSkin: boolean; showBones: boolean }
) {
  for (const [name, mesh] of meshes) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const isMuscle = MUSCLE_IDS.includes(name);
    const selected = sel.has(name);
    const faded = sel.size > 0 && !selected;
    mat.emissive.set("#000000");
    mat.side = THREE.FrontSide;
    if (name === "skin") {
      mesh.visible = showSkin && sel.size === 0; // skin clutters a zoomed-in view
      mat.color.set(SKIN);
      mat.transparent = true;
      mat.opacity = mode === "muscles" ? 0.08 : 0.13;
      mat.depthWrite = false;
      mesh.renderOrder = 10;
    } else if (name === "skeleton") {
      mesh.visible = showBones || selected;
      mat.color.set(colors[name] && mode === "health" ? colors[name] : BONE);
      mat.transparent = true;
      mat.opacity = selected ? 0.95 : faded ? 0.12 : mode === "muscles" ? 0.35 : 0.5;
      mat.depthWrite = !faded;
    } else if (isMuscle) {
      mesh.visible = mode === "muscles";
      mat.color.set(colors[name] ?? NEUTRAL_MUSCLE);
      mat.transparent = faded;
      mat.opacity = faded ? 0.12 : 1;
      mat.depthWrite = !faded;
    } else {
      mat.color.set(colors[name] ?? NEUTRAL_ORGAN);
      const dim = mode === "muscles" || faded;
      mat.transparent = dim;
      mesh.visible = !(mode === "muscles" && sel.size > 0);
      mat.opacity = mode === "muscles" ? 0.18 : faded ? 0.07 : 1;
      mat.depthWrite = !dim;
    }
    if (selected) mat.emissive.set("#3a3a20");
    mat.needsUpdate = true;
  }
}
