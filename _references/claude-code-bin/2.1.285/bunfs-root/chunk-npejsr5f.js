// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,j}from"/$bunfs/root/chunk-bxhyh54r.js";import{Z}from"/$bunfs/root/chunk-dmpcy5p5.js";import{Mne}from"/$bunfs/root/chunk-f74xvn8g.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new q(()=>new r);function a(){return s.of(j().host)}function hir(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function Wwt(){a().detachedSinceLastAttach=!0}function yir(){return a().detachedSinceLastAttach}function BOe(){return a().stampMs}function zwt(e){return!1}async function V4t(){for(;;){let e=Date.now();if(!zwt(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Z(Math.max(25,c)+25)}}
export{hir,Wwt,yir,BOe,zwt,V4t};
