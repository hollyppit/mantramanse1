// Request-local instrumentation. Never records keys, arguments, bodies, errors or result values.
const readMethods = new Set(['get','getMany','readingCatalog','readingResearchState','readingKnowledge','publishedLibrary']);
export function observeReadingStore(store, env, observation) {
 if (!observation) return store;
 const colo = /^[A-Z]{3}$/.test(observation.colo || '') ? observation.colo : 'UNK';
 const source = observation.synthetic ? 'synthetic' : 'real';
 return new Proxy(store, {get(target, method) {
  const fn = target[method]; if (typeof fn !== 'function') return fn;
  if (!readMethods.has(method)) return fn.bind(target);
  return async (...args) => {
   const key = method === 'get' ? args[0] : null;
   const category = method === 'get' ? (key === 'src:idx' ? 'source-index' : key === 'ik:agentic:runtime' ? 'research-state' : key === 'ik:engine:settings' ? 'settings' : 'single') : method;
   const started = Date.now(); let ok = false;
   try { const value = await fn.apply(target,args); ok = true; return value; }
   finally {
    try { env.READING_MONITOR?.writeDataPoint({indexes:['mantramanse/storage'],blobs:['storage',source,'other','read-'+category,colo],doubles:[ok?200:503,Math.max(0,Date.now()-started),0,ok?1:0]}); } catch {}
   }
  };
 }});
}
