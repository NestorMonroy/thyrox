// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{jAb as k,nAb as H,oAb as M,uAb as b,vAb as w}from"/$bunfs/root/_553.js";import{_2b as m,a3b as I}from"/$bunfs/root/_631.js";import{nFc as l,sGc as S}from"/$bunfs/root/_701.js";import{cid as p,nid as v}from"/$bunfs/root/_824.js";import{$rd as f,atd as P,urd as c}from"/$bunfs/root/_826.js";import{Nvd as g,dwd as y}from"/$bunfs/root/_832.js";import{xxd as s}from"/$bunfs/root/_837.js";function x(){let o=l("policySettings")?.enabledPlugins;if(!o)return null;let e=new Set;for(let[n,r]of Object.entries(o)){if(typeof r!=="boolean"||!n.includes("@"))continue;let i=g(n,"@");if(i)e.add(i)}return e.size>0?e:null}function u(){let o=l("policySettings")?.enabledPlugins;if(!o)return null;let e=new Set;for(let[n,r]of Object.entries(o))if(r===!0&&n.includes("@"))e.add(n);return e.size>0?e:null}var d=s(()=>{S();y()});function a(o){if(m("hooks"))return[];let e=c()?.[o]??[];if(M())return e.filter((t)=>!("pluginRoot"in t)&&!("deviceOwner"in t));let n=k(),r=n&&!p()?u():null,i=H();return[...b()?.[o]??[],...n?[]:f()?.[o]??[],...e.filter((t)=>!(n&&("pluginRoot"in t)&&!r?.has(t.pluginId))&&!(i&&("deviceOwner"in t)))]}var h=s(()=>{P();I();v();d();w()});function N(){return a("WorktreeCreate").length>0}function q(){return a("WorktreeRemove").length>0}var C=s(()=>{h()});
export{x as bkb,u as ckb,d as dkb,a as ekb,h as fkb,N as gkb,q as hkb,C as ikb};
