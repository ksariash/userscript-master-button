const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/00-utils.js'),'utf8');
const ctx={URL,location:{href:'https://example.com/article'},console};vm.createContext(ctx);
vm.runInContext(src+'\nthis._test=libTest;',ctx);
const {cleanURL,amazonData,camelURL,appleMapsURL,chunkText,siteName}=ctx._test;
assert.equal(cleanURL('https://example.com/?utm_campaign=a&article=42#comments'),'https://example.com/?article=42#comments');
assert.equal(cleanURL('https://www.amazon.com/Some-Product/dp/B0ABCDEFGHI?utm_source=x'), 'https://www.amazon.com/Some-Product/dp/B0ABCDEFGHI'); // malformed 11 char ASIN, don't guess
assert.equal(cleanURL('https://www.amazon.com/Some-Product/dp/B012345678?ref_=q&utm_source=x'),'https://www.amazon.com/dp/B012345678');
assert.equal(amazonData('https://www.amazon.co.uk/gp/product/B012345678').market,'co.uk');
assert.equal(camelURL('https://amazon.com/dp/B012345678'),'https://www.camelcamelcamel.com/product/B012345678');
assert.equal(appleMapsURL('https://www.google.com/maps/search/?q=New+York'),'https://maps.apple.com/?q=New+York');
assert.equal(appleMapsURL('https://www.google.com/maps/dir/Paris/Lyon/'),'https://maps.apple.com/?daddr=Lyon&saddr=Paris');
assert.equal(appleMapsURL('https://www.google.com/maps/@40.2,-122,12z'),null);
assert.equal(siteName('www.reddit.com'),'reddit');
assert.ok(chunkText('a'.repeat(3300),1550).every(s=>s.length<=1550));
console.log('Unit tests: 9 passed');

