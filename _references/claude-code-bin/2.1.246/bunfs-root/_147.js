// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Ltb as _,ftb as d,gtb as f,htb as m}from"/$bunfs/root/_527.js";import{Fgd as c,Ngd as g}from"/$bunfs/root/_820.js";import{Gtd as a,mud as R}from"/$bunfs/root/_828.js";import{Fvd as p,dwd as h}from"/$bunfs/root/_832.js";R();g();h();_();function x(e,n,s){let i=e.trim(),l=i===n?[n]:[i,n];for(let o of l){let t=r(o,s);if(t!==void 0)return{ok:!1,reason:t}}let u=c(n);for(let o of u){let t=r(o,s);if(t!==void 0)return{ok:!1,reason:t}}return{ok:!0,pathsToCheck:u}}function U(e,n){return r(e,n)}var P=/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/gu;function w(e){return p(e.replace(P,""),1024)}function r(e,n){if(a(e))return"nt_namespace";if(d(e,n))return"untrusted_unc";if(f(e,n))return"untrusted_automount";if(m(e,n))return"suspicious_windows_spelling";return}
export{x as Cp,U as Dp,w as Ep};
