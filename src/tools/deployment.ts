import * as fs from "fs/promises";
import * as path from "path";
import { formatToolResponse } from "../utils/response.js";

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

export const deploymentTools = [
  {
    name: "generate_dockerfile",
    description: "Generate optimized Dockerfile for the project",
    inputSchema: {
      type: "object",
      properties: {
        projectType: {
          type: "string",
          enum: ["nodejs", "python", "go", "rust"],
          description: "Project language/runtime",
        },
        optimize: {
          type: "boolean",
          description: "Use multi-stage builds for optimization",
          default: true,
        },
      },
      required: ["projectType"],
    },
    handler: async (args: any) => {
      try {
        let dockerfile = "";

        switch (args.projectType) {
          case "nodejs":
            dockerfile = args.optimize
              ? `# Multi-stage build for Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build if needed
RUN npm run build || true

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Security: Run as non-root
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
`
              : `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
`;
            break;

          case "python":
            dockerfile = `FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Security: Run as non-root
RUN useradd -m -u 1001 appuser
USER appuser

EXPOSE 8000

CMD ["python", "main.py"]
`;
            break;

          default:
            dockerfile = `# Add Dockerfile for ${args.projectType}`;
        }

        await fs.writeFile(path.join(workspacePath, "Dockerfile"), dockerfile);

        // Also generate .dockerignore
        const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.*
*.md
.DS_Store
dist
build
coverage
.vscode
.idea
`;

        await fs.writeFile(path.join(workspacePath, ".dockerignore"), dockerignore);

        return formatToolResponse({
          success: true,
          dockerfile,
          filesCreated: ["Dockerfile", ".dockerignore"],
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
    name: "generate_cicd_pipeline",
    description: "Generate CI/CD pipeline configuration",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["github-actions", "gitlab-ci", "circle-ci"],
          default: "github-actions",
        },
        deployTarget: {
          type: "string",
          enum: ["docker", "kubernetes", "serverless", "vm"],
          default: "docker",
        },
      },
    },
    handler: async (args: any) => {
      try {
        let config = "";
        let filename = "";

        if (args.platform === "github-actions") {
          filename = ".github/workflows/ci-cd.yml";
          config = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Build
        run: npm run build
      
      - name: Security audit
        run: npm audit --audit-level=high

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            user/app:latest
            user/app:\${{ github.sha }}
          cache-from: type=registry,ref=user/app:buildcache
          cache-to: type=registry,ref=user/app:buildcache,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        run: |
          echo "Deploy step - configure based on your infrastructure"
          # kubectl apply -f k8s/
          # or aws ecs update-service
          # or other deployment commands
`;
        }

        // Create directory if needed
        const filePath = path.join(workspacePath, filename);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, config);

        return formatToolResponse({
          success: true,
          platform: args.platform,
          savedTo: filename,
          config,
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
    name: "generate_kubernetes_manifests",
    description: "Generate Kubernetes deployment manifests",
    inputSchema: {
      type: "object",
      properties: {
        appName: {
          type: "string",
          description: "Application name",
        },
        replicas: {
          type: "number",
          description: "Number of replicas",
          default: 3,
        },
        port: {
          type: "number",
          description: "Application port",
          default: 3000,
        },
      },
      required: ["appName"],
    },
    handler: async (args: any) => {
      try {
        const manifests = {
          deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${args.appName}
  labels:
    app: ${args.appName}
spec:
  replicas: ${args.replicas || 3}
  selector:
    matchLabels:
      app: ${args.appName}
  template:
    metadata:
      labels:
        app: ${args.appName}
    spec:
      containers:
      - name: ${args.appName}
        image: ${args.appName}:latest
        ports:
        - containerPort: ${args.port || 3000}
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: ${args.port || 3000}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: ${args.port || 3000}
          initialDelaySeconds: 5
          periodSeconds: 5
`,
          service: `apiVersion: v1
kind: Service
metadata:
  name: ${args.appName}
spec:
  selector:
    app: ${args.appName}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${args.port || 3000}
  type: LoadBalancer
`,
          ingress: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${args.appName}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - ${args.appName}.example.com
    secretName: ${args.appName}-tls
  rules:
  - host: ${args.appName}.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${args.appName}
            port:
              number: 80
`,
        };

        // Save manifests
        const k8sDir = path.join(workspacePath, "k8s");
        await fs.mkdir(k8sDir, { recursive: true });

        await fs.writeFile(path.join(k8sDir, "deployment.yaml"), manifests.deployment);
        await fs.writeFile(path.join(k8sDir, "service.yaml"), manifests.service);
        await fs.writeFile(path.join(k8sDir, "ingress.yaml"), manifests.ingress);

        return formatToolResponse({
          success: true,
          manifests,
          savedTo: "k8s/",
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
