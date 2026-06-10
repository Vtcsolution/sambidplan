// backend/services/contactEnrichmentService.js
// Enriches a prospect with website, email, and phone using multiple methods.
//
// Website methods (in order):
//   1. SAM.gov entityURL  2. Online search (DuckDuckGo)
//   3. CAGE DLA lookup    4. SBA DSBS     5. USASpending profile
//   6. Gemini / GPT AI search (last resort)
//
// Email/phone methods (in order):
//   1. SAM.gov POC        2. Website scraping
//   3. SBA DSBS           4. CAGE DLA lookup

import axios from 'axios';
import * as cheerio from 'cheerio';
import { samFetch, hasQuota } from './samRateLimiter.js';
import { findWebsiteWithAI } from './websiteFinderAI.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SAM_ENTITY_URL = 'https://api.sam.gov/entity-information/v3/entities';
const SAM_API_KEY    = process.env.SAM_API_KEY;

// ── Regex ─────────────────────────────────────────────────────────────────────
const EMAIL_RE   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE   = /(?:(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
const VALID_MAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const URL_RE     = /https?:\/\/[^\s"'<>(){}[\]\\]+\.[a-z]{2,}[^\s"'<>(){}[\]\\]*/gi;

const DISPOSABLE = [
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','spam4.me','trashmail.com','fakeinbox.com',
];

const SKIP_DOMAINS = ['linkedin.com','facebook.com','twitter.com','youtube.com','instagram.com',
  'yelp.com','bbb.org','bloomberg.com','dnb.com','zoominfo.com','crunchbase.com',
  'sam.gov','usaspending.gov','fpds.gov','sba.gov','dla.mil'];

// ── Email / phone helpers ─────────────────────────────────────────────────────
export const validateEmail = (email) => {
  if (!email || !VALID_MAIL.test(email.trim())) return null;
  const clean  = email.trim().toLowerCase();
  const domain = clean.split('@')[1];
  if (!domain) return null;
  return {
    email:       clean,
    isDisposable: DISPOSABLE.some(d => domain.includes(d)),
    isGov:        domain.endsWith('.gov') || domain.endsWith('.mil'),
  };
};

export const normalizePhone = (raw) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  if (digits.length < 7 || digits.length > 12) return null;
  return raw.trim();
};

const dedupeEmails = (arr) =>
  [...new Set(arr.map(e => e.toLowerCase().trim()).filter(e => validateEmail(e)))];

const dedupePhones = (arr) =>
  [...new Set(arr.map(p => normalizePhone(p)).filter(Boolean))];

const extractFromText = (text) => ({
  emails: dedupeEmails([...(text.match(EMAIL_RE) || [])]),
  phones: dedupePhones([...(text.match(PHONE_RE) || [])]),
});

// ── Website helpers ───────────────────────────────────────────────────────────
const cleanUrl = (raw) => {
  if (!raw) return null;
  let u = raw.trim().replace(/[,;'")\]]+$/, '');
  if (!u.startsWith('http')) u = 'https://' + u;
  try { return new URL(u).origin + new URL(u).pathname.replace(/\/$/, '') || u; } catch { return u; }
};

const isSkippedDomain = (url) => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SKIP_DOMAINS.some(d => host.includes(d));
  } catch { return true; }
};

export const validateWebsite = async (rawUrl) => {
  if (!rawUrl) return null;
  const url = cleanUrl(rawUrl);
  if (!url || isSkippedDomain(url)) return null;

  for (const method of ['head', 'get']) {
    try {
      const res = await axios[method](url, {
        timeout: 8000, maxRedirects: 5,
        validateStatus: s => s < 500,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedProspect/1.0)' },
      });
      const finalUrl = res.request?.res?.responseUrl || url;
      return { url: finalUrl, rawUrl: url, status: res.status, valid: res.status < 400 };
    } catch { /* try next */ }
  }
  return { url, rawUrl: url, status: 0, valid: false };
};

// ── Website Method 1: SAM entity data ────────────────────────────────────────
// Returns entityURL string or null. (Called when SAM entity data is pre-fetched)
export const websiteFromSAMData = (entityURL) => {
  if (!entityURL) return null;
  const u = cleanUrl(entityURL);
  return (u && !isSkippedDomain(u)) ? u : null;
};

// ── Website Method 2: Online search (DuckDuckGo HTML) ────────────────────────
export const searchWebsiteOnline = async (companyName) => {
  try {
    const q = `"${companyName.replace(/[^a-zA-Z0-9 ]/g, '')} " official website federal contractor`;
    const res = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q, kl: 'us-en' },
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0' },
    });
    const $ = cheerio.load(res.data);
    let found = null;
    $('a.result__url, .result__url, .result__extras__url').each((_, el) => {
      if (found) return;
      const href = $(el).attr('href') || $(el).text().trim();
      if (!href) return;
      const u = href.startsWith('http') ? href : 'https://' + href;
      if (!isSkippedDomain(u)) found = u;
    });
    // Also check result__a links
    if (!found) {
      $('a.result__a').each((_, el) => {
        if (found) return;
        const href = $(el).attr('href') || '';
        if (href.startsWith('http') && !isSkippedDomain(href)) found = href;
      });
    }
    return found ? cleanUrl(found) : null;
  } catch { return null; }
};

