// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{ge,Ye}from"/$bunfs/root/chunk-g6a51st9.js";import{_pt,Uo}from"/$bunfs/root/chunk-2sb5hqyj.js";import{Z$,fte}from"/$bunfs/root/chunk-9v35ka7v.js";import{TF,Opn}from"/$bunfs/root/chunk-wz829bsy.js";async function iHe(){let o=Ye(),n=[],r=fte();for(let[e,i]of Object.entries(r)){if(Z$(e))continue;if(e.includes("@")&&i)n.push(e)}if(o.enabledPlugins)for(let[e,i]of Object.entries(o.enabledPlugins)){if(!e.includes("@"))continue;let c=Z$(e)?Opn(e):i,s=n.indexOf(e);if(c){if(s===-1)n.push(e)}else if(s!==-1)n.splice(s,1)}return n}function fW(){let o=new Map,n=fte();for(let[e,i]of Object.entries(n)){if(!e.includes("@"))continue;if(Z$(e))continue;if(i===!0)o.set(e,"flag");else if(i===!1)o.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of r){let c=ge(i);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in n&&n[s]!==u)t(`Plugin ${s} from --add-dir (${n[s]}) overridden by ${i} (${u})`);if(!TF.includes(i)&&Z$(s))continue;if(u===!0)o.set(s,e);else if(u===!1)o.delete(s)}}return t(`Found ${o.size} enabled plugins with scopes: ${Array.from(o.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),o}function Fvt(o,n){let r=o.get(n);if(r!==void 0||!_pt(n))return r;let e=Uo(n);for(let[i,c]of o)if(Uo(i)===e)return c;return}export{iHe,fW,Fvt};
