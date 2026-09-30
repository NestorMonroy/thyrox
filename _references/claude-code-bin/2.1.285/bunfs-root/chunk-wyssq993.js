// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{it}from"/$bunfs/root/chunk-dmpcy5p5.js";import{fo}from"/$bunfs/root/chunk-v34cw0y6.js";import{__n,BBe,dY,pXe,Qjo,Zjo}from"/$bunfs/root/chunk-97mvw3mk.js";import{execFile as c}from"child_process";var l=1e4,kVr=250,o=null,u;function H7o(){return u===!0}function M7o(){return pXe().lastKnown}function D7o(n){pXe().lastKnown=n}function s(n){return new Promise((e)=>{try{c("security",["find-generic-password","-a",dY(),"-w","-s",n],{encoding:"utf-8",timeout:l,windowsHide:!0},(t,i)=>{let a=Boolean(t&&"killed"in t&&t.killed);e(a?null:{stdout:t?null:i?.trim()||null})})}catch{e(null)}})}function TVr(){let n=fo();if(o||n)return;let e=pXe(),t=e.generation;return}async function ujt(n){if(!o)return;await(n===void 0?o:it(o,n))}function A9n(){pXe().legacyApiKeyPrefetch=null}
export{kVr,H7o,M7o,D7o,TVr,ujt,A9n};
