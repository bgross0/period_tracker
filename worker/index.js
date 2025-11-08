/**
 * Period Tracker API - Cloudflare Workers
 * Beta version with core functionality
 */

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Router
    if (path === '/health' && method === 'GET') {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString() }, corsHeaders);
    }

    // User endpoints
    if (path === '/users/' && method === 'POST') {
      return createUser(request, env, corsHeaders);
    }

    if (path.match(/^\/users\/[^/]+$/) && method === 'GET') {
      const userId = path.split('/')[2];
      return getUser(userId, env, corsHeaders);
    }

    // Daily log endpoints
    if (path.match(/^\/users\/[^/]+\/logs$/) && method === 'POST') {
      const userId = path.split('/')[2];
      return createDailyLog(userId, request, env, corsHeaders);
    }

    if (path.match(/^\/users\/[^/]+\/logs$/) && method === 'GET') {
      const userId = path.split('/')[2];
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      return getDailyLogs(userId, startDate, endDate, limit, env, corsHeaders);
    }

    if (path.match(/^\/users\/[^/]+\/logs\/[^/]+$/) && method === 'PUT') {
      const userId = path.split('/')[2];
      const logDate = path.split('/')[4];
      return updateDailyLog(userId, logDate, request, env, corsHeaders);
    }

    // Cycle endpoints
    if (path.match(/^\/users\/[^/]+\/cycles$/) && method === 'POST') {
      const userId = path.split('/')[2];
      return startNewCycle(userId, request, env, corsHeaders);
    }

    if (path.match(/^\/users\/[^/]+\/cycles$/) && method === 'GET') {
      const userId = path.split('/')[2];
      const limit = parseInt(url.searchParams.get('limit') || '12');
      return getCycles(userId, limit, env, corsHeaders);
    }

    // Prediction endpoints
    if (path.match(/^\/users\/[^/]+\/predictions\/next-period$/) && method === 'GET') {
      const userId = path.split('/')[2];
      return predictNextPeriod(userId, env, corsHeaders);
    }

    // Analytics endpoints
    if (path.match(/^\/users\/[^/]+\/analytics$/) && method === 'GET') {
      const userId = path.split('/')[2];
      return getAnalytics(userId, env, corsHeaders);
    }

    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: error.message }, corsHeaders, 500);
  }
}

// Helper function for JSON responses
function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

// ========== User Endpoints ==========
async function createUser(request, env, corsHeaders) {
  const body = await request.json();
  const { email, name, date_of_birth, average_cycle_length } = body;

  const userId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (user_id, email, name, date_of_birth, average_cycle_length)
    VALUES (?, ?, ?, ?, ?)
  `).bind(userId, email, name, date_of_birth, average_cycle_length || 28).run();

  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE user_id = ?
  `).bind(userId).first();

  return jsonResponse(user, corsHeaders, 201);
}

async function getUser(userId, env, corsHeaders) {
  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE user_id = ?
  `).bind(userId).first();

  if (!user) {
    return jsonResponse({ error: 'User not found' }, corsHeaders, 404);
  }

  return jsonResponse(user, corsHeaders);
}

// ========== Daily Log Endpoints ==========
async function createDailyLog(userId, request, env, corsHeaders) {
  const body = await request.json();
  const { log_date, cycle_phase, flow_level, mood, mood_intensity, energy_level,
          sleep_hours, sleep_quality, symptoms, symptom_severity, notes } = body;

  // Check if user exists
  const user = await env.DB.prepare(`SELECT * FROM users WHERE user_id = ?`).bind(userId).first();
  if (!user) {
    return jsonResponse({ error: 'User not found' }, corsHeaders, 404);
  }

  // Check for existing log
  const existing = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?
  `).bind(userId, log_date).first();

  if (existing) {
    return jsonResponse({ error: 'Log already exists for this date' }, corsHeaders, 400);
  }

  // Find current cycle
  const cycle = await env.DB.prepare(`
    SELECT * FROM cycles
    WHERE user_id = ? AND start_date <= ? AND (end_date >= ? OR end_date IS NULL)
    ORDER BY start_date DESC LIMIT 1
  `).bind(userId, log_date, log_date).first();

  // Calculate cycle day
  let cycleDay = null;
  if (cycle) {
    const startDate = new Date(cycle.start_date);
    const logDateObj = new Date(log_date);
    cycleDay = Math.floor((logDateObj - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  const logId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO daily_logs (
      log_id, user_id, cycle_id, log_date, cycle_phase, cycle_day,
      flow_level, mood, mood_intensity, energy_level, sleep_hours,
      sleep_quality, symptoms, symptom_severity, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    logId, userId, cycle?.cycle_id || null, log_date, cycle_phase, cycleDay,
    flow_level, mood, mood_intensity, energy_level, sleep_hours,
    sleep_quality, JSON.stringify(symptoms || []), JSON.stringify(symptom_severity || {}), notes
  ).run();

  const log = await env.DB.prepare(`SELECT * FROM daily_logs WHERE log_id = ?`).bind(logId).first();

  return jsonResponse(log, corsHeaders, 201);
}

async function getDailyLogs(userId, startDate, endDate, limit, env, corsHeaders) {
  let query = `SELECT * FROM daily_logs WHERE user_id = ?`;
  const params = [userId];

  if (startDate) {
    query += ` AND log_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND log_date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY log_date DESC LIMIT ?`;
  params.push(limit);

  const stmt = env.DB.prepare(query);
  const { results } = await stmt.bind(...params).all();

  return jsonResponse(results, corsHeaders);
}

async function updateDailyLog(userId, logDate, request, env, corsHeaders) {
  const body = await request.json();

  const log = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?
  `).bind(userId, logDate).first();

  if (!log) {
    return jsonResponse({ error: 'Log not found' }, corsHeaders, 404);
  }

  // Build update query
  const updates = [];
  const params = [];

  for (const [key, value] of Object.entries(body)) {
    if (['symptoms', 'symptom_severity'].includes(key)) {
      updates.push(`${key} = ?`);
      params.push(JSON.stringify(value));
    } else {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  }

  params.push(userId, logDate);

  await env.DB.prepare(`
    UPDATE daily_logs SET ${updates.join(', ')} WHERE user_id = ? AND log_date = ?
  `).bind(...params).run();

  const updated = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?
  `).bind(userId, logDate).first();

  return jsonResponse(updated, corsHeaders);
}

// ========== Cycle Endpoints ==========
async function startNewCycle(userId, request, env, corsHeaders) {
  const body = await request.json();
  const { start_date } = body;

  // Close previous cycle
  const previousCycle = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND end_date IS NULL
  `).bind(userId).first();

  if (previousCycle) {
    const endDate = new Date(new Date(start_date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDateObj = new Date(previousCycle.start_date);
    const endDateObj = new Date(endDate);
    const cycleLength = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    await env.DB.prepare(`
      UPDATE cycles SET end_date = ?, cycle_length = ? WHERE cycle_id = ?
    `).bind(endDate, cycleLength, previousCycle.cycle_id).run();
  }

  // Get cycle number
  const lastCycle = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? ORDER BY cycle_number DESC LIMIT 1
  `).bind(userId).first();

  const cycleNumber = lastCycle ? (lastCycle.cycle_number + 1) : 1;
  const cycleId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO cycles (cycle_id, user_id, start_date, cycle_number)
    VALUES (?, ?, ?, ?)
  `).bind(cycleId, userId, start_date, cycleNumber).run();

  const cycle = await env.DB.prepare(`SELECT * FROM cycles WHERE cycle_id = ?`).bind(cycleId).first();

  return jsonResponse(cycle, corsHeaders, 201);
}

async function getCycles(userId, limit, env, corsHeaders) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date DESC LIMIT ?
  `).bind(userId, limit).all();

  return jsonResponse(results, corsHeaders);
}

