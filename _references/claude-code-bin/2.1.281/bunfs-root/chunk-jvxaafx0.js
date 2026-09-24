// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{a}from"/$bunfs/root/chunk-ay603yys.js";import{homedir as i}from"os";import{join as o}from"path";function r(e){return{env:e?.env??process.env,home:e?.homedir??a.HOME??i()}}function rho(e){let{env:n,home:t}=r(e);return n.XDG_STATE_HOME??o(t,".local","state")}function oho(e){let{env:n,home:t}=r(e);return n.XDG_CACHE_HOME??o(t,".cache")}function iMe(e){let{env:n,home:t}=r(e);return n.XDG_DATA_HOME??o(t,".local","share")}function UIt(e){return o(iMe(e),"claude","versions")}function Uj(e){let{home:n}=r(e);return o(n,".local","bin")}
export{rho,oho,iMe,UIt,Uj};
