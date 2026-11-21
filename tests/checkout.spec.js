const { test, expect} = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

// Open index.html straight from disk; no server needed.
const PAGE = pathToFileURL(path.join(__dirname, '..', 'index.html')).href;

// Every test gets a fresh browser context and the page stores nothing, so each starts clean.
test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByTestId('cart-empty')).toBeVisible();
    await expect(page.getByTestId('order-total')).toHaveText('₹0');
});

// Reference alphabet in script.js excludes 0, 1, I and O.
const REFERENCE = /^ORD-[A-HJ-NP-Z2-9]{6}$/;

test('TC1: successful checkout shows one confirmation with a reference', async ({ page }) => {
    await page.getByTestId('add-notebook').click();
    await page.getByLabel('Full name (required)').fill('Maitry Gala');
    await page.getByRole('button', { name: 'Place order' }).click();

    const confirmation = page.getByTestId('confirmation');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText('Order confirmed');
    await expect(confirmation).toContainText('Maitry Gala');
    await expect(confirmation).toContainText('1 × Notebook - ₹50');
    await expect(page.getByTestId('order-reference')).toHaveText(REFERENCE);
    await expect(page.getByTestId('confirmation-total')).toHaveText('₹50');
    // The shop area is gone, so the customer cannot order again.
    await expect(page.locator('#shop')).toBeHidden();
});

test('TC2: blank name blocks checkout, shows a message, keeps the cart', async ({ page }) => {
    await page.getByTestId('add-pens').click();
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByTestId('name-error')).toHaveText('Enter your name to place the order.');
    await expect(page.getByTestId('confirmation')).toBeHidden();
    await expect(page.getByTestId('cart-row-pens')).toBeVisible();
    await expect(page.getByTestId('qty-pens')).toHaveValue('1');
    await expect(page.getByTestId('order-total')).toHaveText('₹299');
});

test('TC3: quantity changes update line totals and the order total exactly', async ({ page }) => {
    await page.getByTestId('add-notebook').click();
    await page.getByTestId('add-pens').click();
    await expect(page.getByTestId('order-total')).toHaveText('₹349');

    await page.getByTestId('qty-notebook').fill('3');
    await expect(page.getByTestId('line-total-notebook')).toHaveText('₹150');
    await expect(page.getByTestId('order-total')).toHaveText('₹449');

    await page.getByTestId('qty-pens').fill('2');
    await expect(page.getByTestId('line-total-pens')).toHaveText('₹598');
    await expect(page.getByTestId('order-total')).toHaveText('₹748');
});

test('TC4: a second submit after success does not create a second order', async ({ page }) => {
    await page.getByTestId('add-notebook').click();
    await page.getByLabel('Full name (required)').fill('Maitry Gala');

    // requestSubmit() fires the form's submit event even though the button is disabled,
    // so this exercises the "placed" guard itself and not just the disabled button.
    const refs = await page.evaluate(() => {
        const form = document.getElementById('checkout-form');
        form.requestSubmit();
        const first = document.getElementById('conf-ref').textContent;
        form.requestSubmit();
        const second = document.getElementById('conf-ref').textContent;
        return [first, second];
    });

    expect(refs[0]).toMatch(REFERENCE);
    // Without the guard the second submit would generate a new random reference.
    expect(refs[1]).toBe(refs[0]);
    await expect(page.getByTestId('confirmation')).toHaveCount(1);
});

test('TC5: empty cart blocks checkout and keeps the typed name', async ({ page }) => {
    await page.getByLabel('Full name (required)').fill('Maitry Gala');
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByTestId('cart-error')).toHaveText(
        'Your cart is empty. Add at least one item to place an order.'
    );
    await expect(page.getByTestId('confirmation')).toBeHidden();
    await expect(page.getByLabel('Full name (required)')).toHaveValue('Maitry Gala');
});

