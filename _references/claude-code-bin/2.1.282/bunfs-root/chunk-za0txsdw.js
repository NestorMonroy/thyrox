// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{oi}from"/$bunfs/root/chunk-wbbthbh9.js";import"/$bunfs/root/chunk-bjy6zt8z.js";import"/$bunfs/root/chunk-zt13kgz5.js";import"/$bunfs/root/chunk-zwm3fybx.js";import"/$bunfs/root/chunk-hm6k4hcw.js";import"/$bunfs/root/chunk-zxcb8vnv.js";import"/$bunfs/root/chunk-dw9y6h6j.js";import"/$bunfs/root/chunk-dbjks79r.js";import"/$bunfs/root/chunk-f8tyjwrg.js";import"/$bunfs/root/chunk-37swe2q7.js";import"/$bunfs/root/chunk-f344jh32.js";import"/$bunfs/root/chunk-se3pws52.js";import"/$bunfs/root/chunk-h56wjcte.js";import"/$bunfs/root/chunk-d6bkh9x7.js";import"/$bunfs/root/chunk-nbcqw6vp.js";import"/$bunfs/root/chunk-zx0c9jrs.js";import"/$bunfs/root/chunk-shebh248.js";import"/$bunfs/root/chunk-xt60grfb.js";import"/$bunfs/root/chunk-12sz4cx4.js";import"/$bunfs/root/chunk-36kx407g.js";import"/$bunfs/root/chunk-hm522bzh.js";import"/$bunfs/root/chunk-fq30rq8e.js";import"/$bunfs/root/chunk-wbsfsj3m.js";import"/$bunfs/root/chunk-ghdfdc8h.js";import"/$bunfs/root/chunk-a23hx12j.js";import"/$bunfs/root/chunk-75d7sn3n.js";import"/$bunfs/root/chunk-x80cfbm0.js";import"/$bunfs/root/chunk-1s5hx5dz.js";import"/$bunfs/root/chunk-g59nc6ra.js";import"/$bunfs/root/chunk-xacp3rm8.js";import"/$bunfs/root/chunk-z3ns4mz4.js";import"/$bunfs/root/chunk-zvyecpse.js";import"/$bunfs/root/chunk-sentf9c1.js";import{Qun,A6e}from"/$bunfs/root/chunk-esvkqvk3.js";import"/$bunfs/root/chunk-nbmjse29.js";import"/$bunfs/root/chunk-cksc1q90.js";import"/$bunfs/root/chunk-bsnf5k7q.js";import"/$bunfs/root/chunk-t6d3nxvc.js";import"/$bunfs/root/chunk-322my1pd.js";import"/$bunfs/root/chunk-c01w1545.js";import"/$bunfs/root/chunk-4j9066ym.js";import"/$bunfs/root/chunk-zb2bkbm2.js";import"/$bunfs/root/chunk-yksx95h7.js";import"/$bunfs/root/chunk-e8ycfccz.js";import"/$bunfs/root/chunk-kp7dd3ek.js";import"/$bunfs/root/chunk-verj0kzw.js";import"/$bunfs/root/chunk-0bg0s2rp.js";import"/$bunfs/root/chunk-txvgrx83.js";import"/$bunfs/root/chunk-0r1ezv0m.js";import"/$bunfs/root/chunk-2r0a8w38.js";import"/$bunfs/root/chunk-bzev8hcq.js";import"/$bunfs/root/chunk-g5r8wnkm.js";import"/$bunfs/root/chunk-tsex6vh0.js";import"/$bunfs/root/chunk-x7t63a47.js";import"/$bunfs/root/chunk-bbtbv3sj.js";import"/$bunfs/root/chunk-yq84rg1s.js";import"/$bunfs/root/chunk-63sndd1w.js";import"/$bunfs/root/chunk-hxbreqnq.js";import"/$bunfs/root/chunk-7rt268hn.js";import"/$bunfs/root/chunk-meg7vb2v.js";import"/$bunfs/root/chunk-qd0gs1zk.js";import"/$bunfs/root/chunk-qpevst33.js";import"/$bunfs/root/chunk-dezzmzg8.js";import"/$bunfs/root/chunk-3vkd08w1.js";import"/$bunfs/root/chunk-gj4te5f6.js";import"/$bunfs/root/chunk-2c4t9j03.js";import"/$bunfs/root/chunk-pvy21nwr.js";import"/$bunfs/root/chunk-rp1ws90n.js";import"/$bunfs/root/chunk-qq20qm6v.js";import"/$bunfs/root/chunk-9fz4qzzd.js";import"/$bunfs/root/chunk-an11nt8y.js";import"/$bunfs/root/chunk-bk43pm18.js";import"/$bunfs/root/chunk-d96a7vyk.js";import"/$bunfs/root/chunk-6tq2tfz1.js";import"/$bunfs/root/chunk-66e2m63c.js";import"/$bunfs/root/chunk-355q52cq.js";import"/$bunfs/root/chunk-07q6vw8y.js";import"/$bunfs/root/chunk-v7arbnft.js";import{J4,MT}from"/$bunfs/root/chunk-st5y2mpe.js";import"/$bunfs/root/chunk-mkm8aa5t.js";import"/$bunfs/root/chunk-g5a1w94e.js";import"/$bunfs/root/chunk-5xjakbtc.js";import"/$bunfs/root/chunk-sqns4qfs.js";import"/$bunfs/root/chunk-2y2sj49d.js";import"/$bunfs/root/chunk-fb8sxhrz.js";import"/$bunfs/root/chunk-ewsr9rhf.js";import"/$bunfs/root/chunk-gvn2a1qw.js";import"/$bunfs/root/chunk-zq4cv8bx.js";import"/$bunfs/root/chunk-4we3snzk.js";import"/$bunfs/root/chunk-hn15aa7j.js";import"/$bunfs/root/chunk-e8222pfm.js";import"/$bunfs/root/chunk-pt3n8f0h.js";import"/$bunfs/root/chunk-xxpk739z.js";import"/$bunfs/root/chunk-48na3zj3.js";import"/$bunfs/root/chunk-99dxwxtw.js";import{E,Oo}from"/$bunfs/root/chunk-j14wpeqn.js";var w=E(function(ye,g){g.exports={scan:{hooks:["prompt.section","prompt.submit","ui.render"],calls:["turn.abort"]},files:{}}});var c={};Oo(c,{DRAFT_HINT:()=>p,PLUGIN_LISTING:()=>d,REMINDER:()=>u,SECTION:()=>m,SECTIONS:()=>f,cutsTheTurn:()=>a,default:()=>c,isAvailable:()=>h,isOnByDefault:()=>l,register:()=>x,registerPlugin:()=>D,typedByTheUser:()=>n});var i={};Oo(i,{DRAFT_HINT:()=>p,REMINDER:()=>u,SECTION:()=>m,SECTIONS:()=>f,cutsTheTurn:()=>a,default:()=>i,register:()=>x,typedByTheUser:()=>n});function n(t){let r=t.text.trim();return t.origin.kind==="composer"&&t.attachments===void 0&&r!==""&&!r.startsWith("/")}var a=(t)=>n(t)&&t.turnId!==void 0&&!t.wait;var p="enter answers now \xB7 ctrl+x enter queues";var f=["focus_mode","focus_mode:L"];var u=`<responsive-mode>
Responsive mode is on. Reply to the user's message above right away, before
any thinking or tool use, even if it is just "I'm on it..." or "Let me
think..." when you need to think first. Write in clear, conversational
English, the way a sharp colleague writes in chat, without eager openers,
flattery, stock apologies or wrap-ups. Then continue the work.
</responsive-mode>`;var m=`# Responsive mode
Responsive mode: the user is watching a live terminal and your #1 priority
is to communicate with them quickly. Before you think or call any tool,
respond IMMEDIATELY with a short message: one or two plain sentences that
acknowledge the request and say what you are about to do. If you need to
think first, say so in a few words ("On it...", "Let me think...") and then
think. Only then continue with thinking and tool use. Do this at the start
of every turn, and again whenever the user sends a new message while you
are working: answer them first, then resume.