// ========== Prediction Endpoints ==========
async function predictNextPeriod(userId, env, corsHeaders) {
  const { results: cycles } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND cycle_length IS NOT NULL
    ORDER BY start_date DESC LIMIT 12
  `).bind(userId).all();

  if (cycles.length < 2) {
    return jsonResponse({
      error: 'At least 2 complete cycles needed for prediction'
    }, corsHeaders, 400);
  }

  // Simple average-based prediction
  const avgCycleLength = cycles.reduce((sum, c) => sum + c.cycle_length, 0) / cycles.length;
  const avgPeriodLength = cycles
    .filter(c => c.period_length)
    .reduce((sum, c) => sum + c.period_length, 0) / cycles.filter(c => c.period_length).length || 5;

  const lastCycle = cycles[0];
  const lastStartDate = new Date(lastCycle.start_date);
  const predictedStartDate = new Date(lastStartDate.getTime() + avgCycleLength * 24 * 60 * 60 * 1000);
  const predictedEndDate = new Date(predictedStartDate.getTime() + avgPeriodLength * 24 * 60 * 60 * 1000);

  // Calculate confidence based on cycle regularity
  const cycleLengths = cycles.map(c => c.cycle_length);
  const stdDev = Math.sqrt(cycleLengths.reduce((sum, len) => sum + Math.pow(len - avgCycleLength, 2), 0) / cycleLengths.length);
  const confidence = Math.max(0, Math.min(1, 1 - (stdDev / avgCycleLength)));

  const prediction = {
    predicted_start_date: predictedStartDate.toISOString().split('T')[0],
    predicted_end_date: predictedEndDate.toISOString().split('T')[0],
    average_cycle_length: Math.round(avgCycleLength),
    average_period_length: Math.round(avgPeriodLength),
    confidence_score: Math.round(confidence * 100) / 100,
    cycles_analyzed: cycles.length
  };

  return jsonResponse(prediction, corsHeaders);
}

// ========== Analytics Endpoints ==========
async function getAnalytics(userId, env, corsHeaders) {
  const { results: cycles } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND cycle_length IS NOT NULL
  `).bind(userId).all();

  if (cycles.length === 0) {
    return jsonResponse({ error: 'No cycle data available' }, corsHeaders, 404);
  }

  const cycleLengths = cycles.map(c => c.cycle_length);
  const periodLengths = cycles.filter(c => c.period_length).map(c => c.period_length);

  const avgCycleLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const avgPeriodLength = periodLengths.length > 0
    ? periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length
    : 0;

  // Calculate regularity score
  const stdDev = Math.sqrt(cycleLengths.reduce((sum, len) =>
    sum + Math.pow(len - avgCycleLength, 2), 0) / cycleLengths.length);
  const regularityScore = Math.max(0, Math.min(1, 1 - (stdDev / avgCycleLength)));

  const analytics = {
    cycle_stats: {
      average_cycle_length: Math.round(avgCycleLength * 10) / 10,
      average_period_length: Math.round(avgPeriodLength * 10) / 10,
      shortest_cycle: Math.min(...cycleLengths),
      longest_cycle: Math.max(...cycleLengths),
      total_cycles: cycles.length,
      regularity_score: Math.round(regularityScore * 100) / 100
    }
  };

  return jsonResponse(analytics, corsHeaders);
}
