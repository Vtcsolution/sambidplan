// backend/services/websiteFinderAI.js
//
// Uses Gemini (with Google Search grounding) and/or OpenAI web search
// to find the official website of a company that has no website in DB.
//
// Primary:  Gemini 2.0 Flash + googleSearch tool (live Google Search)
// Fallback: OpenAI Responses API + web_search_preview tool

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import axios from 'axios';
import Prospect from '../models/Prospect.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Clients (lazy init) ───────────────────────────────────────────────────────
let _geminiClient = null;
let _openaiClient = null;

const getGemini = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_geminiClient) _geminiClient = new GoogleGenerativeAI(key);
  return _geminiClient;
};

const getOpenAI = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!_openaiClient) _openaiClient = new OpenAI({ apiKey: key });
  return _openaiClient;
};

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Gemini free tier = 15 RPM; paid = 2000 RPM. Stay safe at 10 RPM.
const GEMINI_DELAY_MS  = 6000;   // 10 req/min
const OPENAI_DELAY_MS  = 2000;   // ~30 req/min

// ── URL extraction ────────────────────────────────────────────────────────────
const SKIP_DOMAINS = ['linkedin.com','facebook.com','twitter.com','youtube.com',
  'instagram.com','yelp.com','bbb.org','bloomberg.com','dnb.com','zoominfo.com',
  'crunchbase.com','sam.gov','usaspending.gov','fpds.gov','sba.gov','dla.mil',
  'wikipedia.org','google.com','bing.com','duckduckgo.com','usa.gov',
  'whitepages.com','manta.com','yellowpages.com','bizbuysell.com',
];

const extractUrl = (text) => {
  if (!text) return null;
  // Look for explicit URL
  const matches = text.match(/https?:\/\/[^\s\n"'<>()\[\]]+/g) || [];
  for (const m of matches) {
    const clean = m.replace(/[.,;!?)]+$/, '');
    try {
      const host = new URL(clean).hostname.replace(/^www\./, '');
      if (!SKIP_DOMAINS.some(d => host.includes(d))) return clean;
    } catch { /* bad url */ }
  }
  // www. pattern
  const www = text.match(/\bwww\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s,)"]*/);
  if (www) {
    const clean = 'https://' + www[0].replace(/[.,;!?)]+$/, '');
    const host = www[0].replace(/^www\./, '').split('/')[0];
    if (!SKIP_DOMAINS.some(d => host.includes(d))) return clean;
  }
  return null;
};

// ── Website validation ────────────────────────────────────────────────────────
const validateUrl = async (url) => {
  if (!url) return null;
  try {
    const res = await axios.head(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedNotify/1.0)' },
    });
    if (res.status < 400) return { url: res.request?.res?.responseUrl || url, status: res.status };
  } catch {
    try {
      const res = await axios.get(url, {
        timeout: 12000, maxRedirects: 5,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.status < 400) return { url: res.request?.res?.responseUrl || url, status: res.status };
    } catch { /* unreachable */ }
  }
  return null;
};

// ── Build search prompt ───────────────────────────────────────────────────────
const buildPrompt = (company) => {
  const parts = [];
  if (company.companyName) parts.push(`Company: "${company.companyName}"`);
  if (company.state)       parts.push(`State: ${company.state}`);
  if (company.city)        parts.push(`City: ${company.city}`);
  if (company.naicsCode)   parts.push(`Industry NAICS: ${company.naicsCode}`);
  if (company.uei)         parts.push(`SAM UEI: ${company.uei}`);
  if (company.cageCode)    parts.push(`CAGE: ${company.cageCode}`);
  return `Find the official website URL of this US federal government contractor.\n${parts.join('\n')}\n\nReturn ONLY the website URL (e.g., https://company.com). If you cannot find it, return exactly: NOT_FOUND`;
};

// ── Gemini with Google Search grounding ──────────────────────────────────────
export const findWebsiteGemini = async (company) => {
  const genAI = getGemini();
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ googleSearch: {} }],
    });
    const result = await model.generateContent(buildPrompt(company));
    const text   = result.response.text().trim();
    if (text.toUpperCase().includes('NOT_FOUND') || text.length < 5) return null;
    return extractUrl(text);
  } catch (err) {
    // Try 1.5-flash as fallback within Gemini
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: 'MODE_DYNAMIC', dynamicThreshold: 0.3 } } }],
      });
      const result = await model.generateContent(buildPrompt(company));
      const text   = result.response.text().trim();
      if (text.toUpperCase().includes('NOT_FOUND') || text.length < 5) return null;
      return extractUrl(text);
    } catch { return null; }
  }
};

