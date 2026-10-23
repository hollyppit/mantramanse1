// Opposite verdicts inside one wealth chapter (e.g. "salary type" vs "business type") must not be shown together.
import {oppose} from './lib.mjs';
export function applyWealthConflicts(entries){
 oppose(entries,['w02-salary','w02-post','w02-steady-low'],['w02-trade','w02-weak-edge']);
 oppose(entries,['w04-org-A','w04-org-B'],['w04-biz-A','w04-biz-B','w04-free']);
 oppose(entries,['w05-saver','w05-saver-duty'],['w05-spender-joy','w05-spender-rush','w05-comfort','w05-noplan-A','w05-noplan-B']);
 oppose(entries,['w08-steady','w08-delegate'],['w08-aggressive-A','w08-aggressive-B','w08-shortterm','w08-compare']);
 oppose(entries,['w08-research'],['w08-shortterm']);
 // same-verdict duplicates and 'balanced' vs a clearly tilted verdict
 oppose(entries,['w04-biz-A'],['w04-biz-B']);
 oppose(entries,['w05-saver'],['w05-saver-duty']);
 oppose(entries,['w05-balanced'],['w05-saver','w05-saver-duty','w05-spender-joy','w05-spender-rush','w05-comfort','w05-noplan-A','w05-noplan-B']);
 return entries;
}
