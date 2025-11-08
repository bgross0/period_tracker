#!/usr/bin/env python3
"""
Database initialization and seeding script
"""

import sys
from datetime import datetime, timedelta, date
from models import Base, User, Cycle, DailyLog, SymptomType
from main import engine, SessionLocal
from sqlalchemy import text

def init_database():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully!")

def seed_symptom_types():
    """Seed common symptom types"""
    db = SessionLocal()
    
    symptoms = [
        ('cramps', 'physical', 'Menstrual cramps or pain'),
        ('headache', 'physical', 'Headaches or migraines'),
        ('bloating', 'physical', 'Abdominal bloating'),
        ('breast_tenderness', 'physical', 'Breast tenderness or soreness'),
        ('back_pain', 'physical', 'Lower back pain'),
        ('fatigue', 'physical', 'Tiredness or low energy'),
        ('nausea', 'digestive', 'Feeling nauseous'),
        ('diarrhea', 'digestive', 'Digestive issues - diarrhea'),
        ('constipation', 'digestive', 'Digestive issues - constipation'),
        ('acne', 'skin', 'Skin breakouts or acne'),
        ('mood_swings', 'emotional', 'Rapid mood changes'),
        ('anxiety', 'emotional', 'Anxious feelings'),
        ('irritability', 'emotional', 'Feeling irritable or short-tempered'),
        ('depression', 'emotional', 'Feeling down or depressed'),
        ('brain_fog', 'cognitive', 'Difficulty concentrating'),
        ('food_cravings', 'other', 'Food cravings'),
        ('increased_libido', 'other', 'Increased sex drive'),
        ('decreased_libido', 'other', 'Decreased sex drive'),
    ]
    
    print("Seeding symptom types...")
    for name, category, desc in symptoms:
        existing = db.query(SymptomType).filter(SymptomType.symptom_name == name).first()
        if not existing:
            symptom = SymptomType(
                symptom_name=name,
                category=category,
                description=desc
            )
            db.add(symptom)
    
    db.commit()
    print(f"✓ Seeded {len(symptoms)} symptom types!")
    db.close()

