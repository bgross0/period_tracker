import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Area, AreaChart
} from 'recharts';
import { 
  Calendar, MessageCircle, TrendingUp, Activity, Moon, Heart, 
  AlertCircle, Plus, X, ChevronRight, ChevronLeft, Home,
  BarChart3, Sparkles, Settings, Bell, Download, Menu
} from 'lucide-react';

// API Configuration - REAL V2 BACKEND
const API_BASE = 'https://period-tracker-api.ben-8b4.workers.dev';

// Auth token management
const getAuthToken = () => localStorage.getItem('auth_token');
const setAuthToken = (token) => localStorage.setItem('auth_token', token);
const clearAuthToken = () => localStorage.removeItem('auth_token');

// Authenticated fetch wrapper
const authFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
  }

  return response;
};

// ==================== Utility Functions ====================
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const getCycleDayColor = (phase) => {
  const colors = {
    menstrual: '#F43F5E',
    follicular: '#10B981',
    ovulation: '#8B5CF6',
    luteal: '#F59E0B'
  };
  return colors[phase] || '#6B7280';
};

const getPhaseEmoji = (phase) => {
  const emojis = {
    menstrual: '🌙',
    follicular: '🌱',
    ovulation: '✨',
    luteal: '🍂'
  };
  return emojis[phase] || '📅';
};

