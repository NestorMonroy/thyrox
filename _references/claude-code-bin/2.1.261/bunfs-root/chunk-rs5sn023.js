// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{U}from"/$bunfs/root/chunk-annedm50.js";import{um}from"/$bunfs/root/chunk-g2qb5pnr.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{W}from"/$bunfs/root/chunk-rdp33ner.js";import{_u}from"/$bunfs/root/chunk-y20r9r9e.js";import{h5,_5n}from"/$bunfs/root/chunk-vd630rs0.js";import{dirname as o,join as t}from"path";var dFn=1e4;function fFn(e){try{let n=um(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function pFn(e){let n=_5n(e,(r)=>{W("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)W("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":W("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function Ist(e){h5.of(U()).stage(e)}function mFn(e){h5.of(U()).markCopyCleared(e)}async function mQt(){let e=await _u();if(e)h5.of(U()).openGate();return e}
export{dFn,fFn,pFn,Ist,mFn,mQt};
