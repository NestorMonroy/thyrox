// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{_e,ze}from"/$bunfs/root/chunk-2e0agwm9.js";import{Z0,BWt}from"/$bunfs/root/chunk-mrf5e6kc.js";import{QR,wue}from"/$bunfs/root/chunk-vd630rs0.js";import{TOe,Ri}from"/$bunfs/root/chunk-g8wr27v4.js";async function Ile(){let o=ze(),t=[],r=wue();for(let[e,i]of Object.entries(r)){if(QR(e))continue;if(e.includes("@")&&i)t.push(e)}if(o.enabledPlugins)for(let[e,i]of Object.entries(o.enabledPlugins)){if(!e.includes("@"))continue;let c=QR(e)?BWt(e):i,s=t.indexOf(e);if(c){if(s===-1)t.push(e)}else if(s!==-1)t.splice(s,1)}return t}function oF(){let o=new Map,t=wue();for(let[e,i]of Object.entries(t)){if(!e.includes("@"))continue;if(QR(e))continue;if(i===!0)o.set(e,"flag");else if(i===!1)o.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of r){let c=_e(i);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in t&&t[s]!==u)n(`Plugin ${s} from --add-dir (${t[s]}) overridden by ${i} (${u})`);if(!Z0.includes(i)&&QR(s))continue;if(u===!0)o.set(s,e);else if(u===!1)o.delete(s)}}return n(`Found ${o.size} enabled plugins with scopes: ${Array.from(o.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),o}function BWe(o,t){let r=o.get(t);if(r!==void 0||!TOe(t))return r;let e=Ri(t);for(let[i,c]of o)if(Ri(i)===e)return c;return}export{Ile,oF,BWe};
