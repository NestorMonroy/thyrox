// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{j,MP}from"/$bunfs/root/chunk-k6vqz9fa.js";import{af}from"/$bunfs/root/chunk-32f2qmtc.js";import{Aln,vln}from"/$bunfs/root/chunk-m8gxzxy5.js";import{Mi}from"/$bunfs/root/chunk-82qrhb9b.js";class i{activePark=null}var s=new j(()=>new i);async function n_e(r,e,n,a){if(!af())return!1;let o=s.of(r),t=await Aln(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=MP(()=>{if(af())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),vln(e,t.prior,t.storageV5).catch(Mi)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{n_e};
