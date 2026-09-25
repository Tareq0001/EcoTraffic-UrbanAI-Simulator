/**
 * EcoTraffic UrbanAI | Smart City Digital Twin & Multi-Agent Traffic AI
 * Strict TypeScript Type Definitions & Domain Contracts
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

export type VehicleType = 'sedan' | 'suv' | 'ev' | 'bus' | 'truck' | 'emergency';
export type FuelType = 'gasoline' | 'diesel' | 'electric';
export type WeatherCondition = 'clear' | 'rain' | 'fog';
export type AIControlMode = 'fixed' | 'actuated' | 'qlearning';
export type TrafficLightState = 'red' | 'yellow' | 'green';

export interface Point2D {
  x: number;
  y: number;
}

export interface RoadNode {
  id: string;
  x: number;
  y: number;
  label?: string;
  isIntersection?: boolean;
}

export interface RoadLane {
  id: string;
  edgeId: string;
  index: number; // 0 is rightmost / outer
  speedLimit: number; // px/s or km/h
}

export interface RoadEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  lanesCount: number;
  length: number;
  speedLimit: number;
  isOneWay: boolean;
  name?: string;
  nameAr?: string;
}

export interface TrafficSignalPhase {
  id: string;
  activeEdgeIds: string[]; // Edges that have green light
  duration: number; // in seconds
  yellowDuration: number;
}

export interface IntersectionSignal {
  id: string;
  nodeId: string;
  phases: TrafficSignalPhase[];
  currentPhaseIndex: number;
  timeInCurrentPhase: number;
  state: 'green' | 'yellow' | 'all_red';
  mode: AIControlMode;
  queueLengths: Record<string, number>;
  waitingTimeScore: number;
}

export interface DriverProfile {
  idmDesiredSpeed: number; // px/s
  idmMinGap: number; // px
  idmTimeHeadway: number; // seconds
  idmMaxAcceleration: number; // px/s^2
  idmComfortableDeceleration: number; // px/s^2
  aggression: number; // 0.0 to 1.0
  patience: number; // 0.0 to 1.0 (decreases when stopped)
}

export interface VehicleAgent {
  id: string;
  type: VehicleType;
  fuelType: FuelType;
  width: number;
  length: number;
  color: string;
  
  // Dynamic Kinematics
  x: number;
  y: number;
  angle: number; // in radians
  speed: number; // current velocity
  acceleration: number;
  
  // Routing & Lane Tracking
  currentEdgeId: string;
  currentLaneIndex: number;
  distanceAlongEdge: number;
  routeNodeIds: string[];
  routeIndex: number;
  
  // Driver Ergonomics & Physics
  driver: DriverProfile;
  isEmergencyActive: boolean;
  isStalled: boolean;
  waitingSeconds: number;
  
  // Environmental Tracking
  accumulatedCo2Grams: number;
  fuelConsumedLiters: number;
  evEnergyConsumedKwh: number;
}

export interface EmergencyDispatchMission {
  id: string;
  vehicleId: string;
  originNodeId: string;
  destinationNodeId: string;
  status: 'dispatched' | 'en_route' | 'arrived' | 'cleared';
  startTime: number;
  preemptedIntersections: string[];
}

export interface CityEnvironmentalTelemetry {
  totalCo2EmissionsKg: number;
  evSavedCo2Kg: number;
  totalActiveVehicles: number;
  averageSpeedKmh: number;
  congestionIndexPercent: number; // 0% (free flow) to 100% (gridlock)
  noiseLevelDb: number;
  totalFuelLiters: number;
  totalEvKwh: number;
  qLearningReward: number;
  clearedVehiclesCount: number;
}

export interface CitySimulationState {
  timeScale: number;
  weather: WeatherCondition;
  aiMode: AIControlMode;
  spawnRatePerMinute: number;
  evAdoptionRatePercent: number;
  isPaused: boolean;
  selectedVehicleId: string | null;
  is25DTilt: boolean;
  isV2XEnabled: boolean;
}

export interface V2XMeshLink {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'v2v' | 'fcw' | 'platoon' | 'v2i';
}

export interface PedestrianAgent {
  id: string;
  crosswalkId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  state: 'waiting' | 'crossing' | 'done';
  color: string;
}

export interface LevelOfServiceReport {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  descriptionAr: string;
  descriptionEn: string;
  badgeColor: string;
  averageDelaySeconds: number;
  economicSavingsSar: number;
}

