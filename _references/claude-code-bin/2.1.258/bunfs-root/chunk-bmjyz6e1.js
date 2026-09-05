// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Ue}from"/$bunfs/root/chunk-ycrs8y50.js";import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";class n{taints=[];changed=Ue();verdict=void 0;replaceTaints(i){if(i.length===this.taints.length&&i.every((r)=>this.taints.includes(r)))return;this.taints=i,this.changed.emit(this.taints)}registerVerdict(i){this.verdict=i}}var o=new Y(()=>new n);function e(){return o.of(W().host)}function hsr(i){e().replaceTaints(i)}function cy(i){return e().taints.includes(i)}function bI(){return e().taints}function rTe(i){return e().changed.subscribe(i)}function ysr(i){e().registerVerdict(i)}function xBe(i){return e().verdict?.isPolicyAllowed(i)??!1}function oTe(i){let r=e().verdict;if(!r)return"unregistered";return r.policyDenyKind(i)}function _sr(i,r,t){return e().verdict?.policyDeniedReason(i,r,t)??null}function bsr(){return e().verdict?.complianceTaintsSettled()??!1}
export{hsr,cy,bI,rTe,ysr,xBe,oTe,_sr,bsr};
