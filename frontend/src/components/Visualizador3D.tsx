import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

interface Props { url: string | null; }

export default function Visualizador3D({ url }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [wire, setWire] = useState(false);
  const [orto, setOrto] = useState(false);
  const [eixos, setEixos] = useState(true);
  const [dim, setDim] = useState<[number, number, number] | null>(null);
  const [erro, setErro] = useState("");
  const estado = useRef<{ mesh?: THREE.Mesh; mat?: THREE.MeshStandardMaterial; eixos?: THREE.Object3D }>({});

  useEffect(() => {
    const el = host.current!;
    const w = () => el.clientWidth, h = () => el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w(), h());
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f4f7);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f98, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 1.1);
    sol.position.set(60, -80, 120);
    scene.add(sol);
    const grade = new THREE.GridHelper(200, 40, 0xb7bcc5, 0xdde1e7);
    grade.rotation.x = Math.PI / 2;
    scene.add(grade);
    const ax = new THREE.AxesHelper(20);
    scene.add(ax);
    estado.current.eixos = ax;

    const persp = new THREE.PerspectiveCamera(40, w() / h(), 0.1, 2000);
    persp.up.set(0, 0, 1);
    persp.position.set(45, -70, 60);
    const ortoCam = new THREE.OrthographicCamera(-40, 40, 40 * h() / w(), -40 * h() / w(), -1000, 1000);
    ortoCam.up.set(0, 0, 1);
    ortoCam.position.set(45, -70, 60);
    const cam = orto ? ortoCam : persp;
    const controles = new OrbitControls(cam, renderer.domElement);
    controles.enableDamping = true;

    const mat = new THREE.MeshStandardMaterial({ color: 0x4f8ef7, roughness: 0.55, metalness: 0.05, wireframe: wire });
    estado.current.mat = mat;
    let vivo = true;
    setErro("");
    if (url) {
      new STLLoader().load(url, (geo) => {
        if (!vivo) return;
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        const b = geo.boundingBox!;
        const c = new THREE.Vector3(); b.getCenter(c);
        geo.translate(-c.x, -c.y, -b.min.z);
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        estado.current.mesh = mesh;
        const s = new THREE.Vector3(); b.getSize(s);
        setDim([s.x, s.y, s.z]);
        const raio = Math.max(s.x, s.y, s.z);
        persp.position.set(raio * 1.1, -raio * 1.7, raio * 1.4);
        ortoCam.position.copy(persp.position);
        const meio = new THREE.Vector3(0, 0, s.z / 2);
        controles.target.copy(meio); cam.lookAt(meio);
        ortoCam.left = -raio * 0.9; ortoCam.right = raio * 0.9;
        ortoCam.top = raio * 0.9 * h() / w(); ortoCam.bottom = -raio * 0.9 * h() / w();
        ortoCam.updateProjectionMatrix();
        controles.update();
      }, undefined, () => setErro("Não consegui carregar o STL."));
    }
    const redimensionar = () => {
      renderer.setSize(w(), h());
      persp.aspect = w() / h(); persp.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(redimensionar); ro.observe(el);
    let raf = 0;
    const loop = () => { raf = requestAnimationFrame(loop); controles.update(); renderer.render(scene, cam); };
    loop();
    return () => {
      vivo = false; cancelAnimationFrame(raf); ro.disconnect(); controles.dispose();
      estado.current.mesh?.geometry.dispose(); mat.dispose(); renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [url, orto]);

  useEffect(() => { if (estado.current.mat) estado.current.mat.wireframe = wire; }, [wire]);
  useEffect(() => { if (estado.current.eixos) estado.current.eixos.visible = eixos; }, [eixos]);

  return (
    <div className="viz3d">
      <div className="barra-2d">
        <label><input type="checkbox" checked={wire} onChange={(e) => setWire(e.target.checked)} /> Wireframe</label>
        <label><input type="checkbox" checked={orto} onChange={(e) => setOrto(e.target.checked)} /> Ortográfica</label>
        <label><input type="checkbox" checked={eixos} onChange={(e) => setEixos(e.target.checked)} /> Eixos</label>
        {dim && <span className="dim">X {dim[0].toFixed(2)} × Y {dim[1].toFixed(2)} × Z {dim[2].toFixed(2)} mm</span>}
      </div>
      <div ref={host} className="canvas3d">
        {!url && <div className="vazio">Gere o modelo para ver a prévia 3D (é o STL real).</div>}
        {erro && <div className="vazio">{erro}</div>}
      </div>
    </div>
  );
}
