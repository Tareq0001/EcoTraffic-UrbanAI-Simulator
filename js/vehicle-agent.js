/**
 * EcoTraffic UrbanAI | Microscopic Multi-Agent Traffic Physics (IDM & MOBIL)
 * ===========================================================================
 * Implements the Intelligent Driver Model (IDM), MOBIL lane changing,
 * emergency vehicle yielding, and carbon emission telemetry.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class VehicleAgent {
  constructor(id, type, routeNodeIds, roadNetwork) {
    this.id = id;
    this.type = type; // 'sedan', 'suv', 'ev', 'bus', 'truck', 'emergency'
    this.network = roadNetwork;

    // Fuel & Propulsion
    if (type === 'ev') {
      this.fuelType = 'electric';
    } else if (type === 'bus' || type === 'truck') {
      this.fuelType = 'diesel';
    } else {
      this.fuelType = 'gasoline';
    }

    // Geometry & Dimensions (in pixels)
    const specs = {
      sedan: { width: 8.5, length: 18, color: '#38bdf8' },
      suv: { width: 9.5, length: 20, color: '#a855f7' },
      ev: { width: 8.5, length: 18, color: '#10b981' },
      bus: { width: 11, length: 38, color: '#f59e0b' },
      truck: { width: 12, length: 34, color: '#94a3b8' },
      emergency: { width: 10, length: 24, color: '#ef4444' }
    };

    const s = specs[type] || specs.sedan;
    this.width = s.width;
    this.length = s.length;
    this.color = s.color;

    // Kinematics
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.speed = 10 + Math.random() * 20; // current speed px/s
    this.acceleration = 0;

    // Routing & Location
    this.routeNodeIds = [...routeNodeIds];
    this.routeIndex = 0;
    this.currentEdgeId = null;
    this.currentLaneIndex = 0;
    this.distanceAlongEdge = 0;
    this.isFinished = false;

    // Driver Ergonomics & IDM Parameters
    const maxAcc = type === 'emergency' ? 45 : (type === 'truck' ? 18 : 32);
    const desSpeed = type === 'emergency' ? 95 : (type === 'truck' ? 45 : 65);

    this.driver = {
      desiredSpeed: desSpeed + (Math.random() * 10 - 5),
      minGap: 8 + (this.length / 2), // s0
      timeHeadway: 1.2 + Math.random() * 0.4, // T (seconds)
      maxAcceleration: maxAcc, // a
      comfortableDecel: 24, // b
      accelerationExponent: 4, // delta
      politeness: type === 'emergency' ? 0.0 : 0.25,
      patience: 1.0 // decreases when stalled
    };

    // Emergency & Status Flags
    this.isEmergencyActive = (type === 'emergency');
    this.beaconFlashPhase = 0;
    this.isStalled = false;
    this.waitingSeconds = 0;

    // Emissions Tracking
    this.co2Grams = 0;
    this.evKwhConsumed = 0;
    this.fuelLiters = 0;

    this.initPosition();
  }

  initPosition() {
    if (this.routeNodeIds.length < 2) return;
    const edge = this.network.getEdgeBetween(this.routeNodeIds[0], this.routeNodeIds[1]);
    if (edge) {
      this.currentEdgeId = edge.id;
      this.currentLaneIndex = Math.floor(Math.random() * edge.lanesCount);
      this.distanceAlongEdge = 4;
      const pt = this.network.getPointOnLane(this.currentEdgeId, this.distanceAlongEdge, this.currentLaneIndex);
      if (pt) {
        this.x = pt.x;
        this.y = pt.y;
        this.angle = pt.angle;
      }
    }
  }

  /**
   * Evaluates IDM Acceleration against a leading obstacle/vehicle
   */
  computeIdmAcceleration(currentSpeed, desiredSpeed, actualGap, deltaSpeed) {
    const v = Math.max(0, currentSpeed);
    const v0 = Math.max(5, desiredSpeed);
    const s = Math.max(0.1, actualGap);
    const dV = deltaSpeed; // v - v_lead

    const s0 = this.driver.minGap;
    const T = this.driver.timeHeadway;
    const a = this.driver.maxAcceleration;
    const b = this.driver.comfortableDecel;

    // Desired dynamical distance: s* = s0 + v*T + (v*dV)/(2*sqrt(a*b))
    const sStar = s0 + (v * T) + (v * dV) / (2 * Math.sqrt(a * b));

    // IDM formula: a * [1 - (v/v0)^4 - (s*/s)^2]
    const freeRoadTerm = 1 - Math.pow(v / v0, this.driver.accelerationExponent);
    const interactionTerm = Math.pow(sStar / s, 2);

    return a * (freeRoadTerm - interactionTerm);
  }

  /**
   * Updates vehicle motion, IDM following, stop lines, and lane switching
   */
  update(dt, allVehicles, signalEngine, weatherFactor = 1.0) {
    if (this.isFinished) return;

    if (this.isStalled) {
      this.speed = 0;
      this.acceleration = 0;
      this.waitingSeconds += dt;
      return;
    }

    const currentEdge = this.network.getEdge(this.currentEdgeId);
    if (!currentEdge) {
      this.isFinished = true;
      return;
    }

    // 1. Find Leading Vehicle on same edge and lane
    let leader = null;
    let minGap = Infinity;

    for (const other of allVehicles) {
      if (other.id === this.id || other.isFinished) continue;
      if (other.currentEdgeId === this.currentEdgeId && other.currentLaneIndex === this.currentLaneIndex) {
        const gap = other.distanceAlongEdge - this.distanceAlongEdge - (this.length / 2 + other.length / 2);
        if (gap > 0 && gap < minGap) {
          minGap = gap;
          leader = other;
        }
      }
    }

    // 2. Check Traffic Signal / Stop Line
    const stopLineDist = this.network.getStopLineDistance(this.currentEdgeId);
    const distToStopLine = stopLineDist - this.distanceAlongEdge;

    let isRedSignal = false;
    if (signalEngine) {
      isRedSignal = signalEngine.isEdgeRedOrAmber(this.currentEdgeId, this.isEmergencyActive);
    }

    let targetGap = minGap;
    let deltaSpeed = leader ? (this.speed - leader.speed) : 0;

    // If red signal and approaching stop line, treat stop line as virtual stationary vehicle
    if (isRedSignal && distToStopLine > -5 && distToStopLine < targetGap) {
      targetGap = Math.max(0.5, distToStopLine);
      deltaSpeed = this.speed - 0; // stop line is stationary
    }

    // 3. Weather impact on desired speed and braking
    const effectiveDesiredSpeed = Math.min(this.driver.desiredSpeed, currentEdge.speedLimit * 1.1) * weatherFactor;

    // 4. Compute IDM Acceleration
    let acc = this.computeIdmAcceleration(this.speed, effectiveDesiredSpeed, targetGap, deltaSpeed);

    // Apply acceleration limits
    acc = Math.max(-this.driver.comfortableDecel * 2.2, Math.min(this.driver.maxAcceleration, acc));
    this.acceleration = acc;

    // 5. Integrate Velocity & Position
    this.speed = Math.max(0, this.speed + this.acceleration * dt);
    this.distanceAlongEdge += this.speed * dt;

    if (this.speed < 2.0) {
      this.waitingSeconds += dt;
      this.driver.patience = Math.max(0.1, this.driver.patience - 0.02 * dt);
    } else {
      this.driver.patience = Math.min(1.0, this.driver.patience + 0.05 * dt);
    }

    // 6. MOBIL Lane Changing Check (every few frames)
    if (Math.random() < 0.15 && currentEdge.lanesCount > 1 && !this.isEmergencyActive) {
      this.evaluateLaneChange(allVehicles);
    }

    // 7. Check Edge Transition / Arrival at Destination Node
    if (this.distanceAlongEdge >= currentEdge.length) {
      this.transitionToNextEdge();
    } else {
      const pt = this.network.getPointOnLane(this.currentEdgeId, this.distanceAlongEdge, this.currentLaneIndex);
      if (pt) {
        this.x = pt.x;
        this.y = pt.y;
        this.angle = pt.angle;
      }
    }

    // 8. Environmental Emissions Telemetry
    this.calculateEmissions(dt);

    if (this.isEmergencyActive) {
      this.beaconFlashPhase = (this.beaconFlashPhase + dt * 12) % (Math.PI * 2);
    }
  }

  evaluateLaneChange(allVehicles) {
    const currentEdge = this.network.getEdge(this.currentEdgeId);
    if (!currentEdge) return;

    // Candidate adjacent lanes: left (-1) or right (+1)
    const candidates = [];
    if (this.currentLaneIndex > 0) candidates.push(this.currentLaneIndex - 1);
    if (this.currentLaneIndex < currentEdge.lanesCount - 1) candidates.push(this.currentLaneIndex + 1);

    for (const targetLane of candidates) {
      // Find leader and follower in target lane
      let targetLeader = null;
      let targetFollower = null;
      let minLeadGap = Infinity;
      let minFollowGap = Infinity;

      for (const other of allVehicles) {
        if (other.id === this.id || other.isFinished) continue;
        if (other.currentEdgeId === this.currentEdgeId && other.currentLaneIndex === targetLane) {
          const gap = other.distanceAlongEdge - this.distanceAlongEdge;
          if (gap > 0 && gap < minLeadGap) {
            minLeadGap = gap;
            targetLeader = other;
          } else if (gap < 0 && Math.abs(gap) < minFollowGap) {
            minFollowGap = Math.abs(gap);
            targetFollower = other;
          }
        }
      }

      // Safety criterion: follower in new lane must not brake too hard
      const safeFollowGap = 16 + (this.length / 2);
      if (minFollowGap < safeFollowGap) continue;

      // Incentive criterion: will we gain speed or escape a slower car?
      if (minLeadGap > 30) {
        this.currentLaneIndex = targetLane;
        break;
      }
    }
  }

  transitionToNextEdge() {
    this.routeIndex++;
    if (this.routeIndex >= this.routeNodeIds.length - 1) {
      // Reached final destination
      this.isFinished = true;
      return;
    }

    const nextFrom = this.routeNodeIds[this.routeIndex];
    const nextTo = this.routeNodeIds[this.routeIndex + 1];
    const nextEdge = this.network.getEdgeBetween(nextFrom, nextTo);

    if (nextEdge) {
      this.currentEdgeId = nextEdge.id;
      this.currentLaneIndex = Math.min(this.currentLaneIndex, nextEdge.lanesCount - 1);
      this.distanceAlongEdge = 0;
    } else {
      this.isFinished = true;
    }
  }

  calculateEmissions(dt) {
    if (this.fuelType === 'electric') {
      // EV energy consumption ~ 0.18 kWh per km
      const speedKmPerSec = (this.speed * 0.05) / 1000;
      this.evKwhConsumed += speedKmPerSec * 0.18 * dt;
    } else {
      // Internal Combustion: Idle consumes 0.8 L/h, cruising 6-9 L/100km
      let fuelRateLiterPerSec = 0.0003; // base idle
      if (this.speed > 2) {
        fuelRateLiterPerSec += (this.speed * 0.00002) + Math.max(0, this.acceleration * 0.00004);
      }
      if (this.fuelType === 'diesel') fuelRateLiterPerSec *= 1.15;

      const fuelConsumed = fuelRateLiterPerSec * dt;
      this.fuelLiters += fuelConsumed;
      // 1 Liter of petrol emits ~2392 grams CO2, Diesel ~2640 grams
      const co2Factor = this.fuelType === 'diesel' ? 2640 : 2392;
      this.co2Grams += fuelConsumed * co2Factor;
    }
  }
}
