// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{y$,W7e,qSe}from"/$bunfs/root/chunk-hbjpbz2q.js";import{vr}from"/$bunfs/root/chunk-xz4v1m80.js";import{Fr}from"/$bunfs/root/chunk-1yjbgjf5.js";import{ay,r3n,VUr,fS,R6}from"/$bunfs/root/chunk-xfr8sb9t.js";import{y_}from"/$bunfs/root/chunk-8gjb4ft4.js";function lAe(o){if(Fr("hooks"))return[];let e=y$()?.[o]??[];if(fS())return e.filter((n)=>!("pluginRoot"in n)&&!("deviceOwner"in n));let i=g(),{managedOnly:t,managedPluginIds:r}=i,l=VUr(),s=W7e();return[...R6()?.[o]??[],...t?[]:qSe()?.[o]??[],...e.filter((n)=>a(n)&&s?.holds(n.pluginId)===!0?!(r3n()&&!r?.has(n.pluginId)):(!("pluginRoot"in n)||u(n.pluginId,i))&&!(l&&("deviceOwner"in n)))]}function a(o){return"pluginRoot"in o&&o.hooks.every((e)=>e.type==="command")}function g(){let o=ay();return{managedOnly:o,managedPluginIds:o&&!vr()?y_():null}}function u(o,{managedOnly:e,managedPluginIds:i}){return!e||i?.has(o)===!0}function fHr(){return!Fr("hooks")&&!fS()&&!vr()}
export{lAe,fHr};
