// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{_s,w$t,Do,z$e}from"/$bunfs/root/chunk-zvyecpse.js";function phe(r){return r.replace(/:\d+$/,"")}var n="gitlab.com",e="bitbucket.org",FIo={github:_s,gitlab:n,bitbucket:e},o={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function eA(r){if(r=phe(r),Do(r))return"github";let t=w$t(r),i=o[t];if(i)return i;if(t===n)return"gitlab";if(t===e)return"bitbucket";return"other"}function m6e(r){let t=r.trim();if(z$e(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function hun(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t?{user:t[1],host:t[2],path:t[3]}:null}
export{phe,FIo,eA,m6e,hun};
