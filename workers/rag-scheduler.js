// Daily 03:00 KST invocation advances bounded durable checkpoints for one daily task.
export default {
  async scheduled(controller,env) {
    if(!env.RAG_SCHEDULER_SECRET||!env.RAG_API_ORIGIN)throw Error('scheduler-not-configured');
    const origin=new URL(env.RAG_API_ORIGIN);
    if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('invalid-api-origin');
    // Advance block production once per scheduled invocation, independently of a research no-op.
    try{const blocks=await fetch(origin.origin+'/api/reading-blocks?a=scheduled',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(170000),headers:{authorization:'Bearer '+env.RAG_SCHEDULER_SECRET,'content-type':'application/json'},body:'{}'});
    if(!blocks.ok)console.warn('reading-block-scheduler-http-'+blocks.status);
    }catch{console.warn('reading-block-scheduler-unavailable');}
    for(let step=0;step<8;step++){
      const response=await fetch(origin.origin+'/api/agentic-rag?a=scheduled',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(55000),headers:{authorization:'Bearer '+env.RAG_SCHEDULER_SECRET,'content-type':'application/json'},body:'{}'});
      if(!response.ok)throw Error('research-scheduler-http-'+response.status);
      const result=await response.json();
      if(result.blocked==='expired-step-needs-recovery')throw Error(result.blocked);
      if(result.blocked||result.completed||['completed','failed','cancelled'].includes(result.state))return result;
    }
    throw Error('research-checkpoint-limit');
  }
};
