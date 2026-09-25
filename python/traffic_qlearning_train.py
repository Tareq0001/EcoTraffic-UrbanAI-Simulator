#!/usr/bin/env python3
"""
EcoTraffic UrbanAI | Reinforcement Learning Traffic Signal Optimizer
===================================================================
A standalone Q-Learning model for autonomous traffic signal scheduling.
Maximizes intersection throughput and minimizes cumulative vehicle delay.

Author: Tareq Ali (@Tareq0001)
"""

import json
import math
import random
import sys
from typing import Dict, List, Tuple

# Ensure utf-8 encoding on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

class TrafficIntersectionEnvironment:
    """
    Simulates a 4-way intersection approaching queue dynamics:
    North-South (NS) vs East-West (EW).
    """
    def __init__(self, arrival_rate_ns: float = 0.35, arrival_rate_ew: float = 0.25):
        self.arrival_rate_ns = arrival_rate_ns
        self.arrival_rate_ew = arrival_rate_ew
        self.queue_ns = 0
        self.queue_ew = 0
        self.current_phase = 0  # 0: NS Green, 1: EW Green
        self.time_in_phase = 0
        self.min_green_time = 10
        self.max_green_time = 60
        self.discharge_rate = 0.8  # cars per second when green

    def reset(self) -> Tuple[int, int, int]:
        self.queue_ns = random.randint(2, 8)
        self.queue_ew = random.randint(2, 8)
        self.current_phase = random.choice([0, 1])
        self.time_in_phase = 5
        return self.get_state()

    def get_state(self) -> Tuple[int, int, int]:
        # Discretize queue into 5 bins: 0 (0-2), 1 (3-6), 2 (7-12), 3 (13-20), 4 (21+)
        def discretize(q: int) -> int:
            if q <= 2: return 0
            if q <= 6: return 1
            if q <= 12: return 2
            if q <= 20: return 3
            return 4

        return (discretize(self.queue_ns), discretize(self.queue_ew), self.current_phase)

    def step(self, action: int) -> Tuple[Tuple[int, int, int], float, bool, Dict]:
        """
        Actions:
        0: Keep current phase
        1: Switch phase (if min_green_time reached)
        """
        switch_penalty = 0.0

        if action == 1 and self.time_in_phase >= self.min_green_time:
            self.current_phase = 1 - self.current_phase
            self.time_in_phase = 0
            switch_penalty = 2.0  # slight cost for yellow light amber transition
        else:
            self.time_in_phase += 1

        # Stochastic arrivals
        if random.random() < self.arrival_rate_ns:
            self.queue_ns += 1
        if random.random() < self.arrival_rate_ew:
            self.queue_ew += 1

        # Discharge vehicles on green phase
        departed = 0
        if self.current_phase == 0:  # NS Green
            discharged = min(self.queue_ns, int(random.random() < self.discharge_rate))
            self.queue_ns -= discharged
            departed += discharged
        else:  # EW Green
            discharged = min(self.queue_ew, int(random.random() < self.discharge_rate))
            self.queue_ew -= discharged
            departed += discharged

        # Reward formulation: throughput bonus minus quadratic queue delay penalty
        waiting_penalty = 0.1 * (self.queue_ns ** 1.5 + self.queue_ew ** 1.5)
        reward = (departed * 5.0) - waiting_penalty - switch_penalty

        next_state = self.get_state()
        done = False
        info = {
            "queue_ns": self.queue_ns,
            "queue_ew": self.queue_ew,
            "phase": self.current_phase,
            "departed": departed
        }

        return next_state, reward, done, info


class QLearningTrafficAgent:
    def __init__(self, alpha: float = 0.15, gamma: float = 0.90, epsilon: float = 1.0, epsilon_decay: float = 0.995):
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_min = 0.05
        self.epsilon_decay = epsilon_decay
        self.q_table: Dict[str, List[float]] = {}

    def _state_key(self, state: Tuple[int, int, int]) -> str:
        return f"{state[0]}_{state[1]}_{state[2]}"

    def get_q_values(self, state: Tuple[int, int, int]) -> List[float]:
        key = self._state_key(state)
        if key not in self.q_table:
            self.q_table[key] = [0.0, 0.0]
        return self.q_table[key]

    def choose_action(self, state: Tuple[int, int, int]) -> int:
        if random.random() < self.epsilon:
            return random.choice([0, 1])
        q_vals = self.get_q_values(state)
        return 0 if q_vals[0] >= q_vals[1] else 1

    def learn(self, state: Tuple[int, int, int], action: int, reward: float, next_state: Tuple[int, int, int]):
        current_q = self.get_q_values(state)[action]
        next_max_q = max(self.get_q_values(next_state))
        new_q = current_q + self.alpha * (reward + self.gamma * next_max_q - current_q)
        self.q_table[self._state_key(state)][action] = round(new_q, 4)

    def decay_exploration(self):
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay


def train_agent(episodes: int = 400, steps_per_episode: int = 150) -> Dict[str, List[float]]:
    env = TrafficIntersectionEnvironment()
    agent = QLearningTrafficAgent()

    print(f"🚀 Training EcoTraffic Q-Learning Agent ({episodes} episodes)...")
    for ep in range(episodes):
        state = env.reset()
        total_reward = 0.0

        for _ in range(steps_per_episode):
            action = agent.choose_action(state)
            next_state, reward, _, _ = env.step(action)
            agent.learn(state, action, reward, next_state)
            state = next_state
            total_reward += reward

        agent.decay_exploration()

        if (ep + 1) % 100 == 0:
            print(f"Episode {ep + 1}/{episodes} | Avg Reward: {total_reward/steps_per_episode:.2f} | Epsilon: {agent.epsilon:.3f}")

    print(f"✅ Training completed! Generated {len(agent.q_table)} Q-states.")
    return agent.q_table


if __name__ == "__main__":
    trained_policy = train_agent(episodes=300, steps_per_episode=120)
    # Save policy JSON for browser ingestion
    output_path = "q_traffic_policy.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(trained_policy, f, indent=2)
    print(f"💾 Policy saved to {output_path}")
