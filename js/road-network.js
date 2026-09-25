/**
 * EcoTraffic UrbanAI | Road Network Graph & Spatial Topology Engine
 * =================================================================
 * Manages geometric nodes, directed edges, multi-lane offsets,
 * stop lines, and Dijkstra shortest path routing.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class RoadNetwork {
  constructor() {
    this.nodes = new Map(); // id -> RoadNode
    this.edges = new Map(); // id -> RoadEdge
    this.laneWidth = 14; // pixels per lane
    this.adjList = new Map(); // nodeId -> [edgeId]
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.adjList.clear();
  }

  addNode(id, x, y, isIntersection = false, label = '') {
    const node = { id, x, y, isIntersection, label };
    this.nodes.set(id, node);
    if (!this.adjList.has(id)) {
      this.adjList.set(id, []);
    }
    return node;
  }

  addEdge(id, fromNodeId, toNodeId, lanesCount = 2, speedLimit = 60, nameAr = '', nameEn = '') {
    const from = this.nodes.get(fromNodeId);
    const to = this.nodes.get(toNodeId);
    if (!from || !to) {
      console.warn(`Cannot create edge ${id}: nodes not found`, fromNodeId, toNodeId);
      return null;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    const edge = {
      id,
      fromNodeId,
      toNodeId,
      lanesCount,
      speedLimit,
      length,
      angle,
      nameAr,
      nameEn,
      totalWidth: lanesCount * this.laneWidth
    };

    this.edges.set(id, edge);
    this.adjList.get(fromNodeId).push(id);
    return edge;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getEdge(id) {
    return this.edges.get(id);
  }

  /**
   * Computes spatial point (x, y, angle) along an edge at given distance and lane index
   */
  getPointOnLane(edgeId, distance, laneIndex = 0) {
    const edge = this.edges.get(edgeId);
    if (!edge) return null;

    const from = this.nodes.get(edge.fromNodeId);
    const to = this.nodes.get(edge.toNodeId);
    if (!from || !to) return null;

    const t = Math.max(0, Math.min(1, distance / edge.length));
    const baseX = from.x + (to.x - from.x) * t;
    const baseY = from.y + (to.y - from.y) * t;

    // Normal vector perpendicular to edge direction
    // In screen coordinates: angle + Math.PI / 2
    const perpAngle = edge.angle + Math.PI / 2;

    // Center the lanes around road axis
    // If lanesCount is 2: lane 0 offset is -0.5 * laneWidth, lane 1 is +0.5 * laneWidth
    const laneOffset = (laneIndex - (edge.lanesCount - 1) / 2) * this.laneWidth;

    const x = baseX + Math.cos(perpAngle) * laneOffset;
    const y = baseY + Math.sin(perpAngle) * laneOffset;

    return { x, y, angle: edge.angle };
  }

  /**
   * Stop line distance for an edge entering an intersection
   */
  getStopLineDistance(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return 0;
    // Stop line is positioned 22px before reaching destination node
    return Math.max(10, edge.length - 24);
  }

  /**
   * Finds shortest path (node sequence) using Dijkstra algorithm
   */
  findShortestPath(startNodeId, endNodeId) {
    if (startNodeId === endNodeId) return [startNodeId];

    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set(this.nodes.keys());

    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
    }
    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let current = null;
      let minDistance = Infinity;
      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId);
        if (dist < minDistance) {
          minDistance = dist;
          current = nodeId;
        }
      }

      if (!current || minDistance === Infinity) break;
      if (current === endNodeId) break;

      unvisited.delete(current);

      const outgoingEdgeIds = this.adjList.get(current) || [];
      for (const edgeId of outgoingEdgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;
        const neighbor = edge.toNodeId;
        if (!unvisited.has(neighbor)) continue;

        const alt = distances.get(current) + edge.length;
        if (alt < distances.get(neighbor)) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
        }
      }
    }

    // Reconstruct path
    const path = [];
    let curr = endNodeId;
    while (curr) {
      path.unshift(curr);
      curr = previous.get(curr);
    }

    return path.length > 1 && path[0] === startNodeId ? path : [];
  }

  /**
   * Gets edge connecting two adjacent nodes
   */
  getEdgeBetween(fromNodeId, toNodeId) {
    const outgoing = this.adjList.get(fromNodeId) || [];
    for (const edgeId of outgoing) {
      const edge = this.edges.get(edgeId);
      if (edge && edge.toNodeId === toNodeId) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Finds the closest edge and lane to a world click point (x, y)
   */
  findNearestLane(worldX, worldY, maxRadius = 35) {
    let best = null;
    let minDistance = maxRadius;

    for (const edge of this.edges.values()) {
      const from = this.nodes.get(edge.fromNodeId);
      const to = this.nodes.get(edge.toNodeId);
      if (!from || !to) continue;

      // Project point onto line segment
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      let t = ((worldX - from.x) * dx + (worldY - from.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = from.x + t * dx;
      const projY = from.y + t * dy;
      const dist = Math.hypot(worldX - projX, worldY - projY);

      if (dist < minDistance) {
        minDistance = dist;
        const distanceAlong = t * edge.length;
        // Determine lane index by lateral offset
        const perpAngle = edge.angle + Math.PI / 2;
        const signedOffset = (worldX - projX) * Math.cos(perpAngle) + (worldY - projY) * Math.sin(perpAngle);
        let laneIndex = Math.round(signedOffset / this.laneWidth + (edge.lanesCount - 1) / 2);
        laneIndex = Math.max(0, Math.min(edge.lanesCount - 1, laneIndex));

        best = {
          edgeId: edge.id,
          distanceAlong,
          laneIndex,
          point: { x: projX, y: projY }
        };
      }
    }

    return best;
  }
}
