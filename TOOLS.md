# Tool Reference

This document provides a comprehensive reference for all tools available in the MCP Vibe Coding Tools server.

## Filesystem Tools

### read_file

Read the contents of a file.

**Parameters:**
- `path` (string, required): Path to the file relative to workspace
- `encoding` (string, optional): File encoding (default: utf8)

**Example:**
```
Read the package.json file
```

### write_file

Write content to a file (creates or overwrites).

**Parameters:**
- `path` (string, required): Path to the file relative to workspace
- `content` (string, required): Content to write to the file
- `encoding` (string, optional): File encoding (default: utf8)

**Example:**
```
Create a new file called test.txt with the content "Hello World"
```

### list_directory

List contents of a directory.

**Parameters:**
- `path` (string, optional): Path to the directory (default: .)
- `recursive` (boolean, optional): List subdirectories recursively

**Example:**
```
List all files in the src directory
```

### search_files

Search for files using glob patterns.

**Parameters:**
- `pattern` (string, required): Glob pattern (e.g., '**/*.ts')
- `ignore` (array, optional): Patterns to ignore

**Example:**
```
Find all TypeScript files in the project
```

### file_info

Get detailed information about a file or directory.

**Parameters:**
- `path` (string, required): Path to the file or directory

**Example:**
```
Get info about README.md
```

### create_directory

Create a new directory.

**Parameters:**
- `path` (string, required): Path to the directory to create

**Example:**
```
Create a directory called src/components
```

## CLI Tools

### execute_command

Execute a shell command.

**Parameters:**
- `command` (string, required): The command to execute
- `cwd` (string, optional): Working directory
- `timeout` (number, optional): Timeout in milliseconds

**Example:**
```
Run ls -la in the current directory
```

### get_environment

Get environment variables.

**Parameters:**
- `variable` (string, optional): Specific variable to get

**Example:**
```
What's the PATH environment variable?
```

### which_command

Find the path to an executable command.

**Parameters:**
- `command` (string, required): The command to locate

**Example:**
```
Where is the git command installed?
```

## Git Tools

### git_status

Get the current git repository status.

**Example:**
```
What's the git status?
```

### git_log

Get git commit history.

**Parameters:**
- `maxCount` (number, optional): Max commits to retrieve (default: 10)
- `file` (string, optional): Filter by file path

**Example:**
```
Show me the last 5 commits
```

### git_diff

Show differences in files.

**Parameters:**
- `file` (string, optional): Specific file to diff
- `staged` (boolean, optional): Show staged changes

**Example:**
```
Show me what's changed in src/index.ts
```

### git_branch

List, create, or switch branches.

**Parameters:**
- `action` (string, required): list, create, switch, or delete
- `name` (string, optional): Branch name

**Example:**
```
Create a new branch called feature/new-tool
```

### git_commit

Create a git commit.

**Parameters:**
- `message` (string, required): Commit message
- `files` (array, optional): Files to add

**Example:**
```
Commit all changes with message "Add new feature"
```

### git_push

Push commits to remote repository.

**Parameters:**
- `remote` (string, optional): Remote name (default: origin)
- `branch` (string, optional): Branch to push

**Example:**
```
Push the current branch to origin
```

### git_pull

Pull changes from remote repository.

**Parameters:**
- `remote` (string, optional): Remote name (default: origin)
- `branch` (string, optional): Branch to pull

**Example:**
```
Pull the latest changes from main
```

### git_clone

Clone a git repository.

**Parameters:**
- `url` (string, required): Repository URL
- `directory` (string, optional): Target directory

**Example:**
```
Clone https://github.com/user/repo.git
```

### git_stash

Stash or apply stashed changes.

**Parameters:**
- `action` (string, required): save, pop, or list
- `message` (string, optional): Stash message

**Example:**
```
Stash my current changes
```

## Web Tools

### fetch_webpage

Fetch content from a webpage.

**Parameters:**
- `url` (string, required): URL to fetch
- `headers` (object, optional): Custom HTTP headers

**Example:**
```
Fetch the content from https://example.com
```

### parse_html

Parse HTML and extract data using CSS selectors.

**Parameters:**
- `html` (string, required): HTML content to parse
- `selector` (string, required): CSS selector
- `attribute` (string, optional): Attribute to extract

**Example:**
```
Extract all h1 tags from the HTML
```

### extract_links

Extract all links from HTML.

**Parameters:**
- `html` (string, required): HTML content
- `baseUrl` (string, optional): Base URL for relative links

**Example:**
```
Extract all links from the page
```

### download_file

Download a file from a URL.

**Parameters:**
- `url` (string, required): URL to download from

**Example:**
```
Download the file from https://example.com/file.pdf
```

## Node.js Tools

### npm_install

Install npm packages.

**Parameters:**
- `packages` (array, optional): Package names
- `dev` (boolean, optional): Install as dev dependencies
- `global` (boolean, optional): Install globally

