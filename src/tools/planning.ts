import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const planningTools = [
  {
    name: "generate_requirements",
    description: "Generate comprehensive product requirements from a high-level idea/prompt",
    inputSchema: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "High-level product idea or prompt",
        },
        targetAudience: {
          type: "string",
          description: "Target audience or user persona",
        },
        monetizationStrategy: {
          type: "string",
          description: "How the product will make money",
        },
      },
      required: ["idea"],
    },
    handler: async (args: any) => {
      try {
        const requirements = {
          productVision: args.idea,
          targetAudience: args.targetAudience || "General users",
          monetizationStrategy: args.monetizationStrategy || "To be determined",
          
          functionalRequirements: [
            "Core feature implementation based on product vision",
            "User authentication and authorization",
            "Data persistence and retrieval",
            "Error handling and validation",
            "API endpoints or user interface",
          ],
          
          nonFunctionalRequirements: {
            performance: [
              "Response time < 200ms for 95% of requests",
              "Support 1000+ concurrent users",
              "99.9% uptime SLA",
            ],
            security: [
              "Data encryption at rest and in transit",
              "OWASP Top 10 compliance",
              "Regular security audits",
              "Secure authentication (OAuth2/JWT)",
            ],
            scalability: [
              "Horizontal scaling capability",
              "Database replication support",
              "CDN for static assets",
            ],
            usability: [
              "Intuitive user interface",
              "Mobile responsive design",
              "Accessibility (WCAG 2.1 AA)",
            ],
          },
          
          technicalConstraints: [
            "Cloud-native architecture",
            "Modern tech stack (latest stable versions)",
            "Automated testing (>80% coverage)",
            "CI/CD pipeline",
            "Containerized deployment",
          ],
          
          userStories: [
            {
              id: "US-001",
              as: "a user",
              want: "to access the core functionality",
              so: "I can solve my problem efficiently",
              acceptanceCriteria: [
                "User can access main features",
                "Features work as expected",
                "Errors are handled gracefully",
              ],
            },
          ],
          
          successMetrics: [
            "User adoption rate",
            "User engagement metrics",
            "Revenue generation",
            "System performance metrics",
            "User satisfaction score",
          ],
        };

        // Save to file
        const outputPath = path.join(workspacePath, "REQUIREMENTS.md");
        const content = `# Product Requirements Document

## Product Vision
${requirements.productVision}

## Target Audience
${requirements.targetAudience}

## Monetization Strategy
${requirements.monetizationStrategy}

## Functional Requirements
${requirements.functionalRequirements.map((r) => `- ${r}`).join("\n")}

## Non-Functional Requirements

### Performance
${requirements.nonFunctionalRequirements.performance.map((r) => `- ${r}`).join("\n")}

### Security
${requirements.nonFunctionalRequirements.security.map((r) => `- ${r}`).join("\n")}

### Scalability
${requirements.nonFunctionalRequirements.scalability.map((r) => `- ${r}`).join("\n")}

### Usability
${requirements.nonFunctionalRequirements.usability.map((r) => `- ${r}`).join("\n")}

## Technical Constraints
${requirements.technicalConstraints.map((r) => `- ${r}`).join("\n")}

## User Stories
${requirements.userStories.map((us) => `
### ${us.id}
As ${us.as}, I want ${us.want}, so that ${us.so}.

**Acceptance Criteria:**
${us.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}
`).join("\n")}

## Success Metrics
${requirements.successMetrics.map((m) => `- ${m}`).join("\n")}
`;

        await fs.writeFile(outputPath, content);

        return formatToolResponse({
          success: true,
          requirements,
          savedTo: "REQUIREMENTS.md",
          message: "Comprehensive requirements document generated",
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
    name: "create_product_roadmap",
    description: "Generate a product development roadmap with milestones and timelines",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Name of the project",
        },
        scope: {
          type: "string",
          enum: ["mvp", "full", "enterprise"],
          description: "Scope of the roadmap",
          default: "mvp",
        },
      },
      required: ["projectName"],
    },
    handler: async (args: any) => {
      try {
        const scope = args.scope || "mvp";
        
        const phases = {
          mvp: [
            {
              phase: "Phase 1: Foundation",
              duration: "2 weeks",
              milestones: [
                "Project setup and infrastructure",
                "Core architecture implementation",
                "Basic authentication",
                "Database schema design",
              ],
            },
            {
              phase: "Phase 2: Core Features",
              duration: "3 weeks",
              milestones: [
                "Primary feature implementation",
                "API development",
                "Unit tests (80% coverage)",
                "Integration tests",
              ],
            },
            {
              phase: "Phase 3: Polish & Launch",
              duration: "2 weeks",
              milestones: [
                "UI/UX refinement",
                "Performance optimization",
                "Security hardening",
                "Documentation completion",
                "MVP launch",
              ],
            },
          ],
          full: [
            // Add more phases for full scope
          ],
          enterprise: [
            // Add more phases for enterprise scope
          ],
        };

        const roadmap = {
          projectName: args.projectName,
          scope,
          phases: phases[scope as keyof typeof phases],
          totalDuration: scope === "mvp" ? "7 weeks" : scope === "full" ? "16 weeks" : "24 weeks",
        };

        const outputPath = path.join(workspacePath, "ROADMAP.md");
        const content = `# Product Roadmap: ${roadmap.projectName}

**Scope:** ${roadmap.scope.toUpperCase()}
**Total Duration:** ${roadmap.totalDuration}

${roadmap.phases.map((phase: any) => `
## ${phase.phase}
**Duration:** ${phase.duration}

### Milestones
${phase.milestones.map((m: string) => `- [ ] ${m}`).join("\n")}
`).join("\n")}
`;

        await fs.writeFile(outputPath, content);

        return formatToolResponse({
          success: true,
          roadmap,
          savedTo: "ROADMAP.md",
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
    name: "generate_user_stories",
    description: "Generate user stories and acceptance criteria from requirements",
    inputSchema: {
      type: "object",
      properties: {
        feature: {
          type: "string",
          description: "Feature description",
        },
        count: {
          type: "number",
          description: "Number of user stories to generate",
          default: 5,
        },
      },
      required: ["feature"],
    },
    handler: async (args: any) => {
      try {
        const stories = [];
        const baseCount = args.count || 5;

        for (let i = 1; i <= baseCount; i++) {
          stories.push({
            id: `US-${String(i).padStart(3, "0")}`,
            title: `${args.feature} - Story ${i}`,
            as: "a user",
            want: `to use aspect ${i} of ${args.feature}`,
            so: "I can accomplish my goals efficiently",
            priority: i <= 2 ? "High" : i <= 4 ? "Medium" : "Low",
            storyPoints: Math.floor(Math.random() * 8) + 1,
            acceptanceCriteria: [
              "Given the user has access to the feature",
              "When they perform the action",
              "Then the expected result occurs",
              "And appropriate feedback is provided",
            ],
          });
        }

        return formatToolResponse({
          success: true,
          totalStories: stories.length,
          stories,
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
