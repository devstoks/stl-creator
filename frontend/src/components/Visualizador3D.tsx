import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Icone } from "./Icones";

interface Props { url: string | null; tema?: "escuro" | "claro"; }

export default function Visualizador3D({ url, tema = "escuro" }: Props) {
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
    const escuro = tema === "escuro";
    scene.background = new THREE.Color(escuro ? 0x0a1118 : 0xecfdf9);
    scene.add(new THREE.HemisphereLight(0xffffff, escuro ? 0x3b4650 : 0x8a8f98, escuro ? 1.0 : 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 1.1);
    sol.position.set(60, -80, 120);
    scene.add(sol);
    const grade = new THREE.GridHelper(200, 40, escuro ? 0x2a4a55 : 0x99d8cf, escuro ? 0x16262f : 0xcdeee8);
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

    const mat = new THREE.MeshStandardMaterial({ color: escuro ? 0x34e0c8 : 0x2dd4bf, roughness: 0.5, metalness: 0.05, wireframe: wire });
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
      }, undefined, () => setErro("Não consegui mostrar o modelo 3D. Tente gerar de novo."));
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
  }, [url, orto, tema]);

  useEffect(() => { if (estado.current.mat) estado.current.mat.wireframe = wire; }, [wire]);
  useEffect(() => { if (estado.current.eixos) estado.current.eixos.visible = eixos; }, [eixos]);

  return (
    <div className="viz3d">
      <div className="barra-2d">
        <span className="dica-barra"><Icone nome="mover" tam={16} /> Arraste para girar · roda do mouse = zoom · botão direito = mover</span>
        <label><input type="checkbox" checked={wire} onChange={(e) => setWire(e.target.checked)} /> Ver a malha</label>
        <label><input type="checkbox" checked={orto} onChange={(e) => setOrto(e.target.checked)} /> Sem perspectiva</label>
        <label><input type="checkbox" checked={eixos} onChange={(e) => setEixos(e.target.checked)} /> Eixos</label>
        {dim && <span className="dim">{dim[0].toFixed(1)} × {dim[1].toFixed(1)} × {dim[2].toFixed(1)} mm</span>}
      </div>
      <div ref={host} className="canvas3d">
        {!url && <div className="vazio">O modelo 3D aparece aqui depois de gerar.</div>}
        {erro && <div className="vazio">{erro}</div>}
      </div>
    </div>
  );
}
