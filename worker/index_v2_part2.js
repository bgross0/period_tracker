// ========== Remedy System ==========

async function getRemedies(env, corsHeaders) {
  const { results } = await env.DB.prepare('SELECT * FROM remedies ORDER BY category, name').all();

  // Group by category
  const grouped = {};
  results.forEach(remedy => {
    if (!grouped[remedy.category]) grouped[remedy.category] = [];
    grouped[remedy.category].push(remedy);
  });

  return jsonResponse(grouped, corsHeaders);
}

async function getRemedySuggestions(userId, symptom, env, corsHeaders) {
  if (!symptom) {
    return jsonResponse({ error: 'symptom parameter required' }, corsHeaders, 400);
  }

  // Get what worked for THIS USER before
  const { results: userRemedies } = await env.DB.prepare(`
    SELECT r.*, AVG(ure.effectiveness) as avg_effectiveness, COUNT(*) as times_used
    FROM user_remedy_effectiveness ure
    JOIN remedies r ON ure.remedy_id = r.remedy_id
    WHERE ure.user_id = ? AND ure.symptom = ? AND ure.effectiveness >= 3
    GROUP BY r.remedy_id
    ORDER BY avg_effectiveness DESC, times_used DESC
    LIMIT 5
  `).bind(userId, symptom).all();

  // Get general remedies for this symptom
  const { results: generalRemedies } = await env.DB.prepare(`
    SELECT * FROM remedies WHERE category = ? AND is_default = 1
    LIMIT 5
  `).bind(symptom).all();

  return jsonResponse({
    symptom,
    what_worked_for_you: userRemedies.map(r => ({
      ...r,
      message: `This helped you ${r.times_used} time${r.times_used > 1 ? 's' : ''} before (avg rating: ${Math.round(r.avg_effectiveness * 10) / 10}/5)`
    })),
    suggestions: generalRemedies
  }, corsHeaders);
}

