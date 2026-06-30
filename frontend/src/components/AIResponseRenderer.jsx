import { useMemo } from 'react';

function convertMarkdownToHTML(text) {
  if (!text) return '';
  let html = text
    // Headers: ## → bold colored heading
    .replace(/^#{1,3}\s+(.+)$/gm, '<h3 class="ai-heading">$1</h3>')
    // Bold: **text** → <b>
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    // Italic: *text* → <em> (but not inside bold)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Horizontal rule: --- or ═══
    .replace(/^[-─═]{3,}$/gm, '<hr class="ai-hr"/>')
    // Tables: | col | col | → HTML table
    .replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/gm, (_, headerRow, __, bodyRows) => {
      const headers = headerRow.split('|').filter(c => c.trim()).map(c =>
        `<th class="ai-th">${c.trim().replace(/\*\*/g, '')}</th>`
      ).join('');
      const rows = bodyRows.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c =>
          `<td class="ai-td">${c.trim()}</td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<div class="ai-table-wrap"><table class="ai-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    // Bullet points: - text or • text → clean list
    .replace(/^[\s]*[-•*]\s+(.+)$/gm, '<li class="ai-li">$1</li>')
    // Numbered lists: 1. text → clean list
    .replace(/^[\s]*(\d+)[.)]\s+(.+)$/gm, '<li class="ai-li-num" value="$1">$2</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li class="ai-li">[^]*?<\/li>\n?)+)/g, '<ul class="ai-ul">$1</ul>')
    .replace(/((?:<li class="ai-li-num"[^]*?<\/li>\n?)+)/g, '<ol class="ai-ol">$1</ol>')
    // Inline code: `text` → styled span
    .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ai-link" target="_blank" rel="noopener noreferrer">$1</a>')
    // Paragraphs: double newline → paragraph break
    .replace(/\n{2,}/g, '</p><p class="ai-p">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');

  // Wrap in paragraph tags
  html = `<p class="ai-p">${html}</p>`;
  // Clean empty paragraphs
  html = html.replace(/<p class="ai-p"><\/p>/g, '');
  html = html.replace(/<p class="ai-p"><br\/>/g, '<p class="ai-p">');
  // Strip script tags for safety
  html = html.replace(/<script[^>]*>.*?<\/script>/gi, '');

  return html;
}

const STYLES = `
.ai-response h3.ai-heading {
  font-size: 0.95rem;
  font-weight: 700;
  color: #312e81;
  margin: 1.2rem 0 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid #e0e7ff;
}
.ai-response h3.ai-heading:first-child {
  margin-top: 0;
}
.ai-response .ai-p {
  margin: 0.4rem 0;
  line-height: 1.65;
}
.ai-response hr.ai-hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1rem 0;
}
.ai-response b {
  font-weight: 700;
  color: #1e1b4b;
}
.ai-response em {
  font-style: italic;
  color: #4338ca;
}
.ai-response .ai-ul, .ai-response .ai-ol {
  margin: 0.5rem 0;
  padding-left: 0;
  list-style: none;
}
.ai-response .ai-li, .ai-response .ai-li-num {
  position: relative;
  padding: 0.35rem 0 0.35rem 1.5rem;
  line-height: 1.55;
}
.ai-response .ai-li::before {
  content: '';
  position: absolute;
  left: 0.35rem;
  top: 0.75rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
}
.ai-response .ai-li-num {
  counter-increment: ai-step;
}
.ai-response .ai-ol {
  counter-reset: ai-step;
}
.ai-response .ai-li-num::before {
  content: counter(ai-step);
  position: absolute;
  left: 0;
  top: 0.3rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 50%;
  background: #4f46e5;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-response .ai-table-wrap {
  overflow-x: auto;
  margin: 0.75rem 0;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}
.ai-response .ai-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.ai-response .ai-th {
  background: #f1f5f9;
  font-weight: 700;
  color: #334155;
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}
.ai-response .ai-td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
  vertical-align: top;
}
.ai-response .ai-table tr:nth-child(even) {
  background: #f8fafc;
}
.ai-response .ai-code {
  background: #f1f5f9;
  color: #4338ca;
  padding: 0.1rem 0.4rem;
  border-radius: 0.3rem;
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}
.ai-response .ai-link {
  color: #4f46e5;
  text-decoration: underline;
  font-weight: 600;
}
.ai-response .ai-link:hover {
  color: #3730a3;
}
`;

export default function AIResponseRenderer({ content, className = '' }) {
  const html = useMemo(() => convertMarkdownToHTML(content), [content]);

  return (
    <>
      <style>{STYLES}</style>
      <div
        className={`ai-response text-sm text-gray-700 leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