// ── OpenAI Responses API with web_search_preview ──────────────────────────────
export const findWebsiteGPT = async (company) => {
  const openai = getOpenAI();
  if (!openai) return null;
  try {
    const res = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: buildPrompt(company),
    });
    // Extract text from Responses API output array
    let text = '';
    if (res.output_text) {
      text = res.output_text;
    } else if (Array.isArray(res.output)) {
      for (const item of res.output) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === 'output_text') { text = c.text; break; }
          }
        }
        if (text) break;
      }
    }
    if (!text || text.toUpperCase().includes('NOT_FOUND')) return null;
    return extractUrl(text);
  } catch (err) {
    // Fallback to search-preview chat model
    try {
      const client = getOpenAI();
      const res2 = await client.chat.completions.create({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: buildPrompt(company) }],
        max_tokens: 150,
      });
      const text2 = res2.choices[0]?.message?.content?.trim() || '';
      if (!text2 || text2.toUpperCase().includes('NOT_FOUND')) return null;
      return extractUrl(text2);
    } catch { return null; }
  }
};

// ── Main: try Gemini → GPT, validate URL ─────────────────────────────────────
export const findWebsiteWithAI = async (company) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  let rawUrl = null;
  let source = null;

  if (hasGemini) {
    rawUrl = await findWebsiteGemini(company);
    if (rawUrl) source = 'gemini';
    await sleep(GEMINI_DELAY_MS); // respect rate limit
  }

  if (!rawUrl && hasOpenAI) {
    rawUrl = await findWebsiteGPT(company);
    if (rawUrl) source = 'gpt';
    await sleep(OPENAI_DELAY_MS);
  }

  if (!rawUrl) return null;

  // Validate the URL is reachable
  const validated = await validateUrl(rawUrl);
  if (!validated) return { url: rawUrl, validated: false, source }; // return even if unreachable, let caller decide
  return { url: validated.url, httpStatus: validated.status, validated: true, source };
};

// ── Shared state for the background job ──────────────────────────────────────
export const aiFindState = {
  isRunning:   false,
  total:       0,
  processed:   0,
  found:       0,
  skipped:     0,
  failed:      0,
  source:      { gemini: 0, gpt: 0 },
  lastError:   null,
  startedAt:   null,
  percentComplete: 0,
};

// ── Background job: find websites for all prospects missing one ───────────────
export const runAIWebsiteFinder = async ({ onlySource } = {}) => {
  if (aiFindState.isRunning) return { success: false, message: 'Already running' };

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  if (!hasGemini && !hasOpenAI) {
    return { success: false, message: 'No AI API keys set (GEMINI_API_KEY or OPENAI_API_KEY required)' };
  }

  Object.assign(aiFindState, {
    isRunning: true, total: 0, processed: 0, found: 0,
    skipped: 0, failed: 0, source: { gemini: 0, gpt: 0 },
    lastError: null, startedAt: new Date().toISOString(), percentComplete: 0,
  });

  try {
    const query = { website: { $in: [null, '', undefined] } };
    if (onlySource) query.dataSource = onlySource;

    const total = await Prospect.countDocuments(query);
    aiFindState.total = total;
    console.log(`\n🤖 AI Website Finder: ${total.toLocaleString()} companies to process…`);

    const BATCH = 20;
    let processed = 0;

    while (aiFindState.isRunning) {
      const batch = await Prospect.find(query)
        .sort({ totalAwardAmount: -1 })
        .limit(BATCH)
        .lean();

      if (!batch.length) break;

      for (const company of batch) {
        if (!aiFindState.isRunning) break;

        const result = await findWebsiteWithAI(company);

        if (result?.url) {
          await Prospect.findByIdAndUpdate(company._id, {
            $set: {
              website:           result.url,
              rawWebsite:        result.url,
              allWebsites:       [result.url],
              websiteStatus:     result.validated ? 'active' : 'unknown',
              websiteHttpStatus: result.httpStatus || undefined,
              websiteSource:     result.source,
            },
          });
          aiFindState.found++;
          if (result.source === 'gemini') aiFindState.source.gemini++;
          if (result.source === 'gpt')    aiFindState.source.gpt++;
          console.log(`  ✓ [${result.source}] ${company.companyName} → ${result.url}`);
        } else {
          aiFindState.skipped++;
        }

        processed++;
        aiFindState.processed    = processed;
        aiFindState.percentComplete = total > 0 ? Math.round((processed / total) * 100) : 0;

        if (processed % 50 === 0) {
          console.log(`  AI Finder: ${processed}/${total} — found: ${aiFindState.found}, skipped: ${aiFindState.skipped}`);
        }
      }
    }

    console.log(`✅ AI Website Finder done: ${aiFindState.found} websites found out of ${processed} companies`);
    aiFindState.percentComplete = 100;
    return { success: true };
  } catch (err) {
    aiFindState.lastError = err.message;
    console.error('AI Website Finder error:', err.message);
    return { success: false, message: err.message };
  } finally {
    aiFindState.isRunning = false;
  }
};

export const stopAIWebsiteFinder = () => { aiFindState.isRunning = false; };
