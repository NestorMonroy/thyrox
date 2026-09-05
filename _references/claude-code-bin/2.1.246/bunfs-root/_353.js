// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as l}from"/$bunfs/root/_837.js";function c(n,i){i((r)=>{let o=r;if("cacheBreakerPhrase"in n){let e=n.cacheBreakerPhrase,a=e==null?void 0:String(e);if(o.cacheBreakerPhrase!==a)o={...o,cacheBreakerPhrase:a}}if("autoCompactWindow"in n){let e=n.autoCompactWindow,a=e==null?void 0:Number(e);if(o.autoCompactWindow!==a)o={...o,autoCompactWindow:a}}if("briefTranscript"in n){let e=Boolean(n.briefTranscript);if(o.briefTranscript!==e)o={...o,briefTranscript:e}}if("isBriefOnly"in n){let e=Boolean(n.isBriefOnly);if(o.isBriefOnly!==e)o={...o,isBriefOnly:e}}if("slackTagConnected"in n){let e=Boolean(n.slackTagConnected);if(o.slackTagConnected!==e)o={...o,slackTagConnected:e}}if("fastMode"in n){let e=Boolean(n.fastMode);if(o.fastMode!==e)o={...o,fastMode:e}}if("model"in n){let e=n.model,a=e==null?null:String(e);if(o.mainLoopModelForSession!==a)o={...o,mainLoopModelForSession:a};if(o.mainLoopModel!==a)o={...o,mainLoopModel:a}}return o})}var t=()=>{};
export{c as CK,t as DK};
