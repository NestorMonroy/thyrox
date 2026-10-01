// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V,j}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Z}from"/$bunfs/root/chunk-bg5yf16b.js";import{pre}from"/$bunfs/root/chunk-4hjp8tw4.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new V(()=>new r);function a(){return s.of(j().host)}function _cr(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function WEt(){a().detachedSinceLastAttach=!0}function bcr(){return a().detachedSinceLastAttach}function YMe(){return a().stampMs}function zEt(e){return!1}async function c6t(){for(;;){let e=Date.now();if(!zEt(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Z(Math.max(25,c)+25)}}
export{_cr,WEt,bcr,YMe,zEt,c6t};
