# MSP QnA Teams - Claude Code Agent Teams

🤖 **Advanced AWS Managed Service Provider (MSP) partner program validation system powered by Claude Code Agent Teams.**

This project represents the next evolution of AI-powered MSP validation with specialized agents working collaboratively to provide expert-level consultation and evaluation.

## 🌟 Agent Teams Overview

This system leverages Claude Code Agent Teams to provide:

- **🎯 MSP Consultant Agent**: Expert AWS MSP program guidance and compliance advice
- **🔍 Evidence Evaluator Agent**: Multi-dimensional assessment of submitted documentation
- **⚙️ System Administrator Agent**: Intelligent monitoring and optimization
- **🤝 User Guide Agent**: Personalized progress analysis and recommendations

## 🚀 Key Innovations

- **🤖 Collaborative AI**: Multiple specialized agents working together
- **🧠 Expert-Level Analysis**: Domain-specific knowledge and reasoning
- **📊 Predictive Insights**: Proactive recommendations and risk detection
- **📈 Adaptive Learning**: Continuous improvement based on outcomes
- **⚡ SuperClaude Integration**: Advanced orchestration and optimization

## 🏗️ Architecture

### Agent Collaboration Patterns
```yaml
assessment_collaboration:
  - MSP Consultant: "Provides regulatory expertise and best practices"
  - Evidence Evaluator: "Validates submitted documentation quality"
  - User Guide: "Delivers personalized guidance and next steps"

system_optimization:
  - System Administrator: "Monitors performance and optimizes caching"
  - MSP Consultant: "Analyzes advice effectiveness"
  - User Guide: "Tracks user experience metrics"
```

### Core Technologies
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, SQLite (better-sqlite3)
- **AI/LLM**: Claude Code Agent Teams with SuperClaude orchestration
- **Providers**: AWS Bedrock, OpenAI, Google Gemini, Anthropic Claude
- **Infrastructure**: PM2, Nginx, Docker support

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js 18+ and npm
node --version  # Should be 18+
npm --version

# Install build tools for better-sqlite3
sudo apt-get install build-essential python3  # Ubuntu/Debian
# OR
brew install python3  # macOS
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/randykwon/msp-qna-teams.git
cd msp-qna-teams
```

2. **Install dependencies**
```bash
cd msp-checklist
npm install

cd admin
npm install
cd ..
```

3. **Set up environment variables**
```bash
# Main app environment
cp msp-checklist/.env.local.example msp-checklist/.env.local
# Edit msp-checklist/.env.local with your API keys

# Admin app environment  
cp msp-checklist/admin/.env.local.example msp-checklist/admin/.env.local
# Edit admin environment if needed
```

4. **Start development servers**
```bash
# Start both apps in development mode
./scripts/server-all.sh start

# OR start individually
cd msp-checklist && npm run dev  # Port 3010
cd msp-checklist/admin && npm run dev  # Port 3011
```

### Access URLs

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Main App | 3010 | http://localhost:3010 | User assessment interface |
| Admin Dashboard | 3011 | http://localhost:3011 | Agent Teams management |

## 🤖 Agent Teams Configuration

### Environment Variables

**Main App** (`msp-checklist/.env.local`):
```env
# LLM Provider Selection
LLM_PROVIDER=claude  # Recommended for Agent Teams

# Claude API (Recommended)
ANTHROPIC_API_KEY=your-claude-api-key

# AWS Bedrock (Alternative)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret

# Agent Teams Configuration
ENABLE_AGENT_TEAMS=true
AGENT_COLLABORATION_MODE=full
SUPERCLAUD_ORCHESTRATION=true
```

### Agent Activation

Agents automatically activate based on context:
- **MSP Consultant**: Triggered by assessment advice requests
- **Evidence Evaluator**: Activated on file uploads and evidence review
- **System Admin**: Monitors performance and optimizes caching
- **User Guide**: Provides personalized recommendations

## 📋 Project Structure

```
msp-qna-teams/
├── msp-checklist/                 # Main application
│   ├── app/                       # Next.js App Router
│   ├── components/               # React components
│   ├── lib/                      # Core libraries
│   │   ├── agents/              # 🤖 Agent Teams implementation
│   │   │   ├── base-agent.ts            # Base agent interface
│   │   │   ├── msp-consultant-agent.ts  # MSP expertise
│   │   │   ├── evidence-evaluator.ts    # Document analysis
│   │   │   ├── system-admin-agent.ts    # Performance monitoring
│   │   │   └── user-guide-agent.ts      # User assistance
│   │   ├── orchestrator/        # 🎼 Agent coordination
│   │   │   ├── team-orchestrator.ts     # Main orchestrator
│   │   │   └── collaboration-engine.ts  # Agent collaboration
│   │   ├── llm-service.ts       # Enhanced LLM integration
│   │   └── ...                  # Other services
│   └── admin/                   # Admin dashboard
│       ├── app/                 # Admin pages
│       └── components/          # Admin components
├── scripts/                     # Management scripts
├── docs/                       # Documentation
└── nginx-samples/              # Deployment configs
```

## 🧪 Testing Agent Teams

```bash
# Test individual agents
npm run test:agent-msp          # Test MSP Consultant
npm run test:agent-evaluator    # Test Evidence Evaluator
npm run test:agent-admin        # Test System Admin
npm run test:agent-guide        # Test User Guide

# Test agent collaboration
npm run test:collaboration      # Multi-agent scenarios

# Test complete workflow
npm run test:full-workflow      # End-to-end testing
```

## 📊 Monitoring & Analytics

The Admin Dashboard provides:

- **Agent Performance Metrics**: Response times, success rates, token usage
- **Collaboration Analytics**: Agent interaction patterns and effectiveness
- **User Experience Tracking**: Satisfaction scores and completion rates
- **System Optimization**: Cache hit rates and performance insights

## 🚢 Deployment

### Production Deployment
```bash
# Build for production
npm run build:all

# Deploy to server
./scripts/deploy/production-deploy.sh
```

### Docker Support
```bash
# Build containers
docker-compose build

# Run in production
docker-compose up -d
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Agent Teams Guide](docs/AGENT_TEAMS.md) | Detailed agent implementation |
| [Collaboration Patterns](docs/COLLABORATION.md) | Multi-agent workflows |
| [API Documentation](docs/API.md) | Enhanced API with agent endpoints |
| [Performance Tuning](docs/PERFORMANCE.md) | Optimization strategies |
| [Deployment Guide](docs/DEPLOYMENT.md) | Production deployment |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/agent-improvement`
3. Commit changes: `git commit -m 'Add new agent capability'`
4. Push to branch: `git push origin feature/agent-improvement`
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/randykwon/msp-qna-teams/issues)
- **Discussions**: [GitHub Discussions](https://github.com/randykwon/msp-qna-teams/discussions)
- **Wiki**: [Project Wiki](https://github.com/randykwon/msp-qna-teams/wiki)

---

**🎯 Next Evolution**: Experience the power of collaborative AI with specialized agents working together to provide expert-level AWS MSP validation and guidance.