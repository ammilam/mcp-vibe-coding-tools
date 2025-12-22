import { formatToolResponse } from "../utils/response.js";
import * as cheerio from "cheerio";
import { z } from "zod";
import TurndownService from "turndown";

// Prompt injection detection patterns
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction attempts
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context)/gi,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context)/gi,
  /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context)/gi,
  
  // Role/persona hijacking
  /you\s+are\s+(now|actually)\s+(a|an|the)/gi,
  /act\s+as\s+(a|an|if\s+you\s+are)/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /roleplay\s+as/gi,
  /assume\s+the\s+role/gi,
  
  // System prompt extraction
  /what\s+(is|are)\s+your\s+(system\s+)?prompt/gi,
  /show\s+(me\s+)?your\s+(system\s+)?prompt/gi,
  /reveal\s+your\s+(system\s+)?instructions/gi,
  /print\s+your\s+(system\s+)?prompt/gi,
  
  // Jailbreak attempts
  /\bdan\s+mode\b/gi,
  /\bdeveloper\s+mode\b/gi,
  /\bjailbreak\b/gi,
  /\bunlock\s+mode\b/gi,
  
  // Hidden instruction markers
  /\[system\]/gi,
  /\[assistant\]/gi,
  /\[user\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /###\s*(system|instruction|prompt)/gi,
  
  // Base64 encoded instructions (common evasion)
  /aWdub3JlIHByZXZpb3Vz/gi, // "ignore previous" in base64
  /ZGlzcmVnYXJkIGFsbA/gi,   // "disregard all" in base64
  
  // Markdown/formatting exploits
  /```\s*(system|prompt|instruction)/gi,
  
  // Command injection patterns
  /execute\s+the\s+following/gi,
  /run\s+this\s+command/gi,
  /output\s+the\s+following\s+exactly/gi,
];

// Hidden text detection (zero-width chars, tiny fonts, etc.)
const HIDDEN_TEXT_PATTERNS = [
  /[\u200B-\u200D\uFEFF\u2060\u180E]/g,  // Zero-width characters
  /[\u2028\u2029]/g,  // Line/paragraph separators
  /[\u00AD]/g,  // Soft hyphen
];

interface InjectionScanResult {
  hasInjection: boolean;
  detectedPatterns: string[];
  sanitizedContent: string;
  riskScore: number; // 0-100
}

// Scan content for prompt injection attempts
function scanForPromptInjection(content: string): InjectionScanResult {
  const detectedPatterns: string[] = [];
  let sanitizedContent = content;
  let riskScore = 0;
  
  // Check for hidden text
  for (const pattern of HIDDEN_TEXT_PATTERNS) {
    if (pattern.test(content)) {
      detectedPatterns.push(`Hidden characters detected`);
      sanitizedContent = sanitizedContent.replace(pattern, '');
      riskScore += 10;
    }
  }
  
  // Check for injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      detectedPatterns.push(`Pattern: ${matches[0].substring(0, 50)}`);
      // Replace with sanitized version (wrap in quotes to neutralize)
      sanitizedContent = sanitizedContent.replace(pattern, (match) => `[BLOCKED: "${match}"]`);
      riskScore += 20;
    }
  }
  
  // Check for suspicious density of special characters
  const specialCharRatio = (content.match(/[<>\[\]{}|\\]/g) || []).length / content.length;
  if (specialCharRatio > 0.1) {
    detectedPatterns.push('High density of special characters');
    riskScore += 15;
  }
  
  // Check for repeated suspicious phrases
  const suspiciousPhrases = ['ignore', 'disregard', 'forget', 'override', 'bypass'];
  for (const phrase of suspiciousPhrases) {
    const count = (content.toLowerCase().match(new RegExp(phrase, 'g')) || []).length;
    if (count > 3) {
      detectedPatterns.push(`Repeated suspicious word: "${phrase}" (${count}x)`);
      riskScore += 10;
    }
  }
  
  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);
  
  return {
    hasInjection: detectedPatterns.length > 0,
    detectedPatterns,
    sanitizedContent,
    riskScore,
  };
}

// Helper to extract clean readable content from HTML
function extractReadableContent(html: string, url?: string, sanitize: boolean = true): {
  title: string;
  description: string;
  markdown: string;
  textContent: string;
  headings: { level: number; text: string }[];
  links: { text: string; href: string }[];
  codeBlocks: string[];
  security?: InjectionScanResult;
} {
  const $ = cheerio.load(html);
  
  // Remove non-content elements
  $('script, style, noscript, iframe, svg, nav, footer, header, aside, [role="banner"], [role="navigation"], [role="complementary"], .sidebar, .nav, .menu, .footer, .header, .advertisement, .ads, .cookie-banner, .popup').remove();
  
  // Extract metadata
  const title = $('title').text().trim() || 
                $('h1').first().text().trim() || 
                $('meta[property="og:title"]').attr('content') || '';
  
  const description = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') || '';
  
  // Extract headings for structure
  const headings: { level: number; text: string }[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName.substring(1));
    const text = $(el).text().trim();
    if (text) headings.push({ level, text });
  });
  
  // Extract code blocks before converting
  const codeBlocks: string[] = [];
  $('pre, code').each((_, el) => {
    const code = $(el).text().trim();
    if (code && code.length > 20) codeBlocks.push(code);
  });
  
  // Extract links with text
  const links: { text: string; href: string }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      let resolvedHref = href;
      if (url && !href.startsWith('http')) {
        try {
          resolvedHref = new URL(href, url).toString();
        } catch { /* keep original */ }
      }
      links.push({ text: text.substring(0, 100), href: resolvedHref });
    }
  });
  
  // Find main content area
  let mainContent = $('main, article, [role="main"], .content, .post, .article, #content, #main').first();
  if (mainContent.length === 0) {
    mainContent = $('body');
  }
  
  // Convert to markdown using turndown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  
  // Add rules for better code block handling
  turndown.addRule('codeBlock', {
    filter: ['pre'],
    replacement: (content: string, node: Node) => {
      const lang = (node as Element).querySelector('code')?.className?.match(/language-(\w+)/)?.[1] || '';
      return `\n\n\`\`\`${lang}\n${content.trim()}\n\`\`\`\n\n`;
    }
  });
  
  const markdown = turndown.turndown(mainContent.html() || '');
  
  // Also get plain text for simpler use cases
  const textContent = mainContent.text()
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  // Scan for prompt injections if sanitization is enabled
  let security: InjectionScanResult | undefined;
  let finalMarkdown = markdown;
  let finalTextContent = textContent.substring(0, 50000);
  
  if (sanitize) {
    security = scanForPromptInjection(markdown);
    if (security.hasInjection) {
      finalMarkdown = security.sanitizedContent;
      // Also scan and sanitize text content
      const textScan = scanForPromptInjection(finalTextContent);
      finalTextContent = textScan.sanitizedContent;
    }
  }
  
  return {
    title,
    description,
    markdown: finalMarkdown,
    textContent: finalTextContent,
    headings: headings.slice(0, 50),
    links: links.slice(0, 100),
    codeBlocks: codeBlocks.slice(0, 20),
    security,
  };
}

