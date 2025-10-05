// js/contentComponent.js
function contentComponent() {
    return {
        // =============================
        // 🔹 Reactive Data
        // =============================
        content: {
            hero: {
                text1: "",
                text2: "",
                text3: "",
                text3_highlight: "",
                cta_button: "",
                imagePreview: ""
            },
            about: {
                title: "",
                subtitle: "",
                main_text: "",
                typing_text: "",
                mission_title: "",
                mission_text: "",
                vision_title: "",
                vision_text: "",
                values_title: "",
                values: [],
                cta_button: ""
            },
            skills: {
                title: "",
                subtitle: "",
                main_text: "",
                description: "",
                highlights: [],
                skills: [],
                cta_button: ""
            },
            contact: {
                title: "",
                subtitle: "",
                main_text: "",
                description: "",
                contact_person: "",
                address: "",
                email: "",
                whatsapp: "",
                business_hours: "",
                form_title: "",
                services: []
            },
            navigation: {
                logo_text: "",
                menu_items: []
            },
            footer: {
                company_name: "",
                tagline: "",
                quick_links: [],
                services_links: [],
                social_links: [],
                copyright: ""
            }
        },
        activeTab: "hero",
        loading: false,
        saving: false,
        toast: { show: false, message: "", type: "info" },
        currentDocId: "main_content", // ID of the Appwrite document
        bucketId: "your_bucket_id",   // set your Appwrite storage bucket ID

        // =============================
        // 🔹 Lifecycle
        // =============================
        async init() {
            await this.loadContent();
        },

        async loadContent() {
            this.loading = true;
            try {
                const res = await window.dbService.getSiteContent({ slug: "main_content" });
                if (res && res.documents && res.documents.length > 0) {
                    const doc = res.documents[0];
                    this.currentDocId = doc.$id;
                    if (doc.content && typeof doc.content === "object") {
                        this.content = Object.assign({}, this.content, doc.content);
                    }
                }
                this.showToast("Content loaded", "success");
            } catch (err) {
                console.error(err);
                this.showToast("Failed to load content", "error");
            } finally {
                this.loading = false;
            }
        },

        // =============================
        // 🔹 Tab Handling
        // =============================
        setActiveTab(tab) {
            this.activeTab = tab;
        },

        // =============================
        // 🔹 Image Upload
        // =============================
        async handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const res = await window.dbService.uploadFile(this.bucketId, file);
                const fileId = res.$id;
                const previewUrl = window.dbService.getFilePreview(this.bucketId, fileId);

                this.content.hero.imagePreview = previewUrl;
                this.content.hero.image = fileId;
                this.showToast("Image uploaded", "success");
            } catch (err) {
                console.error(err);
                this.showToast("Image upload failed", "error");
            }
        },

        removeImage() {
            this.content.hero.imagePreview = "";
            this.content.hero.image = "";
        },

        // =============================
        // 🔹 Save Functions
        // =============================
        async saveContent() {
            this.saving = true;
            try {
                await window.dbService.updateSiteContent(this.currentDocId, {
                    [`content.${this.activeTab}`]: this.content[this.activeTab]
                });
                this.showToast(`${this.activeTab} saved successfully`, "success");
            } catch (err) {
                console.error(err);
                this.showToast("Failed to save current tab", "error");
            } finally {
                this.saving = false;
            }
        },

        async saveAllContent() {
            this.saving = true;
            try {
                await window.dbService.updateSiteContent(this.currentDocId, {
                    content: this.content
                });
                this.showToast("All content saved", "success");
            } catch (err) {
                console.error(err);
                this.showToast("Failed to save all content", "error");
            } finally {
                this.saving = false;
            }
        },

        // =============================
        // 🔹 Array Utilities
        // =============================
        addHighlight() {
            this.content.skills.highlights.push({ icon: "", text: "" });
        },
        removeHighlight(i) {
            this.content.skills.highlights.splice(i, 1);
        },
        addSkill() {
            this.content.skills.skills.push({ name: "", percentage: 0 });
        },
        removeSkill(i) {
            this.content.skills.skills.splice(i, 1);
        },
        addMenuItem() {
            this.content.navigation.menu_items.push({ name: "", url: "" });
        },
        removeMenuItem(i) {
            this.content.navigation.menu_items.splice(i, 1);
        },
        addQuickLink() {
            this.content.footer.quick_links.push({ name: "", url: "" });
        },
        removeQuickLink(i) {
            this.content.footer.quick_links.splice(i, 1);
        },
        addServiceLink() {
            this.content.footer.services_links.push({ name: "", url: "" });
        },
        removeServiceLink(i) {
            this.content.footer.services_links.splice(i, 1);
        },
        addSocialLink() {
            this.content.footer.social_links.push({ name: "", icon: "", url: "" });
        },
        removeSocialLink(i) {
            this.content.footer.social_links.splice(i, 1);
        },

        // =============================
        // 🔹 Toast Helper
        // =============================
        showToast(message, type = "info") {
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => (this.toast.show = false), 4000);
        }
    };
}
