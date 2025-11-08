import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Calendar, MessageCircle, TrendingUp, Activity, Moon, Heart, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { format, subDays, parseISO } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ========== Daily Log Form Component ==========
const DailyLogForm = ({ userId, onLogCreated }) => {
  const [logData, setLogData] = useState({
    log_date: format(new Date(), 'yyyy-MM-dd'),
    flow_level: '',
    mood: '',
    mood_intensity: 5,
    energy_level: 5,
    sleep_hours: 7,
    sleep_quality: 5,
    symptoms: [],
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  const symptomOptions = [
    'cramps', 'headache', 'bloating', 'breast_tenderness', 'back_pain',
    'fatigue', 'nausea', 'acne', 'mood_swings', 'anxiety', 'irritability'
  ];

  const flowLevels = ['none', 'spotting', 'light', 'medium', 'heavy'];
  const moodOptions = ['happy', 'sad', 'anxious', 'irritable', 'calm', 'energetic', 'depressed'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/users/${userId}/logs`, logData);
      onLogCreated();
      alert('Log saved successfully!');
      
      // Reset form for tomorrow
      setLogData({
        ...logData,
        log_date: format(new Date(), 'yyyy-MM-dd'),
        symptoms: [],
        notes: ''
      });
    } catch (error) {
      alert('Error saving log: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom) => {
    setLogData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        Daily Log
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={logData.log_date}
            onChange={(e) => setLogData({ ...logData, log_date: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Flow Level</label>
          <div className="flex gap-2 flex-wrap">
            {flowLevels.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setLogData({ ...logData, flow_level: level })}
                className={`px-4 py-2 rounded ${
                  logData.flow_level === level
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mood</label>
          <select
            value={logData.mood}
            onChange={(e) => setLogData({ ...logData, mood: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select mood</option>
            {moodOptions.map(mood => (
              <option key={mood} value={mood}>{mood}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Mood Intensity: {logData.mood_intensity}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={logData.mood_intensity}
            onChange={(e) => setLogData({ ...logData, mood_intensity: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Energy Level: {logData.energy_level}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={logData.energy_level}
            onChange={(e) => setLogData({ ...logData, energy_level: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Sleep Hours</label>
          <input
            type="number"
            step="0.5"
            value={logData.sleep_hours}
            onChange={(e) => setLogData({ ...logData, sleep_hours: parseFloat(e.target.value) })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Sleep Quality: {logData.sleep_quality}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={logData.sleep_quality}
            onChange={(e) => setLogData({ ...logData, sleep_quality: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Symptoms</label>
          <div className="grid grid-cols-2 gap-2">
            {symptomOptions.map(symptom => (
              <label key={symptom} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logData.symptoms.includes(symptom)}
                  onChange={() => toggleSymptom(symptom)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{symptom.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={logData.notes}
            onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 disabled:bg-gray-300"
        >
          {loading ? 'Saving...' : 'Save Daily Log'}
        </button>
      </form>
    </div>
  );
};

// ========== Cycle Visualization Component ==========
const CycleChart = ({ logs }) => {
  const chartData = logs.map(log => ({
    date: format(parseISO(log.log_date), 'MM/dd'),
    energy: log.energy_level,
    mood: log.mood_intensity,
    sleep: log.sleep_quality,
    cycleDay: log.cycle_day
  })).reverse();

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-6 h-6" />
        Cycle Trends
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="energy" stroke="#10b981" name="Energy" strokeWidth={2} />
          <Line type="monotone" dataKey="mood" stroke="#3b82f6" name="Mood" strokeWidth={2} />
          <Line type="monotone" dataKey="sleep" stroke="#8b5cf6" name="Sleep Quality" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ========== Symptom Frequency Chart ==========
const SymptomChart = ({ logs }) => {
  const symptomCounts = {};
  
  logs.forEach(log => {
    if (log.symptoms) {
      log.symptoms.forEach(symptom => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      });
    }
  });

  const chartData = Object.entries(symptomCounts)
    .map(([symptom, count]) => ({
      symptom: symptom.replace('_', ' '),
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6" />
        Common Symptoms
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="symptom" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#ec4899" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ========== Chat Component ==========
const ChatInterface = ({ userId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/users/${userId}/chat`, {
        message: input,
        include_context: true
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response
      }]);
    } catch (error) {
      alert('Chat error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg h-[600px] flex flex-col">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MessageCircle className="w-6 h-6" />
        AI Health Assistant
      </h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            Ask me anything about your menstrual health, patterns, or symptoms!
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-pink-100 ml-8'
                : 'bg-gray-100 mr-8'
            }`}
          >
            <div className="font-semibold text-sm mb-1">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="bg-gray-100 p-3 rounded-lg mr-8">
            <div className="text-sm">Thinking...</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about your cycle, symptoms, patterns..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600 disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// ========== Predictions & Warnings Component ==========
const PredictionsPanel = ({ userId }) => {
  const [predictions, setPredictions] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictions();
  }, [userId]);

  const loadPredictions = async () => {
    try {
      const [predResponse, warnResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/${userId}/predictions/next-period`),
        axios.get(`${API_BASE_URL}/users/${userId}/warnings`)
      ]);

      setPredictions(predResponse.data);
      setWarnings(warnResponse.data.warnings || []);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading predictions...</div>;

  return (
    <div className="space-y-4">
      {predictions && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Next Period Prediction
          </h2>

          <div className="space-y-2">
            <p className="text-lg">
              <strong>Predicted Start:</strong>{' '}
              {format(parseISO(predictions.predicted_start_date), 'MMMM dd, yyyy')}
            </p>
            <p>
              <strong>Expected Cycle Length:</strong> {predictions.predicted_cycle_length} days
            </p>
            <p>
              <strong>Confidence:</strong> {(predictions.confidence_score * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Early Warnings
          </h2>

          <div className="space-y-3">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg ${
                  warning.severity === 'high'
                    ? 'bg-red-50 border-l-4 border-red-500'
                    : warning.severity === 'medium'
                    ? 'bg-orange-50 border-l-4 border-orange-500'
                    : 'bg-blue-50 border-l-4 border-blue-500'
                }`}
              >
                <h3 className="font-semibold mb-2">{warning.title}</h3>
                <p className="text-sm mb-2">{warning.description}</p>
                {warning.recommendations && (
                  <ul className="text-sm list-disc list-inside">
                    {warning.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== Main Dashboard ==========
const Dashboard = () => {
  const [userId, setUserId] = useState(''); // In production, get from auth
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('log');

  useEffect(() => {
    // In production, get userId from authentication
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      loadLogs(storedUserId);
    } else {
      // For demo, create a new user
      createDemoUser();
    }
  }, []);

  const createDemoUser = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users/`, {
        email: `demo${Date.now()}@example.com`
      });
      const newUserId = response.data.user_id;
      setUserId(newUserId);
      localStorage.setItem('userId', newUserId);
      loadLogs(newUserId);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const loadLogs = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${id}/logs?limit=30`);
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogCreated = () => {
    loadLogs(userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-pink-600 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="w-8 h-8" />
          Period Tracker
        </h1>
        <p className="text-pink-100 mt-1">AI-Powered Menstrual Health Insights</p>
      </header>

      <div className="container mx-auto p-6">
        <div className="mb-6 flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'log'
                ? 'border-b-2 border-pink-500 text-pink-600'
                : 'text-gray-600'
            }`}
          >
            Daily Log
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'charts'
                ? 'border-b-2 border-pink-500 text-pink-600'
                : 'text-gray-600'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'predictions'
                ? 'border-b-2 border-pink-500 text-pink-600'
                : 'text-gray-600'
            }`}
          >
            Predictions
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'chat'
                ? 'border-b-2 border-pink-500 text-pink-600'
                : 'text-gray-600'
            }`}
          >
            AI Assistant
          </button>
        </div>

        {activeTab === 'log' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyLogForm userId={userId} onLogCreated={handleLogCreated} />
            <div className="space-y-6">
              {logs.length > 0 && <CycleChart logs={logs} />}
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {logs.length > 0 && (
              <>
                <CycleChart logs={logs} />
                <SymptomChart logs={logs} />
              </>
            )}
            {logs.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-500">
                Start logging your daily data to see visualizations!
              </div>
            )}
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="max-w-4xl">
            <PredictionsPanel userId={userId} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl">
            <ChatInterface userId={userId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