async function logRemedyEffectiveness(userId, request, env, corsHeaders) {
  const body = await request.json();
  const { log_id, remedy_id, symptom, effectiveness, notes } = body;

  if (!log_id || !remedy_id || !symptom || !effectiveness) {
    return jsonResponse({ error: 'Missing required fields' }, corsHeaders, 400);
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO user_remedy_effectiveness (id, user_id, remedy_id, symptom, log_id, effectiveness, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId, remedy_id, symptom, log_id, effectiveness, notes).run();

  return jsonResponse({ success: true, id }, corsHeaders, 201);
}

// ========== Streaks & Gamification ==========

async function updateStreak(userId, logDate, env) {
  const streak = await env.DB.prepare('SELECT * FROM user_streaks WHERE user_id = ?').bind(userId).first();

  if (!streak) {
    // Create streak record
    await env.DB.prepare(`
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_log_date, total_logs)
      VALUES (?, 1, 1, ?, 1)
    `).bind(userId, logDate).run();
    return;
  }

  const lastLog = streak.last_log_date ? new Date(streak.last_log_date) : null;
  const currentLog = new Date(logDate);
  const daysDiff = lastLog ? Math.floor((currentLog - lastLog) / (1000 * 60 * 60 * 24)) : 0;

  let newStreak = streak.current_streak;
  if (daysDiff === 1) {
    // Consecutive day
    newStreak++;
  } else if (daysDiff > 1) {
    // Streak broken
    newStreak = 1;
  }
  // daysDiff === 0 means logging same day again, don't change streak

  const newLongest = Math.max(streak.longest_streak, newStreak);
  const newTotal = streak.total_logs + 1;

  await env.DB.prepare(`
    UPDATE user_streaks
    SET current_streak = ?, longest_streak = ?, last_log_date = ?, total_logs = ?
    WHERE user_id = ?
  `).bind(newStreak, newLongest, logDate, newTotal, userId).run();

  // Check for achievements
  if (newStreak === 7 && !await hasAchievement(userId, 'week_streak', env)) {
    await grantAchievement(userId, 'week_streak', env);
  }
  if (newStreak === 30 && !await hasAchievement(userId, 'month_streak', env)) {
    await grantAchievement(userId, 'month_streak', env);
  }
  if (newTotal === 100 && !await hasAchievement(userId, '100_logs', env)) {
    await grantAchievement(userId, '100_logs', env);
  }
}

async function hasAchievement(userId, type, env) {
  const achievement = await env.DB.prepare(`
    SELECT * FROM user_achievements WHERE user_id = ? AND achievement_type = ?
  `).bind(userId, type).first();
  return !!achievement;
}

async function grantAchievement(userId, type, env) {
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO user_achievements (achievement_id, user_id, achievement_type)
    VALUES (?, ?, ?)
  `).bind(id, userId, type).run();
}

async function getUserStreaks(userId, env, corsHeaders) {
  const streak = await env.DB.prepare('SELECT * FROM user_streaks WHERE user_id = ?').bind(userId).first();
  const { results: achievements } = await env.DB.prepare(`
    SELECT * FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC
  `).bind(userId).all();

  return jsonResponse({
    current_streak: streak?.current_streak || 0,
    longest_streak: streak?.longest_streak || 0,
    total_logs: streak?.total_logs || 0,
    achievements: achievements.map(a => ({
      type: a.achievement_type,
      earned_at: a.earned_at,
      title: getAchievementTitle(a.achievement_type)
    }))
  }, corsHeaders);
}

function getAchievementTitle(type) {
  const titles = {
    'first_log': '🎉 First Log!',
    'week_streak': '🔥 7 Day Streak!',
    'month_streak': '💪 30 Day Streak!',
    '100_logs': '💯 100 Logs!',
  };
  return titles[type] || type;
}

// ========== Instant Feedback (Dopamine Hit) ==========

async function getInstantFeedback(userId, logId, env) {
  const feedback = {};

  // Streak info
  const streak = await env.DB.prepare('SELECT * FROM user_streaks WHERE user_id = ?').bind(userId).first();
  if (streak && streak.current_streak > 0) {
    feedback.streak = {
      current: streak.current_streak,
      message: streak.current_streak === 1 ? 'Keep it up!' : `${streak.current_streak} day streak! 🔥`
    };
  }

  // Quick insight from today's log
  const log = await env.DB.prepare('SELECT * FROM daily_logs WHERE log_id = ?').bind(logId).first();
  if (log) {
    // Check for recent patterns
    if (log.sleep_quality >= 4 && log.energy >= 4) {
      feedback.insight = "Great sleep = great energy! Keep it up 💪";
    } else if (log.mood >= 4) {
      feedback.insight = `Loving the good vibes on day ${log.cycle_day}! 😊`;
    }
  }

  // New achievements
  const recentAchievements = await env.DB.prepare(`
    SELECT * FROM user_achievements
    WHERE user_id = ? AND datetime(earned_at) > datetime('now', '-1 minute')
  `).bind(userId).all();

  if (recentAchievements.results.length > 0) {
    feedback.achievements = recentAchievements.results.map(a => ({
      title: getAchievementTitle(a.achievement_type),
      earned_at: a.earned_at
    }));
  }

  return feedback;
}

// ========== Pattern Detection (NOT Medical Warnings) ==========

async function getUserPatterns(userId, env, corsHeaders) {
  // Detect patterns - refresh them
  await detectPatterns(userId, env);

  const { results } = await env.DB.prepare(`
    SELECT * FROM user_patterns WHERE user_id = ? AND is_active = 1
    ORDER BY confidence DESC
  `).bind(userId).all();

  return jsonResponse(results, corsHeaders);
}

async function detectPatterns(userId, env) {
  const { results: logs } = await env.DB.prepare(`
    SELECT * FROM daily_logs WHERE user_id = ?
    ORDER BY log_date DESC LIMIT 60
  `).bind(userId).all();

  if (logs.length < 14) return; // Need minimum data

  // Pattern 1: Sleep → Energy correlation
  const sleepEnergyLogs = logs.filter(l => l.sleep_quality && l.energy);
  if (sleepEnergyLogs.length >= 10) {
    const goodSleepLogs = sleepEnergyLogs.filter(l => l.sleep_quality >= 4);
    const goodSleepHighEnergy = goodSleepLogs.filter(l => l.energy >= 4);

    if (goodSleepLogs.length > 0) {
      const correlation = goodSleepHighEnergy.length / goodSleepLogs.length;
      if (correlation >= 0.6) {
        await savePattern(userId, 'sleep_energy', 'Better sleep = more energy',
          `When you sleep well (4-5★), your energy is ${Math.round(correlation * 100)}% higher`,
          correlation, goodSleepLogs.length, env);
      }
    }
  }

  // Pattern 2: Remedy effectiveness
  const { results: remedyLogs } = await env.DB.prepare(`
    SELECT ure.remedy_id, r.name, AVG(ure.effectiveness) as avg_eff, COUNT(*) as uses
    FROM user_remedy_effectiveness ure
    JOIN remedies r ON ure.remedy_id = r.remedy_id
    WHERE ure.user_id = ? AND ure.effectiveness >= 4
    GROUP BY ure.remedy_id
    HAVING uses >= 3
  `).bind(userId).all();

  for (const remedy of remedyLogs) {
    await savePattern(userId, 'remedy_effectiveness', `${remedy.name} works for you!`,
      `You've tried this ${remedy.uses} times with an average rating of ${Math.round(remedy.avg_eff * 10) / 10}/5`,
      remedy.avg_eff / 5, remedy.uses, env);
  }

  // Pattern 3: Symptom timing
  const symptomLogs = logs.filter(l => l.symptoms && JSON.parse(l.symptoms).length > 0);
  if (symptomLogs.length >= 10) {
    const symptomByCycleDay = {};
    symptomLogs.forEach(log => {
      const symptoms = JSON.parse(log.symptoms);
      symptoms.forEach(symptom => {
        if (!symptomByCycleDay[symptom]) symptomByCycleDay[symptom] = [];
        symptomByCycleDay[symptom].push(log.cycle_day);
      });
    });

    for (const [symptom, days] of Object.entries(symptomByCycleDay)) {
      if (days.length >= 5) {
        const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
        await savePattern(userId, 'symptom_timing', `${symptom} usually hits around day ${avgDay}`,
          `You've logged ${symptom} ${days.length} times, typically on days ${Math.min(...days)}-${Math.max(...days)}`,
          0.7, days.length, env);
      }
    }
  }
}

