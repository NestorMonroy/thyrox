// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{re}from"/$bunfs/root/chunk-td0fv71w.js";import{Pq}from"/$bunfs/root/chunk-8qt7d28b.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new Y(()=>new r);function a(){return s.of(W().host)}function Rln(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function ZKe(){a().detachedSinceLastAttach=!0}function xln(){return a().detachedSinceLastAttach}function Bce(){return a().stampMs}function e4e(e){return!1}async function zdt(){for(;;){let e=Date.now();if(!e4e(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await re(Math.max(25,c)+25)}}
export{Rln,ZKe,xln,Bce,e4e,zdt};
