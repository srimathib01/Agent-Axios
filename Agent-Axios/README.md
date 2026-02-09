# Repository Analyzer - ReAct Agent# Repository Analyzer



> **Autonomous AI-powered repository analysis using Azure OpenAI GPT-4.1 and LangGraph**A comprehensive tool for analyzing repositories using LangChain and Azure OpenAI GPT-4.1. This tool provides deep insights into project structure, dependencies, frameworks, and generates detailed technical reports.



A comprehensive tool that autonomously analyzes code repositories and generates detailed technical reports optimized for CVE (Common Vulnerabilities and Exposures) matching and security assessment.## 🌟 Features



## 🌟 Overview- **Multi-Language Support**: Python, Node.js, Java, Go, Rust, PHP, Ruby, C++, Swift, Kotlin

- **Comprehensive Analysis**: Project type detection, dependency analysis, framework identification

The Repository Analyzer is an intelligent agent that:- **AI-Powered Reports**: Professional technical reports generated using Azure OpenAI GPT-4.1

- **Autonomously explores** repositories using ReAct (Reasoning + Acting) methodology- **Flexible Input**: Git URLs, GitHub shorthand, or local directories

- **Analyzes** project structure, dependencies, frameworks, and technologies- **Rich CLI Interface**: Beautiful terminal output with progress tracking

- **Generates** comprehensive technical reports for security vulnerability assessment- **Modular Architecture**: 8 specialized analysis tools working together

- **Learns and adapts** its exploration strategy based on findings

## 🚀 Quick Start

### Key Features

### Prerequisites

✅ **Autonomous Decision-Making** - Agent decides which tools to use and when  

✅ **Multi-Language Support** - Python, Node.js, Java, Go, Rust, PHP, Ruby, C++, Swift, Kotlin  - Python 3.8+

✅ **Iterative Exploration** - Intelligently navigates repository structure  - Azure OpenAI account with GPT-4.1 deployment

✅ **Web Search Integration** - Researches unfamiliar technologies via Tavily  - Git (for analyzing remote repositories)

✅ **Security-Focused** - Reports optimized for CVE matching and vulnerability assessment  

✅ **LangSmith Tracking** - Complete observability of agent decisions and tool usage  ### Installation



---1. **Clone the repository:**

   ```bash

## 🚀 Quick Start   git clone <your-repo-url>

   cd repository-analyzer

### Prerequisites   ```



- **Python 3.8+**2. **Create virtual environment:**

- **Azure OpenAI account** with GPT-4.1 deployment   ```bash

- **Tavily API key** (optional, for web search)   python -m venv venv

- **Git** (for analyzing remote repositories)   source venv/bin/activate  # On Windows: venv\Scripts\activate

   ```

### Installation

3. **Install dependencies:**

1. **Clone the repository:**   ```bash

   ```bash   pip install -r requirements.txt

   git clone <your-repo-url>   ```

   cd repository-analyzer

   ```4. **Configure Azure OpenAI:**

   Create a `.env` file in the project root:

2. **Run setup script:**   ```env

   ```bash   AZURE_OPENAI_API_KEY=your_api_key_here

   chmod +x setup_react_agent.sh   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

   ./setup_react_agent.sh   AZURE_OPENAI_API_VERSION=2024-12-01-preview

   ```   AZURE_OPENAI_MODEL=gpt-4.1

   ```

   Or manually:

   ```bash### Basic Usage

   python3 -m venv venv

   source venv/bin/activate1. **Analyze a GitHub repository:**

   pip install -r requirements.txt   ```bash

   ```   python main.py analyze microsoft/vscode

   ```

3. **Configure environment variables:**

2. **Analyze a local project:**

   Create a `.env` file in the project root:   ```bash

   ```env   python main.py analyze ./my-project

   # Required: Azure OpenAI Configuration   ```

   AZURE_OPENAI_API_KEY=your_api_key_here

   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/3. **Generate and save report:**

   AZURE_OPENAI_API_VERSION=2024-12-01-preview   ```bash

   AZURE_OPENAI_MODEL=gpt-4.1   python main.py analyze user/repo --output technical_report.md

      ```

   # Optional: Web Search (Tavily)

   TAVILY_API_KEY=your_tavily_key_here## 📋 Commands

   

   # Optional: LangSmith Tracking### `analyze`

   LANGSMITH_TRACING=trueComprehensive repository analysis with detailed report generation.

   LANGSMITH_API_KEY=your_langsmith_key

   LANGSMITH_PROJECT=Repository-Analyzer-ReAct```bash

   LANGSMITH_ENDPOINT=https://api.smith.langchain.compython main.py analyze REPO_INPUT [OPTIONS]

   ``````



### Basic Usage**Arguments:**

- `REPO_INPUT`: Git URL, GitHub shorthand (user/repo), or local directory path

Activate the virtual environment:

```bash**Options:**

