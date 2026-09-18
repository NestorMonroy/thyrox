// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Rp}from"/$bunfs/root/chunk-g7fm0c2g.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{Y}from"/$bunfs/root/chunk-hj17majf.js";import{$d}from"/$bunfs/root/chunk-hyvcg9v5.js";import{A8,SFr}from"/$bunfs/root/chunk-q2gh92k2.js";import{dirname as o,join as t}from"path";var Chr=1e4;function Rhr(e){try{let n=Rp(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function xhr(e){let n=SFr(e,(r)=>{Y("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)Y("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":Y("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function nCt(e){A8.of(W()).stage(e)}function Ihr(e){A8.of(W()).markCopyCleared(e)}async function MIn(){let e=await $d();if(e)A8.of(W()).openGate();return e}
export{Chr,Rhr,xhr,nCt,Ihr,MIn};
