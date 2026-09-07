const fs = require('fs');
let html = fs.readFileSync('src/app/features/home/home.html', 'utf8');
html = html.replace(/@case \('soccer-ball'\) \{[\s\S]*?@case \('water'\)/m, `@case ('football') {
                  <app-animated-football [size]="20" customClass="text-gray-900 dark:text-white" />
                }
                @case ('soccer-ball') {
                  <app-animated-soccer [size]="20" customClass="text-gray-900 dark:text-white" />
                }
                @case ('water')`);
html = html.replace(/@case \('bicycle'\) \{[\s\S]*?@default \{/m, `@case ('bicycle') {
                  <app-animated-bicycle [size]="20" customClass="text-emerald-600 dark:text-[#c9ff3d]" />
                }
                @case ('swimmer') {
                  <app-animated-swimmer [size]="20" customClass="text-emerald-600 dark:text-[#c9ff3d]" />
                }
                @case ('spa') {
                  <app-animated-spa [size]="20" customClass="text-emerald-600 dark:text-[#c9ff3d]" />
                }
                @case ('body') {
                  <app-animated-body [size]="20" customClass="text-emerald-600 dark:text-[#c9ff3d]" />
                }
                @default {`);
fs.writeFileSync('src/app/features/home/home.html', html);
