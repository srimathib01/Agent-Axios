"""Services package initialization."""
from .context_extraction_service import ContextExtractionService, CodeContext, context_extractor
from .fix_generator_service import FixGeneratorService, fix_generator
from .prompt_templates import (
    SYSTEM_PROMPT_FIX_GENERATION,
    SYSTEM_PROMPT_CHAT,
    CWE_GUIDANCE,
    FRAMEWORK_PATTERNS,
    build_fix_prompt,
    build_chat_context_prompt,
    get_quick_action_prompt,
    QUICK_ACTION_PROMPTS
)

__all__ = [
    # Context Extraction
    "ContextExtractionService",
    "CodeContext",
    "context_extractor",
    # Fix Generation
    "FixGeneratorService",
    "fix_generator",
    # Prompt Templates
    "SYSTEM_PROMPT_FIX_GENERATION",
    "SYSTEM_PROMPT_CHAT",
    "CWE_GUIDANCE",
    "FRAMEWORK_PATTERNS",
    "build_fix_prompt",
    "build_chat_context_prompt",
    "get_quick_action_prompt",
    "QUICK_ACTION_PROMPTS",
]
