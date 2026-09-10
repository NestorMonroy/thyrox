// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Ct}from"/$bunfs/root/chunk-r8601mcq.js";import{uo}from"/$bunfs/root/chunk-jmxayrtv.js";import{Okt,wge,SQ,fUe,Cir}from"/$bunfs/root/chunk-j0wk3h85.js";import{execFile as c}from"child_process";var s=1e4,FCn=250,r=null,l;function _br(){return l===!0}function bbr(){return fUe().lastKnown}function Sbr(e){fUe().lastKnown=e}function a(e){return new Promise((o)=>{try{c("security",["find-generic-password","-a",SQ(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function BCn(){if(r||uo())return;let e=fUe(),o=e.generation;return}async function aet(e){if(!r)return;await(e===void 0?r:Ct(r,e))}function y3t(){fUe().legacyApiKeyPrefetch=null}
export{FCn,_br,bbr,Sbr,BCn,aet,y3t};
