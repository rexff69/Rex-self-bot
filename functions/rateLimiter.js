const rateLimits = new Map();

export function checkRateLimit(userId, maxCommands = 5, timeWindow = 10000) {
    const now = Date.now();
    
    if (!rateLimits.has(userId)) {
        rateLimits.set(userId, []);
    }
    
    const userLimits = rateLimits.get(userId);
    
    // Remove old entries
    const validLimits = userLimits.filter(time => now - time < timeWindow);
    rateLimits.set(userId, validLimits);
    
    // Check if limit exceeded
    if (validLimits.length >= maxCommands) {
        return false;
    }
    
    // Add new entry
    validLimits.push(now);
    rateLimits.set(userId, validLimits);
    
    return true;
}

export function getRateLimitInfo(userId, timeWindow = 10000) {
    const now = Date.now();
    
    if (!rateLimits.has(userId)) {
        return { count: 0, resetIn: 0 };
    }
    
    const userLimits = rateLimits.get(userId);
    const validLimits = userLimits.filter(time => now - time < timeWindow);
    
    const oldestTime = Math.min(...validLimits);
    const resetIn = validLimits.length > 0 ? timeWindow - (now - oldestTime) : 0;
    
    return {
        count: validLimits.length,
        resetIn: Math.ceil(resetIn / 1000)
    };
}
