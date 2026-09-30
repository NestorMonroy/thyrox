// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Te}from"/$bunfs/root/chunk-zwm3fybx.js";import{rt}from"/$bunfs/root/chunk-dbjks79r.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";var wkr=1500,c=3000;function IEe(){return a.CLAUDE_CODE_REMOTE&&Te()}function p_o({eventLoggingEnabled:e,growthBookEnabled:t,cacheEmpty:o,relaunches:n}){let i=e&&o?wkr:0,s=t&&n?a.CLAUDE_CODE_FLAG_FETCH_WAIT_MS??c:0,r=Math.max(i,s);return r>0?r:void 0}async function f_o({initialize:e,budgetMs:t}){let o=performance.now(),n=await rt(e().then(()=>!0,()=>!0),t);return{waitMs:performance.now()-o,timedOut:n===void 0}}
export{wkr,IEe,p_o,f_o};
