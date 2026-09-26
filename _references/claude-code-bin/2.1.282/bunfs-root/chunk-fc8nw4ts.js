// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{gt,le}from"/$bunfs/root/chunk-wbbthbh9.js";import{aH,efe,JO,lH}from"/$bunfs/root/chunk-ga02wneq.js";import{Ku}from"/$bunfs/root/chunk-y4mk2fp1.js";var gWt="https://clau.de/chrome/permissions",l={install:aH,reconnect:efe,permissions:gWt};async function CFo({mcpClients:s}){let i=await lH().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=le(),r=s.some((e)=>e.name===Ku&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:JO(),subscriber:gt(),wsl:a.isWslEnvironment(),installed:i,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,urls:{...l}}}
export{gWt,CFo};
