// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{t6,zo,oae}from"/$bunfs/root/chunk-hwm94hjq.js";function dIe(r){return r.replace(/:\d+$/,"")}var n="gitlab.com",e="bitbucket.org",s={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function Ox(r){if(r=dIe(r),zo(r))return"github";let t=t6(r);while(t.startsWith("www."))t=t.slice(4);let i=s[t];if(i)return i;if(t===n)return"gitlab";if(t===e)return"bitbucket";return"other"}function Hfr(r){switch(Ox(r)){case"gitlab":return n;case"bitbucket":return e;default:return null}}function Che(r){let t=r.trim();if(oae(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function jLn(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t?{user:t[1],host:t[2],path:t[3]}:null}
export{dIe,Ox,Hfr,Che,jLn};
