import { test, expect } from '@playwright/test';
import {
    seedUSCookies,
    setAmazonUSZip,
    openHamburger,
    goToElectronicsTvVideo,
    getSecondBestSellerPrice
} from '../helpers/amazon';

const THRESHOLD = Number(process.env.PRICE_THRESHOLD ?? '100');
const ZIP = process.env.ZIP ?? '10001';

test.describe('Amazon - Best Sellers price check (TV & Video)', () => {
    test.use({ actionTimeout: 2000, navigationTimeout: 5000 });
    test('fails if 2nd Best Seller > $' + THRESHOLD, async ({ page, context, baseURL }) =>{
        await seedUSCookies(context);

        await page.goto(baseURL!);
        await setAmazonUSZip(page, ZIP);

        await openHamburger(page);
        await goToElectronicsTvVideo(page);

        const price = await getSecondBestSellerPrice(page);
        test.info().annotations.push({ type: 'price', description: `$${price.toFixed(2)}` });

        expect(price).toBeLessThanOrEqual(THRESHOLD);
    });
});