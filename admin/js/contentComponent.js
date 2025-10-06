document.addEventListener("DOMContentLoaded", () => {
    Alpine.data("contentComponent", () => ({
        content: {},
        contentId: null,
        isLoading: true,
        saving: false,

        async init() {
            // Wait for dbService to be ready
            await this.waitForDbService();
            this.loadContent();
        },

        async waitForDbService() {
            let attempts = 0;
            while (
                (!window.dbService || !window.appwriteDatabases) &&
                attempts < 10
            ) {
                console.warn("dbService not ready yet");
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
            }
            if (!window.dbService)
                throw new Error("Appwrite DB service not initialized");
        },

        getDefaultContent() {
            return {
                hero: {
                    text1: "",
                    text2: "",
                    text3: "",
                    text3_highlight: "",
                    tagline: "",
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
            };
        },

        async loadContent() {
            try {
                this.isLoading = true;
                const res = await window.appwriteDatabases.listDocuments(
                    window.APPWRITE_CONFIG.databaseId,
                    window.APPWRITE_CONFIG.collections.site_content,
                    []
                );

                if (res.total > 0) {
                    const doc = res.documents[0];
                    this.contentId = doc.$id;

                    let loaded = {};
                    if (typeof doc.content === "string") {
                        try {
                            loaded = JSON.parse(doc.content);
                        } catch (e) {
                            console.warn(
                                "Invalid JSON in content field, resetting...",
                                e
                            );
                        }
                    }
                    this.content = this.deepMerge(
                        this.getDefaultContent(),
                        loaded
                    );
                    this.showToast(
                        "✅ Site content loaded successfully",
                        "success"
                    );
                } else {
                    this.content = this.getDefaultContent();
                    this.showToast(
                        "ℹ️ No content found — creating new entry",
                        "info"
                    );
                }
            } catch (err) {
                console.error("Failed to load site content:", err);
                this.showToast(
                    "⚠️ Failed to load content: " + err.message,
                    "error"
                );
            } finally {
                this.isLoading = false;
            }
        },

        deepMerge(target, source) {
            for (const key in source) {
                if (
                    source[key] &&
                    typeof source[key] === "object" &&
                    !Array.isArray(source[key])
                ) {
                    if (!target[key]) target[key] = {};
                    this.deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        },

        async saveContent() {
            try {
                this.saving = true;
                const payload = {
                    content: JSON.stringify(this.content), // 🔥 Save as string
                    title: "Main Site Content",
                    status: "active"
                };

                if (!this.contentId) {
                    const newDoc =
                        await window.appwriteDatabases.createDocument(
                            window.APPWRITE_CONFIG.databaseId,
                            window.APPWRITE_CONFIG.collections.site_content,
                            window.ID.unique(),
                            payload
                        );
                    this.contentId = newDoc.$id;
                    this.showToast(
                        "✅ Content created successfully!",
                        "success"
                    );
                } else {
                    await window.appwriteDatabases.updateDocument(
                        window.APPWRITE_CONFIG.databaseId,
                        window.APPWRITE_CONFIG.collections.site_content,
                        this.contentId,
                        payload
                    );
                    this.showToast(
                        "💾 Content updated successfully!",
                        "success"
                    );
                }
            } catch (error) {
                console.error("Failed to update site content:", error);
                this.showToast(
                    "❌ Failed to update content: " + error.message,
                    "error"
                );
            } finally {
                this.saving = false;
            }
        },

        showToast(message, type = "info") {
            const toast = document.createElement("div");
            toast.textContent = message;
            toast.className = `fixed bottom-5 right-5 px-4 py-2 rounded text-white z-50 shadow-lg
        ${
            type === "success"
                ? "bg-green-600"
                : type === "error"
                ? "bg-red-600"
                : type === "info"
                ? "bg-blue-600"
                : "bg-gray-600"
        }`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }
    }));
});
