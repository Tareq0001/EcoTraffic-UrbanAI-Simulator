/**
 * EcoTraffic UrbanAI | Environmental Emissions & City Analytics Engine
 * ===================================================================
 * Real-time monitoring of CO2 footprints, EV offsets, noise pollution,
 * and congestion indices with rolling timeseries history.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class EnvironmentalEngine {
  constructor() {
    this.totalCo2Kg = 0.0;
    this.totalEvSavedCo2Kg = 0.0;
    this.totalFuelLiters = 0.0;
    this.totalEvKwh = 0.0;
    this.historyBuffer = []; // { time, avgSpeed, co2Rate, congestion }
    this.maxHistory = 40;
    this.sampleTimer = 0;
  }

  reset() {
    this.totalCo2Kg = 0.0;
    this.totalEvSavedCo2Kg = 0.0;
    this.totalFuelLiters = 0.0;
    this.totalEvKwh = 0.0;
    this.historyBuffer = [];
    this.sampleTimer = 0;
  }

  update(dt, vehicles, network) {
    if (vehicles.length === 0) return;

    let activeVehicles = 0;
    let sumSpeed = 0;
    let sumCo2Grams = 0;
    let sumFuelLiters = 0;
    let sumEvKwh = 0;
    let heavyVehicleCount = 0;

    for (const v of vehicles) {
      if (v.isFinished) continue;
      activeVehicles++;
      sumSpeed += v.speed;
      sumCo2Grams += v.co2Grams;
      sumFuelLiters += v.fuelLiters;
      sumEvKwh += v.evKwhConsumed;

      if (v.type === 'truck' || v.type === 'bus') {
        heavyVehicleCount++;
      }
    }

    if (activeVehicles === 0) return;

    this.totalCo2Kg = sumCo2Grams / 1000.0;
    this.totalFuelLiters = sumFuelLiters;
    this.totalEvKwh = sumEvKwh;

    // EV Clean Energy Offset: Each kWh of EV replaces ~0.24 Liters of gasoline (~574g CO2 saved)
    this.totalEvSavedCo2Kg = (this.totalEvKwh * 0.574);

    const avgSpeedPx = sumSpeed / activeVehicles;
    // Map px/s to km/h (scale: ~1.2 km/h per px/s)
    const avgSpeedKmh = Math.round(avgSpeedPx * 1.15);

    // Free flow nominal speed ~ 65 km/h
    const nominalSpeed = 65;
    const congestionPercent = Math.max(0, Math.min(100, Math.round((1 - (avgSpeedKmh / nominalSpeed)) * 100)));

    // Ambient Noise Index (dB): Base 45 dB + traffic density + heavy vehicle rumble
    const noiseDb = Math.min(92, Math.round(48 + Math.log10(activeVehicles + 1) * 12 + (heavyVehicleCount * 1.5) + (congestionPercent * 0.12)));

    // Timeseries logging every 1.5 seconds
    this.sampleTimer += dt;
    if (this.sampleTimer >= 1.5) {
      this.sampleTimer = 0;
      this.historyBuffer.push({
        time: Date.now(),
        avgSpeed: avgSpeedKmh,
        congestion: congestionPercent,
        co2Kg: Math.round(this.totalCo2Kg * 100) / 100
      });
      if (this.historyBuffer.length > this.maxHistory) {
        this.historyBuffer.shift();
      }
    }

    return {
      activeVehicles,
      avgSpeedKmh,
      congestionPercent,
      totalCo2Kg: Math.round(this.totalCo2Kg * 100) / 100,
      totalEvSavedCo2Kg: Math.round(this.totalEvSavedCo2Kg * 100) / 100,
      totalFuelLiters: Math.round(this.totalFuelLiters * 10) / 10,
      totalEvKwh: Math.round(this.totalEvKwh * 10) / 10,
      noiseDb,
      history: this.historyBuffer
    };
  }
}
