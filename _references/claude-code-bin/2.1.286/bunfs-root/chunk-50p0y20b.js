// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{ct,ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{gM,xhe,hM,yM}from"/$bunfs/root/chunk-q6jg9kg6.js";import{Vc}from"/$bunfs/root/chunk-q9ewrsjj.js";var P4t="https://clau.de/chrome/permissions",l={install:gM,reconnect:xhe,permissions:P4t};async function hJo({mcpClients:s}){let i=await yM().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=ce(),r=s.some((e)=>e.name===Vc&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:hM(),subscriber:ct(),wsl:a.isWslEnvironment(),installed:i,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,urls:{...l}}}
export{P4t,hJo};
