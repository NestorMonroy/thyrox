// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{at}from"/$bunfs/root/chunk-bg5yf16b.js";import{Rr}from"/$bunfs/root/chunk-xz4v1m80.js";import{XSn,J1e,MY,UJe,MVo,HVo}from"/$bunfs/root/chunk-ne76aw40.js";import{execFile as c}from"child_process";var l=1e4,l5r=250,o=null,u;function gns(){return u===!0}function hns(){return UJe().lastKnown}function yns(n){UJe().lastKnown=n}function s(n){return new Promise((e)=>{try{c("security",["find-generic-password","-a",MY(),"-w","-s",n],{encoding:"utf-8",timeout:l,windowsHide:!0},(t,i)=>{let a=Boolean(t&&"killed"in t&&t.killed);e(a?null:{stdout:t?null:i?.trim()||null})})}catch{e(null)}})}function c5r(){let n=Rr();if(o||n)return;let e=UJe(),t=e.generation;return}async function Szt(n){if(!o)return;await(n===void 0?o:at(o,n))}function O7n(){UJe().legacyApiKeyPrefetch=null}
export{l5r,gns,hns,yns,c5r,Szt,O7n};
