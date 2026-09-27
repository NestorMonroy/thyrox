// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  wo,njt,rjt
}from"/$bunfs/root/chunk-nvht7ckf.js";
import{
  c
}from"/$bunfs/root/chunk-vyyazxfq.js";
import{
  I
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  f
}from"/$bunfs/root/chunk-bnk68ax9.js";
import{
  a
}from"/$bunfs/root/chunk-v49zfq06.js";
import{
  Jt,xNo
}from"/$bunfs/root/chunk-s7awe3vb.js";
import{
  o,k,H,A,u,Fe,fe,G,R
}from"/$bunfs/root/chunk-dk5kbfrn.js";
var L3n={
  "//":"Hand-maintained baked-in model catalog \u2014 the source of truth for per-model provider IDs and metadata. On model launch add one entry to `models` below; `bun run generate:model-catalog` validates this file against the schema and formats it.",schema_version:1,pricing_tiers:{
    tier_2_10:{
      input:2,output:10,cache_write_5m:2.5,cache_write_1h:4,cache_read:0.2,web_search:0.01
    },tier_3_15:{
      input:3,output:15,cache_write_5m:3.75,cache_write_1h:6,cache_read:0.3,web_search:0.01
    },tier_5_25:{
      input:5,output:25,cache_write_5m:6.25,cache_write_1h:10,cache_read:0.5,web_search:0.01
    },tier_15_75:{
      input:15,output:75,cache_write_5m:18.75,cache_write_1h:30,cache_read:1.5,web_search:0.01
    },tier_10_50:{
      input:10,output:50,cache_write_5m:12.5,cache_write_1h:20,cache_read:1,web_search:0.01
    },tier_10_50_cache_read_0_25:{
      input:10,output:50,cache_write_5m:12.5,cache_write_1h:20,cache_read:0.25,web_search:0.01
    },tier_4_20_cache_read_0_20:{
      input:4,output:20,cache_write_5m:5,cache_write_1h:8,cache_read:0.2,web_search:0.01
    },haiku_35:{
      input:0.8,output:4,cache_write_5m:1,cache_write_1h:1.6,cache_read:0.08,web_search:0.01
    },haiku_45:{
      input:1,output:5,cache_write_5m:1.25,cache_write_1h:2,cache_read:0.1,web_search:0.01
    }
  },models:[{
    id:"claude-3-5-haiku",family:"haiku",display_name:"Haiku 3.5",provider_ids:{
      first_party:"claude-3-5-haiku-20241022",bedrock:"us.anthropic.claude-3-5-haiku-20241022-v1:0",vertex:"claude-3-5-haiku@20241022",foundry:"claude-3-5-haiku",anthropic_aws:"claude-3-5-haiku-20241022",anthropic_google_cloud:null,mantle:null,gateway:"claude-3-5-haiku-20241022"
    },eager_input_streaming:{
      vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_3_5_HAIKU",max_output_tokens:{
      default:8192,upper:8192
    },pricing:"haiku_35",capabilities:[]
  },{
    id:"claude-haiku-4-5",family:"haiku",display_name:"Haiku 4.5",knowledge_cutoff:"February 2025",provider_ids:{
      first_party:"claude-haiku-4-5-20251001",bedrock:"us.anthropic.claude-haiku-4-5-20251001-v1:0",vertex:"claude-haiku-4-5@20251001",foundry:"claude-haiku-4-5",anthropic_aws:"claude-haiku-4-5-20251001",anthropic_google_cloud:"claude-haiku-4-5-20251001",mantle:"anthropic.claude-haiku-4-5",gateway:"claude-haiku-4-5-20251001"
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_HAIKU_4_5",context:{
      window:200000,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:64000
    },pricing:"haiku_45",capabilities:["context_management"],advisor_rank:1
  },{
    id:"claude-3-5-sonnet",family:"sonnet",display_name:"Sonnet 3.5",provider_ids:{
      first_party:"claude-3-5-sonnet-20241022",bedrock:"us.anthropic.claude-3-5-sonnet-20241022-v2:0",vertex:"claude-3-5-sonnet-v2@20241022",foundry:"claude-3-5-sonnet",anthropic_aws:"claude-3-5-sonnet-20241022",anthropic_google_cloud:null,mantle:null,gateway:"claude-3-5-sonnet-20241022"
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_3_5_SONNET",max_output_tokens:{
      default:8192,upper:8192
    },pricing:"tier_3_15",capabilities:[]
  },{
    id:"claude-3-7-sonnet",family:"sonnet",display_name:"Sonnet 3.7",provider_ids:{
      first_party:"claude-3-7-sonnet-20250219",bedrock:"us.anthropic.claude-3-7-sonnet-20250219-v1:0",vertex:"claude-3-7-sonnet@20250219",foundry:"claude-3-7-sonnet",anthropic_aws:"claude-3-7-sonnet-20250219",anthropic_google_cloud:null,mantle:null,gateway:"claude-3-7-sonnet-20250219"
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_3_7_SONNET",max_output_tokens:{
      default:32000,upper:64000
    },pricing:"tier_3_15",capabilities:[]
  },{
    id:"claude-sonnet-4-0",family:"sonnet",display_name:"Sonnet 4",knowledge_cutoff:"January 2025",provider_ids:{
      first_party:"claude-sonnet-4-20250514",bedrock:"us.anthropic.claude-sonnet-4-20250514-v1:0",vertex:"claude-sonnet-4@20250514",foundry:"claude-sonnet-4",anthropic_aws:"claude-sonnet-4-20250514",anthropic_google_cloud:null,mantle:null,gateway:"claude-sonnet-4-20250514"
    },eager_input_streaming:{
      vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_0_SONNET",context:{
      window:200000,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:64000
    },pricing:"tier_3_15",capabilities:["context_management"]
  },{
    id:"claude-sonnet-4-5",family:"sonnet",display_name:"Sonnet 4.5",knowledge_cutoff:"January 2025",provider_ids:{
      first_party:"claude-sonnet-4-5-20250929",bedrock:"us.anthropic.claude-sonnet-4-5-20250929-v1:0",vertex:"claude-sonnet-4-5@20250929",foundry:"claude-sonnet-4-5",anthropic_aws:"claude-sonnet-4-5-20250929",anthropic_google_cloud:"claude-sonnet-4-5-20250929",mantle:null,gateway:"claude-sonnet-4-5-20250929"
    },eager_input_streaming:{
      vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_5_SONNET",fallback_3p:"claude-sonnet-4-0",context:{
      window:200000,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:64000
    },pricing:"tier_3_15",capabilities:["context_management"]
  },{
    id:"claude-sonnet-4-6",family:"sonnet",display_name:"Sonnet 4.6",knowledge_cutoff:"August 2025",provider_ids:{
      first_party:"claude-sonnet-4-6",bedrock:"us.anthropic.claude-sonnet-4-6",vertex:"claude-sonnet-4-6",foundry:"claude-sonnet-4-6",anthropic_aws:"claude-sonnet-4-6",anthropic_google_cloud:"claude-sonnet-4-6",mantle:null,gateway:"claude-sonnet-4-6"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_6_SONNET",fallback_3p:"claude-sonnet-4-5",context:{
      window:200000,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:128000
    },pricing:"tier_3_15",capabilities:["effort","max_effort","adaptive_thinking","context_management"],advisor_rank:2
  },{
    id:"claude-sonnet-5",family:"sonnet",display_name:"Sonnet 5",knowledge_cutoff:"January 2026",provider_ids:{
      first_party:"claude-sonnet-5",bedrock:"us.anthropic.claude-sonnet-5",vertex:"claude-sonnet-5",foundry:"claude-sonnet-5",anthropic_aws:"claude-sonnet-5",anthropic_google_cloud:"claude-sonnet-5",mantle:"anthropic.claude-sonnet-5",gateway:"claude-sonnet-5"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_5_SONNET",fallback_3p:"claude-sonnet-4-6",context:{
      window:1e6,native_1m:!0,native_1m_3p:{
        bedrock:!0,vertex:!0,foundry:!0
      },supports_1m_beta:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_2_10",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","mid_conv_system","context_management"],default_effort:"high",effort_cost_index:{
      low:0.47,medium:0.74,high:1,xhigh:2.41,max:5.59
    },image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:3
  },{
    id:"claude-opus-4-0",family:"opus",display_name:"Opus 4",knowledge_cutoff:"January 2025",provider_ids:{
      first_party:"claude-opus-4-20250514",bedrock:"us.anthropic.claude-opus-4-20250514-v1:0",vertex:"claude-opus-4@20250514",foundry:"claude-opus-4",anthropic_aws:"claude-opus-4-20250514",anthropic_google_cloud:null,mantle:null,gateway:"claude-opus-4-20250514"
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_0_OPUS",context:{
      window:200000,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:32000
    },pricing:"tier_15_75",capabilities:["context_management"]
  },{
    id:"claude-opus-4-1",family:"opus",display_name:"Opus 4.1",knowledge_cutoff:"January 2025",provider_ids:{
      first_party:"claude-opus-4-1-20250805",bedrock:"us.anthropic.claude-opus-4-1-20250805-v1:0",vertex:"claude-opus-4-1@20250805",foundry:"claude-opus-4-1",anthropic_aws:"claude-opus-4-1-20250805",anthropic_google_cloud:null,mantle:null,gateway:"claude-opus-4-1-20250805"
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_1_OPUS",context:{
      window:200000,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:32000
    },pricing:"tier_15_75",capabilities:["context_management"]
  },{
    id:"claude-opus-4-5",family:"opus",display_name:"Opus 4.5",knowledge_cutoff:"May 2025",provider_ids:{
      first_party:"claude-opus-4-5-20251101",bedrock:"us.anthropic.claude-opus-4-5-20251101-v1:0",vertex:"claude-opus-4-5@20251101",foundry:"claude-opus-4-5",anthropic_aws:"claude-opus-4-5-20251101",anthropic_google_cloud:"claude-opus-4-5-20251101",mantle:null,gateway:"claude-opus-4-5-20251101"
    },eager_input_streaming:{
      vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_5_OPUS",fallback_3p:"claude-opus-4-1",context:{
      window:200000,supports_1m_suffix:!0
    },max_output_tokens:{
      default:32000,upper:64000
    },pricing:"tier_5_25",capabilities:["context_management"]
  },{
    id:"claude-opus-4-6",family:"opus",display_name:"Opus 4.6",knowledge_cutoff:"May 2025",provider_ids:{
      first_party:"claude-opus-4-6",bedrock:"us.anthropic.claude-opus-4-6-v1",vertex:"claude-opus-4-6",foundry:"claude-opus-4-6",anthropic_aws:"claude-opus-4-6",anthropic_google_cloud:"claude-opus-4-6",mantle:null,gateway:"claude-opus-4-6"
    },eager_input_streaming:{
      vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_6_OPUS",fallback_3p:"claude-opus-4-5",context:{
      window:200000,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_5_25",capabilities:["effort","max_effort","adaptive_thinking","context_management"],advisor_rank:3
  },{
    id:"claude-opus-4-7",family:"opus",display_name:"Opus 4.7",knowledge_cutoff:"January 2026",provider_ids:{
      first_party:"claude-opus-4-7",bedrock:"us.anthropic.claude-opus-4-7",vertex:"claude-opus-4-7",foundry:"claude-opus-4-7",anthropic_aws:"claude-opus-4-7",anthropic_google_cloud:"claude-opus-4-7",mantle:"anthropic.claude-opus-4-7",gateway:"claude-opus-4-7"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_7_OPUS",fallback_3p:"claude-opus-4-6",context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_5_25",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","context_management"],default_effort:"xhigh",image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:4
  },{
    id:"claude-opus-4-8",family:"opus",display_name:"Opus 4.8",knowledge_cutoff:"January 2026",provider_ids:{
      first_party:"claude-opus-4-8",bedrock:"us.anthropic.claude-opus-4-8",vertex:"claude-opus-4-8",foundry:"claude-opus-4-8",anthropic_aws:"claude-opus-4-8",anthropic_google_cloud:"claude-opus-4-8",mantle:"anthropic.claude-opus-4-8",gateway:"claude-opus-4-8"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_4_8_OPUS",fallback_3p:"claude-opus-4-7",context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_5_25",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","mid_conv_system","mid_conv_tool_change","context_management","fast_mode","lean_prompt"],default_effort:"high",effort_cost_index:{
      low:0.72,medium:0.9,high:1,xhigh:1.65,max:1.88
    },image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:4
  },{
    id:"claude-opus-5",family:"opus",display_name:"Opus 5",knowledge_cutoff:"May 2026",provider_ids:{
      first_party:"claude-opus-5",bedrock:"us.anthropic.claude-opus-5",vertex:"claude-opus-5",foundry:"claude-opus-5",anthropic_aws:"claude-opus-5",anthropic_google_cloud:"claude-opus-5",mantle:"anthropic.claude-opus-5",gateway:"claude-opus-5"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_5_OPUS",fallback_3p:"claude-opus-4-8",context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_5_25",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","mid_conv_system","mid_conv_tool_change","context_management","thinking_disabled_effort_cap","fast_mode","lean_prompt","refusal_fallback","opus_5_prompt_bundle"],default_effort:"high",effort_cost_index:{
      low:0.67,medium:0.76,high:1,xhigh:1.6,max:1.7
    },image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:4
  },{
    id:"claude-opus-5-5",family:"opus",display_name:"Opus 5.5",knowledge_cutoff:"June 2026",provider_ids:{
      first_party:"claude-opus-5-5",bedrock:"us.anthropic.claude-opus-5-5",vertex:"claude-opus-5-5",foundry:"claude-opus-5-5",anthropic_aws:"claude-opus-5-5",anthropic_google_cloud:"claude-opus-5-5",mantle:"anthropic.claude-opus-5-5",gateway:"claude-opus-5-5"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_5_5_OPUS",fallback_3p:"claude-opus-5",context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0,supports_1m_suffix:!0
    },max_output_tokens:{
      default:128000,upper:128000
    },pricing:"tier_4_20_cache_read_0_20",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","rejects_disabled_thinking","mid_conv_system","mid_conv_tool_change","per_turn_effort","per_turn_timing","context_management","fast_mode","lean_prompt","refusal_fallback","opus_5_5_prompt_bundle"],default_effort:"medium",image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:4
  },{
    id:"claude-fable-5",family:"fable",display_name:"Fable 5",knowledge_cutoff:"January 2026",provider_ids:{
      first_party:"claude-fable-5",bedrock:"us.anthropic.claude-fable-5",vertex:"claude-fable-5",foundry:"claude-fable-5",anthropic_aws:"claude-fable-5",anthropic_google_cloud:"claude-fable-5",mantle:"anthropic.claude-fable-5",gateway:"claude-fable-5"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_FABLE_5",fallback_3p:"claude-opus-5-5",context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_10_50",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","rejects_disabled_thinking","mid_conv_system","mid_conv_tool_change","context_management","lean_prompt","fable_5_mitigations","refusal_fallback"],default_effort:"high",effort_cost_index:{
      low:0.6,medium:0.77,high:1,xhigh:1.74,max:1.91
    },image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:5
  },{
    id:"claude-fable-5-1",family:"fable",display_name:"Fable 5.1",knowledge_cutoff:"June 2026",provider_ids:{
      first_party:"claude-fable-5-1",bedrock:"us.anthropic.claude-fable-5-1",vertex:"claude-fable-5-1",foundry:"claude-fable-5-1",anthropic_aws:"claude-fable-5-1",anthropic_google_cloud:"claude-fable-5-1",mantle:"anthropic.claude-fable-5-1",gateway:"claude-fable-5-1"
    },eager_input_streaming:{
      bedrock:!0,vertex:!0
    },vertex_region_env_var:"VERTEX_REGION_CLAUDE_FABLE_5_1",fallback_3p:"claude-fable-5",context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_10_50_cache_read_0_25",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","rejects_disabled_thinking","mid_conv_system","mid_conv_tool_change","per_turn_effort","per_turn_timing","context_management","lean_prompt","fable_5_mitigations","refusal_fallback","fable_5_1_prompt_bundle"],default_effort:"high",effort_cost_index:{
      low:0.75,medium:0.86,high:1,xhigh:1.38,max:1.74
    },image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:5
  },{
    id:"claude-mythos-5",family:"mythos",display_name:"Mythos 5",knowledge_cutoff:"January 2026",provider_ids:{
      first_party:"claude-mythos-5",bedrock:null,vertex:null,foundry:null,anthropic_aws:null,anthropic_google_cloud:null,mantle:null,gateway:null
    },context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_10_50",capabilities:[],image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:5
  },{
    id:"claude-mythos-5-1",family:"mythos",display_name:"Mythos 5.1",knowledge_cutoff:"June 2026",provider_ids:{
      first_party:"claude-mythos-5-1",bedrock:null,vertex:null,foundry:null,anthropic_aws:null,anthropic_google_cloud:null,mantle:null,gateway:null
    },context:{
      window:1e6,native_1m:!0,supports_1m_beta:!0
    },max_output_tokens:{
      default:64000,upper:128000
    },pricing:"tier_10_50_cache_read_0_25",capabilities:["effort","max_effort","xhigh_effort","adaptive_thinking","rejects_disabled_thinking","mid_conv_system","mid_conv_tool_change","per_turn_timing","context_management","lean_prompt","fable_5_mitigations","fable_5_1_prompt_bundle"],default_effort:"high",effort_cost_index:{
      low:0.75,medium:0.86,high:1,xhigh:1.38,max:1.74
    },image_limits:{
      maxWidth:2000,maxHeight:2000
    },advisor_rank:5
  }],aliases:{
    opus:{
      default:"claude-opus-5-5",per_provider:{
        bedrock:"claude-opus-5-5",vertex:"claude-opus-5-5",foundry:"claude-opus-4-6",mantle:"claude-opus-5-5",anthropic_aws:"claude-opus-5-5",gateway:"claude-opus-4-7"
      }
    },sonnet:{
      default:"claude-sonnet-5",per_provider:{
        bedrock:"claude-sonnet-4-5",vertex:"claude-sonnet-4-5",foundry:"claude-sonnet-4-5",mantle:"claude-sonnet-4-5",anthropic_aws:"claude-sonnet-4-6",gateway:"claude-sonnet-4-6"
      }
    },haiku:{
      default:"claude-haiku-4-5"
    },fable:{
      default:"claude-fable-5-1",per_provider:{
        gateway:"claude-fable-5"
      }
    }
  },defaults:{
  },best:"fable",latest_per_family:{
    fable:"claude-fable-5-1",opus:"claude-opus-5-5",sonnet:"claude-sonnet-5",haiku:"claude-haiku-4-5"
  },alias_migration:{
  }
};
function v(){
  return{
    bakedCatalog:void 0,canonicalNameMemo:new Map,mainLoopCanonical:void 0,servedCapabilityLookup:void 0,featureGateLookup:void 0,modelKnowledge:void 0
  }
}var g;
function R0(){
  if(g===void 0)g=v();
  return g
}var C=f(()=>u({
  first_party:o(),bedrock:o().nullish(),vertex:o().nullish(),foundry:o().nullish(),anthropic_aws:o().nullish(),anthropic_google_cloud:o().nullish(),mantle:o().nullish(),gateway:o().nullish()
}).loose()),x=f(()=>u({
  input:k(),output:k(),cache_write_5m:k().optional(),cache_write_1h:k().optional(),cache_read:k().optional(),web_search:k().optional()
}).loose()),E=f(()=>u({
  id:o(),family:o(),display_name:o(),slogan:o().optional(),knowledge_cutoff:o().optional(),provider_ids:C(),eager_input_streaming:u({
    bedrock:R(!0).optional(),vertex:R(!0).optional()
  }).loose().optional(),vertex_region_env_var:o().optional(),fallback_3p:o().optional(),context:u({
    window:k(),native_1m:H().optional(),native_1m_3p:u({
      bedrock:R(!0).optional(),vertex:R(!0).optional(),foundry:R(!0).optional()
    }).loose().optional(),supports_1m_beta:H().optional(),supports_1m_suffix:H().optional()
  }).loose().optional(),max_output_tokens:u({
    default:k(),upper:k()
  }).loose().optional(),pricing:Fe([o(),x()]).optional(),capabilities:A(o()).default([]),default_effort:G(["low","medium","high","xhigh","max"]).optional(),effort_cost_index:u({
    low:k().positive().optional(),medium:k().positive().optional(),high:k().positive().optional(),xhigh:k().positive().optional(),max:k().positive().optional()
  }).loose().optional(),image_limits:u({
    maxWidth:k().optional(),maxHeight:k().optional(),maxBase64Size:k().optional()
  }).loose().optional(),advisor_rank:k().optional(),fallback_chain:A(o()).optional(),picker:u({
    section:G(["main","overflow","deprecated"]).optional(),badge:o().optional(),disabled_reason:o().optional(),tiers:A(o()).optional()
  }).loose().optional(),deprecation:u({
    retirement_dates:fe(o(),o()).optional(),remapped_to:o().optional()
  }).loose().optional(),min_cli_version:o().optional()
}).loose()),w=f(()=>u({
  default:o(),per_provider:fe(o(),o()).optional()
}).loose()),K=f(()=>u({
  schema_version:k(),pricing_tiers:fe(o(),x()).default({
  }),models:A(E()),aliases:fe(o(),w()).default({
  }),defaults:fe(o(),o()).default({
  }),best:o().optional(),latest_per_family:fe(o(),o()).default({
  }),alias_migration:fe(o(),o()).default({
  })
}).loose());
function O(e){
  let t=new Map,n=new Map;
  for(let r of e.models){
    t.set(r.id,r);
    for(let l of Object.values(r.provider_ids)){
      if(typeof l!=="string")continue;
      let s=l.toLowerCase(),_=n.get(s);
      if(_!==void 0&&_!==r.id)throw Error("model catalog: provider id collision across distinct entries");
      n.set(s,r.id)
    }
  }return{
    catalog:e,entriesById:t,catalogIdByProviderId:n
  }
}function m(){
  let e=R0();
  if(e.bakedCatalog===void 0)e.bakedCatalog=O(L3n);
  return e.bakedCatalog
}function FYe(){
  return m().catalog
}var $1=FYe;
function _Re(e){
  return m().catalogIdByProviderId.get(e.toLowerCase())
}function Kl(e){
  return m().entriesById.get(e)
}function OBr(e){
  let t=e.pricing;
  if(typeof t!=="string")return t;
  let n=$1().pricing_tiers;
  return Object.hasOwn(n,t)?n[t]:void 0
}var HBr=["effort","max_effort","xhigh_effort","adaptive_thinking","rejects_disabled_thinking","thinking_disabled_effort_cap","mid_conv_system","mid_conv_tool_change","per_turn_effort","per_turn_timing","context_management","fast_mode","lean_prompt","fable_5_mitigations","refusal_fallback","opus_5_prompt_bundle","fable_5_1_prompt_bundle","opus_5_5_prompt_bundle","thrifty_sonic","turn_updates","bash_output_audience_note","silent_turn_reminder","thinking_display_updates","quizzical_shore","lucky_cerf","amber_astrolabe","bison_cairn","larch_cistern","org_locked_thinking"];
function ENo(e){
  R0().servedCapabilityLookup=e
}var L={
  per_turn_effort:"tengu_per_turn_effort"
};
function kNo(e){
  R0().featureGateLookup=e
}function P(e){
  let t=L[e];
  if(t===void 0)return!0;
  return R0().featureGateLookup?.(t)===!0
}function $h(e,t,n){
  return UYe(t,e)??qFt(e,t,n)
}function qFt(e,t,n){
  if(R0().servedCapabilityLookup?.(t,[n,h(e)])===!0&&P(t))return!0;
  return MBr(e,t)?!0:void 0
}function MBr(e,t){
  return Kl(h(e))?.capabilities.includes(t)
}function UYe(e,t){
  let n=a.CLAUDE_CODE_MODEL_CAPABILITIES;
  if(n===void 0)return;
  let r=h(t),l;
  for(let s of n.split(";")){
    let _=s.indexOf("=");
    if(_!==-1){
      let d=s.slice(0,_).trim();
      if(d==="")continue;
      if(!(d.endsWith("*")?r.startsWith(d.slice(0,-1)):r===d))continue
    }for(let d of(_===-1?s:s.slice(_+1)).split(",")){
      let p=d.trim(),y=!p.startsWith("-");
      if((y?p:p.slice(1))===e)l=y
    }
  }return l
}function h(e){
  return e.replace(/\[1m\]/gi,"")
}function KFt(e,t){
  let n=$1().aliases,r=Object.hasOwn(n,e)?n[e]:void 0;
  if(!r)return;
  let l=r.per_provider;
  return(l&&Object.hasOwn(l,t)?l[t]:void 0)??r.default
}function TNo(e){
  let t=KFt(e,"first_party"),n=t===void 0?void 0:Kl(t);
  if(n===void 0)throw Error("model-catalog.json: every aliases entry must name a models[] entry");
  return n.provider_ids.first_party
}var U={
  "claude-3-5-haiku":"haiku35","claude-haiku-4-5":"haiku45","claude-3-5-sonnet":"sonnet35","claude-3-7-sonnet":"sonnet37","claude-sonnet-4-0":"sonnet40","claude-sonnet-4-5":"sonnet45","claude-sonnet-4-6":"sonnet46","claude-sonnet-5":"sonnet5","claude-opus-4-0":"opus40","claude-opus-4-1":"opus41","claude-opus-4-5":"opus45","claude-opus-4-6":"opus46","claude-opus-4-7":"opus47","claude-opus-4-8":"opus48","claude-opus-5":"opus5","claude-opus-5-5":"opus55","claude-fable-5":"fable5","claude-fable-5-1":"fable51"
};
function M(e){
  let t=e.provider_ids,n={
    firstParty:t.first_party,bedrock:t.bedrock??null,vertex:t.vertex??null,foundry:t.foundry??null,anthropicAws:t.anthropic_aws??null,anthropicGoogleCloud:t.anthropic_google_cloud??null,mantle:t.mantle??null,gateway:t.gateway??t.first_party
  };
  if(e.eager_input_streaming)n.eagerInputStreaming=e.eager_input_streaming;
  return n
}function S(){
  let e={
  };
  for(let[t,n]of Object.entries(U)){
    let r=Kl(t);
    if(!r)throw new I(`model catalog missing entry for '${t}' (CATALOG_ID_TO_KEY key '${n}')`,"model catalog missing entry for CATALOG_ID_TO_KEY id");
    e[n]=M(r)
  }return e
}var Po=S();
function i(e){
  for(let t of["bedrock","vertex","foundry","anthropicAws"])if(e[t]===null)throw new I(`named CLAUDE_*_CONFIG export for '${e.firstParty}' has null ${t}`,"named model config export has null 3P provider id");
  return e
}var J=i(Po.haiku35),q=i(Po.haiku45),Z=i(Po.sonnet35),Q=i(Po.sonnet37),ee=i(Po.sonnet40),te=i(Po.sonnet45),oe=i(Po.sonnet46),ae=i(Po.sonnet5),ne=i(Po.opus40),re=i(Po.opus41),ie=i(Po.opus45),ue=i(Po.opus46),le=i(Po.opus47),se=i(Po.opus48),_e=i(Po.opus5),de=i(Po.opus55),BYe=i(Po.fable5),ANo=i(Po.fable51),CNo={
  firstParty:"claude-mythos-5",bedrock:"us.anthropic.claude-mythos-5",vertex:"claude-mythos-5",foundry:"claude-mythos-5",anthropicAws:"claude-mythos-5",anthropicGoogleCloud:"claude-mythos-5",mantle:"anthropic.claude-mythos-5",gateway:"claude-mythos-5",eagerInputStreaming:{
    bedrock:!0,vertex:!0
  }
},YFt=["opus55","opus5","opus48","opus47","opus46","opus45"],RNo=Object.values(Po).map((e)=>e.firstParty),fF=Object.fromEntries(Object.entries(Po).map(([e,t])=>[t.firstParty,e]));
function GC(e){
  let t=e.toLowerCase();
  for(let n of Object.values(Po))for(let r of Object.values(n))if(typeof r==="string"&&r.toLowerCase()===t)return n;
  return null
}var Nx={
  bedrock:"Amazon Bedrock",vertex:"Google Vertex AI",foundry:"Microsoft Foundry",anthropicAws:"Claude Platform on AWS",anthropicGoogleCloud:"Claude Platform on Google Cloud",mantle:"Amazon Bedrock (Mantle)",gateway:"Cloud gateway"
},XFt={
  bedrock:"CLAUDE_CODE_USE_BEDROCK",foundry:"CLAUDE_CODE_USE_FOUNDRY",anthropicAws:"CLAUDE_CODE_USE_ANTHROPIC_AWS",anthropicGoogleCloud:"CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",mantle:"CLAUDE_CODE_USE_MANTLE",vertex:"CLAUDE_CODE_USE_VERTEX"
};
function Pe(){
  if(wo()||njt()||rjt())return"gateway";
  return a.CLAUDE_CODE_USE_BEDROCK?"bedrock":a.CLAUDE_CODE_USE_FOUNDRY?"foundry":a.CLAUDE_CODE_USE_ANTHROPIC_AWS?"anthropicAws":a.CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD?"anthropicGoogleCloud":a.CLAUDE_CODE_USE_MANTLE?"mantle":a.CLAUDE_CODE_USE_VERTEX?"vertex":"firstParty"
}function JFt(){
  return Pe()!=="firstParty"
}function NP(){
  return c(Pe())
}function Gn(){
  return Pe()==="firstParty"
}function jYe(){
  if(Pe()==="bedrock"&&a.CLAUDE_CODE_USE_MANTLE)return"mantle";
  return null
}function z(e){
  return e.startsWith("anthropic.")&&!xNo(Jt(e))
}function Bc(e){
  if(e){
    let t=jYe();
    if(t){
      if(t==="mantle"&&z(e))return t;
      let n=Pe(),r=GC(e);
      if(r&&r[n]===null&&r[t]!==null)return t
    }
  }return Pe()
}function rc(e=Pe()){
  return e==="firstParty"||VH(e)||e==="gateway"
}function VH(e=Pe()){
  return e==="anthropicAws"||e==="anthropicGoogleCloud"
}function nmn(){
  return Gn()
}function HL(e=Pe()){
  return e==="firstParty"||VH(e)||e==="foundry"||e==="mantle"
}function $l(){
  return Pe()==="firstParty"&&Os()
}function Os(){
  if(a._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL)return!0;
  return Ty()
}function Ty(){
  let e=process.env.ANTHROPIC_BASE_URL;
  if(!e)return!0;
  return yb(e)
}function DBr(){
  let e=a.ANTHROPIC_BASE_URL;
  if(Pe()!=="firstParty"||!e||a.ANTHROPIC_UNIX_SOCKET!==void 0||yb(e))return;
  try{
    return new URL(e).host||void 0
  }catch{
    return
  }
}function yb(e){
  try{
    let t=new URL(e).host;
    return["api.anthropic.com"].includes(t)
  }catch{
    return!1
  }
}function FFe(){
  return Os()||a.CLAUDE_CODE_PROPAGATE_TRACEPARENT
} export{
  L3n,R0,FYe,$1,_Re,Kl,OBr,HBr,ENo,kNo,$h,qFt,MBr,UYe,KFt,TNo,Po,BYe,ANo,CNo,YFt,RNo,fF,GC,Nx,XFt,Pe,JFt,NP,Gn,jYe,Bc,rc,VH,nmn,HL,$l,Os,Ty,DBr,yb,FFe
};