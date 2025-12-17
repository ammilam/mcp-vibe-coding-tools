# MCP Vibe Coding Tools

**Complete Autonomous Development Organization** - Transform any prompt into a fully functional, production-ready, revenue-generating product with zero human intervention.

## 🎯 Mission: From Prompt to Profit

This MCP server operates as a **complete software development company in a box**, providing 100+ tools that enable AI to function as:

- **📋 Requirements Team** - Requirements analysis, user stories, acceptance criteria
- **📊 Product Team** - Roadmaps, competitive analysis, market research  
- **🔬 R&D Team** - Technology research, architecture design, proof of concepts
- **🏗️ IT Department** - Infrastructure, deployment, monitoring, automation
- **🔒 Security Team** - Vulnerability scanning, auditing, compliance, hardening
- **💻 Development Team** - Implementation, testing, code review, optimization
- **📚 Documentation Team** - Comprehensive docs, API specs, guides

### The Revolution

**Traditional AI Coding:** Generate code → Ask human for validation → Wait for approval → Repeat

**MCP Vibe Coding:** Prompt → Requirements → Architecture → Implementation → Testing → Security → Deployment → **DONE**

### Philosophy

- ✅ **Act, Don't Ask** - AI makes decisions and fixes issues automatically
- ✅ **Test Everything** - Comprehensive validation before shipping
- ✅ **Document Relentlessly** - Auto-generated, always up-to-date docs
- ✅ **Automate Ruthlessly** - Scripts and CI/CD for everything
- ✅ **Quality First** - Production-ready code only

## 🚀 What Makes This Different

### Traditional AI Coding Tools

- Ask for permission before actions
- Require manual testing and validation
- Generate documentation as an afterthought
- Need human intervention for bug fixes
- Create technical debt

### MCP Vibe Coding Tools

- **Autonomous execution** - Fix issues without asking
- **Built-in validation** - Auto-test, auto-lint, auto-build
- **Self-documenting** - Generate docs as code evolves
- **Iterative fixing** - Debug and resolve automatically
- **Production quality** - Ship only fully validated code

## ⚠️ Critical: SDK Version Compatibility

**ALWAYS ensure package.json matches the installed MCP SDK version!**

This project uses `@modelcontextprotocol/sdk@^1.24.3` with the modern `McpServer` API.

**If you see `v3Schema.safeParseAsync is not a function`:**

This is usually a **client cache issue**, not a server issue. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for full fix.

**Quick fix:**
1. Clean rebuild: `rm -rf dist node_modules && npm install && npm run build`
2. **Completely quit and restart your MCP client** (Claude Desktop, Cursor, etc.)
3. Clear client cache if needed (see troubleshooting guide)

Version mismatches between package.json and node_modules will break the server.

## 📦 Two MCP Servers

This package provides **two separate MCP servers**:

### 1. `mcp-vibe-coding-tools` (Main Server)
Local development tools for filesystem, git, testing, automation, diagnostics, kubernetes, and RAG.

**Entry point:** `dist/mcp-vibe-coding-tools.js`

### 2. `mcp-gitops-tools` (GitOps Server)
Remote GitOps operations for GitHub Actions, GitLab CI/CD, and GitLab API.

**Entry point:** `dist/gitops-server.js`

---

## 📦 114 Production-Ready Tools Across 17 Categories

### Filesystem Operations (6 tools)

- `read_file` - Read files with encoding support
- `write_file` - Create/update files safely
- `list_directory` - Browse directory trees
- `search_files` - Find files by glob pattern
- `file_info` - Get file metadata
- `create_directory` - Create directory structures

### CLI Execution (3 tools)

- `execute_command` - Run shell commands
- `get_environment` - Access environment variables
- `which_command` - Find command locations

### Git Operations (9 tools)

- `git_status`, `git_log`, `git_diff` - Repository inspection
- `git_branch`, `git_commit` - Version control
- `git_push`, `git_pull`, `git_clone` - Remote operations
- `git_stash` - Temporary storage

### Web & HTTP (4 tools)

- `fetch_webpage` - Download web content
- `parse_html` - Extract structured data
- `extract_links` - Get all links
- `download_file` - Save remote files

### Node.js/npm (5 tools)

- `npm_install` - Manage packages
- `npm_run_script` - Execute scripts
- `npm_outdated` - Check dependencies
- `npm_init` - Create projects
- `read_package_json` - Read metadata

### Python/pip (5 tools)

- `python_create_venv` - Virtual environments
- `pip_install` - Install packages
- `pip_freeze` - Generate requirements
- `python_run_script` - Execute code
- `python_version` - Check version

