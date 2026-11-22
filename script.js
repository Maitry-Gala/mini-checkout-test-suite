// Product data: prices are whole rupees stored as numbers, not strings.
const PRODUCTS = [
    { id: 'notebook', name: 'Notebook', price: 50 },
    { id: 'pens', name: 'Pen set', price: 299 }
];

// Highest quantity allowed per product.
const MAX_QTY = 10;

// Short helper for document.getElementById.
const getid = (id) => document.getElementById(id);

// Built once and reused: formats a number as Indian rupees with no decimals.
const rupees = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
});

// Example: 50 -> "₹50", 1250 -> "₹1,250".
function money(amount) {
    return rupees.format(amount);
}

// The cart is the single source of truth: { productId: quantity }.
const cart = {};

// Becomes true once an order is placed, so a second submit is ignored.
let placed = false;
// Quantity each box held when the customer started editing it.
const qtyOnFocus = {};

// Draw the product list; each Add button carries its product id in data-add.
getid('products').innerHTML = PRODUCTS.map((p) =>
    `<li>${p.name} - ${money(p.price)}
        <button type="button" data-add="${p.id}" data-testid="add-${p.id}">Add ${p.name}</button>
    </li>`
).join('');

// Rebuild the cart table from the cart object.
function renderCart() {
    const rows = PRODUCTS.filter((p) => cart[p.id]);

    // Show the empty message or the table, never both.
    getid('cart-empty').hidden = rows.length > 0;
    getid('cart-table').hidden = rows.length === 0;

    getid('cart-body').innerHTML = rows.map((p) =>
        `<tr data-testid="cart-row-${p.id}">
            <td>${p.name}<br><small>${money(p.price)} each</small></td>
            <td>
                <button type="button" data-decrease="${p.id}"
                    data-testid="decrease-${p.id}" aria-label="Decrease ${p.name} quantity">−</button>
                <input type="number" min="1" max="${MAX_QTY}" step="1"
                    value="${cart[p.id]}" data-id="${p.id}"
                    data-testid="qty-${p.id}" aria-label="Quantity for ${p.name}">
                <button type="button" data-increase="${p.id}"
                    data-testid="increase-${p.id}" aria-label="Increase ${p.name} quantity">+</button>
            </td>
            <td data-testid="line-total-${p.id}">${money(p.price * cart[p.id])}</td>
            <td>
                <button type="button" data-remove="${p.id}"
                    data-testid="remove-${p.id}" aria-label="Remove ${p.name}">Remove</button>
            </td>
        </tr>`
    ).join('');

    updateTotal();
}

// Update the totals in place so a quantity box being typed in keeps its focus.
function updateTotal() {
    let total = 0;
    PRODUCTS.forEach((p) => {
        if (!cart[p.id]) return;
        const line = p.price * cart[p.id];
        total += line;
        document.querySelector(`[data-testid="line-total-${p.id}"]`).textContent = money(line);
    });
    getid('order-total').textContent = money(total);
}

// One click listener for the whole page (event delegation).
document.addEventListener('click', (e) => {
    const addButton = e.target.closest('[data-add]');
    const removeButton = e.target.closest('[data-remove]');
    const decreaseButton = e.target.closest('[data-decrease]');
    const increaseButton = e.target.closest('[data-increase]');

    // Button to focus again after the redraw replaces it.
    let focusSelector = null;

    if (addButton) {
        const id = addButton.dataset.add;
        cart[id] = Math.min(MAX_QTY, (cart[id] || 0) + 1);
    } else if (increaseButton) {
        const id = increaseButton.dataset.increase;
        cart[id] = Math.min(MAX_QTY, cart[id] + 1);
        focusSelector = `[data-increase="${id}"]`;
    } else if (decreaseButton) {
        const id = decreaseButton.dataset.decrease;
        if (cart[id] > 1) {
            // One fewer.
            cart[id] -= 1;
            focusSelector = `[data-decrease="${id}"]`;
        } else {
            // Going below 1 removes the line.
            delete cart[id];
        }
    } else if (removeButton) {
        // Remove the whole line at once.
        delete cart[removeButton.dataset.remove];
    } else {
        // The click was not on one of our buttons.
        return;
    }

    // A changed cart makes an old "cart is empty" message stale.
    getid('cart-error').textContent = '';
    getid('qty-message').textContent = '';
    renderCart();

    // Put keyboard focus back on the fresh copy of the pressed button.
    if (focusSelector) {
        const again = document.querySelector(focusSelector);
        if (again) again.focus();
    }
});

