import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { formatToolResponse } from "../utils/response.js";

const execAsync = promisify(exec);

export const kubernetesTools = [
  {
    name: "kubectl_get_pods",
    description: "Get list of pods in a namespace",
    inputSchema: {
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
      labelSelector: z.string().describe("Label selector to filter pods (e.g., 'app=myapp')").optional(),
      allNamespaces: z.boolean().describe("Get pods from all namespaces").default(false).optional(),
    },
    handler: async (args: any) => {
      try {
        let command = "kubectl get pods -o json";
        
        if (args.allNamespaces) {
          command += " --all-namespaces";
        } else {
          command += ` -n ${args.namespace || "default"}`;
        }
        
        if (args.labelSelector) {
          command += ` -l ${args.labelSelector}`;
        }
        
        const { stdout } = await execAsync(command);
        const pods = JSON.parse(stdout);
        
        const result = {
          success: true,
          namespace: args.allNamespaces ? "all" : args.namespace || "default",
          pods: pods.items?.map((pod: any) => ({
            name: pod.metadata.name,
            namespace: pod.metadata.namespace,
            status: pod.status.phase,
            restarts: pod.status.containerStatuses?.reduce((sum: number, c: any) => sum + c.restartCount, 0) || 0,
            ready: `${pod.status.containerStatuses?.filter((c: any) => c.ready).length || 0}/${pod.status.containerStatuses?.length || 0}`,
            age: pod.metadata.creationTimestamp,
            node: pod.spec.nodeName,
          })) || [],
        };
        return formatToolResponse(result);
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "kubectl_describe_pod",
    description: "Get detailed information about a specific pod",
    inputSchema: {
      name: z.string().describe("Pod name"),
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
    },
    handler: async (args: any) => {
      try {
        const { stdout } = await execAsync(
          `kubectl describe pod ${args.name} -n ${args.namespace || "default"}`
        );
        
        return formatToolResponse({
          success: true,
          pod: args.name,
          namespace: args.namespace || "default",
          description: stdout,
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
    name: "kubectl_get_logs",
    description: "Get logs from a pod",
    inputSchema: {
      name: z.string().describe("Pod name"),
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
      container: z.string().describe("Container name (if pod has multiple containers)").optional(),
      tail: z.number().describe("Number of lines to tail (default: 100)").default(100).optional(),
      previous: z.boolean().describe("Get logs from previous container instance").default(false).optional(),
    },
    handler: async (args: any) => {
      try {
        let command = `kubectl logs ${args.name} -n ${args.namespace || "default"}`;
        
        if (args.container) {
          command += ` -c ${args.container}`;
        }
        
        if (args.tail) {
          command += ` --tail=${args.tail}`;
        }
        
        if (args.previous) {
          command += " --previous";
        }
        
        const { stdout, stderr } = await execAsync(command);
        
        return formatToolResponse({
          success: true,
          pod: args.name,
          namespace: args.namespace || "default",
          container: args.container,
          logs: stdout,
          warnings: stderr || undefined,
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
    name: "kubectl_get_deployments",
    description: "Get list of deployments in a namespace",
    inputSchema: {
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
      allNamespaces: z.boolean().describe("Get deployments from all namespaces").default(false).optional(),
    },
    handler: async (args: any) => {
      try {
        let command = "kubectl get deployments -o json";
        
        if (args.allNamespaces) {
          command += " --all-namespaces";
        } else {
          command += ` -n ${args.namespace || "default"}`;
        }
        
        const { stdout } = await execAsync(command);
        const deployments = JSON.parse(stdout);
        
        const result = {
          success: true,
          namespace: args.allNamespaces ? "all" : args.namespace || "default",
          deployments: deployments.items?.map((dep: any) => ({
            name: dep.metadata.name,
            namespace: dep.metadata.namespace,
            replicas: `${dep.status.readyReplicas || 0}/${dep.spec.replicas}`,
            upToDate: dep.status.updatedReplicas || 0,
            available: dep.status.availableReplicas || 0,
            age: dep.metadata.creationTimestamp,
          })) || [],
        };
        return formatToolResponse(result);
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "kubectl_get_services",
    description: "Get list of services in a namespace",
    inputSchema: {
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
      allNamespaces: z.boolean().describe("Get services from all namespaces").default(false).optional(),
    },
    handler: async (args: any) => {
      try {
        let command = "kubectl get services -o json";
        
        if (args.allNamespaces) {
          command += " --all-namespaces";
        } else {
          command += ` -n ${args.namespace || "default"}`;
        }
        
        const { stdout } = await execAsync(command);
        const services = JSON.parse(stdout);
        
        const result = {
          success: true,
          namespace: args.allNamespaces ? "all" : args.namespace || "default",
          services: services.items?.map((svc: any) => ({
            name: svc.metadata.name,
            namespace: svc.metadata.namespace,
            type: svc.spec.type,
            clusterIP: svc.spec.clusterIP,
            externalIP: svc.status.loadBalancer?.ingress?.[0]?.ip || svc.spec.externalIPs?.[0] || "none",
            ports: svc.spec.ports?.map((p: any) => `${p.port}:${p.targetPort}/${p.protocol}`).join(", "),
            age: svc.metadata.creationTimestamp,
          })) || [],
        };
        return formatToolResponse(result);
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "kubectl_get_events",
    description: "Get events in a namespace to debug issues",
    inputSchema: {
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
      fieldSelector: z.string().describe("Field selector to filter events (e.g., 'type=Warning')").optional(),
    },
    handler: async (args: any) => {
      try {
        let command = `kubectl get events -n ${args.namespace || "default"} -o json --sort-by='.lastTimestamp'`;
        
        if (args.fieldSelector) {
          command += ` --field-selector=${args.fieldSelector}`;
        }
        
        const { stdout } = await execAsync(command);
        const events = JSON.parse(stdout);
        
        const result = {
          success: true,
          namespace: args.namespace || "default",
          events: events.items?.map((evt: any) => ({
            type: evt.type,
            reason: evt.reason,
            message: evt.message,
            object: `${evt.involvedObject.kind}/${evt.involvedObject.name}`,
            count: evt.count,
            firstSeen: evt.firstTimestamp,
            lastSeen: evt.lastTimestamp,
          })) || [],
        };
        return formatToolResponse(result);
      } catch (error: any) {
        return formatToolResponse({
          success: false,
          error: error.message,
        });
      }
    },
  },
  {
    name: "kubectl_get_resource_status",
    description: "Get status of any Kubernetes resource",
    inputSchema: {
      resourceType: z.string().describe("Resource type (e.g., 'pod', 'deployment', 'statefulset', 'configmap')"),
      name: z.string().describe("Resource name"),
      namespace: z.string().describe("Kubernetes namespace (default: default)").default("default").optional(),
    },
    handler: async (args: any) => {
      try {
        const { stdout } = await execAsync(
          `kubectl get ${args.resourceType} ${args.name} -n ${args.namespace || "default"} -o json`
        );
        
        const resource = JSON.parse(stdout);
        
        return formatToolResponse({
          success: true,
          resourceType: args.resourceType,
          name: args.name,
          namespace: args.namespace || "default",
          status: resource.status,
          metadata: {
            creationTimestamp: resource.metadata.creationTimestamp,
            labels: resource.metadata.labels,
            annotations: resource.metadata.annotations,
          },
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
