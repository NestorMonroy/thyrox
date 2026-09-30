// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{tbt}from"/$bunfs/root/chunk-k3k398q2.js";import{p$,Ace}from"/$bunfs/root/chunk-4qqe0nh4.js";import{dt}from"/$bunfs/root/chunk-26gtwdy5.js";import{Er}from"/$bunfs/root/chunk-6ghkw3jc.js";import{zr}from"/$bunfs/root/chunk-jmrhe0dv.js";import{tg,IQn,rS,xee}from"/$bunfs/root/chunk-drvv5mre.js";import{uy}from"/$bunfs/root/chunk-twssyc65.js";var eh=(o,t,n)=>(n??dt().loadedModules).some((r)=>r.hooks(o)&&(t===void 0||Object.entries(t).every(([s,e])=>tbt(r.matcherFor(o),s,e))));function rAe(o){if(zr("hooks"))return[];let t=p$()?.[o]??[];if(rS())return t.filter((e)=>!("pluginRoot"in e)&&!("deviceOwner"in e));let n=tg(),r=n&&!Er()?uy():null,s=IQn();return[...xee()?.[o]??[],...n?[]:Ace()?.[o]??[],...t.filter((e)=>!(n&&("pluginRoot"in e)&&!r?.has(e.pluginId))&&!(s&&("deviceOwner"in e)))]}function e8n(){return!zr("hooks")&&!rS()&&!Er()}var Cme=(o)=>o.link!==void 0;export{eh,rAe,e8n,Cme};
