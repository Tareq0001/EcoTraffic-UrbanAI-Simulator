/**
 * EcoTraffic UrbanAI | High-Performance Canvas Telemetry Charts
 * =============================================================
 * Renders timeseries graphs, congestion indices, and EV breakdowns
 * directly to HTML5 Canvas elements with zero external chart libraries.
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class TelemetryChartsRenderer {
  /**
   * Draws a smooth continuous timeseries line chart
   */
  static drawTimelineChart(canvas, history) {
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let y = 20; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const n = history.length;
    const stepX = width / (n - 1);

    // 1. Draw Congestion % Fill & Line (Rose / Amber)
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = i * stepX;
      // Congestion is 0 to 100
      const y = height - (pt.congestion / 100) * (height - 20) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 2. Draw Average Speed (Cyan / Sky)
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = i * stepX;
      // Speed max scale 90 km/h
      const y = height - Math.min(1, pt.avgSpeed / 90) * (height - 20) - 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  /**
   * Draws vehicle fleet distribution donut chart
   */
  static drawFleetDistribution(canvas, vehicles) {
    if (!canvas || !vehicles) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const counts = { sedan: 0, suv: 0, ev: 0, bus: 0, truck: 0, emergency: 0 };
    let total = 0;

    for (const v of vehicles) {
      if (v.isFinished) continue;
      counts[v.type] = (counts[v.type] || 0) + 1;
      total++;
    }

    if (total === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Cairo, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد مركبات نشطة', width / 2, height / 2);
      return;
    }

    const colors = {
      sedan: '#38bdf8',
      suv: '#a855f7',
      ev: '#10b981',
      bus: '#f59e0b',
      truck: '#64748b',
      emergency: '#ef4444'
    };

    const cx = width / 2;
    const cy = height / 2;
    const outerR = Math.min(cx, cy) - 10;
    const innerR = outerR * 0.55;

    let startAngle = -Math.PI / 2;

    for (const [type, count] of Object.entries(counts)) {
      if (count === 0) continue;
      const sliceAngle = (count / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = colors[type];
      ctx.fill();

      startAngle = endAngle;
    }

    // Center total badge
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total}`, cx, cy - 4);
    ctx.font = '9px Cairo, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('مركبة', cx, cy + 12);
  }
}
