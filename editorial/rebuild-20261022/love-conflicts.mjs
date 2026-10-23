// Opposite or duplicate verdicts inside one love chapter must not be shown together.
import {oppose} from './lib.mjs';
export function applyLoveConflicts(entries){
 oppose(entries,['l03-chung-steady','l03-chung-low'],['l03-fric-steady','l03-fric-low']);
 oppose(entries,['l08-daewoon-day-hap-steady','l08-daewoon-day-hap-low'],['l08-daewoon-day-fric-steady','l08-daewoon-day-fric-low']);
 oppose(entries,['l08-seun-day-hap-steady','l08-seun-day-hap-low'],['l08-seun-day-fric-steady','l08-seun-day-fric-low']);
 oppose(entries,['l09-day-hap-steady','l09-day-hap-low'],['l09-day-chung-steady','l09-day-chung-low','l09-day-hyeong-steady','l09-day-hyeong-low','l09-day-friction-steady','l09-day-friction-low']);
 return entries;
}
