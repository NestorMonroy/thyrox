// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{hm}from"/$bunfs/root/chunk-8qtdp828.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{J}from"/$bunfs/root/chunk-5wwsf42p.js";import{wd}from"/$bunfs/root/chunk-sv9rqq12.js";import{s8,t8n}from"/$bunfs/root/chunk-vw215j9f.js";import{dirname as o,join as t}from"path";var IOn=1e4;function ROn(e){try{let n=hm(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function xOn(e){let n=t8n(e,(r)=>{J("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)J("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":J("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function yot(e){s8.of(W()).stage(e)}function LOn(e){s8.of(W()).markCopyCleared(e)}async function n7t(){let e=await wd();if(e)s8.of(W()).openGate();return e}
export{IOn,ROn,xOn,yot,LOn,n7t};
