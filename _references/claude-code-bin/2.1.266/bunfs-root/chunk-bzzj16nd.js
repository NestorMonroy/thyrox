// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,LM}from"/$bunfs/root/chunk-t8q7n4ta.js";import{dd}from"/$bunfs/root/chunk-btbsn9s4.js";import{Uun,jun}from"/$bunfs/root/chunk-8hpkgkca.js";import{ji}from"/$bunfs/root/chunk-7tfkwhcm.js";class i{activePark=null}var s=new z(()=>new i);async function jbe(r,e,n,a){if(!dd())return!1;let o=s.of(r),t=await Uun(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=LM(()=>{if(dd())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),jun(e,t.prior,t.storageV5).catch(ji)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{jbe};
