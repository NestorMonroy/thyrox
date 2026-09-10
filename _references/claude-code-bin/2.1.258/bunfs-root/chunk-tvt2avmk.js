// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{H3,Oo,fse}from"/$bunfs/root/chunk-09dj6rnx.js";var n="gitlab.com",i="bitbucket.org";function yN(r){if(Oo(r))return"github";let t=H3(r);while(t.startsWith("www."))t=t.slice(4);if(t===n)return"gitlab";if(t===i)return"bitbucket";return"other"}function qlr(r){switch(yN(r)){case"gitlab":return n;case"bitbucket":return i;default:return null}}function Ykt(r){let t=r.trim();if(fse(t))return null;if(t.includes("://"))try{return new URL(t).hostname||null}catch{return null}return/^(?:[^@:/]+@)?([^:/]+):/.exec(t)?.[1]??null}function jIn(r){let t=/^([^@:/[\]]+)@([^@:/[\]]+):(.*)$/s.exec(r);return t?{user:t[1],host:t[2],path:t[3]}:null}
export{yN,qlr,Ykt,jIn};
