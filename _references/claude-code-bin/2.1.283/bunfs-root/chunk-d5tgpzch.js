// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{pt,le}from"/$bunfs/root/chunk-t6pwageh.js";import{VO,ege,WM,qO}from"/$bunfs/root/chunk-5t3x93y6.js";import{ap}from"/$bunfs/root/chunk-zcjjnbh9.js";var f2t="https://clau.de/chrome/permissions",l={install:VO,reconnect:ege,permissions:f2t};async function Tqo({mcpClients:s}){let i=await qO().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=le(),r=s.some((e)=>e.name===ap&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:WM(),subscriber:pt(),wsl:a.isWslEnvironment(),installed:i,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,urls:{...l}}}
export{f2t,Tqo};