export const webTools = [
  {
    name: "fetch_webpage",
    description: "Fetch content from a webpage. Set extractContent=true to get clean markdown/text suitable for LLMs instead of raw HTML.",
    inputSchema: z.object({
      url: z.string().describe("URL to fetch"),
      headers: z.record(z.string()).describe("Custom HTTP headers").optional(),
      extractContent: z.boolean().describe("Extract clean readable content as markdown (recommended for LLMs)").default(false).optional(),
    }),
    handler: async (args: any) => {
      const response = await fetch(args.url, {
        headers: args.headers || {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(30000),
      });
      
      const contentType = response.headers.get("content-type") || "";
      const data = await response.text();
      
      if (args.extractContent) {
        const extracted = extractReadableContent(data, args.url);
        const result = {
          success: true,
          url: args.url,
          status: response.status,
          title: extracted.title,
          description: extracted.description,
          content: extracted.markdown,
          headings: extracted.headings,
          links: extracted.links,
          codeBlocks: extracted.codeBlocks,
        };
        return formatToolResponse(result);
      }
      
      const result = {
        success: true,
        url: args.url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        contentType,
      };
      return formatToolResponse(result);
    },
  },
  {
    name: "scrape_webpage",
    description: "Scrape a webpage and extract clean, readable content as markdown. Ideal for documentation, articles, and reference pages. Removes navigation, ads, scripts, and other non-content elements. Includes prompt injection detection and sanitization for security. Returns structured data including title, headings, main content as markdown, and extracted links.",
    inputSchema: z.object({
      url: z.string().describe("URL to scrape"),
      includeLinks: z.boolean().describe("Include extracted links in response").default(true).optional(),
      includeCode: z.boolean().describe("Include code blocks separately").default(true).optional(),
      sanitize: z.boolean().describe("Scan and sanitize content for prompt injection attempts (recommended)").default(true).optional(),
    }),
    handler: async (args: any) => {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        return formatToolResponse({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url: args.url,
        });
      }
      
      const html = await response.text();
      const sanitize = args.sanitize !== false;
      const extracted = extractReadableContent(html, args.url, sanitize);
      
      const result: any = {
        success: true,
        url: args.url,
        title: extracted.title,
        description: extracted.description,
        headings: extracted.headings,
        content: extracted.markdown,
      };
      
      if (args.includeLinks !== false) {
        result.links = extracted.links;
      }
      
      if (args.includeCode !== false && extracted.codeBlocks.length > 0) {
        result.codeBlocks = extracted.codeBlocks;
      }
      
      // Include security scan results if injection was detected
      if (extracted.security?.hasInjection) {
        result.securityWarning = {
          message: "⚠️ Potential prompt injection detected and sanitized",
          riskScore: extracted.security.riskScore,
          detectedPatterns: extracted.security.detectedPatterns,
        };
      }
      
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
      const response = await fetch(args.url, {
        signal: AbortSignal.timeout(60000),
      });
      
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "";
      
      const result = {
        success: true,
        url: args.url,
        size: arrayBuffer.byteLength,
        contentType,
        data: Buffer.from(arrayBuffer).toString("base64"),
      };
      return formatToolResponse(result);
    },
  },
];