def create_demo_data(email: str = "demo@example.com"):
    """Create demo user with sample data"""
    db = SessionLocal()
    
    print(f"\nCreating demo user: {email}")
    
    # Create user
    user = User(
        email=email,
        average_cycle_length=28
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    print(f"✓ User created: {user.user_id}")
    
    # Create sample cycles (last 3 months)
    today = date.today()
    
    cycles_data = [
        (today - timedelta(days=84), 28, 5),  # 3 months ago
        (today - timedelta(days=56), 30, 4),  # 2 months ago
        (today - timedelta(days=26), 27, 5),  # Last month
    ]
    
    print("\nCreating sample cycles...")
    for start_date, cycle_length, period_length in cycles_data:
        cycle = Cycle(
            user_id=user.user_id,
            start_date=start_date,
            end_date=start_date + timedelta(days=cycle_length - 1),
            cycle_length=cycle_length,
            period_length=period_length,
            cycle_number=len(cycles_data) - cycles_data.index((start_date, cycle_length, period_length))
        )
        db.add(cycle)
    
    db.commit()
    print(f"✓ Created {len(cycles_data)} cycles")
    
    # Create sample daily logs for the last cycle
    print("\nCreating sample daily logs...")
    last_cycle_start = cycles_data[-1][0]
    
    sample_logs = [
        # Day 1-5: Menstrual phase
        {'day': 1, 'flow': 'medium', 'mood': 'tired', 'energy': 4, 'sleep': 7.5, 'symptoms': ['cramps', 'fatigue']},
        {'day': 2, 'flow': 'heavy', 'mood': 'irritable', 'energy': 3, 'sleep': 6, 'symptoms': ['cramps', 'headache', 'fatigue']},
        {'day': 3, 'flow': 'medium', 'mood': 'calm', 'energy': 5, 'sleep': 7, 'symptoms': ['cramps', 'bloating']},
        {'day': 4, 'flow': 'light', 'mood': 'calm', 'energy': 6, 'sleep': 7.5, 'symptoms': ['fatigue']},
        {'day': 5, 'flow': 'spotting', 'mood': 'happy', 'energy': 7, 'sleep': 8, 'symptoms': []},
        
        # Day 6-13: Follicular phase
        {'day': 8, 'flow': 'none', 'mood': 'energetic', 'energy': 8, 'sleep': 8, 'symptoms': []},
        {'day': 10, 'flow': 'none', 'mood': 'happy', 'energy': 9, 'sleep': 7.5, 'symptoms': []},
        {'day': 12, 'flow': 'none', 'mood': 'energetic', 'energy': 9, 'sleep': 8, 'symptoms': []},
        
        # Day 14-16: Ovulation
        {'day': 14, 'flow': 'none', 'mood': 'happy', 'energy': 9, 'sleep': 7, 'symptoms': ['increased_libido']},
        {'day': 15, 'flow': 'none', 'mood': 'energetic', 'energy': 8, 'sleep': 7.5, 'symptoms': []},
        
        # Day 17-27: Luteal phase
        {'day': 18, 'flow': 'none', 'mood': 'calm', 'energy': 7, 'sleep': 7, 'symptoms': []},
        {'day': 21, 'flow': 'none', 'mood': 'anxious', 'energy': 6, 'sleep': 6.5, 'symptoms': ['breast_tenderness']},
        {'day': 24, 'flow': 'none', 'mood': 'irritable', 'energy': 5, 'sleep': 6, 'symptoms': ['breast_tenderness', 'mood_swings', 'food_cravings']},
        {'day': 26, 'flow': 'none', 'mood': 'sad', 'energy': 4, 'sleep': 6, 'symptoms': ['bloating', 'acne', 'fatigue']},
    ]
    
    for log_data in sample_logs:
        log_date = last_cycle_start + timedelta(days=log_data['day'] - 1)
        
        daily_log = DailyLog(
            user_id=user.user_id,
            log_date=log_date,
            cycle_day=log_data['day'],
            flow_level=log_data['flow'],
            mood=log_data['mood'],
            mood_intensity=7 if log_data['mood'] in ['happy', 'energetic'] else 5,
            energy_level=log_data['energy'],
            sleep_hours=log_data['sleep'],
            sleep_quality=8 if log_data['sleep'] >= 7 else 6,
            symptoms=log_data['symptoms'],
            symptom_severity={s: 6 for s in log_data['symptoms']}
        )
        db.add(daily_log)
    
    db.commit()
    print(f"✓ Created {len(sample_logs)} daily logs")
    
    print(f"\n✅ Demo data creation complete!")
    print(f"User ID: {user.user_id}")
    print(f"Email: {user.email}")
    
    db.close()
    return user.user_id

def check_pgvector():
    """Check if pgvector extension is installed"""
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT * FROM pg_extension WHERE extname = 'vector'"))
        if result.fetchone():
            print("✓ pgvector extension is installed")
            return True
        else:
            print("⚠ pgvector extension NOT installed!")
            print("Please run: CREATE EXTENSION vector;")
            return False
    except Exception as e:
        print(f"Error checking pgvector: {e}")
        return False
    finally:
        db.close()

def main():
    """Main initialization function"""
    print("=" * 60)
    print("Period Tracker - Database Initialization")
    print("=" * 60)
    
    # Check pgvector
    print("\n1. Checking pgvector extension...")
    check_pgvector()
    
    # Initialize database
    print("\n2. Initializing database schema...")
    init_database()
    
    # Seed symptom types
    print("\n3. Seeding symptom types...")
    seed_symptom_types()
    
    # Ask about demo data
    print("\n4. Demo data creation (optional)")
    create_demo = input("Create demo user with sample data? (y/n): ").lower().strip()
    
    if create_demo == 'y':
        email = input("Enter demo email (default: demo@example.com): ").strip()
        if not email:
            email = "demo@example.com"
        
        user_id = create_demo_data(email)
        print(f"\n🎉 Demo user created successfully!")
        print(f"Save this User ID for testing: {user_id}")
    
    print("\n" + "=" * 60)
    print("Database initialization complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
