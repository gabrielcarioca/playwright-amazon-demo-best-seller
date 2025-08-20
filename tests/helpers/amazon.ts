import { expect, Page, Locator, BrowserContext } from '@playwright/test';

const NON_DIGIT = /\D/g;

export async function parsePriceFromItem(item: Locator): Promise<number | null> {
    const wholeText = await item.locator('.a-price .a-price-whole').first().innerText().catch(()=>'');
    const fracsText = await item.locator('.a-price .a-price-fraction').first().innerText().catch(()=>'');

    const whole = wholeText.replace(NON_DIGIT, '');
    const fracs = fracsText.replace(NON_DIGIT, '');

    if (!whole) return null;
    const fraction = (fracs || '00').padStart(2, '0');
    return Number(`${whole}.${fraction}`);
}

export async function dismissAmazonBanners(page: Page) {
    const dismiss = page.getByRole('button', { name: /Dismiss|Close/i}).first();
    if (await dismiss.isVisible()) {
        await dismiss.click().catch(() => {});
        await page.waitForTimeout(200);
    }
}

export async function clickAndClose(
    page: Page,
    btn: Locator,
    confirmGone: Locator,
    attempts = 3
) {
    const blocker = page.locator('.glux-desktop-ui-blocker');

    for (let i = 0; i < attempts; i++) {
        await btn.waitFor({ state: 'visible', timeout: 8000 });
        await btn.scrollIntoViewIfNeeded();
        await expect(btn).toBeVisible();
        await expect(btn).toBeEnabled();

        if (await blocker.isVisible()) {
            await blocker.waitFor({ state: 'hidden', timeout: 1200 }).catch(() => {});
        }

        if (await blocker.isVisible()) {
            await btn.evaluate(el => (el as HTMLButtonElement | HTMLInputElement).click());
        } else {
            await btn.click({ trial: true }).catch(() => {});
            await btn.click().catch(() => {});
        }

        try {
            await expect(confirmGone).toBeHidden({ timeout: 800 });
            return;
        } catch {
            await btn.evaluate(el => (el as HTMLButtonElement | HTMLInputElement).click());
            try {
                await expect(confirmGone).toBeHidden({ timeout: 800 });
                return;
            } catch {
                // loop and try again
            }
        }
    }

    throw new Error('Button click did not close the dialog; overlay may be persistent.');
}

/** Seed USD/en_US cookies before first navigation */
export async function seedUSCookies(context: BrowserContext) {
    await context.addCookies([
        { name: 'i18n-prefs', value: 'USD', domain: '.amazon.com', path: '/' },
        { name: 'lc-main', value: 'en_US', domain: '.amazon.com', path: '/' }
    ])
}

/** Ensure the Deliver to link exists, if not, click the Amazon logo to refresh */
export async function ensureLocationLink(page: Page) {
    const link = page.locator('#nav-global-location-popover-link');
    if (await link.isVisible()) return;
    const logo = page.locator('a#nav-logo-sprites, a.nav-logo-link, #nav-logo-sprites').first();
    if (await logo.isVisible()) await logo.click();
    await expect(page.locator('#nav-global-location-popover-link')).toBeVisible();
}

/** Open the ZIP popover, fill ZIP, apply, then done */
export async function setAmazonUSZip(page: Page, zip = '10001') {
    await ensureLocationLink(page);

    // Remember current header text
    const header = page.locator('#glow-ingress-line2');
    const before = (await header.textContent() ?? '').trim();

    // Open the Choose your location popover
    await page.locator('#nav-global-location-popover-link').click();
    const pop = page.locator('[aria-label="Choose your location"]').first();
    await expect(pop).toBeVisible();

    // Fill ZIP
    const zipInput = pop.locator('#GLUXZipUpdateInput, #GLUXPostalCode').first();
    await zipInput.fill(zip);
    await expect(zipInput).toHaveValue(zip);
    await page.waitForTimeout(1000);
    await zipInput.press('Enter').catch(()=>{});

    //const applyInput = pop.locator('input.a-button-input[aria-labelledby="GLUXZipUpdate-announce"]').first();
    //if (await applyInput.count()) await applyInput.evaluate((el: HTMLInputElement) => el.click());

    const continueBtn = await page.getByRole('button', { name: 'Continue' });
    const confirm = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: /^Continue$/i }) }).first();
    await clickAndClose(page, continueBtn, confirm);

    await expect
        .poll(async () => (await header.textContent() ?? '').trim(), {
            timeout: 20_000,
            message: 'Location header should update after applying ZIP',
    })
    .not.toBe(before);

    await dismissAmazonBanners(page);
}