// Fires on every keystroke or arrow click in a quantity box.
getid('cart-body').addEventListener('input', (e) => {
    // Ignore events that did not come from a quantity box.
    if (!e.target.matches('[data-id]')) return;

    const id = e.target.dataset.id;
    const raw = e.target.value;
    const qty = Number(raw);

    if (raw !== '' && Number.isInteger(qty) && qty > MAX_QTY) {
        // Too large: snap to the maximum and tell the customer why.
        cart[id] = MAX_QTY;
        e.target.value = MAX_QTY;
        getid('qty-message').textContent = `Maximum quantity is ${MAX_QTY} per item. Quantity set to ${MAX_QTY}.`;
        updateTotal();
    } else if (raw !== '' && Number.isInteger(qty) && qty >= 1) {
        // Valid quantity: store it and clear any old message.
        cart[id] = qty;
        getid('qty-message').textContent = '';
        updateTotal();
    }
});

// When the box loses focus, an invalid value goes back to what it was before editing.
getid('cart-body').addEventListener('change', (e) => {
    if (!e.target.matches('[data-id]')) return;

    const id = e.target.dataset.id;
    const qty = Number(e.target.value);
    const valid = e.target.value !== '' && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY;

    // Undo any in-between keystroke the cart picked up while the customer was editing.
    if (!valid && qtyOnFocus[id] !== undefined) {
        cart[id] = qtyOnFocus[id];
        updateTotal();
    }
    e.target.value = cart[id];
});

// Remember the committed quantity when a quantity box gets focus.
getid('cart-body').addEventListener('focusin', (e) => {
    if (e.target.matches('[data-id]')) {
        qtyOnFocus[e.target.dataset.id] = cart[e.target.dataset.id];
    }
});

// Clear the quantity message as soon as focus leaves a quantity box.
getid('cart-body').addEventListener('focusout', (e) => {
    if (e.target.matches('[data-id]')) {
        getid('qty-message').textContent = '';
    }
});

// Pressing Enter in a quantity box confirms the number instead of placing the order.
getid('cart-body').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('[data-id]')) {
        e.preventDefault();
        e.target.blur();
    }
});

// Typing in the name field clears its error and its invalid styling.
getid('name').addEventListener('input', () => {
    getid('name-error').textContent = '';
    getid('name').removeAttribute('aria-invalid');
});

// Build a reference like ORD-K7M2QX from letters and digits that are easy to read.
function newReference() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let ref = '';
    for (let i = 0; i < 6; i++) {
        ref += chars[Math.floor(Math.random() * chars.length)];
    }
    return 'ORD-' + ref;
}

// Allowed name length, counted after trimming spaces.
const NAME_MIN = 3;
const NAME_MAX = 30;

// Returns an error message, or an empty string when the name is acceptable.
function validateName(name) {
    // Blank name
    if (!name) return 'Enter your name to place the order.';
    if (name.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters.`;
    if (name.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters.`;

    // Must start with a letter; then letters, combining marks, spaces, . ' ’ and - only.
    if (!/^\p{L}[\p{L}\p{M} .'’-]*$/u.test(name)) {
        return 'Use letters only (spaces, . - and apostrophes are allowed).';
    }

    // Needs at least two actual letters, so "a.." or "A. ." do not pass.
    if ((name.match(/\p{L}/gu) || []).length < 2) return 'Enter your real name.';

    return '';
}

// Handle the Place order button (and the Enter key inside the form).
getid('checkout-form').addEventListener('submit', (e) => {
    // Stop the browser from reloading the page.
    e.preventDefault();

    // Guard: once an order is placed, ignore every later submit.
    if (placed) return;

    // Trim so a name made only of spaces counts as blank.
    const name = getid('name').value.trim().replace(/\s+/g, ' ');
    const hasItems = Object.keys(cart).length > 0;
    const nameProblem = validateName(name)

    // Show a message for each problem; an empty string clears a message.
    getid('cart-error').textContent = hasItems
        ? ''
        : 'Your cart is empty. Add at least one item to place an order.';
    getid('name-error').textContent = nameProblem;

    // Mark the field invalid for assistive technology and styling.
    if (nameProblem) getid('name').setAttribute('aria-invalid', 'true');

    // Block checkout; return before touching the cart or the name so both are preserved.
    if (!hasItems || nameProblem) {
        if (nameProblem) getid('name').focus();
        return;
    }

    // From here on the order is valid.
    placed = true;
    getid('place-order').disabled = true;

    // Fill the confirmation; textContent keeps the typed name safe from HTML injection.
    getid('conf-name').textContent = name;
    getid('conf-ref').textContent = newReference();
    getid('conf-lines').innerHTML = PRODUCTS.filter((p) => cart[p.id])
        .map((p) => `<li>${cart[p.id]} × ${p.name} - ${money(p.price * cart[p.id])}</li>`)
        .join('');
    getid('conf-total').textContent = getid('order-total').textContent;

    // Swap the shop for the single confirmation.
    getid('shop').hidden = true;
    getid('confirmation').hidden = false;
});

// Draw once on load so the empty state shows correctly.
renderCart();