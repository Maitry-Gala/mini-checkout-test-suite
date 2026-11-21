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
    ['   ', 'Enter your name to place the order.'],
    ['.', 'Name must be at least 3 characters.'],
    ['Al', 'Name must be at least 3 characters.'],
    ['123', 'Use letters only (spaces, . - and apostrophes are allowed).'],
    ['A1b', 'Use letters only (spaces, . - and apostrophes are allowed).'],
    ['...', 'Use letters only (spaces, . - and apostrophes are allowed).'],
    ['a..', 'Enter your real name.']
];

for (const [input, message] of INVALID_NAMES) {
    test(`TC6: invalid name "${input}" is blocked with a clear message`, async ({ page }) => {
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