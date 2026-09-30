// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{$e}from"/$bunfs/root/chunk-tep8see7.js";import{W,G}from"/$bunfs/root/chunk-ja309z9r.js";import{K}from"/$bunfs/root/chunk-48qhkc6m.js";var s=new Set(["hipaa"]);class r{latched=new Set;latchedTaints=[];taints=[];current=[];changed=$e();verdict=void 0;replaceTaints(t){this.current=K(t).sort();for(let n of t)if(s.has(n))this.latched.add(n);if(this.latched.size!==this.latchedTaints.length)this.latchedTaints=Array.from(this.latched).sort();let i=K([...this.latchedTaints,...t]).sort();if(i.length===this.taints.length&&i.every((n,o)=>n===this.taints[o]))return!1;return this.taints=i,this.changed.emit(this.taints),!0}registerVerdict(t){this.verdict=t}resetForTesting(){this.latched.clear(),this.latchedTaints=[],this.taints=[],this.current=[]}}var a=new W(()=>new r);function e(){return a.of(G().host)}function Ybn(t){return e().replaceTaints(t)}function Yf(t){return e().taints.includes(t)}function uN(){return e().taints}function ihe(){return e().current}function Xbn(){return e().latchedTaints}function _1e(t){return e().changed.subscribe(t)}function lqr(){e().resetForTesting()}function cqr(t){e().registerVerdict(t)}function kM(t){return e().verdict?.isPolicyAllowed(t)??!1}function uqr(t){try{return e().verdict?.commandPolicyGateAllows(t)??!1}catch{return!1}}function Aj(t){let i=e().verdict;if(!i)return"unregistered";return i.policyDenyKind(t)}function uae(t,i,n){return e().verdict?.policyDeniedReason(t,i,n)??null}function uZn(){return e().verdict?.complianceTaintsSettled()??!1}
export{Ybn,Yf,uN,ihe,Xbn,_1e,lqr,cqr,kM,uqr,Aj,uae,uZn};
