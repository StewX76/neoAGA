<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeoAGA — The Next-Gen Biomechanical Dream</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #050608;
      --gold-primary: #d4af37;
      --gold-glow: #ffdf73;
      --bronze-dark: #5c3d1e;
      --turquoise-accent: #00f2fe;
      --turquoise-glow: #4facfe;
      --glass-bg: rgba(15, 18, 25, 0.45);
      --glass-border: rgba(212, 175, 55, 0.25);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none;
    }

    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: var(--bg-dark);
      font-family: 'Inter', sans-serif;
      color: #eaeaea;
    }

    #canvas-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    /* Modern Overlay & UI */
    .viewport-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 2.5rem;
      background: radial-gradient(circle at center, transparent 40%, rgba(5, 6, 8, 0.85) 100%);
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      pointer-events: auto;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .brand h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2.2rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      background: linear-gradient(135deg, #ffffff 20%, var(--gold-primary) 80%, var(--turquoise-accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
      text-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
    }

    .brand .subtitle {
      font-size: 0.75rem;
      letter-spacing: 0.3em;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 1.2rem;
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border);
      border-radius: 30px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: var(--turquoise-accent);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--turquoise-accent);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 242, 254, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(0, 242, 254, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 242, 254, 0); }
    }

    /* Center Overlay Text */
    .center-stage {
      text-align: center;
      transition: opacity 1s ease;
    }

    .chapter-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 3rem;
      font-weight: 300;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 0.5rem;
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
    }

    .chapter-desc {
      font-size: 0.9rem;
      letter-spacing: 0.2em;
      color: var(--gold-primary);
      text-transform: uppercase;
    }

    /* Footer Controls & Stats */
    footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      pointer-events: auto;
    }

    .controls-panel {
      display: flex;
      gap: 1rem;
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      padding: 0.8rem 1.4rem;
      border-radius: 20px;
      border: 1px solid var(--glass-border);
    }

    .btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 0.6rem 1.2rem;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn:hover {
      background: rgba(212, 175, 55, 0.2);
      border-color: var(--gold-primary);
      color: var(--gold-glow);
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
      transform: translateY(-2px);
    }

    .btn-active {
      background: linear-gradient(135deg, var(--gold-primary), var(--bronze-dark));
      border-color: var(--gold-glow);
      color: #000;
      font-weight: 600;
    }

    .telemetry {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.4);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.3rem;
    }

    .telemetry span {
      color: var(--turquoise-accent);
    }
  </style>

  <!-- Three.js + PostProcessing Libraries -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
