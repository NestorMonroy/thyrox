// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{_m}from"/$bunfs/root/chunk-7r03n5n9.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{X}from"/$bunfs/root/chunk-n8g979s0.js";import{vu}from"/$bunfs/root/chunk-ksctmzwy.js";import{U8,E6n}from"/$bunfs/root/chunk-qpwbvc04.js";import{dirname as o,join as t}from"path";var RBn=1e4;function xBn(e){try{let n=_m(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function LBn(e){let n=E6n(e,(r)=>{X("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)X("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":X("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function qit(e){U8.of(z()).stage(e)}function PBn(e){U8.of(z()).markCopyCleared(e)}async function SZt(){let e=await vu();if(e)U8.of(z()).openGate();return e}
export{RBn,xBn,LBn,qit,PBn,SZt};
