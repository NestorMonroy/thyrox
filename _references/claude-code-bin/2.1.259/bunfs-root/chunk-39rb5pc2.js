// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,fD}from"/$bunfs/root/chunk-x1rrg5j2.js";import{_f}from"/$bunfs/root/chunk-x722nt0q.js";import{Lcn,Pcn}from"/$bunfs/root/chunk-mndeg8s1.js";import{Ws}from"/$bunfs/root/chunk-m1g84jsb.js";class i{activePark=null}var s=new V(()=>new i);async function b_e(r,e,n,a){if(!_f())return!1;let o=s.of(r),t=await Lcn(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=fD(()=>{if(_f())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),Pcn(e,t.prior,t.storageV5).catch(Ws)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{b_e};
