// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{Z}from"/$bunfs/root/chunk-rfvh2b8a.js";import{_4}from"/$bunfs/root/chunk-btbsn9s4.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new z(()=>new r);function a(){return s.of(B().host)}function Vun(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function v6e(){a().detachedSinceLastAttach=!0}function Kun(){return a().detachedSinceLastAttach}function xde(){return a().stampMs}function E6e(e){return!1}async function qmt(){for(;;){let e=Date.now();if(!E6e(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Z(Math.max(25,c)+25)}}
export{Vun,v6e,Kun,xde,E6e,qmt};