### Testing & Building (4 tools)

- `run_tests` - Execute test suites
- `build_project` - Compile/build
- `start_dev_server` - Run dev servers
- `lint_code` - Code quality checks

### **🤖 Automation & Orchestration (5 tools)**

#### `validate_project`

Run complete project validation suite:
- Linting with auto-fix
- Type checking
- Test execution with coverage
- Build verification
- **Auto-iterates until all checks pass**

#### `create_validation_script`

Generate comprehensive validation scripts:
- Add lint, test, build commands to package.json
- Set up pre-commit hooks
- Configure coverage thresholds
- Create validation pipeline

#### `setup_project_automation`

Complete automation setup:
- GitHub Actions / GitLab CI workflows
- Dependabot configuration
- Pre-commit hooks
- Makefile for cross-platform commands

#### `generate_project_docs`

Auto-generate documentation:
- CONTRIBUTING.md with dev workflow
- ARCHITECTURE.md with system design
- CHANGELOG.md with version history
- API documentation

#### `fix_common_issues`

Detect and auto-fix problems:
- Missing package.json scripts
- Missing .gitignore
- Missing README
- Outdated dependencies
- **Fixes issues without asking**

### **🔍 Diagnostics & Logging (8 tools)**

#### `get_vscode_problems`
Get real-time compilation and linting errors:
- Runs TypeScript compiler to find type errors
- Executes ESLint to detect code quality issues
- Returns structured problem list with file, line, severity
- Filter by file path or severity level
- **Essential for autonomous error fixing**

#### `read_log_file`

Read and parse log files with smart filtering:
- Tail last N lines (like `tail -n`)
- Filter by log level (ERROR, WARN, INFO, DEBUG)
- Apply custom regex patterns
- Parse structured logs (JSON, timestamp formats)
- Extract timestamps, levels, messages

#### `tail_log_file`

Monitor log files for recent activity:
- Get snapshot of recent log entries
- Useful for monitoring build/test output
- View last N lines of any log file

#### `search_logs`

Search all logs for specific patterns:
- Recursive search through log directories
- Context lines before/after matches
- Regex pattern support
- Group matches by file
- **Find error patterns across entire workspace**

#### `find_log_files`