**Example:**
```
Install axios and typescript as dev dependencies
```

### npm_run_script

Run an npm script.

**Parameters:**
- `script` (string, required): Script name

**Example:**
```
Run the test script
```

### npm_outdated

Check for outdated packages.

**Example:**
```
Check for outdated packages
```

### npm_init

Initialize a new npm project.

**Parameters:**
- `name` (string, optional): Project name
- `version` (string, optional): Initial version
- `description` (string, optional): Project description

**Example:**
```
Initialize a new npm project called my-app
```

### read_package_json

Read and parse package.json.

**Example:**
```
Show me the package.json contents
```

## Python Tools

### python_create_venv

Create a Python virtual environment.

**Parameters:**
- `name` (string, optional): Virtual environment name (default: venv)

**Example:**
```
Create a Python virtual environment
```

### pip_install

Install Python packages.

**Parameters:**
- `packages` (array, optional): Package names
- `requirements` (string, optional): Path to requirements.txt
- `venv` (string, optional): Virtual environment to use

**Example:**
```
Install requests and numpy
```

### pip_freeze

Generate requirements.txt.

**Parameters:**
- `venv` (string, optional): Virtual environment
- `output` (string, optional): Output file path

**Example:**
```
Generate requirements.txt
```

### python_run_script

Run a Python script.

**Parameters:**
- `script` (string, required): Path to script
- `args` (array, optional): Arguments
- `venv` (string, optional): Virtual environment

**Example:**
```
Run main.py
```

### python_version

Get Python version information.

**Parameters:**
- `venv` (string, optional): Virtual environment

**Example:**
```
What Python version is installed?
```

## Testing Tools

### run_tests

Run test suite.

**Parameters:**
- `framework` (string, optional): Test framework (jest, vitest, pytest, mocha, auto)
- `pattern` (string, optional): Test file pattern
- `coverage` (boolean, optional): Generate coverage

**Example:**
```
Run all tests with coverage
```

### build_project

Build the project.

**Parameters:**
- `command` (string, optional): Build command

**Example:**
```
Build the project
```

### start_dev_server

Start development server.

**Parameters:**
- `command` (string, optional): Server command
- `background` (boolean, optional): Run in background

**Example:**
```
Start the dev server in the background
```

### lint_code

Run code linter.

**Parameters:**
- `fix` (boolean, optional): Auto-fix issues

**Example:**
```
Lint the code and fix issues
```

## Kubernetes Tools

### kubectl_get_pods
Get list of pods in a namespace.
- Parameters: namespace, labelSelector, allNamespaces

### kubectl_describe_pod
Get detailed information about a specific pod.
- Parameters: name, namespace

### kubectl_get_logs
Get logs from a pod.
- Parameters: name, namespace, container, tail, previous

### kubectl_get_deployments
Get list of deployments in a namespace.
- Parameters: namespace, allNamespaces

### kubectl_get_services
Get list of services in a namespace.
- Parameters: namespace, allNamespaces

### kubectl_get_events
Get events in a namespace to debug issues.
- Parameters: namespace, fieldSelector

### kubectl_get_resource_status
Get status of any Kubernetes resource.
- Parameters: resourceType, name, namespace

## GitHub Actions Tools

**Requires GITHUB_API_KEY environment variable**

### github_list_workflow_runs
List workflow runs for a repository.
- Parameters: owner, repo, workflow, status, branch, perPage

### github_get_workflow_run
Get details of a specific workflow run.
- Parameters: owner, repo, runId

### github_list_workflow_jobs
List jobs for a workflow run.
- Parameters: owner, repo, runId

### github_get_job_logs
Get logs for a specific job.
- Parameters: owner, repo, jobId

### github_list_workflows
List all workflows in a repository.
- Parameters: owner, repo

### github_get_workflow_run_logs
Download logs for an entire workflow run (base64-encoded zip).
- Parameters: owner, repo, runId

## GitLab CI/CD Tools

**Requires GITLAB_API_KEY environment variable**  
**Optional: GITLAB_HOST for self-hosted instances**

### gitlab_list_pipelines
List pipelines for a GitLab project.
- Parameters: projectId, status, ref, perPage

### gitlab_get_pipeline
Get details of a specific pipeline.
- Parameters: projectId, pipelineId

### gitlab_list_pipeline_jobs
List jobs in a pipeline.
- Parameters: projectId, pipelineId, scope

### gitlab_get_job
Get details of a specific job.
- Parameters: projectId, jobId

### gitlab_get_job_trace
Get the trace (logs) of a job.
- Parameters: projectId, jobId

### gitlab_list_project_jobs
List all jobs in a project.
- Parameters: projectId, scope, perPage

### gitlab_get_pipeline_variables
Get variables used in a pipeline.
- Parameters: projectId, pipelineId
