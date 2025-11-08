# Deployment Guide

## Production Deployment Options

### Option 1: Cloud Deployment (Recommended)

#### Using Railway/Render/Heroku

**Backend (FastAPI):**

1. **Prepare for deployment:**
```bash
# Create Procfile
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile

# Create runtime.txt
echo "python-3.11" > runtime.txt
```

2. **Set environment variables:**
```
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
```

3. **Deploy:**
- Connect GitHub repository
- Set environment variables
- Deploy from main branch

**Database (PostgreSQL with pgvector):**

Railway/Render provide managed PostgreSQL. Add pgvector:
```sql
CREATE EXTENSION vector;
```

**Frontend (React):**

Deploy to Vercel/Netlify:
```bash
cd frontend
npm run build
# Deploy build/ folder
```

Update API URL in environment:
```
REACT_APP_API_URL=https://your-backend.railway.app
```

---

### Option 2: AWS Deployment

**Architecture:**
```
CloudFront → S3 (Frontend)
                ↓
ALB → ECS Fargate (Backend) → RDS PostgreSQL
                ↓
      Lambda (ML processing)
```

**Steps:**

1. **Backend on ECS:**
   - Build Docker image
   - Push to ECR
   - Create ECS service with Fargate
   - Configure ALB

2. **Database on RDS:**
   - Create PostgreSQL 15+ instance
   - Install pgvector extension
   - Configure security groups

3. **Frontend on S3 + CloudFront:**
   - Build React app
   - Upload to S3 bucket
   - Configure CloudFront distribution
   - Set custom domain

---

### Option 3: DigitalOcean/Linode VPS

**Single VPS Setup:**

1. **Provision VPS:**
   - Ubuntu 22.04 LTS
   - At least 2GB RAM
   - 50GB storage

2. **Install dependencies:**
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib python3.11 python3-pip nginx git

# Install pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

3. **Setup application:**
```bash
# Clone repository
git clone <your-repo> /var/www/period-tracker
cd /var/www/period-tracker

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup database
sudo -u postgres psql -c "CREATE DATABASE period_tracker;"
sudo -u postgres psql period_tracker -c "CREATE EXTENSION vector;"
sudo -u postgres psql -c "CREATE USER tracker_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE period_tracker TO tracker_user;"

# Initialize database
python init_db.py
```

4. **Setup systemd service:**
```bash
sudo nano /etc/systemd/system/period-tracker.service
```

```ini
[Unit]
Description=Period Tracker API
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/period-tracker
Environment="PATH=/var/www/period-tracker/venv/bin"
Environment="DATABASE_URL=postgresql://tracker_user:secure_password@localhost/period_tracker"
Environment="GROQ_API_KEY=your_key"
Environment="OPENAI_API_KEY=your_key"
ExecStart=/var/www/period-tracker/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

5. **Setup Nginx:**
```bash
sudo nano /etc/nginx/sites-available/period-tracker
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/period-tracker/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

6. **Enable and start:**
```bash
sudo systemctl enable period-tracker
sudo systemctl start period-tracker
sudo systemctl enable nginx
sudo systemctl restart nginx
```

7. **Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Production Checklist

### Security
- [ ] Use HTTPS/SSL certificates
- [ ] Implement JWT authentication
- [ ] Add rate limiting (e.g., slowapi)
- [ ] Enable CORS with specific origins only
- [ ] Use environment variables for secrets
- [ ] Implement input validation (already done with Pydantic)
- [ ] Add SQL injection protection (already done with SQLAlchemy)
- [ ] Setup firewall rules
- [ ] Regular security updates

### Performance
- [ ] Database indexing (already included)
- [ ] Connection pooling (SQLAlchemy default)
- [ ] Caching layer (Redis for predictions)
- [ ] CDN for frontend assets
- [ ] Gzip compression
- [ ] Image optimization
- [ ] Lazy loading for charts
- [ ] Database query optimization

### Monitoring
- [ ] Application logging (use Python logging)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (DataDog/New Relic)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Database monitoring
- [ ] API analytics

### Backup & Recovery
- [ ] Automated database backups (daily)
- [ ] Backup retention policy (30 days)
- [ ] Disaster recovery plan
- [ ] Point-in-time recovery
- [ ] Regular restore testing

### Scalability
- [ ] Horizontal scaling (load balancer)
- [ ] Database replication (read replicas)
- [ ] Caching strategy
- [ ] Background job processing (Celery)
- [ ] API versioning

---

## Environment-Specific Configurations

### Development
```bash
DEBUG=True
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql://localhost/period_tracker_dev
ALLOWED_ORIGINS=http://localhost:3000
```

### Staging
```bash
DEBUG=False
LOG_LEVEL=INFO
DATABASE_URL=postgresql://staging-db/period_tracker
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

### Production
```bash
DEBUG=False
LOG_LEVEL=WARNING
DATABASE_URL=postgresql://prod-db/period_tracker
ALLOWED_ORIGINS=https://yourdomain.com
SENTRY_DSN=https://...
```

---

## Cost Estimates

### Small Scale (< 1000 users)
- **Railway/Render**: $20-50/month
  - Backend: $7-20
  - Database: $10-20
  - Frontend (Vercel): $0 (free tier)

### Medium Scale (1000-10000 users)
- **AWS**: $100-300/month
  - ECS Fargate: $50-100
  - RDS PostgreSQL: $50-150
  - S3 + CloudFront: $10-20
  - Data transfer: $20-30

### Large Scale (10000+ users)
- **AWS**: $500-2000/month
  - Multi-AZ deployment
  - Auto-scaling
  - Read replicas
  - Enhanced monitoring

---

## Maintenance Tasks

### Daily
- Monitor error logs
- Check API response times
- Review user feedback

### Weekly
- Database performance review
- API usage analytics
- Security scan

### Monthly
- Backup restoration test
- Dependency updates
- Performance optimization
- Cost analysis

### Quarterly
- Security audit
- Load testing
- Feature planning
- Database cleanup (old data archival)

---

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check pgvector
psql -d period_tracker -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

### High Memory Usage
```bash
# Check Python memory
ps aux | grep uvicorn

# Database memory
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"
```

### Slow Queries
```sql
-- Enable slow query logging
ALTER DATABASE period_tracker SET log_min_duration_statement = 1000;

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Support & Resources

- PostgreSQL: https://www.postgresql.org/docs/
- pgvector: https://github.com/pgvector/pgvector
- FastAPI: https://fastapi.tiangolo.com/
- Groq API: https://console.groq.com/docs
- React: https://react.dev/

For issues: Open GitHub issue or contact support
