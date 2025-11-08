import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from prophet import Prophet
import warnings
warnings.filterwarnings('ignore')

class CyclePredictionEngine:
    """ML engine for predicting menstrual cycles and related patterns"""
    
    def __init__(self):
        self.cycle_model = None
        self.symptom_models = {}
        self.mood_model = None
        
    def predict_next_cycle(self, historical_cycles: List[Dict]) -> Dict[str, Any]:
        """
        Predict the next menstrual cycle start date and characteristics
        
        Args:
            historical_cycles: List of past cycle data with start_date, cycle_length, period_length
            
        Returns:
            Dictionary with predicted start_date, cycle_length, confidence
        """
        if len(historical_cycles) < 3:
            # Not enough data, use simple average
            avg_length = np.mean([c['cycle_length'] for c in historical_cycles if c.get('cycle_length')])
            last_start = max([c['start_date'] for c in historical_cycles])
            predicted_start = last_start + timedelta(days=int(avg_length))
            
            return {
                'predicted_start_date': predicted_start,
                'predicted_cycle_length': int(avg_length),
                'confidence_score': 0.6,
                'method': 'simple_average'
            }
        
        # Use Prophet for time series prediction
        df = pd.DataFrame([
            {'ds': c['start_date'], 'y': c['cycle_length']}
            for c in historical_cycles if c.get('cycle_length')
        ])
        
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        model.fit(df)
        
        # Predict next 60 days
        last_date = df['ds'].max()
        future = pd.DataFrame({'ds': pd.date_range(start=last_date, periods=60, freq='D')})
        forecast = model.predict(future)
        
        # Find when cycle length crosses average threshold
        avg_cycle = df['y'].mean()
        predicted_length = int(forecast['yhat'].mean())
        predicted_start = last_date + timedelta(days=predicted_length)
        
        # Calculate confidence based on historical regularity
        std_cycle = df['y'].std()
        regularity_score = 1 - min(std_cycle / avg_cycle, 1)  # Lower std = higher regularity
        confidence = 0.5 + (0.4 * regularity_score)
        
        return {
            'predicted_start_date': predicted_start,
            'predicted_cycle_length': predicted_length,
            'confidence_score': round(confidence, 2),
            'method': 'prophet_time_series',
            'regularity_score': round(regularity_score, 2)
        }
    
    def predict_ovulation(self, cycle_start_date: datetime, cycle_length: int = 28) -> Dict[str, Any]:
        """
        Predict ovulation window
        
        Args:
            cycle_start_date: Start date of current cycle
            cycle_length: Expected cycle length
            
        Returns:
            Dictionary with ovulation date range and fertile window
        """
        # Ovulation typically occurs 14 days before next period
        ovulation_day = cycle_length - 14
        ovulation_date = cycle_start_date + timedelta(days=ovulation_day)
        
        # Fertile window is 5 days before ovulation + ovulation day
        fertile_start = ovulation_date - timedelta(days=5)
        fertile_end = ovulation_date + timedelta(days=1)
        
        return {
            'ovulation_date': ovulation_date,
            'fertile_window_start': fertile_start,
            'fertile_window_end': fertile_end,
            'cycle_day': ovulation_day,
            'confidence_score': 0.75
        }
    
    def predict_symptoms(self, daily_logs: List[Dict], target_date: datetime) -> Dict[str, Any]:
        """
        Predict likely symptoms for a future date based on historical patterns
        
        Args:
            daily_logs: Historical daily log data
            target_date: Date to predict for
            
        Returns:
            Dictionary with predicted symptoms and probabilities
        """
        if len(daily_logs) < 30:
            return {'predictions': [], 'confidence_score': 0.3, 'message': 'Insufficient data'}
        
        df = pd.DataFrame(daily_logs)
        df['log_date'] = pd.to_datetime(df['log_date'])
        
        # Feature engineering
        df['cycle_day_mod'] = df['cycle_day'] % 28
        df['is_menstrual'] = (df['cycle_phase'] == 'menstrual').astype(int)
        df['is_luteal'] = (df['cycle_phase'] == 'luteal').astype(int)
        df['is_ovulation'] = (df['cycle_phase'] == 'ovulation').astype(int)
        
        # Calculate target cycle day
        # This would need cycle context - simplified here
        target_cycle_day = 15  # Example
        
        # Predict each common symptom
        predictions = {}
        all_symptoms = set()
        for log in daily_logs:
            if log.get('symptoms'):
                all_symptoms.update(log['symptoms'])
        
        for symptom in all_symptoms:
            df[f'has_{symptom}'] = df['symptoms'].apply(lambda x: symptom in x if x else False)
            
            # Simple frequency-based prediction by cycle phase
            phase_data = df[df['cycle_day_mod'].between(target_cycle_day - 2, target_cycle_day + 2)]
            if len(phase_data) > 0:
                probability = phase_data[f'has_{symptom}'].mean()
                if probability > 0.2:  # Only include if >20% chance
                    predictions[symptom] = {
                        'probability': round(probability, 2),
                        'severity_estimate': phase_data[phase_data[f'has_{symptom}']]['symptom_severity'].apply(
                            lambda x: x.get(symptom, 5) if isinstance(x, dict) else 5
                        ).mean() if 'symptom_severity' in phase_data.columns else 5
                    }
        
        return {
            'predictions': predictions,
            'confidence_score': 0.65,
            'target_date': target_date
        }
    
    def detect_patterns(self, daily_logs: List[Dict]) -> List[Dict[str, Any]]:
        """
        Detect patterns and correlations in user data
        
        Args:
            daily_logs: Historical daily log data
            
        Returns:
            List of detected patterns with descriptions
        """
        if len(daily_logs) < 30:
            return []
        
        df = pd.DataFrame(daily_logs)
        df['log_date'] = pd.to_datetime(df['log_date'])
        patterns = []
        
        # Pattern 1: Sleep quality impact on mood
        if 'sleep_quality' in df.columns and 'mood_intensity' in df.columns:
            corr = df[['sleep_quality', 'mood_intensity']].corr().iloc[0, 1]
            if abs(corr) > 0.4:
                patterns.append({
                    'type': 'correlation',
                    'title': 'Sleep Quality & Mood Connection',
                    'description': f"Your sleep quality {'positively' if corr > 0 else 'negatively'} correlates with your mood (r={corr:.2f}). "
                                   f"Better sleep tends to mean {'better' if corr > 0 else 'worse'} mood.",
                    'confidence_score': abs(corr),
                    'data_points': {'correlation': corr}
                })
        
        # Pattern 2: Symptom clustering by phase
        symptom_by_phase = {}
        for _, log in df.iterrows():
            phase = log.get('cycle_phase', 'unknown')
            if log.get('symptoms'):
                for symptom in log['symptoms']:
                    if symptom not in symptom_by_phase:
                        symptom_by_phase[symptom] = {}
                    symptom_by_phase[symptom][phase] = symptom_by_phase[symptom].get(phase, 0) + 1
        
        for symptom, phase_counts in symptom_by_phase.items():
            if phase_counts:
                most_common_phase = max(phase_counts, key=phase_counts.get)
                total = sum(phase_counts.values())
                concentration = phase_counts[most_common_phase] / total
                
                if concentration > 0.6:  # 60% of occurrences in one phase
                    patterns.append({
                        'type': 'pattern',
                        'title': f'{symptom.replace("_", " ").title()} Pattern Detected',
                        'description': f"You experience {symptom.replace('_', ' ')} primarily during the {most_common_phase} phase "
                                       f"({int(concentration * 100)}% of the time).",
                        'confidence_score': concentration,
                        'data_points': {'phase': most_common_phase, 'concentration': concentration}
                    })
        
        # Pattern 3: Energy level trends
        if 'energy_level' in df.columns and 'cycle_phase' in df.columns:
            phase_energy = df.groupby('cycle_phase')['energy_level'].mean()
            if len(phase_energy) > 0:
                high_energy_phase = phase_energy.idxmax()
                low_energy_phase = phase_energy.idxmin()
                
                patterns.append({
                    'type': 'trend',
                    'title': 'Energy Level Fluctuations',
                    'description': f"Your energy peaks during the {high_energy_phase} phase (avg: {phase_energy[high_energy_phase]:.1f}/10) "
                                   f"and dips during the {low_energy_phase} phase (avg: {phase_energy[low_energy_phase]:.1f}/10).",
                    'confidence_score': 0.75,
                    'data_points': dict(phase_energy)
                })
        
        return patterns
    
    def generate_early_warnings(self, daily_logs: List[Dict], upcoming_days: int = 7) -> List[Dict[str, Any]]:
        """
        Generate early warnings for upcoming symptoms/changes
        
        Args:
            daily_logs: Historical daily log data
            upcoming_days: Number of days to look ahead
            
        Returns:
            List of warnings with descriptions and recommendations
        """
        if len(daily_logs) < 30:
            return []
        
        df = pd.DataFrame(daily_logs)
        warnings_list = []
        
        # Get current cycle day
        latest_log = df.sort_values('log_date').iloc[-1]
        current_cycle_day = latest_log.get('cycle_day', 1)
        
        # Warning 1: Approaching menstrual phase
        if 26 <= current_cycle_day <= 28:
            warnings_list.append({
                'type': 'period_warning',
                'severity': 'medium',
                'title': 'Period Expected Soon',
                'description': 'Your period is likely to start in the next 1-3 days based on your cycle pattern.',
                'recommendations': [
                    'Keep supplies handy',
                    'Consider lighter exercise if you typically experience fatigue',
                    'Stay hydrated'
                ],
                'estimated_date': latest_log['log_date'] + timedelta(days=3)
            })
        
        # Warning 2: Luteal phase symptoms
        if 18 <= current_cycle_day <= 25:
            # Check historical luteal symptoms
            luteal_logs = df[df['cycle_phase'] == 'luteal']
            common_symptoms = []
            
            if len(luteal_logs) > 0:
                for _, log in luteal_logs.iterrows():
                    if log.get('symptoms'):
                        common_symptoms.extend(log['symptoms'])
                
                if common_symptoms:
                    from collections import Counter
                    symptom_counts = Counter(common_symptoms)
                    top_symptoms = [s for s, _ in symptom_counts.most_common(3)]
                    
                    warnings_list.append({
                        'type': 'symptom_warning',
                        'severity': 'low',
                        'title': 'PMS Symptoms May Occur',
                        'description': f'Based on your history, you may experience {", ".join(top_symptoms[:2])} during this luteal phase.',
                        'recommendations': [
                            'Monitor your symptoms',
                            'Practice stress-reduction techniques',
                            'Maintain regular sleep schedule'
                        ]
                    })
        
        # Warning 3: Sleep pattern disruption
        if 'sleep_quality' in df.columns:
            recent_sleep = df.tail(7)['sleep_quality'].mean()
            historical_sleep = df['sleep_quality'].mean()
            
            if recent_sleep < historical_sleep - 1.5:
                warnings_list.append({
                    'type': 'health_warning',
                    'severity': 'medium',
                    'title': 'Sleep Quality Declining',
                    'description': f'Your sleep quality has dropped below your average. Recent: {recent_sleep:.1f}/10, Average: {historical_sleep:.1f}/10',
                    'recommendations': [
                        'Review your sleep hygiene',
                        'Consider earlier bedtime',
                        'Reduce screen time before bed',
                        'This may affect your mood and energy levels'
                    ]
                })
        
        return warnings_list
    
    def calculate_cycle_regularity(self, cycles: List[Dict]) -> float:
        """
        Calculate cycle regularity score (0-100)
        
        Args:
            cycles: List of cycle data
            
        Returns:
            Regularity score from 0 (irregular) to 100 (very regular)
        """
        if len(cycles) < 3:
            return 50.0  # Default mid-score for insufficient data
        
        cycle_lengths = [c['cycle_length'] for c in cycles if c.get('cycle_length')]
        
        if not cycle_lengths:
            return 50.0
        
        std_dev = np.std(cycle_lengths)
        mean_length = np.mean(cycle_lengths)
        
        # Coefficient of variation (lower is more regular)
        cv = std_dev / mean_length if mean_length > 0 else 1
        
        # Convert to 0-100 scale (inverted so higher is better)
        # CV < 0.05 = very regular, CV > 0.15 = irregular
        regularity = max(0, min(100, 100 * (1 - cv / 0.15)))
        
        return round(regularity, 1)
