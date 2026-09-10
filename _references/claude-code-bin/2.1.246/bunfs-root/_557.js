// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Bpc as i,Lqc as d,Lvc as h,Mpc as g,Rpc as p,_nc as a,koc as f,oac as u,puc as r,sac as m}from"/$bunfs/root/_668.js";import{Tbd as b}from"/$bunfs/root/_811.js";import{ncd as l}from"/$bunfs/root/_812.js";import{xxd as A}from"/$bunfs/root/_837.js";function T(){if(l.DISABLE_COST_WARNINGS)return!1;let o=i();if(o&&k())return!0;if(o)return!1;let n=a(),t=f();if(!n.hasToken&&!t)return!1;let e=r(),c=e.oauthAccount?.organizationRole,s=e.oauthAccount?.workspaceRole;if(!c||!s)return!1;return["admin","billing"].includes(c)||["workspace_admin","workspace_billing"].includes(s)}function _(){let o=u();if(o!==null)return o;if(!i())return!1;let n=p();if(n==="max"||n==="pro")return!0;let e=r().oauthAccount?.organizationRole;return!!e&&["admin","billing","owner","primary_owner"].includes(e)}function k(){return g()?.billingType==="usage_based"}var S=A(()=>{m();d();h();b()});
export{T as TAb,_ as UAb,k as VAb,S as WAb};
