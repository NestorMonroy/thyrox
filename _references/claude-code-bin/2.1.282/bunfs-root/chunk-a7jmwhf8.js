// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{yVn}from"/$bunfs/root/chunk-t6d3nxvc.js";import{Zwe}from"/$bunfs/root/chunk-ga02wneq.js";import{L}from"/$bunfs/root/chunk-2s9xnv72.js";function EVt(r,s,t="replace"){r((n)=>{let e=n.alwaysDenyRules.command,o=t==="union"?L([...e??[],...s.filter((m)=>!yVn.test(m))]):[...s];if((e?.length??0)===o.length&&(e??[]).every((m,a)=>m===o[a]))return n;return{...n,alwaysDenyRules:{...n.alwaysDenyRules,command:o.length>0?o:void 0}}})}function WE(r){let s=r.trim();if(!s.startsWith("/"))return null;let{name:t,args:n}=Zwe(s);if(!t)return null;let e="(MCP)";if(n===e)return{commandName:`${t} ${e}`,args:"",isMcp:!0};if(n.startsWith(e)&&/\s/.test(n.charAt(e.length)))return{commandName:`${t} ${e}`,args:n.slice(e.length).trimStart(),isMcp:!0};return{commandName:t,args:n,isMcp:!1}}function mde(r,s){if(!r.subcommands)return;let t=s.trimStart(),n=t.search(/\s/),e=n===-1?t:t.slice(0,n),o=e?r.subcommands[e.toLowerCase()]:void 0;if(o===void 0)return;let i=n===-1?"":t.slice(n+1).trim();if(r.subcommandsBareOnly&&i!=="")return;return{targetName:o,consumedToken:e,remainingArgs:i}}
export{EVt,WE,mde};
