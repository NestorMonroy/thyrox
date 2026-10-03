// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{cg}from"/$bunfs/root/chunk-4dvekan0.js";import{YY}from"/$bunfs/root/chunk-6w550002.js";import{Yye,apt,lpt}from"/$bunfs/root/chunk-76ncyjb9.js";function yB(n,e,t){let i=n.trim(),u=i===e?[e]:[i,e];for(let s of u){let o=r(s,t);if(o!==void 0)return o}let{paths:a,vetted:c}=YY(e);if(!c)return{ok:!1,reason:"unvettable_chain"};for(let s of a){let o=r(s,t);if(o!==void 0)return o}return{ok:!0,pathsToCheck:a}}function BH(n,e){return r(n,e)?.reason}function r(n,e){if(cg(n))return{ok:!1,reason:"nt_namespace"};if(Yye(n,e))return{ok:!1,reason:"untrusted_unc"};if(apt(n,e))return{ok:!1,reason:"untrusted_automount"};let t=lpt(n,e);if(t!==void 0)return{ok:!1,reason:"suspicious_windows_spelling",spelling:t};return}
export{yB,BH};