Discover all log files in workspace:
- Glob pattern matching (*.log, **/*.log)
- File size and modification time
- Sort by most recent
- Exclude node_modules by default

#### `analyze_error_logs`

Deep analysis of log files for errors:
- Extract errors, warnings, exceptions
- Parse stack traces automatically
- Categorize error types
- Count error patterns
- **Identify root causes autonomously**

#### `watch_log_changes`

Monitor log file changes incrementally:
- Read only new content since last position
- Efficient incremental log monitoring
- Get byte position for next read
- Perfect for long-running processes

#### `get_terminal_history`

Access recent terminal commands:
- Read zsh/bash history files
- Parse timestamps (zsh extended format)
- Filter by command pattern
- **Learn from previous command executions**

#### `aggregate_logs`

Combine and analyze multiple log files:
- Group by level, file, hour, or day
- Extract time ranges
- Count entries by category
- **See big picture across all logs**

#### `get_xcode_logs`

Get Xcode build logs, crash logs, and simulator logs:
- Build logs from DerivedData
- Simulator runtime logs
- Crash reports from DiagnosticReports
- Device logs (requires libimobiledevice)

#### `get_android_logs`

Get Android logcat and build logs:
- Logcat with priority/tag filtering
- Gradle build logs
- Parse structured log format

#### `get_react_native_logs`

Get React Native Metro bundler and app logs:
- Metro bundler output
- iOS simulator logs
- Android logcat for RN apps

### Kubernetes Operations (7 tools)

#### `kubectl_get_pods`
List pods in a namespace with status information.

#### `kubectl_describe_pod`
Get detailed information about a specific pod.

#### `kubectl_get_logs`
Fetch logs from a pod with filtering options.

#### `kubectl_get_deployments`
List all deployments with replica status.

#### `kubectl_get_services`
List all services with IP and port information.

#### `kubectl_get_events`
Get cluster events for debugging issues.

#### `kubectl_get_resource_status`
Get status of any Kubernetes resource type.

**Note:** All kubectl tools are read-only - for validation and debugging only, no destructive operations.

### GitHub Actions (6 tools)

#### `github_list_workflow_runs`
List workflow runs with optional filters (status, branch).

#### `github_get_workflow_run`
Get details of a specific workflow run.

#### `github_list_workflow_jobs`
List all jobs in a workflow run.

#### `github_get_job_logs`
Fetch logs for a specific job.

#### `github_list_workflows`
List all workflows in a repository.

#### `github_get_workflow_run_logs`
Download complete workflow run logs as base64-encoded zip.

**Environment Variable Required:** 
- `GITHUB_API_KEY` - GitHub Personal Access Token with `repo` and `actions:read` scopes

**Error Handling:** Tools only error when invoked without `GITHUB_API_KEY` set - they do NOT error on server startup.

### RAG (Retrieval Augmented Generation) (6 tools)

Enable local document search and retrieval for AI coding assistants. Perfect for searching through documentation, codebases, and reference materials.

**Environment Variables:**
- `RAG_DOCS_PATH` - **Required** - Path to directory containing documents to index

**Note:** The index is automatically stored in `.rag-index` folder inside `RAG_DOCS_PATH`. Chunk size (1000) and overlap (200) are sensible defaults.

#### `rag_index_documents`
Index local documents for semantic search:
- Scans directory for supported file types
- Chunks documents with configurable overlap
- Builds TF-IDF index for semantic similarity
- Incremental indexing (only re-indexes changed files)
- Supports 30+ file extensions (md, ts, js, py, json, yaml, etc.)

#### `rag_search`
Search indexed documents using semantic similarity:
- TF-IDF based semantic search
- Returns top-K most relevant chunks
- Configurable minimum similarity threshold
- File path filtering with regex
- **Perfect for finding relevant docs and code examples**

#### `rag_get_context`
Expand context around search results:
- Get more lines before/after a match
- Useful for understanding surrounding code
- Configurable expansion range

#### `rag_list_indexed`
List all indexed documents:
- Shows file paths, types, and chunk counts
- Optional detailed chunk information
- Index statistics and metadata

#### `rag_clear_index`
Clear the RAG index:
- Requires confirmation flag
- Removes all indexed documents

#### `rag_status`
Check RAG system status:
- Shows if RAG is enabled
- Configuration values
- Index statistics if available

**Example Configuration:**
```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/mcp-vibe-coding-tools.js"],
      "env": {
        "WORKSPACE_PATH": "/path/to/project",
        "RAG_DOCS_PATH": "/path/to/docs-to-search"
      }
    }
  }
}
```

### GitLab CI/CD (7 tools)

#### `gitlab_list_pipelines`
List pipelines for a project with optional filters.

#### `gitlab_get_pipeline`
Get detailed information about a specific pipeline.

#### `gitlab_list_pipeline_jobs`
List all jobs in a pipeline.

#### `gitlab_get_job`
Get details of a specific job including artifacts info.

#### `gitlab_get_job_trace`
Fetch job logs/trace output.

#### `gitlab_list_project_jobs`
List all jobs in a project with filtering.

#### `gitlab_get_pipeline_variables`
Get variables used in a pipeline execution.

### GitLab API (23 tools)

Comprehensive GitLab API integration for groups, projects, issues, and merge requests.

#### Groups
- `gitlab_get_group` - Get group details
- `gitlab_list_group_subgroups` - List subgroups
- `gitlab_list_group_projects` - List projects in group
- `gitlab_list_descendant_groups` - List all nested subgroups

#### Projects
- `gitlab_get_project` - Get project details
- `gitlab_list_projects` - List accessible projects

#### Issues
- `gitlab_list_issues` - List issues with filters
- `gitlab_get_issue` - Get issue details
- `gitlab_create_issue` - Create new issue
- `gitlab_update_issue` - Update existing issue
- `gitlab_list_issue_notes` - List issue comments
- `gitlab_create_issue_note` - Add issue comment

#### Merge Requests
- `gitlab_list_merge_requests` - List MRs with filters
- `gitlab_get_merge_request` - Get MR details
- `gitlab_merge_merge_request` - Merge an MR
- `gitlab_list_mr_changes` - Get MR diff
- `gitlab_list_mr_notes` - List MR comments
- `gitlab_create_mr_note` - Add MR comment
- `gitlab_approve_merge_request` - Approve MR

#### Global Search
- `gitlab_search_issues_global` - Search issues across all projects
- `gitlab_search_merge_requests_global` - Search MRs across all projects
- `gitlab_search_group_issues` - Search issues in a group
- `gitlab_search_group_merge_requests` - Search MRs in a group

**Environment Variables Required:**
- `GITLAB_API_KEY` - GitLab Personal Access Token or Project Access Token with `read_api` scope
- `GITLAB_HOST` (optional) - GitLab instance URL (default: `https://gitlab.com` for GitLab.com, or set to your self-hosted instance)

**Error Handling:** Tools only error when invoked without `GITLAB_API_KEY` set - they do NOT error on server startup.

### **📋 Planning & Requirements (3 tools)**

#### `generate_requirements`
Transform ideas into comprehensive requirements:
- Functional and non-functional requirements
- User stories with acceptance criteria
- Technical constraints and success metrics
- Monetization strategy
- **Complete PRD from a prompt**

#### `create_product_roadmap`
Generate development roadmap:
- Phase breakdown (MVP → Full → Enterprise)
- Milestones and timelines
- Feature prioritization
- **Clear path from idea to launch**

#### `generate_user_stories`
Create detailed user stories:
- Acceptance criteria in Given/When/Then format
- Priority and story point estimation
- **Ready for sprint planning**

### **🔬 Research & Analysis (3 tools)**

#### `analyze_tech_stack`
Recommend optimal technologies:
- Analyze project requirements
- Recommend frameworks, databases, hosting
- Provide alternatives with reasoning
- Consider team size and expertise
- **Data-driven technology decisions**

#### `research_best_practices`
Industry best practices database:
- Security patterns (OWASP, authentication)
- Performance optimization techniques
- Testing strategies and patterns
- Deployment best practices
- **Learn from industry leaders**

#### `competitive_analysis`
Market and competitive intelligence:
- Identify opportunities and threats
- Differentiation strategies
- Market positioning recommendations
- **Strategic product decisions**

### **🏗️ Architecture & Design (3 tools)**

#### `design_system_architecture`
Complete system architecture design:
- Layered architecture (Presentation, Application, Data, Infrastructure)
- Architecture patterns (microservices, event-driven, CQRS)
- Scalability and security strategies
- Data flow diagrams
- **Production-ready architecture from day one**

#### `design_database_schema`
Database schema design:
- Entity modeling with relationships
- SQL DDL generation
- Indexes for performance
- Migration planning
- **Optimized data layer**

#### `generate_api_spec`
OpenAPI/Swagger specification:
- Complete endpoint definitions
- Request/response schemas
- Authentication schemes
- **Contract-first API development**

### **🔒 Security & Compliance (3 tools)**

#### `security_audit`
Comprehensive security scanning:
- Dependency vulnerability scanning (npm audit)
- Exposed secrets detection
- Code security issues (eval, SQL injection, XSS)
- Severity-based recommendations
- **Find vulnerabilities before attackers do**

#### `generate_security_policy`
Security policy documentation:
- Authentication/authorization guidelines
- Data protection measures
- Incident response plans
- Compliance checklists (OWASP, GDPR, SOC 2)
- **Enterprise-grade security documentation**

#### `scan_for_vulnerabilities`
Targeted vulnerability scanning:
- SAST (Static Application Security Testing)
- Dependency checks
- Secret scanning
- OWASP Top 10 validation
- **Continuous security monitoring**

### **🚀 Deployment & Infrastructure (3 tools)**

#### `generate_dockerfile`
Optimized Docker containers:
- Multi-stage builds for minimal size
- Security best practices (non-root user)
- Language-specific optimizations
- .dockerignore generation
- **Production-ready containerization**

#### `generate_cicd_pipeline`
CI/CD automation:
- GitHub Actions / GitLab CI workflows
- Automated testing and building
- Security scanning in pipeline
- Deployment automation
- **Zero-touch deployments**

#### `generate_kubernetes_manifests`
Kubernetes deployment configs:
- Deployments with replicas
- Services and load balancers
- Ingress with TLS
- Health checks (liveness/readiness)
- Resource limits and requests
- **Cloud-native deployment ready**

## 🎓 Autonomous Development Instructions

This server includes comprehensive instructions in `.github/instructions/` that guide AI assistants to:

### Core Behaviors
1. **Zero Human Intervention** - Operate autonomously by default
2. **Fix, Don't Report** - Iterate until issues are resolved
3. **Test Everything** - No untested code ships
4. **Document Thoroughly** - Always up-to-date docs
5. **Automate Relentlessly** - Scripts for all common tasks

### Quality Standards
- ✅ All tests must pass
- ✅ Zero linting errors
- ✅ Code coverage >80%
- ✅ TypeScript strict mode
- ✅ Comprehensive error handling
- ✅ Production-ready on first ship

### Workflow Automation
- Auto-run tests after code changes
- Auto-fix linting issues
- Auto-update documentation
- Auto-commit with semantic messages
- Auto-generate validation scripts

See [.github/instructions/autonomous-development.instructions.md](.github/instructions/autonomous-development.instructions.md) for complete guidelines.

## 📖 Installation

```bash
git clone https://github.com/yourusername/mcp-vibe-coding-tools.git
cd mcp-vibe-coding-tools
npm install
npm run build
```

## 🔧 Configuration

### For VS Code & GitHub Copilot

**See [VSCODE_SETUP.md](./VSCODE_SETUP.md) for detailed setup instructions.**

**Quick setup:** Run `MCP: Open User Configuration` from Command Palette and add:

```json
{
  "servers": {
    "mcp-vibe-coding-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/mcp-vibe-coding-tools.js"]
    },
    "mcp-gitops-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/gitops-server.js"],
      "env": {
        "GITHUB_API_KEY": "your-github-token",
        "GITLAB_API_KEY": "your-gitlab-token",
        "GITLAB_HOST": "https://gitlab.com"
      }
    }
  }
}
```

Replace `/path/to/mcp-vibe-coding-tools` with the absolute path to where you cloned this repo. Then it works in **any project** you open in VS Code!

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibe-coding-tools": {
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/mcp-vibe-coding-tools.js"],
      "env": {
        "WORKSPACE_PATH": "/path/to/your/current/project"
      }
    },
    "gitops-tools": {
      "command": "node",
      "args": ["/path/to/mcp-vibe-coding-tools/dist/gitops-server.js"],
      "env": {
        "GITHUB_API_KEY": "your-github-token",
        "GITLAB_API_KEY": "your-gitlab-token",
        "GITLAB_HOST": "https://gitlab.com"
      }
    }
  }
}
```

For Claude, you may want to update `WORKSPACE_PATH` per project, or use a default working directory.

### For Other MCP Clients

The server uses **stdio transport** (standard for MCP) - configure similarly in:
- Cursor
- Windsurf  
- Cline
- Continue
- Any MCP-compatible client

Same pattern:
- **Main server:** `node /path/to/server/dist/mcp-vibe-coding-tools.js` with optional `WORKSPACE_PATH` env var
- **GitOps server:** `node /path/to/server/dist/gitops-server.js` with `GITHUB_API_KEY` and/or `GITLAB_API_KEY` env vars

## 🎯 Usage Examples

### Autonomous Feature Development

```text
Prompt: "Add user authentication with JWT, including tests and docs"

AI will automatically:
1. Write authentication module with error handling
2. Create comprehensive unit & integration tests
3. Run tests and fix any failures
4. Generate API documentation
5. Update README with usage examples
6. Create validation scripts
7. Set up CI/CD for auth tests
8. Commit with semantic message

You get: Production-ready, tested, documented feature ✅
```

### Autonomous Bug Fixing

```text
Prompt: "Fix the memory leak in data processor"

AI will automatically:
1. Analyze code to locate leak
2. Write fix with proper cleanup
3. Add regression tests
4. Run full test suite
5. Verify fix with profiling
6. Update CHANGELOG
7. Commit fix

You get: Bug fixed, tested, documented ✅
```

### Autonomous Project Setup

```text
Prompt: "Create a new Express API project with full automation"

AI will automatically:
1. Initialize project structure
2. Add TypeScript, testing, linting
3. Create validation scripts
4. Set up GitHub Actions
5. Add pre-commit hooks
6. Generate documentation
7. Create example endpoints with tests

You get: Production-ready project template ✅
```

## 🏗️ Architecture

Built with modern MCP SDK:

- **McpServer** class (not deprecated Server)
- **registerTool()** method (not deprecated tool())
- **Stdio transport** for universal compatibility
- **Structured responses** with proper error handling
- **Type-safe** with TypeScript strict mode

## 🔒 Security

- **Path validation** prevents directory traversal
- **No deletion tools** - files are never auto-deleted
- **Sandboxed execution** - workspace-scoped operations
- **Input sanitization** for all user data
- **Environment isolation** with virtual environments

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow.

This project follows autonomous development principles:
- All PRs must pass validation
- Tests required for new features
- Documentation updated automatically
- CI/CD enforces quality standards

## 📝 License

MIT - See [LICENSE](LICENSE) file

## 🙏 Acknowledgments

Built with:
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP standard
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK
- Modern development best practices

## 🚦 Status

- ✅ 114 production tools across 2 servers
- ✅ Full autonomous workflow support
- ✅ Multi-language support (JS/TS, Python, Rust, Go)
- ✅ Comprehensive validation automation
- ✅ Self-documenting capabilities
- ✅ CI/CD integration ready
- ✅ Zero deprecated APIs

---

**Unchain your AI development workflow. Ship production code autonomously.**
