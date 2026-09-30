// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import"/$bunfs/root/chunk-bjy6zt8z.js";import"/$bunfs/root/chunk-zt13kgz5.js";import{he}from"/$bunfs/root/chunk-zwm3fybx.js";import"/$bunfs/root/chunk-hm6k4hcw.js";import"/$bunfs/root/chunk-zxcb8vnv.js";import{j,Ht}from"/$bunfs/root/chunk-dw9y6h6j.js";import"/$bunfs/root/chunk-dbjks79r.js";import"/$bunfs/root/chunk-f8tyjwrg.js";import{x,ke}from"/$bunfs/root/chunk-wbbthbh9.js";import"/$bunfs/root/chunk-37swe2q7.js";import"/$bunfs/root/chunk-f344jh32.js";import"/$bunfs/root/chunk-se3pws52.js";import"/$bunfs/root/chunk-h56wjcte.js";import"/$bunfs/root/chunk-d6bkh9x7.js";import{S,Q,t}from"/$bunfs/root/chunk-nbcqw6vp.js";import"/$bunfs/root/chunk-zx0c9jrs.js";import"/$bunfs/root/chunk-shebh248.js";import"/$bunfs/root/chunk-xt60grfb.js";import"/$bunfs/root/chunk-12sz4cx4.js";import{YW}from"/$bunfs/root/chunk-36kx407g.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import"/$bunfs/root/chunk-fq30rq8e.js";import"/$bunfs/root/chunk-wbsfsj3m.js";import"/$bunfs/root/chunk-ghdfdc8h.js";import{Ge}from"/$bunfs/root/chunk-a23hx12j.js";import"/$bunfs/root/chunk-75d7sn3n.js";import"/$bunfs/root/chunk-x80cfbm0.js";import"/$bunfs/root/chunk-1s5hx5dz.js";import{mf}from"/$bunfs/root/chunk-g59nc6ra.js";import"/$bunfs/root/chunk-xacp3rm8.js";import"/$bunfs/root/chunk-z3ns4mz4.js";import"/$bunfs/root/chunk-zvyecpse.js";import"/$bunfs/root/chunk-sentf9c1.js";import"/$bunfs/root/chunk-esvkqvk3.js";import"/$bunfs/root/chunk-nbmjse29.js";import"/$bunfs/root/chunk-cksc1q90.js";import"/$bunfs/root/chunk-bsnf5k7q.js";import"/$bunfs/root/chunk-t6d3nxvc.js";import"/$bunfs/root/chunk-322my1pd.js";import"/$bunfs/root/chunk-c01w1545.js";import"/$bunfs/root/chunk-4j9066ym.js";import"/$bunfs/root/chunk-zb2bkbm2.js";import"/$bunfs/root/chunk-yksx95h7.js";import"/$bunfs/root/chunk-e8ycfccz.js";import"/$bunfs/root/chunk-kp7dd3ek.js";import"/$bunfs/root/chunk-verj0kzw.js";import"/$bunfs/root/chunk-0bg0s2rp.js";import"/$bunfs/root/chunk-txvgrx83.js";import"/$bunfs/root/chunk-0r1ezv0m.js";import"/$bunfs/root/chunk-2r0a8w38.js";import"/$bunfs/root/chunk-bzev8hcq.js";import"/$bunfs/root/chunk-g5r8wnkm.js";import"/$bunfs/root/chunk-tsex6vh0.js";import"/$bunfs/root/chunk-x7t63a47.js";import"/$bunfs/root/chunk-bbtbv3sj.js";import"/$bunfs/root/chunk-yq84rg1s.js";import"/$bunfs/root/chunk-63sndd1w.js";import"/$bunfs/root/chunk-hxbreqnq.js";import"/$bunfs/root/chunk-7rt268hn.js";import"/$bunfs/root/chunk-meg7vb2v.js";import"/$bunfs/root/chunk-qd0gs1zk.js";import"/$bunfs/root/chunk-qpevst33.js";import"/$bunfs/root/chunk-dezzmzg8.js";import"/$bunfs/root/chunk-3vkd08w1.js";import"/$bunfs/root/chunk-gj4te5f6.js";import"/$bunfs/root/chunk-2c4t9j03.js";import"/$bunfs/root/chunk-pvy21nwr.js";import"/$bunfs/root/chunk-rp1ws90n.js";import"/$bunfs/root/chunk-qq20qm6v.js";import"/$bunfs/root/chunk-9fz4qzzd.js";import"/$bunfs/root/chunk-an11nt8y.js";import"/$bunfs/root/chunk-bk43pm18.js";import"/$bunfs/root/chunk-d96a7vyk.js";import"/$bunfs/root/chunk-6tq2tfz1.js";import"/$bunfs/root/chunk-66e2m63c.js";import"/$bunfs/root/chunk-355q52cq.js";import"/$bunfs/root/chunk-79j763ea.js";import{s1e}from"/$bunfs/root/chunk-skc2c83f.js";import{cMe}from"/$bunfs/root/chunk-p5y62fsx.js";import"/$bunfs/root/chunk-btze9txd.js";import"/$bunfs/root/chunk-5xjakbtc.js";import"/$bunfs/root/chunk-sqns4qfs.js";import"/$bunfs/root/chunk-2y2sj49d.js";import"/$bunfs/root/chunk-fb8sxhrz.js";import"/$bunfs/root/chunk-ewsr9rhf.js";import"/$bunfs/root/chunk-gvn2a1qw.js";import"/$bunfs/root/chunk-zq4cv8bx.js";import"/$bunfs/root/chunk-4we3snzk.js";import"/$bunfs/root/chunk-hn15aa7j.js";import"/$bunfs/root/chunk-e8222pfm.js";import"/$bunfs/root/chunk-pt3n8f0h.js";import"/$bunfs/root/chunk-xxpk739z.js";import"/$bunfs/root/chunk-48na3zj3.js";import"/$bunfs/root/chunk-99dxwxtw.js";import{readFile as L}from"fs/promises";import{basename as F,join as G}from"path";import{readdir as y,readFile as C,stat as b}from"fs/promises";import{extname as _,join as v}from"path";var E=52428800,T=200,g=60,D=/<command-name>\/([\w:-]+)<\/command-name>/g,A=/"name":"mcp__([^"]+?)__([^"]+)"/g,f='"content":"<command-name>/',R='"content":"<command-message>',k='"type":"tool_use"',N='"type":"custom-title"',O='"type":"pr-link"',M='"role":"user"',I=/"customTitle":"([^"]+)"/,P=/"prNumber":(\d+)/,U=/"role":"user"[^}]*"content":"([^"]+)"/;async function w(u,a){let s={slashCommandCounts:new Map,mcpServerCounts:new Map,sessionDescriptors:[],sessionFileCount:0},m=Date.now()-a*24*60*60*1000,h;try{h=await y(u)}catch(r){if(Ht(r))return s;throw r}let d=h.filter((r)=>_(r)===".jsonl"),p=(await Promise.all(d.map(async(r)=>{let l=v(u,r);try{let n=await b(l);if(!n.isFile()||n.mtimeMs<m||n.size>E)return null;return l}catch(n){if(Ht(n))return null;throw n}}))).filter((r)=>r!==null);for(let r of p){let l;try{l=await C(r,"utf-8")}catch(e){if(Ht(e))continue;throw e}s.sessionFileCount++;let n={prNumbers:[]};for(let e of l.split(`
`)){if(e.length<10)continue;if(e.includes(f)||e.includes(R))for(let o of e.matchAll(D)){let c=o[1];s.slashCommandCounts.set(c,(s.slashCommandCounts.get(c)??0)+1)}if(e.includes(k)&&e.includes('"name":"mcp__'))for(let o of e.matchAll(A)){let c=o[1];s.mcpServerCounts.set(c,(s.mcpServerCounts.get(c)??0)+1)}if(e.includes(N)){let o=I.exec(e);if(o)n.title=o[1]}if(e.includes(O)){let o=P.exec(e);if(o){let c=Number(o[1]);if(!n.prNumbers.includes(c))n.prNumbers.push(c)}}if(!n.firstMessage&&e.includes(M)&&!e.includes(f)&&!e.includes('"content":[')){let o=U.exec(e);if(o){let c=o[1].replace(/\\n/g," ").replace(/\\"/g,'"');if(c.length>3&&!c.startsWith("<"))n.firstMessage=c.slice(0,T)}}}if(n.title||n.prNumbers.length>0||n.firstMessage)s.sessionDescriptors.push(n)}if(s.sessionDescriptors.length>g)s.sessionDescriptors.sort((r,l)=>{let n=(r.title?2:0)+(r.prNumbers.length>0?1:0);return(l.title?2:0)+(l.prNumbers.length>0?1:0)-n}),s.sessionDescriptors=s.sessionDescriptors.slice(0,g);return s}var W=30;function B(u){try{return new URL(u).origin}catch{return}}async function q(u){try{let a=await L(G(u,".mcp.json"),"utf8"),s=Q(a);if(s&&typeof s==="object"&&"mcpServers"in s&&s.mcpServers&&typeof s.mcpServers==="object")return s.mcpServers}catch(a){if(!j(a))t(`team-onboarding: failed to read .mcp.json: ${a instanceof Error?a.message:String(a)}`,{level:"error"})}return{}}async function Y(u){let a=he(),s=mf(a),m=await w(s,u),h=[...m.slashCommandCounts.entries()].sort((e,o)=>o[1]-e[1]).map(([e,o])=>({name:`/${e}`,count:o})),d=await q(a),p=[...m.mcpServerCounts.entries()].sort((e,o)=>o[1]-e[1]).map(([e,o])=>{let c=d[e];return{name:e,callCount:o,urlOrigin:typeof c?.url==="string"?B(c.url):void 0}}),r=(await Ge("git",["config","user.name"],{cwd:a})).stdout.trim(),l=(await Ge("git",["remote","get-url","origin"],{cwd:a})).stdout.trim();return{usageData:S({generatedBy:r||void 0,currentRepo:YW(l)??F(a),windowDays:u,sessionCount:m.sessionFileCount,slashCommands:h,mcpServers:p,sessionDescriptors:m.sessionDescriptors},null,2),sessionCount:m.sessionFileCount,slashCommandCount:m.slashCommandCounts.size,mcpServerCount:m.mcpServerCounts.size}}var H=`# Welcome to [Team Name]

