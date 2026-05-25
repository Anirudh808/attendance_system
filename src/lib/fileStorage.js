import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

/**
 * Read JSON file
 * @param {string} filename - Filename to read
 * @returns {Promise<Array|Object>} Parsed JSON data
 */
export const readJsonFile = async (filename) => {
  try {
    const filePath = path.join(dataDir, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`File ${filename} not found, returning empty array`);
      return [];
    }
    throw error;
  }
};

/**
 * Write JSON file
 * @param {string} filename - Filename to write
 * @param {Array|Object} data - Data to write
 * @returns {Promise<void>}
 */
export const writeJsonFile = async (filename, data) => {
  try {
    const filePath = path.join(dataDir, filename);
    
    // Ensure directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw error;
  }
};

/**
 * Append data to JSON array file
 * @param {string} filename - Filename to append to
 * @param {Object} data - Data to append
 * @returns {Promise<void>}
 */
export const appendToJsonFile = async (filename, data) => {
  try {
    const existing = await readJsonFile(filename);
    const updated = Array.isArray(existing) ? [...existing, data] : [data];
    await writeJsonFile(filename, updated);
  } catch (error) {
    throw error;
  }
};