async function savePattern(userId, type, title, description, confidence, dataPoints, env) {
  // Check if pattern already exists
  const existing = await env.DB.prepare(`
    SELECT * FROM user_patterns WHERE user_id = ? AND title = ? AND is_active = 1
  `).bind(userId, title).first();

  if (existing) {
    // Update
    await env.DB.prepare(`
      UPDATE user_patterns SET confidence = ?, data_points = ?, last_updated = datetime('now')
      WHERE pattern_id = ?
    `).bind(confidence, dataPoints, existing.pattern_id).run();
  } else {
    // Create new
    const patternId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO user_patterns (pattern_id, user_id, pattern_type, title, description, confidence, data_points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(patternId, userId, type, title, description, confidence, dataPoints).run();
  }
}

// ========== Analytics ==========

async function getAnalytics(userId, env, corsHeaders) {
  const { results: cycles } = await env.DB.prepare(`
    SELECT * FROM cycles WHERE user_id = ? AND cycle_length IS NOT NULL
  `).bind(userId).all();

  if (cycles.length === 0) {
    return jsonResponse({ error: 'No cycle data yet' }, corsHeaders, 404);
  }

  const cycleLengths = cycles.map(c => c.cycle_length);
  const avgCycleLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
  const variance = cycleLengths.reduce((sum, len) => sum + Math.pow(len - avgCycleLength, 2), 0) / cycleLengths.length;
  const stdDev = Math.sqrt(variance);

  // Simple stats, no medical warnings
  return jsonResponse({
    cycle_stats: {
      total_cycles: cycles.length,
      average_length: Math.round(avgCycleLength * 10) / 10,
      shortest: Math.min(...cycleLengths),
      longest: Math.max(...cycleLengths),
      regularity: stdDev < 3 ? 'very regular' : stdDev < 7 ? 'fairly regular' : 'irregular'
    }
  }, corsHeaders);
}

// ========== Data Export ==========

async function exportUserData(userId, env, corsHeaders) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first();
  const { results: cycles } = await env.DB.prepare('SELECT * FROM cycles WHERE user_id = ?').bind(userId).all();
  const { results: logs } = await env.DB.prepare('SELECT * FROM daily_logs WHERE user_id = ?').bind(userId).all();
  const { results: patterns } = await env.DB.prepare('SELECT * FROM user_patterns WHERE user_id = ?').bind(userId).all();
  const { results: remedies } = await env.DB.prepare(`
    SELECT ure.*, r.name as remedy_name
    FROM user_remedy_effectiveness ure
    JOIN remedies r ON ure.remedy_id = r.remedy_id
    WHERE ure.user_id = ?
  `).bind(userId).all();

  const exportData = {
    export_date: new Date().toISOString(),
    user: {
      email: user.email,
      name: user.name,
      created_at: user.created_at
    },
    cycles,
    daily_logs: logs,
    patterns,
    remedy_effectiveness: remedies
  };

  return jsonResponse(exportData, corsHeaders);
}

