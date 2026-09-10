// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{re}from"/$bunfs/root/chunk-1mrhsd7s.js";import{fK}from"/$bunfs/root/chunk-x722nt0q.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new V(()=>new r);function a(){return s.of(z().host)}function $cn(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function X4e(){a().detachedSinceLastAttach=!0}function Mcn(){return a().detachedSinceLastAttach}function Hue(){return a().stampMs}function J4e(e){return!1}async function jft(){for(;;){let e=Date.now();if(!J4e(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await re(Math.max(25,c)+25)}}
export{$cn,X4e,Mcn,Hue,J4e,jft};
