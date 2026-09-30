// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{Z}from"/$bunfs/root/chunk-dbjks79r.js";import{pee}from"/$bunfs/root/chunk-wbbthbh9.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new K(()=>new r);function a(){return s.of(W().host)}function _7n(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function Uht(){a().detachedSinceLastAttach=!0}function b7n(){return a().detachedSinceLastAttach}function hxe(){return a().stampMs}function Bht(e){return!1}async function Jzt(){for(;;){let e=Date.now();if(!Bht(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Z(Math.max(25,c)+25)}}
export{_7n,Uht,b7n,hxe,Bht,Jzt};
