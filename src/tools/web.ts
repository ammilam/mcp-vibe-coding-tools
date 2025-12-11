import axios, { AxiosResponse } from "axios";
import { formatToolResponse } from "../utils/response.js";
import * as cheerio from "cheerio";

export const webTools = [
  {
    name: "fetch_webpage",
    description: "Fetch content from a webpage",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to fetch",
        },
        headers: {
          type: "object",
          description: "Custom HTTP headers",
        },
      },
      required: ["url"],
    },
    handler: async (args: any) => {
      const response = await axios.get(args.url, {
        headers: args.headers || {
          "User-Agent": "MCP-Vibe-Coding-Tools/1.0",
        },
        timeout: 30000,
      });
      
      const result = {
        success: true,
        url: args.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        contentType: response.headers["content-type"],
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "parse_html",
    description: "Parse HTML and extract data using CSS selectors",
    inputSchema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "HTML content to parse",
        },
        selector: {
          type: "string",
          description: "CSS selector to extract elements",
        },
        attribute: {
          type: "string",
          description: "Attribute to extract (default: text content)",
        },
      },
      required: ["html", "selector"],
    },
    handler: async (args: any) => {
      const $ = cheerio.load(args.html);
      const elements = $(args.selector);
      
      const results = elements
        .map((i, el) => {
          if (args.attribute) {
            return $(el).attr(args.attribute);
          }
          return $(el).text().trim();
        })
        .get();
      
      const result = {
        success: true,
        selector: args.selector,
        count: results.length,
        results,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "extract_links",
    description: "Extract all links from HTML",
    inputSchema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "HTML content to parse",
        },
        baseUrl: {
          type: "string",
          description: "Base URL for resolving relative links",
        },
      },
      required: ["html"],
    },
    handler: async (args: any) => {
      const $ = cheerio.load(args.html);
      const links: string[] = [];
      
      $("a[href]").each((i, el) => {
        const href = $(el).attr("href");
        if (href) {
          if (args.baseUrl && !href.startsWith("http")) {
            try {
              const url = new URL(href, args.baseUrl);
              links.push(url.toString());
            } catch {
              links.push(href);
            }
          } else {
            links.push(href);
          }
        }
      });
      
      const result = {
        success: true,
        count: links.length,
        links: [...new Set(links)], // Remove duplicates
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "download_file",
    description: "Download a file from a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to download from",
        },
      },
      required: ["url"],
    },
    handler: async (args: any) => {
      const response = await axios.get(args.url, {
        responseType: "arraybuffer",
        timeout: 60000,
      });
      
      const result = {
        success: true,
        url: args.url,
        size: response.data.length,
        contentType: response.headers["content-type"],
        data: Buffer.from(response.data).toString("base64"),
      };
      return formatToolResponse(result);
    },
  },
];
