// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{ye,Ke}from"/$bunfs/root/chunk-verj0kzw.js";import{HN,Ijn}from"/$bunfs/root/chunk-st5y2mpe.js";import{sN,kQ}from"/$bunfs/root/chunk-ga02wneq.js";import{Rat,ls}from"/$bunfs/root/chunk-g5a1w94e.js";async function Fxe(){let o=Ke(),n=[],r=kQ();for(let[e,i]of Object.entries(r)){if(sN(e))continue;if(e.includes("@")&&i)n.push(e)}if(o.enabledPlugins)for(let[e,i]of Object.entries(o.enabledPlugins)){if(!e.includes("@"))continue;let c=sN(e)?Ijn(e):i,s=n.indexOf(e);if(c){if(s===-1)n.push(e)}else if(s!==-1)n.splice(s,1)}return n}function E1(){let o=new Map,n=kQ();for(let[e,i]of Object.entries(n)){if(!e.includes("@"))continue;if(sN(e))continue;if(i===!0)o.set(e,"flag");else if(i===!1)o.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of r){let c=ye(i);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in n&&n[s]!==u)t(`Plugin ${s} from --add-dir (${n[s]}) overridden by ${i} (${u})`);if(!HN.includes(i)&&sN(s))continue;if(u===!0)o.set(s,e);else if(u===!1)o.delete(s)}}return t(`Found ${o.size} enabled plugins with scopes: ${Array.from(o.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),o}function Tyt(o,n){let r=o.get(n);if(r!==void 0||!Rat(n))return r;let e=ls(n);for(let[i,c]of o)if(ls(i)===e)return c;return}export{Fxe,E1,Tyt};
