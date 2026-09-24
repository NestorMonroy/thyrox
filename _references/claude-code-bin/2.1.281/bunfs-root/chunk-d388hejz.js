// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,kB}from"/$bunfs/root/chunk-cqc88nqm.js";import{pp}from"/$bunfs/root/chunk-5khn4tvf.js";import{l8n,c8n}from"/$bunfs/root/chunk-dcc9j788.js";import{_l}from"/$bunfs/root/chunk-ew6qt9wg.js";class i{activePark=null}var s=new V(()=>new i);async function J$e(r,e,n,a){if(!pp())return!1;let o=s.of(r),t=await l8n(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=kB(()=>{if(pp())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),c8n(e,t.prior,t.storageV5).catch(_l)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{J$e};
