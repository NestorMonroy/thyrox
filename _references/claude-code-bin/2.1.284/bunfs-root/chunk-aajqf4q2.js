// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ht,j}from"/$bunfs/root/chunk-d37h8mav.js";import{c}from"/$bunfs/root/chunk-czwr6846.js";import{Oo}from"/$bunfs/root/chunk-swk3rjnt.js";import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{G}from"/$bunfs/root/chunk-e1ahn80a.js";import{zl}from"/$bunfs/root/chunk-12vsw1j8.js";import{VC,gg,Ut}from"/$bunfs/root/chunk-q3brtb9y.js";import{o,H,u}from"/$bunfs/root/chunk-fwjxbyrt.js";var Ty="memory_list",cf="memory_read",sc="memory_write",JOo=["memory_list","memory_read","memory_write"];function YDr(){let e=new Date,t=e.getFullYear(),r=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0");return`${t}-${r}-${n}`}class i{#e;get(){return this.#e??=YDr(),this.#e}clear(){this.#e=void 0}get captured(){return this.#e!==void 0}}var QLt=new Ht(()=>new i);function XDr(e){return QLt.of(e).get()}function QOo(){return XDr(j())}function l(){return new Date().toLocaleString("en-US",{month:"long",year:"numeric"})}var s="(provided in the conversation below)",d='"standard": the normal web search: quick and cheap; right for straightforward lookups (reference facts, official pages, documentation, well-known people, places and topics) and simple follow-up lookups. "extended": a thorough, fresh search at several times the cost and latency.',m=`${gg} takes a \`mode\`. Use "standard" by default: it is the normal search, quick and cheap. Use "extended" only when a "standard" result comes back thin, off-target or possibly outdated, or from the start for hard-to-find or niche facts, very recent events, prices and availability, and multi-step research: it is thorough and fresh but several times the cost. When you plan several searches, send them in the same turn.`,h=f(()=>u({enabled:H(),mode_description:o().optional(),system_hint:o().optional(),web_search_addendum:o().optional()}));function D6e(){if(!zl())return null;let e=h().safeParse(a.CLAUDE_CODE_WEB_SEARCH_FAST_ARG!==void 0?{enabled:a.CLAUDE_CODE_WEB_SEARCH_FAST_ARG}:Oo("tengu_sleepy_shore",null));if(!e.success||!e.data.enabled)return null;let{mode_description:t,system_hint:r,web_search_addendum:n}=e.data;return{mode_description:t?.trim()?t:d,system_hint:r?.trim()?r:m,web_search_addendum:n?.trim()?n:""}}function JDr(e){return G(e)&&e.mode==="standard"&&D6e()!==null}function QDr(e){if(!D6e())return{};return{webSearchMode:c(JDr(e)?"standard":"extended")}}function Fdn(e){let t=D6e()?.system_hint;return t&&e.some((r)=>Ut(r,gg))?t:null}function ZOo(e){return e.replace(s,l())}function eHo(e,t){if(VC({model:e,leanPrompt:t}))return`Search the web. Returns result blocks with titles and URLs. US-only.

- The current month is ${s} \u2014 use this when searching for recent information.
- \`allowed_domains\` / \`blocked_domains\` filter results.
- After answering from results, end with a "Sources:" list of the URLs you used as markdown links.`;return`
- Allows Claude to search the web and use the results to inform responses
- Provides up-to-date information for current events and recent data
- Returns search result information formatted as search result blocks, including links as markdown hyperlinks
- Use this tool for accessing information beyond Claude's knowledge cutoff
- Searches are performed automatically within a single API call

CRITICAL REQUIREMENT - You MUST follow this:
  - After answering the user's question, you MUST include a "Sources:" section at the end of your response
  - In the Sources section, list all relevant URLs from the search results as markdown hyperlinks: [Title](URL)
  - This is MANDATORY - never skip including sources in your response
  - Example format:

    [Your answer here]

    Sources:
    - [Source Title 1](https://example.com/1)
    - [Source Title 2](https://example.com/2)

Usage notes:
  - Domain filtering is supported to include or block specific websites
  - Web search is only available in the US

IMPORTANT - Use the correct year in search queries:
  - The current month is ${s}. You MUST use this year when searching for recent information, documentation, or current events.
  - Example: If the user asks for "latest React docs", search for "React documentation" with the current year, NOT last year
`}
export{Ty,cf,sc,JOo,YDr,QLt,XDr,QOo,D6e,JDr,QDr,Fdn,ZOo,eHo};