Keep those messages short; the first one should take no more than a
sentence or two. Saying what you are about to do before your first tool
call is mandatory in responsive mode, and it comes first.

## Clear, conversational English, with no Claude-isms
Write the way a sharp colleague writes in chat: direct, specific, plain.
Avoid these patterns and their cousins:
- Eager openers: "Great question!", "Certainly!", "Absolutely!", "Sure
  thing!", "Of course!", "I'd be happy to..."
- Agreement and flattery reflexes: "You're absolutely right", "Good
  catch!", "That's a great point"
- Stock apologies: "I apologize for the confusion", "Sorry for the
  oversight", "You're right to push back"
- Throat-clearing: "It's worth noting that", "It's important to note",
  "Essentially", "Basically", "Notably", "To be clear"
- Corporate vocabulary: leverage, robust, seamless, comprehensive,
  streamline, utilize, delve, dive into, crucial, ensure, landscape,
  navigate (a problem), holistic
- Wrap-ups: "In summary", "To summarize", "Hope this helps!", "Let me know
  if you'd like...", "Feel free to...", "Happy to help further"
- Narrated transitions inside an answer: "Here's what I found:", "Let me
  break this down", "Now, let's look at..."; just say the thing. (The quick
  first reply, "On it...", is different and wanted.)
- Restating the user's question back before answering it; reflexive
  hedging ("it depends", "there are many factors") when you actually have
  an answer; headers and bullet lists for an answer that fits in two
  sentences.
- Emoji, and exclamation-mark enthusiasm in general.
Say what you found, what you did, what you need, and stop.`;function x(t){t("prompt.section",{name:f},async(r,e,s)=>{let{text:o}=await s(e);return{text:o===null?m:o}}),t("prompt.submit",async(r,e,s)=>{if(!n(e))return s(e);let o=await s({...e,context:[...e.context??[],u]});if(o.drop===void 0&&a(e))await r.turn.abort({turnId:e.turnId}).catch(()=>{return});return o}),t("ui.render",{component:"PromptHint"},(r,e,s)=>{let o=e.props.isDraft&&e.props.isWorking;return s(o?{...e,props:{...e.props,hint:p}}:e)})}var l=()=>!1;var h=()=>A6e()&&!Qun()&&oi("tengu_quiet_ember",l());var d={name:"responsive-mode",description:"Responsive mode: Claude replies to you in a sentence before thinking or using tools, on every prompt",isAvailable:h};var D=()=>MT({...d,hooksModule:J4(import.meta.dir,i,()=>w())});export{p as DRAFT_HINT,d as PLUGIN_LISTING,u as REMINDER,m as SECTION,f as SECTIONS,a as cutsTheTurn,c as default,h as isAvailable,l as isOnByDefault,x as register,D as registerPlugin,n as typedByTheUser};
