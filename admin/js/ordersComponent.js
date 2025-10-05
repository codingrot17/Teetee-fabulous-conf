function ordersComponent() {
    return {
        // Data
        orders: [],
        filteredOrdersLocalCache: [], // for search & filter operations
        searchQuery: "",
        selectedStatus: "",
        selectedService: "",
        sortBy: "latest",
        viewMode: "table", // 'table' | 'grid'
        page: 1,
        perPage: 8,
        loading: false,
        saving: false,

        // Modals / actions
        showEditModal: false,
        editingOrder: null,
        showDeleteConfirm: false,
        deletingOrder: null,
        deleting: false,
        // View modal
        showViewModal: false,
        viewingOrder: null,

        // Lifecycle: init
        async init() {
            await this.loadOrders();
        },

        async loadOrders() {
            this.loading = true;
            try {
                if (
                    !window.dbService ||
                    typeof window.dbService.getOrders !== "function"
                ) {
                    throw new Error(
                        "Database service not available. Make sure window.dbService.getOrders() exists."
                    );
                }

                const res = await window.dbService.getOrders();
                this.orders = res && res.documents ? res.documents : [];
                // Normalize service and status fields safely
                this.orders.forEach(o => {
                    o.service_type = o.service_type || o.service || "delivery";
                    o.status = (o.status || "pending").toString();
                });

                // Keep initial filtered cache
                this.applyFilters();
                this.showNotification("Orders loaded", "success");
            } catch (err) {
                console.error(err);
                this.showNotification("Failed to load orders", "error");
            } finally {
                this.loading = false;
            }
        },

        refresh() {
            this.loadOrders();
        },

        // Filtering and sorting
        applyFilters() {
            let items = [...this.orders];

            // Search
            if (this.searchQuery && this.searchQuery.trim() !== "") {
                const q = this.searchQuery.toLowerCase();
                items = items.filter(
                    o =>
                        (
                            (o.customer_name || "") +
                            " " +
                            (o.customer_email || "") +
                            " " +
                            (o.customer_phone || "")
                        )
                            .toLowerCase()
                            .includes(q) ||
                        (o.message || "").toLowerCase().includes(q)
                );
            }

            // Status
            if (this.selectedStatus) {
                items = items.filter(o => o.status === this.selectedStatus);
            }

            // Service
            if (this.selectedService) {
                items = items.filter(
                    o => o.service_type === this.selectedService
                );
            }

            // Sort
            if (this.sortBy === "latest") {
                items.sort(
                    (a, b) => new Date(b.$createdAt) - new Date(a.$createdAt)
                );
            } else if (this.sortBy === "oldest") {
                items.sort(
                    (a, b) => new Date(a.$createdAt) - new Date(b.$createdAt)
                );
            } else if (this.sortBy === "name") {
                items.sort((a, b) =>
                    (a.customer_name || "").localeCompare(b.customer_name || "")
                );
            }

            this.filteredOrdersLocalCache = items;
            this.page = 1; // reset to first page when filters change
        },

        clearFilters() {
            this.searchQuery = "";
            this.selectedStatus = "";
            this.selectedService = "";
            this.sortBy = "latest";
            this.applyFilters();
        },

        // Derived getters
        get filteredOrders() {
            return this.filteredOrdersLocalCache;
        },

        get totalPages() {
            return Math.max(
                1,
                Math.ceil(this.filteredOrders.length / this.perPage)
            );
        },

        get paginatedOrders() {
            const start = (this.page - 1) * this.perPage;
            return this.filteredOrders.slice(start, start + this.perPage);
        },

        nextPage() {
            if (this.page < this.totalPages) this.page++;
        },
        prevPage() {
            if (this.page > 1) this.page--;
        },

        // Modal actions
        openEdit(order) {
            // clone to avoid immediate mutation
            this.editingOrder = JSON.parse(JSON.stringify(order));
            this.showEditModal = true;
        },

        closeEdit() {
            this.editingOrder = null;
            this.showEditModal = false;
        },

        openView(order) {
            this.viewingOrder = order;
            this.showViewModal = true;
        },

        closeView() {
            this.viewingOrder = null;
            this.showViewModal = false;
        },

        async saveEdit() {
            if (!this.editingOrder) return;
            this.saving = true;
            try {
                await window.dbService.updateOrder(this.editingOrder.$id, {
                    status: this.editingOrder.status,
                    notes: this.editingOrder.notes || ""
                });

                // update local list
                const idx = this.orders.findIndex(
                    o => o.$id === this.editingOrder.$id
                );
                if (idx !== -1) {
                    this.orders[idx] = {
                        ...this.orders[idx],
                        ...this.editingOrder
                    };
                }
                this.applyFilters();
                this.showNotification("Order updated", "success");
                this.closeEdit();
            } catch (err) {
                console.error(err);
                this.showNotification("Failed to update order", "error");
            } finally {
                this.saving = false;
            }
        },

        confirmDelete(order) {
            this.deletingOrder = order;
            this.showDeleteConfirm = true;
        },

        async deleteOrderConfirmed() {
            if (!this.deletingOrder) return;
            this.deleting = true;
            try {
                await window.dbService.deleteOrder(this.deletingOrder.$id);
                this.orders = this.orders.filter(
                    o => o.$id !== this.deletingOrder.$id
                );
                this.applyFilters();
                this.showNotification("Order deleted", "success");
            } catch (err) {
                console.error(err);
                this.showNotification("Failed to delete order", "error");
            } finally {
                this.deleting = false;
                this.showDeleteConfirm = false;
                this.deletingOrder = null;
            }
        },

        // Quick toggle status: pending <-> completed
        async toggleStatus(order) {
            try {
                const newStatus =
                    order.status === "completed" ? "pending" : "completed";
                await window.dbService.updateOrder(order.$id, {
                    status: newStatus
                });
                const idx = this.orders.findIndex(o => o.$id === order.$id);
                if (idx !== -1) this.orders[idx].status = newStatus;
                this.applyFilters();
                this.showNotification(`Marked ${newStatus}`, "success");
            } catch (err) {
                console.error(err);
                this.showNotification("Failed to update status", "error");
            }
        },

        // Export CSV (simple client-side)
        exportCSV() {
            if (!this.orders || this.orders.length === 0) {
                this.showNotification("No orders to export", "info");
                return;
            }

            const fields = [
                "customer_name",
                "customer_email",
                "customer_phone",
                "status",
                "service_type",
                "message",
                "$createdAt"
            ];
            const rows = [fields.join(",")];

            this.filteredOrders.forEach(o => {
                const r = fields
                    .map(f => {
                        const val = (o[f] || "").toString().replace(/"/g, '""');
                        return `"${val}"`;
                    })
                    .join(",");
                rows.push(r);
            });

            const csv = rows.join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `orders_export_${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            this.showNotification("Exported CSV", "success");
        },

        // Helpers
        formatDate(dt) {
            if (!dt) return "—";
            try {
                const d = new Date(dt);
                return d.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                });
            } catch (e) {
                return dt;
            }
        },

        // Toasts: copied/adjusted from products UI
        showNotification(message, type = "info") {
            const toast = document.createElement("div");
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
          <div class="toast-content">
            <i class="toast-icon ${
                type === "success"
                    ? "fas fa-check-circle"
                    : type === "error"
                    ? "fas fa-exclamation-circle"
                    : "fas fa-info-circle"
            }"></i>
            <span>${message}</span>
          </div>
          <button class="toast-close" aria-label="Close">&times;</button>
        `;
            toast
                .querySelector(".toast-close")
                .addEventListener("click", () => {
                    toast.remove();
                });

            // Inject styles once
            if (!document.querySelector("#orders-toast-styles")) {
                const s = document.createElement("style");
                s.id = "orders-toast-styles";
                s.textContent = `
            .toast {
              position: fixed;
              top: 20px;
              right: 20px;
              min-width: 300px;
              padding: 14px 16px;
              border-radius: 12px;
              color: white;
              z-index: 99999;
              display: flex;
              align-items: center;
              gap: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.12);
              animation: slideIn 0.25s ease;
            }
            .toast-content { display:flex; gap:10px; align-items:center; flex:1; }
            .toast-icon { font-size:18px; opacity:0.95; }
            .toast-success { background: linear-gradient(135deg,#10b981,#059669); }
            .toast-error { background: linear-gradient(135deg,#ef4444,#dc2626); }
            .toast-info { background: linear-gradient(135deg,#3b82f6,#2563eb); }
            .toast-close { background: transparent; border: none; color: rgba(255,255,255,0.9); font-size:18px; cursor:pointer;}
            @keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity:1 } }
          `;
                document.head.appendChild(s);
            }

            document.body.appendChild(toast);
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 4500);
        }
    };
}
