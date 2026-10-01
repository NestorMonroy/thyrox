// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Go}from"/$bunfs/root/chunk-3fx39wvj.js";import{ge}from"/$bunfs/root/chunk-j27hwf9z.js";import{rd,tb,hT}from"/$bunfs/root/chunk-t9e08syq.js";var eU=["userSettings","flagSettings","policySettings"];function Xne(t){let i=new Set(Go()),e=i7(t),n,r;for(let s of eU){if(!i.has(s))continue;let g=ge(s)?.pluginConfigs;for(let u of e){let o=g?.[u];if(o?.options)n={...n,...o.options};if(o?.mcpServers){r=r??{};for(let[l,c]of Object.entries(o.mcpServers))r[l]={...r[l],...c}}}}return{options:n,mcpServers:r}}function i7(t){let i=hT(t);if(i.length>0)return[...i.toReversed(),t];let e=`@${rd}`,n=t.endsWith(e)?t.slice(0,-e.length):"";return n!==""&&!n.includes("@")?[n,t]:[t]}function fgn(t){let i=new Set(Go()),e;for(let n of eU){if(!i.has(n))continue;let r=zG(ge(n)?.enabledPlugins,t);if(r!==void 0)e=r}return e}function omt(t,i){let e=tb(i),n=hT(e);if(n.length===0)return{deciding:i,written:i,replaced:[]};let r=n.filter((s)=>t?.[s]!==void 0);return{deciding:t?.[e]===void 0?r[0]??e:e,written:e,replaced:r}}function zG(t,i){let e=tb(i);return[e,...hT(e),i].map((n)=>t?.[n]).find((n)=>n!==void 0)}
export{eU,Xne,i7,fgn,omt,zG};
