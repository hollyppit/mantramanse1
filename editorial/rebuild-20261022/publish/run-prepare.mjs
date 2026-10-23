// usage: node run-prepare.mjs <chapterId,chapterId,...>   (prepares only those chapters; per-chapter plan parts are merged into plan.json)
//        node run-prepare.mjs --merge
import {prepareAll,mergePlan} from './prepare.mjs';
const a=process.argv[2];
if(a==='--merge'){console.log(mergePlan().length+' chapters in plan.json');}
else{const plan=await prepareAll({only:a?a.split(','):null});console.log('plan.json now has '+plan.length+' chapters');}
