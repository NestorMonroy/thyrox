  let n=t.filter((i)=>!i.includes("(")&&!i.startsWith("mcp__"));
  return n.length>0?{
    disabledBuiltinTools:n
  }:{
  }
}function Cre(e){
  let t=e.env!==null&&typeof e.env==="object"?e.env:{
  };
  return["OTEL_EXPORTER_OTLP_PROTOCOL","OTEL_EXPORTER_OTLP_METRICS_PROTOCOL","OTEL_EXPORTER_OTLP_LOGS_PROTOCOL","OTEL_EXPORTER_OTLP_TRACES_PROTOCOL"].some((i)=>t[i]==="http/json")?"http/json":"http/protobuf"
}function Rre(e){
  let t=N$(e,["sandbox","network","allowedDomains"]);
  return t!==void 0&&t.length>0?{
    coworkEgressAllowedHosts:t
  }:{
  }
}function N$(e,t){
  let n=e;
  for(let i of t){
    if(n===null||typeof n!=="object")return;
    n=n[i]
  }return Array.isArray(n)&&n.every((i)=>typeof i==="string")?n:void 0
}var K$=new Set(["localhost","127.0.0.1","::1","[::1]"]);
function $_(e){
  return K$.has(e)
}function E_(e){
  return e===void 0||!an(e)||fl(e)
}function P_(e){
  try{
    let t=new URL(e);
    if(t.protocol==="https:")return!0;
    if(t.protocol==="http:"&&K$.has(t.hostname))return!0;
    return!1
  }catch{
    return!1
  }
}var Dre="https://api.anthropic.com",xre=new Set(["authorization","proxy-authorization","x-api-key","api-key","host","content-length","content-encoding","transfer-encoding","connection","keep-alive","te","trailer","upgrade","expect","content-type","accept","accept-encoding","user-agent","x-litellm-end-user-id"]),Mre=["anthropic-","x-stainless-","x-claude-gateway-","x-goog-","x-amz-","x-amzn-"],jre=/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/,Ure=/^[\x20-\x7e]+$/,z$="a mantle upstream needs a models list: the models your AWS account has on Mantle, named as clients send them, for example models: [claude-opus-4-7, claude-haiku-4-5]. Only these go to this upstream.",Lre=f(()=>{
  let e=de().optional(),t=de().min(1).regex(/^[\x21-\x7e]+$/,"must be a valid header value"),n=gg(de()).superRefine((o,s)=>{
    let c=new Set;for(let[d,u]of Object.entries(o)){
      let p=d.toLowerCase(),h=!jre.test(d)?"is not a valid HTTP header name":c.has(p)?"is listed twice (header names ignore case)":xre.has(p)||Mre.some((g)=>p.startsWith(g))?"is reserved (the gateway or the provider's SDK sets or signs it). Remove it from this upstream's headers.":!Ure.test(u)||u!==u.trim()?"has an empty or invalid value: use printable ASCII with no space at either end (if it comes from a ${VAR}, check that variable's value)":void 0;if(c.add(p),h)s.addIssue({
        code:rr.custom,path:[d],message:`header '${d}' ${h}`
      })
    }
  }).optional(),i=Cyn("provider",[xl({
    name:e,headers:n,provider:Ku("anthropic"),base_url:de().default(Dre).refine(ir,{
      message:"base_url targets a metadata endpoint"
    }),auth:XP([lt({
      api_key:de().min(1)
    }).strict(),lt({
      oauth_token:de().min(1)
    }).strict(),lt({
      federation_rule_id:de().min(1),organization_id:de().min(1),identity_token_file:de().min(1),service_account_id:de().optional(),workspace_id:de().optional()
    }).strict()]),forward_user_identity:ho().optional()
  }),xl({
    name:e,headers:n,provider:Ku("bedrock"),region:de().min(1),guardrail:xl({
      id:t,version:t
    }).optional(),base_url:de().optional().refine((o)=>o===void 0||ir(o),{
      message:"base_url targets a metadata endpoint"
    }),auth:xl({
      aws_access_key_id:de().min(1).optional(),aws_secret_access_key:de().min(1).optional(),aws_session_token:de().min(1).optional(),aws_bearer_token:de().min(1).optional()
    }).default({
    }).refine((o)=>!o.aws_access_key_id===!o.aws_secret_access_key,{
      message:"aws_access_key_id and aws_secret_access_key must be set together"
    }).refine((o)=>!o.aws_session_token||!!o.aws_access_key_id,{
      message:"aws_session_token requires aws_access_key_id and aws_secret_access_key"
    }),assume_role:xl({
      role_arn:de().regex(/^arn:aws(-us-gov)?:iam::\d{12}:role\/[\w+=,.@\/-]+$/,"must be an IAM role ARN (arn:aws:iam::<account>:role/<name>)"),external_id:de().regex(/^[\w+=,.@:\/-]{2,1224}$/,"must be 2 to 1224 characters of letters, digits and _+=,.@:/-").optional(),session_name:Bl(["email","sub"]).optional()
    }).optional()
  }),xl({
    name:e,headers:n,provider:Ku("mantle"),region:de().regex(/^[a-z0-9-]+$/,"must be an AWS region (lowercase alnum + hyphens)"),base_url:de().optional().refine((o)=>o===void 0||ir(o),{
      message:"base_url targets a metadata endpoint"
    }),models:Xn(de().min(1),{
      required_error:z$,invalid_type_error:z$
    }).min(1,{
      message:"a mantle upstream needs at least one entry in models: list the models your AWS account has on Mantle, named as clients send them."
    }),auth:xl({
      aws_access_key_id:de().min(1).optional(),aws_secret_access_key:de().min(1).optional(),aws_session_token:de().min(1).optional(),aws_bearer_token:de().min(1).optional()
    }).default({
    }).refine((o)=>!o.aws_access_key_id===!o.aws_secret_access_key,{
      message:"aws_access_key_id and aws_secret_access_key must be set together"
    }).refine((o)=>!o.aws_session_token||!!o.aws_access_key_id,{
      message:"aws_session_token requires aws_access_key_id and aws_secret_access_key"
    })
  }),xl({
    name:e,headers:n,provider:Ku("anthropicAws"),region:de().regex(/^[a-z0-9-]+$/,"must be an AWS region (lowercase alnum + hyphens)"),workspace_id:t,base_url:de().optional().refine((o)=>o===void 0||ir(o),{
      message:"base_url targets a metadata endpoint"
    }),auth:xl({
      api_key:de().min(1).optional(),aws_access_key_id:de().min(1).optional(),aws_secret_access_key:de().min(1).optional(),aws_session_token:de().min(1).optional()
    }).default({
    }).refine((o)=>!o.aws_access_key_id===!o.aws_secret_access_key,{
      message:"aws_access_key_id and aws_secret_access_key must be set together"
    }).refine((o)=>!o.aws_session_token||!!o.aws_access_key_id,{
      message:"aws_session_token requires aws_access_key_id and aws_secret_access_key"
    })
  }),xl({
    name:e,headers:n,provider:Ku("anthropicGoogleCloud"),project_id:de().regex(/^[A-Za-z0-9_-]+$/,"must be a GCP project id"),workspace_id:de().regex(/^[A-Za-z0-9_-]+$/,"must be a workspace id"),location:de().regex(/^[A-Za-z0-9_-]+$/,"must be a GCP location").default("global"),base_url:de().optional().refine((o)=>o===void 0||ir(o),{
      message:"base_url targets a metadata endpoint"
    }),auth:xl({
      service_account_json:de().min(1).optional(),access_token:de().min(1).optional()
    }).default({
    })
  }),xl({
    name:e,headers:n,provider:Ku("vertex"),region:de().min(1),project_id:de().min(1),base_url:de().optional().refine((o)=>o===void 0||ir(o),{
      message:"base_url targets a metadata endpoint"
    }),auth:xl({
      service_account_json:de().optional(),access_token:de().optional()
    }).default({
    })
  }),xl({
    name:e,headers:n,provider:Ku("foundry"),resource:de().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,"must be a valid DNS label"),base_url:de().optional().refine((o)=>o===void 0||ir(o),{
      message:"base_url targets a metadata endpoint"
    }),auth:XP([xl({
      api_key:de().min(1)
    }),xl({
      use_azure_ad:Ku(!0)
    })])
  })]),r=de().refine((o)=>{
    try{
      return yh(o),!0
    }catch{
      return!1
    }
  },{
    message:"must be a valid IP or CIDR"
  });return xl({
    $schema:de().optional(),listen:xl({
      host:de().default("0.0.0.0"),port:Zx.number().default(8080),tls:xl({
        cert:de(),key:de()
      }).optional(),public_url:de().url().transform((o)=>o.replace(/\/$/,"")).optional(),trusted_proxies:Xn(r).default([])
    }).refine((o)=>o.public_url!==void 0||$_(o.host),{
      path:["public_url"],message:"listen.public_url is required when listen.host is not a "+"loopback address \u2014 set it to the externally-visible origin "+"(e.g. https://claude-gateway.corp.example.com). Without it the IdP redirect_uri and token issuer would be derived from the client-controlled Host header."
    }),access_control:xl({
      allow_cidrs:Xn(r).default([]),deny_cidrs:Xn(r).default([])
    }).default({
    }),limits:xl({
      max_request_bytes:Zx.number().int().positive().default(33554432),max_request_header_bytes:Zx.number().int().positive().optional(),max_url_length:Zx.number().int().positive().optional()
    }).default({
    }),rate_limits:xl({
      device_authorization:xl({
        max:Zx.number().int().positive().default(30),window_seconds:Zx.number().int().positive().default(600)
      }).default({
      }),device_verify:xl({
        max:Zx.number().int().positive().default(10),window_seconds:Zx.number().int().positive().default(600)
      }).default({
      })
    }).default({
    }),timeouts:xl({
      upstream_ttfb_ms:Zx.number().int().positive().default(120000)
    }).default({
    }),upstreams:Xn(i).min(1).transform((o)=>o.map((s)=>({
      ...s,name:s.name??s.provider
    }))).superRefine((o,s)=>{
      let c=new Set;for(let u of o){
        if(c.has(u.name))s.addIssue({
          code:rr.custom,message:`duplicate upstream name '${u.name}' \u2014 set distinct 'name:' on each`
        });if(c.add(u.name),u.provider==="bedrock"&&u.assume_role&&u.auth.aws_bearer_token)s.addIssue({
          code:rr.custom,message:`upstream '${u.name}': assume_role needs SigV4 source credentials (access keys or the ambient AWS chain, auth: {}); aws_bearer_token cannot call sts:AssumeRole`
        });let p=u.provider==="anthropic"&&u.forward_user_identity&&URL.canParse(u.base_url)?new URL(u.base_url).hostname.replace(/\.$/,""):"";if(p==="anthropic.com"||p.endsWith(".anthropic.com")||/^aws-external-anthropic\.[^.]+\.api\.aws$/.test(p)||p==="claude.googleapis.com")s.addIssue({
          code:rr.custom,message:`upstream '${u.name}': forward_user_identity is for identifying users to a proxy you run at base_url; it is refused for ${p} so user emails are never sent to Anthropic`
        })
      }let d=o.filter((u)=>u.provider==="bedrock");if(d.some((u)=>u.guardrail)&&!d.every((u)=>u.guardrail))s.addIssue({
        code:rr.custom,message:"set guardrail: on all bedrock upstreams or none \u2014 failover could otherwise send requests to a bedrock upstream without the guardrail"
      });if(d.some((u)=>u.guardrail)&&o.some((u)=>u.provider==="mantle"))s.addIssue({
        code:rr.custom,message:"a mantle upstream cannot be used beside a bedrock upstream that has a guardrail, because the gateway applies no guardrail to requests it sends to Mantle. Remove every mantle upstream, or remove the guardrail from every bedrock upstream."
      })
    }),auto_include_builtin_models:ho().default(!0),models:Xn(xl({
      id:de().min(1),label:de().optional(),description:de().optional(),upstream_model:gg(de()).refine((o)=>Object.keys(o).length>0,{
        message:"upstream_model must set at least one upstream"
      })
    })).default([]),oidc:xl({
      issuer:de().refine(ir,{
        message:"oidc.issuer must be an http(s) URL and not target a cloud metadata endpoint"
      }),client_id:de().min(1),client_secret:de().min(1),ca_cert_pem:de().optional(),groups_claim:de().min(1).default("groups"),email_claim:XP([de().min(1),Xn(de().min(1)).min(1)]).default("email"),userinfo_fallback:ho().default(!1),use_pkce:ho().default(!0),clock_skew_seconds:Zx.number().int().nonnegative().optional(),token_endpoint_auth_method:Bl(["client_secret_basic","client_secret_post"]).optional(),id_token_signed_response_alg:Bl(["RS256","RS384","RS512","PS256","PS384","PS512","ES256","ES384","ES512","EdDSA"]).optional(),additional_authorized_parties:Xn(de()).optional(),discovery_url:de().url().refine(ir,{
        message:"oidc.discovery_url must be an http(s) URL and not target a cloud metadata endpoint"
      }).refine((o)=>{
        try{
          return new URL(o).pathname.includes("/.well-known/")
        }catch{
          return!1
        }
      },{
        message:"oidc.discovery_url must point at the discovery document itself (path containing /.well-known/) \u2014 openid-client appends /.well-known/openid-configuration to any other path"
      }).optional(),use_proxy:ho().optional(),scopes:Xn(de().trim().min(1).refine((o)=>!/\s/.test(o),{
        message:"must be a single OAuth scope token (no whitespace)"
      })).optional().refine((o)=>o===void 0||o.includes("openid"),{
        message:"oidc.scopes must include 'openid' \u2014 without it the IdP will not return an id_token"
      }),scope_on_refresh:ho().default(!1),extra_auth_params:gg(de().min(1),de()).default({
      }).refine((o)=>!Object.keys(o).some((s)=>["redirect_uri","state","nonce","code_challenge","code_challenge_method","scope","response_type","response_mode","client_id"].includes(s)),{
        message:"oidc.extra_auth_params must not override protocol parameters the gateway manages (redirect_uri, state, nonce, code_challenge*, scope, response_type, response_mode, client_id) \u2014 use oidc.scopes for scope; the gateway callback only reads query-mode responses"
      }),allowed_email_domains:Xn(de()).transform((o,s)=>{
        let c=o.map((d)=>d.trim().replace(/^@/,"").toLowerCase()).filter(Boolean);if(o.length>0&&c.length===0)s.addIssue({
          code:rr.custom,message:"allowed_email_domains contains only empty entries after normalization"
        });return c
      }).optional(),form_action_origins:Xn(de().refine(ir,{
        message:"each form_action_origin must be an http(s) URL and not target a cloud metadata endpoint"
      })).transform((o)=>o.map((s)=>new URL(s).origin)).refine((o)=>o.every((s)=>!/[;,'"\s]/.test(s)),{
        message:"oidc.form_action_origins entries must not contain CSP delimiters (; , quotes or whitespace)"
      }).default([]),allowed_groups:Xn(de()).refine((o)=>!o.length||o.some((s)=>s.trim()),{
        message:"oidc.allowed_groups contains only empty entries"
      }).transform((o)=>o.map((s)=>s.trim()).filter(Boolean)).optional(),google_groups:xl({
        service_account_json_path:de().min(1),admin_email:de().email()
      }).optional()
