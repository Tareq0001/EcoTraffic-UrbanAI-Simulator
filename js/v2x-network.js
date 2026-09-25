/**
 * EcoTraffic UrbanAI | V2X (Vehicle-to-Everything) Communication Engine
 * =====================================================================
 * Simulates high-speed DSRC / C-V2X mesh wireless communication:
 * 1. V2V (Vehicle-to-Vehicle):
 *    - Forward Collision Warning (FCW) alerts.
 *    - Autonomous Truck Platooning (CACC) with tight headway.
 * 2. V2I (Vehicle-to-Infrastructure):
 *    - GLOSA (Green Light Optimal Speed Advisory) broadcasting.
 * 3. Wireless Mesh Link Rendering:
 *    - Dynamic pulsed wireless waves and telemetric beams.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class V2XNetworkEngine {
  constructor() {
    this.isEnabled = true;
    this.transmissionRange = 95; // Wireless communication radius in pixels
    this.activeLinks = []; // Array of { from, to, type: 'v2v' | 'fcw' | 'platoon' | 'v2i' }
    this.platoons = []; // Array of vehicle IDs grouped together
    this.pulsePhase = 0;
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }

  /**
   * Updates V2X mesh communication, collision warnings, and platooning
   */
  update(dt, vehicles, network, signalEngine) {
    if (!this.isEnabled) {
      this.activeLinks = [];
      this.platoons = [];
      return;
    }

    this.pulsePhase = (this.pulsePhase + dt * 4) % (Math.PI * 2);
    this.activeLinks = [];
    const activeVehicles = vehicles.filter(v => !v.isFinished);

    // 1. V2V Links & Forward Collision Warnings (FCW)
    for (let i = 0; i < activeVehicles.length; i++) {
      const v1 = activeVehicles[i];

      for (let j = i + 1; j < activeVehicles.length; j++) {
        const v2 = activeVehicles[j];
        const dist = Math.hypot(v1.x - v2.x, v1.y - v2.y);

        if (dist <= this.transmissionRange) {
          // Check if one is directly behind the other on same lane
          const sameEdge = v1.currentEdgeId === v2.currentEdgeId;
          const sameLane = v1.currentLaneIndex === v2.currentLaneIndex;

          let linkType = 'v2v';

          if (sameEdge && sameLane) {
            const leader = v1.distanceAlongEdge > v2.distanceAlongEdge ? v1 : v2;
            const follower = leader === v1 ? v2 : v1;
            const gap = leader.distanceAlongEdge - follower.distanceAlongEdge - (leader.length / 2 + follower.length / 2);

            // Forward Collision Warning (FCW) if sudden braking or unsafe close gap at speed
            if (gap < 25 && follower.speed > 15 && leader.acceleration < -10) {
              linkType = 'fcw';
              // V2X assists driver: initiate immediate early deceleration
              follower.acceleration = Math.min(follower.acceleration, -18);
            }
            // Cooperative Truck/Bus Platooning (CACC)
            else if ((follower.type === 'truck' || follower.type === 'bus') && 
                     (leader.type === 'truck' || leader.type === 'bus') && 
                     gap < 55) {
              linkType = 'platoon';
              // Platooning reduces aerodynamic drag -> fuel and CO2 offset bonus
              follower.driver.timeHeadway = 0.8; // tighter safe gap
              follower.driver.politeness = 0.6;
            }
          }

          this.activeLinks.push({
            x1: v1.x,
            y1: v1.y,
            x2: v2.x,
            y2: v2.y,
            type: linkType
          });
        }
      }
    }

    // 2. V2I (Vehicle-to-Infrastructure): Traffic Light GLOSA Broadcast
    if (signalEngine) {
      for (const [nodeId, signal] of signalEngine.intersections.entries()) {
        const node = network.getNode(nodeId);
        if (!node) continue;

        for (const v of activeVehicles) {
          const distToNode = Math.hypot(v.x - node.x, v.y - node.y);
          if (distToNode <= this.transmissionRange * 1.3) {
            const edge = network.getEdge(v.currentEdgeId);
            if (edge && edge.toNodeId === nodeId) {
              this.activeLinks.push({
                x1: node.x,
                y1: node.y,
                x2: v.x,
                y2: v.y,
                type: 'v2i'
              });

              // GLOSA Speed Advisory: if signal is green and vehicle can make it, adjust speed smoothly
              if (signal.state === 'green') {
                const remainingGreen = Math.max(0, signal.minGreen - signal.timeInPhase);
                if (remainingGreen > 3 && v.speed < edge.speedLimit * 0.9) {
                  v.driver.desiredSpeed = edge.speedLimit * 1.05;
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Draws V2X mesh communication beams and warning waves
   */
  draw(ctx) {
    if (!this.isEnabled || this.activeLinks.length === 0) return;

    ctx.save();

    for (const link of this.activeLinks) {
      ctx.beginPath();
      ctx.moveTo(link.x1, link.y1);
      ctx.lineTo(link.x2, link.y2);

      if (link.type === 'fcw') {
        // Red Pulsing Forward Collision Warning
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + Math.sin(this.pulsePhase * 2) * 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();

        // Warning Icon mid-distance
        const midX = (link.x1 + link.x2) / 2;
        const midY = (link.y1 + link.y2) / 2;
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ FCW', midX, midY - 6);
      } else if (link.type === 'platoon') {
        // Cyan Cooperative Platooning Link
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        const midX = (link.x1 + link.x2) / 2;
        const midY = (link.y1 + link.y2) / 2;
        ctx.fillStyle = '#06b6d4';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🔗 PLATOON', midX, midY - 4);
      } else if (link.type === 'v2i') {
        // Emerald V2I Signal Advisory Wave
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 + Math.sin(this.pulsePhase) * 0.25})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 5]);
        ctx.stroke();
      } else {
        // Standard V2V Mesh Link
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 + Math.sin(this.pulsePhase) * 0.15})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }
}
