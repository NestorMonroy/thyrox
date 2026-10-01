// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{nW,a$,bo,Tje,xo}from"/$bunfs/root/chunk-af9697mk.js";import{b2}from"/$bunfs/root/chunk-byfkk95g.js";function pSe(r){return r.replace(/:\d+$/,"")}var e="gitlab.com",o="bitbucket.org",iqo={github:bo,gitlab:e,bitbucket:o},n={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function dC(r){if(r=pSe(r),xo(r))return"github";let t=Tje(r),i=n[t];if(i)return i;if(t===e)return"gitlab";if(t===o)return"bitbucket";return"other"}function qJe(r){let t=r.trim();if(nW(t)||a$(t)||b2(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function Dzt(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t&&!a$(r)?{user:t[1],host:t[2],path:t[3]}:null}
export{pSe,iqo,dC,qJe,Dzt};
