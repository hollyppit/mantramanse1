// Opposite verdicts inside one career chapter must not be shown together.
import {oppose} from './lib.mjs';
export function applyCareerConflicts(entries){
 oppose(entries,['c03-salin-A','c03-salin-B'],['c03-sanggwan-A','c03-sanggwan-B']);
 oppose(entries,['c04-leader'],['c04-craft','c04-solo']);
 oppose(entries,['c04-expert'],['c04-field']);
 oppose(entries,['c06-bigorg-A','c06-bigorg-B','c06-public'],['c06-smallfree','c06-startup']);
 oppose(entries,['c09-expand'],['c09-stable']);
 oppose(entries,['c09-product'],['c09-prepare']);
 oppose(entries,['c09-lonely'],['c09-team']);
 return entries;
}
