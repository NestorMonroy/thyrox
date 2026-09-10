// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{Se,Je}from"/$bunfs/root/chunk-67nd7etf.js";import{PM,fUt,SH,ude}from"/$bunfs/root/chunk-qpwbvc04.js";import{fve,INe,pf}from"/$bunfs/root/chunk-sm4f0pvs.js";async function cce(){let n=Je(),i=[],r=ude();for(let[e,o]of Object.entries(r)){if(SH.isEnabledFromTrustedSettingsOnly(e))continue;if(e.includes("@")&&o)i.push(e)}if(n.enabledPlugins)for(let[e,o]of Object.entries(n.enabledPlugins)){if(!e.includes("@"))continue;let c=SH.isEnabledFromTrustedSettingsOnly(e)?fUt(e):o,s=i.indexOf(e);if(c){if(s===-1)i.push(e)}else if(s!==-1)i.splice(s,1)}return i}function _F(){let n=new Map,i=ude();for(let[e,o]of Object.entries(i)){if(!e.includes("@"))continue;if(SH.isEnabledFromTrustedSettingsOnly(e))continue;if(o===!0)n.set(e,"flag");else if(o===!1)n.delete(e)}let r=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:o}of r){let c=Se(o);if(!c?.enabledPlugins)continue;for(let[s,u]of Object.entries(c.enabledPlugins)){if(!s.includes("@"))continue;if(s in i&&i[s]!==u)t(`Plugin ${s} from --add-dir (${i[s]}) overridden by ${o} (${u})`);if(!PM.includes(o)&&SH.isEnabledFromTrustedSettingsOnly(s))continue;if(u===!0)n.set(s,e);else if(u===!1)n.delete(s)}}return t(`Found ${n.size} enabled plugins with scopes: ${Array.from(n.entries()).map(([e,o])=>`${e}(${o})`).join(", ")}`),n}function wVe(n,i){let r=n.get(i);if(r!==void 0||!fve(i))return r;let e=pf(i);for(let[o,c]of n)if(pf(o)===e)return c;return}function jIr(n){return INe[n]}
export{cce,_F,wVe,jIr};
