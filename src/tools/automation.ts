import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const automationTools = [
  {
    name: "validate_project",
    description: "Run complete project validation (lint, type-check, test, build)",
    inputSchema: {
      type: "object",
      properties: {
        skipTests: {
          type: "boolean",
          description: "Skip running tests",
          default: false,
        },
        skipBuild: {
          type: "boolean",
          description: "Skip build step",
          default: false,
        },
        fix: {
          type: "boolean",
          description: "Auto-fix linting issues",
          default: true,
        },
      },
    },
    handler: async (args: any) => {
      const results = {
        success: true,
        steps: [] as any[],
        errors: [] as string[],
      };

      // Detect project type
      const hasPackageJson = await fs
        .access(path.join(workspacePath, "package.json"))
        .then(() => true)
        .catch(() => false);
      const hasCargoToml = await fs
        .access(path.join(workspacePath, "Cargo.toml"))
        .then(() => true)
        .catch(() => false);
      const hasSetupPy = await fs
        .access(path.join(workspacePath, "setup.py"))
        .then(() => true)
        .catch(() => false);

      try {
        if (hasPackageJson) {
          // Node.js/TypeScript project
          const packageJson = JSON.parse(
            await fs.readFile(
              path.join(workspacePath, "package.json"),
              "utf8"
            )
          );

          // Lint
          if (packageJson.scripts?.lint || packageJson.scripts?.["lint:check"]) {
            try {
              const lintCmd = args.fix ? "lint" : "lint:check";
              const cmd = packageJson.scripts[lintCmd]
                ? `npm run ${lintCmd}`
                : packageJson.scripts.lint
                ? "npm run lint"
                : "eslint .";
              const { stdout, stderr } = await execAsync(cmd, {
                cwd: workspacePath,
              });
              results.steps.push({
                step: "lint",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Linting failed: ${error.message}`);
              results.steps.push({
                step: "lint",
                success: false,
                error: error.message,
              });
            }
          }

          // Type check
          if (
            packageJson.scripts?.["type-check"] ||
            packageJson.devDependencies?.typescript
          ) {
            try {
              const cmd = packageJson.scripts?.["type-check"]
                ? "npm run type-check"
                : "tsc --noEmit";
              const { stdout, stderr } = await execAsync(cmd, {
                cwd: workspacePath,
              });
              results.steps.push({
                step: "type-check",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Type checking failed: ${error.message}`);
              results.steps.push({
                step: "type-check",
                success: false,
                error: error.message,
              });
            }
          }

          // Test
          if (!args.skipTests && packageJson.scripts?.test) {
            try {
              const { stdout, stderr } = await execAsync("npm test", {
                cwd: workspacePath,
                env: { ...process.env, CI: "true" },
              });
              results.steps.push({
                step: "test",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Tests failed: ${error.message}`);
              results.steps.push({
                step: "test",
                success: false,
                error: error.message,
              });
            }
          }

          // Build
          if (!args.skipBuild && packageJson.scripts?.build) {
            try {
              const { stdout, stderr } = await execAsync("npm run build", {
                cwd: workspacePath,
              });
              results.steps.push({
                step: "build",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Build failed: ${error.message}`);
              results.steps.push({
                step: "build",
                success: false,
                error: error.message,
              });
            }
          }
        } else if (hasCargoToml) {
          // Rust project
          // Format check
          try {
            await execAsync("cargo fmt -- --check", { cwd: workspacePath });
            results.steps.push({ step: "format", success: true });
          } catch (error: any) {
            if (args.fix) {
              await execAsync("cargo fmt", { cwd: workspacePath });
              results.steps.push({ step: "format", success: true, fixed: true });
            } else {
              results.errors.push("Format check failed");
              results.success = false;
            }
          }

          // Clippy
          try {
            const { stdout } = await execAsync("cargo clippy -- -D warnings", {
              cwd: workspacePath,
            });
            results.steps.push({
              step: "clippy",
              success: true,
              output: stdout.trim(),
            });
          } catch (error: any) {
            results.success = false;
            results.errors.push(`Clippy failed: ${error.message}`);
          }

          // Test
          if (!args.skipTests) {
            try {
              const { stdout } = await execAsync("cargo test", {
                cwd: workspacePath,
              });
              results.steps.push({
                step: "test",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Tests failed: ${error.message}`);
            }
          }

          // Build
          if (!args.skipBuild) {
            try {
              const { stdout } = await execAsync("cargo build", {
                cwd: workspacePath,
              });
              results.steps.push({
                step: "build",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Build failed: ${error.message}`);
            }
          }
        } else if (hasSetupPy) {
          // Python project
          // Lint with pylint or flake8
          try {
            const { stdout } = await execAsync(
              "python -m pylint **/*.py || python -m flake8",
              { cwd: workspacePath }
            );
            results.steps.push({
              step: "lint",
              success: true,
              output: stdout.trim(),
            });
          } catch (error: any) {
            results.errors.push(`Linting failed: ${error.message}`);
          }

          // Type check with mypy
          try {
            const { stdout } = await execAsync("python -m mypy .", {
              cwd: workspacePath,
            });
            results.steps.push({
              step: "type-check",
              success: true,
              output: stdout.trim(),
            });
          } catch (error: any) {
            results.errors.push(`Type checking failed: ${error.message}`);
          }

          // Test with pytest
          if (!args.skipTests) {
            try {
              const { stdout } = await execAsync("python -m pytest", {
                cwd: workspacePath,
              });
              results.steps.push({
                step: "test",
                success: true,
                output: stdout.trim(),
              });
            } catch (error: any) {
              results.success = false;
              results.errors.push(`Tests failed: ${error.message}`);
            }
          }
        }
      } catch (error: any) {
        results.success = false;
        results.errors.push(`Validation error: ${error.message}`);
      }

      return formatToolResponse(results);
    },
  },
  {
    name: "create_validation_script",
    description:
      "Create or update validation scripts in package.json for automated checks",
    inputSchema: {
      type: "object",
      properties: {
        includeCoverage: {
          type: "boolean",
          description: "Include coverage threshold checks",
          default: true,
        },
        includePrecommit: {
          type: "boolean",
          description: "Add pre-commit hooks",
          default: true,
        },
      },
    },
    handler: async (args: any) => {
      try {
        const packageJsonPath = path.join(workspacePath, "package.json");
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf8")
        );

        // Add validation scripts
        packageJson.scripts = packageJson.scripts || {};
        
        Object.assign(packageJson.scripts, {
          validate:
            "npm run lint:check && npm run type-check && npm test && npm run build",
          "lint": "eslint . --fix",
          "lint:check": "eslint .",
          "type-check": "tsc --noEmit",
          test: packageJson.scripts.test || "jest",
          "test:watch": "jest --watch",
          "test:coverage": args.includeCoverage
            ? "jest --coverage --coverageThreshold='{\"global\":{\"branches\":80,\"functions\":80,\"lines\":80,\"statements\":80}}'"
            : "jest --coverage",
          build: packageJson.scripts.build || "tsc",
          "prebuild": "npm run validate",
        });

        if (args.includePrecommit) {
          packageJson.scripts["precommit"] = "npm run validate";
          packageJson.scripts["prepush"] = "npm run validate";
        }

        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2)
        );

        return formatToolResponse({
          success: true,
          scriptsAdded: Object.keys(packageJson.scripts),
          message:
            "Validation scripts added to package.json. Run 'npm run validate' to check everything.",
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "setup_project_automation",
    description:
      "Set up complete project automation including CI/CD, pre-commit hooks, and validation",
    inputSchema: {
      type: "object",
      properties: {
        ci: {
          type: "string",
          enum: ["github-actions", "gitlab-ci", "none"],
          description: "CI/CD platform to set up",
          default: "github-actions",
        },
        includePreCommit: {
          type: "boolean",
          description: "Set up pre-commit hooks",
          default: true,
        },
        includeDependabot: {
          type: "boolean",
          description: "Set up Dependabot for dependency updates",
          default: true,
        },
      },
    },
    handler: async (args: any) => {
      const created = [];

      try {
        // Create GitHub Actions workflow
        if (args.ci === "github-actions") {
          const workflowDir = path.join(workspacePath, ".github/workflows");
          await fs.mkdir(workflowDir, { recursive: true });

          const ciWorkflow = `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint:check
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm test -- --coverage
    
    - name: Build
      run: npm run build
    
    - name: Upload coverage
      uses: codecov/codecov-action@v4
      if: matrix.node-version == '20.x'
      with:
        file: ./coverage/coverage-final.json
`;

          await fs.writeFile(path.join(workflowDir, "ci.yml"), ciWorkflow);
          created.push(".github/workflows/ci.yml");
        }

        // Create Dependabot config
        if (args.includeDependabot) {
          const dependabotConfig = `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "team-reviewers"
    labels:
      - "dependencies"
`;

          await fs.mkdir(path.join(workspacePath, ".github"), {
            recursive: true,
          });
          await fs.writeFile(
            path.join(workspacePath, ".github/dependabot.yml"),
            dependabotConfig
          );
          created.push(".github/dependabot.yml");
        }

        // Create pre-commit hook script
        if (args.includePreCommit) {
          const hookScript = `#!/bin/sh
# Pre-commit validation

echo "Running pre-commit validation..."

npm run validate

if [ $? -ne 0 ]; then
  echo "❌ Pre-commit validation failed. Fix issues before committing."
  exit 1
fi

echo "✅ Pre-commit validation passed!"
exit 0
`;

          const hooksDir = path.join(workspacePath, ".git/hooks");
          const hookPath = path.join(hooksDir, "pre-commit");

          try {
            await fs.writeFile(hookPath, hookScript, { mode: 0o755 });
            created.push(".git/hooks/pre-commit");
          } catch (error) {
            // Git hooks might not exist in non-git repos
          }
        }

        // Create Makefile for language-agnostic commands
        const makefile = `
.PHONY: help install validate test build clean

help: ## Show this help
\t@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\\033[36m%-20s\\033[0m %s\\n", $$1, $$2}'

install: ## Install dependencies
\tnpm install

validate: ## Run all validation checks
\tnpm run validate

test: ## Run tests
\tnpm test

build: ## Build the project
\tnpm run build

clean: ## Clean build artifacts
\trm -rf dist node_modules coverage

ci: install validate ## Run CI pipeline locally
\t@echo "✅ CI pipeline completed successfully"
`;

        await fs.writeFile(path.join(workspacePath, "Makefile"), makefile);
        created.push("Makefile");

        return formatToolResponse({
          success: true,
          filesCreated: created,
          message:
            "Project automation set up successfully. Use 'make help' to see available commands.",
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
          filesCreated: created,
        });
      }
    },
  },
  {
    name: "generate_project_docs",
    description:
      "Automatically generate comprehensive project documentation",
    inputSchema: {
      type: "object",
      properties: {
        includeApi: {
          type: "boolean",
          description: "Generate API documentation",
          default: true,
        },
        includeArchitecture: {
          type: "boolean",
          description: "Generate architecture documentation",
          default: true,
        },
      },
    },
    handler: async (args: any) => {
      const docsCreated = [];

      try {
        const docsDir = path.join(workspacePath, "docs");
        await fs.mkdir(docsDir, { recursive: true });

        // Generate CONTRIBUTING.md
        const contributing = `# Contributing

## Development Setup

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Run tests: \`npm test\`
4. Build: \`npm run build\`

## Development Workflow

1. Create a feature branch
2. Write code with tests
3. Run validation: \`npm run validate\`
4. Commit with semantic message
5. Push and create pull request

## Code Quality Standards

- All tests must pass
- Code coverage > 80%
- Zero linting errors
- TypeScript strict mode
- Comprehensive error handling

## Commit Message Format

\`\`\`
<type>: <description>

[optional body]

[optional footer]
\`\`\`

Types: feat, fix, docs, test, refactor, chore
`;

        await fs.writeFile(
          path.join(workspacePath, "CONTRIBUTING.md"),
          contributing
        );
        docsCreated.push("CONTRIBUTING.md");

        // Generate ARCHITECTURE.md
        if (args.includeArchitecture) {
          const architecture = `# Architecture

## Overview

[Project architecture overview]

## Directory Structure

\`\`\`
/
├── src/          # Source code
├── tests/        # Test files
├── dist/         # Build output
├── docs/         # Documentation
└── scripts/      # Automation scripts
\`\`\`

## Key Components

[Describe main components]

## Data Flow

[Describe how data flows through the system]

## Technology Stack

[List technologies and why they were chosen]

## Design Decisions

[Document important architectural decisions]
`;

          await fs.writeFile(
            path.join(docsDir, "ARCHITECTURE.md"),
            architecture
          );
          docsCreated.push("docs/ARCHITECTURE.md");
        }

        // Generate CHANGELOG.md
        const changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup

### Changed

### Fixed

### Removed
`;

        await fs.writeFile(path.join(workspacePath, "CHANGELOG.md"), changelog);
        docsCreated.push("CHANGELOG.md");

        return formatToolResponse({
          success: true,
          docsCreated,
          message: "Project documentation generated successfully.",
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
          docsCreated,
        });
      }
    },
  },
  {
    name: "fix_common_issues",
    description:
      "Automatically detect and fix common project issues (missing scripts, outdated deps, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        autoFix: {
          type: "boolean",
          description: "Automatically fix issues without confirmation",
          default: true,
        },
      },
    },
    handler: async (args: any) => {
      const issues = [];
      const fixes = [];

      try {
        // Check for package.json
        const packageJsonPath = path.join(workspacePath, "package.json");
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, "utf8")
        );

        // Check for missing scripts
        const recommendedScripts = [
          "test",
          "build",
          "lint",
          "lint:check",
          "type-check",
        ];
        const missingScripts = recommendedScripts.filter(
          (script) => !packageJson.scripts?.[script]
        );

        if (missingScripts.length > 0 && args.autoFix) {
          packageJson.scripts = packageJson.scripts || {};
          missingScripts.forEach((script) => {
            switch (script) {
              case "test":
                packageJson.scripts.test = "jest";
                break;
              case "build":
                packageJson.scripts.build = "tsc";
                break;
              case "lint":
                packageJson.scripts.lint = "eslint . --fix";
                break;
              case "lint:check":
                packageJson.scripts["lint:check"] = "eslint .";
                break;
              case "type-check":
                packageJson.scripts["type-check"] = "tsc --noEmit";
                break;
            }
          });
          await fs.writeFile(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2)
          );
          fixes.push(`Added missing scripts: ${missingScripts.join(", ")}`);
        } else if (missingScripts.length > 0) {
          issues.push(`Missing scripts: ${missingScripts.join(", ")}`);
        }

        // Check for .gitignore
        try {
          await fs.access(path.join(workspacePath, ".gitignore"));
        } catch {
          if (args.autoFix) {
            const gitignore = `node_modules/
dist/
build/
coverage/
.env
.DS_Store
*.log
`;
            await fs.writeFile(
              path.join(workspacePath, ".gitignore"),
              gitignore
            );
            fixes.push("Created .gitignore");
          } else {
            issues.push("Missing .gitignore");
          }
        }

        // Check for README.md
        try {
          await fs.access(path.join(workspacePath, "README.md"));
        } catch {
          if (args.autoFix) {
            const readme = `# ${packageJson.name}

${packageJson.description || ""}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Development

\`\`\`bash
npm run validate
\`\`\`

## License

${packageJson.license || "MIT"}
`;
            await fs.writeFile(path.join(workspacePath, "README.md"), readme);
            fixes.push("Created README.md");
          } else {
            issues.push("Missing README.md");
          }
        }

        return formatToolResponse({
          success: true,
          issuesFound: issues,
          fixesApplied: fixes,
          message:
            fixes.length > 0
              ? "Issues fixed automatically"
              : issues.length > 0
              ? "Issues found but not fixed (set autoFix: true)"
              : "No issues found",
        });
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
];