source venv/bin/activate- `--output, -o`: Output file path for the technical report

```- `--format, -f`: Output format (markdown, json) [default: markdown]

- `--quick`: Perform quick analysis (faster but less detailed)

**Analyze a GitHub repository:**

```bash**Examples:**

python main.py analyze microsoft/vscode```bash

python main.py analyze pallets/flask# Analyze GitHub repository

python main.py analyze django/djangopython main.py analyze https://github.com/microsoft/vscode

```

# Analyze with GitHub shorthand

**Analyze a local project:**python main.py analyze microsoft/typescript

```bash

python main.py analyze ./my-project# Save report to file

python main.py analyze /path/to/local/repopython main.py analyze user/repo --output report.md

```

# Quick analysis

**Save report to file:**python main.py analyze ./project --quick

```bash```

python main.py analyze user/repo --output technical_report.md

```### `quick`

Perform rapid analysis with essential information only.

---

```bash

## 📋 How It Workspython main.py quick REPO_INPUT

```

### The ReAct Agent Workflow

### `config`

The agent uses the **ReAct (Reasoning + Acting)** pattern to autonomously explore repositories:Display configuration status and test Azure OpenAI connection.



``````bash

1. CLONE → Agent clones/loads the repositorypython main.py config

2. EXPLORE → Iteratively explores directory structure```

3. READ → Reads key files (README, configs, source code)

4. ANALYZE → Uses specialized tools to analyze:### `test`

   - Dependencies (all package managers)Test individual analysis tools (useful for debugging).

   - Frameworks and libraries

   - Project type and language```bash

   - Repository structurepython main.py test REPO_PATH [--tool TOOL_NAME]

5. RESEARCH → Web search for unfamiliar technologies (if needed)```

6. REPORT → Generates comprehensive technical report

```**Available tools:**

- `load`: Repository loader

**The agent is fully autonomous** - it decides:- `detect-type`: Project type detector

- Which files to read- `dependencies`: Dependency extractor

- Which directories to explore- `structure`: Structure mapper

- When to analyze dependencies- `frameworks`: Framework detector

- When it has enough information- `summary`: Summary generator

- When to generate the final report

### `examples`

### Available Tools (11 Autonomous Tools)Show usage examples and sample commands.



#### File Operations```bash

- `list_directory` - Explore directory contentspython main.py examples

- `read_file` - Read specific files```

- `search_files` - Find files by pattern (*.py, package.json, etc.)

- `get_file_info` - Get file metadata without reading contents## 🛠️ Architecture



#### Repository OperationsThe tool consists of 8 specialized analysis modules:

- `clone_repository` - Load repository from Git URL or local path

### Core Tools

#### Analysis Tools

- `analyze_dependencies` - Extract ALL dependencies (Python, Node.js, Java, Go, etc.)1. **Repository Loader** (`src/tools/repo_loader.py`)

- `detect_project_type` - Identify programming language and project type   - Clones Git repositories or loads local directories

- `analyze_structure` - Get comprehensive structure analysis   - Provides file statistics and basic repository information

- `detect_frameworks` - Identify frameworks and libraries used

2. **Project Type Detector** (`src/tools/project_detector.py`)

#### Web Search   - Identifies programming languages and project types

- `tavily_search_results_json` - Search web for technology information   - Confidence scoring based on file patterns



#### Completion3. **Dependency Extractor** (`src/tools/dependency_extractor.py`)

- `generate_final_report` - Generate the final technical report   - Parses dependency files (requirements.txt, package.json, etc.)

   - Supports multiple package manager formats

---

4. **Structure Mapper** (`src/tools/structure_mapper.py`)

## 🏗️ Architecture   - Analyzes repository structure and organization

   - Identifies important directories and entry points

### Project Structure

5. **Framework Detector** (`src/tools/framework_detector.py`)

```   - Detects frameworks through import analysis

