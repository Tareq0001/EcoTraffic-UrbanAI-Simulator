/**
 * EcoTraffic UrbanAI | Pedestrian Agents & Smart Crosswalk Controller
 * ===================================================================
 * Simulates autonomous pedestrians, zebra crosswalks, push-button signals,
 * and multi-agent vehicle-pedestrian collision avoidance.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class PedestrianEngine {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.pedestrians = [];
    this.crosswalks = []; // Array of { id, nodeId, startPt, endPt, state: 'walk' | 'dont_walk', timer: 0 }
    this.pedestrianCallActive = false;
    this.nextPedId = 1;
  }

  /**
   * Registers crosswalks for intersections in the road network
   */
  initCrosswalks(network) {
    this.crosswalks = [];
    this.pedestrians = [];

    let cwId = 1;
    for (const [nodeId, node] of network.nodes.entries()) {
      if (node.isIntersection) {
        // Create 2 orthogonal crosswalks around intersection node
        const offset = 32;
        this.crosswalks.push({
          id: `CW_${cwId++}`,
          nodeId,
          x1: node.x - offset,
          y1: node.y - offset,
          x2: node.x + offset,
          y2: node.y - offset,
          state: 'dont_walk',
          timer: 0
        });

        this.crosswalks.push({
          id: `CW_${cwId++}`,
          nodeId,
          x1: node.x - offset,
          y1: node.y + offset,
          x2: node.x + offset,
          y2: node.y + offset,
          state: 'dont_walk',
          timer: 0
        });
      }
    }

    // Spawn initial pedestrians
    for (let i = 0; i < 8; i++) {
      this.spawnRandomPedestrian();
    }
  }

  spawnRandomPedestrian() {
    if (this.crosswalks.length === 0) return;
    const cw = this.crosswalks[Math.floor(Math.random() * this.crosswalks.length)];

    const goingForward = Math.random() > 0.5;
    const ped = {
      id: `P_${this.nextPedId++}`,
      crosswalkId: cw.id,
      x: goingForward ? cw.x1 : cw.x2,
      y: goingForward ? cw.y1 : cw.y2,
      targetX: goingForward ? cw.x2 : cw.x1,
      targetY: goingForward ? cw.y2 : cw.y1,
      startX: goingForward ? cw.x1 : cw.x2,
      startY: goingForward ? cw.y1 : cw.y2,
      speed: 16 + Math.random() * 8, // px/sec
      state: 'waiting', // 'waiting', 'crossing', 'done'
      color: ['#f43f5e', '#a855f7', '#06b6d4', '#eab308', '#ec4899'][Math.floor(Math.random() * 5)],
      progress: 0,
      waitTimer: 0
    };

    this.pedestrians.push(ped);
  }

  /**
   * Triggers pedestrian call button (halts vehicle signals safely and gives WALK)
   */
  requestCrossing() {
    this.pedestrianCallActive = true;
    for (const cw of this.crosswalks) {
      cw.state = 'walk';
      cw.timer = 12; // 12 seconds crossing window
    }

    if (this.sound) {
      this.sound.playPedestrianChime();
    }
  }

  update(dt, vehicles) {
    // 1. Update crosswalk timers
    for (const cw of this.crosswalks) {
      if (cw.timer > 0) {
        cw.timer -= dt;
        if (cw.timer <= 0) {
          cw.state = 'dont_walk';
          this.pedestrianCallActive = false;
        }
      }
    }

    // 2. Update pedestrians
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      const cw = this.crosswalks.find(c => c.id === p.crosswalkId);

      if (!cw) {
        this.pedestrians.splice(i, 1);
        continue;
      }

      if (p.state === 'waiting') {
        p.waitTimer += dt;
        // Jaywalker behavior: if waiting more than 15s and no close cars, cross anyway
        const isJaywalking = p.waitTimer > 15 && Math.random() < 0.2;

        if (cw.state === 'walk' || isJaywalking) {
          p.state = 'crossing';
        }
      } else if (p.state === 'crossing') {
        const totalDist = Math.hypot(p.targetX - p.startX, p.targetY - p.startY);
        p.progress += (p.speed * dt) / totalDist;

        p.x = p.startX + (p.targetX - p.startX) * Math.min(1, p.progress);
        p.y = p.startY + (p.targetY - p.startY) * Math.min(1, p.progress);

        if (p.progress >= 1.0) {
          p.state = 'done';
          this.pedestrians.splice(i, 1);
          // Respawn another pedestrian after a short delay
          setTimeout(() => this.spawnRandomPedestrian(), 2000 + Math.random() * 4000);
        }
      }
    }

    // Ensure pedestrian population
    if (this.pedestrians.length < 6) {
      this.spawnRandomPedestrian();
    }

    // 3. Vehicles yield to crossing pedestrians
    for (const p of this.pedestrians) {
      if (p.state !== 'crossing') continue;

      for (const v of vehicles) {
        if (v.isFinished) continue;
        const dist = Math.hypot(v.x - p.x, v.y - p.y);

        // If vehicle is approaching pedestrian within 35px
        if (dist < 38) {
          v.acceleration = Math.min(v.acceleration, -22);
          v.speed = Math.max(0, v.speed - 30 * dt);
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // 1. Draw Zebra Crosswalks
    for (const cw of this.crosswalks) {
      const dx = cw.x2 - cw.x1;
      const dy = cw.y2 - cw.y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const stripes = Math.floor(len / 8);

      ctx.save();
      ctx.translate(cw.x1, cw.y1);
      ctx.rotate(angle);

      // Zebra stripes
      ctx.fillStyle = cw.state === 'walk' ? 'rgba(52, 211, 153, 0.75)' : 'rgba(255, 255, 255, 0.55)';
      for (let s = 0; s < stripes; s++) {
        if (s % 2 === 0) {
          ctx.fillRect(s * 8, -6, 5, 12);
        }
      }

      // Pedestrian Signal Indicator Icon
      ctx.fillStyle = cw.state === 'walk' ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -10, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 2. Draw Pedestrians
    for (const p of this.pedestrians) {
      // Body dot
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.state === 'crossing' ? 6 : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Walking animation limbs/dot
      if (p.state === 'crossing') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 1, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
