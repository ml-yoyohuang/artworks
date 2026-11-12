import {writeFileSync} from 'node:fs';
import {DEFAULT_AVATAR,renderResearcher} from '../src/app/researcher-avatar';
writeFileSync('public/observer.svg',renderResearcher(DEFAULT_AVATAR)+'\n');
process.stdout.write('Updated public/observer.svg from the approved defaults.\n');
