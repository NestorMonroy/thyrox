// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{te}from"/$bunfs/root/chunk-31aa9k3a.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{tS}from"/$bunfs/root/chunk-r6pra6tq.js";import{EPt,kPt,otn}from"/$bunfs/root/chunk-77kn462z.js";import{X3}from"/$bunfs/root/chunk-hq9mtezn.js";import{b8}from"/$bunfs/root/chunk-vayhanmp.js";function $or(){let o=!1,e;return{get ready(){return o},whenReady:()=>e??=a().then(()=>{o=!0,m()})}}async function a(){let o=performance.now();try{X3()}catch(s){d(te(s))}let[e,r,i]=await Promise.all([n("the plugin-hook registration pass",async()=>{await kPt()}),n("the remote managed-settings load",b8),n("the policy-limits load",tS)]);t(`[remote-tools] ready to judge calls after ${Math.round(performance.now()-o)}ms: waited ${e}ms for plugin hooks, ${r}ms for remote managed settings, ${i}ms for policy limits`)}async function n(o,e){let r=performance.now();try{await e()}catch(i){t(`[remote-tools] waiting for ${o} failed; serving goes on without it`,{level:"error"}),d(te(i))}return Math.round(performance.now()-r)}async function m(){try{let o=await EPt(!1)??await otn();if(o!==void 0)t(`[remote-tools] plugin-delivered hooks are missing from the calls this machine serves, as from its own: ${o}`,{level:"error"})}catch(o){d(te(o))}}
export{$or};
