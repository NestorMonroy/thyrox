// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{fh}from"/$bunfs/root/chunk-35k7s716.js";import{y5}from"/$bunfs/root/chunk-wfscmafr.js";import{Wpe,Qrt,Zrt}from"/$bunfs/root/chunk-mm8vme0b.js";function C$(n,e,t){let i=n.trim(),u=i===e?[e]:[i,e];for(let s of u){let o=r(s,t);if(o!==void 0)return o}let{paths:a,vetted:c}=y5(e);if(!c)return{ok:!1,reason:"unvettable_chain"};for(let s of a){let o=r(s,t);if(o!==void 0)return o}return{ok:!0,pathsToCheck:a}}function R$(n,e){return r(n,e)?.reason}function r(n,e){if(fh(n))return{ok:!1,reason:"nt_namespace"};if(Wpe(n,e))return{ok:!1,reason:"untrusted_unc"};if(Qrt(n,e))return{ok:!1,reason:"untrusted_automount"};let t=Zrt(n,e);if(t!==void 0)return{ok:!1,reason:"suspicious_windows_spelling",spelling:t};return}
export{C$,R$};
