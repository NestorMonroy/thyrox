// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{a}from"/$bunfs/root/chunk-j96jysac.js";import{homedir as i}from"os";import{join as o}from"path";function r(e){return{env:e?.env??process.env,home:e?.homedir??a.HOME??i()}}function QBr(e){let{env:n,home:t}=r(e);return n.XDG_STATE_HOME??o(t,".local","state")}function ZBr(e){let{env:n,home:t}=r(e);return n.XDG_CACHE_HOME??o(t,".cache")}function DAe(e){let{env:n,home:t}=r(e);return n.XDG_DATA_HOME??o(t,".local","share")}function Lgt(e){return o(DAe(e),"claude","versions")}function GF(e){let{home:n}=r(e);return o(n,".local","bin")}
export{QBr,ZBr,DAe,Lgt,GF};
