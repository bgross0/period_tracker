/**
 * Period Tracker V2 - Research-Based Design
 *
 * Philosophy:
 * - KISS (Keep It Stupid Simple)
 * - Track → Patterns → Remedies (NOT diagnoses)
 * - Privacy-first, no bullshit
 * - Fast logging = high retention
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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Health check
    if (path === '/health' && method === 'GET') {
      return jsonResponse({ status: 'healthy', timestamp: new Date().toISOString(), version: 'v2.0' }, corsHeaders);
    }

    // Auth endpoints (no token required)
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

    // Onboarding
    if (path === '/onboarding' && method === 'POST') {
      return completeOnboarding(userId, request, env, corsHeaders);
    }

    // User
    if (path === '/users/me' && method === 'GET') {
      return getUser(userId, env, corsHeaders);
    }

    // Daily entry - smart questions
    if (path === '/daily/questions' && method === 'GET') {
      const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
      return getDailyQuestions(userId, date, env, corsHeaders);
    }

    // Daily log
    if (path === '/logs' && method === 'POST') {
      return createDailyLog(userId, request, env, corsHeaders);
    }
    if (path === '/logs' && method === 'GET') {
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      return getDailyLogs(userId, startDate, endDate, limit, env, corsHeaders);
    }

    // Cycle management
    if (path === '/cycles' && method === 'POST') {
      return startNewCycle(userId, request, env, corsHeaders);
    }
    if (path === '/cycles' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '12');
      return getCycles(userId, limit, env, corsHeaders);
    }

    // Predictions (simplified - no medical BS)
    if (path === '/predictions/next-period' && method === 'GET') {
      return predictNextPeriod(userId, env, corsHeaders);
    }

    // Remedies
    if (path === '/remedies' && method === 'GET') {
      return getRemedies(env, corsHeaders);
    }
    if (path === '/remedies/suggestions' && method === 'GET') {
      const symptom = url.searchParams.get('symptom');
      return getRemedySuggestions(userId, symptom, env, corsHeaders);
    }
    if (path === '/remedies/effectiveness' && method === 'POST') {
      return logRemedyEffectiveness(userId, request, env, corsHeaders);
    }

    // Patterns (NOT medical warnings)
    if (path === '/patterns' && method === 'GET') {
      return getUserPatterns(userId, env, corsHeaders);
    }

    // Streaks & Gamification
    if (path === '/streaks' && method === 'GET') {
      return getUserStreaks(userId, env, corsHeaders);
    }

    // Analytics (simple, no scary stuff)
    if (path === '/analytics' && method === 'GET') {
      return getAnalytics(userId, env, corsHeaders);
    }

    // Data export
    if (path === '/export' && method === 'GET') {
      return exportUserData(userId, env, corsHeaders);
    }

    // Chat (updated prompts)
    if (path === '/chat' && method === 'POST') {
      return chat(userId, request, env, corsHeaders);
    }
    if (path === '/chat/history' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      return getChatHistory(userId, limit, env, corsHeaders);
    }

    return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ error: error.message, stack: error.stack }, corsHeaders, 500);
  }
}

// ========== Utilities ==========

function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
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
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.substring(7);
    const decoded = atob(token);
    const [userId, timestamp] = decoded.split(':');

    // Token expires after 30 days
    if (Date.now() - parseInt(timestamp) > 30 * 24 * 60 * 60 * 1000) return null;

    const user = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?').bind(userId).first();
    return user ? userId : null;
  } catch (e) {
    return null;
  }
}

function calculateCycleDay(lastPeriodStart, targetDate) {
  const start = new Date(lastPeriodStart);
  const target = new Date(targetDate);
  return Math.floor((target - start) / (1000 * 60 * 60 * 24)) + 1;
}

function getCyclePhase(cycleDay, averageCycleLength) {
  if (cycleDay <= 5) return 'menstrual';
  if (cycleDay <= 13) return 'follicular';
  if (cycleDay >= 14 && cycleDay <= 16) return 'ovulation';
  if (cycleDay <= Math.floor(averageCycleLength * 0.7)) return 'luteal_early';
  return 'luteal_late';
}

// ========== Authentication ==========

async function register(request, env, corsHeaders) {
  const body = await request.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, corsHeaders, 400);
  }

  const existing = await env.DB.prepare('SELECT user_id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return jsonResponse({ error: 'User already exists' }, corsHeaders, 400);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(`
    INSERT INTO users (user_id, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `).bind(userId, email, passwordHash, name).run();

  // Initialize streak tracking
  await env.DB.prepare(`
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, total_logs)
    VALUES (?, 0, 0, 0)
  `).bind(userId).run();

  const token = await createToken(userId);

  return jsonResponse({
    user_id: userId,
    email,
    name,
    token,
    needs_onboarding: true
  }, corsHeaders, 201);
}

async function login(request, env, corsHeaders) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, corsHeaders, 400);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) {
    return jsonResponse({ error: 'Invalid credentials' }, corsHeaders, 401);
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.password_hash) {
    return jsonResponse({ error: 'Invalid credentials' }, corsHeaders, 401);
  }

  const token = await createToken(user.user_id);
  const needsOnboarding = !user.last_period_start;

  return jsonResponse({
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    token,
    needs_onboarding: needsOnboarding
  }, corsHeaders);
}

// ========== Onboarding ==========

async function completeOnboarding(userId, request, env, corsHeaders) {
  const body = await request.json();
  const {
    last_period_start,
    average_cycle_length = 28,
    average_period_length = 5,
    regularity = 'regular',
    track_mood = true,
    track_energy = true,
    track_sleep = true,
    track_symptoms = true,
    track_flow = true,
    track_remedies = false,
    track_food = false,
    track_exercise = false
  } = body;

  if (!last_period_start) {
    return jsonResponse({ error: 'last_period_start is required' }, corsHeaders, 400);
  }

  await env.DB.prepare(`
    UPDATE users SET
      last_period_start = ?,
      average_cycle_length = ?,
      average_period_length = ?,
      regularity = ?,
      track_mood = ?,
      track_energy = ?,
      track_sleep = ?,
      track_symptoms = ?,
      track_flow = ?,
      track_remedies = ?,
      track_food = ?,
      track_exercise = ?,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).bind(
    last_period_start, average_cycle_length, average_period_length, regularity,
    track_mood ? 1 : 0, track_energy ? 1 : 0, track_sleep ? 1 : 0, track_symptoms ? 1 : 0,
    track_flow ? 1 : 0, track_remedies ? 1 : 0, track_food ? 1 : 0, track_exercise ? 1 : 0,
    userId
  ).run();

  // Create initial cycle
  const cycleId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO cycles (cycle_id, user_id, start_date, cycle_number)
    VALUES (?, ?, ?, 1)
  `).bind(cycleId, userId, last_period_start).run();

  return jsonResponse({ success: true, message: 'Onboarding complete' }, corsHeaders);
}

async function getUser(userId, env, corsHeaders) {
  const user = await env.DB.prepare(`
    SELECT user_id, email, name, last_period_start, average_cycle_length,
           average_period_length, regularity, track_mood, track_energy,
           track_sleep, track_symptoms, track_flow, track_remedies,
           track_food, track_exercise, created_at
    FROM users WHERE user_id = ?
  `).bind(userId).first();

  if (!user) {
    return jsonResponse({ error: 'User not found' }, corsHeaders, 404);
  }

  return jsonResponse(user, corsHeaders);
}

// ========== Context-Aware Daily Questions ==========

async function getDailyQuestions(userId, date, env, corsHeaders) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first();
  if (!user || !user.last_period_start) {
    return jsonResponse({ error: 'Complete onboarding first' }, corsHeaders, 400);
  }

  const cycleDay = calculateCycleDay(user.last_period_start, date);
  const phase = getCyclePhase(cycleDay, user.average_cycle_length);

  const questions = [];

  // Always ask
  if (user.track_mood) {
    questions.push({ id: 'mood', type: 'emoji_slider', required: true, label: 'How are you feeling?' });
  }
  if (user.track_energy) {
    questions.push({ id: 'energy', type: 'battery_slider', required: true, label: 'Energy level?' });
  }

  // Phase-specific
  if (phase === 'menstrual' && user.track_flow) {
    questions.push({ id: 'flow_level', type: 'flow_slider', required: true, label: 'Flow level?' });
  }

  // Symptoms (always available if tracking)
  if (user.track_symptoms) {
    const symptomOptions = phase === 'menstrual'
      ? ['cramps', 'bloating', 'headache', 'fatigue', 'back_pain', 'nausea']
      : phase === 'luteal_late'
      ? ['breast_tenderness', 'bloating', 'mood_swings', 'headache', 'cravings', 'fatigue']
      : ['headache', 'fatigue'];

    questions.push({ id: 'symptoms', type: 'multi_select_icons', required: false, label: 'Any symptoms?', options: symptomOptions });
  }

  // Optional based on preferences
  if (user.track_sleep) {
    questions.push({ id: 'sleep_quality', type: 'star_rating', required: false, label: 'Sleep quality?' });
  }

  if (user.track_food) {
    questions.push({ id: 'foods', type: 'multi_select', required: false, label: 'Foods today?', options: ['dairy', 'caffeine', 'alcohol', 'sugar', 'salty'] });
  }

  if (user.track_exercise) {
    questions.push({ id: 'exercise_level', type: 'single_select', required: false, label: 'Exercise today?', options: ['none', 'light', 'moderate', 'intense'] });
  }

  // Notes (always available)
  questions.push({ id: 'notes', type: 'text', required: false, label: 'Anything else to note?' });

  return jsonResponse({
    date,
    cycle_day: cycleDay,
    phase,
    questions,
    context_message: getContextMessage(phase, cycleDay, user.average_cycle_length)
  }, corsHeaders);
}

function getContextMessage(phase, cycleDay, avgCycleLength) {
  if (phase === 'menstrual') return `Day ${cycleDay} of your period`;
  if (phase === 'follicular') return `Post-period energy boost time!`;
  if (phase === 'ovulation') return `Mid-cycle - usually your most energetic phase`;
  if (phase === 'luteal_early') return `Post-ovulation phase`;

  const daysUntilPeriod = avgCycleLength - cycleDay;
  return `Period expected in ~${daysUntilPeriod} days`;
}

// ========== Daily Logging ==========

async function createDailyLog(userId, request, env, corsHeaders) {
  const body = await request.json();
  const { log_date, mood, energy, flow_level, symptoms, sleep_quality, sleep_hours,
          stress_level, exercise_level, cravings, foods, remedies_tried, notes } = body;

  const user = await env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first();
  if (!user || !user.last_period_start) {
    return jsonResponse({ error: 'Complete onboarding first' }, corsHeaders, 400);
  }

  // Check existing log
  const existing = await env.DB.prepare('SELECT log_id FROM daily_logs WHERE user_id = ? AND log_date = ?')
    .bind(userId, log_date).first();
  if (existing) {
    return jsonResponse({ error: 'Log already exists for this date' }, corsHeaders, 400);
  }

  // Calculate cycle info
  const cycleDay = calculateCycleDay(user.last_period_start, log_date);
  const phase = getCyclePhase(cycleDay, user.average_cycle_length);

  // Find current cycle
  const cycle = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND start_date <= ? AND (end_date >= ? OR end_date IS NULL)
    ORDER BY start_date DESC LIMIT 1
  `).bind(userId, log_date, log_date).first();

  const logId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO daily_logs (
      log_id, user_id, cycle_id, log_date, cycle_day, cycle_phase,
      mood, energy, flow_level, symptoms, sleep_quality, sleep_hours,
      stress_level, exercise_level, cravings, foods, remedies_tried, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    logId, userId, cycle?.cycle_id || null, log_date, cycleDay, phase,
    mood, energy, flow_level,
    JSON.stringify(symptoms || []),
    sleep_quality, sleep_hours, stress_level, exercise_level,
    JSON.stringify(cravings || []),
    JSON.stringify(foods || []),
    JSON.stringify(remedies_tried || []),
    notes
  ).run();

  // Update streak
  await updateStreak(userId, log_date, env);

  // Create embedding for RAG
  await createLogEmbedding(env, logId, userId, {
    log_date, cycle_day: cycleDay, phase, mood, energy, flow_level, symptoms, notes
  });

  // Get instant feedback
  const feedback = await getInstantFeedback(userId, logId, env);

  return jsonResponse({
    log_id: logId,
    success: true,
    feedback
  }, corsHeaders, 201);
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

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return jsonResponse(results, corsHeaders);
}

// ========== Cycles ==========

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

  // Create new cycle
  const lastCycle = await env.DB.prepare('SELECT * FROM cycles WHERE user_id = ? ORDER BY cycle_number DESC LIMIT 1')
    .bind(userId).first();
  const cycleNumber = lastCycle ? (lastCycle.cycle_number + 1) : 1;
  const cycleId = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO cycles (cycle_id, user_id, start_date, cycle_number)
    VALUES (?, ?, ?, ?)
  `).bind(cycleId, userId, start_date, cycleNumber).run();

  // Update user's last_period_start
  await env.DB.prepare('UPDATE users SET last_period_start = ? WHERE user_id = ?')
    .bind(start_date, userId).run();

  const cycle = await env.DB.prepare('SELECT * FROM cycles WHERE cycle_id = ?').bind(cycleId).first();
  return jsonResponse(cycle, corsHeaders, 201);
}

async function getCycles(userId, limit, env, corsHeaders) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? ORDER BY start_date DESC LIMIT ?
  `).bind(userId, limit).all();
  return jsonResponse(results, corsHeaders);
}

// ========== Predictions (Simple, No Medical BS) ==========

async function predictNextPeriod(userId, env, corsHeaders) {
  const { results: cycles } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND cycle_length IS NOT NULL
    ORDER BY start_date DESC LIMIT 12
  `).bind(userId).all();

  if (cycles.length < 2) {
    return jsonResponse({
      error: 'Need at least 2 complete cycles for prediction'
    }, corsHeaders, 400);
  }

  // Weighted average (recent cycles matter more)
  const weights = cycles.map((_, i) => Math.exp(-i * 0.15));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const avgCycleLength = cycles.reduce((sum, c, i) => sum + c.cycle_length * weights[i], 0) / totalWeight;

  const lastCycle = cycles[0];
  const lastStartDate = new Date(lastCycle.start_date);
  const predictedStartDate = new Date(lastStartDate.getTime() + Math.round(avgCycleLength) * 24 * 60 * 60 * 1000);

  // Calculate confidence
  const cycleLengths = cycles.map(c => c.cycle_length);
  const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const variance = cycleLengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0, Math.min(1, 1 - (stdDev / mean)));

  return jsonResponse({
    predicted_start_date: predictedStartDate.toISOString().split('T')[0],
    average_cycle_length: Math.round(avgCycleLength * 10) / 10,
    confidence_score: Math.round(confidence * 100) / 100,
    regularity: stdDev < 3 ? 'very regular' : stdDev < 7 ? 'fairly regular' : 'irregular',
    cycles_analyzed: cycles.length
  }, corsHeaders);
}

// Continued in next message due to length...
