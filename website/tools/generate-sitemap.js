/**
 * Sitemap Generator for GoRoomz
 * Run this during build to generate sitemap.xml and sitemap-areas.xml
 * Usage: node tools/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://goroomz.in';

// Popular areas in Bangalore
const AREAS = [
  'koramangala', 'hsr-layout', 'btm-layout', 'whitefield', 'electronic-city',
  'marathahalli', 'indiranagar', 'jayanagar', 'jp-nagar', 'banashankari',
  'hebbal', 'yelahanka', 'rajajinagar', 'malleshwaram', 'basavanagudi',
  'bellandur', 'sarjapur-road', 'kengeri', 'bannerghatta-road', 'majestic',
  'mg-road', 'brigade-road', 'vijayanagar', 'nagarbhavi', 'rt-nagar',
  'hennur', 'thanisandra', 'kundanahalli', 'brookefield', 'domlur',
  'bommanahalli', 'silk-board', 'madiwala', 'wilson-garden', 'richmond-town',
  'frazer-town', 'cox-town', 'ulsoor', 'shivajinagar', 'sadashivanagar',
  'yeshwanthpur', 'peenya', 'jalahalli', 'vidyaranyapura', 'sahakarnagar',
  'ramamurthy-nagar', 'kr-puram', 'mahadevapura', 'varthur', 'kadugodi',
];

// Static pages
const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/pgs', priority: '0.9', changefreq: 'daily' },
  { url: '/search', priority: '0.8', changefreq: 'daily' },
  { url: '/category/PG', priority: '0.8', changefreq: 'daily' },
  { url: '/category/Hotel%20Room', priority: '0.7', changefreq: 'weekly' },
  { url: '/category/Home%20Stay', priority: '0.7', changefreq: 'weekly' },
  { url: '/category/Hostel', priority: '0.7', changefreq: 'weekly' },
  { url: '/about', priority: '0.5', changefreq: 'monthly' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { url: '/terms', priority: '0.3', changefreq: 'yearly' },
];

function generateSitemapXml(urls) {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const page of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';
  return xml;
}

function generateSitemapIndex() {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <sitemap>\n';
  xml += `    <loc>${SITE_URL}/sitemap-pages.xml</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '  <sitemap>\n';
  xml += `    <loc>${SITE_URL}/sitemap-areas.xml</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '  </sitemap>\n';
  xml += '</sitemapindex>\n';
  return xml;
}

// Generate main sitemap
const mainSitemap = generateSitemapXml(STATIC_PAGES);

// Generate area sitemap
const areaUrls = AREAS.map(area => ({
  url: `/pgs-in/${area}`,
  priority: '0.8',
  changefreq: 'daily',
}));
const areaSitemap = generateSitemapXml(areaUrls);

// Generate sitemap index
const sitemapIndex = generateSitemapIndex();

// Write files
const publicDir = path.resolve(__dirname, '../public');

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapIndex);
fs.writeFileSync(path.join(publicDir, 'sitemap-pages.xml'), mainSitemap);
fs.writeFileSync(path.join(publicDir, 'sitemap-areas.xml'), areaSitemap);

console.log('✅ Sitemaps generated:');
console.log('   - sitemap.xml (index)');
console.log('   - sitemap-pages.xml (' + STATIC_PAGES.length + ' pages)');
console.log('   - sitemap-areas.xml (' + AREAS.length + ' areas)');
