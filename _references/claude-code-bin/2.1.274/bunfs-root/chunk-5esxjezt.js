// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,$N}from"/$bunfs/root/chunk-ja309z9r.js";import{Ad}from"/$bunfs/root/chunk-27bj2wbx.js";import{vPn,EPn}from"/$bunfs/root/chunk-kaxbpgy6.js";import{Ra}from"/$bunfs/root/chunk-wae9xe9x.js";class i{activePark=null}var s=new W(()=>new i);async function Yxe(r,e,n,a){if(!Ad())return!1;let o=s.of(r),t=await vPn(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=$N(()=>{if(Ad())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),EPn(e,t.prior,t.storageV5).catch(Ra)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{Yxe};
