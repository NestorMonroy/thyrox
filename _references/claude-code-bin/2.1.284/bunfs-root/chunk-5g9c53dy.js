// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{ut,ce}from"/$bunfs/root/chunk-swk3rjnt.js";import{aH,Jge,QM,lH}from"/$bunfs/root/chunk-45s965ek.js";import{Sp}from"/$bunfs/root/chunk-p6y8pvpj.js";var Bqt="https://clau.de/chrome/permissions",l={install:aH,reconnect:Jge,permissions:Bqt};async function C6o({mcpClients:s}){let i=await lH().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=ce(),r=s.some((e)=>e.name===Sp&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:QM(),subscriber:ut(),wsl:a.isWslEnvironment(),installed:i,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,urls:{...l}}}
export{Bqt,C6o};
