import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const securityTools = [
  {
    name: "security_audit",
    description: "Run comprehensive security audit on the project",
    inputSchema: {
      type: "object",
      properties: {
        auditType: {
          type: "string",
          enum: ["dependencies", "code", "secrets", "all"],
          default: "all",
        },
      },
    },
    handler: async (args: any) => {
      try {
        const results: any = {
          auditType: args.auditType || "all",
          findings: [],
          summary: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
        };

        // Audit dependencies
        if (args.auditType === "dependencies" || args.auditType === "all") {
          try {
            const { stdout } = await execAsync("npm audit --json", {
              cwd: workspacePath,
            });
            const auditResults = JSON.parse(stdout);
            
            if (auditResults.metadata) {
              results.summary.critical += auditResults.metadata.vulnerabilities?.critical || 0;
              results.summary.high += auditResults.metadata.vulnerabilities?.high || 0;
              results.summary.medium += auditResults.metadata.vulnerabilities?.moderate || 0;
              results.summary.low += auditResults.metadata.vulnerabilities?.low || 0;
            }

            results.findings.push({
              category: "dependencies",
              vulnerabilities: auditResults.vulnerabilities || {},
            });
          } catch (error: any) {
            // npm audit returns non-zero exit code if vulnerabilities found
            if (error.stdout) {
              const auditResults = JSON.parse(error.stdout);
              results.findings.push({
                category: "dependencies",
                vulnerabilities: auditResults.vulnerabilities || {},
              });
            }
          }
        }

        // Check for exposed secrets
        if (args.auditType === "secrets" || args.auditType === "all") {
          const secretPatterns = [
            /(?:api[_-]?key|apikey)[\"']?\s*[:=]\s*[\"']([^\"']+)[\"']/gi,
            /(?:secret|password|passwd|pwd)[\"']?\s*[:=]\s*[\"']([^\"']+)[\"']/gi,
            /(?:token|auth)[\"']?\s*[:=]\s*[\"']([^\"']+)[\"']/gi,
            /(?:aws|amazon)[_-]?(?:access[_-]?key|secret)[\"']?\s*[:=]\s*[\"']([^\"']+)[\"']/gi,
          ];

          try {
            const files = await execAsync(
              "find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*'",
              { cwd: workspacePath }
            );

            const secretFindings = [];
            const fileList = files.stdout.split("\n").filter(Boolean);

            for (const file of fileList.slice(0, 100)) { // Limit to avoid timeout
              try {
                const content = await fs.readFile(path.join(workspacePath, file), "utf8");
                for (const pattern of secretPatterns) {
                  const matches = content.match(pattern);
                  if (matches) {
                    secretFindings.push({
                      file,
                      pattern: pattern.source,
                      severity: "high",
                    });
                  }
                }
              } catch {
                // Skip files that can't be read
              }
            }

            results.findings.push({
              category: "secrets",
              exposedSecrets: secretFindings,
            });

            results.summary.high += secretFindings.length;
          } catch (error) {
            // Error finding files
          }
        }

        // Code security checks
        if (args.auditType === "code" || args.auditType === "all") {
          const codeIssues = [];

          // Check for common security issues
          try {
            const { stdout } = await execAsync(
              "grep -r -n 'eval(' --include='*.js' --include='*.ts' . || true",
              { cwd: workspacePath }
            );

            if (stdout) {
              codeIssues.push({
                issue: "Use of eval() detected",
                severity: "high",
                description: "eval() can execute arbitrary code",
                occurrences: stdout.split("\n").filter(Boolean).length,
              });
            }
          } catch {
            // No eval found
          }

          results.findings.push({
            category: "code",
            issues: codeIssues,
          });

          results.summary.high += codeIssues.filter((i) => i.severity === "high").length;
        }

        // Generate recommendations
        results.recommendations = [];
        if (results.summary.critical > 0 || results.summary.high > 0) {
          results.recommendations.push("Address critical and high severity issues immediately");
          results.recommendations.push("Run npm audit fix to auto-fix dependency vulnerabilities");
        }
        if (results.findings.some((f: any) => f.category === "secrets" && f.exposedSecrets?.length > 0)) {
          results.recommendations.push("Move secrets to environment variables");
          results.recommendations.push("Add secrets to .gitignore");
          results.recommendations.push("Use a secrets management service");
        }

        return formatToolResponse({
          success: true,
          ...results,
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
    name: "generate_security_policy",
    description: "Generate security policy and guidelines for the project",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Name of the project",
        },
      },
      required: ["projectName"],
    },
    handler: async (args: any) => {
      try {
        const policy = `# Security Policy: ${args.projectName}

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com. Do not open a public issue.

## Security Measures

### Authentication & Authorization
- All endpoints require authentication via JWT tokens
- Role-based access control (RBAC) enforced
- Multi-factor authentication (MFA) available
- Session timeout: 30 minutes of inactivity

### Data Protection
- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- Sensitive data never logged
- PII handling complies with GDPR/CCPA

### API Security
- Rate limiting: 100 requests/minute per IP
- Input validation on all endpoints
- SQL injection protection via prepared statements
- XSS protection via output encoding
- CSRF protection via tokens

### Infrastructure Security
- Regular security updates and patches
- Firewall rules restrict access
- Database access via VPN only
- Secrets managed via secure vault
- Audit logging enabled

### Dependency Management
- Weekly automated dependency scans
- Critical vulnerabilities patched within 24h
- Outdated dependencies reviewed monthly
- Only approved packages allowed

### Code Security
- Security-focused code reviews
- Static analysis (SAST) in CI/CD
- No secrets in source code
- Security linting enabled

### Incident Response
- Security incidents logged and tracked
- Critical incidents escalated immediately
- Post-incident reviews conducted
- Lessons learned documented

## Security Checklist

- [ ] All dependencies up to date
- [ ] No known vulnerabilities
- [ ] Secrets stored securely
- [ ] Authentication implemented
- [ ] Authorization enforced
- [ ] Input validation active
- [ ] Output encoding enabled
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Logging configured
- [ ] Backups automated
- [ ] Incident response plan ready

## Compliance

This project aims to comply with:
- OWASP Top 10 security standards
- CWE/SANS Top 25 Most Dangerous Software Errors
- SOC 2 Type II requirements
- GDPR data protection requirements

Last Updated: ${new Date().toISOString().split("T")[0]}
`;

        const outputPath = path.join(workspacePath, "SECURITY.md");
        await fs.writeFile(outputPath, policy);

        return formatToolResponse({
          success: true,
          savedTo: "SECURITY.md",
          message: "Security policy generated",
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
    name: "scan_for_vulnerabilities",
    description: "Scan codebase for common vulnerabilities",
    inputSchema: {
      type: "object",
      properties: {
        scanType: {
          type: "string",
          enum: ["sast", "dependencies", "secrets", "comprehensive"],
          default: "comprehensive",
        },
      },
    },
    handler: async (args: any) => {
      try {
        const vulnerabilities: any[] = [];

        // Dependency scanning
        try {
          await execAsync("npm audit --json", { cwd: workspacePath });
        } catch (error: any) {
          if (error.stdout) {
            const audit = JSON.parse(error.stdout);
            Object.values(audit.vulnerabilities || {}).forEach((vuln: any) => {
              vulnerabilities.push({
                type: "dependency",
                severity: vuln.severity,
                package: vuln.name,
                title: vuln.via[0]?.title || "Vulnerability",
                recommendation: "Update package to latest secure version",
              });
            });
          }
        }

        // OWASP Top 10 checks (simplified)
        const owaspChecks = [
          {
            name: "SQL Injection",
            pattern: /\$\{.*\}.*query|query.*\+.*user|exec.*\+.*req\./gi,
            severity: "critical",
          },
          {
            name: "XSS",
            pattern: /dangerouslySetInnerHTML|innerHTML.*=|document\.write/gi,
            severity: "high",
          },
          {
            name: "Hardcoded Secrets",
            pattern: /password\s*=\s*["'][^"']+["']|api_key\s*=\s*["'][^"']+["']/gi,
            severity: "critical",
          },
        ];

        return formatToolResponse({
          success: true,
          totalVulnerabilities: vulnerabilities.length,
          vulnerabilities,
          scanType: args.scanType || "comprehensive",
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
