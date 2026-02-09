#!/usr/bin/env python3
"""
Repository Analyzer - Main CLI Application
A comprehensive tool for analyzing repositories using LangChain and Azure OpenAI.
"""

import click
import os
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich import print as rprint

# Add src directory to path
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Import ReAct agent (autonomous implementation)
from src.react_agent import run_analysis
from src.config import get_config

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """
    Repository Analyzer - Comprehensive repository analysis using LangChain and Azure OpenAI.
    
    This tool analyzes repositories to detect project types, dependencies, frameworks,
    and generates detailed technical reports.
    """
    pass


@cli.command()
@click.argument('repo_input')
@click.option('--output', '-o', help='Output file path for the technical report')
@click.option('--format', '-f', type=click.Choice(['markdown', 'json']), default='markdown', help='Output format')
@click.option('--quick', is_flag=True, help='Perform quick analysis (may be less detailed)')
def analyze(repo_input, output, format, quick):
    """
    Analyze a repository and generate a comprehensive technical report.
    
    REPO_INPUT can be:
    - A Git URL (e.g., https://github.com/user/repo.git)
    - A GitHub shorthand (e.g., user/repo)
    - A local directory path
    
    Examples:
    \b
      repo-analyzer analyze https://github.com/microsoft/vscode
      repo-analyzer analyze microsoft/vscode --output report.md
      repo-analyzer analyze ./my-project --quick
    """
    try:
        console.print(Panel.fit(
            f"[bold blue]Repository Analyzer v3.0.0 (ReAct Agent)[/bold blue]\n"
            f"Analyzing: [cyan]{repo_input}[/cyan]",
            title="🔍 Autonomous Analysis Starting"
        ))
        
        # Get configuration
        config_dict = get_config()
        
        # Show LangSmith tracking status
        from src.config import config as app_config
        if app_config.langsmith_tracing and app_config.langsmith_api_key:
            console.print(f"[green]📊 LangSmith Tracking: Enabled[/green]")
            console.print(f"[dim]   Project: {app_config.langsmith_project}[/dim]")
            console.print(f"[dim]   View traces at: https://smith.langchain.com/[/dim]\n")
        
        console.print("[blue]🤖 Starting autonomous ReAct agent analysis...[/blue]")
        console.print("[dim]The agent will autonomously decide which tools to use and when to complete.[/dim]\n")
        
        # Run autonomous analysis
        report = run_analysis(
            repo_input=repo_input,
            llm=config_dict['llm'],
            tavily_api_key=config_dict.get('tavily_api_key', '')
        )
        
        # Save to file if requested
        if output:
            output_path = Path(output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(report)
            
            console.print(f"\n[green]✅ Report saved to: {output}[/green]")
        else:
            # Display report in terminal
            console.print("\n")
            console.print(Panel(
                report[:2000] + "\n\n... (truncated, use --output to save full report)" if len(report) > 2000 else report, 
                title="📊 Technical Report", 
                expand=False
            ))
        
        console.print("\n[green]✅ Autonomous analysis completed successfully![/green]")
    
    except KeyboardInterrupt:
        console.print("\n[yellow]Analysis interrupted by user[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]❌ Error: {str(e)}[/red]")
        import traceback
        traceback.print_exc()
        sys.exit(1)


@cli.command()
@click.argument('repo_input')
@click.option('--output', '-o', help='Output file path for the technical report')
def quick(repo_input, output):
    """
    Perform a quick analysis of a repository.
    
    This is equivalent to: analyze REPO_INPUT --quick
    (Note: In v3.0 with ReAct agent, the agent autonomously decides the depth)
    """
    # Just call analyze command with quick flag
    from click.testing import CliRunner
    runner = CliRunner()
    result = runner.invoke(analyze, [repo_input, '--output', output] if output else [repo_input])
    sys.exit(result.exit_code)


@cli.command()
def config():
    """
    Display current configuration and test Azure OpenAI connection.
    """
    try:
        from src.config import config
        
        console.print(Panel.fit("[bold blue]Configuration Status[/bold blue]", title="⚙️ Configuration"))
        
        # Display config
        config.display_config()
        
        # Test connection
        console.print("[blue]🔄 Testing Azure OpenAI connection...[/blue]")
        llm = config.get_azure_openai_client()
        
        # Test with a simple message
        from langchain_core.messages import HumanMessage
        test_response = llm.invoke([HumanMessage(content="Hello, please respond with 'Connection successful!'")])
        
        if "successful" in test_response.content.lower():
            console.print("[green]✅ Azure OpenAI connection test passed![/green]")
        else:
            console.print("[yellow]⚠️ Unexpected response from Azure OpenAI[/yellow]")
            console.print(f"Response: {test_response.content}")
    
    except Exception as e:
        console.print(f"[red]❌ Configuration test failed: {str(e)}[/red]")
        sys.exit(1)


@cli.command()
@click.argument('repo_path')
@click.option('--tool', '-t', type=click.Choice([
    'load', 'detect-type', 'dependencies', 'structure', 'frameworks', 'summary'
]), help='Run a specific analysis tool')
def test(repo_path, tool):
    """
    Test individual analysis tools on a repository.
    
    Useful for debugging and development purposes.
    """
    try:
        console.print(Panel.fit(
            f"[bold blue]Tool Testing[/bold blue]\n"
            f"Repository: [cyan]{repo_path}[/cyan]\n"
            f"Tool: [cyan]{tool or 'all'}[/cyan]",
            title="🧪 Testing Tools"
        ))
        
        if tool == 'load' or tool is None:
            from src.tools.repo_loader import load_repository_tool
            console.print("[blue]Testing Repository Loader...[/blue]")
            result = load_repository_tool.invoke({'input': repo_path})
            console.print(result)
        
        if tool == 'detect-type' or tool is None:
            from src.tools.project_detector import detect_project_type_tool
            console.print("[blue]Testing Project Type Detector...[/blue]")
            result = detect_project_type_tool.invoke({'input': repo_path})
            console.print(result)
        
        if tool == 'dependencies' or tool is None:
            from src.tools.dependency_extractor import extract_dependencies_tool
            console.print("[blue]Testing Dependency Extractor...[/blue]")
            result = extract_dependencies_tool.invoke({'input': repo_path})
            console.print(result)
        
        if tool == 'structure' or tool is None:
            from src.tools.structure_mapper import analyze_repository_structure_tool
            console.print("[blue]Testing Structure Mapper...[/blue]")
            result = analyze_repository_structure_tool.invoke({'input': repo_path})
            console.print(result)
        
        if tool == 'frameworks' or tool is None:
            from src.tools.framework_detector import detect_frameworks_tool
            console.print("[blue]Testing Framework Detector...[/blue]")
            result = detect_frameworks_tool.invoke({'input': repo_path})
            console.print(result)
        
        if tool == 'summary' or tool is None:
            from src.tools.summary_context import generate_summary_context_tool
            console.print("[blue]Testing Summary Generator...[/blue]")
            result = generate_summary_context_tool.invoke({'input': repo_path})
            console.print(result)
    
    except Exception as e:
        console.print(f"[red]❌ Tool test failed: {str(e)}[/red]")
        sys.exit(1)


@cli.command()
def examples():
    """
    Show usage examples and sample commands.
    """
    examples_text = """
[bold blue]Repository Analyzer Usage Examples[/bold blue]

[bold cyan]1. Analyze a GitHub repository:[/bold cyan]
   repo-analyzer analyze https://github.com/microsoft/vscode
   repo-analyzer analyze microsoft/vscode

[bold cyan]2. Analyze a local directory:[/bold cyan]
   repo-analyzer analyze ./my-project
   repo-analyzer analyze /path/to/project

[bold cyan]3. Save report to file:[/bold cyan]
   repo-analyzer analyze user/repo --output technical_report.md
   repo-analyzer analyze ./project -o report.md

[bold cyan]4. Quick analysis:[/bold cyan]
   repo-analyzer quick microsoft/typescript
   repo-analyzer analyze ./project --quick

[bold cyan]5. Test configuration:[/bold cyan]
   repo-analyzer config

[bold cyan]6. Test individual tools:[/bold cyan]
   repo-analyzer test ./project --tool dependencies
   repo-analyzer test user/repo --tool frameworks

[bold yellow]Supported Repository Formats:[/bold yellow]
• Git URLs: https://github.com/user/repo.git
• GitHub shorthand: user/repo
• Local paths: ./project, /absolute/path

[bold yellow]Supported Project Types:[/bold yellow]
• Python (Django, Flask, FastAPI, etc.)
• Node.js (React, Vue, Angular, Express, etc.)
• Java (Spring, Spring Boot)
• Go (Gin, Echo)
• Rust (Actix, Rocket)
• PHP (Laravel, Symfony)
• Ruby (Rails)
• And more...
    """
    
    console.print(Panel(examples_text, title="📚 Examples", expand=False))


def main():
    """Main entry point."""
    try:
        # Check if .env file exists
        env_path = Path('.env')
        if not env_path.exists():
            console.print(Panel(
                "[red]❌ .env file not found![/red]\n\n"
                "Please create a .env file with your Azure OpenAI credentials:\n\n"
                "[cyan]AZURE_OPENAI_API_KEY=your_api_key\n"
                "AZURE_OPENAI_ENDPOINT=your_endpoint\n"
                "AZURE_OPENAI_API_VERSION=2024-12-01-preview\n"
                "AZURE_OPENAI_MODEL=gpt-4.1[/cyan]",
                title="⚠️ Configuration Required"
            ))
            sys.exit(1)
        
        cli()
    
    except KeyboardInterrupt:
        console.print("\n[yellow]Operation cancelled by user[/yellow]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]❌ Fatal error: {str(e)}[/red]")
        sys.exit(1)


if __name__ == '__main__':
    main()
