import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'database');
const CONFIG_PATH = path.join(DB_PATH, 'config.json');
const USERS_PATH = path.join(DB_PATH, 'users.json');

// Ensure database directory exists
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

// Initialize config.json
function initConfig() {
    const defaultConfig = {
        noPrefixMode: false,
        rateLimits: {
            maxCommands: 5,
            timeWindow: 10000
        },
        allowedUsers: []
    };
    
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    }
    
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

// Initialize users.json
function initUsers() {
    const defaultUsers = {
        allowedUsers: []
    };
    
    if (!fs.existsSync(USERS_PATH)) {
        fs.writeFileSync(USERS_PATH, JSON.stringify(defaultUsers, null, 2));
    }
    
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
}

// Load all database files
export function loadDatabase() {
    return {
        config: initConfig(),
        users: initUsers(),
        noPrefixMode: initConfig().noPrefixMode
    };
}

// Save database
export function saveDatabase(db) {
    const config = {
        noPrefixMode: db.noPrefixMode,
        rateLimits: db.config?.rateLimits || {
            maxCommands: 5,
            timeWindow: 10000
        },
        allowedUsers: db.config?.allowedUsers || []
    };
    
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    if (db.users) {
        fs.writeFileSync(USERS_PATH, JSON.stringify(db.users, null, 2));
    }
}
