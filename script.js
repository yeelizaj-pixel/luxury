
"use strict";

/* =====================================================
   LUXURY MOTORS ELITE
   Catálogo, filtros, alquileres, carrito y checkout
   ===================================================== */

const $ = (selector) => document.querySelector(selector);

let inventory = [];
let cart = [];
let activeCategory = "todos";
let selectedVehicle = null;

let rentalModal = null;
let cartModal = null;
let checkoutModal = null;

/* -----------------------------------------------------
   1. INVENTARIO DE RESPALDO
   ----------------------------------------------------- */

const fallbackInventory = {
    vehiculos: [],
    motos: []
};

/* -----------------------------------------------------
   2. FUNCIONES GENERALES
   ----------------------------------------------------- */

function formatPrice(value) {
    return new Intl.NumberFormat("es-DO", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function showMessage(message, type = "info") {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            text: message,
            icon: type,
            confirmButtonText: "Aceptar"
        });
    } else {
        alert(message);
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function getAllVehicles() {
    return [
        ...(inventory.vehiculos || []),
        ...(inventory.motos || [])
    ];
}

function getVehicleByCode(code) {
    return getAllVehicles().find(
        vehicle => String(vehicle.codigo) === String(code)
    );
}

/* -----------------------------------------------------
   3. CARGAR INVENTARIO JSON
   ----------------------------------------------------- */

async function loadInventory() {
    const grid = $("#vehicleGrid");

    if (grid) {
        grid.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-warning"></div>
                <p class="mt-3">Cargando catálogo...</p>
            </div>
        `;
    }

    try {
        const response = await fetch("./vehiculo.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("No se pudo cargar vehiculo.json");
        }

        const data = await response.json();

        if (
            !data ||
            !Array.isArray(data.vehiculos) ||
            !Array.isArray(data.motos)
        ) {
            throw new Error("La estructura del archivo JSON no es válida.");
        }

        inventory = data;

        console.log("Inventario cargado correctamente:", inventory);

    } catch (error) {
        console.error("Error cargando el inventario:", error);

        inventory = fallbackInventory;

        if (grid) {
            grid.innerHTML = `
                <div class="alert alert-warning">
                    No se pudo cargar el archivo vehiculo.json.
                    Comprueba que esté en la misma carpeta que index.html.
                    Si abriste la página directamente desde tu computadora,
                    utiliza Live Server o GitHub Pages.
                </div>
            `;
        }

        updateResultsCount(0);
        return;
    }

    renderCatalog();
}

/* -----------------------------------------------------
   4. MOSTRAR CATÁLOGO
   ----------------------------------------------------- */

function renderCatalog() {
    const grid = $("#vehicleGrid");

    if (!grid) return;

    let vehicles = getAllVehicles();

    const search = ($("#searchInput")?.value || "")
        .trim()
        .toLowerCase();

    if (activeCategory !== "todos") {
        vehicles = vehicles.filter(vehicle =>
            vehicle.categoria === activeCategory ||
            vehicle.tipo === activeCategory
        );
    }

    if (search) {
        vehicles = vehicles.filter(vehicle => {
            const searchableText = [
                vehicle.codigo,
                vehicle.marca,
                vehicle.modelo,
                vehicle.tipo,
                vehicle.categoria,
                vehicle.motor,
                vehicle.combustible,
                vehicle.caracteristicas
            ].join(" ").toLowerCase();

            return searchableText.includes(search);
        });
    }

    const sortValue = $("#sortSelect")?.value || "";

    if (sortValue === "precio-asc") {
        vehicles.sort((a, b) =>
            Number(a.precio_venta) - Number(b.precio_venta)
        );
    } else if (sortValue === "precio-desc") {
        vehicles.sort((a, b) =>
            Number(b.precio_venta) - Number(a.precio_venta)
        );
    } else if (sortValue === "nombre") {
        vehicles.sort((a, b) =>
            `${a.marca} ${a.modelo}`.localeCompare(
                `${b.marca} ${b.modelo}`
            )
        );
    }

    updateResultsCount(vehicles.length);

    const emptyState = $("#emptyState");

    if (vehicles.length === 0) {
        grid.innerHTML = "";

        if (emptyState) {
            emptyState.classList.remove("d-none");
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.add("d-none");
    }

    grid.innerHTML = vehicles.map(vehicle => {
        const image = escapeHTML(
            vehicle.imagen || "https://placehold.co/600x400?text=Vehiculo"
        );

        const brand = escapeHTML(vehicle.marca);
        const model = escapeHTML(vehicle.modelo);
        const code = escapeHTML(vehicle.codigo);
        const category = escapeHTML(vehicle.categoria);
        const features = escapeHTML(vehicle.caracteristicas);
        const stock = Number(vehicle.existencia) || 0;

        const logo = vehicle.logo
            ? `<img src="${escapeHTML(vehicle.logo)}"
                    alt="Logo ${brand}"
                    class="vehicle-brand-logo"
                    onerror="this.style.display='none'">`
            : "";

        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card vehicle-card h-100 shadow-sm">

                    <div class="vehicle-image-container">
                        <img
                            src="${image}"
                            class="card-img-top vehicle-image"
                            alt="${brand} ${model}"
                            loading="lazy"
                            onerror="this.src='https://placehold.co/600x400?text=Imagen+no+disponible'"
                        >
                    </div>

                    <div class="card-body d-flex flex-column">

                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <span class="badge bg-dark">${category}</span>
                            ${logo}
                        </div>

                        <h5 class="card-title">
                            ${brand} ${model}
                        </h5>

                        <p class="text-muted small">
                            Código: ${code}
                        </p>

                        <p class="card-text">
                            ${features}
                        </p>

                        <div class="vehicle-details mb-3">
                            <p class="mb-1">
                                <strong>Motor:</strong>
                                ${escapeHTML(vehicle.motor)}
                            </p>

                            <p class="mb-1">
                                <strong>Combustible:</strong>
                                ${escapeHTML(vehicle.combustible)}
                            </p>

                            <p class="mb-1">
                                <strong>Existencia:</strong>
                                ${stock}
                            </p>
                        </div>

                        <h5 class="text-warning fw-bold">
                            ${formatPrice(vehicle.precio_venta)}
                        </h5>

                        <div class="mt-auto d-grid gap-2">

                            <button
                                class="btn btn-dark"
                                onclick="openRental('${code}')"
                                ${stock <= 0 ? "disabled" : ""}
                            >
                                <i class="fas fa-key me-2"></i>
                                Alquilar
                            </button>

                            <button
                                class="btn btn-outline-warning"
                                onclick="addPurchaseToCart('${code}')"
                                ${stock <= 0 ? "disabled" : ""}
                            >
                                <i class="fas fa-shopping-cart me-2"></i>
                                Comprar
                            </button>

                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function updateResultsCount(quantity) {
    const counter = $("#resultsCount");

    if (counter) {
        counter.textContent = `${quantity} resultados`;
    }
}

/* -----------------------------------------------------
   5. FILTROS Y BÚSQUEDA
   ----------------------------------------------------- */

function setupFilters() {
    const searchInput = $("#searchInput");
    const sortSelect = $("#sortSelect");

    if (searchInput) {
        searchInput.addEventListener("input", renderCatalog);
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", renderCatalog);
    }

    document.querySelectorAll(".category-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            activeCategory = tab.dataset.category || "todos";

            document.querySelectorAll(".category-tab").forEach(item => {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            renderCatalog();
        });
    });
}

/* -----------------------------------------------------
   6. MODALES
   ----------------------------------------------------- */

function setupModals() {
    if (typeof bootstrap === "undefined") {
        console.warn(
            "Bootstrap no está disponible. El catálogo seguirá funcionando."
        );
        return;
    }

    const rentalElement = $("#rentalModal");
    const cartElement = $("#cartModal");
    const checkoutElement = $("#checkoutModal");

    if (rentalElement) {
        rentalModal = bootstrap.Modal.getOrCreateInstance(rentalElement);
    }

    if (cartElement) {
        cartModal = bootstrap.Modal.getOrCreateInstance(cartElement);
    }

    if (checkoutElement) {
        checkoutModal = bootstrap.Modal.getOrCreateInstance(checkoutElement);
    }

    $("#rentalMode")?.addEventListener(
        "change",
        updateRentalCalculation
    );

    $("#rentalDurationInput")?.addEventListener(
        "input",
        updateRentalCalculation
    );

    $("#addRentalButton")?.addEventListener(
        "click",
        addRentalToCart
    );

    $("#openCartButton")?.addEventListener("click", openCart);

    $("#floatingCart")?.addEventListener("click", openCart);

    $("#checkoutButton")?.addEventListener("click", openCheckout);

    $("#fillDemoButton")?.addEventListener("click", fillDemoData);

    $("#processPaymentButton")?.addEventListener(
        "click",
        processDemoPayment
    );
}

function openCart() {
    renderCart();

    if (cartModal) {
        cartModal.show();
    } else {
        showMessage(
            "El carrito está disponible, pero Bootstrap no pudo abrir la ventana."
        );
    }
}

/* -----------------------------------------------------
   7. ALQUILER DE VEHÍCULOS
   ----------------------------------------------------- */

function openRental(code) {
    const vehicle = getVehicleByCode(code);

    if (!vehicle) {
        showMessage("No se encontró el vehículo seleccionado.", "error");
        return;
    }

    if (Number(vehicle.existencia) <= 0) {
        showMessage("Este vehículo no tiene unidades disponibles.", "warning");
        return;
    }

    selectedVehicle = vehicle;

    const info = $("#rentalVehicleInfo");

    if (info) {
        info.innerHTML = `
            <h5>${escapeHTML(vehicle.marca)} ${escapeHTML(vehicle.modelo)}</h5>
            <p class="mb-1">Código: ${escapeHTML(vehicle.codigo)}</p>
            <p class="mb-1">Precio por hora: ${formatPrice(vehicle.precio_alquiler_hora)}</p>
            <p class="mb-1">Precio por día: ${formatPrice(vehicle.precio_alquiler_dia)}</p>
        `;
    }

    const duration = $("#rentalDurationInput");
    const startDate = $("#rentalStartDate");

    if (duration) duration.value = 1;

    if (startDate) {
        startDate.min = new Date().toISOString().slice(0, 16);

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

        startDate.value = now.toISOString().slice(0, 16);
    }

    if ($("#rentalMode")) {
        $("#rentalMode").value = "dia";
    }

    updateRentalCalculation();

    if (rentalModal) {
        rentalModal.show();
    } else {
        showMessage("No se pudo abrir la ventana de alquiler.", "error");
    }
}

function updateRentalCalculation() {
    if (!selectedVehicle) return;

    const mode = $("#rentalMode")?.value || "dia";
    const duration = Math.max(
        1,
        Number($("#rentalDurationInput")?.value) || 1
    );

    const price = mode === "hora"
        ? Number(selectedVehicle.precio_alquiler_hora) || 0
        : Number(selectedVehicle.precio_alquiler_dia) || 0;

    const subtotal = price * duration;

    if ($("#rentalUnitPrice")) {
        $("#rentalUnitPrice").textContent = formatPrice(price);
    }

    if ($("#rentalDurationLabel")) {
        $("#rentalDurationLabel").textContent =
            mode === "hora" ? "Horas" : "Días";
    }

    if ($("#rentalSubtotal")) {
        $("#rentalSubtotal").textContent = formatPrice(subtotal);
    }
}

function addRentalToCart() {
    if (!selectedVehicle) return;

    const mode = $("#rentalMode")?.value || "dia";
    const duration = Math.max(
        1,
        Number($("#rentalDurationInput")?.value) || 1
    );

    const startDate = $("#rentalStartDate")?.value;

    if (!startDate) {
        showMessage("Selecciona la fecha y hora de inicio.", "warning");
        return;
    }

    if (new Date(startDate) < new Date()) {
        showMessage("La fecha de inicio no puede estar en el pasado.", "warning");
        return;
    }

    const price = mode === "hora"
        ? Number(selectedVehicle.precio_alquiler_hora) || 0
        : Number(selectedVehicle.precio_alquiler_dia) || 0;

    const total = price * duration;

    cart.push({
        id: Date.now(),
        codigo: selectedVehicle.codigo,
        marca: selectedVehicle.marca,
        modelo: selectedVehicle.modelo,
        tipo: "alquiler",
        modalidad: mode,
        duracion: duration,
        fechaInicio: startDate,
        precioUnitario: price,
        cantidad: 1,
        subtotal: total
    });

    updateCart();

    if (rentalModal) rentalModal.hide();

    showMessage("El alquiler fue agregado al carrito.", "success");
}

/* -----------------------------------------------------
   8. AGREGAR COMPRA AL CARRITO
   ----------------------------------------------------- */

function addPurchaseToCart(code) {
    const vehicle = getVehicleByCode(code);

    if (!vehicle) {
        showMessage("No se encontró el vehículo.", "error");
        return;
    }

    if (Number(vehicle.existencia) <= 0) {
        showMessage("No hay unidades disponibles.", "warning");
        return;
    }

    const existingItem = cart.find(item =>
        String(item.codigo) === String(code) &&
        item.tipo === "compra"
    );

    if (existingItem) {
        existingItem.cantidad += 1;
        existingItem.subtotal =
            existingItem.cantidad * existingItem.precioUnitario;
    } else {
        const price = Number(vehicle.precio_venta) || 0;

        cart.push({
            id: Date.now(),
            codigo: vehicle.codigo,
            marca: vehicle.marca,
            modelo: vehicle.modelo,
            tipo: "compra",
            modalidad: "compra",
            duracion: 1,
            precioUnitario: price,
            cantidad: 1,
            subtotal: price
        });
    }

    updateCart();

    showMessage("Vehículo agregado al carrito.", "success");
}

/* -----------------------------------------------------
   9. CARRITO
   ----------------------------------------------------- */

function updateCart() {
    const totalItems = cart.reduce(
        (sum, item) => sum + item.cantidad,
        0
    );

    const count = $("#cartCount");
    const floatingCount = $("#floatingCartCount");

    if (count) count.textContent = totalItems;
    if (floatingCount) floatingCount.textContent = totalItems;

    renderCart();
}

function renderCart() {
    const container = $("#cartItems");
    const summary = $("#cartSummary");

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-shopping-cart fa-3x mb-3 text-muted"></i>
                <p>Tu carrito está vacío.</p>
            </div>
        `;

        if (summary) {
            summary.textContent = formatPrice(0);
        }

        return;
    }

    container.innerHTML = cart.map(item => {
        const description = item.tipo === "alquiler"
            ? `Alquiler por ${item.duracion} ${item.modalidad === "hora" ? "hora(s)" : "día(s)"}`
            : "Compra";

        return `
            <div class="cart-item border-bottom py-3">

                <div class="d-flex justify-content-between gap-3">

                    <div>
                        <h6 class="mb-1">
                            ${escapeHTML(item.marca)} ${escapeHTML(item.modelo)}
                        </h6>

                        <p class="small text-muted mb-1">
                            ${description}
                        </p>

                        <p class="small mb-1">
                            Cantidad: ${item.cantidad}
                        </p>

                        <strong>
                            ${formatPrice(item.subtotal)}
                        </strong>
                    </div>

                    <button
                        class="btn btn-sm btn-outline-danger align-self-start"
                        onclick="removeFromCart(${item.id})"
                        aria-label="Eliminar producto"
                    >
                        <i class="fas fa-trash"></i>
                    </button>

                </div>
            </div>
        `;
    }).join("");

    if (summary) {
        summary.textContent = formatPrice(getCartTotal());
    }
}

function getCartTotal() {
    return cart.reduce(
        (sum, item) => sum + item.subtotal,
        0
    );
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
}

function clearCart() {
    cart = [];
    updateCart();
}

function setupCartControls() {
    $("#clearCartButton")?.addEventListener("click", () => {
        if (cart.length === 0) {
            showMessage("El carrito ya está vacío.");
            return;
        }

        if (confirm("¿Deseas vaciar todo el carrito?")) {
            clearCart();
        }
    });
}

/* -----------------------------------------------------
   10. CHECKOUT
   ----------------------------------------------------- */

function openCheckout() {
    if (cart.length === 0) {
        showMessage("Agrega al menos un vehículo al carrito.", "warning");
        return;
    }

    if (cartModal) {
        cartModal.hide();
    }

    if ($("#checkoutTotal")) {
        $("#checkoutTotal").textContent = formatPrice(getCartTotal());
    }

    if (checkoutModal) {
        checkoutModal.show();
    } else {
        showMessage("No se pudo abrir el formulario de pago.", "error");
    }
}

function fillDemoData() {
    const demoValues = {
        "#clientName": "Juan Pérez",
        "#clientEmail": "juan.perez@example.com",
        "#clientPhone": "8095551234",
        "#clientAddress": "Santo Domingo, República Dominicana",
        "#cardName": "JUAN PEREZ",
        "#cardNumber": "4242424242424242",
        "#cardExpiry": "12/28",
        "#cardCvv": "123"
    };

    Object.entries(demoValues).forEach(([selector, value]) => {
        const element = $(selector);

        if (element) {
            element.value = value;
        }
    });

    showMessage(
        "Se completaron datos ficticios para la demostración académica.",
        "info"
    );
}

/* -----------------------------------------------------
   11. PROCESAR PAGO SIMULADO
   ----------------------------------------------------- */

function processDemoPayment() {
    const form = $("#checkoutForm");

    if (!form) {
        showMessage("No se encontró el formulario de pago.", "error");
        return;
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (cart.length === 0) {
        showMessage("El carrito está vacío.", "warning");
        return;
    }

    const client = {
        name: $("#clientName")?.value.trim() || "",
        email: $("#clientEmail")?.value.trim() || "",
        phone: $("#clientPhone")?.value.trim() || "",
        address: $("#clientAddress")?.value.trim() || ""
    };

    if (!client.name || !client.email) {
        showMessage("Completa los datos del cliente.", "warning");
        return;
    }

    const order = {
        number: `LME-${Date.now()}`,
        date: new Date().toLocaleString("es-DO"),
        client,
        items: [...cart],
        total: getCartTotal()
    };

    console.log("PEDIDO DE DEMOSTRACIÓN:", order);

    if (checkoutModal) {
        checkoutModal.hide();
    }

    showMessage(
        "La operación se ha simulado correctamente. Este proyecto académico no procesa pagos reales.",
        "success"
    );

    generateDemoPDF(order);

    clearCart();
    form.reset();
}

/* -----------------------------------------------------
   12. GENERAR DOCUMENTO PDF
   ----------------------------------------------------- */

async function generateDemoPDF(order) {
    const renderArea = $("#pdfRenderArea");

    if (!renderArea) {
        console.warn("No se encontró #pdfRenderArea.");
        return;
    }

    renderArea.innerHTML = `
        <div style="
            background:#ffffff;
            color:#222222;
            padding:35px;
            font-family:Arial,sans-serif;
        ">

            <h2 style="text-align:center;">
                LUXURY MOTORS ELITE
            </h2>

            <h3 style="text-align:center;">
                COMPROBANTE DE OPERACIÓN SIMULADA
            </h3>

            <hr>

            <p><strong>Número:</strong> ${escapeHTML(order.number)}</p>
            <p><strong>Fecha:</strong> ${escapeHTML(order.date)}</p>

            <h4>Datos del cliente</h4>

            <p><strong>Nombre:</strong> ${escapeHTML(order.client.name)}</p>
            <p><strong>Correo:</strong> ${escapeHTML(order.client.email)}</p>
            <p><strong>Teléfono:</strong> ${escapeHTML(order.client.phone)}</p>
            <p><strong>Dirección:</strong> ${escapeHTML(order.client.address)}</p>

            <hr>

            <h4>Detalle de la operación</h4>

            <table style="
                width:100%;
                border-collapse:collapse;
            ">
                <thead>
                    <tr>
                        <th style="border:1px solid #cccccc;padding:8px;">Vehículo</th>
                        <th style="border:1px solid #cccccc;padding:8px;">Tipo</th>
                        <th style="border:1px solid #cccccc;padding:8px;">Cantidad</th>
                        <th style="border:1px solid #cccccc;padding:8px;">Subtotal</th>
                    </tr>
                </thead>

                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="border:1px solid #cccccc;padding:8px;">
                                ${escapeHTML(item.marca)} ${escapeHTML(item.modelo)}
                            </td>

                            <td style="border:1px solid #cccccc;padding:8px;">
                                ${escapeHTML(item.tipo)}
                            </td>

                            <td style="border:1px solid #cccccc;padding:8px;">
                                ${item.cantidad}
                            </td>

                            <td style="border:1px solid #cccccc;padding:8px;">
                                ${formatPrice(item.subtotal)}
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <h3 style="text-align:right;margin-top:20px;">
                TOTAL: ${formatPrice(order.total)}
            </h3>

            <hr>

            <p style="text-align:center;font-size:12px;">
                Documento generado para fines de demostración académica.
                No representa un pago real ni un contrato comercial.
            </p>

        </div>
    `;

    if (typeof html2pdf === "undefined") {
        console.warn("La biblioteca html2pdf no está disponible.");
        return;
    }

    try {
        await html2pdf()
            .set({
                margin: 10,
                filename: `${order.number}.pdf`,
                image: {
                    type: "jpeg",
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                }
            })
            .from(renderArea)
            .save();

    } catch (error) {
        console.error("Error generando PDF:", error);
        showMessage("No se pudo generar el PDF.", "error");
    }
}

/* -----------------------------------------------------
   13. INICIALIZACIÓN DEL SISTEMA
   ----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Luxury Motors Elite: iniciando...");

    // Primero se carga el inventario.
    // Así, un problema con Bootstrap no detiene el catálogo.
    await loadInventory();

    // Después se configuran las funciones adicionales.
    try {
        setupFilters();
        setupCartControls();
        setupModals();
        updateCart();

        console.log("Luxury Motors Elite: sistema iniciado.");
    } catch (error) {
        console.error(
            "Error al iniciar funciones adicionales:",
            error
        );
    }
});
