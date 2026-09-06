// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{U}from"/$bunfs/root/chunk-k6vqz9fa.js";import{um}from"/$bunfs/root/chunk-ebp189k1.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{W}from"/$bunfs/root/chunk-cy8hxjse.js";import{_u}from"/$bunfs/root/chunk-xf7dwt5f.js";import{_5,H5n}from"/$bunfs/root/chunk-9wa0ka8p.js";import{dirname as o,join as t}from"path";var mFn=1e4;function gFn(e){try{let n=um(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function hFn(e){let n=H5n(e,(r)=>{W("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)W("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":W("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function xst(e){_5.of(U()).stage(e)}function yFn(e){_5.of(U()).markCopyCleared(e)}async function gQt(){let e=await _u();if(e)_5.of(U()).openGate();return e}
export{mFn,gFn,hFn,xst,yFn,gQt};
