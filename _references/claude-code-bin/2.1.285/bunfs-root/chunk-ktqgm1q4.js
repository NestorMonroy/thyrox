// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{a}from"/$bunfs/root/chunk-5054mktj.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{ut,ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{wH,Ohe,vH,EH}from"/$bunfs/root/chunk-9v35ka7v.js";import{Uc}from"/$bunfs/root/chunk-r5cqbqz1.js";var Iqt="https://clau.de/chrome/permissions",l={install:wH,reconnect:Ohe,permissions:Iqt};async function L6o({mcpClients:s}){let i=await EH().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=ce(),r=s.some((e)=>e.name===Uc&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:vH(),subscriber:ut(),wsl:a.isWslEnvironment(),installed:i,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,urls:{...l}}}
export{Iqt,L6o};