// ==================== Header Component ====================
const Header = ({ activeTab, setActiveTab, user }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Heart className="w-8 h-8 fill-current" />
            <div>
              <h1 className="text-2xl font-bold">FlowTracker</h1>
              <p className="text-xs text-pink-100">AI-Powered Health Insights</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'predictions', label: 'Predictions', icon: Sparkles },
              { id: 'chat', label: 'AI Assistant', icon: MessageCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-pink-600 shadow-md'
                    : 'text-pink-100 hover:bg-pink-500'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-pink-500 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-pink-500 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button 
              className="md:hidden p-2 hover:bg-pink-500 rounded-lg"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-pink-400">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'predictions', label: 'Predictions', icon: Sparkles },
              { id: 'chat', label: 'AI Assistant', icon: MessageCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left ${
                  activeTab === tab.id ? 'bg-pink-500' : 'hover:bg-pink-500'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

// ==================== Daily Log Modal ====================
const DailyLogModal = ({ isOpen, onClose, onSave, userId, initialData = null }) => {
  const [logData, setLogData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    flow_level: null,
    mood: 3,
    energy: 3,
    sleep_hours: 7,
    sleep_quality: 5,
    symptoms: [],
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [contextQuestions, setContextQuestions] = useState(null);
  const [showFlowQuestion, setShowFlowQuestion] = useState(false);

  useEffect(() => {
    if (initialData) {
      setLogData(initialData);
    }
  }, [initialData]);

  // Load context-aware questions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadContextQuestions();
    }
  }, [isOpen, logData.log_date]);

  const loadContextQuestions = async () => {
    try {
      const response = await authFetch(`/daily/questions?date=${logData.log_date}`);
      if (response.ok) {
        const data = await response.json();
        setContextQuestions(data);
        // Check if flow question is present (only during period)
        const hasFlowQuestion = data.questions?.some(q => q.id === 'flow_level');
        setShowFlowQuestion(hasFlowQuestion);
      }
    } catch (error) {
      console.error('Failed to load context questions:', error);
    }
  };

  const flowLevels = ['none', 'spotting', 'light', 'medium', 'heavy'];
  const moods = ['happy', 'sad', 'anxious', 'irritable', 'calm', 'energetic', 'tired'];
  const symptoms = [
    'cramps', 'headache', 'bloating', 'breast_tenderness',
    'back_pain', 'fatigue', 'nausea', 'acne',
    'mood_swings', 'anxiety', 'irritability'
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(logData);
      onClose();
    } catch (error) {
      alert('Error saving log: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Daily Log</h2>
            <p className="text-sm text-gray-500">{formatDate(logData.log_date)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={logData.log_date}
              onChange={(e) => setLogData({ ...logData, log_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {/* Context-Aware Flow Question - ONLY SHOWS DURING PERIOD */}
          {showFlowQuestion && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Period Flow (Context-Aware - Only During Period!)
              </label>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Flow Level</span>
                <span className="text-lg font-bold text-gray-900">
                  {logData.flow_level || 3}/5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={logData.flow_level || 3}
                onChange={(e) => setLogData({ ...logData, flow_level: parseInt(e.target.value) })}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>
          )}

          {/* Mood Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Mood
              </label>
              <span className="text-lg font-bold text-gray-900">
                {logData.mood}/5
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={logData.mood}
              onChange={(e) => setLogData({ ...logData, mood: parseInt(e.target.value) })}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Energy Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Energy Level
              </label>
              <span className="text-lg font-bold text-gray-900">
                {logData.energy}/5
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={logData.energy}
              onChange={(e) => setLogData({ ...logData, energy: parseInt(e.target.value) })}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Sleep */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Sleep
            </label>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Hours Slept</label>
              <input
                type="number"
                step="0.5"
                value={logData.sleep_hours}
                onChange={(e) => setLogData({ ...logData, sleep_hours: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-600">Sleep Quality</label>
                <span className="text-sm font-bold text-gray-900">
                  {logData.sleep_quality}/10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={logData.sleep_quality}
                onChange={(e) => setLogData({ ...logData, sleep_quality: parseInt(e.target.value) })}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Symptoms
            </label>
            <div className="grid grid-cols-2 gap-2">
              {symptoms.map(symptom => (
                <label
                  key={symptom}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    logData.symptoms.includes(symptom)
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={logData.symptoms.includes(symptom)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLogData({
                          ...logData,
                          symptoms: [...logData.symptoms, symptom]
                        });
                      } else {
                        setLogData({
                          ...logData,
                          symptoms: logData.symptoms.filter(s => s !== symptom)
                        });
                      }
                    }}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <span className="text-sm capitalize">{symptom.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={logData.notes}
              onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
              placeholder="Any additional notes about how you're feeling..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Dashboard Page ====================
const Dashboard = ({ userId, logs, cycles, onLogCreated }) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [nextPeriod, setNextPeriod] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [streak, setStreak] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      // Load dashboard data
      const dashboardRes = await authFetch('/dashboard');
      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboard(data);
      }

      // Load predictions
      const periodRes = await authFetch('/predictions/next-period');
      if (periodRes.ok) {
        const data = await periodRes.json();
        setNextPeriod(data);
      }

      // Load patterns (NOT medical warnings!)
      const patternsRes = await authFetch('/patterns');
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setWarnings(data || []);
      }

      // Load streak data
      const streakRes = await authFetch('/streaks');
      if (streakRes.ok) {
        const data = await streakRes.json();
        setStreak(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const currentCycle = cycles && cycles.length > 0 ? cycles[0] : null;
  const latestLog = logs && logs.length > 0 ? logs[0] : null;

  const chartData = logs
    .slice(0, 14)
    .reverse()
    .map(log => ({
      date: new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      energy: log.energy_level,
      mood: log.mood_intensity,
      sleep: log.sleep_quality
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome Back! 👋
        </h2>
        <p className="text-gray-600">
          {latestLog ? (
            <>
              {getPhaseEmoji(latestLog.cycle_phase)} Day {latestLog.cycle_day} of your cycle • {latestLog.cycle_phase} phase
            </>
          ) : (
            'Start tracking your cycle today'
          )}
        </p>
      </div>

      {/* Streak Card - NEW V2 FEATURE */}
      {streak && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🔥 Logging Streak</h3>
              <p className="text-4xl font-bold text-orange-600 mb-1">{streak.current_streak} days</p>
              <p className="text-sm text-gray-600">
                Longest: {streak.longest_streak} days • Total logs: {streak.total_logs}
              </p>
            </div>
            <div className="text-7xl">🔥</div>
          </div>
        </div>
      )}

      {/* Primary Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Next Period Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Next Period</h3>
            <Calendar className="w-6 h-6 text-pink-500" />
          </div>
          
          {nextPeriod ? (
            <>
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {formatDate(nextPeriod.predicted_start_date)}
                </p>
                <p className="text-sm text-gray-600">
                  {Math.ceil((new Date(nextPeriod.predicted_start_date) - new Date()) / (1000 * 60 * 60 * 24))} days away
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">Confidence</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 rounded-full"
                      style={{ width: `${nextPeriod.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {Math.round(nextPeriod.confidence_score * 100)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Log more cycles to see predictions</p>
            </div>
          )}
        </div>

        {/* Log Today Card */}
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Today's Check-In</h3>
          
          <button
            onClick={() => setShowLogModal(true)}
            className="w-full bg-white text-pink-600 rounded-xl py-4 px-6 font-bold text-lg hover:bg-pink-50 transition-colors shadow-md flex items-center justify-center space-x-2"
          >
            <Plus className="w-6 h-6" />
            <span>Log Today</span>
          </button>
          
          {latestLog && (
            <p className="text-sm text-pink-100 mt-3">
              Last logged: {formatDate(latestLog.log_date)}
            </p>
          )}
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Your Trends</h3>
          <TrendingUp className="w-6 h-6 text-green-500" />
        </div>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                domain={[0, 10]}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="energy" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Energy"
                dot={{ fill: '#10B981', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="mood" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Mood"
                dot={{ fill: '#3B82F6', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="sleep" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                name="Sleep"
                dot={{ fill: '#8B5CF6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Log more days to see your trends</p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-200">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Early Warnings ({warnings.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  warning.severity === 'high'
                    ? 'bg-red-50 border-red-500'
                    : warning.severity === 'medium'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <h4 className="font-semibold text-gray-900 mb-1">
                  {warning.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {warning.description}
                </p>
                {warning.recommendations && (
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    {warning.recommendations.slice(0, 2).map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Log Modal */}
      <DailyLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSave={onLogCreated}
        userId={userId}
      />
    </div>
  );
};

// ==================== Analytics Page ====================
const Analytics = ({ userId, logs }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      const response = await authFetch('/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available yet</p>
      </div>
    );
  }

  // Process symptom data for chart
  const symptomChartData = analytics.top_symptoms?.slice(0, 8).map(s => ({
    symptom: s.symptom.replace('_', ' '),
    frequency: s.frequency,
    severity: s.average_severity
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h2>
        <p className="text-gray-600">Deep insights into your menstrual health</p>
      </div>

      {/* Cycle Stats */}
      {analytics.cycle_stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Average Cycle</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.cycle_stats.average_cycle_length.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">days</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Average Period</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.cycle_stats.average_period_length.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500">days</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Regularity Score</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.cycle_stats.regularity_score.toFixed(0)}%
            </p>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${analytics.cycle_stats.regularity_score}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Total Cycles</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.cycle_stats.total_cycles}
            </p>
            <p className="text-sm text-gray-500">tracked</p>
          </div>
        </div>
      )}

      {/* Symptom Frequency Chart */}
      {symptomChartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Common Symptoms
          </h3>
          
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={symptomChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="symptom" 
                angle={-45}
                textAnchor="end"
                height={100}
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar dataKey="frequency" fill="#F43F5E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Symptom Details */}
      {analytics.top_symptoms && analytics.top_symptoms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Symptom Patterns
          </h3>
          
          <div className="space-y-3">
            {analytics.top_symptoms.slice(0, 5).map((symptom, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {symptom.symptom.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-600">
                    Most common in {symptom.most_common_phase} phase
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {symptom.frequency}
                  </p>
                  <p className="text-xs text-gray-500">occurrences</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Predictions Page ====================
const Predictions = ({ userId }) => {
  const [nextPeriod, setNextPeriod] = useState(null);
  const [symptoms, setSymptoms] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictions();
  }, [userId]);

  const loadPredictions = async () => {
    try {
      const [periodRes, patternsRes] = await Promise.all([
        authFetch('/predictions/next-period'),
        authFetch('/patterns')
      ]);

      if (periodRes.ok) setNextPeriod(await periodRes.json());
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setWarnings(data || []);
      }
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Predictions</h2>
        <p className="text-gray-600">AI-powered insights into your upcoming cycle</p>
      </div>

      {/* Next Period */}
      {nextPeriod && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl shadow-lg p-8 border border-pink-100">
          <div className="flex items-center space-x-3 mb-6">
            <Calendar className="w-8 h-8 text-pink-600" />
            <h3 className="text-2xl font-bold text-gray-900">Next Period Prediction</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Predicted Start Date</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatDate(nextPeriod.predicted_start_date)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {Math.ceil((new Date(nextPeriod.predicted_start_date) - new Date()) / (1000 * 60 * 60 * 24))} days away
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Expected Cycle Length</p>
              <p className="text-3xl font-bold text-gray-900">
                {nextPeriod.predicted_cycle_length} days
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Confidence</p>
              <p className="text-3xl font-bold text-gray-900">
                {Math.round(nextPeriod.confidence_score * 100)}%
              </p>
              <div className="w-full h-3 bg-white rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-pink-500 rounded-full transition-all"
                  style={{ width: `${nextPeriod.confidence_score * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Symptom Predictions */}
      {symptoms && symptoms.predictions && Object.keys(symptoms.predictions).length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Likely Upcoming Symptoms
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(symptoms.predictions).map(([symptom, data]) => (
              <div key={symptom} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {symptom.replace('_', ' ')}
                  </h4>
                  <span className="text-sm font-semibold text-pink-600">
                    {Math.round(data.probability * 100)}%
                  </span>
                </div>
                
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 rounded-full"
                    style={{ width: `${data.probability * 100}%` }}
                  />
                </div>
                
                {data.severity_estimate && (
                  <p className="text-xs text-gray-500 mt-2">
                    Expected severity: {data.severity_estimate.toFixed(1)}/10
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-200">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h3 className="text-xl font-semibold text-gray-900">
              Early Warnings
            </h3>
          </div>

          <div className="space-y-4">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border-l-4 ${
                  warning.severity === 'high'
                    ? 'bg-red-50 border-red-500'
                    : warning.severity === 'medium'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <h4 className="font-bold text-gray-900 mb-2">
                  {warning.title}
                </h4>
                <p className="text-sm text-gray-700 mb-3">
                  {warning.description}
                </p>
                {warning.recommendations && (
                  <>
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      Recommendations:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {warning.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-pink-500 mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Chat Page ====================
const Chat = ({ userId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    "What patterns do you notice in my data?",
    "When do I usually experience headaches?",
    "How does my sleep affect my mood?",
    "What should I expect during my luteal phase?"
  ];

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await authFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: messageText
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 h-[calc(100vh-200px)] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Health Assistant</h2>
              <p className="text-sm text-gray-600">Ask me anything about your cycle</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-pink-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-600 mb-6">
                I'm here to help you understand your menstrual health better
              </p>
              
              <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(question)}
                    className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    <p className="text-sm text-gray-700">{question}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                      msg.role === 'user'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-6 py-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder="Ask about your cycle, symptoms, or patterns..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Main App Component ====================
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    const token = getAuthToken();

    if (!token) {
      // No token - redirect to login
      setLoading(false);
      setUserId(null);
      return;
    }

    try {
      // Get user data
      const response = await authFetch('/users/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setUserId(userData.user_id);
        await loadUserData(userData.user_id);
      } else {
        clearAuthToken();
        setUserId(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      clearAuthToken();
      setUserId(null);
    }

    setLoading(false);
  };

  const loadUserData = async (id) => {
    try {
      // Load logs
      const logsRes = await authFetch('/logs?limit=30');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }

      // Load cycles
      const cyclesRes = await authFetch('/cycles?limit=12');
      if (cyclesRes.ok) {
        const cyclesData = await cyclesRes.json();
        setCycles(cyclesData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogCreated = async (logData) => {
    try {
      const response = await authFetch('/logs', {
        method: 'POST',
        body: JSON.stringify(logData)
      });

      if (response.ok) {
        await loadUserData(userId);
      }
    } catch (error) {
      console.error('Error creating log:', error);
      throw error;
    }
  };

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');

  const handleAuth = async (email, password, name = null) => {
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login'
        ? { email, password }
        : { email, password, name };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.token);
        setShowAuthModal(false);
        await initializeApp();
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setAuthError('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading FlowTracker...</p>
        </div>
      </div>
    );
  }

  // Show login if no user
  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <Heart className="w-16 h-16 text-pink-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">FlowTracker</h1>
            <p className="text-gray-600">AI-Powered Period Tracking</p>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-md transition-all font-medium ${
                authMode === 'login'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-md transition-all font-medium ${
                authMode === 'register'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleAuth(
              formData.get('email'),
              formData.get('password'),
              formData.get('name')
            );
          }}>
            {authMode === 'register' && (
              <input
                type="text"
                name="name"
                placeholder="Name"
                required
                className="w-full px-4 py-3 mb-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            )}
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="w-full px-4 py-3 mb-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            {authError && (
              <p className="text-red-600 text-sm mb-4">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} user={user} />

      <main>
        {activeTab === 'dashboard' && (
          <Dashboard
            userId={userId}
            logs={logs}
            cycles={cycles}
            onLogCreated={handleLogCreated}
          />
        )}
        {activeTab === 'analytics' && (
          <Analytics userId={userId} logs={logs} />
        )}
        {activeTab === 'predictions' && (
          <Predictions userId={userId} />
        )}
        {activeTab === 'chat' && (
          <Chat userId={userId} />
        )}
      </main>
    </div>
  );
};

export default App;
