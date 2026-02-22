import { marked } from 'marked';

export function markdownToHtml(md: string): string {
  const body = marked.parse(md, { async: false }) as string;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Investigation Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; color: #1a1a2e; background: #f8f9fa; }
  h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 0.5rem; }
  h2 { color: #0f3460; margin-top: 2rem; }
  h3 { color: #533483; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #dee2e6; }
  th { background: #0f3460; color: white; }
  tr:nth-child(even) { background: #e8eaf6; }
  code { background: #e3e3e3; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
  pre code { display: block; padding: 1rem; overflow-x: auto; }
  @media print { body { max-width: 100%; } }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
