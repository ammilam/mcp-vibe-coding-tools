import axios, { AxiosResponse } from "axios";
import { formatToolResponse } from "../utils/response.js";
import * as cheerio from "cheerio";
import { z } from "zod";

export const webTools = [
  {
    name: "fetch_webpage",
    description: "Fetch content from a webpage",
    inputSchema: z.object({
      url: z.string().describe("URL to fetch"),
      headers: z.record(z.string()).describe("Custom HTTP headers").optional(),
    }),
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
    inputSchema: z.object({
      html: z.string().describe("HTML content to parse"),
      selector: z.string().describe("CSS selector to extract elements"),
      attribute: z.string().describe("Attribute to extract (default: text content)").optional(),
    }),
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
    inputSchema: z.object({
      html: z.string().describe("HTML content to parse"),
      baseUrl: z.string().describe("Base URL for resolving relative links").optional(),
    }),
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
    inputSchema: z.object({
      url: z.string().describe("URL to download from"),
    }),
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
