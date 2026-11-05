/* Gomes Soluções Industriais — galpão 3D da tela inicial (three.js r128).
   A obra se monta sozinha (fundação, estrutura, cobertura, fechamento, pintura, entrega)
   e gira quando a pessoa arrasta. Sem WebGL, fica a ilustração estática do HTML. */
(function () {
  "use strict";

  function start() {
    var THREE = window.THREE;
    var stage = document.getElementById("stage");
    var canvas = document.getElementById("obra3d");
    var chip = document.getElementById("stage-chip");
    if (!THREE || !stage || !canvas) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (err) {
      return;
    }
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var telaPequena = !!(window.matchMedia && window.matchMedia("(max-width: 680px)").matches);
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    renderer.setPixelRatio(DPR);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    /* ---------- cena, câmera e luz ---------- */
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 5.1, 13.7);
    camera.lookAt(0, 0.85, 0);

    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1c2260, 0.9));
    var sol = new THREE.DirectionalLight(0xfff3df, 1.3);
    sol.position.set(5.5, 9, 6.5);
    sol.castShadow = true;
    sol.shadow.mapSize.set(telaPequena ? 1024 : 2048, telaPequena ? 1024 : 2048);
    sol.shadow.camera.left = -5.5; sol.shadow.camera.right = 5.5;
    sol.shadow.camera.top = 5.5; sol.shadow.camera.bottom = -5.5;
    sol.shadow.camera.near = 1; sol.shadow.camera.far = 30;
    sol.shadow.bias = -0.0006;
    sol.shadow.normalBias = 0.02;
    scene.add(sol);
    var contra = new THREE.DirectionalLight(0x8fb0ff, 0.38);
    contra.position.set(-6, 3, -5);
    scene.add(contra);

    var rig = new THREE.Group();   // gira com o arraste
    var build = new THREE.Group(); // tudo o que é "obra" (some no fim do ciclo)
    scene.add(rig);
    rig.add(build);

    /* ---------- texturas desenhadas em canvas ---------- */
    function texFaixas(horizontal) {
      var c = document.createElement("canvas");
      c.width = horizontal ? 8 : 64; c.height = horizontal ? 64 : 8;
      var g = c.getContext("2d");
      var grad = horizontal ? g.createLinearGradient(0, 0, 0, 64) : g.createLinearGradient(0, 0, 64, 0);
      grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.42, "#ffffff");
      grad.addColorStop(0.58, "#aeb5c4"); grad.addColorStop(0.78, "#e4e8ef"); grad.addColorStop(1, "#ffffff");
      g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
      var t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.encoding = THREE.sRGBEncoding;
      return t;
    }
    var TEX_V = texFaixas(false); // nervuras verticais (telha e fechamento)
    var TEX_H = texFaixas(true);  // lâminas horizontais (portão, veneziana)
    function rep(base, rx, ry) {
      var t = base.clone();
      t.needsUpdate = true;
      t.repeat.set(rx, ry);
      return t;
    }

    function std(color, extra) {
      var o = { color: color, roughness: 0.62, metalness: 0.08 };
      for (var k in extra || {}) o[k] = extra[k];
      return new THREE.MeshStandardMaterial(o);
    }
    var M = {
      disco: std(0x0b1058, { roughness: 0.85 }),
      anel: std(0x48bb5c, { emissive: 0x2a7b24, emissiveIntensity: 0.7 }),
      concreto: std(0xcdd3de, { roughness: 0.92 }),
      alvenaria: std(0xe6eaf1, { roughness: 0.85 }),
      piso: std(0x1e63d8, { roughness: 0.25, metalness: 0.15 }),
      aco: std(0xaab4c8, { metalness: 0.55, roughness: 0.42 }),
      telha: std(0xeef2f8, { metalness: 0.35, roughness: 0.45, map: rep(TEX_V, 9, 1) }),
      telhaLisa: std(0xe9eef6, { metalness: 0.35, roughness: 0.45 }),
      domus: std(0xffffff, { emissive: 0xbfe3ff, emissiveIntensity: 0.6, roughness: 0.3 }),
      calha: std(0x59627a, { metalness: 0.5, roughness: 0.5 }),
      vidro: std(0x9fd6ff, { emissive: 0x4aa8ff, emissiveIntensity: 0.05, roughness: 0.15, metalness: 0.3 }),
      branco: std(0xf6f8fc, { roughness: 0.6 }),
      portao: std(0xd8dde7, { metalness: 0.5, roughness: 0.45, map: rep(TEX_H, 1, 16) }),
      veneziana: std(0x8b93a8, { metalness: 0.4, roughness: 0.5, map: rep(TEX_H, 1, 7) }),
      portaAzul: std(0x16205f, { roughness: 0.5 }),
      lampada: std(0xfff3c4, { emissive: 0xffd76a, emissiveIntensity: 0.2 }),
      amarelo: std(0xf2b705, { roughness: 0.5, metalness: 0.2 }),
      escuro: std(0x171a2c, { roughness: 0.8 }),
      colete: std(0xf26b21),
      coleteVerde: std(0xb7e23a),
      refletivo: std(0xe8edf5, { emissive: 0xffffff, emissiveIntensity: 0.15 }),
      calca: std(0x1d2440),
      pele: std(0xd9a273, { roughness: 0.8 }),
      capaceteBranco: std(0xffffff, { roughness: 0.4 }),
      capaceteAmarelo: std(0xf7c60c, { roughness: 0.4 }),
      cone: std(0xf2641c),
      rackLaranja: std(0xee6a1f, { metalness: 0.3 }),
      rackAzul: std(0x2a4fd0, { metalness: 0.3 }),
      caixa: std(0xc9a26b, { roughness: 0.9 }),
      folha: std(0x3f9d52, { roughness: 0.9 }),
      tronco: std(0x6b4a2f, { roughness: 0.9 }),
      sinal: std(0xff8a1f, { emissive: 0xff6a00, emissiveIntensity: 0.2 })
    };
    var PRIMER = new THREE.Color(0xa9b1c2);
    var AZUL = new THREE.Color(0x2352e6);

    function box(w, h, d, mat, x, y, z, parent) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      (parent || build).add(m);
      return m;
    }
    function cyl(rt, rb, h, mat, x, y, z, parent, seg) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 18), mat);
      m.position.set(x, y, z);
      (parent || build).add(m);
      return m;
    }

    /* ---------- base giratória com o pátio pintado ---------- */
    var R = 3.45;
    var disco = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.14, 0.24, 96), M.disco);
    disco.position.y = -0.121;
    rig.add(disco);
    var anel = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.035, 10, 120), M.anel);
    anel.rotation.x = Math.PI / 2;
    rig.add(anel);

    function texPatio() {
      var S = 1024, c = document.createElement("canvas");
      c.width = c.height = S;
      var g = c.getContext("2d");
      var px = function (v) { return (v / (2 * R) + 0.5) * S; };
      var len = function (v) { return (v / (2 * R)) * S; };
      g.fillStyle = "#1f2549"; g.fillRect(0, 0, S, S);                       // asfalto
      for (var n = 0; n < 2600; n++) {
        g.fillStyle = n % 2 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.10)";
        g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
      }
      g.fillStyle = "#b3bac9";                                                // calçada de concreto
      g.fillRect(px(-2.72), px(-1.82), len(4.78), len(3.84));
      g.strokeStyle = "rgba(60,68,96,.35)"; g.lineWidth = 2;                  // juntas de dilatação
      for (var jx = -2.72 + 0.8; jx < 2.0; jx += 0.8) { g.beginPath(); g.moveTo(px(jx), px(-1.82)); g.lineTo(px(jx), px(2.02)); g.stroke(); }
      for (var jz = -1.82 + 0.8; jz < 2.0; jz += 0.8) { g.beginPath(); g.moveTo(px(-2.72), px(jz)); g.lineTo(px(2.06), px(jz)); g.stroke(); }
      g.fillStyle = "#c2c8d5";                                                // base do reservatório
      g.beginPath(); g.arc(px(2.45), px(-1.75), len(0.5), 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#f2c200"; g.lineWidth = 5;                             // doca demarcada em amarelo
      g.strokeRect(px(1.95), px(-0.8), len(1.2), len(0.8));
      g.save(); g.beginPath(); g.rect(px(1.95), px(-0.8), len(1.2), len(0.8)); g.clip();
      g.lineWidth = 3; g.globalAlpha = 0.55;
      for (var h = -1; h < 3; h += 0.16) { g.beginPath(); g.moveTo(px(1.95 + h), px(-0.8)); g.lineTo(px(1.95 + h - 0.8), px(0)); g.stroke(); }
      g.restore();
      g.fillStyle = "#f4f6fa";                                                // faixa de pedestres
      for (var fz = 0.25; fz < 1.0; fz += 0.17) g.fillRect(px(2.18), px(fz), len(0.6), len(0.085));
      g.strokeStyle = "#f4f6fa"; g.lineWidth = 4;                             // vagas
      for (var vx = -1.9; vx <= -0.29; vx += 0.4) { g.beginPath(); g.moveTo(px(vx), px(2.14)); g.lineTo(px(vx), px(2.8)); g.stroke(); }
      g.beginPath(); g.moveTo(px(-1.9), px(2.14)); g.lineTo(px(-0.3), px(2.14)); g.stroke();
      var t = new THREE.CanvasTexture(c);
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return t;
    }
    var patio = new THREE.Mesh(new THREE.CircleGeometry(R, 96), std(0xffffff, { map: texPatio(), roughness: 0.95 }));
    patio.rotation.x = -Math.PI / 2;
    patio.position.y = 0.001;
    rig.add(patio);

    /* ---------- linha do tempo ---------- */
    var tracks = [];
    var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
    var easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };
    var easeIn = function (p) { return p * p * p; };
    var easeInOut = function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
    var easeBack = function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
    function track(t0, dur, fn, ease) { tracks.push({ t0: t0, dur: dur, fn: fn, ease: ease || easeOut }); }

    var subir = function (obj) { return function (e, p) { obj.visible = p > 0; obj.scale.y = Math.max(e, 0.001); }; };
    var cair = function (obj, y0, dist) { return function (e, p) { obj.visible = p > 0; obj.position.y = y0 + (1 - e) * dist; }; };
    var esticar = function (obj) { return function (e, p) { obj.visible = p > 0; obj.scale.x = Math.max(e, 0.001); }; };
    var surgir = function (obj) { return function (e, p) { obj.visible = p > 0; obj.scale.setScalar(Math.max(e, 0.001)); }; };

    /* ---------- galpão ---------- */
    var L = 4.0, W = 2.6, H = 1.7, RISE = 0.5;
    var HALF = W / 2;
    var SLOPE = Math.sqrt(HALF * HALF + RISE * RISE);
    var ANG = Math.atan2(RISE, HALF);
    var galpao = new THREE.Group();
    galpao.position.set(-0.3, 0.08, -0.15);
    build.add(galpao);

    // 1. fundação e piso
    var base = new THREE.Group();
    galpao.add(base);
    box(4.4, 0.08, 3.0, M.concreto, 0, -0.04, 0, base);
    box(L - 0.12, 0.012, W - 0.12, M.piso, 0, 0.006, 0, base);
    track(0.2, 0.9, function (e, p) { base.visible = p > 0; base.scale.set(Math.max(e, 0.001), 1, Math.max(e, 0.001)); }, easeBack);

    // 2. estrutura metálica: 5 pórticos, terças, longarinas e contraventamento
    [-1.9, -0.95, 0, 0.95, 1.9].forEach(function (x, i) {
      [1, -1].forEach(function (s) {
        var pilar = new THREE.Group();
        pilar.position.set(x, 0, s * (HALF - 0.07));
        box(0.09, H, 0.12, M.aco, 0, H / 2, 0, pilar);
        box(0.2, 0.02, 0.2, M.aco, 0, 0.01, 0, pilar);
        galpao.add(pilar);
        track(1.2 + i * 0.28, 0.65, subir(pilar));
        var viga = box(0.08, 0.11, SLOPE, M.aco, x, H + RISE / 2 - 0.02, s * HALF / 2, galpao);
        viga.rotation.x = s * ANG;
        track(1.7 + i * 0.28, 0.55, cair(viga, H + RISE / 2 - 0.02, 1.3), easeBack);
      });
    });
    [0.1, 0.37, 0.63, 0.9].forEach(function (f, n) {
      [1, -1].forEach(function (s) {
        var terca = box(L + 0.16, 0.045, 0.055, M.aco, 0, H + RISE * f + 0.075, s * HALF * (1 - f), galpao);
        terca.rotation.x = s * ANG;
        track(3.4 + n * 0.1, 0.7, esticar(terca));
      });
    });
    [1, -1].forEach(function (s) {
      [0.52, 1.12].forEach(function (y) {
        track(3.5, 0.7, esticar(box(L, 0.05, 0.04, M.aco, 0, y, s * (HALF - 0.02), galpao)));
      });
      [-1.425, 1.425].forEach(function (xc) {
        [1, -1].forEach(function (d) {
          var barra = box(1.947, 0.02, 0.02, M.aco, xc, H / 2, s * (HALF - 0.07), galpao);
          barra.rotation.z = d * 1.061;
          track(3.7, 0.6, esticar(barra));
        });
      });
    });

    // 3. cobertura: telhas onduladas com domus, cumeeira, exaustores e calhas
    var LR = 4.3, PW = LR / 5, ordem = 0;
    for (var j = 0; j < 5; j++) {
      [1, -1].forEach(function (s) {
        var telha = new THREE.Group();
        telha.add(new THREE.Mesh(new THREE.BoxGeometry(PW - 0.012, 0.035, SLOPE + 0.2), M.telha));
        if (j === 1 || j === 3) {
          var dom = new THREE.Mesh(new THREE.BoxGeometry(PW * 0.5, 0.04, SLOPE * 0.45), M.domus);
          dom.position.y = 0.03;
          telha.add(dom);
        }
        var y0 = H + RISE / 2 + 0.125;
        telha.position.set(-LR / 2 + PW / 2 + j * PW, y0, s * (HALF / 2 + 0.045));
        telha.rotation.x = s * ANG;
        galpao.add(telha);
        track(4.7 + ordem * 0.2, 0.55, cair(telha, y0, 1.7));
        ordem++;
      });
    }
    track(7.0, 0.5, esticar(box(LR, 0.04, 0.26, M.telhaLisa, 0, H + RISE + 0.155, 0, galpao)));
    var giratorios = [];
    [-1.2, 0, 1.2].forEach(function (x, i) {
      var ex = new THREE.Group();
      ex.position.set(x, H + RISE + 0.17, 0);
      cyl(0.06, 0.075, 0.08, M.aco, 0, 0.04, 0, ex, 12);
      var cupula = new THREE.Mesh(new THREE.SphereGeometry(0.11, 9, 6), std(0xdfe5ef, { metalness: 0.6, roughness: 0.35, flatShading: true }));
      cupula.position.y = 0.13;
      cupula.scale.y = 0.8;
      ex.add(cupula);
      giratorios.push(cupula);
      galpao.add(ex);
      track(7.25 + i * 0.12, 0.5, surgir(ex), easeBack);
    });
    [1, -1].forEach(function (s) {
      track(7.2, 0.6, esticar(box(LR, 0.05, 0.08, M.calha, 0, H - 0.03, s * (HALF + 0.1), galpao)));
    });

    // 4. fechamento: paredes com faixa de janelas, portões e detalhes
    var pinturas = [];
    function novaPintura(repX) {
      var par = {
        rib: std(PRIMER.getHex(), { roughness: 0.5, metalness: 0.2, map: rep(TEX_V, repX, 1) }),
        liso: std(PRIMER.getHex(), { roughness: 0.55 })
      };
      pinturas.push(par);
      return par;
    }
    function paredeLonga(s) {
      var p = novaPintura(47);
      var g = new THREE.Group();
      g.position.z = s * HALF;
      box(L, 0.34, 0.07, M.alvenaria, 0, 0.17, 0, g);
      box(L, 0.36, 0.05, p.rib, 0, 0.52, 0, g);
      box(L - 0.3, 0.34, 0.03, M.vidro, 0, 0.87, 0, g);
      box(0.15, 0.34, 0.05, p.liso, -(L / 2 - 0.075), 0.87, 0, g);
      box(0.15, 0.34, 0.05, p.liso, L / 2 - 0.075, 0.87, 0, g);
      box(L - 0.3, 0.03, 0.06, M.branco, 0, 0.715, 0, g);
      box(L - 0.3, 0.03, 0.06, M.branco, 0, 1.025, 0, g);
      for (var k = 0; k <= 10; k++) box(0.025, 0.34, 0.06, M.branco, -(L - 0.3) / 2 + k * (L - 0.3) / 10, 0.87, 0, g);
      box(L, H - 1.04, 0.05, p.rib, 0, 1.04 + (H - 1.04) / 2, 0, g);
      cyl(0.022, 0.022, H - 0.05, M.calha, -(L / 2 - 0.12), (H - 0.05) / 2, s * 0.1, g, 10);
      cyl(0.022, 0.022, H - 0.05, M.calha, L / 2 - 0.12, (H - 0.05) / 2, s * 0.1, g, 10);
      galpao.add(g);
      return g;
    }
    var DZ = -0.25, portao, logo, logoPronto = false;
    function oitao(s, frente) {
      var p = novaPintura(11.76);
      var f = new THREE.Shape();
      f.moveTo(-HALF, 0);
      if (frente) { f.lineTo(-0.4, 0); f.lineTo(-0.4, 1.15); f.lineTo(0.9, 1.15); f.lineTo(0.9, 0); }
      f.lineTo(HALF, 0); f.lineTo(HALF, H); f.lineTo(0, H + RISE); f.lineTo(-HALF, H);
      f.closePath();
      var geo = new THREE.ExtrudeGeometry(f, { depth: 0.05, bevelEnabled: false });
      geo.translate(0, 0, -0.025);
      var g = new THREE.Group();
      g.position.x = s * (L / 2);
      var parede = new THREE.Mesh(geo, p.rib);
      parede.rotation.y = Math.PI / 2;
      g.add(parede);
      if (frente) {
        box(0.07, 0.34, 0.9, M.alvenaria, 0, 0.17, 0.85, g);
        box(0.07, 0.34, 0.4, M.alvenaria, 0, 0.17, -1.1, g);
        box(0.07, 1.18, 0.06, M.amarelo, 0.03, 0.59, DZ - 0.68, g);   // batentes do portão
        box(0.07, 1.18, 0.06, M.amarelo, 0.03, 0.59, DZ + 0.68, g);
        box(0.07, 0.07, 1.42, M.branco, 0.03, 1.185, DZ, g);
        portao = box(0.035, 1.15, 1.3, M.portao, 0.02, 0.575, DZ, g);
        box(0.03, 0.46, 0.22, M.portaAzul, 0.04, 0.23, 0.95, g);        // porta de pedestres
        box(0.16, 0.02, 0.34, M.branco, 0.09, 0.52, 0.95, g);          // marquise
        box(0.04, 0.04, 0.14, M.lampada, 0.05, 1.3, DZ, g);            // luminária
        cyl(0.035, 0.035, 0.22, M.amarelo, 0.32, 0.03, DZ - 0.85, g, 12); // balizadores
        cyl(0.035, 0.035, 0.22, M.amarelo, 0.32, 0.03, DZ + 0.85, g, 12);
        logo = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false }));
        logo.rotation.y = Math.PI / 2;
        logo.position.set(0.032, 1.63, 0);
        logo.visible = false;
        g.add(logo);
      } else {
        box(0.07, 0.34, W, M.alvenaria, 0, 0.17, 0, g);
        box(0.03, 0.26, 0.5, M.veneziana, s * 0.03, 1.5, 0, g);        // veneziana de ventilação
      }
      galpao.add(g);
      return g;
    }
    var paredes = [paredeLonga(1), oitao(1, true), paredeLonga(-1), oitao(-1, false)];
    paredes.forEach(function (g, k) { track(7.4 + k * 0.35, 0.8, subir(g)); });

    new THREE.TextureLoader().load("assets/img/marca/simbolo-branco.png", function (t) {
      t.encoding = THREE.sRGBEncoding;
      logo.material.map = t;
      logo.material.needsUpdate = true;
      logoPronto = true;
    });

    // interior: estantes, paletes e luz (aparecem quando o portão abre)
    var interior = new THREE.Group();
    galpao.add(interior);
    var estante = new THREE.Group();
    estante.position.set(0.25, 0, DZ);
    estante.rotation.y = Math.PI / 2;
    [[-0.42, 0.1], [0.42, 0.1], [-0.42, -0.1], [0.42, -0.1], [0, 0.1], [0, -0.1]].forEach(function (p) {
      box(0.03, 0.86, 0.03, M.rackLaranja, p[0], 0.43, p[1], estante);
    });
    [0.16, 0.44, 0.72].forEach(function (y, n) {
      box(0.86, 0.03, 0.02, M.rackAzul, 0, y, 0.1, estante);
      box(0.86, 0.03, 0.02, M.rackAzul, 0, y, -0.1, estante);
      box(0.3, 0.17, 0.2, M.caixa, -0.2, y + 0.1, 0, estante);
      if (n < 2) box(0.3, 0.14, 0.2, M.caixa, 0.21, y + 0.085, 0, estante);
    });
    interior.add(estante);
    box(0.26, 0.14, 0.2, M.caixa, 1.25, 0.08, 0.05, interior);
    box(0.26, 0.03, 0.2, M.tronco, 1.25, 0.02, 0.05, interior);
    var luzInterna = new THREE.PointLight(0xfff1cf, 0, 4.5);
    luzInterna.position.set(1.0, 1.25, DZ);
    interior.add(luzInterna);
    track(12.2, 0.4, surgir(interior));

    // 5. pintura: do primer ao azul da marca, parede por parede
    pinturas.forEach(function (par, k) {
      track(9.5 + k * 0.45, 0.9, function (e) {
        par.rib.color.copy(PRIMER).lerp(AZUL, e);
        par.liso.color.copy(par.rib.color);
      }, easeInOut);
    });
    track(11.2, 0.9, function (e) { M.vidro.emissiveIntensity = 0.05 + 0.7 * e; });

    // 6. entrega: logo na fachada, portão abre, luzes acendem
    track(12.3, 0.8, function (e, p) { logo.visible = logoPronto && p > 0; logo.material.opacity = e; });
    track(12.6, 1.1, function (e) {
      var sc = 1 - 0.62 * e;
      portao.scale.y = sc;
      portao.position.y = 1.15 - (1.15 * sc) / 2;
      luzInterna.intensity = 1.15 * e;
      M.lampada.emissiveIntensity = 0.2 + 1.3 * e;
    }, easeInOut);

    /* ---------- equipe ---------- */
    function pessoa(colete, capacete) {
      var g = new THREE.Group();
      box(0.036, 0.16, 0.045, M.calca, -0.026, 0.08, 0, g);
      box(0.036, 0.16, 0.045, M.calca, 0.026, 0.08, 0, g);
      box(0.105, 0.15, 0.06, colete, 0, 0.235, 0, g);
      box(0.11, 0.022, 0.064, M.refletivo, 0, 0.225, 0, g);
      box(0.03, 0.13, 0.036, colete, -0.07, 0.24, 0, g);
      box(0.03, 0.13, 0.036, colete, 0.07, 0.24, 0, g);
      var cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), M.pele);
      cabeca.position.y = 0.35;
      g.add(cabeca);
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capacete);
      cap.position.y = 0.356;
      g.add(cap);
      return g;
    }

    /* ---------- plataforma elevatória (tesoura) ---------- */
    var lift = new THREE.Group();
    lift.position.set(-0.15, 0, 1.68);
    build.add(lift);
    var corpoLift = new THREE.Group();
    corpoLift.scale.setScalar(0.7);
    lift.add(corpoLift);
    var TOPO = 0.25, BRACO = 0.74, NIVEIS = 3, BAIXO = 0.34, ALTO = 1.5;
    box(0.8, 0.16, 0.42, M.amarelo, 0, 0.17, 0, corpoLift);
    box(0.2, 0.1, 0.02, M.escuro, 0.2, 0.17, 0.215, corpoLift);
    [[-0.28, 0.2], [0.28, 0.2], [-0.28, -0.2], [0.28, -0.2]].forEach(function (p) {
      var roda = cyl(0.085, 0.085, 0.07, M.escuro, p[0], 0.085, p[1], corpoLift, 16);
      roda.rotation.x = Math.PI / 2;
    });
    var bracos = [];
    for (var n = 0; n < NIVEIS; n++) {
      [0.17, -0.17].forEach(function (z) {
        [1, -1].forEach(function (dir) {
          bracos.push({ mesh: box(BRACO, 0.035, 0.03, M.amarelo, 0, 0, z, corpoLift), nivel: n, dir: dir });
        });
      });
    }
    var cesto = new THREE.Group();
    corpoLift.add(cesto);
    box(0.84, 0.05, 0.46, M.amarelo, 0, 0, 0, cesto);
    [[-0.4, 0.21], [0.4, 0.21], [-0.4, -0.21], [0.4, -0.21], [0, 0.21], [0, -0.21]].forEach(function (p) {
      box(0.025, 0.4, 0.025, M.amarelo, p[0], 0.22, p[1], cesto);
    });
    [0.22, 0.42].forEach(function (y) {
      box(0.84, 0.025, 0.025, M.amarelo, 0, y, 0.21, cesto);
      box(0.84, 0.025, 0.025, M.amarelo, 0, y, -0.21, cesto);
      box(0.025, 0.025, 0.46, M.amarelo, -0.4, y, 0, cesto);
      box(0.025, 0.025, 0.46, M.amarelo, 0.4, y, 0, cesto);
    });
    var pintor = pessoa(M.colete, M.capaceteBranco);
    pintor.scale.setScalar(1 / 0.7);
    pintor.position.set(0.08, 0.025, -0.06);
    pintor.rotation.y = Math.PI;
    cesto.add(pintor);
    var sinal = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.sinal);
    sinal.position.set(-0.34, 0.29, 0.16);
    corpoLift.add(sinal);

    function setLift(h) {
      cesto.position.y = h;
      var passo = (h - TOPO) / NIVEIS;
      var ang = Math.asin(Math.min(0.97, passo / BRACO));
      bracos.forEach(function (b) {
        b.mesh.position.y = TOPO + passo * (b.nivel + 0.5);
        b.mesh.rotation.z = b.dir * ang;
      });
    }
    track(6.9, 0.6, surgir(lift), easeBack);
    track(0, 1, function (e, p, t) {
      var sobe = easeInOut(clamp01((t - 7.6) / 1.2));
      var desce = easeInOut(clamp01((t - 11.9) / 1.0));
      setLift(BAIXO + (ALTO - BAIXO) * (sobe - desce));
      var emUso = t > 7.4 && t < 12.9;
      M.sinal.emissiveIntensity = emUso && Math.sin(t * 9) > 0 ? 2.2 : 0.15;
    });

    [[-0.85, 2.0], [0.55, 2.0], [-0.15, 2.12]].forEach(function (p, k) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 14), M.cone);
      cone.position.set(p[0], 0.065, p[1]);
      build.add(cone);
      track(7.1 + k * 0.1, 0.4, surgir(cone), easeBack);
    });
    var apoio = pessoa(M.coleteVerde, M.capaceteAmarelo);
    apoio.position.set(0.62, 0, 1.78);
    apoio.rotation.y = -Math.PI / 2.4;
    build.add(apoio);
    track(7.2, 0.4, surgir(apoio), easeBack);
    var engenheiro = pessoa(M.colete, M.capaceteBranco);
    engenheiro.position.set(2.05, 0, 0.55);
    engenheiro.rotation.y = Math.PI / 2.6;
    build.add(engenheiro);
    track(12.9, 0.4, surgir(engenheiro), easeBack);

    /* ---------- reservatório de água ---------- */
    var reserv = new THREE.Group();
    reserv.position.set(2.45, 0, -1.75);
    build.add(reserv);
    cyl(0.3, 0.33, 2.5, M.alvenaria, 0, 1.25, 0, reserv, 28);
    cyl(0.305, 0.305, 0.26, std(0x2352e6, { roughness: 0.5 }), 0, 2.02, 0, reserv, 28);
    cyl(0.37, 0.37, 0.07, M.concreto, 0, 2.535, 0, reserv, 28);
    var guarda = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.009, 6, 40), M.amarelo);
    guarda.rotation.x = Math.PI / 2;
    guarda.position.y = 2.72;
    reserv.add(guarda);
    for (var a = 0; a < 8; a++) cyl(0.008, 0.008, 0.16, M.amarelo, Math.cos(a * Math.PI / 4) * 0.35, 2.64, Math.sin(a * Math.PI / 4) * 0.35, reserv, 6);
    box(0.11, 2.45, 0.012, std(0x4d566e, { map: rep(TEX_H, 1, 30), metalness: 0.4 }), 0, 1.25, 0.325, reserv); // escada
    track(8.0, 1.4, subir(reserv));

    /* ---------- caminhão na doca ---------- */
    var caminhao = new THREE.Group();
    caminhao.position.set(2.5, 0, -0.4);
    build.add(caminhao);
    box(1.05, 0.05, 0.3, M.escuro, 0, 0.14, 0, caminhao);
    box(0.66, 0.4, 0.36, M.branco, -0.17, 0.37, 0, caminhao);
    box(0.662, 0.07, 0.362, std(0x2352e6), -0.17, 0.3, 0, caminhao);
    box(0.26, 0.3, 0.34, M.branco, 0.36, 0.31, 0, caminhao);
    box(0.02, 0.13, 0.3, M.escuro, 0.492, 0.37, 0, caminhao);
    box(0.03, 0.05, 0.35, M.escuro, 0.5, 0.15, 0, caminhao);
    [[0.36, 0.165], [0.36, -0.165], [-0.3, 0.165], [-0.3, -0.165]].forEach(function (p) {
      var roda = cyl(0.075, 0.075, 0.06, M.escuro, p[0], 0.075, p[1], caminhao, 16);
      roda.rotation.x = Math.PI / 2;
    });
    track(12.7, 1.4, function (e, p) {
      caminhao.visible = p > 0;
      caminhao.scale.setScalar(Math.max(Math.min(1, p * 4), 0.001));
      caminhao.position.x = 2.5 + (1 - e) * 0.42;
    });

    /* ---------- paisagismo ---------- */
    [[-2.9, -1.15, 1], [-2.55, -1.9, 0.8], [1.95, -2.5, 0.9], [-2.95, 0.9, 0.7]].forEach(function (p, k) {
      var arb = new THREE.Group();
      arb.position.set(p[0], 0, p[1]);
      cyl(0.02, 0.03, 0.18, M.tronco, 0, 0.09, 0, arb, 8);
      var copa = new THREE.Mesh(new THREE.SphereGeometry(0.17 * p[2], 12, 10), M.folha);
      copa.position.y = 0.18 + 0.13 * p[2];
      copa.scale.y = 1.12;
      arb.add(copa);
      build.add(arb);
      track(13.0 + k * 0.1, 0.5, surgir(arb), easeBack);
    });

    // sombras: tudo projeta e recebe; o pátio só recebe
    rig.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    patio.castShadow = false;
    logo.castShadow = false;
    logo.receiveShadow = false;

    /* ---------- fases (texto da etiqueta) ---------- */
    var FASES = [
      [0, "Fundação"],
      [1.2, "Estrutura metálica"],
      [4.6, "Cobertura"],
      [7.4, "Fechamento"],
      [9.5, "Pintura"],
      [13.4, "Obra entregue"]
    ];
    var T_PRONTO = 13.4, T_FIM = 23, T_DESMONTA = 0.8, T_TOTAL = T_FIM + T_DESMONTA;
    var faseAtual = -1;
    function setFase(t) {
      var idx = 0;
      for (var f = 0; f < FASES.length; f++) if (t >= FASES[f][0]) idx = f;
      if (idx === faseAtual) return;
      faseAtual = idx;
      var pronto = idx === FASES.length - 1;
      stage.classList.toggle("is-done", pronto);
      if (chip) {
        chip.classList.toggle("is-done", pronto);
        chip.lastElementChild.textContent = (pronto ? "" : (idx + 1) + "/5 · ") + FASES[idx][1];
      }
    }
    function aplicar(t) {
      for (var i = 0; i < tracks.length; i++) {
        var tr = tracks[i];
        var p = clamp01((t - tr.t0) / tr.dur);
        tr.fn(tr.ease(p), p, t);
      }
      var d = clamp01((t - T_FIM) / T_DESMONTA); // desmonta no fim para recomeçar
      build.scale.setScalar(Math.max(1 - easeIn(d), 0.001));
      setFase(t);
    }

    /* ---------- giro: automático + arraste ---------- */
    var yaw = -0.62, pitch = 0.06, vel = 0, dragging = false, lastX = 0, lastY = 0, retomar = 0;
    var AUTO = 0.2;
    canvas.addEventListener("pointerdown", function (e) {
      dragging = true; vel = 0; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add("is-dragging");
      stage.classList.add("was-dragged");
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* sem captura, segue normal */ }
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      vel = dx * 0.009;
      yaw += vel;
      // no toque, o movimento vertical fica para a rolagem da página
      if (e.pointerType === "mouse") pitch = Math.max(-0.1, Math.min(0.5, pitch + dy * 0.004));
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (nome) {
      canvas.addEventListener(nome, function () {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove("is-dragging");
        retomar = performance.now() + 2200;
      });
    });

    /* ---------- tamanho e visibilidade ---------- */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener("resize", resize);
    var naTela = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { naTela = en[0].isIntersecting; }, { rootMargin: "80px" }).observe(stage);
    }

    /* ---------- laço ---------- */
    var tempo = reduce ? T_PRONTO + 2 : 0;
    var anterior = 0, iniciado = false, quadros = 0, somaDt = 0, aliviado = false;
    function desenhar() {
      aplicar(tempo);
      rig.rotation.y = yaw;
      rig.rotation.x = pitch;
      renderer.render(scene, camera);
      if (!iniciado) { iniciado = true; stage.classList.add("has-3d"); }
    }
    function quadro(agora) {
      requestAnimationFrame(quadro);
      var dt = Math.min(0.05, (agora - anterior) / 1000 || 0);
      anterior = agora;
      if (!naTela) return;
      if (!reduce) { tempo += dt; if (tempo >= T_TOTAL) tempo = 0; }
      if (!dragging) {
        if (Math.abs(vel) > 0.0004) { yaw += vel; vel *= 0.93; }
        else if (!reduce && agora > retomar) yaw += AUTO * dt;
      }
      giratorios.forEach(function (g) { g.rotation.y += dt * 3.2; });
      desenhar();
      // aparelho lento: desliga as sombras e reduz a resolução para manter a fluidez
      if (!aliviado && quadros < 90) {
        quadros++; somaDt += dt;
        if (quadros === 90 && somaDt / 90 > 0.034) {
          aliviado = true;
          sol.castShadow = false;
          renderer.setPixelRatio(Math.min(DPR, 1.25));
          resize();
        }
      }
    }
    resize();
    desenhar();
    requestAnimationFrame(quadro);

    // usado só para conferência visual (ex.: __obra3d.ir(15) mostra a obra pronta)
    window.__obra3d = { ir: function (t, giro) { tempo = t; if (typeof giro === "number") yaw = giro; desenhar(); } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
