-- =====================================================================
-- EcoTraffic UrbanAI | Smart City Traffic Management Schema
-- Enterprise PostgreSQL / SQLite Relational Schema for Urban Digital Twin
-- Author: Tareq Ali (@Tareq0001)
-- =====================================================================

-- 1. Intersections & Nodes
CREATE TABLE intersections (
    intersection_id VARCHAR(32) PRIMARY KEY,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128) NOT NULL,
    district VARCHAR(64) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    controller_type VARCHAR(32) DEFAULT 'q_learning_ai', -- 'fixed', 'actuated', 'q_learning_ai'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Road Segments & Corridors
CREATE TABLE road_segments (
    segment_id VARCHAR(32) PRIMARY KEY,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128) NOT NULL,
    from_intersection_id VARCHAR(32) REFERENCES intersections(intersection_id),
    to_intersection_id VARCHAR(32) REFERENCES intersections(intersection_id),
    length_meters DECIMAL(8, 2) NOT NULL,
    lanes_count INT DEFAULT 3,
    speed_limit_kmh INT DEFAULT 80,
    road_type VARCHAR(32) DEFAULT 'arterial' -- 'highway', 'arterial', 'boulevard', 'collector'
);

-- 3. IoT Sensor Detectors (Inductive loops & AI Video feeds)
CREATE TABLE traffic_detectors (
    detector_id VARCHAR(32) PRIMARY KEY,
    segment_id VARCHAR(32) REFERENCES road_segments(segment_id),
    lane_index INT NOT NULL,
    detector_type VARCHAR(32) DEFAULT 'ai_camera', -- 'inductive_loop', 'radar', 'ai_camera'
    calibration_status VARCHAR(16) DEFAULT 'active'
);

-- 4. High-Frequency Real-Time Telemetry Logs
CREATE TABLE detector_telemetry_logs (
    log_id BIGSERIAL PRIMARY KEY,
    detector_id VARCHAR(32) REFERENCES traffic_detectors(detector_id),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vehicle_count INT DEFAULT 0,
    occupancy_percent DECIMAL(5, 2) NOT NULL,
    average_speed_kmh DECIMAL(5, 2) NOT NULL,
    congestion_level VARCHAR(16) DEFAULT 'free_flow' -- 'free_flow', 'moderate', 'congested', 'gridlock'
);

-- 5. AI Signal Phase Policies
CREATE TABLE ai_signal_phases (
    phase_id VARCHAR(32) PRIMARY KEY,
    intersection_id VARCHAR(32) REFERENCES intersections(intersection_id),
    phase_order INT NOT NULL,
    min_green_seconds INT DEFAULT 10,
    max_green_seconds INT DEFAULT 60,
    amber_seconds INT DEFAULT 4,
    all_red_seconds INT DEFAULT 2,
    q_learning_state_weight DECIMAL(8, 4) DEFAULT 1.0000
);

-- 6. Emergency Preemption & Incident Logs
CREATE TABLE traffic_incidents (
    incident_id VARCHAR(32) PRIMARY KEY,
    segment_id VARCHAR(32) REFERENCES road_segments(segment_id),
    incident_type VARCHAR(32) NOT NULL, -- 'accident', 'stalled_vehicle', 'emergency_corridor', 'flash_flood'
    severity_level VARCHAR(16) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cleared_at TIMESTAMP NULL,
    impact_delay_minutes DECIMAL(6, 2) DEFAULT 0.0
);

-- 7. Environmental & Carbon Footprint Hourly Ledger
CREATE TABLE environmental_emissions_hourly (
    record_id BIGSERIAL PRIMARY KEY,
    district VARCHAR(64) NOT NULL,
    hour_timestamp TIMESTAMP NOT NULL,
    co2_emissions_kg DECIMAL(10, 2) NOT NULL,
    ev_saved_co2_kg DECIMAL(10, 2) NOT NULL,
    fuel_consumed_liters DECIMAL(10, 2) NOT NULL,
    avg_ambient_noise_db DECIMAL(5, 2) NOT NULL
);

-- Indexes for lightning fast spatial-temporal analytics
CREATE INDEX idx_telemetry_time ON detector_telemetry_logs (timestamp);
CREATE INDEX idx_incidents_active ON traffic_incidents (cleared_at);
CREATE INDEX idx_emissions_district ON environmental_emissions_hourly (district, hour_timestamp);
