// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{he,Je}from"/$bunfs/root/chunk-ckctvm5v.js";import{W$,qVn}from"/$bunfs/root/chunk-zjmd7cfw.js";import{m$,ree}from"/$bunfs/root/chunk-5t3x93y6.js";import{Edt,gs}from"/$bunfs/root/chunk-krwpsn0e.js";async function nOe(){let o=Je(),n=[],r=ree();for(let[e,i]of Object.entries(r)){if(m$(e))continue;if(e.includes("@")&&i)n.push(e)}if(o.enabledPlugins)for(let[e,i]of Object.entries(o.enabledPlugins)){if(!e.includes("@"))continue;let c=m$(e)?qVn(e):i,s=n.indexOf(e);if(c){if(s===-1)n.push(e)}else if(s!==-1)n.splice(s,1)}return n}function qj(){let o=new Map,n=ree();for(let[e,i]of Object.entries(n)){if(!e.includes("@"))continue;if(m$(e))continue;if(i===!0)o.set(e,"flag");else if(i===!1)o.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of r){let c=he(i);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in n&&n[s]!==u)t(`Plugin ${s} from --add-dir (${n[s]}) overridden by ${i} (${u})`);if(!W$.includes(i)&&m$(s))continue;if(u===!0)o.set(s,e);else if(u===!1)o.delete(s)}}return t(`Found ${o.size} enabled plugins with scopes: ${Array.from(o.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),o}function LSt(o,n){let r=o.get(n);if(r!==void 0||!Edt(n))return r;let e=gs(n);for(let[i,c]of o)if(gs(i)===e)return c;return}export{nOe,qj,LSt};
