// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{a}from"/$bunfs/root/chunk-ay603yys.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{pt,le}from"/$bunfs/root/chunk-5khn4tvf.js";import{jP,tpe,CO,WP}from"/$bunfs/root/chunk-adsaemws.js";import{Np}from"/$bunfs/root/chunk-y74ng6zn.js";var kBt="https://clau.de/chrome/permissions",l={install:jP,reconnect:tpe,permissions:kBt};async function Q0o({mcpClients:s}){let i=await WP().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=le(),r=s.some((e)=>e.name===Np&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:CO(),subscriber:pt(),wsl:a.isWslEnvironment(),installed:i,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,urls:{...l}}}
export{kBt,Q0o};
