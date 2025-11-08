import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from groq import Groq
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

class RAGChatSystem:
    """
    RAG-powered chat system that understands user's menstrual cycle history
    Uses pgvector for semantic search and Groq for chat completion
    """
    
    def __init__(self, groq_api_key: str, model: str = "llama-3.1-70b-versatile"):
        self.groq_client = Groq(api_key=groq_api_key)
        self.model = model
        self.embedding_model = "llama-3.1-70b-versatile"  # Groq doesn't have embeddings yet, we'll use OpenAI
        
        # For embeddings, we'll use OpenAI or you can switch to local embeddings
        try:
            from openai import OpenAI
            self.embedding_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        except:
            self.embedding_client = None
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        if not self.embedding_client:
            # Fallback: simple hash-based embedding (not recommended for production)
            return [float(hash(text) % 100) / 100 for _ in range(1536)]
        
        response = self.embedding_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    
    def create_log_embedding_text(self, log: Dict) -> str:
        """
        Create a human-readable text summary of a daily log for embedding
        """
        parts = []
        
        # Date and cycle info
        parts.append(f"Date: {log.get('log_date')}")
        if log.get('cycle_phase'):
            parts.append(f"Cycle phase: {log['cycle_phase']}")
        if log.get('cycle_day'):
            parts.append(f"Day {log['cycle_day']} of cycle")
        
        # Flow
        if log.get('flow_level'):
            parts.append(f"Flow: {log['flow_level']}")
        
        # Mood
        if log.get('mood'):
            intensity = f" (intensity: {log['mood_intensity']}/10)" if log.get('mood_intensity') else ""
            parts.append(f"Mood: {log['mood']}{intensity}")
        
        # Energy
        if log.get('energy_level'):
            parts.append(f"Energy level: {log['energy_level']}/10")
        
        # Sleep
        if log.get('sleep_hours'):
            quality = f", quality: {log['sleep_quality']}/10" if log.get('sleep_quality') else ""
            parts.append(f"Slept {log['sleep_hours']} hours{quality}")
        
        # Symptoms
        if log.get('symptoms') and log['symptoms']:
            symptom_list = []
            for symptom in log['symptoms']:
                severity = ""
                if log.get('symptom_severity') and symptom in log['symptom_severity']:
                    severity = f" (severity: {log['symptom_severity'][symptom]}/10)"
                symptom_list.append(f"{symptom}{severity}")
            parts.append(f"Symptoms: {', '.join(symptom_list)}")
        
        # Notes
        if log.get('notes'):
            parts.append(f"Notes: {log['notes']}")
        
        return ". ".join(parts)
    
    def store_log_embedding(self, db: Session, log_id: str, user_id: str, log_data: Dict):
        """
        Generate and store embedding for a daily log
        """
        embedding_text = self.create_log_embedding_text(log_data)
        embedding_vector = self.generate_embedding(embedding_text)
        
        # Store in database
        query = text("""
            INSERT INTO log_embeddings (log_id, user_id, embedding_text, embedding)
            VALUES (:log_id, :user_id, :embedding_text, :embedding)
            ON CONFLICT (log_id) DO UPDATE SET
                embedding_text = :embedding_text,
                embedding = :embedding
        """)
        
        db.execute(query, {
            'log_id': str(log_id),
            'user_id': str(user_id),
            'embedding_text': embedding_text,
            'embedding': embedding_vector
        })
        db.commit()
    
    def retrieve_relevant_logs(
        self,
        db: Session,
        user_id: str,
        query: str,
        top_k: int = 5
    ) -> List[Dict]:
        """
        Retrieve most relevant logs using semantic similarity search
        
        Args:
            db: Database session
            user_id: User ID to filter by
            query: User's query text
            top_k: Number of results to return
            
        Returns:
            List of relevant log data with similarity scores
        """
        # Generate query embedding
        query_embedding = self.generate_embedding(query)
        
        # Perform similarity search using pgvector
        sql_query = text("""
            SELECT 
                le.log_id,
                le.embedding_text,
                dl.log_date,
                dl.cycle_phase,
                dl.cycle_day,
                dl.mood,
                dl.energy_level,
                dl.symptoms,
                dl.notes,
                1 - (le.embedding <=> :query_embedding) as similarity
            FROM log_embeddings le
            JOIN daily_logs dl ON le.log_id = dl.log_id
            WHERE le.user_id = :user_id
            ORDER BY le.embedding <=> :query_embedding
            LIMIT :top_k
        """)
        
        results = db.execute(sql_query, {
            'query_embedding': query_embedding,
            'user_id': str(user_id),
            'top_k': top_k
        }).fetchall()
        
        return [dict(row._mapping) for row in results]
    
    def get_user_context_summary(self, db: Session, user_id: str) -> str:
        """
        Generate a summary of user's overall patterns and history
        """
        # Get user stats
        stats_query = text("""
            SELECT 
                COUNT(DISTINCT dl.log_id) as total_logs,
                COUNT(DISTINCT c.cycle_id) as total_cycles,
                AVG(c.cycle_length) as avg_cycle_length,
                u.average_cycle_length as user_avg_cycle
            FROM users u
            LEFT JOIN daily_logs dl ON u.user_id = dl.user_id
            LEFT JOIN cycles c ON u.user_id = c.user_id AND c.cycle_length IS NOT NULL
            WHERE u.user_id = :user_id
            GROUP BY u.user_id, u.average_cycle_length
        """)
        
        stats = db.execute(stats_query, {'user_id': str(user_id)}).fetchone()
        
        if not stats:
            return "No historical data available yet."
        
        # Get common symptoms
        symptoms_query = text("""
            SELECT 
                symptom,
                COUNT(*) as frequency
            FROM daily_logs,
            LATERAL jsonb_array_elements_text(symptoms) as symptom
            WHERE user_id = :user_id
            GROUP BY symptom
            ORDER BY frequency DESC
            LIMIT 5
        """)
        
        symptoms = db.execute(symptoms_query, {'user_id': str(user_id)}).fetchall()
        
        summary_parts = [
            f"User has logged {stats.total_logs} days of data across {stats.total_cycles} cycles.",
            f"Average cycle length: {stats.avg_cycle_length:.1f} days." if stats.avg_cycle_length else "Cycle length tracking in progress."
        ]
        
        if symptoms:
            symptom_names = [s.symptom for s in symptoms]
            summary_parts.append(f"Most common symptoms: {', '.join(symptom_names)}.")
        
        return " ".join(summary_parts)
    
    def chat(
        self,
        db: Session,
        user_id: str,
        message: str,
        conversation_history: Optional[List[Dict]] = None,
        include_context: bool = True
    ) -> Dict[str, Any]:
        """
        Process a chat message with RAG context
        
        Args:
            db: Database session
            user_id: User ID
            message: User's message
            conversation_history: Previous messages in conversation
            include_context: Whether to retrieve and include relevant logs
            
        Returns:
            Dictionary with response and metadata
        """
        if conversation_history is None:
            conversation_history = []
        
        # Retrieve relevant context
        relevant_logs = []
        if include_context:
            relevant_logs = self.retrieve_relevant_logs(db, user_id, message, top_k=5)
        
        # Build system prompt with context
        user_context = self.get_user_context_summary(db, user_id)
        
        system_prompt = f"""You are a helpful and empathetic menstrual health assistant. You help users understand their menstrual cycles, symptoms, and patterns.

User Context:
{user_context}

Your role is to:
1. Answer questions about menstrual health, symptoms, and cycle patterns
2. Provide insights based on the user's historical data
3. Offer supportive, non-judgmental guidance
4. Explain patterns and correlations you observe
5. Suggest when medical consultation might be helpful

Always be warm, understanding, and informative. Use the user's data to personalize responses."""

        # Add relevant logs to context
        if relevant_logs:
            context_text = "\n\nRelevant entries from user's history:\n"
            for i, log in enumerate(relevant_logs, 1):
                context_text += f"\n{i}. {log['embedding_text']} (Similarity: {log['similarity']:.2f})"
            system_prompt += context_text
        
        # Build messages for Groq
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation history
        messages.extend(conversation_history)
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Call Groq API
        response = self.groq_client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        assistant_message = response.choices[0].message.content
        
        # Store chat in database
        self._store_chat_message(db, user_id, "user", message, [])
        self._store_chat_message(
            db,
            user_id,
            "assistant",
            assistant_message,
            [log['log_id'] for log in relevant_logs]
        )
        
        return {
            'response': assistant_message,
            'relevant_logs': relevant_logs,
            'tokens_used': response.usage.total_tokens if hasattr(response, 'usage') else None
        }
    
    def _store_chat_message(
        self,
        db: Session,
        user_id: str,
        role: str,
        content: str,
        relevant_log_ids: List[str]
    ):
        """Store a chat message in the database"""
        query = text("""
            INSERT INTO chat_messages (user_id, role, content, relevant_log_ids)
            VALUES (:user_id, :role, :content, :relevant_log_ids)
        """)
        
        db.execute(query, {
            'user_id': str(user_id),
            'role': role,
            'content': content,
            'relevant_log_ids': relevant_log_ids
        })
        db.commit()
    
    def get_conversation_history(
        self,
        db: Session,
        user_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """Retrieve recent conversation history"""
        query = text("""
            SELECT role, content, created_at
            FROM chat_messages
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT :limit
        """)
        
        results = db.execute(query, {
            'user_id': str(user_id),
            'limit': limit
        }).fetchall()
        
        # Return in chronological order
        return [
            {"role": row.role, "content": row.content}
            for row in reversed(results)
        ]
