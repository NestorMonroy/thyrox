// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{te}from"/$bunfs/root/chunk-ern0s5ks.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{ke,le}from"/$bunfs/root/chunk-t6pwageh.js";function jZe(){try{return!1}catch(e){return d(te(e)),!1}}var o=20,i=o+1,Foo=10,s=1209600000,ndr=[{text:"Showing fewer prompt suggestions"},{text:" \xB7 use one to bring them back",dim:!0}];function rdr(){let e=le();if((e.promptSuggestionUnusedStreak??0)<o)return!1;if(a.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION===!0)return!1;if(jZe())return!1;if(Date.now()-Date.parse(e.firstStartTime??"1970-01-01")<s)return!1;return!0}function WZe(e,t,n){let r=le().promptSuggestionUnusedStreak??0;if(e){if(n)n.unusedInARow=0;if(r!==0)ke(u,t);return}if(!n||r>=o)return;if(n.unusedInARow++,n.unusedInARow>=o)n.unusedInARow=0,ke(g,t)}function Uoo(e){WZe(!0,e)}function odr(e){if(le().promptSuggestionUnusedStreak!==o||!rdr())return!1;return ke((t)=>t.promptSuggestionUnusedStreak===o?{...t,promptSuggestionUnusedStreak:i}:t,e),!0}function u(e){return(e.promptSuggestionUnusedStreak??0)===0?e:{...e,promptSuggestionUnusedStreak:0}}function g(e){return(e.promptSuggestionUnusedStreak??0)>=o?e:{...e,promptSuggestionUnusedStreak:o}}
export{jZe,Foo,ndr,rdr,WZe,Uoo,odr};