</head>
<body>

  <div id="canvas-container"></div>

  <div class="viewport-overlay">
    <header>
      <div class="brand">
        <h1>NEOAGA</h1>
        <div class="subtitle">Next-Gen WebGPU Experience Spec</div>
      </div>
      <div class="status-badge">
        <div class="pulse-dot"></div>
        <span id="fps-counter">60 FPS — REALTIME RAYMARCH</span>
      </div>
    </header>

    <div class="center-stage" id="chapter-ui">
      <div class="chapter-title" id="scene-title">CHAPTER III</div>
      <div class="chapter-desc" id="scene-subtitle">THE BIOMECHANICAL CORE</div>
    </div>

    <footer>
      <div class="controls-panel">
        <button class="btn btn-active" id="btn-scene1">ORGANIC TUNNEL</button>
        <button class="btn" id="btn-scene2">MECHANICAL GARDEN</button>
        <button class="btn" id="btn-audio">AUDIO REACTIVE [OFF]</button>
      </div>

      <div class="telemetry">
        <div>RENDER ENGINE: <span>THREE.JS + CUSTOM WGSL/GLSL</span></div>
        <div>LIGHTING: <span>VOLUMETRIC FOG & GLOW</span></div>
      </div>
    </footer>
  </div>

  <script>
    // --- SCENE & ENGINE SETUP ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050608, 0.035);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- POST PROCESSING (BLOOM & CINEMATIC GLOW) ---
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2, // Strength
      0.4, // Radius
      0.85 // Threshold
    );

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- CURVED TUNNEL PATH (Spline Camera Drive) ---
    const splinePoints = [];
    for (let i = 0; i < 20; i++) {
      splinePoints.push(new THREE.Vector3(
        Math.sin(i * 0.5) * 8,
        Math.cos(i * 0.3) * 6,
        -i * 25
      ));
    }
    const tunnelPath = new THREE.CatmullRomCurve3(splinePoints);
    tunnelPath.closed = true;

    // --- MATERIALS & LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0x0a0f1d, 1.5);
    scene.add(ambientLight);

    // Moving Turquoise Core Glow Light
    const coreLight = new THREE.PointLight(0x00f2fe, 4, 40);
    scene.add(coreLight);

    // Gold Rim Lights
    const goldLight = new THREE.PointLight(0xd4af37, 5, 50);
    scene.add(goldLight);

    // Custom Biomechanical Tube Shader Material
    const tunnelGeometry = new THREE.TubeGeometry(tunnelPath, 200, 4.5, 32, true);
    
    // Procedural Biomechanical Gold/Bronze Shader
    const customMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1510,
      roughness: 0.35,
      metalness: 0.85,
      wireframe: false,
      bumpScale: 0.05
    });

    // Custom shader injection for rib patterns and organic pulsing
    customMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uAudioBass = { value: 0 };

      shader.vertexShader = `
        uniform float uTime;
        uniform float uAudioBass;
        varying vec3 vCustomPosition;
        varying vec3 vCustomNormal;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vCustomPosition = position;
        vCustomNormal = normal;

        // Biomechanical Rib Distortion
        float rib = sin(position.z * 1.5 + uTime * 2.0) * 0.25;
        float pulse = sin(uTime * 3.0 + position.z * 0.1) * (0.1 + uAudioBass * 0.4);
        transformed += normal * (rib + pulse);
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        varying vec3 vCustomPosition;
        varying vec3 vCustomNormal;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>
        
        // Emissive Gold/Bronze Veins & Turquoise Accents
        float vein = pow(abs(sin(vCustomPosition.z * 0.8 + uTime)), 12.0);
        vec3 goldVeinColor = vec3(0.83, 0.68, 0.21) * vein * 2.5;
        
        float pulseAcc = pow(abs(sin(vCustomPosition.z * 0.2 - uTime * 1.5)), 20.0);
        vec3 turqGlow = vec3(0.0, 0.95, 0.99) * pulseAcc * 4.0;

        gl_FragColor.rgb += goldVeinColor + turqGlow;
        `
      );

      customMaterial.userData.shader = shader;
    };

    const tunnelMesh = new THREE.Mesh(tunnelGeometry, customMaterial);
    scene.add(tunnelMesh);

    // --- BIOMECHANICAL VERTEBRAE / RINGS ---
    const ringGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(3.8, 0.15, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x3a2800
    });

    const numRings = 60;
    for (let i = 0; i < numRings; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      const u = i / numRings;
      const pos = tunnelPath.getPointAt(u);
      const tangent = tunnelPath.getTangentAt(u);
      
      ring.position.copy(pos);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    // --- ORGANIC GOLD SPRAY PARTICLES ---
    const particleCount = 1200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 20;
      particlePos[i + 1] = (Math.random() - 0.5) * 20;
      particlePos[i + 2] = -Math.random() * 300;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffdf73,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- ANIMATION LOOP & CAMERA PROGRESSION ---
    let progress = 0;
    const speed = 0.0008;
    let audioActive = false;
    let simulatedBass = 0;

    function animate(time) {
      requestAnimationFrame(animate);

      const t = time * 0.001;

      // Update Shader Uniforms
      if (customMaterial.userData.shader) {
        customMaterial.userData.shader.uniforms.uTime.value = t;
        customMaterial.userData.shader.uniforms.uAudioBass.value = simulatedBass;
      }

      // Audio simulation effect (if audio is active)
      if (audioActive) {
        simulatedBass = Math.pow(Math.sin(t * 8.0), 4.0) * 0.8;
      } else {
        simulatedBass = Math.sin(t * 2.0) * 0.2;
      }

      // Smooth Camera Drive along Spline
      progress += speed;
      if (progress > 1) progress = 0;

      const camPos = tunnelPath.getPointAt(progress);
      const lookAtPos = tunnelPath.getPointAt((progress + 0.02) % 1);
      
      camera.position.copy(camPos);
      camera.lookAt(lookAtPos);

      // Camera organic roll
      camera.rotation.z += Math.sin(t * 0.5) * 0.05;

      // Move Lights along with camera
      coreLight.position.copy(lookAtPos);
      goldLight.position.copy(camPos).add(new THREE.Vector3(1, 2, -2));

      // Particle Animation
      const positions = particles.geometry.attributes.position.array;
      for (let i = 2; i < particleCount * 3; i += 3) {
        positions[i] += 0.5;
        if (positions[i] > camera.position.z) {
          positions[i] = camera.position.z - 250;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Render Scene with Bloom
      composer.render();
    }

    animate(0);

    // --- INTERACTIVE UI & CONTROLS ---
    const btnScene1 = document.getElementById('btn-scene1');
    const btnScene2 = document.getElementById('btn-scene2');
    const btnAudio = document.getElementById('btn-audio');
    const sceneTitle = document.getElementById('scene-title');
    const sceneSubtitle = document.getElementById('scene-subtitle');

    btnScene1.addEventListener('click', () => {
      btnScene1.classList.add('btn-active');
      btnScene2.classList.remove('btn-active');
      sceneTitle.innerText = "CHAPTER III";
      sceneSubtitle.innerText = "THE ORGANIC TUNNEL";
      bloomPass.strength = 1.2;
      scene.fog.density = 0.035;
    });

    btnScene2.addEventListener('click', () => {
      btnScene2.classList.add('btn-active');
      btnScene1.classList.remove('btn-active');
      sceneTitle.innerText = "CHAPTER IV";
      sceneSubtitle.innerText = "MECHANICAL GARDEN";
      bloomPass.strength = 2.2; // Intense bloom for Mechanical Garden
      scene.fog.density = 0.02;
    });

    btnAudio.addEventListener('click', () => {
      audioActive = !audioActive;
      btnAudio.innerText = audioActive ? "AUDIO REACTIVE [ON]" : "AUDIO REACTIVE [OFF]";
      btnAudio.style.borderColor = audioActive ? "var(--turquoise-accent)" : "rgba(255, 255, 255, 0.1)";
    });

    // Window Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
