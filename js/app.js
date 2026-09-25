/**
 * EcoTraffic UrbanAI | Main Simulator Orchestrator & Viewport Renderer
 * ====================================================================
 * High-performance 60 FPS HTML5 Canvas engine rendering roads, vehicles,
 * traffic signals, weather overlays, and telemetry dashboards.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Core Engines
  const sound = new CityAudioEngine();
  const network = new RoadNetwork();
  const signalEngine = new TrafficLightController(sound);
  const envEngine = new EnvironmentalEngine();

  // Simulation State
  let vehicles = [];
  let incidents = []; // { id, edgeId, distanceAlong, laneIndex, type }
  let selectedVehicle = null;
  let activeWeather = 'clear'; // 'clear', 'rain', 'fog'
  let isPaused = false;
  let timeScale = 1.0;
  let currentPreset = 'abha'; // 'abha', 'grid', 'roundabout', 'highway'
  let spawnRatePerMin = 45;
  let evAdoptionPercent = 35;
  let currentLanguage = 'ar'; // 'ar' or 'en'
  let currentTheme = 'dark';

  let nextVehicleId = 1;
  let lastSpawnTime = 0;
  let lastFrameTime = performance.now();

  // Canvas Viewport Setup
  const canvas = document.getElementById('city-canvas');
  const ctx = canvas.getContext('2d');

  const chartTimeline = document.getElementById('chart-timeline');
  const chartFleet = document.getElementById('chart-fleet');

  // DOM Elements - Telemetry Badges
  const badgeActiveCars = document.getElementById('badge-active-cars');
  const badgeAvgSpeed = document.getElementById('badge-avg-speed');
  const badgeCongestion = document.getElementById('badge-congestion');
  const badgeCo2 = document.getElementById('badge-co2');
  const badgeEvOffset = document.getElementById('badge-ev-offset');
  const badgeNoise = document.getElementById('badge-noise');
  const badgeAiMode = document.getElementById('badge-ai-mode');

  // Inspector Panel Elements
  const inspectorPanel = document.getElementById('vehicle-inspector');
  const inspType = document.getElementById('insp-type');
  const inspSpeed = document.getElementById('insp-speed');
  const inspAccel = document.getElementById('insp-accel');
  const inspFuel = document.getElementById('insp-fuel');
  const inspCo2 = document.getElementById('insp-co2');
  const inspPatience = document.getElementById('insp-patience');
  const inspEdge = document.getElementById('insp-edge');
  const btnCloseInspector = document.getElementById('btn-close-inspector');

  // Toast System
  const toastEl = document.getElementById('city-toast');
  const toastMsg = document.getElementById('toast-msg');
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // Weather Particles
  const rainDrops = [];
  for (let i = 0; i < 120; i++) {
    rainDrops.push({
      x: Math.random() * 1000,
      y: Math.random() * 700,
      len: 12 + Math.random() * 10,
      speed: 16 + Math.random() * 8
    });
  }

  // ==========================================================
  // 1. PRESET INITIALIZATION
  // ==========================================================
  function loadPreset(presetKey) {
    currentPreset = presetKey;
    vehicles = [];
    incidents = [];
    selectedVehicle = null;
    if (inspectorPanel) inspectorPanel.classList.remove('show');
    envEngine.reset();

    if (presetKey === 'abha') {
      CityPresetsGenerator.buildAbhaCorridor(network, signalEngine);
      showToast(currentLanguage === 'ar' ? 'تم تحميل: طريق الملك فهد والحزام الدائري بأبها' : 'Loaded: Abha Ring & King Fahd Corridor');
    } else if (presetKey === 'grid') {
      CityPresetsGenerator.buildDowntownGrid(network, signalEngine);
      showToast(currentLanguage === 'ar' ? 'تم تحميل: الشبكة الحضرية المركزية (Downtown Grid)' : 'Loaded: Metropolitan Downtown Grid');
    } else if (presetKey === 'roundabout') {
      CityPresetsGenerator.buildSmartRoundabout(network, signalEngine);
      showToast(currentLanguage === 'ar' ? 'تم تحميل: الدوار الذكي متعدد المسارات' : 'Loaded: Turbo Smart Roundabout');
    } else if (presetKey === 'highway') {
      CityPresetsGenerator.buildHighwayCloverleaf(network, signalEngine);
      showToast(currentLanguage === 'ar' ? 'تم تحميل: التقاطع السريع الحر (Cloverleaf)' : 'Loaded: Highway Interchange');
    }

    // Seed initial vehicles
    for (let i = 0; i < 16; i++) {
      spawnRandomVehicle(true);
    }
  }

  // ==========================================================
  // 2. VEHICLE SPAWNING
  // ==========================================================
  function spawnRandomVehicle(isInitial = false) {
    const nodeIds = Array.from(network.nodes.keys());
    if (nodeIds.length < 2) return;

    // Pick random start and end nodes
    const startNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let endNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    while (endNodeId === startNodeId) {
      endNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    }

    const route = network.findShortestPath(startNodeId, endNodeId);
    if (route.length < 2) return;

    // Select Vehicle Type according to EV adoption and fleet weights
    let type = 'sedan';
    const rand = Math.random() * 100;
    if (rand < evAdoptionPercent) {
      type = 'ev';
    } else if (rand < evAdoptionPercent + 25) {
      type = 'suv';
    } else if (rand < evAdoptionPercent + 45) {
      type = 'sedan';
    } else if (rand < evAdoptionPercent + 55) {
      type = 'bus';
    } else {
      type = 'truck';
    }

    const vId = `V_${nextVehicleId++}`;
    const vehicle = new VehicleAgent(vId, type, route, network);

    if (isInitial) {
      const edge = network.getEdge(vehicle.currentEdgeId);
      if (edge) {
        vehicle.distanceAlongEdge = Math.random() * (edge.length * 0.85);
      }
    }

    vehicles.push(vehicle);
    return vehicle;
  }

  function dispatchEmergencyAmbulance() {
    const nodeIds = Array.from(network.nodes.keys());
    if (nodeIds.length < 2) return;

    const startNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    let endNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    while (endNodeId === startNodeId) {
      endNodeId = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    }

    const route = network.findShortestPath(startNodeId, endNodeId);
    if (route.length < 2) return;

    const vId = `EMG_${nextVehicleId++}`;
    const ambulance = new VehicleAgent(vId, 'emergency', route, network);
    vehicles.push(ambulance);

    sound.startEmergencySiren();
    sound.playIncidentAlert();
    showToast(currentLanguage === 'ar' ? '🚑 تم توجيه سيارة طوارئ مع تفعيل مسار الموجة الخضراء!' : '🚑 Emergency unit dispatched with Green-Wave preemption!');

    // Stop siren after 10s or when cleared
    setTimeout(() => {
      sound.stopEmergencySiren();
    }, 12000);
  }

  function createRoadIncident(x, y) {
    const hit = network.findNearestLane(x, y, 40);
    if (!hit) {
      showToast(currentLanguage === 'ar' ? 'انقر على أحد المسارات لإنشاء حادث/تعطل مروري' : 'Click on a road lane to place an incident');
      return;
    }

    const incidentId = `INC_${Date.now()}`;
    incidents.push({
      id: incidentId,
      edgeId: hit.edgeId,
      distanceAlong: hit.distanceAlong,
      laneIndex: hit.laneIndex,
      x: hit.point.x,
      y: hit.point.y
    });

    // Create a stationary stalled vehicle at that location
    const route = [network.getEdge(hit.edgeId).fromNodeId, network.getEdge(hit.edgeId).toNodeId];
    const stalledCar = new VehicleAgent(`STALL_${Date.now()}`, 'sedan', route, network);
    stalledCar.currentEdgeId = hit.edgeId;
    stalledCar.currentLaneIndex = hit.laneIndex;
    stalledCar.distanceAlongEdge = hit.distanceAlong;
    stalledCar.isStalled = true;
    stalledCar.color = '#ef4444';
    vehicles.push(stalledCar);

    sound.playIncidentAlert();
    showToast(currentLanguage === 'ar' ? '⚠️ تم تسجيل حادث مروري وإغلاق المسار؛ تشكلت موجة تباطؤ!' : '⚠️ Traffic incident reported; lane blocked!');
  }

  // ==========================================================
  // 3. CANVAS RENDERING ENGINE
  // ==========================================================
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background Grid & Landscape
    ctx.fillStyle = currentTheme === 'dark' ? '#0d131f' : '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle city building / mountain contours
    drawLandscapeDetails();

    // 2. Draw Roads (Asphalt, markings, curbs)
    drawRoadNetwork();

    // 3. Draw Traffic Signals (Housing, Red/Yellow/Green lamps)
    drawTrafficSignals();

    // 4. Draw Incidents / Cones
    drawIncidents();

    // 5. Draw Vehicles
    drawVehicles();

    // 6. Draw Weather Overlays (Rain or Fog)
    drawWeatherOverlay();
  }

  function drawLandscapeDetails() {
    // Subtle background district blocks
    ctx.strokeStyle = currentTheme === 'dark' ? 'rgba(30, 41, 59, 0.45)' : 'rgba(226, 232, 240, 0.8)';
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 120) {
      for (let y = 40; y < canvas.height; y += 100) {
        ctx.strokeRect(x, y, 90, 70);
      }
    }
  }

  function drawRoadNetwork() {
    for (const edge of network.edges.values()) {
      const from = network.getNode(edge.fromNodeId);
      const to = network.getNode(edge.toNodeId);
      if (!from || !to) continue;

      // 1. Road Asphalt Base
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = currentTheme === 'dark' ? '#1e293b' : '#334155';
      ctx.lineWidth = edge.totalWidth + 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Road Tarmac Surface
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = currentTheme === 'dark' ? '#141c2b' : '#475569';
      ctx.lineWidth = edge.totalWidth;
      ctx.stroke();

      // 2. Lane Dividers (Dashed white lines)
      if (edge.lanesCount > 1) {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.2;

        for (let l = 1; l < edge.lanesCount; l++) {
          const offset = (l - edge.lanesCount / 2) * network.laneWidth;
          const perpAngle = edge.angle + Math.PI / 2;
          const ox = Math.cos(perpAngle) * offset;
          const oy = Math.sin(perpAngle) * offset;

          ctx.beginPath();
          ctx.moveTo(from.x + ox, from.y + oy);
          ctx.lineTo(to.x + ox, to.y + oy);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // 3. Stop Line at end of edge
      const stopDist = network.getStopLineDistance(edge.id);
      const stopPt = network.getPointOnLane(edge.id, stopDist, (edge.lanesCount - 1) / 2);
      if (stopPt) {
        const perpAngle = edge.angle + Math.PI / 2;
        const halfW = edge.totalWidth / 2;
        ctx.beginPath();
        ctx.moveTo(stopPt.x - Math.cos(perpAngle) * halfW, stopPt.y - Math.sin(perpAngle) * halfW);
        ctx.lineTo(stopPt.x + Math.cos(perpAngle) * halfW, stopPt.y + Math.sin(perpAngle) * halfW);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  function drawTrafficSignals() {
    for (const [nodeId, signal] of signalEngine.intersections.entries()) {
      const node = network.getNode(nodeId);
      if (!node) continue;

      // Draw signal indicator at each approach stop line
      for (const phase of signal.phases) {
        for (const edgeId of phase.activeEdgeIds) {
          const edge = network.getEdge(edgeId);
          if (!edge) continue;

          const stopDist = network.getStopLineDistance(edgeId);
          // Position traffic light slightly to the side of the stop line
          const stopPt = network.getPointOnLane(edgeId, stopDist, edge.lanesCount - 1);
          if (!stopPt) continue;

          const perpAngle = edge.angle + Math.PI / 2;
          const lightX = stopPt.x + Math.cos(perpAngle) * 12;
          const lightY = stopPt.y + Math.sin(perpAngle) * 12;

          const sigState = signalEngine.getSignalStateForEdge(edgeId) || 'red';

          // Lamp Housing
          ctx.beginPath();
          ctx.arc(lightX, lightY, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = '#0b0f19';
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Active Glow Lamp
          ctx.beginPath();
          ctx.arc(lightX, lightY, 4.5, 0, Math.PI * 2);
          if (sigState === 'green') {
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 10;
          } else if (sigState === 'yellow') {
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
          }
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow
        }
      }
    }
  }

  function drawIncidents() {
    for (const inc of incidents) {
      // Draw warning hazard triangle
      ctx.save();
      ctx.translate(inc.x, inc.y);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, 7);
      ctx.lineTo(-9, 7);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, 5);
      ctx.restore();
    }
  }

  function drawVehicles() {
    for (const v of vehicles) {
      if (v.isFinished) continue;

      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      // Selected Vehicle Highlight Aura
      if (selectedVehicle && selectedVehicle.id === v.id) {
        ctx.beginPath();
        ctx.arc(0, 0, v.length * 1.1, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // EV Green Clean Energy Glow
      if (v.type === 'ev') {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
      }

      // Emergency Flashing Beacon
      if (v.isEmergencyActive) {
        const isBlue = Math.sin(v.beaconFlashPhase) > 0;
        ctx.shadowColor = isBlue ? '#38bdf8' : '#ef4444';
        ctx.shadowBlur = 14;
      }

      // Vehicle Body Capsule
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 3);
      ctx.fill();

      // Roof / Windshield
      ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#1e293b';
      ctx.fillRect(-v.length * 0.15, -v.width * 0.35, v.length * 0.45, v.width * 0.7);

      // Headlights (Front is +X in local rotated coordinates)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(v.length / 2 - 2, -v.width / 2 + 1, 2, 2.5);
      ctx.fillRect(v.length / 2 - 2, v.width / 2 - 3.5, 2, 2.5);

      // Brake Lights (Tail is -X)
      ctx.fillStyle = (v.acceleration < -2 || v.speed < 2) ? '#ef4444' : '#7f1d1d';
      ctx.fillRect(-v.length / 2, -v.width / 2 + 1, 2, 2.5);
      ctx.fillRect(-v.length / 2, v.width / 2 - 3.5, 2, 2.5);

      ctx.restore();
    }
  }

  function drawWeatherOverlay() {
    if (activeWeather === 'rain') {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 1.2;
      for (const drop of rainDrops) {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.len);
        ctx.stroke();

        drop.y += drop.speed;
        drop.x -= 2;
        if (drop.y > canvas.height) {
          drop.y = -10;
          drop.x = Math.random() * canvas.width;
        }
      }
    } else if (activeWeather === 'fog') {
      // Atmospheric mountain mist
      ctx.fillStyle = currentTheme === 'dark' ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ==========================================================
  // 4. MAIN SIMULATION LOOP (60 FPS)
  // ==========================================================
  function stepSimulation(now) {
    const rawDt = (now - lastFrameTime) / 1000.0;
    lastFrameTime = now;
    const dt = Math.min(0.1, rawDt) * timeScale;

    if (!isPaused) {
      // 1. Spawning timer
      lastSpawnTime += dt;
      const spawnInterval = 60.0 / Math.max(5, spawnRatePerMin);
      if (lastSpawnTime >= spawnInterval && vehicles.length < 80) {
        lastSpawnTime = 0;
        spawnRandomVehicle();
      }

      // 2. Weather friction factor
      const weatherFactor = activeWeather === 'rain' ? 0.78 : (activeWeather === 'fog' ? 0.88 : 1.0);

      // 3. Update Traffic Signals with AI
      signalEngine.update(dt, vehicles, network);

      // 4. Update Vehicles
      for (const v of vehicles) {
        v.update(dt, vehicles, signalEngine, weatherFactor);
      }

      // Remove completed vehicles
      vehicles = vehicles.filter(v => !v.isFinished);

      // 5. Update Environmental Engine
      const envMetrics = envEngine.update(dt, vehicles, network);
      if (envMetrics) {
        updateTelemetryUI(envMetrics);
      }
    }

    render();
    requestAnimationFrame(stepSimulation);
  }

  // ==========================================================
  // 5. TELEMETRY & DASHBOARD UPDATES
  // ==========================================================
  function updateTelemetryUI(metrics) {
    if (badgeActiveCars) badgeActiveCars.textContent = `${metrics.activeVehicles}`;
    if (badgeAvgSpeed) badgeAvgSpeed.textContent = `${metrics.avgSpeedKmh} كم/س`;
    if (badgeCongestion) {
      badgeCongestion.textContent = `${metrics.congestionPercent}%`;
      badgeCongestion.style.color = metrics.congestionPercent > 50 ? 'var(--rose)' : (metrics.congestionPercent > 25 ? 'var(--amber)' : 'var(--emerald)');
    }
    if (badgeCo2) badgeCo2.textContent = `${metrics.totalCo2Kg} كجم`;
    if (badgeEvOffset) badgeEvOffset.textContent = `-${metrics.totalEvSavedCo2Kg} كجم`;
    if (badgeNoise) badgeNoise.textContent = `${metrics.noiseDb} dB`;

    // Draw Canvas Charts
    TelemetryChartsRenderer.drawTimelineChart(chartTimeline, metrics.history);
    TelemetryChartsRenderer.drawFleetDistribution(chartFleet, vehicles);

    // Update selected vehicle inspector
    if (selectedVehicle) {
      if (selectedVehicle.isFinished) {
        selectedVehicle = null;
        if (inspectorPanel) inspectorPanel.classList.remove('show');
      } else {
        if (inspType) inspType.textContent = selectedVehicle.type.toUpperCase();
        if (inspSpeed) inspSpeed.textContent = `${Math.round(selectedVehicle.speed * 1.15)} كم/س`;
        if (inspAccel) inspAccel.textContent = `${Math.round(selectedVehicle.acceleration * 10) / 10} م/ث²`;
        if (inspFuel) inspFuel.textContent = selectedVehicle.fuelType;
        if (inspCo2) inspCo2.textContent = `${Math.round(selectedVehicle.co2Grams * 10) / 10} جم`;
        if (inspPatience) inspPatience.textContent = `${Math.round(selectedVehicle.driver.patience * 100)}%`;
        const edge = network.getEdge(selectedVehicle.currentEdgeId);
        if (inspEdge) inspEdge.textContent = edge ? (currentLanguage === 'ar' ? edge.nameAr : edge.nameEn) : '---';
      }
    }
  }

  // ==========================================================
  // 6. EVENT LISTENERS & USER CONTROLS
  // ==========================================================
  // Canvas Click (Select Vehicle or Cause Incident)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicked on a vehicle
    let clickedVehicle = null;
    for (const v of vehicles) {
      if (Math.hypot(v.x - x, v.y - y) < 18) {
        clickedVehicle = v;
        break;
      }
    }

    if (clickedVehicle) {
      selectedVehicle = clickedVehicle;
      sound.playVehicleClick();
      if (inspectorPanel) inspectorPanel.classList.add('show');
      showToast(currentLanguage === 'ar' ? `تم تحديد المركبة: ${clickedVehicle.id}` : `Inspecting vehicle: ${clickedVehicle.id}`);
    } else {
      // No vehicle clicked: Spawn traffic incident/bottleneck
      createRoadIncident(x, y);
    }
  });

  if (btnCloseInspector) {
    btnCloseInspector.addEventListener('click', () => {
      selectedVehicle = null;
      if (inspectorPanel) inspectorPanel.classList.remove('show');
    });
  }

  // Presets Buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPreset(btn.getAttribute('data-preset'));
    });
  });

  // AI Mode Switcher
  document.querySelectorAll('.btn-ai-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-ai-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      signalEngine.setMode(mode);

      const labelsAr = {
        fixed: '⏱️ توقيت دوري ثابت',
        actuated: '📡 تحكم بمستشعرات الطوابير',
        qlearning: '🧠 وكيل الذكاء الاصطناعي (Q-Learning)'
      };
      const labelsEn = {
        fixed: '⏱️ Fixed Timers',
        actuated: '📡 Actuated Sensors',
        qlearning: '🧠 Q-Learning AI Agent'
      };

      if (badgeAiMode) {
        badgeAiMode.textContent = currentLanguage === 'ar' ? labelsAr[mode] : labelsEn[mode];
      }
      showToast(currentLanguage === 'ar' ? `نمط الإشارات: ${labelsAr[mode]}` : `Signal Mode: ${labelsEn[mode]}`);
    });
  });

  // Weather Condition Switcher
  document.querySelectorAll('.btn-weather').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-weather').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeWeather = btn.getAttribute('data-weather');

      const weatherMsg = {
        clear: '☀️ طقس صحو: سرعات وانسيابية مثالية',
        rain: '🌧️ أمطار غزيرة: زيادة مسافة الأمان وانخفاض السرعة 22%',
        fog: '🌫️ ضباب جبلي: انخفاض الرؤية والسرعة الحذرة'
      };
      showToast(weatherMsg[activeWeather]);
    });
  });

  // Emergency Ambulance Dispatch
  const btnEmergency = document.getElementById('btn-emergency-dispatch');
  if (btnEmergency) {
    btnEmergency.addEventListener('click', () => {
      dispatchEmergencyAmbulance();
    });
  }

  // Pause / Play Toggle
  const btnPause = document.getElementById('btn-pause-sim');
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      isPaused = !isPaused;
      btnPause.classList.toggle('active', isPaused);
      btnPause.innerHTML = isPaused ? '<span>▶️ استئناف</span>' : '<span>⏸️ إيقاف مؤقت</span>';
      showToast(isPaused ? 'تم إيقاف المحاكاة مؤقتاً' : 'تم استئناف المحاكاة');
    });
  }

  // Spawn Rate Slider
  const sliderSpawn = document.getElementById('slider-spawn-rate');
  const lblSpawn = document.getElementById('lbl-spawn-rate');
  if (sliderSpawn) {
    sliderSpawn.addEventListener('input', (e) => {
      spawnRatePerMin = parseInt(e.target.value, 10);
      if (lblSpawn) lblSpawn.textContent = `${spawnRatePerMin} / دقيقة`;
    });
  }

  // EV Adoption Slider
  const sliderEv = document.getElementById('slider-ev-rate');
  const lblEv = document.getElementById('lbl-ev-rate');
  if (sliderEv) {
    sliderEv.addEventListener('input', (e) => {
      evAdoptionPercent = parseInt(e.target.value, 10);
      if (lblEv) lblEv.textContent = `${evAdoptionPercent}%`;
    });
  }

  // Sound Toggle
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      const isMuted = sound.toggleMute();
      btnToggleSound.classList.toggle('active', !isMuted);
      showToast(isMuted ? 'تم كتم الصوت' : 'تم تفعيل المؤثرات الصوتية للمدينة 🔊');
    });
  }

  // Theme Toggle
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      btnToggleTheme.classList.toggle('active', currentTheme === 'dark');
      showToast(currentTheme === 'dark' ? 'تم تفعيل الوضع الداكن 🌙' : 'تم تفعيل الوضع الفاتح ☀️');
    });
  }

  // Language Toggle (Arabic / English)
  const btnToggleLang = document.getElementById('btn-toggle-lang');
  if (btnToggleLang) {
    btnToggleLang.addEventListener('click', () => {
      currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
      document.documentElement.setAttribute('lang', currentLanguage);
      document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
      btnToggleLang.textContent = currentLanguage === 'ar' ? '🇬🇧 English' : '🇸🇦 العربية';
      showToast(currentLanguage === 'ar' ? 'تم تحويل الواجهة إلى العربية 🇸🇦' : 'Switched interface to English 🇬🇧');
    });
  }

  // Start Simulation
  loadPreset('abha');
  requestAnimationFrame(stepSimulation);
});
