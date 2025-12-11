import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const architectureTools = [
  {
    name: "design_system_architecture",
    description: "Design comprehensive system architecture for a project",
    inputSchema: {
      type: "object",
      properties: {
        projectType: {
          type: "string",
          description: "Type of system to design",
        },
        scale: {
          type: "string",
          enum: ["small", "medium", "large", "enterprise"],
          default: "medium",
        },
        requirements: {
          type: "array",
          items: { type: "string" },
          description: "Key requirements and constraints",
        },
      },
      required: ["projectType"],
    },
    handler: async (args: any) => {
      try {
        const architecture = {
          projectType: args.projectType,
          scale: args.scale || "medium",
          
          layers: {
            presentation: {
              description: "User-facing layer",
              components: ["Web UI", "Mobile App", "API Gateway"],
              technologies: ["React/Next.js", "React Native", "Kong/Traefik"],
            },
            application: {
              description: "Business logic layer",
              components: ["API Services", "Business Logic", "Workflows"],
              technologies: ["Node.js/Express", "FastAPI", "Temporal"],
            },
            data: {
              description: "Data persistence layer",
              components: ["Primary DB", "Cache", "Object Storage"],
              technologies: ["PostgreSQL", "Redis", "S3/MinIO"],
            },
            infrastructure: {
              description: "Platform services",
              components: ["Container Orchestration", "Message Queue", "Monitoring"],
              technologies: ["Kubernetes", "RabbitMQ", "Prometheus"],
            },
          },

          patterns: [
            "Microservices architecture",
            "Event-driven communication",
            "CQRS for read/write separation",
            "API Gateway pattern",
            "Circuit breaker for resilience",
            "Database per service",
          ],

          dataFlow: [
            "Client → API Gateway → Service Mesh → Microservices",
            "Services → Message Queue → Event Processors",
            "Services → Cache → Database",
          ],

          scalability: {
            horizontal: "Service replication with load balancing",
            vertical: "Resource scaling per service",
            database: "Read replicas + sharding strategy",
            caching: "Multi-layer caching (CDN, Redis, Application)",
          },

          security: {
            authentication: "OAuth2 + JWT tokens",
            authorization: "RBAC with fine-grained permissions",
            dataProtection: "Encryption at rest and in transit",
            networkSecurity: "VPC, Security groups, WAF",
          },
        };

        // Generate architecture diagram (as text)
        const diagram = `
# System Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────┐
│         PRESENTATION LAYER                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Web App  │  │ Mobile   │  │   API    │ │
│  │ (React)  │  │ (Native) │  │ Gateway  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│        APPLICATION LAYER                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Service  │  │ Service  │  │ Service  │ │
│  │    A     │  │    B     │  │    C     │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│            DATA LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Primary  │  │  Redis   │  │  Object  │ │
│  │   DB     │  │  Cache   │  │ Storage  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘
\`\`\`
`;

        // Save architecture document
        const outputPath = path.join(workspacePath, "ARCHITECTURE.md");
        const content = `# System Architecture: ${args.projectType}

**Scale:** ${architecture.scale}

## Architecture Layers

${Object.entries(architecture.layers).map(([name, layer]: [string, any]) => `
### ${name.charAt(0).toUpperCase() + name.slice(1)} Layer
${layer.description}

**Components:**
${layer.components.map((c: string) => `- ${c}`).join("\n")}

**Technologies:**
${layer.technologies.map((t: string) => `- ${t}`).join("\n")}
`).join("\n")}

## Architecture Patterns
${architecture.patterns.map((p) => `- ${p}`).join("\n")}

## Data Flow
${architecture.dataFlow.map((f) => `\n${f}`).join("\n")}

## Scalability Strategy
- **Horizontal:** ${architecture.scalability.horizontal}
- **Vertical:** ${architecture.scalability.vertical}
- **Database:** ${architecture.scalability.database}
- **Caching:** ${architecture.scalability.caching}

## Security Architecture
- **Authentication:** ${architecture.security.authentication}
- **Authorization:** ${architecture.security.authorization}
- **Data Protection:** ${architecture.security.dataProtection}
- **Network Security:** ${architecture.security.networkSecurity}

${diagram}
`;

        await fs.writeFile(outputPath, content);

        return formatToolResponse({
          success: true,
          architecture,
          savedTo: "ARCHITECTURE.md",
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
    name: "design_database_schema",
    description: "Design database schema with relationships and indexes",
    inputSchema: {
      type: "object",
      properties: {
        entities: {
          type: "array",
          items: { type: "string" },
          description: "Main entities in the system",
        },
        databaseType: {
          type: "string",
          enum: ["sql", "nosql", "hybrid"],
          default: "sql",
        },
      },
      required: ["entities"],
    },
    handler: async (args: any) => {
      try {
        const schema = {
          databaseType: args.databaseType || "sql",
          tables: [] as any[],
          relationships: [] as any[],
          indexes: [] as any[],
        };

        // Generate tables for each entity
        for (const entity of args.entities) {
          const tableName = entity.toLowerCase().replace(/\s+/g, "_");
          
          schema.tables.push({
            name: tableName,
            columns: [
              { name: "id", type: "UUID", primaryKey: true },
              { name: "created_at", type: "TIMESTAMP", default: "NOW()" },
              { name: "updated_at", type: "TIMESTAMP", default: "NOW()" },
              { name: "deleted_at", type: "TIMESTAMP", nullable: true },
              // Entity-specific columns would be added here
            ],
          });

          // Add common indexes
          schema.indexes.push({
            table: tableName,
            columns: ["created_at"],
            type: "btree",
          });
        }

        // Generate SQL DDL
        const ddl = schema.tables.map((table) => `
CREATE TABLE ${table.name} (
${table.columns.map((col: any) => {
  const parts = [`  ${col.name} ${col.type}`];
  if (col.primaryKey) parts.push("PRIMARY KEY");
  if (col.default) parts.push(`DEFAULT ${col.default}`);
  if (col.nullable === false) parts.push("NOT NULL");
  return parts.join(" ");
}).join(",\n")}
);

${schema.indexes.filter((idx) => idx.table === table.name).map((idx) =>
  `CREATE INDEX idx_${idx.table}_${idx.columns.join("_")} ON ${idx.table}(${idx.columns.join(", ")});`
).join("\n")}
`).join("\n");

        // Save schema
        const outputPath = path.join(workspacePath, "schema.sql");
        await fs.writeFile(outputPath, ddl);

        return formatToolResponse({
          success: true,
          schema,
          ddl,
          savedTo: "schema.sql",
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
    name: "generate_api_spec",
    description: "Generate OpenAPI/Swagger specification for API design",
    inputSchema: {
      type: "object",
      properties: {
        apiName: {
          type: "string",
          description: "Name of the API",
        },
        version: {
          type: "string",
          description: "API version",
          default: "1.0.0",
        },
        endpoints: {
          type: "array",
          items: { type: "string" },
          description: "List of main endpoints",
        },
      },
      required: ["apiName"],
    },
    handler: async (args: any) => {
      try {
        const spec = {
          openapi: "3.0.0",
          info: {
            title: args.apiName,
            version: args.version || "1.0.0",
            description: `API specification for ${args.apiName}`,
          },
          servers: [
            {
              url: "https://api.example.com/v1",
              description: "Production server",
            },
            {
              url: "http://localhost:3000/v1",
              description: "Development server",
            },
          ],
          paths: {} as any,
          components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
              },
            },
            schemas: {
              Error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        };

        // Generate basic CRUD endpoints for each resource
        if (args.endpoints) {
          for (const endpoint of args.endpoints) {
            const resourceName = endpoint.toLowerCase();
            spec.paths[`/${resourceName}`] = {
              get: {
                summary: `List all ${resourceName}`,
                responses: {
                  "200": {
                    description: "Successful response",
                    content: {
                      "application/json": {
                        schema: {
                          type: "array",
                          items: { $ref: `#/components/schemas/${endpoint}` },
                        },
                      },
                    },
                  },
                },
                security: [{ bearerAuth: [] }],
              },
              post: {
                summary: `Create a new ${resourceName}`,
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: { $ref: `#/components/schemas/${endpoint}` },
                    },
                  },
                },
                responses: {
                  "201": { description: "Created" },
                },
                security: [{ bearerAuth: [] }],
              },
            };
          }
        }

        const outputPath = path.join(workspacePath, "openapi.json");
        await fs.writeFile(outputPath, JSON.stringify(spec, null, 2));

        return formatToolResponse({
          success: true,
          spec,
          savedTo: "openapi.json",
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
