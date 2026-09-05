// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,QP}from"/$bunfs/root/chunk-b1z7jvb2.js";import{df}from"/$bunfs/root/chunk-8qt7d28b.js";import{fsn,psn}from"/$bunfs/root/chunk-yjy4ncw5.js";import{Fs}from"/$bunfs/root/chunk-bnc671w7.js";class i{activePark=null}var s=new Y(()=>new i);async function _ye(r,e,n,a){if(!df())return!1;let o=s.of(r),t=await fsn(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=QP(()=>{if(df())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),psn(e,t.prior,t.storageV5).catch(Fs)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{_ye};
