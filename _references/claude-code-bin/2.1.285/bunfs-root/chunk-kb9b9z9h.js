// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{SY,IN,Ro,sWt,ko}from"/$bunfs/root/chunk-23df1pks.js";import{V2}from"/$bunfs/root/chunk-wrvjx900.js";function mbe(r){return r.replace(/:\d+$/,"")}var e="gitlab.com",o="bitbucket.org",TWo={github:Ro,gitlab:e,bitbucket:o},n={"ssh.github.com":"github","altssh.gitlab.com":"gitlab","altssh.bitbucket.org":"bitbucket"};function KA(r){if(r=mbe(r),ko(r))return"github";let t=sWt(r),i=n[t];if(i)return i;if(t===e)return"gitlab";if(t===o)return"bitbucket";return"other"}function bXe(r){let t=r.trim();if(SY(t)||IN(t)||V2(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function Ajt(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t&&!IN(r)?{user:t[1],host:t[2],path:t[3]}:null}
export{mbe,TWo,KA,bXe,Ajt};
