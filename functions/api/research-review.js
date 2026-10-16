import {json,isAdmin} from '../_lib.js';
import {researchReview} from '../_research-review-data.js';
// Read only: does not access a database or any external provider.
export async function onRequest({request,env}) {
 if(!isAdmin(request,env)) return json({error:'unauthorized'},401);
 if(request.method!=='GET') return json({error:'method-not-allowed'},405);
 return json(researchReview);
}
