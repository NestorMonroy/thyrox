// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{q,j}from"/$bunfs/root/chunk-d37h8mav.js";import{Z}from"/$bunfs/root/chunk-bz96yhka.js";import{Ine}from"/$bunfs/root/chunk-swk3rjnt.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new q(()=>new r);function a(){return s.of(j().host)}function _ir(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function Bwt(){a().detachedSinceLastAttach=!0}function bir(){return a().detachedSinceLastAttach}function qOe(){return a().stampMs}function jwt(e){return!1}async function s5t(){for(;;){let e=Date.now();if(!jwt(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Z(Math.max(25,c)+25)}}
export{_ir,Bwt,bir,qOe,jwt,s5t};
