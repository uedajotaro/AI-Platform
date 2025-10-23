// ============================================
// Database Helper Functions
// ============================================

import type { Env } from './types';

export const dbHelper = {
  // Parse JSON fields from database
  parseJSON(value: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  },

  // Stringify JSON fields for database
  stringifyJSON(value: any): string {
    return JSON.stringify(value || []);
  },

  // Execute query with error handling
  async query<T = any>(db: D1Database, sql: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = db.prepare(sql).bind(...params);
      const result = await stmt.all();
      return result.results as T[];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Execute single query
  async queryOne<T = any>(db: D1Database, sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(db, sql, params);
    return results.length > 0 ? results[0] : null;
  },

  // Execute write query (INSERT, UPDATE, DELETE)
  async execute(db: D1Database, sql: string, params: any[] = []): Promise<D1Result> {
    try {
      const stmt = db.prepare(sql).bind(...params);
      return await stmt.run();
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  },

  // Get current timestamp for SQLite
  now(): string {
    return new Date().toISOString();
  },

  // Generate random token
  generateToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },

  // Generate OTP code
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // Calculate expiration time
  expiresAt(minutes: number): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  }
};
