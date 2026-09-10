// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Ot}from"/$bunfs/root/chunk-1mrhsd7s.js";import{_o}from"/$bunfs/root/chunk-kn2qhfka.js";import{Hkt,Wge,zQ,HCe,Kcr}from"/$bunfs/root/chunk-vv5g97a8.js";import{execFile as s}from"child_process";var l=1e4,HIn=250,r=null,c;function O0r(){return c===!0}function N0r(e){c=e}function F0r(){return HCe().lastKnown}function B0r(e){HCe().lastKnown=e}function a(e){return new Promise((o)=>{try{s("security",["find-generic-password","-a",zQ(),"-w","-s",e],{encoding:"utf-8",timeout:l,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function wIn(){if(r||_o())return;let e=HCe(),o=e.generation;return}async function cet(e){if(!r)return;await(e===void 0?r:Ot(r,e))}function U0r(){let e=HCe().legacyApiKeyPrefetch;return e==="pending"?null:e}function V3t(){HCe().legacyApiKeyPrefetch=null}
export{HIn,O0r,N0r,F0r,B0r,wIn,cet,U0r,V3t};
