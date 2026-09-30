// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Le}from"/$bunfs/root/chunk-a7esebzw.js";import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";class n{taints=[];changed=Le();verdict=void 0;replaceTaints(i){if(i.length===this.taints.length&&i.every((r)=>this.taints.includes(r)))return;this.taints=i,this.changed.emit(this.taints)}registerVerdict(i){this.verdict=i}}var o=new z(()=>new n);function e(){return o.of(B().host)}function Xdr(i){e().replaceTaints(i)}function rm(i){return e().taints.includes(i)}function jx(){return e().taints}function Nxe(i){return e().changed.subscribe(i)}function Jdr(i){e().registerVerdict(i)}function gF(i){return e().verdict?.isPolicyAllowed(i)??!1}function Fxe(i){let r=e().verdict;if(!r)return"unregistered";return r.policyDenyKind(i)}function Uxe(i,r,t){return e().verdict?.policyDeniedReason(i,r,t)??null}function Qdr(){return e().verdict?.complianceTaintsSettled()??!1}
export{Xdr,rm,jx,Nxe,Jdr,gF,Fxe,Uxe,Qdr};
