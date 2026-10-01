// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,Dj}from"/$bunfs/root/chunk-bxhyh54r.js";import{Nd}from"/$bunfs/root/chunk-f74xvn8g.js";import{air,lir}from"/$bunfs/root/chunk-ez543e2k.js";import{yl}from"/$bunfs/root/chunk-61992r1j.js";class i{activePark=null}var s=new q(()=>new i);async function Qje(r,e,n,a){if(!Nd())return!1;let o=s.of(r),t=await air(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=Dj(()=>{if(Nd())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),lir(e,t.prior,t.storageV5).catch(yl)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{Qje};
