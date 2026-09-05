// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,$P}from"/$bunfs/root/chunk-annedm50.js";import{af}from"/$bunfs/root/chunk-hyqdn9c0.js";import{Eln,Aln}from"/$bunfs/root/chunk-cwv2zk8k.js";import{Mi}from"/$bunfs/root/chunk-26vw39tf.js";class i{activePark=null}var s=new j(()=>new i);async function t_e(r,e,n,a){if(!af())return!1;let o=s.of(r),t=await Eln(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=$P(()=>{if(af())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),Aln(e,t.prior,t.storageV5).catch(Mi)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{t_e};
