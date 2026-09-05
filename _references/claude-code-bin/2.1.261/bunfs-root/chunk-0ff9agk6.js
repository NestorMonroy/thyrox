// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{$e}from"/$bunfs/root/chunk-dcawh0q4.js";import{j,U}from"/$bunfs/root/chunk-annedm50.js";class n{taints=[];changed=$e();verdict=void 0;replaceTaints(i){if(i.length===this.taints.length&&i.every((r)=>this.taints.includes(r)))return;this.taints=i,this.changed.emit(this.taints)}registerVerdict(i){this.verdict=i}}var o=new j(()=>new n);function e(){return o.of(U().host)}function hir(i){e().replaceTaints(i)}function Wg(i){return e().taints.includes(i)}function lR(){return e().taints}function OTe(i){return e().changed.subscribe(i)}function yir(i){e().registerVerdict(i)}function aN(i){return e().verdict?.isPolicyAllowed(i)??!1}function NTe(i){let r=e().verdict;if(!r)return"unregistered";return r.policyDenyKind(i)}function FTe(i,r,t){return e().verdict?.policyDeniedReason(i,r,t)??null}function _ir(){return e().verdict?.complianceTaintsSettled()??!1}
export{hir,Wg,lR,OTe,yir,aN,NTe,FTe,_ir};
