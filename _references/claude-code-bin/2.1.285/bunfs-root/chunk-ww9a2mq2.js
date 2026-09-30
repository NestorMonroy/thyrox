// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Z8n}from"/$bunfs/root/chunk-srhvbygf.js";import{VTe}from"/$bunfs/root/chunk-9v35ka7v.js";import{U}from"/$bunfs/root/chunk-ngh4qh6e.js";function X3t(r,s,t="replace"){r((n)=>{let e=n.alwaysDenyRules.command,o=t==="union"?U([...e??[],...s.filter((m)=>!Z8n.test(m))]):[...s];if((e?.length??0)===o.length&&(e??[]).every((m,a)=>m===o[a]))return n;return{...n,alwaysDenyRules:{...n.alwaysDenyRules,command:o.length>0?o:void 0}}})}function Ak(r){let s=r.trim();if(!s.startsWith("/"))return null;let{name:t,args:n}=VTe(s);if(!t)return null;let e="(MCP)";if(n===e)return{commandName:`${t} ${e}`,args:"",isMcp:!0};if(n.startsWith(e)&&/\s/.test(n.charAt(e.length)))return{commandName:`${t} ${e}`,args:n.slice(e.length).trimStart(),isMcp:!0};return{commandName:t,args:n,isMcp:!1}}function afe(r,s){if(!r.subcommands)return;let t=s.trimStart(),n=t.search(/\s/),e=n===-1?t:t.slice(0,n),o=e?r.subcommands[e.toLowerCase()]:void 0;if(o===void 0)return;let i=n===-1?"":t.slice(n+1).trim();if(r.subcommandsBareOnly&&i!=="")return;return{targetName:o,consumedToken:e,remainingArgs:i}}
export{X3t,Ak,afe};