// ── Website Method 3: CAGE DLA lookup ────────────────────────────────────────
export const websiteFromCAGE = async (cageCode) => {
  if (!cageCode) return null;
  try {
    const res = await axios.get('https://cage.dla.mil/Foreign/Data', {
      params: { method: 'GET', requestType: 'cage', id: cageCode },
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedProspect/1.0)', Accept: 'text/html,application/json' },
    });
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const urls = [...(text.match(URL_RE) || [])].map(cleanUrl).filter(u => u && !isSkippedDomain(u));
    return urls[0] || null;
  } catch { return null; }
};

// ── Website Method 4: SBA DSBS ────────────────────────────────────────────────
export const websiteFromSBA = async (companyName, cageCode) => {
  try {
    const res = await axios.get('https://web.sba.gov/pro-net/search/dsp_dsbs.cfm', {
      params: { tab: 'dsbs', SEARCH_OPT: 'C', COMPANY_NAME: companyName || '', CAGE: cageCode || '' },
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedProspect/1.0)' },
    });
    const $ = cheerio.load(res.data);
    let found = null;
    $('a[href]').each((_, el) => {
      if (found) return;
      const href = $(el).attr('href') || '';
      if (href.startsWith('http') && !isSkippedDomain(href)) found = href;
    });
    if (!found) {
      const text = res.data;
      const urls = [...(text.match(URL_RE) || [])].map(cleanUrl).filter(u => u && !isSkippedDomain(u));
      found = urls[0] || null;
    }
    return found ? cleanUrl(found) : null;
  } catch { return null; }
};

// ── Website Method 5: USASpending recipient profile ───────────────────────────
export const websiteFromUSASpending = async (uei) => {
  if (!uei) return null;
  try {
    const res = await axios.get(`https://api.usaspending.gov/api/v2/recipient/${uei}/`, {
      timeout: 10000, headers: { 'Content-Type': 'application/json' },
    });
    const text = JSON.stringify(res.data || {});
    const urls = [...(text.match(URL_RE) || [])].map(cleanUrl).filter(u => u && !isSkippedDomain(u));
    return urls[0] || null;
  } catch { return null; }
};

// ── Master website finder ──────────────────────────────────────────────────────
// Returns { url, rawUrl, status, valid, source } or null
export const findWebsite = async (company) => {
  const methods = [
    { name: 'sam',         fn: () => company._samEntityURL ? Promise.resolve(company._samEntityURL) : null },
    { name: 'search',      fn: () => searchWebsiteOnline(company.companyName) },
    { name: 'cage',        fn: () => websiteFromCAGE(company.cageCode) },
    { name: 'sba',         fn: () => websiteFromSBA(company.companyName, company.cageCode) },
    { name: 'usaspending', fn: () => websiteFromUSASpending(company.uei) },
  ];

  for (const method of methods) {
    try {
      const raw = await method.fn();
      if (!raw) continue;
      await sleep(500);
      const validated = await validateWebsite(raw);
      if (validated) return { ...validated, source: method.name };
    } catch { /* try next */ }
  }

  // Last resort: AI-powered Google search via Gemini / GPT
  try {
    const aiResult = await findWebsiteWithAI(company);
    if (aiResult?.url) {
      const validated = await validateWebsite(aiResult.url);
      if (validated) return { ...validated, source: aiResult.source };
      // Return unvalidated if URL was found but unreachable (might be transient)
      return { url: aiResult.url, rawUrl: aiResult.url, valid: false, source: aiResult.source };
    }
  } catch { /* AI unavailable — skip */ }

  return null;
};

// ── Email/phone Method 1: SAM.gov POC ────────────────────────────────────────
export const enrichFromSAM = async (uei) => {
  if (!uei || !SAM_API_KEY || !hasQuota(1)) return null;
  try {
    const data = await samFetch(async () => {
      const res = await axios.get(SAM_ENTITY_URL, {
        params: { ueiSAM: uei, includeSections: 'pointsOfContact', api_key: SAM_API_KEY },
        timeout: 15000,
      });
      return res.data;
    });
    const entities = data?.entityData || [];
    if (!entities.length) return null;
    const pocs   = entities[0]?.pointsOfContact || {};
    const govPOC = pocs.governmentBusinessPOC   || {};
    const ebPOC  = pocs.electronicBusinessPOC    || {};
    const emails = dedupeEmails([govPOC.emailAddress, ebPOC.emailAddress].filter(Boolean));
    const phones = dedupePhones([govPOC.phoneNumber,  ebPOC.phoneNumber ].filter(Boolean));
    if (!emails.length && !phones.length) return null;
    return {
      emails, phones,
      contactPersonName:  [govPOC.firstName, govPOC.lastName].filter(Boolean).join(' ') ||
                          [ebPOC.firstName, ebPOC.lastName].filter(Boolean).join(' ') || null,
      contactPersonTitle: govPOC.title || ebPOC.title || null,
      emailSource: emails.length ? 'sam' : '',
      phoneSource: phones.length ? 'sam' : '',
    };
  } catch { return null; }
};

