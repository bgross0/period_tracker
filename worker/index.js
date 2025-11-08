/**
 * Period Tracker API - Cloudflare Workers
 * Full-featured version with ML predictions, RAG chat, and authentication
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // Auth endpoints (no auth required)
    if (path === '/auth/register' && method === 'POST') {
      return register(request, env, corsHeaders);
    }
    if (path === '/auth/login' && method === 'POST') {
      return login(request, env, corsHeaders);
    }

    // All other endpoints require authentication
    const userId = await authenticate(request, env);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, corsHeaders, 401);
    }

    // User endpoints
    if (path === '/users/me' && method === 'GET') {
      return getUser(userId, env, corsHeaders);
    }

    // Daily log endpoints
    if (path === '/logs' && method === 'POST') {
      return createDailyLog(userId, request, env, corsHeaders);
    }
    if (path === '/logs' && method === 'GET') {
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      return getDailyLogs(userId, startDate, endDate, limit, env, corsHeaders);
    }
    if (path.match(/^\/logs\/[^/]+$/) && method === 'PUT') {
      const logDate = path.split('/')[2];
      return updateDailyLog(userId, logDate, request, env, corsHeaders);
    }

    // Cycle endpoints
    if (path === '/cycles' && method === 'POST') {
      return startNewCycle(userId, request, env, corsHeaders);
    }
    if (path === '/cycles' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '12');
      return getCycles(userId, limit, env, corsHeaders);
    }

    // Prediction endpoints
    if (path === '/predictions/next-period' && method === 'GET') {
      return predictNextPeriod(userId, env, corsHeaders);
    }
    if (path === '/predictions/symptoms' && method === 'GET') {
      const targetDate = url.searchParams.get('target_date');
      return predictSymptoms(userId, targetDate, env, corsHeaders);
    }
    if (path === '/warnings' && method === 'GET') {
      return getEarlyWarnings(userId, env, corsHeaders);
    }

    // Analytics endpoints
    if (path === '/analytics' && method === 'GET') {
      return getAnalytics(userId, env, corsHeaders);
    }
    if (path === '/insights' && method === 'GET') {
      return getInsights(userId, env, corsHeaders);
    }

    // Chat endpoints
    if (path === '/chat' && method === 'POST') {
      return chat(userId, request, env, corsHeaders);
    }
    if (path === '/chat/history' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      return getChatHistory(userId, limit, env, corsHeaders);
    }
    if (path === '/chat/logs' && method === 'GET') {
      // Admin endpoint to view all chat logs
      return getAllChatLogs(userId, env, corsHeaders);
    }

    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: error.message, stack: error.stack }, corsHeaders, 500);
  }
}

// ========== Utility Functions ==========
function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createToken(userId) {
  // Simple token: base64(userId:timestamp:signature)
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return btoa(`${data}:${signature}`);
}

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = atob(token);
    const [userId, timestamp, signature] = decoded.split(':');

    // Verify token is not too old (24 hours)
    if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
      return null;
    }

    // Verify user exists
    const user = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?')
      .bind(userId)
      .first();

    return user ? userId : null;
  } catch (e) {
    return null;
  }
}

// ========== Authentication Endpoints ==========
async function register(request, env, corsHeaders) {
  const body = await request.json();
  const { email, password, name, date_of_birth, average_cycle_length } = body;

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, corsHeaders, 400);
  }

  // Check if user exists
  const existing = await env.DB.prepare('SELECT user_id FROM users WHERE email = ?')
    .bind(email)
    .first();

  if (existing) {
    return jsonResponse({ error: 'User already exists' }, corsHeaders, 400);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(`
    INSERT INTO users (user_id, email, password_hash, name, date_of_birth, average_cycle_length)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(userId, email, passwordHash, name, date_of_birth, average_cycle_length || 28).run();

  const token = await createToken(userId);

  return jsonResponse({
    user_id: userId,
    email,
    name,
    token
  }, corsHeaders, 201);
}

async function login(request, env, corsHeaders) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, corsHeaders, 400);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();

  if (!user) {
    return jsonResponse({ error: 'Invalid credentials' }, corsHeaders, 401);
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) {
    return jsonResponse({ error: 'Invalid credentials' }, corsHeaders, 401);
  }

  const token = await createToken(user.user_id);

  return jsonResponse({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    token
  }, corsHeaders);
}

// ========== User Endpoints ==========
async function getUser(userId, env, corsHeaders) {
  const user = await env.DB.prepare(`
    SELECT user_id, email, name, date_of_birth, average_cycle_length, created_at
    FROM users WHERE user_id = ?
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

  // Create embedding for RAG
  await createLogEmbedding(env, logId, userId, {
    log_date, cycle_phase, cycle_day, flow_level, mood, mood_intensity,
    energy_level, sleep_hours, sleep_quality, symptoms, notes
  });

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
    UPDATE daily_logs SET ${updates.join(', ')}, updated_at = datetime('now')
    WHERE user_id = ? AND log_date = ?
  `).bind(...params).run();

  const updated = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?
  `).bind(userId, logDate).first();

  // Update embedding
  await createLogEmbedding(env, updated.log_id, userId, {
    log_date: updated.log_date,
    cycle_phase: updated.cycle_phase,
    cycle_day: updated.cycle_day,
    flow_level: updated.flow_level,
    mood: updated.mood,
    mood_intensity: updated.mood_intensity,
    energy_level: updated.energy_level,
    sleep_hours: updated.sleep_hours,
    sleep_quality: updated.sleep_quality,
    symptoms: JSON.parse(updated.symptoms || '[]'),
    notes: updated.notes
  });

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

// ========== ML Prediction Functions ==========
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

  // Advanced prediction using weighted average
  const weights = cycles.map((_, i) => Math.exp(-i * 0.1)); // More recent cycles weighted higher
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const avgCycleLength = cycles.reduce((sum, c, i) =>
    sum + c.cycle_length * weights[i], 0) / totalWeight;

  const avgPeriodLength = cycles
    .filter(c => c.period_length)
    .reduce((sum, c, i) => sum + (c.period_length || 0) * weights[i], 0) / totalWeight || 5;

  const lastCycle = cycles[0];
  const lastStartDate = new Date(lastCycle.start_date);
  const predictedStartDate = new Date(lastStartDate.getTime() + Math.round(avgCycleLength) * 24 * 60 * 60 * 1000);
  const predictedEndDate = new Date(predictedStartDate.getTime() + Math.round(avgPeriodLength) * 24 * 60 * 60 * 1000);

  // Calculate confidence based on regularity
  const cycleLengths = cycles.map(c => c.cycle_length);
  const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const variance = cycleLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0, Math.min(1, 1 - (stdDev / mean)));

  const prediction = {
    predicted_start_date: predictedStartDate.toISOString().split('T')[0],
    predicted_end_date: predictedEndDate.toISOString().split('T')[0],
    average_cycle_length: Math.round(avgCycleLength * 10) / 10,
    average_period_length: Math.round(avgPeriodLength * 10) / 10,
    confidence_score: Math.round(confidence * 100) / 100,
    cycles_analyzed: cycles.length,
    regularity: stdDev < 3 ? 'regular' : stdDev < 7 ? 'somewhat irregular' : 'irregular'
  };

  // Store prediction
  const predictionId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO predictions (prediction_id, user_id, prediction_type, predicted_date, predicted_value, confidence_score, model_version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(predictionId, userId, 'next_period', prediction.predicted_start_date, JSON.stringify(prediction), confidence, 'v2.0').run();

  return jsonResponse(prediction, corsHeaders);
}

async function predictSymptoms(userId, targetDate, env, corsHeaders) {
  const target = targetDate || new Date().toISOString().split('T')[0];

  const { results: logs } = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ?
    ORDER BY log_date DESC LIMIT 90
  `).bind(userId).all();

  if (logs.length < 30) {
    return jsonResponse({
      error: 'At least 30 days of logs needed for symptom prediction'
    }, corsHeaders, 400);
  }

  // Group symptoms by cycle day
  const symptomsByCycleDay = {};
  logs.forEach(log => {
    if (log.cycle_day && log.symptoms) {
      if (!symptomsByCycleDay[log.cycle_day]) {
        symptomsByCycleDay[log.cycle_day] = [];
      }
      symptomsByCycleDay[log.cycle_day].push(...JSON.parse(log.symptoms));
    }
  });

  // Determine target cycle day
  const { results: cycles } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND start_date <= ? AND (end_date >= ? OR end_date IS NULL)
  `).bind(userId, target, target).all();

  let targetCycleDay = 1;
  if (cycles.length > 0) {
    const cycle = cycles[0];
    const startDate = new Date(cycle.start_date);
    const targetDateObj = new Date(target);
    targetCycleDay = Math.floor((targetDateObj - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  // Find most common symptoms for this cycle day
  const daySymptoms = symptomsByCycleDay[targetCycleDay] || [];
  const symptomCounts = {};
  daySymptoms.forEach(s => {
    symptomCounts[s] = (symptomCounts[s] || 0) + 1;
  });

  const likelySymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => ({
      symptom,
      probability: Math.round((count / daySymptoms.length) * 100) / 100
    }));

  return jsonResponse({
    target_date: target,
    cycle_day: targetCycleDay,
    likely_symptoms: likelySymptoms,
    confidence: daySymptoms.length > 5 ? 'high' : daySymptoms.length > 2 ? 'medium' : 'low'
  }, corsHeaders);
}

async function getEarlyWarnings(userId, env, corsHeaders) {
  const { results: logs } = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ?
    ORDER BY log_date DESC LIMIT 90
  `).bind(userId).all();

  if (logs.length < 14) {
    return jsonResponse({ warnings: [], message: 'More data needed' }, corsHeaders);
  }

  const warnings = [];

  // Check for unusual pain levels
  const recentLogs = logs.slice(0, 7);
  const painfulLogs = recentLogs.filter(log => {
    const symptoms = JSON.parse(log.symptoms || '[]');
    return symptoms.includes('severe_cramps') || symptoms.includes('pain');
  });

  if (painfulLogs.length > 3) {
    warnings.push({
      type: 'pain',
      severity: 'moderate',
      message: 'Increased pain levels detected in the past week',
      recommendation: 'Consider tracking pain intensity and consulting healthcare provider if persistent'
    });
  }

  // Check for irregular sleep
  const avgSleep = recentLogs
    .filter(l => l.sleep_hours)
    .reduce((sum, l) => sum + l.sleep_hours, 0) / recentLogs.filter(l => l.sleep_hours).length;

  if (avgSleep < 6) {
    warnings.push({
      type: 'sleep',
      severity: 'low',
      message: 'Below average sleep hours detected',
      recommendation: 'Prioritize rest and establish consistent sleep schedule'
    });
  }

  // Check for mood changes
  const lowMoodLogs = recentLogs.filter(log => log.mood_intensity && log.mood_intensity <= 2);
  if (lowMoodLogs.length > 4) {
    warnings.push({
      type: 'mood',
      severity: 'moderate',
      message: 'Low mood detected frequently in past week',
      recommendation: 'Consider mood tracking and self-care activities'
    });
  }

  return jsonResponse({ warnings }, corsHeaders);
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

  // Calculate regularity
  const variance = cycleLengths.reduce((sum, len) =>
    sum + Math.pow(len - avgCycleLength, 2), 0) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);
  const regularityScore = Math.max(0, Math.min(1, 1 - (stdDev / avgCycleLength)));

  // Get symptom analytics
  const { results: logs } = await env.DB.prepare(`
    SELECT symptoms, symptom_severity FROM daily_logs WHERE user_id = ?
  `).bind(userId).all();

  const symptomCounts = {};
  logs.forEach(log => {
    if (log.symptoms) {
      const symptoms = JSON.parse(log.symptoms);
      symptoms.forEach(s => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    }
  });

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symptom, count]) => ({
      symptom,
      frequency: count,
      percentage: Math.round((count / logs.length) * 100)
    }));

  const analytics = {
    cycle_stats: {
      average_cycle_length: Math.round(avgCycleLength * 10) / 10,
      average_period_length: Math.round(avgPeriodLength * 10) / 10,
      shortest_cycle: Math.min(...cycleLengths),
      longest_cycle: Math.max(...cycleLengths),
      total_cycles: cycles.length,
      regularity_score: Math.round(regularityScore * 100) / 100,
      standard_deviation: Math.round(stdDev * 10) / 10
    },
    top_symptoms: topSymptoms,
    total_logs: logs.length
  };

  return jsonResponse(analytics, corsHeaders);
}

async function getInsights(userId, env, corsHeaders) {
  const { results: logs } = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ?
    ORDER BY log_date DESC LIMIT 90
  `).bind(userId).all();

  if (logs.length < 30) {
    return jsonResponse([], corsHeaders);
  }

  const insights = [];

  // Pattern: Energy dips
  const lowEnergyDays = logs.filter(l => l.energy_level && l.energy_level <= 2);
  if (lowEnergyDays.length > logs.length * 0.3) {
    const insightId = crypto.randomUUID();
    const insight = {
      insight_id: insightId,
      insight_type: 'energy_pattern',
      title: 'Frequent Low Energy Detected',
      description: `Low energy levels detected in ${Math.round((lowEnergyDays.length / logs.length) * 100)}% of logged days`,
      confidence_score: 0.85,
      date_identified: new Date().toISOString()
    };

    // Store insight
    await env.DB.prepare(`
      INSERT OR IGNORE INTO insights (insight_id, user_id, insight_type, title, description, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(insightId, userId, insight.insight_type, insight.title, insight.description, insight.confidence_score).run();

    insights.push(insight);
  }

  // Pattern: Sleep quality correlation
  const goodSleepDays = logs.filter(l => l.sleep_quality >= 4);
  const goodSleepEnergy = goodSleepDays.filter(l => l.energy_level >= 4);
  if (goodSleepDays.length > 10 && goodSleepEnergy.length / goodSleepDays.length > 0.7) {
    const insightId = crypto.randomUUID();
    const insight = {
      insight_id: insightId,
      insight_type: 'sleep_correlation',
      title: 'Strong Sleep-Energy Correlation',
      description: 'Better sleep quality is strongly correlated with higher energy levels',
      confidence_score: 0.78,
      date_identified: new Date().toISOString()
    };

    await env.DB.prepare(`
      INSERT OR IGNORE INTO insights (insight_id, user_id, insight_type, title, description, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(insightId, userId, insight.insight_type, insight.title, insight.description, insight.confidence_score).run();

    insights.push(insight);
  }

  return jsonResponse(insights, corsHeaders);
}

// ========== RAG/Chat System ==========
async function createLogEmbedding(env, logId, userId, logData) {
  // Create text representation for embedding
  const embeddingText = `
    Date: ${logData.log_date}
    Cycle Phase: ${logData.cycle_phase || 'unknown'}
    Cycle Day: ${logData.cycle_day || 'unknown'}
    Flow: ${logData.flow_level || 0}/5
    Mood: ${logData.mood || 'not specified'} (intensity: ${logData.mood_intensity || 'N/A'})
    Energy: ${logData.energy_level || 'N/A'}/5
    Sleep: ${logData.sleep_hours || 'N/A'} hours (quality: ${logData.sleep_quality || 'N/A'}/5)
    Symptoms: ${logData.symptoms?.join(', ') || 'none'}
    Notes: ${logData.notes || 'none'}
  `.trim();

  const embeddingId = crypto.randomUUID();

  // Store in database
  await env.DB.prepare(`
    INSERT OR REPLACE INTO log_embeddings (embedding_id, log_id, user_id, embedding_text, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    embeddingId,
    logId,
    userId,
    embeddingText,
    JSON.stringify(logData)
  ).run();
}

async function searchRelevantLogs(env, userId, query, limit = 5) {
  // Simple keyword-based search (can be enhanced with actual embeddings later)
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);

  const { results } = await env.DB.prepare(`
    SELECT * FROM log_embeddings
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).bind(userId).all();

  // Score results based on keyword matches
  const scored = results.map(log => {
    const text = log.embedding_text.toLowerCase();
    const score = keywords.reduce((sum, keyword) => {
      return sum + (text.includes(keyword) ? 1 : 0);
    }, 0);
    return { ...log, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => JSON.parse(r.metadata));
}

async function chat(userId, request, env, corsHeaders) {
  const body = await request.json();
  const { message, include_context = true } = body;

  if (!message) {
    return jsonResponse({ error: 'Message required' }, corsHeaders, 400);
  }

  // Get relevant context
  let relevantLogs = [];
  if (include_context) {
    relevantLogs = await searchRelevantLogs(env, userId, message, 5);
  }

  // Get conversation history
  const { results: history } = await env.DB.prepare(`
    SELECT role, content FROM chat_messages
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 6
  `).bind(userId).all();

  // Build context for Groq
  const contextText = relevantLogs.length > 0
    ? `\n\nRelevant user data:\n${relevantLogs.map(log =>
        `- ${log.log_date}: ${log.mood || 'N/A'} mood, ${log.energy_level || 'N/A'}/5 energy, symptoms: ${log.symptoms?.join(', ') || 'none'}`
      ).join('\n')}`
    : '';

  const systemPrompt = `You are a helpful health assistant for a period tracking app. You provide informative, empathetic responses about menstrual health, symptoms, and wellness. You have access to the user's tracking data to provide personalized insights. Always remind users to consult healthcare professionals for medical concerns.${contextText}`;

  // Call Groq API
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.reverse().map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const groqData = await groqResponse.json();
    const assistantMessage = groqData.choices[0].message.content;
    const tokensUsed = groqData.usage?.total_tokens || 0;

    // Store messages
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    await env.DB.prepare(`
      INSERT INTO chat_messages (message_id, user_id, role, content, tokens_used)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userMessageId, userId, 'user', message, 0).run();

    await env.DB.prepare(`
      INSERT INTO chat_messages (message_id, user_id, role, content, tokens_used)
      VALUES (?, ?, ?, ?, ?)
    `).bind(assistantMessageId, userId, 'assistant', assistantMessage, tokensUsed).run();

    return jsonResponse({
      response: assistantMessage,
      relevant_context: relevantLogs.map(l => ({
        date: l.log_date,
        mood: l.mood,
        symptoms: l.symptoms
      })),
      tokens_used: tokensUsed
    }, corsHeaders);

  } catch (error) {
    console.error('Chat error:', error);
    return jsonResponse({
      error: 'Failed to process chat',
      details: error.message
    }, corsHeaders, 500);
  }
}

async function getChatHistory(userId, limit, env, corsHeaders) {
  const { results } = await env.DB.prepare(`
    SELECT message_id, role, content, tokens_used, created_at
    FROM chat_messages
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(userId, limit).all();

  return jsonResponse(results.reverse(), corsHeaders);
}

async function getAllChatLogs(userId, env, corsHeaders) {
  // Return all chat messages for the user to review
  const { results } = await env.DB.prepare(`
    SELECT message_id, role, content, tokens_used, created_at
    FROM chat_messages
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(userId).all();

  return jsonResponse({
    total_messages: results.length,
    total_tokens: results.reduce((sum, m) => sum + (m.tokens_used || 0), 0),
    messages: results
  }, corsHeaders);
}
