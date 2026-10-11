/* Chale City street-level renderer. Game rules and missions stay in index.html.
   The city is procedural; nearby adults use licensed detailed character assets. */
window.createChaleScene = function createChaleScene(data) {
  const THREE = window.THREE;
  if (!THREE) return null;
  const {T, MW, MH, VX, HY, buildings, decor, PL, S, at, TILE, CX, CY, ISL, COAST, SEA_Y, districtAt} = data;
  const U = 0.1;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => {const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t);};
  let seed = 7919;
  const rnd = () => {seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646;};
  const rpick = a => a[(rnd() * a.length) | 0];
  const toX = px => px * U, toZ = py => py * U;

  /* ---------- renderer ---------- */
  const scene = new THREE.Scene();
  const dialogScene = new THREE.Scene();
  dialogScene.add(new THREE.HemisphereLight('#fff2d5', '#6b5444', 1.6), new THREE.DirectionalLight('#fff2cf', 2));
  const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 420);
  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  const lowEnd = matchMedia('(pointer:coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowEnd ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.id = 'scene3d';
  renderer.domElement.setAttribute('aria-label', 'Third-person Chale City game view');
  document.body.insertBefore(renderer.domElement, document.querySelector('#cv'));
  document.querySelector('#cv').style.display = 'none';
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  /* ---------- procedural textures ---------- */
  function canvasTexture(w, h, draw, repeat = [1, 1], srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.anisotropy = maxAniso;
    return t;
  }
  // Wrapped blobs so the textures tile without seams.
  function blobs(g, w, h, n, colors, r0, r1, a0 = 0.3, a1 = 1) {
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = r0 + Math.random() * (r1 - r0);
      g.globalAlpha = a0 + Math.random() * (a1 - a0); g.fillStyle = colors[(Math.random() * colors.length) | 0];
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        if (x + ox < -r || x + ox > w + r || y + oy < -r || y + oy > h + r) continue;
        g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  function crack(g, w, h, n, color, width) {
    g.strokeStyle = color; g.lineWidth = width;
    for (let i = 0; i < n; i++) {
      let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 7; k++) {x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y);}
      g.stroke();
    }
  }
  const TX = {
    asphalt: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#3b3d40'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 9000, ['#2c2e31', '#4a4c4f', '#55575a', '#323438'], 0.5, 1.6, 0.4, 0.9);
      blobs(g, w, h, 14, ['#2a2b2d', '#46474a'], 30, 70, 0.18, 0.35);
      blobs(g, w, h, 10, ['#1f2022'], 6, 22, 0.25, 0.45);
      g.globalAlpha = 0.5; crack(g, w, h, 7, '#1d1e20', 1.4); g.globalAlpha = 1;
      g.fillStyle = 'rgba(30,31,33,.45)'; g.fillRect(310, 40, 120, 70); g.fillRect(60, 330, 90, 120);
    }),
    earth: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#9a6a4c'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 70, ['#a5735a', '#8d5f45', '#b07a5a', '#86604a'], 20, 60, 0.15, 0.35);
      blobs(g, w, h, 6000, ['#7b5240', '#b88a6c', '#6e4a38', '#c49a7a'], 0.6, 2.2, 0.35, 0.9);
      blobs(g, w, h, 30, ['#6f7d45', '#5f6d3a'], 5, 16, 0.25, 0.5);
    }, [1, 1]),
    sidewalk: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#b1a796'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 4000, ['#9d9483', '#c1b8a8', '#8f8676'], 0.6, 1.8, 0.3, 0.8);
      blobs(g, w, h, 12, ['#8b6f55', '#7a6a5a', '#6b5f53'], 20, 50, 0.12, 0.3);
      g.strokeStyle = 'rgba(70,64,56,.55)'; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke();}
      g.globalAlpha = 0.45; crack(g, w, h, 4, '#5e564d', 1.2); g.globalAlpha = 1;
    }),
    sand: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#d8c08f'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 7000, ['#c9ae7b', '#e7d3a8', '#bfa272', '#f1e2bd'], 0.5, 1.6, 0.3, 0.8);
      blobs(g, w, h, 40, ['#cdb27f', '#e3cc9c'], 18, 50, 0.12, 0.3);
    }),
    grass: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#5f8a3f'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 8000, ['#4f7a33', '#6f9a4a', '#7fa456', '#3f6a2b'], 0.6, 2, 0.4, 0.9);
      blobs(g, w, h, 30, ['#8a7a4a', '#9a8a5a'], 8, 24, 0.15, 0.35);
    }),
    market: canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#8f6c50'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 5000, ['#7a5a42', '#a27e60', '#6a4c38'], 0.6, 2, 0.3, 0.8);
      blobs(g, w, h, 160, ['#c8102e', '#f2b705', '#1d4fa3', '#0a7a45', '#f4f1e8', '#222'], 1, 3, 0.4, 0.8);
      blobs(g, w, h, 18, ['#3c3a36'], 10, 30, 0.2, 0.35);
    }),
    zinc: canvasTexture(256, 256, (g, w, h) => {
      for (let x = 0; x < w; x += 8) {
        const gr = g.createLinearGradient(x, 0, x + 8, 0);
        gr.addColorStop(0, '#7f868b'); gr.addColorStop(0.5, '#b4bbbf'); gr.addColorStop(1, '#6c7378');
        g.fillStyle = gr; g.fillRect(x, 0, 8, h);
      }
      blobs(g, w, h, 26, ['#8a4a25', '#9c5a2c', '#6e3a1e', '#b0703a'], 6, 34, 0.25, 0.6);
      blobs(g, w, h, 800, ['#5b3a24', '#a06a3a'], 0.6, 2, 0.3, 0.7);
      g.fillStyle = 'rgba(40,30,25,.35)'; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2);
    }),
    tile: canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#a6502f'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) {
        const gr = g.createLinearGradient(0, y, 0, y + 16);
        gr.addColorStop(0, '#c0643c'); gr.addColorStop(0.8, '#94452a'); gr.addColorStop(1, '#5e2a18');
        g.fillStyle = gr; g.fillRect(0, y, w, 16);
        g.fillStyle = 'rgba(60,25,15,.5)'; for (let x = (y / 16 % 2) * 10; x < w; x += 20) g.fillRect(x, y, 1.5, 16);
      }
      blobs(g, w, h, 40, ['#5a4a3a', '#2e2a26'], 4, 20, 0.08, 0.25);
    }),
    concrete: canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#bdb5a6'; g.fillRect(0, 0, w, h);
      blobs(g, w, h, 2500, ['#a49c8e', '#cfc8ba', '#8e877b'], 0.5, 1.5, 0.3, 0.8);
      blobs(g, w, h, 16, ['#6f6a62', '#4e4a45', '#7a6a55'], 10, 40, 0.1, 0.3);
    }),
    leaf: canvasTexture(256, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#6b5a2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      for (let x = 6; x < w - 4; x += 5) {
        const len = (h / 2 - 2) * Math.sin(Math.PI * (0.15 + 0.85 * x / w)) ;
        for (const s of [-1, 1]) {
          g.strokeStyle = ['#2f6b34', '#3b7a3a', '#4c8a40', '#2a5e2e'][(Math.random() * 4) | 0]; g.lineWidth = 3;
          g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 14, h / 2 + s * len); g.stroke();
        }
      }
    }),
    radial: canvasTexture(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, [1, 1], false),
    beam: canvasTexture(4, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,.9)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, [1, 1], false),
    cone: canvasTexture(128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2 - 6); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h / 2 + 6); g.fill();
    }, [1, 1], false),
  };
  TX.leaf.wrapS = TX.leaf.wrapT = THREE.ClampToEdgeWrapping;
  // Ghanaian wax-print cloth, used on shirts, dresses and head wraps.
  const PRINT_COLORS = [['#c8102e', '#f2b705', '#14100d'], ['#1d4fa3', '#f4f1e8', '#e86a1c'], ['#0a7a45', '#f2b705', '#c8102e'], ['#6b2fa3', '#f2b705', '#f4f1e8'], ['#e86a1c', '#1d4fa3', '#f4f1e8'], ['#14100d', '#d94f8a', '#f2b705'], ['#2aa198', '#f4f1e8', '#8a5a2b'], ['#a4202a', '#14100d', '#f4f1e8']];
  const prints = PRINT_COLORS.map(([a, b, c], i) => canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    const kind = i % 4;
    if (kind === 0) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {g.fillStyle = b; g.beginPath(); g.arc(x * 32 + 16, y * 32 + 16, 11, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x * 32 + 16, y * 32 + 16, 5, 0, 7); g.fill();}
    else if (kind === 1) {for (let y = 0; y < h; y += 32) {g.fillStyle = b; g.fillRect(0, y, w, 12); g.fillStyle = c; for (let x = 0; x < w; x += 16) g.fillRect(x, y + 16, 8, 10);}}
    else if (kind === 2) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {const cx = x * 32 + 16, cy = y * 32 + 16; g.fillStyle = b; g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx + 14, cy); g.lineTo(cx, cy + 14); g.lineTo(cx - 14, cy); g.fill(); g.fillStyle = c; g.fillRect(cx - 3, cy - 3, 6, 6);}
    else {g.strokeStyle = b; g.lineWidth = 7; for (let y = -16; y < h + 16; y += 22) {g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / w * Math.PI * 4) * 7); g.stroke();} blobs(g, w, h, 18, [c], 3, 5, 1, 1);}
  }, [2, 2]));

  /* ---------- materials ---------- */
  const matCache = new Map();
  const mat = (color, opts = {}) => {
    const key = color + JSON.stringify(opts, (k, v) => v && v.isTexture ? v.uuid : v);
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({color, roughness: 0.85, ...opts}));
    return matCache.get(key);
  };
  const paintCache = new Map();
  const paint = color => {
    if (!paintCache.has(color)) paintCache.set(color, new THREE.MeshPhysicalMaterial({color, metalness: 0.35, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1}));
    return paintCache.get(color);
  };
  const M = {
    earth: new THREE.MeshStandardMaterial({map: TX.earth, roughness: 1}),
    sand: new THREE.MeshStandardMaterial({map: TX.sand, roughness: 1}),
    sea: new THREE.MeshPhysicalMaterial({color: '#2f7c94', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.94, envMapIntensity: 1.4}),
    foam: new THREE.MeshBasicMaterial({color: '#f4f1e8', transparent: true, opacity: 0.55, depthWrite: false}),
    road: new THREE.MeshStandardMaterial({map: TX.asphalt, roughness: 0.93}),
    sidewalk: new THREE.MeshStandardMaterial({map: TX.sidewalk, roughness: 0.95}),
    grass: new THREE.MeshStandardMaterial({map: TX.grass, roughness: 1}),
    market: new THREE.MeshStandardMaterial({map: TX.market, roughness: 1}),
    drain: new THREE.MeshStandardMaterial({color: '#2b2f26', roughness: 0.4, metalness: 0.1}),
    line: new THREE.MeshStandardMaterial({color: '#e4ddc0', roughness: 0.8, transparent: true, opacity: 0.85}),
    zebra: new THREE.MeshStandardMaterial({color: '#ece6d0', roughness: 0.8, transparent: true, opacity: 0.8}),
    concrete: new THREE.MeshStandardMaterial({map: TX.concrete, roughness: 0.95}),
    zinc: new THREE.MeshStandardMaterial({map: TX.zinc, roughness: 0.55, metalness: 0.45, side: THREE.DoubleSide}),
    clay: new THREE.MeshStandardMaterial({map: TX.tile, roughness: 0.8, side: THREE.DoubleSide}),
    window: new THREE.MeshStandardMaterial({color: '#2c3d48', metalness: 0.4, roughness: 0.18}),
    windowLit: new THREE.MeshStandardMaterial({color: '#2a2a24', emissive: '#ffc472', emissiveIntensity: 0, roughness: 0.4, transparent: true, opacity: 0.9}),
    dark: mat('#1e1f22'), tyre: mat('#141618', {roughness: 0.92}), rim: mat('#c4c8cc', {metalness: 0.85, roughness: 0.25}),
    chrome: mat('#dfe3e6', {metalness: 1, roughness: 0.14}), trim: mat('#17191b', {roughness: 0.6}),
    glass: new THREE.MeshPhysicalMaterial({color: '#0f171c', metalness: 0.1, roughness: 0.05, envMapIntensity: 1.8, clearcoat: 1}),
    lightF: new THREE.MeshStandardMaterial({color: '#fff5dc', emissive: '#ffe7b0', emissiveIntensity: 0.25, roughness: 0.2}),
    lightROff: new THREE.MeshStandardMaterial({color: '#7a1010', emissive: '#d0201a', emissiveIntensity: 0.25, roughness: 0.3}),
    lightROn: new THREE.MeshStandardMaterial({color: '#ff3030', emissive: '#ff2418', emissiveIntensity: 3.2, roughness: 0.3}),
    amber: mat('#d98a1a', {emissive: '#a05a00', emissiveIntensity: 0.4}),
    interior: mat('#28231f'), wood: mat('#7a5232', {roughness: 0.9}), trunk: mat('#7a6346', {roughness: 1}),
    leaf: new THREE.MeshStandardMaterial({map: TX.leaf, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9}),
    tree: [mat('#3f6e36', {flatShading: true}), mat('#4d7d3b', {flatShading: true}), mat('#35602f', {flatShading: true})],
    lamp: new THREE.MeshStandardMaterial({color: '#fff2c0', emissive: '#ffcf7a', emissiveIntensity: 0.2}),
    pole: mat('#9a958c', {roughness: 0.9}), wire: new THREE.LineBasicMaterial({color: '#1c1c1c', transparent: true, opacity: 0.75}),
    polytank: mat('#1d1f22', {roughness: 0.55}), rebar: mat('#5a3a2a', {metalness: 0.4, roughness: 0.6}),
    pool: new THREE.MeshPhysicalMaterial({color: '#3fb6d6', roughness: 0.05, transmission: 0, envMapIntensity: 1.5}),
    glow: new THREE.MeshBasicMaterial({map: TX.radial, color: '#ffc874', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}),
    cone: new THREE.MeshBasicMaterial({map: TX.cone, color: '#fff0c8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}),
    contact: new THREE.MeshBasicMaterial({map: TX.radial, color: '#000000', transparent: true, opacity: 0.5, depthWrite: false}),
  };

  /* ---------- geometry helpers ---------- */
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), planeGeo = new THREE.PlaneGeometry(1, 1);
  const flatPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12), ballGeo = new THREE.SphereGeometry(1, 14, 10);
  const dummy = new THREE.Object3D();
  function add(parent, geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, shadow = true) {
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m;
  }
  const box = (p, w, h, d, m, x, y, z) => add(p, boxGeo, m, x, y, z, w, h, d);
  function instanced(geo, material, count, {cast = true, receive = true} = {}) {
    const m = new THREE.InstancedMesh(geo, material, Math.max(1, count));
    m.count = 0; m.castShadow = cast; m.receiveShadow = receive; m.frustumCulled = false; scene.add(m); return m;
  }
  function put(mesh, x, y, z, sx, sy, sz, ry = 0, color) {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count, dummy.matrix); if (color) mesh.setColorAt(mesh.count, color); mesh.count++;
  }
  function done(...meshes) {for (const m of meshes) {m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;}}

  // A loft sweeps rounded (superellipse) cross-sections along x. Car bodies, fish coffins and canoes use it.
  function loft(sections, ring = 22) {
    const pos = [], uv = [], idx = [];
    const n = sections.length;
    sections.forEach(([x, w, yb, yt, e = 4], i) => {
      const yc = (yb + yt) / 2, h = (yt - yb) / 2;
      for (let j = 0; j < ring; j++) {
        const t = j / ring * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        pos.push(x, yc + h * Math.sign(s) * Math.pow(Math.abs(s), 2 / e), w * Math.sign(c) * Math.pow(Math.abs(c), 2 / e));
        uv.push(i / (n - 1), j / ring);
      }
    });
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < ring; j++) {
      const a = i * ring + j, b = i * ring + (j + 1) % ring, c = (i + 1) * ring + j, d = (i + 1) * ring + (j + 1) % ring;
      idx.push(a, c, b, b, c, d);
    }
    for (const [si, flip] of [[0, false], [n - 1, true]]) {
      const base = pos.length / 3, [x, , yb, yt] = sections[si];
      pos.push(x, (yb + yt) / 2, 0); uv.push(0.5, 0.5);
      for (let j = 0; j < ring; j++) {const k = (si * ring + j) * 3; pos.push(pos[k], pos[k + 1], pos[k + 2]); uv.push(0.5, 0.5);}
      for (let j = 0; j < ring; j++) {const a = base + 1 + j, b = base + 1 + (j + 1) % ring; flip ? idx.push(base, b, a) : idx.push(base, a, b);}
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function sliceSections(secs, u0, u1, k = 1, dy = 0) {
    const at = u => {
      for (let i = 0; i < secs.length - 1; i++) {
        const a = secs[i], b = secs[i + 1];
        if (u >= a[0] && u <= b[0]) {const t = (u - a[0]) / (b[0] - a[0] || 1); return a.map((v, j) => j === 0 ? u : lerp(v, b[j], t));}
      }
      return [...secs[u < secs[0][0] ? 0 : secs.length - 1]];
    };
    const out = [at(u0)];
    for (const s of secs) if (s[0] > u0 && s[0] < u1) out.push([...s]);
    out.push(at(u1));
    return out.map(([u, w, yb, yt, e]) => [u, w * k, yb - dy, yt + dy, e]);
  }

  // Parts are collected per material "slot", then merged so each vehicle costs a handful of draw calls.
  function PartBuilder() {
    const slots = {};
    const push = (slot, geo, m4) => {
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (m4) g.applyMatrix4(m4);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      (slots[slot] ||= []).push(g);
    };
    const m4 = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
      dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); return dummy.matrix.clone();
    };
    return {
      geo: (slot, g, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => push(slot, g, m4(x, y, z, sx, sy, sz, rx, ry, rz)),
      box: (slot, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => push(slot, boxGeo, m4(x, y, z, w, h, d, rx, ry, rz)),
      ball: (slot, rx_, ry_, rz_, x, y, z) => push(slot, ballGeo, m4(x, y, z, rx_, ry_, rz_)),
      cyl: (slot, r, h, x, y, z, rx = 0, ry = 0, rz = 0) => push(slot, cylGeo, m4(x, y, z, r, h, r, rx, ry, rz)),
      rod: (slot, x0, y0, x1, y1, z, t, d = t) => {const len = Math.hypot(x1 - x0, y1 - y0); push(slot, boxGeo, m4((x0 + x1) / 2, (y0 + y1) / 2, z, len, t, d, 0, 0, Math.atan2(y1 - y0, x1 - x0)));},
      loft: (slot, secs, ring) => push(slot, loft(secs, ring)),
      finish: () => Object.fromEntries(Object.entries(slots).map(([k, list]) => [k, THREE.mergeGeometries(list)])),
    };
  }

  /* ---------- sky, sun and day cycle ---------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {top: {value: new THREE.Color()}, hor: {value: new THREE.Color()}, gnd: {value: new THREE.Color('#5a4434')}, sunDir: {value: new THREE.Vector3(0, 1, 0)}, sunCol: {value: new THREE.Color()}, night: {value: 0}},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(hor, gnd, clamp(-h*6.0,0.0,1.0));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35 + pow(s, 3.0) * 0.08);
        if (night > 0.0 && h > 0.05) { vec3 q = floor(d * 260.0); float st = step(0.9975, hash(q)); c += vec3(st) * night * smoothstep(0.05, 0.4, h); }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, envClock = -99;

  scene.fog = new THREE.FogExp2('#cfd8d6', 0.0085);
  const hemi = new THREE.HemisphereLight('#fff2d5', '#6b5444', 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff2cf', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
  Object.assign(sun.shadow.camera, {left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 260});
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const headLamp = new THREE.SpotLight('#fff1cf', 0, 46, 0.55, 0.5, 1.2);
  scene.add(headLamp, headLamp.target);

  // Hour → sky top, horizon, sun colour, sun strength, hemisphere sky, hemisphere ground, hemi strength, fog.
  const KEYS = [
    [0, '#070c1c', '#1a2340', '#8a9ce0', 0.55, '#5d6ea6', '#2a221c', 1.35, '#1a2238'],
    [5.2, '#0a1124', '#283252', '#8a9ae0', 0.5, '#5d6ea6', '#2a221c', 1.35, '#232b45'],
    [6.1, '#3b5684', '#eea56a', '#ffae6a', 1.1, '#d6ad8e', '#4e3a2c', 0.9, '#d9a986'],
    [7.4, '#6b9acb', '#e9dcc5', '#ffe2b4', 2.5, '#fff0d8', '#6e5644', 1.15, '#d8d4c6'],
    [12, '#5893cf', '#d7e2e4', '#fff6e6', 3.1, '#fff4dc', '#72604c', 1.25, '#cfdadb'],
    [16.6, '#6597c8', '#e7d9bf', '#ffe1b3', 2.6, '#fff0d6', '#6e5644', 1.15, '#dad3c2'],
    [17.9, '#4b5f8e', '#f2904f', '#ff9b55', 1.2, '#e2a07c', '#4e3a2c', 0.9, '#d98f68'],
    [18.8, '#1c2547', '#61405e', '#a090ff', 0.55, '#5a5a8a', '#241d18', 0.95, '#3d3550'],
    [19.6, '#080d1e', '#1c2542', '#8a9ce0', 0.55, '#5d6ea6', '#2a221c', 1.35, '#1a2238'],
    [24, '#070c1c', '#1a2340', '#8a9ce0', 0.55, '#5d6ea6', '#2a221c', 1.35, '#1a2238'],
  ].map(k => k.map((v, i) => typeof v === 'string' ? new THREE.Color(v) : v));
  const tmpA = new THREE.Color(), sunDir = new THREE.Vector3();
  let night = 0;
  function dayCycle() {
    const h = ((S.clock || 400) / 60) % 24;
    let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    const C = (k, out) => out.copy(a[k]).lerp(b[k], t);
    C(1, skyMat.uniforms.top.value); C(2, skyMat.uniforms.hor.value); C(3, sun.color);
    sun.intensity = lerp(a[4], b[4], t);
    C(5, hemi.color); C(6, hemi.groundColor); hemi.intensity = lerp(a[7], b[7], t);
    C(8, scene.fog.color);
    const th = Math.PI * (h - 6) / 12, el = Math.sin(th);
    night = smooth(0.12, -0.12, el);
    if (el > -0.08) sunDir.set(Math.cos(th), Math.max(0.12, el), 0.28).normalize();
    else sunDir.set(-0.4, 0.75, -0.3).normalize(); // moonlight
    skyMat.uniforms.sunDir.value.set(Math.cos(th), el, 0.28).normalize();
    skyMat.uniforms.sunCol.value.copy(sun.color).multiplyScalar(el > -0.1 ? 1 : 0.15);
    skyMat.uniforms.night.value = night;
    scene.fog.density = lerp(0.0075, 0.012, night);
    M.windowLit.emissiveIntensity = night * 2.2; windowsLit.visible = night > 0.05;
    for (const fm of facadeMeshes) fm.material.emissiveIntensity = 0.03 + night * 0.16;
    M.lamp.emissiveIntensity = 0.2 + night * 3;
    M.lightF.emissiveIntensity = 0.3 + night * 3.5;
    M.lightROff.emissiveIntensity = 0.25 + night * 1.1;
    M.glow.opacity = night * 0.7; M.cone.opacity = night * 0.38;
    renderer.toneMappingExposure = lerp(1.0, 1.4, night);
    if (Math.abs((S.clock || 0) - envClock) > 12 || envRT === null) {
      envClock = S.clock || 0;
      const old = envRT; envRT = pmrem.fromScene(envScene, 0.02);
      scene.environment = envRT.texture; scene.environmentIntensity = lerp(0.55, 0.25, night);
      old && old.dispose();
    }
  }

  /* ---------- ground ---------- */
  const worldW = MW * T * U, worldH = MH * T * U;
  function groundPlane(w, d, material, x, z, y, rep) {
    const geo = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
    if (rep) {const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / rep, uv.getY(i) * d / rep);}
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m;
  }
  groundPlane(worldW + 300, COAST * T * U + 150, M.earth, worldW / 2, (COAST * T * U - 150) / 2, 0, 9);
  groundPlane(worldW + 300, (SEA_Y - COAST) * T * U + 2, M.sand, worldW / 2, (COAST + (SEA_Y - COAST) / 2) * T * U, 0.01, 6);
  const sea = groundPlane(worldW + 600, 400, M.sea, worldW / 2, SEA_Y * T * U + 200 - 1, -0.12);
  sea.receiveShadow = false;
  const foam = groundPlane(worldW + 300, 1.6, M.foam, worldW / 2, SEA_Y * T * U - 0.6, -0.06);
  const roadX0 = VX[0] * T * U, roadX1 = (VX[VX.length - 1] + 2) * T * U;
  const roadZ0 = HY[0] * T * U, roadZ1 = (HY[HY.length - 1] + 2) * T * U;
  // Side streets can be closed between junctions, so lay each block-length of road only where the map has it.
  for (const x of VX) for (let k = 0; k < HY.length - 1; k++) if (at(x, HY[k] + 5) === TILE.RD) groundPlane(8, (HY[k + 1] - HY[k]) * T * U, M.road, (x + 1) * T * U, ((HY[k] + HY[k + 1]) / 2 + 1) * T * U, 0.03, 8);
  for (const y of HY) groundPlane(roadX1 - roadX0, 8, M.road, (roadX0 + roadX1) / 2, (y + 1) * T * U, 0.032, 8);
  for (const x of VX) for (const y of HY) groundPlane(8, 8, M.road, (x + 1) * T * U, (y + 1) * T * U, 0.034, 8);
  groundPlane(32, 32, M.road, 48 * T * U, 24 * T * U, 0.036, 8); // Kwame Nkrumah Circle

  const nodeAt = new Set(); for (const x of VX) for (const y of HY) nodeAt.add(x + ',' + y);
  const lines = instanced(flatPlane, M.line, 4000, {cast: false});
  const live = (x, y) => at(x, y - 1) === TILE.RD || at(x, y + 2) === TILE.RD;
  const nearNode = (px, pz) => VX.some(x => Math.abs(px - (x + 1) * 4) < 5.5 && HY.some(y => Math.abs(pz - (y + 1) * 4) < 5.5 && live(x, y)));
  const inCircle = (px, pz) => Math.abs(px - 48 * 4) < 17 && Math.abs(pz - 24 * 4) < 17;
  for (const x of VX) for (let z = roadZ0 + 2; z < roadZ1 - 2; z += 7) {const cx = (x + 1) * 4; if (!nearNode(cx, z) && !inCircle(cx, z) && at(x + 1, Math.floor(z / 4)) === TILE.RD) put(lines, cx, 0.045, z, 0.14, 1, 3);}
  for (const y of HY) for (let x = roadX0 + 2; x < roadX1 - 2; x += 7) {const cz = (y + 1) * 4; if (!nearNode(x, cz) && !inCircle(x, cz)) put(lines, x, 0.047, cz, 3, 1, 0.14);}
  // Zebra crossings near busy junctions.
  const zebra = instanced(flatPlane, M.zebra, 3000, {cast: false});
  VX.forEach((x, i) => HY.forEach((y, j) => {
    if ((i * 7 + j * 3) % 3 !== 0) return;
    const cx = (x + 1) * 4, cz = (y + 1) * 4;
    for (const s of [-1, 1]) for (let k = -3; k <= 3; k++) {
      if (!inCircle(cx + s * 5.6, cz)) put(zebra, cx + s * 5.6, 0.049, cz + k * 1.05, 2.2, 1, 0.5);
      if (!inCircle(cx, cz + s * 5.6) && at(x + 1, Math.floor((cz + s * 5.6) / 4)) === TILE.RD) put(zebra, cx + k * 1.05, 0.049, cz + s * 5.6, 0.5, 1, 2.2);
    }
  }));
  done(lines, zebra);

  // Raised pavements with open concrete gutters beside the road, the way Accra streets look.
  let swCount = 0, pkCount = 0, mkCount = 0;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {const t = at(x, y); if (t === TILE.SW) swCount++; else if (t === TILE.PK) pkCount++; else if (t === TILE.MK) mkCount++;}
  const swMesh = instanced(boxGeo, M.sidewalk, swCount, {cast: false});
  const pkMesh = instanced(boxGeo, M.grass, pkCount, {cast: false});
  const mkMesh = instanced(boxGeo, M.market, mkCount, {cast: false});
  const drains = instanced(flatPlane, M.drain, swCount * 2, {cast: false});
  const lips = instanced(boxGeo, M.concrete, swCount * 2, {cast: false});
  const slabs = instanced(boxGeo, M.concrete, swCount, {cast: false});
  const SW_H = 0.14;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = at(x, y), cx = (x + 0.5) * 4, cz = (y + 0.5) * 4;
    if (t === TILE.SW) {
      put(swMesh, cx, SW_H / 2, cz, 4, SW_H, 4);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (at(x + dx, y + dy) !== TILE.RD) continue;
        const ex = cx + dx * 1.35, ez = cz + dy * 1.35, along = 4, across = 0.55;
        put(drains, ex, SW_H + 0.004, ez, dx ? across : along, 1, dx ? along : across);
        put(lips, cx + dx * 1.68, SW_H + 0.025, cz + dy * 1.68, dx ? 0.12 : along, 0.05, dx ? along : 0.12);
        if (((x * 13 + y * 7) % 5) === 0) put(slabs, ex, SW_H + 0.03, ez, dx ? 0.7 : 1.1, 0.06, dx ? 1.1 : 0.7);
      }
    } else if (t === TILE.PK) put(pkMesh, cx, 0.04, cz, 4, 0.08, 4);
    else if (t === TILE.MK) put(mkMesh, cx, 0.03, cz, 4, 0.06, 4);
  }
  done(swMesh, pkMesh, mkMesh, drains, lips, slabs);
  function groundHeight(px, py) {
    const t = at(Math.floor(px / T), Math.floor(py / T));
    return t === TILE.SW ? SW_H : t === TILE.PK ? 0.08 : t === TILE.MK ? 0.06 : t === TILE.RD ? 0.035 : 0.01;
  }

  // Kwame Nkrumah Circle island with fountain and obelisk.
  {
    const cx = toX(CX), cz = toZ(CY), r = ISL * U;
    const isl = add(scene, new THREE.CylinderGeometry(r, r + 0.1, 0.3, 40), M.concrete, cx, 0.15, cz);
    add(scene, new THREE.CylinderGeometry(r - 0.4, r - 0.4, 0.32, 40), M.grass, cx, 0.17, cz);
    add(scene, new THREE.CylinderGeometry(2.2, 2.4, 0.6, 24), M.concrete, cx, 0.4, cz);
    add(scene, new THREE.CylinderGeometry(1.9, 1.9, 0.62, 24), M.pool, cx, 0.42, cz, 1, 1, 1, false);
    add(scene, new THREE.CylinderGeometry(0.15, 0.45, 7, 4), mat('#d8d0c0'), cx, 3.8, cz);
    add(scene, new THREE.OctahedronGeometry(0.5), mat('#14100d', {metalness: 0.6, roughness: 0.3}), cx, 7.6, cz);
    isl.receiveShadow = true;
  }

  /* ---------- buildings ---------- */
  const facadeTextures = Array.from({length: 8}, (_, i) => {
    const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    t.repeat.set(0.25, 0.5); t.offset.set((i % 4) / 4, i < 4 ? 0.5 : 0); return t;
  });
  const facadeImage = new Image();
  facadeImage.onload = () => {for (const t of facadeTextures) {t.image = facadeImage; t.needsUpdate = true;}};
  facadeImage.src = window.CHALE_SPRITES.facades;
  const facadeMeshes = facadeTextures.map(t => instanced(planeGeo, new THREE.MeshStandardMaterial({map: t, roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffd9a0', emissiveMap: t, emissiveIntensity: 0.03}), buildings.length * 8, {cast: false}));
  const facadeColors = ['#d5b698', '#d9c9af', '#b9ae9e', '#e3cfad', '#b7c8b7', '#c7b7a1', '#e1c7a1', '#b7c4c9'];
  const shell = instanced(boxGeo, mat('#ffffff'), buildings.length);
  const slab = instanced(boxGeo, mat('#ffffff', {map: TX.concrete}), buildings.length * 5);
  const prismGeo = (() => {
    const g = new THREE.BufferGeometry();
    const p = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 1, 0, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 1, 0, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 1, 0];
    const uv = [0, 0, 4, 0, 4, 2, 0, 2, 0, 0, 0, 2, 4, 2, 4, 0, 0, 0, 0.5, 1, 1, 0, 0, 0, 1, 0, 0.5, 1];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex([0, 3, 2, 0, 2, 1, 4, 7, 6, 4, 6, 5, 8, 10, 9, 11, 13, 12]);
    g.computeVertexNormals(); return g;
  })();
  const zincRoofs = instanced(prismGeo, M.zinc, buildings.length);
  const clayRoofs = instanced(prismGeo, M.clay, buildings.length);
  const gables = instanced(boxGeo, mat('#ffffff'), 0);
  const windows = instanced(boxGeo, M.window, buildings.length * 24, {cast: false});
  const windowsLit = instanced(boxGeo, M.windowLit, buildings.length * 10, {cast: false});
  const tanks = instanced(new THREE.CylinderGeometry(0.62, 0.62, 1.3, 14), M.polytank, buildings.length);
  const stubs = instanced(boxGeo, M.concrete, buildings.length * 6);
  const rebars = instanced(new THREE.CylinderGeometry(0.02, 0.02, 1, 4), M.rebar, buildings.length * 12, {cast: false});
  const dishes = instanced(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, 0, 0.9), mat('#e8e6e0', {side: THREE.DoubleSide}), buildings.length);
  const acs = instanced(boxGeo, mat('#e3e1da'), buildings.length * 2);
  const awnings = instanced(boxGeo, mat('#ffffff'), buildings.length);
  const signCache = new Map();
  function signTexture(text, color) {
    const key = `${color}|${text}`;
    if (signCache.has(key)) return signCache.get(key);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const c = canvas.getContext('2d');
    c.fillStyle = color; c.fillRect(0, 0, 512, 96);
    c.strokeStyle = '#f6d65d'; c.lineWidth = 8; c.strokeRect(4, 4, 504, 88);
    c.font = 'bold 36px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff8e8';
    let label = text;
    while (c.measureText(label).width > 470 && label.length > 12) label = label.slice(0, -2);
    if (label !== text) label = label.slice(0, -2) + '…';
    c.fillText(label, 256, 49);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = maxAniso;
    signCache.set(key, texture); return texture;
  }
  const C = c => new THREE.Color(c);
  buildings.forEach((b, i) => {
    const x = (b.x + b.w / 2) * 4, z = (b.y + b.h / 2) * 4;
    const w = b.w * 4 - 0.5, d = b.h * 4 - 0.5;
    if (b.kind === 'lighthouse') return lighthouse(x, z);
    if (b.kind === 'gate') return blackStarGate(x, z, w, d);
    if (b.kind === 'kiosk') return kiosk(x, z, b);
    const special = b.kind === 'hospital' || b.kind === 'mansion' || b.kind === 'police';
    const floors = special ? 3 : 1 + ((i * 17 + b.x) % 3);
    const height = floors * 3.1 + 0.6;
    put(shell, x, height / 2, z, w, height, d, 0, C(b.kind === 'mansion' ? '#f1ece2' : facadeColors[(i * 7 + b.x) % facadeColors.length]));
    const unfinished = b.roof === 'flat' && !special && (i % 5 === 0);
    if (b.roof === 'zinc' || b.roof === 'tile') {
      const long = w >= d, rl = (long ? w : d) + 0.7, rs = (long ? d : w) + 0.7, rh = Math.min(1.8, rs * 0.28);
      put(b.roof === 'zinc' ? zincRoofs : clayRoofs, x, height, z, rl, rh, rs, long ? 0 : Math.PI / 2);
      put(slab, x, height - 0.08, z, w + 0.5, 0.16, d + 0.5, 0, C('#cfc6b6'));
    } else {
      put(slab, x, height + 0.1, z, w + 0.25, 0.2, d + 0.25, 0, C(b.c || '#cfc6b6'));
      // Parapet walls.
      put(slab, x, height + 0.45, z + d / 2, w + 0.25, 0.5, 0.15, 0, C('#d6cdbd'));
      put(slab, x, height + 0.45, z - d / 2, w + 0.25, 0.5, 0.15, 0, C('#d6cdbd'));
      put(slab, x + w / 2, height + 0.45, z, 0.15, 0.5, d + 0.25, 0, C('#d6cdbd'));
      put(slab, x - w / 2, height + 0.45, z, 0.15, 0.5, d + 0.25, 0, C('#d6cdbd'));
      if (i % 3 !== 1) put(tanks, x + w * 0.28, height + 0.85, z - d * 0.22, 1, 1, 1);
      if (i % 4 === 2) put(dishes, x - w * 0.3, height + 0.6, z + d * 0.25, 1, 1, 1, i);
      if (unfinished) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const px = x + sx * (w / 2 - 0.35), pz = z + sz * (d / 2 - 0.35);
        put(stubs, px, height + 0.75, pz, 0.35, 1.1, 0.35);
        for (let k = 0; k < 3; k++) put(rebars, px + (k - 1) * 0.1, height + 1.7, pz + (k % 2) * 0.1 - 0.05, 1, 1.0, 1);
      }
    }
    if (i % 4 === 0) for (let k = 0; k < 1 + (i % 2); k++) put(acs, x + w / 2 + 0.25, 2.2 + k * 3.1, z + (k - 0.5) * 1.6, 0.4, 0.55, 0.9);
    for (let f = 0; f < floors; f++) for (const side of [-1, 1]) {
      const zz = z + side * (d / 2 + 0.09);
      for (const offset of [-0.3, 0, 0.3]) {
        if (w < 6 && offset === 0) continue;
        if (((i * 31 + f * 7 + (offset * 10 | 0) + side * 3) % 7) < 3) put(windowsLit, x + w * offset, 1.9 + f * 3.1, zz, Math.min(1.1, w * 0.16), 1.0, 0.04);
      }
    }
    // Long walls get several shopfronts side by side instead of one stretched picture.
    const index = (i * 7 + b.x + b.y) % 8;
    const wall = (cx, cz, len, ang, ax, az) => {
      const n = Math.max(1, Math.round(len / 6.5)), seg = len / n;
      for (let k = 0; k < n; k++) {
        const o = -len / 2 + (k + 0.5) * seg;
        put(facadeMeshes[(index + k * 3) % 8], cx + ax * o, height / 2, cz + az * o, seg, height, 1, ang);
      }
    };
    wall(x, z + d / 2 + 0.05, w, 0, 1, 0);
    wall(x, z - d / 2 - 0.05, w, Math.PI, 1, 0);
    wall(x + w / 2 + 0.05, z, d, Math.PI / 2, 0, 1);
    wall(x - w / 2 - 0.05, z, d, -Math.PI / 2, 0, 1);
    if (b.sign) {
      const sw = Math.min(w - 0.4, 7);
      const sign = add(scene, planeGeo, new THREE.MeshStandardMaterial({map: signTexture(b.sign, b.sc || '#9e2525'), roughness: 0.7, emissive: '#ffffff', emissiveMap: signTexture(b.sign, b.sc || '#9e2525'), emissiveIntensity: 0.12}), x, Math.min(height - 0.6, 3.25), z + d / 2 + 0.16, sw, 0.8, 1, false);
      sign.userData.sign = true;
      put(awnings, x, 2.55, z + d / 2 + 0.7, Math.min(w - 0.2, 7.5), 0.1, 1.4, 0, C(rpick(['#c8102e', '#0a7a45', '#1d4fa3', '#f2b705', '#e86a1c', '#e9e4da'])));
    }
    if (b.pool) add(scene, flatPlane, M.pool, x + w / 2 + 3, 0.06, z, 3, 1, 2.2, false);
  });
  done(shell, slab, zincRoofs, clayRoofs, windows, windowsLit, tanks, stubs, rebars, dishes, acs, awnings, ...facadeMeshes);
  function lighthouse(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    for (let k = 0; k < 6; k++) add(g, new THREE.CylinderGeometry(1.15 - k * 0.08, 1.2 - k * 0.08, 3, 18), mat(k % 2 ? '#f4f1e8' : '#c8102e'), 0, 1.5 + k * 3, 0);
    add(g, new THREE.CylinderGeometry(1.1, 1.1, 0.25, 18), M.trim, 0, 18.1, 0);
    add(g, new THREE.CylinderGeometry(0.75, 0.75, 1.4, 12), M.lamp, 0, 18.9, 0);
    add(g, new THREE.ConeGeometry(0.95, 0.9, 12), mat('#c8102e'), 0, 20, 0);
  }
  function blackStarGate(x, z, w, d) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const stone = mat('#e8e2d4');
    for (const s of [-1, 1]) for (const k of [0, 1]) box(g, 1.8, 9, 2.4, stone, s * (3.2 + k * 3.4), 4.5, 0);
    box(g, 15, 2.2, 2.6, stone, 0, 10.1, 0);
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.9 : 2.1; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);}
    const sm = add(g, new THREE.ExtrudeGeometry(star, {depth: 0.5, bevelEnabled: false}), mat('#111111', {roughness: 0.4}), 0, 13.4, -0.25);
    sm.rotation.z = Math.PI;
    box(g, 15, 0.12, 0.05, mat('#c8102e'), 0, 11.0, 1.32); box(g, 15, 0.12, 0.05, mat('#f2b705'), 0, 10.8, 1.32); box(g, 15, 0.12, 0.05, mat('#0a7a45'), 0, 10.6, 1.32);
  }
  function kiosk(x, z, b) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = (b.face || 0); scene.add(g);
    const col = b.c || '#f2b705';
    box(g, 2.6, 2.5, 2.2, mat(col, {roughness: 0.6, metalness: 0.3}), 0, 1.3, 0);
    box(g, 2.8, 0.1, 2.8, mat('#9aa0a5', {metalness: 0.6, roughness: 0.4}), 0, 2.6, 0.3);
    box(g, 1.8, 1.0, 0.05, mat('#26221e'), 0, 1.5, 1.11);
    const s = add(g, planeGeo, new THREE.MeshStandardMaterial({map: signTexture(b.sign || 'MOBILE MONEY', b.sc || '#14100d'), roughness: 0.8}), 0, 2.3, 1.13, 2.4, 0.42, 1, false);
    s.castShadow = false;
    box(g, 0.55, 0.6, 0.45, mat('#3a7bd5'), 0.75, 0.3, 1.4);
    box(g, 0.5, 0.95, 0.5, mat('#e9e4da'), -0.8, 0.48, 1.45);
  }

  /* ---------- street furniture: poles, wires, lamps ---------- */
  const poleMesh = instanced(new THREE.CylinderGeometry(0.11, 0.16, 8.5, 8), M.pole, 1500);
  const armMesh = instanced(boxGeo, M.pole, 1500);
  const lampHeads = instanced(boxGeo, M.lamp, 1500, {cast: false});
  const glowMesh = instanced(flatPlane, M.glow, 2000, {cast: false});
  const wirePts = [];
  const poles = [];
  function addPoleLine(points) {
    let prev = null;
    for (const [x, z, ax] of points) {
      put(poleMesh, x, 4.25, z, 1, 1, 1);
      put(armMesh, x, 8.1, z, ax ? 0.12 : 1.6, 0.1, ax ? 1.6 : 0.12);
      if (poles.length % 2 === 0) {
        put(lampHeads, x + (ax ? 0 : 0.9), 7.6, z + (ax ? -0.9 : 0), ax ? 0.3 : 0.6, 0.14, ax ? 0.6 : 0.3);
        put(glowMesh, x + (ax ? 0 : 2.4), 0.06, z + (ax ? -2.4 : 0), 9, 1, 9);
      }
      if (prev) for (const off of [-0.7, 0, 0.7]) {
        const ax0 = prev[0] + (prev[2] ? 0 : off), az0 = prev[1] + (prev[2] ? off : 0), ax1 = x + (ax ? 0 : off), az1 = z + (ax ? off : 0);
        const seg = 8;
        for (let k = 0; k < seg; k++) {
          const t0 = k / seg, t1 = (k + 1) / seg, sag = t => 8.0 - Math.sin(t * Math.PI) * 0.9;
          wirePts.push(lerp(ax0, ax1, t0), sag(t0), lerp(az0, az1, t0), lerp(ax0, ax1, t1), sag(t1), lerp(az0, az1, t1));
        }
      }
      poles.push([x, z]); prev = [x, z, ax];
    }
  }
  for (const vx of VX) {
    const pts = [], tx = vx - 1;
    for (let y = HY[0]; y <= HY[HY.length - 1] + 1; y += 3) if (at(tx, y) === TILE.SW && at(tx, y + 1) === TILE.SW) pts.push([(tx + 0.72) * 4, (y + 0.5) * 4, false]);
      else if (pts.length) {addPoleLine(pts); pts.length = 0;}
    addPoleLine(pts);
  }
  for (const hy of HY) {
    const pts = [], ty = hy + 2;
    for (let x = VX[0]; x <= VX[VX.length - 1] + 1; x += 3) if (at(x, ty) === TILE.SW && at(x + 1, ty) === TILE.SW) pts.push([(x + 0.5) * 4, (ty + 0.28) * 4, true]);
      else if (pts.length) {addPoleLine(pts); pts.length = 0;}
    addPoleLine(pts);
  }
  let overheadWires;
  {
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
    overheadWires = new THREE.LineSegments(wg, M.wire); scene.add(overheadWires);
  }

  /* ---------- trees, stalls, decor ---------- */
  const palmTemplates = [0, 1, 2].map(v => {
    const pb = PartBuilder(), h = 6 + v * 0.9, lean = 0.35 + v * 0.25;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.3, h * 0.55, 0), new THREE.Vector3(lean, h, 0));
    pb.geo('trunk', new THREE.TubeGeometry(curve, 10, 0.17, 7, false));
    pb.ball('trunk', 0.32, 0.4, 0.32, lean, h - 0.05, 0);
    const frond = new THREE.PlaneGeometry(3.2, 0.9, 6, 1);
    const p = frond.attributes.position;
    for (let i = 0; i < p.count; i++) {const fx = p.getX(i) + 1.6; p.setXYZ(i, fx, -Math.pow(fx / 3.2, 2) * 1.4, p.getY(i));}
    frond.computeVertexNormals();
    for (let k = 0; k < 9; k++) pb.geo('leaf', frond, lean, h + 0.1, 0, 1, 1, 1, 0, k * Math.PI * 2 / 9 + v, 0.25 - (k % 3) * 0.12);
    return pb.finish();
  });
  const treeTemplate = (() => {
    const pb = PartBuilder();
    pb.cyl('trunk', 0.22, 3.2, 0, 1.6, 0);
    for (const [x, y, z, r] of [[0, 4.2, 0, 1.9], [1.1, 3.8, 0.4, 1.3], [-1, 3.9, -0.3, 1.4], [0.2, 3.6, 1.1, 1.3], [-0.3, 5.0, -0.2, 1.3]]) pb.geo('leafy', new THREE.IcosahedronGeometry(1, 1), x, y, z, r, r * 0.85, r);
    return pb.finish();
  })();
  function placeTemplate(tpl, materials, x, y, z, ry = 0, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s);
    for (const [slot, geo] of Object.entries(tpl)) add(g, geo, materials[slot] || M.trim);
    scene.add(g); return g;
  }
  const umbrellaGeo = new THREE.ConeGeometry(1.75, 0.6, 8, 1, true);
  const stallColors = ['#e9aa13', '#bd2939', '#21845d', '#205d9d', '#eeefdd', '#e77928'];
  const goodsColors = ['#d23a2a', '#e8b02a', '#6aa84f', '#f4f1e8', '#8b5a2b', '#e86a1c'];
  const canoeGeoCache = new Map();
  const tyreTorus = new THREE.TorusGeometry(0.31, 0.12, 8, 18);
  for (const d of decor) {
    const x = toX(d.x), z = toZ(d.y);
    if (d.k === 'stall') {
      const g = new THREE.Group(); g.position.set(x, groundHeight(d.x, d.y), z); g.rotation.y = d.rot || 0; scene.add(g);
      add(g, cylGeo, M.chrome, 0, 1.2, 0, 0.035, 2.4, 0.035);
      const c = add(g, umbrellaGeo, mat(stallColors[(Math.floor(x + z) % stallColors.length + stallColors.length) % stallColors.length], {side: THREE.DoubleSide}), 0, 2.4, 0);
      c.receiveShadow = false;
      box(g, 1.3, 0.08, 0.9, M.wood, 0.2, 0.85, 0);
      for (const lx of [-0.35, 0.75]) for (const lz of [-0.35, 0.35]) box(g, 0.06, 0.85, 0.06, M.wood, lx, 0.42, lz);
      for (let k = 0; k < 6; k++) add(g, ballGeo, mat(goodsColors[(k + Math.floor(x)) % goodsColors.length]), -0.3 + (k % 3) * 0.25, 0.97, -0.2 + (k / 3 | 0) * 0.35, 0.11, 0.1, 0.11);
      add(g, cylGeo, mat('#c48a3a'), -0.6, 0.25, 0.6, 0.25, 0.5, 0.25);
    } else if (d.k === 'palm') {
      placeTemplate(palmTemplates[Math.abs(Math.floor(d.s * 10)) % 3], {trunk: M.trunk, leaf: M.leaf}, x, 0, z, d.s || 0);
    } else if (d.k === 'streetTree') {
      placeTemplate(treeTemplate, {trunk: M.trunk, leafy: M.tree[Math.abs(Math.floor(x * 3 + z)) % 3]}, x, groundHeight(d.x, d.y), z, d.s || 0, 0.8 + ((x * 7) % 3) * 0.12);
    } else if (d.k === 'lamp') {
      add(scene, cylGeo, M.pole, x, 3.2, z, 0.08, 6.4, 0.08);
      add(scene, boxGeo, M.lamp, x + 0.45, 6.4, z, 0.8, 0.15, 0.25, false);
      put(glowMesh, x + 1.2, 0.07, z, 10, 1, 10);
    } else if (d.k === 'canoe') {
      const len = 7 + (Math.abs(x * 13) % 3);
      const key = len | 0;
      if (!canoeGeoCache.has(key)) canoeGeoCache.set(key, loft([[-len / 2, 0.05, 0.55, 0.95, 2.5], [-len * 0.35, 0.5, 0.2, 0.9, 2.5], [len * 0.3, 0.6, 0.15, 0.85, 2.5], [len / 2, 0.05, 0.6, 1.0, 2.5]], 16));
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -(d.a || 0); scene.add(g);
      add(g, canoeGeoCache.get(key), mat(d.c || '#c8102e'));
      box(g, len * 0.8, 0.12, 0.95, mat(d.c2 || '#f2b705'), 0, 0.72, 0);
      box(g, len * 0.7, 0.05, 0.8, M.wood, 0, 0.62, 0);
      add(g, cylGeo, M.wood, len * 0.3, 1.6, 0, 0.03, 1.8, 0.03);
      const flag = add(g, planeGeo, mat(rpick(['#c8102e', '#f2b705', '#0a7a45']), {side: THREE.DoubleSide}), len * 0.3 + 0.35, 2.3, 0, 0.7, 0.45, 1, false);
      flag.rotation.y = Math.PI / 2;
    } else if (d.k === 'coffinD') {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.3; scene.add(g);
      fancyCoffin(g, d.shape, 1.1);
    } else if (d.k === 'tyres') {
      for (let k = 0; k < (d.n || 3); k++) {const t = add(scene, tyreTorus, M.tyre, x + Math.sin(k * 2.1) * 0.05, 0.13 + k * 0.23, z); t.rotation.x = Math.PI / 2;}
    } else if (d.k === 'crate') {
      for (let k = 0; k < 3; k++) box(scene, 0.6, 0.45, 0.45, mat(d.c || '#8d6236'), x + (k % 2) * 0.3, SW_H + 0.23 + (k === 2 ? 0.45 : 0), z + (k === 1 ? 0.5 : 0));
    } else if (d.k === 'shelter') {
      const w = toX(d.w), dd = toZ(d.h), g = new THREE.Group(); g.position.set(x + w / 2, 0, z + dd / 2); scene.add(g);
      box(g, w, 0.12, dd + 1, M.zinc, 0, 3.3, 0);
      for (let k = 0; k <= 4; k++) for (const s of [-1, 1]) box(g, 0.14, 3.3, 0.14, mat('#2d5b7a'), -w / 2 + k * w / 4, 1.65, s * dd / 2);
      for (let k = 0; k < 3; k++) box(g, w * 0.8, 0.08, 0.4, mat('#9aa0a5', {metalness: 0.5}), 0, 0.5, -0.8 + k * 0.8);
      const s = add(g, planeGeo, new THREE.MeshStandardMaterial({map: signTexture('CIRCLE LORRY STATION', '#0a6b3a')}), 0, 3.0, dd / 2 + 0.55, Math.min(w * 0.7, 9), 0.7, 1, false);
      s.rotation.y = 0;
    } else if (d.k === 'plot') {
      const w = toX(d.w), dd = toZ(d.h), g = new THREE.Group(); g.position.set(x + w / 2, 0, z + dd / 2); scene.add(g);
      const wall = mat('#d7cfbf', {map: TX.concrete});
      box(g, w, 1.6, 0.25, wall, 0, 0.8, dd / 2); box(g, w, 1.6, 0.25, wall, 0, 0.8, -dd / 2);
      box(g, 0.25, 1.6, dd, wall, -w / 2, 0.8, 0); box(g, 0.25, 1.6, dd, wall, w / 2, 0.8, 0);
      const t = canvasTexture(1024, 96, (c, cw, ch) => {c.fillStyle = '#d7cfbf'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#b3241f'; c.font = '900 58px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('THIS LAND IS NOT FOR SALE', cw / 2, ch / 2 + 4);});
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      add(g, planeGeo, new THREE.MeshStandardMaterial({map: t}), 0, 0.85, dd / 2 + 0.14, Math.min(w - 0.5, 14), 1.3, 1, false);
      for (let k = 0; k < 5; k++) box(g, 0.4, 0.4, 0.4, M.concrete, -w / 3 + k * 1.7, 0.2, -dd / 4 + (k % 2));
    } else if (d.k === 'pool') {
      add(scene, flatPlane, mat('#f1ece2'), x + toX(d.w) / 2, 0.05, z + toZ(d.h) / 2, toX(d.w) + 0.8, 1, toZ(d.h) + 0.8, false);
      add(scene, flatPlane, M.pool, x + toX(d.w) / 2, 0.07, z + toZ(d.h) / 2, toX(d.w), 1, toZ(d.h), false);
    } else if (d.k === 'canopy') {
      const w = toX(d.w), dd = toZ(d.h), g = new THREE.Group(); g.position.set(x + w / 2, 0, z + dd / 2); scene.add(g);
      d.mesh = g;
      const red = mat('#c8102e'), blk = mat('#151515');
      for (let k = 0; k < Math.floor(w / 1.4); k++) box(g, 1.3, 0.25, dd + 0.6, k % 2 ? red : blk, -w / 2 + 0.65 + k * 1.4, 3.1, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.08, 3, 0.08, M.chrome, sx * w / 2, 1.5, sz * dd / 2);
      for (let r = 0; r < 3; r++) for (let k = 0; k < Math.floor(w / 0.8); k++) {
        const cx = -w / 2 + 0.5 + k * 0.8, cz = -dd / 2 + 0.6 + r * 0.9;
        box(g, 0.45, 0.06, 0.45, mat('#e8e4dc'), cx, 0.48, cz); box(g, 0.45, 0.5, 0.06, mat('#e8e4dc'), cx, 0.75, cz + 0.22);
      }
    }
  }
  done(glowMesh, poleMesh, armMesh, lampHeads);

  function fancyCoffin(g, shape, s = 1) {
    if (shape === 'fish') {
      const body = loft([[-1.1, 0.02, 0.6, 0.62, 2.3], [-0.9, 0.12, 0.42, 0.78, 2.3], [-0.3, 0.3, 0.18, 1.02, 2.3], [0.4, 0.3, 0.2, 1.0, 2.3], [0.9, 0.16, 0.38, 0.82, 2.3], [1.1, 0.02, 0.58, 0.62, 2.3]], 18);
      const m = add(g, body, mat('#d2402c', {roughness: 0.4, metalness: 0.1}), 0, 0, 0, s, s, s);
      add(g, ballGeo, mat('#f2c94c'), 0.82 * s, 0.75 * s, 0.13 * s, 0.07 * s, 0.07 * s, 0.03 * s);
      add(g, ballGeo, mat('#f2c94c'), 0.82 * s, 0.75 * s, -0.13 * s, 0.07 * s, 0.07 * s, 0.03 * s);
      const tail = add(g, new THREE.ConeGeometry(0.42 * s, 0.6 * s, 3), mat('#c03524'), -1.25 * s, 0.6 * s, 0);
      tail.rotation.z = Math.PI / 2; tail.scale.z = 0.25;
      const fin = add(g, new THREE.ConeGeometry(0.25 * s, 0.7 * s, 3), mat('#e8b02a'), 0, 1.12 * s, 0);
      fin.scale.z = 0.2; fin.rotation.z = -0.4;
      return m;
    }
    if (shape === 'eagle') {
      add(g, loft([[-0.9, 0.05, 0.3, 0.4, 2.5], [-0.5, 0.3, 0.1, 0.8, 2.5], [0.4, 0.28, 0.1, 0.85, 2.5], [0.8, 0.08, 0.5, 0.9, 2.5]], 14), mat('#5a3a1e'), 0, 0, 0, s, s, s);
      for (const sd of [-1, 1]) {const w = add(g, boxGeo, mat('#3d2814'), 0, 0.75 * s, sd * 0.7 * s, 1.1 * s, 0.08 * s, 1.0 * s); w.rotation.x = sd * 0.3;}
      add(g, ballGeo, mat('#f4f1e8'), 0.85 * s, 0.95 * s, 0, 0.2 * s, 0.2 * s, 0.18 * s);
      add(g, new THREE.ConeGeometry(0.08 * s, 0.25 * s, 6), mat('#f2b705'), 1.06 * s, 0.92 * s, 0).rotation.z = -Math.PI / 2;
      return;
    }
    if (shape === 'car') {
      add(g, loft([[-1, 0.4, 0.15, 0.55, 4], [-0.6, 0.45, 0.12, 0.6, 4], [-0.3, 0.42, 0.12, 0.95, 4], [0.3, 0.42, 0.12, 0.95, 4], [0.5, 0.45, 0.12, 0.6, 4], [1, 0.4, 0.15, 0.5, 4]], 16), paint('#c7ccd1'), 0, 0, 0, s, s, s);
      for (const wx of [-0.6, 0.6]) for (const wz of [-0.42, 0.42]) {const t = add(g, cylGeo, M.tyre, wx * s, 0.15 * s, wz * s, 0.16 * s, 0.1 * s, 0.16 * s); t.rotation.x = Math.PI / 2;}
      return;
    }
    add(g, loft([[-0.8, 0.05, 0.35, 0.45, 2], [-0.4, 0.3, 0.1, 0.8, 2], [0.5, 0.3, 0.1, 0.8, 2], [0.9, 0.05, 0.4, 0.5, 2]], 14), mat('#3f7a2a'), 0, 0, 0, s, s, s);
    for (let k = 0; k < 4; k++) add(g, ballGeo, mat('#8b5a2b'), (-0.4 + k * 0.28) * s, 0.75 * s, 0, 0.14 * s, 0.1 * s, 0.14 * s);
  }

  /* ---------- vehicles ---------- */
  const vehicleTemplates = new Map();
  function wheelGeo(r, w) {
    const key = r + '|' + w;
    if (vehicleTemplates.has(key)) return vehicleTemplates.get(key);
    const pb = PartBuilder();
    pb.cyl('tyre', r, w, 0, 0, 0, Math.PI / 2);
    pb.cyl('rim', r * 0.62, w + 0.012, 0, 0, 0, Math.PI / 2);
    pb.cyl('trim', r * 0.66, w + 0.006, 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 5; k++) pb.box('trim', r * 0.95, 0.045, w + 0.02, 0, 0, 0, 0, 0, k * Math.PI / 5);
    pb.cyl('chrome', r * 0.18, w + 0.03, 0, 0, 0, Math.PI / 2);
    const out = pb.finish(); vehicleTemplates.set(key, out); return out;
  }
  function addCarDetails(pb, L, hw, opt) {
    const {front = 0.5, rear = -0.5, lampY = 0.7, tailY = 0.8, grille = 'trim', mirrorX = 0.17, mirrorY = 1.0, handles = [0.06, -0.16], seams = [0.17, -0.05, -0.27]} = opt;
    for (const s of [-1, 1]) {
      pb.ball('lightF', 0.04, 0.06, 0.17, L * front - 0.03, lampY, s * hw * 0.66);
      pb.ball('lightR', 0.035, 0.065, 0.17, L * rear + 0.02, tailY, s * hw * 0.7);
      pb.ball('amber', 0.03, 0.04, 0.06, L * front - 0.06, lampY - 0.02, s * hw * 0.88);
      pb.box('paint', 0.1, 0.08, 0.17, L * mirrorX, mirrorY, s * (hw + 0.06));
      pb.box('trim', 0.03, 0.06, 0.14, L * mirrorX - 0.05, mirrorY, s * (hw + 0.07));
      for (const hx of handles) pb.box('chrome', 0.13, 0.025, 0.02, L * hx, 0.87, s * hw * 0.99);
      for (const sx of seams) pb.box('trim', 0.012, 0.58, 0.006, L * sx, 0.63, s * hw * 0.995);
    }
    pb.box(grille, 0.04, 0.13, hw * 0.95, L * front - 0.02, 0.56, 0);
    pb.box('trim', 0.05, 0.09, hw * 1.3, L * front - 0.01, 0.41, 0);
    pb.box('trim', 0.05, 0.08, hw * 1.55, L * rear + 0.01, 0.45, 0);
    pb.cyl('chrome', 0.035, 0.12, L * rear - 0.02, 0.33, hw * 0.5, 0, 0, Math.PI / 2);
    pb.box('plate', 0.001, 0.001, 0.001, 0, 0, 0);
  }
  function arches(pb, wheels, hw) {
    const disc = new THREE.CircleGeometry(1, 16, 0, Math.PI);
    for (const w of wheels) for (const s of [-1, 1]) pb.geo('trim', disc, w.x, w.r, s * hw * 0.997, w.r + 0.07, w.r + 0.07, 1, 0, s > 0 ? 0 : Math.PI, 0);
  }
  function sedanTemplate(L, hw, variant) {
    const pb = PartBuilder();
    const hatch = variant === 'hatch';
    const lower = hatch
      ? [[-0.5, 0.82, 0.36, 0.95, 3], [-0.486, 0.93, 0.3, 1.0, 3.5], [-0.42, 0.98, 0.27, 1.02, 4.5], [0, 1, 0.26, 1.0, 5], [0.2, 0.99, 0.26, 0.95, 5], [0.36, 0.97, 0.27, 0.87, 4.5], [0.46, 0.92, 0.3, 0.79, 3.5], [0.5, 0.82, 0.36, 0.69, 3]]
      : [[-0.5, 0.8, 0.36, 0.8, 3], [-0.487, 0.92, 0.3, 0.93, 3.5], [-0.44, 0.97, 0.27, 0.99, 4.5], [-0.3, 0.99, 0.26, 1.0, 5], [0, 1, 0.26, 0.99, 5], [0.2, 0.99, 0.26, 0.95, 5], [0.36, 0.97, 0.27, 0.87, 4.5], [0.46, 0.92, 0.3, 0.79, 3.5], [0.5, 0.82, 0.36, 0.69, 3]];
    const glass = hatch
      ? [[-0.485, 0.84, 0.92, 1.02, 4], [-0.43, 0.82, 0.92, 1.4, 5], [0.05, 0.81, 0.92, 1.43, 5], [0.12, 0.83, 0.92, 1.4, 5], [0.31, 0.89, 0.86, 0.9, 4]]
      : [[-0.33, 0.86, 0.9, 0.99, 4], [-0.19, 0.81, 0.9, 1.4, 5], [0.05, 0.81, 0.9, 1.43, 5], [0.12, 0.83, 0.9, 1.4, 5], [0.31, 0.89, 0.86, 0.9, 4]];
    const roof = hatch
      ? [[-0.45, 0.74, 1.33, 1.405, 4], [-0.42, 0.76, 1.33, 1.43, 4], [0.06, 0.76, 1.33, 1.445, 4], [0.1, 0.75, 1.33, 1.425, 4]]
      : [[-0.2, 0.74, 1.33, 1.405, 4], [-0.17, 0.76, 1.33, 1.43, 4], [0.06, 0.76, 1.33, 1.445, 4], [0.1, 0.75, 1.33, 1.425, 4]];
    const sc = s => s.map(([u, w, yb, yt, e]) => [u * L, w * hw, yb, yt, e]);
    pb.loft('paint', sc(lower), 26); pb.loft('glass', sc(glass), 22); pb.loft('paint', sc(roof), 22);
    for (const s of [-1, 1]) {
      pb.rod('paint', L * 0.305, 0.9, L * 0.11, 1.41, s * hw * 0.74, 0.07, 0.06);
      if (hatch) pb.rod('paint', -L * 0.48, 1.0, -L * 0.43, 1.4, s * hw * 0.76, 0.14, 0.06);
      else pb.rod('paint', -L * 0.325, 0.98, -L * 0.185, 1.4, s * hw * 0.77, 0.15, 0.06);
    }
    pb.box('paint', 0.09, 0.48, hw * 1.62, -L * 0.04, 1.17, 0);
    const wheels = [{x: L * 0.31, r: 0.31, front: true}, {x: -L * 0.3, r: 0.31}];
    arches(pb, wheels, hw);
    addCarDetails(pb, L, hw, {tailY: hatch ? 0.86 : 0.82});
    const sticker = hatch ? [-L * 0.485, 1.02, -L * 0.43, 1.4, hw * 1.3, 0.16, 0.74] : [-L * 0.33, 0.99, -L * 0.19, 1.4, hw * 1.42, 0.21, 0.7];
    return {pb, wheels, hw, track: hw * 0.84, tyreW: 0.21, driver: [L * 0.0, 0.95, -hw * 0.42], lower: sc(lower), sticker, roofY: 1.45, hoodY: 0.93, hoodX: 0.28};
  }
  function trotroTemplate(L, hw) {
    const pb = PartBuilder();
    const sc = s => s.map(([u, w, yb, yt, e]) => [u * L, w * hw, yb, yt, e]);
    const lower = [[-0.5, 0.93, 0.4, 1.18, 5], [-0.49, 0.98, 0.36, 1.24, 6], [0.28, 0.99, 0.36, 1.24, 6], [0.38, 0.98, 0.37, 1.15, 5], [0.46, 0.93, 0.4, 1.0, 4], [0.5, 0.85, 0.46, 0.88, 3.5]];
    pb.loft('paint', sc(lower), 26);
    pb.loft('glass', sc([[-0.495, 0.955, 1.15, 2.2, 7], [0.28, 0.955, 1.15, 2.25, 7], [0.31, 0.95, 1.12, 2.18, 6], [0.42, 0.92, 1.0, 1.2, 5]]), 24);
    pb.loft('paint', sc([[-0.5, 0.965, 2.05, 2.42, 7], [0.27, 0.965, 2.05, 2.44, 7], [0.31, 0.95, 2.05, 2.3, 6]]), 24);
    pb.loft('accent', sc([[-0.494, 1.012, 1.0, 1.14, 6], [0.4, 1.012, 1.0, 1.14, 6]]), 20);
    for (const u of [-0.4, -0.22, -0.04, 0.14]) pb.box('paint', 0.11, 0.95, hw * 1.94, L * u, 1.68, 0);
    pb.box('paint', 0.16, 0.95, hw * 1.94, -L * 0.488, 1.68, 0);
    for (const s of [-1, 1]) {
      pb.rod('paint', L * 0.42, 1.02, L * 0.31, 2.2, s * hw * 0.92, 0.09, 0.07);
      pb.ball('lightF', 0.05, 0.09, 0.2, L * 0.495, 0.82, s * hw * 0.7);
      pb.box('lightR', 0.04, 0.38, 0.12, -L * 0.5, 1.0, s * hw * 0.86);
      pb.rod('trim', L * 0.42, 1.5, L * 0.45, 1.75, s * (hw + 0.12), 0.03);
      pb.box('trim', 0.05, 0.28, 0.16, L * 0.45, 1.6, s * (hw + 0.14));
      pb.box('chrome', 0.03, 1.1, 0.04, -L * 0.502, 1.85, s * hw * 0.62);
      pb.box('trim', L * 0.62, 0.06, 0.06, -L * 0.07, 2.52, s * hw * 0.7);
    }
    for (let k = 0; k < 4; k++) pb.box('trim', 0.05, 0.05, hw * 1.45, -L * 0.36 + k * L * 0.18, 2.52, 0);
    pb.box('trim', 0.04, 0.18, hw * 1.1, L * 0.5, 0.66, 0);
    pb.box('trim', 0.07, 0.14, hw * 1.9, L * 0.5, 0.45, 0);
    pb.box('trim', 0.07, 0.14, hw * 1.9, -L * 0.5, 0.45, 0);
    const wheels = [{x: L * 0.33, r: 0.36, front: true}, {x: -L * 0.28, r: 0.36}];
    arches(pb, wheels, hw);
    pb.box('plate', 0.001, 0.001, 0.001, 0, 0, 0);
    return {pb, wheels, hw, track: hw * 0.82, tyreW: 0.24, driver: [L * 0.3, 1.25, -hw * 0.45]};
  }
  function pickupTemplate(L, hw, coffin) {
    const pb = PartBuilder();
    const sc = s => s.map(([u, w, yb, yt, e]) => [u * L, w * hw, yb, yt, e]);
    pb.loft('paint', sc([[-0.5, 0.95, 0.4, 1.02, 5], [-0.49, 0.98, 0.36, 1.05, 6], [0.18, 0.99, 0.36, 1.05, 6], [0.3, 0.98, 0.37, 0.98, 5], [0.45, 0.93, 0.4, 0.88, 4], [0.5, 0.85, 0.46, 0.78, 3.5]]), 26);
    pb.loft('glass', sc([[-0.1, 0.9, 0.98, 1.05, 5], [-0.08, 0.88, 0.98, 1.62, 6], [0.07, 0.88, 0.98, 1.64, 6], [0.12, 0.89, 0.98, 1.6, 6], [0.3, 0.93, 0.95, 1.0, 5]]), 22);
    pb.loft('paint', sc([[-0.09, 0.82, 1.5, 1.61, 5], [-0.07, 0.83, 1.5, 1.645, 5], [0.08, 0.83, 1.5, 1.655, 5], [0.11, 0.82, 1.5, 1.63, 5]]), 22);
    pb.box('paint', 0.1, 0.6, hw * 1.7, -L * 0.095, 1.3, 0);
    for (const s of [-1, 1]) {
      pb.rod('paint', L * 0.3, 0.97, L * 0.115, 1.62, s * hw * 0.82, 0.08, 0.07);
      pb.box('paint', L * 0.39, 0.32, 0.06, -L * 0.305, 1.2, s * hw * 0.95);
      pb.box('chrome', L * 0.39, 0.03, 0.08, -L * 0.305, 1.37, s * hw * 0.95);
      pb.ball('lightF', 0.05, 0.08, 0.2, L * 0.49, 0.74, s * hw * 0.66);
      pb.box('lightR', 0.04, 0.26, 0.13, -L * 0.5, 0.9, s * hw * 0.84);
      pb.box('paint', 0.1, 0.08, 0.17, L * 0.12, 1.08, s * (hw + 0.06));
      pb.box('chrome', 0.13, 0.025, 0.02, L * 0.04, 0.88, s * hw * 0.99);
    }
    pb.box('paint', 0.06, 0.32, hw * 1.9, -L * 0.497, 1.2, 0);
    pb.box('trim', L * 0.38, 0.03, hw * 1.8, -L * 0.3, 1.06, 0);
    pb.box('chrome', 0.05, 0.2, hw * 1.2, L * 0.497, 0.62, 0);
    pb.box('trim', 0.07, 0.14, hw * 1.9, L * 0.5, 0.45, 0);
    pb.box('chrome', 0.07, 0.12, hw * 1.9, -L * 0.5, 0.48, 0);
    const wheels = [{x: L * 0.32, r: 0.37, front: true}, {x: -L * 0.3, r: 0.37}];
    arches(pb, wheels, hw);
    pb.box('plate', 0.001, 0.001, 0.001, 0, 0, 0);
    return {pb, wheels, hw, track: hw * 0.84, tyreW: 0.24, driver: [L * 0.0, 1.05, -hw * 0.42], coffin, sticker: [-L * 0.5 - 0.02, 1.1, -L * 0.5 - 0.02, 1.3, hw * 1.55, 0.24, 0.5], roofY: 1.66, hoodY: 0.99, hoodX: 0.3};
  }
  function okadaTemplate(L) {
    const pb = PartBuilder();
    pb.loft('paint', [[0.05, 0.05, 0.85, 0.95, 3], [0.15, 0.17, 0.78, 1.05, 3], [0.45, 0.15, 0.8, 1.0, 3], [0.55, 0.05, 0.88, 0.95, 3]], 14);
    pb.box('interior', 0.75, 0.1, 0.3, -0.3, 0.98, 0);
    pb.box('paint', 0.5, 0.14, 0.26, -0.75, 0.86, 0);
    pb.rod('trim', 0.6, 0.85, -0.65, 0.55, 0, 0.08);
    pb.rod('trim', 0.55, 1.0, 0.1, 0.55, 0, 0.07);
    pb.rod('chrome', 0.78, 0.3, 0.62, 1.15, 0.09, 0.04); pb.rod('chrome', 0.78, 0.3, 0.62, 1.15, -0.09, 0.04);
    pb.cyl('chrome', 0.025, 0.72, 0.62, 1.18, 0, Math.PI / 2);
    pb.ball('lightF', 0.07, 0.08, 0.09, 0.78, 1.08, 0);
    pb.box('lightR', 0.04, 0.06, 0.12, -1.0, 0.92, 0);
    pb.rod('chrome', -0.2, 0.5, -0.9, 0.55, 0.15, 0.06);
    pb.box('trim', 0.4, 0.25, 0.25, 0.05, 0.55, 0);
    pb.box('rack', 0.4, 0.03, 0.34, -1.0, 0.95, 0);
    pb.box('plate', 0.001, 0.001, 0.001, 0, 0, 0);
    return {pb, wheels: [{x: 0.78, r: 0.3, front: true}, {x: -0.72, r: 0.3}], hw: 0.2, track: 0, tyreW: 0.11, bike: true, sticker: [-1.07, 0.62, -1.07, 0.8, 0.34, 0.12, 0.5]};
  }
  function templateFor(v) {
    const L = v.len * U, W = v.wid * U, hw = W / 2;
    const variant = v.type === 'car' ? (v.variant || (v.id % 3 === 0 ? 'hatch' : 'sedan')) : '';
    const key = v.type + variant + L.toFixed(2) + W.toFixed(2);
    if (vehicleTemplates.has(key)) return vehicleTemplates.get(key);
    let t;
    if (v.type === 'okada') t = okadaTemplate(L);
    else if (v.type === 'trotro') t = trotroTemplate(L, hw);
    else if (v.type === 'pickup' || v.type === 'coffin') t = pickupTemplate(L, hw, v.type === 'coffin');
    else {
      t = sedanTemplate(L, hw, variant);
      if (v.type === 'taxi') {
        t.pb.loft('accent', sliceSections(t.lower, L * 0.3, L * 0.505, 1.025, 0.012).map(([u, w, yb, yt, e]) => [u + 0.01, w, yb, yt, e]), 26);
        t.pb.loft('accent', sliceSections(t.lower, -L * 0.505, -L * 0.33, 1.025, 0.012).map(([u, w, yb, yt, e]) => [u - 0.01, w, yb, yt, e]), 26);
        t.pb.box('accent', 0.34, 0.2, 0.62, -L * 0.05, 1.54, 0);
      }
      if (v.type === 'police') {
        t.pb.loft('accent', sliceSections(t.lower, -L * 0.36, L * 0.3, 1.02).map(([u, w]) => [u, w, 0.55, 0.7, 6]), 26);
        t.pb.box('trim', 0.4, 0.08, hw * 1.3, -L * 0.04, 1.49, 0);
        t.pb.box('sirenR', 0.3, 0.13, hw * 0.6, -L * 0.04, 1.58, -hw * 0.33);
        t.pb.box('sirenB', 0.3, 0.13, hw * 0.6, -L * 0.04, 1.58, hw * 0.33);
      }
      if (v.type === 'benz') {
        t.pb.box('chrome', 0.05, 0.2, hw * 0.75, L * 0.497, 0.6, 0);
        t.pb.geo('chrome', new THREE.TorusGeometry(0.06, 0.012, 6, 16), L * 0.44, 0.92, 0, 1, 1, 1, 0, Math.PI / 2, 0);
      }
    }
    t.geo = t.pb.finish(); delete t.pb;
    t.wheelGeo = wheelGeo(t.wheels[0].r, t.tyreW);
    vehicleTemplates.set(key, t); return t;
  }
  const sirenR = new THREE.MeshStandardMaterial({color: '#7a0a0a', emissive: '#ff1a1a', emissiveIntensity: 0.4});
  const sirenB = new THREE.MeshStandardMaterial({color: '#0a1a7a', emissive: '#2a5bff', emissiveIntensity: 0.4});
  const plateCache = new Map();
  function plateMaterial(text, commercial) {
    const key = `${text}|${commercial}`;
    if (plateCache.has(key)) return plateCache.get(key);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 144;
    const c = canvas.getContext('2d');
    c.fillStyle = commercial ? '#eecb27' : '#f4f4ee'; c.fillRect(0, 0, 512, 144);
    c.strokeStyle = '#252525'; c.lineWidth = 7; c.strokeRect(4, 4, 504, 136);
    c.fillStyle = '#bd2939'; c.fillRect(18, 25, 30, 27); c.fillStyle = '#e3b129'; c.fillRect(18, 52, 30, 27); c.fillStyle = '#197943'; c.fillRect(18, 79, 30, 27);
    c.fillStyle = '#171717'; c.font = 'bold 13px Arial'; c.fillText('GH', 20, 126);
    c.font = 'bold 66px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 285, 75);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = maxAniso;
    const material = new THREE.MeshStandardMaterial({map: texture, roughness: 0.5});
    plateCache.set(key, material); return material;
  }
  const sloganCache = new Map();
  function sloganMaterial(text) {
    if (sloganCache.has(text)) return sloganCache.get(text);
    const t = canvasTexture(512, 96, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.font = 'italic 900 52px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 8; c.strokeStyle = '#14100d'; c.strokeText(text, w / 2, h / 2); c.fillStyle = '#f2b705'; c.fillText(text, w / 2, h / 2);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({map: t, transparent: true}); sloganCache.set(text, m); return m;
  }
  // Back-window stickers: cut vinyl letters, the way Accra cars wear their faith and their warnings.
  const stickerCache = new Map();
  function stickerMaterial(text) {
    if (stickerCache.has(text)) return stickerCache.get(text);
    const h = [...text].reduce((a, c) => a + c.charCodeAt(0), 0), style = h % 3;
    const t = canvasTexture(512, 80, (c, w, hh) => {
      c.clearRect(0, 0, w, hh); c.font = `${style === 1 ? 'italic ' : ''}900 50px ${style === 2 ? 'Impact, Arial Black' : 'Georgia, serif'}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      let size = 50; while (c.measureText(text).width > 480 && size > 24) {size -= 2; c.font = c.font.replace(/\d+px/, size + 'px');}
      c.lineWidth = 9; c.strokeStyle = 'rgba(10,10,12,.9)'; c.strokeText(text, w / 2, hh / 2 + 2);
      c.fillStyle = ['#f4f1e8', '#f2b705', '#f4f1e8'][style]; c.fillText(text, w / 2, hh / 2 + 2);
      if (style === 0) {c.fillStyle = '#c8102e'; c.fillRect(w / 2 - 120, hh - 8, 80, 4); c.fillStyle = '#f2b705'; c.fillRect(w / 2 - 40, hh - 8, 80, 4); c.fillStyle = '#0a7a45'; c.fillRect(w / 2 + 40, hh - 8, 80, 4);}
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshStandardMaterial({map: t, transparent: true, alphaTest: 0.08, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.08});
    stickerCache.set(text, m); return m;
  }
  const RIMS = [M.rim, mat('#5b6066', {metalness: 0.8, roughness: 0.3}), mat('#151618', {metalness: 0.5, roughness: 0.45}), mat('#d4a62a', {metalness: 0.9, roughness: 0.2})];
  const barMat = mat('#1a1b1d', {metalness: 0.6, roughness: 0.4});
  // Upgrades show on the car: bull bar and rails for armour, scoop and exhausts for the engine, rims for tyres.
  function ownedExtras(v, t, body, L, slotMat) {
    const u = v.own.up, hw = t.hw;
    if (v.sticker && t.sticker) {
      const [x0, y0, x1, y1, w, h, k] = t.sticker, beta = Math.atan2(x1 - x0, y1 - y0);
      const g = new THREE.Group(); g.position.set(lerp(x0, x1, k) - Math.cos(beta) * 0.014, lerp(y0, y1, k) + Math.sin(beta) * 0.014, 0); g.rotation.z = -beta; body.add(g);
      add(g, planeGeo, stickerMaterial(v.sticker), 0, 0, 0, w, h, 1, false).rotation.y = -Math.PI / 2;
    }
    if (t.bike) {
      if (u.arm) for (const s of [-1, 1]) {const r = add(body, cylGeo, barMat, 0.42, 0.62, s * 0.22, 0.025, 0.5, 0.025); r.rotation.x = s * 0.35;}
      return;
    }
    if (u.arm >= 1) {
      box(body, 0.06, 0.4, hw * 1.45, barMat, L / 2 + 0.12, 0.6, 0);
      box(body, 0.07, 0.07, hw * 1.6, barMat, L / 2 + 0.15, 0.84, 0);
      for (const s of [-1, 1]) box(body, 0.2, 0.06, 0.06, barMat, L / 2 + 0.05, 0.84, s * hw * 0.55);
    }
    if (u.arm >= 2) for (const s of [-1, 1]) box(body, L * 0.46, 0.07, 0.1, barMat, -L * 0.01, 0.34, s * hw * 1.03);
    if (u.arm >= 3) {
      for (const s of [-1, 1]) box(body, L * 0.34, 0.05, 0.05, barMat, -L * 0.06, t.roofY + 0.08, s * hw * 0.62);
      for (let k = 0; k < 3; k++) box(body, 0.04, 0.05, hw * 1.3, barMat, -L * 0.2 + k * L * 0.14, t.roofY + 0.1, 0);
      for (const s of [-1.5, -0.5, 0.5, 1.5]) box(body, 0.1, 0.1, 0.16, M.lightF, L * 0.1, t.roofY + 0.16, s * hw * 0.32);
    }
    if (u.eng >= 2) box(body, 0.42, 0.07, 0.34, slotMat.paint, L * t.hoodX, t.hoodY + 0.03, 0);
    if (u.eng >= 3) for (const s of [-1, 1]) {const e = add(body, cylGeo, M.chrome, -L / 2 - 0.05, 0.32, s * hw * 0.45, 0.045, 0.16, 0.045); e.rotation.z = Math.PI / 2;}
  }
  const taxiCanvas = canvasTexture(256, 96, (c) => {c.fillStyle = '#edbd24'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#171510'; c.font = '900 66px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TAXI', 128, 51);});
  taxiCanvas.wrapS = taxiCanvas.wrapT = THREE.ClampToEdgeWrapping;
  const taxiSignMaterial = new THREE.MeshStandardMaterial({map: taxiCanvas, emissive: '#ffffff', emissiveMap: taxiCanvas, emissiveIntensity: 0.3});

  function vehicle(v) {
    const t = templateFor(v);
    const L = v.len * U;
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    const slotMat = {paint: paint(v.color || '#d4d1c8'), accent: paint(v.type === 'police' ? '#f4f4ee' : v.type === 'taxi' ? '#e9b52a' : (v.stripe || '#bf2d32')), glass: M.glass, trim: M.trim, chrome: M.chrome, lightF: M.lightF, lightR: M.lightROff, amber: M.amber, interior: M.interior, rack: M.chrome, plate: M.trim, sirenR, sirenB};
    const meshes = {};
    for (const [slot, geo] of Object.entries(t.geo)) {
      const m = new THREE.Mesh(geo, slotMat[slot] || M.trim); m.castShadow = slot !== 'glass' || true; m.receiveShadow = slot === 'paint' || slot === 'accent';
      body.add(m); meshes[slot] = m;
    }
    if (!t.bike) {
      const commercial = v.type === 'taxi' || v.type === 'trotro';
      const pm = plateMaterial(v.plate || 'GR 2146-24', commercial);
      for (const [x, y, ry] of [[L / 2 + 0.03, 0.55, Math.PI / 2], [-L / 2 - 0.03, 0.62, -Math.PI / 2]]) {
        const p = add(body, planeGeo, pm, x, y, 0, 0.52, 0.14, 1, false); p.rotation.y = ry;
      }
      if (v.type === 'taxi') for (const s of [-1, 1]) {const sgn = add(body, planeGeo, taxiSignMaterial, -L * 0.05, 1.54, s * 0.315, 0.3, 0.17, 1, false); sgn.rotation.y = s > 0 ? 0 : Math.PI;}
      if (v.type === 'trotro') {
        const sl = add(body, planeGeo, sloganMaterial(v.slogan || 'GOD DEY'), -L / 2 - 0.035, 1.95, 0, 1.7, 0.32, 1, false); sl.rotation.y = -Math.PI / 2;
        (v.lug || []).forEach((item, k) => box(body, 0.5, 0.3 + (k % 2) * 0.12, 0.42, mat(item[4]), -L * 0.3 + k * 0.62, 2.72, (k % 2 ? 0.3 : -0.3)));
      }
      if (t.coffin) {const cg = new THREE.Group(); cg.position.set(-L * 0.3, 0.85, 0); body.add(cg); fancyCoffin(cg, 'fish', 0.9);}
    }
    let doorPivot = null;
    if (v.type === 'taxi') {
      doorPivot = new THREE.Group();doorPivot.position.set(-L * 0.27, 0.72, t.hw + 0.015);body.add(doorPivot);
      box(doorPivot, L * 0.29, 0.58, 0.045, slotMat.paint, L * 0.145, 0, 0);
      box(doorPivot, 0.13, 0.035, 0.035, slotMat.chrome, L * 0.23, 0.17, 0.045);
    }
    if (v.own) ownedExtras(v, t, body, L, slotMat);
    // Driver silhouette, visible through the glass.
    let driver = null;
    if (t.driver) {
      driver = new THREE.Group(); driver.position.set(...t.driver); body.add(driver);
      add(driver, ballGeo, mat(v.driverShirt || rpick(['#c8102e', '#1d4fa3', '#f4f1e8', '#0a7a45', '#222'])), 0, 0.12, 0, 0.18, 0.24, 0.2, false);
      add(driver, ballGeo, mat('#4a2c1c'), 0.02, 0.45, 0, 0.1, 0.12, 0.1, false);
    }
    const rider = t.bike ? makeRider(v, body, false) : null;
    const wheels = [];
    for (const w of t.wheels) for (const s of t.bike ? [0] : [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(w.x, w.r, s * t.track); root.add(pivot);
      const spin = new THREE.Group(); pivot.add(spin);
      for (const [slot, geo] of Object.entries(t.wheelGeo)) {
        const m = new THREE.Mesh(geo, slot === 'tyre' ? M.tyre : slot === 'rim' ? RIMS[v.own ? v.own.up.tyre : 0] : slot === 'chrome' ? M.chrome : M.trim);
        m.castShadow = true; if (s < 0) m.rotation.y = Math.PI; spin.add(m);
      }
      wheels.push({pivot, spin, front: !!w.front, r: w.r, x: w.x, z: s * t.track});
    }
    const contact = add(root, flatPlane, M.contact, 0, 0.02, 0, L * 1.15, 1, (t.bike ? 0.6 : t.hw * 2.3), false);
    const cone = add(root, flatPlane, M.cone, L / 2 + 7, 0.05, 0, 14, 1, 7, false);
    cone.renderOrder = 2;
    root.userData = {t, body, wheels, meshes, driver, rider, doorPivot, cone, roll: 0, pitch: 0, pitchV: 0, rollV: 0, bounce: 0, y: 0.03, spin: 0, lastX: v.x, lastY: v.y, look: v.look || 0};
    scene.add(root); return root;
  }
  function makeRider(v, body, isPlayer) {
    const rider = isPlayer ? person({skin: '#4f2f1f'}, true, body) : person({skin: '#4a2c1c', c1: v.rider || '#ab2b2b', c2: '#2a2d33', kind: 'man'}, false, body);
    rider.position.set(-0.35, 0.18, 0);
    const parts = rider.userData.parts;
    for (let i = 0; i < 2; i++) {parts.hips[i].rotation.z = 1.35; parts.knees[i].rotation.z = -1.6; parts.feet[i].rotation.z = 0.25; parts.arms[i].shoulder.rotation.z = 0.95; parts.arms[i].elbow.rotation.z = 0.5;}
    parts.body.rotation.z = -0.2;
    rider.userData.isPlayer = isPlayer;
    return rider;
  }
  function updateVehicle(v, mesh, dt) {
    const u = mesh.userData;
    if(u.doorPivot)u.doorPivot.rotation.y += ((v.doorOpen?-1.15:0)-u.doorPivot.rotation.y)*Math.min(1,dt*9);
    if (u.rider && u.rider.userData.isPlayer !== (v === PL.veh)) {u.body.remove(u.rider); u.rider = makeRider(v, u.body, v === PL.veh);}
    const gy = groundHeight(v.x, v.y);
    const dy = gy - u.y; u.y += dy * Math.min(1, dt * 14);
    if (Math.abs(dy) > 0.06 && Math.abs(v.f || 0) > 40) u.bounce += 0.06;
    mesh.position.set(toX(v.x), u.y, toZ(v.y)); mesh.rotation.y = -v.a;
    // Suspension: a damped spring towards the load the physics reports.
    const k = 60, c = 9;
    const pitchT = clamp((v.longA || 0) * 0.00011, -0.06, 0.05) * (u.t.bike ? 0.4 : 1);
    const rollT = u.t.bike ? clamp((v.latA || 0) * 0.0012, -0.6, 0.6) : clamp(-(v.latA || 0) * 0.00009, -0.07, 0.07) * (v.type === 'trotro' ? 1.5 : 1);
    u.pitchV += ((pitchT - u.pitch) * k - u.pitchV * c) * dt; u.pitch += u.pitchV * dt;
    u.rollV += ((rollT - u.roll) * k - u.rollV * c) * dt; u.roll += u.rollV * dt;
    u.bounce *= Math.exp(-dt * 6);
    const rough = at(Math.floor(v.x / T), Math.floor(v.y / T)) !== TILE.RD ? 0.012 : 0.002;
    const shakeY = Math.sin(S.t * 31 + v.id) * rough * clamp(Math.abs(v.f || 0) / 200, 0, 1) + Math.sin(S.t * 9) * u.bounce * 0.4;
    u.body.rotation.set(u.roll, 0, u.pitch);
    u.body.position.y = shakeY + (v.hp <= 0 ? -0.08 : 0);
    if (u.rider) u.body.rotation.x = u.roll;
    u.spin -= (v.f || 0) * dt * U;
    for (const w of u.wheels) {
      w.spin.rotation.z = u.spin / w.r;
      if (w.front) w.pivot.rotation.y = -(v.st || 0);
    }
    if (u.meshes.lightR) u.meshes.lightR.material = v.brake ? M.lightROn : M.lightROff;
    if (u.meshes.sirenR) {const on = v.mode === 'police' && S.wanted > 0, ph = (S.t * 4 | 0) % 2; sirenR.emissiveIntensity = on && ph ? 4 : 0.4; sirenB.emissiveIntensity = on && !ph ? 4 : 0.4;}
    if (u.driver) u.driver.visible = !!v.driver;
    if (u.rider) u.rider.visible = !!v.driver;
    u.cone.visible = night > 0.05 && v.hp > 0 && (!!v.driver || v === PL.veh);
    // Skid marks and tyre smoke.
    const slip = v.slip || 0, braking = v.brake && Math.abs(v.f || 0) > 160 && (v.brakeHard || 0) > 0;
    if ((slip > 85 || braking) && !u.t.bike) {
      const ca = Math.cos(v.a), sa = Math.sin(v.a);
      for (const w of u.wheels) {
        if (w.front && !braking) continue;
        const wx = toX(v.x) + ca * w.x - sa * w.z, wz = toZ(v.y) + sa * w.x + ca * w.z;
        addSkid(wx, u.y + 0.012, wz, v.a, Math.max(0.25, Math.abs(v.f || 0) * dt * U * 1.2));
        if (slip > 120 && Math.random() < 0.35) puff(wx, u.y + 0.2, wz, 0.9 + Math.random() * 0.6, [0.86, 0.85, 0.83], 1.2, 0.5);
      }
    }
    if (v.offroad && Math.abs(v.f || 0) > 120 && Math.random() < 0.3) {
      const ca = Math.cos(v.a), sa = Math.sin(v.a);
      puff(toX(v.x) - ca * L2(v), u.y + 0.2, toZ(v.y) - sa * L2(v), 1.2, [0.66, 0.5, 0.4], 1.1, 0.8);
    }
  }
  const L2 = v => v.len * U * 0.5;
  // Stripped car shells waiting for parts in the Abossey Okai yard.
  for (const d of decor) if (d.k === 'carcass') {
    const t = templateFor({type: 'car', len: 46, wid: 18, id: 1, variant: 'sedan'}), g = new THREE.Group();
    g.position.set(toX(d.x), 0.22, toZ(d.y)); g.rotation.set(0.04, -(d.a || 0), 0); scene.add(g);
    const rust = mat('#7a4a2e', {roughness: 0.95, metalness: 0.2});
    for (const [slot, geo] of Object.entries(t.geo)) if (slot === 'paint' || slot === 'trim') add(g, geo, slot === 'paint' ? rust : M.trim);
    for (const x of [-1.3, 1.3]) for (const z of [-0.6, 0.6]) box(g, 0.35, 0.35, 0.35, M.concrete, x, -0.05, z);
  }

  /* ---------- skid marks & particles ---------- */
  const SKIDS = 2400;
  const skids = new THREE.InstancedMesh(flatPlane, new THREE.MeshBasicMaterial({color: '#141414', transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}), SKIDS);
  skids.count = 0; skids.frustumCulled = false; skids.renderOrder = 1; scene.add(skids);
  let skidHead = 0;
  function addSkid(x, y, z, a, len) {
    dummy.position.set(x, y, z); dummy.rotation.set(0, -a, 0); dummy.scale.set(len, 1, 0.2); dummy.updateMatrix();
    skids.setMatrixAt(skidHead, dummy.matrix); skidHead = (skidHead + 1) % SKIDS; skids.count = Math.max(skids.count, skidHead === 0 ? SKIDS : skidHead);
    skids.instanceMatrix.needsUpdate = true;
  }
  const MAXP = 700, pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3), pSize = new Float32Array(MAXP), pAlpha = new Float32Array(MAXP);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1)); pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: {map: {value: TX.radial}, scale: {value: 400}},
    vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC; uniform float scale; void main(){ vA=alpha; vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.5,-mv.z); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC, t.a*vA); }',
  });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; points.renderOrder = 3; scene.add(points);
  const fx = [];
  function puff(x, y, z, size, col, life, rise) {if (fx.length < 400) fx.push({x, y, z, size, col, life, max: life, rise, vx: (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6});}
  const colCache = new Map();
  function parseRgba(s) {
    if (colCache.has(s)) return colCache.get(s);
    const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(s || ''); const c = m ? [m[1] / 255, m[2] / 255, m[3] / 255] : [0.6, 0.6, 0.6];
    colCache.set(s, c); return c;
  }
  function updateParticles(parts, dt) {
    let n = 0;
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i]; p.life -= dt; if (p.life <= 0) {fx.splice(i, 1); continue;}
      p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.rise * dt;
      if (n >= MAXP) continue;
      const a = p.life / p.max;
      pPos.set([p.x, p.y, p.z], n * 3); pCol.set(p.col, n * 3); pSize[n] = p.size * (1.8 - a); pAlpha[n] = a * 0.45; n++;
    }
    for (const p of parts) {
      if (n >= MAXP) break;
      const a = p.life / p.max, c = parseRgba(p.c);
      pPos.set([toX(p.x), 0.6 + (1 - a) * (p.rise ? 2.4 : 0.6), toZ(p.y)], n * 3); pCol.set(c, n * 3); pSize[n] = p.size * U * 2.2 * (1.6 - a); pAlpha[n] = a * 0.6; n++;
    }
    pGeo.setDrawRange(0, n);
    for (const k of ['position', 'color', 'size', 'alpha']) pGeo.attributes[k].needsUpdate = true;
  }

  /* ---------- people ---------- */
  const realPedTemplates = {};
  for (const [key, folder, file] of [
    ['male', 'rocketbox-male-12', 'Male_Adult_12'],
    ['maleB', 'rocketbox-male-04', 'Male_Adult_04'],
    ['maleC', 'rocketbox-male-08', 'Male_Adult_08'],
    ['womanA', 'rocketbox-female-11', 'Female_Adult_11'],
    ['womanB', 'rocketbox-female-01', 'Female_Adult_01']
  ]) {
    const path = 'assets/characters/' + folder + '/';
    const manager = new THREE.LoadingManager(); let pending = null;
    manager.onLoad = () => {if (pending) realPedTemplates[key] = pending;};
    manager.addHandler(/\.tga$/i, {
      setPath() {return this;},
      load(url) {return new THREE.TextureLoader(manager).load(path + url.split(/[\\/]/).pop().replace(/\.tga$/i, '.webp'));}
    });
    new THREE.FBXLoader(manager).load(path + file + '.fbx', model => {
      const bounds = new THREE.Box3().setFromObject(model);
      if (!Number.isFinite(bounds.min.y) || bounds.max.y - bounds.min.y < 1) return;
      model.userData.height = bounds.max.y - bounds.min.y;
      model.userData.floor = bounds.min.y;
      model.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true; node.receiveShadow = false;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          material.color.set('#ffffff'); material.roughness = 0.85;
          if (material.name.includes('opacity')) {material.side = THREE.DoubleSide; material.depthWrite = false;}
        }
      });
      pending = model;
    }, undefined, error => console.warn('Detailed pedestrian unavailable:', file, error));
  }
  // Rocketbox mocap on the same Bip01 skeleton; until it loads, the hand-posed gait below is used.
  let realClips = null;
  fetch('assets/characters/animations/rocketbox-anims.json').then(r => r.json()).then(data => {
    const clips = {};
    for (const [key, c] of Object.entries(data)) {
      const tracks = [new THREE.VectorKeyframeTrack('Bip01.position', c.t, c.root)];
      for (const bone in c.q) tracks.push(new THREE.QuaternionKeyframeTrack(bone + '.quaternion', c.t, c.q[bone]));
      clips[key] = Object.assign(new THREE.AnimationClip(key, c.d, tracks), {stride: c.stride, off: c.off || 0});
    }
    realClips = clips;
  }).catch(error => console.warn('Character animations unavailable:', error));
  function realActions(mesh) {
    const u = mesh.userData;
    if (u.acts || !realClips) return u.acts;
    const g = u.realKey.startsWith('woman') ? 'F' : 'M', mixer = new THREE.AnimationMixer(mesh.children[0]), acts = {mixer, phase: Math.random(), talk: 0};
    for (const k of ['idle', 'walk', 'run', 'talk']) {const a = acts[k + 'A'] = mixer.clipAction(realClips[k + g]); a.setEffectiveWeight(0); a.play();}
    // Walk and run follow the distance covered, not the clock, so feet don't slide.
    acts.walkA.timeScale = acts.runA.timeScale = 0;
    acts.idleA.time = Math.random() * acts.idleA.getClip().duration;
    return u.acts = acts;
  }
  function realPerson(key, parent = scene) {
    const template = realPedTemplates[key];
    const group = new THREE.Group();
    const model = THREE.cloneSkeleton(template);
    const scale = 1.96 / template.userData.height;
    model.scale.setScalar(scale);
    model.position.y = -template.userData.floor * scale;
    model.rotation.y = Math.PI / 2;
    group.add(model);
    const bones = {};
    model.traverse(node => {if (node.isBone) bones[node.name] = {node, base: node.rotation.clone()};});
    if (parent === scene) {const shadow = new THREE.Mesh(flatPlane, M.contact);
      shadow.scale.set(0.8, 1, 0.8); shadow.position.y = 0.02; group.add(shadow);}
    group.userData.realBones = bones; group.userData.realTemplate = template; group.userData.realKey = key;
    parent.add(group);
    return group;
  }
  function animateRealPerson(p, mesh, active, dt) {
    const gy = groundHeight(p.x, p.y);
    mesh.position.set(toX(p.x), gy, toZ(p.y)); mesh.rotation.y = -p.a;
    const acts = realActions(mesh);
    if (acts) {
      const u = mesh.userData, step = u.lx == null ? 0 : Math.min(Math.hypot(p.x - u.lx, p.y - u.ly), 80 * dt); u.lx = p.x; u.ly = p.y;
      u.speed = (u.speed || 0) + ((active && dt > 0 ? step / dt : 0) - (u.speed || 0)) * (1 - Math.exp(-dt * 10));
      const walk = acts.walkA.getClip(), run = acts.runA.getClip(), pxPerCm = 1.96 / U / u.realTemplate.userData.height;
      // Game walk is 20 px/s and run 36 px/s; blend between them by actual speed.
      const r = clamp((u.speed - 22) / 12, 0, 1), m = clamp(u.speed / 5, 0, 1);
      acts.phase = (acts.phase + step / (lerp(walk.stride, run.stride, r) * pxPerCm)) % 1;
      acts.walkA.time = acts.phase * walk.duration; acts.runA.time = (acts.phase + run.off) % 1 * run.duration;
      acts.talk += ((p.talking ? 1 : 0) - acts.talk) * (1 - Math.exp(-dt * 4));
      acts.walkA.setEffectiveWeight(m * (1 - r)); acts.runA.setEffectiveWeight(m * r);
      acts.talkA.setEffectiveWeight((1 - m) * acts.talk); acts.idleA.setEffectiveWeight((1 - m) * (1 - acts.talk));
      acts.mixer.update(dt);
    } else {
    const bones = mesh.userData.realBones;
    const gait = mesh.userData.gait = (mesh.userData.gait || 0) + ((active ? 1 : 0) - (mesh.userData.gait || 0)) * (1 - Math.exp(-dt * 8));
    const phase = p.ph || 0, swing = Math.sin(phase) * gait;
    const pose = (name, axis, angle) => {const part = bones['Bip01_' + name]; if (part) part.node.rotation[axis] = part.base[axis] + angle;};
    pose('L_Thigh', 'z', swing * 0.42); pose('R_Thigh', 'z', -swing * 0.42);
    pose('L_Calf', 'z', Math.max(0, -swing) * 0.45); pose('R_Calf', 'z', Math.max(0, swing) * 0.45);
    // Bring the source model's A-pose arms alongside the dress before swinging.
    pose('L_UpperArm', 'x', -0.12); pose('R_UpperArm', 'x', 0.12);
    pose('L_UpperArm', 'y', 0.72); pose('R_UpperArm', 'y', -0.72);
    pose('L_UpperArm', 'z', -swing * 0.24); pose('R_UpperArm', 'z', swing * 0.24);
    pose('Spine', 'z', Math.sin(phase * 2) * gait * 0.025);
    pose('Head','z',p.talking?Math.sin(performance.now()*0.009)*0.045:0);
    const template = mesh.userData.realTemplate;
    mesh.children[0].position.y = -template.userData.floor * (1.96 / template.userData.height) + (1 - Math.cos(phase * 2)) * gait * 0.012;
    }
    if (p.state === 'down') {mesh.rotation.z = Math.PI / 2; mesh.position.y = gy + 0.25;}
    else mesh.rotation.z = 0;
  }
  const capsule = (r, l) => {const k = r.toFixed(3) + l.toFixed(3); if (!vehicleTemplates.has(k)) vehicleTemplates.set(k, new THREE.CapsuleGeometry(r, l, 3, 8)); return vehicleTemplates.get(k);};
  const printMats = prints.map(t => new THREE.MeshStandardMaterial({map: t, roughness: 0.9}));
  function cloth(color, printIndex) {return printIndex != null ? printMats[printIndex % printMats.length] : mat(color);}
  function person(p, player = false, parent = scene) {
    const group = new THREE.Group();
    const seedN = Math.abs(Math.floor((p.x || 1) * 13 + (p.y || 1) * 7 + (p.ph || 0) * 100)) || ((Math.random() * 997) | 0);
    const woman = p.kind === 'woman' || p.wrap;
    const usePrint = !player && (woman ? seedN % 10 < 3 : seedN % 10 < 2);
    const skin = mat(p.skin || '#573621', {roughness: 0.7});
    const shirt = player ? mat('#253756') : cloth(p.c1 || '#a93430', usePrint ? seedN : null);
    const trousers = player ? mat('#2b2d30') : mat(p.c2 || '#30353b');
    const hairM = mat('#141110', {roughness: 1});
    const body = new THREE.Group(); body.scale.setScalar(p.kind === 'kid' ? 0.72 : 0.96 + (seedN % 9) * 0.012); group.add(body);
    // torso and hips
    add(body, capsule(0.17, 0.3), shirt, 0, 1.33, 0, 0.86, 1, 1.15);
    add(body, ballGeo, shirt, 0, 1.49, 0, 0.18, 0.095, 0.25);
    add(body, ballGeo, trousers, 0, 1.0, 0, 0.15, 0.13, 0.18);
    add(body, cylGeo, skin, 0, 1.66, 0, 0.055, 0.12, 0.055);
    add(body, ballGeo, skin, 0.01, 1.8, 0, 0.112, 0.14, 0.105);
    // The face points along local +X, the same direction used by walking.
    add(body, ballGeo, skin, 0.14, 1.775, 0, 0.032, 0.038, 0.025);
    for (const side of [-1, 1]) {
      add(body, ballGeo, skin, 0.014, 1.79, side * 0.106, 0.022, 0.044, 0.021);
      if (player || p.name) {
        add(body, ballGeo, mat('#b79a83'), 0.119, 1.818, side * 0.047, 0.014, 0.012, 0.016);
        add(body, ballGeo, M.dark, 0.132, 1.818, side * 0.047, 0.006, 0.008, 0.009);
      } else add(body, ballGeo, M.dark, 0.119, 1.818, side * 0.046, 0.008, 0.01, 0.011);
      add(body, ballGeo, shirt, 0, 1.51, side * 0.18, 0.095, 0.095, 0.09);
    }
    add(body, ballGeo, hairM, -0.045, 1.89, 0, 0.09, 0.035, 0.102);
    if (woman && seedN % 3 !== 2) {
      const wrapM = cloth(p.c1, seedN + 3);
      add(body, ballGeo, wrapM, -0.01, 1.9, 0, 0.14, 0.11, 0.135);
      const knot = add(body, ballGeo, wrapM, -0.04, 2.0, 0, 0.09, 0.07, 0.12); knot.rotation.z = 0.4;
    } else if (seedN % 5 === 0 && !woman) {
      add(body, ballGeo, mat(rpick(['#c8102e', '#14100d', '#1d4fa3', '#f4f1e8'])), 0, 1.9, 0, 0.12, 0.06, 0.12);
      add(body, boxGeo, mat('#14100d'), 0.11, 1.89, 0, 0.13, 0.02, 0.17);
    } else add(body, ballGeo, hairM, -0.01, 1.87, 0, 0.115, 0.075, 0.11);
    if (player) {
      const bag = add(body, boxGeo, mat('#b7352b'), -0.19, 1.25, 0.2, 0.12, 0.38, 0.3); bag.rotation.x = -0.15;
      const strap = add(body, boxGeo, mat('#2d211d'), -0.08, 1.5, 0.12, 0.025, 0.55, 0.025); strap.rotation.x = 0.55;
      add(body, boxGeo, mat('#e9e4da'), 0.12, 1.42, 0, 0.02, 0.22, 0.1);
    }
    const parts = {hips: [], knees: [], feet: [], arms: [], body, gait: 0};
    for (const side of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(0, 0.96, side * 0.1); body.add(hip);
      add(hip, capsule(0.075, 0.3), trousers, 0, -0.22, 0);
      const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
      add(knee, ballGeo, p.shorts ? skin : trousers, 0, 0, 0, 0.075, 0.09, 0.075);
      add(knee, capsule(0.06, 0.32), p.shorts ? skin : trousers, 0, -0.22, 0);
      const foot = new THREE.Group(); foot.position.y = -0.45; knee.add(foot);
      add(foot, ballGeo, player ? mat('#e9e4da') : M.dark, 0.065, -0.03, 0, 0.15, 0.055, 0.075);
      parts.hips.push(hip); parts.knees.push(knee); parts.feet.push(foot);
      const arm = new THREE.Group(); arm.position.set(0, 1.55, side * 0.215); body.add(arm);
      add(arm, ballGeo, shirt, 0, -0.04, 0, 0.09, 0.1, 0.085);
      add(arm, capsule(0.058, 0.16), shirt, 0, -0.1, 0);
      add(arm, capsule(0.045, 0.12), player ? shirt : skin, 0, -0.25, 0);
      const elbow = new THREE.Group(); elbow.position.y = -0.33; arm.add(elbow);
      add(elbow, capsule(0.042, 0.22), player ? mat('#253756') : skin, 0, -0.14, 0);
      add(elbow, ballGeo, skin, 0, -0.31, 0, 0.05, 0.065, 0.045);
      parts.arms.push({shoulder: arm, elbow});
    }
    if (woman) {
      const skirt = add(body, new THREE.CylinderGeometry(0.2, 0.29, 0.72, 14, 1, true), cloth(p.c2 || p.c1, seedN + 1), 0, 0.72, 0);
      skirt.material = skirt.material.clone(); skirt.material.side = THREE.DoubleSide;
    }
    if (p.kind === 'hawker') {
      add(body, cylGeo, mat('#c9c2b0', {metalness: 0.6, roughness: 0.3}), 0, 2.02, 0, 0.34, 0.06, 0.34);
      for (let k = 0; k < 5; k++) add(body, ballGeo, mat(p.item?.[1] || '#e2c274'), -0.15 + (k % 3) * 0.15, 2.1, (k < 3 ? -0.08 : 0.1), 0.09, 0.08, 0.09);
      parts.hawker = true;
    }
    if (p.bag && !player) add(body, boxGeo, mat('#66503d'), -0.18, 1.26, 0.16, 0.12, 0.32, 0.26);
    if (p.name || player) parts.mouth = add(body, ballGeo, mat('#432019'), 0.13, 1.735, 0, 0.007, 0.008, 0.026);
    group.traverse(o => {if (o.isMesh) {o.castShadow = true; o.receiveShadow = false;}});
    const shadow = new THREE.Mesh(flatPlane, M.contact); shadow.scale.set(0.8, 1, 0.8); shadow.position.y = 0.02; group.add(shadow);
    group.userData.parts = parts;
    parent.add(group); return group;
  }
  function goat(p) {
    const g = new THREE.Group(); const coat = mat(p.c1 || '#eee8d6');
    add(g, ballGeo, coat, 0, 0.62, 0, 0.45, 0.28, 0.21);
    add(g, ballGeo, coat, 0.45, 0.86, 0, 0.17, 0.15, 0.13);
    add(g, new THREE.ConeGeometry(0.03, 0.18, 5), M.dark, 0.43, 1.05, 0.06); add(g, new THREE.ConeGeometry(0.03, 0.18, 5), M.dark, 0.43, 1.05, -0.06);
    const legs = [];
    for (const x of [-0.3, 0.32]) for (const z of [-0.12, 0.12]) {const l = new THREE.Group(); l.position.set(x, 0.5, z); g.add(l); add(l, boxGeo, coat, 0, -0.24, 0, 0.07, 0.48, 0.07); legs.push(l);}
    g.userData.legs = legs;
    scene.add(g); return g;
  }
  function animatePerson(p, mesh, active, dt) {
    const gy = groundHeight(p.x, p.y);
    mesh.position.set(toX(p.x), gy, toZ(p.y)); mesh.rotation.y = -p.a;
    const parts = mesh.userData.parts; if (!parts) return;
    const gait = mesh.userData.gait = (mesh.userData.gait || 0) + ((active ? 1 : 0) - (mesh.userData.gait || 0)) * (1 - Math.exp(-dt * 10));
    const phase = p.ph || 0, bob = 0.026 * gait * (1 - Math.cos(phase * 2));
    const run = p.state === 'flee' || (p === PL && PL.running);
    parts.body.position.y = bob;
    parts.body.rotation.z = -Math.sin(phase) * 0.018 * gait - (run ? 0.12 * gait : 0);
    for (let i = 0; i < 2; i++) {
      let step = (phase + i * Math.PI) % (Math.PI * 2); if (step < 0) step += Math.PI * 2;
      const stride = (run ? 0.62 : 0.43) * gait;
      let footX, footY = 0.065;
      if (step < Math.PI) footX = stride * (0.5 - step / Math.PI);
      else {const t = (step - Math.PI) / Math.PI, s = t * t * (3 - 2 * t); footX = stride * (-0.5 + s); footY += (run ? 0.26 : 0.18) * gait * Math.sin(t * Math.PI);}
      const hipY = 0.96 + bob, dx = footX, dy = footY - hipY;
      const upper = 0.46, lower = 0.45, d = Math.min(upper + lower - 0.003, Math.max(0.08, Math.hypot(dx, dy)));
      const along = (upper * upper - lower * lower + d * d) / (2 * d), rise = Math.sqrt(Math.max(0, upper * upper - along * along));
      const ux = dx / d, uy = dy / d, kneeX = ux * along - uy * rise, kneeY = hipY + uy * along + ux * rise;
      const thigh = Math.atan2(kneeX, hipY - kneeY), shin = Math.atan2(footX - kneeX, kneeY - footY);
      parts.hips[i].rotation.z = thigh; parts.knees[i].rotation.z = shin - thigh; parts.feet[i].rotation.z = -shin;
      const arm = parts.arms[i];
      arm.shoulder.rotation.set(0, 0, -Math.sin(step) * (run ? 0.7 : 0.34) * gait);
      arm.elbow.rotation.z = 0.12 + Math.max(0, -Math.sin(step)) * (run ? 0.9 : 0.15) * gait + (run ? 0.6 : 0);
    }
    const side = [-1, 1];
    if (parts.hawker) for (let i = 0; i < 2; i++) {parts.arms[i].shoulder.rotation.x = -side[i] * 2.75; parts.arms[i].elbow.rotation.z = 0.2;}
    else if (p.wave) {const a = parts.arms[1]; a.shoulder.rotation.x = -2.5; a.elbow.rotation.z = 0.5 + Math.sin(S.t * 9) * 0.45;}
    else if (p.activity === 'phone' && !active) {const a = parts.arms[1]; a.shoulder.rotation.set(0.25, 0, 0.55); a.elbow.rotation.z = 2.45;}
    if(p.talking){const t=Math.sin(performance.now()*0.013);parts.body.rotation.z=t*0.025;parts.arms[0].shoulder.rotation.z=-0.16+t*0.08;if(parts.mouth)parts.mouth.scale.y=1.5+Math.abs(t)*2}
    if (p.state === 'down') {mesh.rotation.z = Math.PI / 2; mesh.position.y = gy + 0.25;}
    else mesh.rotation.z = 0;
  }

  /* ---------- markers ---------- */
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
  function makeBeam() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({map: TX.beam, color: '#f5b300', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false}));
    b.scale.set(1.1, 40, 1.1); b.position.y = 20; g.add(b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.1, 8, 40), new THREE.MeshBasicMaterial({color: '#f5b300', transparent: true, opacity: 0.9}));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({transparent: true, depthTest: false, fog: false}));
    label.position.y = 4.4; label.renderOrder = 20; g.add(label);
    g.userData = {beam: b, ring, label, text: ''};
    scene.add(g); return g;
  }
  const labelCache = new Map();
  function labelTexture(text, color) {
    const key = text + color; if (labelCache.has(key)) return labelCache.get(key);
    const t = canvasTexture(512, 128, (c, w, h) => {
      c.font = '800 44px "Bricolage Grotesque", Arial'; const tw = Math.min(480, c.measureText(text).width + 50);
      c.fillStyle = 'rgba(20,16,13,.85)'; c.beginPath(); c.roundRect((w - tw) / 2, 22, tw, 74, 37); c.fill();
      c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, 61);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; labelCache.set(key, t); return t;
  }
  const beams = [];
  const arrow = (() => {
    const s = new THREE.Shape(); s.moveTo(0.9, 0); s.lineTo(-0.5, 0.6); s.lineTo(-0.2, 0); s.lineTo(-0.5, -0.6); s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, {depth: 0.12, bevelEnabled: false}).rotateX(Math.PI / 2).scale(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({color: '#f5b300', transparent: true, opacity: 0.85, depthTest: false}));
    m.renderOrder = 30; scene.add(m); return m;
  })();
  function syncMarkers(list) {
    while (beams.length < list.length) beams.push(makeBeam());
    beams.forEach((g, i) => {
      const mk = list[i]; g.visible = !!mk; if (!mk) return;
      const {beam, ring, label} = g.userData;
      g.position.set(toX(mk.x), groundHeight(mk.x, mk.y), toZ(mk.y));
      const r = (mk.r || 50) * U;
      ring.scale.setScalar(r / 1.8); ring.position.y = 0.2 + Math.sin(S.t * 3 + i) * 0.08;
      const bw = mk.kind === 'giver' ? 0.9 : mk.kind === 'goto' ? r * 0.5 : 0.22;
      beam.scale.set(bw, mk.kind === 'giver' ? 60 : 40, bw); beam.material.opacity = mk.kind === 'goto' || mk.kind === 'giver' ? 0.55 : 0.8;
      ring.visible = mk.kind !== 'veh' && mk.kind !== 'target';
      beam.position.y = beam.scale.y / 2;
      beam.material.color.set(mk.color); ring.material.color.set(mk.color);
      const key = (mk.label || '') + mk.color;
      label.visible = !!mk.label;
      if (mk.label && g.userData.text !== key) {g.userData.text = key; label.material.map = labelTexture(mk.label, mk.color); label.material.needsUpdate = true;}
      const dd = camera.position.distanceTo(g.position);
      label.scale.set(clamp(dd * 0.09, 2.4, 12), clamp(dd * 0.09, 2.4, 12) / 4, 1);
      label.position.y = Math.min(4 + dd * 0.05, 14);
    });
  }

  /* ---------- camera ---------- */
  const pedMeshes = new Map(), dialogMeshes = new Map(), vehicleMeshes = new Map();
  let player = person({skin: '#4f2f1f'}, true);
  let dialogPlayer = person({skin: '#4f2f1f'}, true, dialogScene);
  let detailedPeds = new Set(), detailTick = 0;
  const personKey = p => {
    if (p.kind === 'kid' || p.kind === 'goat') return null;
    if (p.name === 'Uncle Fiifi') return 'maleB';
    if (p.name === 'Auntie Naa' || p.name === 'Maame Adwoa') return 'womanB';
    let n = Math.floor(p.x + p.y);
    if (p.name) {n = 0; for (let i = 0; i < p.name.length; i++) n += p.name.charCodeAt(i) * (i + 1);}
    return p.kind === 'woman' ? (n % 2 ? 'womanA' : 'womanB') : (n % 5 === 0 ? 'maleC' : n % 2 ? 'male' : 'maleB');
  };
  const views = [
    {name: 'Close follow', foot: [3.8, 2.15, 1.25], car: [5.8, 2.8, 1.35], fov: 56},
    {name: 'Chase view', foot: [6.5, 3.1, 1.35], car: [8.2, 3.8, 1.45], fov: 62},
    {name: 'Wide view', foot: [10.5, 5.2, 1.3], car: [12, 5.8, 1.5], fov: 65},
  ];
  let view = 0, yaw = PL.a, orbitTime = 0, pointer = null, fov = views[0].fov;
  const camAt = new THREE.Vector3(toX(PL.x), views[0].foot[1], toZ(PL.y) + views[0].foot[0]);
  const aimAt = new THREE.Vector3(toX(PL.x), 1.5, toZ(PL.y));
  renderer.domElement.addEventListener('pointerdown', e => {
    if (S.mode !== 'play' || (e.pointerType === 'touch' && e.clientX < innerWidth * 0.5)) return;
    pointer = {id: e.pointerId, x: e.clientX}; renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    yaw -= (e.clientX - pointer.x) * 0.006; pointer.x = e.clientX; orbitTime = PL.veh ? 1.6 : 5;
  });
  const endPointer = e => {if (pointer && pointer.id === e.pointerId) pointer = null;};
  renderer.domElement.addEventListener('pointerup', endPointer);
  renderer.domElement.addEventListener('pointercancel', endPointer);
  function inputVector(sx, sy) {
    const forwardX = Math.cos(yaw), forwardY = Math.sin(yaw), sideX = -forwardY, sideY = forwardX;
    return {x: sideX * sx - forwardX * sy, y: sideY * sx - forwardY * sy};
  }
  function cycleCamera() {view = (view + 1) % views.length; return views[view].name;}
  function sync(map, entities, make, update) {
    const alive = new Set(entities);
    for (const [item, mesh] of map) if (!alive.has(item)) {mesh.parent && mesh.parent.remove(mesh); map.delete(item);}
    for (const item of entities) {let mesh = map.get(item); if (!mesh) {mesh = make(item); map.set(item, mesh);} update(item, mesh);}
  }

  /* ---------- frame ---------- */
  let last = performance.now();
  const ray = new THREE.Raycaster(), tmpV = new THREE.Vector3();
  function render({vehicles, peds, actors = [], parts = [], markers = [], arrowTo = null}) {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    dayCycle();
    overheadWires.visible = poleMesh.visible = armMesh.visible = S.mode !== 'dialog';
    // A respray, sticker or upgrade bumps v.look; that car's mesh is rebuilt once.
    for (const v of vehicles) {const m = vehicleMeshes.get(v); if (m && m.userData.look !== (v.look || 0)) {m.parent && m.parent.remove(m); vehicleMeshes.delete(v);}}
    sync(vehicleMeshes, vehicles, vehicle, (v, mesh) => updateVehicle(v, mesh, dt));
    for (const mesh of vehicleMeshes.values()) mesh.visible = !(S.mode === 'dialog' && PL.onFoot && actors.length);
    if (now - detailTick > 1200) {
      detailTick = now;
      detailedPeds = new Set(peds.filter(p => p.kind !== 'goat' && p.kind !== 'kid' && p.state !== 'down' && realPedTemplates[personKey(p)])
        .sort((a, b) => Math.hypot(a.x - PL.x, a.y - PL.y) - Math.hypot(b.x - PL.x, b.y - PL.y)).slice(0, lowEnd ? 3 : 8));
    }
    for (const p of peds) {const mesh = pedMeshes.get(p), key = detailedPeds.has(p) ? personKey(p) : null;
      if (mesh && (mesh.userData.realKey || null) !== key) {mesh.parent.remove(mesh); pedMeshes.delete(p);}}
    sync(pedMeshes, peds, p => p.kind === 'goat' ? goat(p) : detailedPeds.has(p) ? realPerson(personKey(p)) : person(p), (p, mesh) => {
      if (p.kind === 'goat') {
        mesh.position.set(toX(p.x), groundHeight(p.x, p.y), toZ(p.y)); mesh.rotation.y = -p.a;
        const legs = mesh.userData.legs; if (legs) legs.forEach((l, i) => {l.rotation.z = p.moving ? Math.sin((p.ph || 0) * 2 + i * Math.PI / 2) * 0.5 : 0;});
        mesh.rotation.z = p.state === 'down' ? Math.PI / 2 : 0;
      } else if (mesh.userData.realBones) animateRealPerson(p, mesh, !!p.moving, dt);
      else animatePerson(p, mesh, !!p.moving, dt);
    });
    for (const p of actors) {const mesh = dialogMeshes.get(p), key = realPedTemplates[personKey(p)] ? personKey(p) : null;
      if (mesh && (mesh.userData.realKey || null) !== key) {mesh.parent.remove(mesh); dialogMeshes.delete(p);}}
    sync(dialogMeshes, S.mode==='dialog'?actors:[], p=>realPedTemplates[personKey(p)]?realPerson(personKey(p),dialogScene):person(p,false,dialogScene), (p,mesh)=>mesh.userData.realBones?animateRealPerson(p,mesh,false,dt):animatePerson(p,mesh,false,dt));
    if (realPedTemplates.male && !player.userData.realBones) {
      player.parent.remove(player); dialogPlayer.parent.remove(dialogPlayer);
      player = realPerson('male'); dialogPlayer = realPerson('male', dialogScene);
    }
    player.visible = S.mode !== 'title' && S.mode !== 'dialog' && PL.onFoot;
    if (player.visible) player.userData.realBones ? animateRealPerson(PL, player, !!PL.moving, dt) : animatePerson(PL, player, !!PL.moving, dt);
    dialogPlayer.visible = S.mode === 'dialog' && PL.onFoot && actors.length > 0;
    if (dialogPlayer.visible) dialogPlayer.userData.realBones ? animateRealPerson(PL, dialogPlayer, false, dt) : animatePerson(PL, dialogPlayer, false, dt);
    // Markers: mission givers, objectives and the GPS arrow.
    syncMarkers(S.mode === 'title' ? [] : markers);
    const actor = PL.veh || PL;
    arrow.visible = !!arrowTo && S.mode === 'play';
    if (arrow.visible) {
      const ax = toX(actor.x), az = toZ(actor.y), ang = Math.atan2(arrowTo.y - actor.y, arrowTo.x - actor.x);
      arrow.position.set(ax + Math.cos(ang) * 1.2, (PL.veh ? (PL.veh.type === 'trotro' ? 3.5 : 2.6) : 2.45) + Math.sin(S.t * 4) * 0.06, az + Math.sin(ang) * 1.2);
      arrow.rotation.set(0, -ang, 0); arrow.rotateZ(0.5); arrow.material.color.set(arrowTo.color || '#f5b300');
    }
    // Chase the player or vehicle while leaving enough road visible to steer.
    const meeting = S.mode === 'dialog' && actors.length && PL.onFoot;
    if (PL.veh) {
      const v = PL.veh, sp = Math.hypot(v.vx, v.vy);
      let targetYaw = v.a;
      if (sp > 40 && (v.f || 0) > 0) {const va = Math.atan2(v.vy, v.vx); targetYaw = v.a + clamp(Math.atan2(Math.sin(va - v.a), Math.cos(va - v.a)), -0.6, 0.6) * 0.55;}
      if ((v.f || 0) < -40) targetYaw = v.a;
      if (orbitTime > 0) orbitTime -= dt;
      else yaw += Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw)) * Math.min(1, dt * 3.2);
      fov = lerp(fov, views[view].fov + clamp(sp / 330, 0, 1) * 5, Math.min(1, dt * 3));
    } else {if (orbitTime > 0) orbitTime -= dt; fov = lerp(fov, meeting ? 48 : views[view].fov, Math.min(1, dt * 3));}
    if (Math.abs(camera.fov - fov) > 0.05) {camera.fov = fov; camera.updateProjectionMatrix();}
    const focus = S.focus || actor;
    const vw = views[view];
    const profile = PL.veh ? vw.car : vw.foot;
    const big = PL.veh?.type === 'trotro' ? 1.6 : PL.veh?.type === 'okada' ? -0.8 : 0;
    const distance = profile[0] + big, height = profile[1] + big * 0.6;
    const fxp = toX(focus.x), fzp = toZ(focus.y);
    const look = PL.veh ? clamp((PL.veh.f || 0) / 330, -0.3, 1) * 1.4 : 0;
    const targetAim = tmpV.set(fxp + Math.cos(yaw) * look, profile[2] + big * 0.35, fzp + Math.sin(yaw) * look);
    const targetCam = new THREE.Vector3(fxp - Math.cos(yaw) * distance, height, fzp - Math.sin(yaw) * distance);
    const k = 1 - Math.exp(-dt * (PL.veh ? 9 : 7));
    camAt.lerp(targetCam, k); aimAt.lerp(targetAim, 1 - Math.exp(-dt * 12));
    const direction = camAt.clone().sub(aimAt), length = direction.length(); direction.normalize();
    ray.set(aimAt, direction); ray.near = 0.3; ray.far = length;
    const hits = ray.intersectObject(shell, false);
    if (hits.length) camAt.copy(aimAt).addScaledVector(direction, Math.max(1.5, hits[0].distance - 0.45));
    camera.position.copy(camAt);
    const shake = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : (S.shake || 0) * 0.012;
    if (shake) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake));
    camera.lookAt(aimAt);
    if (meeting) {
      camera.updateMatrixWorld();
      const place = (mesh, x) => {
        mesh.position.copy(camera.localToWorld(tmpV.set(x, -1.2, -4.3)));
        mesh.rotation.y = -Math.atan2(camera.position.z - mesh.position.z, camera.position.x - mesh.position.x);
      };
      const gap = camera.aspect < 0.8 ? 0.43 : 0.9;
      place(dialogPlayer, -gap);
      let i = 0; for (const mesh of dialogMeshes.values()) place(mesh, gap + i++ * gap * 0.8);
    }
    sky.position.copy(camera.position);
    // Sun and shadow frustum follow the player; snapped to texels so shadows do not shimmer.
    const texel = 92 / sun.shadow.mapSize.x;
    const sx = Math.round(fxp / texel) * texel, sz = Math.round(fzp / texel) * texel;
    sun.target.position.set(sx, 0, sz); sun.position.set(sx + sunDir.x * 120, sunDir.y * 120, sz + sunDir.z * 120);
    // Player headlights at night.
    if (PL.veh && night > 0.05) {
      const v = PL.veh, ca = Math.cos(v.a), sa = Math.sin(v.a), L = v.len * U / 2;
      headLamp.intensity = night * 60; headLamp.position.set(toX(v.x) + ca * L, 1.0, toZ(v.y) + sa * L);
      headLamp.target.position.set(toX(v.x) + ca * (L + 14), 0, toZ(v.y) + sa * (L + 14));
    } else headLamp.intensity = 0;
    foam.position.z = SEA_Y * T * U - 0.6 + Math.sin(S.t * 0.8) * 0.5; M.foam.opacity = 0.35 + Math.sin(S.t * 0.8 + 1) * 0.2;
    updateParticles(parts, dt);
    pMat.uniforms.scale.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)) * 0.5;
    renderer.autoClear = false;
    renderer.clear(); renderer.render(scene, camera);
    if (S.mode === 'dialog' && actors.length) {renderer.clearDepth(); renderer.render(dialogScene, camera);}
  }
  function resize(w, h) {
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowEnd ? 1.5 : 1.75)); renderer.setSize(w, h);
  }
  function project(px, py, h = 1.2) {
    tmpV.set(toX(px), h, toZ(py)).project(camera);
    return {x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight, behind: tmpV.z > 1};
  }
  return {render, resize, inputVector, cycleCamera, project, resetCamera: () => {yaw = PL.a; camAt.set(toX(PL.x) - Math.cos(yaw) * views[view].foot[0], views[view].foot[1], toZ(PL.y) - Math.sin(yaw) * views[view].foot[0]);}};
};
