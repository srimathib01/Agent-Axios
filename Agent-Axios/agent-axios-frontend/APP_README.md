# Agent Axios - AI-Powered Security Analysis Platform

An intelligent security analysis platform that helps teams identify and remediate vulnerabilities in their codebases. Built with modern web technologies and powered by advanced AI algorithms for comprehensive security scanning.

## Features

### 🔍 **Intelligent Security Scanning**
- **Multi-Depth Analysis**: Choose from Quick (2-3 min), Standard (5-10 min), or Deep (15-40 min) scans
- **Real-Time Progress Tracking**: Watch your analysis progress with detailed stage-by-stage updates
- **CVE Database Integration**: Comprehensive vulnerability detection against the latest CVE database
- **AI-Powered Validation**: Advanced machine learning algorithms validate findings to reduce false positives

### 📊 **Comprehensive Dashboard**
- **Repository Management**: Track all your repositories in one place
- **Vulnerability Overview**: Visualize security metrics with interactive charts
- **Trend Analysis**: Monitor security posture over time
- **Activity Feed**: Stay updated with recent scans and findings

### 💬 **AI Assistant**
- **Natural Language Interface**: Ask questions about vulnerabilities in plain English
- **Contextual Insights**: Get detailed explanations about specific CVEs
- **Remediation Guidance**: Receive actionable advice on how to fix vulnerabilities
- **Interactive Analysis**: Real-time conversation during security scans

### 📈 **Advanced Reporting**
- **Detailed PDF Reports**: Export comprehensive analysis results
- **Severity Classification**: Findings categorized by CRITICAL, HIGH, MEDIUM, and LOW
- **False Positive Management**: Mark and track false positives
- **Historical Data**: Access past scan results and compare trends

### 🔐 **Security & Authentication**
- **Secure Authentication**: Protected access with token-based authentication
- **User Profiles**: Personalized dashboard and preferences
- **Role-Based Access**: Different permission levels for team members

## Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast development and optimized builds
- **Tailwind CSS** for modern, responsive styling
- **shadcn/ui** for beautiful, accessible UI components
- **Recharts** for interactive data visualizations
- **React Router** for seamless navigation

### Key Libraries
- **React Hook Form** + **Zod** for robust form handling
- **Radix UI** for accessible component primitives
- **Lucide React** for crisp, scalable icons
- **Sonner** for elegant toast notifications
- **date-fns** for powerful date manipulation

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd agent-axios-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Running Your First Scan

1. **Login/Register**: Create an account or login to access the dashboard
2. **Add Repository**: Navigate to Repositories and add a GitHub repository URL
3. **Start Analysis**: Click "Scan Repository" and select your analysis depth
4. **Monitor Progress**: Watch real-time updates as the AI analyzes your code
5. **Review Results**: Explore findings, validate vulnerabilities, and export reports

### Understanding Analysis Types

- **SHORT (Quick Scan)**: 2-3 minutes
  - Surface-level analysis
  - Core security patterns
  - Best for quick checks

- **MEDIUM (Standard Audit)**: 5-10 minutes
  - Comprehensive pattern matching
  - AI validation of findings
  - Recommended for most use cases

- **HARD (Deep Analysis)**: 15-40 minutes
  - Exhaustive code examination
  - Advanced dependency analysis
  - Deep semantic search
  - Ideal for critical systems

### Managing Repositories

- **Auto-Scan**: Enable automatic periodic scanning
- **Scan Frequency**: Configure daily, weekly, or monthly scans
- **Starred Repos**: Mark important repositories for quick access
- **Status Indicators**:
  - 🟢 Healthy: No critical vulnerabilities
  - 🟡 Warning: Medium severity issues present
  - 🔴 Critical: High/critical vulnerabilities detected
  - ⚪ Pending: Awaiting first scan

### Working with Findings

Each vulnerability finding includes:
- **CVE ID**: Official vulnerability identifier
- **Severity Level**: CRITICAL, HIGH, MEDIUM, or LOW
- **Confidence Score**: AI-determined accuracy (60-100%)
- **File Location**: Exact file path and code chunk
- **Description**: Detailed explanation of the vulnerability
- **Validation Status**: Pending, Confirmed, False Positive, or Needs Review

### Using the AI Assistant

The AI assistant can help you:
- Understand specific vulnerabilities
- Get remediation advice
- Explain security concepts
- Prioritize fixes
- Generate custom reports

Example queries:
- "What are the critical vulnerabilities in this analysis?"
- "How do I fix CVE-2024-1234?"
- "Show me a summary of SQL injection findings"
- "What should I prioritize first?"

## Project Structure

```
agent-axios-frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── dashboard/    # Dashboard-specific components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   ├── services/         # API and data services
│   │   ├── api.ts        # API client
│   │   └── mockData.ts   # Data generation
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Application entry point
├── public/               # Static assets
└── index.html           # HTML template
```

## Key Features Explained

### Real-Time Analysis Updates

The platform simulates real-time analysis progress through multiple stages:
1. **Cloning**: Repository retrieval
2. **Chunking**: Code segmentation
3. **Indexing**: Semantic index building
4. **CVE Search**: Vulnerability database query
5. **Decomposition**: CVE description analysis
6. **Code Search**: Pattern matching
7. **Matching**: Similarity detection
8. **Validating**: AI-powered verification
9. **Finalizing**: Results compilation

### Security Metrics

Track critical security KPIs:
- Total repositories monitored
- Active scans in progress
- Total vulnerabilities detected
- Critical vulnerability count
- Vulnerability trends over time
- Scan completion rate

### Notification System

Stay informed with:
- Scan completion alerts
- Critical vulnerability notifications
- System updates
- Weekly security reports

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application settings
VITE_APP_TITLE=Agent Axios
VITE_APP_VERSION=1.0.0
```

### Customization

- **Theme**: Light/Dark mode available in user settings
- **Scan Frequency**: Configurable per repository
- **Notification Preferences**: Granular control over alerts
- **Report Format**: PDF, JSON, or CSV exports

## Performance

- **Optimized Bundle**: Code-splitting and tree-shaking enabled
- **Fast Refresh**: HMR for instant development feedback
- **Lazy Loading**: Components loaded on demand
- **Efficient Re-renders**: Optimized React rendering with proper memoization

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For questions, issues, or feature requests:
- 📧 Email: support@agentaxios.com
- 📝 Documentation: [docs.agentaxios.com](https://docs.agentaxios.com)
- 💬 Community: [community.agentaxios.com](https://community.agentaxios.com)

## Roadmap

### Coming Soon
- [ ] GitLab and Bitbucket integration
- [ ] Custom vulnerability rules
- [ ] Team collaboration features
- [ ] JIRA/GitHub Issues integration
- [ ] Compliance reporting (SOC 2, GDPR)
- [ ] API access for CI/CD pipelines
- [ ] Advanced filtering and search
- [ ] Vulnerability auto-remediation suggestions

---

**Built with ❤️ by the Agent Axios Team**

*Making security analysis intelligent, automated, and accessible.*
