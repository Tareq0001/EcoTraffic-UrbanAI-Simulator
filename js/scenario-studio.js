/**
 * EcoTraffic UrbanAI | Scenario & Crisis Simulator Studio
 * ========================================================
 * Injects real-world urban traffic anomalies, crises, and special operations:
 * 1. VIP Motorcade Convoy (Armed Security Escort + Green Preemption)
 * 2. Multi-Car Collision & Road Closure
 * 3. Road Maintenance & Pylon Bottleneck
 * 4. Mountain Flash Flood / Water Inundation (Abha Climate)
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class ScenarioStudio {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.activeScenarios = []; // Array of scenario names
    this.particles = []; // Animated hazard particles (smoke, flood ripples, construction sparks)
  }

  clearAll(network, incidentsList, vehiclesList) {
    this.activeScenarios = [];
    this.particles = [];
    incidentsList.length = 0;
  }

  /**
   * 1. Injects VIP Motorcade Convoy (3 Black Armored SUVs + Police escort)
   */
  injectVipConvoy(network, vehiclesList, nextIdCallback) {
    const nodeIds = Array.from(network.nodes.keys());
    if (nodeIds.length < 2) return;

    const startNode = nodeIds[0];
    const endNode = nodeIds[nodeIds.length - 1];
    const route = network.findShortestPath(startNode, endNode);
    if (route.length < 2) return;

    this.activeScenarios.push('vip_convoy');

    // Spawn 3 vehicles tightly coordinated
    for (let i = 0; i < 3; i++) {
      const vId = `VIP_${nextIdCallback()}`;
      const isLeadPolice = (i === 0);
      const type = isLeadPolice ? 'emergency' : 'suv';

      const v = new VehicleAgent(vId, type, route, network);
      v.color = isLeadPolice ? '#1e293b' : '#09090b'; // Glossy Black VIP Armor
      v.driver.desiredSpeed = 85;
      v.driver.maxAcceleration = 40;
      v.driver.timeHeadway = 0.6; // High security close formation
      v.isEmergencyActive = true;
      v.distanceAlongEdge = Math.max(2, 60 - (i * 22));

      vehiclesList.unshift(v);
    }

    if (this.sound) {
      this.sound.playEmergencySiren();
    }
  }

  /**
   * 2. Injects Multi-Car Accident Collision
   */
  injectAccident(network, incidentsList) {
    const edges = Array.from(network.edges.values());
    if (edges.length === 0) return;

    const targetEdge = edges[Math.floor(Math.random() * edges.length)];
    const dist = targetEdge.length * 0.45;
    const laneIdx = Math.floor(Math.random() * targetEdge.lanesCount);

    const pt = network.getPointOnLane(targetEdge.id, dist, laneIdx);
    if (!pt) return;

    const incident = {
      id: `ACC_${Date.now()}`,
      edgeId: targetEdge.id,
      distanceAlong: dist,
      laneIndex: laneIdx,
      x: pt.x,
      y: pt.y,
      type: 'collision',
      labelAr: 'حادث تصادم مروري',
      labelEn: 'Traffic Collision'
    };

    incidentsList.push(incident);
    this.activeScenarios.push('accident');

    // Spawn animated smoke particles
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: pt.x,
        y: pt.y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 12 - 4,
        size: 3 + Math.random() * 4,
        alpha: 0.8,
        type: 'smoke'
      });
    }

    if (this.sound) {
      this.sound.playVehicleClick();
    }
  }

  /**
   * 3. Injects Road Maintenance / Construction Zone
   */
  injectConstruction(network, incidentsList) {
    const edges = Array.from(network.edges.values()).filter(e => e.lanesCount > 1);
    if (edges.length === 0) return;

    const targetEdge = edges[Math.floor(Math.random() * edges.length)];
    const dist = targetEdge.length * 0.5;
    const laneIdx = 0; // Close primary right lane

    const pt = network.getPointOnLane(targetEdge.id, dist, laneIdx);
    if (!pt) return;

    const incident = {
      id: `WORK_${Date.now()}`,
      edgeId: targetEdge.id,
      distanceAlong: dist,
      laneIndex: laneIdx,
      x: pt.x,
      y: pt.y,
      type: 'construction',
      labelAr: 'أعمال صيانة مسار',
      labelEn: 'Roadworks Ahead'
    };

    incidentsList.push(incident);
    this.activeScenarios.push('construction');
  }

  /**
   * 4. Injects Torrential Flash Flood / Water Inundation (Abha Mountain Climate)
   */
  injectFlashFlood(network, incidentsList) {
    const edges = Array.from(network.edges.values());
    if (edges.length === 0) return;

    const targetEdge = edges[Math.floor(Math.random() * edges.length)];
    const dist = targetEdge.length * 0.6;
    const laneIdx = Math.floor(Math.random() * targetEdge.lanesCount);

    const pt = network.getPointOnLane(targetEdge.id, dist, laneIdx);
    if (!pt) return;

    const incident = {
      id: `FLOOD_${Date.now()}`,
      edgeId: targetEdge.id,
      distanceAlong: dist,
      laneIndex: laneIdx,
      x: pt.x,
      y: pt.y,
      type: 'flood',
      labelAr: 'تجمع مياه وسيول جبلية',
      labelEn: 'Flash Flood Pool'
    };

    incidentsList.push(incident);
    this.activeScenarios.push('flash_flood');
  }

  update(dt) {
    // Update scenario particles (smoke, water ripples)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 3;
      p.alpha -= dt * 0.4;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Continuously generate light smoke if collision active
    if (this.activeScenarios.includes('accident') && Math.random() < 0.25) {
      const acc = this.particles.find(p => p.type === 'smoke');
      if (acc) {
        this.particles.push({
          x: acc.x + (Math.random() - 0.5) * 8,
          y: acc.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 8 - 3,
          size: 2 + Math.random() * 3,
          alpha: 0.7,
          type: 'smoke'
        });
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // Draw animated particles
    for (const p of this.particles) {
      if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(148, 163, 184, ${Math.max(0, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
