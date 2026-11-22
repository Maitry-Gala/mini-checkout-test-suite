# Test Plan: Mini Checkout

## 1. Scope
**In scope:** the single-page checkout (`index.html`, `script.js`): two products, cart, line and order totals, name validation, quantity limits, order confirmation with a reference, protection against a second order.

**Out of scope:** backend, payments, persistence, tax (GST), placing a second order without reloading.

**Facts the tests rely on**
- Prices are whole rupees: Notebook ₹50, Pen set ₹299.
- Maximum quantity per product is 10. A larger typed number snaps to 10 and shows "Maximum quantity is 10 per item. Quantity set to 10."
- Blank, 0, negative and decimal quantities return to the last valid quantity.
- Name rules (checked after trimming): 3 to 30 characters, letters / spaces / `.` / `'` / `-` only, at least two letters.
- Clean state: the page stores nothing, so a reload gives an empty cart and a blank name.

## 2. Risks, highest first
| # | Risk | Impact | Covered by |
|---|------|--------|-----------|
| 1 | Wrong line or order total | Customer pays the wrong amount | TC1, TC3, TC9, MT3 |
| 2 | Double submit produces two orders or confirmations | Duplicate order | TC4, MT2 |
| 3 | Empty cart or invalid name is accepted | Invalid order | TC2, TC5, TC6, MT1 |
| 4 | Failed validation wipes the cart or the typed name | Customer must start again | TC2, TC5, MT1 |
| 5 | Checkout blocked with no message | Customer is stuck | TC6 |
| 6 | Quantity limits or bad quantities break totals | Wrong totals, NaN | TC8, TC9, TC10, MT3, MT8 |
| 7 | Keyboard, Enter key and screen-reader problems | Accidental orders, accessibility gaps | MT4, MT7 |

## 3. Automated tests
Tool: Playwright (Chromium). Run: `npm test`. Each test starts in a fresh browser context, so it begins with an empty cart. Assertions check what the customer sees (visible text and values) and rely on auto-waiting, with no fixed waits.

| ID | What it checks | Expected |
|----|----------------|----------|
| TC1 | Successful checkout | Confirmation visible with the name, the line `1 × Notebook - ₹50`, a reference like `ORD-XXXXXX`, total ₹50, shop area hidden |
| TC2 | Blank name with an item in the cart | "Enter your name to place the order."; no confirmation; Pen set row, quantity 1 and ₹299 kept |
| TC3 | Quantity changes | ₹349 with both items; Notebook ×3 gives ₹150 and ₹449; Pen set ×2 gives ₹598 and ₹748 |
| TC4 | Second submit after success | Same reference and one confirmation (uses `requestSubmit()` to bypass the disabled button) |
| TC5 | Empty cart with a name typed | Cart message shown; no confirmation; name kept |
| TC6 | Seven invalid names (whitespace, `.`, `Al`, `123`, `A1b`, `...`, `a..`) | The specific message for each; no confirmation; cart total unchanged |
| TC7 | Valid names (an apostrophe/hyphen name and a Devanagari name) | Confirmation shows the name |
| TC8 | Add clicked 12 times | Quantity stops at 10; total ₹500 |
| TC9 | + and − buttons | Quantity and total follow; − at 1 removes the line; checkout stays blocked afterwards |
| TC10 | Typed quantities | `0`, `1.5`, `-3` and blank return to the last valid quantity with the total unchanged; `75` snaps to 10, shows "Maximum quantity is 10 per item. Quantity set to 10.", total ₹500 |

TC6 and TC7 run once per input, so `npm test` reports 17 test runs from these 10 test cases.
Result of the last run: [17 passed] on 21-11-26, Node v22.16.0 , Playwright 1.65.1.

**Not automated (lower risk, covered manually):** Remove button, trimming and collapsing spaces in the name, quantity message clearing when the box loses focus, Enter key in a quantity box, keyboard focus, narrow screen layout, browser Back.

## 4. Manual testing

### How to run every manual test
1. Open `index.html` in the browser. Reload before every test; a reload is the clean state.
2. Follow the steps exactly and take a screenshot of the result. Save it in `evidence/` under the name shown.
3. Record what actually happened in "Actual", even when it matches.
4. Mark pass only if actual equals expected. If not, decide whether the page or the expectation is wrong, and log a defect (section 6) only for a real problem.

Browser and version: Chrome 157   OS: Windows   Date: 21-11-2026

### manual tests
**MT1: Empty cart**
- Steps: reload; type `Maitry Gala` in Full name; click Place order.
- Expected: "Your cart is empty. Add at least one item to place an order."; no confirmation; `Maitry Gala` still in the field; total ₹0.
- Actual: same as expected   Result: pass   Evidence: `evidence/mt1.png`

**MT2: Rapid double-click on Place order**
- Steps: reload; click Add Notebook; type `Maitry Gala`; double-click Place order as fast as you can. Repeat 5 times, reloading each time. Then do 3 runs pressing Enter twice quickly in the name field.
- Expected: exactly one "Order confirmed" section and one reference each time.
- Actual: as Expected
- Result: pass   Evidence: `evidence/mt2.png` 

**MT3: Invalid quantity inputs**
- Steps: Add both items. Type `0`, `-1`, `1.5`, then blank in a quantity box, clicking away each time.
- Expected: Box returns to the last valid quantity; no `NaN` or negative values in any total.
- Actual: Tested with 1.5 it falls back to 1 Result: pass   Evidence: `evidence/mt3.png`

**MT4: Keyboard-only navigation**
- Steps: Add an item. Use only Tab, Enter and Space to press +, −, Remove and Place order.
- Expected: Every control is reachable and working using the keyboard; focus moves appropriately after removing an item.
- Actual: as Expected   Result: pass   Evidence: `evidence/mt4.png`

