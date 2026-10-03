// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{as}from"/$bunfs/root/chunk-xzfbbx57.js";import{ge}from"/$bunfs/root/chunk-g6a51st9.js";import{Dd,F_,nT}from"/$bunfs/root/chunk-2sb5hqyj.js";var TF=["userSettings","flagSettings","policySettings"];function mne(t){let i=new Set(as()),e=Fce(t),n,r;for(let s of TF){if(!i.has(s))continue;let g=ge(s)?.pluginConfigs;for(let u of e){let o=g?.[u];if(o?.options)n={...n,...o.options};if(o?.mcpServers){r=r??{};for(let[l,c]of Object.entries(o.mcpServers))r[l]={...r[l],...c}}}}return{options:n,mcpServers:r}}function Fce(t){let i=nT(t);if(i.length>0)return[...i.toReversed(),t];let e=`@${Dd}`,n=t.endsWith(e)?t.slice(0,-e.length):"";return n!==""&&!n.includes("@")?[n,t]:[t]}function Opn(t){let i=new Set(as()),e;for(let n of TF){if(!i.has(n))continue;let r=g2(ge(n)?.enabledPlugins,t);if(r!==void 0)e=r}return e}function fpt(t,i){let e=F_(i),n=nT(e);if(n.length===0)return{deciding:i,written:i,replaced:[]};let r=n.filter((s)=>t?.[s]!==void 0);return{deciding:t?.[e]===void 0?r[0]??e:e,written:e,replaced:r}}function g2(t,i){let e=F_(i);return[e,...nT(e),i].map((n)=>t?.[n]).find((n)=>n!==void 0)}
export{TF,mne,Fce,Opn,fpt,g2};
