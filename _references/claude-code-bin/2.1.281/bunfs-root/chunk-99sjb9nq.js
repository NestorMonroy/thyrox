// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{ye,Ke}from"/$bunfs/root/chunk-pw35yar9.js";import{gN,sUn}from"/$bunfs/root/chunk-zp55ksfn.js";import{IL,b7}from"/$bunfs/root/chunk-adsaemws.js";import{Wst,es}from"/$bunfs/root/chunk-wrhs39mg.js";async function mRe(){let o=Ke(),n=[],r=b7();for(let[e,i]of Object.entries(r)){if(IL(e))continue;if(e.includes("@")&&i)n.push(e)}if(o.enabledPlugins)for(let[e,i]of Object.entries(o.enabledPlugins)){if(!e.includes("@"))continue;let c=IL(e)?sUn(e):i,s=n.indexOf(e);if(c){if(s===-1)n.push(e)}else if(s!==-1)n.splice(s,1)}return n}function JB(){let o=new Map,n=b7();for(let[e,i]of Object.entries(n)){if(!e.includes("@"))continue;if(IL(e))continue;if(i===!0)o.set(e,"flag");else if(i===!1)o.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of r){let c=ye(i);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in n&&n[s]!==u)t(`Plugin ${s} from --add-dir (${n[s]}) overridden by ${i} (${u})`);if(!gN.includes(i)&&IL(s))continue;if(u===!0)o.set(s,e);else if(u===!1)o.delete(s)}}return t(`Found ${o.size} enabled plugins with scopes: ${Array.from(o.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),o}function Ogt(o,n){let r=o.get(n);if(r!==void 0||!Wst(n))return r;let e=es(n);for(let[i,c]of o)if(es(i)===e)return c;return}export{mRe,JB,Ogt};
