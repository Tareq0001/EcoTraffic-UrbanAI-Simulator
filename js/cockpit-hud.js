/**
 * EcoTraffic UrbanAI | Cockpit Telemetry HUD & Virtual Instrument Cluster
 * ======================================================================
 * Renders a high-tech Tesla / Formula-E digital cockpit overlay for inspected vehicles:
 * - Dynamic circular speedometer & digital velocity readout
 * - IDM Safe Gap Radar (Actual Gap vs. Dynamical Desired Gap s*)
 * - Real-time Throttle & Brake pedal pressure meters
 * - Instantaneous Fuel / EV energy flow and Eco-Driving Rating
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class CockpitHudEngine {
  constructor() {
    this.isOpen = false;
    this.isChaseCam = false;
  }

  toggle() {
    this.isOpen = !this.isOpen;
    return this.isOpen;
  }

  toggleChaseCam() {
    this.isChaseCam = !this.isChaseCam;
    return this.isChaseCam;
  }

  /**
   * Renders the cockpit digital instrument cluster overlay
   */
  draw(ctx, vehicle, network, signalEngine) {
    if (!this.isOpen || !vehicle || vehicle.isFinished) return;

    ctx.save();

    // Semi-transparent HUD Glass Container in bottom-left
    const hudW = 320;
    const hudH = 160;
    const hudX = 24;
    const hudY = 700 - hudH - 24;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 12);
    ctx.fill();
    ctx.stroke();

    // Subtle Grid Glow
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hudX + 8, hudY + 8, hudW - 16, hudH - 16);

    // 1. Title Bar
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`🏎️ COCKPIT HUD // [${vehicle.id}] ${vehicle.type.toUpperCase()}`, hudX + 16, hudY + 24);

    // 2. Circular Speedometer Dial (Left)
    const dialCenterX = hudX + 65;
    const dialCenterY = hudY + 95;
    const dialR = 40;

    // Background Arc
    ctx.beginPath();
    ctx.arc(dialCenterX, dialCenterY, dialR, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Active Speed Arc
    const speedRatio = Math.min(1.0, vehicle.speed / 100);
    const endAngle = Math.PI * 0.75 + (Math.PI * 1.5 * speedRatio);
    ctx.beginPath();
    ctx.arc(dialCenterX, dialCenterY, dialR, Math.PI * 0.75, endAngle);
    ctx.strokeStyle = vehicle.type === 'ev' ? '#10b981' : '#38bdf8';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Digital Speed Display
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(vehicle.speed * 1.4), dialCenterX, dialCenterY + 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px sans-serif';
    ctx.fillText('KM/H', dialCenterX, dialCenterY + 16);

    // 3. Throttle & Brake Pedals (Center-Right)
    const barX = hudX + 130;
    const barY = hudY + 45;
    const barW = 85;
    const barH = 10;

    // Throttle Bar (Green)
    const throttleRatio = Math.max(0, Math.min(1, vehicle.acceleration / 30));
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`THROTTLE ${Math.round(throttleRatio * 100)}%`, barX, barY);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY + 4, barW, barH);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(barX, barY + 4, barW * throttleRatio, barH);

    // Brake Bar (Red)
    const brakeRatio = Math.max(0, Math.min(1, -vehicle.acceleration / 25));
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`BRAKE ${Math.round(brakeRatio * 100)}%`, barX, barY + 28);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY + 32, barW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barX, barY + 32, barW * brakeRatio, barH);

    // 4. IDM Radar Gap & Forward Sensors (Far-Right)
    const radarX = hudX + 230;
    const radarY = hudY + 45;

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('RADAR SENSORS', radarX, radarY);

    const stopLineDist = network.getStopLineDistance(vehicle.currentEdgeId) - vehicle.distanceAlongEdge;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px monospace';
    ctx.fillText(`GAP: ${Math.round(vehicle.distanceAlongEdge)} m`, radarX, radarY + 18);
    ctx.fillText(`STOPLINE: ${Math.round(stopLineDist)} m`, radarX, radarY + 32);

    // Eco Score Badge
    const ecoGrade = vehicle.type === 'ev' ? 'A+' : (vehicle.acceleration > 15 ? 'C' : 'A');
    ctx.fillStyle = ecoGrade.startsWith('A') ? '#10b981' : '#f59e0b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`ECO RATING: ${ecoGrade}`, radarX, radarY + 50);

    // 5. Active Road Status Marquee
    let statusText = '🟢 مسار منطلق بانسيابية';
    let statusColor = '#10b981';

    if (vehicle.acceleration < -12) {
      statusText = '🛑 فرملة طوارئ واستجابة IDM';
      statusColor = '#ef4444';
    } else if (stopLineDist < 40 && stopLineDist > 0) {
      statusText = '🚦 اقتراب من إشارة المرور';
      statusColor = '#f59e0b';
    }

    ctx.fillStyle = statusColor;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`حالة القيادة: ${statusText}`, hudX + 16, hudY + hudH - 12);

    ctx.restore();
  }
}