// Invalid names: each case runs as its own test in a fresh page.
const INVALID_NAMES = [
    ['whitespace only', '   ', 'Enter your name to place the order.'],
    ['single dot', '.', 'Name must be at least 3 characters.'],
    ['two letters', 'Al', 'Name must be at least 3 characters.'],
    ['digits only', '123', 'Use letters only (spaces, . - and apostrophes are allowed).'],
    ['letters and digit', 'A1b', 'Use letters only (spaces, . - and apostrophes are allowed).'],
    ['three dots', '...', 'Use letters only (spaces, . - and apostrophes are allowed).'],
    ['letter then dots', 'a..', 'Enter your real name.']
];

for (const [label,input, message] of INVALID_NAMES) {
    test(`TC6: invalid name "${label}" is blocked with a clear message`, async ({ page }) => {
        await page.getByTestId('add-notebook').click();
        await page.getByLabel('Full name (required)').fill(input);
        await page.getByRole('button', { name: 'Place order' }).click();

        await expect(page.getByTestId('name-error')).toHaveText(message);
        await expect(page.getByTestId('confirmation')).toBeHidden();
        await expect(page.getByTestId('order-total')).toHaveText('₹50');
    });
}

// Valid names, including an apostrophe, a hyphen and a Hindi name.
for (const valid of ["Anne-Marie O'Brien", 'मैत्री गाला']) {
    test(`TC7: valid name "${valid}" is accepted`, async ({ page }) => {
        await page.getByTestId('add-notebook').click();
        await page.getByLabel('Full name (required)').fill(valid);
        await page.getByRole('button', { name: 'Place order' }).click();

        await expect(page.getByTestId('confirmation')).toBeVisible();
        await expect(page.getByTestId('confirmation')).toContainText(valid);
    });
}

test('TC8: Add stops at the maximum quantity of 10', async ({ page }) => {
    for (let i = 0; i < 12; i++) await page.getByTestId('add-notebook').click();
    await expect(page.getByTestId('qty-notebook')).toHaveValue('10');
    await expect(page.getByTestId('order-total')).toHaveText('₹500');
});

test('TC9: + and - change quantity, and - at 1 removes the line', async ({ page }) => {
    await page.getByTestId('add-notebook').click();

    await page.getByTestId('increase-notebook').click();
    await page.getByTestId('increase-notebook').click();
    await expect(page.getByTestId('qty-notebook')).toHaveValue('3');
    await expect(page.getByTestId('order-total')).toHaveText('₹150');

    await page.getByTestId('decrease-notebook').click();
    await expect(page.getByTestId('qty-notebook')).toHaveValue('2');
    await expect(page.getByTestId('order-total')).toHaveText('₹100');

    // Two more presses: 2 -> 1, then 1 -> line removed.
    await page.getByTestId('decrease-notebook').click();
    await page.getByTestId('decrease-notebook').click();
    await expect(page.getByTestId('cart-row-notebook')).toHaveCount(0);
    await expect(page.getByTestId('cart-empty')).toBeVisible();

    // The cart must really be empty, not just look empty: checkout stays blocked.
    await page.getByLabel('Full name (required)').fill('Maitry Gala');
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByTestId('cart-error')).toHaveText(
        'Your cart is empty. Add at least one item to place an order.'
    );
    await expect(page.getByTestId('confirmation')).toBeHidden();
});

test('TC10: bad quantities fall back; too-large quantity snaps to 10 with a message', async ({ page }) => {
    await page.getByTestId('add-notebook').click();
    const qty = page.getByTestId('qty-notebook');

    // Invalid values go back to the last valid quantity.
    for (const bad of ['0', '1.5', '-3', '']) {
        await qty.fill(bad);
        await qty.blur();
        await expect(qty).toHaveValue('1');
        await expect(page.getByTestId('order-total')).toHaveText('₹50');
    }

    // Too large snaps to the maximum, shows a message, and the total follows.
    await qty.fill('75');
    await expect(qty).toHaveValue('10');
    await expect(page.getByTestId('qty-message')).toHaveText(
        'Maximum quantity is 10 per item. Quantity set to 10.'
    );
    await expect(page.getByTestId('order-total')).toHaveText('₹500');
});