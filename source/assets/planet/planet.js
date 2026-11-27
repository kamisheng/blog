/* =========================================================
 * 知识星球 · 文档星球（嵌在主题 page 布局里）
 *
 * 数据来源：/assets/planet/docs.json（由 scripts/planet.js 生成器
 * 在构建时从 source/_posts 导出，新增 md 后重新构建即自动出现）。
 * three.js 走本地 vendor，不依赖外网 CDN。
 * ======================================================= */
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/addons/controls/OrbitControls.js';

const rootEl    = document.getElementById('planetRoot');
const stageEl   = document.getElementById('stage');
const bootEl    = document.getElementById('boot');
const bootText  = document.getElementById('bootText');

(async function main() {
  /* ---------- 0. 拉取文档数据 ---------- */
  let DOCS = [];
  try {
    const res = await fetch('/assets/planet/docs.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    DOCS = Array.isArray(data.docs) ? data.docs : [];
  } catch (err) {
    console.error(err);
    bootText.textContent = '数据加载失败：' + err.message;
    return;
  }
  if (!DOCS.length) {
    bootText.textContent = '暂无文档';
    return;
  }

  /* =========================================================
   * 1. 动效参数：集中在这里调
   * ======================================================= */
  const CONFIG = {
    cloudCount: 6800,
    cloudBackDim: 0.34,
    convergeCount: 460,
    convergeDuration: 1.7,
    introDelay: 0.55,
    convergeSpreadMin: 3.0,
    convergeSpreadMax: 4.4,
    convergeArc: 0.9,
    convergeSize: 0.023,
    convergeStagger: 0.22,
    nodeRevealFade: 0.9,
    nodeRevealAt: 0.86,
    hopAmp: 0.048,
    hopSizeBoost: 1.25,
    hopRateMin: 0.16,
    hopRateMax: 0.42,
    spinSpeed: 0.14,
    spinSpeedFocused: 0.03,
    zoomWheel: 0.0028,
    zoomPinch: 2.2,
  };

  /* =========================================================
   * 2. 场景基础（尺寸跟随 .planet-root，而不是窗口）
   * ======================================================= */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  stageEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0.4, 1.6, 5.1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 2.6;
  controls.maxDistance = 16;
  controls.target.set(0, 0, 0);
  controls.update();
  controls.enabled = false;

  function resizeRenderer() {
    const w = rootEl.clientWidth || 1;
    const h = rootEl.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    updatePointScale();
  }

  /* =========================================================
   * 3. 星球：点云 + 淡雾内核
   * ======================================================= */
  const R = 1.55;

  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(45);
  scene.add(tilt);

  const planet = new THREE.Group();
  tilt.add(planet);

  function makeFogTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,.55)');
    g.addColorStop(0.32, 'rgba(255,255,255,.22)');
    g.addColorStop(0.66, 'rgba(255,255,255,.05)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const fogTex = makeFogTexture();

  const fogOuter = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fogTex, color: 0x2a4fbf, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fogOuter.scale.setScalar(R * 2.2);
  planet.add(fogOuter);

  const fogInner = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fogTex, color: 0xa58ae0, transparent: true, opacity: 0.07,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fogInner.scale.setScalar(R * 1.15);
  planet.add(fogInner);

  const CLOUD_COUNT = CONFIG.cloudCount;
  const cloudGeo = new THREE.BufferGeometry();
  {
    const pos  = new Float32Array(CLOUD_COUNT * 3);
    const col  = new Float32Array(CLOUD_COUNT * 3);
    const size = new Float32Array(CLOUD_COUNT);
    const phase = new Float32Array(CLOUD_COUNT);
    const amp   = new Float32Array(CLOUD_COUNT);
    const rate  = new Float32Array(CLOUD_COUNT);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const cLow  = new THREE.Color('#2b5be0');
    const cMid  = new THREE.Color('#79adff');
    const cHigh = new THREE.Color('#cbb6f2');
    const tmp = new THREE.Color();

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const y = 1 - (i / (CLOUD_COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const radius = R * (0.988 + Math.random() * 0.024);

      pos[i * 3]     = Math.cos(theta) * r * radius;
      pos[i * 3 + 1] = y * radius;
      pos[i * 3 + 2] = Math.sin(theta) * r * radius;

      const t = (y + 1) / 2;
      if (t < 0.62) tmp.copy(cLow).lerp(cMid, t / 0.62);
      else          tmp.copy(cMid).lerp(cHigh, (t - 0.62) / 0.38);
      tmp.multiplyScalar(0.8 + Math.random() * 0.45);

      col[i * 3]     = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;

      size[i]  = 0.0095 + Math.pow(Math.random(), 2) * 0.008;
      phase[i] = Math.random() * Math.PI * 2;
      amp[i]   = CONFIG.hopAmp * (0.35 + Math.random() * 0.65);
      rate[i]  = CONFIG.hopRateMin + Math.random() * (CONFIG.hopRateMax - CONFIG.hopRateMin);
    }

    cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    cloudGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    cloudGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    cloudGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    cloudGeo.setAttribute('aAmp', new THREE.BufferAttribute(amp, 1));
    cloudGeo.setAttribute('aRate', new THREE.BufferAttribute(rate, 1));
  }

  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uScale: { value: 1 },
      uFade:  { value: 0 },
      uSizeBoost: { value: CONFIG.hopSizeBoost },
      uBackDim: { value: CONFIG.cloudBackDim },
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute vec3  aColor;
      attribute float aPhase;
      attribute float aAmp;
      attribute float aRate;
      uniform float uTime;
      uniform float uScale;
      uniform float uSizeBoost;
      uniform float uBackDim;
      varying vec3  vColor;
      varying float vAlpha;
      varying float vFlare;

      void main(){
        float w1 = fract(uTime * aRate + aPhase);
        float w2 = fract(uTime * (aRate * 0.53 + 0.021) + aPhase * 3.7);
        float t1 = 1.0 - abs(w1 * 2.0 - 1.0);
        float t2 = 1.0 - abs(w2 * 2.0 - 1.0);
        float pop = max(smoothstep(0.955, 1.0, t1), smoothstep(0.955, 1.0, t2) * 0.8);
        float lift = aAmp * pop;

        vec3 pos = position * (1.0 + lift);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        gl_PointSize = aSize * (1.0 + pop * uSizeBoost) * uScale / max(0.001, -mv.z);

        float shade = 0.95 + 0.05 * sin(uTime * 0.6 + aPhase);
        vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        float facing = dot(normalize(worldPos), normalize(cameraPosition - worldPos));
        float depth = mix(uBackDim, 1.0, smoothstep(-0.35, 0.45, facing));
        vAlpha = shade * depth * (1.0 + pop * 0.85);
        vColor = mix(aColor, vec3(1.0), clamp(pop * 0.26, 0.0, 0.35));
        vFlare = pop;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3  vColor;
      varying float vAlpha;
      varying float vFlare;
      uniform float uFade;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float f = clamp(vFlare, 0.0, 1.0);
        float edge = mix(0.5, 0.4, f);
        float a = 1.0 - smoothstep(edge * 0.18, edge, d);
        a = pow(a, mix(1.4, 0.78, f)) * vAlpha * 0.9 * uFade;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cloud = new THREE.Points(cloudGeo, cloudMat);
  planet.add(cloud);

  /* 3.3 入场粒子 */
  const convergeGeo = new THREE.BufferGeometry();
  {
    const n = CONFIG.convergeCount;
    const aStart  = new Float32Array(n * 3);
    const aTarget = new Float32Array(n * 3);
    const aCurve  = new Float32Array(n * 3);
    const aColor  = new Float32Array(n * 3);
    const aSize   = new Float32Array(n);
    const aPhase  = new Float32Array(n);
    const aDelay  = new Float32Array(n);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const tmp = new THREE.Color();

    const camFwd  = camera.position.clone().negate().normalize();
    const camPos  = camera.position;
    const probe   = new THREE.Vector3();
    const camDist = camPos.length();

    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      aTarget[i * 3]     = Math.cos(theta) * r * R * 1.015;
      aTarget[i * 3 + 1] = y * R * 1.015;
      aTarget[i * 3 + 2] = Math.sin(theta) * r * R * 1.015;

      let sx = 0, sy = 0, sz = 0;
      for (let k = 0; k < 12; k++) {
        const u = Math.random() * 2 - 1;
        const phi = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const dist = R * (CONFIG.convergeSpreadMin +
          Math.random() * (CONFIG.convergeSpreadMax - CONFIG.convergeSpreadMin));
        sx = Math.cos(phi) * s * dist;
        sy = u * dist;
        sz = Math.sin(phi) * s * dist;
        probe.set(sx, sy, sz).sub(camPos);
        if (probe.dot(camFwd) > camDist * 0.22) break;
      }
      aStart[i * 3]     = sx;
      aStart[i * 3 + 1] = sy;
      aStart[i * 3 + 2] = sz;

      aCurve[i * 3]     = (Math.random() - 0.5) * R * CONFIG.convergeArc;
      aCurve[i * 3 + 1] = (Math.random() - 0.5) * R * CONFIG.convergeArc;
      aCurve[i * 3 + 2] = (Math.random() - 0.5) * R * CONFIG.convergeArc;

      tmp.setHSL(0.55 + Math.random() * 0.13, 0.85, 0.62 + Math.random() * 0.22);
      aColor[i * 3]     = tmp.r;
      aColor[i * 3 + 1] = tmp.g;
      aColor[i * 3 + 2] = tmp.b;

      aSize[i]  = CONFIG.convergeSize * (0.55 + Math.random() * 0.9);
      aPhase[i] = Math.random() * Math.PI * 2;
      aDelay[i] = Math.random() * CONFIG.convergeStagger;
    }

    convergeGeo.setAttribute('position', new THREE.BufferAttribute(aStart, 3));
    convergeGeo.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3));
    convergeGeo.setAttribute('aTarget', new THREE.BufferAttribute(aTarget, 3));
    convergeGeo.setAttribute('aCurve', new THREE.BufferAttribute(aCurve, 3));
    convergeGeo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
    convergeGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    convergeGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
    convergeGeo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));
  }

  const convergeMat = new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uScale: { value: 1 },
    },
    vertexShader: /* glsl */`
      attribute vec3  aStart;
      attribute vec3  aTarget;
      attribute vec3  aCurve;
      attribute vec3  aColor;
      attribute float aSize;
      attribute float aPhase;
      attribute float aDelay;
      uniform float uProgress;
      uniform float uTime;
      uniform float uScale;
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        float p = clamp((uProgress - aDelay) / max(0.001, 1.0 - aDelay), 0.0, 1.0);
        vec3 pos = mix(aStart, aTarget, p) + aCurve * sin(p * 3.14159265);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float arrive = smoothstep(0.88, 1.0, p);
        gl_PointSize = aSize * (1.0 + arrive * 0.35) * uScale / max(0.001, -mv.z);
        float fadeIn = smoothstep(0.0, 0.12, p);
        float twinkle = 0.86 + 0.14 * sin(uTime * 1.8 + aPhase);
        vAlpha = fadeIn * mix(0.7, 0.95, arrive) * twinkle;
        vColor = aColor * (1.0 + arrive * 0.2);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3  vColor;
      varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.02, 0.5, d);
        a = pow(a, 1.6) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const converge = new THREE.Points(convergeGeo, convergeMat);
  planet.add(converge);

  /* =========================================================
   * 4. 星空
   * ======================================================= */
  function makeDotTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.7)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const starTex = makeDotTexture();

  function makeStars(count, rMin, rMax, size, opacity, color) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = rMin + Math.random() * (rMax - rMin);
      positions[i * 3]     = Math.cos(t) * s * r;
      positions[i * 3 + 1] = u * r;
      positions[i * 3 + 2] = Math.sin(t) * s * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: starTex, color, size, sizeAttenuation: true, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geo, mat);
  }
  const starFar  = makeStars(700, 14, 34, 0.075, 0.4, 0x9db8ff);
  const starNear = makeStars(180, 8, 16, 0.085, 0.55, 0xd8e6ff);
  scene.add(starFar, starNear);

  const dust = (() => {
    const count = 130;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = R * (1.3 + Math.random() * 1.0);
      pos[i * 3]     = Math.cos(t) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(t) * s * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({
      map: starTex, color: 0x7f9ee8, size: 0.008, sizeAttenuation: true,
      transparent: true, opacity: 0.32, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    p.rotation.x = 0.22;
    scene.add(p);
    return p;
  })();

  /* =========================================================
   * 5. 文档节点 + 常驻标签
   * ======================================================= */
  function makeGlowTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,.75)');
    g.addColorStop(0.42, 'rgba(200,220,255,.28)');
    g.addColorStop(1.0, 'rgba(160,190,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const glowTex = makeGlowTexture();
  const hitGeo = new THREE.SphereGeometry(0.125, 8, 8);

  const labelsEl = document.getElementById('labels');
  const nodes = [];
  const hitTargets = [];

  const nodePositions = (() => {
    const out = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const denom = Math.max(1, DOCS.length - 1);
    for (let i = 0; i < DOCS.length; i++) {
      const y = 1 - (i / denom) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      out.push(new THREE.Vector3(
        Math.cos(theta) * r * R * 1.02,
        y * R * 1.02,
        Math.sin(theta) * r * R * 1.02
      ));
    }
    return out;
  })();

  function shortLabel(text) {
    const t = String(text || '').trim();
    return t.length > 12 ? t.slice(0, 12) + '…' : t;
  }

  DOCS.forEach((doc, i) => {
    const hue = 0.55 + (i / DOCS.length) * 0.13;
    const color = new THREE.Color().setHSL(hue, 0.85, 0.64);

    const group = new THREE.Group();
    group.position.copy(nodePositions[i]);

    const coreColor = color.clone().lerp(new THREE.Color('#ffffff'), 0.45);
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor.clone(),
      transparent: true, opacity: 1, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.026, 20, 20), coreMat);
    group.add(core);

    const glowMat = new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(0.42);
    group.add(glow);

    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.107, 56), ringMat);
    group.add(ring);

    const hit = new THREE.Mesh(
      hitGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.userData.docIndex = i;
    group.add(hit);
    hitTargets.push(hit);

    const labelEl = document.createElement('div');
    labelEl.className = 'pl-node-label';
    labelEl.textContent = shortLabel(doc.label);
    labelEl.style.opacity = '0';
    labelsEl.appendChild(labelEl);

    planet.add(group);
    nodes.push({
      doc, group, coreMat, glowMat, ringMat, ring, labelEl,
      coreColor, glowColor: color.clone(),
      phase: i * 0.9, facing: 0,
    });
  });

  const DEEP_BLUE = new THREE.Color('#13306e');

  /* 5.2 右侧索引 */
  const indexListEl = document.getElementById('indexList');
  const indexItems = [];
  document.getElementById('docCount').textContent = String(DOCS.length);
  document.getElementById('indexCount').textContent = String(DOCS.length).padStart(2, '0');
  document.getElementById('tNodes').textContent = String(DOCS.length);

  function setIndexHover(i) {
    for (let k = 0; k < indexItems.length; k++) {
      indexItems[k].classList.toggle('is-hover', k === i);
    }
  }
  function setIndexActive(i) {
    for (let k = 0; k < indexItems.length; k++) {
      indexItems[k].classList.toggle('is-active', k === i);
    }
  }

  DOCS.forEach((doc, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pl-idx-item';
    btn.innerHTML = '<span class="pl-idx-name"></span><span class="pl-idx-tick"></span><span class="pl-idx-no"></span>';
    btn.querySelector('.pl-idx-name').textContent = doc.title;
    btn.querySelector('.pl-idx-no').textContent = String(i + 1).padStart(2, '0');

    btn.addEventListener('pointerenter', () => { hoveredIndex = i; setIndexHover(i); });
    btn.addEventListener('pointerleave', () => { hoveredIndex = -1; setIndexHover(-1); });
    btn.addEventListener('click', () => {
      if (!introDone) return;
      focusNode(i);
      openCard(i);
    });

    li.appendChild(btn);
    indexListEl.appendChild(li);
    indexItems.push(btn);
  });

  /* =========================================================
   * 6. Raycaster 拾取
   * ======================================================= */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  const canvasEl = renderer.domElement;
  let hoveredIndex = -1;
  let selectedIndex = -1;

  const _wp = new THREE.Vector3();
  const _nrm = new THREE.Vector3();
  const _view = new THREE.Vector3();
  const _proj = new THREE.Vector3();

  function setPointerFromEvent(e) {
    const rect = rootEl.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function nodeDot(index) {
    const n = nodes[index];
    n.group.getWorldPosition(_wp);
    _nrm.copy(_wp).normalize();
    _view.copy(camera.position).sub(_wp).normalize();
    return _nrm.dot(_view);
  }

  function nodeFacing(index) {
    return THREE.MathUtils.smoothstep(nodeDot(index), -0.18, 0.35);
  }

  function pick() {
    if (!introDone) return -1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    for (const h of hits) {
      const idx = h.object.userData.docIndex;
      if (typeof idx === 'number' && nodeDot(idx) > 0.08) return idx;
    }
    return -1;
  }

  canvasEl.addEventListener('pointermove', (e) => {
    if (pointers.size > 0) return;
    setPointerFromEvent(e);
    const idx = pick();
    if (idx !== hoveredIndex) {
      hoveredIndex = idx;
      setIndexHover(idx);
      canvasEl.style.cursor = idx >= 0 ? 'pointer' : '';
    }
  });

  canvasEl.addEventListener('pointerleave', () => {
    pointer.set(-2, -2);
    hoveredIndex = -1;
    setIndexHover(-1);
    canvasEl.style.cursor = '';
  });

  /* =========================================================
   * 7. 卡片
   * ======================================================= */
  const cardEl      = document.getElementById('card');
  const cardNoEl    = document.getElementById('cardNo');
  const cardTitleEl = document.getElementById('cardTitle');
  const cardSumEl   = document.getElementById('cardSummary');
  const cardUrlEl   = document.getElementById('cardUrl');
  const cardLinkEl  = document.getElementById('cardLink');
  const cardCloseEl = document.getElementById('cardClose');

  function openCard(index) {
    const doc = DOCS[index];
    if (!doc) return;

    selectedIndex = index;
    setIndexActive(index);
    document.getElementById('tFocus').textContent = String(index + 1).padStart(2, '0');
    cardNoEl.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(DOCS.length).padStart(2, '0');
    cardTitleEl.textContent = doc.title;
    cardSumEl.textContent = doc.summary || '';
    cardSumEl.hidden = !doc.summary;
    cardUrlEl.textContent = doc.url ? doc.url.replace(/^https?:\/\//, '') : '链接未配置';
    cardLinkEl.href = doc.url || '#';

    cardEl.classList.add('open');
    cardEl.setAttribute('aria-hidden', 'false');
    cardCloseEl.focus({ preventScroll: true });
  }

  function closeCard() {
    if (!cardEl.classList.contains('open')) return;
    selectedIndex = -1;
    setIndexActive(-1);
    document.getElementById('tFocus').textContent = '—';
    cardEl.classList.remove('open');
    cardEl.setAttribute('aria-hidden', 'true');
  }

  cardCloseEl.addEventListener('click', closeCard);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCard();
  });

  // 阅读全文：当前标签页直接跳转（浏览器后退可回到星球）
  cardLinkEl.addEventListener('click', (e) => {
    const doc = DOCS[selectedIndex];
    if (!doc || !doc.url) e.preventDefault();
  });

  /* =========================================================
   * 8. 缩放：滚轮 + 双指
   * ======================================================= */
  controls.touches.TWO = null;

  function zoomBy(factor) {
    const dist = camera.position.distanceTo(controls.target);
    const next = THREE.MathUtils.clamp(
      dist * factor, controls.minDistance, controls.maxDistance
    );
    _view.copy(camera.position).sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(_view, next);
  }

  canvasEl.addEventListener('wheel', (e) => {
    if (!introDone) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rootEl.clientHeight : 1;
    zoomBy(Math.exp(e.deltaY * unit * CONFIG.zoomWheel));
  }, { passive: false });

  const pointers = new Map();
  let pinchState = null;
  let didPinch = false;

  function pointerPair() {
    const it = pointers.values();
    return [it.next().value, it.next().value];
  }

  function beginPinch() {
    if (pointers.size !== 2) return;
    const [a, b] = pointerPair();
    pinchState = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      camDist: camera.position.distanceTo(controls.target),
    };
  }

  function updatePinch() {
    if (!introDone || !pinchState || pointers.size !== 2) return;
    const [a, b] = pointerPair();
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist < 8 || pinchState.dist < 8) return;

    const ratio = dist / pinchState.dist;
    if (Math.abs(ratio - 1) > 0.01) didPinch = true;

    const nextDist = THREE.MathUtils.clamp(
      pinchState.camDist / Math.pow(ratio, CONFIG.zoomPinch),
      controls.minDistance,
      controls.maxDistance
    );
    _view.copy(camera.position).sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(_view, nextDist);
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (pointers.size === 0) didPinch = false;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) beginPinch();
  });

  canvasEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) updatePinch();
  });

  function releasePointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchState = null;
  }
  canvasEl.addEventListener('pointerup', releasePointer);
  canvasEl.addEventListener('pointercancel', releasePointer);
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);

  let downX = 0, downY = 0, downAt = 0;
  canvasEl.addEventListener('pointerdown', (e) => {
    downX = e.clientX; downY = e.clientY; downAt = performance.now();
  });
  window.addEventListener('pointerup', (e) => {
    if (didPinch) return;
    if (performance.now() - downAt > 650) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
    if (e.target !== canvasEl) return;

    setPointerFromEvent(e);
    const idx = pick();
    if (idx >= 0) openCard(idx);
    else closeCard();
  });

  canvasEl.addEventListener('pointerdown', () => canvasEl.classList.add('grabbing'));
  window.addEventListener('pointerup', () => canvasEl.classList.remove('grabbing'));

  /* =========================================================
   * 9. 循环
   * ======================================================= */
  const clock = new THREE.Clock();
  const _scale = new THREE.Vector3();
  const zoomEl = document.getElementById('tZoom');
  let introT = 0;
  let introDelay = 0;
  let introStarted = false;
  let introDone = false;
  let nodeReveal = 0;
  let labelReveal = 0;
  let shellFade = 0;
  let spinTarget = null;
  let lastCamDist = 0;

  function focusNode(index) {
    const node = nodes[index];
    if (!node) return;
    const camLocal = tilt.worldToLocal(camera.position.clone());
    const alpha = Math.atan2(node.group.position.z, node.group.position.x);
    const beta = Math.atan2(camLocal.z, camLocal.x);
    const current = planet.rotation.y;
    const want = alpha - beta;
    spinTarget = current + Math.atan2(Math.sin(want - current), Math.cos(want - current));
  }

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!introStarted) {
      introDelay += dt;
      if (introDelay >= CONFIG.introDelay) introStarted = true;
    }
    if (introStarted) introT += dt;
    const rawIn = Math.min(1, introT / CONFIG.convergeDuration);
    const ease = 1 - Math.pow(1 - rawIn, 3);
    convergeMat.uniforms.uProgress.value = ease;

    shellFade = THREE.MathUtils.smoothstep(ease, 0.62, 0.99);
    cloudMat.uniforms.uFade.value = shellFade;
    nodeReveal = THREE.MathUtils.smoothstep(
      introT,
      CONFIG.convergeDuration * CONFIG.nodeRevealAt,
      CONFIG.convergeDuration * CONFIG.nodeRevealAt + CONFIG.nodeRevealFade
    );
    labelReveal = nodeReveal;

    if (!introDone && rawIn >= 1) {
      introDone = true;
      controls.enabled = true;
    }

    if (spinTarget !== null) {
      const delta = Math.atan2(
        Math.sin(spinTarget - planet.rotation.y),
        Math.cos(spinTarget - planet.rotation.y)
      );
      if (Math.abs(delta) < 0.003) {
        planet.rotation.y = spinTarget;
        spinTarget = null;
      } else {
        planet.rotation.y += delta * Math.min(1, dt * 5);
      }
    } else if (introDone) {
      planet.rotation.y += dt * (selectedIndex >= 0 ? CONFIG.spinSpeedFocused : CONFIG.spinSpeed);
    } else {
      planet.rotation.y += dt * 0.05;
    }
    starFar.rotation.y  += dt * 0.004;
    starNear.rotation.y -= dt * 0.006;
    dust.rotation.y     += dt * 0.016;
    cloudMat.uniforms.uTime.value = t;
    convergeMat.uniforms.uTime.value = t;
    fogOuter.material.opacity = (0.11 + Math.sin(t * 0.5) * 0.02) * shellFade;
    fogInner.material.opacity = (0.06 + Math.sin(t * 0.42 + 1.6) * 0.015) * shellFade;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isHover = i === hoveredIndex;
      const isSelected = i === selectedIndex;

      const facing = nodeFacing(i);
      n.facing = facing;

      const target = (isSelected ? 1.8 : isHover ? 1.5 : 1) *
                     (1 + Math.sin(t * 1.6 + n.phase) * 0.045) * nodeReveal;
      n.group.scale.lerp(_scale.setScalar(target), 0.14);

      const shimmer = 1 + 0.16 * Math.sin(t * 1.25 + n.phase * 1.9);
      const glowTarget = (isSelected ? 1 : isHover ? 0.92 : 0.55) *
                         (0.12 + 0.88 * facing) * nodeReveal * shimmer;
      n.glowMat.opacity += (glowTarget - n.glowMat.opacity) * 0.14;

      const backMix = (1 - facing) * 0.85;
      n.glowMat.color.copy(n.glowColor).lerp(DEEP_BLUE, backMix);
      n.coreMat.color.copy(n.coreColor).lerp(DEEP_BLUE, backMix);

      n.coreMat.opacity = (0.16 + 0.84 * facing) * nodeReveal;

      const ringTarget = (isSelected ? 0.9 : isHover ? 0.55 : 0) * facing * nodeReveal;
      n.ringMat.opacity += (ringTarget - n.ringMat.opacity) * 0.14;
      if (n.ringMat.opacity > 0.01) {
        n.ring.lookAt(camera.position);
        n.ring.rotation.z += dt * 0.6;
      }

      const el = n.labelEl;
      if (facing <= 0.02) {
        el.style.opacity = '0';
        el.classList.remove('is-active');
        continue;
      }
      n.group.getWorldPosition(_wp);
      _proj.copy(_wp).project(camera);
      if (_proj.z > 1) {
        el.style.opacity = '0';
        el.classList.remove('is-active');
        continue;
      }
      const x = (_proj.x * 0.5 + 0.5) * rootEl.clientWidth;
      const y = (-_proj.y * 0.5 + 0.5) * rootEl.clientHeight;
      const reveal = Math.max(0, Math.min(1, (labelReveal - i * 0.045) / 0.55));
      const focus = selectedIndex >= 0 && !isSelected ? 0.42 : 1;
      const opacity = Math.min(1, facing * 2.2) * reveal * focus;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + 12).toFixed(1)}px, 0) translate(-50%, 0)`;
      el.style.opacity = opacity.toFixed(3);
      el.classList.toggle('is-active', isSelected);
      el.style.color = isSelected
        ? '#ffffff'
        : isHover ? 'rgba(246,250,255,.95)' : '';
    }

    const camDist = camera.position.distanceTo(controls.target);
    if (Math.abs(camDist - lastCamDist) > 0.004) {
      lastCamDist = camDist;
      zoomEl.textContent = camDist.toFixed(2);
    }

    controls.update();
    renderer.render(scene, camera);
  }

  /* =========================================================
   * 10. 自适应 / 启动
   * ======================================================= */
  function updatePointScale() {
    const h = renderer.domElement.height;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const scale = h / (2 * Math.tan(fov / 2));
    cloudMat.uniforms.uScale.value = scale;
    convergeMat.uniforms.uScale.value = scale;
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resizeRenderer).observe(rootEl);
  } else {
    window.addEventListener('resize', resizeRenderer);
  }
  resizeRenderer();

  try {
    animate();
    requestAnimationFrame(() => {
      rootEl.classList.add('ready');
      bootEl.classList.add('hide');
    });
  } catch (err) {
    console.error(err);
    bootText.textContent = '初始化失败：' + err.message;
  }
})();