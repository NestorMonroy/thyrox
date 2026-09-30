// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{P}from"/$bunfs/root/chunk-vq0drrah.js";import{lz}from"/$bunfs/root/chunk-0grnxhq4.js";import{_v}from"/$bunfs/root/chunk-ps9bsv64.js";var c=900000;class i{ms=void 0}var d=new q(()=>new i);function sPr(){let e=d.of(j().host);return e.ms??=a.CLAUDE_CODE_WEBFETCH_CACHE_TTL_MS??c,e.ms}function wWn(){let e=Math.max(1,Math.round(sPr()/60000));return`${e} ${P(e,"minute")}`}function u(e){switch(e){case"artifact-tool":return' claude.ai artifact links (claude.ai/artifact/{id} or claude.ai/code/artifact/{uuid}) are published artifacts: read them with the Artifact tool (action "read"), not WebFetch or curl.';case"webfetch":return" Exception: claude.ai artifact links (claude.ai/artifact/{id} or claude.ai/code/artifact/{uuid}) ARE fetchable via your claude.ai login \u2014 use WebFetch, not curl (curl gets the SPA shell or a Cloudflare 403).";case"none":return""}}function l(e){switch(e){case"artifact-tool":return`- claude.ai artifact links (claude.ai/artifact/{id} or claude.ai/code/artifact/{uuid}, including preview.claude.ai) are published artifacts: read them with the Artifact tool (action "read"), not WebFetch, curl or a headless browser.
`;case"webfetch":return`- Exception: claude.ai artifact links (claude.ai/artifact/{id} or claude.ai/code/artifact/{uuid}, including preview.claude.ai) ARE fetchable \u2014 WebFetch uses your claude.ai login. Use WebFetch for these, not curl or a headless browser (those return the SPA shell or a Cloudflare 403, not the content).
`;case"none":return""}}function DAo(e,t="none",r){if(_v({model:e,leanPrompt:r}))return`Fetches a URL, converts the page to markdown, and answers \`prompt\` against it using a small fast model.

- Fails on authenticated/private URLs \u2014 use an authenticated MCP tool or \`gh\` for those instead.${u(t)}
- Fails on localhost and other hostnames without a dot; for a local server, use curl via Bash.
- HTTP is upgraded to HTTPS. Cross-host redirects are returned to you rather than followed; call again with the redirect URL.
- Responses are cached for ${wWn()} per URL.`;return`IMPORTANT: WebFetch WILL FAIL for authenticated or private URLs. Before using this tool, check if the URL points to an authenticated service (e.g. Google Docs, Confluence, Jira, GitHub). If so, look for a specialized MCP tool that provides authenticated access.
${l(t)}${h()}`}function h(){return`
- Fetches content from a specified URL and processes it using an AI model
- Takes a URL and a prompt as input
- Fetches the URL content, converts HTML to markdown
- Processes the content with the prompt using a small, fast model
- Returns the model's response about the content
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions.
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - localhost and other hostnames without a dot are not supported; for a local server, use curl via Bash
  - The prompt should describe what information you want to extract from the page
  - This tool is read-only and does not modify any files
  - Results may be summarized if the content is very large
  - Includes a self-cleaning cache (entries expire after ${wWn()}) for faster responses when repeatedly accessing the same URL
