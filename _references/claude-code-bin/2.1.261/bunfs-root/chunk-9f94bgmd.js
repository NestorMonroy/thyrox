// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{ty,As}from"/$bunfs/root/chunk-h3jmzymx.js";import{lme}from"/$bunfs/root/chunk-0112fw56.js";import{readFile as i}from"fs/promises";async function j9(t){if(!ty()){let r=lme();if(r.HTTPS_PROXY&&URL.parse(t)?.protocol==="https:"){let o;if(r.SSL_CERT_FILE)try{o=await i(r.SSL_CERT_FILE,"utf8")}catch(e){n(`MCP agent-proxy fallback: failed to read CA bundle: ${e instanceof Error?e.message:String(e)}`,{level:"warn"})}return As({url:t,fallbackProxy:{url:r.HTTPS_PROXY,noProxy:r.NO_PROXY,ca:o}})}}return As({url:t})}
export{j9};
