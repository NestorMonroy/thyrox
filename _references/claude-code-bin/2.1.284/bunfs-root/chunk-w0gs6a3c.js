// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{he,Je}from"/$bunfs/root/chunk-r03mjfax.js";import{Cpt,Zo}from"/$bunfs/root/chunk-pegpck1h.js";import{yF,R5n}from"/$bunfs/root/chunk-cgw854vf.js";import{W$,Fee}from"/$bunfs/root/chunk-45s965ek.js";async function fHe(){let o=Je(),n=[],r=Fee();for(let[e,i]of Object.entries(r)){if(W$(e))continue;if(e.includes("@")&&i)n.push(e)}if(o.enabledPlugins)for(let[e,i]of Object.entries(o.enabledPlugins)){if(!e.includes("@"))continue;let c=W$(e)?R5n(e):i,s=n.indexOf(e);if(c){if(s===-1)n.push(e)}else if(s!==-1)n.splice(s,1)}return n}function _W(){let o=new Map,n=Fee();for(let[e,i]of Object.entries(n)){if(!e.includes("@"))continue;if(W$(e))continue;if(i===!0)o.set(e,"flag");else if(i===!1)o.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of r){let c=he(i);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in n&&n[s]!==u)t(`Plugin ${s} from --add-dir (${n[s]}) overridden by ${i} (${u})`);if(!yF.includes(i)&&W$(s))continue;if(u===!0)o.set(s,e);else if(u===!1)o.delete(s)}}return t(`Found ${o.size} enabled plugins with scopes: ${Array.from(o.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),o}function Dvt(o,n){let r=o.get(n);if(r!==void 0||!Cpt(n))return r;let e=Zo(n);for(let[i,c]of o)if(Zo(i)===e)return c;return}export{fHe,_W,Dvt};
