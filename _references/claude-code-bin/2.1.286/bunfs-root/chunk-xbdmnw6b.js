// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ee}from"/$bunfs/root/chunk-ctczby4m.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{mS}from"/$bunfs/root/chunk-9pha98ah.js";import{pOt,fOt,nrn}from"/$bunfs/root/chunk-kt4703ww.js";import{R6}from"/$bunfs/root/chunk-xfr8sb9t.js";import{Z8}from"/$bunfs/root/chunk-bedywnkf.js";function Far(){let o=!1,e;return{get ready(){return o},whenReady:()=>e??=a().then(()=>{o=!0,m()})}}async function a(){let o=performance.now();try{R6()}catch(s){d(ee(s))}let[e,r,i]=await Promise.all([n("the plugin-hook registration pass",async()=>{await fOt()}),n("the remote managed-settings load",Z8),n("the policy-limits load",mS)]);t(`[remote-tools] ready to judge calls after ${Math.round(performance.now()-o)}ms: waited ${e}ms for plugin hooks, ${r}ms for remote managed settings, ${i}ms for policy limits`)}async function n(o,e){let r=performance.now();try{await e()}catch(i){t(`[remote-tools] waiting for ${o} failed; serving goes on without it`,{level:"error"}),d(ee(i))}return Math.round(performance.now()-r)}async function m(){try{let o=await pOt(!1)??await nrn();if(o!==void 0)t(`[remote-tools] plugin-delivered hooks are missing from the calls this machine serves, as from its own: ${o}`,{level:"error"})}catch(o){d(ee(o))}}
export{Far};
