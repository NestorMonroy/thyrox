// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{xm}from"/$bunfs/root/chunk-xe36t0b4.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{G}from"/$bunfs/root/chunk-aznf32zy.js";import{Ru}from"/$bunfs/root/chunk-rd7grmsv.js";import{O5,GJn}from"/$bunfs/root/chunk-yw4jc948.js";import{dirname as o,join as t}from"path";var t2n=1e4;function n2n(e){try{let n=xm(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function r2n(e){let n=GJn(e,(r)=>{G("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)G("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":G("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function dlt(e){O5.of(B()).stage(e)}function o2n(e){O5.of(B()).markCopyCleared(e)}async function onn(){let e=await Ru();if(e)O5.of(B()).openGate();return e}
export{t2n,n2n,r2n,dlt,o2n,onn};
