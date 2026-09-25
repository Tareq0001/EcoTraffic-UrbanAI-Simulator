/**
 * EcoTraffic UrbanAI | City Road Network Presets & Layout Generator
 * =================================================================
 * Generates geometric street topologies:
 * 1. Abha Ring & King Fahd Mountain Corridor (طريق الملك فهد والدائري - أبها)
 * 2. Metropolitan Urban Grid (الشبكة الحضرية المركزية)
 * 3. Turbo Smart Roundabout (الدوار الذكي المتعدد)
 * 4. Highway Cloverleaf Interchange (التقاطع السريع الحر)
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class CityPresetsGenerator {
  /**
   * 1. Abha Ring & King Fahd Mountain Boulevard
   */
  static buildAbhaCorridor(network, signalEngine) {
    network.clear();
    signalEngine.intersections.clear();

    // Central & Perimeter Nodes
    // Ring Road Nodes: Top-Left, Top-Right, Bottom-Right, Bottom-Left
    network.addNode('A_TL', 140, 110, false, 'الدائري شمال غرب');
    network.addNode('A_TR', 840, 110, false, 'الدائري شمال شرق');
    network.addNode('A_BR', 840, 590, false, 'الدائري جنوب شرق');
    network.addNode('A_BL', 140, 590, false, 'الدائري جنوب غرب');

    // Central Major Intersections on King Fahd Boulevard
    network.addNode('INT_WEST', 360, 350, true, 'تقاطع طريق الملك فهد (غرب)');
    network.addNode('INT_EAST', 620, 350, true, 'تقاطع طريق الملك فهد (شرق)');

    // Perimeter Entry / Exit Spines
    network.addNode('SPINE_N', 490, 40, false, 'مدخل طريق السودة');
    network.addNode('SPINE_S', 490, 660, false, 'مدخل طريق خميس مشيط');
    network.addNode('SPINE_W', 50, 350, false, 'مدخل الحزام الدائري');
    network.addNode('SPINE_E', 930, 350, false, 'طريق المطار');

    // --- EDGES ---
    // Outer Ring Road (Clockwise, 2-lane, 80 km/h)
    network.addEdge('E_R1', 'A_TL', 'A_TR', 2, 80, 'الدائري الشمالي', 'North Ring');
    network.addEdge('E_R2', 'A_TR', 'A_BR', 2, 80, 'الدائري الشرقي', 'East Ring');
    network.addEdge('E_R3', 'A_BR', 'A_BL', 2, 80, 'الدائري الجنوبي', 'South Ring');
    network.addEdge('E_R4', 'A_BL', 'A_TL', 2, 80, 'الدائري الغربي', 'West Ring');

    // King Fahd Central Arterial (3 lanes each direction, 70 km/h)
    network.addEdge('E_KF_W1', 'SPINE_W', 'INT_WEST', 3, 70, 'طريق الملك فهد غرب', 'King Fahd W');
    network.addEdge('E_KF_W2', 'INT_WEST', 'SPINE_W', 3, 70, 'طريق الملك فهد غرب', 'King Fahd W');

    network.addEdge('E_KF_C1', 'INT_WEST', 'INT_EAST', 3, 70, 'بوليفارد الملك فهد', 'King Fahd Central');
    network.addEdge('E_KF_C2', 'INT_EAST', 'INT_WEST', 3, 70, 'بوليفارد الملك فهد', 'King Fahd Central');

    network.addEdge('E_KF_E1', 'INT_EAST', 'SPINE_E', 3, 70, 'طريق الملك فهد شرق', 'King Fahd E');
    network.addEdge('E_KF_E2', 'SPINE_E', 'INT_EAST', 3, 70, 'طريق الملك فهد شرق', 'King Fahd E');

    // North-South Mountain Avenues connecting to Ring
    network.addEdge('E_NS_W1', 'A_TL', 'INT_WEST', 2, 60, 'شارع الأندلس', 'Alandalus St');
    network.addEdge('E_NS_W2', 'INT_WEST', 'A_BL', 2, 60, 'شارع الأندلس', 'Alandalus St');

    network.addEdge('E_NS_E1', 'A_TR', 'INT_EAST', 2, 60, 'شارع السلام', 'Alsalam St');
    network.addEdge('E_NS_E2', 'INT_EAST', 'A_BR', 2, 60, 'شارع السلام', 'Alsalam St');

    // Spines to Central Intersections
    network.addEdge('E_SP_N1', 'SPINE_N', 'INT_WEST', 2, 65, 'طريق السودة جنوب', 'Soudah S');
    network.addEdge('E_SP_N2', 'SPINE_N', 'INT_EAST', 2, 65, 'طريق السودة شرق', 'Soudah E');
    network.addEdge('E_SP_S1', 'INT_WEST', 'SPINE_S', 2, 65, 'طريق الخميس', 'Khamis S');
    network.addEdge('E_SP_S2', 'INT_EAST', 'SPINE_S', 2, 65, 'طريق الخميس', 'Khamis S');

    // --- SIGNALS CONFIGURATION ---
    // Intersection West
    signalEngine.registerIntersection('INT_WEST', [
      { id: 'PH_W_EW', activeEdgeIds: ['E_KF_W1', 'E_KF_C2'], duration: 22 },
      { id: 'PH_W_NS', activeEdgeIds: ['E_NS_W1', 'E_SP_N1'], duration: 16 }
    ], 8, 45, 3.5);

    // Intersection East
    signalEngine.registerIntersection('INT_EAST', [
      { id: 'PH_E_EW', activeEdgeIds: ['E_KF_C1', 'E_KF_E2'], duration: 22 },
      { id: 'PH_E_NS', activeEdgeIds: ['E_NS_E1', 'E_SP_N2'], duration: 16 }
    ], 8, 45, 3.5);
  }

  /**
   * 2. Metropolitan Urban Grid (4-Intersection Downtown)
   */
  static buildDowntownGrid(network, signalEngine) {
    network.clear();
    signalEngine.intersections.clear();

    const xs = [160, 420, 680, 940];
    const ys = [120, 320, 520, 720];

    // Create 4 main intersection nodes (2x2 grid)
    network.addNode('G_NW', xs[1], ys[1], true, 'التقاطع 1 (شمال غرب)');
    network.addNode('G_NE', xs[2], ys[1], true, 'التقاطع 2 (شمال شرق)');
    network.addNode('G_SW', xs[1], ys[2], true, 'التقاطع 3 (جنوب غرب)');
    network.addNode('G_SE', xs[2], ys[2], true, 'التقاطع 4 (جنوب شرق)');

    // Outer Boundary feeder nodes
    network.addNode('F_N1', xs[1], ys[0], false, 'تغذية شمالية 1');
    network.addNode('F_N2', xs[2], ys[0], false, 'تغذية شمالية 2');
    network.addNode('F_S1', xs[1], ys[3], false, 'تغذية جنوبية 1');
    network.addNode('F_S2', xs[2], ys[3], false, 'تغذية جنوبية 2');

    network.addNode('F_W1', xs[0], ys[1], false, 'تغذية غربية 1');
    network.addNode('F_W2', xs[0], ys[2], false, 'تغذية غربية 2');
    network.addNode('F_E1', xs[3], ys[1], false, 'تغذية شرقية 1');
    network.addNode('F_E2', xs[3], ys[2], false, 'تغذية شرقية 2');

    // Horizontal 2-way avenues
    const addBi = (id, a, b, lanes = 2, spd = 60, name = '') => {
      network.addEdge(`${id}_A`, a, b, lanes, spd, name, name);
      network.addEdge(`${id}_B`, b, a, lanes, spd, name, name);
    };

    addBi('H_N_L', 'F_W1', 'G_NW', 2, 60, 'شارع الملك فهد');
    addBi('H_N_C', 'G_NW', 'G_NE', 2, 60, 'شارع الملك فهد وسط');
    addBi('H_N_R', 'G_NE', 'F_E1', 2, 60, 'شارع الملك فهد شرق');

    addBi('H_S_L', 'F_W2', 'G_SW', 2, 60, 'شارع العليا');
    addBi('H_S_C', 'G_SW', 'G_SE', 2, 60, 'شارع العليا وسط');
    addBi('H_S_R', 'G_SE', 'F_E2', 2, 60, 'شارع العليا شرق');

    // Vertical 2-way boulevards
    addBi('V_W_T', 'F_N1', 'G_NW', 2, 60, 'طريق الملك خالد');
    addBi('V_W_C', 'G_NW', 'G_SW', 2, 60, 'طريق الملك خالد وسط');
    addBi('V_W_B', 'G_SW', 'F_S1', 2, 60, 'طريق الملك خالد جنوب');

    addBi('V_E_T', 'F_N2', 'G_NE', 2, 60, 'طريق الملك عبدالعزيز');
    addBi('V_E_C', 'G_NE', 'G_SE', 2, 60, 'طريق الملك عبدالعزيز وسط');
    addBi('V_E_B', 'G_SE', 'F_S2', 2, 60, 'طريق الملك عبدالعزيز جنوب');

    // Setup 4 Synchronized AI Signal Intersections
    signalEngine.registerIntersection('G_NW', [
      { id: 'P_NW_H', activeEdgeIds: ['H_N_L_A', 'H_N_C_B'], duration: 18 },
      { id: 'P_NW_V', activeEdgeIds: ['V_W_T_A', 'V_W_C_B'], duration: 18 }
    ]);

    signalEngine.registerIntersection('G_NE', [
      { id: 'P_NE_H', activeEdgeIds: ['H_N_C_A', 'H_N_R_B'], duration: 18 },
      { id: 'P_NE_V', activeEdgeIds: ['V_E_T_A', 'V_E_C_B'], duration: 18 }
    ]);

    signalEngine.registerIntersection('G_SW', [
      { id: 'P_SW_H', activeEdgeIds: ['H_S_L_A', 'H_S_C_B'], duration: 18 },
      { id: 'P_SW_V', activeEdgeIds: ['V_W_C_A', 'V_W_B_B'], duration: 18 }
    ]);

    signalEngine.registerIntersection('G_SE', [
      { id: 'P_SE_H', activeEdgeIds: ['H_S_C_A', 'H_S_R_B'], duration: 18 },
      { id: 'P_SE_V', activeEdgeIds: ['V_E_C_A', 'V_E_B_B'], duration: 18 }
    ]);
  }

  /**
   * 3. Turbo Smart Multi-Lane Roundabout
   */
  static buildSmartRoundabout(network, signalEngine) {
    network.clear();
    signalEngine.intersections.clear();

    const cx = 500;
    const cy = 350;
    const r = 160;

    // 8 Ring Nodes forming roundabout circle
    const numRingNodes = 8;
    for (let i = 0; i < numRingNodes; i++) {
      const theta = (i / numRingNodes) * Math.PI * 2;
      const rx = cx + Math.cos(theta) * r;
      const ry = cy + Math.sin(theta) * r;
      network.addNode(`R_${i}`, rx, ry, false, `دوار ${i + 1}`);
    }

    // Outer Arterial Spines (North, East, South, West)
    network.addNode('SP_NORTH', cx, 60, false, 'طريق الشمال');
    network.addNode('SP_EAST', 930, cy, false, 'طريق الشرق');
    network.addNode('SP_SOUTH', cx, 640, false, 'طريق الجنوب');
    network.addNode('SP_WEST', 70, cy, false, 'طريق الغرب');

    // Connect Circular Roundabout (Counter-Clockwise in KSA / Right-hand traffic)
    // In screen coordinates: Counter-Clockwise is increasing angle
    for (let i = 0; i < numRingNodes; i++) {
      const next = (i + 1) % numRingNodes;
      network.addEdge(`E_RING_${i}`, `R_${i}`, `R_${next}`, 3, 50, 'حلقة الدوار', 'Roundabout Ring');
    }

    // Entry & Exit Slipways (North: R_6, East: R_0, South: R_2, West: R_4)
    // North Approach
    network.addEdge('E_N_IN', 'SP_NORTH', 'R_6', 2, 60, 'مدخل الشمال', 'North Entry');
    network.addEdge('E_N_OUT', 'R_6', 'SP_NORTH', 2, 60, 'مخرج الشمال', 'North Exit');

    // East Approach
    network.addEdge('E_E_IN', 'SP_EAST', 'R_0', 2, 60, 'مدخل الشرق', 'East Entry');
    network.addEdge('E_E_OUT', 'R_0', 'SP_EAST', 2, 60, 'مخرج الشرق', 'East Exit');

    // South Approach
    network.addEdge('E_S_IN', 'SP_SOUTH', 'R_2', 2, 60, 'مدخل الجنوب', 'South Entry');
    network.addEdge('E_S_OUT', 'R_2', 'SP_SOUTH', 2, 60, 'مخرج الجنوب', 'South Exit');

    // West Approach
    network.addEdge('E_W_IN', 'SP_WEST', 'R_4', 2, 60, 'مدخل الغرب', 'West Entry');
    network.addEdge('E_W_OUT', 'R_4', 'SP_WEST', 2, 60, 'مخرج الغرب', 'West Exit');
  }

  /**
   * 4. Highway Cloverleaf & Free-Flow Interchange
   */
  static buildHighwayCloverleaf(network, signalEngine) {
    network.clear();
    signalEngine.intersections.clear();

    // Main Highway (East-West): Elevated 3-lane Expressway (100 km/h)
    network.addNode('HW_W', 50, 350, false, 'طريق سريع غرب');
    network.addNode('HW_C_W', 400, 350, false, 'تقاطع سريع غرب');
    network.addNode('HW_C_E', 600, 350, false, 'تقاطع سريع شرق');
    network.addNode('HW_E', 950, 350, false, 'طريق سريع شرق');

    network.addEdge('HW_E_1', 'HW_W', 'HW_C_W', 3, 100, 'طريق الرياض السريع', 'Expressway E1');
    network.addEdge('HW_E_2', 'HW_C_W', 'HW_C_E', 3, 100, 'جسر التقاطع الرئيسي', 'Overpass');
    network.addEdge('HW_E_3', 'HW_C_E', 'HW_E', 3, 100, 'طريق الرياض السريع', 'Expressway E2');

    network.addEdge('HW_W_1', 'HW_E', 'HW_C_E', 3, 100, 'طريق مكة السريع', 'Expressway W1');
    network.addEdge('HW_W_2', 'HW_C_E', 'HW_C_W', 3, 100, 'جسر التقاطع الرئيسي', 'Overpass');
    network.addEdge('HW_W_3', 'HW_C_W', 'HW_W', 3, 100, 'طريق مكة السريع', 'Expressway W2');

    // Cross Arterial (North-South, 80 km/h)
    network.addNode('ART_N', 500, 60, false, 'شريان الشمال');
    network.addNode('ART_C_N', 500, 250, false, 'تحويلة الشمال');
    network.addNode('ART_C_S', 500, 450, false, 'تحويلة الجنوب');
    network.addNode('ART_S', 500, 640, false, 'شريان الجنوب');

    network.addEdge('ART_S_1', 'ART_N', 'ART_C_N', 2, 80, 'طريق الأمير محمد بن سلمان', 'Arterial S1');
    network.addEdge('ART_S_2', 'ART_C_N', 'ART_C_S', 2, 80, 'نفق التقاطع', 'Underpass');
    network.addEdge('ART_S_3', 'ART_C_S', 'ART_S', 2, 80, 'طريق الأمير محمد بن سلمان', 'Arterial S2');

    network.addEdge('ART_N_1', 'ART_S', 'ART_C_S', 2, 80, 'طريق الأمير محمد بن سلمان', 'Arterial N1');
    network.addEdge('ART_N_2', 'ART_C_S', 'ART_C_N', 2, 80, 'نفق التقاطع', 'Underpass');
    network.addEdge('ART_N_3', 'ART_C_N', 'ART_N', 2, 80, 'طريق الأمير محمد بن سلمان', 'Arterial N2');

    // Free Flow Cloverleaf Connectors
    network.addEdge('CLOVER_NE', 'HW_C_E', 'ART_C_N', 1, 55, 'تحويلة شمالية شرقية', 'Ramp NE');
    network.addEdge('CLOVER_NW', 'ART_C_N', 'HW_C_W', 1, 55, 'تحويلة شمالية غربية', 'Ramp NW');
    network.addEdge('CLOVER_SE', 'ART_C_S', 'HW_C_E', 1, 55, 'تحويلة جنوبية شرقية', 'Ramp SE');
    network.addEdge('CLOVER_SW', 'HW_C_W', 'ART_C_S', 1, 55, 'تحويلة جنوبية غربية', 'Ramp SW');
  }
}
