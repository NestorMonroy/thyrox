// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{WN,Lht,Kbe}from"/$bunfs/root/chunk-bxhyh54r.js";import{br}from"/$bunfs/root/chunk-v34cw0y6.js";import{Dr}from"/$bunfs/root/chunk-qgp49r9g.js";import{Gh,Zqn,kNr,Xb,r6}from"/$bunfs/root/chunk-h44wcpv1.js";import{fb}from"/$bunfs/root/chunk-d7tms3ge.js";function Kke(o){if(Dr("hooks"))return[];let e=WN()?.[o]??[];if(Xb())return e.filter((n)=>!("pluginRoot"in n)&&!("deviceOwner"in n));let i=g(),{managedOnly:t,managedPluginIds:r}=i,l=kNr(),s=Lht();return[...r6()?.[o]??[],...t?[]:Kbe()?.[o]??[],...e.filter((n)=>a(n)&&s?.holds(n.pluginId)===!0?!(Zqn()&&!r?.has(n.pluginId)):(!("pluginRoot"in n)||u(n.pluginId,i))&&!(l&&("deviceOwner"in n)))]}function a(o){return"pluginRoot"in o&&o.hooks.every((e)=>e.type==="command")}function g(){let o=Gh();return{managedOnly:o,managedPluginIds:o&&!br()?fb():null}}function u(o,{managedOnly:e,managedPluginIds:i}){return!e||i?.has(o)===!0}function TCr(){return!Dr("hooks")&&!Xb()&&!br()}
export{Kke,TCr};
