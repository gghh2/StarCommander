---
applyTo: "**/*.py"
---

# Project coding standards for Python

Apply the [general coding guidelines](./general-coding.instructions.md) to all code.

## Python-Specific Guidelines

- Follow the PEP 8 style guide for Python.
- Maintain proper indentation (use 4 spaces for each level of indentation).
- Use Black for code formatting.
- Always prioritize readability and clarity.
- Write clear and concise comments for each function.
- Use Google-style docstrings for documenting modules, classes, and methods.
- Use meaningful variable names that convey purpose.
- Ensure functions have descriptive names and include type hints.
- Avoid using magic numbers; use named constants instead.

## Dependencies Management

- Use `uv` for managing dependencies and virtual environments.
- Use `uv add <package>` to add new dependencies from the `resources` folder.
