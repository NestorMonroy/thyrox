// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Fs,Ewt,ho,tye}from"/$bunfs/root/chunk-tjpyqt9m.js";function _ae(r){return r.replace(/:\d+$/,"")}var n="gitlab.com",e="bitbucket.org",xqr={github:Fs,gitlab:n,bitbucket:e},o={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function Wk(r){if(r=_ae(r),ho(r))return"github";let t=Ewt(r),i=o[t];if(i)return i;if(t===n)return"gitlab";if(t===e)return"bitbucket";return"other"}function A1e(r){let t=r.trim();if(tye(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function eer(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t?{user:t[1],host:t[2],path:t[3]}:null}
export{_ae,xqr,Wk,A1e,eer};
