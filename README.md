# Amazon “Best Sellers (TV & Video)” – E2E Test (Playwright)

A tiny Playwright project that:

1. Opens **amazon.com**
2. Sets the location to a **US ZIP code**
3. Hamburger menu → **See all** → **Electronics** → **TV & Video**
4. Finds the **2nd item** in the **Best Sellers** module
5. Parses its price and **fails** if it’s **> PRICE_THRESHOLD**, otherwise **passes**

---

## Prerequisites

- **Node.js 18+** and **npm**

---

## Install

```bash
# clone your repo (replace with your URL)
git clone https://github.com/gabrielcarioca/playwright-amazon-demo-best-seller.git
cd <repo>

# install deps
npm install

# install browsers Playwright uses
npx playwright install
```

---

## Configure

Create a **.env** file in the project root with the desired ZIP and PRICE_THRESHOLD:

```dotenv
# .env
BASE_URL=https://www.amazon.com
ZIP=10001
PRICE_THRESHOLD=120
```

> `playwright.config.ts` loads `.env` automatically via `import 'dotenv/config'`.

---

## Run

### Headless (all tests)
```bash
npm test
```

### Headed (see the browser)
```bash
npm run test:headed
```

### UI mode (debug / step-through)
```bash
npm run test:ui
```

### Run a single file
```bash
npx playwright test tests/amazon/best_seller_price.spec.ts
```

### Open the HTML report (after a run)
```bash
npx playwright show-report
```

---

## NPM scripts (package.json)

```json
{
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "codegen": "playwright codegen https://www.amazon.com"
  }
}
```

---

## Project layout (minimal)

```
.
├─ tests/
│  ├─ amazon/
│  │  ├─ best_seller_price.spec.ts      # the test
│  │  └─ helpers/amazon.ts              # helpers: ZIP, hamburger, parsing, etc
├─ playwright.config.ts                 # loads .env, baseURL, tracing, timeouts
├─ .env                                 # ZIP, PRICE_THRESHOLD, BASE_URL
└─ package.json
```

---

## What the test asserts

- After setting the ZIP (e.g., **10001**), the header updates to reflect the US location.
- Hamburger navigation reaches **TV & Video** (menu closes; the “Televisions & Video” pill/link is visible).
- The test finds the **Best Sellers** card, selects the **2nd** product with a price, parses it, and asserts:

```ts
expect(price).toBeLessThanOrEqual(PRICE_THRESHOLD);
```

---

## Troubleshooting

- **Stuck on ZIP popover / “Continue” doesn’t click**  
  Amazon shows a brief overlay that can block pointer events. Helpers use a native DOM click and verify the dialog actually closes.
- **Hamburger “TV & Video” click ignored**  
  Helper falls back to native click to bypass the menu’s slide overlay.
- **Avoid `networkidle` waits**  
  Amazon sends continuous analytics pings. Helpers wait for **UI state** instead (popover hidden, header text changed).

---

## Optional: GitHub Actions CI

```yaml
name: e2e
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: |
          echo "BASE_URL=https://www.amazon.com" >> .env
          echo "ZIP=10001" >> .env
          echo "PRICE_THRESHOLD=120" >> .env
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
```

---