// ========== Chat (Updated - No Diagnoses) ==========

async function createLogEmbedding(env, logId, userId, logData) {
  const embeddingText = `
    Date: ${logData.log_date}
    Cycle Day: ${logData.cycle_day}
    Phase: ${logData.phase}
    Mood: ${logData.mood}/5
    Energy: ${logData.energy}/5
    Flow: ${logData.flow_level || 'N/A'}
    Symptoms: ${logData.symptoms?.join(', ') || 'none'}
    Notes: ${logData.notes || 'none'}
  `.trim();

  const embeddingId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT OR REPLACE INTO log_embeddings (embedding_id, log_id, user_id, embedding_text, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).bind(embeddingId, logId, userId, embeddingText, JSON.stringify(logData)).run();
}

async function searchRelevantLogs(env, userId, query, limit = 5) {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  const { results } = await env.DB.prepare(`
    SELECT * FROM log_embeddings WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
  `).bind(userId).all();

  const scored = results.map(log => {
    const text = log.embedding_text.toLowerCase();
    const score = keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
    return { ...log, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(r => JSON.parse(r.metadata));
}

async function chat(userId, request, env, corsHeaders) {
  const body = await request.json();
  const { message, include_context = true } = body;

  if (!message) {
    return jsonResponse({ error: 'Message required' }, corsHeaders, 400);
  }

  let relevantLogs = [];
  if (include_context) {
    relevantLogs = await searchRelevantLogs(env, userId, message, 5);
  }

  const { results: history } = await env.DB.prepare(`
    SELECT role, content FROM chat_messages WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 6
  `).bind(userId).all();

  const contextText = relevantLogs.length > 0
    ? `\n\nRelevant user data:\n${relevantLogs.map(log =>
        `- Day ${log.cycle_day} (${log.phase}): ${log.mood}/5 mood, ${log.energy}/5 energy, symptoms: ${log.symptoms?.join(', ') || 'none'}`
      ).join('\n')}`
    : '';

  // IMPORTANT: Updated system prompt to NEVER diagnose
  const systemPrompt = `You are a supportive period tracking assistant. You help users understand their patterns and suggest practical remedies.

RULES:
- NEVER suggest medical diagnoses (no "you might have PCOS/endometriosis/etc")
- NEVER tell them to "see a doctor" unless they explicitly ask for medical advice
- Focus on practical tips, remedies, and pattern observations
- Be supportive and empathetic
- Remind them that severe pain or unusual symptoms should be discussed with healthcare providers IF they ask

You have access to the user's tracking data to provide personalized insights.${contextText}`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
      relevant_context: relevantLogs.map(l => ({ date: l.log_date, mood: l.mood, symptoms: l.symptoms })),
      tokens_used: tokensUsed
    }, corsHeaders);

  } catch (error) {
    console.error('Chat error:', error);
    return jsonResponse({ error: 'Failed to process chat', details: error.message }, corsHeaders, 500);
  }
}

async function getChatHistory(userId, limit, env, corsHeaders) {
  const { results } = await env.DB.prepare(`
    SELECT message_id, role, content, tokens_used, created_at
    FROM chat_messages WHERE user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).bind(userId, limit).all();

  return jsonResponse(results.reverse(), corsHeaders);
}
