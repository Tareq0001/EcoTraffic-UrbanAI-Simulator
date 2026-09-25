/**
 * EcoTraffic UrbanAI | Interactive Reinforcement Learning Training Lab
 * ====================================================================
 * An in-browser RL playground for training and inspecting Q-Learning signal agents:
 * - Hyperparameter sliders (Alpha Learning Rate, Gamma Discount, Epsilon Greedy)
 * - Fast-forward multi-episode training loop
 * - Live reward convergence Canvas chart
 * - Real-time Q-table policy inspector
 * - Quantitative benchmark (Fixed vs. Actuated vs. Q-Learning)
 * 
 * Author: Tareq Ali (@Tareq0001)
 */

class AiTrainingLab {
  constructor(signalEngine) {
    this.signalEngine = signalEngine;
    this.alpha = 0.15; // Learning Rate
    this.gamma = 0.90; // Discount Factor
    this.epsilon = 0.10; // Exploration Rate
    this.trainingHistory = []; // Array of episode rewards
    this.totalEpisodesTrained = 0;
  }

  /**
   * Runs fast simulated episodes directly in the browser to optimize Q-table
   */
  trainEpisodes(numEpisodes = 50) {
    for (let ep = 0; ep < numEpisodes; ep++) {
      let epReward = 0;
      let queueA = Math.floor(Math.random() * 5);
      let queueW = Math.floor(Math.random() * 5);
      let phase = Math.floor(Math.random() * 2);

      for (let step = 0; step < 20; step++) {
        const stateKey = `${queueA}_${queueW}_${phase}`;
        if (!this.signalEngine.qTable[stateKey]) {
          this.signalEngine.qTable[stateKey] = [0.0, 0.0];
        }

        // Epsilon-greedy action selection
        let action = 0; // 0 = keep, 1 = switch
        if (Math.random() < this.epsilon) {
          action = Math.random() < 0.5 ? 0 : 1;
        } else {
          const [q0, q1] = this.signalEngine.qTable[stateKey];
          action = q1 > q0 ? 1 : 0;
        }

        // Environment transition & reward
        // Action 0: Keep green -> active queue diminishes, waiting queue grows
        // Action 1: Switch green -> waiting becomes active, yellow transition penalty
        let nextQueueA = queueA;
        let nextQueueW = queueW;
        let nextPhase = phase;
        let reward = 0;

        if (action === 0) {
          nextQueueA = Math.max(0, queueA - 1 + (Math.random() < 0.3 ? 1 : 0));
          nextQueueW = Math.min(4, queueW + (Math.random() < 0.4 ? 1 : 0));
          reward = -(nextQueueA * 1.0 + nextQueueW * 2.2); // penalize waiting cars heavily
        } else {
          nextPhase = 1 - phase;
          nextQueueA = queueW; // swapped
          nextQueueW = queueA;
          reward = -(nextQueueA * 1.0 + nextQueueW * 1.5) - 3.0; // yellow light switching cost
        }

        epReward += reward;

        // Q-Learning Bellman Update
        const nextStateKey = `${nextQueueA}_${nextQueueW}_${nextPhase}`;
        const nextQValues = this.signalEngine.qTable[nextStateKey] || [0.0, 0.0];
        const maxNextQ = Math.max(...nextQValues);

        const currentQ = this.signalEngine.qTable[stateKey][action];
        const target = reward + this.gamma * maxNextQ;
        const newQ = currentQ + this.alpha * (target - currentQ);

        this.signalEngine.qTable[stateKey][action] = Math.round(newQ * 100) / 100;

        queueA = nextQueueA;
        queueW = nextQueueW;
        phase = nextPhase;
      }

      this.trainingHistory.push(epReward);
      this.totalEpisodesTrained++;
    }

    return this.trainingHistory;
  }

  /**
   * Draws the reward convergence curve on a target canvas
   */
  drawConvergenceChart(canvas) {
    if (!canvas || this.trainingHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background & Gridlines
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Min & Max rewards
    const minR = Math.min(...this.trainingHistory);
    const maxR = Math.max(...this.trainingHistory);
    const range = (maxR - minR) || 1;

    // Draw Line
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < this.trainingHistory.length; i++) {
      const x = (i / (this.trainingHistory.length - 1)) * (w - 30) + 15;
      const normalized = (this.trainingHistory[i] - minR) / range;
      const y = h - 15 - (normalized * (h - 30));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Chart Title & Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Episodes: ${this.totalEpisodesTrained} | Max R: ${Math.round(maxR)}`, 10, 14);
  }
}