repository-analyzer/   - Pattern-based recognition with confidence scoring

├── main.py                      # CLI entry point

├── requirements.txt             # Python dependencies6. **Summary Context Generator** (`src/tools/summary_context.py`)

├── setup_react_agent.sh         # Setup script   - Aggregates all analysis results

├── .env                         # Environment configuration (create this)   - Formats data for LLM consumption

│

├── src/7. **Report Generator** (`src/tools/create_report.py`)

│   ├── config.py                # Configuration management   - Generates comprehensive technical reports

│   ├── react_agent.py           # ReAct agent implementation   - Uses Azure OpenAI GPT-4.1 for professional documentation

│   ├── react_agent_tools.py     # Autonomous tool definitions

│   │8. **LangChain Agent** (`src/agent.py`)

│   └── tools/                   # Analysis tool implementations   - Orchestrates all tools in sequence

│       ├── repo_loader.py       # Repository cloning/loading   - Provides workflow management and error handling

│       ├── project_detector.py  # Project type detection

│       ├── dependency_extractor.py  # Dependency extraction## 📊 Sample Output

│       ├── structure_mapper.py  # Structure analysis

│       ├── framework_detector.py    # Framework detection### Quick Analysis

│       ├── summary_context.py   # Context aggregation```

│       └── create_report.py     # Report generationProject Type: Python Web Application

│Main Language: Python (87.3%)

├── repo_analyzer/               # Package moduleFramework: Django 4.x

│   ├── __init__.pyDependencies: 45 packages

│   ├── tools/Key Files: manage.py, requirements.txt, settings.py

│   └── utils/Entry Point: manage.py

│```

└── tests/                       # Test files

```### Full Technical Report

```markdown

### Core Components# Technical Analysis Report



#### 1. **ReAct Agent** (`src/react_agent.py`)## Executive Summary

- Uses LangGraph's `create_react_agent` for autonomous operationThis repository contains a Django-based web application with modern Python development practices...

- Manages agent state and tool execution

- Streams progress in real-time## Project Overview

- Handles memory and checkpointing- **Primary Language**: Python (87.3%)

- **Project Type**: Web Application

#### 2. **Agent Tools** (`src/react_agent_tools.py`)- **Framework**: Django 4.2.x

- 10 specialized tools wrapped with `@tool` decorator- **Architecture**: MVC Pattern

- JSON-based responses for structured output

- Error handling and progress tracking## Dependencies Analysis

- Integration with existing analysis modules- **Total Dependencies**: 45

- **Production**: 32

#### 3. **Analysis Tools** (`src/tools/`)- **Development**: 13

- Modular, reusable analysis components- **Security Issues**: 0 critical, 2 moderate

- Support for 10+ programming languages

- Framework and library detection[... detailed analysis continues ...]

- Dependency extraction from various package managers```



#### 4. **Configuration** (`src/config.py`)## 🔧 Configuration

- Azure OpenAI client management

- Environment variable validation### Environment Variables

- LangSmith integration

- Configuration display utilities| Variable | Description | Example |

|----------|-------------|---------|

---| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI API key | `abc123...` |

| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | `https://your-resource.openai.azure.com/` |

## 🎯 Generated Report Format| `AZURE_OPENAI_API_VERSION` | API version | `2024-12-01-preview` |

| `AZURE_OPENAI_MODEL` | Model deployment name | `gpt-4.1` |

The agent generates comprehensive technical reports with:

### Azure OpenAI Setup

### 1. **Executive Summary**

- Project purpose and overview1. Create an Azure OpenAI resource in Azure Portal

- Primary language and type2. Deploy a GPT-4.1 model

- Key technologies used3. Get your API key and endpoint from the Azure Portal

4. Configure the `.env` file with your credentials

### 2. **Technology Stack**

- Programming languages## 🧪 Testing

- Frameworks and libraries

- Development toolsTest individual components:

- Build systems

```bash

### 3. **Dependencies Analysis**# Test configuration

- Complete dependency list with versionspython main.py config

- Dependency tree analysis

- Outdated package identification# Test repository loader

- Security considerationspython main.py test ./sample-project --tool load



### 4. **Architecture Overview**# Test dependency extraction

- Project structurepython main.py test user/repo --tool dependencies

- Key directories and their purposes

- Entry points and main modules# Test all tools

- Design patterns observedpython main.py test ./project

```

