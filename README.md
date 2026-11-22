# Mini Checkout and Browser Test Suite

A small checkout page (plain HTML, CSS and JavaScript, no backend) plus Playwright browser tests.

**Demo:** https://maitry-gala.github.io/mini-checkout-test-suite

## What it does
- Two products: Notebook (₹50) and Pen set (₹299). Add items, change the quantity (1 to 10), step with + and −, or remove a line.
- Line totals and the order total update as you change quantities.
- A quantity above 10 snaps to 10 with a message. Blank, 0, negative and decimal quantities return to the last valid quantity.
- Required field: full name (3 to 30 characters; letters, spaces, `.`, `'`, `-`).
- Checkout is blocked with a clear message when the cart is empty or the name is invalid. The cart and the typed name are kept.
- A successful order shows one confirmation with a reference such as `ORD-K7M2QX`. Further submits are ignored, so a double-click cannot create two orders.

## Project structure
```
index.html              the page
script.js               cart, totals, validation, confirmation
style.css               styling
tests/checkout.spec.js  Playwright tests
playwright.config.js    test settings
TEST_PLAN.md            risks, test cases, manual tests, mutation checks, defects
evidence/               screenshots referenced by the test plan
```

## Run the page
Open `index.html` in a browser. No server or install is needed.

## Run the automated tests
Requires Node.js 18 or newer.

```
npm install
npx playwright install chromium
npm test
```

Expected result: all tests pass (10 test cases, 17 test runs, because the invalid-name and valid-name cases run once per input).

Useful commands
```
npx playwright test -g "TC4"     run one test by name
npx playwright test --headed     watch the browser
npx playwright show-report       open the HTML report
```

On failure, screenshots and traces are saved in `test-results/` (not committed). Copy any you want to keep into `evidence/`.

## Automated tests
| ID | Checks |
|----|--------|
| TC1 | Successful checkout shows one confirmation with a reference |
| TC2 | Blank name blocks checkout; cart is preserved |
| TC3 | Quantity changes give exact line and order totals |
| TC4 | A second submit after success does not create a second order |
| TC5 | Empty cart blocks checkout; typed name is preserved |
| TC6 | Invalid names are blocked with a specific message |
| TC7 | Valid names are accepted |
| TC8 | Add stops at the maximum quantity of 10 |
| TC9 | + and − buttons; − at 1 removes the line |
| TC10 | Invalid typed quantities fall back; a too-large quantity snaps to 10 with a message |

Every test starts from a clean state (a fresh browser context and a page that stores nothing). Assertions check what the customer sees and use Playwright's auto-waiting; there are no fixed waits.

## Manual browser tests
The steps, expected results and results table are in `TEST_PLAN.md`, section 4. The two required ones:
1. **Empty cart:** with an empty cart, type a name and click Place order. Expect the cart message, no confirmation, and the name kept.
2. **Rapid double-click:** add an item, type a name, double-click Place order. Expect one confirmation.

## Checking that the tests can fail (mutation checks)
Each check changes one line in `script.js` and confirms a test fails. The exact lines, commands and evidence are in `TEST_PLAN.md`, section 5. Example (M2):

1. In the submit handler in `script.js`, change `if (placed) return;` to `// if (placed) return;`.
2. Run `npx playwright test -g "TC4"`. TC4 should fail because the two references differ.
3. Revert with `git checkout -- script.js` and run `npm test` to confirm it passes again.

## Defects found
Three defects were found and fixed (details in `TEST_PLAN.md`, section 6): a missing message for most invalid names, a typed quantity above 10 silently becoming an earlier digit, and Enter in a quantity box placing the order. 

## Design decisions
- **Whole-rupee integers for prices,** so totals add up exactly with no floating-point error.
- **One `cart` object is the source of truth.** The cart table is redrawn from it, so the screen and the data cannot disagree. Quantity edits update the totals in place, so a box being typed in keeps focus.
- **`novalidate` with custom validation.** Messages are normal elements, so they look the same in every browser and tests can assert on their text. The browser's own validation bubbles cannot be tested that way.
- **Double-submit guard.** A `placed` flag makes later submits do nothing, in addition to hiding the shop and disabling the button. TC4 submits the form directly to test the flag itself.
- **`data-testid` attributes** give tests stable hooks that do not break when text or styling changes.

## Limitations
- No backend: validation runs only in the browser, so a real store would also check on a server.
- No tax, payments or saved orders. Reload the page to start a new order.
- Browser Back leaves the page, and reloading after an order loses the confirmation.
- Names must be at least 3 characters, so two-letter names are rejected.
- Blank, 0, negative and decimal quantities revert silently; only a too-large quantity shows a message.