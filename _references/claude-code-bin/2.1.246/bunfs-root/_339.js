// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{ffb as c,gfb as j,hfb as f,jfb as T,mdb as a,odb as S,pdb as O}from"/$bunfs/root/_496.js";import{bgb as m,igb as P,pgb as d,xgb as y}from"/$bunfs/root/_499.js";import{EFc as p,nFc as g,sGc as x}from"/$bunfs/root/_701.js";import{jhd as l,ohd as E}from"/$bunfs/root/_820.js";import{xxd as b}from"/$bunfs/root/_837.js";async function M(){let n=p(),t=[],s=f();for(let[e,i]of Object.entries(s)){if(c(e))continue;if(e.includes("@")&&i)t.push(e)}if(n.enabledPlugins)for(let[e,i]of Object.entries(n.enabledPlugins)){if(!e.includes("@"))continue;let r=c(e)?S(e):i,o=t.indexOf(e);if(r){if(o===-1)t.push(e)}else if(o!==-1)t.splice(o,1)}return t}function N(){let n=new Map,t=f();for(let[e,i]of Object.entries(t)){if(!e.includes("@"))continue;if(c(e))continue;if(i===!0)n.set(e,"flag");else if(i===!1)n.delete(e)}let s=[{scope:"managed",source:"policySettings"},{scope:"user",source:"userSettings"},{scope:"project",source:"projectSettings"},{scope:"local",source:"localSettings"},{scope:"flag",source:"flagSettings"}];for(let{scope:e,source:i}of s){let r=g(i);if(!r?.enabledPlugins)continue;for(let[o,u]of Object.entries(r.enabledPlugins)){if(!o.includes("@"))continue;if(o in t&&t[o]!==u)l(`Plugin ${o} from --add-dir (${t[o]}) overridden by ${i} (${u})`);if(!a.includes(i)&&c(o))continue;if(u===!0)n.set(o,e);else if(u===!1)n.delete(o)}}return l(`Found ${n.size} enabled plugins with scopes: ${Array.from(n.entries()).map(([e,i])=>`${e}(${i})`).join(", ")}`),n}function R(n,t){let s=n.get(t);if(s!==void 0||!m(t))return s;let e=d(t);for(let[i,r]of n)if(d(i)===e)return r;return}function U(n){return P[n]}var F=b(()=>{E();x();j();T();O();y()});
export{M as hJ,N as iJ,R as jJ,U as kJ,F as lJ};
