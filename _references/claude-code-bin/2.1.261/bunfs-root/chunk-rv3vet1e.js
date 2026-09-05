// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,U}from"/$bunfs/root/chunk-annedm50.js";import{Z}from"/$bunfs/root/chunk-91n3hqvz.js";import{Zq}from"/$bunfs/root/chunk-hyqdn9c0.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new j(()=>new r);function a(){return s.of(U().host)}function Rln(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function R4e(){a().detachedSinceLastAttach=!0}function Iln(){return a().detachedSinceLastAttach}function Jce(){return a().stampMs}function I4e(e){return!1}async function Xft(){for(;;){let e=Date.now();if(!I4e(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Z(Math.max(25,c)+25)}}
export{Rln,R4e,Iln,Jce,I4e,Xft};
