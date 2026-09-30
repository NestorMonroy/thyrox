async function Fv(e,t){
  let n=(r)=>{
    r.delete("authorization"),r.delete("x-api-key")
  },i=await Promise.all(e.map(async(r)=>{
    switch(r.provider){
      case"anthropic":{
        if("api_key"in r.auth){
          let u=r.auth.api_key;return{
            kind:"raw",name:r.name,provider:"anthropic",baseUrl:r.base_url,...t&&{
              fetch:t
            },applyAuth:async(p)=>{
              n(p),p.set("x-api-key",u)
            },forwardUserIdentity:r.forward_user_identity===!0,headers:r.headers
          }
        }if("oauth_token"in r.auth){
          let u=r.auth.oauth_token;return{
            kind:"raw",name:r.name,provider:"anthropic",baseUrl:r.base_url,...t&&{
              fetch:t
            },applyAuth:async(p)=>{
              n(p),p.set("Authorization",`Bearer ${u}`),p.append("anthropic-beta",up)
            },forwardUserIdentity:r.forward_user_identity===!0,headers:r.headers
          }
        }let{
          resolveCredentialsFromConfig:o,TokenCache:s
        }=await import("/$bunfs/root/chunk-1venbwcy.js"),c=o({
          organization_id:r.auth.organization_id,workspace_id:r.auth.workspace_id,base_url:r.base_url,authentication:{
            type:"oidc_federation",federation_rule_id:r.auth.federation_rule_id,service_account_id:r.auth.service_account_id,identity_token:{
              source:"file",path:r.auth.identity_token_file
            }
          }
        },{
          baseURL:r.base_url,fetch:(u,p)=>ps(String(u),{
            ...p,...yi({
              url:String(u)
            }),signal:AbortSignal.timeout(1e4)
          })
        }),d=new s(c.provider,(u)=>yr("warn",`WIF advisory refresh (${r.name}): ${l(u)}`));return{
          kind:"raw",name:r.name,provider:"anthropic",baseUrl:r.base_url,...t&&{
            fetch:t
          },applyAuth:async(u)=>{
            n(u),u.set("Authorization",`Bearer ${await d.getToken()}`);for(let[p,h]of Object.entries(c.extraHeaders))u.set(p,h);u.append("anthropic-beta",up)
          },invalidateAuth:()=>d.invalidate(),forwardUserIdentity:r.forward_user_identity===!0,headers:r.headers
        }
      }case"bedrock":{
        let{
          AnthropicBedrock:o
        }=await import("/$bunfs/root/chunk-jwww7ab6.js"),s=r.guardrail&&{
          "X-Amzn-Bedrock-GuardrailIdentifier":r.guardrail.id,"X-Amzn-Bedrock-GuardrailVersion":r.guardrail.version
        },c={
          awsRegion:r.region,...r.base_url&&{
            baseURL:r.base_url
          },timeout:qs,fetchOptions:{
            ...yi({
              url:void 0
            }),timeout:!1
          },maxRetries:0,...t&&{
            fetch:t
          }
        };if(!r.auth.aws_access_key_id!==!r.auth.aws_secret_access_key||r.auth.aws_session_token&&!r.auth.aws_access_key_id)throw Error("bedrock upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)");if(r.assume_role&&r.auth.aws_bearer_token)throw Error("bedrock upstream: assume_role needs SigV4 source credentials (access keys or the ambient AWS chain); aws_bearer_token cannot call sts:AssumeRole");let d=!r.auth.aws_bearer_token&&!(r.auth.aws_access_key_id&&r.auth.aws_secret_access_key),u=$H(),p={
          authToken:null,defaultHeaders:{
            ...r.headers,...Lh(),Authorization:null,...!u&&{
              "X-Api-Key":null
            },...s
          },...cA
        },h=r.assume_role&&await xv({
          upstreamName:r.name,region:r.region,roleArn:r.assume_role.role_arn,externalId:r.assume_role.external_id,sessionNameClaim:r.assume_role.session_name,sourceCredentials:r.auth.aws_access_key_id&&r.auth.aws_secret_access_key?{
            accessKeyId:r.auth.aws_access_key_id,secretAccessKey:r.auth.aws_secret_access_key,sessionToken:r.auth.aws_session_token
          }:void 0,buildClient:(R)=>new o({
            ...c,...p,providerChainResolver:async()=>R
          })
        }),g=h?h.sharedClient:r.auth.aws_bearer_token?new o({
          ...c,apiKey:r.auth.aws_bearer_token,defaultHeaders:{
            ...r.headers,...Lh(),Authorization:`Bearer ${r.auth.aws_bearer_token}`,...!u&&{
              "X-Api-Key":null
            },...s
          }
        }):r.auth.aws_access_key_id&&r.auth.aws_secret_access_key?new o({
          ...c,...p,awsAccessKey:r.auth.aws_access_key_id,awsSecretKey:r.auth.aws_secret_access_key,awsSessionToken:r.auth.aws_session_token
        }):new o({
          ...c,...p,...!a.CLAUDE_CODE_SKIP_AWS_CRED_CACHE&&{
            providerChainResolver:()=>IH(r.region)
          }
        }),y,w=!1,P=()=>y??=(async()=>{
          let{
            BedrockRuntimeClient:R
          }=await import("/$bunfs/root/chunk-1218jc5z.js");if(!r.base_url&&!/^[a-z0-9-]+$/.test(r.region))throw Error("region is not a plain AWS region name");let x=r.base_url||`https://bedrock-runtime.${r.region}.amazonaws.com`,j=await Zq({
            url:x
          }),K=r.auth.aws_bearer_token?{
            authSchemePreference:["httpBearerAuth"],token:{
              token:r.auth.aws_bearer_token
            }
          }:r.auth.aws_access_key_id&&r.auth.aws_secret_access_key?{
            authSchemePreference:["sigv4"],credentials:{
              accessKeyId:r.auth.aws_access_key_id,secretAccessKey:r.auth.aws_secret_access_key,sessionToken:r.auth.aws_session_token
            }
          }:{
            authSchemePreference:["sigv4"],...!a.CLAUDE_CODE_SKIP_AWS_CRED_CACHE&&{
              credentials:async(q)=>(await IH(r.region))(q)
            }
          };return new R({
            region:r.region,endpoint:x,requestHandler:j??new Uv.NodeHttpHandler({
              httpsAgent:x8e()
            }),maxAttempts:1,...K,...h&&{
              credentials:h.sharedCredentials
            }
          })
        })();return{
          kind:"sdk",name:r.name,provider:"bedrock",client:g,...r.guardrail&&{
            guardrail:!0
          },...h&&{
            assumeRole:h
          },...d&&{
            invalidateAuth:()=>{
              let R=pCe(r.region);if(R)y=void 0;return R
            }
          },countTokens:async(R,x)=>{
            let j=hj(R);if(!j||t)return null;try{
              return await xdn(await P(),j,x,{
                abortSignal:AbortSignal.timeout(1e4)
              })
            }catch(K){
              return yr(w?"debug":"warn",`upstream ${r.name}: bedrock CountTokens failed, using a max_tokens:1 request for the aborted-request token count: ${l(K)}`),w=!0,null
            }
          }
        }
      }case"mantle":{
        let{
          AnthropicBedrockMantle:o
        }=await import("/$bunfs/root/chunk-jwww7ab6.js");if(!r.auth.aws_access_key_id!==!r.auth.aws_secret_access_key||r.auth.aws_session_token&&!r.auth.aws_access_key_id)throw Error("mantle upstream: aws_access_key_id and aws_secret_access_key must be set together (and are required with aws_session_token)");let s=$H(),c={
          awsRegion:r.region,baseURL:r.base_url??`https://bedrock-mantle.${r.region}.api.aws/anthropic`,timeout:qs,fetchOptions:{
            ...yi({
              url:void 0
            }),timeout:!1
          },maxRetries:0,...t&&{
            fetch:t
          }
        },d={
          authToken:null,defaultHeaders:{
            ...r.headers,...Lh(),Authorization:null,...!s&&{
              "X-Api-Key":null
            }
          },...cA
        },u=!r.auth.aws_bearer_token&&!r.auth.aws_access_key_id,p;if(r.auth.aws_bearer_token)p=new o({
          ...c,apiKey:r.auth.aws_bearer_token,defaultHeaders:{
            ...r.headers,...Lh(),Authorization:`Bearer ${r.auth.aws_bearer_token}`,...!s&&{
              "X-Api-Key":null
            }
          }
        });else if(r.auth.aws_access_key_id)p=new o({
          ...c,...d,awsAccessKey:r.auth.aws_access_key_id,awsSecretAccessKey:r.auth.aws_secret_access_key,awsSessionToken:r.auth.aws_session_token
}function Oj(e,{
  requestId:t,wireModel:n,keepaliveIntervalMs:i=dj
}={
}){
  let r=new TextEncoder,o=r.encode(pj),s=e[Symbol.asyncIterator](),c=Date.now(),d=!1,u;
  return new ReadableStream({
    start(p){
      u=setInterval(()=>{
        if(!d&&Date.now()-c>=i&&(p.desiredSize??0)>0)p.enqueue(o),c=Date.now()
      },Math.ceil(i/3)),u.unref?.()
    },async pull(p){
      try{
        let{
          value:h,done:g
        }=await s.next();if(d)return;if(g){
          d=!0,clearInterval(u),p.close();return
        }let y=h,w=n!==void 0&&h.type==="message_start"&&typeof y.message==="object"&&y.message!==null?{
          ...h,message:{
            ...y.message,model:n
          }
        }:h;p.enqueue(r.encode(`event: ${w.type}
data: ${b(w)}

`)),c=Date.now()
      }catch(h){
        if(d)return;yr("warn",`upstream stream error request_id=${t??"-"}: ${Zc(l(h))}`);let g=h instanceof Ot?h.status??500:500;p.enqueue(r.encode(`event: error
data: ${b({type:"error",...t&&{request_id:t},error:{type:yl(g),message:Fc[g]??"upstream error"}})}

`)),d=!0,clearInterval(u),p.close()
      }
    },async cancel(){
      d=!0,clearInterval(u),await s.return?.(void 0).catch(()=>{
      })
    }
  })
}function kj(e,t,n){
  if(n!=="bedrock"||!t)return{
    body:e,betaHeader:t||void 0
  };
  let i=[];
  for(let o of t.split(",")){
    let s=o.trim();
    if(!s)continue;
    let c=Yut(s);
    i.push(c?c.header:s)
  }if(i.length===0)return{
    body:e,betaHeader:void 0
  };
  let r=e.anthropic_beta;
  return{
    body:{
      ...e,anthropic_beta:D([...Array.isArray(r)?r:[],...i])
    },betaHeader:void 0
  }
}async function jv(e,t,n,i,r,o,s,c,d){
  let u=kj(t,r,n),p=u.body,h={
    ...o,...u.betaHeader&&{
      "anthropic-beta":u.betaHeader
    }
  },g={
    signal:s,...Object.keys(h).length>0&&{
      headers:h
    }
  };
  if(e==="/v1/messages/count_tokens"&&n==="bedrock")return Mt(501,"not_supported","count_tokens is not supported on Bedrock upstreams",c);
  try{
    switch(e){
      case"/v1/messages":{
        if(p.stream){
          let w=await i.messages.create({
            ...p,stream:!0
          },g);
          return new Response(Oj(w,{
            requestId:c,wireModel:d
          }),{
            headers:uj
          })
        }let y=await i.messages.create(p,g);
        return Response.json(d!==void 0?{
          ...y,model:d
        }:y)
      }case"/v1/messages/count_tokens":{
        let y=await i.messages.countTokens(p,g);
        return Response.json(y)
      }
    }
  }catch(y){
    if(y instanceof Ot){
      let w=y.status??500;
      yr("warn",`${n} upstream ${w} request_id=${c??"-"}: ${Zc(y.message)}`);
      let P=Mt(w,yl(w),Pj(w,y,r),c);
      return Ph.set(P,{
        errorType:y.headers?.get("x-amzn-errortype")??void 0,message:y.message
      }),P
    }throw y
  }
}var Ej={
  400:"invalid_request_error",401:"authentication_error",403:"permission_error",404:"not_found_error",413:"request_too_large",429:"rate_limit_error",501:"not_supported",529:"overloaded_error"
},Fc={
  400:"upstream rejected the request",401:"upstream authentication failed \u2014 check the gateway operator",403:"upstream denied the request \u2014 check the gateway operator",404:"upstream resource not found",413:"request too large for this upstream",429:"upstream rate limit exceeded",500:"upstream error",501:"upstream does not support this endpoint",529:"upstream overloaded"
};
function yl(e){