// ── Email/phone Method 2: Website scraping ────────────────────────────────────
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/'];

export const enrichFromWebsite = async (websiteUrl) => {
  if (!websiteUrl) return null;
  let base = websiteUrl.trim().replace(/\/$/, '');
  if (!base.startsWith('http')) base = 'https://' + base;

  const foundEmails = [];
  const foundPhones = [];

  for (const path of CONTACT_PATHS) {
    try {
      const res = await axios.get(base + path, {
        timeout: 10000, maxRedirects: 4,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedProspect/1.0)' },
      });
      const $ = cheerio.load(res.data);
      $('script,style,noscript').remove();
      const text = $('body').text() + ' ' + res.data;
      const { emails, phones } = extractFromText(text);
      foundEmails.push(...emails);
      foundPhones.push(...phones);
      if (foundEmails.length && foundPhones.length) break;
      await sleep(1000);
    } catch { /* next path */ }
  }

  const emails = dedupeEmails(foundEmails);
  const phones = dedupePhones(foundPhones);
  if (!emails.length && !phones.length) return null;
  return {
    emails, phones,
    emailSource: emails.length ? 'website' : '',
    phoneSource: phones.length ? 'website' : '',
  };
};

// ── Email/phone Method 3: SBA DSBS ────────────────────────────────────────────
export const enrichFromSBA = async (companyName, cageCode) => {
  try {
    const res = await axios.get('https://web.sba.gov/pro-net/search/dsp_dsbs.cfm', {
      params: { tab: 'dsbs', SEARCH_OPT: 'C', COMPANY_NAME: companyName || '', CAGE: cageCode || '' },
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedProspect/1.0)' },
    });
    const $ = cheerio.load(res.data);
    const text = $('body').text();
    const { emails, phones } = extractFromText(text);
    if (!emails.length && !phones.length) return null;
    return {
      emails, phones,
      emailSource: emails.length ? 'sba' : '',
      phoneSource: phones.length ? 'sba' : '',
    };
  } catch { return null; }
};

// ── Email/phone Method 4: CAGE DLA ────────────────────────────────────────────
export const enrichFromCAGE = async (cageCode) => {
  if (!cageCode) return null;
  try {
    const res = await axios.get('https://cage.dla.mil/Foreign/Data', {
      params: { method: 'GET', requestType: 'cage', id: cageCode },
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FedProspect/1.0)', Accept: 'text/html,application/json' },
    });
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const { emails, phones } = extractFromText(text);
    if (!emails.length && !phones.length) return null;
    return {
      emails, phones,
      emailSource: emails.length ? 'cage' : '',
      phoneSource: phones.length ? 'cage' : '',
    };
  } catch { return null; }
};

// ── Master contact enrichment ─────────────────────────────────────────────────
export const enrichContacts = async (company) => {
  const methods = [
    () => enrichFromSAM(company.uei),
    () => enrichFromWebsite(company.website),
    () => enrichFromSBA(company.companyName, company.cageCode),
    () => enrichFromCAGE(company.cageCode),
  ];

  let allEmails = [], allPhones = [];
  let emailSource = '', phoneSource = '';
  let contactPersonName = null, contactPersonTitle = null;

  for (const method of methods) {
    if (allEmails.length && allPhones.length) break;
    try {
      const r = await method();
      if (!r) continue;
      if (r.emails?.length) {
        const merged = dedupeEmails([...allEmails, ...r.emails]);
        if (!allEmails.length && merged.length) emailSource = r.emailSource;
        allEmails = merged;
      }
      if (r.phones?.length) {
        const merged = dedupePhones([...allPhones, ...r.phones]);
        if (!allPhones.length && merged.length) phoneSource = r.phoneSource;
        allPhones = merged;
      }
      if (!contactPersonName  && r.contactPersonName)  contactPersonName  = r.contactPersonName;
      if (!contactPersonTitle && r.contactPersonTitle) contactPersonTitle = r.contactPersonTitle;
    } catch { /* continue */ }
  }

  const primaryEmail = allEmails[0] || null;
  const primaryPhone = allPhones[0] || null;
  const mailMeta     = primaryEmail ? validateEmail(primaryEmail) : null;

  return {
    primaryEmail, allEmails, emailSource,
    primaryPhone, allPhones, phoneSource, rawPhone: primaryPhone,
    emailVerified: false,
    isGovEmail:        mailMeta?.isGov        ?? false,
    isDisposableEmail: mailMeta?.isDisposable  ?? false,
    contactPersonName, contactPersonTitle,
  };
};
