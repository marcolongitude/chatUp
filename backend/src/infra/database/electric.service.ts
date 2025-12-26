/**
 * Electric SQL Service
 * Service to interact with Electric SQL for real-time data synchronization
 * 
 * Note: Electric SQL runs as a separate service and connects to PostgreSQL
 * via logical replication. This service provides utilities for Electric configuration.
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ElectricService {
  private readonly logger = new Logger(ElectricService.name);

  /**
   * Get Electric service URL
   */
  getElectricUrl(): string {
    const host = process.env.ELECTRIC_HOST || 'localhost';
    const port = process.env.ELECTRIC_PORT || '5133';
    return `http://${host}:${port}`;
  }

  /**
   * Get WebSocket URL for Electric client connections
   */
  getElectricWsUrl(): string {
    const host = process.env.ELECTRIC_HOST || 'localhost';
    const port = process.env.ELECTRIC_PORT || '5133';
    return `ws://${host}:${port}`;
  }

  /**
   * Check if Electric service is available
   */
  async checkElectricHealth(): Promise<boolean> {
    try {
      const url = this.getElectricUrl();
      const response = await fetch(`${url}/api/health`);
      return response.ok;
    } catch (error) {
      this.logger.warn('Electric service health check failed', error);
      return false;
    }
  }
}

