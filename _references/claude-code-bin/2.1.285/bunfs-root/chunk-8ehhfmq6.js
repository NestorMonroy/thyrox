// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ee}from"/$bunfs/root/chunk-vqpmen5t.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{Jb}from"/$bunfs/root/chunk-8hd2x81r.js";import{vIt,EIt,Hen}from"/$bunfs/root/chunk-qazw855w.js";import{r6}from"/$bunfs/root/chunk-h44wcpv1.js";import{C8}from"/$bunfs/root/chunk-mhkts1h2.js";function qor(){let o=!1,e;return{get ready(){return o},whenReady:()=>e??=a().then(()=>{o=!0,m()})}}async function a(){let o=performance.now();try{r6()}catch(s){u(ee(s))}let[e,r,i]=await Promise.all([n("the plugin-hook registration pass",async()=>{await EIt()}),n("the remote managed-settings load",C8),n("the policy-limits load",Jb)]);t(`[remote-tools] ready to judge calls after ${Math.round(performance.now()-o)}ms: waited ${e}ms for plugin hooks, ${r}ms for remote managed settings, ${i}ms for policy limits`)}async function n(o,e){let r=performance.now();try{await e()}catch(i){t(`[remote-tools] waiting for ${o} failed; serving goes on without it`,{level:"error"}),u(ee(i))}return Math.round(performance.now()-r)}async function m(){try{let o=await vIt(!1)??await Hen();if(o!==void 0)t(`[remote-tools] plugin-delivered hooks are missing from the calls this machine serves, as from its own: ${o}`,{level:"error"})}catch(o){u(ee(o))}}
export{qor};
