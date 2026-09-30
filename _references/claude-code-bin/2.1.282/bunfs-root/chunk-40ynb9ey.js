// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,XB}from"/$bunfs/root/chunk-zwm3fybx.js";import{Sp}from"/$bunfs/root/chunk-wbbthbh9.js";import{c7n,d7n}from"/$bunfs/root/chunk-m689sq5r.js";import{ol}from"/$bunfs/root/chunk-kda7f0br.js";class i{activePark=null}var s=new K(()=>new i);async function wUe(r,e,n,a){if(!Sp())return!1;let o=s.of(r),t=await c7n(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=XB(()=>{if(Sp())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),d7n(e,t.prior,t.storageV5).catch(ol)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{wUe};
