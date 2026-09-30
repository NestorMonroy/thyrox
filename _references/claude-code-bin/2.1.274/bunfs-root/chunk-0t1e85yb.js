// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{G}from"/$bunfs/root/chunk-ja309z9r.js";import{vp}from"/$bunfs/root/chunk-sw4c8z6t.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{Y}from"/$bunfs/root/chunk-y669ewnb.js";import{Ed}from"/$bunfs/root/chunk-3hnftzya.js";import{M5,zOr}from"/$bunfs/root/chunk-ayyj05ne.js";import{dirname as o,join as t}from"path";var Vur=1e4;function Kur(e){try{let n=vp(a.CLAUDE_CODE_REMOTE_SESSION_ID??"","remote session id");return{sessionId:n,path:t(o(e),".ccr-dir-sync",`worker-${n}.json`)}}catch{return null}}function Yur(e){let n=zOr(e,(r)=>{Y("error","dir_sync_lane_verdict_listener_threw",{verdict:e,rejected:!0,first:r})});switch(n.kind){case"delivered":if(n.threw.length>0)Y("error","dir_sync_lane_verdict_listener_threw",{verdict:e,listeners:n.listeners,threw:n.threw.length,first:n.threw[0]});return;case"out_of_order":Y("error","dir_sync_lane_verdict_out_of_order",{verdict:e,basis:n.basis});return;case"repeat":case"queued":return}}function pkt(e){M5.of(G()).stage(e)}function Xur(e){M5.of(G()).markCopyCleared(e)}async function cTn(){let e=await Ed();if(e)M5.of(G()).openGate();return e}
export{Vur,Kur,Yur,pkt,Xur,cTn};
