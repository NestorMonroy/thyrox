// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{Q}from"/$bunfs/root/chunk-jxwbd5gq.js";import{jte}from"/$bunfs/root/chunk-t6pwageh.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new q(()=>new r);function a(){return s.of(j().host)}function Wnr(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function $bt(){a().detachedSinceLastAttach=!0}function Gnr(){return a().detachedSinceLastAttach}function DPe(){return a().stampMs}function Fbt(e){return!1}async function Pqt(){for(;;){let e=Date.now();if(!Fbt(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await Q(Math.max(25,c)+25)}}
export{Wnr,$bt,Gnr,DPe,Fbt,Pqt};
