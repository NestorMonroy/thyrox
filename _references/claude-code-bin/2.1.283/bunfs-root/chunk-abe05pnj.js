// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{te}from"/$bunfs/root/chunk-ern0s5ks.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{Bb}from"/$bunfs/root/chunk-2r9e48vs.js";import{bRt,SRt,OQt}from"/$bunfs/root/chunk-csayct82.js";import{y5}from"/$bunfs/root/chunk-8h22rhhd.js";import{LY}from"/$bunfs/root/chunk-9mbp9m6d.js";function wtr(){let o=!1,e;return{get ready(){return o},whenReady:()=>e??=a().then(()=>{o=!0,m()})}}async function a(){let o=performance.now();try{y5()}catch(s){d(te(s))}let[e,r,i]=await Promise.all([n("the plugin-hook registration pass",async()=>{await SRt()}),n("the remote managed-settings load",LY),n("the policy-limits load",Bb)]);t(`[remote-tools] ready to judge calls after ${Math.round(performance.now()-o)}ms: waited ${e}ms for plugin hooks, ${r}ms for remote managed settings, ${i}ms for policy limits`)}async function n(o,e){let r=performance.now();try{await e()}catch(i){t(`[remote-tools] waiting for ${o} failed; serving goes on without it`,{level:"error"}),d(te(i))}return Math.round(performance.now()-r)}async function m(){try{let o=await bRt(!1)??await OQt();if(o!==void 0)t(`[remote-tools] plugin-delivered hooks are missing from the calls this machine serves, as from its own: ${o}`,{level:"error"})}catch(o){d(te(o))}}
export{wtr};
