import { promises as fs } from 'fs';
import path from 'path';

/**
 * ConfigLoader - Loads and validates configuration files
 */
export class ConfigLoader {
  /**
   * Load JSON configuration file
   * @param {string} filePath - Path to config file
   * @returns {Promise<Object>} Configuration object
   */
  static async loadConfig(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading config from ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Load all configuration files
   * @param {string} configDir - Configuration directory
   * @returns {Promise<Object>} All configurations
   */
  static async loadAllConfigs(configDir = './config') {
    const servicesPath = path.join(configDir, 'services.json');
    const thresholdsPath = path.join(configDir, 'thresholds.json');
    const configPath = path.join(configDir, 'config.json');

    const [services, thresholds, config] = await Promise.all([
      this.loadConfig(servicesPath),
      this.loadConfig(thresholdsPath),
      this.loadConfig(configPath)
    ]);

    return {
      services: services.services,
      thresholds,
      config
    };
  }

  /**
   * Save configuration to file
   * @param {string} filePath - Path to config file
   * @param {Object} data - Configuration data
   */
  static async saveConfig(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving config to ${filePath}:`, error.message);
      throw error;
    }
  }
}