### 5. **Security Considerations**

- Potential vulnerability areas## 📈 Supported Project Types

- Security-relevant dependencies

- Configuration security- **Python**: Django, Flask, FastAPI, Streamlit, Poetry projects

- Best practices compliance- **Node.js**: React, Vue, Angular, Express, Next.js, Nest.js

- **Java**: Spring Boot, Maven, Gradle projects

### 6. **CVE Matching Readiness**- **Go**: Gin, Echo, standard Go modules

- Component inventory for CVE matching- **Rust**: Cargo projects, Actix, Rocket

- Version tracking for vulnerability assessment- **PHP**: Laravel, Symfony, Composer projects

- Security-sensitive code patterns- **Ruby**: Rails, Bundler projects

- Attack surface analysis- **C++**: CMake, Make projects

- **Swift**: Xcode projects, Swift Package Manager

---- **Kotlin**: Gradle projects



## 🔧 Advanced Configuration## 📝 Output Formats



### LangSmith Tracking### Markdown (Default)

Professional technical reports with sections for overview, dependencies, architecture, and recommendations.

Enable comprehensive observability of agent decisions:

### JSON

```envStructured data format for programmatic consumption:

LANGSMITH_TRACING=true```json

LANGSMITH_API_KEY=your_langsmith_key{

LANGSMITH_PROJECT=Repository-Analyzer-ReAct  "repository": "user/repo",

```  "analysis_date": "2024-01-15T10:30:00Z",

  "project_type": "Python Web Application",

View traces at: https://smith.langchain.com/  "languages": {"Python": 87.3, "JavaScript": 8.1},

  "frameworks": ["Django", "Bootstrap"],

### Web Search (Tavily)  "dependencies": {...},

  "structure": {...}

Enable web search for researching unfamiliar technologies:}

```

```env

TAVILY_API_KEY=your_tavily_key## 🔍 Error Handling

```

The tool provides comprehensive error handling:

Get a free API key at: https://tavily.com/

- **Network Issues**: Graceful handling of Git clone failures

### Model Configuration- **Permission Errors**: Clear messages for access issues

- **API Errors**: Azure OpenAI connection problems

Adjust model parameters in `src/config.py`:- **File Format Errors**: Unsupported or corrupted dependency files

- `temperature`: 0.1 (consistent analysis)

- `max_tokens`: 4000 (comprehensive reports)## 🤝 Contributing



---1. Fork the repository

2. Create a feature branch

## 📚 CLI Commands3. Add tests for new functionality

4. Submit a pull request

### `analyze` Command

## 📄 License

Perform comprehensive repository analysis.

MIT License - see LICENSE file for details.

```bash

python main.py analyze REPO_INPUT [OPTIONS]## 🆘 Support

```

For issues and questions:

**Arguments:**

- `REPO_INPUT`: Git URL, GitHub shorthand (user/repo), or local directory path1. Check the examples: `python main.py examples`

2. Test configuration: `python main.py config`

**Options:**3. Enable debug logging in the code

- `--output, -o FILE`: Save report to file4. Create an issue with detailed error information

- `--format, -f [markdown|json]`: Output format (default: markdown)

- `--quick`: Quick analysis (faster, less detailed)## 🔮 Roadmap



**Examples:**- [ ] Support for more programming languages

```bash- [ ] Integration with other LLM providers

# Analyze GitHub repository- [ ] Web interface

python main.py analyze https://github.com/microsoft/vscode- [ ] CI/CD pipeline analysis

- [ ] Security vulnerability detection

# Analyze with GitHub shorthand- [ ] Performance metrics analysis

python main.py analyze microsoft/typescript

# Save report to file
python main.py analyze pallets/flask --output flask_report.md

# Analyze local project
python main.py analyze ./my-project
```

---

## 🛠️ Development

### System Prompt

The agent follows these guidelines (configured in `react_agent.py`):

**Efficiency Target:** 10-15 tool calls maximum
1. **Clone** repository (1 step)
2. **Explore** structure (3-5 steps: list dirs, search files, read README)
3. **Analyze** (4 steps: dependencies, type, frameworks, structure)
4. **Complete** (1 step: generate report)

**The agent should NOT:**
- Read every source file manually
- Explore endlessly without purpose
- Skip dependency/framework analysis
- Wait unnecessarily before generating report

### Adding New Tools

Create tools using the `@tool` decorator:

```python
from langchain_core.tools import tool
import json

@tool
def my_custom_tool(param: str) -> str:
    """
    Description of what the tool does.
    
    Args:
        param: Description of parameter
    
    Returns:
        JSON string with results
    """
    try:
        # Tool implementation
        result = {"success": True, "data": "..."}
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})
```

Add to `ALL_TOOLS` in `react_agent_tools.py`.

### Customizing Analysis

Modify analysis tools in `src/tools/`:
- Add new language support in `project_detector.py`
- Add framework patterns in `framework_detector.py`
- Extend dependency parsers in `dependency_extractor.py`

---

## 🧪 Testing

### Quick Test
```bash
# Activate environment
source venv/bin/activate

# Test configuration
python -c "from src.config import config; config.display_config()"

# Analyze a small repository
python main.py analyze pallets/click --output test_report.md
```

### Verify Installation
```bash
./setup_react_agent.sh
```

This will:
- Check Python version
- Verify virtual environment
- Install dependencies
- Check environment variables
- Test configuration loading

---

## 📊 Performance & Best Practices

### Efficiency Guidelines

- **Target:** 10-15 tool calls per analysis
- **Typical breakdown:**
  - 1 clone operation
  - 3-5 exploration steps (list, search, read)
  - 4 analysis tool calls
  - 1 report generation

### Best Practices

1. **Environment Variables:** Use `.env` file, never commit secrets
2. **LangSmith Tracking:** Enable for debugging and optimization
3. **Web Search:** Use sparingly, only for unfamiliar tech
4. **Report Storage:** Organize reports by date/project
5. **Local Analysis:** Use local paths for faster analysis of local repos

---

## 🐛 Troubleshooting

### Common Issues

**"Missing required environment variables"**
- Create `.env` file with all required variables
- Check for typos in variable names
- Ensure no extra spaces around `=`

**"Failed to initialize LLM"**
- Verify Azure OpenAI credentials
- Check endpoint URL format
- Confirm deployment name matches model

**"No module named 'langchain'"**
- Activate virtual environment: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

**"Tavily API error" (optional)**
- Web search will be disabled if Tavily key is missing
- Agent will still work, just without web search capability

**Agent takes too many steps**
- Review system prompt in `react_agent.py`
- Check if agent is reading too many files
- Verify analysis tools are working correctly

---

## 📈 Version History

### v3.0.0 (Current) - ReAct Agent
- ✅ Fully autonomous ReAct agent implementation
- ✅ 11 specialized tools for exploration and analysis
- ✅ Web search integration (Tavily)
- ✅ LangSmith tracking and observability
- ✅ Streaming execution with real-time progress
- ✅ Memory persistence and checkpointing

### v2.0.0 - LangGraph (Superseded)
- Fixed sequential workflow with LangGraph
- State management with TypedDict
- 8 predefined nodes

### v1.0.0 - LangChain (Superseded)
- Basic sequential agent
- Fixed tool execution order

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional language support
- More framework detection patterns
- Enhanced security analysis
- Custom report templates
- Performance optimizations

---

## 📄 License

[Your License Here]

---

## 🆘 Support

For issues, questions, or feature requests:
1. Check troubleshooting section above
2. Review LangSmith traces (if enabled)
3. Check environment configuration
4. Review agent logs in console output

---

## 🎓 Technical Details

### Technologies Used

- **LangChain**: Agent framework and tool orchestration
- **LangGraph**: ReAct agent implementation with state management
- **Azure OpenAI**: GPT-4.1 for intelligent analysis and report generation
- **Tavily**: Web search API for technology research
- **LangSmith**: Observability and tracing
- **GitPython**: Repository cloning and Git operations
- **Rich**: Beautiful terminal output and progress tracking
- **Click**: CLI framework
- **Python-dotenv**: Environment variable management

### Why ReAct?

The ReAct (Reasoning + Acting) pattern enables:
- **Autonomous exploration** without predefined workflows
- **Adaptive strategies** based on repository characteristics
- **Efficient analysis** by deciding which tools are necessary
- **Transparent reasoning** visible in LangSmith traces

---

**Built with ❤️ using Azure OpenAI GPT-4.1 and LangGraph**
