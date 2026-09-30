// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{TMo}from"/$bunfs/root/chunk-t6pwageh.js";import{oc}from"/$bunfs/root/chunk-379zyrv7.js";import{V4}from"/$bunfs/root/chunk-csayct82.js";import{cc}from"/$bunfs/root/chunk-fx6t9q98.js";import{Zu}from"/$bunfs/root/chunk-we3dq8fh.js";function v7e(e,n,t){return()=>{if(t?.aborted===!0)return;let r=n();return e.getCommandQueueSnapshot().some(s)||e.someSubmissionInFlight((i)=>o(i,r))||(t===void 0?e.getInFlightDrainBatchStanding()!=="appended"&&e.someInFlightDrainCommand((i)=>o(i,r)):e.getInFlightDrainBatchStanding()==="passed-over"&&e.someInFlightDrainCommand(s))?void 0:r}}function o(e,n){return s(e)&&(e.uuid===void 0||n.findLast((t)=>t.uuid===e.uuid)===void 0)}function s(e){if(!cc(e))return!1;switch(e.mode){case"task-notification":return!1;case"poll-event":{let n=e.pollEvent?.provenance?.authority;return n!==void 0&&n!=="peer-agent"&&n!=="world-event"}case"prompt":case"bash":return TMo(e);case"orphaned-permission":return!0}return!0}function fqt({recipientName:e,leaderMode:n,proactivityLevel:t,tasks:r}){let i=d(e,r)?n:V4(n,t),a=oc(i);return a==="plan"?"default":a}function d(e,n){return Object.values(n).some((t)=>Zu(t)&&t.status==="running"&&t.identity.agentName===e&&t.paneTeardown===void 0&&t.identity.resumableAgentId!==void 0)}
export{v7e,fqt};
