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
   * Supports Railway service references: ${{Electric.ELECTRIC_URL}}
   */
  getElectricUrl(): string {
    // Railway service reference or direct URL
    if (process.env.ELECTRIC_URL) {
      return process.env.ELECTRIC_URL;
    }
    const host = process.env.ELECTRIC_HOST || 'localhost';
    const port = process.env.ELECTRIC_PORT || '5133';
    const protocol = process.env.ELECTRIC_PROTOCOL || 'http';
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Get WebSocket URL for Electric client connections
   * Supports Railway service references: ${{Electric.ELECTRIC_WS_URL}}
   */
  getElectricWsUrl(): string {
    // Railway service reference or direct URL
    if (process.env.ELECTRIC_WS_URL) {
      return process.env.ELECTRIC_WS_URL;
    }
    const host = process.env.ELECTRIC_HOST || 'localhost';
    const port = process.env.ELECTRIC_PORT || '5133';
    const protocol = process.env.ELECTRIC_PROTOCOL === 'https' ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}`;
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