**MT5: Remove items and decrease quantity**
- Steps: Add both items. Remove each line using the Remove button; alternatively, press − when an item's quantity is 1.
- Expected: Row disappears, total decreases correctly, and "Your cart is empty." appears after the last item is removed.
- Actual: As Expected   Result: pass   Evidence: `evidence/mt5.png`

**MT6: Name whitespace handling**
- Steps: Add an item. Type `  Maitry    Gala  ` as the name and click Place order.
- Expected: Confirmation displays the trimmed name as `Maitry Gala`, with extra spaces removed.
- Actual: As Expected   Result: pass   Evidence: `evidence/mt6.png`


**MT7: Enter key inside quantity field**
- Steps: Add an item, enter a valid name, click into a quantity box and press Enter.
- Expected: Order is not placed; the box returns to the last valid quantity.
- Actual: As Expected   Result:  (after fix for D3 - pass)   Evidence: `evidence/mt7.png`

**MT8: Maximum quantity validation**
- Steps: Add an item and type `75` in its quantity box.
- Expected: Quantity is capped at 10, total matches 10, and the message "Maximum quantity is 10 per item. Quantity set to 10." appears and disappears after clicking elsewhere.
- Actual: As Expected   Result: pass   Evidence: `evidence/mt8.png`

**MT9: Maximum name length**
- Steps: Try typing a name longer than 30 characters in the Full name field.
- Expected: Typing stops at 30 characters; no additional characters are accepted.
- Actual: As Expected   Result: pass   Evidence: `evidence/mt9.png`

**MT10: Mobile responsiveness**
- Steps: Resize the browser window to phone width and navigate through the cart and checkout sections.
- Expected: Layout remains usable; all controls and content are visible without horizontal scrolling.
- Actual: As Expected   Result: pass   Evidence: `evidence/mt10.png`

**MT11: Browser Back and reload**
- Steps: Add an item, enter a valid name and place an order. After confirmation, press the browser Back button, then return to the checkout page.
- Expected: Back navigation leaves the page; reloading displays an empty cart, as described in Known Limitations.
- Actual: As Expected   Result: pass   Evidence: `evidence/mt11.png`


## 5. Mutation checks (do the tests catch faults?)
Method for each: change one line in `script.js`, run the command, compare with the expected failures, then revert with `git checkout -- script.js` and confirm `npm test` is green again.

| # | Change (file, line) | Predicted | Actual failures | Evidence |
|---|---------------------|-----------|-----------------|----------|
| M1 | PRODUCTS: Notebook price `50` → `100` | As price is hardcoded in test cases it fails which TC uses it  | TC1, TC3, TC6, TC8 | evidence/m1-failure.png |
| M2 | Submit handler: `if (placed) return;` → `// if (placed) return;` |It will be able to create multiple confirmation on same order  | TC4 | evidence/m2-failure.png |
| M3 | Submit handler: `getid('name-error').textContent = nameProblem;` → `getid('name-error').textContent = name ? '' : 'Enter your name to place the order.';` | Any name is allowed without any checks | TC6 | evidence/m3-failure.png |
| M4 | Add branch: `cart[id] = Math.min(MAX_QTY, (cart[id] \|\| 0) + 1);` → `cart[id] = (cart[id] \|\| 0) + 1;` | Qty can be added as much wanted no check on qty which can lead to qty be a 0/negative/bigger number | TC8 | evidence/m4-failure.png |

Commands: M1 `npx playwright test`; M2 `npx playwright test -g "TC4"`; M3 `npx playwright test -g "TC6"`; M4 `npx playwright test -g "TC8"`.

## 6. Defect log
**D1: No message for most invalid names**
- Steps: add an item, type `Al` (or `.`, `123`), click Place order.
- Expected: a message explaining what is wrong with the name.
- Actual: checkout was blocked but the message area stayed empty; only a blank name showed a message.
- Cause: the submit handler still used the old blank-only check when setting the message.
- How found: code review while adding the name rules; reproduced afterwards with mutation M3.
- Evidence: `evidence/m3-failure.png`
- Status: fixed; TC6 passes.

**D2: Typing a quantity above 10 silently became an earlier digit**
- Steps: add Notebook, type `75` in the quantity box, click away.
- Expected: the quantity is capped at 10 and the customer is told why.
- Actual: the box returned to `7` (typing `12` returned `1`) with no message, because the cart kept the last valid keystroke.
- How found: manual testing.
- Evidence: [evidence/d2-before1.png,/d2-before2.png]
- Status: fixed. A larger number now snaps to 10 with the message "Maximum quantity is 10 per item. Quantity set to 10." Covered by TC10 and MT8.

**D3: Enter in a quantity box placed the order**
- Steps: add an item, enter a valid name, click into a quantity box, clear it and press Enter.
- Expected: the quantity is confirmed and no order is placed.
- Actual: the form submitted and the order was confirmed with the old quantity.
- Cause: Enter inside any field of a form submits it, and the quantity boxes sit inside the checkout form.
- How found: manual testing (MT7).
- Evidence: `evidence/d3.png`,
- Status: fixed. Enter in a quantity box now confirms the number and leaves the order unplaced; verified manually in MT7. Not covered by an automated test.

## 7. Known limitations
- No way to start a second order without reloading (out of scope).
- Browser Back leaves the page, and reloading after an order loses the confirmation. A real store would keep the order on a server.
- Minimum name length is 3, so two-letter names are rejected (deliberate choice).
- Blank, 0, negative and decimal quantities revert to the last valid quantity without a message; only values above the maximum show one.
- Validation runs only in the browser; a real store would also validate on a server.