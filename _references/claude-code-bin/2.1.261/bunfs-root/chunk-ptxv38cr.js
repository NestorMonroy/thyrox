// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Ct}from"/$bunfs/root/chunk-91n3hqvz.js";import{uo}from"/$bunfs/root/chunk-fvzv4ke0.js";import{Mkt,Hge,_Q,dUe,vir}from"/$bunfs/root/chunk-stk161y4.js";import{execFile as c}from"child_process";var s=1e4,OCn=250,r=null,l;function gbr(){return l===!0}function hbr(){return dUe().lastKnown}function ybr(e){dUe().lastKnown=e}function a(e){return new Promise((o)=>{try{c("security",["find-generic-password","-a",_Q(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function NCn(){if(r||uo())return;let e=dUe(),o=e.generation;return}async function aet(e){if(!r)return;await(e===void 0?r:Ct(r,e))}function h3t(){dUe().legacyApiKeyPrefetch=null}
export{OCn,gbr,hbr,ybr,NCn,aet,h3t};
