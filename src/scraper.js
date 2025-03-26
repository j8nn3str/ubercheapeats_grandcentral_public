import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const feedURL = 'https://www.ubereats.com/feed?diningMode=PICKUP&pl=JTdCJTIyYWRkcmVzcyUyMiUzQSUyMjQ2NiUyMExleGluZ3RvbiUyMEF2ZSUyMiUyQyUyMnJlZmVyZW5jZSUyMiUzQSUyMjVkYjZjMWE5LTEwNzYtMTc5Yy1hOTQ1LTg1M2I0NzU0Njg2MyUyMiUyQyUyMnJlZmVyZW5jZVR5cGUlMjIlM0ElMjJ1YmVyX3BsYWNlcyUyMiUyQyUyMmxhdGl0dWRlJTIyJTNBNDAuNzUzNzM4NCUyQyUyMmxvbmdpdHVkZSUyMiUzQS03My45NzQ1NTY0JTdE';

const options = new chrome.Options();
options.addArguments('--headless=new'); 
options.addArguments('--no-sandbox');   
options.addArguments('--disable-dev-shm-usage'); 

const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

try {
    console.log('Opening Uber Eats...');
    await driver.get(feedURL);
    await driver.sleep(5000); 

    const cardsSelector = 'div:has(> div > div > div > a[data-testid="store-card"])';
    const cards = await driver.findElements(By.css(cardsSelector));

    const restaurants = [];
    for (let card of cards) {
        const offerText = await card.findElement(By.css('picture + div > div')).getText();
        if (offerText.includes('Get 1 Free') || offerText.includes('Offers')) {
            const link = await card.findElement(By.css('a[data-testid="store-card"]')).getAttribute('href');
            restaurants.push(link);
        }
    }

    console.log(`${restaurants.length} restaurants with offers found!`);

    const allCompiled = [];
    for (let i = 0; i < restaurants.length; i++) {
        const url = restaurants[i];

        console.log(`(${i + 1}/${restaurants.length}) Fetching ${url}...`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });

            const body = response.data;
            const match = body.match(/__REACT_QUERY_STATE__">(.*?)<\/script>/s);
            if (!match) {
                console.log('No data found for this restaurant.');
                continue;
            }

            const reactData = JSON.parse(decodeURIComponent(JSON.parse(`"${match[1].trim()}"`)));
            const data = reactData?.queries?.[0]?.state?.data;
            const section = data?.sections?.[0];

            if (data && section && section.isOnSale && data.catalogSectionsMap[section.uuid]) {
                const items = new Map();
                for (const { payload } of data.catalogSectionsMap[section.uuid]) {
                    for (const item of payload.standardItemsPayload.catalogItems) {
                        items.set(item.uuid, item);
                    }
                }

                const deals = Array.from(items.values()).filter(item => item.itemPromotion);
                if (deals.length) {
                    const compiled = JSON.parse(data.metaJson);
                    compiled.deals = deals;
                    delete compiled.hasMenu;

                    allCompiled.push(compiled);
                    console.log(`✔ ${compiled.name}: ${deals.length} deal(s) found`);
                } else {
                    console.log('No deals found.');
                }
            } else {
                console.log('No deals found.');
            }
        } catch (error) {
            console.error(`Error fetching data for ${url}:`, error.message);
        }

        await new Promise(r => setTimeout(r, 3000));
    }

    // Ensure the directory exists
    const outputDir = path.resolve('./src/_data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the scraped data to deals.json
    const outputPath = path.join(outputDir, 'deals.json');
    fs.writeFileSync(outputPath, JSON.stringify(allCompiled, null, 2));
    console.log('Scraping complete! Data saved to deals.json');

} finally {
    await driver.quit();
}