// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{vbt}from"/$bunfs/root/chunk-gjc2veaj.js";import{UN,wle}from"/$bunfs/root/chunk-ja309z9r.js";import{lt}from"/$bunfs/root/chunk-hhj7f7ny.js";import{Er}from"/$bunfs/root/chunk-53a5hn9r.js";import{Br}from"/$bunfs/root/chunk-btbsqzbn.js";import{Wm,IYn,qb,$Z}from"/$bunfs/root/chunk-dq7a6ndq.js";import{ty}from"/$bunfs/root/chunk-mr16m2ca.js";var Ry=(o,t,n)=>(n??lt().loadedModules).some((r)=>r.hooks(o)&&(t===void 0||Object.entries(t).every(([s,e])=>vbt(r.matcherFor(o),s,e))));function BEe(o){if(Br("hooks"))return[];let t=UN()?.[o]??[];if(qb())return t.filter((e)=>!("pluginRoot"in e)&&!("deviceOwner"in e));let n=Wm(),r=n&&!Er()?ty():null,s=IYn();return[...$Z()?.[o]??[],...n?[]:wle()?.[o]??[],...t.filter((e)=>!(n&&("pluginRoot"in e)&&!r?.has(e.pluginId))&&!(s&&("deviceOwner"in e)))]}function fKn(){return!Br("hooks")&&!qb()&&!Er()}var hfe=(o)=>o.link!==void 0;export{Ry,BEe,fKn,hfe};