## How We Use Claude

Based on [name]'s usage over the last [N] days:

Work Type Breakdown:
  [Category 1]  [ascii bar]  [N]%
  [Category 2]  [ascii bar]  [N]%
  [Category 3]  [ascii bar]  [N]%
  ...

Top Skills & Commands:
  [/command]  [ascii bar]  [N]x/month
  ...

Top MCP Servers:
  [Server]  [ascii bar]  [N] calls
  ...

## Your Setup Checklist

### Codebases
- [ ] [repo-name] \u2014 [repo url]
...

### MCP Servers to Activate
- [ ] [Server] \u2014 [what it's for]. [How to get access]
...

### Skills to Know About
- [/command] \u2014 [what it does, when the team uses it]
...

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy \u2014 warm, conversational,
not lecture-y.

Open with a warm welcome \u2014 include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes \u2014 [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections \u2014 offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data \u2014 don't extrapolate them into a "team
workflow" narrative. -->`,K=`You are helping a power user generate an onboarding guide for teammates who are new to Claude Code. The guide will live in the team's onboarding docs and can be pasted into Claude for an interactive walkthrough.

You're co-authoring this with them \u2014 collaborative and helpful, like a teammate who's done this before and is happy to share.

## Usage data (last {{WINDOW_DAYS}} days)

This was scanned from the guide creator's local Claude Code transcripts:

\`\`\`json
{{USAGE_DATA}}
\`\`\`

## Your task

Before anything else \u2014 including before thinking through the classification \u2014 output exactly this line as your first visible text:

> Looking at how you've used Claude over the last {{WINDOW_DAYS}} days to put together an onboarding guide for teammates new to Claude Code.

This must come before any extended thinking about session descriptors. The guide creator is staring at a blank screen until you do. Classification is step 2, not step 1.

Generate the guide immediately, then ask for revisions. Don't wait for answers first \u2014 it's easier for the guide creator to edit a concrete draft than answer abstract questions.

1. **Output the acknowledgment line above.** No thinking, no classification, no tool calls before this. One line, then move on.

2. **Derive the work-type breakdown.** Read the \`sessionDescriptors\` array \u2014 each entry describes one session via its title, any linked code reviews (\`prNumbers\`), and first user message. Classify each session into one of these task types:

   - **build_feature** \u2014 new functionality, scripts, tools, config/CI/env setup
   - **debug_fix** \u2014 investigating and fixing bugs
   - **improve_quality** \u2014 refactoring, tests, cleanup, code review
   - **analyze_data** \u2014 queries, metrics, number crunching
   - **plan_design** \u2014 architecture, approach, strategy, understanding unfamiliar code, design review
   - **prototype** \u2014 spikes, POCs, throwaway exploration
   - **write_docs** \u2014 PRDs, RFCs, READMEs, design docs, copy/doc review

   Categories describe the *type of task*, not the project or domain \u2014 a teammate on any project should recognize them. Review sessions belong with whatever's being reviewed: code review is improve_quality, doc review is write_docs, design review is plan_design. Most sessions fit the list; only invent a new category if it's genuinely a different type of task. Pick the top 3-5 with rough percentages. First messages alone are usually enough; titles and code-review links are enrichment. If first messages are uninformative, use tool and MCP counts as a weak hint. If there are ~0 sessions, leave the breakdown as a TODO.

   In the rendered guide, display categories with spaces and title case (e.g. "Build Feature" not "build_feature").

3. **Gather the remaining pieces.** For repos, start with \`currentRepo\` and check the workspace for sibling repo directories. For MCP server setup, use each entry's \`name\` (and \`urlOrigin\` where present) to infer what the server does and how a teammate would get access. Leave the Team Tips and Get Started sections as TODO placeholders \u2014 you'll ask for these in Review and fill them in after.

4. **Write the guide to \`ONBOARDING.md\`** following this template:

\`\`\`
{{GUIDE_TEMPLATE}}
\`\`\`

   Fill in real numbers from the usage data (not placeholders). Use \`generatedBy\` for the name; if it's missing, omit the name. Ascii bar charts: \`\u2588\` for filled, \`\u2591\` for empty, 20 chars wide. Keep the HTML comment instruction at the bottom exactly as shown.

5. **Render the guide in a code block, then close out the first turn.** You're co-authoring this guide with the guide creator \u2014 frame the follow-up as collaboration, not corrections.

   After the code block, add a \`---\` horizontal rule and a \`**Review**\` heading so the guide is visually separated from your questions. Under the heading, number these three questions:

   1. "I went with '[X]' for the team name \u2014 let me know if that sounds right." (or if you couldn't tell: "What's the team name? I'll add it in.")
   2. Is there a starter task for someone new to Claude Code? (ticket or doc link \u2014 optional)
   3. Any team tips you'd tell a new teammate that aren't already in CLAUDE.md?

   After they answer, update \`ONBOARDING.md\` with their team name, tips, and starter task. Then close with this exact line (not numbered, not paraphrased):

   Saved to \`ONBOARDING.md\`. Drop it in your team docs and channels \u2014 when a new teammate pastes it into Claude Code, they get a guided onboarding tour from there.

   Apply any edits they come back with to the file.`,z=`

**Sharing** \u2014 call the ${cMe} tool twice:

1. **Right after rendering the draft code block** (still in step 5, before the Review questions). Call with \`mode='check'\` \u2014 this uploads the draft to an existing guide (or creates a new one). Either way you get a \`share_url\` and \`short_code\`. Instead of the \`---\` / \`**Review**\` header from step 5, bridge directly from the link into the numbered questions (no horizontal rule):

   Here's a draft \u2014 a few quick questions to finish it up:

   <share URL>

   Then ask the three numbered questions from step 5 as normal. Save the \`short_code\` from the tool result \u2014 you'll need it in step 2.

2. **After the user answers the Review questions** and you've updated ONBOARDING.md, call it again with \`mode='update'\` and the \`short_code\` from step 1 to refresh the same link. Replace step 5's "drop it in your team docs" close with:

   Here's your onboarding guide: <updated URL>

   Send this to teammates and they'll get a guided walkthrough when they open it in Claude Code.

If the tool returns 'unavailable' at any point, skip that call and use the manual close from step 5 instead.`,X=["Edit(ONBOARDING.md)","Bash(ls *)",cMe],J={type:"prompt",name:"team-onboarding",description:"Help teammates ramp on Claude Code with a guide from your usage",allowedTools:X,contentLength:0,policyGate:{policy:"allow_team_onboarding"},isHidden:!1,progressMessage:"scanning usage data",effort:"low",requires:{workspace:!0},userFacingName(){return"team-onboarding"},source:"builtin",disableModelInvocation:!0,async getPromptForCommand(u,a){let s=x("tengu_flint_harbor_prompt",{}),m=typeof s?.prompt==="string"?s.prompt:K,h=typeof s?.guideTemplate==="string"?s.guideTemplate:H,d=typeof s?.windowDays==="number"?Math.min(Math.max(Math.floor(s.windowDays),1),365):W;i("tengu_team_onboarding_invoked",{window_days:d}),await ke((o)=>({...o,teamOnboardingLastUsedAt:Date.now()}),a.storageV5);let{usageData:p,sessionCount:r,slashCommandCount:l,mcpServerCount:n}=await Y(d),e=m.replaceAll("{{WINDOW_DAYS}}",String(d)).replaceAll("{{GUIDE_TEMPLATE}}",h).replaceAll("{{USAGE_DATA}}",p)+(s1e()?z:"");return i("tengu_team_onboarding_generated",{session_count:r,slash_command_count:l,mcp_server_count:n,window_days:d}),[{type:"text",text:e}]}},Ce=J;export{Ce as default};
