/**
 * EcoTraffic UrbanAI | Smart City Sustainability & Level of Service (LOS) Report
 * ==============================================================================
 * Evaluates urban mobility performance according to the Highway Capacity Manual (HCM):
 * - Level of Service (LOS A to F) based on control delay per vehicle
 * - Total Carbon & Greenhouse Gas mitigation metrics
 * - Economic efficiency score & fuel savings in SAR
 * - JSON Export & Print-ready report generation
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class SmartCityReportGenerator {
  static computeMetrics(envEngine, signalEngine, vehiclesList, network) {
    const totalVehicles = vehiclesList.length;
    const avgDelay = totalVehicles > 0 ? (signalEngine.cumulativeDelaySeconds / Math.max(1, totalVehicles)) : 0;

    // Highway Capacity Manual (HCM) LOS Rating Table:
    // Delay <= 10s: LOS A (Free Flow)
    // 10s < Delay <= 20s: LOS B (Reasonably Free Flow)
    // 20s < Delay <= 35s: LOS C (Stable Flow)
    // 35s < Delay <= 55s: LOS D (Approaching Unstable Flow)
    // 55s < Delay <= 80s: LOS E (Unstable Flow)
    // Delay > 80s: LOS F (Breakdown / Extreme Congestion)
    let losGrade = 'A';
    let losDescAr = 'تدفق حر ممتاز دون تأخير يذكر';
    let losDescEn = 'Free Flow: Negligible Delays';
    let losColor = '#10b981';

    if (avgDelay > 80) {
      losGrade = 'F';
      losDescAr = 'اختناق مروري حاد وتوقف شبه تام';
      losDescEn = 'Forced Breakdown Flow';
      losColor = '#ef4444';
    } else if (avgDelay > 55) {
      losGrade = 'E';
      losDescAr = 'تدفق غير مستقر وعلى وشك التوقف';
      losDescEn = 'Unstable Flow Near Capacity';
      losColor = '#f97316';
    } else if (avgDelay > 35) {
      losGrade = 'D';
      losDescAr = 'تدفق مقيد مع طوابير ملحوظة';
      losDescEn = 'Approaching Unstable Flow';
      losColor = '#f59e0b';
    } else if (avgDelay > 20) {
      losGrade = 'C';
      losDescAr = 'تدفق مستقر مع سرعات مقبولة';
      losDescEn = 'Stable Flow';
      losColor = '#06b6d4';
    } else if (avgDelay > 10) {
      losGrade = 'B';
      losDescAr = 'تدفق حر بدرجة جيدة جداً';
      losDescEn = 'Reasonably Free Flow';
      losColor = '#3b82f6';
    }

    // Economic and fuel calculations
    const fuelSavedLiters = envEngine.evOffsetKg * 0.43; // approximate gasoline equivalent
    const economicSavingsSar = fuelSavedLiters * 2.33; // SAR price per liter approx 91 octane

    return {
      timestamp: new Date().toISOString(),
      cityTopology: network.nodes.size > 8 ? 'Abha Metropolitan Corridor' : 'Urban Network',
      signalControlMode: signalEngine.mode.toUpperCase(),
      totalActiveVehicles: totalVehicles,
      averageDelaySeconds: Math.round(avgDelay * 10) / 10,
      levelOfService: {
        grade: losGrade,
        descriptionAr: losDescAr,
        descriptionEn: losDescEn,
        badgeColor: losColor
      },
      environmentalFootprint: {
        totalCo2Kg: Math.round(envEngine.cumulativeCo2Kg * 100) / 100,
        evCleanEnergyOffsetKg: Math.round(envEngine.evOffsetKg * 100) / 100,
        equivalentFuelSavedLiters: Math.round(fuelSavedLiters * 10) / 10,
        estimatedEconomicBenefitSar: Math.round(economicSavingsSar * 10) / 10,
        averageNoiseLevelDecibels: Math.round(envEngine.noiseDecibels)
      },
      emergencyOperations: {
        greenWavePreemptions: signalEngine.emergencyPreemptionsCount || 0
      }
    };
  }

  static downloadJson(metrics) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(metrics, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SmartCity_Telemetry_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