function menu(page: Page) {
    return page.getByRole('dialog').locator('#hmenu-content').first();
}

/** Open hamburger menu */
export async function openHamburger(page:Page) {
    for (let i = 0; i < 3; i++) {
        await page.locator('#nav-hamburger-menu').scrollIntoViewIfNeeded();
        await page.locator('#nav-hamburger-menu').click();
        try {
            await expect(menu(page)).toBeVisible({ timeout: 700 });
            return;
        } catch {
            // try again
        }
    }
    await expect(menu(page)).toBeVisible();
}

/** Clik a hamburger item */
export async function hamburgerClick(
    page: Page, 
    label: RegExp | string, 
    opts: { shouldStayOpen?: boolean } = {}
) {
    const shouldStayOpen = opts.shouldStayOpen ?? true;

    if (!(await menu(page).isVisible())) await openHamburger(page);

    const item = page.locator('#hmenu-content a.hmenu-item').filter({ hasText: label }).first();
    await expect(item).toBeVisible();
    await item.scrollIntoViewIfNeeded();
    
    const urlHint = /\/(gp\/browse|tv|television)/i;
    let navigated = false;

    if (!shouldStayOpen) {
        await item.click({ timeout: 1200 }).catch(() => {});
        await page.waitForURL(urlHint, { timeout: 2500 }).then(() => (navigated = true)).catch(() => {});
    } else {
        await item.click().catch(() => {});
    }

    // Fallback for overlay intercepting the click
    if (!shouldStayOpen && !navigated) {
        await item.evaluate((el: HTMLAnchorElement) => el.click());
        await page.waitForURL(urlHint, { timeout: 2500 }).then(() => (navigated = true)).catch(() => {});
    }

    if (shouldStayOpen) {
        if (await menu(page).isVisible()) return;
    } else {
        if (await menu(page).isHidden()) return;
    }
}

export async function expandShopByDepartmentSeeAll(page: Page) {
    await expect(menu(page)).toBeVisible();

    const seeAll = menu(page).getByRole('link', { name: /See\s*all/i }).first();

    await seeAll.scrollIntoViewIfNeeded();
    await expect(seeAll).toBeVisible();
    await seeAll.click();

    await expect(menu(page)).toBeVisible();
}

/** Navigate Electronics -> TV & Video, then assert by heading */
export async function goToElectronicsTvVideo(page: Page) {
    await expandShopByDepartmentSeeAll(page);
    await hamburgerClick(page, /^Electronics$/i);
    await expect(menu(page)).toBeVisible();
    await hamburgerClick(page, /TV\s*&\s*Video/i, { shouldStayOpen: false });
    //await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /Televisions?\s*&\s*Video/i })).toBeVisible();
}

/** Find best sellers module and return the 2nd item's price */
export async function getSecondBestSellerPrice(page: Page): Promise<number> {
    const title = page.locator('.octopus-pc-card-title span').filter({ hasText: /best\s*sellers/i }).first();
    await expect(title).toBeVisible();
    
    const card = title.locator('xpath=ancestor::div[contains(@class,"octopus-pc-card")]').first();
    const content = card.locator('.octopus-pc-card-content, .octopus-card-content, .octopus-card-carousel-container');

    await content.scrollIntoViewIfNeeded();

    const items = content.locator('li').filter({ has: page.locator('.a-price') });
    (globalThis as any).items = items;
    const count = await items.count();
    expect(count).toBeGreaterThan(1);

    const second = items.nth(1);

    await second.highlight();
    await page.pause();

    const price = await parsePriceFromItem(second);
    if (price == null) throw new Error('Second Best Seller item has no visible price.');
    return price;
}