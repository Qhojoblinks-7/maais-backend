import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<
    string,
    {
      state: CircuitState;
      failures: number;
      lastFailureTime: number;
      nextRetryTime: number;
    }
  >();

  private readonly defaultThreshold = 5;
  private readonly defaultResetMs = 30_000;

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    threshold = this.defaultThreshold,
    resetMs = this.defaultResetMs,
  ): Promise<T> {
    const circuit = this.getCircuit(key);

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextRetryTime) {
        this.logger.warn(`Circuit ${key} is OPEN. Skipping call.`);
        throw new Error(`Circuit breaker is open for ${key}`);
      }
      circuit.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess(key, circuit);
      return result;
    } catch (error) {
      this.onFailure(key, circuit, threshold, resetMs);
      throw error;
    }
  }

  private getCircuit(key: string) {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
      });
    }
    return this.circuits.get(key)!;
  }

  private onSuccess(
    key: string,
    circuit: {
      state: CircuitState;
      failures: number;
      lastFailureTime: number;
      nextRetryTime: number;
    },
  ) {
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.lastFailureTime = 0;
    circuit.nextRetryTime = 0;
    this.logger.debug(`Circuit ${key} recovered`);
  }

  private onFailure(
    key: string,
    circuit: {
      state: CircuitState;
      failures: number;
      lastFailureTime: number;
      nextRetryTime: number;
    },
    threshold: number,
    resetMs: number,
  ) {
    circuit.failures += 1;
    circuit.lastFailureTime = Date.now();

    if (circuit.failures >= threshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextRetryTime = Date.now() + resetMs;
      this.logger.warn(
        `Circuit ${key} opened after ${circuit.failures} failures. Will retry after ${resetMs}ms`,
      );
    }
  }

  getState(key: string): CircuitState {
    const circuit = this.circuits.get(key);
    if (!circuit) return CircuitState.CLOSED;

    if (
      circuit.state === CircuitState.OPEN &&
      Date.now() >= circuit.nextRetryTime
    ) {
      return CircuitState.HALF_OPEN;
    }

    return circuit.state;
  }
}
